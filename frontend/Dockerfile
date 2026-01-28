FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Check if next.config.ts exists, if not assume js or default
# For prod deployment:
RUN npm run build
CMD ["npm", "start"]
