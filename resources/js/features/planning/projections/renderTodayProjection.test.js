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
                { id: 't1', title: 'First task' },
                { id: 't2', title: 'Second task' },
            ],
            totalEligible: 2,
            cap: 3,
        };

        renderTodayProjection(projection, ui);

        expect(ui.todayList.children.length).toBe(2);
        expect(ui.todayList.querySelector('[data-task-id="t1"]').textContent).toBe('First task');
        expect(ui.todayList.querySelector('[data-task-id="t2"]').textContent).toBe('Second task');
        expect(ui.todayEmpty.classList.contains('hidden')).toBe(true);
        expect(ui.todayCount.textContent).toBe('2/3 selected');
        expect(ui.todayCapValue.textContent).toBe('Cap 3 · 2 eligible');
    });

    it('does not throw when ui elements are missing', () => {
        const ui = { todayList: null, todayEmpty: null, todayCount: null, todayCapValue: null };
        expect(() => renderTodayProjection({ items: [], totalEligible: 0, cap: 3 }, ui)).not.toThrow();
    });
});
