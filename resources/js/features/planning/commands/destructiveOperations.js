/**
 * Registry of destructive operations that require explicit user confirmation.
 * Enforced at command layer; use requiresConfirmation for runtime checks.
 */

export const DESTRUCTIVE_OPERATIONS = Object.freeze({
    DELETE_LOCAL: 'delete-local-planning-data',
    DELETE_SYNCED: 'delete-synced-planning-data',
    RESET_SYNC: 'reset-sync-state',
    KEY_ROTATION: 'e2ee-key-rotation',
});

export const CONFIRMATION_ERROR = Object.freeze({
    code: 'CONFIRMATION_REQUIRED',
    message: 'This operation requires explicit confirmation. Provide confirmed: true to proceed.',
});

const OPERATION_IDS = new Set(Object.values(DESTRUCTIVE_OPERATIONS));

/**
 * @param {string} operationId - Operation identifier
 * @returns {boolean} - true if operation requires confirmation before execution
 */
export function requiresConfirmation(operationId) {
    return OPERATION_IDS.has(operationId);
}
