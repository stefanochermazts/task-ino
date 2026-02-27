import { DEFAULT_TODAY_CAP } from './computeTodayProjection';

export function renderTodayProjection(todayProjection, ui) {
    if (!ui.todayList || !ui.todayEmpty || !ui.todayCount || !ui.todayCapValue) {
        return;
    }

    const items = Array.isArray(todayProjection?.items) ? todayProjection.items : [];
    const cap = Number.parseInt(String(todayProjection?.cap ?? ''), 10) || DEFAULT_TODAY_CAP;

    ui.todayList.innerHTML = '';

    if (items.length === 0) {
        ui.todayEmpty.classList.remove('hidden');
    } else {
        ui.todayEmpty.classList.add('hidden');
    }

    for (const task of items) {
        const item = document.createElement('li');
        item.className = 'flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm';
        item.dataset.taskId = task.id;
        const titleSpan = document.createElement('span');
        titleSpan.textContent = task.title;
        item.appendChild(titleSpan);
        const areaLabel = document.createElement('span');
        const normalizedArea = String(task?.area ?? 'inbox').trim().toLowerCase() || 'inbox';
        areaLabel.textContent =
            normalizedArea === 'inbox'
                ? 'Inbox'
                : normalizedArea.charAt(0).toUpperCase() + normalizedArea.slice(1);
        areaLabel.className = 'shrink-0 text-xs text-slate-500';
        areaLabel.setAttribute('aria-label', `Area: ${areaLabel.textContent}`);
        item.appendChild(areaLabel);
        ui.todayList.appendChild(item);
    }

    const totalEligible = Number.parseInt(String(todayProjection?.totalEligible ?? 0), 10) || 0;
    ui.todayCount.textContent = `${items.length}/${cap} selected`;
    ui.todayCapValue.textContent = `Cap ${cap} · ${totalEligible} eligible`;
}
