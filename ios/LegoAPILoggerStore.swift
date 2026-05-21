import Foundation

@objc(LegoAPILoggerStore)
public class LegoAPILoggerStore: NSObject {

    @objc public static let shared = LegoAPILoggerStore()

    private override init() { super.init() }

    @objc public var logs: [[String: Any]] = []

    public var domainRegexes: [NSRegularExpression]? = nil
    public var pathRegexes: [NSRegularExpression]? = nil

    @objc public var loggingEnabled: Bool = false

    /// Callback invoked when a new log is added. Set by the React Native module.
    public var eventEmitter: (([String: Any]) -> Void)?

    @objc public func addLog(_ log: [String: Any], requestUrl: String) {
        guard loggingEnabled else { return }
        if let url = URL(string: requestUrl) {
            let domain = url.host ?? ""
            let path = url.path

            if let domainRegexes = domainRegexes, !domainRegexes.isEmpty {
                let matchesDomain = domainRegexes.contains {
                    $0.firstMatch(
                        in: domain,
                        options: [],
                        range: NSRange(location: 0, length: domain.utf16.count)
                    ) != nil
                }
                if !matchesDomain { return }
            }
            if let pathRegexes = pathRegexes, !pathRegexes.isEmpty {
                let matchesPath = pathRegexes.contains {
                    $0.firstMatch(
                        in: path,
                        options: [],
                        range: NSRange(location: 0, length: path.utf16.count)
                    ) != nil
                }
                if !matchesPath { return }
            }
        }

        logs.append(log)
        // Cap memory: keep last 500.
        if logs.count > 500 {
            logs.removeFirst(logs.count - 500)
        }
        eventEmitter?(log)
    }

    @objc public func clearLogs() {
        logs.removeAll()
    }
}
