# Etapa de construcción
FROM node:18-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos necesarios para instalar dependencias y construir la aplicación
COPY package*.json ./
RUN npm install

# Copiar el resto de los archivos del proyecto
COPY . .

# Compilar la aplicación en modo producción
RUN npm run build

# Etapa de producción usando nginx
FROM nginx:stable-alpine

# Copiar los archivos de construcción al directorio de nginx
COPY --from=build /app/build /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
