package com.botdetectapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class BotDetectMessagingService : FirebaseMessagingService() {

    companion object {
        private val SIREN_NOTIFICATION_TYPES = setOf(
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
            "meetingbooked",
            "attachment",
            "visitor_landed",
            "visitor-landed",
            "visitorlanded",
            "visitor_landed_alarm",
            "new_visitor",
            "new-visitor",
            "newvisitor",
            "human_support",
            "human-support",
            "humansupport",
            "human_support_alarm",
            "llm_credit_exhausted",
            "llm-credit-exhausted",
            "llmcreditexhausted",
            "conversation_taken_over",
            "conversation-taken-over",
            "conversationtakenover",
            "test_push",
            "test-push"
        )

        fun extractNotificationType(data: Map<String, String>?): String {
            if (data == null) return ""
            val raw = data["type"]
                ?: data["notification_type"]
                ?: data["notificationType"]
                ?: data["alert_type"]
                ?: data["alertType"]
                ?: data["event"]
                ?: data["category"]
                ?: ""
            return raw.trim().lowercase().replace("-", "_")
        }

        val HUMAN_INTERVENTION_TYPES = setOf(
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

        fun isHumanInterventionIntent(data: Map<String, String>?): Boolean {
            if (data == null) return false
            val type = extractNotificationType(data)
            val soundType = (data["soundType"] ?: data["sound_type"])?.trim()?.lowercase()?.replace("-", "_") ?: ""
            return HUMAN_INTERVENTION_TYPES.contains(type) || HUMAN_INTERVENTION_TYPES.contains(soundType) || soundType == "high_alert"
        }

        fun isSirenNotification(data: Map<String, String>?): Boolean {
            if (data == null) return false
            val soundEnabledStr = data["soundEnabled"] ?: data["sound_enabled"] ?: data["sound_enable"]
            if (soundEnabledStr?.equals("false", ignoreCase = true) == true || soundEnabledStr == "0") {
                return false
            }
            if (soundEnabledStr?.equals("true", ignoreCase = true) == true || soundEnabledStr == "1") {
                return true
            }
            if (!data["soundUrl"].isNullOrBlank() || !data["sound_url"].isNullOrBlank() || (data["sound"]?.startsWith("http") == true)) {
                return true
            }
            val soundType = (data["soundType"] ?: data["sound_type"])?.trim()?.lowercase()?.replace("-", "_")
            if (!soundType.isNullOrBlank() && soundType != "none" && soundType != "default") {
                return true
            }
            val type = extractNotificationType(data)
            return SIREN_NOTIFICATION_TYPES.contains(type)
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val isLoggedIn = SirenModule.isUserLoggedIn(applicationContext)
        if (!isLoggedIn) {
            Log.i("BotDetectPush", "🚫 [PUSH IGNORED] User is logged out. Suppressing push notification & siren.")
            return
        }

        val data = remoteMessage.data
        val notifType = extractNotificationType(data)
        val isHumanIntervention = isHumanInterventionIntent(data)
        val isSiren = isSirenNotification(data)

        val soundEnabledStr = data["soundEnabled"] ?: data["sound_enabled"] ?: data["sound_enable"]
        val soundEnabled = soundEnabledStr == null || soundEnabledStr.equals("true", ignoreCase = true) || soundEnabledStr == "1"
        val soundUrl = data["soundUrl"] ?: data["sound_url"] ?: (if (data["sound"]?.startsWith("http") == true) data["sound"] else null)
        val soundType = data["soundType"] ?: data["sound_type"]

        Log.i("BotDetectPush", "========================================")
        Log.i("BotDetectPush", "🔔 [NATIVE FCM RECEIVED] ID: ${remoteMessage.messageId}")
        Log.i("BotDetectPush", "📦 Notification Title: ${remoteMessage.notification?.title}")
        Log.i("BotDetectPush", "📦 Notification Body: ${remoteMessage.notification?.body}")
        Log.i("BotDetectPush", "📦 Data Map: $data")
        Log.i("BotDetectPush", "🎵 type=$notifType | soundType=$soundType | isHumanIntervention=$isHumanIntervention | soundEnabled=$soundEnabled | soundUrl=$soundUrl | isSiren=$isSiren")
        Log.i("BotDetectPush", "========================================")

        val title = remoteMessage.notification?.title ?: data["title"]
        val body = remoteMessage.notification?.body ?: data["body"]
        val url = data["url"] ?: data["link"] ?: data["chatUrl"] ?: data["chat_url"]

        val pm = applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BotDetectApp:FCMServiceWakeLock")
        try {
            wakeLock?.acquire(30000L)
        } catch (_: Exception) {}

        if (isSiren) {
            // Human Intervention loops continuously (durationSeconds = 0); other types play 1 full time from start to end (durationSeconds = 1)
            SirenModule.playSirenDirectly(
                context = applicationContext,
                durationSeconds = if (isHumanIntervention) 0 else 1,
                notificationType = notifType,
                soundUrl = soundUrl,
                soundEnabled = soundEnabled,
                soundType = soundType,
                title = title,
                body = body,
                url = url
            )
        }

        // Show Heads-Up notification with "STOP SIREN" action button ONLY for Human Intervention
        showSirenNotification(remoteMessage, isSiren && soundEnabled, isHumanIntervention && soundEnabled)
    }

    private fun showSirenNotification(remoteMessage: RemoteMessage, isSiren: Boolean, isHumanIntervention: Boolean) {
        try {
            val channelId = if (isHumanIntervention) "botdetect_alarm_channel_v2" else "botdetect_general_channel"
            val channelName = if (isHumanIntervention) "JPLoft Agent Emergency Alerts" else "JPLoft Agent Notifications"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    channelName,
                    if (isHumanIntervention) NotificationManager.IMPORTANCE_HIGH else NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = if (isHumanIntervention) "Urgent alerts that trigger alarm siren" else "Standard notifications"
                    enableVibration(true)
                    if (isHumanIntervention) {
                        setBypassDnd(true)
                    }
                }
                notificationManager.createNotificationChannel(channel)
            }

            val notificationId = if (isHumanIntervention) 1001 else (System.currentTimeMillis() % 10000).toInt() + 2000

            // Intent when notification body is clicked: Open MainActivity and navigate to target URL
            val contentIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("from_notification", true)
                for ((key, value) in remoteMessage.data) {
                    putExtra(key, value)
                }
            }
            val contentPendingIntent = PendingIntent.getActivity(
                this,
                notificationId,
                contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val title = remoteMessage.notification?.title
                ?: remoteMessage.data["title"]
                ?: if (isHumanIntervention) "JPLoft Agent Siren Alert" else "JPLoft Agent"
            val body = remoteMessage.notification?.body
                ?: remoteMessage.data["body"]
                ?: if (isHumanIntervention) "Human support requested - Siren is sounding" else "New notification received"

            val notificationBuilder = NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(contentPendingIntent)

            if (isHumanIntervention) {
                // Intent when "STOP SIREN" button is clicked in notification (ONLY for Human Intervention)
                val stopIntent = Intent(this, StopSirenReceiver::class.java)
                val stopPendingIntent = PendingIntent.getBroadcast(
                    this,
                    1,
                    stopIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                notificationBuilder
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setOngoing(true)
                    .addAction(android.R.drawable.ic_lock_silent_mode_off, "STOP SIREN", stopPendingIntent)
            } else {
                notificationBuilder
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setOngoing(false)
            }

            notificationManager.notify(notificationId, notificationBuilder.build())
        } catch (_: Exception) {}
    }
}
