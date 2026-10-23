/*
 * Seanime's directory fields (download destination, library path, ...) open a modal where
 * you type a path. Open Android's folder picker from the folder icon instead; the field
 * can still be typed in.
 */
(function() {
    if (window.__seanime_folder_picker_init) return;
    window.__seanime_folder_picker_init = true;
    if (!window.FolderPicker) return;

    var target = null;

    // The icon is <div class="absolute top-0 right-0 ..."><svg class="text-2xl cursor-pointer"></div>
    // inside the same relative wrapper as the text field
    function fieldFor(el) {
        var svg = el.closest && el.closest('svg');
        if (!svg || !svg.classList.contains('text-2xl') || !svg.classList.contains('cursor-pointer')) return null;
        var holder = svg.parentElement;
        if (!holder || !holder.classList.contains('absolute') || !holder.classList.contains('top-0')) return null;
        var wrapper = holder.parentElement;
        return wrapper && wrapper.querySelector('input');
    }

    // Capture on window runs before React's handlers on the root, so the modal never opens
    window.addEventListener('click', function(e) {
        var input = fieldFor(e.target);
        if (!input) return;
        e.preventDefault();
        e.stopPropagation();
        target = input;
        window.FolderPicker.pick(input.value || '');
    }, true);

    window.__seanimeFolderPicked = function(path) {
        if (!target || !target.isConnected) return;
        // React ignores a plain .value assignment; use the native setter and fire input
        var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(target, path);
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target = null;
    };

    var style = document.createElement('style');
    style.id = '__seanime_folder_picker_styles';
    // A bigger tap target for the icon
    style.textContent =
        'div.absolute.top-0.right-0 > svg.text-2xl.cursor-pointer {' +
        '  box-sizing: content-box; padding: 6px; margin: -6px; color: var(--brand, currentColor);' +
        '}';
    document.head.appendChild(style);
})();
