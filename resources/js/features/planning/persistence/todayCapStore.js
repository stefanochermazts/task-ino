import { DEFAULT_TODAY_CAP } from '../projections/computeTodayProjection';

const STORAGE_KEY = 'planning.todayCap';

export function readTodayCap() {
    const fromStorage = window.localStorage?.getItem(STORAGE_KEY);
    const parsed = Number.parseInt(String(fromStorage ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_TODAY_CAP;
    }
    return parsed;
}

export function saveTodayCap(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return { ok: false };
    }
    try {
        window.localStorage?.setItem(STORAGE_KEY, String(parsed));
    } catch {
        return { ok: false };
    }
    return { ok: true };
}
