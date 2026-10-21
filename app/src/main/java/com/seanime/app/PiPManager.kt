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
        fun enterPiP() {
            activity.runOnUiThread {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val params = PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(16, 9))
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

    fun registerBridge() {
        webView.addJavascriptInterface(PiPBridge(), "AndroidBridge")
    }

    fun onPiPModeChanged(isInPictureInPictureMode: Boolean) {
        WebPatches.run(webView, if (isInPictureInPictureMode) "pip-enter.js" else "pip-exit.js")
    }
}
