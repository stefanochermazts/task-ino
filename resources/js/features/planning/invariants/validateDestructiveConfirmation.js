/**
 * Validates that destructive operations have explicit user confirmation.
 * Returns structured result; use at command layer for deterministic rejection.
 *
 * @param {{ confirmed: unknown, operationId: string }} params
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */

import { CONFIRMATION_ERROR, requiresConfirmation } from '../commands/destructiveOperations';

export function validateDestructiveConfirmation({ confirmed, operationId }) {
    if (!requiresConfirmation(operationId)) {
        return {
            ok: false,
            code: 'INVALID_DESTRUCTIVE_OPERATION',
            message: 'Confirmation validation can only be used for registered destructive operations.',
        };
    }
    if (confirmed === true) {
        return { ok: true };
    }
    return {
        ok: false,
        code: CONFIRMATION_ERROR.code,
        message: CONFIRMATION_ERROR.message,
    };
}
