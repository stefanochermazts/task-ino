import { beforeEach, describe, expect, it } from 'vitest';
import { appendEvent, clearEventLog, getAllEvents, getEventsByType } from './eventLogStore';

function createFakeEventLogDb() {
    const records = new Map();
    let nextKey = 1;

    const makeRequest = (executor) => {
        const req = {};
        setTimeout(() => executor(req), 0);
        return req;
    };

    const createStore = () => ({
        add(value) {
            const key = nextKey++;
            const record = { ...value, id: key };
            records.set(key, record);
            return makeRequest((req) => {
                req.result = key;
                req.onsuccess?.();
            });
        },
        getAll() {
            const keys = Array.from(records.keys()).sort((a, b) => a - b);
            const result = keys.map((k) => records.get(k));
            return makeRequest((req) => {
                req.result = result;
                req.onsuccess?.();
            });
        },
        clear() {
            records.clear();
            nextKey = 1;
            return makeRequest((req) => {
                req.onsuccess?.();
            });
        },
    });

    const createDb = () => ({
        objectStoreNames: { contains: () => true },
        createObjectStore: () => createStore(),
        transaction: (stores, mode) => {
            const store = createStore();
            const tx = {
                objectStore: () => store,
                oncomplete: null,
                onerror: null,
                onabort: null,
            };
            setTimeout(() => tx.oncomplete?.(), 0);
            return tx;
        },
        close: () => {},
    });

    const fakeIdb = {
        open: () => {
            const req = {};
            setTimeout(() => {
                req.result = createDb();
                if (req.onupgradeneeded) req.onupgradeneeded();
                req.onsuccess?.();
            }, 0);
            return req;
        },
        _records: records,
    };

    return fakeIdb;
}

describe('eventLogStore', () => {
    let fakeIdb;

    beforeEach(() => {
        fakeIdb = createFakeEventLogDb();
    });

    it('appendEvent adds records with correct shape', async () => {
        const entry = {
            timestamp: '2026-03-02T10:00:00.000Z',
            event_type: 'planning.task.created',
            entity_id: 'task-123',
            device_id: null,
            idempotency_key: null,
            payload_version: 1,
            payload: { title: 'New task' },
        };

        const id = await appendEvent(entry, { indexedDB: fakeIdb });

        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
        expect(fakeIdb._records.size).toBe(1);
        const stored = Array.from(fakeIdb._records.values())[0];
        expect(stored.timestamp).toBe(entry.timestamp);
        expect(stored.event_type).toBe(entry.event_type);
        expect(stored.entity_id).toBe(entry.entity_id);
        expect(stored.payload_version).toBe(1);
    });

    it('appendEvent never mutates existing record (append-only)', async () => {
        const entry = {
            timestamp: '2026-03-02T10:00:00.000Z',
            event_type: 'planning.task.created',
            entity_id: 'task-1',
            device_id: null,
            idempotency_key: null,
            payload_version: 1,
            payload: {},
        };

        await appendEvent(entry, { indexedDB: fakeIdb });
        await appendEvent({ ...entry, entity_id: 'task-2' }, { indexedDB: fakeIdb });

        const events = await getAllEvents({ indexedDB: fakeIdb });
        expect(events).toHaveLength(2);
        expect(events[0].entity_id).toBe('task-1');
        expect(events[1].entity_id).toBe('task-2');
    });

    it('getAllEvents returns events in insertion order', async () => {
        await appendEvent(
            {
                timestamp: '2026-03-02T09:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 'a',
                payload_version: 1,
                payload: {},
            },
            { indexedDB: fakeIdb },
        );
        await appendEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.added_to_today',
                entity_id: 'b',
                payload_version: 1,
                payload: {},
            },
            { indexedDB: fakeIdb },
        );

        const events = await getAllEvents({ indexedDB: fakeIdb });
        expect(events).toHaveLength(2);
        expect(events[0].entity_id).toBe('a');
        expect(events[1].entity_id).toBe('b');
    });

    it('getEventsByType filters correctly', async () => {
        await appendEvent(
            {
                timestamp: '2026-03-02T09:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 't1',
                payload_version: 1,
                payload: {},
            },
            { indexedDB: fakeIdb },
        );
        await appendEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.added_to_today',
                entity_id: 't1',
                payload_version: 1,
                payload: {},
            },
            { indexedDB: fakeIdb },
        );
        await appendEvent(
            {
                timestamp: '2026-03-02T11:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 't2',
                payload_version: 1,
                payload: {},
            },
            { indexedDB: fakeIdb },
        );

        const created = await getEventsByType('planning.task.created', { indexedDB: fakeIdb });
        expect(created).toHaveLength(2);
        expect(created.every((e) => e.event_type === 'planning.task.created')).toBe(true);
    });

    it('clearEventLog empties the store', async () => {
        await appendEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 't1',
                payload_version: 1,
                payload: {},
            },
            { indexedDB: fakeIdb },
        );
        expect(fakeIdb._records.size).toBe(1);

        await clearEventLog({ indexedDB: fakeIdb });

        expect(fakeIdb._records.size).toBe(0);
        const events = await getAllEvents({ indexedDB: fakeIdb });
        expect(events).toHaveLength(0);
    });
});
