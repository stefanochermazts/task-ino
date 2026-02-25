import { describe, expect, it, vi } from 'vitest';
import { createInboxTask } from './createInboxTask';

const saveInboxTaskMock = vi.fn();

vi.mock('../persistence/inboxTaskStore', () => ({
    saveInboxTask: (...args) => saveInboxTaskMock(...args),
}));

describe('createInboxTask', () => {
    it('creates deterministic creation/update timestamps on initial capture', async () => {
        saveInboxTaskMock.mockResolvedValue(undefined);

        const result = await createInboxTask('  deterministic task  ');

        expect(result.ok).toBe(true);
        expect(result.task.title).toBe('deterministic task');
        expect(result.task.createdAt).toBe(result.task.updatedAt);
        expect(result.task.todayIncluded).toBe(false);
    });
});
