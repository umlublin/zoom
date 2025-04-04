from os import path
import os, math
import json
import uuid
from flask import abort

def tile_split(temp_file):
    uuid4 = str(uuid.uuid4())
    folder=f"tiles/{uuid4}"
    if not os.path.exists(folder):
        os.makedirs(folder)

    image_path= folder+"/full.jpg"
    temp_file.save(image_path)

    os.system(f"/home/zoom/make_tiles '{image_path}' {folder}")

#   metadata = dict(uuid=uuid4, max_zoom=max_zoom, min_zoom=2, width=szerokosc, height=wysokosc, tile_size=tile_size)
    metadata_file = path.join(folder, "config.json")
    with open(metadata_file, "r") as f:
        metadata=json.load(f)
    metadata['uuid']=uuid4;
    metadata['min_zoom']=2;
    return metadata

def tile_split_file(temp_file):
    uuid4 = str(uuid.uuid4())
    folder=f"tiles/{uuid4}"
    if not os.path.exists(folder):
        os.makedirs(folder)

    image_path= folder+"/full.jpg"
    os.rename(temp_file, image_path)

    os.system(f"/home/zoom/make_tiles '{image_path}' {folder}")

#   metadata = dict(uuid=uuid4, max_zoom=max_zoom, min_zoom=2, width=szerokosc, height=wysokosc, tile_size=tile_size)
    metadata_file = path.join(folder, "config.json")
    with open(metadata_file, "r") as f:
        metadata=json.load(f)
    metadata['uuid']=uuid4;
    metadata['min_zoom']=2;
    return metadata
    
