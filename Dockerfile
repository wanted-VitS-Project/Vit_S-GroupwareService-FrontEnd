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

# ===== run: next start =====
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Seoul
# next start 는 .next + node_modules + package.json + next.config 를 필요로 한다 (이 레포엔 public 없음)
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.ts ./next.config.ts
# 비루트 실행
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3000
# -H 0.0.0.0: 컨테이너 밖(ALB·호스트)에서 접근 가능하게 전 인터페이스 바인딩
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
