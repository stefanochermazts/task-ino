import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addToToday, swapToToday } from './addToToday';

const mutatePlanningStateMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (action, params) => mutatePlanningStateMock(action, params),
}));

describe('addToToday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates to mutatePlanningState with addToToday action', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: true,
            task: { id: 't1', todayIncluded: true },
        });

        const result = await addToToday('t1');

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('addToToday', { taskId: 't1' });
    });

    it('returns TODAY_CAP_EXCEEDED when guardrail blocks', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'TODAY_CAP_EXCEEDED',
            message: 'Today is at capacity. Choose an item to swap or cancel.',
        });

        const result = await addToToday('t4');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TODAY_CAP_EXCEEDED');
    });

    it('returns TASK_NOT_FOUND when guardrail blocks', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'TASK_NOT_FOUND',
        });

        const result = await addToToday('missing');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TASK_NOT_FOUND');
    });

    it('returns INVARIANT_VIOLATION with retry message when guardrail catches persistence error', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'INVARIANT_VIOLATION',
            message: 'Unable to save task locally. Please retry.',
        });

        const result = await addToToday('t1');

        expect(result.ok).toBe(false);
        expect(result.message).toBe('Unable to save task locally. Please retry.');
    });
});

describe('swapToToday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates to mutatePlanningState with swapToToday action', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true });

        const result = await swapToToday('t4', 't1');

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('swapToToday', {
            addTaskId: 't4',
            removeTaskId: 't1',
        });
    });

    it('returns TASK_NOT_FOUND when guardrail blocks', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'TASK_NOT_FOUND',
        });

        const result = await swapToToday('t4', 'missing');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TASK_NOT_FOUND');
    });

    it('returns REMOVE_TASK_NOT_IN_TODAY when guardrail blocks', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'REMOVE_TASK_NOT_IN_TODAY',
        });

        const result = await swapToToday('t4', 't2');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('REMOVE_TASK_NOT_IN_TODAY');
    });

    it('returns INVARIANT_VIOLATION when same task is used as both add and remove', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'INVARIANT_VIOLATION',
            message: 'Cannot swap a task with itself.',
        });

        const result = await swapToToday('t1', 't1');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('INVARIANT_VIOLATION');
    });

    it('returns INVARIANT_VIOLATION with retry message when persistence throws', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'INVARIANT_VIOLATION',
            message: 'Unable to save task locally. Please retry.',
        });

        const result = await swapToToday('t4', 't1');

        expect(result.ok).toBe(false);
        expect(result.code).toBe('INVARIANT_VIOLATION');
    });
});
