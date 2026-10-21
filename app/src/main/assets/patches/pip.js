(function() {
    window.__androidPiPActive = window.__androidPiPActive || false;

    function hijackVideoControls() {
        const buttons = document.querySelectorAll('button[data-vc-element="control-button"]:not([data-pip-hijacked])');

        buttons.forEach(btn => {
            const isPiPButton = btn.querySelector('path[d^="M11 19h-6"]');

            if (isPiPButton) {
                btn.setAttribute('data-pip-hijacked', 'true');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    if (window.__androidPiPActive) {
                        AndroidBridge.exitPiP();
                    } else {
                        AndroidBridge.enterPiP();
                    }
                }, true);
            }
        });
    }

    if (window.__seanimePiPHijackerInit) return;
    window.__seanimePiPHijackerInit = true;
    window.__seanimePage.onDomChange(hijackVideoControls);
    hijackVideoControls();
})();
