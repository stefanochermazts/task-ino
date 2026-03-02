import { describe, it, expect } from 'vitest';
import {
    compareMutations,
    resolveConflict,
    resolveSyncBatch,
    MERGE_CONFLICT_CODE,
    MERGE_INVARIANT_REJECT_CODE,
} from './syncBatchMerge';

// ─── compareMutations ────────────────────────────────────────────────────────

describe('compareMutations', () => {
    it('returns positive when a has higher timestamp', () => {
        expect(compareMutations({ timestamp: 200, device_id: 'A' }, { timestamp: 100, device_id: 'A' })).toBeGreaterThan(0);
    });

    it('returns negative when a has lower timestamp', () => {
        expect(compareMutations({ timestamp: 100, device_id: 'A' }, { timestamp: 200, device_id: 'A' })).toBeLessThan(0);
    });

    it('breaks tie by device_id lexicographically descending', () => {
        expect(compareMutations({ timestamp: 100, device_id: 'B' }, { timestamp: 100, device_id: 'A' })).toBeGreaterThan(0);
        expect(compareMutations({ timestamp: 100, device_id: 'A' }, { timestamp: 100, device_id: 'B' })).toBeLessThan(0);
    });

    it('returns 0 for identical timestamp and device_id', () => {
        expect(compareMutations({ timestamp: 100, device_id: 'A' }, { timestamp: 100, device_id: 'A' })).toBe(0);
    });

    it('side with device_id wins over side without', () => {
        expect(compareMutations({ timestamp: 100, device_id: 'A' }, { timestamp: 100 })).toBeGreaterThan(0);
        expect(compareMutations({ timestamp: 100 }, { timestamp: 100, device_id: 'A' })).toBeLessThan(0);
    });

    it('returns 0 when both missing device_id and same timestamp', () => {
        expect(compareMutations({ timestamp: 100 }, { timestamp: 100 })).toBe(0);
    });

    it('treats non-finite timestamp as 0', () => {
        expect(compareMutations({ timestamp: 'bad' }, { timestamp: 100 })).toBeLessThan(0);
    });
});

// ─── resolveConflict ─────────────────────────────────────────────────────────

describe('resolveConflict', () => {
    it('returns the single mutation when no conflict', () => {
        const m = { id: 'task-1', timestamp: 100, device_id: 'A' };
        expect(resolveConflict([m])).toBe(m);
    });

    it('picks highest timestamp', () => {
        const a = { id: 'task-1', timestamp: 100, device_id: 'A' };
        const b = { id: 'task-1', timestamp: 200, device_id: 'A' };
        expect(resolveConflict([a, b])).toBe(b);
    });

    it('picks highest device_id on timestamp tie', () => {
        const a = { id: 'task-1', timestamp: 100, device_id: 'device-B' };
        const b = { id: 'task-1', timestamp: 100, device_id: 'device-A' };
        expect(resolveConflict([a, b])).toBe(a);
    });

    it('is deterministic regardless of input order', () => {
        const a = { id: 'task-1', timestamp: 100, device_id: 'device-B' };
        const b = { id: 'task-1', timestamp: 100, device_id: 'device-A' };
        expect(resolveConflict([b, a])).toBe(a);
    });

    it('throws on empty array', () => {
        expect(() => resolveConflict([])).toThrow();
    });
});

// ─── resolveSyncBatch ────────────────────────────────────────────────────────

describe('resolveSyncBatch', () => {
    const baseTask = {
        id: 'task-1',
        title: 'Local task',
        todayIncluded: false,
        scheduledFor: null,
        retainedFor: null,
    };

    it('returns ok with no mutations applied when incoming is empty', () => {
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        expect(result.resolvedTasks).toHaveLength(1);
        expect(result.conflicts).toBe(0);
    });

    it('applies a non-conflicting incoming mutation (new task)', () => {
        const newTaskMutation = { id: 'task-new', timestamp: 1000, device_id: 'device-B', title: 'Remote task' };
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [newTaskMutation],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        expect(result.resolvedTasks).toHaveLength(2);
        expect(result.conflicts).toBe(0);
    });

    it('merges update to existing task by overwriting fields from winner', () => {
        const mutation = { id: 'task-1', timestamp: 1000, device_id: 'device-B', title: 'Updated title' };
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [mutation],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        const resolved = result.resolvedTasks.find((t) => t.id === 'task-1');
        expect(resolved.title).toBe('Updated title');
    });

    it('increments conflict count when multiple mutations conflict for same task', () => {
        const m1 = { id: 'task-1', timestamp: 100, device_id: 'device-A' };
        const m2 = { id: 'task-1', timestamp: 200, device_id: 'device-B' };
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [m1, m2],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        expect(result.conflicts).toBe(1);
        expect(result.code).toBe(MERGE_CONFLICT_CODE);
    });

    it('no conflict code when only one mutation per task', () => {
        const m = { id: 'task-1', timestamp: 100, device_id: 'device-A' };
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [m],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        expect(result.code).toBeUndefined();
    });

    // AC3: winner's todayIncluded is applied, but Today cap invariant is enforced at merge level
    it('applies todayIncluded from winner when cap allows it', () => {
        const mutation = { id: 'task-1', timestamp: 1000, device_id: 'device-B', todayIncluded: true };
        const result = resolveSyncBatch({
            localTasks: [{ ...baseTask, todayIncluded: false }],
            incomingMutations: [mutation],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        const resolved = result.resolvedTasks.find((t) => t.id === 'task-1');
        expect(resolved.todayIncluded).toBe(true);
    });

    it('rejects merge if resolved state would exceed todayCap', () => {
        const tasks = Array.from({ length: 5 }, (_, i) => ({
            id: `task-${i}`,
            todayIncluded: true,
            scheduledFor: null,
            retainedFor: null,
        }));
        const mutation = { id: 'task-new', timestamp: 1000, device_id: 'device-B', todayIncluded: true };
        const result = resolveSyncBatch({
            localTasks: tasks,
            incomingMutations: [mutation],
            todayCap: 5,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe(MERGE_INVARIANT_REJECT_CODE);
    });

    // AC4: no implicit carry-over
    it('does not implicitly set retainedFor or scheduledFor when incoming mutation lacks them', () => {
        const localWithRetain = {
            ...baseTask,
            retainedFor: '2026-02-24',
        };
        const mutation = { id: 'task-1', timestamp: 9999, device_id: 'device-B', title: 'Remote update' };
        const result = resolveSyncBatch({
            localTasks: [localWithRetain],
            incomingMutations: [mutation],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        const resolved = result.resolvedTasks.find((t) => t.id === 'task-1');
        expect(resolved.title).toBe('Remote update');
    });

    it('filters out local tasks with missing or empty id', () => {
        const badLocalTask = { title: 'ghost', todayIncluded: false };
        const result = resolveSyncBatch({
            localTasks: [baseTask, badLocalTask],
            incomingMutations: [],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        expect(result.resolvedTasks).toHaveLength(1);
        expect(result.resolvedTasks[0].id).toBe('task-1');
    });

    it('skips mutations with missing or empty id', () => {
        const mutationNoId = { timestamp: 1000, device_id: 'device-B', title: 'Ghost' };
        const mutationEmptyId = { id: '', timestamp: 1000, device_id: 'device-B', title: 'Ghost2' };
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [mutationNoId, mutationEmptyId],
            todayCap: 5,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe(MERGE_INVARIANT_REJECT_CODE);
    });

    it('keeps newer local confirmed decision when remote snapshot is stale', () => {
        const local = {
            ...baseTask,
            title: 'Local newer',
            updatedAt: '2026-02-24T12:00:00.000Z',
            syncTimestamp: Date.parse('2026-02-24T12:00:00.000Z'),
            syncDeviceId: 'device-local',
        };
        const staleRemote = {
            id: 'task-1',
            timestamp: Date.parse('2026-02-24T10:00:00.000Z'),
            device_id: 'device-remote',
            title: 'Remote stale',
        };
        const result = resolveSyncBatch({
            localTasks: [local],
            incomingMutations: [staleRemote],
            todayCap: 5,
        });
        expect(result.ok).toBe(true);
        const resolved = result.resolvedTasks.find((t) => t.id === 'task-1');
        expect(resolved.title).toBe('Local newer');
    });

    it('rejects malformed temporal payload in incoming mutations', () => {
        const result = resolveSyncBatch({
            localTasks: [baseTask],
            incomingMutations: [
                { id: 'task-1', timestamp: 1000, device_id: 'device-B', scheduledFor: '2026-99-40' },
            ],
            todayCap: 5,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe(MERGE_INVARIANT_REJECT_CODE);
    });

    it('rejects ownership mismatch between local and incoming mutation', () => {
        const result = resolveSyncBatch({
            localTasks: [{ ...baseTask, userId: 'user-1' }],
            incomingMutations: [{ id: 'task-1', timestamp: 1000, device_id: 'device-B', userId: 'user-2' }],
            todayCap: 5,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe(MERGE_INVARIANT_REJECT_CODE);
    });

    it('returns error on invalid inputs', () => {
        const result = resolveSyncBatch({ localTasks: null, incomingMutations: [], todayCap: 5 });
        expect(result.ok).toBe(false);
        expect(result.code).toBe(MERGE_INVARIANT_REJECT_CODE);
    });

    it('returns error on invalid todayCap', () => {
        const result = resolveSyncBatch({ localTasks: [], incomingMutations: [], todayCap: 0 });
        expect(result.ok).toBe(false);
        expect(result.code).toBe(MERGE_INVARIANT_REJECT_CODE);
    });

    // Deterministic replay: same batch same result
    it('produces identical resolved state on re-processing the same batch', () => {
        const tasks = [baseTask];
        const mutations = [
            { id: 'task-1', timestamp: 200, device_id: 'device-A', title: 'First' },
            { id: 'task-1', timestamp: 300, device_id: 'device-B', title: 'Second' },
        ];
        const r1 = resolveSyncBatch({ localTasks: tasks, incomingMutations: mutations, todayCap: 5 });
        const r2 = resolveSyncBatch({ localTasks: tasks, incomingMutations: mutations, todayCap: 5 });
        expect(r1.resolvedTasks).toEqual(r2.resolvedTasks);
        expect(r1.conflicts).toBe(r2.conflicts);
    });
});
