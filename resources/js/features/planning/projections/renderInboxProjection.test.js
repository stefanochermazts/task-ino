import { describe, expect, it, vi } from 'vitest';
import { renderInboxProjection } from './renderInboxProjection';

function buildUi() {
    document.body.innerHTML = `
        <ul id="inbox-list"></ul>
        <p id="inbox-empty" class="hidden"></p>
        <span id="inbox-count"></span>
    `;
    return {
        list: document.querySelector('#inbox-list'),
        empty: document.querySelector('#inbox-empty'),
        count: document.querySelector('#inbox-count'),
    };
}

describe('renderInboxProjection', () => {
    it('renders Add to Today button when onAddToToday provided and task not in Today', () => {
        const ui = buildUi();
        const onAddToToday = () => {};
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
        ];

        renderInboxProjection(tasks, ui, { onAddToToday });

        const btn = ui.list.querySelector('button[data-task-id="t1"]');
        expect(btn).not.toBeNull();
        expect(btn.textContent).toBe('Add to Today');
    });

    it('does not render Add button for task already in Today', () => {
        const ui = buildUi();
        const onAddToToday = () => {};
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: true },
        ];

        renderInboxProjection(tasks, ui, { onAddToToday });

        const btn = ui.list.querySelector('button[data-task-id="t1"]');
        expect(btn).toBeNull();
    });

    it('does not render Add button when onAddToToday not provided', () => {
        const ui = buildUi();
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
        ];

        renderInboxProjection(tasks, ui);

        const btn = ui.list.querySelector('button');
        expect(btn).toBeNull();
    });

    it('renders bulk Add all button when onBulkAddToToday provided and multiple non-Today tasks', () => {
        const ui = buildUi();
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
            { id: 't2', title: 'Task 2', todayIncluded: false },
        ];

        renderInboxProjection(tasks, ui, { onBulkAddToToday: () => {} });

        const bulkBtn = ui.list.querySelector('button[data-action="bulk-add-to-today"]');
        expect(bulkBtn).not.toBeNull();
        expect(bulkBtn.textContent).toBe('Add all 2 to Today');
    });

    it('does not render bulk Add all button when only one non-Today task', () => {
        const ui = buildUi();
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
        ];

        renderInboxProjection(tasks, ui, { onBulkAddToToday: () => {} });

        const bulkBtn = ui.list.querySelector('button[data-action="bulk-add-to-today"]');
        expect(bulkBtn).toBeNull();
    });

    it('calls onBulkAddToToday with IDs of all non-Today tasks when bulk button clicked', () => {
        const ui = buildUi();
        const onBulkAddToToday = vi.fn();
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
            { id: 't2', title: 'Task 2', todayIncluded: false },
            { id: 't3', title: 'Task 3', todayIncluded: true },
        ];

        renderInboxProjection(tasks, ui, { onBulkAddToToday });

        const bulkBtn = ui.list.querySelector('button[data-action="bulk-add-to-today"]');
        bulkBtn.dispatchEvent(new Event('click'));

        expect(onBulkAddToToday).toHaveBeenCalledWith(['t1', 't2']);
    });

    it('does not render bulk Add all button when onBulkAddToToday not provided', () => {
        const ui = buildUi();
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
            { id: 't2', title: 'Task 2', todayIncluded: false },
        ];

        renderInboxProjection(tasks, ui, { onAddToToday: () => {} });

        const bulkBtn = ui.list.querySelector('button[data-action="bulk-add-to-today"]');
        expect(bulkBtn).toBeNull();
    });

    it('renders per-task area selector when onSetTaskArea provided and multiple areas exist', () => {
        const ui = buildUi();
        const onSetTaskArea = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox' }];

        renderInboxProjection(tasks, ui, { onSetTaskArea, areas: ['inbox', 'work'] });

        const select = ui.list.querySelector('select[aria-label="Area for Task 1"]');
        expect(select).not.toBeNull();
        expect(select.querySelectorAll('option').length).toBe(2);
        expect(select.value).toBe('inbox');
    });

    it('calls onSetTaskArea with task id and new area when selection changes', () => {
        const ui = buildUi();
        const onSetTaskArea = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox' }];

        renderInboxProjection(tasks, ui, { onSetTaskArea, areas: ['inbox', 'work'] });

        const select = ui.list.querySelector('select[aria-label="Area for Task 1"]');
        select.value = 'work';
        select.dispatchEvent(new Event('change', { bubbles: true }));

        expect(onSetTaskArea).toHaveBeenCalledWith('t1', 'work');
    });

    it('does not call onSetTaskArea when selection stays on current area', () => {
        const ui = buildUi();
        const onSetTaskArea = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false, area: 'work' }];

        renderInboxProjection(tasks, ui, { onSetTaskArea, areas: ['inbox', 'work'] });

        const select = ui.list.querySelector('select[aria-label="Area for Task 1"]');
        select.value = 'work';
        select.dispatchEvent(new Event('change', { bubbles: true }));

        expect(onSetTaskArea).not.toHaveBeenCalled();
    });

    it('renders reschedule date input when onRescheduleTask provided', () => {
        const ui = buildUi();
        const onRescheduleTask = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false }];

        renderInboxProjection(tasks, ui, { onRescheduleTask });

        const input = ui.list.querySelector('input[type="date"][aria-label="Reschedule Task 1"]');
        expect(input).not.toBeNull();
        expect(input.value).toBe('');
    });

    it('renders scheduledFor in date input when task has scheduledFor', () => {
        const ui = buildUi();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false, scheduledFor: '2026-03-15' }];

        renderInboxProjection(tasks, ui, { onRescheduleTask: () => {} });

        const input = ui.list.querySelector('input[type="date"]');
        expect(input.value).toBe('2026-03-15');
    });

    it('calls onRescheduleTask with task id and date when date input changes', () => {
        const ui = buildUi();
        const onRescheduleTask = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false }];

        renderInboxProjection(tasks, ui, { onRescheduleTask });

        const input = ui.list.querySelector('input[type="date"]');
        input.value = '2026-03-20';
        input.dispatchEvent(new Event('change', { bubbles: true }));

        expect(onRescheduleTask).toHaveBeenCalledWith('t1', '2026-03-20');
    });

    it('calls onRescheduleTask with null when date cleared', () => {
        const ui = buildUi();
        const onRescheduleTask = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false, scheduledFor: '2026-03-15' }];

        renderInboxProjection(tasks, ui, { onRescheduleTask });

        const input = ui.list.querySelector('input[type="date"]');
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));

        expect(onRescheduleTask).toHaveBeenCalledWith('t1', null);
    });

    it('does not render reschedule input when onRescheduleTask not provided', () => {
        const ui = buildUi();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false }];

        renderInboxProjection(tasks, ui);

        const input = ui.list.querySelector('input[type="date"]');
        expect(input).toBeNull();
    });

    it('renders bulk selection checkboxes when onToggleBulkSelection provided', () => {
        const ui = buildUi();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false }];

        renderInboxProjection(tasks, ui, {
            onToggleBulkSelection: () => {},
            selectedTaskIds: [],
        });

        const cb = ui.list.querySelector('input[data-action="bulk-select-task"][data-task-id="t1"]');
        expect(cb).not.toBeNull();
        expect(cb.checked).toBe(false);
    });

    it('calls onToggleBulkSelection with checked state', () => {
        const ui = buildUi();
        const onToggleBulkSelection = vi.fn();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false }];

        renderInboxProjection(tasks, ui, {
            onToggleBulkSelection,
            selectedTaskIds: [],
        });

        const cb = ui.list.querySelector('input[data-action="bulk-select-task"][data-task-id="t1"]');
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));

        expect(onToggleBulkSelection).toHaveBeenCalledWith('t1', true);
    });

    it('renders bulk reschedule controls and calls callback with selected task ids and date', () => {
        const ui = buildUi();
        const onBulkRescheduleTasks = vi.fn();
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false },
            { id: 't2', title: 'Task 2', todayIncluded: false },
        ];

        renderInboxProjection(tasks, ui, {
            onBulkRescheduleTasks,
            selectedTaskIds: ['t1', 't2'],
        });

        const dateInput = ui.list.querySelector('input[aria-label="Bulk reschedule date"]');
        const bulkBtn = ui.list.querySelector('button[data-action="bulk-reschedule"]');
        expect(dateInput).not.toBeNull();
        expect(bulkBtn).not.toBeNull();
        expect(bulkBtn.disabled).toBe(false);

        dateInput.value = '2026-06-01';
        bulkBtn.click();

        expect(onBulkRescheduleTasks).toHaveBeenCalledWith(['t1', 't2'], '2026-06-01');
    });

    it('disables bulk reschedule button when nothing selected', () => {
        const ui = buildUi();
        const tasks = [{ id: 't1', title: 'Task 1', todayIncluded: false }];

        renderInboxProjection(tasks, ui, {
            onBulkRescheduleTasks: () => {},
            selectedTaskIds: [],
        });

        const bulkBtn = ui.list.querySelector('button[data-action="bulk-reschedule"]');
        expect(bulkBtn.disabled).toBe(true);
    });
});
