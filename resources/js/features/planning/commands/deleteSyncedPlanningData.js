/**
 * Irreversibly delete synced (remote) planning data.
 * Requires explicit user confirmation separate from local deletion.
 * Calls taskinoSync.deleteRemotePlanningData when available.
 *
 * @param {{ confirmed: boolean }} params - Must pass confirmed: true (caller obtains user confirmation)
 * @returns {Promise<{ok: boolean, code?: string, message?: string}>}
 */

export async function deleteSyncedPlanningData({ confirmed }) {
    if (confirmed !== true) {
        return {
            ok: false,
            code: 'DELETE_REQUIRES_CONFIRMATION',
            message: 'Synced deletion requires explicit user confirmation.',
        };
    }

    const deleteRemote = window?.taskinoSync?.deleteRemotePlanningData;
    if (typeof deleteRemote !== 'function') {
        return {
            ok: false,
            code: 'SYNCED_DELETE_NOT_AVAILABLE',
            message: 'Synced deletion is not available. No sync provider is configured.',
        };
    }

    try {
        const result = await Promise.resolve(deleteRemote());
        if (result && typeof result === 'object' && result.ok === false) {
            return {
                ok: false,
                code: result.code ?? 'SYNCED_DELETE_FAILED',
                message: 'Synced deletion could not be confirmed. Please retry.',
            };
        }
        return { ok: true };
    } catch {
        return {
            ok: false,
            code: 'SYNCED_DELETE_FAILED',
            message: 'Synced deletion is temporarily unavailable. Please retry.',
        };
    }
}
