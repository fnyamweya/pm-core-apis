# syntax=docker/dockerfile:1.7

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
COPY . .
RUN pnpm build

FROM base AS prod
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["pnpm","start"]
