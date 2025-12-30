#!/usr/bin/env node
/**
 * Script para generar automáticamente tracks-manifest.json
 * Escanea las carpetas de tracks y genera un manifest con todos los archivos
 * Ejecutar: node generateAudioImports.js
 */

const fs = require('fs');
const path = require('path');

const tracksDir = __dirname;
const manifestFile = path.join(tracksDir, 'tracks-manifest.json');

// Carpetas a ignorar
const IGNORED_FOLDERS = ['components', 'backups', 'node_modules', '.git', 'src', 'generateAudioImports.js', 'audioImports.js', 'tracks-manifest.json'];

function findFiles(dir, baseDir = dir, extensions = []) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // Ignorar carpetas específicas
      if (!IGNORED_FOLDERS.includes(entry.name) && !entry.name.startsWith('.')) {
        files.push(...findFiles(fullPath, baseDir, extensions));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.length === 0 || extensions.includes(ext)) {
        files.push(relativePath);
      }
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

function organizeByTrack(files, fileType = 'audio') {
  const tracks = {};
  
  files.forEach(file => {
    const parts = file.split('/');
    const trackName = parts[0];
    const subfolder = parts.length > 2 ? parts[1] : '__root__';
    
    if (!tracks[trackName]) {
      tracks[trackName] = {};
    }
    
    if (!tracks[trackName][subfolder]) {
      tracks[trackName][subfolder] = {};
    }
    
    if (!tracks[trackName][subfolder][fileType]) {
      tracks[trackName][subfolder][fileType] = [];
    }
    
    // URL pública: /tracks/ + ruta relativa (igual que el proyecto nuevo)
    const publicUrl = `/tracks/${file}`;
    
    tracks[trackName][subfolder][fileType].push({
      path: file,
      url: publicUrl, // URL absoluta desde public/tracks/
      name: path.basename(file)
    });
  });
  
  return tracks;
}

function mergeTracks(audioTracks, imageTracks, guionTracks) {
  const merged = {};
  
  // Combinar todos los tracks
  const allTrackNames = new Set([
    ...Object.keys(audioTracks),
    ...Object.keys(imageTracks),
    ...Object.keys(guionTracks)
  ]);
  
  allTrackNames.forEach(trackName => {
    merged[trackName] = {};
    
    // Obtener todas las subcarpetas
    const subfolders = new Set();
    if (audioTracks[trackName]) Object.keys(audioTracks[trackName]).forEach(sf => subfolders.add(sf));
    if (imageTracks[trackName]) Object.keys(imageTracks[trackName]).forEach(sf => subfolders.add(sf));
    if (guionTracks[trackName]) Object.keys(guionTracks[trackName]).forEach(sf => subfolders.add(sf));
    
    subfolders.forEach(subfolder => {
      merged[trackName][subfolder] = {
        audio: audioTracks[trackName]?.[subfolder]?.audio || [],
        images: imageTracks[trackName]?.[subfolder]?.images || [],
        guiones: guionTracks[trackName]?.[subfolder]?.guiones || []
      };
    });
  });
  
  return merged;
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
      const audios = tracks[trackName][subfolder].audio || [];
      code += audios.map(audio => importsMap[`${trackName}_${subfolder}_${audio.path}`]).join(', ');
      code += '],\n';
    });
    
    code += '  },\n';
  });
  
  code += '};\n';
  return code;
}

// Ejecutar
console.log('Escaneando archivos...');

// Buscar todos los tipos de archivos
const mp3Files = findFiles(tracksDir, tracksDir, ['.mp3']);
const imageFiles = findFiles(tracksDir, tracksDir, ['.jpg', '.jpeg', '.png', '.gif', '.webp']);
// Buscar guiones por nombre de archivo, no por extensión
const guionFiles = findFiles(tracksDir, tracksDir, []).filter(f => path.basename(f) === 'guion.js');

console.log(`Encontrados ${mp3Files.length} archivos MP3`);
console.log(`Encontrados ${imageFiles.length} archivos de imagen`);
console.log(`Encontrados ${guionFiles.length} archivos guion.js`);

// Organizar por tipo
const audioTracks = organizeByTrack(mp3Files, 'audio');
const imageTracks = organizeByTrack(imageFiles, 'images');
const guionTracks = organizeByTrack(guionFiles, 'guiones');

// Combinar todos los tracks
const allTracks = mergeTracks(audioTracks, imageTracks, guionTracks);

// Generar manifest JSON
const manifest = {
  generatedAt: new Date().toISOString(),
  tracks: allTracks
};

// Escribir el manifest en src y copiarlo a public
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`✅ Manifest generado: ${manifestFile}`);
console.log(`   ${Object.keys(allTracks).length} tracks procesados`);

// Copiar manifest a public/tracks/ para que sea accesible en runtime
const publicManifestFile = path.join(__dirname, '..', '..', '..', '..', 'public', 'tracks', 'tracks-manifest.json');
try {
  fs.copyFileSync(manifestFile, publicManifestFile);
  console.log(`✅ Manifest copiado a: ${publicManifestFile}`);
} catch (error) {
  console.warn(`⚠️  No se pudo copiar manifest a public:`, error.message);
}

// Generar audioImports.js con imports estáticos
const audioImportsFile = path.join(tracksDir, 'audioImports.js');
const audioFilesForImports = organizeByTrack(mp3Files, 'audio');

// Generar imports y mapeo
let importsCode = '// Imports estáticos de todos los archivos de audio\n';
importsCode += '// Este archivo se genera automáticamente por generateAudioImports.js\n';
importsCode += '// NO EDITAR MANUALMENTE - Ejecutar: node generateAudioImports.js\n\n';

const importsMap = {};
Object.keys(audioFilesForImports).forEach(trackName => {
  Object.keys(audioFilesForImports[trackName]).forEach(subfolder => {
    audioFilesForImports[trackName][subfolder].audio.forEach(audio => {
      const importName = generateImportName(audio.path);
      const importPath = audio.importPath || `./${audio.path}`;
      importsCode += `import ${importName} from '${importPath}';\n`;
      const key = `${trackName}_${subfolder}_${audio.path}`;
      importsMap[key] = importName;
    });
  });
});

importsCode += '\n';
importsCode += generateAudioImportsObject(audioFilesForImports, importsMap);
importsCode += '\n\n';
importsCode += '// Función helper para obtener audios de un track\n';
importsCode += 'export const getTrackAudios = (trackName) => {\n';
importsCode += '  const track = audioImports[trackName];\n';
importsCode += '  if (!track) return [];\n';
importsCode += '  const allAudios = [];\n';
importsCode += '  Object.keys(track).forEach(subfolder => {\n';
importsCode += '    allAudios.push(...track[subfolder]);\n';
importsCode += '  });\n';
importsCode += '  return allAudios;\n';
importsCode += '};\n';

fs.writeFileSync(audioImportsFile, importsCode, 'utf8');
console.log(`✅ audioImports.js generado: ${audioImportsFile}`);

