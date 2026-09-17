'use client';

/**
 * RAWAQA UI/UX foundation.
 * Presentation-only: does not change API, auth, cart, checkout, orders, or database logic.
 */
export default function RAWAQAUxFoundation() {
  return (
    <style jsx global>{`
      :root {
        --ux-content-max: 1240px;
        --ux-radius-sm: 12px;
        --ux-radius-md: 18px;
        --ux-radius-lg: 28px;
        --ux-focus: color-mix(in srgb, var(--gold, #c9a45c) 70%, white);
        --ux-shadow-card: 0 12px 38px rgba(0, 0, 0, 0.09);
      }

      html {
        scroll-behavior: smooth;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }

      body { overflow-x: hidden; }

      ::selection {
        background: color-mix(in srgb, var(--gold, #c9a45c) 32%, transparent);
      }

      :where(a, button, input, select, textarea, summary):focus-visible {
        outline: 3px solid var(--ux-focus);
        outline-offset: 3px;
      }

      :where(button, [role='button'], a) {
        -webkit-tap-highlight-color: transparent;
      }

      :where(button) { cursor: pointer; }
      :where(input, select, textarea) { font: inherit; }
      :where(img) { max-width: 100%; }

      .ux-wrap {
        width: min(100% - 32px, var(--ux-content-max));
        margin-inline: auto;
      }

      @media (min-width: 768px) {
        .ux-wrap { width: min(100% - 64px, var(--ux-content-max)); }
      }

      @media (hover: hover) and (pointer: fine) {
        :where([class*='product-card'], [class*='ProductCard']) {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        :where([class*='product-card'], [class*='ProductCard']):hover {
          transform: translateY(-3px);
          box-shadow: var(--ux-shadow-card);
        }
      }

      :where(input, select, textarea) {
        transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
      }

      :where(input, select, textarea):focus {
        border-color: var(--gold, #c9a45c);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold, #c9a45c) 14%, transparent);
      }

      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
          scroll-behavior: auto !important;
        }
      }
    `}</style>
  );
}
