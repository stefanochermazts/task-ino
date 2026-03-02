import { DESTRUCTIVE_OPERATIONS } from '../commands/destructiveOperations.js';
import { validateDestructiveConfirmation } from '../invariants/validateDestructiveConfirmation.js';

const KEY_DB_NAME = 'taskino-e2ee';
const KEY_DB_VERSION = 1;
const KEY_OBJECT_STORE = 'cryptokeys';
const KEY_META_STORAGE_KEY = 'planning.e2ee.meta';
const KEY_ALGORITHM = { name: 'AES-GCM', length: 256 };
const ENCRYPTION_VERSION = 1;

function getStorage(options) {
    return options?.storage ?? globalThis.localStorage;
}

function getCrypto(options) {
    return options?.cryptoApi ?? globalThis.crypto;
}

function getIdb(options) {
    return options?.indexedDB ?? globalThis.indexedDB;
}

function bytesToBase64(bytes) {
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return globalThis.btoa(binary);
}

function base64ToBytes(value) {
    const binary = globalThis.atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
}

function createKeyId(cryptoApi) {
    if (typeof cryptoApi?.randomUUID === 'function') {
        return cryptoApi.randomUUID();
    }
    return `k-${Date.now()}`;
}

function readKeyMeta(storage) {
    const raw = storage?.getItem(KEY_META_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.keyId || typeof parsed.keyId !== 'string') {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function saveKeyMeta(storage, meta) {
    storage?.setItem(KEY_META_STORAGE_KEY, JSON.stringify(meta));
}

function openKeyDb(idb) {
    return new Promise((resolve, reject) => {
        const req = idb.open(KEY_DB_NAME, KEY_DB_VERSION);
        req.onerror = () => reject(new Error('Unable to open key store.'));
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(KEY_OBJECT_STORE)) {
                db.createObjectStore(KEY_OBJECT_STORE, { keyPath: 'keyId' });
            }
        };
        req.onsuccess = () => resolve(req.result);
    });
}

async function saveKeyRecord(record, idb) {
    const db = await openKeyDb(idb);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(KEY_OBJECT_STORE, 'readwrite');
        const store = tx.objectStore(KEY_OBJECT_STORE);
        store.put(record);
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(new Error('Key storage failed.'));
        };
        tx.onabort = () => {
            db.close();
            reject(new Error('Key storage aborted.'));
        };
    });
}

async function getKeyRecord(keyId, idb) {
    const db = await openKeyDb(idb);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(KEY_OBJECT_STORE, 'readonly');
        const store = tx.objectStore(KEY_OBJECT_STORE);
        const req = store.get(keyId);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => {
            db.close();
            reject(new Error('Key retrieval failed.'));
        };
        tx.oncomplete = () => db.close();
    });
}

async function deleteKeyRecord(keyId, idb) {
    const db = await openKeyDb(idb);
    return new Promise((resolve) => {
        const tx = db.transaction(KEY_OBJECT_STORE, 'readwrite');
        const store = tx.objectStore(KEY_OBJECT_STORE);
        store.delete(keyId);
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            resolve();
        };
        tx.onabort = () => {
            db.close();
            resolve();
        };
    });
}

async function clearAllKeyRecords(idb) {
    const db = await openKeyDb(idb);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(KEY_OBJECT_STORE, 'readwrite');
        const store = tx.objectStore(KEY_OBJECT_STORE);
        store.clear();
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            reject(new Error('Key clear failed.'));
        };
        tx.onabort = () => {
            db.close();
            reject(new Error('Key clear aborted.'));
        };
    });
}

/**
 * Returns true if an active E2EE key is present and accessible on this device.
 * @param {object} [options]
 * @returns {Promise<boolean>}
 */
export async function isE2EEActive(options = {}) {
    const storage = getStorage(options);
    const idb = getIdb(options);
    const meta = readKeyMeta(storage);
    if (!meta?.keyId) {
        return false;
    }
    const record = await getKeyRecord(meta.keyId, idb).catch(() => null);
    return !!(record?.key);
}

/**
 * Ensure the active E2EE key is ready, generating one if absent.
 * Keys are stored as non-exportable CryptoKey objects in IndexedDB;
 * only non-sensitive metadata (keyId, algorithm, version) is held in localStorage.
 * Key rotation requires explicit user confirmation (destructive: loses ability to decrypt prior data).
 * @param {object} [options]
 * @param {boolean} [options.rotate] - if true, rotate the active key (destructive; requires confirmed: true)
 * @param {boolean} [options.confirmed] - required true when rotate is true
 * @returns {Promise<{ok: boolean, keyId?: string, rotated?: boolean, code?: string, message?: string}>}
 */
export async function ensureE2EEKeyReady(options = {}) {
    const storage = getStorage(options);
    const cryptoApi = getCrypto(options);
    const idb = getIdb(options);

    if (!cryptoApi?.subtle) {
        return {
            ok: false,
            code: 'E2EE_CRYPTO_UNAVAILABLE',
            message: 'This browser cannot initialize end-to-end encryption.',
        };
    }

    const meta = readKeyMeta(storage);
    if (meta && options.rotate === true) {
        const confirmCheck = validateDestructiveConfirmation({
            confirmed: options.confirmed,
            operationId: DESTRUCTIVE_OPERATIONS.KEY_ROTATION,
        });
        if (!confirmCheck.ok) return confirmCheck;
    }
    if (meta && options.rotate !== true) {
        const record = await getKeyRecord(meta.keyId, idb).catch(() => null);
        if (record?.key) {
            return { ok: true, keyId: meta.keyId, rotated: false };
        }
    }

    const previousKeyId = meta?.keyId ?? null;

    try {
        const key = await cryptoApi.subtle.generateKey(KEY_ALGORITHM, false, ['encrypt', 'decrypt']);
        const keyId = createKeyId(cryptoApi);
        const createdAt = new Date().toISOString();
        await saveKeyRecord(
            { keyId, key, algorithm: KEY_ALGORITHM.name, version: ENCRYPTION_VERSION, createdAt },
            idb,
        );
        saveKeyMeta(storage, { keyId, algorithm: KEY_ALGORITHM.name, version: ENCRYPTION_VERSION, createdAt });

        if (previousKeyId && previousKeyId !== keyId) {
            await deleteKeyRecord(previousKeyId, idb);
        }

        return { ok: true, keyId, rotated: options.rotate === true };
    } catch {
        return {
            ok: false,
            code: 'E2EE_KEY_STORAGE_FAILED',
            message: 'Unable to save encryption keys on this device.',
        };
    }
}

/**
 * Clear local E2EE key material and metadata.
 * Used by sync reset and local deletion flows.
 * @param {object} [options]
 * @returns {Promise<{ok: boolean, code?: string, message?: string}>}
 */
export async function clearE2EEKeyMaterial(options = {}) {
    const storage = getStorage(options);
    const idb = getIdb(options);
    try {
        await clearAllKeyRecords(idb);
    } catch {
        return {
            ok: false,
            code: 'E2EE_CLEAR_FAILED',
            message: 'Unable to clear encryption key material on this device.',
        };
    }

    try {
        storage?.removeItem(KEY_META_STORAGE_KEY);
    } catch {
        return {
            ok: false,
            code: 'E2EE_CLEAR_FAILED',
            message: 'Unable to clear encryption key material on this device.',
        };
    }
    return { ok: true };
}

async function loadActiveKey(options = {}) {
    const storage = getStorage(options);
    const cryptoApi = getCrypto(options);
    const idb = getIdb(options);

    const ready = await ensureE2EEKeyReady({ storage, cryptoApi, indexedDB: idb });
    if (!ready.ok) {
        return ready;
    }

    const record = await getKeyRecord(ready.keyId, idb).catch(() => null);
    if (!record?.key) {
        return {
            ok: false,
            code: 'E2EE_KEY_NOT_FOUND',
            message: 'Unable to load the active encryption key for this device.',
        };
    }
    return { ok: true, keyId: ready.keyId, key: record.key, cryptoApi };
}

export async function encryptSyncPayload(payload, options = {}) {
    const loaded = await loadActiveKey(options);
    if (!loaded.ok) {
        return loaded;
    }

    const iv = loaded.cryptoApi.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const plainBytes = encoder.encode(JSON.stringify(payload ?? {}));
    try {
        const encryptedBuffer = await loaded.cryptoApi.subtle.encrypt(
            { name: 'AES-GCM', iv },
            loaded.key,
            plainBytes,
        );
        return {
            ok: true,
            envelope: {
                version: ENCRYPTION_VERSION,
                keyId: loaded.keyId,
                algorithm: 'AES-GCM',
                iv: bytesToBase64(iv),
                ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
            },
        };
    } catch {
        return {
            ok: false,
            code: 'E2EE_ENCRYPTION_FAILED',
            message: 'Unable to encrypt synchronized data on this device.',
        };
    }
}

export async function decryptSyncPayload(envelope, options = {}) {
    if (!envelope || typeof envelope !== 'object') {
        return {
            ok: false,
            code: 'E2EE_DECRYPTION_FAILED',
            message: 'Unable to decrypt synchronized data on this device.',
        };
    }
    const { keyId, iv, ciphertext } = envelope;
    if (!keyId || !iv || !ciphertext) {
        return {
            ok: false,
            code: 'E2EE_DECRYPTION_FAILED',
            message: 'Unable to decrypt synchronized data on this device.',
        };
    }

    const cryptoApi = getCrypto(options);
    if (!cryptoApi?.subtle) {
        return {
            ok: false,
            code: 'E2EE_CRYPTO_UNAVAILABLE',
            message: 'This browser cannot decrypt end-to-end encrypted data.',
        };
    }

    const idb = getIdb(options);
    const record = await getKeyRecord(keyId, idb).catch(() => null);
    if (!record?.key) {
        return {
            ok: false,
            code: 'E2EE_KEY_NOT_FOUND',
            message: 'This device does not hold the required decryption key.',
        };
    }

    try {
        const decryptedBuffer = await cryptoApi.subtle.decrypt(
            { name: 'AES-GCM', iv: base64ToBytes(iv) },
            record.key,
            base64ToBytes(ciphertext),
        );
        const decoder = new TextDecoder();
        const decoded = decoder.decode(decryptedBuffer);
        return { ok: true, payload: JSON.parse(decoded) };
    } catch {
        return {
            ok: false,
            code: 'E2EE_DECRYPTION_FAILED',
            message: 'Unable to decrypt synchronized data on this device.',
        };
    }
}
