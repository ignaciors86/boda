import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Croquetas.scss';
import Intro from './components/Intro/Intro';
import { AudioProvider, useAudio } from './context/AudioContext';
import { useGallery } from './components/Gallery/Gallery';
import { useTracks } from './hooks/useTracks';
import Seek from './components/Seek/Seek';
import BackButton from './components/BackButton/BackButton';

const Croquetas = () => {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [audioStarted, setAudioStarted] = useState(false);
  
  const { tracks, isLoading: tracksLoading } = useTracks();
  const audioSrcs = selectedTrack?.srcs || [];
  
  const { isLoading: imagesLoading, preloadProgress, seekToImagePosition } = useGallery(selectedTrack);

  // Seleccionar track desde URL o tracks
  useEffect(() => {
    if (tracksLoading || !trackId) return;
    
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
    const trackIdForUrl = track.id || track.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/croquetas/${trackIdForUrl}`, { replace: true });
  };

  // Iniciar audio cuando todo esté listo
  useEffect(() => {
    if (!selectedTrack || !audioSrcs.length || imagesLoading) return;
    
    // Esperar a que las imágenes iniciales estén cargadas
    if (preloadProgress >= 20 && !audioStarted) {
      setAudioStarted(true);
    }
  }, [selectedTrack, audioSrcs, imagesLoading, preloadProgress, audioStarted]);

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
          selectedTrackId={trackId}
          isVisible={!selectedTrack}
        />
      )}
      
      {selectedTrack && audioSrcs.length > 0 && (
        <AudioProvider audioSrcs={audioSrcs}>
          <AudioPlayer audioStarted={audioStarted} />
          <SeekWrapper 
            selectedTrack={selectedTrack}
            seekToImagePosition={seekToImagePosition}
          />
          <BackButton 
            onBack={() => {
              setSelectedTrack(null);
              setAudioStarted(false);
              navigate('/croquetas', { replace: true });
            }}
          />
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

export default Croquetas;
