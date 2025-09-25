from PIL import Image
from os import path
import os, math
import json


def legacy_tile_split(sciezka_do_obrazu, folder, rozmiar_kafelka=256):
    try:
        obraz = Image.open(sciezka_do_obrazu)
    except FileNotFoundError:
        return None

    szerokosc, wysokosc = obraz.size
    z = math.ceil(math.log2(max(szerokosc, wysokosc) // rozmiar_kafelka))
    max_zoom = z
    skala = 1

    while z >= 0:
        x_kafelki = math.ceil(szerokosc // skala / rozmiar_kafelka)
        y_kafelki = math.ceil(wysokosc // skala / rozmiar_kafelka)
        obraz = obraz.resize((szerokosc // skala, wysokosc // skala), resample=Image.Resampling.LANCZOS)
        if z==0:
            obraz.save(folder + "/preview.jpg","JPEG")
        for y in range(y_kafelki):
            for x in range(x_kafelki):
                lewy = x * rozmiar_kafelka
                gorny = y * rozmiar_kafelka
                prawy = lewy + rozmiar_kafelka
                dolny = gorny + rozmiar_kafelka
                os.makedirs(f"{folder}/{z}/{x}", exist_ok=True)

                file_name = f"{folder}/{z}/{x}/{y}.jpg"
                if not os.path.exists(file_name):
                    kafelek = obraz.crop((lewy, gorny, prawy, dolny))
                    # if skala!=1:
                    kafelek.save(file_name, "JPEG")
        skala = skala * 2
        z = z - 1
    metadata = dict(max_zoom=max_zoom, width=szerokosc, height=wysokosc, tile_size=rozmiar_kafelka)
    metadata_file = path.join(folder, "config.json")
    with open(metadata_file, "w") as f:
        json.dump(metadata, f)
