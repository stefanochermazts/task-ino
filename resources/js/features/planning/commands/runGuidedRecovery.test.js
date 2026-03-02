import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertRecoveryActionOrder, runGuidedRecovery } from './runGuidedRecovery';

const runIntegrityCheckMock = vi.fn();

vi.mock('./runIntegrityCheck', () => ({
    runIntegrityCheck: () => runIntegrityCheckMock(),
}));

describe('runGuidedRecovery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('clean state returns hasViolations false, actions in fixed order (non-destructive first)', async () => {
        runIntegrityCheckMock.mockResolvedValue({
            ok: true,
            violations: [],
            passed: ['TODAY_CAP_EXCEEDED', 'TASK_FIELD_INTEGRITY', 'AREA_MEMBERSHIP_CONSISTENCY', 'DAY_CYCLE_CONTINUITY'],
        });

        const result = await runGuidedRecovery();

        expect(result.ok).toBe(true);
        expect(result.hasViolations).toBe(false);
        expect(result.actions).toHaveLength(2);
        expect(result.actions[0].id).toBe('rebuild-projection');
        expect(result.actions[0].destructive).toBe(false);
        expect(result.actions[1].id).toBe('delete-local-data');
        expect(result.actions[1].destructive).toBe(true);
    });

    it('violations found returns hasViolations true with violations array', async () => {
        runIntegrityCheckMock.mockResolvedValue({
            ok: false,
            violations: [
                { invariant: 'TODAY_CAP_EXCEEDED', detail: 'Today contains 6 tasks but cap is 5.' },
            ],
            passed: ['TASK_FIELD_INTEGRITY'],
        });

        const result = await runGuidedRecovery();

        expect(result.ok).toBe(true);
        expect(result.hasViolations).toBe(true);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].invariant).toBe('TODAY_CAP_EXCEEDED');
        expect(result.actions[0].destructive).toBe(false);
        expect(result.actions[1].destructive).toBe(true);
    });

    it('non-destructive action comes before destructive in actions array', async () => {
        runIntegrityCheckMock.mockResolvedValue({ ok: true, violations: [], passed: [] });

        const result = await runGuidedRecovery();

        const idxRebuild = result.actions.findIndex((a) => a.id === 'rebuild-projection');
        const idxDelete = result.actions.findIndex((a) => a.id === 'delete-local-data');
        expect(idxRebuild).toBeLessThan(idxDelete);
    });

    it('RecoveryGuide.actions contains at least one destructive: false action', async () => {
        runIntegrityCheckMock.mockResolvedValue({ ok: true, violations: [], passed: [] });

        const result = await runGuidedRecovery();

        const nonDestructive = result.actions.filter((a) => !a.destructive);
        expect(nonDestructive.length).toBeGreaterThanOrEqual(1);
        expect(result.actions[0].destructive).toBe(false);
    });

    it('no destructive: true action precedes any destructive: false action', async () => {
        runIntegrityCheckMock.mockResolvedValue({ ok: true, violations: [], passed: [] });

        const result = await runGuidedRecovery();

        const firstDestructiveIdx = result.actions.findIndex((a) => a.destructive);
        const lastNonDestructiveIdx = result.actions.map((a) => !a.destructive).lastIndexOf(true);
        if (firstDestructiveIdx !== -1) {
            expect(lastNonDestructiveIdx).toBeLessThan(firstDestructiveIdx);
        }
    });

    it('actions array always places non-destructive options before destructive ones', async () => {
        runIntegrityCheckMock.mockResolvedValue({ ok: true, violations: [], passed: [] });

        const result = await runGuidedRecovery();

        const firstDestructiveIdx = result.actions.findIndex((a) => a.destructive);
        const firstNonDestructiveIdx = result.actions.findIndex((a) => !a.destructive);
        if (firstDestructiveIdx !== -1 && firstNonDestructiveIdx !== -1) {
            expect(firstNonDestructiveIdx).toBeLessThan(firstDestructiveIdx);
        }
        expect(result.actions[0].destructive).toBe(false);
    });

    it('assertRecoveryActionOrder throws INVARIANT_VIOLATION for invalid ordering', () => {
        expect(() =>
            assertRecoveryActionOrder([
                { id: 'delete-local-data', destructive: true },
                { id: 'rebuild-projection', destructive: false },
            ]),
        ).toThrow(/INVARIANT_VIOLATION/);
    });

    it('ordering invariant holds regardless of whether violations are found or not', async () => {
        for (const hasViolations of [true, false]) {
            runIntegrityCheckMock.mockResolvedValue({
                ok: true,
                hasViolations,
                violations: hasViolations ? [{ invariant: 'TODAY_CAP_EXCEEDED', detail: 'x' }] : [],
                passed: [],
            });

            const result = await runGuidedRecovery();
            const firstDestructiveIdx = result.actions.findIndex((a) => a.destructive);
            const firstNonDestructiveIdx = result.actions.findIndex((a) => !a.destructive);
            if (firstDestructiveIdx !== -1 && firstNonDestructiveIdx !== -1) {
                expect(firstNonDestructiveIdx).toBeLessThan(firstDestructiveIdx);
            }
            expect(result.actions[0].destructive).toBe(false);
        }
    });

    it('runIntegrityCheck failure returns RECOVERY_CHECK_FAILED', async () => {
        runIntegrityCheckMock.mockResolvedValue({
            ok: false,
            violations: [{ invariant: 'SNAPSHOT_LOAD_FAILED', detail: 'IndexedDB error' }],
        });

        const result = await runGuidedRecovery();

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RECOVERY_CHECK_FAILED');
    });

    it('runIntegrityCheck throw returns RECOVERY_CHECK_FAILED', async () => {
        runIntegrityCheckMock.mockRejectedValue(new Error('Unexpected'));

        const result = await runGuidedRecovery();

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RECOVERY_CHECK_FAILED');
    });
});
