package com.seanime.app

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import org.json.JSONObject
import java.io.File

/**
 * Opens Android's folder picker for Seanime's directory fields (see folder-picker.js)
 * and hands the chosen folder back to the page as a filesystem path.
 *
 * The server writes to the folder itself, so the app needs all files access first.
 */
class FolderPicker(private val activity: Activity, private val webView: WebView) {

    private var pendingPath: String? = null
    private var waitingForAccess = false

    inner class Bridge {
        @JavascriptInterface
        fun pick(currentPath: String?) {
            activity.runOnUiThread { start(currentPath.orEmpty()) }
        }
    }

    fun registerBridge() {
        webView.addJavascriptInterface(Bridge(), "FolderPicker")
    }

    private fun start(currentPath: String) {
        if (hasStorageAccess()) {
            launch(currentPath)
            return
        }
        pendingPath = currentPath
        waitingForAccess = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Toast.makeText(activity, "Allow access to all files so Seanime can save downloads there", Toast.LENGTH_LONG).show()
            val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:${activity.packageName}"))
            try {
                activity.startActivity(intent)
            } catch (e: ActivityNotFoundException) {
                activity.startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
            }
        } else {
            activity.requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), PERMISSION_REQUEST_CODE)
        }
    }

    // Back from the all files access screen
    fun onResume() {
        if (waitingForAccess && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) finishAccessRequest()
    }

    fun onRequestPermissionsResult(requestCode: Int) {
        if (requestCode == PERMISSION_REQUEST_CODE && waitingForAccess) finishAccessRequest()
    }

    private fun finishAccessRequest() {
        waitingForAccess = false
        val path = pendingPath ?: return
        pendingPath = null
        if (hasStorageAccess()) {
            launch(path)
        } else {
            Toast.makeText(activity, "Seanime can't save to your storage without access", Toast.LENGTH_LONG).show()
        }
    }

    private fun hasStorageAccess(): Boolean = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> Environment.isExternalStorageManager()
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ->
            activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        else -> true
    }

    private fun launch(currentPath: String) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            initialUri(currentPath)?.let { intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, it) }
        }
        try {
            activity.startActivityForResult(intent, PICK_REQUEST_CODE)
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(activity, "No folder picker on this device", Toast.LENGTH_LONG).show()
        }
    }

    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != PICK_REQUEST_CODE || resultCode != Activity.RESULT_OK) return
        val uri = data?.data ?: return
        val path = pathFromTreeUri(uri)
        if (path == null) {
            Toast.makeText(activity, "Pick a folder on the phone's storage or SD card", Toast.LENGTH_LONG).show()
            return
        }
        webView.evaluateJavascript(
            "window.__seanimeFolderPicked && window.__seanimeFolderPicked(${JSONObject.quote(path)})", null
        )
    }

    // Open the picker in the folder the field already points to, if it's on internal storage
    private fun initialUri(path: String): Uri? {
        val root = Environment.getExternalStorageDirectory().absolutePath
        var dir: File? = File(path)
        while (dir != null && !dir.isDirectory) dir = dir.parentFile
        val full = dir?.absolutePath ?: return null
        if (full != root && !full.startsWith("$root/")) return null
        val relative = full.removePrefix(root).trimStart('/')
        return DocumentsContract.buildDocumentUri(EXTERNAL_STORAGE_AUTHORITY, "primary:$relative")
    }

    // "primary:Download/Anime" -> /storage/emulated/0/Download/Anime, "1A2B-3C4D:Anime" -> /storage/1A2B-3C4D/Anime
    private fun pathFromTreeUri(uri: Uri): String? {
        val id = DocumentsContract.getTreeDocumentId(uri)
        when (uri.authority) {
            EXTERNAL_STORAGE_AUTHORITY -> {
                val volume = id.substringBefore(':')
                val relative = id.substringAfter(':', "")
                val base = if (volume == "primary") {
                    Environment.getExternalStorageDirectory().absolutePath
                } else {
                    "/storage/$volume"
                }
                return if (relative.isEmpty()) base else "$base/$relative"
            }
            DOWNLOADS_AUTHORITY -> {
                if (id.startsWith("raw:")) return id.removePrefix("raw:")
                if (id == "downloads") {
                    return Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).absolutePath
                }
            }
        }
        return null
    }

    companion object {
        private const val PICK_REQUEST_CODE = 7301
        private const val PERMISSION_REQUEST_CODE = 7302
        private const val EXTERNAL_STORAGE_AUTHORITY = "com.android.externalstorage.documents"
        private const val DOWNLOADS_AUTHORITY = "com.android.providers.downloads.documents"
    }
}
