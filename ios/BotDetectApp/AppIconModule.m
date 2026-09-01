#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppIconModule, NSObject)

RCT_EXTERN_METHOD(changeAppIcon:(NSString *)iconName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCurrentIcon:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
