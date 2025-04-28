const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let broadcaster = null;
const receivers = new Map(); // Map para almacenar los receptores con sus IDs

wss.on('connection', (ws) => {
  console.log('Nueva conexión WebSocket');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Mensaje recibido:', data.type, 'receiverId:', data.receiverId);

      switch (data.type) {
        case 'broadcast':
          // El emisor se conecta
          broadcaster = ws;
          console.log('Emisor conectado');
          // Notificar a todos los receptores existentes
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
          // Un receptor solicita la transmisión
          if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            const receiverId = data.receiverId;
            receivers.set(receiverId, ws);
            console.log(`Receptor ${receiverId} conectado`);
            broadcaster.send(JSON.stringify({ 
              type: 'request_broadcast',
              receiverId 
            }));
          }
          break;

        case 'offer':
          // El emisor envía una oferta a un receptor específico
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
            }
          }
          break;

        case 'answer':
          // Un receptor envía una respuesta al emisor
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
          // Un candidato ICE es enviado
          if (data.isEmitter) {
            // Si viene del emisor, enviar al receptor específico
            const receiver = receivers.get(data.receiverId);
            if (receiver && receiver.readyState === WebSocket.OPEN) {
              console.log(`Enviando candidato ICE al receptor ${data.receiverId}`);
              receiver.send(JSON.stringify({ 
                type: 'candidate', 
                candidate: data.candidate,
                receiverId: data.receiverId
              }));
            }
          } else {
            // Si viene de un receptor, enviar al emisor
            if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
              console.log(`Enviando candidato ICE al emisor desde el receptor ${data.receiverId}`);
              broadcaster.send(JSON.stringify({ 
                type: 'candidate', 
                candidate: data.candidate,
                receiverId: data.receiverId
              }));
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });

  ws.on('close', () => {
    console.log('Conexión cerrada');
    if (ws === broadcaster) {
      // Si el emisor se desconecta, notificar a todos los receptores
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
      // Si un receptor se desconecta, eliminarlo del mapa
      for (const [id, receiver] of receivers.entries()) {
        if (receiver === ws) {
          receivers.delete(id);
          console.log(`Receptor ${id} desconectado`);
          break;
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);
}); 