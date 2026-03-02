import { mutatePlanningState } from '../invariants/mutationGuardrail';

export async function retainTaskForNextDay(taskId) {
    return mutatePlanningState('retainTaskForNextDay', { taskId });
}

