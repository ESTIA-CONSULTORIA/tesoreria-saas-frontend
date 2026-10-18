FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Prueba publica (PP2): variables de COMPILACION; sin ellas la prueba queda apagada.
ARG VITE_PRUEBA_PUBLICA_ACTIVA
ARG VITE_PRUEBA_AVISO_URL
ARG VITE_TURNSTILE_SITEKEY
ENV VITE_PRUEBA_PUBLICA_ACTIVA=$VITE_PRUEBA_PUBLICA_ACTIVA
ENV VITE_PRUEBA_AVISO_URL=$VITE_PRUEBA_AVISO_URL
ENV VITE_TURNSTILE_SITEKEY=$VITE_TURNSTILE_SITEKEY
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
