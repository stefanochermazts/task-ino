import { appendPlanningEvent } from './appendPlanningEvent';
import { mutatePlanningState } from '../invariants/mutationGuardrail';
import { ensureE2EEKeyReady } from '../sync/e2eeClientCrypto';

/**
 * Toggle sync mode on or off.
 * Planning runtime remains fully functional regardless of sync state.
 * @param {boolean} enabled - true to enable sync, false to disable
 * @returns {Promise<{ok: boolean, enabled?: boolean, code?: string, message?: string}>}
 */
export async function setSyncMode(enabled) {
    if (enabled === true) {
        const keyReady = await ensureE2EEKeyReady();
        if (!keyReady.ok) {
            return {
                ok: false,
                code: keyReady.code ?? 'E2EE_INITIALIZATION_FAILED',
                message: keyReady.message ?? 'Unable to initialize end-to-end encryption on this device.',
            };
        }
    }
    const result = await mutatePlanningState('setSyncMode', { enabled });
    if (result?.ok) {
        appendPlanningEvent(
            {
                timestamp: new Date().toISOString(),
                event_type: 'planning.sync.mode_changed',
                entity_id: 'sync-mode',
                payload_version: 1,
                payload: { enabled },
            },
            {},
        ).catch(console.error);
    }
    return result;
}
