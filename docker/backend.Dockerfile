FROM node:26.13.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@12.16.1 \
    && mkdir -p /app /data/uploads /data/backups \
    && chown -R node:node /app /data

WORKDIR /app
USER node
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN chmod -R u+rwX src prisma/migrations && pnpm build

EXPOSE 3000
CMD ["node", "--watch", "--watch-preserve-output", "src/server.js"]
