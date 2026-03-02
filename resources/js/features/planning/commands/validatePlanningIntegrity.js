/**
 * Pure integrity validation for planning state.
 * Deterministic: same snapshot → identical report. Read-only; does not mutate any store.
 * Output structured IntegrityReport for recovery flows (Story 4.5).
 *
 * @param {object} snapshot - { tasks, todayCap, areas, dayCycle }
 *   - tasks: object[]
 *   - todayCap: number
 *   - areas: string[]
 *   - dayCycle: string|null (lastPlanningDate, YYYY-MM-DD)
 * @returns {object} IntegrityReport
 */

import { validateTaskFields } from '../invariants/validateTaskFields';

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

const INVARIANTS = [
    'TODAY_CAP_EXCEEDED',
    'TASK_FIELD_INTEGRITY',
    'AREA_MEMBERSHIP_CONSISTENCY',
    'DAY_CYCLE_CONTINUITY',
];

function checkTodayCapConstraint(tasks, todayCap) {
    const list = Array.isArray(tasks) ? tasks : [];
    const cap = Number.isFinite(todayCap) && todayCap > 0 ? todayCap : 0;
    const todayCount = list.filter((t) => t?.todayIncluded === true).length;
    if (todayCount > cap && cap > 0) {
        return {
            ok: false,
            invariant: 'TODAY_CAP_EXCEEDED',
            detail: `Today contains ${todayCount} tasks but cap is ${cap}.`,
        };
    }
    return { ok: true, invariant: 'TODAY_CAP_EXCEEDED' };
}

function checkTaskFieldIntegrity(tasks) {
    const result = validateTaskFields(tasks);
    if (result.ok) {
        return { ok: true, invariant: 'TASK_FIELD_INTEGRITY' };
    }
    const details = result.violations?.map((v) => v.detail).join(' ') ?? 'One or more tasks have empty id or title.';
    return {
        ok: false,
        invariant: 'TASK_FIELD_INTEGRITY',
        detail: details,
    };
}

function checkAreaMembershipConsistency(tasks, areas) {
    const list = Array.isArray(tasks) ? tasks : [];
    const areaSet = new Set(
        Array.isArray(areas) ? areas.map((a) => String(a ?? '').trim().toLowerCase()) : [],
    );
    if (!areaSet.has('inbox')) areaSet.add('inbox');

    const violations = [];
    for (let i = 0; i < list.length; i += 1) {
        const t = list[i];
        const area = String(t?.area ?? 'inbox').trim().toLowerCase();
        if (area.length > 0 && !areaSet.has(area)) {
            violations.push(
                `Task at index ${i} (id="${t?.id ?? ''}") references area "${area}" not present in areas list.`,
            );
        }
    }
    if (violations.length > 0) {
        return {
            ok: false,
            invariant: 'AREA_MEMBERSHIP_CONSISTENCY',
            detail: violations.join(' '),
        };
    }
    return { ok: true, invariant: 'AREA_MEMBERSHIP_CONSISTENCY' };
}

function checkDayCycleContinuity(dayCycle) {
    if (dayCycle == null) {
        return { ok: true, invariant: 'DAY_CYCLE_CONTINUITY' };
    }
    const s = String(dayCycle).trim();
    if (s.length === 0) {
        return {
            ok: false,
            invariant: 'DAY_CYCLE_CONTINUITY',
            detail: 'lastPlanningDate is required when dayCycle is active.',
        };
    }
    if (!YYYY_MM_DD.test(s)) {
        return {
            ok: false,
            invariant: 'DAY_CYCLE_CONTINUITY',
            detail: `lastPlanningDate "${dayCycle}" is not a valid YYYY-MM-DD date.`,
        };
    }
    const [yearStr, monthStr, dayStr] = s.split('-');
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isParseable =
        Number.isFinite(year) &&
        Number.isFinite(month) &&
        Number.isFinite(day) &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
    if (!isParseable) {
        return {
            ok: false,
            invariant: 'DAY_CYCLE_CONTINUITY',
            detail: `lastPlanningDate "${dayCycle}" is not parseable.`,
        };
    }
    return { ok: true, invariant: 'DAY_CYCLE_CONTINUITY' };
}

/**
 * @param {object} snapshot - { tasks, todayCap, areas, dayCycle }
 * @returns {object} IntegrityReport
 */
export function validatePlanningIntegrity(snapshot) {
    const tasks = snapshot?.tasks ?? [];
    const todayCap = snapshot?.todayCap ?? 0;
    const areas = snapshot?.areas ?? [];
    const dayCycle = snapshot?.dayCycle ?? null;

    const violations = [];
    const passed = [];

    const r1 = checkTodayCapConstraint(tasks, todayCap);
    if (r1.ok) passed.push(r1.invariant);
    else violations.push({ invariant: r1.invariant, detail: r1.detail });

    const r2 = checkTaskFieldIntegrity(tasks);
    if (r2.ok) passed.push(r2.invariant);
    else violations.push({ invariant: r2.invariant, detail: r2.detail });

    const r3 = checkAreaMembershipConsistency(tasks, areas);
    if (r3.ok) passed.push(r3.invariant);
    else violations.push({ invariant: r3.invariant, detail: r3.detail });

    const r4 = checkDayCycleContinuity(dayCycle);
    if (r4.ok) passed.push(r4.invariant);
    else violations.push({ invariant: r4.invariant, detail: r4.detail });

    return {
        ok: violations.length === 0,
        checkedAt: new Date().toISOString(),
        violations,
        passed,
    };
}
