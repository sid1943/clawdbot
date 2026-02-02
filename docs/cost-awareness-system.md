# Cost-Awareness System - Implementation Guide

**Status:** ✅ Implemented  
**Created:** 2026-02-02  
**Auto-implemented by:** Nightly Auto-Implementation

---

## Overview

The Cost-Awareness System automatically tracks revenue and recommends infrastructure tier upgrades/downgrades based on earnings. This ensures JARVIS scales spending proportionally to income.

See `COST-AWARENESS-SYSTEM.md` for the full philosophy and tier definitions.

---

## Files

### Data Files
- `/home/sidd/clawd/data/revenue-tracking-live.json` - Live revenue tracking
- `/home/sidd/clawd/data/cost-awareness-dashboard.json` - Full dashboard with history

### Scripts
- `/home/sidd/clawd/scripts/track-revenue.sh` - Revenue tracking CLI
- `/home/sidd/clawd/scripts/monthly-cost-review.sh` - Monthly automated review

### Logs
- `/home/sidd/clawd/logs/monthly-cost-review.log` - Monthly review history

---

## Usage

### Adding Revenue

When you receive payment from a freelance project:

```bash
# Format: ./track-revenue.sh add <month> <amount> <source> [fees]
cd /home/sidd/clawd
./scripts/track-revenue.sh add 2026-02 150 upwork 22.5
```

**Sources:**
- `upwork` - Upwork projects (20% fee)
- `fiverr` - Fiverr gigs (20% fee)
- `contra` - Contra projects (0% fee!)
- `direct` - Direct client work (0% fee)

**Fees:**
- Upwork: 20% (first $500), 10% ($500-$10K), 5% ($10K+)
- Fiverr: 20% flat
- Contra: 0%
- Direct: 0%

### Checking Status

```bash
# Generate full report
./scripts/track-revenue.sh report

# Check upgrade readiness only
./scripts/track-revenue.sh check-upgrade
```

### Manual Tier Changes

When upgrading/downgrading infrastructure:

```bash
# Format: ./track-revenue.sh set-tier <tier> <cost>
./scripts/track-revenue.sh set-tier 2 50  # Upgraded to Tier 2
```

---

## Automated Monthly Review

A cron job runs on the 1st of each month at 9:00 AM to:
1. Calculate 3-month average earnings
2. Check upgrade/downgrade thresholds
3. Generate monthly report
4. Alert Sid via Telegram (if action needed)

**Cron schedule:**
```cron
0 9 1 * * /home/sidd/clawd/scripts/monthly-cost-review.sh
```

**Manual run:**
```bash
/home/sidd/clawd/scripts/monthly-cost-review.sh
```

---

## Tier Upgrade Decision Flow

```
Monthly earnings → Dashboard → Calculate 3-month avg → Compare to thresholds

If avg >= $1000 (3 months) → Recommend Tier 5 ($1500/month)
Else if avg >= $500 (2 months) → Recommend Tier 4 ($500/month)
Else if avg >= $200 (2 months) → Recommend Tier 3 ($200/month)
Else if avg >= $50 (2 months) → Recommend Tier 2 ($50/month)
Else → Stay Tier 1 ($0/month)
```

**Downgrade:** If 3-month avg drops below current tier threshold, recommend downgrade.

---

## Example Scenarios

### Scenario 1: First Freelance Project

```bash
# Received $150 from Upwork (20% fee = $30)
./scripts/track-revenue.sh add 2026-02 150 upwork 30

# Output:
# ✅ Added 150 (upwork) to 2026-02 (fees: 30, net: 120)
# 📊 3-month average: $40
# 🎯 Current Tier: 1
# 💰 3-Month Average: $40
# 📈 Recommended Tier: 1
# 🚀 Action: HOLD (wait for earnings)
```

**Result:** Not enough yet, stay on Tier 1.

### Scenario 2: Consistent Earnings

```bash
# Month 1: $150 (net: $120)
./scripts/track-revenue.sh add 2026-02 150 upwork 30

# Month 2: $200 (net: $160)
./scripts/track-revenue.sh add 2026-03 200 upwork 40

# Month 3: $180 (net: $144)
./scripts/track-revenue.sh add 2026-04 180 upwork 36

# Check status
./scripts/track-revenue.sh check-upgrade

# Output:
# 📊 3-month average: $141
# 🎯 Current Tier: 1
# 💰 3-Month Average: $141
# 📈 Recommended Tier: 2
# 🚀 Action: UPGRADE TO TIER 2
```

**Result:** Ready to upgrade! Upgrade to Tier 2 ($50/month).

### Scenario 3: Income Drop

```bash
# Currently Tier 2 ($50/month cost)
# Month 1: $50 (net: $40)
# Month 2: $30 (net: $24)
# Month 3: $40 (net: $32)

# 3-month avg: $32

# Output:
# 🎯 Current Tier: 2
# 💰 3-Month Average: $32
# 📈 Recommended Tier: 1
# 🚀 Action: DOWNGRADE TO TIER 1
```

**Result:** Income dropped below $50/month threshold, downgrade to Tier 1.

---

## Dashboard Structure

`cost-awareness-dashboard.json`:
```json
{
  "last_updated": "2026-02-02T04:00:00Z",
  "current_tier": 1,
  "current_costs": 0,
  "earnings_history": {
    "2026-02": {
      "gross": 150,
      "fees": 30,
      "net": 120,
      "sources": {
        "upwork": 120,
        "fiverr": 0,
        "contra": 0,
        "direct": 0
      }
    }
  },
  "avg_3_month": 40,
  "recommended_action": "HOLD (wait for earnings)",
  "next_review": "2026-03-01",
  "upgrade_readiness": {
    "tier_2": false,
    "tier_3": false,
    "tier_4": false,
    "tier_5": false
  }
}
```

---

## Heartbeat Integration

Add to `HEARTBEAT.md` (optional):

```markdown
## Monthly Cost Review (1st of month)
- Check if today is the 1st
- If yes, run monthly-cost-review.sh
- Report status to Sid
```

Or use cron for fully automated reviews.

---

## Alerts

JARVIS will alert Sid when:
- ✅ **Upgrade Ready:** "3-month avg hit $X, ready for Tier Y upgrade?"
- ⚠️ **Approaching Threshold:** "Close to upgrade threshold, +$X needed"
- 🚨 **Downgrade Needed:** "Income dropped, recommend downgrading"
- 📊 **Monthly Report:** Automatic on 1st of month

---

## Testing

Test the system:

```bash
# Add some test revenue
./scripts/track-revenue.sh add 2026-02 100 upwork 20
./scripts/track-revenue.sh add 2026-03 150 fiverr 30
./scripts/track-revenue.sh add 2026-04 200 contra 0

# Generate report
./scripts/track-revenue.sh report

# Check upgrade status
./scripts/track-revenue.sh check-upgrade

# Run monthly review manually
./scripts/monthly-cost-review.sh
```

---

## Next Steps

1. ✅ System implemented and ready
2. [ ] Add first real revenue when it comes in
3. [ ] Set up cron job for monthly reviews (optional)
4. [ ] Review on March 1, 2026 (first scheduled review)

---

**Remember:** Earn first, spend second. Always keep a buffer. Scale up AND down as needed.
