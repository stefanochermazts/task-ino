import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Reschedule multiple tasks atomically to one temporal target.
 * All updates succeed together or no update is committed.
 *
 * @param {string[]} taskIds
 * @param {string|null} scheduledFor
 * @returns {Promise<{ok: boolean, code?: string, message?: string, taskIds?: string[], count?: number}>}
 */
export async function bulkRescheduleTasks(taskIds, scheduledFor) {
    return mutatePlanningState('bulkRescheduleTasks', { taskIds, scheduledFor });
}
