import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportPlanningData } from './exportPlanningData';

const getAllInboxTasksMock = vi.fn();
const readTodayCapMock = vi.fn();
const listAreasMock = vi.fn();
const readLastPlanningDateMock = vi.fn();

vi.mock('../persistence/inboxTaskStore', () => ({
    getAllInboxTasks: () => getAllInboxTasksMock(),
}));

vi.mock('../persistence/todayCapStore', () => ({
    readTodayCap: () => readTodayCapMock(),
}));

vi.mock('../persistence/areaStore', () => ({
    listAreas: () => listAreasMock(),
}));

vi.mock('../persistence/dayCycleStore', () => ({
    readLastPlanningDate: () => readLastPlanningDateMock(),
}));

describe('exportPlanningData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAllInboxTasksMock.mockResolvedValue([]);
        readTodayCapMock.mockReturnValue(3);
        listAreasMock.mockReturnValue(['inbox', 'work']);
        readLastPlanningDateMock.mockReturnValue(null);
    });

    it('returns ok with json and filename when all stores succeed', async () => {
        const result = await exportPlanningData();

        expect(result.ok).toBe(true);
        expect(typeof result.json).toBe('string');
        expect(result.filename).toMatch(/^taskino-planning-\d{8}-\d{4}\.json$/);
        const parsed = JSON.parse(result.json);
        expect(parsed.version).toBe(1);
        expect(parsed.exportedAt).toBeDefined();
        expect(parsed.reconstructionMetadata.todayCap).toBe(3);
        expect(parsed.reconstructionMetadata.areas).toEqual(['inbox', 'work']);
        expect(Array.isArray(parsed.tasks)).toBe(true);
    });

    it('includes full task state in export', async () => {
        const tasks = [
            {
                id: 't1',
                title: 'Full task',
                area: 'work',
                todayIncluded: true,
                createdAt: '2026-03-01T08:00:00.000Z',
                updatedAt: '2026-03-02T09:00:00.000Z',
                scheduledFor: '2026-03-15',
                retainedFor: null,
            },
        ];
        getAllInboxTasksMock.mockResolvedValue(tasks);

        const result = await exportPlanningData();

        expect(result.ok).toBe(true);
        const parsed = JSON.parse(result.json);
        expect(parsed.tasks).toHaveLength(1);
        expect(parsed.tasks[0].id).toBe('t1');
        expect(parsed.tasks[0].title).toBe('Full task');
        expect(parsed.tasks[0].area).toBe('work');
        expect(parsed.tasks[0].todayIncluded).toBe(true);
        expect(parsed.tasks[0].scheduledFor).toBe('2026-03-15');
    });

    it('returns deterministic error when task store fails', async () => {
        getAllInboxTasksMock.mockRejectedValue(new Error('IndexedDB unavailable'));

        const result = await exportPlanningData();

        expect(result.ok).toBe(false);
        expect(result.code).toBe('EXPORT_FAILED');
        expect(result.message).toContain('retry');
    });

    it('rejects export when local task payload is malformed', async () => {
        getAllInboxTasksMock.mockResolvedValue([
            { id: '', title: 'Broken task', area: 'inbox', todayIncluded: false },
        ]);

        const result = await exportPlanningData();

        expect(result.ok).toBe(false);
        expect(result.code).toBe('EXPORT_INVALID_TASKS');
    });

    it('succeeds when offline (no network required)', async () => {
        Object.defineProperty(window.navigator, 'onLine', {
            configurable: true,
            get: () => false,
        });
        getAllInboxTasksMock.mockResolvedValue([
            { id: 't1', title: 'Offline task', area: 'inbox', todayIncluded: false },
        ]);

        const result = await exportPlanningData();

        expect(result.ok).toBe(true);
        expect(result.json).toBeTruthy();
        const parsed = JSON.parse(result.json);
        expect(parsed.tasks).toHaveLength(1);
    });
});
