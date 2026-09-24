# syntax=docker/dockerfile:1

# Builds any service in services/. Pick one with the SERVICE build argument:
#   docker build --build-arg SERVICE=book-service -t library-platform/book-service .

ARG NODE_VERSION=24
ARG SERVICE

# ---- build: install everything and compile TypeScript ----
FROM node:${NODE_VERSION}-alpine AS build
ARG SERVICE
WORKDIR /app

COPY . .
RUN npm ci --workspace=@library/${SERVICE} --include-workspace-root
RUN npm run build --workspace=@library/${SERVICE}

# ---- prod-deps: runtime dependencies only (no TypeScript, ESLint, type packages...) ----
FROM node:${NODE_VERSION}-alpine AS prod-deps
ARG SERVICE
WORKDIR /app

COPY . .
RUN npm ci --workspace=@library/${SERVICE} --omit=dev && npm cache clean --force

# ---- runtime: small image with just compiled code and production dependencies ----
FROM node:${NODE_VERSION}-alpine AS runtime
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/services/${SERVICE}/package.json ./services/${SERVICE}/package.json
COPY --from=build --chown=node:node /app/services/${SERVICE}/dist ./services/${SERVICE}/dist

WORKDIR /app/services/${SERVICE}

# Never run as root inside the container.
USER node

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/server.js"]
