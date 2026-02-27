import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Pauses a task (marks status paused, removes from Today).
 * Routes through invariant enforcement layer.
 *
 * @param {string} taskId - Task ID to pause
 * @returns {Promise<{ok: boolean, code?: string, message?: string, task?: object}>}
 */
export async function pauseTask(taskId) {
    return mutatePlanningState('pauseTask', { taskId });
}
