package com.legoapilogger

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.json.JSONObject
import java.util.UUID

class LegoAPILoggerInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request: Request = chain.request()
        if (!LegoAPILoggerStore.loggingEnabled ||
            !LegoAPILoggerStore.isValidRequest(request.url.toString())
        ) {
            return chain.proceed(request)
        }

        Log.d("RNLegoApp", "LegoAPILoggerInterceptor, intercepting request")
        val startTime = System.currentTimeMillis()
        var requestBodyStr = ""
        request.body?.let { body ->
            val buffer = Buffer()
            body.writeTo(buffer)
            requestBodyStr = buffer.readUtf8()
        }

        val response = chain.proceed(request)
        val endTime = System.currentTimeMillis()

        val responseBody = response.body
        val responseBodyString = responseBody?.string() ?: ""

        val log: WritableMap = Arguments.createMap().apply {
            putString("id", UUID.randomUUID().toString())
            putString("type", "API")
            putString("url", request.url.toString())
            putString("method", request.method)
            putInt("status", response.code)
            putString("dataSent", requestBodyStr)
            putString("responseContentType", response.header("Content-Type") ?: "")
            putInt("responseSize", responseBodyString.toByteArray().size)

            val reqHeaders = Arguments.createMap()
            for (name in request.headers.names()) {
                reqHeaders.putString(name, request.header(name))
            }
            putMap("requestHeaders", reqHeaders)

            val respHeaders = Arguments.createMap()
            for (i in 0 until response.headers.size) {
                respHeaders.putString(response.headers.name(i), response.headers.value(i))
            }
            putMap("responseHeaders", respHeaders)

            putString("response", responseBodyString)
            putString("responseURL", response.request.url.toString())
            putString("responseType", "text")
            putInt("timeout", 0)
            putString("closeReason", "")
            putString("messages", "")
            putDouble("startTime", startTime.toDouble())
            putDouble("endTime", endTime.toDouble())
            putDouble("updatedAt", System.currentTimeMillis().toDouble())

            try {
                val jsonObj = JSONObject(requestBodyStr)
                if (jsonObj.has("operationName")) {
                    putString("gqlOperation", jsonObj.getString("operationName"))
                } else {
                    putString("gqlOperation", "")
                }
            } catch (e: Exception) {
                putString("gqlOperation", "")
            }

            val timingInfo = RequestTimingStore.get(chain.call())
            val timingMap = Arguments.createMap().apply {
                putDouble("dns", timingInfo.dnsDuration)
                putDouble("connect", timingInfo.connectDuration)
                putDouble("handshake", timingInfo.handshakeDuration)
                putDouble("request", timingInfo.requestDuration)
                putDouble("response", timingInfo.responseDuration)
                putDouble("latency", timingInfo.latency)
                putString("cipherSuite", timingInfo.cipherSuite)
                putString("protocol", timingInfo.protocol)
                putString("peerPrincipal", timingInfo.peerPrincipal ?: "")
            }
            putMap("timings", timingMap)
        }

        LegoAPILoggerStore.addLog(log)

        val newResponseBody = responseBodyString.toResponseBody(responseBody?.contentType())
        return response.newBuilder().body(newResponseBody).build()
    }
}
