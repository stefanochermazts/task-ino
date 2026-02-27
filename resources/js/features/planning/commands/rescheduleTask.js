import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Reschedule a task to a new temporal target.
 * Updates only temporal context (scheduledFor) and updatedAt; preserves id, title, createdAt, area, todayIncluded.
 *
 * @param {string} taskId
 * @param {string|null} scheduledFor - ISO date string (YYYY-MM-DD) or null to clear
 * @returns {Promise<{ok: boolean, code?: string, message?: string, task?: object}>}
 */
export async function rescheduleTask(taskId, scheduledFor) {
    return mutatePlanningState('rescheduleTask', { taskId, scheduledFor });
}
