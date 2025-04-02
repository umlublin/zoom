let userdata = {};
let allowed_types = ['image/jpeg'];

// Fetch icons configuration
fetch('userdata.json')
    .then(response => response.json())
    .then(data => {
        userdata = data;
    })
    .catch(error => console.error('Error loading userdata:', error));

document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileDetails = document.getElementById('fileDetails');
    const fileName = document.getElementById('fileName');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const status = document.getElementById('status');

    selectedFile = null;
    
    // Prevent default behavior for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', (e) => {
        if (userdata.nickname == null) {
            status.innerHTML = 'Please <a href="/login">login</a> first.';
            return;
        }
        status.textContent = '';  
        const dt = e.dataTransfer;
        selectedFile = dt.files[0];
        console.log(selectedFile.type)
        if (allowed_types.indexOf(selectedFile.type) == -1) {;
            status.textContent = `File type ${selectedFile.type} not allowed.`;
            return;
        }
        fileName.textContent = selectedFile.name;
        fileDetails.style.display = 'block';
        status.textContent = '';
        status.style.color = 'black';
        progressBar.style.width = '0%'; 
        progressBar.style.display = 'block';
        progressContainer.style.display = 'none';
    });
    
    // Handle the upload button click
    uploadBtn.addEventListener('click', () => {
        if (selectedFile === null) {
            status.textContent = 'Please select a file first.';
            return;
        }
        uploadFile(selectedFile);
    });
    
    // Upload the file with progress tracking
    function uploadFile(file) {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        formData.append('file', file);
        
        // Setup progress tracking
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = percentComplete + '%';
            }
        });
        
        // Setup completion handler
        xhr.addEventListener('load', () => {
            console.log(xhr);
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
                status.textContent = `Upload complete! File "${response.original_name}" saved".`;
                status.style.color = 'green';
                status.innerHTML += `<br><a href="/zoom#${response.uuid}"><img src="/tiles/${response.uuid}/preview.jpg"></a>`;
            } else {
                status.textContent = `Upload failed "${response.error}".`;
                status.style.color = 'red';
            }
        });
        
        // Setup error handler
        xhr.addEventListener('error', () => {
            status.textContent = 'Upload failed. Network error.';
            status.style.color = 'red';
        });
        
        // Reset the UI
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        status.textContent = 'Uploading and converting to tiles, please wait ...';
        status.style.color = 'black';
        
        // Send the request
        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    }
});