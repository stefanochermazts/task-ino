/**
 * Rebuild the Today projection deterministically from snapshot (and optional event replay).
 * Read-only on stores: does not mutate lastPlanningDate, areas, todayCap, or task todayIncluded in persistence.
 * Optionally renders to DOM when ui is provided.
 *
 * @param {object} [options]
 * @param {object} [options.snapshot] - Pre-loaded snapshot; if omitted, loads via loadPlanningSnapshot()
 * @param {boolean} [options.useEventLog] - If true, replay events onto snapshot before compute
 * @param {object} [options.ui] - { todayList, todayEmpty, todayCount, todayCapValue } for render
 * @param {function} [options.onRemoveFromToday] - Callback for remove-from-today button
 * @returns {Promise<{ ok: boolean, projection?: object, code?: string, message?: string }>}
 */

import { loadPlanningSnapshot } from '../persistence/loadPlanningSnapshot';
import { getAllEvents } from '../persistence/eventLogStore';
import { computeTodayProjection } from '../projections/computeTodayProjection';
import { renderTodayProjection } from '../projections/renderTodayProjection';
import { replayEventLogPatch } from './replayEventLogPatch';

export async function rebuildPlanningProjection(options = {}) {
    const { snapshot: providedSnapshot, useEventLog = false, ui, onRemoveFromToday } = options;

    let snapshot = providedSnapshot;
    let eventReplayPartial = false;

    if (!snapshot) {
        const loadResult = await loadPlanningSnapshot();
        if (!loadResult.ok) {
            return {
                ok: false,
                code: 'REBUILD_FAILED',
                message: loadResult.error ?? 'Could not load planning state for rebuild.',
            };
        }
        snapshot = loadResult.snapshot;
    }

    if (useEventLog) {
        try {
            const events = await getAllEvents();
            snapshot = replayEventLogPatch(snapshot, events);
        } catch {
            // Non-fatal: proceed with unpatched snapshot, but surface partial state
            eventReplayPartial = true;
        }
    }

    const { tasks = [], todayCap = 3 } = snapshot;
    const projection = computeTodayProjection({ tasks, todayCap });

    if (ui && ui.todayList && ui.todayEmpty && ui.todayCount && ui.todayCapValue) {
        renderTodayProjection(projection, ui, { onRemoveFromToday });
    }

    if (eventReplayPartial) {
        return {
            ok: true,
            code: 'REBUILD_PARTIAL',
            message: 'Projection rebuilt from snapshot, but event replay could not be applied.',
            projection,
        };
    }

    return { ok: true, projection };
}
