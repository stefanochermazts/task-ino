import { describe, expect, it } from 'vitest';
import {
    CONFIRMATION_ERROR,
    DESTRUCTIVE_OPERATIONS,
    requiresConfirmation,
} from './destructiveOperations';

describe('destructiveOperations', () => {
    describe('DESTRUCTIVE_OPERATIONS', () => {
        it('exports all required operation IDs', () => {
            expect(DESTRUCTIVE_OPERATIONS.DELETE_LOCAL).toBe('delete-local-planning-data');
            expect(DESTRUCTIVE_OPERATIONS.DELETE_SYNCED).toBe('delete-synced-planning-data');
            expect(DESTRUCTIVE_OPERATIONS.RESET_SYNC).toBe('reset-sync-state');
            expect(DESTRUCTIVE_OPERATIONS.KEY_ROTATION).toBe('e2ee-key-rotation');
        });
    });

    describe('requiresConfirmation', () => {
        it('returns true for all DESTRUCTIVE_OPERATIONS values', () => {
            expect(requiresConfirmation(DESTRUCTIVE_OPERATIONS.DELETE_LOCAL)).toBe(true);
            expect(requiresConfirmation(DESTRUCTIVE_OPERATIONS.DELETE_SYNCED)).toBe(true);
            expect(requiresConfirmation(DESTRUCTIVE_OPERATIONS.RESET_SYNC)).toBe(true);
            expect(requiresConfirmation(DESTRUCTIVE_OPERATIONS.KEY_ROTATION)).toBe(true);
        });

        it('returns false for arbitrary non-destructive operation IDs', () => {
            expect(requiresConfirmation('rebuild-projection')).toBe(false);
            expect(requiresConfirmation('add-to-today')).toBe(false);
            expect(requiresConfirmation('create-inbox-task')).toBe(false);
            expect(requiresConfirmation('')).toBe(false);
        });
    });

    describe('CONFIRMATION_ERROR', () => {
        it('has expected code and message', () => {
            expect(CONFIRMATION_ERROR.code).toBe('CONFIRMATION_REQUIRED');
            expect(CONFIRMATION_ERROR.message).toContain('explicit confirmation');
            expect(CONFIRMATION_ERROR.message).toContain('confirmed: true');
        });
    });
});
