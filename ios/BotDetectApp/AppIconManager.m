#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppIconManager, NSObject)

RCT_EXTERN_METHOD(setIcon:(NSString *)iconName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCurrentIcon:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
