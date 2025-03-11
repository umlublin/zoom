#!./bin/python3 -u

from PIL import Image
import os, math

def podziel_obraz_na_kafelki(sciezka_do_obrazu, rozmiar_kafelka=256):
    try:
        obraz = Image.open(sciezka_do_obrazu)
    except FileNotFoundError:
        print(f"Błąd: Nie znaleziono pliku: {sciezka_do_obrazu}")
        return

    szerokosc, wysokosc = obraz.size
    print(f"{szerokosc} * {wysokosc} pixeli")

    folder="output"
    if not os.path.exists(folder):
        os.makedirs(folder)

    z = int(math.log2(max(szerokosc, wysokosc) // rozmiar_kafelka))
    skala = 1
    x_kafelki = szerokosc // rozmiar_kafelka
    y_kafelki = wysokosc // rozmiar_kafelka
 
    while y_kafelki>1 and x_kafelki>1:
      print(f"Skala: {skala}")
      x_kafelki = math.ceil(szerokosc // skala / rozmiar_kafelka)
      y_kafelki = math.ceil(wysokosc // skala / rozmiar_kafelka)
      print(f"{x_kafelki} * {y_kafelki} kafelkow")
      obraz=obraz.resize((szerokosc // skala, wysokosc // skala), resample=Image.Resampling.LANCZOS)
      print("Tworzenie kafelków")
      for y in range(y_kafelki):
        for x in range(x_kafelki):
            lewy = x * rozmiar_kafelka
            gorny = y * rozmiar_kafelka
            prawy = lewy + rozmiar_kafelka
            dolny = gorny + rozmiar_kafelka
            os.makedirs(f"{folder}/{z}/{x}", exist_ok=True)

            file_name = f"{folder}/{z}/{x}/{y}.png"
            if not os.path.exists(file_name):
              print(".",end="")
              kafelek = obraz.crop((lewy, gorny, prawy, dolny))
              #if skala!=1:
              kafelek.save(file_name, "PNG")
      skala=skala*2
      z = z-1


sciezka_do_obrazu = "demo.jpg" 
podziel_obraz_na_kafelki(sciezka_do_obrazu)