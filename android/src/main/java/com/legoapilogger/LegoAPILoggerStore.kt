package com.legoapilogger

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.net.URL
import java.util.regex.Pattern

object LegoAPILoggerStore {
    private val logs = mutableListOf<HashMap<String, Any?>>()

    internal var domainRegexes: List<Pattern>? = null
    internal var pathRegexes: List<Pattern>? = null

    var eventEmitter: ((WritableMap) -> Unit)? = null

    internal var loggingEnabled: Boolean = false

    fun addLog(log: WritableMap) {
        val snapshot = log.toHashMap()
        logs.add(snapshot)
        eventEmitter?.invoke(log)
    }

    fun isValidRequest(requestUrl: String): Boolean {
        try {
            val urlObj = URL(requestUrl)
            val domain = urlObj.host
            val path = urlObj.path

            if (domainRegexes != null && domainRegexes!!.isNotEmpty()
                && domainRegexes!!.none { it.matcher(domain).matches() }
            ) {
                return false
            }
            if (pathRegexes != null && pathRegexes!!.isNotEmpty()
                && pathRegexes!!.none { it.matcher(path).matches() }
            ) {
                return false
            }
            Log.d("RNLegoApp", "LegoAPILoggerStore::addLog domain: $domain path: $path")
        } catch (e: Exception) {
            Log.e("RNLegoApp", "LegoAPILoggerStore::addLog ${e.localizedMessage}")
            return false
        }
        return true
    }

    fun clearLogs() {
        Log.d("RNLegoApp", "LegoAPILoggerStore::clearLogs")
        logs.clear()
    }

    fun getLogs(): WritableArray {
        return Arguments.createArray().apply {
            logs.forEach { snapshot ->
                pushMap(toWritableMap(snapshot))
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun toWritableMap(map: Map<String, Any?>): WritableMap {
        return Arguments.createMap().also { out ->
            map.forEach { (key, value) ->
                when (value) {
                    null -> out.putNull(key)
                    is Boolean -> out.putBoolean(key, value)
                    is Int -> out.putInt(key, value)
                    is Long -> out.putDouble(key, value.toDouble())
                    is Float -> out.putDouble(key, value.toDouble())
                    is Double -> out.putDouble(key, value)
                    is String -> out.putString(key, value)
                    is Map<*, *> -> out.putMap(key, toWritableMap(value as Map<String, Any?>))
                    is List<*> -> out.putArray(key, toWritableArray(value))
                    else -> out.putString(key, value.toString())
                }
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun toWritableArray(list: List<*>): WritableArray {
        return Arguments.createArray().also { out ->
            list.forEach { item ->
                when (item) {
                    null -> out.pushNull()
                    is Boolean -> out.pushBoolean(item)
                    is Int -> out.pushInt(item)
                    is Long -> out.pushDouble(item.toDouble())
                    is Float -> out.pushDouble(item.toDouble())
                    is Double -> out.pushDouble(item)
                    is String -> out.pushString(item)
                    is Map<*, *> -> out.pushMap(toWritableMap(item as Map<String, Any?>))
                    is List<*> -> out.pushArray(toWritableArray(item))
                    else -> out.pushString(item.toString())
                }
            }
        }
    }
}
