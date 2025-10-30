# AI Integration with Neon

Neon is purpose-built for AI applications, offering native support for vector embeddings, semantic search, and AI agent workflows. This guide covers everything you need to build transformative LLM applications with Neon.

## Overview

Neon provides a comprehensive AI stack:

- **Vector Storage**: Store and query embeddings with pgvector
- **Semantic Search**: Fast similarity search for RAG applications
- **Agent State Management**: Persistent storage for agent memory
- **Scalable Infrastructure**: Auto-scaling for AI workloads
- **Low Latency**: Optimized for real-time AI applications

## pgvector Extension

The `pgvector` extension adds vector similarity search capabilities to Postgres.

### Installation

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Create a Vector Column

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Create an Index for Fast Search

```sql
-- HNSW index (recommended for most use cases)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Or IVFFlat index (good for very large datasets)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Supported Distance Metrics

```sql
-- Cosine distance (most common for embeddings)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- L2 distance (Euclidean)
CREATE INDEX ON documents USING hnsw (embedding vector_l2_ops);

-- Inner product
CREATE INDEX ON documents USING hnsw (embedding vector_ip_ops);
```

## Building RAG Applications

RAG (Retrieval-Augmented Generation) combines vector search with LLMs to provide contextually relevant responses.

### Step 1: Generate and Store Embeddings

```typescript
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function addDocument(content: string, metadata: object = {}) {
  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: content,
  });
  
  const embedding = embeddingResponse.data[0].embedding;
  
  // Store in database
  const result = await sql`
    INSERT INTO documents (content, embedding, metadata)
    VALUES (${content}, ${JSON.stringify(embedding)}, ${JSON.stringify(metadata)})
    RETURNING id
  `;
  
  return result[0].id;
}

// Usage
await addDocument(
  'Neon is a serverless Postgres platform with autoscaling.',
  { source: 'documentation', category: 'overview' }
);
```

### Step 2: Semantic Search

```typescript
async function semanticSearch(query: string, limit: number = 5) {
  // Generate query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  
  const queryEmbedding = embeddingResponse.data[0].embedding;
  
  // Find similar documents
  const results = await sql`
    SELECT 
      id,
      content,
      metadata,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `;
  
  return results;
}

// Usage
const similarDocs = await semanticSearch('What is Neon database?');
console.log(similarDocs);
```

### Step 3: Build a Complete RAG Pipeline

```typescript
async function askQuestion(question: string): Promise<string> {
  // 1. Find relevant context
  const relevantDocs = await semanticSearch(question, 3);
  
  // 2. Build context from retrieved documents
  const context = relevantDocs
    .map((doc) => doc.content)
    .join('\n\n');
  
  // 3. Generate answer with LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Answer questions based on the provided context. If the context doesn\'t contain relevant information, say so.',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });
  
  return completion.choices[0].message.content || 'No answer generated.';
}

// Usage
const answer = await askQuestion('How does Neon handle autoscaling?');
console.log('Answer:', answer);
```

## AI Agent State Management

Store and manage agent memory, conversation history, and context.

### Schema for Agent State

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  system_prompt TEXT,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  metadata JSONB
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast message retrieval
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_embedding ON messages USING hnsw (embedding vector_cosine_ops);
```

### Agent Implementation

```typescript
import { v4 as uuidv4 } from 'uuid';

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class NeonAgent {
  private sql;
  private openai;
  private agentId: string;
  
  constructor(agentId: string) {
    this.sql = neon(process.env.DATABASE_URL!);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.agentId = agentId;
  }
  
  async createConversation(userId: string): Promise<string> {
    const result = await this.sql`
      INSERT INTO conversations (agent_id, user_id)
      VALUES (${this.agentId}, ${userId})
      RETURNING id
    `;
    return result[0].id;
  }
  
  async addMessage(
    conversationId: string,
    role: string,
    content: string
  ): Promise<void> {
    // Generate embedding for semantic search
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
    });
    const embedding = embeddingResponse.data[0].embedding;
    
    await this.sql`
      INSERT INTO messages (conversation_id, role, content, embedding)
      VALUES (
        ${conversationId},
        ${role},
        ${content},
        ${JSON.stringify(embedding)}
      )
    `;
  }
  
  async getConversationHistory(
    conversationId: string,
    limit: number = 50
  ): Promise<Message[]> {
    const messages = await this.sql`
      SELECT role, content
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    return messages.reverse();
  }
  
  async findSimilarMessages(
    conversationId: string,
    query: string,
    limit: number = 5
  ) {
    // Generate query embedding
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Find similar messages in conversation
    const results = await this.sql`
      SELECT 
        role,
        content,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;
    
    return results;
  }
  
  async chat(conversationId: string, userMessage: string): Promise<string> {
    // Store user message
    await this.addMessage(conversationId, 'user', userMessage);
    
    // Get conversation history
    const history = await this.getConversationHistory(conversationId);
    
    // Get agent config
    const agent = await this.sql`
      SELECT system_prompt
      FROM agents
      WHERE id = ${this.agentId}
    `;
    
    // Generate response
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: agent[0].system_prompt },
        ...history,
      ],
    });
    
    const assistantMessage = completion.choices[0].message.content || '';
    
    // Store assistant response
    await this.addMessage(conversationId, 'assistant', assistantMessage);
    
    return assistantMessage;
  }
}

// Usage
const agent = new NeonAgent('agent-uuid');
const conversationId = await agent.createConversation('user-123');
const response = await agent.chat(conversationId, 'Hello! Tell me about Neon.');
console.log('Agent:', response);
```

## Hybrid Search

Combine semantic search with traditional keyword search for better results.

```typescript
async function hybridSearch(
  query: string,
  limit: number = 10
): Promise<any[]> {
  // Generate embedding for semantic search
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  
  // Perform hybrid search
  const results = await sql`
    WITH semantic_search AS (
      SELECT 
        id,
        content,
        metadata,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS semantic_score
      FROM documents
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit * 2}
    ),
    keyword_search AS (
      SELECT 
        id,
        content,
        metadata,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) AS keyword_score
      FROM documents
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ORDER BY keyword_score DESC
      LIMIT ${limit * 2}
    )
    SELECT 
      COALESCE(s.id, k.id) AS id,
      COALESCE(s.content, k.content) AS content,
      COALESCE(s.metadata, k.metadata) AS metadata,
      COALESCE(s.semantic_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3 AS combined_score
    FROM semantic_search s
    FULL OUTER JOIN keyword_search k ON s.id = k.id
    ORDER BY combined_score DESC
    LIMIT ${limit}
  `;
  
  return results;
}
```

## Embeddings Best Practices

### 1. Chunking Strategy

Break large documents into smaller chunks:

```typescript
function chunkText(text: string, maxLength: number = 1000): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function addLargeDocument(content: string, metadata: object = {}) {
  const chunks = chunkText(content);
  
  for (let i = 0; i < chunks.length; i++) {
    await addDocument(chunks[i], {
      ...metadata,
      chunk_index: i,
      total_chunks: chunks.length,
    });
  }
}
```

### 2. Batch Embedding Generation

Generate embeddings in batches for efficiency:

```typescript
async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: batch,
    });
    embeddings.push(...response.data.map(d => d.embedding));
  }
  
  return embeddings;
}
```

### 3. Metadata Filtering

Combine vector search with metadata filters:

```typescript
async function searchWithFilters(
  query: string,
  filters: { category?: string; source?: string },
  limit: number = 5
) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  
  let whereClause = '';
  if (filters.category) {
    whereClause += ` AND metadata->>'category' = '${filters.category}'`;
  }
  if (filters.source) {
    whereClause += ` AND metadata->>'source' = '${filters.source}'`;
  }
  
  const results = await sql`
    SELECT 
      id,
      content,
      metadata,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM documents
    WHERE 1=1 ${sql.unsafe(whereClause)}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `;
  
  return results;
}
```

## AI Agent Tools

Build tools that AI agents can use to interact with your database.

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'Search for relevant documents using semantic search',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_conversation_history',
      description: 'Retrieve recent conversation history',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: {
            type: 'string',
            description: 'The conversation ID',
          },
          limit: {
            type: 'number',
            description: 'Number of messages to retrieve',
            default: 10,
          },
        },
        required: ['conversation_id'],
      },
    },
  },
];

async function runAgentWithTools(userMessage: string, conversationId: string) {
  const messages = [
    { role: 'system', content: 'You are a helpful assistant with access to a knowledge base.' },
    { role: 'user', content: userMessage },
  ];
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    tools,
    tool_choice: 'auto',
  });
  
  const responseMessage = response.choices[0].message;
  
  // Check if the model wants to call a tool
  if (responseMessage.tool_calls) {
    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      let functionResponse;
      if (functionName === 'search_documents') {
        functionResponse = await semanticSearch(
          functionArgs.query,
          functionArgs.limit || 5
        );
      } else if (functionName === 'get_conversation_history') {
        const agent = new NeonAgent('agent-id');
        functionResponse = await agent.getConversationHistory(
          functionArgs.conversation_id,
          functionArgs.limit || 10
        );
      }
      
      // Add function response to messages
      messages.push(responseMessage);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResponse),
      });
    }
    
    // Get final response from the model
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
    });
    
    return finalResponse.choices[0].message.content;
  }
  
  return responseMessage.content;
}
```

## Performance Optimization

### 1. Index Tuning

```sql
-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- HNSW index parameters
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- m: number of bi-directional links (default: 16, range: 2-100)
-- ef_construction: size of dynamic candidate list (default: 64, range: 4-1000)
```

### 2. Query Optimization

```typescript
// Use EXPLAIN ANALYZE to understand query performance
async function analyzeQuery(query: string) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  
  const explain = await sql`
    EXPLAIN ANALYZE
    SELECT id, content
    FROM documents
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 10
  `;
  
  console.log('Query plan:', explain);
}
```

### 3. Connection Pooling

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Adjust based on your workload
});

// Reuse pool across requests
export { pool };
```

## Resources

- [pgvector Extension Guide](./pgvector.md)
- [Neon AI Concepts](https://neon.com/docs/ai/ai-concepts)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [RAG Tutorial](https://neon.com/docs/ai/ai-intro)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for AI-specific discussions and support.

