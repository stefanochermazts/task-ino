export const SYNC_STATUS = {
    SYNCING: 'syncing',
    OFFLINE: 'offline',
    RETRYING: 'retrying',
    SUCCESS: 'success',
};

/**
 * Build deterministic sync status from local runtime inputs.
 * @param {{ syncEnabled: boolean, online: boolean, hasError?: boolean }} params
 * @returns {'syncing'|'offline'|'retrying'|'success'}
 */
export function getSyncStatus(params) {
    const syncEnabled = params?.syncEnabled === true;
    const online = params?.online === true;
    const hasError = params?.hasError === true;

    if (!syncEnabled || !online) {
        return SYNC_STATUS.OFFLINE;
    }
    if (hasError) {
        return SYNC_STATUS.RETRYING;
    }
    return SYNC_STATUS.SUCCESS;
}

/**
 * Convert technical errors into user-safe actionable sync feedback.
 * @param {unknown} rawError
 * @returns {{ code: string, message: string, recovery: string }}
 */
export function sanitizeSyncError(rawError) {
    const explicitCode = String(rawError?.code ?? '').trim().toUpperCase();
    const rawMessage = String(rawError?.message ?? '').toLowerCase();

    if (explicitCode === 'NETWORK_OFFLINE' || rawMessage.includes('offline')) {
        return {
            code: 'NETWORK_OFFLINE',
            message: 'Sync is currently offline.',
            recovery: 'Check connection and retry.',
        };
    }

    if (explicitCode === 'SYNC_TIMEOUT' || rawMessage.includes('timeout')) {
        return {
            code: 'SYNC_TIMEOUT',
            message: 'Sync is taking longer than expected.',
            recovery: 'Wait a moment, then retry.',
        };
    }

    if (explicitCode === 'AUTH_EXPIRED' || rawMessage.includes('auth')) {
        return {
            code: 'AUTH_EXPIRED',
            message: 'Sync session needs to be refreshed.',
            recovery: 'Re-enable sync mode and retry.',
        };
    }

    if (explicitCode === 'SYNC_NOT_CONFIGURED') {
        return {
            code: 'SYNC_NOT_CONFIGURED',
            message: 'Sync provider is not configured yet.',
            recovery: 'Continue planning locally or configure sync provider.',
        };
    }

    if (explicitCode === 'SYNC_PAYLOAD_INVALID') {
        return {
            code: 'SYNC_PAYLOAD_INVALID',
            message: 'Sync returned invalid update data.',
            recovery: 'Retry in a moment or continue planning locally.',
        };
    }

    return {
        code: 'SYNC_FAILED',
        message: 'Sync could not complete right now.',
        recovery: 'Continue planning locally and retry later.',
    };
}

/**
 * User-safe alignment feedback for multi-device continuity (S-004).
 * Non-blocking messages when delayed sync causes temporary divergence.
 *
 * @param {{ reconciling?: boolean, rejected?: boolean, error?: unknown }} params
 * @returns {{ message: string, recovery: string }}
 */
export function getAlignmentFeedback({ reconciling, rejected, error } = {}) {
    if (reconciling === true) {
        return {
            message: 'Aligning your plan across devices…',
            recovery: '',
        };
    }
    if (rejected === true) {
        const sanitized = sanitizeSyncError(error ?? { code: 'DEVICE_RECONCILIATION_REJECTED' });
        return {
            message: sanitized.message,
            recovery: sanitized.recovery,
        };
    }
    return {
        message: 'Plan aligned.',
        recovery: '',
    };
}

