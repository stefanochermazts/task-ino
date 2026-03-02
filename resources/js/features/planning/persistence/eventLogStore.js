const EVENT_LOG_DB_NAME = 'planningEventLogDb';
const EVENT_LOG_DB_VERSION = 1;
const EVENT_LOG_STORE = 'planningEventLog';

function getIdb(options) {
    return options?.indexedDB ?? globalThis.indexedDB;
}

function openEventLogDb(idb) {
    return new Promise((resolve, reject) => {
        const req = idb.open(EVENT_LOG_DB_NAME, EVENT_LOG_DB_VERSION);
        req.onerror = () => reject(new Error('Unable to open event log store.'));
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(EVENT_LOG_STORE)) {
                db.createObjectStore(EVENT_LOG_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
    });
}

/**
 * Append an event to the append-only log. Never updates existing records.
 *
 * @param {object} entry - { timestamp, event_type, entity_id, device_id?, idempotency_key?, payload_version, payload }
 * @param {{ indexedDB?: IDBFactory }} [options]
 * @returns {Promise<number>} - The assigned record id
 */
export async function appendEvent(entry, options = {}) {
    const idb = getIdb(options);
    const db = await openEventLogDb(idb);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(EVENT_LOG_STORE, 'readwrite');
        const store = tx.objectStore(EVENT_LOG_STORE);
        const record = {
            timestamp: entry.timestamp,
            event_type: entry.event_type,
            entity_id: entry.entity_id,
            device_id: entry.device_id ?? null,
            idempotency_key: entry.idempotency_key ?? null,
            payload_version: entry.payload_version ?? 1,
            payload: entry.payload ?? {},
        };
        const req = store.add(record);

        req.onsuccess = () => {
            db.close();
            resolve(req.result);
        };
        req.onerror = () => {
            db.close();
            reject(new Error('Event log write failed.'));
        };
        tx.onerror = () => {
            db.close();
            reject(new Error('Event log transaction failed.'));
        };
    });
}

/**
 * Fetch all events in insertion order. Read-only.
 *
 * @param {{ indexedDB?: IDBFactory }} [options]
 * @returns {Promise<object[]>}
 */
export async function getAllEvents(options = {}) {
    const idb = getIdb(options);
    const db = await openEventLogDb(idb);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(EVENT_LOG_STORE, 'readonly');
        const store = tx.objectStore(EVENT_LOG_STORE);
        const req = store.getAll();

        req.onsuccess = () => {
            db.close();
            resolve(req.result ?? []);
        };
        req.onerror = () => {
            db.close();
            reject(new Error('Event log read failed.'));
        };
    });
}

/**
 * Fetch events filtered by event_type.
 *
 * @param {string} eventType
 * @param {{ indexedDB?: IDBFactory }} [options]
 * @returns {Promise<object[]>}
 */
export async function getEventsByType(eventType, options = {}) {
    const events = await getAllEvents(options);
    return events.filter((e) => e.event_type === eventType);
}

/**
 * Clear all events from the log. Irreversible. Used during local data deletion.
 *
 * @param {{ indexedDB?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function clearEventLog(options = {}) {
    const idb = getIdb(options);
    const db = await openEventLogDb(idb);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(EVENT_LOG_STORE, 'readwrite');
        const store = tx.objectStore(EVENT_LOG_STORE);
        const req = store.clear();

        req.onsuccess = () => {
            db.close();
            resolve();
        };
        req.onerror = () => {
            db.close();
            reject(new Error('Event log clear failed.'));
        };
    });
}
