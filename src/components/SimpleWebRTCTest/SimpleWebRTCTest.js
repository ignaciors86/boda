import React, { useEffect, useRef, useState } from 'react';
import './SimpleWebRTCTest.scss';

// URL dinámica de Strapi según entorno
const STRAPI_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:1337'
    : 'https://boda-strapi-production.up.railway.app';

const SIGNAL_SERVER_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:8080'
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
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 1.2;
    let x = 0;
    let max = 0;
    for (let i = 0; i < bufferLength; i++) {
      let barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
      barHeight = Math.max(2, barHeight);
      max = Math.max(max, barHeight);
      const hue = 120 - Math.round((barHeight / canvas.height) * 120);
      ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
    // Solo log en receptor y solo si hay señal
    if (label === 'RECEPTOR' && max > 2) {
      console.log(`[RECEPTOR][EQ] Máx barra: ${Math.round(max)} | Primeros valores:`, dataArray.slice(0, 8));
    }
  };

  // Loop de animación del ecualizador
  const animateEq = (label) => {
    if (analyserRef.current) {
      drawEq(analyserRef.current, label);
      animationRef.current = requestAnimationFrame(() => animateEq(label));
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
  const setupRemoteAnalyser = (audioElem) => {
    // Limpiar recursos existentes
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('Error al cerrar AudioContext anterior:', e);
      }
    }
    
    // Crear nuevo AudioContext
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    
    // Verificar si el elemento de audio ya está conectado
    if (!audioElem._connectedToAudioContext) {
      const source = audioCtx.createMediaElementSource(audioElem);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioElem._connectedToAudioContext = true;
    }
    
    analyserRef.current = analyser;
    audioContextRef.current = audioCtx;
    animateEq('RECEPTOR');
    
    // Log de depuración útil
    setTimeout(() => {
      try {
        const tracks = audioElem.srcObject ? audioElem.srcObject.getAudioTracks() : [];
        if (tracks.length > 0) {
          console.log('[RECEPTOR] El elemento <audio> tiene tracks:', tracks.map(t => t.label));
        } else {
          console.warn('[RECEPTOR] El elemento <audio> NO tiene tracks de audio.');
        }
      } catch (e) {
        console.warn('[RECEPTOR] No se pudo acceder a tracks del elemento <audio>.', e);
      }
    }, 1000);

    // Asegurar que el audio se reproduzca en iOS
    const playAudio = async () => {
      try {
        await audioElem.play();
        console.log('[RECEPTOR] Audio empezó a reproducirse');
      } catch (error) {
        console.error('[RECEPTOR] Error al reproducir audio:', error);
        if (error.name === 'NotAllowedError') {
          setStatus('Por favor, toca la pantalla para reproducir el audio');
        }
      }
    };

    // Detectar si es un dispositivo iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      // En iOS, esperamos a una interacción del usuario
      document.addEventListener('touchstart', playAudio, { once: true });
    }
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
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all'
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
          console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] ICE candidate encontrado:`, event.candidate.type);
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
        if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected') {
          console.error(`Conexión ICE ${peer.iceConnectionState} con receptor ${receiverId}`);
          if (isEmitting) {
            // Si es emisor, intentar reconectar
            if (peersRef.current.has(receiverId)) {
              const failedPeer = peersRef.current.get(receiverId);
              peersRef.current.delete(receiverId);
              failedPeer.close();
              
              // Intentar reconectar después de un breve retraso
              setTimeout(() => {
                console.log(`[EMISOR] Intentando reconectar con receptor ${receiverId}`);
                createPeer(true, receiverId);
              }, 2000);
            }
          } else {
            handleStop();
          }
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
            };
            
            remoteAudioRef.current.oncanplay = () => {
              console.log('[RECEPTOR] Audio listo para reproducir');
              // Intentar reproducir automáticamente
              const playPromise = remoteAudioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.error('[RECEPTOR] Error al reproducir audio:', error);
                  if (error.name === 'NotAllowedError') {
                    setStatus('Por favor, toca la pantalla para reproducir el audio');
                  }
                });
              }
            };
            
            remoteAudioRef.current.onplay = () => {
              console.log('[RECEPTOR] Audio empezó a reproducirse');
              setupRemoteAnalyser(remoteAudioRef.current);
              setIsConnected(true);
              setStatus('Conexión establecida. Reproduciendo audio...');
            };
            
            remoteAudioRef.current.onerror = (error) => {
              console.error('[RECEPTOR] Error en el elemento de audio:', error);
            };
            
            // Verificar el estado del stream periódicamente
            const checkStreamInterval = setInterval(() => {
              if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
                const activeTracks = remoteAudioRef.current.srcObject.getAudioTracks().filter(t => t.readyState === 'live');
                console.log(`[RECEPTOR] Tracks activos: ${activeTracks.length}`);
                if (activeTracks.length === 0) {
                  console.warn('[RECEPTOR] No hay tracks de audio activos');
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
          peer.addTrack(track, localStreamRef.current);
        });

        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        
        await peer.setLocalDescription(offer);
        console.log('[EMISOR] Oferta creada y guardada');
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