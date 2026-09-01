package com.botdetectapp

import android.app.Activity
import android.content.Intent
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
        val url = URL(bundleUrl)
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 15000
        connection.readTimeout = 30000
        connection.requestMethod = "GET"
        connection.connect()

        if (connection.responseCode !in 200..299) {
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
          promise.resolve(true)
        } else {
          promise.reject("DOWNLOAD_EMPTY", "Downloaded bundle file was empty")
        }
      } catch (e: Exception) {
        promise.reject("DOWNLOAD_FAILED", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  fun reloadApp(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val activity: Activity? = reactApplicationContext.currentActivity
        if (activity != null) {
          val intent = activity.intent
          intent.addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
          activity.finish()
          activity.overridePendingTransition(0, 0)
          activity.startActivity(intent)
          activity.overridePendingTransition(0, 0)
          promise.resolve(true)
        } else {
          promise.resolve(false)
        }
      } catch (e: Exception) {
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
