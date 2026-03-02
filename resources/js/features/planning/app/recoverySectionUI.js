import { runGuidedRecovery } from '../commands/runGuidedRecovery';
import { executeRecoveryAction } from '../commands/executeRecoveryAction';
import { removeFromToday } from '../commands/removeFromToday';

/**
 * Wires the recovery panel UI section.
 *
 * Non-destructive actions are always presented before destructive ones — this is a
 * contractual invariant enforced at the command layer (runGuidedRecovery) and reflected here.
 *
 * @param {object} ui - UI element references (from readUi)
 * @param {object} callbacks
 * @param {() => Promise<void>} callbacks.refreshInbox - Refresh the inbox after rebuild
 * @param {() => Promise<void>} callbacks.rebuildTodayView - Rebuild today projection from stores
 * @param {() => void} callbacks.onDeleteSuccess - Sync-mode UI updates after successful local delete
 */
export function initializeRecoverySection(ui, { refreshInbox, rebuildTodayView, onDeleteSuccess }) {
    let recoveryFeedbackTimeoutId = null;

    function scheduleRecoveryFeedbackClear(delayMs) {
        if (recoveryFeedbackTimeoutId) {
            clearTimeout(recoveryFeedbackTimeoutId);
        }
        recoveryFeedbackTimeoutId = setTimeout(() => {
            if (ui.recoveryFeedback) {
                ui.recoveryFeedback.textContent = '';
            }
            recoveryFeedbackTimeoutId = null;
        }, delayMs);
    }

    if (ui.runIntegrityCheckBtn && ui.recoveryFeedback) {
        ui.runIntegrityCheckBtn.addEventListener('click', async () => {
            ui.recoveryFeedback.textContent = 'Checking...';
            ui.runIntegrityCheckBtn.disabled = true;
            if (ui.recoveryViolations) ui.recoveryViolations.innerHTML = '';
            if (ui.recoveryActions) {
                ui.recoveryActions.classList.add('hidden');
            }
            try {
                const guide = await runGuidedRecovery();
                if (!guide.ok) {
                    ui.recoveryFeedback.textContent = guide.message ?? 'Integrity check failed. Please try again.';
                    scheduleRecoveryFeedbackClear(5000);
                    return;
                }
                if (!guide.hasViolations) {
                    ui.recoveryFeedback.textContent = 'No integrity issues detected.';
                    scheduleRecoveryFeedbackClear(5000);
                    return;
                }
                if (ui.recoveryViolations && guide.violations?.length) {
                    ui.recoveryViolations.innerHTML = guide.violations
                        .map((v) => `<div class="text-amber-800">${v.invariant}: ${v.detail}</div>`)
                        .join('');
                }
                const actions = Array.isArray(guide.actions) ? guide.actions : [];
                const actionUi = new Map([
                    [
                        'rebuild-projection',
                        {
                            button: ui.recoveryRebuildBtn,
                            block:
                                ui.recoveryRebuildBtn?.closest('.recovery-action-block') ??
                                ui.recoveryRebuildBtn?.closest('div'),
                        },
                    ],
                    [
                        'delete-local-data',
                        {
                            button: ui.recoveryDeleteLocalBtn,
                            block:
                                ui.recoveryDeleteLocalBtn?.closest('.recovery-action-block') ??
                                ui.recoveryDeleteLocalBtn?.closest('div'),
                        },
                    ],
                ]);
                for (const action of actions) {
                    const entry = actionUi.get(action?.id);
                    if (!entry?.button) continue;
                    entry.button.textContent = action.label ?? entry.button.textContent;
                    const desc = entry.block?.querySelector('p');
                    if (desc && action.description) {
                        desc.textContent = action.description;
                    }
                }
                // Render in RecoveryGuide array order (contractual invariant), without UI-side sorting.
                if (ui.recoveryActions) {
                    for (const action of actions) {
                        const entry = actionUi.get(action?.id);
                        if (entry?.block) {
                            ui.recoveryActions.appendChild(entry.block);
                        }
                    }
                }
                ui.recoveryFeedback.textContent = '';
                if (ui.recoveryActions) {
                    ui.recoveryActions.classList.remove('hidden');
                }
            } catch {
                ui.recoveryFeedback.textContent = 'Integrity check failed. Please try again.';
                scheduleRecoveryFeedbackClear(5000);
            } finally {
                ui.runIntegrityCheckBtn.disabled = false;
            }
        });
    }

    if (ui.recoveryRebuildBtn && ui.recoveryFeedback) {
        ui.recoveryRebuildBtn.addEventListener('click', async () => {
            ui.recoveryFeedback.textContent = '';
            ui.recoveryRebuildBtn.disabled = true;
            try {
                const result = await executeRecoveryAction({
                    actionId: 'rebuild-projection',
                    ui: {
                        todayList: ui.todayList,
                        todayEmpty: ui.todayEmpty,
                        todayCount: ui.todayCount,
                        todayCapValue: ui.todayCapValue,
                    },
                    onRemoveFromToday: async (taskId) => {
                        const res = await removeFromToday(taskId);
                        if (res.ok) await refreshInbox();
                        return res;
                    },
                });
                if (result.ok) {
                    ui.recoveryFeedback.textContent =
                        result.code === 'REBUILD_PARTIAL'
                            ? result.message ?? 'Today projection rebuilt with partial event replay.'
                            : 'Today projection rebuilt successfully.';
                    scheduleRecoveryFeedbackClear(5000);
                } else {
                    ui.recoveryFeedback.textContent = result.message ?? 'Rebuild failed. Please try again.';
                    scheduleRecoveryFeedbackClear(5000);
                }
            } catch {
                ui.recoveryFeedback.textContent = 'Rebuild failed. Please try again.';
                scheduleRecoveryFeedbackClear(5000);
            } finally {
                ui.recoveryRebuildBtn.disabled = false;
            }
        });
    }

    if (ui.recoveryDeleteLocalBtn && ui.recoveryFeedback) {
        ui.recoveryDeleteLocalBtn.addEventListener('click', async () => {
            const confirmed = window.confirm(
                'Delete all local planning data? Tasks, areas, Today cap, sync mode, and keys will be removed. This cannot be undone. Continue?',
            );
            if (!confirmed) return;
            ui.recoveryFeedback.textContent = '';
            ui.recoveryDeleteLocalBtn.disabled = true;
            try {
                const result = await executeRecoveryAction({
                    actionId: 'delete-local-data',
                    confirmed: true,
                    onAfterDelete: async () => {
                        await refreshInbox();
                        await rebuildTodayView();
                    },
                });
                if (result.ok) {
                    onDeleteSuccess();
                    ui.recoveryFeedback.textContent = 'Local data deleted.';
                    scheduleRecoveryFeedbackClear(5000);
                } else {
                    ui.recoveryFeedback.textContent = result.message ?? 'Delete failed. Please try again.';
                    scheduleRecoveryFeedbackClear(5000);
                }
            } catch {
                ui.recoveryFeedback.textContent = 'Delete failed. Please try again.';
                scheduleRecoveryFeedbackClear(5000);
            } finally {
                ui.recoveryDeleteLocalBtn.disabled = false;
            }
        });
    }
}
