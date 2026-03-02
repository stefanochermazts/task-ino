/**
 * Load event timeline from event log. Read-only; does not alter any state.
 *
 * @param {string} [filterType] - 'all' or specific event_type
 * @returns {Promise<{ ok: boolean, entries?: object[], availableTypes?: string[], code?: string, message?: string }>}
 */
import { getAllEvents } from '../persistence/eventLogStore';
import { renderEventTimeline } from '../projections/renderEventTimeline';

export async function loadTimeline(filterType = 'all') {
    try {
        const events = await getAllEvents();
        const availableTypes = [...new Set((events ?? []).map((e) => e?.event_type).filter(Boolean))].sort();
        const entries = renderEventTimeline(events, filterType);
        return { ok: true, entries, availableTypes };
    } catch (err) {
        return {
            ok: false,
            code: 'TIMELINE_LOAD_FAILED',
            message: 'Unable to load event timeline. Please try again.',
        };
    }
}
