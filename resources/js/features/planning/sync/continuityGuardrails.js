/**
 * Multi-Device Continuity Guardrails
 *
 * Design notes for cross-device eventual consistency (S-004).
 *
 * ## Precedence Rules
 *
 * 1. **Confirmed decision precedence**: Locally committed, invariant-safe mutations
 *    (via mutationGuardrail) are treated as "confirmed". When reconciling with
 *    remote snapshots, the merge resolver (syncBatchMerge) uses timestamp + device_id
 *    to pick a winner. Stale remote snapshots (lower timestamp) lose against
 *    newer local decisions.
 *
 * 2. **Deterministic outcome**: Regardless of reconciliation order (e.g. batch A
 *    then B vs B then A), applying the same set of mutations to the same initial
 *    state yields identical final state. The tie-break (timestamp, device_id) is
 *    stable and documented.
 *
 * 3. **Invariant-first pipeline**: All reconciliation flows through the central
 *    guardrail (mutatePlanningState 'applyMergeBatch'). Rejections occur when:
 *    - Today cap would be exceeded
 *    - Temporal validity violated (invalid scheduledFor/retainedFor)
 *    - Malformed or invalid payload (missing id, etc.)
 *
 * ## Reconciliation Flow
 *
 * 1. Fetch local tasks from inboxTaskStore.
 * 2. Call mutatePlanningState('applyMergeBatch', { localTasks, incomingMutations }).
 * 3. If ok: atomically persist resolvedTasks via replaceAllTasks.
 * 4. If !ok: do NOT persist; local state unchanged; surface deterministic error.
 *
 * ## User-Visible Alignment
 *
 * - When delayed sync causes temporary divergence: concise, non-blocking message
 *   (e.g. "Syncing across devices…" or "Aligning your plan…").
 * - Final aligned state reflected without interrupting planning actions.
 * - Errors sanitized via syncFeedbackModel; no raw stack traces.
 */

export const CONTINUITY_CODES = {
    ALIGNED: 'DEVICE_ALIGNED',
    DIVERGENT: 'DEVICE_DIVERGENT',
    RECONCILING: 'DEVICE_RECONCILING',
    RECONCILIATION_REJECTED: 'DEVICE_RECONCILIATION_REJECTED',
};
