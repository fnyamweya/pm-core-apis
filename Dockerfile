FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

FROM deps AS build
ENV NODE_ENV=development
COPY tsconfig.json ./
COPY src ./src
# If you have other build inputs (e.g., nest-cli.json, prisma/, etc.), copy them here.
# COPY prisma ./prisma && pnpm prisma generate
RUN pnpm build

FROM base AS prod
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
EXPOSE 8080
# Adjust the entrypoint to your app's built file if different
CMD ["node","dist/main.js"]
