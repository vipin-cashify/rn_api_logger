package com.legoapilogger

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.regex.Pattern

@ReactModule(name = LegoAPILoggerModule.NAME)
class LegoAPILoggerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "LegoAPILoggerModule"
    }

    override fun getName(): String = NAME

    override fun initialize() {
        super.initialize()
        LegoAPILoggerStore.eventEmitter = { log ->
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onAPILog", log)
        }
    }

    override fun invalidate() {
        super.invalidate()
        LegoAPILoggerStore.eventEmitter = null
    }

    @ReactMethod
    fun getLogs(promise: Promise) {
        val logs = LegoAPILoggerStore.getLogs()
        Log.d("RNLegoApp", "LegoAPILogger::getLogs: ${logs.size()}")
        promise.resolve(logs)
    }

    @ReactMethod
    fun clearLogs() {
        Log.d("RNLegoApp", "LegoAPILoggerClearLogs")
        LegoAPILoggerStore.clearLogs()
    }

    @ReactMethod
    fun setFilters(domainRegexArr: ReadableArray?, pathRegexArr: ReadableArray?) {
        Log.d(
            "RNLegoApp",
            "LegoAPILoggerSetFilters::domainRegexArr: $domainRegexArr, pathRegexArr: $pathRegexArr",
        )
        LegoAPILoggerStore.domainRegexes =
            domainRegexArr?.toArrayList()?.map { Pattern.compile(it.toString()) }
        LegoAPILoggerStore.pathRegexes =
            pathRegexArr?.toArrayList()?.map { Pattern.compile(it.toString()) }
    }

    @ReactMethod
    fun enableLogging() {
        Log.d("RNLegoApp", "LegoAPILoggerEnableLogging")
        LegoAPILoggerStore.loggingEnabled = true
    }

    @ReactMethod
    fun disableLogging() {
        Log.d("RNLegoApp", "LegoAPILoggerDisableLogging")
        LegoAPILoggerStore.loggingEnabled = false
    }

    // Required for RN's NativeEventEmitter (warns otherwise on RN 0.65+).
    @ReactMethod
    fun addListener(eventName: String) {
        // no-op
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // no-op
    }
}
