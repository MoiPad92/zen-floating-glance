# Floating Glance

A [Sine](https://github.com/CosmoCreeper/Sine) mod for [Zen Browser](https://zen-browser.app) that turns Glance into a panel you can move and resize, while the page behind it stays fully visible.

Useful when you work from an Essential tab: open a link in Glance, push the panel aside, and keep reading the page underneath.

## Features

- **Move** the panel by dragging the bar above it.
- **Resize** it from the square in its bottom-left corner.
- **Double-click** the bar to put it back in its original place.
- The position and size are **remembered** for the next Glance.
- The page behind Glance is **no longer dimmed or shrunk**.
- **Keyboard shortcut** (`Ctrl+Alt+G` by default) to open Glance on your search engine, or close it.

## Settings

In Zen's settings, under the Sine mods section:

| Setting | Default |
|---|---|
| Keyboard shortcut | `Ctrl+Alt+G` |
| Page the shortcut opens | your default search engine |
| Dim the page behind Glance | off |
| Open Glance centered instead of docked right | off |

## Limitations

- Glance is still modal: **clicking outside the panel closes it**, as in stock Zen. The page behind can be read but not clicked while Glance is open.
- The mod relies on Glance's internal structure. A Zen update that changes Glance can break it until the mod is updated. Tested on Zen 1.24.2b.

## Installation

Install it from the Sine marketplace, or add it by hand from this repository (`MoiPad92/zen-floating-glance`) in the Sine settings.

This mod runs JavaScript with browser privileges, like every JS mod. Read the source in `js/floating-glance.uc.mjs` if you want to know exactly what it does.

## License

[MIT](LICENSE)
