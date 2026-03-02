import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readLastPlanningDate, saveLastPlanningDate } from './dayCycleStore';

const STORAGE_KEY = 'planning.lastPlanningDate';

describe('dayCycleStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        });
    });

    it('readLastPlanningDate returns null when localStorage is empty', () => {
        localStorage.getItem.mockReturnValue(null);
        expect(readLastPlanningDate()).toBeNull();
    });

    it('readLastPlanningDate returns null when value is invalid', () => {
        localStorage.getItem.mockReturnValue('not-a-date');
        expect(readLastPlanningDate()).toBeNull();
    });

    it('readLastPlanningDate returns YYYY-MM-DD for valid ISO date', () => {
        localStorage.getItem.mockReturnValue('2026-02-23');
        expect(readLastPlanningDate()).toBe('2026-02-23');
    });

    it('readLastPlanningDate returns null for non YYYY-MM-DD values', () => {
        localStorage.getItem.mockReturnValue('2026-02-23T12:00:00.000Z');
        expect(readLastPlanningDate()).toBeNull();
    });

    it('saveLastPlanningDate persists valid date and returns ok', () => {
        const result = saveLastPlanningDate('2026-02-23');
        expect(result.ok).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, '2026-02-23');
    });

    it('saveLastPlanningDate rejects empty string', () => {
        const result = saveLastPlanningDate('');
        expect(result.ok).toBe(false);
        expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('saveLastPlanningDate rejects invalid date', () => {
        const result = saveLastPlanningDate('invalid');
        expect(result.ok).toBe(false);
        expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('save and read round-trip preserves YYYY-MM-DD', () => {
        saveLastPlanningDate('2026-03-15');
        localStorage.getItem.mockImplementation((key) =>
            key === STORAGE_KEY ? '2026-03-15' : null,
        );
        expect(readLastPlanningDate()).toBe('2026-03-15');
    });

    it('saveLastPlanningDate returns not ok when localStorage.setItem throws', () => {
        localStorage.setItem.mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        const result = saveLastPlanningDate('2026-02-23');
        expect(result.ok).toBe(false);
    });
});
