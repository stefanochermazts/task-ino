/**
 * Run integrity check and return a recovery guide with ordered actions.
 *
 * Ordering invariant (FR32): Non-destructive actions MUST precede destructive ones.
 * The default recovery path is never destructive — rebuild projection first, delete only when
 * explicitly chosen with confirmation. This is enforced at the command layer so any consumer
 * (UI, tests, scripts) receives actions in safe-first order.
 *
 * @returns {Promise<{ ok: boolean, hasViolations?: boolean, violations?: object[], actions?: object[], code?: string, message?: string }>}
 */
import { runIntegrityCheck } from './runIntegrityCheck';

const ACTIONS = [
    {
        id: 'rebuild-projection',
        label: 'Rebuild Today projection',
        description: 'Recomputes the Today view from local task state. Reversible — no data is deleted.',
        destructive: false,
    },
    {
        id: 'delete-local-data',
        label: 'Delete all local planning data',
        description: 'Permanently removes all local tasks, areas, and sync state. Irreversible.',
        destructive: true,
    },
];

export function assertRecoveryActionOrder(actions) {
    const firstDestructiveIdx = actions.findIndex((a) => a.destructive === true);
    const lastNonDestructiveIdx = actions.map((a) => !a.destructive).lastIndexOf(true);
    if (firstDestructiveIdx !== -1 && lastNonDestructiveIdx > firstDestructiveIdx) {
        throw new Error('INVARIANT_VIOLATION: destructive action precedes non-destructive in recovery guide');
    }
}

export async function runGuidedRecovery() {
    try {
        const report = await runIntegrityCheck();
        if (!report) {
            return {
                ok: false,
                code: 'RECOVERY_CHECK_FAILED',
                message: 'Integrity check could not complete. Please try again.',
            };
        }
        if (report.ok === false && report.violations?.some((v) => v.invariant === 'SNAPSHOT_LOAD_FAILED')) {
            return {
                ok: false,
                code: 'RECOVERY_CHECK_FAILED',
                message: 'Unable to load planning state for recovery. Please try again.',
            };
        }
        const violations = Array.isArray(report.violations) ? report.violations : [];
        const hasViolations = violations.length > 0;
        const actions = [...ACTIONS];

        // Runtime invariant: non-destructive MUST precede destructive (no destructive default)
        assertRecoveryActionOrder(actions);

        return {
            ok: true,
            hasViolations,
            violations,
            actions,
        };
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVARIANT_VIOLATION')) {
            throw error;
        }
        return {
            ok: false,
            code: 'RECOVERY_CHECK_FAILED',
            message: 'Recovery check failed. Please try again.',
        };
    }
}
