package com.botdetectapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class BotDetectMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        // Play loud continuous siren immediately in Native Kotlin (works even when app is killed)
        SirenModule.playSirenDirectly(applicationContext, 0)

        // Show Heads-Up notification with "STOP SIREN" action button
        showSirenNotification(remoteMessage)
    }

    private fun showSirenNotification(remoteMessage: RemoteMessage) {
        try {
            val channelId = "botdetect_alarm_channel_v2"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "BotDetect Emergency Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Urgent alerts that trigger alarm siren"
                    enableVibration(true)
                    setBypassDnd(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            // Intent when notification body is clicked: Open MainActivity and silence siren
            val contentIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("from_notification", true)
                putExtra("stop_siren", true)
            }
            val contentPendingIntent = PendingIntent.getActivity(
                this,
                0,
                contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Intent when "STOP SIREN" button is clicked in notification
            val stopIntent = Intent(this, StopSirenReceiver::class.java)
            val stopPendingIntent = PendingIntent.getBroadcast(
                this,
                1,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val title = remoteMessage.notification?.title
                ?: remoteMessage.data["title"]
                ?: "BotDetect Siren Alert"
            val body = remoteMessage.notification?.body
                ?: remoteMessage.data["body"]
                ?: "Notification received - Siren is sounding"

            val notification = NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(contentPendingIntent)
                .addAction(android.R.drawable.ic_lock_silent_mode_off, "STOP SIREN", stopPendingIntent)
                .setOngoing(true)
                .build()

            notificationManager.notify(1001, notification)
        } catch (_: Exception) {}
    }
}
