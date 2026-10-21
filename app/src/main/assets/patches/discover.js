// Forcibly sets inline width/minWidth/maxWidth on every card AND skeleton
// so Tailwind's inline basis classes can't override us, and skeletons match.
(function() {
    if (window.__seanime_discover_patch_init) return;
    window.__seanime_discover_patch_init = true;

    var MOBILE_MAX = 767;
    var CARD_WIDTH = '160px';

    function isMobile() {
        return window.innerWidth <= MOBILE_MAX &&
            window.location.pathname.startsWith('/discover');
    }

    function patchElement(el) {
        if (!isMobile()) return;
        el.style.setProperty('flex-basis', CARD_WIDTH, 'important');
        el.style.setProperty('min-width',  CARD_WIDTH, 'important');
        el.style.setProperty('max-width',  CARD_WIDTH, 'important');
        el.style.setProperty('width',      CARD_WIDTH, 'important');
    }

    function patchAll() {
        if (!isMobile()) return;
        // Real cards
        document.querySelectorAll(
            '[data-media-entry-card-container="true"][class*="basis-[200px]"],' +
            '[data-media-entry-card-container="true"][class*="basis-[250px]"]'
        ).forEach(patchElement);

        // Skeleton / loading placeholders — they sit alongside the real
        // cards inside the same flex row and share the same basis classes.
        document.querySelectorAll(
            '[class*="basis-[200px]"],[class*="basis-[250px]"]'
        ).forEach(function(el) {
            // Only patch elements inside a discover scroll row, not
            // unrelated elements that happen to share the class name.
            if (el.closest('[data-discover-section]') ||
                el.closest('[class*="overflow-x-auto"]') ||
                el.hasAttribute('data-media-entry-card-container')) {
                patchElement(el);
            }
        });
    }

    // Initial pass
    patchAll();

    // Watch for skeletons / cards being added dynamically (lazy sections)
    window.__seanimePage.onDomChange(function(added) {
        if (!isMobile()) return;
        added.forEach(function(node) {
            // Patch the node itself if it matches
            var cls = node.className || '';
            if (typeof cls === 'string' &&
                (cls.indexOf('basis-[200px]') !== -1 ||
                 cls.indexOf('basis-[250px]') !== -1)) {
                patchElement(node);
            }
            // Patch any matching descendants
            node.querySelectorAll &&
            node.querySelectorAll(
                '[class*="basis-[200px]"],[class*="basis-[250px]"]'
            ).forEach(patchElement);
        });
    });

    window.__seanimePage.onRouteChange(patchAll);

    // Re-evaluate on resize (e.g. orientation change)
    window.addEventListener('resize', function() {
        if (isMobile()) {
            patchAll();
        } else {
            // Remove inline overrides when going to tablet/desktop
            document.querySelectorAll(
                '[class*="basis-[200px]"],[class*="basis-[250px]"]'
            ).forEach(function(el) {
                el.style.removeProperty('flex-basis');
                el.style.removeProperty('min-width');
                el.style.removeProperty('max-width');
                el.style.removeProperty('width');
            });
        }
    });
})();
