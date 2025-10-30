# Browser Use - MCP Server Integration

Model Context Protocol server for AI model integration with browser automation.

> **Source:** [Browser Use MCP Server](https://docs.cloud.browser-use.com/usage/mcp-server)

## Overview

Browser Use provides a hosted **Model Context Protocol (MCP)** server that lets AI models control browser automation directly. Connect Claude, LM Studio, or any MCP-compatible AI to perform web tasks automatically.

**MCP Server URL:** `https://api.browser-use.com/mcp/`

## What is MCP?

Model Context Protocol (MCP) is a standard that allows AI models to interact with external tools and services. Browser Use's MCP server provides browser automation capabilities directly to AI models.

## Quick Setup

### 1. Get API Key

Get your API key from the [Browser Use Dashboard](https://cloud.browser-use.com).

### 2. Connect Your AI

For services supporting MCP servers (like Claude Desktop, LM Studio, etc.), update your MCP configuration file:

**Configuration File:**
```json
{
  "mcpServers": {
    "browser_use": {
      "url": "https://api.browser-use.com/mcp/",
      "headers": {
        "X-Browser-Use-API-Key": "Your-API-Key-Here"
      }
    }
  }
}
```

**Claude Desktop:** Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent path on other platforms.

**LM Studio:** Configure in MCP server settings.

## Available Tools

The MCP server provides two tools that AI models can use:

### 1. `browser_task`

Creates and runs a browser automation task.

**Parameters:**
- `task` (required): What you want the browser to do
- `max_steps` (optional): Maximum actions to take (1-10, default: 8)

**Example:**
```json
{
  "task": "Search Google for the latest iPhone reviews",
  "max_steps": 10
}
```

### 2. `get_browser_task_status`

Checks task progress with smart polling.

**Parameters:**
- `task_id` (required): Task ID to check
- `enable_polling` (optional): Auto-poll for 28s (default: true)

**Example:**
```json
{
  "task_id": "task_abc123",
  "enable_polling": true
}
```

## Example Usage

Once connected, ask your AI to perform web tasks:

### Example 1: Search and Summarize
```
"Search Google for the latest iPhone reviews and summarize the top 3 results"
```

The AI will:
1. Call `browser_task` with the search instruction
2. Wait for completion
3. Return summarized results

### Example 2: Data Extraction
```
"Go to Hacker News and get me the titles of the top 5 posts"
```

The AI will:
1. Call `browser_task` to navigate and extract
2. Poll status until complete
3. Return the structured data

### Example 3: Form Filling
```
"Fill out the contact form on example.com with my information"
```

The AI will:
1. Call `browser_task` with form filling instructions
2. Monitor progress
3. Confirm completion

## Smart Features

### Intelligent Polling

When you check task status, the server automatically:

- Polls every 4 seconds for up to 28 seconds
- Provides smart recommendations based on how long the task has been running
- Tells you whether to wait more or take action

### Status Messages

Get clear guidance on what to do next:

**Under 5 minutes:**
> "Recommend trying get_browser_task_status again"

**Over 5 minutes:**
> "Consider checking live_url or stopping if stuck"

### Auto-Completion

The MCP server handles:
- Task creation
- Status polling
- Result retrieval
- Error handling

All automatically through the AI model's tool calling capabilities.

## Integration Examples

### Claude Desktop

1. Edit configuration file:
```json
{
  "mcpServers": {
    "browser_use": {
      "url": "https://api.browser-use.com/mcp/",
      "headers": {
        "X-Browser-Use-API-Key": "bu_your_api_key_here"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. Ask Claude to perform browser tasks:
```
Claude, please search for the top 10 trending GitHub repositories and tell me what they do.
```

### LM Studio

1. Navigate to MCP Server settings
2. Add new server with URL: `https://api.browser-use.com/mcp/`
3. Add header: `X-Browser-Use-API-Key` with your API key
4. Save and enable

### Custom MCP Client

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient({
  serverUrl: 'https://api.browser-use.com/mcp/',
  headers: {
    'X-Browser-Use-API-Key': process.env.BROWSER_USE_API_KEY
  }
});

// Call browser_task tool
const result = await client.callTool('browser_task', {
  task: 'Extract product prices from Amazon',
  max_steps: 10
});

// Check status
const status = await client.callTool('get_browser_task_status', {
  task_id: result.task_id,
  enable_polling: true
});
```

## Workflow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   AI Model  │────────►│  MCP Server  │────────►│  Browser Use    │
│  (Claude)   │         │              │         │     Cloud       │
└─────────────┘         └──────────────┘         └─────────────────┘
      │                        │                         │
      │ browser_task           │ Create Task             │
      │───────────────────────►│────────────────────────►│
      │                        │                         │
      │                        │ ◄───────────────────────│
      │ ◄──────────────────────│     Task ID             │
      │                        │                         │
      │ get_browser_task_status│                         │
      │───────────────────────►│ Poll Status             │
      │                        │────────────────────────►│
      │                        │                         │
      │                        │ ◄───────────────────────│
      │ ◄──────────────────────│     Result              │
      │                        │                         │
```

## Troubleshooting

### Connection Issues?

✅ Verify your API key is correct  
✅ Check you're using the right header: `X-Browser-Use-API-Key`  
✅ Ensure your MCP client supports custom headers

### Task Taking Too Long?

✅ Check the `live_url` in the response to see browser progress  
✅ Increase `max_steps` for complex tasks (max: 10)  
✅ Use clearer, more specific instructions  
✅ Break complex tasks into smaller steps

### No Response from AI?

✅ Verify MCP server is enabled in your AI client  
✅ Restart your AI application after configuration changes  
✅ Check MCP client logs for errors

### Task Errors?

✅ Make instructions more specific  
✅ Check if the website requires authentication  
✅ Verify the website is accessible  
✅ Try with a simpler task first

## Best Practices

### 1. Clear Instructions

❌ "Get data from that website"  
✅ "Go to example.com and extract all product names and prices from the first page"

### 2. Appropriate max_steps

- Simple tasks: 5-8 steps (default: 8)
- Complex multi-page: 10 steps
- Very simple: 3-5 steps

### 3. Break Down Complex Tasks

Instead of:
> "Search for products, compare prices, and create a spreadsheet"

Do:
> 1. "Search for products on Amazon and get the first 10 results"
> 2. "For each product, extract the price and rating"
> 3. Then process the data separately

### 4. Monitor Progress

For long tasks, check status periodically:
```
"Create a task to extract all job listings, then check its status in 30 seconds"
```

## Limitations

- Maximum 10 steps per task
- Task timeout: Varies by complexity
- Concurrent tasks: Limited by your plan
- Some websites may have anti-bot protections (use stealth features)

## Pricing

MCP server usage counts toward your Browser Use Cloud quota. Check your [dashboard](https://cloud.browser-use.com) for current usage and pricing.

## Security

- API keys are transmitted securely via headers
- Tasks run in isolated browser environments
- No persistent storage of credentials (use secrets feature)
- All communication over HTTPS

## Need Help?

- Check the [v2 API Reference](https://docs.cloud.browser-use.com/api-reference/v2) for detailed specifications
- Visit [Browser Use Documentation](https://docs.cloud.browser-use.com)
- Contact support through the dashboard

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Browser Use Dashboard](https://cloud.browser-use.com)
- [API Reference](https://docs.cloud.browser-use.com/api-reference/v2)
- [Claude Desktop](https://claude.ai/desktop)
- [LM Studio](https://lmstudio.ai)

---

**Last Updated:** October 28, 2025

For more details, visit the [official MCP server documentation](https://docs.cloud.browser-use.com/usage/mcp-server).

