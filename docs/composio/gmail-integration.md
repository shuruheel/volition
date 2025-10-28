# Composio Gmail Integration

Complete guide to integrating Gmail with Composio for AI agents and workflows.

## Overview

Composio provides a comprehensive toolkit for Gmail integration, allowing your AI agents to interact with Gmail programmatically. This includes sending emails, reading messages, managing labels, and handling drafts.

## Authentication

### Bearer Token Authentication

Composio supports bearer token authentication for Gmail integration through OAuth 2.0.

```javascript
import { Composio } from "composio-core"

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY
})

// Initialize Gmail connection
const connection = await composio.getConnection({
  app: "gmail",
  entityId: "user-123"
})
```

### Setup Authentication

1. Go to the [Composio Dashboard](https://app.composio.dev)
2. Navigate to "Integrations" → "Gmail"
3. Click "Connect" and follow OAuth flow
4. Copy the integration ID for your application

## Available Actions

### Email Management

#### GMAIL_SEND_EMAIL

Send an email via Gmail API using the authenticated user's Google profile display name.

**Parameters:**
- `recipient_email` (string, optional): Primary recipient email
- `cc` (array, optional): CC recipients
- `bcc` (array, optional): BCC recipients
- `subject` (string, optional): Email subject
- `body` (string, optional): Email body content
- `is_html` (boolean): Set to `true` if body contains HTML
- `attachment` (object, optional): Attachment with `s3key`, `mimetype`, and `name`
- `user_id` (string): Defaults to "me"

**Requirements:**
- At least one of `recipient_email`, `cc`, or `bcc` must be provided
- At least one of `subject` or `body` must be provided
- Use `is_html=true` if the body contains HTML

**Example:**
```javascript
const result = await composio.executeAction({
  action: "GMAIL_SEND_EMAIL",
  params: {
    recipient_email: "user@example.com",
    subject: "Meeting Reminder",
    body: "Don't forget about our meeting tomorrow at 2 PM",
    is_html: false,
    user_id: "me"
  },
  entityId: "user-123"
})
```

#### GMAIL_CREATE_EMAIL_DRAFT

Create a new email draft without sending it.

**Parameters:**
- `recipient_email` (string): Recipient email address
- `subject` (string): Email subject
- `body` (string): Email body
- `cc` (array, optional): CC recipients
- `bcc` (array, optional): BCC recipients
- `is_html` (boolean): Whether body is HTML
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const draft = await composio.executeAction({
  action: "GMAIL_CREATE_EMAIL_DRAFT",
  params: {
    recipient_email: "colleague@company.com",
    subject: "Draft: Project Update",
    body: "This is a draft email about project status",
    is_html: false
  },
  entityId: "user-123"
})
```

#### GMAIL_REPLY_TO_THREAD

Reply to an existing email thread.

**Parameters:**
- `thread_id` (string, required): Thread ID to reply to
- `message_body` (string): Reply message content
- `recipient_email` (string, optional): Additional recipient
- `cc` (array, optional): CC recipients
- `bcc` (array, optional): BCC recipients
- `is_html` (boolean): Whether body is HTML
- `attachment` (object, optional): Attachment details
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const reply = await composio.executeAction({
  action: "GMAIL_REPLY_TO_THREAD",
  params: {
    thread_id: "thread-abc123",
    message_body: "Thanks for your email. I'll review this by EOD.",
    is_html: false
  },
  entityId: "user-123"
})
```

### Message Retrieval

#### GMAIL_FETCH_EMAILS

Retrieve emails from Gmail with filtering and pagination.

**Parameters:**
- `max_results` (integer): Maximum number of results (default: 10)
- `page_token` (string, optional): Token for pagination
- `query` (string, optional): Search query (Gmail search syntax)
- `user_id` (string): Defaults to "me"
- `verbose` (boolean): Include full email details

**Example:**
```javascript
// Get unread emails
const emails = await composio.executeAction({
  action: "GMAIL_FETCH_EMAILS",
  params: {
    query: "is:unread",
    max_results: 20,
    verbose: true
  },
  entityId: "user-123"
})

// Get emails from specific sender
const senderEmails = await composio.executeAction({
  action: "GMAIL_FETCH_EMAILS",
  params: {
    query: "from:boss@company.com",
    max_results: 10
  },
  entityId: "user-123"
})
```

#### GMAIL_GET_EMAIL

Get a specific email by ID.

**Parameters:**
- `message_id` (string, required): Message ID to retrieve
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const email = await composio.executeAction({
  action: "GMAIL_GET_EMAIL",
  params: {
    message_id: "msg-abc123"
  },
  entityId: "user-123"
})
```

#### GMAIL_LIST_THREADS

List email threads with filtering and pagination.

**Parameters:**
- `max_results` (integer): Maximum threads to return (default: 10)
- `page_token` (string, optional): Pagination token
- `query` (string, optional): Search query
- `user_id` (string): Defaults to "me"
- `verbose` (boolean): Include full thread details

**Example:**
```javascript
const threads = await composio.executeAction({
  action: "GMAIL_LIST_THREADS",
  params: {
    query: "subject:project update",
    max_results: 15,
    verbose: true
  },
  entityId: "user-123"
})
```

### Label Management

#### GMAIL_CREATE_LABEL

Create a new Gmail label.

**Parameters:**
- `label_name` (string, required): Name for the new label
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const label = await composio.executeAction({
  action: "GMAIL_CREATE_LABEL",
  params: {
    label_name: "AI Assistant"
  },
  entityId: "user-123"
})
```

#### GMAIL_ADD_LABEL

Add a label to a specific email.

**Parameters:**
- `message_id` (string, required): Message to label
- `label_ids` (array, required): Label IDs to add
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const labeled = await composio.executeAction({
  action: "GMAIL_ADD_LABEL",
  params: {
    message_id: "msg-abc123",
    label_ids: ["Label_123", "Label_456"]
  },
  entityId: "user-123"
})
```

#### GMAIL_REMOVE_LABEL

Remove a label from an email.

**Parameters:**
- `label_id` (string, required): Label ID to remove
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
await composio.executeAction({
  action: "GMAIL_REMOVE_LABEL",
  params: {
    label_id: "Label_123"
  },
  entityId: "user-123"
})
```

#### GMAIL_LIST_LABELS

Retrieve all labels for the Gmail account.

**Parameters:**
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const labels = await composio.executeAction({
  action: "GMAIL_LIST_LABELS",
  params: {},
  entityId: "user-123"
})
```

### Draft Management

#### GMAIL_LIST_DRAFTS

List all email drafts.

**Parameters:**
- `max_results` (integer): Maximum drafts to return (default: 1)
- `page_token` (string, optional): Pagination token
- `user_id` (string): Defaults to "me"
- `verbose` (boolean): Include full draft details

**Example:**
```javascript
const drafts = await composio.executeAction({
  action: "GMAIL_LIST_DRAFTS",
  params: {
    max_results: 10,
    verbose: true
  },
  entityId: "user-123"
})
```

#### GMAIL_SEND_DRAFT

Send an existing draft.

**Parameters:**
- `draft_id` (string, required): Draft ID to send
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
await composio.executeAction({
  action: "GMAIL_SEND_DRAFT",
  params: {
    draft_id: "draft-abc123"
  },
  entityId: "user-123"
})
```

### Message Operations

#### GMAIL_MOVE_TO_TRASH

Move a message to trash.

**Parameters:**
- `message_id` (string, required): Message to trash
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
await composio.executeAction({
  action: "GMAIL_MOVE_TO_TRASH",
  params: {
    message_id: "msg-abc123"
  },
  entityId: "user-123"
})
```

#### GMAIL_GET_ATTACHMENT

Retrieve email attachment.

**Parameters:**
- `attachment_id` (string, required): Attachment ID
- `message_id` (string, required): Message containing attachment
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const attachment = await composio.executeAction({
  action: "GMAIL_GET_ATTACHMENT",
  params: {
    message_id: "msg-abc123",
    attachment_id: "attach-xyz789"
  },
  entityId: "user-123"
})
```

#### GMAIL_MODIFY_THREAD_LABELS

Add or remove labels from an entire thread.

**Parameters:**
- `thread_id` (string, required): Thread to modify
- `add_label_ids` (array, optional): Labels to add
- `remove_label_ids` (array, optional): Labels to remove
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
await composio.executeAction({
  action: "GMAIL_MODIFY_THREAD_LABELS",
  params: {
    thread_id: "thread-abc123",
    add_label_ids: ["Label_Important"],
    remove_label_ids: ["Label_Todo"]
  },
  entityId: "user-123"
})
```

### Advanced Operations

#### GMAIL_LIST_HISTORY

List mailbox change history since a known `startHistoryId`. Useful for incremental syncing.

**Parameters:**
- `start_history_id` (string, required): Starting history ID
- `history_types` (array, optional): Types of history to retrieve
- `label_id` (string, optional): Filter by label
- `max_results` (integer): Default 100
- `page_token` (string, optional): Pagination token
- `user_id` (string): Defaults to "me"

**Example:**
```javascript
const history = await composio.executeAction({
  action: "GMAIL_LIST_HISTORY",
  params: {
    start_history_id: "12345",
    max_results: 50
  },
  entityId: "user-123"
})
```

#### GMAIL_SEARCH_PEOPLE

Search Gmail contacts.

**Parameters:**
- `query` (string, required): Search query
- `person_fields` (string): Fields to return (default: "emailAddresses,names,phoneNumbers")
- `pageSize` (integer): Default 10
- `other_contacts` (boolean): Include other contacts (default: true)

**Example:**
```javascript
const contacts = await composio.executeAction({
  action: "GMAIL_SEARCH_PEOPLE",
  params: {
    query: "john",
    pageSize: 20
  },
  entityId: "user-123"
})
```

## Gmail Search Query Syntax

Use Gmail's powerful search syntax in the `query` parameter:

```javascript
// Unread messages
"is:unread"

// From specific sender
"from:sender@example.com"

// Subject contains
"subject:meeting"

// Has attachment
"has:attachment"

// Date range
"after:2024/10/01 before:2024/10/31"

// Combine queries
"from:boss@company.com is:unread has:attachment"

// In specific label
"label:important"

// Larger than size
"larger:10M"
```

## Integration with AI Agents

### Example: Email Assistant Agent

```javascript
import { OpenAI } from "openai"
import { Composio } from "composio-core"

const openai = new OpenAI()
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY
})

// Get Gmail tools for the agent
const tools = await composio.getTools({
  apps: ["gmail"],
  entityId: "user-123"
})

async function emailAssistant(userMessage) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an email assistant that helps manage Gmail."
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    tools: tools,
    tool_choice: "auto"
  })

  // Handle tool calls
  if (response.choices[0].message.tool_calls) {
    const results = await composio.handleToolCalls(
      response.choices[0].message.tool_calls,
      { entityId: "user-123" }
    )
    return results
  }

  return response.choices[0].message.content
}

// Usage
await emailAssistant("Send an email to john@example.com about tomorrow's meeting")
await emailAssistant("Show me my unread emails from this week")
await emailAssistant("Create a draft reply to the latest email from my boss")
```

## Best Practices

1. **Use Entity IDs**: Always associate connections with specific users via entity IDs
2. **Handle Pagination**: Use `page_token` for large result sets
3. **Verbose Mode**: Enable verbose mode when you need full email details
4. **Search Queries**: Leverage Gmail's search syntax for efficient filtering
5. **Error Handling**: Implement proper error handling for API failures
6. **Rate Limiting**: Be aware of Gmail API rate limits (implement backoff)
7. **Attachments**: Use proper MIME types when handling attachments
8. **Labels**: Use label IDs (not names) for better reliability

## Common Use Cases

### 1. Auto-Reply System
```javascript
// Fetch unread emails
const emails = await composio.executeAction({
  action: "GMAIL_FETCH_EMAILS",
  params: {
    query: "is:unread label:auto-reply",
    max_results: 10
  },
  entityId: "user-123"
})

// Reply to each
for (const email of emails.data.messages) {
  await composio.executeAction({
    action: "GMAIL_REPLY_TO_THREAD",
    params: {
      thread_id: email.threadId,
      message_body: "Thank you for your email. I'll get back to you soon."
    },
    entityId: "user-123"
  })
}
```

### 2. Email Categorization
```javascript
// Fetch recent emails
const emails = await composio.executeAction({
  action: "GMAIL_FETCH_EMAILS",
  params: {
    query: "newer_than:1d",
    max_results: 50,
    verbose: true
  },
  entityId: "user-123"
})

// Categorize with AI and add labels
for (const email of emails.data.messages) {
  const category = await categorizeEmail(email) // Your AI logic
  await composio.executeAction({
    action: "GMAIL_ADD_LABEL",
    params: {
      message_id: email.id,
      label_ids: [category.labelId]
    },
    entityId: "user-123"
  })
}
```

### 3. Draft Generation
```javascript
// Generate draft based on context
await composio.executeAction({
  action: "GMAIL_CREATE_EMAIL_DRAFT",
  params: {
    recipient_email: "client@example.com",
    subject: "Project Proposal",
    body: generatedContent, // From AI
    is_html: true
  },
  entityId: "user-123"
})
```

## Response Format

All Gmail actions return a standardized response:

```typescript
{
  data: object,       // Action-specific response data
  error: string,      // Error message if failed
  successful: boolean // Operation success status
}
```

## Resources

- [Composio Dashboard](https://app.composio.dev)
- [Composio Documentation](https://docs.composio.dev)
- [Gmail API Reference](https://developers.google.com/gmail/api)
- [Gmail Search Operators](https://support.google.com/mail/answer/7190)

## Support

- Email: support@composio.dev
- Documentation: https://docs.composio.dev/toolkits/gmail
- GitHub: https://github.com/ComposioHQ/composio

---

**Last Updated:** October 28, 2025

Documentation compiled from [Composio Gmail Toolkit](https://docs.composio.dev/toolkits/gmail).

