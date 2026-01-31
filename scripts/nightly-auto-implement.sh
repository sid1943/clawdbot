#!/bin/bash
# Nightly Auto-Implementation - Picks top task from TODO.md and implements it
# Runs at 11:00 PM EST daily (after learning extraction)

set -e
cd /home/sidd/clawd

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
LOG_FILE="logs/nightly-implement-$(date +%Y-%m-%d).log"

echo "🚀 Nightly Auto-Implementation - $TIMESTAMP" | tee -a "$LOG_FILE"

# Pull latest (includes tonight's AGENTS.md updates)
echo "📥 Pulling latest changes..." | tee -a "$LOG_FILE"
git fetch origin main
git reset --hard origin/main

# Check if TODO.md exists and has tasks
if [ ! -f "TODO.md" ]; then
    echo "⚠️  No TODO.md file found. Exiting." | tee -a "$LOG_FILE"
    exit 0
fi

# Extract first incomplete task (lines starting with - [ ])
TASK=$(grep -m 1 "^- \[ \]" TODO.md || echo "")

if [ -z "$TASK" ]; then
    echo "✅ No incomplete tasks in TODO.md. Nothing to implement." | tee -a "$LOG_FILE"
    exit 0
fi

# Clean up task text (remove checkbox)
TASK_TEXT=$(echo "$TASK" | sed 's/^- \[ \] //')
echo "🎯 Selected task: $TASK_TEXT" | tee -a "$LOG_FILE"

# Generate branch name
BRANCH_NAME="auto-impl/$(echo "$TASK_TEXT" | tr '[:upper:]' '[:lower:]' | tr -s ' ' '-' | cut -c1-50)"
BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/[^a-z0-9-]//g')

echo "🌿 Creating branch: $BRANCH_NAME" | tee -a "$LOG_FILE"

# Create feature branch
git checkout -b "$BRANCH_NAME" 2>/dev/null || {
    echo "⚠️  Branch already exists. Using existing branch." | tee -a "$LOG_FILE"
    git checkout "$BRANCH_NAME"
}

# Create implementation prompt
PROMPT="Implement this task from TODO.md: $TASK_TEXT

Steps:
1. Read relevant context from AGENTS.md, MEMORY.md, and project files
2. Break down the task into concrete steps
3. Implement the changes
4. Test if applicable
5. Update TODO.md to mark this task complete: $TASK
6. Commit changes with message: 'auto: $TASK_TEXT'
7. Push to branch: $BRANCH_NAME
8. Create draft PR with title: 'Auto-implementation: $TASK_TEXT'

If the task is unclear or requires human input, document questions in TODO.md and reply with what you need.

Work autonomously. Make reasonable assumptions. Document your decisions."

echo "🤖 Implementation prompt:" | tee -a "$LOG_FILE"
echo "$PROMPT" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "⚠️  TODO: Integrate with Moltbot session API to execute implementation" | tee -a "$LOG_FILE"
echo "For now, this script logs the task and creates the branch." | tee -a "$LOG_FILE"
echo "Manual execution: Use the prompt above with your agent." | tee -a "$LOG_FILE"

echo "✅ Auto-implementation setup complete - $TIMESTAMP" | tee -a "$LOG_FILE"
