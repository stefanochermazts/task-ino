import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Removes a task from Today (defer at day-end closure).
 * Routes through invariant enforcement layer.
 *
 * @param {string} taskId - Task ID to remove from Today
 * @returns {Promise<{ok: boolean, code?: string, message?: string, task?: object}>}
 */
export async function removeFromToday(taskId) {
    return mutatePlanningState('removeFromToday', { taskId });
}
