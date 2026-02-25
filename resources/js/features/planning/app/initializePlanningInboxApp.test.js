import { beforeEach, describe, expect, it, vi } from 'vitest';

const createInboxTaskMock = vi.fn();
const listInboxTasksMock = vi.fn();
const renderInboxProjectionMock = vi.fn();
const computeTodayProjectionMock = vi.fn();
const renderTodayProjectionMock = vi.fn();
const addToTodayMock = vi.fn();
const swapToTodayMock = vi.fn();

vi.mock('../commands/createInboxTask', () => ({
    createInboxTask: (...args) => createInboxTaskMock(...args),
}));

vi.mock('../commands/addToToday', () => ({
    addToToday: (...args) => addToTodayMock(...args),
    swapToToday: (...args) => swapToTodayMock(...args),
}));

vi.mock('../persistence/inboxTaskStore', () => ({
    listInboxTasks: (...args) => listInboxTasksMock(...args),
}));

vi.mock('../projections/renderInboxProjection', () => ({
    renderInboxProjection: (...args) => renderInboxProjectionMock(...args),
}));

vi.mock('../projections/computeTodayProjection', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        computeTodayProjection: (...args) => computeTodayProjectionMock(...args),
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
        </section>
    `;
    localStorage.removeItem('planning.todayCap');
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
        listInboxTasksMock.mockResolvedValue([]);
        computeTodayProjectionMock.mockReturnValue({
            items: [],
            totalEligible: 0,
            cap: 3,
        });
        createInboxTaskMock.mockResolvedValue({ ok: true, task: { id: 't1', title: 'Test' } });
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
        expect(renderTodayProjectionMock).toHaveBeenCalledWith(todayProjection, expect.any(Object));
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
});
