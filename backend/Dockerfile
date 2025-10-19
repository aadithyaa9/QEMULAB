FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN apk add --no-cache qemu-system-x86_64 qemu-img

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
