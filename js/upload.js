document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileDetails = document.getElementById('fileDetails');
    const fileName = document.getElementById('fileName');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const status = document.getElementById('status');

    selectedFile = null;
    
    // Handle file selection via button
    selectFileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Handle file selection change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
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
        const dt = e.dataTransfer;
        selectedFile = dt.files[0];
        handleFiles(selectedFile);
        console.log(selectedFile);
    });
    
    // Handle the selected files
    function handleFiles(file) {
        fileName.textContent = file.name;
        fileDetails.style.display = 'block';
    }
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
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                status.textContent = `Upload complete! File "${response.original_name}" saved as "${response.result}".`;
                status.style.color = 'green';
            } else {
                status.textContent = 'Upload failed.';
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
        status.textContent = 'Uploading...';
        status.style.color = 'black';
        
        // Send the request
        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    }
});