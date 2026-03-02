import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPlanningSnapshot } from './loadPlanningSnapshot';

const getAllInboxTasksMock = vi.fn();
const readTodayCapMock = vi.fn();
const listAreasMock = vi.fn();
const readLastPlanningDateMock = vi.fn();

vi.mock('./inboxTaskStore', () => ({
    getAllInboxTasks: () => getAllInboxTasksMock(),
}));

vi.mock('./todayCapStore', () => ({
    readTodayCap: () => readTodayCapMock(),
}));

vi.mock('./areaStore', () => ({
    listAreas: () => listAreasMock(),
}));

vi.mock('./dayCycleStore', () => ({
    readLastPlanningDate: () => readLastPlanningDateMock(),
}));

describe('loadPlanningSnapshot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAllInboxTasksMock.mockResolvedValue([]);
        readTodayCapMock.mockReturnValue(3);
        listAreasMock.mockReturnValue(['inbox', 'work']);
        readLastPlanningDateMock.mockReturnValue(null);
    });

    it('loads snapshot from all stores', async () => {
        const tasks = [{ id: 't1', title: 'Task', area: 'inbox' }];
        getAllInboxTasksMock.mockResolvedValue(tasks);

        const result = await loadPlanningSnapshot();

        expect(result.ok).toBe(true);
        expect(result.snapshot).toEqual({
            tasks,
            todayCap: 3,
            areas: ['inbox', 'work'],
            dayCycle: null,
        });
    });

    it('returns ok: false when getAllInboxTasks throws', async () => {
        getAllInboxTasksMock.mockRejectedValue(new Error('IndexedDB error'));

        const result = await loadPlanningSnapshot();

        expect(result.ok).toBe(false);
        expect(result.error).toContain('IndexedDB');
        expect(result.snapshot).toBeUndefined();
    });

    it('does not mutate any store (read-only)', async () => {
        await loadPlanningSnapshot();

        expect(getAllInboxTasksMock).toHaveBeenCalledTimes(1);
        expect(readTodayCapMock).toHaveBeenCalledTimes(1);
        expect(listAreasMock).toHaveBeenCalledTimes(1);
        expect(readLastPlanningDateMock).toHaveBeenCalledTimes(1);
    });
});
