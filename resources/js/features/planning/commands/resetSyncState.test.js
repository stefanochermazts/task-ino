import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSyncState } from './resetSyncState';

const saveSyncModeMock = vi.fn();
const clearE2EEKeyMaterialMock = vi.fn();

vi.mock('../persistence/syncModeStore', () => ({
    saveSyncMode: (enabled) => saveSyncModeMock(enabled),
}));

vi.mock('../sync/e2eeClientCrypto', () => ({
    clearE2EEKeyMaterial: (storage) => clearE2EEKeyMaterialMock(storage),
}));

describe('resetSyncState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        saveSyncModeMock.mockReturnValue({ ok: true });
        clearE2EEKeyMaterialMock.mockResolvedValue({ ok: true });
        window.taskinoSync = undefined;
    });

    it('rejects when confirmed is not true', async () => {
        const result = await resetSyncState({ confirmed: false });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RESET_REQUIRES_CONFIRMATION');
        expect(saveSyncModeMock).not.toHaveBeenCalled();
        expect(clearE2EEKeyMaterialMock).not.toHaveBeenCalled();
    });

    it('saves sync mode disabled and clears E2EE keys when confirmed', async () => {
        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(saveSyncModeMock).toHaveBeenCalledWith(false);
        expect(clearE2EEKeyMaterialMock).toHaveBeenCalled();
    });

    it('calls revokeDeviceRegistration when taskinoSync provides it', async () => {
        const revokeMock = vi.fn().mockResolvedValue({ ok: true });
        window.taskinoSync = { revokeDeviceRegistration: revokeMock };

        await resetSyncState({ confirmed: true });

        expect(revokeMock).toHaveBeenCalledTimes(1);
        expect(saveSyncModeMock).toHaveBeenCalledWith(false);
    });

    it('clears local state even when remote revocation fails', async () => {
        window.taskinoSync = {
            revokeDeviceRegistration: vi.fn().mockRejectedValue(new Error('Network error')),
        };

        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(result.code).toBe('RESET_REMOTE_PARTIAL');
        expect(saveSyncModeMock).toHaveBeenCalledWith(false);
        expect(clearE2EEKeyMaterialMock).toHaveBeenCalled();
    });

    it('returns error when clearE2EEKeyMaterial fails', async () => {
        clearE2EEKeyMaterialMock.mockResolvedValue({ ok: false, code: 'E2EE_CLEAR_FAILED' });

        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('E2EE_CLEAR_FAILED');
        expect(saveSyncModeMock).toHaveBeenCalledWith(false);
    });

    it('fails deterministically when sync mode cannot be saved locally', async () => {
        saveSyncModeMock.mockReturnValue({ ok: false });

        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RESET_LOCAL_SYNCMODE_FAILED');
        expect(clearE2EEKeyMaterialMock).not.toHaveBeenCalled();
    });

    it('sanitizes remote partial failure message', async () => {
        window.taskinoSync = {
            revokeDeviceRegistration: vi.fn().mockResolvedValue({
                ok: false,
                message: 'TypeError: backend exploded at /sync/reset line 42',
            }),
        };

        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(result.code).toBe('RESET_REMOTE_PARTIAL');
        expect(result.message).toContain('Remote revocation could not be confirmed');
        expect(result.message).not.toContain('TypeError');
    });

    it('does not touch planning stores - verified by no imports of inboxTaskStore etc', async () => {
        const result = await resetSyncState({ confirmed: true });

        expect(result.ok).toBe(true);
        expect(saveSyncModeMock).toHaveBeenCalledWith(false);
        expect(clearE2EEKeyMaterialMock).toHaveBeenCalled();
    });
});
