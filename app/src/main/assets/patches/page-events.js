/*
 * Shared DOM and route watchers for the other patches. Must be injected before them.
 *
 *   __seanimePage.onDomChange(fn)   fn(addedElements) at most once per frame after any
 *                                   childList change under <body> (the array may be empty
 *                                   when only removals happened)
 *   __seanimePage.onRouteChange(fn) fn(pathname) after the URL changes without a reload
 *
 * <html data-seanime-route="/pathname"> is kept current so CSS can be scoped to a page.
 */
(function() {
    if (window.__seanimePage) return;

    var domHandlers = [];
    var routeHandlers = [];

    function run(handlers, arg) {
        handlers.forEach(function(fn) {
            try { fn(arg); } catch (e) { console.error('[Seanime] patch handler failed', e); }
        });
    }

    // ── DOM changes ──────────────────────────────────────────────────
    var added = [];
    var scheduled = false;

    function flush() {
        scheduled = false;
        var nodes = added;
        added = [];
        run(domHandlers, nodes);
    }

    new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var nodes = mutations[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
                if (nodes[j].nodeType === 1) added.push(nodes[j]);
            }
        }
        if (scheduled) return;
        scheduled = true;
        // rAF doesn't run while the app is in the background
        if (document.hidden) setTimeout(flush, 100);
        else requestAnimationFrame(flush);
    }).observe(document.body, { childList: true, subtree: true });

    // ── Route changes ────────────────────────────────────────────────
    var root = document.documentElement;
    var lastHref = location.href;

    function checkRoute() {
        root.setAttribute('data-seanime-route', location.pathname);
        if (location.href === lastHref) return;
        lastHref = location.href;
        setTimeout(function() { run(routeHandlers, location.pathname); }, 0);
    }

    ['pushState', 'replaceState'].forEach(function(name) {
        var original = history[name];
        history[name] = function() {
            var result = original.apply(this, arguments);
            checkRoute();
            return result;
        };
    });
    window.addEventListener('popstate', checkRoute);
    checkRoute();

    window.__seanimePage = {
        onDomChange: function(fn) { domHandlers.push(fn); },
        onRouteChange: function(fn) { routeHandlers.push(fn); }
    };
})();
