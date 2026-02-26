import { mutatePlanningState } from '../invariants/mutationGuardrail';

/**
 * Add multiple tasks to Today atomically. Routes through centralized mutation guardrail.
 * All-or-nothing: if any item fails invariant or persistence, no mutation is committed.
 */
export async function bulkAddToToday(taskIds) {
    return mutatePlanningState('bulkAddToToday', { taskIds });
}
