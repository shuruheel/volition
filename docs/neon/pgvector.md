# pgvector Extension

The `pgvector` extension adds vector similarity search capabilities to Postgres, making it ideal for AI applications, semantic search, and recommendation systems.

## Overview

pgvector enables you to:
- Store embeddings from OpenAI, Cohere, or other providers
- Perform fast similarity searches
- Build RAG (Retrieval-Augmented Generation) applications
- Implement recommendation engines
- Create semantic search features

## Installation

Enable the extension in your Neon database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify installation:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Creating Vector Columns

### Basic Syntax

```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  embedding vector(1536) -- 1536 dimensions for OpenAI ada-002
);
```

### Common Embedding Dimensions

```sql
-- OpenAI text-embedding-ada-002
embedding vector(1536)

-- OpenAI text-embedding-3-small
embedding vector(1536)

-- OpenAI text-embedding-3-large
embedding vector(3072)

-- Cohere embed-english-v3.0
embedding vector(1024)

-- Sentence Transformers (varies)
embedding vector(384) -- all-MiniLM-L6-v2
embedding vector(768) -- all-mpnet-base-v2
```

## Complete Example Schema

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast similarity search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Add full-text search for hybrid search
ALTER TABLE documents ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX ON documents USING gin(content_tsv);
```

## Distance Metrics

pgvector supports three distance metrics:

### 1. Cosine Distance (Most Common for Embeddings)

```sql
-- Index
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Query
SELECT * FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

**Use for**: Most embedding models (OpenAI, Cohere, etc.)

### 2. L2 Distance (Euclidean)

```sql
-- Index
CREATE INDEX ON documents USING hnsw (embedding vector_l2_ops);

-- Query
SELECT * FROM documents
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

**Use for**: When embeddings are not normalized

### 3. Inner Product

```sql
-- Index
CREATE INDEX ON documents USING hnsw (embedding vector_ip_ops);

-- Query
SELECT * FROM documents
ORDER BY embedding <#> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

**Use for**: Maximum inner product search (MIPS)

## Indexing Strategies

### HNSW Index (Recommended)

```sql
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Parameters**:
- `m`: Number of bi-directional links (default: 16, range: 2-100)
  - Higher = better recall, more memory
- `ef_construction`: Size of dynamic candidate list (default: 64, range: 4-1000)
  - Higher = better recall, slower build time

**Best for**: Most use cases, good balance of speed and accuracy

### IVFFlat Index

```sql
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Parameters**:
- `lists`: Number of inverted lists (default: 100)
  - Use `rows / 1000` for rows > 1M
  - Use at least `sqrt(rows)` for smaller datasets

**Best for**: Very large datasets (millions of vectors)

## Working with Embeddings in TypeScript

### Generate and Store Embeddings

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
    VALUES (
      ${content},
      ${JSON.stringify(embedding)},
      ${JSON.stringify(metadata)}
    )
    RETURNING id
  `;

  return result[0].id;
}

// Usage
await addDocument(
  'Neon is a serverless Postgres platform.',
  { source: 'docs', category: 'overview' }
);
```

### Similarity Search

```typescript
async function similaritySearch(query: string, limit: number = 5) {
  // Generate query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Search for similar documents
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
const results = await similaritySearch('What is Neon?');
console.log(results);
```

### Filtered Search

```typescript
async function searchWithFilters(
  query: string,
  filters: { category?: string; minSimilarity?: number },
  limit: number = 5
) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  const results = await sql`
    WITH similarities AS (
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM documents
      WHERE
        (${filters.category}::TEXT IS NULL OR metadata->>'category' = ${filters.category})
    )
    SELECT * FROM similarities
    WHERE similarity >= ${filters.minSimilarity || 0}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return results;
}
```

## Batch Operations

### Batch Insert

```typescript
async function batchInsertDocuments(
  documents: Array<{ content: string; metadata?: object }>
) {
  // Generate embeddings in batch
  const contents = documents.map(d => d.content);
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: contents,
  });

  // Prepare values for insert
  const values = documents.map((doc, i) => ({
    content: doc.content,
    embedding: JSON.stringify(embeddingResponse.data[i].embedding),
    metadata: JSON.stringify(doc.metadata || {}),
  }));

  // Insert all documents
  for (const value of values) {
    await sql`
      INSERT INTO documents (content, embedding, metadata)
      VALUES (${value.content}, ${value.embedding}, ${value.metadata})
    `;
  }
}
```

### Update Embeddings

```typescript
async function updateEmbedding(id: number, newContent: string) {
  // Generate new embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: newContent,
  });

  const embedding = embeddingResponse.data[0].embedding;

  // Update document
  await sql`
    UPDATE documents
    SET
      content = ${newContent},
      embedding = ${JSON.stringify(embedding)},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `;
}
```

## Advanced Queries

### Hybrid Search (Semantic + Keyword)

```typescript
async function hybridSearch(query: string, limit: number = 10) {
  // Generate embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Combine semantic and keyword search
  const results = await sql`
    WITH semantic_search AS (
      SELECT
        id,
        content,
        metadata,
        (1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) AS semantic_score
      FROM documents
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit * 2}
    ),
    keyword_search AS (
      SELECT
        id,
        content,
        metadata,
        ts_rank(content_tsv, plainto_tsquery('english', ${query})) AS keyword_score
      FROM documents
      WHERE content_tsv @@ plainto_tsquery('english', ${query})
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

### Multi-Vector Search

```typescript
// Schema with multiple embeddings
sql`
  CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    name_embedding vector(1536),
    description_embedding vector(1536)
  )
`;

// Search across multiple embeddings
async function multiVectorSearch(query: string) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  return await sql`
    SELECT
      id,
      name,
      description,
      LEAST(
        name_embedding <=> ${JSON.stringify(queryEmbedding)}::vector,
        description_embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      ) AS distance
    FROM products
    ORDER BY distance
    LIMIT 10
  `;
}
```

### Clustering

```typescript
async function findClusters(numClusters: number = 5) {
  return await sql`
    WITH clusters AS (
      SELECT
        id,
        content,
        ntile(${numClusters}) OVER (ORDER BY embedding <-> '[0,0,...]'::vector) AS cluster_id
      FROM documents
    )
    SELECT cluster_id, COUNT(*) as count
    FROM clusters
    GROUP BY cluster_id
    ORDER BY cluster_id
  `;
}
```

## Performance Optimization

### Index Tuning

```sql
-- Monitor index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND tablename = 'documents';

-- Rebuild index with better parameters
DROP INDEX IF EXISTS documents_embedding_idx;
CREATE INDEX documents_embedding_idx ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);
```

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Add covering index for frequently accessed columns
CREATE INDEX ON documents (id, content) INCLUDE (metadata);
```

### Connection Pooling

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export async function searchWithPool(query: string) {
  const client = await pool.connect();
  try {
    // Perform search
    return await client.query('SELECT ...');
  } finally {
    client.release();
  }
}
```

## Best Practices

1. **Choose the Right Index**
   - HNSW for most cases
   - IVFFlat for very large datasets (>1M rows)

2. **Normalize Embeddings**
   - Most models (OpenAI) already normalize
   - Use cosine distance for normalized embeddings

3. **Batch Operations**
   - Generate embeddings in batches
   - Use bulk inserts for better performance

4. **Filter Before Similarity Search**
   - Apply metadata filters first
   - Then sort by similarity

5. **Monitor Index Size**
   ```sql
   SELECT pg_size_pretty(pg_relation_size('documents_embedding_idx'));
   ```

6. **Regular VACUUM**
   ```sql
   VACUUM ANALYZE documents;
   ```

## Common Issues and Solutions

### Slow Queries

```sql
-- Increase ef_construction for better accuracy
DROP INDEX documents_embedding_idx;
CREATE INDEX documents_embedding_idx ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 128);

-- Or use IVFFlat for very large datasets
CREATE INDEX documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);
```

### High Memory Usage

```sql
-- Reduce m parameter
DROP INDEX documents_embedding_idx;
CREATE INDEX documents_embedding_idx ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 8, ef_construction = 64);
```

### Inaccurate Results

```sql
-- Increase m and ef_construction
DROP INDEX documents_embedding_idx;
CREATE INDEX documents_embedding_idx ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 256);
```

## Resources

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Neon AI Guide](./ai-integration.md)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for vector search support.

