import { describe, expect, it, vi } from 'vitest';
import { createInboxTask } from './createInboxTask';

const saveInboxTaskMock = vi.fn();
const appendPlanningEventMock = vi.fn();

vi.mock('../persistence/inboxTaskStore', () => ({
    saveInboxTask: (...args) => saveInboxTaskMock(...args),
}));
vi.mock('./appendPlanningEvent', () => ({
    appendPlanningEvent: (...args) => appendPlanningEventMock(...args),
}));

describe('createInboxTask', () => {
    it('creates deterministic creation/update timestamps on initial capture', async () => {
        saveInboxTaskMock.mockResolvedValue(undefined);
        appendPlanningEventMock.mockResolvedValue({ ok: true, id: 1 });

        const result = await createInboxTask('  deterministic task  ');

        expect(result.ok).toBe(true);
        expect(result.task.title).toBe('deterministic task');
        expect(result.task.createdAt).toBe(result.task.updatedAt);
        expect(result.task.todayIncluded).toBe(false);
        expect(appendPlanningEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: 'planning.task.created',
                entity_id: result.task.id,
            }),
            {},
        );
    });
});
