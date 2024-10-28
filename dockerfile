# Construcción de la aplicación
FROM node:18-alpine AS build

# Establece el directorio de trabajo
WORKDIR /app

# Copia el package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos del proyecto
COPY . .

# Compila la aplicación en modo de producción
RUN npm run build

# Servidor para producción
FROM node:18-alpine AS production

# Instala el paquete 'serve' globalmente para servir los archivos estáticos
RUN npm install -g serve

# Copia los archivos de compilación desde la etapa de construcción
COPY --from=build /app/build /app/build

# Expone el puerto 3000
EXPOSE 3000

# Comando para servir la aplicación con 'serve' en la carpeta 'build'
CMD ["serve", "-s", "build", "-l", "3000"]
