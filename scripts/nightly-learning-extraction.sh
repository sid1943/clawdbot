#!/bin/bash
# Nightly Learning Extraction - Reviews the day's work and updates AGENTS.md/MEMORY.md
# Runs at 10:30 PM EST daily

set -e
cd /home/sidd/clawd

# Pull latest
git pull origin main 2>/dev/null || true

# Timestamp for logging
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
LOG_FILE="logs/nightly-learning-$(date +%Y-%m-%d).log"

echo "🧠 Nightly Learning Extraction - $TIMESTAMP" | tee -a "$LOG_FILE"

# Get today's date for memory file
TODAY=$(date +%Y-%m-%d)
MEMORY_FILE="memory/$TODAY.md"

# Check if today's memory file exists
if [ ! -f "$MEMORY_FILE" ]; then
    echo "⚠️  No memory file for today ($MEMORY_FILE)" | tee -a "$LOG_FILE"
    echo "Nothing to extract. Exiting." | tee -a "$LOG_FILE"
    exit 0
fi

echo "📝 Found memory file: $MEMORY_FILE" | tee -a "$LOG_FILE"

# Count entries (rough heuristic - lines starting with ##)
ENTRY_COUNT=$(grep -c "^## " "$MEMORY_FILE" || echo "0")
echo "📊 Entries to review: ~$ENTRY_COUNT" | tee -a "$LOG_FILE"

if [ "$ENTRY_COUNT" -eq 0 ]; then
    echo "No significant entries. Skipping extraction." | tee -a "$LOG_FILE"
    exit 0
fi

# Create the extraction prompt
PROMPT="Review today's memory file at $MEMORY_FILE.

Extract key learnings, patterns, and decisions that should be preserved long-term.

Update these files as needed:
- AGENTS.md (workflow improvements, decision patterns)
- MEMORY.md (significant events, lessons learned)
- TOOLS.md (new tool discoveries, configurations)

Focus on:
1. Mistakes made and how to avoid them
2. New patterns discovered
3. Important decisions and their reasoning
4. Tool configurations or discoveries
5. Project insights

Be selective - only add truly valuable learnings that will help future work.

After updating files, commit with message: 'nightly: extract learnings from $TODAY'

If nothing valuable to extract, reply HEARTBEAT_OK without making changes."

echo "🤖 Triggering extraction agent..." | tee -a "$LOG_FILE"
echo "$PROMPT" | tee -a "$LOG_FILE"

# Note: This needs to trigger an agent session
# For now, log the prompt. Will integrate with Moltbot session API
echo "⚠️  TODO: Integrate with Moltbot session API to execute extraction" | tee -a "$LOG_FILE"
echo "Prompt saved to logs for manual review." | tee -a "$LOG_FILE"

echo "✅ Learning extraction complete - $TIMESTAMP" | tee -a "$LOG_FILE"
