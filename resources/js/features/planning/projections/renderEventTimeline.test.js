import { describe, expect, it } from 'vitest';
import { renderEventTimeline } from './renderEventTimeline';

describe('renderEventTimeline', () => {
    it('returns events newest-first', () => {
        const events = [
            { timestamp: '2026-03-01T10:00:00.000Z', event_type: 'planning.task.created', entity_id: 't1' },
            { timestamp: '2026-03-02T12:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
            { timestamp: '2026-03-02T11:00:00.000Z', event_type: 'planning.task.rescheduled', entity_id: 't2' },
        ];

        const result = renderEventTimeline(events);

        expect(result).toHaveLength(3);
        expect(result[0].displayTimestamp).toBe('2026-03-02T12:00:00.000Z');
        expect(result[1].displayTimestamp).toBe('2026-03-02T11:00:00.000Z');
        expect(result[2].displayTimestamp).toBe('2026-03-01T10:00:00.000Z');
    });

    it('filters by event_type when filterType is set', () => {
        const events = [
            { timestamp: '2026-03-01T10:00:00.000Z', event_type: 'planning.task.created', entity_id: 't1' },
            { timestamp: '2026-03-02T12:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
            { timestamp: '2026-03-02T11:00:00.000Z', event_type: 'planning.task.created', entity_id: 't2' },
        ];

        const result = renderEventTimeline(events, 'planning.task.created');

        expect(result).toHaveLength(2);
        expect(result.every((e) => e.event_type === 'planning.task.created')).toBe(true);
    });

    it("filter 'all' returns all entries", () => {
        const events = [
            { timestamp: '2026-03-01T10:00:00.000Z', event_type: 'a', entity_id: 't1' },
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'b', entity_id: 't2' },
        ];

        const result = renderEventTimeline(events, 'all');

        expect(result).toHaveLength(2);
    });

    it('empty events array returns empty array', () => {
        const result = renderEventTimeline([]);

        expect(result).toEqual([]);
    });

    it('same input produces identical output (pure function)', () => {
        const events = [
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.created', entity_id: 't1' },
        ];

        const r1 = renderEventTimeline(events);
        const r2 = renderEventTimeline(events);

        expect(r1).toEqual(r2);
    });

    it('includes displayTimestamp, event_type, entity_id in each entry', () => {
        const events = [
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 't1',
                idempotency_key: 'key-1',
            },
        ];

        const result = renderEventTimeline(events);

        expect(result[0]).toEqual({
            displayTimestamp: '2026-03-02T10:00:00.000Z',
            event_type: 'planning.task.created',
            entity_id: 't1',
            idempotency_key: 'key-1',
        });
    });
});
