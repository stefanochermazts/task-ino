import {
    addTaskToTodayWithCap,
    swapTasksInToday,
    bulkAddTasksToToday,
    removeTaskFromToday,
    setTaskPaused,
    setTaskArea as setTaskAreaInStore,
} from '../persistence/inboxTaskStore';
import { readTodayCap } from '../persistence/todayCapStore';
import { isValidArea } from '../persistence/areaStore';

/** Stable domain error codes for blocked transitions */
export const TODAY_CAP_EXCEEDED = 'TODAY_CAP_EXCEEDED';
export const TASK_NOT_FOUND = 'TASK_NOT_FOUND';
export const REMOVE_TASK_NOT_IN_TODAY = 'REMOVE_TASK_NOT_IN_TODAY';
export const INVARIANT_VIOLATION = 'INVARIANT_VIOLATION';
export const CLOSURE_REQUIRED = 'CLOSURE_REQUIRED';
export const INVALID_AREA = 'INVALID_AREA';

function isValidTaskId(id) {
    const s = String(id ?? '').trim();
    return s.length > 0;
}

function normalizeResult(result) {
    if (result?.ok === true) {
        const out = { ok: true };
        if (result.task !== undefined) {
            out.task = result.task;
        }
        return out;
    }
    const code = result?.code ?? INVARIANT_VIOLATION;
    const message =
        result?.message ??
        (code === TODAY_CAP_EXCEEDED
            ? 'Today is at capacity. Choose an item to swap or cancel.'
            : code === TASK_NOT_FOUND
              ? 'Task not found.'
              : code === REMOVE_TASK_NOT_IN_TODAY
                ? 'Selected item is not in Today.'
                : code === INVALID_AREA
                  ? 'Invalid area. Choose an existing area.'
                  : 'Unable to save. Please retry.');
    return { ok: false, code, message };
}

/**
 * Single write-path guardrail for planning mutations.
 * All planning write operations MUST pass through this layer.
 *
 * @param {string} action - 'addToToday' | 'swapToToday' | 'bulkAddToToday' | 'removeFromToday' | 'pauseTask' | 'setTaskArea'
 * @param {object} params - Action-specific parameters
 * @returns {Promise<{ok: boolean, code?: string, message?: string, task?: object}>}
 */
export async function mutatePlanningState(action, params) {
    try {
        if (action === 'addToToday') {
            const { taskId } = params ?? {};
            if (!isValidTaskId(taskId)) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Invalid task.',
                };
            }
            const cap = readTodayCap();
            const result = await addTaskToTodayWithCap(taskId, cap);
            return normalizeResult(result);
        }

        if (action === 'swapToToday') {
            const { addTaskId, removeTaskId } = params ?? {};
            if (!isValidTaskId(addTaskId) || !isValidTaskId(removeTaskId)) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Invalid task.',
                };
            }
            if (addTaskId === removeTaskId) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Cannot swap a task with itself.',
                };
            }
            const result = await swapTasksInToday(addTaskId, removeTaskId);
            return normalizeResult(result);
        }

        if (action === 'bulkAddToToday') {
            const { taskIds } = params ?? {};
            const ids = Array.isArray(taskIds) ? [...new Set(taskIds)] : [];
            if (ids.length === 0 || ids.some((id) => !isValidTaskId(id))) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Invalid task list.',
                };
            }
            const cap = readTodayCap();
            const result = await bulkAddTasksToToday(ids, cap);
            return normalizeResult(result);
        }

        if (action === 'removeFromToday') {
            const { taskId } = params ?? {};
            if (!isValidTaskId(taskId)) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Invalid task.',
                };
            }
            const result = await removeTaskFromToday(taskId);
            return normalizeResult(result);
        }

        if (action === 'pauseTask') {
            const { taskId } = params ?? {};
            if (!isValidTaskId(taskId)) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Invalid task.',
                };
            }
            const result = await setTaskPaused(taskId);
            return normalizeResult(result);
        }

        if (action === 'setTaskArea') {
            const { taskId, areaId } = params ?? {};
            if (!isValidTaskId(taskId)) {
                return {
                    ok: false,
                    code: INVARIANT_VIOLATION,
                    message: 'Invalid task.',
                };
            }
            const area = String(areaId ?? '').trim().toLowerCase();
            if (area.length === 0 || !isValidArea(area)) {
                return {
                    ok: false,
                    code: INVALID_AREA,
                    message: 'Invalid area. Choose an existing area.',
                };
            }
            const result = await setTaskAreaInStore(taskId, area);
            return normalizeResult(result);
        }

        return {
            ok: false,
            code: INVARIANT_VIOLATION,
            message: 'Unknown mutation action.',
        };
    } catch (_error) {
        return {
            ok: false,
            code: INVARIANT_VIOLATION,
            message: 'Unable to save task locally. Please retry.',
        };
    }
}
