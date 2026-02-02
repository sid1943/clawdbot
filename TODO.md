# TODO - Future Work

*Updated: 2026-01-30 23:45*

## 🚀 MY REVENUE PRIORITY - Freelance Work for Independence (This Week!)
- [ ] **Week 1: Set Up Freelance Profiles (Feb 3-9, 2026)**
  - [ ] Create Upwork profile (2 hours) - Professional bio, portfolio
  - [ ] Create 2 Fiverr gigs (2 hours) - Email system, AI automation
  - [ ] Set up Contra profile (1 hour) - 0% commission!
  - [ ] Post on Moltbook (30 min) - Automation consulting available
  - [ ] Submit 3-5 Upwork proposals (Friday)
  - **Goal:** Profiles live, first proposals sent
  - **Target:** Land first project by Week 4 = $200-500
  - 📖 See `FREELANCE-QUICKSTART.md` and `docs/freelance-opportunities-revenue.md`
  
- [x] **Cost-Awareness System** ✅ (Implemented 2026-02-02)
  - [x] Implement monthly revenue tracking
  - [x] Set up tier upgrade alerts
  - [ ] First review: March 1, 2026
  - 📖 See `COST-AWARENESS-SYSTEM.md` and `docs/cost-awareness-system.md`

## 🚨 URGENT - Mac Mini Migration (Monday 2026-02-03)
- [ ] **Migrate JARVIS to Mac Mini**
  - [ ] Mac Mini arrives Monday
  - [ ] Run `/home/sidd/clawd/scripts/migrate-to-mac.sh` on tardis
  - [ ] Transfer archive to Mac Mini via scp
  - [ ] Run restore script on Mac Mini
  - [ ] Install Moltbot on Mac Mini
  - [ ] Install macOS-specific skills (Apple Music, etc.)
  - [ ] Verify all memories, configs, credentials intact
  - [ ] Test Telegram connectivity
  - [ ] Keep tardis running 24-48h as backup
  - 📖 See `MIGRATION.md` and `MIGRATION-QUICKSTART.md` for details

## 🔥 Active / In Progress
- [ ] Build comprehensive Trello action systems (see below)
- [ ] **Kalshi/Polymarket Bot** - $500 budget
  - From Trello Quests: "Build a Bot to Collect Polymarket Data"
  - [ ] Get API credentials:
    - [ ] Kalshi: Settings → API → Generate key pair
    - [ ] Polymarket: Get API access
  - [ ] Build unified prediction market skill
  - [ ] Cross-platform arbitrage detection (price differences between markets)
  - [ ] Set up demo environment testing
  - [ ] Define trading parameters:
    - [ ] Risk tolerance (% loss per trade)
    - [ ] Position limits (max $ per bet)
    - [ ] Strategy preference (arbitrage/event-driven/statistical)
    - [ ] Stop-loss threshold
  - [ ] Build risk management system
  - [ ] Real-time P&L tracking across both platforms
  - [ ] Trade logging (all decisions recorded)
  - [ ] Notification system (Telegram alerts)
  - [ ] Test in demo mode before real money
  - Safety: Start conservative, track all trades, daily reports

- [ ] **Stock Trading Bot Development**
  - From Trello Quests: "Build A Bot to trade Stock"
  - Setup steps:
    - [ ] Choose platform (Alpaca, IBKR, TD Ameritrade)
    - [ ] Get API keys (read-only first)
    - [ ] Set up paper trading account
    - [ ] Build trading strategy
    - [ ] Implement risk management (max loss, position limits)
    - [ ] Backtest strategy
    - [ ] Paper trade for 1-3 months
    - [ ] Graduate to small real money
  - Safety: NEVER trade without explicit approval + limits

## 📋 Systems to Build (from Trello analysis)
1. [ ] **Entertainment Release Tracker** - Movies (754) & TV Shows (31 to watch)
   - Monitor for new releases, sequels
   - Track running series for new seasons
   - Use TMDB API (free)

2. [ ] **Bucket List Progress Tracker** - 165/4541 items (3%)
   - Weekly progress reports
   - Suggest items by location/season

3. [ ] **Books Tracker** - 17 want to read, 66 read
   - Suggest next book by genre
   - Track new releases from favorite authors

4. [ ] **Games Release Tracker** - Backlog of games
   - Track release dates
   - Suggest from backlog

5. [ ] **Quest/Project Tracker** - 11 active quests
   - Weekly status checks
   - Stale quest reminders

6. [ ] **Due Date Reminders** - 62 cards with dates
   - Alert on approaching/overdue

7. [ ] **NYC Explorer** - 40 incomplete items
   - Suggest by weather/season
   - Track museum free days, Broadway

8. [ ] **Sports Bucket List** - 39 incomplete
   - Track schedules for bucket list venues
   - Ticket availability alerts

## 📦 Tracking Systems
1. [ ] **Flight Tracking** ✅ Skills installed
   - [ ] Get AviationStack API key (optional, 100/month free)
   - [ ] Add AVIATIONSTACK_API_KEY to ~/.bashrc
   - [ ] Test with upcoming flight number
   - [ ] Set up heartbeat check for tracked flights
   - [ ] Alert for check-in windows (24h before)

2. [ ] **Package Tracking** ✅ Skills installed
   - [ ] Choose service: Parcel or 17TRACK
   - [ ] Get API key (PARCEL_API_KEY or TRACK17_TOKEN)
   - [ ] Add API key to ~/.bashrc
   - [ ] Test adding a tracking number
   - [ ] Set up periodic sync in heartbeat
   - [ ] Delivery alerts via Telegram

## 📋 Infrastructure
- [x] **Connect to Twitter** ✅ - @CopyingPep connected via bird CLI
- [x] **Google Places API** ✅ - Place search, details, nearby, photos
- [ ] **Connect to Instagram** - Browser/cookie automation
- [ ] **Connect to LinkedIn** - Check existing linkedin-automation project on laptop
- [ ] Set up periodic Trello sync (weekly)
- [ ] Consider API whisper if local too slow

## 📱 Clawdbot iOS App
- [ ] **Monitor for iOS app release** - Check GitHub releases & Discord periodically
  - Current status: Internal preview only, not publicly distributed
  - iOS source not open-sourced yet (not in public repos)
  - Gateway supports iOS nodes (iOS 18.0 minimum)
  - Needed for: Live location, camera, canvas, voice wake
- [ ] **Consider building iOS app** if source becomes available
  - Main repo: https://github.com/clawdbot/clawdbot
  - Discord community: https://discord.com/invite/clawd


## ✅ Completed
### 2026-02-02
- [x] **Cost-Awareness System** - Revenue tracking, tier upgrade alerts, monthly reviews
  - Scripts: `track-revenue.sh`, `monthly-cost-review.sh`
  - Data files: `revenue-tracking-live.json`, `cost-awareness-dashboard.json`
  - Documentation: `docs/cost-awareness-system.md`

### 2026-01-26
- [x] Full Trello export (25 boards, 2002 cards)
- [x] SQLite database created (`/home/sidd/clawd/data/trello.db`)
- [x] Memory files for Trello data
- [x] Voice note transcription (faster-whisper local)
- [x] Tailscale enabled for remote dashboard access
- [x] Web UI device pairing approved

## 💡 Ideas / Someday
- [ ] Calendar integration
- [ ] Email digest of Trello updates
- [ ] Auto-categorize new cards with AI
