# Testing — Vector Database

## What to Test

Vector database projects have two distinct testing concerns:
1. **Functional correctness** — Does the code do what it should? (upsert, query, delete, metadata filtering)
2. **Retrieval quality** — Does the system return the right results for real queries?

Both matter. Functional tests catch regressions. Retrieval quality tests catch relevance drift.

---

## Retrieval Quality Testing

**Build an eval set early.**
Create a set of known query/document pairs where you know which documents should be returned.

```typescript
const evalSet: EvalCase[] = [
  {
    query: 'How do I authenticate with the API?',
    expectedDocIds: ['auth-guide', 'api-keys'],
    metadata: { section: 'authentication' },
  },
  {
    query: 'What are the rate limits?',
    expectedDocIds: ['rate-limits', 'api-overview'],
    metadata: { section: 'api' },
  },
];
```

**Measure recall@k.**
Recall@k = what fraction of expected documents appear in the top-k results.

```typescript
function recallAtK(expected: string[], retrieved: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = expected.filter(id => topK.includes(id));
  return hits.length / expected.length;
}

// Target: recall@5 >= 0.8 for your eval set
```

**Measure MRR (Mean Reciprocal Rank).**
MRR captures whether the best result appears near the top.

```typescript
function reciprocalRank(expected: string[], retrieved: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (expected.includes(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}
```

**Run eval tests on every chunking or model change.**
Changing chunk size, overlap, or embedding model can silently degrade retrieval. Eval tests catch this.

---

## Functional Testing

### Use a Test Index/Collection

**Never test against production data.**
Create a dedicated test index (or use ChromaDB in-memory) for functional tests.

```typescript
// ChromaDB — in-memory for tests
import { ChromaClient } from 'chromadb';

let client: ChromaClient;
let collection: Collection;

beforeAll(async () => {
  client = new ChromaClient(); // ephemeral by default
  collection = await client.createCollection({ name: 'test-collection' });
});

afterAll(async () => {
  await client.deleteCollection({ name: 'test-collection' });
});
```

```typescript
// Pinecone — use a test namespace, clean up after
const TEST_NAMESPACE = `test-${Date.now()}`;

afterAll(async () => {
  await index.namespace(TEST_NAMESPACE).deleteAll();
});
```

### Test Cases to Always Include

**Upsert and retrieve.**
```typescript
it('retrieves the most similar document', async () => {
  await upsertDocuments(testDocs);
  const results = await query('authentication guide', { topK: 3 });

  expect(results[0].metadata.docId).toBe('auth-guide');
  expect(results[0].score).toBeGreaterThan(0.7);
});
```

**Metadata filtering.**
```typescript
it('filters results by metadata', async () => {
  await upsertDocuments(testDocs); // mix of sections

  const results = await query('guide', {
    topK: 5,
    filter: { section: 'api' },
  });

  expect(results.every(r => r.metadata.section === 'api')).toBe(true);
});
```

**Idempotent upserts.**
```typescript
it('upserts are idempotent with deterministic IDs', async () => {
  await upsertDocuments(testDocs);
  await upsertDocuments(testDocs); // same data, same IDs

  const count = await collection.count();
  expect(count).toBe(testDocs.length); // no duplicates
});
```

**Empty results.**
```typescript
it('returns empty array for unrelated query', async () => {
  await upsertDocuments(testDocs); // docs about cooking

  const results = await query('quantum physics', {
    topK: 5,
    similarityThreshold: 0.7,
  });

  expect(results).toHaveLength(0);
});
```

**Deletion.**
```typescript
it('deletes vectors by ID', async () => {
  await upsertDocuments(testDocs);
  await deleteByDocId('auth-guide');

  const results = await query('authentication', { topK: 5 });
  expect(results.every(r => r.metadata.docId !== 'auth-guide')).toBe(true);
});
```

---

## Chunking Tests

**Test chunk boundaries.**
```typescript
it('splits at paragraph boundaries', () => {
  const doc = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
  const chunks = chunkDocument(doc, { maxTokens: 50 });

  // No chunk should contain a split mid-sentence
  chunks.forEach(chunk => {
    expect(chunk.text).toMatch(/[.!?]\s*$/); // ends at sentence boundary
  });
});
```

**Test overlap.**
```typescript
it('includes overlap between adjacent chunks', () => {
  const chunks = chunkDocument(longDocument, { maxTokens: 256, overlapTokens: 32 });

  for (let i = 1; i < chunks.length; i++) {
    const prevEnd = chunks[i - 1].text.slice(-100);
    const currStart = chunks[i].text.slice(0, 100);
    // Some text should appear in both chunks
    expect(prevEnd).toContain(currStart.split(' ').slice(0, 3).join(' '));
  }
});
```

**Test metadata attachment.**
```typescript
it('attaches correct metadata to each chunk', () => {
  const chunks = chunkDocument(doc, { source: 'readme.md', docId: 'doc-1' });

  chunks.forEach((chunk, i) => {
    expect(chunk.metadata.source).toBe('readme.md');
    expect(chunk.metadata.documentId).toBe('doc-1');
    expect(chunk.metadata.chunkIndex).toBe(i);
    expect(chunk.metadata.totalChunks).toBe(chunks.length);
  });
});
```

---

## End-to-End RAG Tests

**Test the full pipeline with known answers.**
```typescript
it('answers a question using retrieved context', async () => {
  // Seed the index with test documents
  await ingestDocuments(testCorpus);

  // Ask a question with a known answer in the corpus
  const response = await ragPipeline.ask('What is the default timeout?');

  expect(response.answer).toContain('5000');
  expect(response.sources).toContainEqual(
    expect.objectContaining({ docId: 'config-reference' })
  );
});
```

**Test with adversarial queries.**
```typescript
it('acknowledges when context is insufficient', async () => {
  const response = await ragPipeline.ask('What is the meaning of life?');

  // Should not hallucinate an answer from unrelated docs
  expect(response.answer).toMatch(/don't have.*information|not.*in.*context/i);
});
```

---

## Test Infrastructure

**Use ChromaDB for local/CI tests.**
ChromaDB runs in-memory with no server. This makes tests fast and CI-friendly.

**Use small embedding models in tests.**
Don't burn API credits on test runs. Use `all-MiniLM-L6-v2` locally or mock the embedding call with deterministic vectors.

```typescript
// Deterministic test embeddings — fast, no API call
function mockEmbed(text: string): number[] {
  const hash = createHash('md5').update(text).digest();
  return Array.from({ length: 384 }, (_, i) => (hash[i % hash.length] - 128) / 128);
}
```

**Tag slow tests.**
Retrieval quality tests that call real APIs should be tagged and excluded from fast test runs.

```typescript
describe.skipIf(process.env.FAST_TESTS)('retrieval quality', () => {
  // These call real embedding APIs
});
```
