import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addToToday, swapToToday } from './addToToday';

const readTodayCapMock = vi.fn();
const addTaskToTodayWithCapMock = vi.fn();
const swapTasksInTodayMock = vi.fn();

vi.mock('../persistence/todayCapStore', () => ({
    readTodayCap: () => readTodayCapMock(),
}));

vi.mock('../persistence/inboxTaskStore', () => ({
    addTaskToTodayWithCap: (taskId, cap) => addTaskToTodayWithCapMock(taskId, cap),
    swapTasksInToday: (addTaskId, removeTaskId) => swapTasksInTodayMock(addTaskId, removeTaskId),
}));

describe('addToToday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        readTodayCapMock.mockReturnValue(3);
    });

    it('adds task to Today when under cap', async () => {
        addTaskToTodayWithCapMock.mockResolvedValue({
            ok: true,
            task: { id: 't1', todayIncluded: true },
        });

        const result = await addToToday('t1');

        expect(result.ok).toBe(true);
        expect(addTaskToTodayWithCapMock).toHaveBeenCalledWith('t1', 3);
    });

    it('returns TODAY_CAP_EXCEEDED when at cap', async () => {
        addTaskToTodayWithCapMock.mockResolvedValue({
            ok: false,
            code: 'TODAY_CAP_EXCEEDED',
        });

        const result = await addToToday('t4');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TODAY_CAP_EXCEEDED');
    });

    it('returns TASK_NOT_FOUND when task missing', async () => {
        addTaskToTodayWithCapMock.mockResolvedValue({
            ok: false,
            code: 'TASK_NOT_FOUND',
        });

        const result = await addToToday('missing');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TASK_NOT_FOUND');
    });

    it('returns fallback error when persistence throws', async () => {
        addTaskToTodayWithCapMock.mockRejectedValue(new Error('db error'));

        const result = await addToToday('t1');

        expect(result.ok).toBe(false);
        expect(result.message).toBe('Unable to save task locally. Please retry.');
    });
});

describe('swapToToday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('swaps one task out and one in', async () => {
        swapTasksInTodayMock.mockResolvedValue({ ok: true });

        const result = await swapToToday('t4', 't1');

        expect(result.ok).toBe(true);
        expect(swapTasksInTodayMock).toHaveBeenCalledWith('t4', 't1');
    });
});
