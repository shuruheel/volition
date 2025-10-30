# Supermemory Native SDKs

Learn how to use supermemory with Python and JavaScript

For more information, see the full updated references at:
- [Python SDK on PyPI](https://pypi.org/project/supermemory/)
- [JavaScript SDK on NPM](https://www.npmjs.com/package/supermemory)

## Python SDK

### Installation

```bash
# install from PyPI
pip install --pre supermemory
```

### Usage

```python
import os
from supermemory import Supermemory

client = Supermemory(
    api_key=os.environ.get("SUPERMEMORY_API_KEY"), # This is the default and can be omitted
)

response = client.search.documents(
    q="documents related to python",
)
print(response.results)
```

### Common Operations

**Adding Documents**
```python
# Add a single document
response = client.documents.add(
    content="Important information about the project",
    metadata={"type": "note", "project": "main"}
)

# Add multiple documents
response = client.documents.add_bulk([
    {"content": "Document 1", "metadata": {"type": "note"}},
    {"content": "Document 2", "metadata": {"type": "article"}}
])
```

**Searching Documents**
```python
# Semantic search
response = client.search.documents(
    q="what are the project requirements?",
    limit=10
)

for result in response.results:
    print(f"Content: {result.content}")
    print(f"Score: {result.score}")
```

**Managing User Profiles**
```python
# Get user profile
profile = client.profiles.get(user_id="user-123")

# Update profile
client.profiles.update(
    user_id="user-123",
    data={"preferences": {"language": "python"}}
)
```

## JavaScript SDK

### Installation

```bash
npm install supermemory
```

### Usage

```javascript
import Supermemory from 'supermemory';

const client = new Supermemory({
  apiKey: process.env['SUPERMEMORY_API_KEY'], // This is the default and can be omitted
});

async function main() {
  const response = await client.search.documents({ q: 'documents related to python' });
  console.debug(response.results);
}

main();
```

### Common Operations

**Adding Documents**
```javascript
// Add a single document
const response = await client.documents.add({
  content: "Important information about the project",
  metadata: { type: "note", project: "main" }
});

// Add multiple documents
const bulkResponse = await client.documents.addBulk([
  { content: "Document 1", metadata: { type: "note" } },
  { content: "Document 2", metadata: { type: "article" } }
]);
```

**Searching Documents**
```javascript
// Semantic search
const response = await client.search.documents({
  q: "what are the project requirements?",
  limit: 10
});

response.results.forEach(result => {
  console.log(`Content: ${result.content}`);
  console.log(`Score: ${result.score}`);
});
```

**Managing User Profiles**
```javascript
// Get user profile
const profile = await client.profiles.get({ userId: "user-123" });

// Update profile
await client.profiles.update({
  userId: "user-123",
  data: { preferences: { language: "javascript" } }
});
```

## TypeScript Support

The JavaScript SDK includes full TypeScript definitions:

```typescript
import Supermemory, { SearchResponse, Document } from 'supermemory';

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY
});

async function searchDocuments(query: string): Promise<SearchResponse> {
  return await client.search.documents({ q: query });
}

async function addDocument(content: string, metadata: Record<string, any>): Promise<Document> {
  return await client.documents.add({ content, metadata });
}
```

## Error Handling

### Python
```python
from supermemory import Supermemory
from supermemory.exceptions import SupermemoryError

try:
    client = Supermemory(api_key="your-api-key")
    response = client.search.documents(q="query")
except SupermemoryError as e:
    print(f"Error: {e}")
```

### JavaScript
```javascript
try {
  const client = new Supermemory({ apiKey: "your-api-key" });
  const response = await client.search.documents({ q: "query" });
} catch (error) {
  console.error("Error:", error.message);
}
```

## Configuration Options

### Python
```python
client = Supermemory(
    api_key="your-api-key",
    base_url="https://api.supermemory.ai",  # Optional: custom base URL
    timeout=30.0,  # Optional: request timeout in seconds
    max_retries=3  # Optional: max retry attempts
)
```

### JavaScript
```javascript
const client = new Supermemory({
  apiKey: "your-api-key",
  baseUrl: "https://api.supermemory.ai",  // Optional: custom base URL
  timeout: 30000,  // Optional: request timeout in ms
  maxRetries: 3  // Optional: max retry attempts
});
```

## Best Practices

1. **Store API Keys Securely**: Always use environment variables for API keys
2. **Handle Errors Gracefully**: Implement proper error handling for production use
3. **Use Metadata**: Add meaningful metadata to documents for better organization
4. **Optimize Queries**: Use specific, well-formed queries for better search results
5. **Batch Operations**: Use bulk operations when adding multiple documents

## Next Steps

- [AI SDK Integration](./ai-sdk-overview.md) - Use with Vercel AI SDK
- [API Reference](https://api.supermemory.ai/v3/reference) - Explore the full API
- [Examples](https://supermemory.ai/docs/cookbook/overview) - See complete examples

## Links

- [Python SDK on PyPI](https://pypi.org/project/supermemory/)
- [JavaScript SDK on NPM](https://www.npmjs.com/package/supermemory)
- [Documentation](https://supermemory.ai/docs/memory-api/sdks/native)

