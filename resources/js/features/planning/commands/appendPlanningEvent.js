/**
 * Append a planning/sync event to the append-only log.
 * Fire-and-forget: never await in mutation hot path; use .catch(console.error).
 *
 * @param {object} entry - { timestamp, event_type, entity_id, device_id?, idempotency_key?, payload_version?, payload? }
 * @param {{ indexedDB?: IDBFactory }} [options]
 * @returns {Promise<{ok: boolean, id?: number, code?: string, message?: string}>}
 */

import { appendEvent } from '../persistence/eventLogStore';

function hasRequiredFields(entry) {
    if (!entry || typeof entry !== 'object') return false;
    const ts = String(entry.timestamp ?? '').trim();
    const type = String(entry.event_type ?? '').trim();
    const eid = String(entry.entity_id ?? '').trim();
    return ts.length > 0 && type.length > 0 && eid.length > 0;
}

export async function appendPlanningEvent(entry, options = {}) {
    if (!hasRequiredFields(entry)) {
        return {
            ok: false,
            code: 'EVENT_LOG_WRITE_FAILED',
            message: 'Event log requires timestamp, event_type, and entity_id.',
        };
    }

    try {
        const id = await appendEvent(
            {
                timestamp: entry.timestamp,
                event_type: entry.event_type,
                entity_id: entry.entity_id,
                device_id: entry.device_id ?? null,
                idempotency_key: entry.idempotency_key ?? null,
                payload_version: entry.payload_version ?? 1,
                payload: entry.payload ?? {},
            },
            options,
        );
        return { ok: true, id };
    } catch (err) {
        return {
            ok: false,
            code: 'EVENT_LOG_WRITE_FAILED',
            message: err?.message ?? 'Event log write failed.',
        };
    }
}
