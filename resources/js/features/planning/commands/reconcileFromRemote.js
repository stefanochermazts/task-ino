/**
 * Reconcile incoming sync mutations with local tasks via invariant-first pipeline.
 * Routes through central guardrail; rejects on Today cap, temporal validity, or malformed payloads.
 * All-or-nothing: either full persist or local state unchanged.
 *
 * @param {object[]} incomingMutations - Remote mutations with id, timestamp, device_id
 * @returns {Promise<{ok: boolean, conflicts?: number, code?: string, message?: string}>}
 */
import { mutatePlanningState } from '../invariants/mutationGuardrail';
import { getAllInboxTasks, replaceAllTasks } from '../persistence/inboxTaskStore';
import { decryptSyncPayload, isE2EEActive } from '../sync/e2eeClientCrypto';

async function normalizeIncomingMutations(mutations) {
    const e2eeActive = await isE2EEActive();
    const normalized = [];
    for (const mutation of mutations) {
        if (
            mutation &&
            typeof mutation === 'object' &&
            mutation.envelope &&
            typeof mutation.envelope === 'object'
        ) {
            const decrypted = await decryptSyncPayload(mutation.envelope);
            if (!decrypted.ok) {
                return decrypted;
            }
            normalized.push(decrypted.payload);
            continue;
        }
        if (e2eeActive) {
            return {
                ok: false,
                code: 'E2EE_PLAINTEXT_REJECTED',
                message: 'Plaintext mutation rejected: end-to-end encryption is active on this device.',
            };
        }
        normalized.push(mutation);
    }
    return { ok: true, mutations: normalized };
}

export async function reconcileFromRemote(incomingMutations) {
    const mutations = Array.isArray(incomingMutations) ? incomingMutations : [];
    const normalizedMutations = await normalizeIncomingMutations(mutations);
    if (!normalizedMutations.ok) {
        return {
            ok: false,
            code: normalizedMutations.code ?? 'SYNC_E2EE_DECRYPT_FAILED',
            message: normalizedMutations.message ?? 'Unable to decrypt synchronized data on this device.',
        };
    }
    const localTasks = await getAllInboxTasks();

    const result = await mutatePlanningState('applyMergeBatch', {
        localTasks,
        incomingMutations: normalizedMutations.mutations,
    });

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: result.message,
        };
    }

    try {
        const persistResult = await replaceAllTasks(result.resolvedTasks);
        if (!persistResult.ok) {
            return {
                ok: false,
                code: 'RECONCILIATION_PERSIST_FAILED',
                message: 'Reconciliation could not be saved locally. Local state unchanged.',
            };
        }
    } catch {
        return {
            ok: false,
            code: 'RECONCILIATION_PERSIST_FAILED',
            message: 'Reconciliation could not be saved locally. Local state unchanged.',
        };
    }

    return {
        ok: true,
        conflicts: result.conflicts ?? 0,
        code: result.code,
    };
}
