import { beforeEach, describe, expect, it } from 'vitest';
import {
    getInboxTask,
    removeTaskFromToday,
    saveInboxTask,
    setTaskPaused,
} from './inboxTaskStore';

function createFakeIndexedDb() {
    const records = new Map();
    const objectStoreNames = { contains: (name) => name === 'tasks' };

    const makeRequest = (executor) => {
        const request = {};
        setTimeout(() => executor(request), 0);
        return request;
    };

    const createStore = () => ({
        createIndex: () => {},
        put(value) {
            return makeRequest((request) => {
                records.set(value.id, { ...value });
                request.result = value;
                request.onsuccess?.();
            });
        },
        get(id) {
            return makeRequest((request) => {
                request.result = records.has(id) ? { ...records.get(id) } : undefined;
                request.onsuccess?.();
            });
        },
        getAll() {
            return makeRequest((request) => {
                request.result = [...records.values()].map((item) => ({ ...item }));
                request.onsuccess?.();
            });
        },
        index() {
            return {
                getAll: () =>
                    makeRequest((request) => {
                        request.result = [...records.values()].map((item) => ({ ...item }));
                        request.onsuccess?.();
                    }),
            };
        },
    });

    const db = {
        objectStoreNames,
        createObjectStore: () => createStore(),
        transaction: () => {
            const transaction = {
                objectStore: () => createStore(),
                oncomplete: null,
                onerror: null,
                onabort: null,
            };
            setTimeout(() => transaction.oncomplete?.(), 0);
            return transaction;
        },
        close: () => {},
    };

    return {
        open: () => {
            const request = {};
            setTimeout(() => {
                request.result = db;
                request.onupgradeneeded?.();
                request.onsuccess?.();
            }, 0);
            return request;
        },
    };
}

describe('inboxTaskStore closure mutations', () => {
    beforeEach(async () => {
        Object.defineProperty(window, 'indexedDB', {
            configurable: true,
            value: createFakeIndexedDb(),
        });
    });

    it('removeTaskFromToday sets todayIncluded false and persists update', async () => {
        const baseTask = {
            id: 't-remove',
            title: 'Remove me from today',
            createdAt: '2026-02-23T10:00:00.000Z',
            todayIncluded: true,
        };
        await saveInboxTask(baseTask);

        const result = await removeTaskFromToday('t-remove');

        expect(result.ok).toBe(true);
        expect(result.task.todayIncluded).toBe(false);
        expect(typeof result.task.updatedAt).toBe('string');

        const persisted = await getInboxTask('t-remove');
        expect(persisted.todayIncluded).toBe(false);
        expect(persisted.updatedAt).toBe(result.task.updatedAt);
    });

    it('removeTaskFromToday returns TASK_NOT_FOUND when task is missing', async () => {
        const result = await removeTaskFromToday('missing-id');
        expect(result).toEqual({ ok: false, code: 'TASK_NOT_FOUND' });
    });

    it('removeTaskFromToday returns REMOVE_TASK_NOT_IN_TODAY when task is not in Today', async () => {
        const inboxTask = {
            id: 't-inbox',
            title: 'Inbox only',
            createdAt: '2026-02-23T10:00:00.000Z',
            todayIncluded: false,
        };
        await saveInboxTask(inboxTask);

        const result = await removeTaskFromToday('t-inbox');
        expect(result).toEqual({ ok: false, code: 'REMOVE_TASK_NOT_IN_TODAY' });

        const persisted = await getInboxTask('t-inbox');
        expect(persisted.todayIncluded).toBe(false);
    });

    it('setTaskPaused marks task paused and removes it from Today', async () => {
        const baseTask = {
            id: 't-pause',
            title: 'Pause me',
            createdAt: '2026-02-23T11:00:00.000Z',
            todayIncluded: true,
        };
        await saveInboxTask(baseTask);

        const result = await setTaskPaused('t-pause');

        expect(result.ok).toBe(true);
        expect(result.task.todayIncluded).toBe(false);
        expect(result.task.status).toBe('paused');
        expect(typeof result.task.updatedAt).toBe('string');

        const persisted = await getInboxTask('t-pause');
        expect(persisted.todayIncluded).toBe(false);
        expect(persisted.status).toBe('paused');
    });

    it('setTaskPaused returns TASK_NOT_FOUND when task is missing', async () => {
        const result = await setTaskPaused('missing-id');
        expect(result).toEqual({ ok: false, code: 'TASK_NOT_FOUND' });
    });

    it('setTaskPaused returns REMOVE_TASK_NOT_IN_TODAY when task is not in Today', async () => {
        const inboxTask = {
            id: 't-already-out',
            title: 'Not in Today',
            createdAt: '2026-02-23T11:00:00.000Z',
            todayIncluded: false,
        };
        await saveInboxTask(inboxTask);

        const result = await setTaskPaused('t-already-out');
        expect(result).toEqual({ ok: false, code: 'REMOVE_TASK_NOT_IN_TODAY' });

        const persisted = await getInboxTask('t-already-out');
        expect(persisted.status).toBeUndefined();
    });

    it('setTaskPaused returns REMOVE_TASK_NOT_IN_TODAY when task is already paused', async () => {
        const pausedTask = {
            id: 't-paused',
            title: 'Already paused',
            createdAt: '2026-02-23T12:00:00.000Z',
            todayIncluded: false,
            status: 'paused',
        };
        await saveInboxTask(pausedTask);

        const result = await setTaskPaused('t-paused');
        expect(result).toEqual({ ok: false, code: 'REMOVE_TASK_NOT_IN_TODAY' });
    });
});
