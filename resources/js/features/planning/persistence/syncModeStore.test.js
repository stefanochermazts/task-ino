import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readSyncMode, saveSyncMode } from './syncModeStore';

const STORAGE_KEY = 'planning.syncMode';

describe('syncModeStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        });
    });

    it('readSyncMode returns disabled when localStorage is empty', () => {
        localStorage.getItem.mockReturnValue(null);
        expect(readSyncMode()).toBe('disabled');
    });

    it('readSyncMode returns disabled when stored value is invalid', () => {
        localStorage.getItem.mockReturnValue('invalid');
        expect(readSyncMode()).toBe('disabled');
    });

    it('readSyncMode returns enabled when stored value is enabled', () => {
        localStorage.getItem.mockReturnValue('enabled');
        expect(readSyncMode()).toBe('enabled');
    });

    it('readSyncMode returns enabled for case-insensitive enabled', () => {
        localStorage.getItem.mockReturnValue('ENABLED');
        expect(readSyncMode()).toBe('enabled');
    });

    it('readSyncMode returns disabled when stored value is disabled', () => {
        localStorage.getItem.mockReturnValue('disabled');
        expect(readSyncMode()).toBe('disabled');
    });

    it('saveSyncMode persists enabled and returns ok with enabled true', () => {
        const result = saveSyncMode(true);
        expect(result.ok).toBe(true);
        expect(result.enabled).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'enabled');
    });

    it('saveSyncMode persists disabled and returns ok with enabled false', () => {
        const result = saveSyncMode(false);
        expect(result.ok).toBe(true);
        expect(result.enabled).toBe(false);
        expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'disabled');
    });

    it('saveSyncMode treats non-true as disabled', () => {
        const result = saveSyncMode(undefined);
        expect(result.ok).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'disabled');
    });

    it('saveSyncMode returns not ok when localStorage.setItem throws', () => {
        localStorage.setItem.mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        const result = saveSyncMode(true);
        expect(result.ok).toBe(false);
    });
});
