import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rescheduleTask } from './rescheduleTask';

const mutatePlanningStateMock = vi.fn();
const appendPlanningEventMock = vi.fn();

vi.mock('../invariants/mutationGuardrail', () => ({
    mutatePlanningState: (...args) => mutatePlanningStateMock(...args),
}));
vi.mock('./appendPlanningEvent', () => ({
    appendPlanningEvent: (...args) => appendPlanningEventMock(...args),
}));

describe('rescheduleTask', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        appendPlanningEventMock.mockResolvedValue({ ok: true, id: 1 });
    });

    it('emits rescheduled event with payload when mutation succeeds', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: true, task: { id: 't1' } });

        const result = await rescheduleTask('t1', '2026-03-15');

        expect(result.ok).toBe(true);
        expect(mutatePlanningStateMock).toHaveBeenCalledWith('rescheduleTask', {
            taskId: 't1',
            scheduledFor: '2026-03-15',
        });
        expect(appendPlanningEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: 'planning.task.rescheduled',
                entity_id: 't1',
                payload: { scheduledFor: '2026-03-15' },
            }),
            {},
        );
    });

    it('does not emit event when mutation fails', async () => {
        mutatePlanningStateMock.mockResolvedValue({ ok: false, code: 'TASK_NOT_FOUND' });

        const result = await rescheduleTask('missing', null);

        expect(result.ok).toBe(false);
        expect(appendPlanningEventMock).not.toHaveBeenCalled();
    });
});
