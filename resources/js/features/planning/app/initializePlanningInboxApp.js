import { createInboxTask } from '../commands/createInboxTask';
import { listInboxTasks } from '../persistence/inboxTaskStore';
import { renderInboxProjection } from '../projections/renderInboxProjection';

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

    const refreshInbox = async () => {
        const tasks = await listInboxTasks();
        renderInboxProjection(tasks, ui);
    };

    setConnectivityStatus(ui);
    window.addEventListener('online', () => setConnectivityStatus(ui));
    window.addEventListener('offline', () => setConnectivityStatus(ui));

    refreshInbox().catch(() => {
        ui.feedback.textContent = 'Unable to load local Inbox right now.';
    });

    ui.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (captureInProgress) {
            return;
        }

        captureInProgress = true;
        ui.submit.disabled = true;
        ui.feedback.textContent = '';

        const result = await createInboxTask(ui.input.value);

        if (!result.ok) {
            ui.feedback.textContent = result.message;
            ui.submit.disabled = false;
            captureInProgress = false;
            return;
        }

        ui.input.value = '';
        ui.feedback.textContent = 'Task added to Inbox.';

        await refreshInbox();

        ui.submit.disabled = false;
        captureInProgress = false;
        ui.input.focus();
    });
}
