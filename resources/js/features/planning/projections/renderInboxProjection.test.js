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
});
