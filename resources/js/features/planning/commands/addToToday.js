import { appendPlanningEvent } from './appendPlanningEvent';
import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Add a single task to Today. Routes through centralized mutation guardrail.
 */
export async function addToToday(taskId) {
    const result = await mutatePlanningState('addToToday', { taskId });
    if (result?.ok) {
        appendPlanningEvent(
            {
                timestamp: new Date().toISOString(),
                event_type: 'planning.task.added_to_today',
                entity_id: taskId,
                payload_version: 1,
                payload: {},
            },
            {},
        ).catch(console.error);
    }
    return result;
}

/**
 * Swap one task into Today and one out. Routes through centralized mutation guardrail.
 */
export async function swapToToday(addTaskId, removeTaskId) {
    return mutatePlanningState('swapToToday', { addTaskId, removeTaskId });
}
