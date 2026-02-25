import { describe, expect, it } from 'vitest';
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
});
