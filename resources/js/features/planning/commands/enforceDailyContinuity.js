import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Enforce day-boundary continuity: no implicit carry-over of Today items.
 * Only explicitly rescheduled (scheduledFor === today) items remain in Today.
 * Idempotent when lastPlanningDate === today.
 *
 * @returns {Promise<{ok: boolean, applied?: boolean, updatedCount?: number}>}
 */
export async function enforceDailyContinuity() {
    return mutatePlanningState('enforceDailyContinuity', {});
}
