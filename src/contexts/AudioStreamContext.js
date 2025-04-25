import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AudioStreamContext = createContext();

export const useAudioStream = () => {
  return useContext(AudioStreamContext);
};

export const AudioStreamProvider = ({ children }) => {
  const [audioStream, setAudioStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [socketRef] = useState(() => {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isDevelopment 
      ? 'http://localhost:1337' 
      : 'https://boda-strapi-production.up.railway.app';
    
    return io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: false,
      forceNew: true,
      timeout: 20000
    });
  });

  useEffect(() => {
    socketRef.on('connect', () => {
      console.log('AudioStream: Socket conectado');
    });

    socketRef.on('connect_error', (error) => {
      console.error('AudioStream: Error de conexión Socket.IO:', error);
    });

    return () => {
      socketRef.disconnect();
    };
  }, [socketRef]);

  const startStreaming = async (stream) => {
    setAudioStream(stream);
    setIsStreaming(true);
    
    // Emitir el stream de audio a través del socket
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(2048, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const audioData = e.inputBuffer.getChannelData(0);
      socketRef.emit('audioData', Array.from(audioData));
    };
  };

  const stopStreaming = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setIsStreaming(false);
  };

  const value = {
    audioStream,
    isStreaming,
    startStreaming,
    stopStreaming,
    socket: socketRef
  };

  return (
    <AudioStreamContext.Provider value={value}>
      {children}
    </AudioStreamContext.Provider>
  );
}; 