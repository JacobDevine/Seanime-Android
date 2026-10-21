// Run by PiPManager when the activity leaves picture-in-picture.
(function() {
    window.__androidPiPActive = false;

    // Restore video to its original position in the DOM
    const video = document.querySelector('video');
    if (video && video.__pipOriginalParent) {
        const origParent = video.__pipOriginalParent;
        const origNext = video.__pipOriginalNextSibling;

        // Clear all inline styles from video
        video.removeAttribute('style');

        if (origNext) {
            origParent.insertBefore(video, origNext);
        } else {
            origParent.appendChild(video);
        }
        delete video.__pipOriginalParent;
        delete video.__pipOriginalNextSibling;
    }

    // Remove PiP styles completely
    const style = document.getElementById('pip-overlay-style');
    if (style) {
        style.innerHTML = '';
        style.remove();
    }

    // Force restore html and body to normal by removing inline styles
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');

    // Restore pill
    const pill = document.getElementById('android-floating-pill');
    if (pill) {
        pill.style.removeProperty('display');
        pill.style.display = 'grid';
    }

    // Reset viewport zoom
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }

    // Reset document scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Trigger layout recalculation after a small delay
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
})();
