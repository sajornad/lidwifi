# LidWiFi — Lid Off. Wi‑Fi Off. More Battery.

Tiny native macOS menu bar utility that turns Wi‑Fi **off** the instant you close your MacBook lid—and turns it back **on** when you open it.

## Download & 1‑Click Install

👉 **[Download Latest LidWiFi.dmg](https://github.com/sajornad/lidwifi/releases/latest/download/LidWiFi.dmg)**

1. Open `LidWiFi.dmg` and **double-click `LidWiFi.app`**.
2. It automatically installs itself into `/Applications/LidWiFi.app` and launches in your macOS menu bar (look for the small laptop icon).

## Key Features

- **True Sleep in Your Bag (`IOKit`)**: Intercepts `kIOMessageSystemWillSleep` and `kIOPMMessageClamshellStateChange` to disable Wi‑Fi *before* macOS enters sleep—preventing network wakeups and battery drain in your backpack.
- **Smart State Memory**: If you manually turned Wi‑Fi off before closing the lid, LidWiFi remembers and keeps it off when you open the lid.
- **100% Native Swift**: Universal binary (`arm64` + `x86_64`) for macOS 13.0+, zero background CPU usage.

## Build from Source

```zsh
./build.sh
```

Produces `build/LidWiFi.app` and `LidWiFi.dmg`.
