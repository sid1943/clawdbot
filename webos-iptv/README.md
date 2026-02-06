# webOS IPTV

IPTV client for **LG OLED77B5PUA** (webOS 25). Indian channels + world sports.

## One-Command Setup (Mac Mini)

```bash
git clone <repo-url> && cd webos-iptv && ./setup.sh
```

That single command does everything:

1. Installs **Bun**, **Node.js** deps, **webOS CLI tools**
2. Discovers your **LG TV** on the local network (SSDP + port scan)
3. Connects via **WebSocket** and pairs (accept once on TV screen)
4. **Enables Developer Mode** automatically
5. Registers the TV and fetches SSH keys
6. **Builds, packages, and deploys** the app
7. **Launches** the IPTV app on the TV

No manual TV menu navigation needed. Just accept the one-time pairing prompt.

### Prerequisites

- **Mac Mini** on the same network as the TV
- **Developer Mode** app installed on the TV (free, from LG Content Store)
- TV must be powered on

### If you know your TV's IP

```bash
./setup.sh 192.168.1.x
```

## Remote Control

| Key | Action |
|-----|--------|
| OK / Enter | Open channel list |
| Up / Down | Zap channels |
| 0-9 | Direct channel number (auto-tunes after 3s) |
| Red | Toggle favorite |
| Green | Programme guide (EPG) |
| Yellow | Channel info |
| Blue | Settings |
| Back | Previous channel / Exit |
| Ch+/Ch- | Next / previous channel |

## Manual Commands

```bash
bun run setup                        # Full automated setup
bun run build                        # Bundle the app
bun run scripts/package.ts           # Create .ipk
bun run scripts/deploy.ts <device>   # Deploy to TV
bun run scripts/dev.ts <device>      # Deploy + open debugger
bun test                             # Run tests
```

## Default Channels

- **Indian Channels** — iptv-org/iptv (countries/in)
- **World Sports** — iptv-org/iptv (categories/sports)

Add more playlists in the Settings panel (Blue button on remote).
