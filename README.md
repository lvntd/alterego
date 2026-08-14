# alterego

Launch multiple isolated Chromium browser windows at once — each with its own cookies, storage, and session, tiled across your screen.

```sh
npm install -g alterego
```

## Usage

```sh
ego swarm 6 https://myapp.local        # 6 isolated windows, tiled, incognito
ego swarm 4 <url> --persist            # reuse session dirs, no incognito
ego swarm 3 <url> --browser brave
ego swarm 9 <url> --no-tile
ego swarm 4 <url> --screen 2560x1440
ego clean                              # remove all session dirs
```

Both `ego` and `alterego` install as binaries — use whichever you prefer.

### `ego swarm <count> <url>`

| Option | Description |
| --- | --- |
| `--browser <name>` | `chrome` (default), `edge`, `brave`, or `vivaldi` |
| `--persist` | reuse stable session dirs instead of fresh incognito sessions |
| `--no-tile` | disable automatic window tiling |
| `--screen <WxH>` | screen size to tile against, e.g. `2560x1440` (default `1920x1080`) |
| `--no-interactive` | force plain-text output, skip the interactive UI |

By default, `swarm` launches fresh incognito windows that leave nothing behind on exit. Pass `--persist` when you want logins and other session state to survive between runs.

### `ego clean`

Removes every session directory alterego has created. These accumulate silently (a few MB each) since incognito mode alone doesn't delete the underlying `--user-data-dir`, only its contents on next launch.

## Supported browsers

| Browser | macOS | Windows | Linux | Incognito flag |
| --- | --- | --- | --- | --- |
| Chrome | ✓ | ✓ | ✓ | `--incognito` |
| Edge | ✓ | ✓ | ✓ | `--inprivate` |
| Brave | ✓ | ✓ | ✓ | `--incognito` |
| Vivaldi | ✓ | ✓ | ✓ | `--incognito` |

If the requested browser (or the default, Chrome) isn't found, alterego falls back to whichever supported browser is installed and tells you.

## Why `--user-data-dir` and not just incognito

Incognito mode alone does **not** isolate windows from each other — every incognito window launched from the same Chrome process shares the same in-memory profile, so cookies and login state leak across them. What actually isolates a window is giving it its own `--user-data-dir`: a separate profile directory means separate cookies, separate storage, separate everything. alterego generates a distinct session directory per window for exactly this reason.

Incognito is layered on top as an additional, opt-out convenience: with a unique `--user-data-dir` per window, incognito just means nothing persists to disk after the window closes. Pass `--persist` to keep the directories (and therefore logins) around between runs instead.

Session directories live under `os.tmpdir()/alterego/session-<n>` and are never cleaned up automatically — run `ego clean` periodically to reclaim the space.

## Requirements

Node.js 20 or later.

Author: Levan Tediashvili