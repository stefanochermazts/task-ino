/**
 * Reset sync state without losing local planning data.
 * Requires explicit user confirmation. Clears sync mode and E2EE credentials;
 * calls remote revocation if provider exposes it. Local task store, areas,
 * todayCap, and day-cycle markers remain intact.
 *
 * @param {{ confirmed: boolean }} params - Must pass confirmed: true (caller obtains user confirmation)
 * @returns {Promise<{ok: boolean, code?: string, message?: string}>}
 */

import { saveSyncMode } from '../persistence/syncModeStore';
import { clearE2EEKeyMaterial } from '../sync/e2eeClientCrypto';

function sanitizeRemoteResetFeedback() {
    return 'Remote revocation could not be confirmed. Local sync state was cleared. Re-enable sync to register this device again.';
}

export async function resetSyncState({ confirmed }) {
    if (confirmed !== true) {
        return {
            ok: false,
            code: 'RESET_REQUIRES_CONFIRMATION',
            message: 'Sync reset requires explicit user confirmation.',
        };
    }

    let remoteError = null;
    const revoke = window?.taskinoSync?.revokeDeviceRegistration;
    if (typeof revoke === 'function') {
        try {
            const result = await Promise.resolve(revoke());
            if (result && typeof result === 'object' && result.ok === false) {
                remoteError = sanitizeRemoteResetFeedback();
            }
        } catch {
            remoteError = sanitizeRemoteResetFeedback();
        }
    }

    const syncModeResult = saveSyncMode(false);
    if (!syncModeResult?.ok) {
        return {
            ok: false,
            code: 'RESET_LOCAL_SYNCMODE_FAILED',
            message: 'Sync reset could not be saved locally. Please retry.',
        };
    }
    const clearResult = await clearE2EEKeyMaterial();
    if (!clearResult.ok) {
        return {
            ok: false,
            code: clearResult.code ?? 'RESET_LOCAL_CLEAR_FAILED',
            message: 'Sync was disabled, but key material could not be cleared. You may need to retry.',
        };
    }

    if (remoteError) {
        return {
            ok: true,
            code: 'RESET_REMOTE_PARTIAL',
            message: remoteError,
        };
    }

    return { ok: true };
}
