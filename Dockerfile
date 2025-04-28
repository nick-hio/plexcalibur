# Bun Dockerfile https://bun.sh/guides/ecosystem/docker
# Docker Bun Guide https://docs.docker.com/guides/bun/
# See all image versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:canary-slim AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory (caching)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy node_modules from temp directory
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

# Copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/index.ts .
COPY --from=prerelease /usr/src/app/package.json .

# Run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "index.ts" ]