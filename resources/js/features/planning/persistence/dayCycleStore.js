/**
 * Minimal day-cycle marker persistence.
 * Stores lastPlanningDate (YYYY-MM-DD) for deterministic day-boundary detection.
 */
const STORAGE_KEY = 'planning.lastPlanningDate';
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @returns {string|null} YYYY-MM-DD or null if never set
 */
export function readLastPlanningDate() {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    const s = String(raw ?? '').trim();
    if (s.length === 0) return null;
    if (!YYYY_MM_DD.test(s)) return null;
    return s;
}

/**
 * @param {string} date - YYYY-MM-DD
 * @returns {{ ok: boolean }}
 */
export function saveLastPlanningDate(date) {
    const s = String(date ?? '').trim();
    if (s.length === 0) return { ok: false };
    if (!YYYY_MM_DD.test(s)) return { ok: false };
    try {
        window.localStorage?.setItem(STORAGE_KEY, s);
    } catch {
        return { ok: false };
    }
    return { ok: true };
}
