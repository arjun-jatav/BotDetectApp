package com.botdetectapp

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Process
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class OTAModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OTAModule"

  @ReactMethod
  fun downloadBundle(bundleUrl: String, promise: Promise) {
    Thread {
      try {
        Log.d("OTAModule", "Starting download from: $bundleUrl")
        var currentUrl = bundleUrl
        var connection: HttpURLConnection
        var redirectCount = 0

        while (true) {
          val url = URL(currentUrl)
          connection = url.openConnection() as HttpURLConnection
          connection.connectTimeout = 15000
          connection.readTimeout = 30000
          connection.instanceFollowRedirects = true
          connection.setRequestProperty("User-Agent", "BotDetectApp-OTA")
          connection.requestMethod = "GET"
          connection.connect()

          val status = connection.responseCode
          if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
              status == HttpURLConnection.HTTP_MOVED_PERM ||
              status == HttpURLConnection.HTTP_SEE_OTHER ||
              status == 307 || status == 308) {
            val newUrl = connection.getHeaderField("Location")
            if (newUrl != null && redirectCount < 5) {
              currentUrl = newUrl
              redirectCount++
              continue
            }
          }
          break
        }

        if (connection.responseCode !in 200..299) {
          Log.e("OTAModule", "Download failed with HTTP ${connection.responseCode}")
          promise.reject("DOWNLOAD_ERROR", "Server returned HTTP ${connection.responseCode}")
          return@Thread
        }

        val destDir = reactContext.filesDir
        val tempFile = File(destDir, "app.bundle.tmp")
        val finalFile = File(destDir, "app.bundle")

        connection.inputStream.use { input ->
          FileOutputStream(tempFile).use { output ->
            input.copyTo(output)
          }
        }

        if (tempFile.exists() && tempFile.length() > 0) {
          if (finalFile.exists()) {
            finalFile.delete()
          }
          tempFile.renameTo(finalFile)
          Log.d("OTAModule", "Bundle saved to ${finalFile.absolutePath} (${finalFile.length()} bytes)")
          promise.resolve(true)
        } else {
          promise.reject("DOWNLOAD_EMPTY", "Downloaded bundle file was empty")
        }
      } catch (e: Exception) {
        Log.e("OTAModule", "Download failed: ${e.message}", e)
        promise.reject("DOWNLOAD_FAILED", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  fun reloadApp(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        Log.d("OTAModule", "Reloading React Native context cleanly...")
        val activity = reactContext.currentActivity
        if (activity != null) {
          activity.recreate()
          promise.resolve(true)
        } else {
          val app = reactContext.applicationContext as? MainApplication
          val reactHost = app?.reactHost
          if (reactHost != null) {
            reactHost.reload("OTA dynamic update")
            promise.resolve(true)
          } else {
            promise.resolve(false)
          }
        }
      } catch (e: Exception) {
        Log.e("OTAModule", "Reload failed: ${e.message}", e)
        promise.reject("RELOAD_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun hasDownloadedBundle(promise: Promise) {
    val file = File(reactContext.filesDir, "app.bundle")
    promise.resolve(file.exists() && file.length() > 0)
  }

  @ReactMethod
  fun clearDownloadedBundle(promise: Promise) {
    val file = File(reactContext.filesDir, "app.bundle")
    if (file.exists()) {
      file.delete()
    }
    promise.resolve(true)
  }
}
