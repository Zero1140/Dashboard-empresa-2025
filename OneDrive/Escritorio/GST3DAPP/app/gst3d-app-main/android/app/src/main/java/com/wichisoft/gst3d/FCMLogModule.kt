package com.wichisoft.gst3d

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import org.json.JSONArray
import org.json.JSONObject

class FCMLogModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val MODULE_NAME = "FCMLogModule"
        private const val PREFS_NAME = "FCM_LOGS"
        private const val KEY_LOGS = "logs"
        private const val MAX_LOGS = 100
        
        // Función estática para agregar logs desde otros componentes (como MyFirebaseMessagingService)
        fun addLog(context: Context, level: String, message: String, details: String? = null) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val logsJson = prefs.getString(KEY_LOGS, "[]") ?: "[]"
                val logsArray = JSONArray(logsJson)
                
                val logEntry = JSONObject().apply {
                    put("level", level)
                    put("message", message)
                    put("timestamp", java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date()))
                    details?.let { put("details", it) }
                }
                
                logsArray.put(logEntry)
                
                // Mantener solo los últimos MAX_LOGS
                while (logsArray.length() > MAX_LOGS) {
                    logsArray.remove(0)
                }
                
                prefs.edit().putString(KEY_LOGS, logsArray.toString()).apply()
            } catch (e: Exception) {
                android.util.Log.e("FCMLogModule", "Error adding log: ${e.message}")
            }
        }
    }
    
    private val prefs: SharedPreferences = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    override fun getName(): String = MODULE_NAME
    
    @ReactMethod
    fun getLogs(promise: Promise) {
        try {
            val logsJson = prefs.getString(KEY_LOGS, "[]")
            promise.resolve(logsJson)
        } catch (e: Exception) {
            promise.reject("GET_LOGS_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun clearLogs(promise: Promise) {
        try {
            prefs.edit().putString(KEY_LOGS, "[]").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_LOGS_ERROR", e.message, e)
        }
    }
}
