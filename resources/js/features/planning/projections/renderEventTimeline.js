/**
 * Pure function: prepare event log entries for display.
 * Sorts newest-first, filters by event_type, returns display objects.
 * Does not mutate any state.
 *
 * @param {object[]} events - Raw event records { timestamp, event_type, entity_id, idempotency_key? }
 * @param {string} [filterType] - 'all' or specific event_type; defaults to 'all'
 * @returns {Array<{ displayTimestamp: string, event_type: string, entity_id: string, idempotency_key?: string }>}
 */
export function renderEventTimeline(events, filterType = 'all') {
    const list = Array.isArray(events) ? events : [];
    const filtered =
        filterType && filterType !== 'all'
            ? list.filter((e) => String(e?.event_type ?? '') === filterType)
            : list;

    const sorted = filtered.slice().sort((a, b) => {
        const ta = String(a?.timestamp ?? '');
        const tb = String(b?.timestamp ?? '');
        return tb.localeCompare(ta);
    });

    return sorted.map((e) => ({
        displayTimestamp: String(e?.timestamp ?? ''),
        event_type: String(e?.event_type ?? ''),
        entity_id: String(e?.entity_id ?? ''),
        idempotency_key: e?.idempotency_key != null ? String(e.idempotency_key) : undefined,
    }));
}
