FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/ server/
COPY tools/skills.mjs tools/skills.mjs
COPY skills/ skills/
COPY web/ web/
USER node
ENV HOST=0.0.0.0 PORT=4399
EXPOSE 4399
CMD ["node","server/index.js"]
