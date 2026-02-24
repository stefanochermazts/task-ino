export function renderInboxProjection(tasks, ui) {
    ui.list.innerHTML = '';

    if (tasks.length === 0) {
        ui.empty.classList.remove('hidden');
    } else {
        ui.empty.classList.add('hidden');
    }

    for (const task of tasks) {
        const item = document.createElement('li');
        item.className = 'rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm';
        item.dataset.taskId = task.id;
        item.textContent = task.title;
        ui.list.appendChild(item);
    }

    const taskWord = tasks.length === 1 ? 'task' : 'tasks';
    ui.count.textContent = `${tasks.length} ${taskWord}`;
}
