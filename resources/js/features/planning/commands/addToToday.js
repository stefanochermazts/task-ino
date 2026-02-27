import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Add a single task to Today. Routes through centralized mutation guardrail.
 */
export async function addToToday(taskId) {
    return mutatePlanningState('addToToday', { taskId });
}

/**
 * Swap one task into Today and one out. Routes through centralized mutation guardrail.
 */
export async function swapToToday(addTaskId, removeTaskId) {
    return mutatePlanningState('swapToToday', { addTaskId, removeTaskId });
}
