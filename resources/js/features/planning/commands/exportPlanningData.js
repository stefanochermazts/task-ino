/**
 * Offline export command. Reads from local stores only; no network required.
 * @returns {Promise<{ok: boolean, json?: string, filename?: string, code?: string, message?: string}>}
 */

import { getAllInboxTasks } from '../persistence/inboxTaskStore';
import { readTodayCap } from '../persistence/todayCapStore';
import { listAreas } from '../persistence/areaStore';
import { readLastPlanningDate } from '../persistence/dayCycleStore';
import { buildExportPayload, serializeExportPayload, validateExportTasks } from '../export/exportPlanningData';

function suggestFilename() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `taskino-planning-${y}${m}${day}-${h}${min}.json`;
}

export async function exportPlanningData() {
    try {
        const [tasks, areas, todayCap, lastPlanningDate] = await Promise.all([
            getAllInboxTasks(),
            Promise.resolve(listAreas()),
            Promise.resolve(readTodayCap()),
            Promise.resolve(readLastPlanningDate()),
        ]);

        const validTasks = validateExportTasks(tasks);
        if (!validTasks.ok) {
            return validTasks;
        }

        const payload = buildExportPayload({
            tasks,
            areas,
            todayCap,
            lastPlanningDate,
        });

        const json = serializeExportPayload(payload);
        if (typeof json !== 'string' || json.length === 0) {
            return {
                ok: false,
                code: 'EXPORT_SERIALIZATION_FAILED',
                message: 'Unable to generate export file. Please retry.',
            };
        }

        return {
            ok: true,
            json,
            filename: suggestFilename(),
        };
    } catch {
        return {
            ok: false,
            code: 'EXPORT_FAILED',
            message: 'Export is temporarily unavailable. Please retry.',
        };
    }
}
