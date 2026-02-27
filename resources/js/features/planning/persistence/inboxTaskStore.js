const DB_NAME = 'taskino-planning';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(new Error('Unable to open local store.'));
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(TASK_STORE)) {
                const store = db.createObjectStore(TASK_STORE, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

function runTransaction(mode, handler) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(TASK_STORE, mode);
            const store = transaction.objectStore(TASK_STORE);

            let transactionResult;
            try {
                transactionResult = handler(store);
            } catch (error) {
                reject(error);
                return;
            }

            transaction.oncomplete = () => {
                db.close();
                resolve(transactionResult);
            };
            transaction.onerror = () => {
                db.close();
                reject(new Error('Local transaction failed.'));
            };
            transaction.onabort = () => {
                db.close();
                reject(new Error('Local transaction aborted.'));
            };
        });
    });
}

export async function saveInboxTask(task) {
    await runTransaction('readwrite', (store) => {
        store.put(task);
        return task;
    });

    return task;
}

export async function getInboxTask(id) {
    return runTransaction('readonly', (store) => {
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(new Error('Unable to load task.'));
        });
    });
}

export async function addTaskToTodayWithCap(taskId, todayCap) {
    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const listRequest = store.getAll();
            listRequest.onsuccess = () => {
                const tasks = Array.isArray(listRequest.result) ? listRequest.result : [];
                const task = tasks.find((item) => item?.id === taskId) ?? null;
                if (!task) {
                    resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                    return;
                }

                const cap = Number.parseInt(String(todayCap ?? ''), 10);
                const validCap = Number.isFinite(cap) && cap > 0 ? cap : 3;
                const currentTodayCount = tasks.filter((item) => item?.todayIncluded === true).length;
                const alreadyInToday = task.todayIncluded === true;
                if (!alreadyInToday && currentTodayCount >= validCap) {
                    resolve({ ok: false, code: 'TODAY_CAP_EXCEEDED' });
                    return;
                }

                const updated = {
                    ...task,
                    todayIncluded: true,
                    updatedAt: new Date().toISOString(),
                };
                const saveRequest = store.put(updated);
                saveRequest.onsuccess = () => resolve({ ok: true, task: updated });
                saveRequest.onerror = () => reject(new Error('Unable to save task.'));
            };
            listRequest.onerror = () => reject(new Error('Unable to list Inbox tasks.'));
        });
    });
}

export async function bulkAddTasksToToday(taskIds, todayCap) {
    const ids = Array.isArray(taskIds) ? [...taskIds] : [];
    if (ids.length === 0) {
        return { ok: false, code: 'INVARIANT_VIOLATION' };
    }

    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const listRequest = store.getAll();
            listRequest.onsuccess = () => {
                const tasks = Array.isArray(listRequest.result) ? listRequest.result : [];
                const cap = Number.parseInt(String(todayCap ?? ''), 10);
                const validCap = Number.isFinite(cap) && cap > 0 ? cap : 3;

                const toAdd = [];
                for (const id of ids) {
                    const task = tasks.find((item) => item?.id === id) ?? null;
                    if (!task) {
                        resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                        return;
                    }
                    if (task.todayIncluded === true) {
                        continue;
                    }
                    toAdd.push(task);
                }

                const currentTodayCount = tasks.filter((item) => item?.todayIncluded === true).length;
                if (currentTodayCount + toAdd.length > validCap) {
                    resolve({ ok: false, code: 'TODAY_CAP_EXCEEDED' });
                    return;
                }

                const nowIso = new Date().toISOString();
                const updates = toAdd.map((t) => ({
                    ...t,
                    todayIncluded: true,
                    updatedAt: nowIso,
                }));

                let writesDone = 0;
                const total = updates.length;
                const onWriteSuccess = () => {
                    writesDone += 1;
                    if (writesDone === total) {
                        resolve({ ok: true });
                    }
                };

                for (const u of updates) {
                    const req = store.put(u);
                    req.onsuccess = onWriteSuccess;
                    req.onerror = () => reject(new Error('Unable to save task.'));
                }

                if (total === 0) {
                    resolve({ ok: true });
                }
            };
            listRequest.onerror = () => reject(new Error('Unable to list Inbox tasks.'));
        });
    });
}

export async function swapTasksInToday(addTaskId, removeTaskId) {
    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const listRequest = store.getAll();
            listRequest.onsuccess = () => {
                const tasks = Array.isArray(listRequest.result) ? listRequest.result : [];
                const addTask = tasks.find((item) => item?.id === addTaskId) ?? null;
                const removeTask = tasks.find((item) => item?.id === removeTaskId) ?? null;
                if (!addTask || !removeTask) {
                    resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                    return;
                }
                if (removeTask.todayIncluded !== true) {
                    resolve({ ok: false, code: 'REMOVE_TASK_NOT_IN_TODAY' });
                    return;
                }

                const nowIso = new Date().toISOString();
                const removeUpdated = {
                    ...removeTask,
                    todayIncluded: false,
                    updatedAt: nowIso,
                };
                const addUpdated = {
                    ...addTask,
                    todayIncluded: true,
                    updatedAt: nowIso,
                };

                let writesDone = 0;
                const onWriteSuccess = () => {
                    writesDone += 1;
                    if (writesDone === 2) {
                        resolve({ ok: true });
                    }
                };

                const removeRequest = store.put(removeUpdated);
                removeRequest.onsuccess = onWriteSuccess;
                removeRequest.onerror = () => reject(new Error('Unable to save task.'));

                const addRequest = store.put(addUpdated);
                addRequest.onsuccess = onWriteSuccess;
                addRequest.onerror = () => reject(new Error('Unable to save task.'));
            };
            listRequest.onerror = () => reject(new Error('Unable to list Inbox tasks.'));
        });
    });
}

export async function removeTaskFromToday(taskId) {
    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const getRequest = store.get(taskId);
            getRequest.onsuccess = () => {
                const task = getRequest.result ?? null;
                if (!task) {
                    resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                    return;
                }
                if (task.todayIncluded !== true) {
                    resolve({ ok: false, code: 'REMOVE_TASK_NOT_IN_TODAY' });
                    return;
                }
                const updated = {
                    ...task,
                    todayIncluded: false,
                    updatedAt: new Date().toISOString(),
                };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => resolve({ ok: true, task: updated });
                putRequest.onerror = () => reject(new Error('Unable to save task.'));
            };
            getRequest.onerror = () => reject(new Error('Unable to load task.'));
        });
    });
}

export async function setTaskArea(taskId, areaId) {
    const area = String(areaId ?? '').trim().toLowerCase();
    if (area.length === 0) {
        return { ok: false, code: 'INVALID_AREA' };
    }
    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const getRequest = store.get(taskId);
            getRequest.onsuccess = () => {
                const task = getRequest.result ?? null;
                if (!task) {
                    resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                    return;
                }
                const updated = {
                    ...task,
                    area,
                    updatedAt: new Date().toISOString(),
                };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => resolve({ ok: true, task: updated });
                putRequest.onerror = () => reject(new Error('Unable to save task.'));
            };
            getRequest.onerror = () => reject(new Error('Unable to load task.'));
        });
    });
}

/**
 * Reschedule a task to a new temporal target.
 * Updates only scheduledFor and updatedAt; preserves id, title, createdAt, area, todayIncluded.
 *
 * @param {string} taskId
 * @param {string|null} scheduledFor - ISO date string (YYYY-MM-DD) or null to clear
 * @returns {Promise<{ok: boolean, code?: string, task?: object}>}
 */
export async function rescheduleTask(taskId, scheduledFor) {
    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const getRequest = store.get(taskId);
            getRequest.onsuccess = () => {
                const task = getRequest.result ?? null;
                if (!task) {
                    resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                    return;
                }
                const updated = {
                    ...task,
                    scheduledFor: scheduledFor ?? null,
                    updatedAt: new Date().toISOString(),
                };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => resolve({ ok: true, task: updated });
                putRequest.onerror = () => reject(new Error('Unable to save task.'));
            };
            getRequest.onerror = () => reject(new Error('Unable to load task.'));
        });
    });
}

/**
 * Reschedule multiple tasks atomically to one temporal target.
 * Updates only scheduledFor and updatedAt; preserves identity and structural fields.
 *
 * @param {string[]} taskIds
 * @param {string|null} scheduledFor
 * @returns {Promise<{ok: boolean, code?: string, taskIds?: string[], count?: number}>}
 */
export async function bulkRescheduleTasks(taskIds, scheduledFor) {
    const ids = Array.isArray(taskIds) ? [...taskIds] : [];
    if (ids.length === 0) {
        return { ok: false, code: 'INVARIANT_VIOLATION' };
    }

    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const listRequest = store.getAll();
            listRequest.onsuccess = () => {
                const tasks = Array.isArray(listRequest.result) ? listRequest.result : [];
                const selected = [];
                for (const id of ids) {
                    const task = tasks.find((item) => item?.id === id) ?? null;
                    if (!task) {
                        resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                        return;
                    }
                    selected.push(task);
                }

                const nowIso = new Date().toISOString();
                const originals = selected.map((task) => ({ ...task }));
                const updates = selected.map((task) => ({
                    ...task,
                    scheduledFor: scheduledFor ?? null,
                    updatedAt: nowIso,
                }));

                const rollback = () => {
                    let restored = 0;
                    const total = originals.length;
                    const onRestoreDone = () => {
                        restored += 1;
                        if (restored === total) {
                            resolve({ ok: false, code: 'INVARIANT_VIOLATION' });
                        }
                    };
                    for (const original of originals) {
                        const req = store.put(original);
                        req.onsuccess = onRestoreDone;
                        req.onerror = () => reject(new Error('Unable to rollback task.'));
                    }
                };

                const writeNext = (index) => {
                    if (index >= updates.length) {
                        resolve({
                            ok: true,
                            taskIds: updates.map((u) => u.id),
                            count: updates.length,
                        });
                        return;
                    }
                    const req = store.put(updates[index]);
                    req.onsuccess = () => writeNext(index + 1);
                    req.onerror = rollback;
                };

                writeNext(0);
            };
            listRequest.onerror = () => reject(new Error('Unable to list Inbox tasks.'));
        });
    });
}

export async function setTaskPaused(taskId) {
    return runTransaction('readwrite', (store) => {
        return new Promise((resolve, reject) => {
            const getRequest = store.get(taskId);
            getRequest.onsuccess = () => {
                const task = getRequest.result ?? null;
                if (!task) {
                    resolve({ ok: false, code: 'TASK_NOT_FOUND' });
                    return;
                }
                if (task.todayIncluded !== true) {
                    resolve({ ok: false, code: 'REMOVE_TASK_NOT_IN_TODAY' });
                    return;
                }
                const updated = {
                    ...task,
                    todayIncluded: false,
                    status: 'paused',
                    updatedAt: new Date().toISOString(),
                };
                const putRequest = store.put(updated);
                putRequest.onsuccess = () => resolve({ ok: true, task: updated });
                putRequest.onerror = () => reject(new Error('Unable to save task.'));
            };
            getRequest.onerror = () => reject(new Error('Unable to load task.'));
        });
    });
}

export async function listInboxTasks() {
    return runTransaction('readonly', (store) => {
        return new Promise((resolve, reject) => {
            const request = store.index('createdAt').getAll();
            request.onsuccess = () => {
                const items = request.result.slice().sort((a, b) => {
                    if (a.createdAt === b.createdAt) {
                        return a.id.localeCompare(b.id);
                    }
                    return a.createdAt < b.createdAt ? 1 : -1;
                });
                resolve(items);
            };
            request.onerror = () => reject(new Error('Unable to list Inbox tasks.'));
        });
    });
}
