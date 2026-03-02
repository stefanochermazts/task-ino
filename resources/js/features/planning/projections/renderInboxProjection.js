export function renderInboxProjection(tasks, ui, options = {}) {
    const {
        onAddToToday,
        onBulkAddToToday,
        onSetTaskArea,
        onRescheduleTask,
        onToggleBulkSelection,
        onBulkRescheduleTasks,
        selectedTaskIds = [],
        selectedArea,
        areas = [],
    } = options;
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

    if (onBulkRescheduleTasks) {
        const selectedIds = new Set(Array.isArray(selectedTaskIds) ? selectedTaskIds : []);
        const actionRow = document.createElement('li');
        actionRow.className = 'flex items-center justify-end gap-2 pb-1';

        const selectedCount = document.createElement('span');
        selectedCount.className = 'text-xs text-slate-500';
        selectedCount.textContent = `${selectedIds.size} selected`;
        actionRow.appendChild(selectedCount);

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className =
            'rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none ring-blue-600 focus:ring-2';
        dateInput.setAttribute('aria-label', 'Bulk reschedule date');
        actionRow.appendChild(dateInput);

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.textContent = 'Bulk reschedule';
        applyBtn.className =
            'rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60';
        applyBtn.dataset.action = 'bulk-reschedule';
        applyBtn.disabled = selectedIds.size === 0;
        applyBtn.addEventListener('click', () => {
            onBulkRescheduleTasks(Array.from(selectedIds), dateInput.value || null);
        });
        actionRow.appendChild(applyBtn);
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
        if (task.scheduledFor) {
            const dateLabel = document.createElement('span');
            dateLabel.className = 'ml-2 text-xs text-slate-500';
            dateLabel.textContent = ` (${task.scheduledFor})`;
            titleSpan.appendChild(dateLabel);
        }
        if (onToggleBulkSelection) {
            const selectedIds = new Set(Array.isArray(selectedTaskIds) ? selectedTaskIds : []);
            const selectWrap = document.createElement('label');
            selectWrap.className = 'mr-2 inline-flex items-center gap-2';
            const selectInput = document.createElement('input');
            selectInput.type = 'checkbox';
            selectInput.className = 'h-3.5 w-3.5';
            selectInput.dataset.action = 'bulk-select-task';
            selectInput.dataset.taskId = task.id;
            selectInput.checked = selectedIds.has(task.id);
            selectInput.setAttribute('aria-label', `Select ${task.title}`);
            selectInput.addEventListener('change', () => onToggleBulkSelection(task.id, selectInput.checked));
            selectWrap.appendChild(selectInput);
            selectWrap.appendChild(titleSpan);
            item.appendChild(selectWrap);
        } else {
            item.appendChild(titleSpan);
        }
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
        if (onRescheduleTask) {
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className =
                'rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none ring-blue-600 focus:ring-2';
            dateInput.setAttribute('aria-label', `Reschedule ${task.title}`);
            dateInput.value = task.scheduledFor ?? '';
            dateInput.addEventListener('change', () => {
                const val = dateInput.value;
                onRescheduleTask(task.id, val || null);
            });
            actions.appendChild(dateInput);
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
