# Vector Database Stack Profile

This stack profile defines how ALL vector database and embedding projects in the AI-Factory must be built. It covers embedding generation, vector storage, similarity search, and RAG (Retrieval-Augmented Generation) pipelines. Projects use this stack when they need semantic search, knowledge retrieval, or AI-augmented content lookup.

Before writing any vector-db code, Claude must read this stack profile in full.

---

## Files in This Profile

| File | Read When |
|------|-----------|
| `coding_standards.md` | Writing any embedding, indexing, or retrieval code |
| `testing.md` | Writing retrieval tests or evaluating search quality |
| `project_structure.md` | Creating a new project or adding files |
| `pitfalls.md` | Debugging unexpected behaviour or reviewing code |

---

## Core Principles

1. **Match embedding model at index and query time.** The same model that produced the stored vectors must produce the query vector. Mixing models produces garbage results silently.

2. **Chunk semantically, not arbitrarily.** Split documents at paragraph, section, or sentence boundaries. Never split mid-sentence. Overlap chunks by 10-20% to preserve context at boundaries.

3. **Metadata is not optional.** Every vector must carry structured metadata (source, section, timestamp, document ID). Metadata filtering turns a slow brute-force search into a fast, scoped one.

4. **One collection/namespace per use case.** Don't dump everything into a single index. Separate by domain (e.g. `docs`, `support-tickets`, `product-catalog`). This keeps retrieval fast and results relevant.

5. **Retrieval quality is measurable.** If you can't measure recall@k against known query/document pairs, you're guessing. Build an eval set early and test against it continuously.

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Pinecone | Managed serverless vector search (zero ops, scales automatically) |
| pgvector | PostgreSQL extension for vector storage (works with Supabase, existing Postgres) |
| ChromaDB | Local/development vector storage (embedded, no server needed) |
| Qdrant | Self-hosted high-performance vector search (rich filtering, on-prem option) |
| OpenAI Embeddings | `text-embedding-3-small` (1536d) and `text-embedding-3-large` (3072d) |
| Voyage AI | High-quality embeddings for code and domain-specific text |
| Cohere | Embeddings and reranking models for improved retrieval |
| sentence-transformers | Local embedding models (no API dependency, runs on CPU/GPU) |
| LangChain / LlamaIndex | RAG orchestration frameworks (optional, adds complexity) |
| Cohere Rerank / cross-encoder | Second-stage reranking for better relevance after initial retrieval |

---

## When to Use This Stack

- **Semantic search** over documents, knowledge bases, or product catalogs
- **RAG pipelines** where an LLM needs context retrieved from a corpus
- **Recommendation systems** based on content similarity
- **Duplicate detection** across large document sets
- **Question answering** over private/proprietary data

If your search problem is keyword-based and exact-match (e.g. filtering by status, looking up by ID), use a traditional database. Vector search is for meaning, not keywords.

---

## Database Selection Guide

| Scenario | Recommended | Why |
|----------|-------------|-----|
| Managed, zero-ops, production | Pinecone (serverless) | No infrastructure to manage, scales to billions |
| Already using PostgreSQL/Supabase | pgvector | Lives alongside your relational data, one fewer service |
| Local development / prototyping | ChromaDB | Embedded, no server, pip install and go |
| Self-hosted, need advanced filtering | Qdrant | Rich payload filtering, on-prem, good performance |
| Massive scale, multi-tenant | Pinecone or Qdrant Cloud | Purpose-built for scale |

---

## Embedding Model Selection

| Model | Dimensions | Best For | Notes |
|-------|-----------|----------|-------|
| `text-embedding-3-small` | 1536 | General purpose, cost-sensitive | Good default. ~5x cheaper than large |
| `text-embedding-3-large` | 3072 | Maximum retrieval quality | Use when quality matters more than cost/speed |
| Voyage `voyage-3` | 1024 | Code search, technical docs | Strong on code and structured text |
| Cohere `embed-v3` | 1024 | Multilingual, with built-in reranking | Good for non-English corpora |
| `all-MiniLM-L6-v2` | 384 | Local, no API needed | Fast, runs on CPU, good for dev/testing |

**Default recommendation:** Start with `text-embedding-3-small`. Switch to `large` or a domain-specific model only if eval metrics justify it.

---

## RAG Pipeline Overview

```
Documents → Chunk → Embed → Store (vector DB)
                                    ↓
Query → Embed → Search → Retrieve top-k → [Rerank] → Augment prompt → LLM → Response
```

1. **Chunk** documents into semantically meaningful pieces (see `coding_standards.md`)
2. **Embed** each chunk using your chosen model
3. **Store** vectors with metadata in your vector database
4. **Query** by embedding the user's question with the same model
5. **Retrieve** top-k results (start with k=5, tune based on eval)
6. **Rerank** (optional) using Cohere or a cross-encoder for better relevance
7. **Augment** the LLM prompt with retrieved context
8. **Generate** the response

---

## Distance Metrics

| Metric | When to Use |
|--------|------------|
| Cosine similarity | Default. Works with normalized embeddings (OpenAI, most models) |
| Dot product | Unnormalized embeddings, or when magnitude carries meaning |
| Euclidean (L2) | Rarely. Use when absolute distance matters more than angle |

**Default:** Cosine similarity. OpenAI and most embedding models produce normalized vectors.
