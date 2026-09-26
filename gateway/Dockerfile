# nginx built to run as a non-root user (the official image runs as root).
FROM nginxinc/nginx-unprivileged:1.30-alpine

# Apply security fixes released since the base image was built, and remove curl: nginx
# doesn't need it (the health check uses BusyBox wget), and every unneeded tool is one
# more thing an attacker could use. Then switch back to the non-root nginx user.
USER root
RUN apk upgrade --no-cache && apk del --no-cache curl
USER 101

# The config is a template: at startup the image fills in the ${...} placeholders from
# environment variables and writes the result to /tmp/nginx.conf (/tmp stays writable
# even when the rest of the filesystem is read-only, as in Kubernetes).
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp \
  # Only these variables are substituted; nginx's own $variables are left alone.
  NGINX_ENVSUBST_FILTER="^(GATEWAY_|NGINX_LOCAL_RESOLVERS)" \
  # Read the container's DNS server from /etc/resolv.conf into NGINX_LOCAL_RESOLVERS.
  NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
  # Defaults for Docker Compose; Kubernetes overrides them (see the Helm chart).
  GATEWAY_BOOK_SERVICE_URL=http://book-service:8080 \
  GATEWAY_USER_SERVICE_URL=http://user-service:8081 \
  GATEWAY_WEB_URL=http://web:8080 \
  # Proxies allowed to report the client's IP. In Compose the gateway is the entry
  # point, so only loopback is trusted; Kubernetes sets the Ingress controller's range.
  GATEWAY_TRUSTED_PROXIES=127.0.0.1/32

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-c", "/tmp/nginx.conf", "-g", "daemon off;"]
