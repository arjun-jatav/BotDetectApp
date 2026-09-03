import Foundation
import AppKit

let logoPath = "/Users/jploft/Desktop/Projects/BotDetectApp/src/assets/images/jploft_logo@3x.png"
guard let sourceImage = NSImage(contentsOfFile: logoPath) else {
    print("Failed to load source logo at \(logoPath)")
    exit(1)
}

let sizes: [(String, CGFloat)] = [
    ("android/app/src/main/res/mipmap-mdpi", 48),
    ("android/app/src/main/res/mipmap-hdpi", 72),
    ("android/app/src/main/res/mipmap-xhdpi", 96),
    ("android/app/src/main/res/mipmap-xxhdpi", 144),
    ("android/app/src/main/res/mipmap-xxxhdpi", 192)
]

func renderIcon(size: CGFloat, isRound: Bool) -> Data? {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(size),
        pixelsHigh: Int(size),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    
    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    
    let rect = NSRect(x: 0, y: 0, width: size, height: size)
    
    if isRound {
        let clipPath = NSBezierPath(ovalIn: rect)
        clipPath.addClip()
        NSColor.white.setFill()
        clipPath.fill()
    } else {
        let cornerRadius = size * 0.18
        let clipPath = NSBezierPath(roundedRect: rect, xRadius: cornerRadius, yRadius: cornerRadius)
        clipPath.addClip()
        NSColor.white.setFill()
        clipPath.fill()
    }
    
    // Draw centered logo with padding
    let logoAspect = sourceImage.size.width / sourceImage.size.height
    let maxLogoWidth = size * 0.78
    let maxLogoHeight = size * 0.78
    
    var drawWidth = maxLogoWidth
    var drawHeight = drawWidth / logoAspect
    
    if drawHeight > maxLogoHeight {
        drawHeight = maxLogoHeight
        drawWidth = drawHeight * logoAspect
    }
    
    let drawX = (size - drawWidth) / 2.0
    let drawY = (size - drawHeight) / 2.0
    let drawRect = NSRect(x: drawX, y: drawY, width: drawWidth, height: drawHeight)
    
    sourceImage.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0)
    
    NSGraphicsContext.restoreGraphicsState()
    
    return rep.representation(using: .png, properties: [:])
}

for (folder, size) in sizes {
    let squarePath = "/Users/jploft/Desktop/Projects/BotDetectApp/\(folder)/ic_launcher.png"
    let roundPath = "/Users/jploft/Desktop/Projects/BotDetectApp/\(folder)/ic_launcher_round.png"
    
    if let squareData = renderIcon(size: size, isRound: false) {
        try? squareData.write(to: URL(fileURLWithPath: squarePath))
        print("Wrote \(squarePath) (\(Int(size))x\(Int(size)))")
    }
    if let roundData = renderIcon(size: size, isRound: true) {
        try? roundData.write(to: URL(fileURLWithPath: roundPath))
        print("Wrote \(roundPath) (\(Int(size))x\(Int(size)))")
    }
}

// iOS AppIcon 1024x1024
let iosIconPath = "/Users/jploft/Desktop/Projects/BotDetectApp/ios/BotDetectApp/Images.xcassets/AppIcon.appiconset/icon-1024.png"
if let iosData = renderIcon(size: 1024, isRound: false) {
    try? iosData.write(to: URL(fileURLWithPath: iosIconPath))
    print("Wrote \(iosIconPath) (1024x1024)")
}

print("App icons generated successfully!")
