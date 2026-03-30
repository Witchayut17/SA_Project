# Stage 1: Build 
FROM node:20-alpine AS build 
WORKDIR /app 

COPY package*.json ./ 

RUN npm ci --legacy-peer-deps 

COPY . . 
RUN npm run build 

FROM node:20-alpine 
WORKDIR /app 

COPY --from=build /app/.output ./.output 

EXPOSE 3000 

CMD ["node", ".output/server/index.mjs"]
