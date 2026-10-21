/*
 * Floats the "Reset all" (pill) and "Save" (button) actions above the bottom nav bar.
 *
 * Visibility is driven purely by whether the original action bar exists in the DOM:
 *   - buttons present  → build/show the floating bar, hide the original
 *   - buttons absent   → remove the floating bar (modal open, tab switch, navigated away, etc.)
 *
 * No overlay/dialog detection needed — React unmounts the form when a modal covers it,
 * so the originals simply disappear from the DOM at the right time.
 */
(function() {
    if (window.__seanime_settings_bar_init) return;
    window.__seanime_settings_bar_init = true;

    var TABLET_BP  = 768;
    var BAR_ID     = '__seanime_settings_float_bar';
    var HIDE_STYLE = '__seanime_action_bar_hide';
    var TAG_ATTR   = 'data-seanime-action-bar';

    function isPhone()        { return window.innerWidth < TABLET_BP; }
    function isSettingsPage() { return /\/settings/.test(window.location.href); }

    /* ── Find the original Reset-all / Save container ── */
    function findActionBar() {
        var divs = document.querySelectorAll('div.flex.justify-between');
        for (var i = 0; i < divs.length; i++) {
            var div = divs[i];
            var resetBtn = null, saveBtn = null;
            div.querySelectorAll('button').forEach(function(btn) {
                var t = btn.textContent.trim();
                if (t === 'Reset all') resetBtn = btn;
                if (t === 'Save')      saveBtn  = btn;
            });
            if (resetBtn && saveBtn) {
                return { container: div, resetBtn: resetBtn, saveBtn: saveBtn };
            }
        }
        return null;
    }

    /* ── CSS that hides every tagged original action bar ── */
    function ensureHideStyle() {
        if (document.getElementById(HIDE_STYLE)) return;
        var s = document.createElement('style');
        s.id = HIDE_STYLE;
        s.textContent = '[' + TAG_ATTR + '="true"] { visibility: hidden !important; pointer-events: none !important; }';
        document.head.appendChild(s);
    }

    /* ── Remove floating bar and untag the original ── */
    function removeBar() {
        document.querySelectorAll('[' + TAG_ATTR + '="true"]').forEach(function(el) {
            el.removeAttribute(TAG_ATTR);
        });
        var bar = document.getElementById(BAR_ID);
        if (!bar) return;
        bar.style.opacity = '0';
        setTimeout(function() {
            var b = document.getElementById(BAR_ID);
            if (b) b.remove();
        }, 200);
    }

    function sync() {
        if (!isPhone() || !isSettingsPage()) { removeBar(); return; }

        var found = findActionBar();
        if (!found) { removeBar(); return; }

        ensureHideStyle();
        if (!found.container.hasAttribute(TAG_ATTR)) {
            found.container.setAttribute(TAG_ATTR, 'true');
        }

        if (document.getElementById(BAR_ID)) return;

        var bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.style.cssText = [
            'position:fixed',
            'bottom:4.5rem',
            'left:0', 'right:0',
            'z-index:8999',
            'display:flex',
            'align-items:center',
            'justify-content:space-between',
            'padding:0.6rem 1rem',
            'pointer-events:none',
            'opacity:0',
            'transition:opacity 0.2s ease'
        ].join(';');

        var resetPill = document.createElement('button');
        resetPill.textContent = 'Reset all';
        resetPill.style.cssText = [
            'pointer-events:auto',
            'height:2.5rem',
            'padding:0 1.35rem',
            'border-radius:9999px',
            'border:1px solid rgba(239,68,68,0.35)',
            'background:rgba(12,12,18,0.88)',
            'backdrop-filter:blur(20px)',
            '-webkit-backdrop-filter:blur(20px)',
            'color:var(--red,#ef4444)',
            'font-size:0.875rem',
            'font-weight:600',
            'cursor:pointer',
            'box-shadow:0 4px 18px rgba(0,0,0,0.45)',
            'transition:background 0.15s, opacity 0.15s',
            '-webkit-tap-highlight-color:transparent'
        ].join(';');
        resetPill.addEventListener('click', function() {
            var f = findActionBar();
            if (f && f.resetBtn) {
                f.resetBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
        });

        var saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = [
            'pointer-events:auto',
            'height:2.5rem',
            'padding:0 1.5rem',
            'border-radius:0.5rem',
            'border:1px solid rgba(20,83,45,0.6)',
            'background:#166534',
            'color:white',
            'font-size:0.875rem',
            'font-weight:600',
            'cursor:pointer',
            'transition:opacity 0.15s',
            '-webkit-tap-highlight-color:transparent'
        ].join(';');
        saveBtn.addEventListener('click', function() {
            var f = findActionBar();
            if (!f) return;
            var form = f.saveBtn.closest('form');
            if (form) {
                try { form.requestSubmit(f.saveBtn); }
                catch (e) {
                    f.saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                }
            } else {
                f.saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
        });

        bar.appendChild(resetPill);
        bar.appendChild(saveBtn);
        document.body.appendChild(bar);
        requestAnimationFrame(function() { bar.style.opacity = '1'; });
    }

    sync();

    window.__seanimePage.onDomChange(sync);
    window.__seanimePage.onRouteChange(sync);
    window.addEventListener('resize', sync);
})();
