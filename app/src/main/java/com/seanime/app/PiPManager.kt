package com.seanime.app

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Intent
import android.os.Build
import android.util.Rational
import android.webkit.JavascriptInterface
import android.webkit.WebView

class PiPManager(private val activity: Activity, private val webView: WebView) {

    inner class PiPBridge {
        @JavascriptInterface
        fun enterPiP(videoWidth: Int, videoHeight: Int) {
            activity.runOnUiThread {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val params = PictureInPictureParams.Builder()
                        .setAspectRatio(aspectRatio(videoWidth, videoHeight))
                        .build()
                    activity.enterPictureInPictureMode(params)
                }
            }
        }

        @JavascriptInterface
        fun exitPiP() {
            activity.runOnUiThread {
                val intent = Intent(activity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                activity.startActivity(intent)
            }
        }
    }

    // Match the window to the video. Android rejects ratios outside 1:2.39 to 2.39:1.
    private fun aspectRatio(width: Int, height: Int): Rational {
        if (width <= 0 || height <= 0) return Rational(16, 9)
        val ratio = width.toFloat() / height
        return when {
            ratio > 2.39f -> Rational(239, 100)
            ratio < 1 / 2.39f -> Rational(100, 239)
            else -> Rational(width, height)
        }
    }

    fun registerBridge() {
        webView.addJavascriptInterface(PiPBridge(), "AndroidBridge")
    }

    fun onPiPModeChanged(isInPictureInPictureMode: Boolean) {
        WebPatches.run(webView, if (isInPictureInPictureMode) "pip-enter.js" else "pip-exit.js")
    }
}
