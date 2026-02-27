import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * @param {string} taskId
 * @param {string} areaId
 * @returns {Promise<{ok: boolean, code?: string, message?: string, task?: object}>}
 */
export async function setTaskArea(taskId, areaId) {
    return mutatePlanningState('setTaskArea', { taskId, areaId });
}
