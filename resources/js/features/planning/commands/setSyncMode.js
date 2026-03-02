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
    return mutatePlanningState('setSyncMode', { enabled });
}
