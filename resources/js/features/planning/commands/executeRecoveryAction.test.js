import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeRecoveryAction } from './executeRecoveryAction';

const rebuildPlanningProjectionMock = vi.fn();
const deleteLocalPlanningDataMock = vi.fn();

vi.mock('./rebuildPlanningProjection', () => ({
    rebuildPlanningProjection: (opts) => rebuildPlanningProjectionMock(opts),
}));

vi.mock('./deleteLocalPlanningData', () => ({
    deleteLocalPlanningData: (opts) => deleteLocalPlanningDataMock(opts),
}));

describe('executeRecoveryAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        rebuildPlanningProjectionMock.mockResolvedValue({ ok: true });
        deleteLocalPlanningDataMock.mockResolvedValue({ ok: true });
    });

    it('rebuild-projection calls rebuildPlanningProjection', async () => {
        const result = await executeRecoveryAction({ actionId: 'rebuild-projection' });

        expect(result.ok).toBe(true);
        expect(result.code).toBeUndefined();
        expect(rebuildPlanningProjectionMock).toHaveBeenCalledTimes(1);
        expect(deleteLocalPlanningDataMock).not.toHaveBeenCalled();
    });

    it('rebuild-projection propagates REBUILD_PARTIAL outcome details', async () => {
        rebuildPlanningProjectionMock.mockResolvedValue({
            ok: true,
            code: 'REBUILD_PARTIAL',
            message: 'Projection rebuilt from snapshot, but event replay could not be applied.',
        });

        const result = await executeRecoveryAction({ actionId: 'rebuild-projection' });

        expect(result).toEqual({
            ok: true,
            code: 'REBUILD_PARTIAL',
            message: 'Projection rebuilt from snapshot, but event replay could not be applied.',
        });
    });

    it('delete-local-data with confirmed true calls deleteLocalPlanningData', async () => {
        const result = await executeRecoveryAction({
            actionId: 'delete-local-data',
            confirmed: true,
        });

        expect(result.ok).toBe(true);
        expect(result.code).toBeUndefined();
        expect(deleteLocalPlanningDataMock).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true }));
    });

    it('delete-local-data propagates partial-success metadata', async () => {
        deleteLocalPlanningDataMock.mockResolvedValue({
            ok: true,
            code: 'LOCAL_DELETE_E2EE_PARTIAL',
            message: 'Local data deleted. Some sync credentials could not be cleared.',
        });

        const result = await executeRecoveryAction({
            actionId: 'delete-local-data',
            confirmed: true,
        });

        expect(result).toEqual({
            ok: true,
            code: 'LOCAL_DELETE_E2EE_PARTIAL',
            message: 'Local data deleted. Some sync credentials could not be cleared.',
        });
    });

    it('delete-local-data without confirmed returns RECOVERY_CONFIRMATION_REQUIRED', async () => {
        const result = await executeRecoveryAction({ actionId: 'delete-local-data' });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RECOVERY_CONFIRMATION_REQUIRED');
        expect(deleteLocalPlanningDataMock).not.toHaveBeenCalled();
    });

    it('unknown actionId returns RECOVERY_UNKNOWN_ACTION', async () => {
        const result = await executeRecoveryAction({ actionId: 'unknown-action' });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RECOVERY_UNKNOWN_ACTION');
        expect(rebuildPlanningProjectionMock).not.toHaveBeenCalled();
        expect(deleteLocalPlanningDataMock).not.toHaveBeenCalled();
    });

    it('delete-local-data passes onAfterDelete when provided', async () => {
        const onAfterDelete = vi.fn().mockResolvedValue(undefined);

        await executeRecoveryAction({
            actionId: 'delete-local-data',
            confirmed: true,
            onAfterDelete,
        });

        expect(deleteLocalPlanningDataMock).toHaveBeenCalledWith(
            expect.objectContaining({ confirmed: true, onAfterDelete }),
        );
    });
});
