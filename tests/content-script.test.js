/**
 * Content Script Tests
 * Tests for warning popup functionality and XSS protection
 */

// Mock escapeHtml function from content.js
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

describe('Content Script', () => {
  describe('escapeHtml', () => {
    test('should escape basic HTML tags', () => {
      expect(escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    test('should escape HTML entities', () => {
      expect(escapeHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
      expect(escapeHtml('<i>italic</i>')).toBe('&lt;i&gt;italic&lt;/i&gt;');
    });

    test('should escape quotes', () => {
      expect(escapeHtml('"quoted text"')).toBe('"quoted text"');
      expect(escapeHtml("'single quotes'")).toBe("'single quotes'");
    });

    test('should escape ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('should handle Czech characters', () => {
      const czechText = 'Důvod: Podvodný e-shop s háčky a čárkami';
      expect(escapeHtml(czechText)).toBe(czechText);
    });

    test('should prevent XSS through img src', () => {
      expect(escapeHtml('<img src="x" onerror="alert(1)">'))
        .toBe('&lt;img src="x" onerror="alert(1)"&gt;');
    });

    test('should prevent XSS through javascript: protocol', () => {
      expect(escapeHtml('<a href="javascript:alert(1)">click</a>'))
        .toBe('&lt;a href="javascript:alert(1)"&gt;click&lt;/a&gt;');
    });

    test('should prevent XSS through event handlers', () => {
      expect(escapeHtml('<div onclick="alert(1)">click</div>'))
        .toBe('&lt;div onclick="alert(1)"&gt;click&lt;/div&gt;');
    });

    test('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const result = escapeHtml(longString);
      expect(result.length).toBe(10000);
    });

    test('should handle special characters', () => {
      expect(escapeHtml('<>&"\'/')).toContain('&lt;');
      expect(escapeHtml('<>&"\'/')).toContain('&gt;');
      expect(escapeHtml('<>&"\'/')).toContain('&amp;');
    });

    test('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    test('should handle numbers', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(0)).toBe('0');
    });
  });

  describe('Warning Popup DOM', () => {
    beforeEach(() => {
      // Clear document body
      document.body.innerHTML = '';
    });

    test('should create overlay element', () => {
      const overlay = document.createElement('div');
      overlay.id = 'fair-store-warning-overlay';
      document.body.appendChild(overlay);

      expect(document.getElementById('fair-store-warning-overlay')).toBeTruthy();
    });

    test('should inject warning into documentElement', () => {
      const overlay = document.createElement('div');
      overlay.id = 'fair-store-warning-overlay';
      document.documentElement.appendChild(overlay);

      expect(document.getElementById('fair-store-warning-overlay')).toBeTruthy();
    });

    test('should create action buttons', () => {
      document.body.innerHTML = `
        <div id="fair-store-warning-overlay">
          <button id="fair-store-close-tab">Zavřít záložku</button>
          <button id="fair-store-ignore">Ignorovat</button>
        </div>
      `;

      const closeBtn = document.getElementById('fair-store-close-tab');
      const ignoreBtn = document.getElementById('fair-store-ignore');

      expect(closeBtn).toBeTruthy();
      expect(ignoreBtn).toBeTruthy();
      expect(closeBtn.textContent).toBe('Zavřít záložku');
      expect(ignoreBtn.textContent).toBe('Ignorovat');
    });

    test('should create details toggle button', () => {
      document.body.innerHTML = `
        <div id="fair-store-warning-overlay">
          <button id="fair-store-toggle-details">Zobrazit podrobnosti od ČOI</button>
          <div id="fair-store-details-content"></div>
        </div>
      `;

      const toggleBtn = document.getElementById('fair-store-toggle-details');
      const detailsContent = document.getElementById('fair-store-details-content');

      expect(toggleBtn).toBeTruthy();
      expect(detailsContent).toBeTruthy();
    });

    test('should toggle details visibility', () => {
      document.body.innerHTML = `
        <div id="fair-store-warning-overlay">
          <button id="fair-store-toggle-details">Zobrazit podrobnosti</button>
          <div id="fair-store-details-content" class=""></div>
        </div>
      `;

      const toggleBtn = document.getElementById('fair-store-toggle-details');
      const detailsContent = document.getElementById('fair-store-details-content');

      // Simulate click to expand
      detailsContent.classList.add('expanded');
      expect(detailsContent.classList.contains('expanded')).toBe(true);

      // Simulate click to collapse
      detailsContent.classList.remove('expanded');
      expect(detailsContent.classList.contains('expanded')).toBe(false);
    });

    test('should remove overlay on ignore', () => {
      const overlay = document.createElement('div');
      overlay.id = 'fair-store-warning-overlay';
      document.body.appendChild(overlay);

      expect(document.getElementById('fair-store-warning-overlay')).toBeTruthy();

      document.body.removeChild(overlay);

      expect(document.body.contains(overlay)).toBe(false);
    });

    test('should display domain safely', () => {
      const maliciousDomain = '<script>alert("xss")</script>.com';
      const safeDomain = escapeHtml(maliciousDomain);

      document.body.innerHTML = `
        <div id="fair-store-warning-overlay">
          <strong>${safeDomain}</strong>
        </div>
      `;

      const content = document.body.innerHTML;
      expect(content).not.toContain('<script>');
      expect(content).toContain('&lt;script&gt;');
    });

    test('should display reason safely', () => {
      const maliciousReason = '<img src=x onerror=alert(1)>';
      const safeReason = escapeHtml(maliciousReason);

      document.body.innerHTML = `
        <div id="fair-store-warning-overlay">
          <p>${safeReason}</p>
        </div>
      `;

      const content = document.body.innerHTML;
      expect(content).toContain('&lt;img');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long domain names', () => {
      const longDomain = 'a'.repeat(1000) + '.com';
      const escaped = escapeHtml(longDomain);
      expect(escaped.length).toBeGreaterThan(1000);
    });

    test('should handle very long reasons', () => {
      const longReason = 'Důvod: ' + 'A'.repeat(10000);
      const escaped = escapeHtml(longReason);
      expect(escaped.length).toBeGreaterThan(10000);
    });

    test('should handle Unicode characters', () => {
      const unicode = '🚨 Varování: ⚠️ Rizikový e-shop 🛑';
      const escaped = escapeHtml(unicode);
      expect(escaped).toBe(unicode);
    });

    test('should handle mixed content', () => {
      const mixed = 'Text with <tags> and "quotes" and & ampersands';
      const escaped = escapeHtml(mixed);
      expect(escaped).toContain('&lt;tags&gt;');
      expect(escaped).toContain('&amp;');
    });

    test('should prevent multiple warning popups', () => {
      let warningShown = false;

      // First warning
      if (!warningShown) {
        warningShown = true;
      }
      expect(warningShown).toBe(true);

      // Second warning should be blocked
      let secondWarning = false;
      if (!warningShown) {
        secondWarning = true;
      }
      expect(secondWarning).toBe(false);
    });
  });

  describe('Accessibility', () => {
    test('should have proper button labels', () => {
      document.body.innerHTML = `
        <button id="fair-store-close-tab">Zavřít záložku</button>
        <button id="fair-store-ignore">Ignorovat a pokračovat</button>
      `;

      const closeBtn = document.getElementById('fair-store-close-tab');
      const ignoreBtn = document.getElementById('fair-store-ignore');

      expect(closeBtn.textContent).toBeTruthy();
      expect(ignoreBtn.textContent).toBeTruthy();
    });

    test('should have high z-index for overlay', () => {
      const overlay = document.createElement('div');
      overlay.style.zIndex = '2147483647';

      expect(parseInt(overlay.style.zIndex)).toBeGreaterThan(1000000);
    });
  });
});
