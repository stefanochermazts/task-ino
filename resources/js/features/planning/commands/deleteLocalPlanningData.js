/**
 * Irreversibly delete all local planning data.
 * Requires explicit user confirmation. Clears tasks, areas, todayCap, day-cycle,
 * sync mode, and E2EE key material. No in-app recovery.
 *
 * @param {{ confirmed: boolean, onAfterDelete?: () => Promise<void>|void }} params
 *   - confirmed: true (caller obtains user confirmation)
 *   - onAfterDelete: optional callback invoked after successful delete (e.g. to rebuild projection/refresh UI)
 * @returns {Promise<{ok: boolean, code?: string, message?: string}>}
 */

import { DESTRUCTIVE_OPERATIONS } from './destructiveOperations';
import { validateDestructiveConfirmation } from '../invariants/validateDestructiveConfirmation';
import { clearEventLog } from '../persistence/eventLogStore';
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

export async function deleteLocalPlanningData({ confirmed, onAfterDelete } = {}) {
    const confirmCheck = validateDestructiveConfirmation({
        confirmed,
        operationId: DESTRUCTIVE_OPERATIONS.DELETE_LOCAL,
    });
    if (!confirmCheck.ok) return confirmCheck;

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
        try {
            await clearEventLog();
        } catch (err) {
            console.error('Event log clear during local delete:', err);
        }
        const clearResult = await clearE2EEKeyMaterial();
        if (!clearResult.ok) {
            if (typeof onAfterDelete === 'function') {
                await Promise.resolve(onAfterDelete()).catch(console.error);
            }
            return {
                ok: true,
                code: 'LOCAL_DELETE_E2EE_PARTIAL',
                message: 'Local data deleted. Some sync credentials could not be cleared.',
            };
        }

        if (typeof onAfterDelete === 'function') {
            await Promise.resolve(onAfterDelete()).catch(console.error);
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
