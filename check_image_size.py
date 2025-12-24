from PIL import Image
import os

img_path = "src/components/Croquetas25/assets/tracks/Boda/NYM001 IMG_8833.jpg"
img = Image.open(img_path)
print(f"Dimensiones: {img.size}")
print(f"Tamaño archivo: {os.path.getsize(img_path)/1024/1024:.2f} MB")
print(f"Modo: {img.mode}")

