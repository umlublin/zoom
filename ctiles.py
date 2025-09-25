from os import path, environ as env
import os
import json
import uuid

def tile_split(temp_file, DATA_ROOT):
    uuid4 = str(uuid.uuid4())
    folder=DATA_ROOT + f"tiles/{uuid4}"
    if not os.path.exists(folder):
        os.makedirs(folder)

    image_path= folder+"/full.jpg"
    if isinstance(temp_file, str):
        os.rename(temp_file, image_path)
    else:
        temp_file.save(image_path)

    if env.get("LEGACY_TILES"):
        from legacy_tiles import legacy_tile_split
        legacy_tile_split(image_path, folder)
    else:
        os.system(f"/home/zoom/make_tiles '{image_path}' {folder}")

#   metadata = dict(uuid=uuid4, max_zoom=max_zoom, min_zoom=2, width=szerokosc, height=wysokosc, tile_size=tile_size)
    metadata_file = path.join(folder, "config.json")
    with open(metadata_file, "r") as f:
        metadata=json.load(f)
    metadata['uuid']=uuid4
    metadata['min_zoom']=2
    return metadata

