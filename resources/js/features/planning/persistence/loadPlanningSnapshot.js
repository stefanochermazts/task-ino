/**
 * Load a read-only snapshot of planning state from stores.
 * Used by integrity check, recovery flows, and timeline. MUST NOT mutate any store.
 *
 * @returns {Promise<{ ok: boolean, snapshot?: object, error?: string }>}
 */
import { getAllInboxTasks } from './inboxTaskStore';
import { readTodayCap } from './todayCapStore';
import { listAreas } from './areaStore';
import { readLastPlanningDate } from './dayCycleStore';

export async function loadPlanningSnapshot() {
    try {
        const [tasks, todayCap, areas, lastPlanningDate] = await Promise.all([
            getAllInboxTasks(),
            Promise.resolve(readTodayCap()),
            Promise.resolve(listAreas()),
            Promise.resolve(readLastPlanningDate()),
        ]);

        const snapshot = {
            tasks: Array.isArray(tasks) ? tasks : [],
            todayCap: Number.isFinite(todayCap) ? todayCap : 3,
            areas: Array.isArray(areas) ? areas : ['inbox'],
            dayCycle: lastPlanningDate,
        };

        return { ok: true, snapshot };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
