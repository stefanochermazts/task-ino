import {
    addTaskToTodayWithCap,
    swapTasksInToday,
} from '../persistence/inboxTaskStore';
import { readTodayCap } from '../persistence/todayCapStore';

export async function addToToday(taskId) {
    const cap = readTodayCap();
    try {
        return await addTaskToTodayWithCap(taskId, cap);
    } catch (_error) {
        return {
            ok: false,
            message: 'Unable to save task locally. Please retry.',
        };
    }
}

export async function swapToToday(addTaskId, removeTaskId) {
    try {
        return await swapTasksInToday(addTaskId, removeTaskId);
    } catch (_error) {
        return {
            ok: false,
            message: 'Unable to save task locally. Please retry.',
        };
    }
}
