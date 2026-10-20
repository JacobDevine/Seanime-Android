package com.seanime.app

import android.content.ComponentCallbacks2
import android.content.Context
import android.os.Build
import android.webkit.WebSettings
import android.webkit.WebView

object Performance {

    fun init(context: Context, webView: WebView) {
        applyWebViewSettings(context, webView)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. WebView settings — applied before page load
    // ─────────────────────────────────────────────────────────────────────────

    private fun applyWebViewSettings(context: Context, webView: WebView) {
        val settings: WebSettings = webView.settings

        // ── Rendering ────────────────────────────────────────────────────────
        // Hardware acceleration is set on the View layer; enabling it here ensures
        // the compositor path is fully active.
        webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)

        // Use the widest viewport so the page layout matches a desktop/tablet
        // layout engine — avoids double-render from a narrow initial viewport.
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // ── JavaScript engine ────────────────────────────────────────────────
        @Suppress("SetJavaScriptEnabled")
        settings.javaScriptEnabled = true
        settings.javaScriptCanOpenWindowsAutomatically = false // no pop-ups

        // ── Caching ──────────────────────────────────────────────────────────
        // LOAD_DEFAULT honours HTTP cache-control headers; falls back to cache
        // when offline. This avoids unnecessary network round-trips for static assets.
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // ── Network ──────────────────────────────────────────────────────────
        // Allow the page to store data (IndexedDB, localStorage, etc.)
        settings.domStorageEnabled = true
        settings.databaseEnabled   = true

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }

        // ── Text / media ─────────────────────────────────────────────────────
        settings.mediaPlaybackRequiresUserGesture = false  // inline video/audio
        settings.loadsImagesAutomatically = true

        // Disable features that add overhead or expand attack surface
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.setSupportMultipleWindows(false)
        settings.allowFileAccess    = false
        settings.allowContentAccess = false

        // ── User-agent tweak ─────────────────────────────────────────────────
        val ua = settings.userAgentString
        if (!ua.contains("SeanimeAndroid")) {
            val versionName = try {
                context.packageManager
                    .getPackageInfo(context.packageName, 0)
                    .versionName ?: "0"
            } catch (e: Exception) {
                "0"
            }
            settings.userAgentString = "$ua SeanimeAndroid/$versionName"
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. JavaScript runtime optimisations — call from WebViewClient.onPageFinished
    // ─────────────────────────────────────────────────────────────────────────

    fun injectRuntimeOptimizations(webView: WebView) {
        injectReducedMotion(webView)
        injectNetworkHints(webView)
    }

    // Honour the system "remove animations" setting even where the site's CSS doesn't.
    private fun injectReducedMotion(webView: WebView) {
        val js = """
        (function() {
            var STYLE_ID = '__seanime_reduced_motion';
            if (document.getElementById(STYLE_ID)) return;
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            var s = document.createElement('style');
            s.id = STYLE_ID;
            s.textContent = [
                '*, *::before, *::after {',
                '  animation-duration: 0.01ms !important;',
                '  animation-iteration-count: 1 !important;',
                '  transition-duration: 0.01ms !important;',
                '  scroll-behavior: auto !important;',
                '}'
            ].join('\n');
            document.head.appendChild(s);
        })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    private fun injectNetworkHints(webView: WebView) {
        val js = """
        (function() {
            var PRECONNECT = [
                'https://s4.anilist.co',
                'https://img.anili.st',
                'https://anilist.co',
                'https://graphql.anilist.co'
            ];

            var DNS_PREFETCH = [
                'https://s4.anilist.co',
                'https://cdn.myanimelist.net'
            ];

            PRECONNECT.forEach(function(origin) {
                if (document.querySelector('link[rel="preconnect"][href="' + origin + '"]')) return;
                var link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = origin;
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            });

            DNS_PREFETCH.forEach(function(origin) {
                if (document.querySelector('link[rel="dns-prefetch"][href="' + origin + '"]')) return;
                var link = document.createElement('link');
                link.rel = 'dns-prefetch';
                link.href = origin;
                document.head.appendChild(link);
            });

            document.querySelectorAll(
                '[data-media-page-header-entry-details-cover-image="true"], img[alt="banner image"]'
            ).forEach(function(img) {
                img.setAttribute('fetchpriority', 'high');
                img.setAttribute('loading', 'eager');
            });
        })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    fun onTrimMemory(webView: WebView, level: Int) {
        if (level >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE) webView.clearCache(false)
    }

    fun onLowMemory(webView: WebView) {
        webView.clearCache(false)
    }
}
