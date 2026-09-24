# syntax=docker/dockerfile:1

# Builds the web frontend and serves it with nginx. Build from the repo root:
#   docker build -f frontend/Dockerfile -t library-platform/web .

ARG NODE_VERSION=24

# ---- build: compile the React app to static files ----
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Package files first, so dependencies are only reinstalled when they change.
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY services/book-service/package.json services/book-service/
COPY services/user-service/package.json services/user-service/
RUN npm ci --workspace=@library/web

COPY frontend frontend
RUN npm run build --workspace=@library/web

# ---- runtime: static files served by nginx, as a non-root user ----
FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
