/**
 * Irreversibly delete synced (remote) planning data.
 * Requires explicit user confirmation separate from local deletion.
 * Calls taskinoSync.deleteRemotePlanningData when available.
 *
 * @param {{ confirmed: boolean }} params - Must pass confirmed: true (caller obtains user confirmation)
 * @returns {Promise<{ok: boolean, code?: string, message?: string}>}
 */

import { DESTRUCTIVE_OPERATIONS } from './destructiveOperations';
import { validateDestructiveConfirmation } from '../invariants/validateDestructiveConfirmation';

export async function deleteSyncedPlanningData({ confirmed }) {
    const confirmCheck = validateDestructiveConfirmation({
        confirmed,
        operationId: DESTRUCTIVE_OPERATIONS.DELETE_SYNCED,
    });
    if (!confirmCheck.ok) return confirmCheck;

    const deleteRemote = window?.taskinoSync?.deleteRemotePlanningData;
    if (typeof deleteRemote !== 'function') {
        return {
            ok: false,
            code: 'SYNCED_DELETE_NOT_AVAILABLE',
            message: 'Synced deletion is not available. No sync provider is configured.',
        };
    }

    try {
        const result = await Promise.resolve(deleteRemote());
        if (result && typeof result === 'object' && result.ok === true) {
            return { ok: true };
        }
        if (result && typeof result === 'object' && result.ok === false) {
            return {
                ok: false,
                code: result.code ?? 'SYNCED_DELETE_FAILED',
                message: 'Synced deletion could not be confirmed. Please retry.',
            };
        }
        return {
            ok: false,
            code: 'SYNCED_DELETE_UNCONFIRMED',
            message: 'Synced deletion could not be confirmed. Please retry.',
        };
    } catch {
        return {
            ok: false,
            code: 'SYNCED_DELETE_FAILED',
            message: 'Synced deletion is temporarily unavailable. Please retry.',
        };
    }
}
