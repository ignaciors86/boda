# Usa la imagen base de node
FROM node:18-alpine

# Crea y usa el directorio de la app
WORKDIR /app

# Copia los archivos
COPY package*.json ./
COPY . .

# Instala las dependencias
RUN npm install

# Construye la aplicación
RUN npm run build

# Instala serve
RUN npm install -g serve

# Expone el puerto
EXPOSE 3000

# Usa serve para iniciar la aplicación
CMD ["serve", "-s", "build", "-l", "3000"]
