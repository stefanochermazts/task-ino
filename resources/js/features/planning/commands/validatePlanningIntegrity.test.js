import { describe, expect, it } from 'vitest';
import { validatePlanningIntegrity } from './validatePlanningIntegrity';

describe('validatePlanningIntegrity', () => {
    it('returns ok: true and all checks in passed when state is clean', () => {
        const snapshot = {
            tasks: [
                { id: 't1', title: 'Task 1', area: 'inbox', todayIncluded: true },
                { id: 't2', title: 'Task 2', area: 'work', todayIncluded: false },
            ],
            todayCap: 5,
            areas: ['inbox', 'work'],
            dayCycle: '2026-03-02',
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(true);
        expect(result.violations).toEqual([]);
        expect(result.passed).toContain('TODAY_CAP_EXCEEDED');
        expect(result.passed).toContain('TASK_FIELD_INTEGRITY');
        expect(result.passed).toContain('AREA_MEMBERSHIP_CONSISTENCY');
        expect(result.passed).toContain('DAY_CYCLE_CONTINUITY');
        expect(result.checkedAt).toBeDefined();
    });

    it('returns TODAY_CAP_EXCEEDED when today has more tasks than cap', () => {
        const snapshot = {
            tasks: [
                { id: 't1', title: 'A', todayIncluded: true },
                { id: 't2', title: 'B', todayIncluded: true },
                { id: 't3', title: 'C', todayIncluded: true },
                { id: 't4', title: 'D', todayIncluded: true },
                { id: 't5', title: 'E', todayIncluded: true },
                { id: 't6', title: 'F', todayIncluded: true },
            ],
            todayCap: 5,
            areas: ['inbox'],
            dayCycle: null,
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations).toContainEqual(
            expect.objectContaining({
                invariant: 'TODAY_CAP_EXCEEDED',
                detail: expect.stringContaining('6'),
            }),
        );
    });

    it('returns TASK_FIELD_INTEGRITY when task has empty title', () => {
        const snapshot = {
            tasks: [{ id: 't1', title: '', area: 'inbox', todayIncluded: false }],
            todayCap: 3,
            areas: ['inbox'],
            dayCycle: null,
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations).toContainEqual(
            expect.objectContaining({ invariant: 'TASK_FIELD_INTEGRITY' }),
        );
    });

    it('returns AREA_MEMBERSHIP_CONSISTENCY when task references non-existent area', () => {
        const snapshot = {
            tasks: [{ id: 't1', title: 'Task', area: 'nonexistent', todayIncluded: false }],
            todayCap: 3,
            areas: ['inbox', 'work'],
            dayCycle: null,
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations).toContainEqual(
            expect.objectContaining({
                invariant: 'AREA_MEMBERSHIP_CONSISTENCY',
                detail: expect.stringContaining('nonexistent'),
            }),
        );
    });

    it('returns DAY_CYCLE_CONTINUITY when lastPlanningDate is invalid format', () => {
        const snapshot = {
            tasks: [],
            todayCap: 3,
            areas: ['inbox'],
            dayCycle: 'invalid-date',
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations).toContainEqual(
            expect.objectContaining({
                invariant: 'DAY_CYCLE_CONTINUITY',
                detail: expect.stringContaining('YYYY-MM-DD'),
            }),
        );
    });

    it('returns DAY_CYCLE_CONTINUITY when date matches regex but is not parseable', () => {
        const snapshot = {
            tasks: [],
            todayCap: 3,
            areas: ['inbox'],
            dayCycle: '2026-13-99',
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations).toContainEqual(
            expect.objectContaining({
                invariant: 'DAY_CYCLE_CONTINUITY',
                detail: expect.stringContaining('not parseable'),
            }),
        );
    });

    it('returns DAY_CYCLE_CONTINUITY when dayCycle is active but empty', () => {
        const snapshot = {
            tasks: [],
            todayCap: 3,
            areas: ['inbox'],
            dayCycle: '',
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations).toContainEqual(
            expect.objectContaining({
                invariant: 'DAY_CYCLE_CONTINUITY',
                detail: expect.stringContaining('required'),
            }),
        );
    });

    it('detects multiple violations in same run', () => {
        const snapshot = {
            tasks: [
                { id: '', title: 'Bad', area: 'ghost', todayIncluded: true },
                { id: 't2', title: 'OK', todayIncluded: true },
                { id: 't3', title: 'OK', todayIncluded: true },
                { id: 't4', title: 'OK', todayIncluded: true },
            ],
            todayCap: 2,
            areas: ['inbox'],
            dayCycle: 'not-a-date',
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(false);
        expect(result.violations.length).toBeGreaterThanOrEqual(3);
        expect(result.violations.map((v) => v.invariant)).toContain('TASK_FIELD_INTEGRITY');
        expect(result.violations.map((v) => v.invariant)).toContain('AREA_MEMBERSHIP_CONSISTENCY');
        expect(result.violations.map((v) => v.invariant)).toContain('TODAY_CAP_EXCEEDED');
        expect(result.violations.map((v) => v.invariant)).toContain('DAY_CYCLE_CONTINUITY');
    });

    it('same input produces identical result (deterministic)', () => {
        const snapshot = {
            tasks: [{ id: 't1', title: 'Task', area: 'inbox', todayIncluded: false }],
            todayCap: 3,
            areas: ['inbox'],
            dayCycle: null,
        };

        const r1 = validatePlanningIntegrity(snapshot);
        const r2 = validatePlanningIntegrity(snapshot);

        expect(r1.ok).toBe(r2.ok);
        expect(r1.violations).toEqual(r2.violations);
        expect(r1.passed).toEqual(r2.passed);
    });

    it('accepts null dayCycle (first run)', () => {
        const snapshot = {
            tasks: [],
            todayCap: 3,
            areas: ['inbox'],
            dayCycle: null,
        };

        const result = validatePlanningIntegrity(snapshot);

        expect(result.ok).toBe(true);
        expect(result.passed).toContain('DAY_CYCLE_CONTINUITY');
    });
});
