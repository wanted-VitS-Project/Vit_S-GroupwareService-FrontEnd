# ===== build: Next.js 16 (Node 22) =====
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# ⚠️ NEXT_PUBLIC_* 는 런타임이 아니라 `next build` 시점에 번들에 박힌다.
#    → 값을 바꾸려면 재빌드(재배포)해야 한다. deploy.yml 이 --build-arg 로 주입.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

# ===== run: standalone (최소 런타임) =====
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Seoul
# standalone 서버(server.js)는 HOSTNAME/PORT 환경변수를 읽는다 — 전 인터페이스 바인딩
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# output:'standalone' 산출물 = server.js + 최소 node_modules. static 은 별도 복사 (이 레포엔 public 없음)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# 비루트 실행
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3000
CMD ["node", "server.js"]
