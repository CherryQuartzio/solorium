// Dark mode + theme font for Ghost's built-in apps (Sodo-Search and Portal).
//
// Why this file exists:
//   * The search modal (Sodo-Search) and the account/subscription dialogs (Portal)
//     are separate Ghost apps. Each renders into a SAME-ORIGIN <iframe> that Ghost
//     appends to <body> (#sodo-search-root and #ghost-portal-root respectively).
//   * Neither app ships dark mode, and both use their own (system) font, so by default
//     they stay light-on-white and off-font even when the rest of the theme is dark.
//   * Because the iframes are same-origin, we can reach into iframe.contentDocument and
//     append a <style> of our own (the existing search.js already relies on this access).
//
// What we do:
//   * Inject the theme font into every such iframe (in BOTH light and dark mode).
//   * In dark mode, inject colour overrides:
//       - Sodo-Search is built with Tailwind utilities, so we override the specific
//         utility classes it renders (bg-white, text-neutral-*, border-*, etc.).
//       - Portal is driven entirely by CSS custom properties (--white, --grey0..14),
//         so we simply remap those variables and the whole UI follows.
//   * We re-apply on theme toggle (watching <html> class changes) and whenever an
//     iframe is (re)created, since both modals destroy/recreate their iframe per open.

(function () {
    var STYLE_ID = 'solo-iframe-theme';
    var FONT_ID = 'solo-iframe-font';
    // Same Google Fonts request the main document uses (see default.hbs); falls back to
    // locally installed Manrope and then the system stack.
    var FONT_HREF = 'https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap';

    var iframes = []; // {el, kind: 'search' | 'portal'}

    // The theme is "dark" whenever its background is dark enough to need light text.
    // theme-head.js sets `has-light-text` on <html> for both manual-dark and system-dark,
    // and recomputes it on every toggle, so it is the single source of truth here.
    function isDark() {
        return document.documentElement.classList.contains('has-light-text');
    }

    function rootStyle(prop, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
        return v || fallback;
    }

    function fontStack() {
        return rootStyle('--font-sans', "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif");
    }

    // The page's actual rendered background as [r, g, b]. We read the resolved
    // backgroundColor of <body> (always an "rgb(...)" string) rather than the
    // --background-color custom property, because the property may hand back an
    // unresolved "var(--dark-mode-background-color)" that means nothing inside the iframe.
    function pageBgRgb() {
        var c = getComputedStyle(document.body).backgroundColor || '';
        var m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (!m) {
            return [28, 28, 28];
        }
        return [+m[1], +m[2], +m[3]];
    }

    // An elevated surface for the modals: the page background lightened ~14% toward white,
    // so the menu reads as a distinct dark-gray panel rather than blending into the page.
    function elevatedRgb() {
        return pageBgRgb().map(function (ch) {
            return Math.min(255, Math.round(ch + (255 - ch) * 0.14));
        });
    }

    function surfaceColor() {
        return 'rgb(' + elevatedRgb().join(', ') + ')';
    }

    // "r, g, b" triple (for the few Portal rules that build colours from a raw triple).
    function surfaceRgbTriple() {
        return elevatedRgb().join(', ');
    }

    // A dark-mode-friendly accent: the site accent colour brightened by +60 per channel when
    // it is too dim to read on a dark background. This is the same adjustment theme-head.js
    // applies to in-content links/code, kept in sync so thin accent-coloured UI (e.g. Portal's
    // "Sign up" link) stays legible. A bright-enough accent is returned unchanged.
    function brightenedAccent() {
        var raw = rootStyle('--ghost-accent-color', '');
        var hex = raw.replace('#', '').trim();
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length !== 6) {
            return raw || '#ee5b6f';
        }
        var r = parseInt(hex.slice(0, 2), 16);
        var g = parseInt(hex.slice(2, 4), 16);
        var b = parseInt(hex.slice(4, 6), 16);
        var yiq = (r * 299 + g * 587 + b * 114) / 1000;
        if (yiq >= 128) {
            return '#' + hex;
        }
        return 'rgb(' + Math.min(255, r + 60) + ', ' + Math.min(255, g + 60) + ', ' + Math.min(255, b + 60) + ')';
    }

    function searchCss(dark) {
        var font = 'html, body, input, button { font-family: ' + fontStack() + ' !important; }';
        if (!dark) {
            return font;
        }
        var bg = surfaceColor();
        // NB: we deliberately do NOT set `color-scheme: dark` on the iframe. The parent site
        // keeps the default (light) color-scheme, so forcing the iframe to dark creates a
        // scheme MISMATCH, which makes the browser give the iframe an opaque canvas and kills
        // the backdrop blur (it has nothing behind it to blur). Instead we keep the canvas
        // transparent and neutralise the only stray light surface — the input background.
        return font + [
            'html, body { background: transparent !important; color: rgba(255, 255, 255, 0.92) !important; }',
            // Modal surface
            '.bg-white { background-color: ' + bg + ' !important; }',
            // Selected (keyboard-navigated) result row
            '.bg-neutral-100 { background-color: rgba(255, 255, 255, 0.07) !important; }',
            // Author avatar fallback chip
            '.bg-neutral-200, .bg-neutral-300 { background-color: rgba(255, 255, 255, 0.16) !important; }',
            // Primary text (titles, search icon, query echo)
            '.text-neutral-900, .text-neutral-800, .text-black { color: rgba(255, 255, 255, 0.92) !important; }',
            // Secondary / muted text (section labels, excerpts, "no matches", cancel)
            '.text-neutral-500, .text-neutral-400, .text-gray-400 { color: rgba(255, 255, 255, 0.5) !important; }',
            // Input: drop the UA field background (the stray light box) and let the panel show
            'input { background-color: transparent !important; color: rgba(255, 255, 255, 0.92) !important; }',
            'input::placeholder { color: rgba(255, 255, 255, 0.4) !important; }',
            // Section dividers and the "show more" button outline
            '.border-gray-200, .border-neutral-200, .border-neutral-300 { border-color: rgba(255, 255, 255, 0.12) !important; }',
            // Hover states
            '.hover\\:text-black:hover { color: #fff !important; }',
            '.hover\\:text-neutral-500:hover { color: rgba(255, 255, 255, 0.7) !important; }',
            '.hover\\:border-neutral-300:hover { border-color: rgba(255, 255, 255, 0.25) !important; }',
            // Deepen the drop shadow so the modal still reads as elevated on a dark page
            '.shadow, .shadow-xl { box-shadow: 0 12px 50px rgba(0, 0, 0, 0.55) !important; }'
        ].join('\n');
    }

    function portalCss(dark) {
        var font = [
            'body, button, button span, input, textarea,',
            'h1, h2, h3, h4, h5, h6, .gh-portal-btn, .gh-portal-btn-text {',
            '  font-family: ' + fontStack() + ' !important;',
            '}'
        ].join('\n');
        if (!dark) {
            return font;
        }
        var bg = surfaceColor();
        var accent = brightenedAccent();
        // Portal builds its entire palette from these variables. We invert the neutral ramp
        // (grey0 was darkest -> now lightest, and so on) and map the white surfaces to the
        // site background. `--black`/`--blackrgb` are intentionally NOT remapped: Portal uses
        // the rgb form only for drop shadows and the dim backdrop behind the modal, which
        // should stay dark in both modes.
        return font + [
            ':root {',
            '  --white: ' + bg + ';',
            '  --whitergb: ' + surfaceRgbTriple() + ';',
            '  --black: #fff;',
            '  --grey0: #fafafa;',
            '  --grey1: #f2f2f2;',
            '  --grey1rgb: 242, 242, 242;',
            '  --grey2: #e6e6e6;',
            '  --grey3: #d4d4d4;',
            '  --grey4: #bdbdbd;',
            '  --grey5: #a3a3a3;',
            '  --grey6: #8a8a8a;',
            '  --grey7: #717171;',
            '  --grey8: #5c5c5c;',
            '  --grey9: #4a4a4a;',
            '  --grey10: #3d3d3d;',
            '  --grey11: #353535;',
            '  --grey12: #2d2d2d;',
            '  --grey13: #262626;',
            '  --grey13rgb: 38, 38, 38;',
            '  --grey14: #1f1f1f;',
            // Brighten the accent so accent-coloured text that DOES use this variable (in-content
            // links, list actions, branded buttons) reads on dark. The primary button keeps its
            // original colour: its background is an inline style built from the raw brand value,
            // not this variable, so white-on-button contrast is preserved.
            '  --brandcolor: ' + accent + ';',
            '}',
            // Strengthen the popup elevation against a dark page.
            '.gh-portal-popup-container { box-shadow: 0 12px 60px rgba(0, 0, 0, 0.7) !important; }',
            // The close (X) icon is a thin grey stroke (var(--grey6)); lift its contrast so it
            // is easy to spot, matching the brighter-stroke treatment elsewhere in dark mode.
            '.gh-portal-closeicon { color: rgba(255, 255, 255, 0.6) !important; }',
            '.gh-portal-closeicon:hover { color: rgba(255, 255, 255, 0.9) !important; }',
            // The switch link ("Sign in"/"Sign up") and the "Back" button (label + its
            // currentColor arrow) set their colour via an inline style using the RAW accent, so
            // the variable above can't reach them. Override with the brightened accent (a
            // stylesheet !important beats a non-important inline style).
            '.gh-portal-btn-link, .gh-portal-btn-back { color: ' + accent + ' !important; }',
            // Benefit checkmarks ship a hard-coded dark stroke (#222) baked into the SVG, so they
            // vanish on dark. Force a light stroke so they read as "inverted".
            '.gh-portal-benefit-checkmark path, .gh-portal-benefit-checkmark polyline { stroke: rgba(255, 255, 255, 0.85) !important; }'
        ].join('\n');
    }

    function cssFor(kind, dark) {
        return kind === 'search' ? searchCss(dark) : portalCss(dark);
    }

    function injectInto(doc, kind) {
        if (!doc || !doc.head) {
            return;
        }
        if (!doc.getElementById(FONT_ID)) {
            var link = doc.createElement('link');
            link.id = FONT_ID;
            link.rel = 'stylesheet';
            link.href = FONT_HREF;
            doc.head.appendChild(link);
        }
        var style = doc.getElementById(STYLE_ID);
        if (!style) {
            style = doc.createElement('style');
            style.id = STYLE_ID;
        }
        style.textContent = cssFor(kind, isDark());
        // Keep our overrides last in <head> so they win over the app's own styles, even if
        // the app appends more styles after we first run.
        doc.head.appendChild(style);
    }

    function apply(entry) {
        try {
            injectInto(entry.el.contentDocument, entry.kind);
        } catch (e) {
            // Cross-origin or torn-down iframe: nothing we can do, skip silently.
        }
    }

    function track(iframe, kind) {
        if (iframe.soloThemed) {
            return;
        }
        iframe.soloThemed = true;
        var entry = {el: iframe, kind: kind};
        iframes.push(entry);
        apply(entry); // in case it is already loaded
        iframe.addEventListener('load', function () {
            apply(entry);
        });
        // Re-assert our <style> as the last head child if the app mutates its own head later.
        iframe.addEventListener('load', function () {
            try {
                var head = iframe.contentDocument && iframe.contentDocument.head;
                if (!head) {
                    return;
                }
                new MutationObserver(function () {
                    var style = iframe.contentDocument.getElementById(STYLE_ID);
                    if (style && head.lastChild !== style) {
                        head.appendChild(style);
                    }
                }).observe(head, {childList: true});
            } catch (e) {}
        });
    }

    function watchRoot(root, kind) {
        function bindAll() {
            var found = root.querySelectorAll('iframe');
            for (var i = 0; i < found.length; i++) {
                track(found[i], kind);
            }
            // Modal closed: drop torn-down iframes so we don't keep stale references.
            iframes = iframes.filter(function (e) {
                return e.el.isConnected;
            });
        }
        bindAll();
        new MutationObserver(bindAll).observe(root, {childList: true, subtree: true});
    }

    var ROOTS = [
        {id: 'sodo-search-root', kind: 'search'},
        {id: 'ghost-portal-root', kind: 'portal'}
    ];

    function init() {
        var pending = ROOTS.slice();

        function tryBind() {
            pending = pending.filter(function (r) {
                var el = document.getElementById(r.id);
                if (el) {
                    watchRoot(el, r.kind);
                    return false;
                }
                return true;
            });
            return pending.length === 0;
        }

        if (!tryBind()) {
            // The apps append their roots to <body> after their own scripts load, which can be
            // after this runs, so keep watching <body> until both roots have appeared.
            var bodyObserver = new MutationObserver(function () {
                if (tryBind()) {
                    bodyObserver.disconnect();
                }
            });
            bodyObserver.observe(document.body, {childList: true});
        }

        // Re-theme open modals when the visitor toggles light/dark (changeColorTheme in
        // theme-head.js adds/removes has-light-text on <html>).
        new MutationObserver(function () {
            iframes.forEach(apply);
        }).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
