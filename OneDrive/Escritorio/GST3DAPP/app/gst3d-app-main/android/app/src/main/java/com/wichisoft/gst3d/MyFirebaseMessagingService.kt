package com.wichisoft.gst3d

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.util.concurrent.Executors

class MyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCM_GST3D"
        private const val CHANNEL_ID = "gst3d_complete"
        private const val NOTIF_ID_BASE = 900000
    }

    private val executor = Executors.newSingleThreadExecutor()
    
    // ✅ CORRECCIÓN: Crear canal en onCreate() - lugar ideal para asegurar que el sistema esté listo
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "MyFirebaseMessagingService creado - Canal de notificaciones inicializado")
        createLogEvent("info", "✅ Servicio FCM iniciado", "Canal creado")
    }
    
    // Función helper para crear eventos de log que se almacenan y pueden ser leídos por React Native
    private fun createLogEvent(level: String, message: String, details: String? = null) {
        // Escribir log usando SharedPreferences (accesible desde cualquier componente)
        FCMLogModule.addLog(applicationContext, level, message, details)
        Log.d(TAG, "[$level] $message ${details?.let { "| $it" } ?: ""}")
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Mensaje recibido: ${remoteMessage.messageId}, data=${remoteMessage.data}")

        executor.execute {
            try {
                // ✅ Canal ya creado en onCreate() - solo verificar que existe
                ensureNotificationChannel()
                createLogEvent("info", "🔔 Canal de notificación verificado")
                
                val encoded = remoteMessage.data["encoded"] ?: ""
                createLogEvent("info", "📨 Notificación recibida", "ID: ${remoteMessage.messageId}")
                createLogEvent("info", "🔍 Iniciando decodificación", "Tipo: $encoded")
                createLogEvent("info", "📋 Claves disponibles", remoteMessage.data.keys.joinToString(", "))
                
                Log.d(TAG, "[DECODE] encoded flag: '$encoded'")
                Log.d(TAG, "[DECODE] d_title raw: '${remoteMessage.data["d_title"]}'")
                Log.d(TAG, "[DECODE] d_body raw: '${remoteMessage.data["d_body"]}'")
                Log.d(TAG, "[DECODE] data keys: ${remoteMessage.data.keys}")

                // Estrictamente usar solo data decodificada; nunca notification.* para evitar texto corrupto del sistema
                val title = getDecodedText(remoteMessage.data["d_title"], encoded)
                    ?: "Notificación GST3D"

                val body = getDecodedText(remoteMessage.data["d_body"], encoded)
                    ?: remoteMessage.data["message"]
                    ?: "Mensaje recibido"

                Log.d(TAG, "[DECODE] FINAL title='$title' body='$body'")
                createLogEvent("success", "✅ Decodificación completa", "Título: ${title.take(50)}...")
                createLogEvent("success", "🔔 Notificación mostrada")
                showNotification(title, body, remoteMessage.data)
            } catch (e: Exception) {
                val errorMsg = "${e.javaClass.simpleName}: ${e.message}"
                Log.e(TAG, "Error procesando mensaje", e)
                createLogEvent("error", "❌ Error procesando mensaje", errorMsg)
                showNotification("GST3D", "Tienes un nuevo mensaje", emptyMap())
            }
        }
    }

    private fun getDecodedText(value: String?, encoded: String): String? {
        if (value.isNullOrBlank()) {
            Log.d(TAG, "[DECODE] Valor vacío o nulo")
            createLogEvent("warning", "⚠️ Valor vacío o nulo")
            return null
        }
        
        if (encoded != "b64url" && encoded != "true") {
            Log.d(TAG, "[DECODE] No necesita decodificación, usando valor directo: '$value'")
            createLogEvent("info", "ℹ️ No requiere decodificación", "Valor directo: ${value.take(50)}")
            return value
        }

        Log.d(TAG, "[DECODE] Intentando decodificar (tipo: $encoded, longitud: ${value.length})")
        createLogEvent("info", "🔧 Intentando decodificar", "Tipo: $encoded | Longitud: ${value.length}")

        val attempts = if (encoded == "b64url") listOf(
            { 
                Log.d(TAG, "[DECODE] Intento 1: Base64 URL_SAFE directo")
                createLogEvent("info", "🔍 Intento 1", "Base64 URL_SAFE directo")
                Base64.decode(value, Base64.URL_SAFE or Base64.NO_WRAP) 
            },
            {
                Log.d(TAG, "[DECODE] Intento 2: Conversión a estándar con padding correcto")
                createLogEvent("info", "🔍 Intento 2", "Conversión a estándar con padding")
                val std = value.replace('-', '+').replace('_', '/')
                val remainder = std.length % 4
                val padded = when (remainder) {
                    0 -> std
                    1 -> std + "==="  // No debería pasar, pero por seguridad
                    2 -> std + "=="
                    3 -> std + "="
                    else -> std
                }
                Base64.decode(padded, Base64.DEFAULT)
            }
        ) else listOf(
            { 
                Log.d(TAG, "[DECODE] Intento: Base64 estándar")
                createLogEvent("info", "🔍 Intento", "Base64 estándar")
                Base64.decode(value, Base64.DEFAULT) 
            }
        )
        
        for ((index, attempt) in attempts.withIndex()) {
            try {
                val decoded = String(attempt(), Charsets.UTF_8)
                val fixed = fixMojibakeIfNeeded(decoded)
                Log.d(TAG, "[DECODE] ✅ Éxito (intento ${index + 1}): '$decoded'")
                createLogEvent("success", "✅ Decodificación exitosa", "Intento ${index + 1}: ${fixed.take(100)}${if (fixed.length > 100) "..." else ""}")
                return fixed
            } catch (e: Exception) {
                Log.w(TAG, "[DECODE] ⚠️ Falló (intento ${index + 1}): ${e.message}")
                createLogEvent("warning", "⚠️ Intento falló", "Intento ${index + 1}: ${e.message}")
            }
        }
        
        Log.w(TAG, "[DECODE] ❌ Todos los intentos fallaron, devolviendo valor original")
        createLogEvent("error", "❌ Todos los intentos fallaron", "Devolviendo valor original")
        return value
    }

    // Corrige posibles casos de mojibake (Ã, Â) re-decodificando Latin1->UTF-8 y normalizando NFC
    private fun fixMojibakeIfNeeded(input: String): String {
        // Si no hay patrones típicos de mojibake, devolver igual
        if (!input.contains("Ã") && !input.contains("Â")) {
            return input
        }
        return try {
            val reparsed = String(input.toByteArray(Charsets.ISO_8859_1), Charsets.UTF_8)
            val normalized = java.text.Normalizer.normalize(reparsed, java.text.Normalizer.Form.NFC)
            createLogEvent("info", "🛠️ Mojibake detectado y corregido")
            normalized
        } catch (e: Exception) {
            Log.w(TAG, "[DECODE] No se pudo corregir mojibake: ${e.message}")
            input
        }
    }

    // ✅ CORRECCIÓN: Crear canal con verificación de existencia (evita duplicados)
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Verificar si el canal ya existe antes de crear
            if (notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "GST3D Notificaciones",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notificaciones principales de GST3D"
                    enableVibration(true)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
                Log.d(TAG, "✅ Canal de notificaciones creado: $CHANNEL_ID")
            } else {
                Log.d(TAG, "ℹ️ Canal de notificaciones ya existe: $CHANNEL_ID")
            }
        }
    }
    
    // Verificar/asegurar que el canal existe (llamado desde onMessageReceived)
    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
                // Si por alguna razón no existe, crearlo
                createNotificationChannel()
            }
        }
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            data.forEach { (k, v) -> putExtra(k, v) }
            putExtra("from_notification", true)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Usar icono pequeño 100% monocolor blanco basado en el logo GST3D
        val smallIcon = R.drawable.ic_stat_gst3d

        val imageUrl = data["imageUrl"]
        val largeIcon: Bitmap? = try {
            if (!imageUrl.isNullOrBlank()) {
                val future = com.bumptech.glide.Glide.with(this)
                    .asBitmap()
                    .load(imageUrl)
                    .submit(512, 512)
                future.get()
            } else {
                android.graphics.BitmapFactory.decodeResource(resources, R.drawable.gst3dlogo)
            }
        } catch (_: Exception) { null }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(smallIcon)
            .setLargeIcon(largeIcon)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)

        NotificationManagerCompat.from(this)
            .notify(NOTIF_ID_BASE + (System.currentTimeMillis() % 10000).toInt(), builder.build())
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Nuevo token FCM: $token")
    }

    override fun onDestroy() {
        executor.shutdown()
        super.onDestroy()
    }
}
