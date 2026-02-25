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
});
