import { appendPlanningEvent } from './appendPlanningEvent';
import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Enforce day-boundary continuity: no implicit carry-over of Today items.
 * Only explicitly rescheduled (scheduledFor === today) items remain in Today.
 * Idempotent when lastPlanningDate === today.
 *
 * @returns {Promise<{ok: boolean, applied?: boolean, updatedCount?: number}>}
 */
export async function enforceDailyContinuity() {
    const result = await mutatePlanningState('enforceDailyContinuity', {});
    if (result?.ok) {
        appendPlanningEvent(
            {
                timestamp: new Date().toISOString(),
                event_type: 'planning.cycle.continuity_enforced',
                entity_id: 'day-cycle',
                payload_version: 1,
                payload: { applied: result.applied, updatedCount: result.updatedCount ?? 0 },
            },
            {},
        ).catch(console.error);
    }
    return result;
}
