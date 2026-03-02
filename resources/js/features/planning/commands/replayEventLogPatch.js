/**
 * Replay relevant planning events onto a snapshot to produce a patched copy.
 * Pure function: does not mutate input. Events applied in chronological order.
 * Only event types affecting Today projection are applied.
 *
 * @param {object} snapshot - { tasks, todayCap, areas, dayCycle }
 * @param {object[]} events - Event records { timestamp, event_type, entity_id, payload? }
 * @returns {object} New snapshot (tasks deep-cloned and patched)
 */

const PROJECTION_EVENT_TYPES = new Set([
    'planning.task.added_to_today',
    'planning.task.removed_from_today',
    'planning.task.rescheduled',
]);

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function isParseableYyyyMmDd(value) {
    if (!value || typeof value !== 'string') return false;
    const s = value.trim();
    if (!YYYY_MM_DD.test(s)) return false;
    const [yearStr, monthStr, dayStr] = s.split('-');
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day) &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function isFutureDate(scheduledFor, referenceDate) {
    if (!isParseableYyyyMmDd(scheduledFor) || !isParseableYyyyMmDd(referenceDate)) return false;
    return String(scheduledFor).trim() > String(referenceDate).trim();
}

function deepCloneTasks(tasks) {
    return (Array.isArray(tasks) ? tasks : []).map((t) => ({ ...t }));
}

function findTaskById(tasks, id) {
    return tasks.find((t) => t?.id === id);
}

/**
 * @param {object} snapshot
 * @param {object[]} events
 * @returns {object}
 */
export function replayEventLogPatch(snapshot, events) {
    if (!snapshot) return snapshot;
    const list = Array.isArray(events) ? events : [];
    if (list.length === 0) return { ...snapshot, tasks: deepCloneTasks(snapshot.tasks) };

    const filtered = list
        .filter((e) => PROJECTION_EVENT_TYPES.has(e?.event_type))
        .slice()
        .sort((a, b) => {
            const ta = String(a?.timestamp ?? '').localeCompare(String(b?.timestamp ?? ''));
            if (ta !== 0) return ta;
            return 0;
        });

    const tasks = deepCloneTasks(snapshot.tasks);
    const referenceDate = isParseableYyyyMmDd(snapshot?.dayCycle) ? String(snapshot.dayCycle).trim() : null;

    for (const ev of filtered) {
        const entityId = ev?.entity_id ?? '';
        const task = findTaskById(tasks, entityId);
        if (!task) continue;

        switch (ev.event_type) {
            case 'planning.task.added_to_today':
                task.todayIncluded = true;
                break;
            case 'planning.task.removed_from_today':
                task.todayIncluded = false;
                break;
            case 'planning.task.rescheduled': {
                const scheduledFor = ev?.payload?.scheduledFor;
                if (isFutureDate(scheduledFor, referenceDate)) {
                    task.todayIncluded = false;
                }
                break;
            }
            default:
                break;
        }
    }

    return {
        ...snapshot,
        tasks,
    };
}
