export const DEFAULT_TODAY_CAP = 3;

function parseTodayCap(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_TODAY_CAP;
    }
    return parsed;
}

export function isValidTaskRecord(task) {
    const id = String(task?.id ?? '').trim();
    const title = String(task?.title ?? '').trim();
    if (!id || !title) {
        return false;
    }
    return true;
}

function parseCreatedAt(task) {
    const timestamp = Date.parse(String(task?.createdAt ?? ''));
    return Number.isFinite(timestamp) ? timestamp : 0;
}

export function computeTodayProjection({ tasks, todayCap }) {
    const cap = parseTodayCap(todayCap);
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    const eligible = safeTasks
        .filter((task) => task?.todayIncluded === true)
        .filter((task) => isValidTaskRecord(task))
        .slice()
        .sort((a, b) => {
            const aCreatedAt = parseCreatedAt(a);
            const bCreatedAt = parseCreatedAt(b);
            if (aCreatedAt === bCreatedAt) {
                return String(a.id).localeCompare(String(b.id));
            }
            return bCreatedAt - aCreatedAt;
        });

    return {
        items: eligible.slice(0, cap),
        totalEligible: eligible.length,
        cap,
    };
}
