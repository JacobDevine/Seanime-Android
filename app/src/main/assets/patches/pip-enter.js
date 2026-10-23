// Run by PiPManager when the activity enters picture-in-picture.
// Shows only the video; pip-exit.js puts everything back.
(function() {
    window.__androidPiPActive = true;
    window.__seanimePiPScrollY = window.scrollY;

    let style = document.getElementById('pip-overlay-style') || document.createElement('style');
    style.id = 'pip-overlay-style';
    style.textContent = `
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
            object-fit: contain !important;
            background: black !important;
            z-index: 9999999 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            visibility: visible !important;
        }
    `;
    document.head.appendChild(style);

    // Move the video directly to body so hiding the rest of the page doesn't hide it
    const video = document.querySelector('video');
    if (video && video.parentElement !== document.body) {
        video.__pipOriginalParent = video.parentElement;
        video.__pipOriginalNextSibling = video.nextSibling;
        document.body.appendChild(video);
    }
})();
