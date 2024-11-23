// Define sizes globally
const sizes = [16, 32, 48, 96, 120, 144, 152, 180, 192, 512];

// Get DOM elements
const imageInput = document.getElementById('imageInput');
const generateBtn = document.getElementById('generateBtn');
const downloadAll = document.getElementById('downloadAll');
const previewContainer = document.getElementById('previewContainer');
const dropZone = document.getElementById('dropZone');

// Initialize event listeners
function initializeEventListeners() {
    // Generate button click
    generateBtn.addEventListener('click', generateFavicons);
    
    // Download all button click
    downloadAll.addEventListener('click', downloadAllFavicons);
    
    // File input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    dropZone.addEventListener('dragenter', highlight, false);
    dropZone.addEventListener('dragover', highlight, false);
    dropZone.addEventListener('dragleave', unhighlight, false);
    dropZone.addEventListener('drop', handleDrop, false);
}

// Prevent default drag behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone
function highlight(e) {
    dropZone.classList.add('drag-over');
}

// Unhighlight drop zone
function unhighlight(e) {
    dropZone.classList.remove('drag-over');
}

// Handle dropped files
function handleDrop(e) {
    unhighlight(e);
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle file select
function handleFileSelect(e) {
    handleFiles(e.target.files);
}

// Handle files
function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    generateFavicons();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file!');
        }
    }
}

// Generate favicons
function generateFavicons() {
    const file = imageInput.files[0];
    if (!file) {
        alert('Please select an image first!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            previewContainer.innerHTML = '';
            sizes.forEach(size => createFavicon(img, size));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Create favicon
function createFavicon(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Use better quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0, size, size);
    
    // Create preview container
    const container = document.createElement('div');
    container.className = 'preview-item';
    
    // Add canvas to preview
    container.appendChild(canvas);
    
    // Add size label
    const label = document.createElement('div');
    label.textContent = `${size}x${size}`;
    container.appendChild(label);
    
    // Add download button
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.onclick = () => downloadFavicon(canvas, size);
    container.appendChild(downloadBtn);
    
    previewContainer.appendChild(container);
}

// Download single favicon
async function downloadFavicon(canvas, size) {
    const format = document.getElementById('formatSelect').value;
    let data, filename;

    try {
        switch (format) {
            case 'ico':
                data = await convertToICO(canvas);
                filename = `favicon-${size}x${size}.ico`;
                break;
            case 'svg':
                data = await convertToSVG(canvas);
                filename = `favicon-${size}x${size}.svg`;
                break;
            default: // png
                data = canvas.toDataURL('image/png');
                filename = `favicon-${size}x${size}.png`;
        }

        const link = document.createElement('a');
        link.download = filename;
        link.href = data;
        link.click();
    } catch (error) {
        console.error('Error converting file:', error);
        alert('Error converting to ' + format.toUpperCase() + ' format. Please try again.');
    }
}

// Alternative ICO conversion function
async function convertToICO(canvas) {
    return new Promise((resolve, reject) => {
        try {
            // For ICO format, we'll use 16x16 and 32x32 sizes
            const sizes = [16, 32];
            const images = sizes.map(size => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = size;
                tempCanvas.height = size;
                const ctx = tempCanvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(canvas, 0, 0, size, size);
                return tempCanvas;
            });

            // Create ICO data
            const header = new Uint8Array([
                0, 0,             // Reserved
                1, 0,             // ICO type
                images.length, 0   // Number of images
            ]);

            // Create ICO file
            const blob = new Blob([header], { type: 'image/x-icon' });
            const url = URL.createObjectURL(blob);
            resolve(url);
        } catch (error) {
            console.error('ICO conversion error:', error);
            reject(error);
        }
    });
}

// Convert canvas to SVG
function convertToSVG(canvas) {
    return new Promise((resolve) => {
        const img = canvas.toDataURL('image/png');
        const size = canvas.width;
        
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <image width="100%" height="100%" href="${img}"/>
            </svg>
        `;
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        resolve(URL.createObjectURL(blob));
    });
}

// Helper function to load external scripts
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Download all favicons
async function downloadAllFavicons() {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length === 0) {
        alert('Please generate favicons first!');
        return;
    }

    // Create a new ZIP file
    const zip = new JSZip();
    
    // Add each favicon to the ZIP
    for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        const size = sizes[i];
        
        // Get canvas data as PNG
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace('data:image/png;base64,', '');
        
        // Add to zip with appropriate filename
        zip.file(`favicon-${size}x${size}.png`, base64Data, {base64: true});
    }

    try {
        // Generate the ZIP file
        const content = await zip.generateAsync({type: 'blob'});
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'favicons.zip';
        link.href = URL.createObjectURL(content);
        link.click();
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
        }, 1000);
    } catch (error) {
        console.error('Error creating ZIP file:', error);
        alert('Error creating ZIP file. Please try again.');
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', initializeEventListeners);