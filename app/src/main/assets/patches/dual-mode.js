(function() {
    if (window.__seanimeDualModeInjected) return;
    window.__seanimeDualModeInjected = true;

    function toggleLandscape(enable) {
        if (window.OrientationBridge) {
            window.OrientationBridge.setLandscape(enable);
        }
    }

    let dualActive = false;

    function applyDualMode() {
        if (dualActive) return;
        dualActive = true;
        document.body.classList.add('seanime-dual-mode-active');
        toggleLandscape(true);
    }

    function removeDualMode() {
        if (!dualActive) return;
        dualActive = false;
        document.body.classList.remove('seanime-dual-mode-active');
        toggleLandscape(false);
    }

    function setupUI() {
        const doubleBtn = document.querySelector('button[value="double-page"]');
        if (doubleBtn && !doubleBtn.dataset.hijacked) {
            doubleBtn.dataset.hijacked = "true";
            const parentLabel = doubleBtn.closest('label.UI-RadioGroup__itemContainer');
            if (parentLabel) {
                const span = parentLabel.querySelector('span > span:last-child');
                if (span) span.innerText = "Double Page (Landscape)";

                const toggleHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.type !== 'click') return;

                    localStorage.setItem('customDualMode', 'true');
                    applyDualMode();
                };
                parentLabel.addEventListener('click', toggleHandler, true);
            }
        }

        ['paged', 'long-strip'].forEach(val => {
            const btn = document.querySelector('button[value="' + val + '"]');
            if (btn && !btn.dataset.hijacked) {
                btn.dataset.hijacked = "true";
                btn.closest('label.UI-RadioGroup__itemContainer')?.addEventListener('click', () => {
                    localStorage.setItem('customDualMode', 'false');
                    removeDualMode();
                }, true);
            }
        });
    }

    window.__seanimePage.onDomChange(() => {
        setupUI();
        const pages = document.querySelectorAll('div[data-chapter-page-container="true"]');
        const isDual = localStorage.getItem('customDualMode') === 'true';

        if (pages.length > 0 && isDual) {
            applyDualMode();
        } else if (pages.length === 0) {
            removeDualMode();
        }
    });
})();
