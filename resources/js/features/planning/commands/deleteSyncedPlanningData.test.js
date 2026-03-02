import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSyncedPlanningData } from './deleteSyncedPlanningData';

describe('deleteSyncedPlanningData', () => {
    beforeEach(() => {
        window.taskinoSync = undefined;
    });

    it('rejects when confirmed is not true', async () => {
        const result = await deleteSyncedPlanningData({ confirmed: false });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('returns error when no sync provider provides deleteRemotePlanningData', async () => {
        const result = await deleteSyncedPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('SYNCED_DELETE_NOT_AVAILABLE');
    });

    it('calls deleteRemotePlanningData and returns ok when provider succeeds', async () => {
        const deleteMock = vi.fn().mockResolvedValue({ ok: true });
        window.taskinoSync = { deleteRemotePlanningData: deleteMock };

        const result = await deleteSyncedPlanningData({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(deleteMock).toHaveBeenCalledTimes(1);
    });

    it('returns error when provider returns ok: false', async () => {
        const deleteMock = vi.fn().mockResolvedValue({
            ok: false,
            code: 'REMOTE_DELETE_FAILED',
            message: 'TypeError: backend stack trace',
        });
        window.taskinoSync = { deleteRemotePlanningData: deleteMock };

        const result = await deleteSyncedPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('REMOTE_DELETE_FAILED');
        expect(result.message).toBe('Synced deletion could not be confirmed. Please retry.');
        expect(result.message).not.toContain('TypeError');
    });

    it('returns error when provider throws', async () => {
        const deleteMock = vi.fn().mockRejectedValue(new Error('Network error'));
        window.taskinoSync = { deleteRemotePlanningData: deleteMock };

        const result = await deleteSyncedPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('SYNCED_DELETE_FAILED');
    });

    it('treats unconfirmed remote response shape as failure', async () => {
        const deleteMock = vi.fn().mockResolvedValue(undefined);
        window.taskinoSync = { deleteRemotePlanningData: deleteMock };

        const result = await deleteSyncedPlanningData({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('SYNCED_DELETE_UNCONFIRMED');
    });
});
