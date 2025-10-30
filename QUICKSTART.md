# Quick Start Guide

Get your Agent Dashboard running in 5 minutes.

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Set Up Neon Database

1. Create a free account at [neon.com](https://neon.com)
2. Create a new project
3. Copy both connection strings:
   - **Direct connection** (for migrations)
   - **Pooled connection** (for application, append `?pgbouncer=true`)

## Step 3: Configure Environment

Create `.env.local`:

```bash
# Required: AI & Database
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_POOLED=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true

# Required: App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Optional: For memory features
SUPERMEMORY_API_KEY=sm_...

# Optional: For browser automation
BROWSER_USE_API_KEY=bu_...

# Optional: For voice calls
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### Get API Keys:
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Supermemory**: [supermemory.ai](https://supermemory.ai) (optional)
- **Browser-Use**: [cloud.browser-use.com](https://cloud.browser-use.com) (optional)
- **Twilio**: [twilio.com/console](https://www.twilio.com/console) (optional)

## Step 4: Initialize Database

```bash
pnpm db:setup
```

This creates tables and adds demo data:
- 1 demo user
- 1 research agent
- Sample activities and memories

## Step 5: Start Development Server

```bash
pnpm dev
```

Visit: [http://localhost:3000](http://localhost:3000)

## Step 6: Configure Tools (Optional)

1. Navigate to **Settings** in the sidebar
2. Add API keys for:
   - OpenAI (if not using env var)
   - Supermemory (for memory features)
   - Browser-Use (for web automation)
   - Twilio (for voice calls)
3. Click **Test Connection** to verify each

## What You Can Do Now

### 1. View Dashboard
- See key metrics (spend, tasks, approvals, memories, actions)
- Review activity feed
- Monitor demo agent

### 2. Create an Agent
- Click "Create New Agent"
- Set name and system prompt
- Enable tools: Supermemory, Browser, Twilio, etc.
- Agent will appear in agents list

### 3. Test Agent Execution (API)

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Research Bot",
    "prompt": "You are a helpful research assistant",
    "tools": ["supermemory", "browser"]
  }'
```

### 4. Create Activity

```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "<agent-id>",
    "type": "research",
    "payload": {
      "title": "Market Analysis",
      "description": "Analyzed Q4 trends"
    }
  }'
```

### 5. Execute Browser Task

```bash
curl -X POST http://localhost:3000/api/browser/task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Go to example.com and extract the main heading",
    "wait": true
  }'
```

## Troubleshooting

### Database Connection Failed
```
Error: Failed to connect to database
```
**Fix:** Check `DATABASE_URL` in `.env.local` and ensure Neon project is active.

### OpenAI API Error
```
Error: Invalid API key
```
**Fix:** Verify `OPENAI_API_KEY` starts with `sk-` and is valid.

### Migration Failed
```
Error: relation "agents" already exists
```
**Fix:** Tables already exist. To reset:
```sql
-- Connect to Neon via psql
psql $DATABASE_URL

-- Drop all tables
DROP TABLE IF EXISTS tool_configs, calls, memories, activities, agents, users CASCADE;

-- Re-run setup
pnpm db:setup
```

### Port Already in Use
```
Error: Port 3000 is already in use
```
**Fix:** Use a different port:
```bash
PORT=3001 pnpm dev
```

## Next Steps

1. **Explore the Code**
   - Check `app/api/` for backend routes
   - See `lib/ai/agent.ts` for agent orchestration
   - Review `.cursor/rules/` for architecture docs

2. **Customize Agents**
   - Edit agent prompts
   - Enable/disable tools
   - Add custom tools in `lib/ai/tools/`

3. **Build Frontend Features**
   - See `BACKEND_IMPLEMENTATION.md` for remaining tasks
   - Update dashboard metrics
   - Add settings UI for tool config

4. **Deploy to Vercel**
   - Push to GitHub
   - Import to Vercel
   - Add environment variables
   - Deploy! 🚀

## Need Help?

- **Documentation**: Check `docs/` folder
- **Architecture**: Read `.cursor/rules/01-architecture.mdc`
- **API Reference**: See `BACKEND_IMPLEMENTATION.md`

Happy building! 🎉

