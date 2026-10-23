package com.seanime.app

import android.webkit.WebView
import org.json.JSONObject

/**
 * Runs the JS/CSS patches in assets/patches/ against Seanime's web UI.
 *
 * Page navigation doesn't reload, so [inject] runs once per real page load; every
 * script guards against running twice. A .css file is added as a <style> element.
 */
object WebPatches {

    // page-events.js must come first. Stylesheets are added in this order, so later ones win ties.
    private val PAGE_PATCHES = listOf(
        "page-events.js",
        "reduced-motion.css",
        "network-hints.js",
        "pip.js",
        "dual-mode.css",
        "dual-mode.js",
        "video-controls.js",
        "bottom-nav.css",
        "bottom-nav.js",
        "home.css",
        "modal.css",
        "manga-home.css",
        "entry.js",
        "entry-more-info.js",
        "settings.css",
        "settings-menu.js",
        "settings-action-bar.js",
        "torrent.js",
        "folder-picker.js",
        "discover.css",
        "discover.js",
        "search.js",
        "app-updater.js",
    )

    private val cache = HashMap<String, String>()

    fun inject(webView: WebView) {
        PAGE_PATCHES.forEach { run(webView, it) }
    }

    fun run(webView: WebView, name: String) {
        webView.evaluateJavascript(script(webView, name), null)
    }

    private fun script(webView: WebView, name: String): String = cache.getOrPut(name) {
        val text = webView.context.assets.open("patches/$name").bufferedReader().use { it.readText() }
        if (name.endsWith(".css")) styleScript(name.removeSuffix(".css"), text) else text
    }

    private fun styleScript(name: String, css: String) = """
        (function() {
            var id = '__seanime_css_$name';
            if (document.getElementById(id)) return;
            var s = document.createElement('style');
            s.id = id;
            s.textContent = ${JSONObject.quote(css)};
            document.head.appendChild(s);
        })();
    """.trimIndent()
}
