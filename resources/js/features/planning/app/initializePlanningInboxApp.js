import { addToToday, swapToToday } from '../commands/addToToday';
import { bulkAddToToday } from '../commands/bulkAddToToday';
import { bulkRescheduleTasks } from '../commands/bulkRescheduleTasks';
import { createInboxTask } from '../commands/createInboxTask';
import { removeFromToday } from '../commands/removeFromToday';
import { pauseTask } from '../commands/pauseTask';
import { setTaskArea } from '../commands/setTaskArea';
import { rescheduleTask } from '../commands/rescheduleTask';
import { listInboxTasks } from '../persistence/inboxTaskStore';
import { listAreas, addArea } from '../persistence/areaStore';
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
    if (ui.addAreaPanel) ui.addAreaPanel.classList.add('hidden');
    if (ui.addAreaError) {
        ui.addAreaError.textContent = '';
        ui.addAreaError.classList.add('hidden');
    }
    if (ui.areaFeedback) {
        ui.areaFeedback.textContent = '';
        ui.areaFeedback.classList.add('hidden');
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
        areaSelector: root.querySelector('#area-selector'),
        addAreaBtn: root.querySelector('#add-area-btn'),
        addAreaPanel: root.querySelector('#add-area-panel'),
        addAreaInput: root.querySelector('#add-area-input'),
        addAreaError: root.querySelector('#add-area-error'),
        addAreaConfirm: root.querySelector('#add-area-confirm'),
        addAreaCancel: root.querySelector('#add-area-cancel'),
        areaFeedback: root.querySelector('#area-feedback'),
        inboxTitle: root.querySelector('#inbox-title'),
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
    let selectedArea = 'inbox';
    let selectedBulkTaskIds = new Set();

    function syncAreaSelector() {
        if (!ui.areaSelector) return;
        const areas = listAreas();
        const current = ui.areaSelector.value;
        ui.areaSelector.innerHTML = '';
        for (const a of areas) {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a === 'inbox' ? 'Inbox' : a.charAt(0).toUpperCase() + a.slice(1);
            ui.areaSelector.appendChild(opt);
        }
        if (areas.includes(current)) {
            ui.areaSelector.value = current;
        } else {
            ui.areaSelector.value = 'inbox';
            selectedArea = 'inbox';
        }
    }

    const refreshInbox = async () => {
        const tasks = await listInboxTasks();
        const safeTasks = (Array.isArray(tasks) ? tasks : []).filter(isValidTaskRecord);
        const validTaskIds = new Set(safeTasks.map((t) => t.id));
        selectedBulkTaskIds = new Set([...selectedBulkTaskIds].filter((id) => validTaskIds.has(id)));
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
        const onSetTaskArea = async (taskId, areaId) => {
            if (ui.areaFeedback) {
                ui.areaFeedback.textContent = '';
                ui.areaFeedback.classList.add('hidden');
            }
            const result = await setTaskArea(taskId, areaId);
            if (result.ok) {
                await refreshInbox();
            } else if (ui.areaFeedback) {
                ui.areaFeedback.textContent = result.message || 'Unable to change area.';
                ui.areaFeedback.classList.remove('hidden');
            }
            return result;
        };
        const onRescheduleTask = async (taskId, scheduledFor) => {
            if (ui.areaFeedback) {
                ui.areaFeedback.textContent = '';
                ui.areaFeedback.classList.add('hidden');
            }
            const result = await rescheduleTask(taskId, scheduledFor);
            if (result.ok) {
                await refreshInbox();
            } else if (ui.areaFeedback) {
                ui.areaFeedback.textContent = result.message || 'Invalid date. Use a valid date (YYYY-MM-DD).';
                ui.areaFeedback.classList.remove('hidden');
            }
            return result;
        };
        const onToggleBulkSelection = (taskId, checked) => {
            if (checked) {
                selectedBulkTaskIds.add(taskId);
            } else {
                selectedBulkTaskIds.delete(taskId);
            }
            renderInboxProjection(areaTasks, ui, {
                onAddToToday,
                onBulkAddToToday,
                onSetTaskArea,
                onRescheduleTask,
                onToggleBulkSelection,
                onBulkRescheduleTasks,
                selectedTaskIds: Array.from(selectedBulkTaskIds),
                selectedArea,
                areas: listAreas(),
            });
        };
        const onBulkRescheduleTasks = async (taskIds, scheduledFor) => {
            if (ui.areaFeedback) {
                ui.areaFeedback.textContent = '';
                ui.areaFeedback.classList.add('hidden');
            }
            const result = await bulkRescheduleTasks(taskIds, scheduledFor);
            selectedBulkTaskIds = new Set();
            if (result.ok) {
                const count = Number(result.count ?? taskIds.length);
                const ids = Array.isArray(result.taskIds) ? result.taskIds : taskIds;
                if (ui.areaFeedback) {
                    ui.areaFeedback.textContent = `Bulk reschedule succeeded for ${count} task(s): ${ids.join(', ')}`;
                    ui.areaFeedback.classList.remove('hidden');
                }
                await refreshInbox();
            } else if (ui.areaFeedback) {
                const ids = Array.isArray(taskIds) ? taskIds : [];
                ui.areaFeedback.textContent = `${result.message || 'Bulk reschedule failed.'} Requested tasks: ${ids.join(', ')}`;
                ui.areaFeedback.classList.remove('hidden');
                renderInboxProjection(areaTasks, ui, {
                    onAddToToday,
                    onBulkAddToToday,
                    onSetTaskArea,
                    onRescheduleTask,
                    onToggleBulkSelection,
                    onBulkRescheduleTasks,
                    selectedTaskIds: [],
                    selectedArea,
                    areas: listAreas(),
                });
            }
            return result;
        };
        const areaTasks = safeTasks.filter((t) => (t.area ?? 'inbox').toLowerCase() === selectedArea);
        renderInboxProjection(areaTasks, ui, {
            onAddToToday,
            onBulkAddToToday,
            onSetTaskArea,
            onRescheduleTask,
            onToggleBulkSelection,
            onBulkRescheduleTasks,
            selectedTaskIds: Array.from(selectedBulkTaskIds),
            selectedArea,
            areas: listAreas(),
        });
        const onRemoveFromToday = async (taskId) => {
            const result = await removeFromToday(taskId);
            if (result.ok) {
                await refreshInbox();
            } else if (ui.feedback) {
                ui.feedback.textContent = result.message || 'Unable to remove from Today.';
            }
            return result;
        };
        const todayProjection = computeTodayProjection({
            tasks: safeTasks,
            todayCap: readTodayCap(),
        });
        renderTodayProjection(todayProjection, ui, { onRemoveFromToday });
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
        if (ui.closureError) {
            ui.closureError.textContent = '';
            ui.closureError.classList.add('hidden');
        }
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
                    if (ui.closureError) {
                        ui.closureError.textContent = '';
                        ui.closureError.classList.add('hidden');
                    }
                    const result = await removeFromToday(taskId);
                    if (result.ok) {
                        const updatedTasks = await refreshInbox();
                        await updateClosurePanel(updatedTasks);
                    } else if (ui.closureError) {
                        ui.closureError.textContent = result.message || 'Unable to defer.';
                        ui.closureError.classList.remove('hidden');
                    }
                });
                pauseBtn.addEventListener('click', async () => {
                    const taskId = pauseBtn.dataset.taskId;
                    if (!taskId) return;
                    if (ui.closureError) {
                        ui.closureError.textContent = '';
                        ui.closureError.classList.add('hidden');
                    }
                    const result = await pauseTask(taskId);
                    if (result.ok) {
                        const updatedTasks = await refreshInbox();
                        await updateClosurePanel(updatedTasks);
                    } else if (ui.closureError) {
                        ui.closureError.textContent = result.message || 'Unable to pause.';
                        ui.closureError.classList.remove('hidden');
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
        if (ui.closureError) {
            ui.closureError.textContent = '';
            ui.closureError.classList.add('hidden');
        }
        ui.closureCancelBtn.onclick = () => {
            ui.closurePanel.classList.add('hidden');
            if (ui.closureError) {
                ui.closureError.textContent = '';
                ui.closureError.classList.add('hidden');
            }
        };
        updateClosurePanel()
            .then(() => {
                const firstDecisionBtn = ui.closureItemList?.querySelector('.defer-btn, .pause-btn');
                if (firstDecisionBtn) {
                    firstDecisionBtn.focus();
                } else {
                    ui.closureCancelBtn.focus();
                }
            })
            .catch(() => {
                if (ui.closureError) {
                    ui.closureError.textContent = 'Unable to load closure items. Please retry.';
                    ui.closureError.classList.remove('hidden');
                }
                ui.closureCancelBtn.focus();
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

    syncAreaSelector();

    if (ui.areaSelector) {
        ui.areaSelector.addEventListener('change', () => {
            selectedArea = ui.areaSelector.value || 'inbox';
            if (ui.inboxTitle) {
                ui.inboxTitle.textContent =
                    selectedArea === 'inbox' ? 'Inbox' : selectedArea.charAt(0).toUpperCase() + selectedArea.slice(1);
            }
            refreshInbox().catch(() => {
                if (ui.areaFeedback) {
                    ui.areaFeedback.textContent = 'Unable to load tasks.';
                    ui.areaFeedback.classList.remove('hidden');
                }
            });
        });
    }

    if (ui.addAreaBtn && ui.addAreaPanel) {
        ui.addAreaBtn.addEventListener('click', () => {
            ui.addAreaPanel.classList.remove('hidden');
            if (ui.addAreaError) {
                ui.addAreaError.textContent = '';
                ui.addAreaError.classList.add('hidden');
            }
            if (ui.addAreaInput) {
                ui.addAreaInput.value = '';
                ui.addAreaInput.focus();
            }
        });
    }

    if (ui.addAreaCancel) {
        ui.addAreaCancel.addEventListener('click', () => {
            if (ui.addAreaPanel) ui.addAreaPanel.classList.add('hidden');
            if (ui.addAreaError) {
                ui.addAreaError.textContent = '';
                ui.addAreaError.classList.add('hidden');
            }
        });
    }

    if (ui.addAreaConfirm && ui.addAreaInput) {
        ui.addAreaConfirm.addEventListener('click', () => {
            if (!ui.addAreaError) return;
            ui.addAreaError.textContent = '';
            ui.addAreaError.classList.add('hidden');
            const name = String(ui.addAreaInput.value ?? '').trim().toLowerCase();
            if (name.length === 0) {
                ui.addAreaError.textContent = 'Enter an area name.';
                ui.addAreaError.classList.remove('hidden');
                return;
            }
            const result = addArea(name);
            if (result.ok) {
                if (ui.addAreaPanel) ui.addAreaPanel.classList.add('hidden');
                syncAreaSelector();
                selectedArea = name;
                if (ui.areaSelector) ui.areaSelector.value = name;
                if (ui.inboxTitle) ui.inboxTitle.textContent = name.charAt(0).toUpperCase() + name.slice(1);
                refreshInbox().catch(() => {});
            } else {
                ui.addAreaError.textContent =
                    result.code === 'INBOX_IMMUTABLE'
                        ? 'Inbox is a reserved area.'
                        : result.code === 'SAVE_FAILED'
                          ? 'Unable to save area.'
                          : 'Invalid area name.';
                ui.addAreaError.classList.remove('hidden');
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
