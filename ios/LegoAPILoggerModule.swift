import Foundation
import React

@objc(LegoAPILoggerModule)
public class LegoAPILoggerModule: RCTEventEmitter {

    public override init() {
        super.init()
        LegoAPILoggerStore.shared.eventEmitter = { [weak self] log in
            self?.sendEvent(withName: "onAPILog", body: log)
        }
    }

    deinit {
        LegoAPILoggerStore.shared.eventEmitter = nil
    }

    @objc
    public override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    public override func supportedEvents() -> [String]! {
        return ["onAPILog"]
    }

    // MARK: - Bridge methods

    @objc(getLogs:rejecter:)
    public func getLogs(_ resolve: RCTPromiseResolveBlock,
                        rejecter reject: RCTPromiseRejectBlock) {
        resolve(LegoAPILoggerStore.shared.logs)
    }

    @objc(clearLogs)
    public func clearLogs() {
        LegoAPILoggerStore.shared.clearLogs()
    }

    @objc(setFilters:pathRegexArr:)
    public func setFilters(_ domainRegexArr: [String]?, pathRegexArr: [String]?) {
        if let patterns = domainRegexArr {
            LegoAPILoggerStore.shared.domainRegexes = patterns.compactMap {
                try? NSRegularExpression(pattern: $0, options: [])
            }
        } else {
            LegoAPILoggerStore.shared.domainRegexes = nil
        }
        if let patterns = pathRegexArr {
            LegoAPILoggerStore.shared.pathRegexes = patterns.compactMap {
                try? NSRegularExpression(pattern: $0, options: [])
            }
        } else {
            LegoAPILoggerStore.shared.pathRegexes = nil
        }
    }

    @objc(enableLogging)
    public func enableLogging() {
        LegoAPILoggerStore.shared.loggingEnabled = true
    }

    @objc(disableLogging)
    public func disableLogging() {
        LegoAPILoggerStore.shared.loggingEnabled = false
    }

    /// Convenience: returns a URLSessionConfiguration with the logger protocol inserted
    /// at index 0. Use this from your AppDelegate together with
    /// `RCTSetCustomNSURLSessionConfigurationProvider`.
    @objc public static func configurationWithProtocol() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.default
        var protocolClasses = configuration.protocolClasses ?? []
        protocolClasses.insert(LegoAPILoggerProtocol.self, at: 0)
        configuration.protocolClasses = protocolClasses
        return configuration
    }
}
