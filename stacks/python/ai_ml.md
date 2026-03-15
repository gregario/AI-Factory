# AI/ML Patterns — Python

This file covers patterns for LLM integration, embeddings, RAG pipelines, fine-tuning workflows, and model serving. Read this when building any AI/ML feature.

---

## LLM Integration

### Anthropic SDK

```python
import anthropic

client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY env var

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain mash temperature effects on beer body."}
    ],
)
print(message.content[0].text)
```

**Async client for production services:**
```python
client = anthropic.AsyncAnthropic()

async def generate_description(prompt: str) -> str:
    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
```

**Streaming for long responses:**
```python
async with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=2048,
    messages=[{"role": "user", "content": prompt}],
) as stream:
    async for text in stream.text_stream:
        print(text, end="", flush=True)
```

### OpenAI SDK

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()  # uses OPENAI_API_KEY env var

async def chat(prompt: str) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content or ""
```

### Common Patterns

**Structured output with Pydantic.**
Both SDKs support structured output. Parse LLM responses into typed models:
```python
from pydantic import BaseModel

class BeerReview(BaseModel):
    aroma_score: float
    flavour_score: float
    notes: str
    recommended: bool

# Anthropic — use tool_use to get structured JSON
message = await client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=512,
    tools=[{
        "name": "submit_review",
        "description": "Submit a structured beer review",
        "input_schema": BeerReview.model_json_schema(),
    }],
    tool_choice={"type": "tool", "name": "submit_review"},
    messages=[{"role": "user", "content": f"Review this beer: {description}"}],
)
review = BeerReview.model_validate_json(message.content[0].input)

# OpenAI — use response_format
response = await client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[{"role": "user", "content": f"Review this beer: {description}"}],
    response_format=BeerReview,
)
review = response.choices[0].message.parsed
```

**Retry with exponential backoff.**
LLM APIs have rate limits. Always wrap calls with retry logic:
```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import anthropic

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError)),
)
async def generate_with_retry(prompt: str) -> str:
    return await generate_description(prompt)
```

**Cost tracking.**
Log token usage on every call:
```python
log.info(
    "llm_call",
    model=message.model,
    input_tokens=message.usage.input_tokens,
    output_tokens=message.usage.output_tokens,
    cost_usd=estimate_cost(message.usage),
)
```

---

## Embeddings

**Use embeddings for semantic search, similarity, and clustering.**

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def embed(texts: list[str]) -> list[list[float]]:
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]
```

**Batch embedding for large datasets:**
```python
import asyncio

BATCH_SIZE = 100

async def embed_all(texts: list[str]) -> list[list[float]]:
    embeddings: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_embeddings = await embed(batch)
        embeddings.extend(batch_embeddings)
    return embeddings
```

**Local embeddings with sentence-transformers (no API cost):**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_local(texts: list[str]) -> list[list[float]]:
    return model.encode(texts, normalize_embeddings=True).tolist()
```

**Storage options:**
- Small datasets (< 100K vectors): NumPy arrays + cosine similarity
- Medium datasets: ChromaDB (local, no server needed), SQLite with `sqlite-vec`
- Large datasets: pgvector (PostgreSQL), Pinecone, Qdrant, Weaviate

---

## RAG Pipelines

Retrieval-Augmented Generation: embed documents, retrieve relevant chunks, inject them into the LLM prompt.

### Architecture

```
Documents → Chunk → Embed → Store (vector DB)
                                    ↓
Query → Embed → Search (vector DB) → Top-K chunks → LLM prompt → Response
```

### Chunking

**Chunk by semantic boundaries, not arbitrary character counts.**
```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class Chunk:
    text: str
    source: str
    page: int | None = None
    metadata: dict[str, str] | None = None

def chunk_document(
    text: str,
    source: str,
    max_chars: int = 1000,
    overlap: int = 200,
) -> list[Chunk]:
    """Split text into overlapping chunks at paragraph boundaries."""
    paragraphs = text.split("\n\n")
    chunks: list[Chunk] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(Chunk(text=current.strip(), source=source))
            # Keep overlap from the end of the previous chunk
            current = current[-overlap:] if len(current) > overlap else current
        current += "\n\n" + para

    if current.strip():
        chunks.append(Chunk(text=current.strip(), source=source))

    return chunks
```

**Chunking guidelines:**
- 500-1500 characters per chunk is a good starting range
- Overlap 10-20% to preserve context across boundaries
- Respect document structure: split on headings, paragraphs, sections
- Include metadata (source, page, section) for attribution

### Retrieval

```python
import numpy as np

def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))

async def retrieve(
    query: str,
    chunks: list[Chunk],
    chunk_embeddings: list[list[float]],
    top_k: int = 5,
) -> list[Chunk]:
    query_embedding = (await embed([query]))[0]
    scores = [cosine_similarity(query_embedding, ce) for ce in chunk_embeddings]
    ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in ranked[:top_k]]
```

### Prompt Construction

```python
async def rag_query(query: str, context_chunks: list[Chunk]) -> str:
    context = "\n\n---\n\n".join(
        f"[Source: {c.source}]\n{c.text}" for c in context_chunks
    )

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system="Answer based on the provided context. Cite sources. If the context doesn't contain the answer, say so.",
        messages=[{
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}",
        }],
    )
    return message.content[0].text
```

**RAG guidelines:**
- Always include source attribution in prompts and responses
- Set a relevance threshold — don't inject low-similarity chunks
- Rerank results when possible (cross-encoder reranking improves quality)
- Test with known question-answer pairs to measure retrieval quality
- Monitor: log which chunks were retrieved and whether the answer used them

---

## Fine-Tuning Workflows

### When to Fine-Tune

Fine-tuning is expensive and hard to iterate on. Use it only when:
- Few-shot prompting doesn't achieve the required quality
- You need consistent formatting or style that prompting can't enforce
- Latency matters and you want a smaller, specialized model
- You have high-quality training data (hundreds to thousands of examples)

**Try these first (in order):**
1. Better prompts (system prompt, examples, constraints)
2. Few-shot examples in the prompt
3. RAG for knowledge-intensive tasks
4. Fine-tuning as a last resort

### Data Preparation

```python
from pydantic import BaseModel

class TrainingExample(BaseModel):
    """One training example in the fine-tuning dataset."""
    messages: list[dict[str, str]]

def prepare_dataset(examples: list[TrainingExample], output_path: str) -> None:
    """Write examples as JSONL for fine-tuning upload."""
    from pathlib import Path
    import json

    path = Path(output_path)
    with path.open("w") as f:
        for example in examples:
            f.write(json.dumps(example.model_dump()) + "\n")
```

**Data quality checklist:**
- Minimum 50-100 examples for basic tasks, 500+ for complex ones
- Examples should be diverse — cover edge cases, not just the happy path
- Validate that examples are correct before training (garbage in, garbage out)
- Split into train/validation sets (80/20)
- Remove duplicates and near-duplicates

### OpenAI Fine-Tuning

```python
from openai import OpenAI

client = OpenAI()

# Upload training file
file = client.files.create(file=open("train.jsonl", "rb"), purpose="fine-tune")

# Start fine-tuning
job = client.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-4o-mini-2024-07-18",
    hyperparameters={"n_epochs": 3},
)

# Monitor progress
job = client.fine_tuning.jobs.retrieve(job.id)
print(f"Status: {job.status}, Model: {job.fine_tuned_model}")
```

### Evaluation

**Always evaluate before and after fine-tuning:**
```python
async def evaluate_model(
    model: str,
    test_cases: list[tuple[str, str]],
) -> dict[str, float]:
    correct = 0
    for prompt, expected in test_cases:
        response = await generate(model, prompt)
        if matches(response, expected):
            correct += 1
    return {
        "accuracy": correct / len(test_cases),
        "total": len(test_cases),
    }
```

---

## Model Serving

### FastAPI + Async Pattern

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import anthropic
from fastapi import FastAPI
from pydantic import BaseModel

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: create client once
    app.state.llm_client = anthropic.AsyncAnthropic()
    yield
    # Shutdown: cleanup

app = FastAPI(lifespan=lifespan)

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 512

class GenerateResponse(BaseModel):
    text: str
    input_tokens: int
    output_tokens: int

@app.post("/generate")
async def generate(request: GenerateRequest) -> GenerateResponse:
    message = await app.state.llm_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=request.max_tokens,
        messages=[{"role": "user", "content": request.prompt}],
    )
    return GenerateResponse(
        text=message.content[0].text,
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
    )
```

### Caching

**Cache LLM responses for identical inputs to reduce cost and latency:**
```python
import hashlib
import json
from functools import lru_cache

def cache_key(model: str, messages: list[dict], **kwargs: object) -> str:
    raw = json.dumps({"model": model, "messages": messages, **kwargs}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()

# For simple cases, use an in-memory dict or Redis
_response_cache: dict[str, str] = {}

async def cached_generate(prompt: str) -> str:
    key = cache_key("claude-sonnet-4-20250514", [{"role": "user", "content": prompt}])
    if key in _response_cache:
        return _response_cache[key]
    result = await generate_description(prompt)
    _response_cache[key] = result
    return result
```

### Production Checklist

- [ ] Rate limiting on API endpoints (don't let users drain your LLM budget)
- [ ] Token usage logging on every LLM call
- [ ] Cost alerts / budget caps per day/month
- [ ] Retry with backoff for transient API failures
- [ ] Timeouts on LLM calls (30-120s depending on task)
- [ ] Input validation and sanitisation (max prompt length, content filtering)
- [ ] Response validation (check that structured output parses correctly)
- [ ] Graceful degradation when the LLM API is down
- [ ] Caching for deterministic / repeated queries

---

## Configuration Pattern

**Use Pydantic `BaseSettings` for all AI/ML config:**
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class AISettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_")

    anthropic_api_key: str = ""
    openai_api_key: str = ""
    default_model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 1024
    embedding_model: str = "text-embedding-3-small"
    vector_db_path: str = "./data/vectors"
    max_retries: int = 3
    timeout_seconds: float = 60.0
```

**Never hardcode API keys. Never commit `.env` files.**
Keys come from environment variables or a secrets manager. The `.env` file is gitignored and used only for local development.

---

## Dependencies

Typical AI/ML dependencies for `pyproject.toml`:

```toml
[project]
dependencies = [
    "anthropic>=0.40",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "structlog>=24.0",
    "tenacity>=9.0",
]

[project.optional-dependencies]
openai = ["openai>=1.50"]
embeddings = ["sentence-transformers>=3.0", "numpy>=2.0"]
vectordb = ["chromadb>=0.5"]
serving = ["fastapi>=0.115", "uvicorn>=0.32"]
```

Use optional dependency groups to keep the base install lean. A project that only uses Anthropic shouldn't pull in PyTorch via sentence-transformers.
