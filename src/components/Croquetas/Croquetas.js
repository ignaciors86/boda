import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Croquetas.scss';
import Intro from './components/Intro/Intro';
import { AudioProvider, useAudio } from './context/AudioContext';
import { useGallery } from './components/Gallery/Gallery';
import { useTracks } from './hooks/useTracks';
import Seek from './components/Seek/Seek';
import BackButton from './components/BackButton/BackButton';
import Croqueta from './components/Croqueta/Croqueta';
import { gsap } from 'gsap';

const Croquetas = () => {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [wasSelectedFromIntro, setWasSelectedFromIntro] = useState(false);
  const startButtonRef = useRef(null);
  
  const { tracks, isLoading: tracksLoading } = useTracks();
  const audioSrcs = selectedTrack?.srcs || [];
  const isDirectUri = !!trackId;
  
  const { isLoading: imagesLoading, preloadProgress, seekToImagePosition } = useGallery(selectedTrack);

  // Determinar trackId activo: si no hay trackId, usar "croquetas25"
  const activeTrackId = trackId || 'croquetas25';

  // Seleccionar track desde URL o tracks
  useEffect(() => {
    if (tracksLoading) return;
    
    if (!trackId) {
      // Si no hay trackId, buscar Croquetas25 como activa
      const croquetas25Track = tracks.find(t => 
        t.id === 'croquetas25' || 
        t.name.toLowerCase().includes('croquetas25')
      );
      // No establecer selectedTrack, solo mostrar en Intro
      return;
    }
    
    const track = tracks.find(t => 
      t.id === trackId.toLowerCase().replace(/\s+/g, '-') ||
      t.name.toLowerCase().replace(/\s+/g, '-') === trackId.toLowerCase()
    );
    
    if (track) {
      setSelectedTrack(track);
    }
  }, [tracks, trackId, tracksLoading]);

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    setAudioStarted(false);
    setShowStartButton(false);
    setWasSelectedFromIntro(true);
    const trackIdForUrl = track.id || track.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/croquetas/${trackIdForUrl}`, { replace: true });
  };

  const handleClick = async (e) => {
    if (!audioStarted && selectedTrack && showStartButton && startButtonRef.current) {
      gsap.to(startButtonRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          setShowStartButton(false);
          setAudioStarted(true);
        }
      });
    }
  };

  // Iniciar audio cuando todo esté listo (solo si no es URI directa o fue seleccionado desde Intro)
  useEffect(() => {
    if (!selectedTrack || !audioSrcs.length || imagesLoading) return;
    
    // Esperar a que las imágenes iniciales estén cargadas
    if (preloadProgress >= 20) {
      if (isDirectUri && !wasSelectedFromIntro) {
        // URI directa: mostrar botón de inicio
        if (!showStartButton && !audioStarted) {
          setShowStartButton(true);
        }
      } else {
        // Seleccionado desde Intro: iniciar automáticamente
        if (!audioStarted) {
          setAudioStarted(true);
        }
      }
    }
  }, [selectedTrack, audioSrcs, imagesLoading, preloadProgress, audioStarted, isDirectUri, wasSelectedFromIntro, showStartButton]);

  return (
    <div className="croquetas">
      {tracksLoading && (
        <div className="image-preloader">
          <div className="image-preloader__content">
            <div className="image-preloader__text">Cargando canciones...</div>
          </div>
        </div>
      )}
      
      {!tracksLoading && tracks.length > 0 && (
        <Intro 
          tracks={tracks} 
          onTrackSelect={handleTrackSelect}
          selectedTrackId={activeTrackId}
          isVisible={!selectedTrack}
          isDirectUri={isDirectUri}
        />
      )}
      
      {selectedTrack && audioSrcs.length > 0 && (
        <AudioProvider audioSrcs={audioSrcs}>
          <StartButtonWrapper
            showStartButton={showStartButton}
            startButtonRef={startButtonRef}
            handleClick={handleClick}
            selectedTrack={selectedTrack}
          />
          <AudioPlayer audioStarted={audioStarted} />
          <SeekWrapper 
            selectedTrack={selectedTrack}
            seekToImagePosition={seekToImagePosition}
          />
          {(isDirectUri || audioStarted) && (
            <BackButton 
              onBack={() => {
                setSelectedTrack(null);
                setAudioStarted(false);
                setShowStartButton(false);
                setWasSelectedFromIntro(false);
                navigate('/croquetas', { replace: true });
              }}
            />
          )}
        </AudioProvider>
      )}
    </div>
  );
};

// Componente interno para manejar la reproducción de audio
const AudioPlayer = ({ audioStarted }) => {
  const { play, audioElementsRef, currentIndex } = useAudio();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!audioStarted || hasStartedRef.current) return;
    
    const startAudio = async () => {
      try {
        hasStartedRef.current = true;
        await play();
      } catch (error) {
        console.error('[AudioPlayer] Error starting audio:', error);
        hasStartedRef.current = false;
      }
    };

    startAudio();
  }, [audioStarted, play]);

  return null;
};

// Wrapper para Seek con acceso al contexto de audio
const SeekWrapper = ({ selectedTrack, seekToImagePosition }) => {
  return (
    <Seek 
      selectedTrack={selectedTrack}
      seekToImagePosition={seekToImagePosition}
    />
  );
};

// Componente para el botón de inicio cuando es URI directa
const StartButtonWrapper = ({ showStartButton, startButtonRef, handleClick, selectedTrack }) => {
  const buttonRef = useRef(null);
  const buttonAnimationStartedRef = useRef(false);

  useEffect(() => {
    if (showStartButton && !buttonAnimationStartedRef.current && buttonRef.current) {
      buttonAnimationStartedRef.current = true;
      gsap.fromTo(buttonRef.current, 
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    } else {
      buttonAnimationStartedRef.current = false;
    }
  }, [showStartButton]);

  if (!showStartButton) return null;

  return (
    <div 
      className="croquetas-start-croqueta" 
      ref={(el) => {
        startButtonRef.current = el;
        buttonRef.current = el;
      }}
      onClick={handleClick}
    >
      <Croqueta
        index={selectedTrack ? 0 : 999}
        text={selectedTrack?.name || "Comenzar"}
        onClick={handleClick}
        rotation={0}
        className="croquetas-start-croqueta__button"
      />
    </div>
  );
};

export default Croquetas;
