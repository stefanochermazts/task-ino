import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveInboxTask, listInboxTasks } from '../persistence/inboxTaskStore';
import { addArea, listAreas } from '../persistence/areaStore';
import { readTodayCap, saveTodayCap } from '../persistence/todayCapStore';
import { readLastPlanningDate, saveLastPlanningDate } from '../persistence/dayCycleStore';
import { readSyncMode, saveSyncMode } from '../persistence/syncModeStore';
import { ensureE2EEKeyReady, isE2EEActive } from '../sync/e2eeClientCrypto';
import { resetSyncState } from './resetSyncState';

function createFakeIndexedDb() {
    const databases = new Map();

    const makeRequest = (executor) => {
        const req = {};
        setTimeout(() => executor(req), 0);
        return req;
    };

    const ensureDbState = (dbName) => {
        if (!databases.has(dbName)) {
            databases.set(dbName, { stores: new Map() });
        }
        return databases.get(dbName);
    };

    const ensureStoreState = (dbState, storeName, keyPath = 'id') => {
        if (!dbState.stores.has(storeName)) {
            dbState.stores.set(storeName, { keyPath, records: new Map(), indexes: new Map() });
        }
        return dbState.stores.get(storeName);
    };

    const createStoreApi = (storeState) => ({
        createIndex(indexName, fieldName) {
            storeState.indexes.set(indexName, fieldName);
        },
        put(value) {
            const record = { ...value };
            const key = record?.[storeState.keyPath];
            return makeRequest((req) => {
                storeState.records.set(key, record);
                req.result = record;
                req.onsuccess?.();
            });
        },
        get(key) {
            return makeRequest((req) => {
                req.result = storeState.records.has(key) ? { ...storeState.records.get(key) } : undefined;
                req.onsuccess?.();
            });
        },
        getAll() {
            return makeRequest((req) => {
                req.result = [...storeState.records.values()].map((item) => ({ ...item }));
                req.onsuccess?.();
            });
        },
        clear() {
            return makeRequest((req) => {
                storeState.records.clear();
                req.onsuccess?.();
            });
        },
        delete(key) {
            return makeRequest((req) => {
                storeState.records.delete(key);
                req.onsuccess?.();
            });
        },
        index(indexName) {
            const fieldName = storeState.indexes.get(indexName);
            return {
                getAll: () =>
                    makeRequest((req) => {
                        const list = [...storeState.records.values()].map((item) => ({ ...item }));
                        if (fieldName) {
                            list.sort((a, b) => String(a?.[fieldName] ?? '').localeCompare(String(b?.[fieldName] ?? '')));
                        }
                        req.result = list;
                        req.onsuccess?.();
                    }),
            };
        },
    });

    return {
        open(dbName) {
            const req = {};
            setTimeout(() => {
                const dbState = ensureDbState(dbName);
                const db = {
                    objectStoreNames: {
                        contains: (storeName) => dbState.stores.has(storeName),
                    },
                    createObjectStore: (storeName, options = {}) =>
                        createStoreApi(ensureStoreState(dbState, storeName, options.keyPath ?? 'id')),
                    transaction: (storeName) => {
                        const storeState = ensureStoreState(dbState, storeName);
                        const tx = {
                            oncomplete: null,
                            onerror: null,
                            onabort: null,
                            objectStore: () => createStoreApi(storeState),
                        };
                        setTimeout(() => tx.oncomplete?.(), 0);
                        return tx;
                    },
                    close: () => {},
                };
                req.result = db;
                req.onupgradeneeded?.();
                req.onsuccess?.();
            }, 0);
            return req;
        },
    };
}

describe('resetSyncState integration', () => {
    let originalIndexedDb;
    let originalTaskinoSync;

    beforeEach(() => {
        localStorage.clear();
        originalIndexedDb = window.indexedDB;
        originalTaskinoSync = window.taskinoSync;

        const fakeIndexedDb = createFakeIndexedDb();
        Object.defineProperty(window, 'indexedDB', {
            configurable: true,
            value: fakeIndexedDb,
        });
    });

    afterEach(() => {
        Object.defineProperty(window, 'indexedDB', {
            configurable: true,
            value: originalIndexedDb,
        });
        window.taskinoSync = originalTaskinoSync;
    });

    it('preserves local planning stores while resetting sync credentials', async () => {
        await saveInboxTask({
            id: 't-reset-1',
            title: 'Keep this task',
            area: 'inbox',
            todayIncluded: false,
            createdAt: '2026-03-02T08:00:00.000Z',
            updatedAt: '2026-03-02T08:00:00.000Z',
        });
        addArea('personal');
        saveTodayCap(5);
        saveLastPlanningDate('2026-03-02');
        saveSyncMode(true);
        const firstKey = await ensureE2EEKeyReady();
        expect(firstKey.ok).toBe(true);
        expect(await isE2EEActive()).toBe(true);

        const revokeDeviceRegistration = vi.fn().mockResolvedValue({ ok: true });
        window.taskinoSync = { revokeDeviceRegistration };

        const result = await resetSyncState({ confirmed: true });

        expect(result).toEqual({ ok: true });
        expect(revokeDeviceRegistration).toHaveBeenCalledTimes(1);
        expect(readSyncMode()).toBe('disabled');
        expect(await isE2EEActive()).toBe(false);
        expect(await listInboxTasks()).toHaveLength(1);
        expect((await listInboxTasks())[0].id).toBe('t-reset-1');
        expect(listAreas()).toEqual(['inbox', 'work', 'personal']);
        expect(readTodayCap()).toBe(5);
        expect(readLastPlanningDate()).toBe('2026-03-02');
    });

    it('sanitizes remote failure and still clears local sync credentials', async () => {
        await saveInboxTask({
            id: 't-reset-2',
            title: 'Still here',
            area: 'inbox',
            todayIncluded: false,
            createdAt: '2026-03-02T08:00:00.000Z',
            updatedAt: '2026-03-02T08:00:00.000Z',
        });
        saveSyncMode(true);
        await ensureE2EEKeyReady();
        expect(await isE2EEActive()).toBe(true);

        window.taskinoSync = {
            revokeDeviceRegistration: vi.fn().mockResolvedValue({
                ok: false,
                message: 'TypeError: 500 at /revoke line 42',
            }),
        };

        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(result.code).toBe('RESET_REMOTE_PARTIAL');
        expect(result.message).toContain('Remote revocation could not be confirmed');
        expect(result.message).not.toContain('TypeError');
        expect(readSyncMode()).toBe('disabled');
        expect(await isE2EEActive()).toBe(false);
        expect(await listInboxTasks()).toHaveLength(1);
    });

    it('allows re-onboarding with fresh key material after reset', async () => {
        saveSyncMode(true);
        const first = await ensureE2EEKeyReady();
        expect(first.ok).toBe(true);
        const firstKeyId = first.keyId;

        const resetResult = await resetSyncState({ confirmed: true });
        expect(resetResult.ok).toBe(true);
        expect(await isE2EEActive()).toBe(false);

        saveSyncMode(true);
        const second = await ensureE2EEKeyReady();
        expect(second.ok).toBe(true);
        expect(second.keyId).not.toBe(firstKeyId);
    });
});
