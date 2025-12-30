// Imports estáticos de todos los archivos de audio
// Este archivo se genera automáticamente por generateAudioImports.js
// NO EDITAR MANUALMENTE - Ejecutar: node generateAudioImports.js

import blink_track from './blink/track.mp3';
import bodita__1 from './bodita/1.mp3';
import bodita_lodo from './bodita/lodo.mp3';
import bodita_postboda__2 from './bodita/postboda/2.mp3';
import Croquetas25_thunderstruck from './Croquetas25/thunderstruck.mp3';
import despes_track from './despes/track.mp3';
import disenatas_valley from './disenatas/valley.mp3';
import mascotas_YTDown_com_YouTube_W_W_OIIA_OIIA_Spinning_Cat_Media_IxX_QHay02M_008_128k from './mascotas/YTDown.com_YouTube_W&W-OIIA-OIIA-Spinning-Cat_Media_IxX_QHay02M_008_128k.mp3';
import pokemon_YTDown_com_YouTube_AC_DC_Thunderstruck_MOONLGHT_Remix_Media_wlDlQquwxZk_008_128k from './pokemon/YTDown.com_YouTube_AC-DC-Thunderstruck-MOONLGHT-Remix_Media_wlDlQquwxZk_008_128k.mp3';
import silos_lodo from './silos/lodo.mp3';
import viejovenes_carolina from './viejovenes/carolina.mp3';

export const audioImports = {
  'Croquetas25': {
    '__root__': [Croquetas25_thunderstruck],
  },
  'blink': {
    '__root__': [blink_track],
  },
  'bodita': {
    '__root__': [bodita__1, bodita_lodo],
    'postboda': [bodita_postboda__2],
  },
  'despes': {
    '__root__': [despes_track],
  },
  'disenatas': {
    '__root__': [disenatas_valley],
  },
  'mascotas': {
    '__root__': [mascotas_YTDown_com_YouTube_W_W_OIIA_OIIA_Spinning_Cat_Media_IxX_QHay02M_008_128k],
  },
  'pokemon': {
    '__root__': [pokemon_YTDown_com_YouTube_AC_DC_Thunderstruck_MOONLGHT_Remix_Media_wlDlQquwxZk_008_128k],
  },
  'silos': {
    '__root__': [silos_lodo],
  },
  'viejovenes': {
    '__root__': [viejovenes_carolina],
  },
};


// Función helper para obtener audios de un track
export const getTrackAudios = (trackName) => {
  const track = audioImports[trackName];
  if (!track) return [];
  const allAudios = [];
  Object.keys(track).forEach(subfolder => {
    allAudios.push(...track[subfolder]);
  });
  return allAudios;
};
