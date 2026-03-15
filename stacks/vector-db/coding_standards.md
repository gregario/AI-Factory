# Coding Standards — Vector Database

## Chunking

**Chunk at semantic boundaries.**
Split on paragraphs, sections, headings, or sentence boundaries. Never split mid-sentence or mid-word.

```typescript
// Bad — arbitrary byte limit cuts mid-sentence
const chunks = splitByBytes(document, 500);

// Good — split at paragraph boundaries with overlap
const chunks = splitByParagraph(document, {
  maxTokens: 512,
  overlapTokens: 64,
});
```

**Include overlap between chunks.**
10-20% overlap preserves context at chunk boundaries. Without overlap, information that spans two chunks is lost to both.

```typescript
const CHUNK_SIZE = 512;    // tokens
const CHUNK_OVERLAP = 64;  // ~12% overlap
```

**Size chunks for your use case.**
- FAQ / short answers: 128-256 tokens
- Documentation / articles: 256-512 tokens
- Legal / technical documents: 512-1024 tokens
- Code files: by function or class, not by line count

**Attach metadata to every chunk.**
```typescript
type ChunkMetadata = {
  source: string;        // file path, URL, or document ID
  section: string;       // heading or section name
  chunkIndex: number;    // position within the document
  totalChunks: number;   // total chunks from this document
  createdAt: string;     // ISO timestamp
  documentId: string;    // parent document identifier
};
```

---

## Embedding

**Use a single embedding model per index.**
Never mix embeddings from different models in the same collection. The vector spaces are incompatible.

```typescript
// Good — one model, one index
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Bad — model choice varies at runtime
const model = config.useSmall ? 'text-embedding-3-small' : 'text-embedding-ada-002';
```

**Store the model name in index metadata.**
When you create an index, record which model produced its vectors. This prevents future confusion.

```typescript
const indexConfig = {
  name: 'product-docs',
  dimensions: 1536,
  metric: 'cosine',
  metadata: {
    embeddingModel: 'text-embedding-3-small',
    createdAt: new Date().toISOString(),
  },
};
```

**Batch embedding calls.**
Embedding APIs accept arrays. Don't make one API call per chunk.

```typescript
// Good — batch
const embeddings = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks.map(c => c.text),  // up to 2048 inputs per call
});

// Bad — one at a time
for (const chunk of chunks) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunk.text,
  });
}
```

---

## Querying and Retrieval

**Use the same model for queries and documents.**
```typescript
// The query embedding MUST use the same model as the stored documents
const queryEmbedding = await embed(query, EMBEDDING_MODEL);
const results = await index.query({ vector: queryEmbedding, topK: 5 });
```

**Filter with metadata before vector search.**
Metadata filters narrow the search space and improve both speed and relevance.

```typescript
// Good — scoped search
const results = await index.query({
  vector: queryEmbedding,
  topK: 10,
  filter: {
    source: 'api-docs',
    section: { $in: ['authentication', 'authorization'] },
  },
});

// Bad — search everything, filter after
const results = await index.query({ vector: queryEmbedding, topK: 1000 });
const filtered = results.filter(r => r.metadata.source === 'api-docs');
```

**Start with topK=5, tune from there.**
Too few results misses relevant content. Too many dilutes the context and wastes LLM tokens. Measure recall@k to find the sweet spot.

**Apply a similarity threshold.**
Don't blindly include all top-k results. Filter out low-similarity matches.

```typescript
const SIMILARITY_THRESHOLD = 0.7;
const relevant = results.filter(r => r.score >= SIMILARITY_THRESHOLD);
```

---

## Reranking

**Use reranking for high-stakes retrieval.**
Initial vector search is fast but approximate. A reranker (Cohere Rerank, cross-encoder) re-scores the top results for better precision.

```typescript
// Retrieve broadly, then rerank
const candidates = await index.query({ vector: queryEmbedding, topK: 20 });
const reranked = await cohere.rerank({
  model: 'rerank-english-v3.0',
  query: userQuery,
  documents: candidates.map(c => c.metadata.text),
  topN: 5,
});
```

**Over-fetch for reranking.**
Retrieve 3-4x your final topK, then rerank down. Retrieving topK=20 and reranking to 5 is a common pattern.

---

## Prompt Augmentation

**Format retrieved context clearly for the LLM.**
```typescript
function buildPrompt(query: string, contexts: RetrievedChunk[]): string {
  const contextBlock = contexts
    .map((c, i) => `[${i + 1}] ${c.metadata.source}\n${c.text}`)
    .join('\n\n');

  return `Answer the question based on the following context.
If the context doesn't contain the answer, say so.

Context:
${contextBlock}

Question: ${query}`;
}
```

**Tell the LLM when context is insufficient.**
Always include an instruction to acknowledge when retrieved context doesn't answer the question. This reduces hallucination.

**Include source attribution.**
Pass source metadata to the LLM and ask it to cite sources. This makes responses verifiable.

---

## Index Management

**Namespace by use case.**
```typescript
// Pinecone — use namespaces
await index.namespace('api-docs').upsert(vectors);
await index.namespace('support-tickets').upsert(vectors);

// Qdrant / ChromaDB — use separate collections
await qdrant.createCollection('api-docs', { vectors: { size: 1536, distance: 'Cosine' } });
await qdrant.createCollection('support-tickets', { vectors: { size: 1536, distance: 'Cosine' } });
```

**Use deterministic vector IDs.**
Derive IDs from content identity so upserts are idempotent.

```typescript
// Good — deterministic, idempotent
const id = createHash('sha256').update(`${docId}:${chunkIndex}`).digest('hex');

// Bad — random, creates duplicates on re-index
const id = crypto.randomUUID();
```

**Re-embed when source content changes.**
Stale embeddings produce wrong results. Track content hashes and re-embed when they change.

```typescript
const contentHash = createHash('sha256').update(chunk.text).digest('hex');
if (contentHash !== storedHash) {
  await reEmbed(chunk);
}
```
