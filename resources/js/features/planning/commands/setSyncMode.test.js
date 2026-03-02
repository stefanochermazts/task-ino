import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSyncMode } from './setSyncMode';

const mutatePlanningStateMock = vi.fn();
const ensureE2EEKeyReadyMock = vi.fn();
const appendPlanningEventMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (...args) => mutatePlanningStateMock(...args),
}));

vi.mock('../sync/e2eeClientCrypto', () => ({
    ensureE2EEKeyReady: (...args) => ensureE2EEKeyReadyMock(...args),
}));
vi.mock('./appendPlanningEvent', () => ({
    appendPlanningEvent: (...args) => appendPlanningEventMock(...args),
}));

describe('setSyncMode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mutatePlanningStateMock.mockResolvedValue({ ok: true, enabled: true });
        ensureE2EEKeyReadyMock.mockResolvedValue({ ok: true, keyId: 'k-1' });
        appendPlanningEventMock.mockResolvedValue({ ok: true, id: 1 });
    });

    it('does not require key initialization when disabling sync', async () => {
        const result = await setSyncMode(false);

        expect(result.ok).toBe(true);
        expect(ensureE2EEKeyReadyMock).not.toHaveBeenCalled();
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('setSyncMode', { enabled: false });
        expect(appendPlanningEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: 'planning.sync.mode_changed',
                payload: { enabled: false },
            }),
            {},
        );
    });

    it('initializes E2EE key before enabling sync', async () => {
        await setSyncMode(true);

        expect(ensureE2EEKeyReadyMock).toHaveBeenCalledTimes(1);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('setSyncMode', { enabled: true });
        expect(appendPlanningEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: 'planning.sync.mode_changed',
                payload: { enabled: true },
            }),
            {},
        );
    });

    it('returns deterministic error when key initialization fails', async () => {
        ensureE2EEKeyReadyMock.mockResolvedValue({
            ok: false,
            code: 'E2EE_KEY_STORAGE_FAILED',
            message: 'Unable to save encryption keys on this device.',
        });

        const result = await setSyncMode(true);

        expect(result).toEqual({
            ok: false,
            code: 'E2EE_KEY_STORAGE_FAILED',
            message: 'Unable to save encryption keys on this device.',
        });
        expect(mutatePlanningStateMock).not.toHaveBeenCalled();
        expect(appendPlanningEventMock).not.toHaveBeenCalled();
    });
});
