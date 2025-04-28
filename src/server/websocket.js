/**
 * Servidor WebSocket para la transmisión de audio en tiempo real
 * 
 * Este servidor maneja las conexiones WebSocket para la transmisión de audio
 * entre un emisor y múltiples receptores usando WebRTC.
 * 
 * Características:
 * - Soporte para múltiples receptores
 * - Compresión de mensajes
 * - Sistema de ping/pong para mantener conexiones vivas
 * - Limpieza automática de conexiones inactivas
 * - Manejo robusto de errores
 */

const WebSocket = require('ws');
const http = require('http');

// Configuración
const PING_INTERVAL = 30000; // 30 segundos
const PONG_TIMEOUT = 10000; // 10 segundos
const MAX_RECEIVERS = 100; // Límite máximo de receptores

// Inicialización del servidor HTTP y WebSocket
const server = http.createServer();
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

// Estado del servidor
let broadcaster = null;
const receivers = new Map();
const pingIntervals = new Map();

/**
 * Limpia los recursos asociados a una conexión WebSocket
 * @param {WebSocket} ws - Conexión WebSocket a limpiar
 */
const cleanupClient = (ws) => {
  const interval = pingIntervals.get(ws);
  if (interval) {
    clearInterval(interval);
    pingIntervals.delete(ws);
  }
};

/**
 * Verifica si se puede agregar un nuevo receptor
 * @returns {boolean} - true si se puede agregar un receptor, false si se alcanzó el límite
 */
const canAddReceiver = () => {
  return receivers.size < MAX_RECEIVERS;
};

// Manejo de conexiones WebSocket
wss.on('connection', (ws) => {
  console.log('Nueva conexión WebSocket');

  // Configurar ping/pong para mantener la conexión viva
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, PING_INTERVAL);

  pingIntervals.set(ws, interval);

  // Manejar pong
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Manejo de mensajes
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Mensaje recibido:', data.type, 'receiverId:', data.receiverId);

      switch (data.type) {
        case 'broadcast':
          if (broadcaster) {
            broadcaster.close(1000, 'Nuevo emisor conectado');
          }
          broadcaster = ws;
          console.log('Emisor conectado');
          receivers.forEach((receiver, id) => {
            if (receiver.readyState === WebSocket.OPEN) {
              receiver.send(JSON.stringify({ 
                type: 'broadcast',
                receiverId: id
              }));
            }
          });
          break;

        case 'request_broadcast':
          if (!canAddReceiver()) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Se ha alcanzado el límite máximo de receptores'
            }));
            ws.close(1000, 'Límite de receptores alcanzado');
            return;
          }

          if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            const receiverId = data.receiverId;
            receivers.set(receiverId, ws);
            console.log(`Receptor ${receiverId} conectado`);
            broadcaster.send(JSON.stringify({ 
              type: 'request_broadcast',
              receiverId 
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'No hay emisor disponible'
            }));
          }
          break;

        case 'offer':
          if (data.receiverId) {
            const receiver = receivers.get(data.receiverId);
            if (receiver && receiver.readyState === WebSocket.OPEN) {
              console.log(`Enviando oferta al receptor ${data.receiverId}`);
              receiver.send(JSON.stringify({ 
                type: 'offer', 
                offer: data.offer,
                receiverId: data.receiverId
              }));
            } else {
              console.error(`Receptor ${data.receiverId} no encontrado o no está conectado`);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Receptor no encontrado'
              }));
            }
          }
          break;

        case 'answer':
          if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            console.log(`Enviando respuesta al emisor desde el receptor ${data.receiverId}`);
            broadcaster.send(JSON.stringify({ 
              type: 'answer', 
              answer: data.answer,
              receiverId: data.receiverId
            }));
          }
          break;

        case 'candidate':
          if (data.isEmitter) {
            const receiver = receivers.get(data.receiverId);
            if (receiver && receiver.readyState === WebSocket.OPEN) {
              console.log(`Enviando candidato ICE al receptor ${data.receiverId}`);
              receiver.send(JSON.stringify({ 
                type: 'candidate', 
                candidate: data.candidate,
                receiverId: data.receiverId
              }));
            }
          } else if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            console.log(`Enviando candidato ICE al emisor desde el receptor ${data.receiverId}`);
            broadcaster.send(JSON.stringify({ 
              type: 'candidate', 
              candidate: data.candidate,
              receiverId: data.receiverId
            }));
          }
          break;
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error procesando mensaje'
      }));
    }
  });

  // Manejo de cierre de conexión
  ws.on('close', () => {
    console.log('Conexión cerrada');
    cleanupClient(ws);

    if (ws === broadcaster) {
      broadcaster = null;
      receivers.forEach((receiver, id) => {
        if (receiver.readyState === WebSocket.OPEN) {
          receiver.send(JSON.stringify({ 
            type: 'broadcaster_disconnected',
            receiverId: id
          }));
        }
      });
      receivers.clear();
    } else {
      for (const [id, receiver] of receivers.entries()) {
        if (receiver === ws) {
          receivers.delete(id);
          console.log(`Receptor ${id} desconectado`);
          break;
        }
      }
    }
  });

  // Manejo de errores
  ws.on('error', (error) => {
    console.error('Error en la conexión WebSocket:', error);
    cleanupClient(ws);
  });
});

// Limpiar conexiones inactivas
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Cerrando conexión inactiva');
      cleanupClient(ws);
      ws.terminate();
      return;
    }
    ws.isAlive = false;
  });
}, PONG_TIMEOUT);

// Manejar errores del servidor
server.on('error', (error) => {
  console.error('Error en el servidor:', error);
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);
}); 