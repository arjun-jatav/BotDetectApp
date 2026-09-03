package com.botdetectapp

import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.concurrent.thread

class SirenModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        sharedReactContext = reactContext
    }

    override fun getName(): String {
        return "SirenModule"
    }

    @ReactMethod
    fun setAuthStatus(isLoggedIn: Boolean, promise: Promise?) {
        try {
            setLoggedInState(reactApplicationContext, isLoggedIn)
            if (!isLoggedIn) {
                stopSirenDirectly(reactApplicationContext)
                val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                nm?.cancelAll()
            }
            promise?.resolve(true)
        } catch (e: Exception) {
            promise?.reject("AUTH_STATUS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun playSiren(durationSeconds: Double, notificationType: String?, promise: Promise?) {
        try {
            playSirenDirectly(reactApplicationContext, durationSeconds.toInt(), notificationType)
            promise?.resolve(true)
        } catch (e: Exception) {
            promise?.reject("SIREN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun playDynamicSiren(durationSeconds: Double, notificationType: String?, soundUrl: String?, soundEnabled: String?, soundType: String?, promise: Promise?) {
        try {
            val enabled = soundEnabled == null || soundEnabled.equals("true", ignoreCase = true) || soundEnabled == "1"
            playSirenDirectly(reactApplicationContext, durationSeconds.toInt(), notificationType, soundUrl, enabled, soundType)
            promise?.resolve(true)
        } catch (e: Exception) {
            promise?.reject("SIREN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopSiren(promise: Promise?) {
        try {
            stopSirenDirectly(reactApplicationContext)
            promise?.resolve(true)
        } catch (e: Exception) {
            promise?.reject("SIREN_STOP_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getInitialNotification(promise: Promise?) {
        try {
            val data = MainActivity.initialNotificationData
            MainActivity.initialNotificationData = null
            promise?.resolve(data)
        } catch (_: Exception) {
            promise?.resolve(null)
        }
    }

    companion object {
        private const val TAG = "SirenModule"
        private const val PREFS_NAME = "botdetect_prefs"
        private const val PREF_IS_LOGGED_IN = "is_logged_in"

        fun isUserLoggedIn(context: Context): Boolean {
            val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(PREF_IS_LOGGED_IN, false)
        }

        fun setLoggedInState(context: Context, isLoggedIn: Boolean) {
            val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(PREF_IS_LOGGED_IN, isLoggedIn).apply()
            Log.i(TAG, "Native auth status set to: $isLoggedIn")
        }

        var sharedReactContext: ReactApplicationContext? = null

        @Volatile
        private var isPlaying = false
        private var activeSoundUrl: String? = null
        private var preparingPlayer: MediaPlayer? = null
        private var mediaPlayer: MediaPlayer? = null
        private val activePlayers = java.util.Collections.synchronizedList(mutableListOf<MediaPlayer>())
        private var wakeLock: PowerManager.WakeLock? = null

        private fun acquireWakeLock(context: Context) {
            try {
                if (wakeLock == null) {
                    val pm = context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                    wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BotDetectApp:SirenWakeLock")
                }
                wakeLock?.let {
                    if (!it.isHeld) {
                        it.acquire(10 * 60 * 1000L) // Max 10 minutes safeguard
                    }
                }
            } catch (_: Exception) {}
        }

        private fun releaseWakeLock() {
            try {
                wakeLock?.let {
                    if (it.isHeld) {
                        it.release()
                    }
                }
                wakeLock = null
            } catch (_: Exception) {}
        }

        // Notification and sound types mapping
        private val VISITOR_LANDED_TYPES = setOf(
            "visitor_landed",
            "visitor-landed",
            "visitorlanded",
            "visitor_landed_alarm",
            "new_visitor",
            "new-visitor",
            "newvisitor",
            "visitor_activity",
            "visitor-activity",
            "visitoractivity",
            "first_message",
            "first-message",
            "firstmessage",
            "visitor_message",
            "visitor-message",
            "visitormessage",
            "lead_captured",
            "lead-captured",
            "leadcaptured",
            "meeting_booked",
            "meeting-booked",
            "meetingbooked"
        )

        private val HUMAN_INTERVENTION_TYPES = setOf(
            "human_support",
            "human-support",
            "humansupport",
            "human_support_alarm",
            "human_intervention",
            "human-intervention",
            "humanintervention",
            "high_alert",
            "high-alert",
            "highalert",
            "llm_credit_exhausted",
            "llm-credit-exhausted",
            "llmcreditexhausted",
            "conversation_taken_over",
            "conversation-taken-over",
            "conversationtakenover"
        )

        private fun isHumanIntervention(notificationType: String?, soundType: String?): Boolean {
            val normType = notificationType?.trim()?.lowercase()?.replace("-", "_") ?: ""
            val normSound = soundType?.trim()?.lowercase()?.replace("-", "_") ?: ""
            return HUMAN_INTERVENTION_TYPES.contains(normType) ||
                   HUMAN_INTERVENTION_TYPES.contains(normSound) ||
                   normSound == "high_alert"
        }

        @Synchronized
        fun playSirenDirectly(
            context: Context,
            durationSeconds: Int = 0,
            notificationType: String? = null,
            soundUrl: String? = null,
            soundEnabled: Boolean = true,
            soundType: String? = null,
            title: String? = null,
            body: String? = null,
            url: String? = null
        ) {
            // If already playing the exact sound URL, avoid duplicate playback collision
            if (isPlaying && !soundUrl.isNullOrBlank() && soundUrl == activeSoundUrl) {
                Log.d(TAG, "playSirenDirectly already playing soundUrl $soundUrl, skipping duplicate start")
                return
            }

            stopAudioOnly(context)

            val isIntervention = isHumanIntervention(notificationType, soundType)
            val effectiveDuration = if (isIntervention) (if (durationSeconds > 0) durationSeconds else 0) else (if (durationSeconds > 0) durationSeconds else 10)
            val shouldLoopIndefinitely = isIntervention && (effectiveDuration <= 0)

            // Notify React Native JS that a siren/alert has started
            try {
                val map = com.facebook.react.bridge.Arguments.createMap()
                map.putString("type", notificationType ?: "")
                map.putString("soundType", soundType ?: "")
                map.putString("soundUrl", soundUrl ?: "")
                map.putString("soundEnabled", if (soundEnabled) "true" else "false")
                map.putBoolean("isHumanIntervention", isIntervention)
                map.putBoolean("isLooping", shouldLoopIndefinitely)
                map.putInt("durationSeconds", effectiveDuration)
                if (!title.isNullOrBlank()) map.putString("title", title)
                if (!body.isNullOrBlank()) map.putString("body", body)
                if (!url.isNullOrBlank()) map.putString("url", url)
                sharedReactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onSirenStarted", map)
            } catch (_: Exception) {}

            if (!soundEnabled) {
                Log.d(TAG, "playSirenDirectly audio skipped because soundEnabled is false")
                return
            }

            isPlaying = true
            activeSoundUrl = soundUrl
            acquireWakeLock(context)

            val vibrator = getVibratorService(context)

            if (isIntervention) {
                // Urgent Siren continuous vibration pattern for Human Intervention
                val pattern = longArrayOf(0, 500, 200, 500, 200, 500, 200, 800)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, 0)
                }
            } else {
                // 10-second vibration pattern for regular notifications
                val pattern = longArrayOf(
                    0, 400, 200, 400, 200, 400, 200, 400, 200, 400,
                    200, 400, 200, 400, 200, 400, 200, 400, 200, 400
                )
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, -1)
                }
            }

            Log.d(TAG, "playSirenDirectly called with type: '$notificationType', soundType: '$soundType', isHumanIntervention: $isIntervention, duration: $effectiveDuration, soundUrl: '$soundUrl'")

            // 1. Stream dynamic sound from soundUrl key in push notification
            if (!soundUrl.isNullOrBlank() && (soundUrl.startsWith("http://") || soundUrl.startsWith("https://"))) {
                tryPlayRemoteSoundUrl(context, effectiveDuration, soundUrl, notificationType, soundType, vibrator, shouldLoopIndefinitely)
            } else {
                Log.d(TAG, "No remote soundUrl provided in push notification, audio playback skipped")
            }
        }

        private fun tryPlayRemoteSoundUrl(
            context: Context,
            durationSeconds: Int,
            soundUrl: String,
            notificationType: String?,
            soundType: String?,
            vibrator: Vibrator?,
            shouldLoop: Boolean
        ): Boolean {
            thread(start = true, name = "SirenStreamingWorker") {
                try {
                    Log.d(TAG, "Streaming dynamic push soundUrl: $soundUrl (duration: $durationSeconds, loopIndefinite: $shouldLoop)")
                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()

                    val player = MediaPlayer()
                    activePlayers.add(player)
                    preparingPlayer = player
                    player.setWakeMode(context.applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
                    player.setAudioAttributes(audioAttributes)

                    val cleanUrl = soundUrl.trim().replace(" ", "%20")
                    player.setDataSource(cleanUrl)

                    player.setOnErrorListener { mp, what, extra ->
                        Log.w(TAG, "Dynamic MediaPlayer error (what: $what, extra: $extra) for $soundUrl")
                        synchronized(SirenModule::class.java) {
                            if (preparingPlayer === mp) {
                                preparingPlayer = null
                            }
                            try {
                                mp.reset()
                                mp.release()
                            } catch (_: Exception) {}
                            activePlayers.remove(mp)
                        }
                        true
                    }

                    player.prepare() // Synchronous prepare on background worker thread ensures buffering completes in kill mode

                    synchronized(SirenModule::class.java) {
                        if (!isPlaying || preparingPlayer !== player) {
                            try {
                                player.reset()
                            } catch (_: Exception) {}
                            try {
                                player.release()
                            } catch (_: Exception) {}
                            activePlayers.remove(player)
                            if (preparingPlayer === player) {
                                preparingPlayer = null
                            }
                            return@thread
                        }
                        preparingPlayer = null
                        mediaPlayer = player

                        // Loop indefinitely ONLY for Human Intervention; regular notifications play 1 full time from start to end
                        player.isLooping = shouldLoop
                        player.setVolume(1.0f, 1.0f)

                        if (!shouldLoop) {
                            player.setOnCompletionListener { mp ->
                                Log.d(TAG, "Completed 1 full playback of dynamic soundUrl: $soundUrl")
                                synchronized(SirenModule::class.java) {
                                    try { mp.stop() } catch (_: Exception) {}
                                    try { mp.reset() } catch (_: Exception) {}
                                    try { mp.release() } catch (_: Exception) {}
                                    activePlayers.remove(mp)
                                    if (mediaPlayer === mp) mediaPlayer = null
                                    if (activePlayers.isEmpty()) {
                                        isPlaying = false
                                        activeSoundUrl = null
                                        releaseWakeLock()
                                    }
                                }
                            }
                        }

                        player.start()
                        Log.d(TAG, "Successfully started streaming dynamic MP3 from $soundUrl (isLooping: $shouldLoop)")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to stream dynamic soundUrl ($soundUrl): ${e.message}", e)
                    synchronized(SirenModule::class.java) {
                        preparingPlayer = null
                    }
                }
            }
            return true
        }

        @Synchronized
        fun stopAudioOnly(context: Context) {
            isPlaying = false
            activeSoundUrl = null

            synchronized(activePlayers) {
                val iterator = activePlayers.iterator()
                while (iterator.hasNext()) {
                    val p = iterator.next()
                    try {
                        if (p.isPlaying) {
                            p.stop()
                        }
                    } catch (_: Exception) {}
                    try {
                        p.reset()
                        p.release()
                    } catch (_: Exception) {}
                }
                activePlayers.clear()
            }

            preparingPlayer = null
            mediaPlayer = null

            stopVibratorService(getVibratorService(context))
            releaseWakeLock()
        }

        @Synchronized
        fun stopSirenDirectly(context: Context) {
            stopAudioOnly(context)

            // Immediately notify React Native to dismiss the in-app banner
            try {
                sharedReactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onSirenStopped", null)
            } catch (_: Exception) {}
        }

        private fun getVibratorService(context: Context): Vibrator? {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
        }

        private fun stopVibratorService(vibrator: Vibrator?) {
            try {
                vibrator?.cancel()
            } catch (_: Exception) {}
        }
    }
}
