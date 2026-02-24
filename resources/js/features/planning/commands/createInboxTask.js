import { validateQuickCaptureInput } from '../invariants/validateQuickCaptureInput';
import { saveInboxTask } from '../persistence/inboxTaskStore';

function buildTaskId() {
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    return `task_${Date.now()}_${randomSuffix}`;
}

export async function createInboxTask(rawTitle) {
    const validation = validateQuickCaptureInput(rawTitle);
    if (!validation.ok) {
        return {
            ok: false,
            message: validation.message,
        };
    }

    const task = {
        id: buildTaskId(),
        title: validation.normalizedTitle,
        area: 'inbox',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    try {
        await saveInboxTask(task);
        return { ok: true, task };
    } catch (_error) {
        return {
            ok: false,
            message: 'Unable to save task locally. Please retry.',
        };
    }
}
