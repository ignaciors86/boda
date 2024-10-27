# Construcción de la app
FROM node:18-alpine AS build

# Establece el directorio de trabajo
WORKDIR /app

# Copia el package.json y el package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Compila la aplicación
RUN npm run build

# Servidor Nginx
FROM nginx:stable-alpine

# Copia los archivos de construcción al servidor nginx
COPY --from=build /app/build /usr/share/nginx/html

# Expone el puerto de nginx
EXPOSE 80

# Inicia nginx
CMD ["nginx", "-g", "daemon off;"]
