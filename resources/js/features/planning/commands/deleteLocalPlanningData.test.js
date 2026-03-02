import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteLocalPlanningData } from './deleteLocalPlanningData';

const replaceAllTasksMock = vi.fn();
const saveSyncModeMock = vi.fn();
const clearE2EEKeyMaterialMock = vi.fn();
const clearEventLogMock = vi.fn();

vi.mock('../persistence/inboxTaskStore', () => ({
    replaceAllTasks: (tasks) => replaceAllTasksMock(tasks),
}));

vi.mock('../persistence/syncModeStore', () => ({
    saveSyncMode: (enabled) => saveSyncModeMock(enabled),
}));

vi.mock('../persistence/eventLogStore', () => ({
    clearEventLog: () => clearEventLogMock(),
}));

vi.mock('../sync/e2eeClientCrypto', () => ({
    clearE2EEKeyMaterial: () => clearE2EEKeyMaterialMock(),
}));

describe('deleteLocalPlanningData', () => {
    let originalLocalStorage;

    beforeEach(() => {
        vi.clearAllMocks();
        replaceAllTasksMock.mockResolvedValue({ ok: true, count: 0 });
        saveSyncModeMock.mockReturnValue({ ok: true });
        clearEventLogMock.mockResolvedValue(undefined);
        clearE2EEKeyMaterialMock.mockResolvedValue({ ok: true });

        originalLocalStorage = window.localStorage;
        const storage = {};
        window.localStorage = {
            getItem: (k) => storage[k] ?? null,
            setItem: (k, v) => {
                storage[k] = v;
            },
            removeItem: (k) => {
                delete storage[k];
            },
            key: () => null,
            length: 0,
        };
    });

    afterEach(() => {
        window.localStorage = originalLocalStorage;
    });

    it('rejects when confirmed is not true', async () => {
        const result = await deleteLocalPlanningData({ confirmed: false });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('CONFIRMATION_REQUIRED');
        expect(replaceAllTasksMock).not.toHaveBeenCalled();
    });

    it('clears tasks, storage keys, sync mode, and E2EE when confirmed', async () => {
        window.localStorage.setItem('planning.todayCap', '5');
        window.localStorage.setItem('planning.lastPlanningDate', '2026-03-02');
        window.localStorage.setItem('planning.areas', '[]');

        const result = await deleteLocalPlanningData({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(replaceAllTasksMock).toHaveBeenCalledWith([]);
        expect(window.localStorage.getItem('planning.todayCap')).toBeNull();
        expect(window.localStorage.getItem('planning.lastPlanningDate')).toBeNull();
        expect(window.localStorage.getItem('planning.areas')).toBeNull();
        expect(saveSyncModeMock).toHaveBeenCalledWith(false);
        expect(clearEventLogMock).toHaveBeenCalledTimes(1);
        expect(clearE2EEKeyMaterialMock).toHaveBeenCalled();
    });

    it('returns error when replaceAllTasks fails', async () => {
        replaceAllTasksMock.mockResolvedValue({ ok: false });

        const result = await deleteLocalPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('LOCAL_DELETE_PARTIAL');
    });

    it('returns error when replaceAllTasks throws', async () => {
        replaceAllTasksMock.mockRejectedValue(new Error('IndexedDB error'));

        const result = await deleteLocalPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('LOCAL_DELETE_FAILED');
    });

    it('returns ok with E2EE partial code when clearE2EEKeyMaterial fails', async () => {
        clearE2EEKeyMaterialMock.mockResolvedValue({ ok: false });

        const result = await deleteLocalPlanningData({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(result.code).toBe('LOCAL_DELETE_E2EE_PARTIAL');
        expect(replaceAllTasksMock).toHaveBeenCalledWith([]);
    });

    it('returns error when sync mode cannot be disabled locally', async () => {
        saveSyncModeMock.mockReturnValue({ ok: false });

        const result = await deleteLocalPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('LOCAL_DELETE_SYNCMODE_FAILED');
        expect(clearEventLogMock).not.toHaveBeenCalled();
        expect(clearE2EEKeyMaterialMock).not.toHaveBeenCalled();
    });

    it('does not block deletion success when clearEventLog fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        clearEventLogMock.mockRejectedValue(new Error('idb unavailable'));

        const result = await deleteLocalPlanningData({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(clearEventLogMock).toHaveBeenCalledTimes(1);
        expect(clearE2EEKeyMaterialMock).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('invokes onAfterDelete callback after successful delete', async () => {
        const onAfterDelete = vi.fn().mockResolvedValue(undefined);

        const result = await deleteLocalPlanningData({ confirmed: true, onAfterDelete });

        expect(result.ok).toBe(true);
        expect(onAfterDelete).toHaveBeenCalledTimes(1);
    });

    it('invokes onAfterDelete even when E2EE clear fails (partial success)', async () => {
        clearE2EEKeyMaterialMock.mockResolvedValue({ ok: false });
        const onAfterDelete = vi.fn().mockResolvedValue(undefined);

        const result = await deleteLocalPlanningData({ confirmed: true, onAfterDelete });

        expect(result.ok).toBe(true);
        expect(result.code).toBe('LOCAL_DELETE_E2EE_PARTIAL');
        expect(onAfterDelete).toHaveBeenCalledTimes(1);
    });
});
