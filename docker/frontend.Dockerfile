FROM node:26.13.0-bookworm-slim AS app-build
RUN npm install --global pnpm@12.8.1 \
    && mkdir -p /app \
    && chown node:node /app

WORKDIR /app
USER node
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN chmod -R u+rwX src public && pnpm build

FROM app-build AS development
LABEL org.opencontainers.image.title="Trạm Hỗ Trợ"
# Include newly added assets in Angular's watch, even before they enter the build graph.
ENV NG_BUILD_WATCH_ROOT=true
EXPOSE 4200
CMD ["node", "scripts/serve-docker.mjs"]

FROM caddy:2-alpine AS production
LABEL org.opencontainers.image.title="Trạm Hỗ Trợ"
COPY --from=app-build /app/dist/frontend/browser/ /srv/
