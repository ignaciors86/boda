#!/usr/bin/env node
/**
 * Script para generar automáticamente audioImports.js
 * Escanea las carpetas de tracks y genera los imports estáticos
 * Ejecutar: node generateAudioImports.js
 */

const fs = require('fs');
const path = require('path');

const tracksDir = __dirname;
const outputFile = path.join(tracksDir, 'audioImports.js');

// Carpetas a ignorar
const IGNORED_FOLDERS = ['components', 'backups', 'node_modules', '.git', 'src'];

function findMP3Files(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // Ignorar carpetas específicas
      if (!IGNORED_FOLDERS.includes(entry.name) && !entry.name.startsWith('.')) {
        files.push(...findMP3Files(fullPath, baseDir));
      }
    } else if (entry.isFile() && /\.mp3$/i.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

function generateImportName(filePath) {
  // Generar un nombre de variable válido basado en la ruta
  const parts = filePath.split('/');
  const trackName = parts[0];
  const fileName = path.basename(filePath, '.mp3');
  
  // Limpiar el nombre del archivo para hacerlo válido como variable
  let varName = fileName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^[0-9]/, '_$&'); // Si empieza con número, agregar underscore
  
  // Si hay subcarpeta, incluirla en el nombre
  if (parts.length > 2) {
    const subfolder = parts[1].replace(/[^a-zA-Z0-9]/g, '_');
    varName = `${trackName}_${subfolder}_${varName}`;
  } else {
    varName = `${trackName}_${varName}`;
  }
  
  return varName;
}

function organizeByTrack(files) {
  const tracks = {};
  
  files.forEach(file => {
    const parts = file.split('/');
    const trackName = parts[0];
    const subfolder = parts.length > 2 ? parts[1] : '__root__';
    
    if (!tracks[trackName]) {
      tracks[trackName] = {};
    }
    
    if (!tracks[trackName][subfolder]) {
      tracks[trackName][subfolder] = [];
    }
    
    tracks[trackName][subfolder].push({
      path: file,
      importName: generateImportName(file)
    });
  });
  
  return tracks;
}

function generateImports(tracks) {
  let imports = [];
  let importsMap = {};
  
  // Generar todos los imports
  Object.keys(tracks).forEach(trackName => {
    Object.keys(tracks[trackName]).forEach(subfolder => {
      tracks[trackName][subfolder].forEach(audio => {
        const importName = audio.importName;
        const importPath = `./${audio.path}`;
        imports.push(`import ${importName} from '${importPath}';`);
        importsMap[`${trackName}_${subfolder}_${audio.path}`] = importName;
      });
    });
  });
  
  return { imports, importsMap };
}

function generateAudioImportsObject(tracks, importsMap) {
  let code = 'export const audioImports = {\n';
  
  Object.keys(tracks).sort().forEach(trackName => {
    code += `  '${trackName}': {\n`;
    
    const subfolders = Object.keys(tracks[trackName]).sort((a, b) => {
      if (a === '__root__') return -1;
      if (b === '__root__') return 1;
      return a.localeCompare(b);
    });
    
    subfolders.forEach(subfolder => {
      code += `    '${subfolder}': [`;
      const audios = tracks[trackName][subfolder];
      code += audios.map(audio => importsMap[`${trackName}_${subfolder}_${audio.path}`]).join(', ');
      code += '],\n';
    });
    
    code += '  },\n';
  });
  
  code += '};\n';
  return code;
}

// Ejecutar
console.log('Escaneando archivos MP3...');
const mp3Files = findMP3Files(tracksDir);
console.log(`Encontrados ${mp3Files.length} archivos MP3`);

const tracks = organizeByTrack(mp3Files);
console.log(`Organizados en ${Object.keys(tracks).length} tracks`);

const { imports, importsMap } = generateImports(tracks);

// Generar el contenido del archivo
let content = `// Imports estáticos de todos los archivos de audio
// Este archivo se genera automáticamente por generateAudioImports.js
// NO EDITAR MANUALMENTE - Ejecutar: node generateAudioImports.js

${imports.join('\n')}

${generateAudioImportsObject(tracks, importsMap)}

// Función helper para obtener audios de un track
export const getTrackAudios = (trackName) => {
  const normalizedName = trackName?.toLowerCase().replace(/\\s+/g, '-') || '';
  const trackKey = Object.keys(audioImports).find(key => 
    key.toLowerCase().replace(/\\s+/g, '-') === normalizedName
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
  const normalizedName = trackName?.toLowerCase().replace(/\\s+/g, '-') || '';
  const trackKey = Object.keys(audioImports).find(key => 
    key.toLowerCase().replace(/\\s+/g, '-') === normalizedName
  );
  
  if (!trackKey) return {};
  
  return audioImports[trackKey] || {};
};

export default audioImports;
`;

// Escribir el archivo
fs.writeFileSync(outputFile, content, 'utf8');
console.log(`✅ Archivo generado: ${outputFile}`);
console.log(`   ${imports.length} imports generados`);
console.log(`   ${Object.keys(tracks).length} tracks procesados`);

