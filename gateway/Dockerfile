# nginx built to run as a non-root user (the official image runs as root).
FROM nginxinc/nginx-unprivileged:1.30-alpine

# Apply security fixes released since the base image was built, and remove curl: nginx
# doesn't need it (the health check uses BusyBox wget), and every unneeded tool is one
# more thing an attacker could use. Then switch back to the non-root nginx user.
USER root
RUN apk upgrade --no-cache && apk del --no-cache curl
USER 101

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
