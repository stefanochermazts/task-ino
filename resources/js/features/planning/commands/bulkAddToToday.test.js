import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bulkAddToToday } from './bulkAddToToday';

const mutatePlanningStateMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (action, params) => mutatePlanningStateMock(action, params),
}));

describe('bulkAddToToday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('delegates to mutatePlanningState with bulkAddToToday action', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true });

        const result = await bulkAddToToday(['t1', 't2']);

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('bulkAddToToday', {
            taskIds: ['t1', 't2'],
        });
    });

    it('returns TODAY_CAP_EXCEEDED when guardrail blocks', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'TODAY_CAP_EXCEEDED',
        });

        const result = await bulkAddToToday(['t1', 't2', 't3', 't4']);

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TODAY_CAP_EXCEEDED');
    });

    it('returns TASK_NOT_FOUND when guardrail blocks', async () => {
        mutatePlanningStateMock.mockResolvedValue({
            ok: false,
            code: 'TASK_NOT_FOUND',
        });

        const result = await bulkAddToToday(['t1', 'missing']);

        expect(result.ok).toBe(false);
        expect(result.code).toBe('TASK_NOT_FOUND');
    });
});
