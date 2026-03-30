# Stage 1: Build the React application 
FROM node:18-alpine AS build 
WORKDIR /app 
COPY package*.json ./ 
RUN npm install 
COPY . . 
RUN npm run build 
 
# Stage 2: Serve the app with Nginx 
FROM nginx:alpine 
# คัดลอกไฟล์ที ่ build เสร็จแล้วไปไว้ในโฟลเดอร์ของ Nginx 
COPY --from=build /app/dist /usr/share/nginx/html
# หมายเหตุ: หากใช้ Create React App ให้เปลี่ยน /app/dist เป็น /app/build 
 
EXPOSE 80 
CMD ["nginx", "-g", "daemon off;"]
