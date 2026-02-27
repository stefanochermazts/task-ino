import { beforeEach, describe, expect, it } from 'vitest';
import { addArea, isValidArea, listAreas } from './areaStore';

const STORAGE_KEY = 'planning.areas';

describe('areaStore', () => {
    beforeEach(() => {
        localStorage.removeItem(STORAGE_KEY);
    });

    describe('listAreas', () => {
        it('returns default areas when storage is empty', () => {
            expect(listAreas()).toEqual(['inbox', 'work']);
        });

        it('returns stored areas when present', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(['inbox', 'work', 'custom']));
            expect(listAreas()).toEqual(['inbox', 'work', 'custom']);
        });

        it('ensures inbox is first when missing from stored', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(['work', 'custom']));
            expect(listAreas()).toEqual(['inbox', 'work', 'custom']);
        });

        it('returns defaults when stored value is invalid JSON', () => {
            localStorage.setItem(STORAGE_KEY, 'invalid');
            expect(listAreas()).toEqual(['inbox', 'work']);
        });

        it('returns defaults when stored value is empty array', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            expect(listAreas()).toEqual(['inbox', 'work']);
        });
    });

    describe('addArea', () => {
        it('adds new area and persists', () => {
            const result = addArea('custom');
            expect(result).toEqual({ ok: true });
            expect(listAreas()).toEqual(['inbox', 'work', 'custom']);
        });

        it('normalizes areaId to lowercase', () => {
            addArea('  Custom  ');
            expect(listAreas()).toContain('custom');
        });

        it('returns ok when area already exists', () => {
            addArea('work');
            const result = addArea('work');
            expect(result).toEqual({ ok: true });
            expect(listAreas()).toEqual(['inbox', 'work']);
        });

        it('returns INVALID_AREA_ID when areaId is empty', () => {
            const result = addArea('');
            expect(result).toEqual({ ok: false, code: 'INVALID_AREA_ID' });
            expect(listAreas()).toEqual(['inbox', 'work']);
        });

        it('returns INBOX_IMMUTABLE when trying to add inbox', () => {
            const result = addArea('inbox');
            expect(result).toEqual({ ok: false, code: 'INBOX_IMMUTABLE' });
            expect(listAreas()).toEqual(['inbox', 'work']);
        });
    });

    describe('isValidArea', () => {
        it('returns true for existing areas', () => {
            expect(isValidArea('inbox')).toBe(true);
            expect(isValidArea('work')).toBe(true);
        });

        it('returns true for existing areas with different casing', () => {
            expect(isValidArea('Inbox')).toBe(true);
            expect(isValidArea('WORK')).toBe(true);
        });

        it('returns false for non-existent area', () => {
            expect(isValidArea('unknown')).toBe(false);
        });

        it('returns true for custom area after add', () => {
            addArea('custom');
            expect(isValidArea('custom')).toBe(true);
        });

        it('returns false for empty string', () => {
            expect(isValidArea('')).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isValidArea(null)).toBe(false);
            expect(isValidArea(undefined)).toBe(false);
        });
    });
});
