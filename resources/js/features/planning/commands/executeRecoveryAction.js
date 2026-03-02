/**
 * Execute a recovery action by ID. Delegates to existing commands.
 *
 * Invariant: Destructive actions (e.g. delete-local-data) MUST NOT be auto-triggered.
 * The caller must pass `confirmed: true` after obtaining explicit user confirmation.
 * Without it, the command returns RECOVERY_CONFIRMATION_REQUIRED deterministically.
 *
 * @param {object} params
 * @param {string} params.actionId - 'rebuild-projection' | 'delete-local-data'
 * @param {boolean} [params.confirmed] - Required true for destructive actions
 * @param {object} [params.ui] - For rebuild: { todayList, todayEmpty, todayCount, todayCapValue }
 * @param {function} [params.onRemoveFromToday] - For rebuild: callback for remove button
 * @param {function} [params.onAfterDelete] - For delete: callback after successful delete (e.g. refreshInbox)
 * @returns {Promise<{ ok: boolean, code?: string, message?: string }>}
 */
import { rebuildPlanningProjection } from './rebuildPlanningProjection';
import { deleteLocalPlanningData } from './deleteLocalPlanningData';

export async function executeRecoveryAction({ actionId, confirmed, ui, onRemoveFromToday, onAfterDelete } = {}) {
    if (actionId === 'rebuild-projection') {
        const result = await rebuildPlanningProjection({ ui, onRemoveFromToday });
        if (result.ok) {
            return {
                ok: true,
                code: result.code,
                message: result.message,
            };
        }
        return {
            ok: false,
            code: result.code ?? 'REBUILD_FAILED',
            message: result.message ?? 'Projection rebuild failed. Please try again.',
        };
    }

    if (actionId === 'delete-local-data') {
        // Destructive guard: no auto-invocation without explicit confirmation (Story 4.6)
        if (confirmed !== true) {
            return {
                ok: false,
                code: 'RECOVERY_CONFIRMATION_REQUIRED',
                message: 'Delete requires explicit confirmation.',
            };
        }
        const result = await deleteLocalPlanningData({ confirmed: true, onAfterDelete });
        if (result.ok) {
            return {
                ok: true,
                code: result.code,
                message: result.message,
            };
        }
        return {
            ok: false,
            code: result.code ?? 'DELETE_FAILED',
            message: result.message ?? 'Local deletion failed. Please try again.',
        };
    }

    return {
        ok: false,
        code: 'RECOVERY_UNKNOWN_ACTION',
        message: 'Unknown recovery action.',
    };
}
