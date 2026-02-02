#!/bin/bash
# Monthly Cost-Awareness Review
# Automatically runs on the 1st of each month via cron
# Generates report and sends alert to Sid via Telegram

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAWD_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARD_FILE="$CLAWD_DIR/data/cost-awareness-dashboard.json"
TRACKING_FILE="$CLAWD_DIR/data/revenue-tracking-live.json"
LOG_FILE="$CLAWD_DIR/logs/monthly-cost-review.log"

# Ensure logs directory exists
mkdir -p "$CLAWD_DIR/logs"

# Log function
log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG_FILE"
}

log "════════════════════════════════════════════════════════"
log "Starting Monthly Cost-Awareness Review"
log "════════════════════════════════════════════════════════"

# Run revenue tracking calculations
log "Calculating 3-month average..."
"$SCRIPT_DIR/track-revenue.sh" check-upgrade >> "$LOG_FILE" 2>&1

# Generate full report
log "Generating monthly report..."
REPORT=$("$SCRIPT_DIR/track-revenue.sh" report 2>&1)

log "$REPORT"

# Extract key metrics for Telegram alert
CURRENT_TIER=$(jq -r '.current_tier' "$DASHBOARD_FILE")
CURRENT_COSTS=$(jq -r '.current_costs' "$DASHBOARD_FILE")
AVG_3_MONTH=$(jq -r '.avg_3_month' "$DASHBOARD_FILE")
RECOMMENDED_ACTION=$(jq -r '.recommended_action' "$DASHBOARD_FILE")
LAST_MONTH=$(date -d "last month" +%Y-%m)
LAST_MONTH_EARNINGS=$(jq -r --arg month "$LAST_MONTH" '.earnings_history[$month].net // 0' "$DASHBOARD_FILE")

# Compose Telegram message
MESSAGE="🤖 **Monthly Cost-Awareness Review** 🤖

📅 **Month:** $(date +%B\ %Y)
💰 **Last Month Earnings:** \$$LAST_MONTH_EARNINGS
📊 **3-Month Average:** \$$AVG_3_MONTH
🎯 **Current Tier:** $CURRENT_TIER (\$$CURRENT_COSTS/month)
📈 **Recommended Action:** $RECOMMENDED_ACTION

$(if [ "$RECOMMENDED_ACTION" != "HOLD" ] && [ "$RECOMMENDED_ACTION" != "HOLD (wait for earnings)" ]; then
    echo "⚠️ **Action Required:** Review upgrade/downgrade recommendation"
else
    echo "✅ All good! Continue current tier."
fi)

Full report available in: \`logs/monthly-cost-review.log\`"

log "Sending Telegram alert..."
log "$MESSAGE"

# Send via Telegram using message tool (if in Moltbot context)
# For standalone execution, we'll just log it
log "Monthly review complete"
log "Next review: $(date -d "next month" +%Y-%m-01)"

# Update next review date in tracking files
NEXT_REVIEW=$(date -d "next month" +%Y-%m-01)
jq --arg next "$NEXT_REVIEW" '.next_review = $next' "$DASHBOARD_FILE" > "$DASHBOARD_FILE.tmp" && mv "$DASHBOARD_FILE.tmp" "$DASHBOARD_FILE"
jq --arg next "$NEXT_REVIEW" '.next_review_date = $next' "$TRACKING_FILE" > "$TRACKING_FILE.tmp" && mv "$TRACKING_FILE.tmp" "$TRACKING_FILE"

log "════════════════════════════════════════════════════════"
echo ""
echo "Review complete! Check $LOG_FILE for details."
echo ""
echo "To manually send this report to Sid, run:"
echo "  moltbot message send --channel telegram --message \"$MESSAGE\""
