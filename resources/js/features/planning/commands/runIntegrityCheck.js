/**
 * Run integrity check on current local planning state.
 * Thin orchestrator: loads snapshot, runs validatePlanningIntegrity.
 *
 * @returns {Promise<object>} IntegrityReport
 */
import { loadPlanningSnapshot } from '../persistence/loadPlanningSnapshot';
import { validatePlanningIntegrity } from './validatePlanningIntegrity';

export async function runIntegrityCheck() {
    const loadResult = await loadPlanningSnapshot();

    if (!loadResult.ok) {
        return {
            ok: false,
            checkedAt: new Date().toISOString(),
            violations: [
                {
                    invariant: 'SNAPSHOT_LOAD_FAILED',
                    detail: loadResult.error ?? 'Could not load planning state for validation.',
                },
            ],
            passed: [],
        };
    }

    return validatePlanningIntegrity(loadResult.snapshot);
}
