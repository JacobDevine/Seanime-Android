(function() {
    if (window.__seanime_entry_observer) return;
    window.__seanime_entry_observer = true;

    function isEntryPage() {
        return /\/entry\?id=/.test(window.location.href);
    }

    function injectCharacterStyles() {
        if (document.getElementById('__seanime_characters_fix')) return;
        var s = document.createElement('style');
        s.id = '__seanime_characters_fix';
        s.textContent = `
            [data-media-page-header-entry-details="true"] {
                flex-direction: row !important;
                align-items: flex-start !important;
                gap: 0.85rem !important;
                flex-wrap: wrap !important;
            }
            [data-media-page-header-entry-details-cover-image-container="true"] {
                max-width: 140px !important;
                min-width: 140px !important;
                width: 140px !important;
                margin: 0 !important;
                flex-shrink: 0 !important;
            }
            [data-media-page-header-entry-details-content="true"] {
                flex: 1 !important;
                min-width: 0 !important;
                overflow: hidden !important;
            }
            [data-media-page-header-entry-details-title-container="true"] .font-bold {
                font-size: 0.88rem !important;
                line-height: 1.25 !important;
                text-align: left !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                display: block !important;
                -webkit-line-clamp: unset !important;
                max-width: 100% !important;
            }
            [data-media-page-header-entry-details-title-container="true"] .font-bold > div {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                display: block !important;
                max-width: 100% !important;
            }
            [data-media-page-header-entry-details-title-container="true"] .font-bold > div > span {
                white-space: nowrap !important;
            }
            [data-media-page-header-entry-details-title-container="true"] h4 {
                text-align: left !important;
                font-size: 0.68rem !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                display: block !important;
                max-width: 100% !important;
            }
            [data-media-page-header-entry-details-date-container="true"] {
                justify-content: flex-start !important;
                font-size: 0.78rem !important;
                flex-wrap: wrap !important;
                gap: 0.4rem !important;
            }
            [data-media-page-header-entry-details-date-container="true"] p {
                font-size: 0.78rem !important;
            }
            [data-media-page-header-entry-details-more-info="true"] {
                justify-content: flex-start !important;
                gap: 0.5rem !important;
                flex-wrap: wrap !important;
            }
            /* ── Characters grid ── */
            [data-media-entry-characters-section-grid="true"] {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
            [data-media-entry-characters-section-grid-item-container="true"] {
                gap: 0.5rem !important;
                padding-top: 0.5rem !important;
                padding-bottom: 0.5rem !important;
                padding-right: 0.5rem !important;
            }
            [data-media-entry-characters-section-grid-item-image-container="true"] {
                width: 3rem !important;
                height: 3rem !important;
                min-width: 3rem !important;
                min-height: 3rem !important;
            }
            [data-media-entry-characters-section-grid-item-content="true"] p.text-lg {
                font-size: 0.8rem !important;
                line-height: 1.1rem !important;
            }
            [data-media-entry-characters-section-grid-item-content="true"] p.text-sm {
                font-size: 0.7rem !important;
            }
            [data-media-entry-characters-section-grid-item-content="true"] p.text-xs {
                font-size: 0.65rem !important;
            }
            /* ── Related/recommendations carousels ── */
            [data-media-card-grid="true"][data-carouselized="true"] {
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: nowrap !important;
                overflow-x: auto !important;
                overflow-y: visible !important;
                gap: 0.75rem !important;
                padding: 0.5rem 0.25rem 0.75rem 0.25rem !important;
                scroll-behavior: smooth !important;
                -webkit-overflow-scrolling: touch !important;
                scrollbar-width: none !important;
            }
            [data-media-card-grid="true"][data-carouselized="true"]::-webkit-scrollbar {
                display: none !important;
            }
            [data-media-card-grid="true"][data-carouselized="true"] .col-span-1 {
                flex: 0 0 auto !important;
                width: 180px !important;
            }
        `;
        document.head.appendChild(s);
    }

    function moveScoreBadge() {
        if (!isEntryPage()) return;
        var badge = document.querySelector('[data-media-page-header-score-badge="true"]');
        if (!badge || badge.dataset.seanimeMoved === 'true') return;
        var statusEl = document.querySelector('[data-media-page-header-entry-details-status="true"]');
        if (!statusEl || !statusEl.parentElement) return;
        badge.dataset.seanimeMoved = 'true';
        statusEl.parentElement.insertBefore(badge, statusEl.nextSibling);
    }

    function carouselizeGrids() {
        if (!isEntryPage()) return;
        document.querySelectorAll('[data-media-card-grid="true"]:not([data-carouselized])').forEach(function(grid) {
            grid.setAttribute('data-carouselized', 'true');
        });
    }

    // Runs 1s after the page last changed, so the header has settled.
    var applyTimer = null;
    function applyAll() {
        if (applyTimer) return;
        applyTimer = setTimeout(function() {
            applyTimer = null;
            injectCharacterStyles();
            if (isEntryPage()) {
                carouselizeGrids();
                moveScoreBadge();
            }
        }, 1000);
    }

    applyAll();

    window.__seanimePage.onDomChange(function(added) {
        if (added.length && isEntryPage()) applyAll();
    });
    window.__seanimePage.onRouteChange(applyAll);
})();
