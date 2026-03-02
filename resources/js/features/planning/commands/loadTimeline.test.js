import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTimeline } from './loadTimeline';

const getAllEventsMock = vi.fn();
const renderEventTimelineMock = vi.fn();

vi.mock('../persistence/eventLogStore', () => ({
    getAllEvents: () => getAllEventsMock(),
}));

vi.mock('../projections/renderEventTimeline', () => ({
    renderEventTimeline: (events, filterType) => renderEventTimelineMock(events, filterType),
}));

describe('loadTimeline', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAllEventsMock.mockResolvedValue([
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.created', entity_id: 't1' },
            { timestamp: '2026-03-02T11:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
        ]);
        renderEventTimelineMock.mockReturnValue([
            { displayTimestamp: '2026-03-02T11:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
            { displayTimestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.created', entity_id: 't1' },
        ]);
    });

    it('returns ok, entries, and availableTypes on success', async () => {
        const result = await loadTimeline('all');

        expect(result.ok).toBe(true);
        expect(result.entries).toHaveLength(2);
        expect(result.availableTypes).toEqual(['planning.task.added_to_today', 'planning.task.created'].sort());
    });

    it('availableTypes is deduplicated and sorted', async () => {
        getAllEventsMock.mockResolvedValue([
            { timestamp: '1', event_type: 'planning.task.created', entity_id: 't1' },
            { timestamp: '2', event_type: 'planning.task.added_to_today', entity_id: 't2' },
            { timestamp: '3', event_type: 'planning.task.created', entity_id: 't3' },
        ]);

        const result = await loadTimeline('all');

        expect(result.availableTypes).toEqual(['planning.task.added_to_today', 'planning.task.created']);
    });

    it('returns TIMELINE_LOAD_FAILED when event log read fails', async () => {
        getAllEventsMock.mockRejectedValue(new Error('Event log read failed.'));

        const result = await loadTimeline('all');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TIMELINE_LOAD_FAILED');
        expect(result.message).toBeDefined();
        expect(renderEventTimelineMock).not.toHaveBeenCalled();
    });

    it('passes filterType to renderEventTimeline', async () => {
        await loadTimeline('planning.task.created');

        expect(renderEventTimelineMock).toHaveBeenCalledWith(
            expect.any(Array),
            'planning.task.created',
        );
    });
});
