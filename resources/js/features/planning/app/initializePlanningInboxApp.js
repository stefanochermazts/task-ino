import { addToToday, swapToToday } from '../commands/addToToday';
import { createInboxTask } from '../commands/createInboxTask';
import { listInboxTasks } from '../persistence/inboxTaskStore';
import { readTodayCap, saveTodayCap } from '../persistence/todayCapStore';
import { computeTodayProjection } from '../projections/computeTodayProjection';
import { renderInboxProjection } from '../projections/renderInboxProjection';
import { renderTodayProjection } from '../projections/renderTodayProjection';

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
        const onAddToToday = async (taskId) => {
            const result = await addToToday(taskId);
            if (result.ok) {
                await refreshInbox();
            } else if (result.code === 'TODAY_CAP_EXCEEDED') {
                pendingAddTaskId = taskId;
                showOverCapPanel(tasks);
            } else {
                if (ui.feedback) ui.feedback.textContent = result.message || 'Unable to add.';
            }
            return result;
        };
        renderInboxProjection(tasks, ui, { onAddToToday });
        const todayProjection = computeTodayProjection({
            tasks,
            todayCap: readTodayCap(),
        });
        renderTodayProjection(todayProjection, ui);
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

    setConnectivityStatus(ui);
    window.addEventListener('online', () => setConnectivityStatus(ui));
    window.addEventListener('offline', () => setConnectivityStatus(ui));

    if (ui.todayCapInput) {
        ui.todayCapInput.value = String(readTodayCap());
        ui.todayCapInput.addEventListener('change', () => {
            if (ui.todayCapFeedback) ui.todayCapFeedback.textContent = '';
            const result = saveTodayCap(ui.todayCapInput.value);
            if (result.ok) {
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
