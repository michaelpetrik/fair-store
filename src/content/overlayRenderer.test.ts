/**
 * Tests for OverlayRenderer
 * 
 * Purpose: Verify that the warning overlay renders correctly and handles user interactions
 * 
 * Test Coverage:
 * - Overlay creation and DOM structure
 * - Proper application of styles
 * - Event listener attachment (close, ignore, toggle details)
 * - HTML escaping for security
 * - Multiple calls (idempotency)
 * - Overlay removal
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OverlayRenderer } from './overlayRenderer';

describe('OverlayRenderer', () => {
    let document: Document;
    let body: HTMLBodyElement;

    beforeEach(() => {
        // Setup DOM environment
        document = window.document;
        body = document.body;
        // Clear any existing content
        body.innerHTML = '';
    });

    afterEach(() => {
        // Cleanup
        body.innerHTML = '';
    });

    describe('render()', () => {
        it('should create and append overlay to body', () => {
            // Given: A renderer with basic config
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Rendering the overlay
            const element = renderer.render();

            // Then: Element should exist and be appended to body
            expect(element).toBeTruthy();
            expect(element?.id).toBe('test-overlay');
            expect(document.getElementById('test-overlay')).toBe(element);
            expect(body.contains(element)).toBe(true);
        });

        it('should return existing overlay on subsequent calls (idempotent)', () => {
            // Given: A renderer
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Rendering multiple times
            const first = renderer.render();
            const second = renderer.render();

            // Then: Should return the same element
            expect(first).toBe(second);
            // And only one overlay should exist in DOM
            expect(document.querySelectorAll('#test-overlay').length).toBe(1);
        });

        it('should return null when body is not available', () => {
            // Given: Document without body
            const mockDoc = {
                ...document,
                body: null,
            } as unknown as Document;

            const renderer = new OverlayRenderer(mockDoc, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Attempting to render
            const element = renderer.render();

            // Then: Should return null
            expect(element).toBeNull();
        });

        it('should apply custom styles', () => {
            // Given: Renderer with custom styles
            const customStyles = {
                'background-color': 'red',
                'font-size': '20px',
            };

            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: customStyles,
            });

            // When: Rendering
            const element = renderer.render();

            // Then: Custom styles should be applied
            expect(element?.style.backgroundColor).toBe('red');
            expect(element?.style.fontSize).toBe('20px');
        });
    });

    describe('HTML structure', () => {
        it('should create proper warning structure with all required elements', () => {
            // Given: Renderer
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
                domain: 'example.com',
                reason: 'Test reason',
            });

            // When: Rendering
            renderer.render();

            // Then: Should have all required elements
            expect(document.querySelector('.fair-store-warning-container')).toBeTruthy();
            expect(document.querySelector('.fair-store-warning-header')).toBeTruthy();
            expect(document.querySelector('.fair-store-warning-title')).toBeTruthy();
            expect(document.querySelector('.fair-store-warning-content')).toBeTruthy();
            expect(document.querySelector('.fair-store-warning-actions')).toBeTruthy();
            expect(document.querySelector('.fair-store-warning-footer')).toBeTruthy();
            expect(document.querySelector('#fair-store-close-tab')).toBeTruthy();
            expect(document.querySelector('#fair-store-ignore-warning')).toBeTruthy();
            expect(document.querySelector('#fair-store-toggle-details')).toBeTruthy();
        });

        it('should display custom domain in warning text', () => {
            // Given: Renderer with custom domain
            const testDomain = 'suspicious-site.com';
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
                domain: testDomain,
            });

            // When: Rendering
            renderer.render();

            // Then: Domain should appear in warning text
            const warningText = document.querySelector('.fair-store-warning-text');
            expect(warningText?.textContent).toContain(testDomain);
        });

        it('should display custom reason in details section', () => {
            // Given: Renderer with custom reason
            const testReason = 'Custom test reason for warning';
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
                reason: testReason,
            });

            // When: Rendering
            renderer.render();

            // Then: Reason should appear in the details content
            const reasonElement = document.querySelector('.fair-store-coi-reason p');
            expect(reasonElement?.textContent).toBe(testReason);
        });

        it('should use default domain when not provided', () => {
            // Given: Renderer without domain
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Rendering
            renderer.render();

            // Then: Should use window.location.hostname
            const warningText = document.querySelector('.fair-store-warning-text');
            expect(warningText?.textContent).toContain(window.location.hostname);
        });

        it('should use default reason when not provided', () => {
            // Given: Renderer without reason
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Rendering
            renderer.render();

            // Then: Should use default Czech message
            const reasonElement = document.querySelector('.fair-store-coi-reason p');
            expect(reasonElement?.textContent).toContain('České obchodní inspekce');
        });
    });

    describe('HTML escaping (security)', () => {
        it('should escape HTML in domain name to prevent XSS', () => {
            // Given: Malicious domain with script tag
            const maliciousDomain = '<script>alert("XSS")</script>evil.com';
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
                domain: maliciousDomain,
            });

            // When: Rendering
            renderer.render();

            // Then: Script tags should be escaped
            const warningText = document.querySelector('.fair-store-warning-text');
            expect(warningText?.innerHTML).toContain('&lt;script&gt;');
            expect(warningText?.innerHTML).toContain('&lt;/script&gt;');
            // And script should not execute
            expect(document.querySelectorAll('script').length).toBe(0);
        });

        it('should escape HTML in reason to prevent XSS', () => {
            // Given: Malicious reason with img tag
            const maliciousReason = '<img src=x onerror="alert(1)"> Test';
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
                reason: maliciousReason,
            });

            // When: Rendering
            renderer.render();

            // Then: HTML should be escaped
            const reasonElement = document.querySelector('.fair-store-coi-reason p');
            expect(reasonElement?.innerHTML).toContain('&lt;img');
            // And no img tag should exist in the reason section
            const reasonImg = document.querySelector('.fair-store-coi-reason img');
            expect(reasonImg).toBeNull();
        });

        it('should escape all dangerous HTML characters', () => {
            // Given: String with various HTML special characters
            const testString = '& < > " \' test';
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
                domain: testString,
            });

            // When: Rendering
            renderer.render();

            // Then: All characters should be escaped
            const warningText = document.querySelector('.fair-store-warning-text');
            const innerHTML = warningText?.innerHTML || '';
            expect(innerHTML).toContain('&amp;');
            expect(innerHTML).toContain('&lt;');
            expect(innerHTML).toContain('&gt;');
            expect(innerHTML).toContain('&quot;');
            expect(innerHTML).toContain('&#039;');
        });
    });

    describe('Event handlers', () => {
        it('should call remove() when ignore button is clicked', () => {
            // Given: Renderer and overlay
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });
            renderer.render();

            // When: Clicking ignore button
            const ignoreBtn = document.querySelector('#fair-store-ignore-warning') as HTMLButtonElement;
            expect(ignoreBtn).toBeTruthy();
            ignoreBtn.click();

            // Then: Overlay should be removed
            expect(document.getElementById('test-overlay')).toBeNull();
        });

        it('should toggle details section when toggle button is clicked', () => {
            // Given: Renderer and overlay
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });
            renderer.render();

            const toggleBtn = document.querySelector('#fair-store-toggle-details') as HTMLButtonElement;
            const detailsContent = document.querySelector('#fair-store-details-content') as HTMLElement;
            const chevron = document.querySelector('.fair-store-chevron') as HTMLElement;

            // When: Initially collapsed
            expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
            expect(detailsContent.classList.contains('expanded')).toBe(false);

            // When: First click (expand)
            toggleBtn.click();

            // Then: Should expand
            expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
            expect(detailsContent.classList.contains('expanded')).toBe(true);
            expect(chevron.style.transform).toBe('rotate(180deg)');

            // When: Second click (collapse)
            toggleBtn.click();

            // Then: Should collapse
            expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
            expect(detailsContent.classList.contains('expanded')).toBe(false);
            expect(chevron.style.transform).toBe('rotate(0deg)');
        });

        it('should attempt to close tab when close button is clicked', () => {
            // Given: Mock window.close and window.history
            const originalClose = window.close;
            const originalHistory = window.history;

            const mockClose = vi.fn();
            window.close = mockClose;

            const mockBack = vi.fn();
            Object.defineProperty(window, 'history', {
                value: {
                    back: mockBack,
                    length: 2
                },
                writable: true,
            });

            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });
            renderer.render();

            // When: Clicking close button
            const closeBtn = document.querySelector('#fair-store-close-tab') as HTMLButtonElement;
            closeBtn.click();

            // Then: Should attempt to close window
            expect(mockClose).toHaveBeenCalled();

            // Cleanup
            window.close = originalClose;
            Object.defineProperty(window, 'history', {
                value: originalHistory,
                writable: true,
            });
        });
    });

    describe('remove()', () => {
        it('should remove overlay from DOM', () => {
            // Given: Rendered overlay
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });
            const element = renderer.render();
            expect(document.getElementById('test-overlay')).toBe(element);

            // When: Removing
            renderer.remove();

            // Then: Should be removed from DOM
            expect(document.getElementById('test-overlay')).toBeNull();
            expect(body.contains(element)).toBe(false);
        });

        it('should handle multiple remove calls gracefully', () => {
            // Given: Rendered overlay
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });
            renderer.render();

            // When: Removing multiple times
            renderer.remove();
            renderer.remove();
            renderer.remove();

            // Then: Should not throw error
            expect(document.getElementById('test-overlay')).toBeNull();
        });

        it('should allow re-rendering after removal', () => {
            // Given: Renderer
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Render, remove, render again
            const first = renderer.render();
            renderer.remove();
            const second = renderer.render();

            // Then: Should create new element
            expect(second).toBeTruthy();
            expect(second?.id).toBe('test-overlay');
            expect(document.getElementById('test-overlay')).toBe(second);
            // Note: first and second are different elements
            expect(first).not.toBe(second);
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            // Given: Renderer
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });

            // When: Rendering
            renderer.render();

            // Then: Toggle button should have aria-expanded
            const toggleBtn = document.querySelector('#fair-store-toggle-details');
            expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
        });

        it('should update aria-expanded when toggling details', () => {
            // Given: Rendered overlay
            const renderer = new OverlayRenderer(document, {
                id: 'test-overlay',
                styles: {},
            });
            renderer.render();
            const toggleBtn = document.querySelector('#fair-store-toggle-details') as HTMLButtonElement;

            // When: Clicking toggle
            toggleBtn.click();

            // Then: aria-expanded should update
            expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

            // When: Clicking again
            toggleBtn.click();

            // Then: Should toggle back
            expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
        });
    });
});
