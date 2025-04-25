const express = require('express');
const path = require('path');
const ipRouter = require('./ip');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../../build')));

// Registrar el endpoint de IP
app.use('/api', ipRouter);

// Manejar todas las rutas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
}); 