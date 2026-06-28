// Keyboard shortcut (Ctrl/Cmd + K) to toggle Ghost's built-in (Sodo) search modal.
//
// How Sodo-Search actually works (see TryGhost/Ghost apps/sodo-search):
//   * It appends an (initially empty) <div id="sodo-search-root"> to <body>.
//   * The popup is rendered ONLY while open, inside an <iframe> nested in that root
//     (PopupModal returns null when closed), so "is it open?" == "does the iframe exist?".
//   * It closes on an Escape *keyup* whose listener lives on the iframe's OWN document.
//   * Its native Cmd+K handler only ever opens the popup (and ignores Ctrl), so we must
//     handle toggling ourselves and stop its handler from re-opening on close.
//   * Once open, focus moves into the iframe, so a second Ctrl+K fires inside the iframe
//     and never reaches the main document — hence the in-iframe handler below.

(function () {
    var ESCAPE_INIT = {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true
    };

    function getSearchRoot() {
        return document.getElementById('sodo-search-root');
    }

    function getSearchIframe() {
        var root = getSearchRoot();
        return root ? root.querySelector('iframe') : null;
    }

    function isSearchOpen() {
        return !!getSearchIframe();
    }

    function isToggleShortcut(e) {
        return (e.ctrlKey || e.metaKey) && !e.altKey && e.key && e.key.toLowerCase() === 'k';
    }

    function openSearch() {
        var trigger = document.querySelector('[data-ghost-search]');
        if (trigger) trigger.click();
    }

    function closeSearch() {
        var iframe = getSearchIframe();
        var doc = iframe && iframe.contentDocument;
        if (!doc) return;
        // Build the event in the iframe's context and dispatch a keyup (not keydown) so it
        // reaches Sodo-Search's Escape handler, which is bound to the iframe's document.
        var win = iframe.contentWindow;
        var KbEvent = (win && win.KeyboardEvent) || KeyboardEvent;
        doc.dispatchEvent(new KbEvent('keyup', ESCAPE_INIT));
    }

    function toggleSearch() {
        if (isSearchOpen()) {
            closeSearch();
        } else {
            openSearch();
        }
    }

    // 1. Shortcut handling when focus is in the main page (capture phase, and we stop
    //    propagation so Sodo-Search's own open-only Cmd+K handler doesn't fire).
    document.addEventListener('keydown', function (e) {
        if (isToggleShortcut(e)) {
            e.preventDefault();
            e.stopPropagation();
            toggleSearch();
        }
    }, true);

    // 2. Shortcut handling when focus is inside the popup's iframe. Keystrokes there never
    //    reach the main document, so install a matching handler in each iframe as it
    //    appears. The popup is always open in this context, so the shortcut just closes it.
    function bindIframeDocument(iframe) {
        var doc = iframe.contentDocument;
        if (!doc || doc.ghostSearchKeyBound) return;
        doc.ghostSearchKeyBound = true;
        doc.addEventListener('keydown', function (e) {
            if (isToggleShortcut(e)) {
                e.preventDefault();
                closeSearch();
            }
        }, true);
    }

    function bindIframe(iframe) {
        if (iframe.ghostSearchObserved) return;
        iframe.ghostSearchObserved = true;
        bindIframeDocument(iframe); // in case it's already loaded
        iframe.addEventListener('load', function () {
            bindIframeDocument(iframe);
        });
    }

    function watchForIframe(root) {
        var existing = root.querySelector('iframe');
        if (existing) bindIframe(existing);

        new MutationObserver(function () {
            var iframe = root.querySelector('iframe');
            if (iframe) bindIframe(iframe);
        }).observe(root, {childList: true, subtree: true});
    }

    function init() {
        var root = getSearchRoot();
        if (root) {
            watchForIframe(root);
            return;
        }
        // Sodo-Search appends its root to <body> after its own script loads, which may be
        // after this script runs, so wait for it to appear.
        var bodyObserver = new MutationObserver(function () {
            var r = getSearchRoot();
            if (r) {
                bodyObserver.disconnect();
                watchForIframe(r);
            }
        });
        bodyObserver.observe(document.body, {childList: true});
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
