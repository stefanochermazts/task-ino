import { describe, expect, it } from 'vitest';
import { replayEventLogPatch } from './replayEventLogPatch';

describe('replayEventLogPatch', () => {
    const baseSnapshot = {
        tasks: [
            { id: 't1', title: 'Task 1', todayIncluded: false },
            { id: 't2', title: 'Task 2', todayIncluded: false },
        ],
        todayCap: 3,
        areas: ['inbox', 'work'],
        dayCycle: '2026-03-02',
    };

    it('returns unchanged snapshot when events is empty', () => {
        const result = replayEventLogPatch(baseSnapshot, []);

        expect(result).not.toBe(baseSnapshot);
        expect(result.tasks).toHaveLength(2);
        expect(result.tasks[0].todayIncluded).toBe(false);
        expect(result.tasks[1].todayIncluded).toBe(false);
    });

    it('added_to_today event sets todayIncluded true on matching task', () => {
        const events = [
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
        ];

        const result = replayEventLogPatch(baseSnapshot, events);

        expect(result.tasks[0].todayIncluded).toBe(true);
        expect(result.tasks[1].todayIncluded).toBe(false);
    });

    it('removed_from_today event sets todayIncluded false on matching task', () => {
        const snapshot = {
            ...baseSnapshot,
            tasks: [{ id: 't1', title: 'Task 1', todayIncluded: true }],
        };
        const events = [
            { timestamp: '2026-03-02T11:00:00.000Z', event_type: 'planning.task.removed_from_today', entity_id: 't1' },
        ];

        const result = replayEventLogPatch(snapshot, events);

        expect(result.tasks[0].todayIncluded).toBe(false);
    });

    it('applies events in chronological order (later event wins)', () => {
        const events = [
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
            { timestamp: '2026-03-02T11:00:00.000Z', event_type: 'planning.task.removed_from_today', entity_id: 't1' },
        ];

        const result = replayEventLogPatch(baseSnapshot, events);

        expect(result.tasks[0].todayIncluded).toBe(false);
    });

    it('ignores unknown event types', () => {
        const events = [
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.created', entity_id: 't1' },
            { timestamp: '2026-03-02T10:01:00.000Z', event_type: 'planning.sync.reset', entity_id: 'x' },
        ];

        const result = replayEventLogPatch(baseSnapshot, events);

        expect(result.tasks[0].todayIncluded).toBe(false);
        expect(result.tasks).toHaveLength(2);
    });

    it('does not mutate input snapshot', () => {
        const events = [
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.added_to_today', entity_id: 't1' },
        ];

        replayEventLogPatch(baseSnapshot, events);

        expect(baseSnapshot.tasks[0].todayIncluded).toBe(false);
    });

    it('rescheduled to future date sets todayIncluded false', () => {
        const snapshot = {
            ...baseSnapshot,
            tasks: [{ id: 't1', title: 'Task 1', todayIncluded: true }],
        };
        const events = [
            {
                timestamp: '2026-03-02T12:00:00.000Z',
                event_type: 'planning.task.rescheduled',
                entity_id: 't1',
                payload: { scheduledFor: '2026-12-31' },
            },
        ];

        const result = replayEventLogPatch(snapshot, events);

        expect(result.tasks[0].todayIncluded).toBe(false);
    });

    it('rescheduled does not use wall clock; uses snapshot dayCycle as reference', () => {
        const snapshot = {
            ...baseSnapshot,
            dayCycle: '2026-03-02',
            tasks: [{ id: 't1', title: 'Task 1', todayIncluded: true }],
        };
        const events = [
            {
                timestamp: '2035-01-01T00:00:00.000Z',
                event_type: 'planning.task.rescheduled',
                entity_id: 't1',
                payload: { scheduledFor: '2026-03-01' },
            },
        ];

        const result = replayEventLogPatch(snapshot, events);

        expect(result.tasks[0].todayIncluded).toBe(true);
    });
});
