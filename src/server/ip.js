const express = require('express');
const router = express.Router();
const os = require('os');

router.get('/ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  let ip = 'localhost';

  // Buscar la IP de la red local
  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        ip = interface.address;
      }
    });
  });

  res.json({ ip });
});

module.exports = router; 