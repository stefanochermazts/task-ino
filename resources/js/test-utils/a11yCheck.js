/**
 * Accessibility check utility for Vitest + happy-dom.
 *
 * Wraps axe-core for use in unit/integration tests. Provides a consistent API
 * for running WCAG 2.1 AA automated checks against DOM elements or the full document.
 *
 * Usage:
 *   import { checkA11y, a11yConfig } from '../../test-utils/a11yCheck';
 *   const violations = await checkA11y(document.querySelector('#my-section'));
 *   expect(violations).toHaveLength(0);
 *
 * Known limitations with happy-dom:
 *   - axe-core rules that rely on computed CSS layout (e.g. color-contrast) cannot
 *     run accurately in happy-dom. Use `a11yConfig.noLayoutRules` to exclude them.
 *   - Rules requiring real browser rendering must be validated with browser-based tools
 *     (e.g. Playwright + @axe-core/playwright) in a separate test layer.
 */
import axe from 'axe-core';

/**
 * Preset axe configurations for common scenarios.
 */
export const a11yConfig = {
    /**
     * Standard WCAG 2.1 AA check excluding layout-dependent rules that
     * cannot be evaluated accurately in happy-dom.
     */
    wcag21aa: {
        runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
        rules: {
            // Requires computed CSS — not reliable in happy-dom
            'color-contrast': { enabled: false },
        },
    },

    /**
     * Structural checks only: landmarks, headings, labels, ARIA attributes.
     * Most reliable in happy-dom as they do not depend on CSS rendering.
     */
    structural: {
        runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag21a'],
        },
        rules: {
            'color-contrast': { enabled: false },
        },
    },
};

/**
 * Run axe accessibility check on a DOM element or the full document.
 *
 * @param {Element|Document} context - DOM node to scan (defaults to document)
 * @param {object} [config] - axe configuration object (use a11yConfig preset or custom)
 * @returns {Promise<import('axe-core').Result[]>} Array of violations (empty = accessible)
 */
export async function checkA11y(context = document, config = a11yConfig.structural) {
    const results = await axe.run(context, config);
    return results.violations;
}

/**
 * Format axe violations into a readable string for test failure messages.
 *
 * @param {import('axe-core').Result[]} violations
 * @returns {string}
 */
export function formatViolations(violations) {
    if (violations.length === 0) return 'No violations found.';
    return violations
        .map((v) => `[${v.impact?.toUpperCase() ?? 'UNKNOWN'}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join(', ')}`)
        .join('\n\n');
}
