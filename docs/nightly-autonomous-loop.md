# Nightly Autonomous Agent Loop

Inspired by Ryan Carson's "agent that learns and ships while you sleep" system.

## Overview

Two nightly jobs run in sequence to create a self-improving development loop:

1. **10:30 PM EST** (3:30 AM UTC) - **Learning Extraction**
   - Reviews today's memory file
   - Extracts key learnings, patterns, decisions
   - Updates AGENTS.md, MEMORY.md, TOOLS.md
   - Commits and pushes to main

2. **11:00 PM EST** (4:00 AM UTC) - **Auto-Implementation**
   - Pulls latest (with fresh learnings)
   - Picks first incomplete task from TODO.md
   - Implements the task autonomously
   - Creates draft PR
   - Reports back with link

## How It Works

### Learning Extraction

The agent reviews `memory/YYYY-MM-DD.md` and looks for:
- **Mistakes** - What went wrong and how to avoid it
- **Patterns** - Recurring problems or solutions
- **Decisions** - Important choices and their reasoning
- **Tools** - New configurations or discoveries
- **Insights** - Project-specific learnings

It updates:
- `AGENTS.md` - Workflow improvements, decision patterns
- `MEMORY.md` - Significant events, lessons learned
- `TOOLS.md` - Tool discoveries, configurations

### Auto-Implementation

The agent:
1. Reads TODO.md
2. Finds first task marked `- [ ]`
3. Creates feature branch `auto-impl/[task-name]`
4. Reads context from AGENTS.md, MEMORY.md, project files
5. Implements the task
6. Updates TODO.md to mark complete: `- [x]`
7. Commits with message: `auto: [task description]`
8. Pushes branch
9. Creates draft PR
10. Reports back via Telegram

## The Compound Effect

Each night:
- Agent gets smarter (updated AGENTS.md with today's learnings)
- Next task gets easier (fresh context from previous work)
- TODO list shrinks (one task implemented autonomously)
- You wake up to a draft PR ready for review

Over time:
- Patterns discovered Monday inform Tuesday's work
- Gotchas hit Wednesday are avoided Thursday
- Knowledge compounds exponentially

## Setup

**Already configured!** Two cron jobs are running:

```
c0687917-a1cc-4c79-81c5-efa56636f419 - Nightly Learning Extraction
0f4f9db7-fdd6-40a8-84ac-688192f60390 - Nightly Auto-Implementation
```

Check status:
```bash
moltbot cron list | grep -i nightly
```

## Logs

Each run creates logs:
```
logs/nightly-learning-YYYY-MM-DD.log
logs/nightly-implement-YYYY-MM-DD.log
```

You'll also get Telegram notifications when jobs complete.

## What You Need To Do

**1. Keep TODO.md updated**
   - Add tasks in checklist format: `- [ ] Task description`
   - Agent will pick from the top

**2. Review PRs in the morning**
   - Agent creates draft PRs
   - Review, test, approve, or request changes
   - Merge when ready

**3. Maintain memory files**
   - Keep writing to `memory/YYYY-MM-DD.md` daily
   - Agent will extract learnings automatically

## Disabling/Modifying

Disable a job:
```bash
moltbot cron update --id c0687917-a1cc-4c79-81c5-efa56636f419 --enabled false
```

Change schedule:
```bash
moltbot cron update --id c0687917-a1cc-4c79-81c5-efa56636f419 \
  --schedule '{"kind":"cron","expr":"0 2 * * *","tz":"UTC"}'
```

## Differences from Ryan Carson's Setup

**Similar:**
- Two-stage nightly loop (learn → implement)
- Compound learning (AGENTS.md grows every day)
- Autonomous task execution
- Draft PR creation

**Different:**
- Uses **Moltbot cron** instead of launchd/cron
- Uses **isolated sessions** (clean agent state per job)
- Delivers reports via **Telegram** instead of logs
- Works on **Linux** (not Mac-specific)
- Uses **TODO.md** instead of prioritized reports

## Safety

**Agent won't:**
- Merge PRs automatically (all are drafts)
- Delete files without your approval
- Make irreversible changes
- Run destructive commands

**Agent will:**
- Ask questions if task is unclear
- Document all decisions in commits
- Test code before committing (when applicable)
- Work within project constraints in AGENTS.md

## Next Steps

1. **Add tasks to TODO.md** - Give the agent work to do
2. **Write to memory files daily** - Feed the learning loop
3. **Review morning PRs** - Merge the good ones
4. **Update AGENTS.md** - Refine the agent's instructions over time

The loop is live. Let it run.

---

**Created:** 2026-01-31  
**Inspired by:** [Ryan Carson's thread](https://x.com/ryancarson/status/2016520542723924279)
