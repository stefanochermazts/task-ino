import { beforeEach, describe, expect, it, vi } from 'vitest';

const createInboxTaskMock = vi.fn();
const enforceDailyContinuityMock = vi.fn();
const listInboxTasksMock = vi.fn();
const renderInboxProjectionMock = vi.fn();
const computeTodayProjectionMock = vi.fn();
const renderTodayProjectionMock = vi.fn();
const addToTodayMock = vi.fn();
const swapToTodayMock = vi.fn();
const bulkAddToTodayMock = vi.fn();
const bulkRescheduleTasksMock = vi.fn();
const removeFromTodayMock = vi.fn();
const pauseTaskMock = vi.fn();
const retainTaskForNextDayMock = vi.fn();
const setTaskAreaMock = vi.fn();
const rescheduleTaskMock = vi.fn();

vi.mock('../commands/setTaskArea', () => ({
    setTaskArea: (...args) => setTaskAreaMock(...args),
}));

vi.mock('../commands/rescheduleTask', () => ({
    rescheduleTask: (...args) => rescheduleTaskMock(...args),
}));

vi.mock('../commands/createInboxTask', () => ({
    createInboxTask: (...args) => createInboxTaskMock(...args),
}));

vi.mock('../commands/addToToday', () => ({
    addToToday: (...args) => addToTodayMock(...args),
    swapToToday: (...args) => swapToTodayMock(...args),
}));

vi.mock('../commands/bulkAddToToday', () => ({
    bulkAddToToday: (...args) => bulkAddToTodayMock(...args),
}));

vi.mock('../commands/bulkRescheduleTasks', () => ({
    bulkRescheduleTasks: (...args) => bulkRescheduleTasksMock(...args),
}));

vi.mock('../commands/enforceDailyContinuity', () => ({
    enforceDailyContinuity: (...args) => enforceDailyContinuityMock(...args),
}));

vi.mock('../commands/removeFromToday', () => ({
    removeFromToday: (...args) => removeFromTodayMock(...args),
}));

vi.mock('../commands/pauseTask', () => ({
    pauseTask: (...args) => pauseTaskMock(...args),
}));

vi.mock('../commands/retainTaskForNextDay', () => ({
    retainTaskForNextDay: (...args) => retainTaskForNextDayMock(...args),
}));

vi.mock('../persistence/inboxTaskStore', () => ({
    listInboxTasks: (...args) => listInboxTasksMock(...args),
}));

vi.mock('../persistence/areaStore', () => ({
    listAreas: () => ['inbox', 'work'],
    addArea: (id) => {
        if (!id || String(id).trim() === '') return { ok: false, code: 'INVALID_AREA_ID' };
        if (String(id).toLowerCase() === 'inbox') return { ok: false, code: 'INBOX_IMMUTABLE' };
        return { ok: true };
    },
    isValidArea: (id) => ['inbox', 'work'].includes(String(id ?? '').trim().toLowerCase()),
}));

vi.mock('../projections/renderInboxProjection', () => ({
    renderInboxProjection: (...args) => renderInboxProjectionMock(...args),
}));

vi.mock('../projections/computeTodayProjection', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        computeTodayProjection: (...args) => computeTodayProjectionMock(...args),
        // isValidTaskRecord is intentionally left as real implementation
    };
});

vi.mock('../projections/renderTodayProjection', () => ({
    renderTodayProjection: (...args) => renderTodayProjectionMock(...args),
}));

function setOnlineStatus(value) {
    Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => value,
    });
}

function buildAppHtml() {
    document.body.innerHTML = `
        <section id="planning-app">
            <p id="network-status"></p>
            <form id="quick-capture-form">
                <input id="quick-capture-input" />
                <button id="quick-capture-submit" type="submit">Add</button>
            </form>
            <p id="quick-capture-feedback"></p>
            <h2 id="inbox-title">Inbox</h2>
            <select id="area-selector" aria-label="Filter by area"></select>
            <button id="add-area-btn" type="button">+ Add area</button>
            <p id="area-feedback" class="hidden"></p>
            <div id="add-area-panel" class="hidden" role="region" aria-label="Add new area">
                <input id="add-area-input" type="text" placeholder="e.g. personal" />
                <p id="add-area-error" class="hidden"></p>
                <button id="add-area-confirm" type="button">Add</button>
                <button id="add-area-cancel" type="button">Cancel</button>
            </div>
            <ul id="inbox-list"></ul>
            <p id="inbox-empty"></p>
            <span id="inbox-count"></span>
            <input id="today-cap-input" type="number" value="3" />
            <span id="today-cap-value"></span>
            <span id="today-cap-feedback"></span>
            <ul id="today-list"></ul>
            <p id="today-empty"></p>
            <span id="today-count"></span>
            <div id="over-cap-panel" class="hidden">
                <ul id="over-cap-swap-list"></ul>
                <button id="over-cap-cancel" type="button">Cancel</button>
            </div>
            <button id="close-day-btn" type="button">Close Day</button>
            <div id="closure-panel" class="hidden" role="region" aria-label="Day closure">
                <h3>Decide where each item goes</h3>
                <ul id="closure-item-list"></ul>
                <p id="closure-complete-msg" class="hidden">Day closed. Well done.</p>
                <p id="closure-error" class="hidden"></p>
                <button id="closure-cancel-btn" type="button">Cancel</button>
            </div>
            <button id="review-plan-btn" type="button">Review Plan</button>
            <div id="review-panel" class="hidden" role="region" aria-label="Plan review">
                <h3>Your plan for today</h3>
                <ul id="review-item-list"></ul>
                <p id="review-cap-status"></p>
                <p id="review-closure-state"></p>
                <p id="review-error" class="hidden"></p>
                <button id="review-confirm-btn" type="button">Ready to execute</button>
            </div>
        </section>
    `;
    localStorage.removeItem('planning.todayCap');
    localStorage.removeItem('planning.areas');
}

async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('initializePlanningInboxApp', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        buildAppHtml();
        setOnlineStatus(true);
        addToTodayMock.mockResolvedValue({ ok: true });
        swapToTodayMock.mockResolvedValue({ ok: true });
        bulkAddToTodayMock.mockResolvedValue({ ok: true });
        removeFromTodayMock.mockResolvedValue({ ok: true });
        pauseTaskMock.mockResolvedValue({ ok: true });
        retainTaskForNextDayMock.mockResolvedValue({ ok: true });
        setTaskAreaMock.mockResolvedValue({ ok: true });
        listInboxTasksMock.mockResolvedValue([]);
        computeTodayProjectionMock.mockReturnValue({
            items: [],
            totalEligible: 0,
            cap: 3,
        });
        createInboxTaskMock.mockResolvedValue({ ok: true, task: { id: 't1', title: 'Test' } });
        enforceDailyContinuityMock.mockResolvedValue({ ok: true });
    });

    it('calls enforceDailyContinuity before refreshInbox on startup', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        const callOrder = [];
        enforceDailyContinuityMock.mockImplementation(() => {
            callOrder.push('enforceDailyContinuity');
            return Promise.resolve({ ok: true });
        });
        listInboxTasksMock.mockImplementation(() => {
            callOrder.push('listInboxTasks');
            return Promise.resolve([]);
        });

        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(callOrder).toEqual(['enforceDailyContinuity', 'listInboxTasks']);
        expect(enforceDailyContinuityMock).toHaveBeenCalledTimes(1);
    });

    it('submits capture and refreshes inbox projection immediately', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        const form = document.querySelector('#quick-capture-form');
        const input = document.querySelector('#quick-capture-input');

        initializePlanningInboxApp(document);
        await flushAsyncWork();

        input.value = 'First task';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushAsyncWork();

        expect(createInboxTaskMock).toHaveBeenCalledWith('First task');
        expect(listInboxTasksMock).toHaveBeenCalledTimes(2);
        expect(renderInboxProjectionMock).toHaveBeenCalled();
        expect(computeTodayProjectionMock).toHaveBeenCalledTimes(2);
        expect(renderTodayProjectionMock).toHaveBeenCalledTimes(2);
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe('Task added to Inbox.');
        expect(document.querySelector('#quick-capture-submit').disabled).toBe(false);
    });

    it('keeps UI usable when capture throws unexpectedly', async () => {
        createInboxTaskMock.mockRejectedValueOnce(new Error('boom'));
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        const form = document.querySelector('#quick-capture-form');
        const input = document.querySelector('#quick-capture-input');
        const submit = document.querySelector('#quick-capture-submit');

        initializePlanningInboxApp(document);
        await flushAsyncWork();

        input.value = 'Failure case';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await flushAsyncWork();

        expect(submit.disabled).toBe(false);
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe(
            'Capture is temporarily unavailable. Please retry.',
        );
    });

    it('shows equivalent capture availability messaging in online and offline states', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        const networkStatus = document.querySelector('#network-status');

        setOnlineStatus(true);
        initializePlanningInboxApp(document);
        expect(networkStatus.textContent).toContain('Capture remains immediate');

        setOnlineStatus(false);
        window.dispatchEvent(new Event('offline'));
        expect(networkStatus.textContent).toContain('Capture remains immediate');
    });

    it('computes and renders deterministic today projection from local state', async () => {
        listInboxTasksMock.mockResolvedValue([
            { id: 'a', title: 'A', createdAt: '2026-02-24T08:00:00.000Z', todayIncluded: true },
            { id: 'b', title: 'B', createdAt: '2026-02-24T09:00:00.000Z', todayIncluded: false },
        ]);

        const todayProjection = {
            items: [{ id: 'a', title: 'A', createdAt: '2026-02-24T08:00:00.000Z', todayIncluded: true }],
            totalEligible: 1,
            cap: 3,
        };
        computeTodayProjectionMock.mockReturnValue(todayProjection);

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(computeTodayProjectionMock).toHaveBeenCalledWith({
            tasks: expect.any(Array),
            todayCap: 3,
        });
        expect(renderTodayProjectionMock).toHaveBeenCalledWith(
            todayProjection,
            expect.any(Object),
            expect.objectContaining({ onRemoveFromToday: expect.any(Function) }),
        );
    });

    it('computes today projection from local state when offline', async () => {
        setOnlineStatus(false);
        listInboxTasksMock.mockResolvedValue([
            { id: 'x', title: 'Offline task', todayIncluded: true },
        ]);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 'x', title: 'Offline task' }],
            totalEligible: 1,
            cap: 3,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(listInboxTasksMock).toHaveBeenCalled();
        expect(computeTodayProjectionMock).toHaveBeenCalledWith({
            tasks: expect.any(Array),
            todayCap: 3,
        });
        expect(renderTodayProjectionMock).toHaveBeenCalled();
    });

    it('sanitizes malformed persisted task records before rendering and shows recovery feedback', async () => {
        listInboxTasksMock.mockResolvedValue([
            { id: 'ok-1', title: 'Valid task', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: '', title: 'Missing id', todayIncluded: false, createdAt: '2026-02-24T09:00:00.000Z' },
            { id: 'bad-title', title: '   ', todayIncluded: false, createdAt: '2026-02-24T10:00:00.000Z' },
        ]);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 'ok-1', title: 'Valid task', todayIncluded: true }],
            totalEligible: 1,
            cap: 3,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(renderInboxProjectionMock).toHaveBeenCalledWith(
            [{ id: 'ok-1', title: 'Valid task', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' }],
            expect.any(Object),
            expect.any(Object),
        );
        expect(computeTodayProjectionMock).toHaveBeenCalledWith({
            tasks: [{ id: 'ok-1', title: 'Valid task', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' }],
            todayCap: 3,
        });
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe(
            'Some local tasks were skipped because their saved data is invalid.',
        );
    });

    it('clears stale Inbox/Today UI when startup local load fails', async () => {
        const inboxList = document.querySelector('#inbox-list');
        const todayList = document.querySelector('#today-list');
        const inboxCount = document.querySelector('#inbox-count');
        const todayCount = document.querySelector('#today-count');
        const inboxEmpty = document.querySelector('#inbox-empty');
        const todayEmpty = document.querySelector('#today-empty');
        const todayCapValue = document.querySelector('#today-cap-value');

        inboxList.innerHTML = '<li data-task-id="stale-inbox">stale inbox</li>';
        todayList.innerHTML = '<li data-task-id="stale-today">stale today</li>';
        inboxCount.textContent = '99 tasks';
        todayCount.textContent = '99/3 selected';
        inboxEmpty.classList.add('hidden');
        todayEmpty.classList.add('hidden');
        todayCapValue.textContent = 'Cap 3 · 2 eligible';

        listInboxTasksMock.mockRejectedValueOnce(new Error('IndexedDB unavailable'));

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(document.querySelector('#inbox-list').children.length).toBe(0);
        expect(document.querySelector('#today-list').children.length).toBe(0);
        expect(document.querySelector('#inbox-count').textContent).toBe('0 tasks');
        expect(document.querySelector('#today-count').textContent).toBe('0/3 selected');
        expect(document.querySelector('#inbox-empty').classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#today-empty').classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#today-cap-value').textContent).toBe('');
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe(
            'Unable to load local Inbox right now.',
        );
    });

    it('rebuild input remains deterministic across repeated app initialization with identical local data', async () => {
        const persistedTasks = [
            { id: 'r1', title: 'Reload 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 'r2', title: 'Reload 2', todayIncluded: false, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 1, cap: 3 });
        listInboxTasksMock.mockResolvedValue(persistedTasks);

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();
        const firstProjectionInput = computeTodayProjectionMock.mock.calls[0][0];

        vi.clearAllMocks();
        buildAppHtml();
        setOnlineStatus(true);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 1, cap: 3 });
        listInboxTasksMock.mockResolvedValue(persistedTasks);

        initializePlanningInboxApp(document);
        await flushAsyncWork();
        const secondProjectionInput = computeTodayProjectionMock.mock.calls[0][0];

        expect(secondProjectionInput).toEqual(firstProjectionInput);
    });

    it('restores persisted todayCap from localStorage on reload', async () => {
        localStorage.setItem('planning.todayCap', '7');
        listInboxTasksMock.mockResolvedValue([]);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 7 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(document.querySelector('#today-cap-input').value).toBe('7');
        expect(computeTodayProjectionMock).toHaveBeenCalledWith({
            tasks: expect.any(Array),
            todayCap: 7,
        });
    });

    it('clears stale error feedback when cap change triggers successful refresh', async () => {
        listInboxTasksMock
            .mockRejectedValueOnce(new Error('IndexedDB unavailable'))
            .mockResolvedValueOnce([]);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 5 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(document.querySelector('#quick-capture-feedback').textContent).toBe(
            'Unable to load local Inbox right now.',
        );

        const capInput = document.querySelector('#today-cap-input');
        capInput.value = '5';
        capInput.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsyncWork();

        expect(document.querySelector('#quick-capture-feedback').textContent).toBe('');
    });

    it('cap change persists and triggers projection refresh with updated cap', async () => {
        listInboxTasksMock.mockResolvedValue([]);
        computeTodayProjectionMock.mockReturnValue({
            items: [],
            totalEligible: 0,
            cap: 5,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const capInput = document.querySelector('#today-cap-input');
        capInput.value = '5';
        capInput.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsyncWork();

        expect(localStorage.getItem('planning.todayCap')).toBe('5');
        expect(computeTodayProjectionMock).toHaveBeenLastCalledWith({
            tasks: expect.any(Array),
            todayCap: 5,
        });
        expect(renderTodayProjectionMock).toHaveBeenCalled();
    });

    it('rejects invalid cap input and shows feedback', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const capInput = document.querySelector('#today-cap-input');
        const capFeedback = document.querySelector('#today-cap-feedback');
        capInput.value = '0';
        capInput.dispatchEvent(new Event('change', { bubbles: true }));

        expect(capFeedback.textContent).toBe('Cap must be a positive number.');
        expect(localStorage.getItem('planning.todayCap')).toBeNull();
    });

    it('shows cap feedback when refreshInbox fails after valid cap change', async () => {
        listInboxTasksMock
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('IndexedDB error'));
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 5 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const capInput = document.querySelector('#today-cap-input');
        const capFeedback = document.querySelector('#today-cap-feedback');
        capInput.value = '5';
        capInput.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsyncWork();

        expect(capFeedback.textContent).toBe('Unable to refresh Today right now.');
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe('');
    });

    it('bulk add to today succeeds and refreshes projection consistently', async () => {
        const tasks = [
            { id: 'a', title: 'A', todayIncluded: false, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 'b', title: 'B', todayIncluded: false, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        bulkAddToTodayMock.mockResolvedValue({ ok: true });
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        await capturedOptions.onBulkAddToToday(['a', 'b']);
        await flushAsyncWork();

        expect(bulkAddToTodayMock).toHaveBeenCalledWith(['a', 'b']);
        expect(listInboxTasksMock).toHaveBeenCalledTimes(2);
        expect(renderTodayProjectionMock).toHaveBeenCalledTimes(2);
        expect(renderInboxProjectionMock).toHaveBeenCalledTimes(2);
    });

    it('bulk add to today shows feedback and does not refresh when guardrail blocks', async () => {
        listInboxTasksMock.mockResolvedValue([]);
        bulkAddToTodayMock.mockResolvedValue({
            ok: false,
            code: 'TODAY_CAP_EXCEEDED',
            message: 'Today is at capacity. Choose an item to swap or cancel.',
        });
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        await capturedOptions.onBulkAddToToday(['a', 'b']);
        await flushAsyncWork();

        const feedback = document.querySelector('#quick-capture-feedback');
        expect(feedback.textContent).toBe('Today is at capacity. Choose an item to swap or cancel.');
        expect(listInboxTasksMock).toHaveBeenCalledTimes(1);
        expect(renderTodayProjectionMock).toHaveBeenCalledTimes(1);
    });

    it('shows over-cap panel and performs swap flow', async () => {
        const tasks = [
            { id: 't-add', title: 'Inbox candidate', todayIncluded: false, createdAt: '2026-02-24T09:00:00.000Z' },
            { id: 't-1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 't-1', title: 'Today 1' }],
            totalEligible: 1,
            cap: 1,
        });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        addToTodayMock.mockResolvedValueOnce({ ok: false, code: 'TODAY_CAP_EXCEEDED' });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        await capturedOptions.onAddToToday('t-add');
        await flushAsyncWork();

        const panel = document.querySelector('#over-cap-panel');
        expect(panel.classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#today-cap-feedback').textContent).toContain('Today is at capacity');

        const swapButton = document.querySelector('#over-cap-swap-list button');
        swapButton.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        expect(swapToTodayMock).toHaveBeenCalledWith('t-add', 't-1');
        expect(panel.classList.contains('hidden')).toBe(true);
    });

    it('shows closure panel with Today items when Close Day clicked', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Today 2', todayIncluded: true, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [
                { id: 't1', title: 'Today 1' },
                { id: 't2', title: 'Today 2' },
            ],
            totalEligible: 2,
            cap: 3,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const closurePanel = document.querySelector('#closure-panel');
        expect(closurePanel.classList.contains('hidden')).toBe(false);
        const itemList = document.querySelector('#closure-item-list');
        expect(itemList.children.length).toBe(2);
        expect(itemList.textContent).toContain('Today 1');
        expect(itemList.textContent).toContain('Today 2');
        expect(itemList.querySelectorAll('.defer-btn').length).toBe(2);
        expect(itemList.querySelectorAll('.pause-btn').length).toBe(2);
        expect(itemList.querySelectorAll('.retain-btn').length).toBe(2);
        const firstDecisionBtn = itemList.querySelector('.defer-btn');
        expect(document.activeElement).toBe(firstDecisionBtn);
    });

    it('defers an item from closure panel and updates Today', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Today 2', todayIncluded: true, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        const updatedTasks = [
            { id: 't1', title: 'Today 1', todayIncluded: false, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Today 2', todayIncluded: true, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock
            .mockResolvedValueOnce(tasks)      // initial load (refreshInbox)
            .mockResolvedValueOnce(tasks)      // panel open (updateClosurePanel, no cache)
            .mockResolvedValueOnce(updatedTasks); // refreshInbox after defer (updateClosurePanel reuses)
        computeTodayProjectionMock
            .mockReturnValueOnce({
                items: [
                    { id: 't1', title: 'Today 1' },
                    { id: 't2', title: 'Today 2' },
                ],
                totalEligible: 2,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [
                    { id: 't1', title: 'Today 1' },
                    { id: 't2', title: 'Today 2' },
                ],
                totalEligible: 2,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [{ id: 't2', title: 'Today 2' }],
                totalEligible: 1,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [{ id: 't2', title: 'Today 2' }],
                totalEligible: 1,
                cap: 3,
            });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const deferButtons = document.querySelectorAll('.defer-btn');
        deferButtons[0].dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        expect(removeFromTodayMock).toHaveBeenCalledWith('t1');
        const itemList = document.querySelector('#closure-item-list');
        expect(itemList.children.length).toBe(1);
        expect(itemList.textContent).toContain('Today 2');
        expect(itemList.textContent).not.toContain('Today 1');
    });

    it('pauses an item from closure panel and updates Today', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        const updatedTasks = [
            { id: 't1', title: 'Today 1', todayIncluded: false, status: 'paused', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock
            .mockResolvedValueOnce(tasks)       // initial load (refreshInbox)
            .mockResolvedValueOnce(tasks)       // panel open (updateClosurePanel, no cache)
            .mockResolvedValueOnce(updatedTasks); // refreshInbox after pause (updateClosurePanel reuses)
        computeTodayProjectionMock
            .mockReturnValueOnce({
                items: [{ id: 't1', title: 'Today 1' }],
                totalEligible: 1,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [{ id: 't1', title: 'Today 1' }],
                totalEligible: 1,
                cap: 3,
            })
            .mockReturnValueOnce({ items: [], totalEligible: 0, cap: 3 })
            .mockReturnValueOnce({ items: [], totalEligible: 0, cap: 3 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const pauseBtn = document.querySelector('#closure-panel .pause-btn');
        expect(pauseBtn).not.toBeNull();
        pauseBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        expect(pauseTaskMock).toHaveBeenCalledWith('t1');
        const closureCompleteMsg = document.querySelector('#closure-complete-msg');
        expect(closureCompleteMsg.classList.contains('hidden')).toBe(false);
        expect(closureCompleteMsg.textContent).toBe('Day closed. Well done.');
    });

    it('retains an item for tomorrow from closure panel and updates Today', async () => {
        const tasks = [{ id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' }];
        const updatedTasks = [
            { id: 't1', title: 'Today 1', todayIncluded: false, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock
            .mockResolvedValueOnce(tasks) // initial load (refreshInbox)
            .mockResolvedValueOnce(tasks) // panel open (updateClosurePanel)
            .mockResolvedValueOnce(updatedTasks); // refreshInbox after retain
        computeTodayProjectionMock
            .mockReturnValueOnce({
                items: [{ id: 't1', title: 'Today 1' }],
                totalEligible: 1,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [{ id: 't1', title: 'Today 1' }],
                totalEligible: 1,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [],
                totalEligible: 0,
                cap: 3,
            })
            .mockReturnValueOnce({
                items: [],
                totalEligible: 0,
                cap: 3,
            });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const retainBtn = document.querySelector('#closure-panel .retain-btn');
        retainBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        expect(retainTaskForNextDayMock).toHaveBeenCalledWith('t1');
        const closureCompleteMsg = document.querySelector('#closure-complete-msg');
        expect(closureCompleteMsg.classList.contains('hidden')).toBe(false);
        expect(closureCompleteMsg.textContent).toBe('Day closed. Well done.');
    });

    it('shows error in closure panel when defer fails', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 't1', title: 'Today 1' }],
            totalEligible: 1,
            cap: 3,
        });
        removeFromTodayMock.mockResolvedValueOnce({
            ok: false,
            code: 'REMOVE_TASK_NOT_IN_TODAY',
            message: 'Selected item is not in Today.',
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const deferBtn = document.querySelector('#closure-panel .defer-btn');
        deferBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const closureError = document.querySelector('#closure-error');
        expect(closureError.textContent).toBe('Selected item is not in Today.');
        expect(closureError.classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#closure-panel').classList.contains('hidden')).toBe(false);
    });

    it('shows error in closure panel when pause fails', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 't1', title: 'Today 1' }],
            totalEligible: 1,
            cap: 3,
        });
        pauseTaskMock.mockResolvedValueOnce({
            ok: false,
            code: 'REMOVE_TASK_NOT_IN_TODAY',
            message: 'Selected item is not in Today.',
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const pauseBtn = document.querySelector('#closure-panel .pause-btn');
        pauseBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const closureError = document.querySelector('#closure-error');
        expect(closureError.textContent).toBe('Selected item is not in Today.');
        expect(closureError.classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#closure-panel').classList.contains('hidden')).toBe(false);
    });

    it('shows day closed immediately when Today already empty', async () => {
        listInboxTasksMock.mockResolvedValue([]);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const closurePanel = document.querySelector('#closure-panel');
        expect(closurePanel.classList.contains('hidden')).toBe(false);
        const closureCompleteMsg = document.querySelector('#closure-complete-msg');
        expect(closureCompleteMsg.classList.contains('hidden')).toBe(false);
        expect(closureCompleteMsg.textContent).toBe('Day closed. Well done.');
        const itemList = document.querySelector('#closure-item-list');
        expect(itemList.children.length).toBe(0);
    });

    it('cancel button hides closure panel without mutation', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 't1', title: 'Today 1' }],
            totalEligible: 1,
            cap: 3,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const closeDayBtn = document.querySelector('#close-day-btn');
        closeDayBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const closurePanel = document.querySelector('#closure-panel');
        expect(closurePanel.classList.contains('hidden')).toBe(false);

        const cancelBtn = document.querySelector('#closure-cancel-btn');
        cancelBtn.dispatchEvent(new Event('click', { bubbles: true }));

        expect(closurePanel.classList.contains('hidden')).toBe(true);
        expect(removeFromTodayMock).not.toHaveBeenCalled();
        expect(pauseTaskMock).not.toHaveBeenCalled();
    });

    it('shows review panel with Today items when Review Plan clicked', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Today 2', todayIncluded: true, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [
                { id: 't1', title: 'Today 1' },
                { id: 't2', title: 'Today 2' },
            ],
            totalEligible: 2,
            cap: 3,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const reviewPlanBtn = document.querySelector('#review-plan-btn');
        reviewPlanBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const reviewPanel = document.querySelector('#review-panel');
        expect(reviewPanel.classList.contains('hidden')).toBe(false);
        const itemList = document.querySelector('#review-item-list');
        expect(itemList.children.length).toBe(2);
        expect(itemList.textContent).toContain('Today 1');
        expect(itemList.textContent).toContain('Today 2');
        const capStatus = document.querySelector('#review-cap-status');
        expect(capStatus.textContent).toBe('2 of 3 selected');
        const closureState = document.querySelector('#review-closure-state');
        expect(closureState.textContent).toBe('Planning active');
        const confirmBtn = document.querySelector('#review-confirm-btn');
        expect(document.activeElement).toBe(confirmBtn);
    });

    it('review confirm dismisses panel without mutation', async () => {
        const tasks = [
            { id: 't1', title: 'Today 1', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({
            items: [{ id: 't1', title: 'Today 1' }],
            totalEligible: 1,
            cap: 3,
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const reviewPlanBtn = document.querySelector('#review-plan-btn');
        reviewPlanBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const reviewPanel = document.querySelector('#review-panel');
        expect(reviewPanel.classList.contains('hidden')).toBe(false);

        const confirmBtn = document.querySelector('#review-confirm-btn');
        confirmBtn.dispatchEvent(new Event('click', { bubbles: true }));

        expect(reviewPanel.classList.contains('hidden')).toBe(true);
        expect(addToTodayMock).not.toHaveBeenCalled();
        expect(swapToTodayMock).not.toHaveBeenCalled();
        expect(bulkAddToTodayMock).not.toHaveBeenCalled();
        expect(createInboxTaskMock).not.toHaveBeenCalled();
        expect(removeFromTodayMock).not.toHaveBeenCalled();
        expect(pauseTaskMock).not.toHaveBeenCalled();
    });

    it('shows day closed state when Today empty on review', async () => {
        listInboxTasksMock.mockResolvedValue([]);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const reviewPlanBtn = document.querySelector('#review-plan-btn');
        reviewPlanBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const reviewPanel = document.querySelector('#review-panel');
        expect(reviewPanel.classList.contains('hidden')).toBe(false);
        const itemList = document.querySelector('#review-item-list');
        expect(itemList.children.length).toBe(0);
        expect(itemList.classList.contains('hidden')).toBe(true);
        const closureState = document.querySelector('#review-closure-state');
        expect(closureState.textContent).toBe('Day closed');
        const capStatus = document.querySelector('#review-cap-status');
        expect(capStatus.textContent).toBe('0 of 3 selected');
    });

    it('shows review-panel scoped error when review loading fails', async () => {
        listInboxTasksMock
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('boom'));

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const reviewPlanBtn = document.querySelector('#review-plan-btn');
        reviewPlanBtn.dispatchEvent(new Event('click', { bubbles: true }));
        await flushAsyncWork();

        const reviewError = document.querySelector('#review-error');
        expect(reviewError.textContent).toBe('Unable to load plan for review. Please retry.');
        expect(reviewError.classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe('');
    });

    it('opens add-area panel when add-area-btn clicked and focuses input', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const addAreaBtn = document.querySelector('#add-area-btn');
        const addAreaPanel = document.querySelector('#add-area-panel');
        const addAreaError = document.querySelector('#add-area-error');
        const addAreaInput = document.querySelector('#add-area-input');

        expect(addAreaPanel.classList.contains('hidden')).toBe(true);
        expect(addAreaError.classList.contains('hidden')).toBe(true);

        addAreaBtn.dispatchEvent(new Event('click', { bubbles: true }));

        expect(addAreaPanel.classList.contains('hidden')).toBe(false);
        expect(addAreaError.classList.contains('hidden')).toBe(true);
        expect(document.activeElement).toBe(addAreaInput);
    });

    it('add-area success closes panel and clears error', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const addAreaBtn = document.querySelector('#add-area-btn');
        const addAreaPanel = document.querySelector('#add-area-panel');
        const addAreaInput = document.querySelector('#add-area-input');
        const addAreaConfirm = document.querySelector('#add-area-confirm');
        const addAreaError = document.querySelector('#add-area-error');

        addAreaBtn.dispatchEvent(new Event('click', { bubbles: true }));
        addAreaInput.value = 'personal';
        addAreaConfirm.dispatchEvent(new Event('click', { bubbles: true }));

        expect(addAreaPanel.classList.contains('hidden')).toBe(true);
        expect(addAreaError.classList.contains('hidden')).toBe(true);
        expect(addAreaError.textContent).toBe('');
    });

    it('add-area error shows dedicated error element and removes hidden (Epic 1 pattern)', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const addAreaBtn = document.querySelector('#add-area-btn');
        const addAreaPanel = document.querySelector('#add-area-panel');
        const addAreaInput = document.querySelector('#add-area-input');
        const addAreaConfirm = document.querySelector('#add-area-confirm');
        const addAreaError = document.querySelector('#add-area-error');

        addAreaBtn.dispatchEvent(new Event('click', { bubbles: true }));
        addAreaInput.value = 'inbox';
        addAreaConfirm.dispatchEvent(new Event('click', { bubbles: true }));

        expect(addAreaError.textContent).toBe('Inbox is a reserved area.');
        expect(addAreaError.classList.contains('hidden')).toBe(false);
        expect(addAreaPanel.classList.contains('hidden')).toBe(false);
    });

    it('add-area cancel closes panel and clears error', async () => {
        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const addAreaBtn = document.querySelector('#add-area-btn');
        const addAreaPanel = document.querySelector('#add-area-panel');
        const addAreaInput = document.querySelector('#add-area-input');
        const addAreaConfirm = document.querySelector('#add-area-confirm');
        const addAreaCancel = document.querySelector('#add-area-cancel');
        const addAreaError = document.querySelector('#add-area-error');

        addAreaBtn.dispatchEvent(new Event('click', { bubbles: true }));
        addAreaInput.value = 'inbox';
        addAreaConfirm.dispatchEvent(new Event('click', { bubbles: true }));
        expect(addAreaError.classList.contains('hidden')).toBe(false);

        addAreaCancel.dispatchEvent(new Event('click', { bubbles: true }));

        expect(addAreaPanel.classList.contains('hidden')).toBe(true);
        expect(addAreaError.textContent).toBe('');
        expect(addAreaError.classList.contains('hidden')).toBe(true);
    });

    it('filters inbox projection by selected area and updates title on selector change', async () => {
        const tasks = [
            { id: 't-inbox', title: 'Inbox task', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't-work', title: 'Work task', todayIncluded: false, area: 'work', createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        const renderedArgs = [];
        renderInboxProjectionMock.mockImplementation((renderedTasks) => {
            renderedArgs.push(renderedTasks);
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        expect(renderedArgs[0].map((t) => t.id)).toEqual(['t-inbox']);
        expect(document.querySelector('#inbox-title').textContent).toBe('Inbox');

        const selector = document.querySelector('#area-selector');
        selector.value = 'work';
        selector.dispatchEvent(new Event('change', { bubbles: true }));
        await flushAsyncWork();

        expect(renderedArgs.at(-1).map((t) => t.id)).toEqual(['t-work']);
        expect(document.querySelector('#inbox-title').textContent).toBe('Work');
    });

    it('onSetTaskArea triggers command and refreshes inbox on success', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        await capturedOptions.onSetTaskArea('t1', 'work');
        await flushAsyncWork();

        expect(setTaskAreaMock).toHaveBeenCalledWith('t1', 'work');
        expect(listInboxTasksMock.mock.calls.length).toBeGreaterThan(initialListCalls);
        expect(renderInboxProjectionMock.mock.calls.length).toBeGreaterThan(1);
    });

    it('onSetTaskArea shows area feedback and does not refresh when blocked', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });
        setTaskAreaMock.mockResolvedValueOnce({
            ok: false,
            code: 'INVALID_AREA',
            message: 'Invalid area. Choose an existing area.',
        });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        await capturedOptions.onSetTaskArea('t1', 'unknown');
        await flushAsyncWork();

        const areaFeedback = document.querySelector('#area-feedback');
        expect(areaFeedback.textContent).toBe('Invalid area. Choose an existing area.');
        expect(areaFeedback.classList.contains('hidden')).toBe(false);
        expect(listInboxTasksMock.mock.calls.length).toBe(initialListCalls);
    });

    it('Today projection receives cross-area tasks and passes items with area to render', async () => {
        const tasks = [
            { id: 't1', title: 'Inbox task', area: 'inbox', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Work task', area: 'work', todayIncluded: true, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        const { computeTodayProjection } = await vi.importActual('../projections/computeTodayProjection');
        computeTodayProjectionMock.mockImplementation((args) => computeTodayProjection(args));

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const projectionArg = renderTodayProjectionMock.mock.calls[0][0];
        expect(projectionArg.items).toHaveLength(2);
        expect(projectionArg.items.map((i) => i.area)).toContain('inbox');
        expect(projectionArg.items.map((i) => i.area)).toContain('work');
    });

    it('renders area origin in Today list through app integration flow', async () => {
        const tasks = [
            { id: 't1', title: 'Inbox task', area: 'inbox', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Work task', area: 'work', todayIncluded: true, createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        const { computeTodayProjection } = await vi.importActual('../projections/computeTodayProjection');
        const { renderTodayProjection } = await vi.importActual('../projections/renderTodayProjection');
        computeTodayProjectionMock.mockImplementation((args) => computeTodayProjection(args));
        renderTodayProjectionMock.mockImplementation((projection, ui, options) =>
            renderTodayProjection(projection, ui, options),
        );

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const todayList = document.querySelector('#today-list');
        const renderedText = todayList.textContent;
        expect(renderedText).toContain('Inbox task');
        expect(renderedText).toContain('Work task');
        expect(renderedText).toContain('Inbox');
        expect(renderedText).toContain('Work');
    });

    it('Remove from Today button calls removeFromToday and refreshes inbox', async () => {
        const tasks = [
            { id: 't1', title: 'In Today', area: 'inbox', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        removeFromTodayMock.mockResolvedValue({ ok: true });
        const { computeTodayProjection } = await vi.importActual('../projections/computeTodayProjection');
        const { renderTodayProjection } = await vi.importActual('../projections/renderTodayProjection');
        computeTodayProjectionMock.mockImplementation((args) => computeTodayProjection(args));
        renderTodayProjectionMock.mockImplementation((projection, ui, options) =>
            renderTodayProjection(projection, ui, options),
        );

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const removeBtn = document.querySelector('[data-action="remove-from-today"]');
        expect(removeBtn).not.toBeNull();
        removeBtn.click();
        await flushAsyncWork();

        expect(removeFromTodayMock).toHaveBeenCalledWith('t1');
        expect(listInboxTasksMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('Remove from Today shows feedback and does not refresh when mutation is blocked', async () => {
        const tasks = [
            { id: 't1', title: 'In Today', area: 'inbox', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        removeFromTodayMock.mockResolvedValueOnce({
            ok: false,
            code: 'REMOVE_TASK_NOT_IN_TODAY',
            message: 'Selected item is not in Today.',
        });
        const { computeTodayProjection } = await vi.importActual('../projections/computeTodayProjection');
        const { renderTodayProjection } = await vi.importActual('../projections/renderTodayProjection');
        computeTodayProjectionMock.mockImplementation((args) => computeTodayProjection(args));
        renderTodayProjectionMock.mockImplementation((projection, ui, options) =>
            renderTodayProjection(projection, ui, options),
        );

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        const removeBtn = document.querySelector('[data-action="remove-from-today"]');
        expect(removeBtn).not.toBeNull();
        removeBtn.click();
        await flushAsyncWork();

        expect(removeFromTodayMock).toHaveBeenCalledWith('t1');
        expect(document.querySelector('#quick-capture-feedback').textContent).toBe('Selected item is not in Today.');
        expect(listInboxTasksMock.mock.calls.length).toBe(initialListCalls);
    });

    it('onSetTaskArea keeps Today membership unchanged in app integration flow', async () => {
        const initialTasks = [
            { id: 't1', title: 'Today task', area: 'inbox', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        const updatedTasks = [
            { id: 't1', title: 'Today task', area: 'work', todayIncluded: true, createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock
            .mockResolvedValueOnce(initialTasks)
            .mockResolvedValueOnce(updatedTasks);
        const { computeTodayProjection } = await vi.importActual('../projections/computeTodayProjection');
        computeTodayProjectionMock.mockImplementation((args) => computeTodayProjection(args));

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        await capturedOptions.onSetTaskArea('t1', 'work');
        await flushAsyncWork();

        expect(setTaskAreaMock).toHaveBeenCalledWith('t1', 'work');
        const latestProjection = renderTodayProjectionMock.mock.calls.at(-1)[0];
        expect(latestProjection.items).toHaveLength(1);
        expect(latestProjection.items[0].id).toBe('t1');
        expect(latestProjection.items[0].area).toBe('work');
    });

    it('onRescheduleTask triggers command and refreshes inbox on success', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });
        rescheduleTaskMock.mockResolvedValue({ ok: true });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        await capturedOptions.onRescheduleTask('t1', '2026-03-15');
        await flushAsyncWork();

        expect(rescheduleTaskMock).toHaveBeenCalledWith('t1', '2026-03-15');
        expect(listInboxTasksMock.mock.calls.length).toBeGreaterThan(initialListCalls);
        expect(renderInboxProjectionMock.mock.calls.length).toBeGreaterThan(1);
    });

    it('onRescheduleTask shows area feedback when invalid temporal target', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });
        rescheduleTaskMock.mockResolvedValueOnce({
            ok: false,
            code: 'INVALID_TEMPORAL_TARGET',
            message: 'Invalid date. Use a valid date (YYYY-MM-DD).',
        });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        await capturedOptions.onRescheduleTask('t1', 'not-a-date');
        await flushAsyncWork();

        const areaFeedback = document.querySelector('#area-feedback');
        expect(areaFeedback.textContent).toBe('Invalid date. Use a valid date (YYYY-MM-DD).');
        expect(areaFeedback.classList.contains('hidden')).toBe(false);
        expect(listInboxTasksMock.mock.calls.length).toBe(initialListCalls);
    });

    it('renderInboxProjection receives onRescheduleTask callback', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const lastCall = renderInboxProjectionMock.mock.calls.at(-1);
        const options = lastCall[2];
        expect(options.onRescheduleTask).toBeDefined();
        expect(typeof options.onRescheduleTask).toBe('function');
    });

    it('reschedule does not alter area or Today membership (regression)', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: true, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
        ];
        const updatedTasks = [
            {
                id: 't1',
                title: 'Task 1',
                todayIncluded: true,
                area: 'inbox',
                scheduledFor: '2026-03-20',
                createdAt: '2026-02-24T08:00:00.000Z',
            },
        ];
        listInboxTasksMock.mockResolvedValueOnce(tasks).mockResolvedValueOnce(updatedTasks);
        const { computeTodayProjection } = await vi.importActual('../projections/computeTodayProjection');
        computeTodayProjectionMock.mockImplementation((args) => computeTodayProjection(args));
        rescheduleTaskMock.mockResolvedValue({ ok: true, task: updatedTasks[0] });

        let capturedOptions;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, options) => {
            capturedOptions = options;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        await capturedOptions.onRescheduleTask('t1', '2026-03-20');
        await flushAsyncWork();

        expect(rescheduleTaskMock).toHaveBeenCalledWith('t1', '2026-03-20');
        const lastProjectionTasks = renderInboxProjectionMock.mock.calls.at(-1)[0];
        const task = lastProjectionTasks.find((t) => t.id === 't1');
        expect(task).toBeDefined();
        expect(task.area).toBe('inbox');
        expect(task.todayIncluded).toBe(true);
    });

    it('renderInboxProjection receives bulk reschedule callbacks and selection state', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Task 2', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const options = renderInboxProjectionMock.mock.calls.at(-1)[2];
        expect(typeof options.onToggleBulkSelection).toBe('function');
        expect(typeof options.onBulkRescheduleTasks).toBe('function');
        expect(Array.isArray(options.selectedTaskIds)).toBe(true);
    });

    it('onBulkRescheduleTasks shows success feedback with affected tasks and refreshes', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Task 2', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });
        bulkRescheduleTasksMock.mockResolvedValue({ ok: true, taskIds: ['t1', 't2'], count: 2 });

        let options;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, opts) => {
            options = opts;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        await options.onBulkRescheduleTasks(['t1', 't2'], '2026-07-01');
        await flushAsyncWork();

        expect(bulkRescheduleTasksMock).toHaveBeenCalledWith(['t1', 't2'], '2026-07-01');
        const areaFeedback = document.querySelector('#area-feedback');
        expect(areaFeedback.textContent).toContain('Bulk reschedule succeeded');
        expect(areaFeedback.textContent).toContain('t1');
        expect(areaFeedback.classList.contains('hidden')).toBe(false);
        expect(listInboxTasksMock.mock.calls.length).toBeGreaterThan(initialListCalls);
    });

    it('onBulkRescheduleTasks shows failure feedback with requested task list, clears selection, and no refresh', async () => {
        const tasks = [
            { id: 't1', title: 'Task 1', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T08:00:00.000Z' },
            { id: 't2', title: 'Task 2', todayIncluded: false, area: 'inbox', createdAt: '2026-02-24T09:00:00.000Z' },
        ];
        listInboxTasksMock.mockResolvedValue(tasks);
        computeTodayProjectionMock.mockReturnValue({ items: [], totalEligible: 0, cap: 3 });
        bulkRescheduleTasksMock.mockResolvedValue({
            ok: false,
            code: 'TASK_NOT_FOUND',
            message: 'Task not found.',
        });

        let options;
        renderInboxProjectionMock.mockImplementation((_tasks, _ui, opts) => {
            options = opts;
        });

        const { initializePlanningInboxApp } = await import('./initializePlanningInboxApp');
        initializePlanningInboxApp(document);
        await flushAsyncWork();

        const initialListCalls = listInboxTasksMock.mock.calls.length;
        await options.onBulkRescheduleTasks(['t1', 't2'], '2026-07-01');
        await flushAsyncWork();

        expect(bulkRescheduleTasksMock).toHaveBeenCalledWith(['t1', 't2'], '2026-07-01');
        const areaFeedback = document.querySelector('#area-feedback');
        expect(areaFeedback.textContent).toContain('Task not found.');
        expect(areaFeedback.textContent).toContain('Requested tasks: t1, t2');
        expect(areaFeedback.classList.contains('hidden')).toBe(false);
        expect(listInboxTasksMock.mock.calls.length).toBe(initialListCalls);
        const latestOptions = renderInboxProjectionMock.mock.calls.at(-1)[2];
        expect(latestOptions.selectedTaskIds).toEqual([]);
    });
});
