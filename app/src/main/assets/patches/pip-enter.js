// Run by PiPManager when the activity enters picture-in-picture.
(function() {
    window.__androidPiPActive = true;

    const pill = document.getElementById('android-floating-pill');
    const menu = document.getElementById('android-floating-menu');
    if (pill) pill.style.setProperty('display', 'none', 'important');
    if (menu) menu.style.setProperty('display', 'none', 'important');

    let style = document.getElementById('pip-overlay-style') || document.createElement('style');
    style.id = 'pip-overlay-style';
    style.innerHTML = `
        html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: black !important;
            overflow: hidden !important;
        }
        body > *:not(video) {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
        video {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: fill !important;
            background: black !important;
            z-index: 9999999 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(style);

    // Move video directly to body
    const video = document.querySelector('video');
    if (video) {
        // Store original position
        video.__pipOriginalParent = video.parentElement;
        video.__pipOriginalNextSibling = video.nextSibling;

        // Move directly to body
        if (video.parentElement !== document.body) {
            document.body.appendChild(video);
        }
    }
})();
