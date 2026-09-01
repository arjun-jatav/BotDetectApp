import Foundation
import UIKit
import React

@objc(AppIconManager)
class AppIconManager: NSObject {

  @objc
  func setIcon(_ iconName: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard UIApplication.shared.supportsAlternateIcons else {
        // On simulators that return false or devices with restricted settings
        print("[AppIconManager] Warning: supportsAlternateIcons returned false.")
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
          print("[AppIconManager] Error setting alternate icon: \(error.localizedDescription)")
          reject("SET_ICON_ERROR", error.localizedDescription, error)
        } else {
          print("[AppIconManager] Successfully switched alternate icon to: \(targetName ?? "default")")
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
