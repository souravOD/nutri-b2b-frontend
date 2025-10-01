# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env for Next.js public vars
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_DB_ID
ARG NEXT_PUBLIC_APPWRITE_VENDORS_COL
ARG NEXT_PUBLIC_APPWRITE_USERPROFILES_COL

# Make them available during build
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=$NEXT_PUBLIC_APPWRITE_ENDPOINT
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=$NEXT_PUBLIC_APPWRITE_PROJECT_ID
ENV NEXT_PUBLIC_APPWRITE_DB_ID=$NEXT_PUBLIC_APPWRITE_DB_ID
ENV NEXT_PUBLIC_APPWRITE_VENDORS_COL=$NEXT_PUBLIC_APPWRITE_VENDORS_COL
ENV NEXT_PUBLIC_APPWRITE_USERPROFILES_COL=$NEXT_PUBLIC_APPWRITE_USERPROFILES_COL

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js (outputs .next)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Only prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD [ "npm", "run", "start" ]
