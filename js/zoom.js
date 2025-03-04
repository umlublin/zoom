const markerForm = document.getElementById('marker-form')
const overlay = document.getElementById('overlay')
const formTitle = document.getElementById('form-title');
const markerTitleInput = document.getElementById('marker-title');
const markerDescriptionInput = document.getElementById('marker-description');
const saveMarkerBtn = document.getElementById('save-marker');
const cancelMarkerBtn = document.getElementById('cancel-marker');
const deleteMarkerBtn = document.getElementById('delete-marker');
const iconOptions = document.querySelectorAll('.icon-option');
const icons = {
    default: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    left: L.icon({
        iconUrl: '/icons/icons8-down-left-100.png',
        iconSize: [41, 33],
        iconAnchor: [41, 16],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    right: L.icon({
        iconUrl: '/icons/right.png',
        iconSize: [41, 33],
        iconAnchor: [41, 16],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
    top: L.icon({
        iconUrl: '/icons/top.png',
        iconSize: [41, 33],
        iconAnchor: [41, 16],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41]
    }),
};

// Variables
let markers = [];
let currentMarker = null;
let selectedIcon = 'default';

function selectIcon(iconName) {
    selectedIcon = iconName;
    resetIconSelection();

    // Highlight selected icon
    document.querySelector(`.icon-option[data-icon="${iconName}"]`).classList.add('selected');
}

function resetIconSelection() {
    iconOptions.forEach(option => {
        option.classList.remove('selected');
    });
    //selectedIcon = 'default';
}

function showForm(isEdit = false) {
    overlay.classList.add('active');
    markerForm.classList.add('active');

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

iconOptions.forEach(option => {
    option.addEventListener('click', function () {
        selectIcon(this.getAttribute('data-icon'));
    });
});

function updateMarker() {
    if (!currentMarker) return;

    currentMarker.title = markerTitleInput.value || 'Untitled Marker';
    currentMarker.description = markerDescriptionInput.value || 'No description';
    currentMarker.icon = selectedIcon;
    console.log(selectedIcon);
    // Update marker on map
    currentMarker.marker.setIcon(icons[selectedIcon]);
    currentMarker.marker.bindPopup(`<b>${currentMarker.title}</b><br>${currentMarker.description}`);

    hideForm();
    currentMarker = null;
}

function editMarker(markerData) {
    currentMarker = markerData;
    markerTitleInput.value = markerData.title;
    markerDescriptionInput.value = markerData.description;
    selectIcon(markerData.icon);
    showForm(true);
}

saveMarkerBtn.addEventListener('click', function () {
    if (currentMarker && currentMarker.id) {
        updateMarker();
    } else if (currentMarker && currentMarker.latlng) {
        addMarker(currentMarker.latlng);
        hideForm();
        currentMarker = null;
    }
});

cancelMarkerBtn.addEventListener('click', function () {
    hideForm();
    currentMarker = null;
});

deleteMarkerBtn.addEventListener('click', function () {
    deleteCurrentMarker();
});

function deleteCurrentMarker() {
    if (!currentMarker) return;
    currentMarker.marker.remove()

    const index = markers.findIndex(m => m.id === currentMarker.id);
    if (index !== -1) {
        markers.splice(index, 1);
    }

    hideForm();
    currentMarker = null;
}


function addMarker(map, latlng, title, description) {
    var marker = L.marker(latlng, { draggable: true }).addTo(map).bindPopup(`<b>${title}</b><br>${description}`);
    const markerData = {
        id: Date.now(), // Simple unique identifier
        marker: marker,
        title: title || 'Untitled Marker',
        description: description || 'No description',
        icon: selectedIcon || icons.default,
        latlng: latlng
    }
    marker.on('dragend', function (e) {
        //legend.update(e.target)
    })
    marker.on('contextmenu', function (e) {
        //var text2=this._popup.getContent()
        editMarker(markerData)
        //this._popup.setContent(text)
        //legend.update(this)
    })
}

function initMap(target, config) {
    const map = L.map('map', { crs: L.CRS.Simple, minZoom: config.minZoom, maxZoom: config.maxZoom })
    var rc = new L.RasterCoords(map, [config.width, config.height])
    bounds = rc.getMaxBounds()
    map.setView(bounds.getCenter(), 3)

    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) {
        this.button = L.DomUtil.create('button', 'info')
        this.button.innerHTML = "Dodaj marker"
        return this.button
    }
    legend.update = function (marker) {
        //coord = rc.project(marker.getLatLng())
        //this.div.innerHTML = `<b>${marker._popup.getContent()}</b><br>${coord}`
    }
    legend.addTo(map)

    const tiles = L.tileLayer(`/${target}/{z}/{x}/{y}.png`, {
        bounds: bounds,
        attribution: config.description
    }).addTo(map);
    if (!config.markers) config.markers = []
    config.markers.forEach(element => {
        addMarker(map, rc.unproject([element.x, element.y]), element.title, element.description)
    })

    function onMapClick(event) {
        var coord = rc.project(event.latlng)
        addMarker(map, event.latlng, "nowy", "no description")
    }
    map.on('click', onMapClick)
}

target = window.location.hash.substring(1)
if (target == '') target = "default"
console.log(target)
fetch(`${target}/config.json`)
    .then(response => response.json())
    .then(config => {
        initMap(target, config)
    }).catch(error => { console.error(error) })