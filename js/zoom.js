const overlay = document.getElementById('overlay');
// Marker form
const markerForm = document.getElementById('marker-form');
const markerTitleInput = document.getElementById('marker-title');
const markerDescriptionInput = document.getElementById('marker-description');
const markerIconDiv = document.getElementById('marker-icon');
// Image form
const imageForm = document.getElementById('image-form');

// Variables
let markers = [];
let currentMarker = null;
let selectedIcon = 'default';
let config = {};
let icons = {};
let userdata = {}
let imageTypes = {};

// Fetch userdata
fetch('api/userdata.json')
    .then(response => response.json())
    .then(data => {
        userdata = data;
    })
    .catch(error => console.error('Error loading userdata:', error));

// Fetch image types
fetch('api/types.json')
    .then(response => response.json())
    .then(data => {
        imageTypes = data;
    })
    .catch(error => console.error('Error loading userdata:', error));

// Fetch icons configuration
fetch('icons/icons.json')
    .then(response => response.json())
    .then(data => {
        //console.log(data);
        icons = Object.keys(data).reduce((acc, key) => {
            acc[key] = L.icon(data[key]);
            return acc;
        }, {});
        loadMapConfig();
        loadIconsToDiv(data);
    })
    .catch(error => console.error('Error loading icons:', error));

function loadMapConfig() {
    const target = window.location.hash.substring(1);
    if (target == '') target = "default";
    fetch(`zoom/${target}.json`)
        .then(response => response.json())
        .then(config_json => {
                config = config_json;
                document.title = `Mark & Zoom : ${config.description}`;
                // document.getElementById("title").innerHTML = config.title;
                initMap(target, config)
            }
        )
        .catch(error => console.error(error));
}


function loadIconsToDiv(data) {
    markerIconDiv.innerHTML = ''; // Clear existing icons
    Object.keys(data).forEach(iconName => {
        const iconOption = document.createElement('div');
        iconOption.classList.add('icon-option');
        iconOption.setAttribute('data-icon', iconName);
        iconOption.innerHTML = `<img src="${data[iconName].iconUrl}" alt="${iconName}">`;
        markerIconDiv.appendChild(iconOption);
    });
    // Re-attach event listeners to the new icon options
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', function () {
            selectIcon(this.getAttribute('data-icon'));
        });
    });
}

function selectIcon(iconName) {
    //console.log(iconName)
    selectedIcon = iconName;
    resetIconSelection();

    // Highlight selected icon
    document.querySelector(`.icon-option[data-icon="${iconName}"]`).classList.add('selected');
}

function resetIconSelection() {
    const iconOptions = document.querySelectorAll('.icon-option');
    iconOptions.forEach(option => {
        option.classList.remove('selected');
    });
    //selectedIcon = 'default';
}

function showMarkerForm(isEdit = false) {
    overlay.classList.add('active');
    markerForm.classList.add('active');
    formTitle = document.getElementById('form-title');
    if (isEdit) {
        formTitle.textContent = 'Edit Marker';
        deleteMarkerBtn.style.display = 'block';
    } else {
        formTitle.textContent = 'Add Marker';
        deleteMarkerBtn.style.display = 'none';
    }
}

function hideForm() {
    overlay.classList.remove('active');
    markerForm.classList.remove('active');
    markerTitleInput.value = '';
    markerDescriptionInput.value = '';
    resetIconSelection();
}

function updateMarker() {
    if (!currentMarker) return;

    currentMarker.title = markerTitleInput.value || 'Untitled Marker';
    currentMarker.description = markerDescriptionInput.value || 'No description';
    currentMarker.icon = selectedIcon;
    // Update marker on map
    currentMarker.marker.setIcon(icons[selectedIcon]);
    currentMarker.marker.bindPopup(`<b>${currentMarker.title}</b><br>${currentMarker.description}`);

    hideForm();
    currentMarker = null;
}

document.getElementById('save-marker').addEventListener('click', function () {
    if (currentMarker && currentMarker.id) {
        updateMarker();
    } else if (currentMarker && currentMarker.latlng) {
        addMarker(currentMarker.latlng);
        hideForm();
        currentMarker = null;
    }
});
document.getElementById('cancel-marker').addEventListener('click', function () {
    hideForm();
    currentMarker = null;
});
document.getElementById('delete-marker').addEventListener('click', function () {
    deleteCurrentMarker();
});


function editMarker(markerData) {
    currentMarker = markerData;
    markerTitleInput.value = markerData.title;
    markerDescriptionInput.value = markerData.description;
    selectIcon(markerData.icon);
    showMarkerForm(true);
}

function deleteCurrentMarker() {
    if (!currentMarker) return;
    currentMarker.marker.remove();

    const index = markers.findIndex(m => m.id === currentMarker.id);
    if (index !== -1) {
        markers.splice(index, 1);
        console.log(index, "deleted");
    }

    hideForm();
    currentMarker = null;
}

function addMarker(map, latlng, title, description, icon) {
    //console.log("ikony", icons);
    //console.log(icon);
    var marker = L.marker(latlng, {
        draggable: true,
        icon: icons[icon]
    }).addTo(map).bindPopup(`<b>${title}</b><br>${description}`);
    const markerData = {
        id: Date.now(), // Simple unique identifier
        marker: marker,
        title: title || 'Untitled Marker',
        description: description || 'No description',
        icon: icon || 'default',
        latlng: latlng
    };

    markers.push(markerData);
    marker.on('dragend', function (e) {
        //legend.update(e.target)
    });
    marker.on('contextmenu', function (e) {
        //var text2=this._popup.getContent()
        editMarker(markerData);
        //this._popup.setContent(text)
        //legend.update(this)
    });
}

function loadMarkers(map, rc, markers) {
    //console.log("load markers", markers);
    if (!markers) markers = [];
    markers.forEach(element => {
        addMarker(map, rc.unproject([element.x, element.y]), element.title, element.description, element.icon);
    });
}

function saveMarkers(rc, target) {
    markersToSend = [];
    markers.forEach(element => {
        res = {};
        res.x = rc.project(element.marker.getLatLng()).x;
        res.y = rc.project(element.marker.getLatLng()).y;
        res.title = element.title;
        res.description = element.description;
        res.icon = element.icon;
        markersToSend.push(res);
    });
    markersToSend = JSON.stringify(markersToSend);
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('markers', markersToSend);

    xhr.addEventListener('load', () => {
        //console.log(xhr);
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
            console.log(response);
        } else {
            console.log(response);
        }
    });

    xhr.addEventListener('error', () => {
        console.log('Upload failed. Network error');
    });

    xhr.open('POST', `/markers/${target}`, true);
    xhr.send(formData);
}

function deleteImage(target) {
    if (confirm("Czy na pewno chcesz usunąć obraz?")) {
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `/api/delete/${target}`, true);
        xhr.send();
        message = "Obraz został usunięty";
        alert(message);
        window.location.href = '/';
    }
}

document.getElementById('save-image').addEventListener('click', function () {
    overlay.classList.remove('active');
    imageForm.classList.remove('active');
    target = document.getElementById('image-uuid').value
    new_description = document.getElementById('image-title').value
    new_type = select.value
    if (new_description != "") {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('description', new_description);
        formData.append('type', new_type);
        xhr.open('POST', `/api/edit/${target}`, true);
        xhr.send(formData);
        config.description = new_description;
        config.type = new_type;
    }
});
document.getElementById('cancel-image').addEventListener('click', function () {
    overlay.classList.remove('active');
    imageForm.classList.remove('active');
});

function modifyImage(config, target) {
    document.getElementById('image-title').value = config.description;
    document.getElementById('image-uuid').value = target;
    select = document.getElementById('image-type');
    select.replaceChildren();
    imageTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        select.appendChild(option);
    });

    select.value = config.type;
    overlay.classList.add('active');
    imageForm.classList.add('active');
    document.getElementById('delete-image').style.display = 'none';
    // new_description = prompt("Podaj nową nazwę obrazu", config.description);
}


function initMap(target, config) {
    const map = L.map('map', {crs: L.CRS.Simple, minZoom: config.min_zoom, maxZoom: config.max_zoom});
    var rc = new L.RasterCoords(map, [config.width, config.height]);
    bounds = rc.getMaxBounds();
    map.setView(bounds.getCenter(), 3);

    var legend = L.control({position: 'topleft'});
    legend.onAdd = function (map) {
        this.button = L.DomUtil.create('button', 'info');
        if (userdata.name) {
            this.button.innerHTML = `<img src="${userdata.picture}"><br>${userdata.name}<a href='/logout'><br>Wyloguj</a>`;
            this.button.innerHTML += "<br><a href='/upload'>Dodaj nowy obraz</a>";
        } else {
            this.button.innerHTML = "<a href='/login'>Zaloguj</a>";
        }
        this.button.innerHTML += `<br><a href='/tiles/${target}/full.jpg'>Pobierz obraz</a>`;
        this.button.innerHTML += "<br><a href='/'>Strona główna</a>";

        return this.button;
    };
    legend.addTo(map);

    loadMarkers(map, rc, JSON.parse(config.markers));

    if (userdata.sub == config.login || userdata.is_admin) {
        var toolbox = L.control({position: 'bottomleft'});
        toolbox.onAdd = function (map) {
            box = L.DomUtil.create('div', 'toolbox');
            save_button = L.DomUtil.create('button', 'save-button');
            save_button.innerHTML = "<img src='/icons/icons8-save-100.png' alt='Zapisanie zmian'>";
            delete_button = L.DomUtil.create('button', 'delete-button');
            delete_button.innerHTML = "<img src='/icons/icons8-delete-100.png' alt='Skasowanie obrazu'>";
            edit_button = L.DomUtil.create('button', 'edit-button');
            edit_button.innerHTML = "<img src='/icons/icons8-edit-property-100.png' alt='Edycja nazwy'>";
            box.appendChild(save_button);
            box.appendChild(edit_button);
            box.appendChild(delete_button);
            save_button.onclick = (e) => saveMarkers(rc, target);
            delete_button.onclick = (e) => deleteImage(target);
            edit_button.onclick = (e) => modifyImage(config, target);
            return box;
        }
        toolbox.addTo(map);
    } else {
        var toolbox = L.control({position: 'bottomleft'});
        toolbox.onAdd = function (map) {
            box = L.DomUtil.create('div', 'toolbox');
            view_button = L.DomUtil.create('button', 'view-button');
            view_button.innerHTML = "<img src='/icons/icons8-information-100.png' alt='Informacje o obrazie'>";
            box.appendChild(view_button);
            view_button.onclick = (e) => modifyImage(config, target);
            return box;
        }
        toolbox.addTo(map);
    }

    const tiles = L.tileLayer(`/tiles/${target}/{z}/{x}/{y}.jpg`, {
        bounds: bounds,
        attribution: config.description
    }).addTo(map);


    function onMapClick(event) {
        if (rc.getMaxBounds().contains(event.latlng)) {
            var coord = rc.project(event.latlng);
            addMarker(map, event.latlng, "nowy", "no description", "up-left");
        }
    }

    map.on('click', onMapClick);
}

