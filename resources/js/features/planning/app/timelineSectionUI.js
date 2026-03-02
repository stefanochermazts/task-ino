import { loadTimeline } from '../commands/loadTimeline';

function formatTimelineTimestamp(value) {
    const raw = String(value ?? '').trim();
    if (raw.length === 0) return '—';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

export function initializeTimelineSection(ui) {
    let timelineFeedbackTimeoutId = null;

    function scheduleTimelineFeedbackClear(delayMs) {
        if (timelineFeedbackTimeoutId) {
            clearTimeout(timelineFeedbackTimeoutId);
        }
        timelineFeedbackTimeoutId = setTimeout(() => {
            if (ui.timelineFeedback) {
                ui.timelineFeedback.textContent = '';
            }
            timelineFeedbackTimeoutId = null;
        }, delayMs);
    }

    async function refreshTimeline(filterType = 'all') {
        if (!ui.timelineList || !ui.timelineFeedback) return;
        ui.timelineFeedback.textContent = 'Loading...';
        try {
            const result = await loadTimeline(filterType);
            if (!result.ok) {
                ui.timelineFeedback.textContent = result.message ?? 'Unable to load timeline. Please try again.';
                scheduleTimelineFeedbackClear(5000);
                return;
            }
            const { entries, availableTypes } = result;
            if (ui.timelineFilter) {
                const current = ui.timelineFilter.value;
                ui.timelineFilter.innerHTML = '<option value="all">All</option>';
                for (const t of availableTypes ?? []) {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.textContent = t;
                    ui.timelineFilter.appendChild(opt);
                }
                if (availableTypes?.includes(current)) {
                    ui.timelineFilter.value = current;
                }
            }
            ui.timelineList.innerHTML = '';
            if (entries?.length === 0) {
                ui.timelineFeedback.textContent = 'No events recorded yet.';
                scheduleTimelineFeedbackClear(5000);
                return;
            }
            ui.timelineFeedback.textContent = '';
            for (const e of entries) {
                const li = document.createElement('li');
                const ts = formatTimelineTimestamp(e.displayTimestamp);
                li.textContent = `${ts} · ${e.event_type} · ${e.entity_id}`;
                ui.timelineList.appendChild(li);
            }
        } catch {
            ui.timelineFeedback.textContent = 'Unable to load timeline. Please try again.';
            scheduleTimelineFeedbackClear(5000);
        }
    }

    if (ui.timelineRefreshBtn && ui.timelineFeedback) {
        ui.timelineRefreshBtn.addEventListener('click', () => {
            const filterType = ui.timelineFilter?.value ?? 'all';
            refreshTimeline(filterType);
        });
    }

    if (ui.timelineFilter && ui.timelineFeedback) {
        ui.timelineFilter.addEventListener('change', () => {
            refreshTimeline(ui.timelineFilter.value);
        });
    }

    if (ui.eventTimelinePanel && ui.timelineFeedback) {
        ui.eventTimelinePanel.addEventListener('toggle', () => {
            if (ui.eventTimelinePanel.open) {
                const filterType = ui.timelineFilter?.value ?? 'all';
                refreshTimeline(filterType);
            }
        });
    }
}
