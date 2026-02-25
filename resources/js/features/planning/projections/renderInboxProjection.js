export function renderInboxProjection(tasks, ui, options = {}) {
    const { onAddToToday } = options;
    ui.list.innerHTML = '';

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
        if (onAddToToday && !task.todayIncluded) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = 'Add to Today';
            addBtn.className =
                'shrink-0 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100';
            addBtn.dataset.taskId = task.id;
            addBtn.addEventListener('click', () => onAddToToday(task.id));
            item.appendChild(addBtn);
        }
        ui.list.appendChild(item);
    }

    const taskWord = tasks.length === 1 ? 'task' : 'tasks';
    ui.count.textContent = `${tasks.length} ${taskWord}`;
}
