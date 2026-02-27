import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    mutatePlanningState,
    TODAY_CAP_EXCEEDED,
    TASK_NOT_FOUND,
    REMOVE_TASK_NOT_IN_TODAY,
    INVARIANT_VIOLATION,
    INVALID_AREA,
    INVALID_TEMPORAL_TARGET,
} from './mutationGuardrail';

const addTaskToTodayWithCapMock = vi.fn();
const swapTasksInTodayMock = vi.fn();
const bulkAddTasksToTodayMock = vi.fn();
const removeTaskFromTodayMock = vi.fn();
const setTaskPausedMock = vi.fn();
const setTaskAreaInStoreMock = vi.fn();
const rescheduleTaskInStoreMock = vi.fn();
const bulkRescheduleTasksInStoreMock = vi.fn();
const isValidAreaMock = vi.fn();

vi.mock('../persistence/todayCapStore', () => ({
    readTodayCap: () => 3,
}));

vi.mock('../persistence/inboxTaskStore', () => ({
    addTaskToTodayWithCap: (taskId, cap) => addTaskToTodayWithCapMock(taskId, cap),
    swapTasksInToday: (addTaskId, removeTaskId) =>
        swapTasksInTodayMock(addTaskId, removeTaskId),
    bulkAddTasksToToday: (taskIds, cap) => bulkAddTasksToTodayMock(taskIds, cap),
    removeTaskFromToday: (taskId) => removeTaskFromTodayMock(taskId),
    setTaskPaused: (taskId) => setTaskPausedMock(taskId),
    setTaskArea: (taskId, area) => setTaskAreaInStoreMock(taskId, area),
    rescheduleTask: (taskId, scheduledFor) => rescheduleTaskInStoreMock(taskId, scheduledFor),
    bulkRescheduleTasks: (taskIds, scheduledFor) =>
        bulkRescheduleTasksInStoreMock(taskIds, scheduledFor),
}));

vi.mock('../persistence/areaStore', () => ({
    isValidArea: (areaId) => isValidAreaMock(areaId),
}));

describe('mutationGuardrail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isValidAreaMock.mockReturnValue(true);
    });

    describe('addToToday action', () => {
        it('returns success when persistence succeeds', async () => {
            addTaskToTodayWithCapMock.mockResolvedValue({
                ok: true,
                task: { id: 't1', todayIncluded: true },
            });

            const result = await mutatePlanningState('addToToday', { taskId: 't1' });

            expect(result.ok).toBe(true);
            expect(result.task).toEqual({ id: 't1', todayIncluded: true });
        });

        it('returns TODAY_CAP_EXCEEDED with explicit code when at cap', async () => {
            addTaskToTodayWithCapMock.mockResolvedValue({
                ok: false,
                code: 'TODAY_CAP_EXCEEDED',
            });

            const result = await mutatePlanningState('addToToday', { taskId: 't4' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TODAY_CAP_EXCEEDED);
            expect(result.message).toBeDefined();
        });

        it('returns TASK_NOT_FOUND with explicit code when task missing', async () => {
            addTaskToTodayWithCapMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('addToToday', { taskId: 'missing' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            addTaskToTodayWithCapMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('addToToday', { taskId: 't1' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(result.message).toBeDefined();
        });

        it('rejects invalid taskId with INVARIANT_VIOLATION', async () => {
            const result = await mutatePlanningState('addToToday', { taskId: '' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(addTaskToTodayWithCapMock).not.toHaveBeenCalled();
        });
    });

    describe('swapToToday action', () => {
        it('returns success when persistence succeeds', async () => {
            swapTasksInTodayMock.mockResolvedValue({ ok: true });

            const result = await mutatePlanningState('swapToToday', {
                addTaskId: 't4',
                removeTaskId: 't1',
            });

            expect(result.ok).toBe(true);
        });

        it('returns TASK_NOT_FOUND with explicit code', async () => {
            swapTasksInTodayMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('swapToToday', {
                addTaskId: 't4',
                removeTaskId: 'missing',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('returns INVARIANT_VIOLATION when addTaskId equals removeTaskId', async () => {
            const result = await mutatePlanningState('swapToToday', {
                addTaskId: 't1',
                removeTaskId: 't1',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(result.message).toBe('Cannot swap a task with itself.');
            expect(swapTasksInTodayMock).not.toHaveBeenCalled();
        });

        it('returns REMOVE_TASK_NOT_IN_TODAY with explicit code', async () => {
            swapTasksInTodayMock.mockResolvedValue({
                ok: false,
                code: 'REMOVE_TASK_NOT_IN_TODAY',
            });

            const result = await mutatePlanningState('swapToToday', {
                addTaskId: 't4',
                removeTaskId: 't2',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(REMOVE_TASK_NOT_IN_TODAY);
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            swapTasksInTodayMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('swapToToday', {
                addTaskId: 't4',
                removeTaskId: 't1',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('bulkAddToToday action', () => {
        it('returns success when all items applied', async () => {
            bulkAddTasksToTodayMock.mockResolvedValue({ ok: true });

            const result = await mutatePlanningState('bulkAddToToday', {
                taskIds: ['t1', 't2'],
            });

            expect(result.ok).toBe(true);
            expect(bulkAddTasksToTodayMock).toHaveBeenCalledWith(['t1', 't2'], 3);
        });

        it('returns TODAY_CAP_EXCEEDED when bulk would exceed cap', async () => {
            bulkAddTasksToTodayMock.mockResolvedValue({
                ok: false,
                code: 'TODAY_CAP_EXCEEDED',
            });

            const result = await mutatePlanningState('bulkAddToToday', {
                taskIds: ['t1', 't2', 't3', 't4'],
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TODAY_CAP_EXCEEDED);
        });

        it('returns INVARIANT_VIOLATION for invalid taskIds', async () => {
            const result = await mutatePlanningState('bulkAddToToday', {
                taskIds: ['t1', '', 't2'],
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(bulkAddTasksToTodayMock).not.toHaveBeenCalled();
        });

        it('deduplicates task IDs before passing to persistence', async () => {
            bulkAddTasksToTodayMock.mockResolvedValue({ ok: true });

            const result = await mutatePlanningState('bulkAddToToday', {
                taskIds: ['t1', 't2', 't1'],
            });

            expect(result.ok).toBe(true);
            expect(bulkAddTasksToTodayMock).toHaveBeenCalledWith(['t1', 't2'], 3);
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            bulkAddTasksToTodayMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('bulkAddToToday', {
                taskIds: ['t1', 't2'],
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('removeFromToday action', () => {
        it('returns REMOVE_TASK_NOT_IN_TODAY when task is not in Today', async () => {
            removeTaskFromTodayMock.mockResolvedValue({
                ok: false,
                code: 'REMOVE_TASK_NOT_IN_TODAY',
            });

            const result = await mutatePlanningState('removeFromToday', { taskId: 't1' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(REMOVE_TASK_NOT_IN_TODAY);
            expect(result.message).toBeDefined();
        });

        it('returns success when persistence succeeds', async () => {
            removeTaskFromTodayMock.mockResolvedValue({
                ok: true,
                task: { id: 't1', todayIncluded: false },
            });

            const result = await mutatePlanningState('removeFromToday', { taskId: 't1' });

            expect(result.ok).toBe(true);
            expect(result.task).toEqual({ id: 't1', todayIncluded: false });
            expect(removeTaskFromTodayMock).toHaveBeenCalledWith('t1');
        });

        it('returns TASK_NOT_FOUND with explicit code when task missing', async () => {
            removeTaskFromTodayMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('removeFromToday', { taskId: 'missing' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('rejects invalid taskId with INVARIANT_VIOLATION', async () => {
            const result = await mutatePlanningState('removeFromToday', { taskId: '' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(removeTaskFromTodayMock).not.toHaveBeenCalled();
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            removeTaskFromTodayMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('removeFromToday', { taskId: 't1' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('pauseTask action', () => {
        it('returns REMOVE_TASK_NOT_IN_TODAY when task is not in Today', async () => {
            setTaskPausedMock.mockResolvedValue({
                ok: false,
                code: 'REMOVE_TASK_NOT_IN_TODAY',
            });

            const result = await mutatePlanningState('pauseTask', { taskId: 't1' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(REMOVE_TASK_NOT_IN_TODAY);
            expect(result.message).toBeDefined();
        });

        it('returns success when persistence succeeds', async () => {
            setTaskPausedMock.mockResolvedValue({
                ok: true,
                task: { id: 't1', todayIncluded: false, status: 'paused' },
            });

            const result = await mutatePlanningState('pauseTask', { taskId: 't1' });

            expect(result.ok).toBe(true);
            expect(result.task).toEqual({ id: 't1', todayIncluded: false, status: 'paused' });
            expect(setTaskPausedMock).toHaveBeenCalledWith('t1');
        });

        it('returns TASK_NOT_FOUND with explicit code when task missing', async () => {
            setTaskPausedMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('pauseTask', { taskId: 'missing' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('rejects invalid taskId with INVARIANT_VIOLATION', async () => {
            const result = await mutatePlanningState('pauseTask', { taskId: '' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(setTaskPausedMock).not.toHaveBeenCalled();
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            setTaskPausedMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('pauseTask', { taskId: 't1' });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('setTaskArea action', () => {
        it('returns success when persistence succeeds', async () => {
            setTaskAreaInStoreMock.mockResolvedValue({
                ok: true,
                task: { id: 't1', area: 'work', updatedAt: '2026-02-23T14:00:00.000Z' },
            });

            const result = await mutatePlanningState('setTaskArea', {
                taskId: 't1',
                areaId: 'work',
            });

            expect(result.ok).toBe(true);
            expect(result.task.area).toBe('work');
            expect(isValidAreaMock).toHaveBeenCalledWith('work');
            expect(setTaskAreaInStoreMock).toHaveBeenCalledWith('t1', 'work');
        });

        it('returns INVALID_AREA when area is not valid', async () => {
            isValidAreaMock.mockReturnValue(false);

            const result = await mutatePlanningState('setTaskArea', {
                taskId: 't1',
                areaId: 'unknown',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVALID_AREA);
            expect(result.message).toBe('Invalid area. Choose an existing area.');
            expect(setTaskAreaInStoreMock).not.toHaveBeenCalled();
        });

        it('returns INVALID_AREA when areaId is empty', async () => {
            const result = await mutatePlanningState('setTaskArea', {
                taskId: 't1',
                areaId: '',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVALID_AREA);
            expect(setTaskAreaInStoreMock).not.toHaveBeenCalled();
        });

        it('returns TASK_NOT_FOUND with explicit code when task missing', async () => {
            setTaskAreaInStoreMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('setTaskArea', {
                taskId: 'missing',
                areaId: 'work',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('rejects invalid taskId with INVARIANT_VIOLATION', async () => {
            const result = await mutatePlanningState('setTaskArea', {
                taskId: '',
                areaId: 'work',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(setTaskAreaInStoreMock).not.toHaveBeenCalled();
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            setTaskAreaInStoreMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('setTaskArea', {
                taskId: 't1',
                areaId: 'work',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('rescheduleTask action', () => {
        it('returns success when persistence succeeds', async () => {
            rescheduleTaskInStoreMock.mockResolvedValue({
                ok: true,
                task: { id: 't1', scheduledFor: '2026-03-01', updatedAt: '2026-02-23T15:00:00.000Z' },
            });

            const result = await mutatePlanningState('rescheduleTask', {
                taskId: 't1',
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(true);
            expect(result.task.scheduledFor).toBe('2026-03-01');
            expect(rescheduleTaskInStoreMock).toHaveBeenCalledWith('t1', '2026-03-01');
        });

        it('rejects invalid temporal target and does not call persistence', async () => {
            const result = await mutatePlanningState('rescheduleTask', {
                taskId: 't1',
                scheduledFor: 'invalid-date-xyz',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVALID_TEMPORAL_TARGET);
            expect(rescheduleTaskInStoreMock).not.toHaveBeenCalled();
        });

        it('returns TASK_NOT_FOUND with explicit code when task missing', async () => {
            rescheduleTaskInStoreMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('rescheduleTask', {
                taskId: 'missing',
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('rejects invalid taskId with INVARIANT_VIOLATION', async () => {
            const result = await mutatePlanningState('rescheduleTask', {
                taskId: '',
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(rescheduleTaskInStoreMock).not.toHaveBeenCalled();
        });

        it('accepts null to clear scheduledFor', async () => {
            rescheduleTaskInStoreMock.mockResolvedValue({
                ok: true,
                task: { id: 't1', scheduledFor: null, updatedAt: '2026-02-23T15:00:00.000Z' },
            });

            const result = await mutatePlanningState('rescheduleTask', {
                taskId: 't1',
                scheduledFor: null,
            });

            expect(result.ok).toBe(true);
            expect(rescheduleTaskInStoreMock).toHaveBeenCalledWith('t1', null);
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            rescheduleTaskInStoreMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('rescheduleTask', {
                taskId: 't1',
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('bulkRescheduleTasks action', () => {
        it('returns success when persistence succeeds', async () => {
            bulkRescheduleTasksInStoreMock.mockResolvedValue({
                ok: true,
                taskIds: ['t1', 't2'],
                count: 2,
            });

            const result = await mutatePlanningState('bulkRescheduleTasks', {
                taskIds: ['t1', 't2', 't2'],
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(true);
            expect(result.taskIds).toEqual(['t1', 't2']);
            expect(result.count).toBe(2);
            expect(bulkRescheduleTasksInStoreMock).toHaveBeenCalledWith(['t1', 't2'], '2026-03-01');
        });

        it('rejects invalid task list', async () => {
            const result = await mutatePlanningState('bulkRescheduleTasks', {
                taskIds: [],
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
            expect(bulkRescheduleTasksInStoreMock).not.toHaveBeenCalled();
        });

        it('rejects invalid temporal target', async () => {
            const result = await mutatePlanningState('bulkRescheduleTasks', {
                taskIds: ['t1', 't2'],
                scheduledFor: 'bad-date',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVALID_TEMPORAL_TARGET);
            expect(bulkRescheduleTasksInStoreMock).not.toHaveBeenCalled();
        });

        it('returns TASK_NOT_FOUND when persistence reports missing task', async () => {
            bulkRescheduleTasksInStoreMock.mockResolvedValue({
                ok: false,
                code: 'TASK_NOT_FOUND',
            });

            const result = await mutatePlanningState('bulkRescheduleTasks', {
                taskIds: ['t1', 'missing'],
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(TASK_NOT_FOUND);
        });

        it('returns INVARIANT_VIOLATION when persistence throws', async () => {
            bulkRescheduleTasksInStoreMock.mockRejectedValue(new Error('db error'));

            const result = await mutatePlanningState('bulkRescheduleTasks', {
                taskIds: ['t1', 't2'],
                scheduledFor: '2026-03-01',
            });

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });

    describe('unknown action', () => {
        it('returns INVARIANT_VIOLATION for unknown action', async () => {
            const result = await mutatePlanningState('unknownAction', {});

            expect(result.ok).toBe(false);
            expect(result.code).toBe(INVARIANT_VIOLATION);
        });
    });
});
