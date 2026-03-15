# Project Structure — Vector Database

## Standard Layout

```
project-name/
  src/
    index.ts              # Entry point (CLI, server, or pipeline runner)
    types.ts              # Shared types (ChunkMetadata, EmbeddingResult, QueryResult)
    embeddings/
      embed.ts            # Embedding client wrapper (OpenAI, Voyage, local model)
      models.ts           # Model configuration (dimensions, model name, batch size)
    chunking/
      chunker.ts          # Document chunking logic (split, overlap, metadata)
      loaders.ts          # Document loaders (PDF, Markdown, HTML, plain text)
    vectordb/
      client.ts           # Vector DB client wrapper (Pinecone, pgvector, ChromaDB, Qdrant)
      collections.ts      # Collection/namespace management (create, delete, list)
      queries.ts          # Query builder (topK, filters, similarity threshold)
    retrieval/
      retrieve.ts         # Core retrieval logic (embed query → search → filter)
      rerank.ts           # Reranking layer (Cohere, cross-encoder)
    pipeline/
      ingest.ts           # Ingestion pipeline (load → chunk → embed → upsert)
      rag.ts              # RAG pipeline (query → retrieve → augment → generate)
  tests/
    setup.ts              # Test helpers (mock embeddings, test index setup/teardown)
    fixtures/             # Test documents and eval sets
      eval-set.json       # Known query/document pairs for recall@k
      sample-docs/        # Small corpus for integration tests
    chunker.test.ts
    embed.test.ts
    retrieve.test.ts
    ingest.test.ts
    rag.test.ts
  scripts/
    ingest.ts             # CLI script: ingest documents into the index
    query.ts              # CLI script: run a query against the index
    eval.ts               # CLI script: run retrieval quality evaluation
  package.json
  tsconfig.json
  .env.example            # Required env vars (API keys, DB URLs — never commit .env)
```

---

## Key Conventions

**Separate embedding from storage.**
The embedding layer and the vector DB layer are independent modules. You should be able to swap Pinecone for pgvector without touching embedding code.

**Separate ingestion from retrieval.**
Ingestion (load → chunk → embed → store) and retrieval (query → search → rerank → return) are different pipelines with different performance characteristics. Keep them in separate modules.

**Configuration lives in environment variables.**
API keys, database URLs, model names, and collection names come from env vars. Never hardcode credentials.

```
# .env.example
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pc-...
PINECONE_INDEX_NAME=my-index
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

**Fixtures for testing.**
The `tests/fixtures/` directory holds small sample documents and eval sets. These are checked into the repo. Keep them small (a few KB each).

---

## File Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Source files | kebab-case | `embed.ts`, `rag.ts`, `eval-set.json` |
| Directories | kebab-case | `embeddings/`, `vectordb/`, `sample-docs/` |
| Test files | `*.test.ts` | `chunker.test.ts`, `retrieve.test.ts` |
| Scripts | kebab-case | `ingest.ts`, `query.ts` |
| Config files | Standard names | `tsconfig.json`, `.env.example` |

---

## Multi-Database Projects

When a project supports multiple vector databases (e.g. Pinecone in production, ChromaDB in dev):

```
src/
  vectordb/
    client.ts             # Interface / abstract client
    pinecone.ts           # Pinecone implementation
    chroma.ts             # ChromaDB implementation
    pgvector.ts           # pgvector implementation
```

Use an interface so the rest of the codebase doesn't care which database is active:

```typescript
interface VectorStore {
  upsert(vectors: VectorRecord[]): Promise<void>;
  query(embedding: number[], options: QueryOptions): Promise<QueryResult[]>;
  delete(ids: string[]): Promise<void>;
}
```

Select the implementation via environment variable or config:

```typescript
function createVectorStore(): VectorStore {
  switch (process.env.VECTOR_DB) {
    case 'pinecone': return new PineconeStore();
    case 'pgvector': return new PgVectorStore();
    default: return new ChromaStore(); // local/dev default
  }
}
```

---

## pgvector-Specific Structure

When using pgvector with an existing PostgreSQL/Supabase project, the vector layer lives alongside your regular database code:

```
src/
  db/
    connection.ts         # Shared Postgres connection pool
    schema.sql            # Tables including vector columns
    migrations/
      001-add-vectors.sql # ALTER TABLE ... ADD COLUMN embedding vector(1536)
  vectordb/
    pgvector.ts           # pgvector-specific queries (cosine_distance, ivfflat index)
```

No need for a separate vector database service. The vectors live in the same database as your relational data.
