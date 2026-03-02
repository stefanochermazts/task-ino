import { describe, expect, it } from 'vitest';
import { validateTaskFields } from './validateTaskFields';

describe('validateTaskFields', () => {
    it('returns ok when all tasks have non-empty id and title', () => {
        const result = validateTaskFields([
            { id: 't1', title: 'Valid' },
            { id: 't2', title: 'Also valid' },
        ]);
        expect(result.ok).toBe(true);
        expect(result.violations).toBeUndefined();
    });

    it('returns violations when task has empty id', () => {
        const result = validateTaskFields([{ id: '', title: 'Has title' }]);
        expect(result.ok).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].invariant).toBe('TASK_FIELD_INTEGRITY');
        expect(result.violations[0].detail).toContain('empty id or title');
    });

    it('returns violations when task has empty title', () => {
        const result = validateTaskFields([{ id: 't1', title: '' }]);
        expect(result.ok).toBe(false);
        expect(result.violations).toHaveLength(1);
    });

    it('returns violations when tasks input is not array', () => {
        const result = validateTaskFields(null);
        expect(result.ok).toBe(false);
        expect(result.violations[0].invariant).toBe('TASK_FIELD_INTEGRITY');
    });

    it('returns multiple violations when multiple tasks fail', () => {
        const result = validateTaskFields([
            { id: 't1', title: 'OK' },
            { id: '', title: 'Bad' },
            { id: 't3', title: '' },
        ]);
        expect(result.ok).toBe(false);
        expect(result.violations).toHaveLength(2);
    });
});
