export function validateQuickCaptureInput(rawTitle) {
    const normalizedTitle = String(rawTitle ?? '').trim();

    if (normalizedTitle.length === 0) {
        return {
            ok: false,
            message: 'Task title is required.',
        };
    }

    return {
        ok: true,
        normalizedTitle,
    };
}
