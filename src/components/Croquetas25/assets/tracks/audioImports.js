// Imports estáticos de todos los archivos de audio
// Esto asegura que webpack los incluya correctamente en el build de producción

// Croquetas25
import thunderstruck from './Croquetas25/thunderstruck.mp3';

// blink
import blinkTrack from './blink/track.mp3';

// bodita
import bodita1 from './bodita/1.mp3';
import boditaLodo from './bodita/lodo.mp3';
import boditaPostboda2 from './bodita/postboda/2.mp3';

// despes
import despesTrack from './despes/track.mp3';

// mascotas
import mascotasTrack from './mascotas/YTDown.com_YouTube_W&W-OIIA-OIIA-Spinning-Cat_Media_IxX_QHay02M_008_128k.mp3';

// pokemon
import pokemonTrack from './pokemon/YTDown.com_YouTube_AC-DC-Thunderstruck-MOONLGHT-Remix_Media_wlDlQquwxZk_008_128k.mp3';

// silos
import silosLodo from './silos/lodo.mp3';

// viejovenes
import viejovenesTrack from './viejovenes/track.mp3';

// Mapeo de tracks a sus audios
// Estructura: { trackName: { subfolder: [audioFiles] } }
export const audioImports = {
  'Croquetas25': {
    '__root__': [thunderstruck]
  },
  'blink': {
    '__root__': [blinkTrack]
  },
  'bodita': {
    '__root__': [bodita1, boditaLodo],
    'postboda': [boditaPostboda2]
  },
  'despes': {
    '__root__': [despesTrack]
  },
  'mascotas': {
    '__root__': [mascotasTrack]
  },
  'pokemon': {
    '__root__': [pokemonTrack]
  },
  'silos': {
    '__root__': [silosLodo]
  },
  'viejovenes': {
    '__root__': [viejovenesTrack]
  }
};

// Función helper para obtener audios de un track
export const getTrackAudios = (trackName) => {
  const normalizedName = trackName?.toLowerCase().replace(/\s+/g, '-') || '';
  const trackKey = Object.keys(audioImports).find(key => 
    key.toLowerCase().replace(/\s+/g, '-') === normalizedName
  );
  
  if (!trackKey) return [];
  
  const trackAudios = audioImports[trackKey];
  if (!trackAudios) return [];
  
  // Retornar todos los audios en orden de subcarpetas
  const subfolderOrder = Object.keys(trackAudios).sort((a, b) => {
    if (a === '__root__') return -1;
    if (b === '__root__') return 1;
    return a.localeCompare(b);
  });
  
  const allAudios = [];
  subfolderOrder.forEach(subfolder => {
    allAudios.push(...trackAudios[subfolder]);
  });
  
  return allAudios;
};

// Función helper para obtener audios por subcarpeta
export const getTrackAudiosBySubfolder = (trackName) => {
  const normalizedName = trackName?.toLowerCase().replace(/\s+/g, '-') || '';
  const trackKey = Object.keys(audioImports).find(key => 
    key.toLowerCase().replace(/\s+/g, '-') === normalizedName
  );
  
  if (!trackKey) return {};
  
  return audioImports[trackKey] || {};
};

export default audioImports;

