# Docker -- Containerization Patterns

## When to Use Docker

Use Docker when:
- Deploying a backend service to Railway or any container host.
- The project needs local dev dependencies (Postgres, Redis, etc.).
- You need reproducible builds across environments.
- The deploy target expects a container image.

Skip Docker when:
- Deploying a static frontend to Cloudflare Pages (it handles the build).
- Publishing an npm package (no runtime to containerize).
- The project has no external dependencies and runs on Node.js directly.

---

## Multi-Stage Builds

Every production Dockerfile uses multi-stage builds. No exceptions.

### Node.js Backend

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app

# Don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Why multi-stage:**
- Builder stage has devDependencies, TypeScript compiler, source code.
- Runner stage has only compiled JS and production dependencies.
- Result: 100-200MB instead of 800MB+.

### Static Frontend (nginx)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf -- SPA routing
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Use this pattern when you need to self-host a frontend (not on Cloudflare Pages). Final image is under 30MB.

---

## Docker Compose for Local Development

### Basic Setup (App + Postgres)

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/myapp_dev
      NODE_ENV: development
    depends_on:
      - db
    volumes:
      - ./src:/app/src  # Hot reload in dev

volumes:
  pgdata:
```

### With Redis

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/myapp_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```

### Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app

# Rebuild after Dockerfile changes
docker compose up -d --build

# Stop and remove containers (keep volumes)
docker compose down

# Stop and remove everything including data
docker compose down -v

# Run a one-off command
docker compose exec app npm run migrate
```

---

## Image Optimization

### Size Targets

| Image Type | Target Size |
|-----------|-------------|
| Node.js backend (multi-stage) | Under 200MB |
| Static frontend (nginx) | Under 30MB |
| Full-stack (backend + frontend) | Under 250MB |

### Optimization Techniques

**Use Alpine base images.**
`node:22-alpine` is ~50MB vs `node:22` at ~350MB.

**Install production dependencies only in the runner stage.**
```dockerfile
# In the runner stage
RUN npm ci --omit=dev
```

**Copy only what's needed.**
```dockerfile
# Bad -- copies everything including tests, docs, .git
COPY . .

# Good -- copies only what the build needs
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
```

**Clean up in the same layer.**
```dockerfile
# If you must install build tools, clean up in the same RUN
RUN apk add --no-cache python3 make g++ \
    && npm ci \
    && apk del python3 make g++
```

**Check what's bloating the image.**
```bash
# See layer sizes
docker history my-app

# Interactive exploration
docker run --rm -it my-app sh
du -sh /app/node_modules/*/ | sort -rh | head -20
```

---

## Security

**Don't run as root.**
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

**Don't store secrets in the image.**
```dockerfile
# Bad -- secret baked into the image
ENV API_KEY=sk-1234567890

# Good -- passed at runtime
# docker run -e API_KEY=sk-1234567890 my-app
```

**Use `.dockerignore` to exclude sensitive files.**
```
.env
*.pem
*.key
.git
```

**Pin base image versions.**
```dockerfile
# Good -- specific version
FROM node:22.12-alpine

# Acceptable -- major version
FROM node:22-alpine

# Bad -- unpredictable
FROM node:latest
```

---

## Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

- `--start-period`: Grace period for the app to start before health checks begin.
- `--interval`: How often to check.
- `--retries`: How many failures before marking unhealthy.

The health check endpoint should verify the app is actually working, not just that the process is running. Check database connectivity if the app depends on it:

```typescript
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

---

## Graceful Shutdown in Docker

Node.js must handle SIGTERM for clean container stops:

```typescript
const server = app.listen(parseInt(process.env.PORT ?? '3000'));

function shutdown() {
  console.log('Shutting down gracefully...');
  server.close(() => {
    pool.end().then(() => {
      console.log('Shutdown complete');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

**Critical:** Use exec form for CMD so Node.js receives signals directly:
```dockerfile
# Exec form -- Node.js is PID 1, receives SIGTERM
CMD ["node", "dist/index.js"]

# Shell form -- /bin/sh is PID 1, SIGTERM goes to shell
CMD node dist/index.js
```

---

## Common Docker Commands

```bash
# Build with a tag
docker build -t my-app:latest .

# Run with env vars and port mapping
docker run --rm -p 3000:3000 -e NODE_ENV=production my-app

# Build for a specific platform (e.g., deploying from Mac to Linux)
docker build --platform linux/amd64 -t my-app .

# Prune unused images and containers
docker system prune -f

# Check image size
docker images my-app --format "{{.Size}}"
```
