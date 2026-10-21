(function() {
    if (window.__seanime_appupdater_init) return;
    window.__seanime_appupdater_init = true;

    if (!document.getElementById('__seanime_appupdater_styles')) {
        var style = document.createElement('style');
        style.id = '__seanime_appupdater_styles';
        style.textContent = '@keyframes __sau_spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    // Helper to get current version from the modal's H4
    function getCurrentVersion() {
        var h4 = document.querySelector('h4.font-bold');
        if (h4) {
            var spans = h4.querySelectorAll('span');
            if (spans.length >= 1) {
                return spans[0].textContent.trim(); // first span = current version
            }
        }
        return null;
    }

    function findUpdateNowBtn() {
        return Array.from(document.querySelectorAll('button')).find(function(btn) {
            var span = btn.querySelector('span.md\\:inline-block');
            return span && span.textContent.trim() === 'Update now';
        });
    }

    function findDownloadBtn() {
        return Array.from(document.querySelectorAll('button')).find(function(btn) {
            var span = btn.querySelector('span.md\\:inline-block');
            return span && span.textContent.trim() === 'Download';
        });
    }

    function patchUpdateNowBtn(btn) {
        if (btn.dataset.sauPatched) return;
        var clone = btn.cloneNode(true);
        clone.dataset.sauPatched = 'true';
        clone.addEventListener('click', function(e) {
            e.stopPropagation(); e.preventDefault();
            var currentVer = getCurrentVersion();
            if (window.AppUpdater) window.AppUpdater.startUpdate(currentVer);
        });
        btn.parentNode.replaceChild(clone, btn);
    }

    function patchDownloadBtn(btn) {
        if (btn.dataset.sauPatched) return;
        var clone = btn.cloneNode(true);
        clone.dataset.sauPatched = 'true';
        clone.dataset.sauDownloadBtn = 'true';
        clone.addEventListener('click', function(e) {
            e.stopPropagation(); e.preventDefault();
            clone.disabled = true;
            clone.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:__sau_spin 0.8s linear infinite;flex-shrink:0;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
            var currentVer = getCurrentVersion(); // optional, not used for download
            if (window.AppUpdater) window.AppUpdater.startDownload(currentVer);
        });
        btn.parentNode.replaceChild(clone, btn);
    }

    function scanButtons() {
        var updateBtn = findUpdateNowBtn(); if (updateBtn) patchUpdateNowBtn(updateBtn);
        var dlBtn = findDownloadBtn(); if (dlBtn) patchDownloadBtn(dlBtn);
    }

    scanButtons();
    window.__seanimePage.onDomChange(function(added) { if (added.length) scanButtons(); });
})();
