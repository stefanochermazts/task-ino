import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearE2EEKeyMaterial,
    decryptSyncPayload,
    encryptSyncPayload,
    ensureE2EEKeyReady,
    isE2EEActive,
} from './e2eeClientCrypto';

function createFakeKeyDb() {
    const records = new Map();

    const makeRequest = (executor) => {
        const req = {};
        setTimeout(() => executor(req), 0);
        return req;
    };

    const createStore = () => ({
        put(value) {
            records.set(value.keyId, value);
            return makeRequest((req) => {
                req.onsuccess?.();
            });
        },
        get(keyId) {
            const result = records.has(keyId) ? records.get(keyId) : undefined;
            return makeRequest((req) => {
                req.result = result;
                req.onsuccess?.();
            });
        },
        delete(keyId) {
            records.delete(keyId);
            return makeRequest((req) => {
                req.onsuccess?.();
            });
        },
        clear() {
            records.clear();
            return makeRequest((req) => {
                req.onsuccess?.();
            });
        },
        createIndex: () => {},
    });

    const createDb = () => ({
        objectStoreNames: { contains: () => true },
        createObjectStore: () => createStore(),
        transaction: () => {
            const store = createStore();
            const tx = { objectStore: () => store, oncomplete: null, onerror: null, onabort: null };
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
                req.onupgradeneeded?.();
                req.onsuccess?.();
            }, 0);
            return req;
        },
        _records: records,
    };

    return fakeIdb;
}

describe('e2eeClientCrypto', () => {
    let fakeIdb;

    beforeEach(() => {
        localStorage.clear();
        fakeIdb = createFakeKeyDb();
    });

    it('creates and stores a non-exportable key in IndexedDB on first initialization', async () => {
        const result = await ensureE2EEKeyReady({ indexedDB: fakeIdb });

        expect(result.ok).toBe(true);
        expect(typeof result.keyId).toBe('string');
        expect(result.keyId.length).toBeGreaterThan(0);

        const meta = JSON.parse(localStorage.getItem('planning.e2ee.meta'));
        expect(meta.keyId).toBe(result.keyId);

        const record = fakeIdb._records.get(result.keyId);
        expect(record).toBeTruthy();
        expect(record.key).toBeTruthy();
        expect(record.key.extractable).toBe(false);

        expect(localStorage.getItem(`planning.e2ee.key.${result.keyId}`)).toBeNull();
    });

    it('reuses existing key when rotation is not requested', async () => {
        const first = await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        const second = await ensureE2EEKeyReady({ indexedDB: fakeIdb });

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(second.keyId).toBe(first.keyId);
        expect(second.rotated).toBe(false);
    });

    it('rotates key material when explicitly requested', async () => {
        const first = await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        const second = await ensureE2EEKeyReady({ rotate: true, indexedDB: fakeIdb });

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(second.keyId).not.toBe(first.keyId);
        expect(second.rotated).toBe(true);
    });

    it('removes old key material from IndexedDB after rotation', async () => {
        const first = await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        const oldKeyId = first.keyId;

        await ensureE2EEKeyReady({ rotate: true, indexedDB: fakeIdb });

        expect(fakeIdb._records.has(oldKeyId)).toBe(false);
    });

    it('encrypts payload without exposing plaintext fields in envelope', async () => {
        const payload = {
            id: 'task-1',
            title: 'Highly sensitive task',
            todayIncluded: true,
        };
        const result = await encryptSyncPayload(payload, { indexedDB: fakeIdb });

        expect(result.ok).toBe(true);
        expect(result.envelope.ciphertext).toBeTruthy();
        expect(result.envelope.iv).toBeTruthy();
        expect(result.envelope.keyId).toBeTruthy();
        expect(result.envelope.title).toBeUndefined();
        expect(JSON.stringify(result.envelope)).not.toContain('Highly sensitive task');
    });

    it('decrypts encrypted payload only with local key material', async () => {
        const payload = {
            id: 'task-2',
            title: 'Decrypt me',
            todayIncluded: false,
        };
        const encrypted = await encryptSyncPayload(payload, { indexedDB: fakeIdb });
        const decrypted = await decryptSyncPayload(encrypted.envelope, { indexedDB: fakeIdb });

        expect(encrypted.ok).toBe(true);
        expect(decrypted.ok).toBe(true);
        expect(decrypted.payload).toEqual(payload);
    });

    it('fails decryption when local key is missing from IndexedDB', async () => {
        const encrypted = await encryptSyncPayload(
            { id: 'task-3', title: 'Key lifecycle check' },
            { indexedDB: fakeIdb },
        );

        const emptyIdb = createFakeKeyDb();
        const decrypted = await decryptSyncPayload(encrypted.envelope, { indexedDB: emptyIdb });
        expect(decrypted.ok).toBe(false);
        expect(decrypted.code).toBe('E2EE_KEY_NOT_FOUND');
    });

    it('isE2EEActive returns true when an active key exists in IndexedDB', async () => {
        expect(await isE2EEActive({ indexedDB: fakeIdb })).toBe(false);

        await ensureE2EEKeyReady({ indexedDB: fakeIdb });

        expect(await isE2EEActive({ indexedDB: fakeIdb })).toBe(true);
    });

    it('isE2EEActive returns false when key metadata is present but key is missing from IndexedDB', async () => {
        await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        localStorage.clear();

        expect(await isE2EEActive({ indexedDB: fakeIdb })).toBe(false);
    });

    it('clearE2EEKeyMaterial removes key metadata and indexeddb key records', async () => {
        const ready = await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        expect(ready.ok).toBe(true);
        expect(fakeIdb._records.size).toBeGreaterThan(0);

        const result = await clearE2EEKeyMaterial({ indexedDB: fakeIdb });

        expect(result.ok).toBe(true);
        expect(localStorage.getItem('planning.e2ee.meta')).toBeNull();
        expect(fakeIdb._records.size).toBe(0);
    });

    it('creates fresh key material after clearE2EEKeyMaterial', async () => {
        const first = await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        expect(first.ok).toBe(true);

        const cleared = await clearE2EEKeyMaterial({ indexedDB: fakeIdb });
        expect(cleared.ok).toBe(true);
        expect(await isE2EEActive({ indexedDB: fakeIdb })).toBe(false);

        const second = await ensureE2EEKeyReady({ indexedDB: fakeIdb });
        expect(second.ok).toBe(true);
        expect(second.keyId).not.toBe(first.keyId);
    });
});
