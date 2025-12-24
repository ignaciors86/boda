import React, { useEffect, useRef, useState } from 'react';
import './SimpleWebRTCTest.scss';

// URL dinámica de Strapi según entorno
const STRAPI_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:1337'
    : 'https://boda-strapi-production.up.railway.app';

const SIGNAL_SERVER_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    // ? 'ws://localhost:8080'
    ? 'wss://boda-radio-production.up.railway.app'
    : 'wss://boda-radio-production.up.railway.app';

const SimpleWebRTCTest = ({ isEmitting }) => {
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('Inicializando...');
  const [isPlaying, setIsPlaying] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const receiverIdRef = useRef(null);
  const peersRef = useRef(new Map());

  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  // Dibuja el ecualizador en el canvas (solo logs en receptor)
  const drawEq = (analyser, label = '') => {
    if (!canvasRef.current || !analyser) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Dimensiones fijas del canvas
    canvas.width = 350;
    canvas.height = 60;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    try {
      analyser.getByteTimeDomainData(dataArray);
    } catch (error) {
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Estilo de la línea principal
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    // Factor de amplificación para hacer la onda más visible
    const amplificationFactor = 2.5;
    
    // Dibujar la forma de onda
    for (let i = 0; i < bufferLength; i++) {
      // Normalizar y amplificar el valor
      const normalizedValue = (dataArray[i] / 128.0) - 1; // Convertir a rango -1 a 1
      const amplifiedValue = normalizedValue * amplificationFactor;
      // Limitar el valor amplificado al rango -1 a 1
      const clampedValue = Math.max(-1, Math.min(1, amplifiedValue));
      
      // Calcular la posición Y con más rango de movimiento
      const y = (clampedValue * canvas.height / 2.5) + (canvas.height / 2);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Usar curvas bezier para suavizar la línea
        const prevX = x - sliceWidth;
        const prevY = i > 0 ? (((dataArray[i-1] / 128.0) - 1) * amplificationFactor * canvas.height / 2.5) + (canvas.height / 2) : y;
        const cpX = prevX + (x - prevX) / 2;
        ctx.quadraticCurveTo(cpX, prevY, x, y);
      }
      
      x += sliceWidth;
    }
    
    // Cerrar el path y dibujarlo
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Efecto de brillo más pronunciado
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Línea central de referencia
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  // Loop de animación del ecualizador
  const animateEq = (label) => {
    if (analyserRef.current) {
      drawEq(analyserRef.current, label);
      animationRef.current = requestAnimationFrame(() => animateEq(label));
    } else {
      console.log(`[${label}] No se puede animar: analyser no disponible`);
    }
  };

  // Inicializa el ecualizador para el emisor
  const setupLocalAnalyser = (stream) => {
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('Error al cerrar AudioContext anterior:', e);
      }
    }
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyserRef.current = analyser;
    audioContextRef.current = audioCtx;
    animateEq('EMISOR');
  };

  // Inicializa el ecualizador para el receptor
  const setupRemoteAnalyser = async (audioElem) => {
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('Error al cerrar AudioContext anterior:', e);
      }
    }
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    
    // Configuración ajustada para mayor sensibilidad
    analyser.fftSize = 512; // Aumentado para más detalle
    analyser.smoothingTimeConstant = 0.6; // Aumentado para más suavidad
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    
    const source = audioCtx.createMediaElementSource(audioElem);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyserRef.current = analyser;
    audioContextRef.current = audioCtx;
    
    animateEq('RECEPTOR');
  };

  const sendSignal = (data) => {
    wsRef.current && wsRef.current.readyState === 1 && wsRef.current.send(JSON.stringify(data));
  };

  // Solo para el emisor: primero pide el stream, luego conecta señalización y crea la oferta
  const handlePlay = async () => {
    setButtonVisible(false);
    setIsPlaying(true);
    if (isEmitting) {
      setStatus('Esperando permiso para capturar audio del sistema...');
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            suppressLocalAudioPlayback: false,
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 44100
          }
        });
        stream.getVideoTracks().forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });
        if (stream.getAudioTracks().length === 0) {
          setStatus('No se detectó audio del sistema.');
          setButtonVisible(true);
          setIsPlaying(false);
          return;
        }
        localStreamRef.current = stream;
        setStatus('Audio del sistema capturado. Conectando señalización...');
        setupLocalAnalyser(stream);
        startWebRTC();
      } catch (err) {
        setStatus('Error al capturar el audio del sistema: ' + err.message);
        setButtonVisible(true);
        setIsPlaying(false);
      }
    } else {
      startWebRTC();
    }
  };

  const handleStop = () => {
    setButtonVisible(true);
    setIsPlaying(false);
    setIsConnected(false);
    
    // Limpiar WebRTC
    if (isEmitting) {
      // Si es emisor, limpiar todas las conexiones
      peersRef.current.forEach((peer, receiverId) => {
        if (peer) {
          console.log(`[EMISOR] Cerrando conexión con receptor ${receiverId}`);
          peer.close();
        }
      });
      peersRef.current.clear();
    } else {
      // Si es receptor, limpiar solo su conexión
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    }
    
    // Limpiar WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Limpiar animación
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Limpiar AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('Error al cerrar AudioContext:', e);
      }
      audioContextRef.current = null;
    }
    
    // Limpiar streams
    if (isEmitting && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (!isEmitting && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    setStatus('Desconectado');
  };

  const createPeer = async (isOfferer, receiverId = null) => {
    try {
      const peer = new window.RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.stunprotocol.org:3478' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all',
        sdpSemantics: 'unified-plan'
      });

      // Configurar timeouts y reintentos
      peer.iceConnectionTimeout = 30000; // 30 segundos
      
      // Añadir más logs para diagnóstico ICE
      peer.onicegatheringstatechange = () => {
        console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] ICE gathering state:`, peer.iceGatheringState);
      };

      peer.onsignalingstatechange = () => {
        console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] Signaling state:`, peer.signalingState);
      };

      if (isOfferer) {
        peersRef.current.set(receiverId, peer);
      } else {
        peerRef.current = peer;
      }

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] ICE candidate encontrado:`, event.candidate.type, event.candidate.protocol, event.candidate.address);
          // Filtrar candidatos locales
          if (event.candidate.type === 'host' && 
              (event.candidate.address.includes('.local') || 
               event.candidate.address === '127.0.0.1')) {
            console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] Ignorando candidato local`);
            return;
          }
          // Añadir más información de diagnóstico
          console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] Enviando candidato ICE:`, {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port
          });
          sendSignal({ 
            type: 'candidate', 
            candidate: event.candidate,
            isEmitter: isEmitting,
            receiverId: isEmitting ? receiverId : receiverIdRef.current
          });
        } else {
          console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] No hay más ICE candidates`);
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] ICE connection state:`, peer.iceConnectionState);
        if (peer.iceConnectionState === 'failed') {
          console.error(`Conexión ICE fallida con receptor ${receiverId}`);
          if (isEmitting) {
            // Si es emisor, intentar reconectar
            if (peersRef.current.has(receiverId)) {
              const failedPeer = peersRef.current.get(receiverId);
              peersRef.current.delete(receiverId);
              failedPeer.close();
              
              // Aumentar el tiempo de espera para reconexión
              setTimeout(() => {
                console.log(`[EMISOR] Intentando reconectar con receptor ${receiverId}`);
                createPeer(true, receiverId);
              }, 5000); // Aumentado a 5 segundos
            }
          } else {
            handleStop();
          }
        } else if (peer.iceConnectionState === 'disconnected') {
          console.warn(`Conexión ICE desconectada con receptor ${receiverId}`);
          // Esperar un poco antes de considerar la desconexión como fallida
          setTimeout(() => {
            if (peer.iceConnectionState === 'disconnected') {
              console.error(`Conexión ICE permanece desconectada con receptor ${receiverId}`);
              if (isEmitting) {
                if (peersRef.current.has(receiverId)) {
                  const failedPeer = peersRef.current.get(receiverId);
                  peersRef.current.delete(receiverId);
                  failedPeer.close();
                  setTimeout(() => {
                    console.log(`[EMISOR] Intentando reconectar con receptor ${receiverId}`);
                    createPeer(true, receiverId);
                  }, 5000);
                }
              } else {
                handleStop();
              }
            }
          }, 10000); // Esperar 10 segundos antes de considerar la desconexión como fallida
        } else if (peer.iceConnectionState === 'connected') {
          setIsConnected(true);
          setStatus('Conexión establecida');
        }
      };

      if (!isEmitting) {
        peer.ontrack = (event) => {
          console.log(`[RECEPTOR] Track recibido:`, event.track.kind);
          if (remoteAudioRef.current) {
            console.log('[RECEPTOR] Configurando stream de audio...');
            const stream = event.streams[0];
            console.log('[RECEPTOR] Stream recibido:', stream);
            console.log('[RECEPTOR] Tracks en el stream:', stream.getTracks().map(t => t.kind));
            
            // Asegurarse de que el stream se asigna correctamente
            remoteAudioRef.current.srcObject = stream;
            const tracks = stream.getAudioTracks();
            console.log(`[RECEPTOR] Tracks de audio recibidos:`, tracks.length);
            
            // Configurar eventos del elemento de audio
            remoteAudioRef.current.onloadedmetadata = () => {
              console.log('[RECEPTOR] Metadata del audio cargada');
              // Intentar reproducir automáticamente en desktop
              if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                const playPromise = remoteAudioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    console.error('[RECEPTOR] Error al reproducir audio:', error);
                    if (error.name === 'NotAllowedError') {
                      setStatus('Por favor, toca la pantalla para reproducir el audio');
                    }
                  });
                }
              }
            };
            
            remoteAudioRef.current.oncanplay = () => {
              console.log('[RECEPTOR] Audio listo para reproducir');
              // Verificar si hay tracks activos
              const activeTracks = stream.getAudioTracks().filter(t => t.readyState === 'live');
              if (activeTracks.length === 0) {
                console.warn('[RECEPTOR] No hay tracks de audio activos');
                setStatus('No se detecta audio activo');
              } else {
                console.log(`[RECEPTOR] Tracks activos: ${activeTracks.length}`);
                setupRemoteAnalyser(remoteAudioRef.current);
                setIsConnected(true);
                setStatus('Conexión establecida. Reproduciendo audio...');
              }
            };
            
            remoteAudioRef.current.onplay = () => {
              console.log('[RECEPTOR] Audio empezó a reproducirse');
              setIsConnected(true);
              setStatus('Conexión establecida. Reproduciendo audio...');
            };
            
            remoteAudioRef.current.onerror = (error) => {
              console.error('[RECEPTOR] Error en el elemento de audio:', error);
              setStatus('Error al reproducir audio');
            };
            
            // Verificar el estado del stream periódicamente
            const checkStreamInterval = setInterval(() => {
              if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
                const activeTracks = remoteAudioRef.current.srcObject.getAudioTracks().filter(t => t.readyState === 'live');
                console.log(`[RECEPTOR] Tracks activos: ${activeTracks.length}`);
                if (activeTracks.length === 0) {
                  console.warn('[RECEPTOR] No hay tracks de audio activos');
                  setStatus('No se detecta audio activo');
                }
              }
            }, 5000);
            
            // Limpiar el intervalo cuando se detenga
            remoteAudioRef.current.onended = () => {
              clearInterval(checkStreamInterval);
            };
          }
        };
      }

      if (isOfferer && localStreamRef.current) {
        const tracks = localStreamRef.current.getAudioTracks();
        console.log('[EMISOR] Añadiendo tracks locales:', tracks.length);
        tracks.forEach(track => {
          console.log('[EMISOR] Track local:', track.kind, track.readyState);
          peer.addTrack(track, localStreamRef.current);
        });

        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        
        // Modificar la oferta para usar la dirección IP pública
        const modifiedSdp = offer.sdp
          .replace(/o=- \d+ \d+ IN IP4 127\.0\.0\.1/, `o=- ${Math.floor(Math.random() * 1000000000)} 2 IN IP4 31.4.242.103`)
          .replace(/c=IN IP4 0\.0\.0\.0/, 'c=IN IP4 31.4.242.103');
        
        const modifiedOffer = new window.RTCSessionDescription({
          type: offer.type,
          sdp: modifiedSdp
        });
        
        await peer.setLocalDescription(modifiedOffer);
        console.log('[EMISOR] Oferta creada y guardada:', modifiedOffer.sdp);
      }

      return peer;
    } catch (error) {
      console.error('Error en createPeer:', error);
      setStatus('Error al crear conexión peer: ' + error.message);
      if (!isEmitting) {
        handleStop();
      }
      return null;
    }
  };

  const handleOffer = async (offer, receiverId) => {
    try {
      if (!peerRef.current) {
        await createPeer(false);
      }
      console.log('[RECEPTOR] Oferta recibida:', offer);
      await peerRef.current.setRemoteDescription(new window.RTCSessionDescription(offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      sendSignal({ 
        type: 'answer', 
        answer,
        receiverId: receiverIdRef.current
      });
      setStatus('Conexión establecida. Reproduciendo audio...');
      console.log('[RECEPTOR] Respuesta enviada:', answer);
    } catch (error) {
      console.error('Error en handleOffer:', error);
      handleStop();
    }
  };

  const handleAnswer = async (answer, receiverId) => {
    try {
      const peer = peersRef.current.get(receiverId);
      if (!peer) {
        console.error('No hay peer disponible para establecer la respuesta');
        return;
      }
      await peer.setRemoteDescription(new window.RTCSessionDescription(answer));
      setStatus('Conexión establecida. Emitiendo audio...');
      console.log('[EMISOR] Respuesta recibida:', answer);
    } catch (error) {
      console.error('Error en handleAnswer:', error);
    }
  };

  const handleCandidate = async (candidate, receiverId) => {
    try {
      const peer = isEmitting ? peersRef.current.get(receiverId) : peerRef.current;
      if (!peer) {
        console.error('No hay peer disponible para añadir el candidato ICE');
        return;
      }
      await peer.addIceCandidate(new window.RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error en handleCandidate:', error);
    }
  };

  const startWebRTC = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      wsRef.current = new window.WebSocket(SIGNAL_SERVER_URL);
      
      wsRef.current.onopen = () => {
        setStatus('Conectado al servidor de señalización');
        console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] WebSocket conectado`);
        
        if (isEmitting) {
          sendSignal({ type: 'broadcast' });
        } else {
          receiverIdRef.current = Date.now().toString();
          sendSignal({ 
            type: 'request_broadcast',
            receiverId: receiverIdRef.current
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Error en WebSocket:', error);
        setStatus('Error en la conexión de señalización');
        if (!isEmitting) {
          handleStop();
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket cerrado');
        setStatus('Desconectado del servidor de señalización');
        if (!isEmitting) {
          handleStop();
        }
      };

      wsRef.current.onmessage = async (msg) => {
        try {
          if (typeof msg.data !== 'string') {
            console.warn('Mensaje no válido recibido:', msg.data);
            return;
          }
          const data = JSON.parse(msg.data);
          console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] Mensaje recibido:`, data.type);

          if (data.type === 'broadcast' && !isEmitting) {
            setStatus('Emisor disponible. Conectando...');
            await createPeer(false);
          } else if (data.type === 'broadcaster_disconnected' && !isEmitting) {
            setStatus('Emisor desconectado');
            handleStop();
          } else if (data.type === 'request_broadcast' && isEmitting) {
            const receiverId = data.receiverId;
            const peer = await createPeer(true, receiverId);
            if (peer && peer.localDescription) {
              sendSignal({ 
                type: 'offer', 
                offer: peer.localDescription,
                receiverId
              });
            }
          } else if (data.type === 'offer' && !isEmitting) {
            await handleOffer(data.offer, data.receiverId);
          } else if (data.type === 'answer' && isEmitting) {
            await handleAnswer(data.answer, data.receiverId);
            setIsConnected(true);
            setStatus('Conexión establecida. Emitiendo audio...');
          } else if (data.type === 'candidate') {
            await handleCandidate(data.candidate, data.receiverId);
          }
        } catch (e) {
          console.error('Error procesando mensaje:', e);
          if (!isEmitting) {
            handleStop();
          }
        }
      };
    } catch (error) {
      console.error('Error en startWebRTC:', error);
      setStatus('Error al iniciar WebRTC: ' + error.message);
      if (!isEmitting) {
        handleStop();
      }
    }
  };

  return (
    <div className="simple-webrtc-test">
      <h2 style={{ fontFamily: 'VCR', color: '#fff' }}>{isEmitting ? 'Emitiendo audio del sistema' : 'Recibiendo audio remoto'}</h2>
      <p style={{ fontFamily: 'VCR', color: '#fff' }}>{status}</p>
      <canvas ref={canvasRef} width={350} height={60} style={{ display: 'block', margin: '16px auto', background: '#222', borderRadius: 8 }} />
      {buttonVisible && (
        <button onClick={handlePlay} style={{margin: '16px auto', display: 'block', padding: '12px 32px', fontSize: '1.2em', borderRadius: 8, border: 'none', background: '#222', color: '#fff', cursor: 'pointer', fontFamily: 'VCR'}}>
          {isEmitting ? 'Capturar y emitir audio' : 'Escuchar audio remoto'}
        </button>
      )}
      {isPlaying && (
        <button onClick={handleStop} style={{margin: '16px auto', display: 'block', padding: '12px 32px', fontSize: '1.2em', borderRadius: 8, border: 'none', background: '#a00', color: '#fff', cursor: 'pointer', fontFamily: 'VCR'}}>
          Parar
        </button>
      )}
      {!isEmitting && <audio ref={remoteAudioRef} autoPlay controls playsInline style={{ width: '100%' }} />}
      {isEmitting && <p style={{ fontFamily: 'VCR', color: '#fff' }}>El audio del sistema se está emitiendo a la otra pestaña/dispositivo.</p>}
    </div>
  );
};

export default SimpleWebRTCTest; 