package com.seanime.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import java.net.HttpURLConnection
import java.net.URISyntaxException
import java.net.URL

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var pipManager: PiPManager
    private lateinit var folderPicker: FolderPicker
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    private val retryCountMap = mutableMapOf<WebView, Int>()
    private val MAX_RETRIES = 5
    private val REQUEST_CODE_NOTIFICATIONS = 101

    private val LOCAL_HOST = "127.0.0.1"
    private val HOME_URL = "http://127.0.0.1:43211"
    private val STATUS_URL = "$HOME_URL/api/v1/status"
    private val SERVER_START_TIMEOUT_MS = 90_000L

    private lateinit var loadingView: LinearLayout
    private lateinit var loadingText: TextView
    private lateinit var loadingSpinner: ProgressBar
    private lateinit var retryButton: Button
    @Volatile private var destroyed = false
    private var serverReady = false
    private var pendingUrl: String? = null
    private var exitReceiver: BroadcastReceiver? = null

    inner class OrientationBridge {
        @JavascriptInterface
        fun setLandscape(landscape: Boolean) {
            runOnUiThread {
                requestedOrientation = if (landscape) {
                    ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                } else {
                    ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        // The status bar is hidden, and by default Android then keeps the window out of the
        // camera cutout strip, leaving a black band at the top. Draw into it instead.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        }

        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"), REQUEST_CODE_NOTIFICATIONS)
        }

        setupWebView()
        registerExitReceiver()
        startSeanimeService()
        setSystemBarsHidden(true)

        // --- ADDED: Handle deep link if app was closed ---
        handleWidgetIntent(intent)
        waitForServer()
    }

    // The notification's Exit stops the server, so close the app with it
    private fun registerExitReceiver() {
        exitReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                finishAndRemoveTask()
            }
        }
        val filter = IntentFilter(SeanimeService.ACTION_EXIT)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(exitReceiver, filter, 0x4)
        } else {
            registerReceiver(exitReceiver, filter)
        }
    }

    override fun onDestroy() {
        destroyed = true
        exitReceiver?.let { unregisterReceiver(it) }
        exitReceiver = null
        super.onDestroy()
    }

    // Poll the status endpoint and load the UI once the server answers,
    // instead of guessing how long startup takes
    private fun waitForServer() {
        loadingView.visibility = View.VISIBLE
        loadingSpinner.visibility = View.VISIBLE
        retryButton.visibility = View.GONE
        loadingText.text = "Starting Seanime…"

        Thread {
            val deadline = System.currentTimeMillis() + SERVER_START_TIMEOUT_MS
            var ready = false
            while (!destroyed && System.currentTimeMillis() < deadline) {
                if (isServerUp()) {
                    ready = true
                    break
                }
                Thread.sleep(250)
            }
            if (destroyed) return@Thread
            runOnUiThread {
                if (ready) {
                    serverReady = true
                    webView.loadUrl(pendingUrl ?: HOME_URL)
                    pendingUrl = null
                } else {
                    loadingSpinner.visibility = View.GONE
                    loadingText.text = "The Seanime server didn't start."
                    retryButton.visibility = View.VISIBLE
                }
            }
        }.start()
    }

    private fun isServerUp(): Boolean {
        return try {
            val conn = URL(STATUS_URL).openConnection() as HttpURLConnection
            conn.connectTimeout = 1000
            conn.readTimeout = 2000
            try {
                conn.responseCode == 200
            } finally {
                conn.disconnect()
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun buildLoadingView(): LinearLayout {
        val density = resources.displayMetrics.density
        loadingSpinner = ProgressBar(this)
        loadingText = TextView(this).apply {
            setTextColor(android.graphics.Color.WHITE)
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, (16 * density).toInt(), 0, (16 * density).toInt())
        }
        retryButton = Button(this).apply {
            text = "Retry"
            setOnClickListener {
                startSeanimeService()
                waitForServer()
            }
        }
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(android.graphics.Color.BLACK)
            isClickable = true
            addView(loadingSpinner)
            addView(loadingText)
            addView(retryButton)
        }
    }

    // --- ADDED: Handle deep link if app was already in background ---
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent) // Essential for getIntent() to return the latest data
        handleWidgetIntent(intent)
    }

    // --- ADDED: The Navigation Logic ---
    private fun handleWidgetIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "seanime" && data.host == "entry") {
            val animeId = data.getQueryParameter("id")
            if (animeId != null) {
                // Navigate the WebView to the specific entry page, or once the server is up
                val url = "$HOME_URL/entry?id=$animeId"
                if (serverReady) webView.loadUrl(url) else pendingUrl = url
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        AppUpdater.onRequestPermissionsResult(requestCode, grantResults)
        folderPicker.onRequestPermissionsResult(requestCode)
        if (requestCode == REQUEST_CODE_NOTIFICATIONS &&
            grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
        ) {
            sendBroadcast(Intent(SeanimeService.ACTION_NOTIFICATION_PERMISSION_GRANTED))
        }
    }

    override fun onResume() {
        super.onResume()
        folderPicker.onResume()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        folderPicker.onActivityResult(requestCode, resultCode, data)
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        Performance.onTrimMemory(webView, level)
    }

    override fun onLowMemory() {
        super.onLowMemory()
        Performance.onLowMemory(webView)
    }

    private fun startSeanimeService() {
        val intent = Intent(this, SeanimeService::class.java)
        startForegroundService(intent)
    }

    private fun setupWebView() {
        webView = WebView(this)
        loadingView = buildLoadingView()
        val root = FrameLayout(this)
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))
        root.addView(loadingView, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        // The window is drawn edge to edge, so Android doesn't shrink it for the keyboard.
        // Shrink it here instead; the WebView then scrolls the focused field into view.
        root.setOnApplyWindowInsetsListener { view, insets ->
            val keyboard = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                insets.getInsets(WindowInsets.Type.ime()).bottom
            } else {
                @Suppress("DEPRECATION")
                insets.systemWindowInsetBottom.takeIf { it > insets.stableInsetBottom } ?: 0
            }
            // In landscape the cutout is on a side; keep the page out of it there
            val cutout = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) insets.displayCutout else null
            view.setPadding(cutout?.safeInsetLeft ?: 0, 0, cutout?.safeInsetRight ?: 0, keyboard)
            webView.evaluateJavascript(
                "document.documentElement.toggleAttribute('data-seanime-keyboard', ${keyboard > 0})", null
            )
            insets
        }

        Performance.init(this, webView)

        pipManager = PiPManager(this, webView)
        pipManager.registerBridge()

        folderPicker = FolderPicker(this, webView)
        folderPicker.registerBridge()

        AppUpdater.init(this, webView)

        webView.addJavascriptInterface(OrientationBridge(), "OrientationBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false

                if (uri.scheme == "intent") {
                    return try {
                        val intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME)
                        startActivity(intent)
                        true
                    } catch (e: URISyntaxException) {
                        e.printStackTrace()
                        true
                    } catch (e: ActivityNotFoundException) {
                        val packageName = intent.`package`
                        if (packageName != null) {
                            val marketIntent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("market://details?id=$packageName")
                            )
                            startActivity(marketIntent)
                        } else {
                            Toast.makeText(this@MainActivity, "No app found to handle this link", Toast.LENGTH_SHORT).show()
                        }
                        true
                    }
                }

                val host = uri.host ?: return false
                if (host == LOCAL_HOST) return false
                
                // --- ADDED: Ensure our custom scheme doesn't open a popup sheet ---
                if (uri.scheme == "seanime") return false

                PopupWebViewSheet.show(this@MainActivity, uri.toString())
                return true
            }

            override fun onReceivedError(view: WebView?, req: WebResourceRequest?, err: WebResourceError?) {
                if (req?.isForMainFrame == true) retry(view)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view != null) retryCountMap[view] = 0
                if (serverReady) loadingView.visibility = View.GONE

                WebPatches.inject(webView)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null) {
                    onHideCustomView()
                    return
                }
                customView = view
                customViewCallback = callback
                val decor = window.decorView as FrameLayout
                decor.addView(customView, FrameLayout.LayoutParams(-1, -1))
                webView.visibility = View.GONE
                setSystemBarsHidden(true)
            }

            override fun onHideCustomView() {
                val decor = window.decorView as FrameLayout
                decor.removeView(customView)
                customView = null
                customViewCallback?.onCustomViewHidden()
                webView.visibility = View.VISIBLE
                setSystemBarsHidden(true)
            }
        }
    }

    private fun retry(view: WebView?) {
        view ?: return
        val count = retryCountMap.getOrDefault(view, 0)
        if (count >= MAX_RETRIES) return
        retryCountMap[view] = count + 1
        val delayMs = (count + 1) * 1000L
        view.postDelayed({ view.reload() }, delayMs)
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        pipManager.onPiPModeChanged(isInPictureInPictureMode)

        if (!isInPictureInPictureMode) setSystemBarsHidden(true)
    }

    private fun setSystemBarsHidden(hide: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                if (hide) {
                    it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                } else {
                    it.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                }
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = if (hide) {
                (View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
            } else {
                View.SYSTEM_UI_FLAG_VISIBLE
            }
        }
    }

    override fun onBackPressed() {
        if (customView != null) {
            webView.webChromeClient?.onHideCustomView()
        } else if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
