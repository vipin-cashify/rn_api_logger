package com.legoapilogger

import okhttp3.Call
import okhttp3.EventListener
import okhttp3.Handshake
import okhttp3.Protocol
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Proxy

class LegoTimingEventListener(
    private val callId: Long,
    private val startTime: Long,
) : EventListener() {

    private var dnsStartTime: Long = 0
    private var connectStartTime: Long = 0
    private var secureConnectStartTime: Long = 0
    private var requestHeadersStartTime: Long = 0
    private var requestBodyEndTime: Long = 0
    private var responseHeadersStartTime: Long = 0
    private var responseBodyEndTime: Long = 0

    override fun dnsStart(call: Call, domainName: String) {
        dnsStartTime = System.currentTimeMillis()
    }

    override fun dnsEnd(call: Call, domainName: String, inetAddressList: List<InetAddress>) {
        val duration = System.currentTimeMillis() - dnsStartTime
        RequestTimingStore.get(call).dnsDuration = duration.toDouble()
    }

    override fun connectStart(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy) {
        connectStartTime = System.currentTimeMillis()
    }

    override fun connectEnd(
        call: Call,
        inetSocketAddress: InetSocketAddress,
        proxy: Proxy,
        protocol: Protocol?,
    ) {
        val duration = System.currentTimeMillis() - connectStartTime
        RequestTimingStore.get(call).connectDuration = duration.toDouble()
    }

    override fun secureConnectStart(call: Call) {
        secureConnectStartTime = System.currentTimeMillis()
    }

    override fun secureConnectEnd(call: Call, handshake: Handshake?) {
        val secureConnectEndTime = System.currentTimeMillis()
        val duration = secureConnectEndTime - secureConnectStartTime

        val info = RequestTimingStore.get(call)
        info.handshakeDuration = duration.toDouble()

        if (handshake != null) {
            info.cipherSuite = handshake.cipherSuite.javaName
            info.protocol = handshake.tlsVersion.javaName
            info.peerPrincipal = handshake.peerPrincipal?.name
        }
    }

    override fun requestHeadersStart(call: Call) {
        requestHeadersStartTime = System.currentTimeMillis()
    }

    override fun requestBodyEnd(call: Call, byteCount: Long) {
        requestBodyEndTime = System.currentTimeMillis()
        calculateRequestDuration(call)
    }

    override fun requestHeadersEnd(call: Call, request: okhttp3.Request) {
        if (request.body == null) {
            requestBodyEndTime = System.currentTimeMillis()
            calculateRequestDuration(call)
        }
    }

    private fun calculateRequestDuration(call: Call) {
        if (requestHeadersStartTime > 0 && requestBodyEndTime > 0) {
            val duration = requestBodyEndTime - requestHeadersStartTime
            RequestTimingStore.get(call).requestDuration = duration.toDouble()
        }
    }

    override fun responseHeadersStart(call: Call) {
        responseHeadersStartTime = System.currentTimeMillis()
        if (requestBodyEndTime > 0) {
            val latency = responseHeadersStartTime - requestBodyEndTime
            RequestTimingStore.get(call).latency = latency.toDouble()
        }
    }

    override fun responseBodyEnd(call: Call, byteCount: Long) {
        responseBodyEndTime = System.currentTimeMillis()
        if (responseHeadersStartTime > 0) {
            val duration = responseBodyEndTime - responseHeadersStartTime
            RequestTimingStore.get(call).responseDuration = duration.toDouble()
        }
    }

    class Factory : EventListener.Factory {
        override fun create(call: Call): EventListener {
            val callId = System.identityHashCode(call).toLong()
            return LegoTimingEventListener(callId, System.currentTimeMillis())
        }
    }
}
