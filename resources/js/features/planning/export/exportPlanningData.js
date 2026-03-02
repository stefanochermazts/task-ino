/**
 * Offline-capable human-readable export of planning data.
 * Schema is deterministic for reconstruction. Uses local stores only; no network.
 */

import { validateTaskFields } from '../invariants/validateTaskFields';

const EXPORT_VERSION = 1;

/**
 * Reject partial/corrupt export input before serialization.
 * Export must not report success with malformed task records.
 * Uses shared validateTaskFields from invariants layer.
 *
 * @param {object[]} tasks
 * @returns {{ok: boolean, code?: string, message?: string}}
 */
export function validateExportTasks(tasks) {
    const result = validateTaskFields(tasks);
    if (result.ok) return { ok: true };
    return {
        ok: false,
        code: 'EXPORT_INVALID_TASKS',
        message: 'Unable to generate export file. Local task data is invalid.',
    };
}

/**
 * Build export payload from raw planning data.
 * Deterministic field naming and structure for reconstruction.
 *
 * @param {object} params
 * @param {object[]} params.tasks - Full task records (id, title, area, todayIncluded, createdAt, etc.)
 * @param {string[]} params.areas - Area identifiers
 * @param {number} params.todayCap - Today cap value
 * @param {string|null} params.lastPlanningDate - YYYY-MM-DD or null
 * @returns {object} Export payload ready for JSON.stringify
 */
export function buildExportPayload({ tasks, areas, todayCap, lastPlanningDate }) {
    const exportedAt = new Date().toISOString();
    const taskRecords = Array.isArray(tasks) ? tasks : [];

    const normalizedTasks = taskRecords.map((t) => {
        const rec = {
            id: t?.id ?? '',
            title: t?.title ?? '',
            area: t?.area ?? 'inbox',
            todayIncluded: t?.todayIncluded === true,
            createdAt: t?.createdAt ?? null,
            updatedAt: t?.updatedAt ?? null,
            scheduledFor: t?.scheduledFor ?? null,
            retainedFor: t?.retainedFor ?? null,
            status: t?.status ?? null,
        };
        if (t?.syncTimestamp != null) rec.syncTimestamp = t.syncTimestamp;
        if (t?.syncDeviceId != null) rec.syncDeviceId = t.syncDeviceId;
        return rec;
    });

    return {
        version: EXPORT_VERSION,
        exportedAt,
        reconstructionMetadata: {
            todayCap: Number.isFinite(todayCap) && todayCap > 0 ? todayCap : 3,
            lastPlanningDate: lastPlanningDate ?? null,
            areas: Array.isArray(areas) ? [...areas] : [],
        },
        tasks: normalizedTasks,
    };
}

/**
 * Serialize export payload to formatted JSON string.
 * @param {object} payload - Output of buildExportPayload
 * @returns {string} Human-readable JSON
 */
export function serializeExportPayload(payload) {
    return JSON.stringify(payload, null, 2);
}
