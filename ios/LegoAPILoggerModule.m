#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(LegoAPILoggerModule, RCTEventEmitter)

RCT_EXTERN_METHOD(getLogs:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearLogs)

RCT_EXTERN_METHOD(setFilters:(NSArray<NSString *> * _Nullable)domainRegexArr
                  pathRegexArr:(NSArray<NSString *> * _Nullable)pathRegexArr)

RCT_EXTERN_METHOD(enableLogging)

RCT_EXTERN_METHOD(disableLogging)

@end
