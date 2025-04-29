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

// Presets de calidad de audio
const AUDIO_QUALITY_PRESETS = {
  high: {
    sampleRate: 48000,
    bitrate: 128000,
    channelCount: 2,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  medium: {
    sampleRate: 44100,
    bitrate: 64000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  low: {
    sampleRate: 22050,
    bitrate: 32000,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }
};

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
  const reconnectAttemptsRef = useRef(0);
  const statsIntervalRef = useRef(null);
  const qualityCheckIntervalRef = useRef(null);
  const [networkType, setNetworkType] = useState('Desconocido');
  const [connectionQuality, setConnectionQuality] = useState('high');
  const [audioQuality, setAudioQuality] = useState('high');
  const [showQualityControls, setShowQualityControls] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    bitrate: 0,
    packetLoss: 0,
    latency: 0
  });
  const [logs, setLogs] = useState([]);
  const [audioKey, setAudioKey] = useState(Date.now());
  const [showAudio, setShowAudio] = useState(true);

  // Función para añadir logs
  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  // Monitorear estadísticas de conexión
  const monitorConnectionStats = async () => {
    if (!peerRef.current) return;

    try {
      const stats = await peerRef.current.getStats();
      let bitrate = 0;
      let packetLoss = 0;
      let latency = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          bitrate = report.bytesReceived * 8 / 1000; // kbps
          packetLoss = report.packetsLost / report.packetsReceived * 100;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = report.currentRoundTripTime * 1000; // ms
        }
      });

      setConnectionStats({ bitrate, packetLoss, latency });
      adjustQualityBasedOnStats(bitrate, packetLoss, latency);
    } catch (error) {
      addLog(`Error al obtener estadísticas: ${error.message}`, 'error');
    }
  };

  // Ajustar calidad basado en estadísticas
  const adjustQualityBasedOnStats = (bitrate, packetLoss, latency) => {
    if (packetLoss > 10 || latency > 500) {
      setAudioQuality('low');
      setConnectionQuality('low');
    } else if (packetLoss > 5 || latency > 300) {
      setAudioQuality('medium');
      setConnectionQuality('medium');
    } else {
      setAudioQuality('high');
      setConnectionQuality('high');
    }
  };

  // Detectar tipo de red
  const detectNetworkType = () => {
    if (navigator.connection) {
      setNetworkType(navigator.connection.type);
      navigator.connection.addEventListener('change', () => {
        setNetworkType(navigator.connection.type);
      });
    }
  };

  useEffect(() => {
    detectNetworkType();
    return () => {
      handleStop();
    };
  }, []);

  // Dibuja el ecualizador en el canvas (solo logs en receptor)
  const drawEq = (analyser, label = '') => {
    if (!canvasRef.current || !analyser) return;
    if (audioContextRef.current) {
      console.log(`[EQ][${label}] audioCtx.state:`, audioContextRef.current.state);
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const maxValue = Math.max(...dataArray);
    if (label === 'RECEPTOR') {
      console.log(`[EQ][${label}] Max value:`, maxValue, 'Data:', dataArray.slice(0, 8));
    }
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
  const setupRemoteAnalyser = async (audioElem) => {
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
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
        console.log('[RECEPTOR] AudioContext resumido');
      } catch (e) {
        console.warn('[RECEPTOR] Error al resumir AudioContext:', e);
      }
    }
    try {
      const source = audioCtx.createMediaElementSource(audioElem);
      source.connect(analyser);
      audioElem._connectedToAudioContext = true;
      console.log('[RECEPTOR] Nuevo MediaElementSource creado para <audio>');
    } catch (e) {
      console.warn('[RECEPTOR] Error creando MediaElementSource:', e);
    }
    analyserRef.current = analyser;
    audioContextRef.current = audioCtx;
    animateEq('RECEPTOR');
    if (!window._receptorAudioTrackInterval) {
      window._receptorAudioTrackInterval = setInterval(() => {
        if (audioElem && audioElem.srcObject) {
          const tracks = audioElem.srcObject.getAudioTracks();
          console.log('[RECEPTOR][AUDIO] Estado de tracks:', tracks.map(t => ({id: t.id, label: t.label, enabled: t.enabled, readyState: t.readyState})));
        }
      }, 1000);
    }
  };

  const sendSignal = (data) => {
    wsRef.current && wsRef.current.readyState === 1 && wsRef.current.send(JSON.stringify(data));
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsConnected(false);
    setStatus('Desconectado');
    addLog('Conexión detenida', 'info');

    // Limpiar WebRTC
    if (isEmitting) {
      peersRef.current.forEach((peer, receiverId) => {
        if (peer) {
          peer.close();
        }
      });
      peersRef.current.clear();
    } else {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      receiverIdRef.current = null;
      setAudioKey(Date.now()); // Fuerza remount del <audio>
      setShowAudio(false); // Elimina el <audio> del DOM
      setTimeout(() => setShowAudio(true), 100); // Lo vuelve a mostrar tras 100ms
    }

    // Limpiar WebSocket
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
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
      remoteAudioRef.current.pause();
      remoteAudioRef.current.load && remoteAudioRef.current.load();
    }

    // Limpiar intervalos
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
      qualityCheckIntervalRef.current = null;
    }

    // Limpiar logs si quieres (opcional)
    // setLogs([]);
  };

  const handlePlay = async () => {
    setIsPlaying(true);
    setStatus('Conectando...');
    addLog('Iniciando conexión...', 'info');
    if (!isEmitting) {
      setShowAudio(true); // Asegura que el <audio> esté en el DOM
    }
    if (isEmitting) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            suppressLocalAudioPlayback: false,
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 48000
          }
        });
        stream.getVideoTracks().forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });
        if (stream.getAudioTracks().length === 0) {
          setStatus('No se detectó audio del sistema.');
          setIsPlaying(false);
          addLog('No se detectó audio del sistema', 'error');
          return;
        }
        // Log de tracks en el emisor
        console.log('[EMISOR] Tracks de audio en el stream:', stream.getAudioTracks().map(t => ({id: t.id, label: t.label, enabled: t.enabled, readyState: t.readyState})));
        localStreamRef.current = stream;
        setupLocalAnalyser(stream);
        startWebRTC();
      } catch (err) {
        setStatus('Error al capturar el audio del sistema: ' + err.message);
        setIsPlaying(false);
        addLog(`Error al capturar audio: ${err.message}`, 'error');
      }
    } else {
      startWebRTC();
    }
  };

  const createPeer = async (isOfferer, receiverId = null) => {
    try {
      const peer = new window.RTCPeerConnection({
        iceServers: [
          // STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.ekiga.net' },
          { urls: 'stun:stun.ideasip.com' },
          { urls: 'stun:stun.rixtelecom.se' },
          { urls: 'stun:stun.schlund.de' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          { urls: 'stun:stun.voiparound.com' },
          { urls: 'stun:stun.voipbuster.com' },
          { urls: 'stun:stun.voipstunt.com' },
          { urls: 'stun:stun.voxgratia.org' },
          { urls: 'stun:23.21.150.121:3478' },
          { urls: 'stun:iphone-stun.strato-iphone.de:3478' },
          { urls: 'stun:numb.viagenie.ca:3478' },
          { urls: 'stun:s1.taraba.net:3478' },
          { urls: 'stun:s2.taraba.net:3478' },
          { urls: 'stun:stun.12connect.com:3478' },
          { urls: 'stun:stun.12voip.com:3478' },
          { urls: 'stun:stun.1und1.de:3478' },
          { urls: 'stun:stun.2talk.co.nz:3478' },
          { urls: 'stun:stun.2talk.com:3478' },
          { urls: 'stun:stun.3clogic.com:3478' },
          { urls: 'stun:stun.3cx.com:3478' },
          { urls: 'stun:stun.a-mm.tv:3478' },
          { urls: 'stun:stun.aa.net.uk:3478' },
          { urls: 'stun:stun.acrobits.cz:3478' },
          { urls: 'stun:stun.actionvoip.com:3478' },
          { urls: 'stun:stun.advfn.com:3478' },
          { urls: 'stun:stun.aeta-audio.com:3478' },
          { urls: 'stun:stun.aeta.com:3478' },
          { urls: 'stun:stun.alltel.com.au:3478' },
          { urls: 'stun:stun.altar.com.pl:3478' },
          { urls: 'stun:stun.annatel.net:3478' },
          { urls: 'stun:stun.antisip.com:3478' },
          { urls: 'stun:stun.arbuz.ru:3478' },
          { urls: 'stun:stun.avigora.com:3478' },
          { urls: 'stun:stun.avigora.fr:3478' },
          { urls: 'stun:stun.awa-shima.com:3478' },
          { urls: 'stun:stun.awt.be:3478' },
          { urls: 'stun:stun.b2b2c.ca:3478' },
          { urls: 'stun:stun.bahnhof.net:3478' },
          { urls: 'stun:stun.barracuda.com:3478' },
          { urls: 'stun:stun.bluesip.net:3478' },
          { urls: 'stun:stun.bmwgs.cz:3478' },
          { urls: 'stun:stun.botonakis.com:3478' },
          { urls: 'stun:stun.budgetphone.nl:3478' },
          { urls: 'stun:stun.budgetsip.com:3478' },
          { urls: 'stun:stun.cablenet-as.net:3478' },
          { urls: 'stun:stun.callromania.ro:3478' },
          { urls: 'stun:stun.callwithus.com:3478' },
          { urls: 'stun:stun.cbsys.net:3478' },
          { urls: 'stun:stun.chathelp.ru:3478' },
          { urls: 'stun:stun.cheapvoip.com:3478' },
          { urls: 'stun:stun.ciktel.com:3478' },
          { urls: 'stun:stun.cloopen.com:3478' },
          { urls: 'stun:stun.colouredlines.com.au:3478' },
          { urls: 'stun:stun.comfi.com:3478' },
          { urls: 'stun:stun.commpeak.com:3478' },
          { urls: 'stun:stun.comtube.com:3478' },
          { urls: 'stun:stun.comtube.ru:3478' },
          { urls: 'stun:stun.cope.es:3478' },
          { urls: 'stun:stun.counterpath.com:3478' },
          { urls: 'stun:stun.counterpath.net:3478' },
          { urls: 'stun:stun.cryptonit.net:3478' },
          { urls: 'stun:stun.darioflaccovio.it:3478' },
          { urls: 'stun:stun.datamanagement.it:3478' },
          { urls: 'stun:stun.dcalling.de:3478' },
          { urls: 'stun:stun.decanet.fr:3478' },
          { urls: 'stun:stun.demos.ru:3478' },
          { urls: 'stun:stun.develz.org:3478' },
          { urls: 'stun:stun.dingaling.ca:3478' },
          { urls: 'stun:stun.doublerobotics.com:3478' },
          { urls: 'stun:stun.drogon.net:3478' },
          { urls: 'stun:stun.duocom.es:3478' },
          { urls: 'stun:stun.dus.net:3478' },
          { urls: 'stun:stun.e-fon.ch:3478' },
          { urls: 'stun:stun.easybell.de:3478' },
          { urls: 'stun:stun.easycall.pl:3478' },
          { urls: 'stun:stun.easyvoip.com:3478' },
          { urls: 'stun:stun.efficace-factory.com:3478' },
          { urls: 'stun:stun.einsundeins.com:3478' },
          { urls: 'stun:stun.einsundeins.de:3478' },
          { urls: 'stun:stun.ekiga.net:3478' },
          { urls: 'stun:stun.epygi.com:3478' },
          { urls: 'stun:stun.etoilediese.fr:3478' },
          { urls: 'stun:stun.eyeball.com:3478' },
          { urls: 'stun:stun.faktortel.com.au:3478' },
          { urls: 'stun:stun.freecall.com:3478' },
          { urls: 'stun:stun.freeswitch.org:3478' },
          { urls: 'stun:stun.freevoipdeal.com:3478' },
          { urls: 'stun:stun.fuzemeeting.com:3478' },
          { urls: 'stun:stun.gmx.de:3478' },
          { urls: 'stun:stun.gmx.net:3478' },
          { urls: 'stun:stun.gradwell.com:3478' },
          { urls: 'stun:stun.halonet.pl:3478' },
          { urls: 'stun:stun.hellonanu.com:3478' },
          { urls: 'stun:stun.hoiio.com:3478' },
          { urls: 'stun:stun.hosteurope.de:3478' },
          { urls: 'stun:stun.ideasip.com:3478' },
          { urls: 'stun:stun.imesh.com:3478' },
          { urls: 'stun:stun.infra.net:3478' },
          { urls: 'stun:stun.internetcalls.com:3478' },
          { urls: 'stun:stun.intervoip.com:3478' },
          { urls: 'stun:stun.ipcomms.net:3478' },
          { urls: 'stun:stun.ipfire.org:3478' },
          { urls: 'stun:stun.ippi.fr:3478' },
          { urls: 'stun:stun.ipshka.com:3478' },
          { urls: 'stun:stun.iptel.org:3478' },
          { urls: 'stun:stun.irian.at:3478' },
          { urls: 'stun:stun.it1.hr:3478' },
          { urls: 'stun:stun.ivao.aero:3478' },
          { urls: 'stun:stun.jappix.com:3478' },
          { urls: 'stun:stun.jumblo.com:3478' },
          { urls: 'stun:stun.justvoip.com:3478' },
          { urls: 'stun:stun.kanet.ru:3478' },
          { urls: 'stun:stun.kiwilink.co.nz:3478' },
          { urls: 'stun:stun.kundenserver.de:3478' },
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.linea7.net:3478' },
          { urls: 'stun:stun.linphone.org:3478' },
          { urls: 'stun:stun.liveo.fr:3478' },
          { urls: 'stun:stun.lowratevoip.com:3478' },
          { urls: 'stun:stun.lugosoft.com:3478' },
          { urls: 'stun:stun.lundimatin.fr:3478' },
          { urls: 'stun:stun.magnet.ie:3478' },
          { urls: 'stun:stun.manle.com:3478' },
          { urls: 'stun:stun.mgn.ru:3478' },
          { urls: 'stun:stun.mit.de:3478' },
          { urls: 'stun:stun.mitake.com.tw:3478' },
          { urls: 'stun:stun.miwifi.com:3478' },
          { urls: 'stun:stun.modulus.gr:3478' },
          { urls: 'stun:stun.mozcom.com:3478' },
          { urls: 'stun:stun.myvoiptraffic.com:3478' },
          { urls: 'stun:stun.mywatson.it:3478' },
          { urls: 'stun:stun.nas.net:3478' },
          { urls: 'stun:stun.neotel.co.za:3478' },
          { urls: 'stun:stun.netappel.com:3478' },
          { urls: 'stun:stun.netappel.fr:3478' },
          { urls: 'stun:stun.netgsm.com.tr:3478' },
          { urls: 'stun:stun.nfon.net:3478' },
          { urls: 'stun:stun.noblogs.org:3478' },
          { urls: 'stun:stun.noc.ams-ix.net:3478' },
          { urls: 'stun:stun.node4.co.uk:3478' },
          { urls: 'stun:stun.nonoh.net:3478' },
          { urls: 'stun:stun.nottingham.ac.uk:3478' },
          { urls: 'stun:stun.nova.is:3478' },
          { urls: 'stun:stun.nventure.com:3478' },
          { urls: 'stun:stun.on.net.mk:3478' },
          { urls: 'stun:stun.ooma.com:3478' },
          { urls: 'stun:stun.ooonet.ru:3478' },
          { urls: 'stun:stun.oriontelekom.rs:3478' },
          { urls: 'stun:stun.outland-net.de:3478' },
          { urls: 'stun:stun.ozekiphone.com:3478' },
          { urls: 'stun:stun.patlive.com:3478' },
          { urls: 'stun:stun.personal-voip.de:3478' },
          { urls: 'stun:stun.petcube.com:3478' },
          { urls: 'stun:stun.phone.com:3478' },
          { urls: 'stun:stun.phoneserve.com:3478' },
          { urls: 'stun:stun.pjsip.org:3478' },
          { urls: 'stun:stun.poivy.com:3478' },
          { urls: 'stun:stun.powerpbx.org:3478' },
          { urls: 'stun:stun.powervoip.com:3478' },
          { urls: 'stun:stun.ppdi.com:3478' },
          { urls: 'stun:stun.prizee.com:3478' },
          { urls: 'stun:stun.qq.com:3478' },
          { urls: 'stun:stun.qvod.com:3478' },
          { urls: 'stun:stun.rackco.com:3478' },
          { urls: 'stun:stun.rapidnet.de:3478' },
          { urls: 'stun:stun.rb-net.com:3478' },
          { urls: 'stun:stun.refint.net:3478' },
          { urls: 'stun:stun.remote-learner.net:3478' },
          { urls: 'stun:stun.rixtelecom.se:3478' },
          { urls: 'stun:stun.rockenstein.de:3478' },
          { urls: 'stun:stun.rolmail.net:3478' },
          { urls: 'stun:stun.rounds.com:3478' },
          { urls: 'stun:stun.rynga.com:3478' },
          { urls: 'stun:stun.samsungsmartcam.com:3478' },
          { urls: 'stun:stun.schlund.de:3478' },
          { urls: 'stun:stun.services.mozilla.com:3478' },
          { urls: 'stun:stun.sigmavoip.com:3478' },
          { urls: 'stun:stun.sip.us:3478' },
          { urls: 'stun:stun.sipdiscount.com:3478' },
          { urls: 'stun:stun.sipgate.net:10000' },
          { urls: 'stun:stun.sipgate.net:3478' },
          { urls: 'stun:stun.siplogin.de:3478' },
          { urls: 'stun:stun.sipnet.net:3478' },
          { urls: 'stun:stun.sipnet.ru:3478' },
          { urls: 'stun:stun.siportal.it:3478' },
          { urls: 'stun:stun.sippeer.dk:3478' },
          { urls: 'stun:stun.siptraffic.com:3478' },
          { urls: 'stun:stun.skylink.ru:3478' },
          { urls: 'stun:stun.sma.de:3478' },
          { urls: 'stun:stun.smartvoip.com:3478' },
          { urls: 'stun:stun.smsdiscount.com:3478' },
          { urls: 'stun:stun.snafu.de:3478' },
          { urls: 'stun:stun.softjoys.com:3478' },
          { urls: 'stun:stun.solcon.nl:3478' },
          { urls: 'stun:stun.solnet.ch:3478' },
          { urls: 'stun:stun.sonetel.com:3478' },
          { urls: 'stun:stun.sonetel.net:3478' },
          { urls: 'stun:stun.sovtest.ru:3478' },
          { urls: 'stun:stun.speedy.com.ar:3478' },
          { urls: 'stun:stun.spokn.com:3478' },
          { urls: 'stun:stun.srce.hr:3478' },
          { urls: 'stun:stun.ssl7.net:3478' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          { urls: 'stun:stun.symform.com:3478' },
          { urls: 'stun:stun.symplicity.com:3478' },
          { urls: 'stun:stun.sysadminman.net:3478' },
          { urls: 'stun:stun.t-online.de:3478' },
          { urls: 'stun:stun.tagan.ru:3478' },
          { urls: 'stun:stun.tatneft.ru:3478' },
          { urls: 'stun:stun.teachercreated.com:3478' },
          { urls: 'stun:stun.tel.lu:3478' },
          { urls: 'stun:stun.telbo.com:3478' },
          { urls: 'stun:stun.telefacil.com:3478' },
          { urls: 'stun:stun.tis-dialog.ru:3478' },
          { urls: 'stun:stun.tng.de:3478' },
          { urls: 'stun:stun.twt.it:3478' },
          { urls: 'stun:stun.u-blox.com:3478' },
          { urls: 'stun:stun.ucallweconn.net:3478' },
          { urls: 'stun:stun.ucsb.edu:3478' },
          { urls: 'stun:stun.ucw.cz:3478' },
          { urls: 'stun:stun.uls.co.za:3478' },
          { urls: 'stun:stun.unseen.is:3478' },
          { urls: 'stun:stun.usfamily.net:3478' },
          { urls: 'stun:stun.veoh.com:3478' },
          { urls: 'stun:stun.vidyo.com:3478' },
          { urls: 'stun:stun.vipgroup.net:3478' },
          { urls: 'stun:stun.virtual-call.com:3478' },
          { urls: 'stun:stun.viva.gr:3478' },
          { urls: 'stun:stun.vivox.com:3478' },
          { urls: 'stun:stun.vline.com:3478' },
          { urls: 'stun:stun.vo.lu:3478' },
          { urls: 'stun:stun.vodafone.ro:3478' },
          { urls: 'stun:stun.voicetrading.com:3478' },
          { urls: 'stun:stun.voip.aebc.com:3478' },
          { urls: 'stun:stun.voip.blackberry.com:3478' },
          { urls: 'stun:stun.voip.eutelia.it:3478' },
          { urls: 'stun:stun.voiparound.com:3478' },
          { urls: 'stun:stun.voipblast.com:3478' },
          { urls: 'stun:stun.voipbuster.com:3478' },
          { urls: 'stun:stun.voipbusterpro.com:3478' },
          { urls: 'stun:stun.voipcheap.co.uk:3478' },
          { urls: 'stun:stun.voipcheap.com:3478' },
          { urls: 'stun:stun.voipfibre.com:3478' },
          { urls: 'stun:stun.voipgain.com:3478' },
          { urls: 'stun:stun.voipgate.com:3478' },
          { urls: 'stun:stun.voipinfocenter.com:3478' },
          { urls: 'stun:stun.voipplanet.nl:3478' },
          { urls: 'stun:stun.voippro.com:3478' },
          { urls: 'stun:stun.voipraider.com:3478' },
          { urls: 'stun:stun.voipstunt.com:3478' },
          { urls: 'stun:stun.voipwise.com:3478' },
          { urls: 'stun:stun.voipzoom.com:3478' },
          { urls: 'stun:stun.vopium.com:3478' },
          { urls: 'stun:stun.voxgratia.org:3478' },
          { urls: 'stun:stun.voxox.com:3478' },
          { urls: 'stun:stun.voys.nl:3478' },
          { urls: 'stun:stun.voztele.com:3478' },
          { urls: 'stun:stun.vyke.com:3478' },
          { urls: 'stun:stun.webcalldirect.com:3478' },
          { urls: 'stun:stun.whoi.edu:3478' },
          { urls: 'stun:stun.wifirst.net:3478' },
          { urls: 'stun:stun.wwdl.net:3478' },
          { urls: 'stun:stun.xs4all.nl:3478' },
          { urls: 'stun:stun.xtratelecom.es:3478' },
          { urls: 'stun:stun.yesss.at:3478' },
          { urls: 'stun:stun.zadarma.com:3478' },
          { urls: 'stun:stun.zadv.com:3478' },
          { urls: 'stun:stun.zoiper.com:3478' },
          { urls: 'stun:stun1.faktortel.com.au:3478' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun1.voiceeclipse.net:3478' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stunserver.org:3478' },
          // TURN servers
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:global.relay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:global.relay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
          },
          {
            urls: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
          },
          {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
          },
          {
            urls: 'turn:turn.bistri.com:80',
            credential: 'homeo',
            username: 'homeo'
          },
          {
            urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
            credential: 'webrtc',
            username: 'webrtc'
          },
          {
            urls: 'turn:turn01.hubl.in?transport=udp'
          },
          {
            urls: 'turn:turn02.hubl.in?transport=tcp'
          }
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
          console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] ICE candidate encontrado:`, event.candidate.type, event.candidate.protocol, event.candidate.address);
          // Filtrar candidatos locales
          if (event.candidate.type === 'host' && 
              (event.candidate.address.includes('.local') || 
               event.candidate.address === '127.0.0.1')) {
            console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] Ignorando candidato local`);
            return;
          }
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
            const tracks = stream.getAudioTracks();
            console.log(`[RECEPTOR] Tracks de audio recibidos:`, tracks.length, tracks.map(t => ({id: t.id, label: t.label, enabled: t.enabled, readyState: t.readyState})));
            // Log de estado de los tracks cada segundo
            if (!window._receptorTrackInterval) {
              window._receptorTrackInterval = setInterval(() => {
                const currentTracks = remoteAudioRef.current && remoteAudioRef.current.srcObject ? remoteAudioRef.current.srcObject.getAudioTracks() : [];
                console.log('[RECEPTOR] Estado actual de tracks:', currentTracks.map(t => ({id: t.id, label: t.label, enabled: t.enabled, readyState: t.readyState})));
              }, 1000);
            }
            // Asegurarse de que el stream se asigna correctamente
            remoteAudioRef.current.srcObject = stream;
            
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

  const waitForWebSocketClosed = async (ws) => {
    if (!ws) return;
    if (ws.readyState === 3) return; // CLOSED
    return new Promise((resolve) => {
      ws.addEventListener('close', () => resolve(), { once: true });
      // Por si acaso, timeout de seguridad
      setTimeout(resolve, 1000);
    });
  };

  const startWebRTC = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
        await waitForWebSocketClosed(wsRef.current);
        wsRef.current = null;
      }
      wsRef.current = new window.WebSocket(SIGNAL_SERVER_URL);
      wsRef.current.onopen = () => {
        setStatus('Conectado al servidor de señalización');
        console.log(`[${isEmitting ? 'EMISOR' : 'RECEPTOR'}] WebSocket conectado`);
        if (isEmitting) {
          sendSignal({ type: 'broadcast' });
        } else {
          if (!receiverIdRef.current) {
            receiverIdRef.current = Date.now().toString();
          }
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
      <div className="header">
        <div className="title">
          {isEmitting ? 'Emitiendo audio del sistema' : 'Recibiendo audio remoto'}
        </div>
        <div className="status">
          {isConnected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <div className="connection-info">
        <div className="network-type">
          <span>Red:</span>
          <span>{networkType}</span>
        </div>
        <div className="connection-quality">
          <span>Calidad:</span>
          <div className={`quality-indicator ${connectionQuality}`} />
        </div>
      </div>

      <div className="stats">
        <div className="stat-item">
          <div className="label">Bitrate</div>
          <div className="value">{Math.round(connectionStats.bitrate)} kbps</div>
        </div>
        <div className="stat-item">
          <div className="label">Pérdida</div>
          <div className="value">{Math.round(connectionStats.packetLoss)}%</div>
        </div>
        <div className="stat-item">
          <div className="label">Latencia</div>
          <div className="value">{Math.round(connectionStats.latency)} ms</div>
        </div>
      </div>

      <div className="quality-controls">
        <button onClick={() => setShowQualityControls(!showQualityControls)}>
          {showQualityControls ? 'Ocultar controles' : 'Mostrar controles de calidad'}
        </button>
        {showQualityControls && (
          <div className="quality-options">
            {Object.keys(AUDIO_QUALITY_PRESETS).map(quality => (
              <button
                key={quality}
                className={audioQuality === quality ? 'active' : ''}
                onClick={() => setAudioQuality(quality)}
              >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="visualizer">
        <canvas ref={canvasRef} width={350} height={60} />
      </div>

      <div className="controls">
        {!isPlaying ? (
          <button onClick={handlePlay}>
            {isEmitting ? 'Capturar y emitir audio' : 'Escuchar audio remoto'}
          </button>
        ) : (
          <button className="stop" onClick={handleStop}>
            Parar
          </button>
        )}
      </div>

      {!isEmitting && showAudio && <audio key={audioKey} ref={remoteAudioRef} autoPlay controls playsInline crossOrigin="anonymous" />}

      <div className="logs">
        {logs.map((log, index) => (
          <div key={index} className={`log-entry ${log.type}`}>
            [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleWebRTCTest; 