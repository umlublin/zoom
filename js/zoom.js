const markerForm = document.getElementById('marker-form');
const overlay = document.getElementById('overlay');
const formTitle = document.getElementById('form-title');
const markerTitleInput = document.getElementById('marker-title');
const markerDescriptionInput = document.getElementById('marker-description');
const saveMarkerBtn = document.getElementById('save-marker');
const cancelMarkerBtn = document.getElementById('cancel-marker');
const deleteMarkerBtn = document.getElementById('delete-marker');
const markerIconDiv = document.getElementById('marker-icon');

// Variables
let markers = [];
let currentMarker = null;
let selectedIcon = 'default';
let icons = {};
let userdata = {};

// Fetch icons configuration
fetch('userdata.json')
    .then(response => response.json())
    .then(data => {
        userdata = data;
        console.log(data);
    })
    .catch(error => console.error('Error loading userdata:', error));


// Fetch icons configuration
fetch('icons/icons.json')
    .then(response => response.json())
    .then(data => {
        icons = Object.keys(data).reduce((acc, key) => {
            acc[key] = L.icon(data[key]);
            return acc;
        }, {});
        loadIconsToDiv(data);
    })
    .catch(error => console.error('Error loading icons:', error));

target = window.location.hash.substring(1);
if (target == '') target = "default";
console.log(target);
fetch(`${target}/config.json`)
        .then(response => response.json())
        .then(config => initMap(target, config))
        .catch(error => console.error(error));    

function loadIconsToDiv(data) {
    markerIconDiv.innerHTML = ''; // Clear existing icons
    Object.keys(data).forEach(iconName => {
        const iconOption = document.createElement('div');
        iconOption.classList.add('icon-option');
        iconOption.setAttribute('data-icon', iconName);
        iconOption.innerHTML = `<img src="${data[iconName].iconUrl}" alt="${iconName}">`;
        markerIconDiv.appendChild(iconOption);
        console.log(iconName)
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
    console.log(iconName)
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
    currentMarker.marker.remove();

    const index = markers.findIndex(m => m.id === currentMarker.id);
    if (index !== -1) {
        markers.splice(index, 1);
    }

    hideForm();
    currentMarker = null;
}

function addMarker(map, latlng, title, description, icon) {
    var marker = L.marker(latlng, { draggable: true, icon: icons[icon] }).addTo(map).bindPopup(`<b>${title}</b><br>${description}`);
    const markerData = {
        id: Date.now(), // Simple unique identifier
        marker: marker,
        title: title || 'Untitled Marker',
        description: description || 'No description',
        icon: icon || 'default',
        latlng: latlng
    };
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

function initMap(target, config) {
    const map = L.map('map', { crs: L.CRS.Simple, minZoom: config.minZoom, maxZoom: config.maxZoom });
    var rc = new L.RasterCoords(map, [config.width, config.height]);
    bounds = rc.getMaxBounds();
    map.setView(bounds.getCenter(), 3);

    var legend = L.control({ position: 'topleft' });
    legend.onAdd = function (map) {
        this.button = L.DomUtil.create('button', 'info');
        if (userdata.name) {
            this.button.innerHTML = `<img src="${userdata.picture}"><br>${userdata.name}<a href='/logout'><br>Wyloguj</a>`;
        }
        else {
            this.button.innerHTML = "<a href='/login'>Zaloguj</a>";
        }
        return this.button;
    };
    legend.update = function (marker) {
        //coord = rc.project(marker.getLatLng())
        //this.div.innerHTML = `<b>${marker._popup.getContent()}</b><br>${coord}`
    };
    legend.addTo(map);

    const tiles = L.tileLayer(`/${target}/{z}/{x}/{y}.png`, {
        bounds: bounds,
        attribution: config.description
    }).addTo(map);

    if (!config.markers) config.markers = [];
    config.markers.forEach(element => {
        addMarker(map, rc.unproject([element.x, element.y]), element.title, element.description, element.icon);
    });

    function onMapClick(event) {
        var coord = rc.project(event.latlng);
        addMarker(map, event.latlng, "nowy", "no description", "up-left");
    }
    map.on('click', onMapClick);
}

