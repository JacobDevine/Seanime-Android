// Search page: the title field searches as you type, but on a phone the results sit
// below a dozen filter boxes and behind the keyboard, so nothing seems to happen.
// - Don't open the keyboard on arrival (upstream focuses the field on mount).
// - The keyboard's Enter key becomes "search": it closes the keyboard and scrolls
//   to the results.
// - Dragging the page closes the keyboard.
(function() {
    if (window.__seanime_search_patch_init) return;
    window.__seanime_search_patch_init = true;

    var INPUT = '[data-advanced-search-options-header] input[placeholder="Title"]';
    // A focus this soon after touching the field came from the user
    var TOUCH_FOCUS_MS = 1000;
    var DRAG_PX = 10;

    var lastFieldTouch = 0;
    var dragStart = null;
    // After Enter the search may still be waiting on its 500ms debounce, so follow
    // the results down when they render, until the user touches the page
    var followResultsUntil = 0;

    function onSearchPage() {
        return location.pathname.startsWith('/search');
    }

    function titleInput(el) {
        return onSearchPage() && el && el.matches && el.matches(INPUT);
    }

    function closeKeyboard() {
        var el = document.activeElement;
        if (titleInput(el)) el.blur();
    }

    function blurIfNotTouched() {
        if (Date.now() - lastFieldTouch > TOUCH_FOCUS_MS) closeKeyboard();
    }

    function scrollToResults() {
        var list = document.querySelector('[data-search-page-list]');
        if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // The page grows as the keyboard closes and cuts a smooth scroll short, so wait
    // for MainActivity to clear data-seanime-keyboard first
    function afterKeyboardCloses(fn) {
        var root = document.documentElement;
        var done = false;
        function finish() {
            if (done) return;
            done = true;
            observer.disconnect();
            requestAnimationFrame(fn);
        }
        var observer = new MutationObserver(function() {
            if (!root.hasAttribute('data-seanime-keyboard')) finish();
        });
        if (!root.hasAttribute('data-seanime-keyboard')) return finish();
        observer.observe(root, { attributes: true, attributeFilter: ['data-seanime-keyboard'] });
        setTimeout(finish, 800);
    }

    function prepareInput() {
        var input = onSearchPage() && document.querySelector(INPUT);
        if (input && input.getAttribute('enterkeyhint') !== 'search') {
            input.setAttribute('enterkeyhint', 'search');
        }
    }

    document.addEventListener('pointerdown', function(e) {
        if (titleInput(e.target)) lastFieldTouch = Date.now();
    }, true);

    document.addEventListener('focusin', function(e) {
        if (titleInput(e.target)) blurIfNotTouched();
    }, true);

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' || !titleInput(e.target)) return;
        e.preventDefault();
        e.target.blur();
        followResultsUntil = Date.now() + 5000;
        afterKeyboardCloses(scrollToResults);
    }, true);

    document.addEventListener('touchstart', function(e) {
        followResultsUntil = 0;
        var t = e.touches[0];
        dragStart = titleInput(document.activeElement) && !titleInput(e.target) && t
            ? { x: t.clientX, y: t.clientY } : null;
    }, { capture: true, passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!dragStart) return;
        var t = e.touches[0];
        if (Math.abs(t.clientY - dragStart.y) > DRAG_PX || Math.abs(t.clientX - dragStart.x) > DRAG_PX) {
            dragStart = null;
            closeKeyboard();
        }
    }, { capture: true, passive: true });

    // Cold start on /search: the field may already have focused itself
    prepareInput();
    blurIfNotTouched();

    window.__seanimePage.onDomChange(function(added) {
        prepareInput();
        if (Date.now() > followResultsUntil || !onSearchPage()) return;
        var list = document.querySelector('[data-search-page-list]');
        if (list && added.some(function(n) { return list.contains(n); })) scrollToResults();
    });
    window.__seanimePage.onRouteChange(prepareInput);
})();
