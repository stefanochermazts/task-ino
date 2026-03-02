import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enforceDailyContinuity } from './enforceDailyContinuity';

const mutatePlanningStateMock = vi.fn();
const appendPlanningEventMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (...args) => mutatePlanningStateMock(...args),
}));
vi.mock('./appendPlanningEvent', () => ({
    appendPlanningEvent: (...args) => appendPlanningEventMock(...args),
}));

describe('enforceDailyContinuity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        appendPlanningEventMock.mockResolvedValue({ ok: true, id: 1 });
    });

    it('emits continuity_enforced event when mutation succeeds', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true, applied: true, updatedCount: 2 });

        const result = await enforceDailyContinuity();

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('enforceDailyContinuity', {});
        expect(appendPlanningEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: 'planning.cycle.continuity_enforced',
                entity_id: 'day-cycle',
                payload: { applied: true, updatedCount: 2 },
            }),
            {},
        );
    });

    it('does not emit event when mutation fails', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: false, code: 'INVARIANT_VIOLATION' });

        const result = await enforceDailyContinuity();

        expect(result.ok).toBe(false);
        expect(appendPlanningEventMock).not.toHaveBeenCalled();
    });
});
