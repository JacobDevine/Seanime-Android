// Run by PiPManager when the activity leaves picture-in-picture.
(function() {
    window.__androidPiPActive = false;

    // Put the video back where it was
    const video = document.querySelector('video');
    if (video && video.__pipOriginalParent) {
        const origParent = video.__pipOriginalParent;
        const origNext = video.__pipOriginalNextSibling;
        if (origNext && origNext.parentNode === origParent) {
            origParent.insertBefore(video, origNext);
        } else {
            origParent.appendChild(video);
        }
        delete video.__pipOriginalParent;
        delete video.__pipOriginalNextSibling;
    }

    const style = document.getElementById('pip-overlay-style');
    if (style) style.remove();

    // The page was only a few pixels tall in PiP, which clamps the scroll position
    const y = window.__seanimePiPScrollY || 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
})();
