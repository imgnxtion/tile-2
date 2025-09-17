// swiftc windowctl.swift -o build/windowctl
// Usage: windowctl set-frame x y w h
// Note: Requires Accessibility permission (the first run will prompt).

import Cocoa
import ApplicationServices

func ensureAccessibility() -> Bool {
    let opts = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    return AXIsProcessTrustedWithOptions(opts)
}

func axValue<T>(_ type: AXValueType, _ value: T) -> AXValue {
    var v = value
    return AXValueCreate(type, &v)!
}

func frontmostAppAX() -> AXUIElement? {
    guard let app = NSWorkspace.shared.frontmostApplication else { return nil }
    return AXUIElementCreateApplication(app.processIdentifier)
}

func setFocusedWindowFrame(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat) throws {
    guard let appEl = frontmostAppAX() else { throw NSError(domain: "windowctl", code: 1, userInfo: [NSLocalizedDescriptionKey: "No frontmost app"]) }

    var focusedWin: AnyObject?
    let err = AXUIElementCopyAttributeValue(appEl, kAXFocusedWindowAttribute as CFString, &focusedWin)
    if err != .success || focusedWin == nil {
        throw NSError(domain: "windowctl", code: 2, userInfo: [NSLocalizedDescriptionKey: "No focused window"]) }

    guard let winEl = focusedWin as! AXUIElement? else { throw NSError(domain: "windowctl", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid window element"]) }

    let pos = CGPoint(x: x, y: y)
    let size = CGSize(width: w, height: h)

    let setPos = AXUIElementSetAttributeValue(winEl, kAXPositionAttribute as CFString, axValue(.cgPoint, pos))
    let setSize = AXUIElementSetAttributeValue(winEl, kAXSizeAttribute as CFString, axValue(.cgSize, size))

    if setPos != .success || setSize != .success {
        throw NSError(domain: "windowctl", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to set frame (pos: \(setPos.rawValue), size: \(setSize.rawValue))"]) }
}

func main() {
    guard CommandLine.arguments.count == 6 else {
        fputs("Usage: windowctl set-frame x y w h\n", stderr)
        exit(64)
    }
    guard CommandLine.arguments[1] == "set-frame" else {
        fputs("Unknown command. Use: set-frame\n", stderr)
        exit(64)
    }
    guard ensureAccessibility() else {
        fputs("Accessibility permission required. Please enable and re-run.\n", stderr)
        exit(65)
    }

    guard let x = Double(CommandLine.arguments[2]),
          let y = Double(CommandLine.arguments[3]),
          let w = Double(CommandLine.arguments[4]),
          let h = Double(CommandLine.arguments[5]) else {
        fputs("Invalid numeric arguments.\n", stderr)
        exit(64)
    }

    do {
        try setFocusedWindowFrame(x: CGFloat(x), y: CGFloat(y), w: CGFloat(w), h: CGFloat(h))
        print("ok")
        exit(0)
    } catch {
        fputs("\(error)\n", stderr)
        exit(1)
    }
}

main()

