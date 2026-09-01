package com.botdetectapp

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import kotlin.concurrent.thread
import kotlin.math.sin

class SirenModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SirenModule"
    }

    @ReactMethod
    fun playSiren(durationSeconds: Int, promise: Promise?) {
        try {
            playSirenDirectly(reactApplicationContext, durationSeconds)
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

    companion object {
        @Volatile
        private var isPlaying = false
        private var sirenThread: Thread? = null
        private var audioTrack: AudioTrack? = null
        private var ringtone: Ringtone? = null

        @Synchronized
        fun playSirenDirectly(context: Context, durationSeconds: Int = 0) {
            stopSirenDirectly(context)
            isPlaying = true

            val vibrator = getVibratorService(context)

            // Urgent Siren vibration pattern
            val pattern = longArrayOf(0, 500, 200, 500, 200, 500, 200, 800)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }

            // 1. Play loud Ringtone / Alarm
            try {
                val alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

                if (alertUri != null) {
                    val r = RingtoneManager.getRingtone(context.applicationContext, alertUri)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        r.isLooping = true
                    }
                    r.audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    r.play()
                    ringtone = r
                }
            } catch (_: Exception) {}

            // 2. Synthesize piercing emergency warble sound via AudioTrack
            sirenThread = thread(start = true) {
                try {
                    val sampleRate = 44100
                    val minBufferSize = AudioTrack.getMinBufferSize(
                        sampleRate,
                        AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT
                    )

                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()

                    val audioFormat = AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()

                    val track = AudioTrack.Builder()
                        .setAudioAttributes(audioAttributes)
                        .setAudioFormat(audioFormat)
                        .setBufferSizeInBytes(minBufferSize * 4)
                        .setTransferMode(AudioTrack.MODE_STREAM)
                        .build()

                    audioTrack = track
                    track.setVolume(1.0f)
                    track.play()

                    val hasDurationLimit = durationSeconds > 0
                    val totalSamples = if (hasDurationLimit) (sampleRate.toLong() * durationSeconds.toLong()) else Long.MAX_VALUE
                    val buffer = ShortArray(2048)
                    var currentSample = 0L
                    var phase = 0.0

                    while (isPlaying && (!hasDurationLimit || currentSample < totalSamples)) {
                        for (i in buffer.indices) {
                            val progress = (currentSample + i).toDouble() / sampleRate
                            val frequency = 1100.0 + 450.0 * sin(2.0 * Math.PI * progress / 0.6)
                            val angle = 2.0 * Math.PI * frequency / sampleRate
                            phase += angle
                            if (phase > 2.0 * Math.PI) {
                                phase -= 2.0 * Math.PI
                            }
                            buffer[i] = (sin(phase) * 30000.0).toInt().toShort()
                        }
                        track.write(buffer, 0, buffer.size)
                        currentSample += buffer.size
                    }

                    try {
                        track.stop()
                        track.release()
                    } catch (_: Exception) {}

                    stopRingtoneInternal()
                    stopVibratorService(vibrator)
                    isPlaying = false
                } catch (_: Exception) {
                    isPlaying = false
                }
            }
        }

        @Synchronized
        fun stopSirenDirectly(context: Context) {
            isPlaying = false
            stopRingtoneInternal()

            try {
                audioTrack?.let {
                    it.stop()
                    it.release()
                }
                audioTrack = null
            } catch (_: Exception) {}

            stopVibratorService(getVibratorService(context))

            try {
                sirenThread?.interrupt()
                sirenThread = null
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

        private fun stopRingtoneInternal() {
            try {
                ringtone?.let {
                    if (it.isPlaying) {
                        it.stop()
                    }
                }
                ringtone = null
            } catch (_: Exception) {}
        }
    }
}
