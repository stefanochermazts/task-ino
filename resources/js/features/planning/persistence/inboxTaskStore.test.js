import { beforeEach, describe, expect, it } from 'vitest';
import {
    addTaskToTodayWithCap,
    getInboxTask,
    removeTaskFromToday,
    rescheduleTask,
    saveInboxTask,
    setTaskArea,
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

    it('setTaskArea sets area and persists update', async () => {
        const baseTask = {
            id: 't-area',
            title: 'Assign area',
            createdAt: '2026-02-23T13:00:00.000Z',
        };
        await saveInboxTask(baseTask);

        const result = await setTaskArea('t-area', 'work');

        expect(result.ok).toBe(true);
        expect(result.task.area).toBe('work');
        expect(typeof result.task.updatedAt).toBe('string');

        const persisted = await getInboxTask('t-area');
        expect(persisted.area).toBe('work');
        expect(persisted.updatedAt).toBe(result.task.updatedAt);
    });

    it('setTaskArea normalizes area to lowercase', async () => {
        const baseTask = {
            id: 't-area2',
            title: 'Assign area',
            createdAt: '2026-02-23T13:00:00.000Z',
        };
        await saveInboxTask(baseTask);

        const result = await setTaskArea('t-area2', '  Work  ');

        expect(result.ok).toBe(true);
        expect(result.task.area).toBe('work');
    });

    it('setTaskArea returns TASK_NOT_FOUND when task is missing', async () => {
        const result = await setTaskArea('missing-id', 'work');
        expect(result).toEqual({ ok: false, code: 'TASK_NOT_FOUND' });
    });

    it('setTaskArea returns INVALID_AREA when areaId is empty', async () => {
        const baseTask = {
            id: 't-area3',
            title: 'Task',
            createdAt: '2026-02-23T13:00:00.000Z',
        };
        await saveInboxTask(baseTask);

        const result = await setTaskArea('t-area3', '');
        expect(result).toEqual({ ok: false, code: 'INVALID_AREA' });
    });

    it('setTaskArea preserves createdAt (move semantics, no temporal mutation)', async () => {
        const baseTask = {
            id: 't-move-area',
            title: 'Move area',
            createdAt: '2026-02-20T09:00:00.000Z',
            area: 'inbox',
        };
        await saveInboxTask(baseTask);

        const result = await setTaskArea('t-move-area', 'work');

        expect(result.ok).toBe(true);
        expect(result.task.createdAt).toBe('2026-02-20T09:00:00.000Z');
        expect(result.task.area).toBe('work');
        const persisted = await getInboxTask('t-move-area');
        expect(persisted.createdAt).toBe('2026-02-20T09:00:00.000Z');
    });

    it('removeTaskFromToday preserves createdAt and area (move semantics, no temporal mutation)', async () => {
        const baseTask = {
            id: 't-move-today',
            title: 'Remove from Today',
            createdAt: '2026-02-23T08:00:00.000Z',
            area: 'work',
            todayIncluded: true,
        };
        await saveInboxTask(baseTask);

        const result = await removeTaskFromToday('t-move-today');

        expect(result.ok).toBe(true);
        expect(result.task.createdAt).toBe('2026-02-23T08:00:00.000Z');
        expect(result.task.area).toBe('work');
        expect(result.task.todayIncluded).toBe(false);
        const persisted = await getInboxTask('t-move-today');
        expect(persisted.createdAt).toBe('2026-02-23T08:00:00.000Z');
        expect(persisted.area).toBe('work');
    });

    it('addTaskToTodayWithCap preserves createdAt and area (Today move does not change area)', async () => {
        const baseTask = {
            id: 't-add-today',
            title: 'Add to Today',
            createdAt: '2026-02-22T10:00:00.000Z',
            area: 'work',
            todayIncluded: false,
        };
        await saveInboxTask(baseTask);

        const result = await addTaskToTodayWithCap('t-add-today', 3);

        expect(result.ok).toBe(true);
        expect(result.task.createdAt).toBe('2026-02-22T10:00:00.000Z');
        expect(result.task.area).toBe('work');
        expect(result.task.todayIncluded).toBe(true);
        const persisted = await getInboxTask('t-add-today');
        expect(persisted.area).toBe('work');
    });

    it('setTaskArea on task in Today does not change todayIncluded (area move independent from Today)', async () => {
        const baseTask = {
            id: 't-area-today',
            title: 'In Today',
            createdAt: '2026-02-23T07:00:00.000Z',
            area: 'inbox',
            todayIncluded: true,
        };
        await saveInboxTask(baseTask);

        const result = await setTaskArea('t-area-today', 'work');

        expect(result.ok).toBe(true);
        expect(result.task.todayIncluded).toBe(true);
        expect(result.task.area).toBe('work');
        const persisted = await getInboxTask('t-area-today');
        expect(persisted.todayIncluded).toBe(true);
        expect(persisted.area).toBe('work');
    });

    it('rescheduleTask updates scheduledFor and updatedAt, preserves id title createdAt area todayIncluded', async () => {
        const baseTask = {
            id: 't-reschedule',
            title: 'Reschedule me',
            createdAt: '2026-02-20T09:00:00.000Z',
            area: 'work',
            todayIncluded: true,
        };
        await saveInboxTask(baseTask);

        const result = await rescheduleTask('t-reschedule', '2026-03-01');

        expect(result.ok).toBe(true);
        expect(result.task.id).toBe('t-reschedule');
        expect(result.task.title).toBe('Reschedule me');
        expect(result.task.createdAt).toBe('2026-02-20T09:00:00.000Z');
        expect(result.task.area).toBe('work');
        expect(result.task.todayIncluded).toBe(true);
        expect(result.task.scheduledFor).toBe('2026-03-01');
        expect(typeof result.task.updatedAt).toBe('string');
        const persisted = await getInboxTask('t-reschedule');
        expect(persisted.scheduledFor).toBe('2026-03-01');
        expect(persisted.createdAt).toBe('2026-02-20T09:00:00.000Z');
        expect(persisted.area).toBe('work');
    });

    it('rescheduleTask with null clears scheduledFor', async () => {
        const baseTask = {
            id: 't-clear-sched',
            title: 'Clear schedule',
            createdAt: '2026-02-21T10:00:00.000Z',
            scheduledFor: '2026-02-25',
        };
        await saveInboxTask(baseTask);

        const result = await rescheduleTask('t-clear-sched', null);

        expect(result.ok).toBe(true);
        expect(result.task.scheduledFor).toBeNull();
        const persisted = await getInboxTask('t-clear-sched');
        expect(persisted.scheduledFor).toBeNull();
    });

    it('rescheduleTask returns TASK_NOT_FOUND when task is missing', async () => {
        const result = await rescheduleTask('missing-id', '2026-03-01');
        expect(result).toEqual({ ok: false, code: 'TASK_NOT_FOUND' });
    });

    it('rescheduleTask does not alter area or todayIncluded (regression: reschedule is not move)', async () => {
        const baseTask = {
            id: 't-reschedule-indep',
            title: 'Task',
            createdAt: '2026-02-22T08:00:00.000Z',
            area: 'work',
            todayIncluded: true,
        };
        await saveInboxTask(baseTask);

        const result = await rescheduleTask('t-reschedule-indep', '2026-04-15');

        expect(result.ok).toBe(true);
        expect(result.task.area).toBe('work');
        expect(result.task.todayIncluded).toBe(true);
        const persisted = await getInboxTask('t-reschedule-indep');
        expect(persisted.area).toBe('work');
        expect(persisted.todayIncluded).toBe(true);
    });
});
