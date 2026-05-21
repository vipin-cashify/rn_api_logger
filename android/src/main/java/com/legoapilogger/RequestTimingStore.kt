package com.legoapilogger

import okhttp3.Call
import java.util.Collections
import java.util.WeakHashMap

data class RequestTimingInfo(
    var dnsDuration: Double = 0.0,
    var connectDuration: Double = 0.0,
    var handshakeDuration: Double = 0.0,
    var requestDuration: Double = 0.0,
    var responseDuration: Double = 0.0,
    var latency: Double = 0.0,
    var cipherSuite: String = "",
    var protocol: String = "",
    var peerPrincipal: String? = null,
)

object RequestTimingStore {
    private val store = Collections.synchronizedMap(WeakHashMap<Call, RequestTimingInfo>())

    fun get(call: Call): RequestTimingInfo {
        synchronized(store) {
            var info = store[call]
            if (info == null) {
                info = RequestTimingInfo()
                store[call] = info
            }
            return info
        }
    }
}
