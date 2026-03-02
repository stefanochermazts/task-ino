/**
 * Shared validation for task field integrity.
 * Non-empty id and title required. Reused by export and integrity validation.
 *
 * @param {object[]} tasks - Task records
 * @returns {{ ok: boolean, violations?: Array<{ invariant: string, detail: string }> }}
 *   - ok: true when all tasks have valid id and title
 *   - ok: false with violations when any task fails
 */
export function validateTaskFields(tasks) {
    const violations = [];

    if (!Array.isArray(tasks)) {
        return {
            ok: false,
            violations: [{ invariant: 'TASK_FIELD_INTEGRITY', detail: 'Tasks input is not an array.' }],
        };
    }

    for (let i = 0; i < tasks.length; i += 1) {
        const t = tasks[i];
        const id = String(t?.id ?? '').trim();
        const title = String(t?.title ?? '').trim();
        if (id === '' || title === '') {
            violations.push({
                invariant: 'TASK_FIELD_INTEGRITY',
                detail: `Task at index ${i} has empty id or title (id="${id}", title="${title}").`,
            });
        }
    }

    return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
