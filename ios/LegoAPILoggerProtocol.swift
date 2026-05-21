import Foundation

@objc(LegoAPILoggerProtocol)
public class LegoAPILoggerProtocol: URLProtocol, URLSessionDataDelegate {
    private var dataTask: URLSessionDataTask?
    private var receivedData = Data()
    private var sessionResponse: URLResponse?
    private var startTime: Double = 0
    private var requestBodyString: String = ""

    public override class func canInit(with request: URLRequest) -> Bool {
        if !LegoAPILoggerStore.shared.loggingEnabled {
            return false
        }
        if URLProtocol.property(forKey: "LegoAPILoggerHandled", in: request) != nil {
            return false
        }
        if let scheme = request.url?.scheme, scheme == "http" || scheme == "https" {
            return true
        }
        return false
    }

    public override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    public override func startLoading() {
        guard let mutableRequest = (request as NSURLRequest).mutableCopy() as? NSMutableURLRequest else {
            return
        }
        URLProtocol.setProperty(true, forKey: "LegoAPILoggerHandled", in: mutableRequest)

        startTime = Date().timeIntervalSince1970 * 1000

        if let body = mutableRequest.httpBody {
            requestBodyString = String(data: body, encoding: .utf8) ?? ""
        } else if let bodyStream = mutableRequest.httpBodyStream {
            bodyStream.open()
            let bufferSize = 4096
            var data = Data()
            let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
            while bodyStream.hasBytesAvailable {
                let bytesRead = bodyStream.read(buffer, maxLength: bufferSize)
                if bytesRead > 0 {
                    data.append(buffer, count: bytesRead)
                } else {
                    break
                }
            }
            buffer.deallocate()
            bodyStream.close()
            requestBodyString = String(data: data, encoding: .utf8) ?? ""
            mutableRequest.httpBody = data
        }

        // Use a config without our protocol to avoid recursion.
        let config = URLSessionConfiguration.default
        config.protocolClasses = config.protocolClasses?.filter { $0 != LegoAPILoggerProtocol.self }
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        dataTask = session.dataTask(with: mutableRequest as URLRequest)
        dataTask?.resume()
    }

    public override func stopLoading() {
        dataTask?.cancel()
    }

    // MARK: - URLSessionDataDelegate

    public func urlSession(
        _ session: URLSession,
        dataTask: URLSessionDataTask,
        didReceive data: Data
    ) {
        receivedData.append(data)
        client?.urlProtocol(self, didLoad: data)
    }

    public func urlSession(
        _ session: URLSession,
        dataTask: URLSessionDataTask,
        didReceive response: URLResponse,
        completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
    ) {
        self.sessionResponse = response
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        completionHandler(.allow)
    }

    public func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        let endTime = Date().timeIntervalSince1970 * 1000

        if let error = error {
            client?.urlProtocol(self, didFailWithError: error)
        } else {
            client?.urlProtocolDidFinishLoading(self)
        }

        let urlString = request.url?.absoluteString ?? ""
        let method = request.httpMethod ?? ""
        let statusCode = (sessionResponse as? HTTPURLResponse)?.statusCode ?? 0
        let responseBodyString = String(data: receivedData, encoding: .utf8) ?? ""
        let responseContentType = (sessionResponse as? HTTPURLResponse)?
            .allHeaderFields["Content-Type"] as? String ?? ""
        let responseSize = responseBodyString.data(using: .utf8)?.count ?? 0
        let requestHeaders = request.allHTTPHeaderFields ?? [:]
        let responseHeaders = (sessionResponse as? HTTPURLResponse)?
            .allHeaderFields as? [String: String] ?? [:]

        var gqlOperation = ""
        if let jsonData = requestBodyString.data(using: .utf8),
           let jsonObject = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
           let operationName = jsonObject["operationName"] as? String {
            gqlOperation = operationName
        }

        let log: [String: Any] = [
            "id": UUID().uuidString,
            "type": "API",
            "url": urlString,
            "method": method,
            "status": statusCode,
            "dataSent": requestBodyString,
            "responseContentType": responseContentType,
            "responseSize": responseSize,
            "requestHeaders": requestHeaders,
            "responseHeaders": responseHeaders,
            "response": responseBodyString,
            "responseURL": urlString,
            "responseType": "text",
            "timeout": 0,
            "closeReason": error?.localizedDescription ?? "",
            "messages": "",
            "startTime": startTime,
            "endTime": endTime,
            "updatedAt": Date().timeIntervalSince1970 * 1000,
            "gqlOperation": gqlOperation,
        ]

        LegoAPILoggerStore.shared.addLog(log, requestUrl: urlString)
    }
}
