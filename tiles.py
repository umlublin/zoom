from PIL import Image
from os import path
import os, math
import json
import uuid

def tile_split(sciezka_do_obrazu, rozmiar_kafelka=256):
    try:
        obraz = Image.open(sciezka_do_obrazu)
    except FileNotFoundError:
          return None

    uuid4 = str(uuid.uuid4())
    szerokosc, wysokosc = obraz.size
    folder=f"tiles/{uuid4}"
    if not os.path.exists(folder):
        os.makedirs(folder)

    z = math.ceil(math.log2(max(szerokosc, wysokosc) // rozmiar_kafelka))
    max_zoom=z
    skala = 1
    x_kafelki = szerokosc // rozmiar_kafelka
    y_kafelki = wysokosc // rozmiar_kafelka
 
    while z>=0:
      x_kafelki = math.ceil(szerokosc // skala / rozmiar_kafelka)
      y_kafelki = math.ceil(wysokosc // skala / rozmiar_kafelka)
      obraz=obraz.resize((szerokosc // skala, wysokosc // skala), resample=Image.Resampling.LANCZOS)
      for y in range(y_kafelki):
        for x in range(x_kafelki):
            lewy = x * rozmiar_kafelka
            gorny = y * rozmiar_kafelka
            prawy = lewy + rozmiar_kafelka
            dolny = gorny + rozmiar_kafelka
            os.makedirs(f"{folder}/{z}/{x}", exist_ok=True)

            file_name = f"{folder}/{z}/{x}/{y}.png"
            if not os.path.exists(file_name):
              kafelek = obraz.crop((lewy, gorny, prawy, dolny))
              #if skala!=1:
              kafelek.save(file_name, "PNG")
      skala=skala*2
      z = z-1
    metadata = dict(uuid=uuid4, maxZoom=max_zoom, minZoom=2, width=szerokosc, height=wysokosc, tileSize=rozmiar_kafelka)
    metadata_file = path.join(folder, "config.json")
    with open(metadata_file, "w") as f:
        json.dump(metadata, f)
    return metadata