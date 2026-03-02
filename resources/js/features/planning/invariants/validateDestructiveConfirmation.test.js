import { describe, expect, it } from 'vitest';
import { validateDestructiveConfirmation } from './validateDestructiveConfirmation';
import { DESTRUCTIVE_OPERATIONS } from '../commands/destructiveOperations';

describe('validateDestructiveConfirmation', () => {
    it('returns ok: true when confirmed is true', () => {
        const result = validateDestructiveConfirmation({
            confirmed: true,
            operationId: DESTRUCTIVE_OPERATIONS.RESET_SYNC,
        });
        expect(result.ok).toBe(true);
    });

    it('returns ok: false with CONFIRMATION_REQUIRED when confirmed is false', () => {
        const result = validateDestructiveConfirmation({
            confirmed: false,
            operationId: DESTRUCTIVE_OPERATIONS.RESET_SYNC,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('returns ok: false with CONFIRMATION_REQUIRED when confirmed is undefined', () => {
        const result = validateDestructiveConfirmation({
            confirmed: undefined,
            operationId: DESTRUCTIVE_OPERATIONS.RESET_SYNC,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('returns ok: false with CONFIRMATION_REQUIRED when confirmed is wrong type', () => {
        const result = validateDestructiveConfirmation({
            confirmed: 'yes',
            operationId: DESTRUCTIVE_OPERATIONS.RESET_SYNC,
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('returns INVALID_DESTRUCTIVE_OPERATION when operationId is not registered', () => {
        const result = validateDestructiveConfirmation({
            confirmed: true,
            operationId: 'rebuild-projection',
        });
        expect(result.ok).toBe(false);
        expect(result.code).toBe('INVALID_DESTRUCTIVE_OPERATION');
    });
});
