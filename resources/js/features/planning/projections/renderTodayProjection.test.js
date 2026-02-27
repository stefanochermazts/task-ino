import { describe, expect, it } from 'vitest';
import { renderTodayProjection } from './renderTodayProjection';

function buildUi() {
    document.body.innerHTML = `
        <ul id="today-list"></ul>
        <p id="today-empty"></p>
        <span id="today-count"></span>
        <span id="today-cap-value"></span>
    `;
    return {
        todayList: document.querySelector('#today-list'),
        todayEmpty: document.querySelector('#today-empty'),
        todayCount: document.querySelector('#today-count'),
        todayCapValue: document.querySelector('#today-cap-value'),
    };
}

describe('renderTodayProjection', () => {
    it('renders empty state when no items', () => {
        const ui = buildUi();
        renderTodayProjection({ items: [], totalEligible: 0, cap: 3 }, ui);

        expect(ui.todayList.children.length).toBe(0);
        expect(ui.todayEmpty.classList.contains('hidden')).toBe(false);
        expect(ui.todayCount.textContent).toBe('0/3 selected');
        expect(ui.todayCapValue.textContent).toBe('Cap 3 · 0 eligible');
    });

    it('renders items and hides empty state when projection has items', () => {
        const ui = buildUi();
        const projection = {
            items: [
                { id: 't1', title: 'First task', area: 'inbox' },
                { id: 't2', title: 'Second task', area: 'work' },
            ],
            totalEligible: 2,
            cap: 3,
        };

        renderTodayProjection(projection, ui);

        expect(ui.todayList.children.length).toBe(2);
        const item1 = ui.todayList.querySelector('[data-task-id="t1"]');
        expect(item1.textContent).toContain('First task');
        expect(item1.textContent).toContain('Inbox');
        const item2 = ui.todayList.querySelector('[data-task-id="t2"]');
        expect(item2.textContent).toContain('Second task');
        expect(item2.textContent).toContain('Work');
        expect(ui.todayEmpty.classList.contains('hidden')).toBe(true);
        expect(ui.todayCount.textContent).toBe('2/3 selected');
        expect(ui.todayCapValue.textContent).toBe('Cap 3 · 2 eligible');
    });

    it('renders area label as Inbox when area is inbox or missing', () => {
        const ui = buildUi();
        const projection = {
            items: [{ id: 't1', title: 'Task', area: 'inbox' }],
            totalEligible: 1,
            cap: 3,
        };

        renderTodayProjection(projection, ui);

        expect(ui.todayList.querySelector('[data-task-id="t1"]').textContent).toContain('Inbox');
    });

    it('falls back to Inbox label when item has no area (backward compat)', () => {
        const ui = buildUi();
        const projection = {
            items: [{ id: 't1', title: 'Legacy task' }],
            totalEligible: 1,
            cap: 3,
        };

        renderTodayProjection(projection, ui);

        const item = ui.todayList.querySelector('[data-task-id="t1"]');
        expect(item.textContent).toContain('Legacy task');
        expect(item.textContent).toContain('Inbox');
    });

    it('handles non-string area values safely', () => {
        const ui = buildUi();
        const projection = {
            items: [{ id: 't1', title: 'Task', area: 1 }],
            totalEligible: 1,
            cap: 3,
        };

        expect(() => renderTodayProjection(projection, ui)).not.toThrow();
        const item = ui.todayList.querySelector('[data-task-id="t1"]');
        expect(item.textContent).toContain('Task');
    });

    it('does not throw when ui elements are missing', () => {
        const ui = { todayList: null, todayEmpty: null, todayCount: null, todayCapValue: null };
        expect(() => renderTodayProjection({ items: [], totalEligible: 0, cap: 3 }, ui)).not.toThrow();
    });
});
