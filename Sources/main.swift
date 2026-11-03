// LidWiFi — menu bar app that turns Wi‑Fi off when the lid closes
// and back on when the lid opens.
//
// Detection strategy (two independent signals, both from IOKit):
//  1. IORegisterForSystemPower  -> kIOMessageSystemWillSleep lets us turn Wi‑Fi
//     off *before* sleep is allowed (we hold the sleep until we call
//     IOAllowPowerChange), so no race with the sleep transition.
//  2. IOPMrootDomain interest   -> kIOPMMessageClamshellStateChange tells us the
//     lid moved (also covers clamshell mode with an external display, and
//     lid-open after wake).
// The authoritative lid state is always read from the "AppleClamshellState"
// registry property instead of trusting message bit layouts.

import AppKit
import CoreWLAN
import IOKit
import IOKit.pwr_mgt
import ServiceManagement

// MARK: - IOKit message constants (C macros are not imported into Swift)
private let kMsgCanSystemSleep: UInt32       = 0xE000_0270
private let kMsgSystemWillSleep: UInt32      = 0xE000_0280
private let kMsgSystemHasPoweredOn: UInt32   = 0xE000_0300
private let kMsgClamshellStateChange: UInt32 = 0xE003_4100

// MARK: - Logging
enum Log {
    static let url: URL = {
        let dir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("LidWiFi.log")
    }()
    static let fmt: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"; return f
    }()
    static func write(_ msg: String) {
        let line = "\(fmt.string(from: Date()))  \(msg)\n"
        guard let data = line.data(using: .utf8) else { return }
        if let h = try? FileHandle(forWritingTo: url) {
            h.seekToEndOfFile(); h.write(data); try? h.close()
        } else {
            try? data.write(to: url)
        }
    }
}

// MARK: - Wi‑Fi control
enum WiFi {
    static var iface: CWInterface? { CWWiFiClient.shared().interface() }

    static var isOn: Bool { iface?.powerOn() ?? false }

    @discardableResult
    static func set(_ on: Bool) -> Bool {
        if let i = iface {
            do { try i.setPower(on); return true }
            catch { Log.write("CoreWLAN setPower(\(on)) failed: \(error) — falling back to networksetup") }
        }
        // Fallback: networksetup works for admin users without sudo.
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/sbin/networksetup")
        p.arguments = ["-setairportpower", iface?.interfaceName ?? "en0", on ? "on" : "off"]
        do { try p.run(); p.waitUntilExit(); return p.terminationStatus == 0 }
        catch { Log.write("networksetup failed: \(error)"); return false }
    }
}

// MARK: - Lid sensor
enum Lid {
    static let rootDomain: io_service_t =
        IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPMrootDomain"))

    static var isClosed: Bool {
        guard let v = IORegistryEntryCreateCFProperty(rootDomain, "AppleClamshellState" as CFString,
                                                      kCFAllocatorDefault, 0)?.takeRetainedValue()
        else { return false }
        return (v as? Bool) ?? false
    }
}

// MARK: - Preferences
enum Prefs {
    static let d = UserDefaults.standard
    static var enabled: Bool {
        get { d.object(forKey: "enabled") as? Bool ?? true }
        set { d.set(newValue, forKey: "enabled") }
    }
    /// Also turn Wi‑Fi off when the lid closes but the Mac stays awake
    /// (clamshell mode with an external display).
    static var includeClamshellMode: Bool {
        get { d.bool(forKey: "includeClamshellMode") }
        set { d.set(newValue, forKey: "includeClamshellMode") }
    }
    /// True only if *we* turned Wi‑Fi off, so we never re‑enable Wi‑Fi the
    /// user switched off manually.
    static var weDisabledWiFi: Bool {
        get { d.bool(forKey: "weDisabledWiFi") }
        set { d.set(newValue, forKey: "weDisabledWiFi") }
    }
}

// MARK: - Core controller
final class Controller {
    private var rootPort: io_connect_t = 0
    private var powerNotifyPort: IONotificationPortRef?
    private var powerNotifier: io_object_t = 0
    private var interestPort: IONotificationPortRef?
    private var interestNotifier: io_object_t = 0
    var onChange: (() -> Void)?

    func start() {
        let ctx = Unmanaged.passUnretained(self).toOpaque()

        // 1. System sleep / wake
        rootPort = IORegisterForSystemPower(ctx, &powerNotifyPort, { refcon, _, type, arg in
            guard let refcon else { return }
            Unmanaged<Controller>.fromOpaque(refcon).takeUnretainedValue().power(type, arg)
        }, &powerNotifier)
        if rootPort != 0, let p = powerNotifyPort {
            CFRunLoopAddSource(CFRunLoopGetMain(),
                               IONotificationPortGetRunLoopSource(p).takeUnretainedValue(), .commonModes)
        } else {
            Log.write("ERROR: IORegisterForSystemPower failed")
        }

        // 2. Lid (clamshell) changes
        interestPort = IONotificationPortCreate(kIOMainPortDefault)
        if let ip = interestPort {
            CFRunLoopAddSource(CFRunLoopGetMain(),
                               IONotificationPortGetRunLoopSource(ip).takeUnretainedValue(), .commonModes)
            let kr = IOServiceAddInterestNotification(ip, Lid.rootDomain, kIOGeneralInterest, { refcon, _, type, _ in
                guard let refcon else { return }
                Unmanaged<Controller>.fromOpaque(refcon).takeUnretainedValue().interest(type)
            }, ctx, &interestNotifier)
            if kr != KERN_SUCCESS { Log.write("ERROR: IOServiceAddInterestNotification kr=\(kr)") }
        }

        Log.write("Started. lidClosed=\(Lid.isClosed) wifiOn=\(WiFi.isOn) enabled=\(Prefs.enabled)")
        // Recover from a crash/quit while the lid was closed.
        if !Lid.isClosed { restoreIfNeeded(reason: "launch") }
    }

    private func power(_ type: UInt32, _ arg: UnsafeMutableRawPointer?) {
        let id = Int(bitPattern: arg)
        switch type {
        case kMsgCanSystemSleep:
            IOAllowPowerChange(rootPort, id)
        case kMsgSystemWillSleep:
            // Sleep is held until IOAllowPowerChange — Wi‑Fi goes off first.
            if Lid.isClosed { disable(reason: "system will sleep (lid closed)") }
            IOAllowPowerChange(rootPort, id)
        case kMsgSystemHasPoweredOn:
            if !Lid.isClosed { restoreIfNeeded(reason: "wake (lid open)") }
            else { Log.write("Wake with lid closed (dark wake/Power Nap) — keeping Wi‑Fi off") }
        default: break
        }
        onChange?()
    }

    private func interest(_ type: UInt32) {
        guard type == kMsgClamshellStateChange else { return }
        // Message arrives slightly before the registry settles on some machines.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [self] in
            let closed = Lid.isClosed
            Log.write("Lid changed -> \(closed ? "CLOSED" : "OPEN")")
            if closed {
                if Prefs.includeClamshellMode { disable(reason: "lid closed (clamshell mode)") }
            } else {
                restoreIfNeeded(reason: "lid opened")
            }
            onChange?()
        }
    }

    private func disable(reason: String) {
        guard Prefs.enabled else { return }
        guard WiFi.isOn else { Log.write("\(reason): Wi‑Fi already off, nothing to do"); return }
        let ok = WiFi.set(false)
        if ok { Prefs.weDisabledWiFi = true }
        Log.write("\(reason): Wi‑Fi OFF \(ok ? "✓" : "✗")")
    }

    func restoreIfNeeded(reason: String) {
        guard Prefs.weDisabledWiFi else { return }
        let ok = WiFi.set(true)
        if ok { Prefs.weDisabledWiFi = false }
        Log.write("\(reason): Wi‑Fi ON \(ok ? "✓" : "✗")")
    }
}

// MARK: - Self-Installer (Double-click anywhere to install into /Applications & Menu Bar)
enum SelfInstaller {
    static let targetAppURL = URL(fileURLWithPath: "/Applications/LidWiFi.app")

    static func terminateOtherInstances() {
        let myPID = ProcessInfo.processInfo.processIdentifier
        if let bundleID = Bundle.main.bundleIdentifier {
            for app in NSRunningApplication.runningApplications(withBundleIdentifier: bundleID) where app.processIdentifier != myPID {
                app.terminate()
            }
        }
    }

    /// If launched outside `/Applications/LidWiFi.app` (e.g. from the DMG or Downloads),
    /// copies itself to `/Applications/LidWiFi.app`, clears quarantine, launches the installed copy, and exits.
    static func installIfNeeded() {
        let currentURL = Bundle.main.bundleURL.resolvingSymlinksInPath()
        let destURL = targetAppURL.resolvingSymlinksInPath()

        terminateOtherInstances()

        guard currentURL.path != destURL.path, currentURL.pathExtension == "app" else { return }

        Log.write("Self-installing from \(currentURL.path) to \(destURL.path)")
        let fm = FileManager.default
        do {
            // Brief pause to allow any previous instance to release files
            usleep(200_000)
            if fm.fileExists(atPath: destURL.path) {
                try fm.removeItem(at: destURL)
            }
            try fm.copyItem(at: currentURL, to: destURL)

            // Clear quarantine xattrs so Gatekeeper never blocks the installed copy
            let xattr = Process()
            xattr.executableURL = URL(fileURLWithPath: "/usr/bin/xattr")
            xattr.arguments = ["-cr", destURL.path]
            try? xattr.run()
            xattr.waitUntilExit()

            // Launch installed copy in /Applications
            let openProc = Process()
            openProc.executableURL = URL(fileURLWithPath: "/usr/bin/open")
            openProc.arguments = ["-n", destURL.path, "--args", "--installed"]
            try openProc.run()
            openProc.waitUntilExit()

            Log.write("Self-install succeeded; exiting temporary instance.")
            exit(0)
        } catch {
            Log.write("Self-install to /Applications failed (\(error)); continuing in place.")
        }
    }
}

// MARK: - Menu bar UI
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let controller = Controller()
    private var item: NSStatusItem!
    private let menu = NSMenu()
    private var popover: NSPopover?

    func applicationDidFinishLaunching(_ n: Notification) {
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        menu.delegate = self
        item.menu = menu
        controller.onChange = { [weak self] in self?.refreshIcon() }
        controller.start()
        refreshIcon()

        let justInstalled = CommandLine.arguments.contains("--installed")
        if justInstalled || UserDefaults.standard.object(forKey: "loginItemInitialized") == nil {
            UserDefaults.standard.set(true, forKey: "loginItemInitialized")
            if SMAppService.mainApp.status != .enabled {
                try? SMAppService.mainApp.register()
            }
        }

        // Show visual confirmation in the menu bar when installed or launched interactively
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            self?.showMenuBarBanner(installed: justInstalled)
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showMenuBarBanner(installed: false)
        return false
    }

    private func showMenuBarBanner(installed: Bool) {
        guard let button = item.button else { return }
        popover?.close()

        let vc = NSViewController()
        let container = NSView(frame: NSRect(x: 0, y: 0, width: 250, height: 64))

        let iconView = NSImageView(frame: NSRect(x: 14, y: 12, width: 40, height: 40))
        iconView.image = NSApp.applicationIconImage
        iconView.imageScaling = .scaleProportionallyUpOrDown
        container.addSubview(iconView)

        let titleLabel = NSTextField(labelWithString: installed ? "LidWiFi instalado" : "LidWiFi activo")
        titleLabel.font = NSFont.boldSystemFont(ofSize: 13)
        titleLabel.frame = NSRect(x: 64, y: 34, width: 174, height: 18)
        container.addSubview(titleLabel)

        let subLabel = NSTextField(labelWithString: "Instalado en la barra de menú ✓")
        subLabel.font = NSFont.systemFont(ofSize: 11.5)
        subLabel.textColor = .secondaryLabelColor
        subLabel.frame = NSRect(x: 64, y: 14, width: 174, height: 16)
        container.addSubview(subLabel)

        vc.view = container

        let pop = NSPopover()
        pop.contentSize = container.frame.size
        pop.behavior = .transient
        pop.animates = true
        pop.contentViewController = vc
        pop.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        self.popover = pop

        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak pop] in
            pop?.performClose(nil)
        }
    }

    private func refreshIcon() {
        let name = Prefs.enabled ? "laptopcomputer" : "laptopcomputer.slash"
        let img = NSImage(systemSymbolName: name, accessibilityDescription: "LidWiFi")
        img?.isTemplate = true
        item.button?.image = img
        item.button?.toolTip = "LidWiFi — \(Prefs.enabled ? "activo" : "pausado")"
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        popover?.close()
        menu.removeAllItems()
        let title = NSMenuItem(title: "LidWiFi", action: nil, keyEquivalent: "")
        title.attributedTitle = NSAttributedString(string: "LidWiFi",
            attributes: [.font: NSFont.boldSystemFont(ofSize: 13)])
        menu.addItem(title)
        menu.addItem(info("Tapa: \(Lid.isClosed ? "cerrada" : "abierta")"))
        menu.addItem(info("Wi‑Fi: \(WiFi.isOn ? "encendido" : "apagado")"))
        menu.addItem(.separator())
        menu.addItem(toggle("Activado", Prefs.enabled, #selector(toggleEnabled)))
        menu.addItem(toggle("Apagar también con monitor externo", Prefs.includeClamshellMode,
                            #selector(toggleClamshell)))
        menu.addItem(toggle("Abrir al iniciar sesión", SMAppService.mainApp.status == .enabled,
                            #selector(toggleLogin)))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Ver registro…", action: #selector(openLog), keyEquivalent: "l")
            .with(target: self))
        menu.addItem(NSMenuItem(title: "Salir", action: #selector(quit), keyEquivalent: "q")
            .with(target: self))
    }

    private func info(_ s: String) -> NSMenuItem {
        let i = NSMenuItem(title: s, action: nil, keyEquivalent: ""); i.isEnabled = false; return i
    }
    private func toggle(_ s: String, _ on: Bool, _ sel: Selector) -> NSMenuItem {
        let i = NSMenuItem(title: s, action: sel, keyEquivalent: "")
        i.target = self; i.state = on ? .on : .off; return i
    }

    @objc private func toggleEnabled() { Prefs.enabled.toggle(); refreshIcon() }
    @objc private func toggleClamshell() { Prefs.includeClamshellMode.toggle() }
    @objc private func toggleLogin() {
        do {
            if SMAppService.mainApp.status == .enabled { try SMAppService.mainApp.unregister() }
            else { try SMAppService.mainApp.register() }
        } catch {
            Log.write("Login item error: \(error)")
            let a = NSAlert(); a.messageText = "No se pudo cambiar el inicio de sesión"
            a.informativeText = "\(error.localizedDescription)\nMueve la app a /Applications e inténtalo de nuevo."
            a.runModal()
        }
    }
    @objc private func openLog() { NSWorkspace.shared.open(Log.url) }
    @objc private func quit() {
        controller.restoreIfNeeded(reason: "quit")
        NSApp.terminate(nil)
    }
}

extension NSMenuItem {
    func with(target: AnyObject) -> NSMenuItem { self.target = target; return self }
}

SelfInstaller.installIfNeeded()
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)   // menu bar only, no Dock icon
app.run()
