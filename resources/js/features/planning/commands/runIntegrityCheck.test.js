import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runIntegrityCheck } from './runIntegrityCheck';

const loadPlanningSnapshotMock = vi.fn();
const validatePlanningIntegrityMock = vi.fn();

vi.mock('../persistence/loadPlanningSnapshot', () => ({
    loadPlanningSnapshot: () => loadPlanningSnapshotMock(),
}));

vi.mock('./validatePlanningIntegrity', () => ({
    validatePlanningIntegrity: (snapshot) => validatePlanningIntegrityMock(snapshot),
}));

describe('runIntegrityCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        loadPlanningSnapshotMock.mockResolvedValue({
            ok: true,
            snapshot: { tasks: [], todayCap: 3, areas: ['inbox'], dayCycle: null },
        });
        validatePlanningIntegrityMock.mockReturnValue({
            ok: true,
            checkedAt: '2026-03-02T10:00:00.000Z',
            violations: [],
            passed: ['TODAY_CAP_EXCEEDED', 'TASK_FIELD_INTEGRITY', 'AREA_MEMBERSHIP_CONSISTENCY', 'DAY_CYCLE_CONTINUITY'],
        });
    });

    it('returns IntegrityReport from validator when snapshot loads successfully', async () => {
        const report = {
            ok: true,
            checkedAt: '2026-03-02T10:00:00.000Z',
            violations: [],
            passed: ['TODAY_CAP_EXCEEDED'],
        };
        validatePlanningIntegrityMock.mockReturnValue(report);

        const result = await runIntegrityCheck();

        expect(result).toEqual(report);
        expect(validatePlanningIntegrityMock).toHaveBeenCalledWith(
            expect.objectContaining({ tasks: [], todayCap: 3 }),
        );
    });

    it('returns structured error when snapshot load fails', async () => {
        loadPlanningSnapshotMock.mockResolvedValue({ ok: false, error: 'IndexedDB unavailable' });

        const result = await runIntegrityCheck();

        expect(result.ok).toBe(false);
        expect(result.violations).toEqual([
            {
                invariant: 'SNAPSHOT_LOAD_FAILED',
                detail: 'IndexedDB unavailable',
            },
        ]);
        expect(result.passed).toEqual([]);
        expect(validatePlanningIntegrityMock).not.toHaveBeenCalled();
    });
});
