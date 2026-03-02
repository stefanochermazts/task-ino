import { describe, expect, it } from 'vitest';
import { getSyncStatus, sanitizeSyncError, getAlignmentFeedback, SYNC_STATUS } from './syncFeedbackModel';

describe('syncFeedbackModel', () => {
    describe('getSyncStatus', () => {
        it('returns offline when sync is disabled', () => {
            expect(getSyncStatus({ syncEnabled: false, online: true })).toBe(SYNC_STATUS.OFFLINE);
        });

        it('returns offline when network is unavailable', () => {
            expect(getSyncStatus({ syncEnabled: true, online: false })).toBe(SYNC_STATUS.OFFLINE);
        });

        it('returns retrying when error is present while online and enabled', () => {
            expect(getSyncStatus({ syncEnabled: true, online: true, hasError: true })).toBe(SYNC_STATUS.RETRYING);
        });

        it('returns success when sync is enabled, online, and no error', () => {
            expect(getSyncStatus({ syncEnabled: true, online: true, hasError: false })).toBe(SYNC_STATUS.SUCCESS);
        });
    });

    describe('sanitizeSyncError', () => {
        it('maps offline errors to actionable feedback', () => {
            const out = sanitizeSyncError({ code: 'NETWORK_OFFLINE', message: 'request offline' });
            expect(out.code).toBe('NETWORK_OFFLINE');
            expect(out.message).toContain('offline');
            expect(out.recovery).toBeTruthy();
        });

        it('maps timeout errors to actionable feedback', () => {
            const out = sanitizeSyncError({ code: 'SYNC_TIMEOUT' });
            expect(out.code).toBe('SYNC_TIMEOUT');
            expect(out.message.toLowerCase()).toContain('longer');
        });

        it('never exposes raw technical message in unknown errors', () => {
            const out = sanitizeSyncError({
                code: 'SOMETHING_WEIRD',
                message: 'TypeError: Cannot read properties of undefined at sync.js:99',
            });
            expect(out.code).toBe('SYNC_FAILED');
            expect(out.message).not.toContain('TypeError');
            expect(out.message).not.toContain('sync.js:99');
            expect(out.recovery).toBeTruthy();
        });

        it('maps sync-not-configured to actionable feedback', () => {
            const out = sanitizeSyncError({ code: 'SYNC_NOT_CONFIGURED' });
            expect(out.code).toBe('SYNC_NOT_CONFIGURED');
            expect(out.message).toContain('not configured');
        });
    });

    describe('getAlignmentFeedback', () => {
        it('returns aligning message when reconciling', () => {
            const out = getAlignmentFeedback({ reconciling: true });
            expect(out.message).toContain('Aligning');
            expect(out.message).toContain('devices');
        });

        it('returns sanitized error when rejected', () => {
            const out = getAlignmentFeedback({
                rejected: true,
                error: { code: 'SYNC_MERGE_INVARIANT_REJECT', message: 'Merge rejected' },
            });
            expect(out.message).toBeTruthy();
            expect(out.message).not.toContain('Merge rejected');
        });

        it('returns plan aligned when neither reconciling nor rejected', () => {
            const out = getAlignmentFeedback({});
            expect(out.message).toBe('Plan aligned.');
        });
    });
});

