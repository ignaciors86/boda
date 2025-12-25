#!/usr/bin/env python3
"""
Script para convertir imágenes JPEG a WebP y redimensionar si es necesario
- Convierte todos los JPEG a WebP (independientemente del tamaño)
- Redimensiona a 350px de altura máximo solo si la imagen es más grande
- No redimensiona imágenes que ya sean <= 350px
- Guarda backups en una carpeta centralizada 'backups'
- Busca recursivamente en subcarpetas
- Convierte videos a GIF (5 segundos desde la mitad del video)
"""

import os
import sys
from PIL import Image
import shutil
from pathlib import Path
import subprocess

# Configuración
TARGET_HEIGHT = 350  # Altura máxima en píxeles
WEBP_QUALITY = 90  # Calidad WebP (80-100, 90 es un buen balance)
BACKUP_DIR_NAME = "backups"  # Carpeta centralizada para backups
GIF_DURATION = 5  # Duración del GIF en segundos (desde la mitad del video)

# Extensiones JPEG
JPEG_EXTENSIONS = ['.jpg', '.jpeg', '.JPG', '.JPEG']

# Extensiones de video
VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.MP4', '.MOV', '.AVI', '.MKV', '.WEBM']

def is_jpeg_file(file_path):
    """Verifica si un archivo es JPEG"""
    file_path_str = str(file_path).lower()
    return any(file_path_str.endswith(ext.lower()) for ext in JPEG_EXTENSIONS)

def convert_and_resize_image(input_path, output_path, target_height=TARGET_HEIGHT, quality=WEBP_QUALITY):
    """Convierte JPEG a WebP y redimensiona si es necesario"""
    try:
        with Image.open(input_path) as img:
            # Obtener dimensiones originales
            original_width, original_height = img.size
            needs_resize = original_height > target_height
            
            # Redimensionar si es necesario
            if needs_resize:
                # Calcular nuevas dimensiones manteniendo proporción
                new_height = target_height
                new_width = int((original_width / original_height) * target_height)
                
                # Redimensionar con alta calidad (LANCZOS es el mejor algoritmo)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                final_dimensions = img.size
            else:
                final_dimensions = (original_width, original_height)
            
            # Convertir a RGB si es necesario (WebP requiere RGB para imágenes sin transparencia)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Si tiene transparencia, mantenerla (RGBA)
                if img.mode == 'RGBA':
                    pass  # Mantener RGBA para WebP
                else:
                    img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Guardar como WebP
            output_path_webp = output_path.with_suffix('.webp')
            img.save(output_path_webp, 'WEBP', quality=quality, method=6)
            
            # Obtener tamaños de archivo
            original_size = os.path.getsize(input_path)
            new_size = os.path.getsize(output_path_webp)
            reduction = ((original_size - new_size) / original_size) * 100 if original_size > 0 else 0
            
            return {
                'success': True,
                'converted': True,
                'resized': needs_resize,
                'original_size': original_size,
                'new_size': new_size,
                'reduction': reduction,
                'original_dimensions': (original_width, original_height),
                'new_dimensions': final_dimensions,
                'output_path': output_path_webp
            }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_video_duration(video_path):
    """Obtiene la duración de un video en segundos usando ffprobe"""
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(video_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        return None

def convert_video_to_gif(video_path, output_path, duration=GIF_DURATION):
    """Convierte un video a GIF (5 segundos desde la mitad del video)"""
    try:
        # Intentar obtener duración del video
        video_duration = get_video_duration(video_path)
        
        # Si no podemos obtener la duración, usar un punto de inicio estimado
        # Asumimos que el video tiene al menos 10 segundos y extraemos desde el segundo 5
        if video_duration is None:
            # Usar un punto medio estimado (desde el segundo 5)
            start_time = 5.0
            print(f"    Advertencia: No se pudo obtener duración de {video_path.name}, usando tiempo estimado")
        else:
            # Calcular punto de inicio (mitad del video menos la mitad de la duración del GIF)
            start_time = max(0, (video_duration / 2) - (duration / 2))
        
        # Usar ffmpeg para convertir a GIF
        # Primero convertir a GIF usando palette para mejor calidad
        palette_path = output_path.parent / f'{output_path.stem}_palette.png'
        
        # Generar palette - usar -ss antes de -i para mejor rendimiento
        palette_cmd = [
            'ffmpeg',
            '-y',  # Sobrescribir si existe
            '-ss', str(start_time),  # Empezar en la mitad
            '-i', str(video_path),
            '-t', str(duration),  # Duración del GIF
            '-vf', 'fps=10,scale=350:-1:flags=lanczos,palettegen',
            str(palette_path)
        ]
        
        # Ejecutar con stderr capturado para evitar errores en consola
        result = subprocess.run(palette_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            # Si falla, intentar sin especificar tiempo de inicio (extraer desde el principio)
            palette_cmd_alt = [
                'ffmpeg',
                '-y',
                '-i', str(video_path),
                '-t', str(duration),
                '-vf', 'fps=10,scale=350:-1:flags=lanczos,palettegen',
                str(palette_path)
            ]
            result = subprocess.run(palette_cmd_alt, capture_output=True, text=True)
            if result.returncode != 0:
                return {'success': False, 'error': f'Error al generar palette: {result.stderr}'}
        
        # Convertir a GIF usando la palette
        gif_cmd = [
            'ffmpeg',
            '-y',
            '-ss', str(start_time),
            '-i', str(video_path),
            '-t', str(duration),
            '-i', str(palette_path),
            '-lavfi', 'fps=10,scale=350:-1:flags=lanczos[x];[x][1:v]paletteuse',
            str(output_path)
        ]
        
        result = subprocess.run(gif_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            # Si falla, intentar sin especificar tiempo de inicio
            gif_cmd_alt = [
                'ffmpeg',
                '-y',
                '-i', str(video_path),
                '-t', str(duration),
                '-i', str(palette_path),
                '-lavfi', 'fps=10,scale=350:-1:flags=lanczos[x];[x][1:v]paletteuse',
                str(output_path)
            ]
            result = subprocess.run(gif_cmd_alt, capture_output=True, text=True)
            if result.returncode != 0:
                # Limpiar palette si falla
                if palette_path.exists():
                    palette_path.unlink()
                return {'success': False, 'error': f'Error al convertir a GIF: {result.stderr}'}
        
        # Eliminar palette temporal
        if palette_path.exists():
            palette_path.unlink()
        
        # Verificar que el GIF se creó correctamente
        if not output_path.exists():
            return {'success': False, 'error': 'El archivo GIF no se creó'}
        
        # Obtener tamaños
        original_size = os.path.getsize(video_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100 if original_size > 0 else 0
        
        return {
            'success': True,
            'converted': True,
            'original_size': original_size,
            'new_size': new_size,
            'reduction': reduction,
            'output_path': output_path
        }
    except FileNotFoundError:
        return {'success': False, 'error': 'ffmpeg no está instalado o no está en el PATH'}
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        return {'success': False, 'error': f'Error en ffmpeg: {error_msg}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def process_folder(folder_path, central_backup_dir, recursive=True):
    """Procesa todas las imágenes JPEG y videos de una carpeta (recursivamente)"""
    folder_path = Path(folder_path)
    
    # Obtener todas las imágenes JPEG recursivamente
    images = []
    if recursive:
        for ext in JPEG_EXTENSIONS:
            images.extend(list(folder_path.rglob(f'*{ext}')))
    else:
        for ext in JPEG_EXTENSIONS:
            images.extend(list(folder_path.glob(f'*{ext}')))
    
    # Obtener todos los videos recursivamente
    videos = []
    if recursive:
        for ext in VIDEO_EXTENSIONS:
            videos.extend(list(folder_path.rglob(f'*{ext}')))
    else:
        for ext in VIDEO_EXTENSIONS:
            videos.extend(list(folder_path.glob(f'*{ext}')))
    
    # Filtrar solo archivos que existan y no sean del backup
    images = [img for img in images 
              if img.exists() 
              and BACKUP_DIR_NAME not in img.parts
              and img.name != 'resize_all_images.py']
    
    videos = [vid for vid in videos 
              if vid.exists() 
              and BACKUP_DIR_NAME not in vid.parts
              and vid.name != 'resize_all_images.py']
    
    if not images and not videos:
        return {
            'processed': 0, 'converted': 0, 'resized': 0, 'failed': 0,
            'videos_processed': 0, 'videos_converted': 0, 'videos_failed': 0,
            'total_original': 0, 'total_new': 0
        }
    
    converted = 0
    resized = 0
    failed = 0
    videos_processed = 0
    videos_converted = 0
    videos_failed = 0
    total_original_size = 0
    total_new_size = 0
    
    # Procesar imágenes
    for img_path in images:
        # Crear path del backup en la carpeta centralizada
        # Mantener estructura: backups/NombreCarpeta/NombreArchivo.jpg
        folder_name = folder_path.name
        backup_file = central_backup_dir / folder_name / img_path.name
        
        # Crear directorio de backup si no existe
        backup_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Hacer backup del original si no existe
        if not backup_file.exists():
            try:
                shutil.copy2(img_path, backup_file)
            except Exception as e:
                print(f"    Error al hacer backup de {img_path.name}: {e}")
        
        # Convertir y redimensionar
        result = convert_and_resize_image(img_path, img_path, TARGET_HEIGHT, WEBP_QUALITY)
        
        if result['success']:
            converted += 1
            if result.get('resized', False):
                resized += 1
            
            total_original_size += result['original_size']
            total_new_size += result['new_size']
            
            # Eliminar el archivo JPEG original después de convertir
            if result.get('output_path') and result['output_path'].exists():
                try:
                    if img_path.exists() and img_path != result['output_path']:
                        os.remove(img_path)
                except Exception as e:
                    print(f"    Advertencia: No se pudo eliminar {img_path.name}: {e}")
        else:
            failed += 1
            # Mostrar los primeros 3 errores para diagnóstico
            if failed <= 3:
                print(f"    Error en {img_path.name}: {result.get('error', 'Error desconocido')}")
    
    # Procesar videos
    for video_path in videos:
        videos_processed += 1
        # Crear path del backup en la carpeta centralizada
        folder_name = folder_path.name
        backup_file = central_backup_dir / folder_name / video_path.relative_to(folder_path)
        
        # Crear directorio de backup si no existe
        backup_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Hacer backup del original si no existe
        if not backup_file.exists():
            try:
                shutil.copy2(video_path, backup_file)
            except Exception as e:
                print(f"    Error al hacer backup de {video_path.name}: {e}")
        
        # Convertir a GIF
        gif_path = video_path.with_suffix('.gif')
        result = convert_video_to_gif(video_path, gif_path, GIF_DURATION)
        
        if result['success']:
            videos_converted += 1
            total_original_size += result['original_size']
            total_new_size += result['new_size']
            
            # No eliminar el video original, solo crear el GIF
            print(f"    ✓ {video_path.name} -> {gif_path.name}")
        else:
            videos_failed += 1
            # Mostrar los primeros 3 errores para diagnóstico
            if videos_failed <= 3:
                print(f"    Error en {video_path.name}: {result.get('error', 'Error desconocido')}")
    
    return {
        'processed': len(images),
        'converted': converted,
        'resized': resized,
        'failed': failed,
        'videos_processed': videos_processed,
        'videos_converted': videos_converted,
        'videos_failed': videos_failed,
        'total_original': total_original_size,
        'total_new': total_new_size
    }

def main():
    # Directorio base de tracks
    tracks_dir = Path(__file__).parent
    
    # Crear carpeta centralizada de backups
    central_backup_dir = tracks_dir / BACKUP_DIR_NAME
    if not central_backup_dir.exists():
        central_backup_dir.mkdir()
        print(f"Creada carpeta centralizada de backups: {BACKUP_DIR_NAME}/")
    
    # Obtener todas las carpetas de colecciones (excluir backups, Cachitos25 y src)
    collection_folders = [f for f in tracks_dir.iterdir() 
                         if f.is_dir() 
                         and f.name not in ['Croquetas25', 'src', BACKUP_DIR_NAME]
                         and not f.name.startswith('_')]
    
    if not collection_folders:
        print("No se encontraron carpetas de colecciones.")
        return
    
    print(f"Encontradas {len(collection_folders)} carpetas de colecciones.")
    print(f"Conversión: JPEG -> WebP")
    print(f"Redimensionamiento: Solo si altura > {TARGET_HEIGHT}px (altura máxima: {TARGET_HEIGHT}px)")
    print(f"Calidad WebP: {WEBP_QUALITY}")
    print(f"Videos: Convertir a GIF ({GIF_DURATION}s desde la mitad)")
    print(f"Búsqueda: Recursiva en subcarpetas")
    print(f"Backups guardados en: {BACKUP_DIR_NAME}/")
    print("=" * 70)
    
    total_processed = 0
    total_converted = 0
    total_resized = 0
    total_failed = 0
    total_videos_processed = 0
    total_videos_converted = 0
    total_videos_failed = 0
    grand_total_original = 0
    grand_total_new = 0
    
    for folder in collection_folders:
        print(f"\nProcesando: {folder.name}")
        print("-" * 70)
        
        result = process_folder(folder, central_backup_dir, recursive=True)
        
        total_processed += result['processed']
        total_converted += result['converted']
        total_resized += result['resized']
        total_failed += result['failed']
        total_videos_processed += result.get('videos_processed', 0)
        total_videos_converted += result.get('videos_converted', 0)
        total_videos_failed += result.get('videos_failed', 0)
        grand_total_original += result['total_original']
        grand_total_new += result['total_new']
        
        has_images = result['processed'] > 0
        has_videos = result.get('videos_processed', 0) > 0
        
        if has_images:
            print(f"  Imágenes JPEG encontradas: {result['processed']}")
            print(f"  Convertidas a WebP: {result['converted']}")
            print(f"  Redimensionadas (altura > {TARGET_HEIGHT}px): {result['resized']}")
            print(f"  Fallidas: {result['failed']}")
        
        if has_videos:
            print(f"  Videos encontrados: {result.get('videos_processed', 0)}")
            print(f"  Convertidos a GIF: {result.get('videos_converted', 0)}")
            print(f"  Fallidos: {result.get('videos_failed', 0)}")
        
        if has_images or has_videos:
            if result['converted'] > 0 or result.get('videos_converted', 0) > 0:
                folder_reduction = ((result['total_original'] - result['total_new']) / result['total_original']) * 100 if result['total_original'] > 0 else 0
                folder_reduction_mb = (result['total_original'] - result['total_new']) / (1024 * 1024)
                print(f"  Reducción de tamaño: {folder_reduction_mb:.2f} MB ({folder_reduction:.1f}%)")
        else:
            print(f"  No se encontraron archivos JPEG o videos en esta carpeta.")
        
        # Eliminar todos los archivos originales residuales (JPEG y videos) al final
        print(f"  Limpiando archivos originales residuales...")
        deleted_count = 0
        deleted_size = 0
        
        # Buscar y eliminar todos los JPEG residuales (siempre recursivo)
        for ext in JPEG_EXTENSIONS:
            jpeg_files = list(folder.rglob(f'*{ext}'))
            
            for jpeg_file in jpeg_files:
                if (jpeg_file.exists() 
                    and BACKUP_DIR_NAME not in jpeg_file.parts
                    and jpeg_file.name != 'resize_all_images.py'):
                    try:
                        file_size = os.path.getsize(jpeg_file)
                        os.remove(jpeg_file)
                        deleted_count += 1
                        deleted_size += file_size
                    except Exception as e:
                        print(f"    Advertencia: No se pudo eliminar {jpeg_file.name}: {e}")
        
        # Buscar y eliminar todos los videos residuales (siempre recursivo)
        for ext in VIDEO_EXTENSIONS:
            video_files = list(folder.rglob(f'*{ext}'))
            
            for video_file in video_files:
                if (video_file.exists() 
                    and BACKUP_DIR_NAME not in video_file.parts
                    and video_file.name != 'resize_all_images.py'):
                    try:
                        file_size = os.path.getsize(video_file)
                        os.remove(video_file)
                        deleted_count += 1
                        deleted_size += file_size
                    except Exception as e:
                        print(f"    Advertencia: No se pudo eliminar {video_file.name}: {e}")
        
        if deleted_count > 0:
            print(f"  Archivos originales eliminados: {deleted_count} ({deleted_size / (1024 * 1024):.2f} MB)")
    
    print("\n" + "=" * 70)
    print("RESUMEN GENERAL:")
    print(f"  Carpetas procesadas: {len(collection_folders)}")
    print(f"  Total archivos JPEG encontrados: {total_processed}")
    print(f"  Convertidos a WebP: {total_converted}")
    print(f"  Redimensionados: {total_resized}")
    print(f"  Fallidos: {total_failed}")
    print(f"  Total videos encontrados: {total_videos_processed}")
    print(f"  Convertidos a GIF: {total_videos_converted}")
    print(f"  Videos fallidos: {total_videos_failed}")
    if total_converted > 0 or total_videos_converted > 0:
        grand_reduction = ((grand_total_original - grand_total_new) / grand_total_original) * 100 if grand_total_original > 0 else 0
        grand_reduction_mb = (grand_total_original - grand_total_new) / (1024 * 1024)
        print(f"  Tamaño original total: {grand_total_original / (1024 * 1024):.2f} MB")
        print(f"  Tamaño convertido total: {grand_total_new / (1024 * 1024):.2f} MB")
        print(f"  Reducción total: {grand_reduction_mb:.2f} MB ({grand_reduction:.1f}%)")
    print(f"\nBackups guardados en: {BACKUP_DIR_NAME}/")
    print(f"Puedes eliminar la carpeta '{BACKUP_DIR_NAME}/' después de verificar que todo funciona correctamente.")

if __name__ == '__main__':
    # Configurar encoding para Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    main()
