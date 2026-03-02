import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendPlanningEvent } from './appendPlanningEvent';

vi.mock('../persistence/eventLogStore', () => ({
    appendEvent: vi.fn(),
}));

import { appendEvent } from '../persistence/eventLogStore';

describe('appendPlanningEvent', () => {
    beforeEach(() => {
        vi.mocked(appendEvent).mockReset();
    });

    it('accepts valid entry and returns ok: true with id', async () => {
        vi.mocked(appendEvent).mockResolvedValue(42);

        const result = await appendPlanningEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 'task-123',
                payload_version: 1,
                payload: { title: 'Test' },
            },
            {},
        );

        expect(result.ok).toBe(true);
        expect(result.id).toBe(42);
        expect(appendEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 'task-123',
                payload_version: 1,
            }),
            {},
        );
    });

    it('returns EVENT_LOG_WRITE_FAILED when required fields are missing', async () => {
        const result = await appendPlanningEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                payload_version: 1,
                payload: {},
            },
            {},
        );

        expect(result.ok).toBe(false);
        expect(result.code).toBe('EVENT_LOG_WRITE_FAILED');
        expect(appendEvent).not.toHaveBeenCalled();
    });

    it('returns EVENT_LOG_WRITE_FAILED when entity_id is empty', async () => {
        const result = await appendPlanningEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: '',
                payload_version: 1,
                payload: {},
            },
            {},
        );

        expect(result.ok).toBe(false);
        expect(result.code).toBe('EVENT_LOG_WRITE_FAILED');
        expect(appendEvent).not.toHaveBeenCalled();
    });

    it('returns graceful error when IDB write fails', async () => {
        vi.mocked(appendEvent).mockRejectedValue(new Error('IDB failed'));

        const result = await appendPlanningEvent(
            {
                timestamp: '2026-03-02T10:00:00.000Z',
                event_type: 'planning.task.created',
                entity_id: 'task-1',
                payload_version: 1,
                payload: {},
            },
            {},
        );

        expect(result.ok).toBe(false);
        expect(result.code).toBe('EVENT_LOG_WRITE_FAILED');
        expect(typeof result.message).toBe('string');
    });
});
