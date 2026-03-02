/**
 * Accessibility baseline verification.
 *
 * This file verifies that axe-core + happy-dom are correctly integrated and
 * provides a reference pattern for writing a11y assertions in Epic 5 stories.
 *
 * NOT a full WCAG audit of the planning app. That belongs in individual story tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { checkA11y, formatViolations, a11yConfig } from './a11yCheck';

describe('a11y baseline: axe-core + happy-dom integration', () => {
    beforeEach(() => {
        // Required baseline for WCAG: every document needs lang and title.
        // Epic 5 tests MUST include this setup to avoid false document-level violations.
        document.documentElement.setAttribute('lang', 'en');
        document.head.innerHTML = '<title>Task-ino Planning</title>';
        document.body.innerHTML = '';
    });

    it('reports no violations for a well-formed form with label', async () => {
        document.body.innerHTML = `
            <main>
                <h1>Inbox</h1>
                <form>
                    <label for="task-input">Add task</label>
                    <input id="task-input" type="text" />
                    <button type="submit">Add</button>
                </form>
            </main>
        `;
        const violations = await checkA11y(document, a11yConfig.structural);
        expect(violations, formatViolations(violations)).toHaveLength(0);
    });

    it('detects missing label on input', async () => {
        document.body.innerHTML = `
            <main>
                <h1>Inbox</h1>
                <form>
                    <input type="text" />
                    <button type="submit">Add</button>
                </form>
            </main>
        `;
        const violations = await checkA11y(document, a11yConfig.structural);
        const labelViolation = violations.find((v) => v.id === 'label');
        expect(labelViolation).toBeDefined();
    });

    it('detects missing accessible name on button', async () => {
        document.body.innerHTML = `
            <main>
                <h1>Form</h1>
                <button></button>
            </main>
        `;
        const violations = await checkA11y(document, a11yConfig.structural);
        const buttonViolation = violations.find((v) => v.id === 'button-name');
        expect(buttonViolation).toBeDefined();
    });

    it('reports no violations for aria-live region used correctly', async () => {
        document.body.innerHTML = `
            <main>
                <h1>Status</h1>
                <p id="feedback" aria-live="polite"></p>
            </main>
        `;
        const violations = await checkA11y(document, a11yConfig.structural);
        expect(violations, formatViolations(violations)).toHaveLength(0);
    });

    it('detects invalid aria-role', async () => {
        document.body.innerHTML = `
            <main>
                <h1>Test</h1>
                <div role="invalid-role">Content</div>
            </main>
        `;
        const violations = await checkA11y(document, a11yConfig.structural);
        const ariaViolation = violations.find((v) => v.id === 'aria-roles');
        expect(ariaViolation).toBeDefined();
    });

    it('formatViolations returns readable string for non-empty violations', async () => {
        document.body.innerHTML = `
            <main>
                <h1>Test</h1>
                <button></button>
            </main>
        `;
        const violations = await checkA11y(document, a11yConfig.structural);
        const formatted = formatViolations(violations);
        expect(formatted).toContain('button-name');
    });

    it('formatViolations returns no-violation message for empty array', () => {
        const formatted = formatViolations([]);
        expect(formatted).toBe('No violations found.');
    });
});
