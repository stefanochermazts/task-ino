const STORAGE_KEY = 'planning.areas';
const INBOX_AREA = 'inbox';

const DEFAULT_AREAS = [INBOX_AREA, 'work'];

function loadAreas() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [...DEFAULT_AREAS];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_AREAS];
        const areas = parsed.filter((a) => typeof a === 'string' && a.trim().length > 0);
        if (!areas.includes(INBOX_AREA)) {
            areas.unshift(INBOX_AREA);
        }
        return areas;
    } catch {
        return [...DEFAULT_AREAS];
    }
}

function saveAreas(areas) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
        return true;
    } catch {
        return false;
    }
}

/**
 * @returns {string[]} List of area ids (inbox always first)
 */
export function listAreas() {
    return loadAreas();
}

/**
 * @param {string} areaId - Non-empty string, not 'inbox'
 * @returns {{ ok: boolean, code?: string }}
 */
export function addArea(areaId) {
    const id = String(areaId ?? '').trim().toLowerCase();
    if (id.length === 0) {
        return { ok: false, code: 'INVALID_AREA_ID' };
    }
    if (id === INBOX_AREA) {
        return { ok: false, code: 'INBOX_IMMUTABLE' };
    }
    const areas = loadAreas();
    if (areas.includes(id)) {
        return { ok: true };
    }
    areas.push(id);
    return saveAreas(areas) ? { ok: true } : { ok: false, code: 'SAVE_FAILED' };
}

/**
 * @param {string} areaId
 * @returns {boolean}
 */
export function isValidArea(areaId) {
    const areas = listAreas();
    return areas.includes(String(areaId ?? '').trim().toLowerCase());
}
