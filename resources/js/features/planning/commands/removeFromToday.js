import { appendPlanningEvent } from './appendPlanningEvent';
import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Removes a task from Today (defer at day-end closure).
 * Routes through invariant enforcement layer.
 *
 * @param {string} taskId - Task ID to remove from Today
 * @returns {Promise<{ok: boolean, code?: string, message?: string, task?: object}>}
 */
export async function removeFromToday(taskId) {
    const result = await mutatePlanningState('removeFromToday', { taskId });
    if (result?.ok) {
        appendPlanningEvent(
            {
                timestamp: new Date().toISOString(),
                event_type: 'planning.task.removed_from_today',
                entity_id: taskId,
                payload_version: 1,
                payload: {},
            },
            {},
        ).catch(console.error);
    }
    return result;
}
