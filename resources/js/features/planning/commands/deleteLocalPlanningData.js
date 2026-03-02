/**
 * Irreversibly delete all local planning data.
 * Requires explicit user confirmation. Clears tasks, areas, todayCap, day-cycle,
 * sync mode, and E2EE key material. No in-app recovery.
 *
 * @param {{ confirmed: boolean }} params - Must pass confirmed: true (caller obtains user confirmation)
 * @returns {Promise<{ok: boolean, code?: string, message?: string}>}
 */

import { replaceAllTasks } from '../persistence/inboxTaskStore';
import { saveSyncMode } from '../persistence/syncModeStore';
import { clearE2EEKeyMaterial } from '../sync/e2eeClientCrypto';

const STORAGE_KEYS = ['planning.todayCap', 'planning.lastPlanningDate', 'planning.areas'];

function clearLocalStorageKeys() {
    const storage = window.localStorage;
    if (!storage) return { ok: false };
    try {
        STORAGE_KEYS.forEach((k) => storage.removeItem(k));
        return { ok: true };
    } catch {
        return { ok: false };
    }
}

export async function deleteLocalPlanningData({ confirmed }) {
    if (confirmed !== true) {
        return {
            ok: false,
            code: 'DELETE_REQUIRES_CONFIRMATION',
            message: 'Local deletion requires explicit user confirmation.',
        };
    }

    try {
        const replaceResult = await replaceAllTasks([]);
        if (!replaceResult?.ok) {
            return {
                ok: false,
                code: 'LOCAL_DELETE_PARTIAL',
                message: 'Local deletion could not clear all data. Please retry.',
            };
        }

        const storageResult = clearLocalStorageKeys();
        if (!storageResult.ok) {
            return {
                ok: false,
                code: 'LOCAL_DELETE_STORAGE_FAILED',
                message: 'Local deletion could not clear settings. Please retry.',
            };
        }

        const syncModeResult = saveSyncMode(false);
        if (!syncModeResult?.ok) {
            return {
                ok: false,
                code: 'LOCAL_DELETE_SYNCMODE_FAILED',
                message: 'Local deletion could not disable sync settings. Please retry.',
            };
        }
        const clearResult = await clearE2EEKeyMaterial();
        if (!clearResult.ok) {
            return {
                ok: true,
                code: 'LOCAL_DELETE_E2EE_PARTIAL',
                message: 'Local data deleted. Some sync credentials could not be cleared.',
            };
        }

        return { ok: true };
    } catch {
        return {
            ok: false,
            code: 'LOCAL_DELETE_FAILED',
            message: 'Local deletion failed. Please retry.',
        };
    }
}
