import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readTodayCap, saveTodayCap } from './todayCapStore';

const STORAGE_KEY = 'planning.todayCap';

describe('todayCapStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        });
    });

    it('readTodayCap returns default 3 when localStorage is empty', () => {
        localStorage.getItem.mockReturnValue(null);
        expect(readTodayCap()).toBe(3);
    });

    it('readTodayCap returns default 3 when localStorage has invalid value', () => {
        localStorage.getItem.mockReturnValue('invalid');
        expect(readTodayCap()).toBe(3);
    });

    it('readTodayCap returns default 3 for zero', () => {
        localStorage.getItem.mockReturnValue('0');
        expect(readTodayCap()).toBe(3);
    });

    it('readTodayCap returns default 3 for negative', () => {
        localStorage.getItem.mockReturnValue('-5');
        expect(readTodayCap()).toBe(3);
    });

    it('readTodayCap returns stored valid positive integer', () => {
        localStorage.getItem.mockReturnValue('7');
        expect(readTodayCap()).toBe(7);
    });

    it('saveTodayCap persists valid positive integer and returns ok', () => {
        const result = saveTodayCap(5);
        expect(result.ok).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, '5');
    });

    it('saveTodayCap rejects zero and returns not ok', () => {
        const result = saveTodayCap(0);
        expect(result.ok).toBe(false);
        expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('saveTodayCap rejects negative and returns not ok', () => {
        const result = saveTodayCap(-1);
        expect(result.ok).toBe(false);
        expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('saveTodayCap rejects non-numeric string and returns not ok', () => {
        const result = saveTodayCap('abc');
        expect(result.ok).toBe(false);
        expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('save and read round-trip preserves value', () => {
        saveTodayCap(10);
        localStorage.getItem.mockImplementation((key) =>
            key === STORAGE_KEY ? '10' : null,
        );
        expect(readTodayCap()).toBe(10);
    });

    it('saveTodayCap returns not ok when localStorage.setItem throws', () => {
        localStorage.setItem.mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        const result = saveTodayCap(5);
        expect(result.ok).toBe(false);
    });
});
