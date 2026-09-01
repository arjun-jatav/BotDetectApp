import Foundation
import UIKit
import React

@objc(AppIconModule)
class AppIconModule: NSObject {

  @objc
  func changeAppIcon(_ iconName: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard UIApplication.shared.supportsAlternateIcons else {
        resolve(false)
        return
      }

      let targetName: String? = (iconName == nil || iconName == "" || iconName == "default" || iconName == "AppIcon") ? nil : iconName

      if UIApplication.shared.alternateIconName == targetName {
        resolve(true)
        return
      }

      UIApplication.shared.setAlternateIconName(targetName) { error in
        if let error = error {
          reject("SET_ICON_ERROR", error.localizedDescription, error)
        } else {
          resolve(true)
        }
      }
    }
  }

  @objc
  func getCurrentIcon(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let current = UIApplication.shared.alternateIconName ?? "default"
      resolve(current)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
