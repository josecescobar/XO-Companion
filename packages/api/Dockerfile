# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root package files for shared package resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/api/package.json packages/api/

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copy API source and Prisma schema
COPY packages/api/ packages/api/

# Generate Prisma client
RUN cd packages/api && npx prisma generate

# Build NestJS
RUN cd packages/api && pnpm run build

# ── Stage 2: Production ──────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy workspace structure needed at runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=build /app/packages/api/prisma ./packages/api/prisma
COPY --from=build /app/packages/api/package.json ./packages/api/package.json
COPY --from=build /app/packages/api/start.sh ./packages/api/start.sh

# Create uploads directory
RUN mkdir -p /app/packages/api/uploads

# Non-root user
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
RUN chown -R appuser:appgroup /app
USER appuser

WORKDIR /app/packages/api

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "start.sh"]
