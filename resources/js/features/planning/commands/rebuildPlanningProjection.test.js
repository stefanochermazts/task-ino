import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rebuildPlanningProjection } from './rebuildPlanningProjection';

const loadPlanningSnapshotMock = vi.fn();
const getAllEventsMock = vi.fn();
const renderTodayProjectionMock = vi.fn();

vi.mock('../persistence/loadPlanningSnapshot', () => ({
    loadPlanningSnapshot: () => loadPlanningSnapshotMock(),
}));

vi.mock('../persistence/eventLogStore', () => ({
    getAllEvents: () => getAllEventsMock(),
}));

vi.mock('../projections/renderTodayProjection', () => ({
    renderTodayProjection: (projection, ui, opts) => renderTodayProjectionMock(projection, ui, opts),
}));

describe('rebuildPlanningProjection', () => {
    const validSnapshot = {
        tasks: [{ id: 't1', title: 'Task 1', todayIncluded: true }],
        todayCap: 3,
        areas: ['inbox'],
        dayCycle: null,
    };

    const validUi = {
        todayList: document.createElement('ul'),
        todayEmpty: document.createElement('p'),
        todayCount: document.createElement('span'),
        todayCapValue: document.createElement('span'),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        loadPlanningSnapshotMock.mockResolvedValue({ ok: true, snapshot: validSnapshot });
        getAllEventsMock.mockResolvedValue([]);
        renderTodayProjectionMock.mockReturnValue(undefined);
    });

    it('returns identical projection for same snapshot input (determinism)', async () => {
        const r1 = await rebuildPlanningProjection({ snapshot: validSnapshot });
        const r2 = await rebuildPlanningProjection({ snapshot: validSnapshot });

        expect(r1.ok).toBe(true);
        expect(r2.ok).toBe(true);
        expect(r1.projection).toEqual(r2.projection);
        expect(r1.projection.items).toHaveLength(1);
        expect(r1.projection.cap).toBe(3);
    });

    it('does not mutate snapshot (todayCap, areas, dayCycle, todayIncluded preserved)', async () => {
        const snap = { ...validSnapshot, tasks: [...validSnapshot.tasks.map((t) => ({ ...t }))] };

        await rebuildPlanningProjection({ snapshot: snap });

        expect(snap.todayCap).toBe(3);
        expect(snap.areas).toEqual(['inbox']);
        expect(snap.dayCycle).toBeNull();
        expect(snap.tasks[0].todayIncluded).toBe(true);
    });

    it('succeeds with empty event log when useEventLog true', async () => {
        getAllEventsMock.mockResolvedValue([]);

        const result = await rebuildPlanningProjection({
            snapshot: validSnapshot,
            useEventLog: true,
        });

        expect(result.ok).toBe(true);
        expect(result.projection.items).toHaveLength(1);
    });

    it('returns REBUILD_PARTIAL when event log cannot be loaded', async () => {
        getAllEventsMock.mockRejectedValue(new Error('event log unavailable'));

        const result = await rebuildPlanningProjection({
            snapshot: validSnapshot,
            useEventLog: true,
        });

        expect(result.ok).toBe(true);
        expect(result.code).toBe('REBUILD_PARTIAL');
        expect(result.projection.items).toHaveLength(1);
    });

    it('applies event log patch when useEventLog true', async () => {
        getAllEventsMock.mockResolvedValue([
            { timestamp: '2026-03-02T10:00:00.000Z', event_type: 'planning.task.removed_from_today', entity_id: 't1' },
        ]);

        const result = await rebuildPlanningProjection({
            snapshot: validSnapshot,
            useEventLog: true,
        });

        expect(result.ok).toBe(true);
        expect(result.projection.items).toHaveLength(0);
    });

    it('returns REBUILD_FAILED when snapshot load fails', async () => {
        loadPlanningSnapshotMock.mockResolvedValue({ ok: false, error: 'IndexedDB unavailable' });

        const result = await rebuildPlanningProjection({});

        expect(result.ok).toBe(false);
        expect(result.code).toBe('REBUILD_FAILED');
        expect(result.message).toContain('IndexedDB');
    });

    it('calls renderTodayProjection once when ui provided', async () => {
        await rebuildPlanningProjection({ snapshot: validSnapshot, ui: validUi });

        expect(renderTodayProjectionMock).toHaveBeenCalledTimes(1);
        expect(renderTodayProjectionMock).toHaveBeenCalledWith(
            expect.objectContaining({ items: expect.any(Array), cap: 3 }),
            validUi,
            expect.any(Object),
        );
    });

    it('loads snapshot when not provided', async () => {
        await rebuildPlanningProjection({});

        expect(loadPlanningSnapshotMock).toHaveBeenCalledTimes(1);
    });

    it('does not call loadPlanningSnapshot when snapshot provided', async () => {
        await rebuildPlanningProjection({ snapshot: validSnapshot });

        expect(loadPlanningSnapshotMock).not.toHaveBeenCalled();
    });
});
