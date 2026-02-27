import { describe, expect, it } from 'vitest';
import { computeTodayProjection } from './computeTodayProjection';

describe('computeTodayProjection', () => {
    it('returns deterministic output for identical input state', () => {
        const input = {
            todayCap: 2,
            tasks: [
                { id: 'a', title: 'A', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: true },
                { id: 'b', title: 'B', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: true },
                { id: 'c', title: 'C', createdAt: '2026-02-24T08:00:00.000Z', todayIncluded: true },
            ],
        };

        const first = computeTodayProjection(input);
        const second = computeTodayProjection(input);

        expect(first).toEqual(second);
        expect(first.items.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('ignores invalid records deterministically without mutating input', () => {
        const tasks = [
            { id: 'a', title: 'A', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: true },
            { id: '', title: 'missing id', createdAt: '2026-02-24T08:00:00.000Z', todayIncluded: true },
            { id: 'b', title: '', createdAt: '2026-02-24T07:00:00.000Z', todayIncluded: true },
        ];

        const projection = computeTodayProjection({ tasks, todayCap: 3 });

        expect(projection.items.map((item) => item.id)).toEqual(['a']);
        expect(tasks).toHaveLength(3);
    });

    it('keeps same projection outcome regardless of network status', () => {
        const tasks = [
            { id: 'a', title: 'A', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: true },
            { id: 'b', title: 'B', createdAt: '2026-02-24T08:00:00.000Z', todayIncluded: true },
        ];

        const online = computeTodayProjection({ tasks, todayCap: 5, networkOnline: true });
        const offline = computeTodayProjection({ tasks, todayCap: 5, networkOnline: false });

        expect(online).toEqual(offline);
    });

    it('aggregates tasks from multiple areas and passes area through items', () => {
        const tasks = [
            { id: 'inbox-1', title: 'Inbox task', area: 'inbox', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: true },
            { id: 'work-1', title: 'Work task', area: 'work', createdAt: '2026-02-24T08:00:00.000Z', todayIncluded: true },
        ];

        const projection = computeTodayProjection({ tasks, todayCap: 3 });

        expect(projection.items).toHaveLength(2);
        expect(projection.items.map((i) => i.id)).toEqual(['inbox-1', 'work-1']);
        expect(projection.items[0].area).toBe('inbox');
        expect(projection.items[1].area).toBe('work');
    });

    it('defaults area to inbox when task has no area field', () => {
        const tasks = [
            { id: 'legacy', title: 'Legacy task', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: true },
        ];

        const projection = computeTodayProjection({ tasks, todayCap: 3 });

        expect(projection.items[0].area).toBe('inbox');
    });
});
