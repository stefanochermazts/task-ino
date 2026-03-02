import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildExportPayload,
    serializeExportPayload,
    validateExportTasks,
} from './exportPlanningData';

describe('exportPlanningData', () => {
    describe('buildExportPayload', () => {
        it('includes version, exportedAt, and reconstructionMetadata', () => {
            const payload = buildExportPayload({
                tasks: [],
                areas: ['inbox', 'work'],
                todayCap: 5,
                lastPlanningDate: '2026-03-02',
            });

            expect(payload.version).toBe(1);
            expect(typeof payload.exportedAt).toBe('string');
            expect(payload.reconstructionMetadata).toEqual({
                todayCap: 5,
                lastPlanningDate: '2026-03-02',
                areas: ['inbox', 'work'],
            });
            expect(Array.isArray(payload.tasks)).toBe(true);
        });

        it('includes full task state with todayIncluded and area', () => {
            const tasks = [
                {
                    id: 't1',
                    title: 'Task one',
                    area: 'work',
                    todayIncluded: true,
                    createdAt: '2026-03-01T10:00:00.000Z',
                    updatedAt: '2026-03-02T09:00:00.000Z',
                    scheduledFor: '2026-03-10',
                    retainedFor: null,
                    status: null,
                },
            ];

            const payload = buildExportPayload({
                tasks,
                areas: ['inbox', 'work'],
                todayCap: 3,
                lastPlanningDate: null,
            });

            expect(payload.tasks).toHaveLength(1);
            expect(payload.tasks[0]).toEqual({
                id: 't1',
                title: 'Task one',
                area: 'work',
                todayIncluded: true,
                createdAt: '2026-03-01T10:00:00.000Z',
                updatedAt: '2026-03-02T09:00:00.000Z',
                scheduledFor: '2026-03-10',
                retainedFor: null,
                status: null,
            });
        });

        it('uses deterministic field naming for reconstruction', () => {
            const payload = buildExportPayload({
                tasks: [{ id: 'x', title: 'X', area: 'inbox', todayIncluded: false }],
                areas: ['inbox'],
                todayCap: 3,
                lastPlanningDate: '2026-02-28',
            });

            expect(payload).toHaveProperty('version');
            expect(payload).toHaveProperty('exportedAt');
            expect(payload).toHaveProperty('reconstructionMetadata');
            expect(payload).toHaveProperty('tasks');
            expect(payload.reconstructionMetadata).toHaveProperty('todayCap');
            expect(payload.reconstructionMetadata).toHaveProperty('lastPlanningDate');
            expect(payload.reconstructionMetadata).toHaveProperty('areas');
        });

        it('handles empty or invalid inputs gracefully', () => {
            const payload = buildExportPayload({
                tasks: null,
                areas: null,
                todayCap: 0,
                lastPlanningDate: undefined,
            });

            expect(payload.tasks).toEqual([]);
            expect(payload.reconstructionMetadata.todayCap).toBe(3);
            expect(payload.reconstructionMetadata.lastPlanningDate).toBeNull();
            expect(payload.reconstructionMetadata.areas).toEqual([]);
        });
    });

    describe('serializeExportPayload', () => {
        it('produces human-readable JSON with indentation', () => {
            const payload = { version: 1, tasks: [], exportedAt: '2026-03-02T12:00:00.000Z' };
            const json = serializeExportPayload(payload);

            expect(typeof json).toBe('string');
            expect(json).toContain('  ');
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe(1);
        });
    });

    describe('validateExportTasks', () => {
        it('accepts valid task records', () => {
            const result = validateExportTasks([
                { id: 't1', title: 'Valid title' },
                { id: 't2', title: 'Another valid title' },
            ]);

            expect(result).toEqual({ ok: true });
        });

        it('rejects non-array tasks input', () => {
            const result = validateExportTasks(null);

            expect(result.ok).toBe(false);
            expect(result.code).toBe('EXPORT_INVALID_TASKS');
        });

        it('rejects malformed task records with missing id/title', () => {
            const result = validateExportTasks([
                { id: 't1', title: 'Valid title' },
                { id: '', title: 'Missing id' },
            ]);

            expect(result.ok).toBe(false);
            expect(result.code).toBe('EXPORT_INVALID_TASKS');
        });
    });
});
