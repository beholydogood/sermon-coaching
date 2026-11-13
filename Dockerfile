# Node.js 20 LTS 슬림 베이스 이미지 사용
FROM node:20-slim AS builder

WORKDIR /app

# 패키지 매니저 파일 복사
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

# npm peer dependency 충돌 방지 (--legacy-peer-deps)
RUN npm install --legacy-peer-deps

# 전체 소스 복사
COPY . .

# 프론트엔드 프로덕션 빌드 (dist 생성)
RUN npm run build

# 실행용 경량 컨테이너
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm install -g tsx

# 빌드 결과물 및 서버 실행 파일 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["tsx", "server.ts"]
