# Common Pitfalls — Vector Database

This file documents mistakes that appear repeatedly in vector database and RAG projects.
Read this when debugging unexpected behaviour or reviewing code.

---

## Pitfall 1: Chunking Too Large

**What it looks like:**
Documents stored as entire pages or whole files. Chunks are 2000+ tokens.

**Why it breaks:**
Large chunks dilute the embedding. A 2000-token chunk about five different topics produces a vector that represents none of them well. Queries match weakly against everything instead of strongly against the right passage.

**Fix:**
Chunk at 256-512 tokens for most use cases. Each chunk should be about one idea or one section.

```typescript
// Bad — entire document as one vector
const embedding = await embed(entireDocument);

// Good — split into focused chunks
const chunks = chunkDocument(entireDocument, { maxTokens: 512, overlapTokens: 64 });
const embeddings = await embedBatch(chunks.map(c => c.text));
```

---

## Pitfall 2: Chunking Too Small

**What it looks like:**
Splitting at every sentence. Chunks are 20-50 tokens.

**Why it breaks:**
Individual sentences lack context. "It uses a 256-bit key" means nothing without knowing what "it" refers to. The embedding captures the fragment but not the meaning.

**Fix:**
Keep chunks large enough to be self-contained. Include surrounding context through overlap. If chunks are too small, increase the size or use a parent-child strategy (embed small chunks, retrieve the parent paragraph).

---

## Pitfall 3: Mixing Embedding Models

**What it looks like:**
Index was built with `text-embedding-ada-002`, but queries use `text-embedding-3-small`.

**Why it breaks:**
Different models produce vectors in different vector spaces. Cosine similarity between vectors from different models is meaningless. Results look random.

**Fix:**
Store the model name in index metadata. Validate at query time that the query model matches the index model.

```typescript
// At index creation
await createIndex({ metadata: { embeddingModel: 'text-embedding-3-small' } });

// At query time
const indexModel = await getIndexMetadata().embeddingModel;
if (indexModel !== QUERY_MODEL) {
  throw new Error(`Model mismatch: index=${indexModel}, query=${QUERY_MODEL}`);
}
```

---

## Pitfall 4: Not Filtering by Metadata

**What it looks like:**
Every query searches the entire index. Results include documents from unrelated domains.

**Why it breaks:**
A support ticket about billing matches a product doc about billing. Without metadata filtering, the user gets irrelevant results mixed in with relevant ones.

**Fix:**
Always scope queries with metadata filters when you know the domain.

```typescript
// Bad — search everything
const results = await query(embedding, { topK: 5 });

// Good — scoped to the right source
const results = await query(embedding, {
  topK: 5,
  filter: { source: 'product-docs', version: 'v3' },
});
```

---

## Pitfall 5: Stale Embeddings After Content Updates

**What it looks like:**
Documents were updated but embeddings weren't re-generated. Search returns outdated information.

**Why it breaks:**
The vector still represents the old content. The LLM generates an answer based on stale context, and the user gets wrong information confidently stated.

**Fix:**
Track content hashes. Re-embed when the hash changes. Use deterministic vector IDs so upserts overwrite stale vectors.

```typescript
const contentHash = createHash('sha256').update(newContent).digest('hex');
const storedHash = await getStoredHash(docId);

if (contentHash !== storedHash) {
  const chunks = chunkDocument(newContent);
  const embeddings = await embedBatch(chunks);
  await upsert(embeddings); // deterministic IDs overwrite old vectors
  await updateStoredHash(docId, contentHash);
}
```

---

## Pitfall 6: Dimension Mismatch

**What it looks like:**
```
Error: Vector dimension 1536 does not match index dimension 3072
```

**Why it breaks:**
The index was created for one embedding model's dimensions, but you're inserting vectors from a different model (or a different variant of the same model).

**Fix:**
Set dimensions at index creation time to match your model. Document the model-dimension pair.

| Model | Dimensions |
|-------|-----------|
| `text-embedding-3-small` | 1536 |
| `text-embedding-3-large` | 3072 |
| `text-embedding-ada-002` | 1536 |
| `voyage-3` | 1024 |
| `all-MiniLM-L6-v2` | 384 |

---

## Pitfall 7: No Similarity Threshold

**What it looks like:**
TopK=5 always returns exactly 5 results, even when the query is completely unrelated to the corpus.

**Why it breaks:**
Vector search always returns the closest vectors, even if they're far away. A query about "quantum physics" against a cooking corpus returns 5 cooking documents with low similarity scores. Without a threshold, these get passed to the LLM as "relevant context."

**Fix:**
Apply a minimum similarity threshold after retrieval.

```typescript
const SIMILARITY_THRESHOLD = 0.7;

const results = await query(embedding, { topK: 10 });
const relevant = results.filter(r => r.score >= SIMILARITY_THRESHOLD);

if (relevant.length === 0) {
  return { answer: "I don't have information about that.", sources: [] };
}
```

---

## Pitfall 8: Burning API Credits in Tests

**What it looks like:**
Every test run calls OpenAI's embedding API. CI runs 50 times a day. Monthly bill spikes.

**Fix:**
Use local models (`all-MiniLM-L6-v2`) or mock embeddings in tests. Reserve real API calls for eval tests that run on a schedule, not on every push.

```typescript
// Fast, deterministic, free
function mockEmbed(text: string): number[] {
  const hash = createHash('md5').update(text).digest();
  return Array.from({ length: 384 }, (_, i) => (hash[i % hash.length] - 128) / 128);
}
```

---

## Pitfall 9: One Giant Index for Everything

**What it looks like:**
All documents from all use cases in a single collection. Product docs, support tickets, blog posts, and internal wiki all in one index.

**Why it breaks:**
Cross-domain pollution. A query about "billing" returns a mix of customer support tickets, product documentation, and a blog post about billing best practices. Relevance drops because the index can't distinguish context.

**Fix:**
One collection/namespace per use case. Filter by namespace at query time.

---

## Pitfall 10: Ignoring Token Limits in Prompt Augmentation

**What it looks like:**
Retrieved context is concatenated and stuffed into the LLM prompt. With 10 long chunks, the prompt exceeds the model's context window or pushes out the actual instructions.

**Why it breaks:**
The LLM truncates or ignores content that exceeds its context. Important instructions at the beginning or end get lost.

**Fix:**
Budget your context window. Reserve tokens for system prompt, instructions, and response. Fill remaining space with retrieved chunks, most relevant first.

```typescript
const MAX_CONTEXT_TOKENS = 4000;
let tokenCount = 0;
const selectedChunks: Chunk[] = [];

for (const chunk of rankedChunks) {
  const chunkTokens = countTokens(chunk.text);
  if (tokenCount + chunkTokens > MAX_CONTEXT_TOKENS) break;
  selectedChunks.push(chunk);
  tokenCount += chunkTokens;
}
```

---

## Checklist Before Deploying

- [ ] Embedding model matches between ingestion and query code?
- [ ] Index dimensions match the embedding model?
- [ ] Chunks are sized appropriately (256-512 tokens for most cases)?
- [ ] Metadata is attached to every vector?
- [ ] Similarity threshold filters out irrelevant results?
- [ ] Content hash tracking prevents stale embeddings?
- [ ] Test index is separate from production?
- [ ] Eval set exists with recall@k measurements?
- [ ] API keys are in environment variables, not in code?
- [ ] Prompt context fits within the LLM's token budget?
