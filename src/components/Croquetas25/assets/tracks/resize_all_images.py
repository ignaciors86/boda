#!/usr/bin/env python3
"""
Script para convertir imágenes JPEG a WebP y redimensionar si es necesario
- Convierte todos los JPEG a WebP (independientemente del tamaño)
- Redimensiona a 350px de altura máximo solo si la imagen es más grande
- No redimensiona imágenes que ya sean <= 350px
- Guarda backups en una carpeta centralizada 'backups'
"""

import os
import sys
from PIL import Image
import shutil
from pathlib import Path

# Configuración
TARGET_HEIGHT = 350  # Altura máxima en píxeles
WEBP_QUALITY = 90  # Calidad WebP (80-100, 90 es un buen balance)
BACKUP_DIR_NAME = "backups"  # Carpeta centralizada para backups

# Extensiones JPEG
JPEG_EXTENSIONS = ['.jpg', '.jpeg', '.JPG', '.JPEG']

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

def process_folder(folder_path, central_backup_dir):
    """Procesa todas las imágenes JPEG de una carpeta"""
    folder_path = Path(folder_path)
    
    # Obtener todas las imágenes JPEG
    images = []
    for ext in JPEG_EXTENSIONS:
        images.extend(list(folder_path.glob(f'*{ext}')))
    
    # Filtrar solo archivos que existan y no sean del backup
    images = [img for img in images 
              if img.exists() 
              and BACKUP_DIR_NAME not in img.parts
              and img.name != 'resize_all_images.py']
    
    if not images:
        return {'processed': 0, 'converted': 0, 'resized': 0, 'failed': 0, 'total_original': 0, 'total_new': 0}
    
    converted = 0
    resized = 0
    failed = 0
    total_original_size = 0
    total_new_size = 0
    
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
    
    return {
        'processed': len(images),
        'converted': converted,
        'resized': resized,
        'failed': failed,
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
    print(f"Backups guardados en: {BACKUP_DIR_NAME}/")
    print("=" * 70)
    
    total_processed = 0
    total_converted = 0
    total_resized = 0
    total_failed = 0
    grand_total_original = 0
    grand_total_new = 0
    
    for folder in collection_folders:
        print(f"\nProcesando: {folder.name}")
        print("-" * 70)
        
        result = process_folder(folder, central_backup_dir)
        
        total_processed += result['processed']
        total_converted += result['converted']
        total_resized += result['resized']
        total_failed += result['failed']
        grand_total_original += result['total_original']
        grand_total_new += result['total_new']
        
        if result['processed'] > 0:
            print(f"  Imágenes JPEG encontradas: {result['processed']}")
            print(f"  Convertidas a WebP: {result['converted']}")
            print(f"  Redimensionadas (altura > {TARGET_HEIGHT}px): {result['resized']}")
            print(f"  Fallidas: {result['failed']}")
            if result['converted'] > 0:
                folder_reduction = ((result['total_original'] - result['total_new']) / result['total_original']) * 100 if result['total_original'] > 0 else 0
                folder_reduction_mb = (result['total_original'] - result['total_new']) / (1024 * 1024)
                print(f"  Reducción de tamaño: {folder_reduction_mb:.2f} MB ({folder_reduction:.1f}%)")
        else:
            print(f"  No se encontraron archivos JPEG en esta carpeta.")
    
    print("\n" + "=" * 70)
    print("RESUMEN GENERAL:")
    print(f"  Carpetas procesadas: {len(collection_folders)}")
    print(f"  Total archivos JPEG encontrados: {total_processed}")
    print(f"  Convertidos a WebP: {total_converted}")
    print(f"  Redimensionados: {total_resized}")
    print(f"  Fallidos: {total_failed}")
    if total_converted > 0:
        grand_reduction = ((grand_total_original - grand_total_new) / grand_total_original) * 100 if grand_total_original > 0 else 0
        grand_reduction_mb = (grand_total_original - grand_total_new) / (1024 * 1024)
        print(f"  Tamaño original total: {grand_total_original / (1024 * 1024):.2f} MB")
        print(f"  Tamaño WebP total: {grand_total_new / (1024 * 1024):.2f} MB")
        print(f"  Reducción total: {grand_reduction_mb:.2f} MB ({grand_reduction:.1f}%)")
    print(f"\nBackups guardados en: {BACKUP_DIR_NAME}/")
    print(f"Puedes eliminar la carpeta '{BACKUP_DIR_NAME}/' después de verificar que todo funciona correctamente.")

if __name__ == '__main__':
    # Configurar encoding para Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    main()
