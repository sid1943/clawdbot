#!/bin/bash
# Revenue Tracking Script for Cost-Awareness System
# Usage: 
#   ./track-revenue.sh add <month> <amount> <source> [fees]
#   ./track-revenue.sh report
#   ./track-revenue.sh check-upgrade

set -e

DASHBOARD_FILE="/home/sidd/clawd/data/cost-awareness-dashboard.json"
TRACKING_FILE="/home/sidd/clawd/data/revenue-tracking-live.json"

# Ensure jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required. Install with: sudo apt install jq"
    exit 1
fi

# Function to add revenue
add_revenue() {
    local month=$1
    local amount=$2
    local source=${3:-"direct"}
    local fees=${4:-0}
    local net=$((amount - fees))
    
    # Update dashboard
    local temp_file=$(mktemp)
    jq --arg month "$month" \
       --argjson gross "$amount" \
       --argjson fees "$fees" \
       --argjson net "$net" \
       --arg source "$source" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.last_updated = $timestamp |
        .earnings_history[$month].gross += $gross |
        .earnings_history[$month].fees += $fees |
        .earnings_history[$month].net += $net |
        .earnings_history[$month].sources[$source] += $net' \
       "$DASHBOARD_FILE" > "$temp_file"
    
    mv "$temp_file" "$DASHBOARD_FILE"
    
    echo "✅ Added $amount ($source) to $month (fees: $fees, net: $net)"
    
    # Recalculate averages
    calculate_averages
}

# Function to calculate 3-month average
calculate_averages() {
    local temp_file=$(mktemp)
    
    # Get last 3 months of earnings
    local earnings=$(jq -r '.earnings_history | to_entries | sort_by(.key) | reverse | limit(3; .[]) | .value.net' "$DASHBOARD_FILE")
    
    # Calculate average
    local sum=0
    local count=0
    while IFS= read -r earning; do
        sum=$((sum + earning))
        count=$((count + 1))
    done <<< "$earnings"
    
    local avg=0
    if [ $count -gt 0 ]; then
        avg=$((sum / count))
    fi
    
    # Update dashboard with new average
    jq --argjson avg "$avg" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.avg_3_month = $avg | .last_updated = $timestamp' \
       "$DASHBOARD_FILE" > "$temp_file"
    
    mv "$temp_file" "$DASHBOARD_FILE"
    
    # Update tracking file
    local temp_file2=$(mktemp)
    jq --argjson avg "$avg" \
       '.["3_month_avg"] = $avg' \
       "$TRACKING_FILE" > "$temp_file2"
    
    mv "$temp_file2" "$TRACKING_FILE"
    
    echo "📊 3-month average: \$$avg"
}

# Function to check upgrade readiness
check_upgrade() {
    local avg=$(jq -r '.avg_3_month' "$DASHBOARD_FILE")
    local current_tier=$(jq -r '.current_tier' "$DASHBOARD_FILE")
    local tier_2_threshold=$(jq -r '.tier_thresholds.tier_2' "$DASHBOARD_FILE")
    local tier_3_threshold=$(jq -r '.tier_thresholds.tier_3' "$DASHBOARD_FILE")
    local tier_4_threshold=$(jq -r '.tier_thresholds.tier_4' "$DASHBOARD_FILE")
    local tier_5_threshold=$(jq -r '.tier_thresholds.tier_5' "$DASHBOARD_FILE")
    
    local recommended_tier=$current_tier
    local recommended_action="HOLD"
    
    # Determine recommended tier based on 3-month average
    if [ $avg -ge $tier_5_threshold ]; then
        recommended_tier=5
        if [ $current_tier -lt 5 ]; then
            recommended_action="UPGRADE TO TIER 5"
        fi
    elif [ $avg -ge $tier_4_threshold ]; then
        recommended_tier=4
        if [ $current_tier -lt 4 ]; then
            recommended_action="UPGRADE TO TIER 4"
        fi
    elif [ $avg -ge $tier_3_threshold ]; then
        recommended_tier=3
        if [ $current_tier -lt 3 ]; then
            recommended_action="UPGRADE TO TIER 3"
        fi
    elif [ $avg -ge $tier_2_threshold ]; then
        recommended_tier=2
        if [ $current_tier -lt 2 ]; then
            recommended_action="UPGRADE TO TIER 2"
        fi
    else
        recommended_tier=1
        if [ $current_tier -gt 1 ]; then
            recommended_action="DOWNGRADE TO TIER 1"
        fi
    fi
    
    # Update upgrade readiness
    local temp_file=$(mktemp)
    jq --argjson avg "$avg" \
       --argjson t2 "$tier_2_threshold" \
       --argjson t3 "$tier_3_threshold" \
       --argjson t4 "$tier_4_threshold" \
       --argjson t5 "$tier_5_threshold" \
       --arg action "$recommended_action" \
       '.upgrade_readiness.tier_2 = ($avg >= $t2) |
        .upgrade_readiness.tier_3 = ($avg >= $t3) |
        .upgrade_readiness.tier_4 = ($avg >= $t4) |
        .upgrade_readiness.tier_5 = ($avg >= $t5) |
        .recommended_action = $action' \
       "$DASHBOARD_FILE" > "$temp_file"
    
    mv "$temp_file" "$DASHBOARD_FILE"
    
    # Update tracking file
    local temp_file2=$(mktemp)
    jq --argjson tier "$recommended_tier" \
       '.recommended_tier = $tier' \
       "$TRACKING_FILE" > "$temp_file2"
    
    mv "$temp_file2" "$TRACKING_FILE"
    
    echo ""
    echo "🎯 Current Tier: $current_tier"
    echo "💰 3-Month Average: \$$avg"
    echo "📈 Recommended Tier: $recommended_tier"
    echo "🚀 Action: $recommended_action"
    echo ""
    
    # Show tier readiness
    echo "Upgrade Readiness:"
    jq -r '.upgrade_readiness | to_entries | .[] | "  " + .key + ": " + (if .value then "✅" else "❌" end)' "$DASHBOARD_FILE"
}

# Function to generate monthly report
generate_report() {
    echo "════════════════════════════════════════════════════════"
    echo "  💰 COST-AWARENESS MONTHLY REPORT"
    echo "════════════════════════════════════════════════════════"
    echo ""
    
    local current_tier=$(jq -r '.current_tier' "$DASHBOARD_FILE")
    local current_costs=$(jq -r '.current_costs' "$DASHBOARD_FILE")
    local avg=$(jq -r '.avg_3_month' "$DASHBOARD_FILE")
    local action=$(jq -r '.recommended_action' "$DASHBOARD_FILE")
    local last_updated=$(jq -r '.last_updated' "$DASHBOARD_FILE")
    
    echo "📅 Last Updated: $last_updated"
    echo "🎯 Current Tier: $current_tier (\$$current_costs/month)"
    echo "💰 3-Month Average Earnings: \$$avg"
    echo "📈 Recommended Action: $action"
    echo ""
    
    echo "Recent Earnings History:"
    jq -r '.earnings_history | to_entries | sort_by(.key) | reverse | limit(6; .[]) | 
           "  " + .key + ": $" + (.value.net | tostring) + 
           " (gross: $" + (.value.gross | tostring) + ", fees: $" + (.value.fees | tostring) + ")"' \
       "$DASHBOARD_FILE"
    
    echo ""
    check_upgrade
}

# Function to set current tier (manual override)
set_tier() {
    local tier=$1
    local cost=$2
    
    local temp_file=$(mktemp)
    jq --argjson tier "$tier" \
       --argjson cost "$cost" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.current_tier = $tier | .current_costs = $cost | .last_updated = $timestamp' \
       "$DASHBOARD_FILE" > "$temp_file"
    
    mv "$temp_file" "$DASHBOARD_FILE"
    
    # Update tracking file
    local temp_file2=$(mktemp)
    jq --argjson tier "$tier" \
       --argjson cost "$cost" \
       '.current_tier = $tier | .current_tier_cost = $cost' \
       "$TRACKING_FILE" > "$temp_file2"
    
    mv "$temp_file2" "$TRACKING_FILE"
    
    echo "✅ Set current tier to $tier (\$$cost/month)"
}

# Main command dispatcher
case "${1:-help}" in
    add)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 add <month> <amount> [source] [fees]"
            echo "Example: $0 add 2026-02 150 upwork 22.5"
            exit 1
        fi
        add_revenue "$2" "$3" "${4:-direct}" "${5:-0}"
        ;;
    
    report)
        generate_report
        ;;
    
    check-upgrade)
        check_upgrade
        ;;
    
    set-tier)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 set-tier <tier> <cost>"
            echo "Example: $0 set-tier 2 50"
            exit 1
        fi
        set_tier "$2" "$3"
        ;;
    
    help|*)
        echo "Cost-Awareness Revenue Tracking"
        echo ""
        echo "Usage:"
        echo "  $0 add <month> <amount> [source] [fees]  - Add revenue for a month"
        echo "  $0 report                                 - Generate monthly report"
        echo "  $0 check-upgrade                          - Check upgrade readiness"
        echo "  $0 set-tier <tier> <cost>                 - Set current tier manually"
        echo ""
        echo "Examples:"
        echo "  $0 add 2026-02 150 upwork 22.5           - Add \$150 from Upwork with \$22.5 fees"
        echo "  $0 add 2026-03 300 fiverr 60             - Add \$300 from Fiverr with \$60 fees"
        echo "  $0 report                                 - Show full report"
        echo "  $0 set-tier 2 50                          - Upgrade to Tier 2"
        ;;
esac
