export function renderInboxProjection(tasks, ui, options = {}) {
    const { onAddToToday, onBulkAddToToday, onSetTaskArea, selectedArea, areas = [] } = options;
    ui.list.innerHTML = '';

    const nonTodayTasks = tasks.filter((t) => !t.todayIncluded);
    if (onBulkAddToToday && nonTodayTasks.length > 1) {
        const actionRow = document.createElement('li');
        actionRow.className = 'flex justify-end pb-1';
        const bulkBtn = document.createElement('button');
        bulkBtn.type = 'button';
        bulkBtn.textContent = `Add all ${nonTodayTasks.length} to Today`;
        bulkBtn.className =
            'rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100';
        bulkBtn.dataset.action = 'bulk-add-to-today';
        bulkBtn.addEventListener('click', () =>
            onBulkAddToToday(nonTodayTasks.map((t) => t.id)),
        );
        actionRow.appendChild(bulkBtn);
        ui.list.appendChild(actionRow);
    }

    if (tasks.length === 0) {
        ui.empty.classList.remove('hidden');
    } else {
        ui.empty.classList.add('hidden');
    }

    for (const task of tasks) {
        const item = document.createElement('li');
        item.className = 'flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm';
        item.dataset.taskId = task.id;
        const titleSpan = document.createElement('span');
        titleSpan.textContent = task.title;
        item.appendChild(titleSpan);
        const actions = document.createElement('span');
        actions.className = 'flex shrink-0 items-center gap-2';
        if (onSetTaskArea && areas.length > 1) {
            const areaSelect = document.createElement('select');
            areaSelect.className = 'rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none ring-blue-600 focus:ring-2';
            areaSelect.setAttribute('aria-label', `Area for ${task.title}`);
            const taskArea = (task.area ?? 'inbox').toLowerCase();
            for (const a of areas) {
                const opt = document.createElement('option');
                opt.value = a;
                opt.textContent = a === 'inbox' ? 'Inbox' : a.charAt(0).toUpperCase() + a.slice(1);
                if (a === taskArea) opt.selected = true;
                areaSelect.appendChild(opt);
            }
            areaSelect.addEventListener('change', () => {
                const newArea = areaSelect.value;
                if (newArea !== taskArea) onSetTaskArea(task.id, newArea);
            });
            actions.appendChild(areaSelect);
        }
        if (onAddToToday && !task.todayIncluded) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = 'Add to Today';
            addBtn.className =
                'rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100';
            addBtn.dataset.taskId = task.id;
            addBtn.addEventListener('click', () => onAddToToday(task.id));
            actions.appendChild(addBtn);
        }
        item.appendChild(actions);
        ui.list.appendChild(item);
    }

    const taskWord = tasks.length === 1 ? 'task' : 'tasks';
    ui.count.textContent = `${tasks.length} ${taskWord}`;
}
