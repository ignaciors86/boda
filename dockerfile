# Construcción de la aplicación
FROM node:18-alpine AS build

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios para instalar dependencias y construir la aplicación
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Producción
FROM node:18-alpine

WORKDIR /app
COPY --from=build /app .

# Exponer el puerto que usará 'serve'
EXPOSE 3000

# Ejecutar el comando de inicio en modo producción
CMD ["npm", "start"]
