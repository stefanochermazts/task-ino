/**
 * Deterministic Sync Batch Conflict Resolution
 *
 * Tie-break strategy (documented contract):
 *   1. Primary:   higher `timestamp` wins (ms epoch integer).
 *   2. Secondary: lexicographic descending `device_id` (if timestamps are equal).
 *   3. Fallback:  if device_id is missing on one side, the side WITH device_id wins.
 *                 If both are missing, the incoming update wins (remote takes precedence
 *                 over already-persisted when undecidable).
 *
 * Invariants preserved after merge (local-first guarantees):
 *   - `todayIncluded` follows the winning mutation OR the existing local value (OR semantics).
 *     If the merge would push the total `todayIncluded` count above `todayCap`, the entire
 *     batch is rejected with SYNC_MERGE_INVARIANT_REJECT.
 *   - `scheduledFor`, `retainedFor` are copied verbatim from winning mutation.
 *   - No implicit carry-over: merge only propagates fields explicitly present in mutations.
 *
 * Atomicity:
 *   - resolveSyncBatch returns a complete resolved task list without side effects.
 *   - Callers are responsible for persisting the resolved list atomically.
 */

export const MERGE_CONFLICT_CODE = 'SYNC_CONFLICT_RESOLVED';
export const MERGE_INVARIANT_REJECT_CODE = 'SYNC_MERGE_INVARIANT_REJECT';

/**
 * @typedef {{ id: string, timestamp: number, device_id?: string, [key: string]: unknown }} SyncMutation
 * @typedef {{ id: string, todayIncluded: boolean, scheduledFor?: string|null, retainedFor?: string|null, [key: string]: unknown }} TaskRecord
 */

/**
 * Compare two mutations deterministically.
 * Returns negative if a should lose, positive if a should win, 0 if identical.
 * @param {SyncMutation} a
 * @param {SyncMutation} b
 * @returns {number}
 */
export function compareMutations(a, b) {
    const ta = toTimestamp(a?.timestamp);
    const tb = toTimestamp(b?.timestamp);

    if (ta !== tb) {
        return ta - tb;
    }

    const da = String(a?.device_id ?? '');
    const db = String(b?.device_id ?? '');

    if (da === db) {
        return 0;
    }
    if (da === '' && db !== '') return -1;
    if (da !== '' && db === '') return 1;
    return da < db ? -1 : 1;
}

function toTimestamp(value) {
    if (Number.isFinite(value)) {
        return Number(value);
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return 0;
}

function isValidYYYYMMDD(value) {
    if (value === null || value === undefined) return true;
    const s = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const parsed = Date.parse(`${s}T00:00:00Z`);
    if (!Number.isFinite(parsed)) return false;
    const d = new Date(parsed);
    const normalized = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate(),
    ).padStart(2, '0')}`;
    return normalized === s;
}

function getOwnership(task) {
    const userId = task?.userId ?? task?.user_id ?? task?.ownerId ?? task?.owner_id ?? null;
    if (userId === null || userId === undefined || String(userId).trim() === '') {
        return null;
    }
    return String(userId);
}

function buildLocalCandidate(task) {
    const ts = toTimestamp(task?.syncTimestamp ?? task?.updatedAt ?? task?.createdAt);
    return {
        ...task,
        timestamp: ts,
        device_id: String(task?.syncDeviceId ?? task?.device_id ?? 'local'),
    };
}

/**
 * Pick the winning mutation from a list of conflicting mutations for the same task id.
 * Deterministic: highest timestamp wins, then highest device_id lexicographically.
 * @param {SyncMutation[]} mutations - At least one mutation; all for the same task id.
 * @returns {SyncMutation}
 */
export function resolveConflict(mutations) {
    if (!Array.isArray(mutations) || mutations.length === 0) {
        throw new Error('resolveConflict requires at least one mutation.');
    }
    let winner = mutations[0];
    for (let i = 1; i < mutations.length; i++) {
        if (compareMutations(mutations[i], winner) > 0) {
            winner = mutations[i];
        }
    }
    return winner;
}

/**
 * Merge a sync batch of mutations into existing local tasks, preserving invariants.
 *
 * @param {{
 *   localTasks: TaskRecord[],
 *   incomingMutations: SyncMutation[],
 *   todayCap: number,
 * }} params
 * @returns {{
 *   ok: boolean,
 *   resolvedTasks: TaskRecord[],
 *   conflicts: number,  // count of task IDs that had 2+ competing mutations in the incoming batch
 *   code?: string,
 *   message?: string,
 * }}
 * Note on `conflicts`: counts only intra-batch conflicts (same id appearing 2+ times in
 * `incomingMutations`). A mutation overriding an existing local task is NOT counted here —
 * that is normal sync application, not a conflict.
 * Note on reject: when ok=false, `resolvedTasks` is empty. Callers should retain the
 * pre-merge local state unchanged.
 */
export function resolveSyncBatch({ localTasks, incomingMutations, todayCap }) {
    if (!Array.isArray(localTasks) || !Array.isArray(incomingMutations)) {
        return {
            ok: false,
            resolvedTasks: [],
            conflicts: 0,
            code: MERGE_INVARIANT_REJECT_CODE,
            message: 'Invalid merge inputs.',
        };
    }

    if (!Number.isFinite(todayCap) || todayCap <= 0) {
        return {
            ok: false,
            resolvedTasks: [],
            conflicts: 0,
            code: MERGE_INVARIANT_REJECT_CODE,
            message: 'Today cap must be a positive number.',
        };
    }

    const validLocalTasks = localTasks.filter((t) => typeof t?.id === 'string' && t.id.trim() !== '');
    const localById = new Map(validLocalTasks.map((t) => [t.id, t]));

    const mutationsByTaskId = new Map();
    for (const mutation of incomingMutations) {
        const id = mutation?.id;
        if (typeof id !== 'string' || id.trim() === '') {
            return {
                ok: false,
                resolvedTasks: [],
                conflicts: 0,
                code: MERGE_INVARIANT_REJECT_CODE,
                message: 'Malformed mutation payload: missing task id.',
            };
        }
        if (!isValidYYYYMMDD(mutation?.scheduledFor) || !isValidYYYYMMDD(mutation?.retainedFor)) {
            return {
                ok: false,
                resolvedTasks: [],
                conflicts: 0,
                code: MERGE_INVARIANT_REJECT_CODE,
                message: 'Malformed mutation payload: invalid temporal target.',
            };
        }
        if (!mutationsByTaskId.has(id)) {
            mutationsByTaskId.set(id, []);
        }
        mutationsByTaskId.get(id).push(mutation);
    }

    let conflicts = 0;
    const resolvedById = new Map(localById);

    for (const [taskId, mutations] of mutationsByTaskId.entries()) {
        const existing = localById.get(taskId);
        const candidates = [...mutations];
        if (existing) {
            candidates.push(buildLocalCandidate(existing));
        }
        const winner = resolveConflict(candidates);

        if (mutations.length > 1) {
            conflicts++;
        }

        const base = existing ?? {};
        const localOwner = getOwnership(existing);
        const incomingOwner = getOwnership(winner);
        if (localOwner && incomingOwner && localOwner !== incomingOwner) {
            return {
                ok: false,
                resolvedTasks: [],
                conflicts,
                code: MERGE_INVARIANT_REJECT_CODE,
                message: 'Reconciliation rejected due to ownership mismatch.',
            };
        }

        const resolved = {
            ...base,
            ...winner,
            id: taskId,
        };

        resolved.todayIncluded = winner.todayIncluded === true || base.todayIncluded === true;
        if (!isValidYYYYMMDD(resolved.scheduledFor) || !isValidYYYYMMDD(resolved.retainedFor)) {
            return {
                ok: false,
                resolvedTasks: [],
                conflicts,
                code: MERGE_INVARIANT_REJECT_CODE,
                message: 'Reconciliation rejected due to invalid temporal target.',
            };
        }
        resolved.syncTimestamp = toTimestamp(winner?.timestamp);
        resolved.syncDeviceId = String(winner?.device_id ?? 'local');

        resolvedById.set(taskId, resolved);
    }

    const resolvedTasks = Array.from(resolvedById.values());

    const todayCount = resolvedTasks.filter((t) => t.todayIncluded === true).length;
    if (todayCount > todayCap) {
        return {
            ok: false,
            resolvedTasks: [],
            conflicts,
            code: MERGE_INVARIANT_REJECT_CODE,
            message: `Merge would exceed Today cap (${todayCount} > ${todayCap}). Merge rejected.`,
        };
    }

    return {
        ok: true,
        resolvedTasks,
        conflicts,
        code: conflicts > 0 ? MERGE_CONFLICT_CODE : undefined,
    };
}
