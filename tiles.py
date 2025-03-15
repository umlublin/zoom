from PIL import Image, UnidentifiedImageError
from os import path
import os, math
import json
import uuid
from flask import abort

Image.MAX_IMAGE_PIXELS = int(512 * 1024 * 1024) # 512 MB  

def tile_split(sciezka_do_obrazu, tile_size=256):
    try:
        obraz = Image.open(sciezka_do_obrazu)
    except FileNotFoundError:
        abort(400, description="Image not found")
    except UnidentifiedImageError:
        abort(400, description="Image not recognized")


    uuid4 = str(uuid.uuid4())
    szerokosc, wysokosc = obraz.size
    if (szerokosc * wysokosc) > Image.MAX_IMAGE_PIXELS:
        abort(400, description="Image too large to process")
    if (szerokosc < 1000 or wysokosc < 1000):
        abort(400, description="Image too small to process") 

    folder=f"tiles/{uuid4}"
    if not os.path.exists(folder):
        os.makedirs(folder)

    z = math.ceil(math.log2(max(szerokosc, wysokosc) // tile_size))
    max_zoom=z
    skala = 1
    x_kafelki = szerokosc // tile_size
    y_kafelki = wysokosc // tile_size
 
    while z>=0:
      x_kafelki = math.ceil(szerokosc // skala / tile_size)
      y_kafelki = math.ceil(wysokosc // skala / tile_size)
      obraz=obraz.resize((szerokosc // skala, wysokosc // skala), resample=Image.Resampling.LANCZOS)
      for y in range(y_kafelki):
        for x in range(x_kafelki):
            lewy = x * tile_size
            gorny = y * tile_size
            prawy = lewy + tile_size
            dolny = gorny + tile_size
            os.makedirs(f"{folder}/{z}/{x}", exist_ok=True)

            file_name = f"{folder}/{z}/{x}/{y}.png"
            if not os.path.exists(file_name):
              kafelek = obraz.crop((lewy, gorny, prawy, dolny))
              #if skala!=1:
              kafelek.save(file_name, "PNG")
      skala=skala*2
      z = z-1
    obraz.save(f"{folder}/preview.png", "PNG")
    metadata = dict(uuid=uuid4, max_zoom=max_zoom, min_zoom=2, width=szerokosc, height=wysokosc, tile_size=tile_size)
    metadata_file = path.join(folder, "config.json")
    with open(metadata_file, "w") as f:
        json.dump(metadata, f)
    return metadata