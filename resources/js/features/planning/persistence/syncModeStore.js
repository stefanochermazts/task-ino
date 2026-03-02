const STORAGE_KEY = 'planning.syncMode';
const ENABLED = 'enabled';
const DISABLED = 'disabled';

/**
 * Read sync mode from local storage.
 * Default: disabled (sync off, planning fully local).
 * @returns {'enabled'|'disabled'}
 */
export function readSyncMode() {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === ENABLED) {
        return ENABLED;
    }
    return DISABLED;
}

/**
 * Save sync mode. Only 'enabled' or 'disabled' accepted.
 * @param {boolean} enabled - true for enabled, false for disabled
 * @returns {{ ok: boolean, enabled?: boolean }}
 */
export function saveSyncMode(enabled) {
    const mode = enabled === true ? ENABLED : DISABLED;
    try {
        window.localStorage?.setItem(STORAGE_KEY, mode);
    } catch {
        return { ok: false };
    }
    return { ok: true, enabled: enabled === true };
}
