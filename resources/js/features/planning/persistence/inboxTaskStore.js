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
