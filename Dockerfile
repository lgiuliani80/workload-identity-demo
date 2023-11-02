FROM node

EXPOSE 3001

WORKDIR /app
COPY . .
RUN npm install

ENTRYPOINT [ "node", "index.js" ]