const imageForm = document.querySelector("#imageForm")
const imageInput = document.querySelector("#imageInput")
const dropZone = document.querySelector("#dropZone")
const fileInfo = document.querySelector("#fileInfo")
const uploadBtn = document.querySelector("#uploadBtn")
const uploadProgress = document.querySelector("#uploadProgress")
const uploadResults = document.querySelector("#uploadResults")

// Simplified file constraints - only images, text, docs, and PDF
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
  'text/plain': 'Text File',
  'application/pdf': 'PDF Document',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document'
};

// Use only Render backend URL
const API_BASE_URL = 'https://s3-file-uploade.onrender.com';

let selectedFile = null;

// Event listeners
dropZone.addEventListener('click', () => imageInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', handleDrop);
imageInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFileSelection(e.target.files[0]);
});

function handleDragOver(e) {
  e.preventDefault();
  dropZone.classList.add('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) {
    handleFileSelection(e.dataTransfer.files[0]);
  }
}

function handleFileSelection(file) {
  const validation = validateFile(file);
  if (!validation.valid) {
    showError(validation.error);
    return;
  }

  selectedFile = file;
  displayFileInfo(file);
  uploadBtn.disabled = false;
}

function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}` 
    };
  }

  if (!ALLOWED_TYPES[file.type]) {
    return { 
      valid: false, 
      error: 'File type not supported. Please select an image, PDF, text, or Word document.' 
    };
  }

  return { valid: true };
}

function displayFileInfo(file) {
  fileInfo.innerHTML = `
    <h4>📎 ${file.name}</h4>
    <p><strong>Type:</strong> ${ALLOWED_TYPES[file.type]}</p>
    <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
  `;
  fileInfo.classList.remove('hidden');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function showError(message) {
  // Remove existing error
  const existingError = document.querySelector('.error-message');
  if (existingError) existingError.remove();
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  fileInfo.parentNode.insertBefore(errorDiv, fileInfo);
  
  setTimeout(() => errorDiv.remove(), 4000);
}

function showProgress() {
  uploadProgress.classList.remove('hidden');
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    
    progressFill.style.width = progress + '%';
    progressText.textContent = Math.round(progress) + '%';
  }, 100);
  
  return () => {
    clearInterval(interval);
    progressFill.style.width = '100%';
    progressText.textContent = '100%';
    setTimeout(() => uploadProgress.classList.add('hidden'), 1000);
  };
}

function addUploadResult(file, fileUrl, success = true, error = null) {
  const resultDiv = document.createElement('div');
  resultDiv.className = `upload-result ${success ? 'success' : 'error'}`;
  
  if (success) {
    resultDiv.innerHTML = `
      <div class="result-header">
        <span class="result-icon">✅</span>
        <span class="result-title">Upload Successful</span>
      </div>
      <div class="result-content">
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
        <div class="url-container">
          <input type="text" value="${fileUrl}" readonly class="url-input">
          <button onclick="copyLink('${fileUrl}')" class="copy-btn">Copy Link</button>
        </div>
      </div>
    `;
  } else {
    resultDiv.innerHTML = `
      <div class="result-header">
        <span class="result-icon">❌</span>
        <span class="result-title">Upload Failed</span>
      </div>
      <div class="result-content">
        <p><strong>File:</strong> ${file.name}</p>
        <p><strong>Error:</strong> ${error}</p>
      </div>
    `;
  }
  
  uploadResults.appendChild(resultDiv);
  uploadResults.scrollTop = uploadResults.scrollHeight;
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    // Show temporary feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#4CAF50';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  });
}

// Main upload handler - updated to use only Render URL
imageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  if (!selectedFile) {
    showError('Please select a file');
    return;
  }

  const btnText = document.querySelector('.btn-text');
  const loader = document.querySelector('.loader');
  
  // Show loading state
  uploadBtn.disabled = true;
  btnText.textContent = 'Uploading...';
  loader.classList.remove('hidden');
  
  const stopProgress = showProgress();

  try {
    // Get S3 URL from Render backend
    console.log('Fetching from:', `${API_BASE_URL}/s3Url`);
    const response = await fetch(`${API_BASE_URL}/s3Url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    const { url } = await response.json();
    console.log('Got presigned URL:', url);

    // Upload to S3
    const uploadResponse = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": selectedFile.type },
      body: selectedFile
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} - ${uploadResponse.statusText}`);
    }

    const fileUrl = url.split('?')[0];
    console.log('File uploaded successfully:', fileUrl);
    addUploadResult(selectedFile, fileUrl, true);
    resetForm();

  } catch (error) {
    console.error('Upload error:', error);
    addUploadResult(selectedFile, null, false, error.message);
  } finally {
    uploadBtn.disabled = false;
    btnText.textContent = 'Upload File';
    loader.classList.add('hidden');
    stopProgress();
  }
});

function resetForm() {
  selectedFile = null;
  imageInput.value = '';
  fileInfo.classList.add('hidden');
  uploadBtn.disabled = true;
  
  // Remove any error messages
  const errorMessage = document.querySelector('.error-message');
  if (errorMessage) errorMessage.remove();
}

// Global function for copy button
window.copyLink = copyLink;
