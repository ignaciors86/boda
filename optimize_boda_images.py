import os
from PIL import Image
import sys

def optimize_image(input_path, output_path, max_width=1200, quality=80):
    """
    Optimiza una imagen reduciendo su tamaño y comprimiéndola sin pérdida de calidad visual.
    
    Args:
        input_path: Ruta de la imagen original
        output_path: Ruta donde guardar la imagen optimizada
        max_width: Ancho máximo en píxeles (por defecto 1920px)
        quality: Calidad JPEG (85 es un buen balance)
    """
    try:
        # Abrir la imagen
        img = Image.open(input_path)
        
        # Obtener dimensiones originales
        original_width, original_height = img.size
        
        # Calcular nuevas dimensiones manteniendo la proporción
        if original_width > max_width:
            ratio = max_width / original_width
            new_width = max_width
            new_height = int(original_height * ratio)
        else:
            new_width = original_width
            new_height = original_height
        
        # Convertir a RGB si es necesario (JPEG no soporta transparencia)
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Redimensionar si es necesario
        if new_width != original_width or new_height != original_height:
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Guardar con optimización y compresión más agresiva
        img.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
        
        # Obtener tamaños
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100
        
        return {
            'original_size': original_size,
            'new_size': new_size,
            'reduction': reduction,
            'original_dimensions': (original_width, original_height),
            'new_dimensions': (new_width, new_height)
        }
    except Exception as e:
        print(f"Error procesando {input_path}: {str(e)}")
        return None

def main():
    # Ruta de la carpeta Boda
    boda_folder = "src/components/Croquetas25/assets/tracks/Boda"
    
    if not os.path.exists(boda_folder):
        print(f"Error: La carpeta {boda_folder} no existe")
        sys.exit(1)
    
    # Obtener todas las imágenes JPG
    image_files = [f for f in os.listdir(boda_folder) 
                   if f.lower().endswith(('.jpg', '.jpeg'))]
    
    if not image_files:
        print("No se encontraron imágenes JPG en la carpeta")
        sys.exit(1)
    
    print(f"Encontradas {len(image_files)} imágenes para optimizar...")
    print("=" * 60)
    
    total_original_size = 0
    total_new_size = 0
    processed = 0
    
    # Crear carpeta de backup temporal
    backup_folder = os.path.join(boda_folder, "_backup_original")
    if not os.path.exists(backup_folder):
        os.makedirs(backup_folder)
        print(f"Creada carpeta de backup: {backup_folder}")
    
    for image_file in image_files:
        input_path = os.path.join(boda_folder, image_file)
        
        # Hacer backup del original
        backup_path = os.path.join(backup_folder, image_file)
        if not os.path.exists(backup_path):
            import shutil
            shutil.copy2(input_path, backup_path)
        
        # Optimizar
        result = optimize_image(input_path, input_path, max_width=1920, quality=85)
        
        if result:
            processed += 1
            total_original_size += result['original_size']
            total_new_size += result['new_size']
            
            print(f"{image_file}:")
            print(f"  Dimensiones: {result['original_dimensions']} -> {result['new_dimensions']}")
            print(f"  Tamaño: {result['original_size']/1024/1024:.2f} MB -> {result['new_size']/1024/1024:.2f} MB")
            print(f"  Reducción: {result['reduction']:.1f}%")
            print()
    
    print("=" * 60)
    print(f"Procesadas: {processed}/{len(image_files)} imágenes")
    print(f"Tamaño total original: {total_original_size/1024/1024:.2f} MB")
    print(f"Tamaño total optimizado: {total_new_size/1024/1024:.2f} MB")
    print(f"Reducción total: {((total_original_size - total_new_size) / total_original_size) * 100:.1f}%")
    print(f"\nBackups guardados en: {backup_folder}")

if __name__ == "__main__":
    main()

