import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reconcileFromRemote } from './reconcileFromRemote';

const getAllInboxTasksMock = vi.fn();
const replaceAllTasksMock = vi.fn();
const mutatePlanningStateMock = vi.fn();
const decryptSyncPayloadMock = vi.fn();
const isE2EEActiveMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (action, params) => mutatePlanningStateMock(action, params),
}));

vi.mock('../persistence/inboxTaskStore', () => ({
    getAllInboxTasks: () => getAllInboxTasksMock(),
    replaceAllTasks: (tasks) => replaceAllTasksMock(tasks),
}));

vi.mock('../sync/e2eeClientCrypto', () => ({
    decryptSyncPayload: (envelope) => decryptSyncPayloadMock(envelope),
    isE2EEActive: () => isE2EEActiveMock(),
}));

describe('reconcileFromRemote', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getAllInboxTasksMock.mockResolvedValue([]);
        isE2EEActiveMock.mockResolvedValue(false);
        decryptSyncPayloadMock.mockImplementation(async (envelope) => ({ ok: true, payload: envelope }));
    });

    it('routes through guardrail and persists when merge succeeds', async () => {
        const localTasks = [{ id: 't1', title: 'Local', todayIncluded: false }];
        const mutations = [{ id: 't1', timestamp: 2000, device_id: 'device-B', title: 'Updated' }];
        getAllInboxTasksMock.mockResolvedValue(localTasks);
        mutatePlanningStateMock.mockResolvedValue({
            ok: true,
            resolvedTasks: [{ id: 't1', title: 'Updated', todayIncluded: false }],
            conflicts: 0,
        });
        replaceAllTasksMock.mockResolvedValue({ ok: true, count: 1 });

        const result = await reconcileFromRemote(mutations);

        expect(result.ok).toBe(true);
        expect(result.conflicts).toBe(0);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('applyMergeBatch', {
            localTasks,
            incomingMutations: mutations,
        });
        expect(replaceAllTasksMock).toHaveBeenCalledWith([
            { id: 't1', title: 'Updated', todayIncluded: false },
        ]);
    });

    it('does not persist when guardrail rejects merge', async () => {
        getAllInboxTasksMock.mockResolvedValue([{ id: 't1', todayIncluded: true }]);
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'SYNC_MERGE_INVARIANT_REJECT',
            message: 'Merge would exceed Today cap.',
        });

        const result = await reconcileFromRemote([
            { id: 't2', timestamp: 5000, device_id: 'B', todayIncluded: true },
        ]);

        expect(result.ok).toBe(false);
        expect(result.code).toBe('SYNC_MERGE_INVARIANT_REJECT');
        expect(replaceAllTasksMock).not.toHaveBeenCalled();
    });

    it('returns persist failure when replaceAllTasks fails', async () => {
        getAllInboxTasksMock.mockResolvedValue([]);
        mutatePlanningStateMock.mockResolvedValue({ ok: true, resolvedTasks: [], conflicts: 0 });
        replaceAllTasksMock.mockRejectedValue(new Error('IndexedDB error'));

        const result = await reconcileFromRemote([]);

        expect(result.ok).toBe(false);
        expect(result.code).toBe('RECONCILIATION_PERSIST_FAILED');
    });

    it('handles non-array mutations as empty', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true, resolvedTasks: [], conflicts: 0 });
        replaceAllTasksMock.mockResolvedValue({ ok: true, count: 0 });

        const result = await reconcileFromRemote(null);

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('applyMergeBatch', {
            localTasks: [],
            incomingMutations: [],
        });
    });

    it('decrypts encrypted incoming mutations before merge', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true, resolvedTasks: [], conflicts: 0 });
        replaceAllTasksMock.mockResolvedValue({ ok: true, count: 0 });
        decryptSyncPayloadMock.mockResolvedValue({
            ok: true,
            payload: { id: 'r1', timestamp: 1000, device_id: 'remote', title: 'Decrypted title' },
        });

        const result = await reconcileFromRemote([
            {
                envelope: { keyId: 'k1', iv: 'iv==', ciphertext: 'ct==' },
            },
        ]);

        expect(result.ok).toBe(true);
        expect(decryptSyncPayloadMock).toHaveBeenCalledTimes(1);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('applyMergeBatch', {
            localTasks: [],
            incomingMutations: [{ id: 'r1', timestamp: 1000, device_id: 'remote', title: 'Decrypted title' }],
        });
    });

    it('returns deterministic error when encrypted payload decryption fails', async () => {
        decryptSyncPayloadMock.mockResolvedValue({
            ok: false,
            code: 'E2EE_KEY_NOT_FOUND',
            message: 'This device does not hold the required decryption key.',
        });

        const result = await reconcileFromRemote([
            {
                envelope: { keyId: 'k1', iv: 'iv==', ciphertext: 'ct==' },
            },
        ]);

        expect(result).toEqual({
            ok: false,
            code: 'E2EE_KEY_NOT_FOUND',
            message: 'This device does not hold the required decryption key.',
        });
        expect(mutatePlanningStateMock).not.toHaveBeenCalled();
        expect(replaceAllTasksMock).not.toHaveBeenCalled();
    });

    it('rejects plaintext mutation when E2EE is active on this device', async () => {
        isE2EEActiveMock.mockResolvedValue(true);

        const result = await reconcileFromRemote([
            { id: 'r1', timestamp: 1000, device_id: 'remote', title: 'Plaintext payload' },
        ]);

        expect(result.ok).toBe(false);
        expect(result.code).toBe('E2EE_PLAINTEXT_REJECTED');
        expect(mutatePlanningStateMock).not.toHaveBeenCalled();
        expect(replaceAllTasksMock).not.toHaveBeenCalled();
    });

    it('accepts plaintext mutation when E2EE is not active', async () => {
        isE2EEActiveMock.mockResolvedValue(false);
        mutatePlanningStateMock.mockResolvedValue({ ok: true, resolvedTasks: [], conflicts: 0 });
        replaceAllTasksMock.mockResolvedValue({ ok: true, count: 0 });

        const result = await reconcileFromRemote([
            { id: 'r1', timestamp: 1000, device_id: 'remote', title: 'Plaintext payload' },
        ]);

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('applyMergeBatch', {
            localTasks: [],
            incomingMutations: [{ id: 'r1', timestamp: 1000, device_id: 'remote', title: 'Plaintext payload' }],
        });
    });
});
