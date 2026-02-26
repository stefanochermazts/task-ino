import { addToToday, swapToToday } from '../commands/addToToday';
import { bulkAddToToday } from '../commands/bulkAddToToday';
import { createInboxTask } from '../commands/createInboxTask';
import { removeFromToday } from '../commands/removeFromToday';
import { pauseTask } from '../commands/pauseTask';
import { listInboxTasks } from '../persistence/inboxTaskStore';
import { readTodayCap, saveTodayCap } from '../persistence/todayCapStore';
import { computeTodayProjection, isValidTaskRecord } from '../projections/computeTodayProjection';
import { renderInboxProjection } from '../projections/renderInboxProjection';
import { renderTodayProjection } from '../projections/renderTodayProjection';

function clearPlanningProjectionUi(ui) {
    if (ui.list) ui.list.innerHTML = '';
    if (ui.todayList) ui.todayList.innerHTML = '';
    if (ui.empty) ui.empty.classList.remove('hidden');
    if (ui.todayEmpty) ui.todayEmpty.classList.remove('hidden');
    if (ui.count) ui.count.textContent = '0 tasks';
    if (ui.todayCount) ui.todayCount.textContent = `${0}/${readTodayCap()} selected`;
    if (ui.todayCapValue) ui.todayCapValue.textContent = '';
    if (ui.overCapPanel) ui.overCapPanel.classList.add('hidden');
    if (ui.closurePanel) ui.closurePanel.classList.add('hidden');
    if (ui.reviewPanel) ui.reviewPanel.classList.add('hidden');
    if (ui.reviewError) {
        ui.reviewError.textContent = '';
        ui.reviewError.classList.add('hidden');
    }
}

function readUi(root) {
    return {
        root,
        form: root.querySelector('#quick-capture-form'),
        input: root.querySelector('#quick-capture-input'),
        submit: root.querySelector('#quick-capture-submit'),
        feedback: root.querySelector('#quick-capture-feedback'),
        list: root.querySelector('#inbox-list'),
        empty: root.querySelector('#inbox-empty'),
        count: root.querySelector('#inbox-count'),
        todayList: root.querySelector('#today-list'),
        todayEmpty: root.querySelector('#today-empty'),
        todayCount: root.querySelector('#today-count'),
        todayCapInput: root.querySelector('#today-cap-input'),
        todayCapValue: root.querySelector('#today-cap-value'),
        todayCapFeedback: root.querySelector('#today-cap-feedback'),
        overCapPanel: root.querySelector('#over-cap-panel'),
        overCapSwapList: root.querySelector('#over-cap-swap-list'),
        overCapCancel: root.querySelector('#over-cap-cancel'),
        closeDayBtn: root.querySelector('#close-day-btn'),
        closurePanel: root.querySelector('#closure-panel'),
        closureItemList: root.querySelector('#closure-item-list'),
        closureCompleteMsg: root.querySelector('#closure-complete-msg'),
        closureCancelBtn: root.querySelector('#closure-cancel-btn'),
        closureError: root.querySelector('#closure-error'),
        reviewPlanBtn: root.querySelector('#review-plan-btn'),
        reviewPanel: root.querySelector('#review-panel'),
        reviewItemList: root.querySelector('#review-item-list'),
        reviewCapStatus: root.querySelector('#review-cap-status'),
        reviewClosureState: root.querySelector('#review-closure-state'),
        reviewError: root.querySelector('#review-error'),
        reviewConfirmBtn: root.querySelector('#review-confirm-btn'),
        networkStatus: root.querySelector('#network-status'),
    };
}

function setConnectivityStatus(ui) {
    const online = window.navigator.onLine;
    ui.networkStatus.textContent = online
        ? 'Online. Capture remains immediate.'
        : 'Offline. Capture remains immediate and local.';
}

export function initializePlanningInboxApp(doc) {
    const root = doc.querySelector('#planning-app');
    if (!root) {
        return;
    }

    const ui = readUi(root);
    let captureInProgress = false;
    let pendingAddTaskId = null;

    const refreshInbox = async () => {
        const tasks = await listInboxTasks();
        const safeTasks = (Array.isArray(tasks) ? tasks : []).filter(isValidTaskRecord);
        if (safeTasks.length !== (Array.isArray(tasks) ? tasks.length : 0) && ui.feedback) {
            ui.feedback.textContent = 'Some local tasks were skipped because their saved data is invalid.';
        }
        const onAddToToday = async (taskId) => {
            const result = await addToToday(taskId);
            if (result.ok) {
                await refreshInbox();
            } else if (result.code === 'TODAY_CAP_EXCEEDED') {
                pendingAddTaskId = taskId;
                showOverCapPanel(safeTasks);
            } else {
                if (ui.feedback) ui.feedback.textContent = result.message || 'Unable to add.';
            }
            return result;
        };
        const onBulkAddToToday = async (taskIds) => {
            const result = await bulkAddToToday(taskIds);
            if (result.ok) {
                await refreshInbox();
            } else {
                if (ui.feedback) ui.feedback.textContent = result.message || 'Unable to add tasks.';
            }
            return result;
        };
        renderInboxProjection(safeTasks, ui, { onAddToToday, onBulkAddToToday });
        const todayProjection = computeTodayProjection({
            tasks: safeTasks,
            todayCap: readTodayCap(),
        });
        renderTodayProjection(todayProjection, ui);
        return safeTasks;
    };

    function showOverCapPanel(tasks) {
        if (!ui.overCapPanel || !ui.overCapSwapList || !ui.overCapCancel) return;
        const projection = computeTodayProjection({ tasks, todayCap: readTodayCap() });
        ui.overCapSwapList.innerHTML = '';
        if (ui.todayCapFeedback) {
            ui.todayCapFeedback.textContent = 'Today is at capacity. Choose an item to swap or cancel.';
        }
        if (projection.items.length === 0) {
            const li = document.createElement('li');
            li.className = 'text-sm text-amber-900';
            li.textContent = 'No Today items available to swap.';
            ui.overCapSwapList.appendChild(li);
        }
        for (const item of projection.items) {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = `Swap with "${item.title}"`;
            btn.className =
                'rounded border border-amber-300 bg-white px-2 py-1 text-sm text-amber-900 hover:bg-amber-100';
            btn.addEventListener('click', async () => {
                if (!pendingAddTaskId) return;
                const result = await swapToToday(pendingAddTaskId, item.id);
                pendingAddTaskId = null;
                ui.overCapPanel.classList.add('hidden');
                if (result.ok) {
                    if (ui.todayCapFeedback) ui.todayCapFeedback.textContent = '';
                    await refreshInbox();
                } else if (ui.feedback) {
                    ui.feedback.textContent = result.message || 'Unable to swap.';
                }
            });
            li.appendChild(btn);
            ui.overCapSwapList.appendChild(li);
        }
        ui.overCapPanel.classList.remove('hidden');
        ui.overCapCancel.onclick = () => {
            pendingAddTaskId = null;
            ui.overCapPanel.classList.add('hidden');
            if (ui.todayCapFeedback) ui.todayCapFeedback.textContent = '';
        };
    }

    async function updateClosurePanel(cachedSafeTasks) {
        if (!ui.closurePanel || !ui.closureItemList || !ui.closureCompleteMsg) return;
        let safeTasks;
        if (cachedSafeTasks !== undefined) {
            safeTasks = cachedSafeTasks;
        } else {
            const tasks = await listInboxTasks();
            safeTasks = (Array.isArray(tasks) ? tasks : []).filter(isValidTaskRecord);
        }
        const projection = computeTodayProjection({
            tasks: safeTasks,
            todayCap: readTodayCap(),
        });
        const h3 = ui.closurePanel?.querySelector('h3');
        if (projection.items.length === 0) {
            ui.closureItemList.innerHTML = '';
            if (h3) h3.classList.add('hidden');
            ui.closureItemList.classList.add('hidden');
            ui.closureCompleteMsg.classList.remove('hidden');
        } else {
            if (h3) h3.classList.remove('hidden');
            ui.closureItemList.classList.remove('hidden');
            ui.closureCompleteMsg.classList.add('hidden');
            ui.closureItemList.innerHTML = '';
            for (const item of projection.items) {
                const li = document.createElement('li');
                li.className =
                    'flex items-center justify-between rounded border border-violet-200 bg-white px-3 py-2 text-sm';
                const span = document.createElement('span');
                span.className = 'text-violet-900';
                span.textContent = item.title;
                const btnGroup = document.createElement('span');
                btnGroup.className = 'flex gap-2';
                const deferBtn = document.createElement('button');
                deferBtn.type = 'button';
                deferBtn.className =
                    'defer-btn rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50';
                deferBtn.textContent = 'Defer';
                deferBtn.dataset.taskId = item.id;
                const pauseBtn = document.createElement('button');
                pauseBtn.type = 'button';
                pauseBtn.className =
                    'pause-btn rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-700 hover:bg-amber-50';
                pauseBtn.textContent = 'Pause';
                pauseBtn.dataset.taskId = item.id;
                deferBtn.addEventListener('click', async () => {
                    const taskId = deferBtn.dataset.taskId;
                    if (!taskId) return;
                    if (ui.closureError) ui.closureError.textContent = '';
                    const result = await removeFromToday(taskId);
                    if (result.ok) {
                        const updatedTasks = await refreshInbox();
                        await updateClosurePanel(updatedTasks);
                    } else if (ui.closureError) {
                        ui.closureError.textContent = result.message || 'Unable to defer.';
                    }
                });
                pauseBtn.addEventListener('click', async () => {
                    const taskId = pauseBtn.dataset.taskId;
                    if (!taskId) return;
                    if (ui.closureError) ui.closureError.textContent = '';
                    const result = await pauseTask(taskId);
                    if (result.ok) {
                        const updatedTasks = await refreshInbox();
                        await updateClosurePanel(updatedTasks);
                    } else if (ui.closureError) {
                        ui.closureError.textContent = result.message || 'Unable to pause.';
                    }
                });
                btnGroup.appendChild(deferBtn);
                btnGroup.appendChild(pauseBtn);
                li.appendChild(span);
                li.appendChild(btnGroup);
                ui.closureItemList.appendChild(li);
            }
        }
    }

    async function showReviewPanel() {
        if (!ui.reviewPanel || !ui.reviewItemList || !ui.reviewCapStatus || !ui.reviewClosureState) return;
        if (ui.reviewError) {
            ui.reviewError.textContent = '';
            ui.reviewError.classList.add('hidden');
        }
        const tasks = await listInboxTasks();
        const safeTasks = (Array.isArray(tasks) ? tasks : []).filter(isValidTaskRecord);
        const projection = computeTodayProjection({
            tasks: safeTasks,
            todayCap: readTodayCap(),
        });
        const cap = readTodayCap();
        ui.reviewItemList.innerHTML = '';
        if (projection.items.length === 0) {
            ui.reviewItemList.classList.add('hidden');
            if (ui.reviewCapStatus) ui.reviewCapStatus.textContent = `0 of ${cap} selected`;
            if (ui.reviewClosureState) ui.reviewClosureState.textContent = 'Day closed';
        } else {
            ui.reviewItemList.classList.remove('hidden');
            for (const item of projection.items) {
                const li = document.createElement('li');
                li.className = 'rounded border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900';
                li.textContent = item.title;
                ui.reviewItemList.appendChild(li);
            }
            if (ui.reviewCapStatus) ui.reviewCapStatus.textContent = `${projection.items.length} of ${cap} selected`;
            if (ui.reviewClosureState) ui.reviewClosureState.textContent = 'Planning active';
        }
        ui.reviewPanel.classList.remove('hidden');
        if (ui.reviewConfirmBtn) ui.reviewConfirmBtn.focus();
    }

    function showClosurePanel() {
        if (!ui.closurePanel || !ui.closureCancelBtn) return;
        ui.closurePanel.classList.remove('hidden');
        ui.closureCancelBtn.onclick = () => {
            ui.closurePanel.classList.add('hidden');
        };
        updateClosurePanel().catch(() => {
            if (ui.closureError) ui.closureError.textContent = 'Unable to load closure items. Please retry.';
        });
    }

    if (ui.closeDayBtn) {
        ui.closeDayBtn.addEventListener('click', () => {
            showClosurePanel();
        });
    }

    if (ui.reviewPlanBtn) {
        ui.reviewPlanBtn.addEventListener('click', () => {
            showReviewPanel().catch(() => {
                if (ui.reviewError) {
                    ui.reviewError.textContent = 'Unable to load plan for review. Please retry.';
                    ui.reviewError.classList.remove('hidden');
                }
            });
        });
    }

    if (ui.reviewConfirmBtn) {
        ui.reviewConfirmBtn.addEventListener('click', () => {
            if (ui.reviewPanel) ui.reviewPanel.classList.add('hidden');
            if (ui.reviewError) {
                ui.reviewError.textContent = '';
                ui.reviewError.classList.add('hidden');
            }
        });
    }

    setConnectivityStatus(ui);
    window.addEventListener('online', () => setConnectivityStatus(ui));
    window.addEventListener('offline', () => setConnectivityStatus(ui));

    if (ui.todayCapInput) {
        ui.todayCapInput.value = String(readTodayCap());
        ui.todayCapInput.addEventListener('change', () => {
            if (ui.todayCapFeedback) ui.todayCapFeedback.textContent = '';
            const result = saveTodayCap(ui.todayCapInput.value);
            if (result.ok) {
                if (ui.feedback) ui.feedback.textContent = '';
                refreshInbox().catch(() => {
                    if (ui.todayCapFeedback) {
                        ui.todayCapFeedback.textContent = 'Unable to refresh Today right now.';
                    }
                });
            } else {
                if (ui.todayCapFeedback) {
                    ui.todayCapFeedback.textContent = 'Cap must be a positive number.';
                }
                ui.todayCapInput.value = String(readTodayCap());
            }
        });
    }

    refreshInbox().catch(() => {
        clearPlanningProjectionUi(ui);
        ui.feedback.textContent = 'Unable to load local Inbox right now.';
    });

    if (!ui.form) {
        return;
    }

    ui.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (captureInProgress) {
            return;
        }

        captureInProgress = true;
        ui.submit.disabled = true;
        ui.feedback.textContent = '';
        try {
            const result = await createInboxTask(ui.input.value);

            if (!result.ok) {
                ui.feedback.textContent = result.message;
                return;
            }

            ui.input.value = '';
            ui.feedback.textContent = 'Task added to Inbox.';

            await refreshInbox();
            ui.input.focus();
        } catch (_error) {
            ui.feedback.textContent = 'Capture is temporarily unavailable. Please retry.';
        } finally {
            ui.submit.disabled = false;
            captureInProgress = false;
        }
    });
}
