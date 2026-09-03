package com.botdetectapp

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  companion object {
    private const val TAG = "MainActivity"
    var initialNotificationData: WritableMap? = null
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "BotDetectApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Ensure physical volume buttons control the notification / media audio stream
    volumeControlStream = AudioManager.STREAM_NOTIFICATION

    // Keep screen awake while app is active to prevent idle device sleep/black screen
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }

    handleSirenIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleSirenIntent(intent)
  }

  private fun handleSirenIntent(intent: Intent?) {
    if (intent == null) return
    val fromNotif = intent.getBooleanExtra("from_notification", false) ||
        intent.hasExtra("url") ||
        intent.hasExtra("sessionId") ||
        intent.hasExtra("type") ||
        intent.hasExtra("soundType") ||
        intent.hasExtra("google.message_id")

    if (fromNotif) {
      Log.d(TAG, "Notification tapped -> Stopping sound immediately & forwarding to React")
      SirenModule.stopSirenDirectly(applicationContext)
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      notificationManager?.cancel(1001)

      sendNotificationIntentToReact(intent)
    }
  }

  private fun sendNotificationIntentToReact(intent: Intent) {
    try {
      val bundle = intent.extras ?: return
      val map = Arguments.createMap()
      for (key in bundle.keySet()) {
        val value = bundle.get(key)
        when (value) {
          is String -> map.putString(key, value)
          is Int -> map.putInt(key, value)
          is Boolean -> map.putBoolean(key, value)
          is Double -> map.putDouble(key, value)
          is Float -> map.putDouble(key, value.toDouble())
          is Long -> map.putDouble(key, value.toDouble())
          else -> if (value != null) map.putString(key, value.toString())
        }
      }

      initialNotificationData = map

      val reactContext = reactHost.currentReactContext ?: reactInstanceManager?.currentReactContext
      if (reactContext != null && reactContext.hasActiveReactInstance()) {
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("onNotificationOpened", map)
        Log.d(TAG, "Emitted onNotificationOpened to active React context: $map")
      } else {
        Log.d(TAG, "Saved initialNotificationData for deferred delivery: $map")
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to send notification intent to JS: ${e.message}")
    }
  }
}
