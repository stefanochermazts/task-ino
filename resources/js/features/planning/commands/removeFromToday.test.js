import { beforeEach, describe, expect, it, vi } from 'vitest';
import { removeFromToday } from './removeFromToday';

const mutatePlanningStateMock = vi.fn();
const appendPlanningEventMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (...args) => mutatePlanningStateMock(...args),
}));
vi.mock('./appendPlanningEvent', () => ({
    appendPlanningEvent: (...args) => appendPlanningEventMock(...args),
}));

describe('removeFromToday', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        appendPlanningEventMock.mockResolvedValue({ ok: true, id: 1 });
    });

    it('emits removed_from_today event when mutation succeeds', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true, task: { id: 't1' } });

        const result = await removeFromToday('t1');

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('removeFromToday', { taskId: 't1' });
        expect(appendPlanningEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: 'planning.task.removed_from_today',
                entity_id: 't1',
            }),
            {},
        );
    });

    it('does not emit event when mutation fails', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: false, code: 'TASK_NOT_FOUND' });

        const result = await removeFromToday('missing');

        expect(result.ok).toBe(false);
        expect(appendPlanningEventMock).not.toHaveBeenCalled();
    });
});
