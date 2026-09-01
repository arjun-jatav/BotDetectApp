#!/usr/bin/env swift
import Cocoa

let defaultUrl = "https://i.ibb.co/cShJjFXX/add-horse-fab.png"
let targetUrlString = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : defaultUrl

print("📥 Fetching app icon from URL: \(targetUrlString)")

guard let url = URL(string: targetUrlString) else {
    print("❌ Invalid URL: \(targetUrlString)")
    exit(1)
}

guard let data = try? Data(contentsOf: url),
      let sourceImage = NSImage(data: data),
      let sourceCg = sourceImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("❌ Failed to download or decode image from \(targetUrlString)")
    exit(1)
}

let targetDir = "ios/BotDetectApp/Images.xcassets/AppIcon.appiconset"
let fm = FileManager.default
try? fm.createDirectory(atPath: targetDir, withIntermediateDirectories: true, attributes: nil)

// Calculate dominant color for background
var bgR: CGFloat = 48.0 / 255.0
var bgG: CGFloat = 172.0 / 255.0
var bgB: CGFloat = 82.0 / 255.0

if let dataProvider = sourceCg.dataProvider,
   let pixelData = dataProvider.data,
   let ptr = CFDataGetBytePtr(pixelData) {
    let bpp = sourceCg.bitsPerPixel / 8
    let bpr = sourceCg.bytesPerRow
    var rTotal: Double = 0, gTotal: Double = 0, bTotal: Double = 0, count: Double = 0
    for y in 0..<sourceCg.height {
        for x in 0..<sourceCg.width {
            let offset = y * bpr + x * bpp
            let a = bpp == 4 ? ptr[offset + 3] : 255
            let r = ptr[offset]
            let g = ptr[offset + 1]
            let b = ptr[offset + 2]
            if a > 200 && !(r > 230 && g > 230 && b > 230) && (r > 30 || g > 30 || b > 30) {
                rTotal += Double(r)
                gTotal += Double(g)
                bTotal += Double(b)
                count += 1
            }
        }
    }
    if count > 0 {
        bgR = CGFloat(rTotal / count) / 255.0
        bgG = CGFloat(gTotal / count) / 255.0
        bgB = CGFloat(bTotal / count) / 255.0
    }
}

let bgColor = CGColor(red: bgR, green: bgG, blue: bgB, alpha: 1.0)
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue)

func createIcon(size: Int, filename: String) {
    guard let context = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo.rawValue
    ) else {
        print("❌ Failed context for \(size)")
        return
    }
    
    context.interpolationQuality = .high
    context.setFillColor(bgColor)
    context.fill(CGRect(x: 0, y: 0, width: size, height: size))
    context.draw(sourceCg, in: CGRect(x: 0, y: 0, width: size, height: size))
    
    guard let cgImage = context.makeImage() else { return }
    let destUrl = URL(fileURLWithPath: "\(targetDir)/\(filename)")
    guard let dest = CGImageDestinationCreateWithURL(destUrl as CFURL, "public.png" as CFString, 1, nil) else { return }
    CGImageDestinationAddImage(dest, cgImage, nil)
    _ = CGImageDestinationFinalize(dest)
}

let sizes: [(Int, String)] = [
    (20, "icon-20.png"),
    (29, "icon-29.png"),
    (40, "icon-40.png"),
    (58, "icon-58.png"),
    (60, "icon-60.png"),
    (76, "icon-76.png"),
    (80, "icon-80.png"),
    (87, "icon-87.png"),
    (120, "icon-120.png"),
    (152, "icon-152.png"),
    (167, "icon-167.png"),
    (180, "icon-180.png"),
    (1024, "icon-1024.png")
]

for (size, name) in sizes {
    createIcon(size: size, filename: name)
}

let contentsJson = """
{
  "images" : [
    {
      "filename" : "icon-40.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-60.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-58.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-87.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-80.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-120.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-120.png",
      "idiom" : "iphone",
      "scale" : "2x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-180.png",
      "idiom" : "iphone",
      "scale" : "3x",
      "size" : "60x60"
    },
    {
      "filename" : "icon-20.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-40.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "20x20"
    },
    {
      "filename" : "icon-29.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-58.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "29x29"
    },
    {
      "filename" : "icon-40.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-80.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "40x40"
    },
    {
      "filename" : "icon-76.png",
      "idiom" : "ipad",
      "scale" : "1x",
      "size" : "76x76"
    },
    {
      "filename" : "icon-152.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "76x76"
    },
    {
      "filename" : "icon-167.png",
      "idiom" : "ipad",
      "scale" : "2x",
      "size" : "83.5x83.5"
    },
    {
      "filename" : "icon-1024.png",
      "idiom" : "ios-marketing",
      "scale" : "1x",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
"""

try? contentsJson.write(toFile: "\(targetDir)/Contents.json", atomically: true, encoding: .utf8)
print("✅ Successfully updated all iOS App Icons from URL!")
