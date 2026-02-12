import { createZip } from './lib/zip.js';
import { encodeIco } from './lib/ico.js';

const SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512];
const PACKAGE_REQUIRED_SIZES = [16, 32, 180, 192, 512];

const imageInput = document.getElementById('imageInput');
const downloadPackageBtn = document.getElementById('downloadPackage');
const downloadAllBtn = document.getElementById('downloadAll');
const resetBtn = document.getElementById('resetBtn');

const previewContainer = document.getElementById('previewContainer');
const dropZone = document.getElementById('dropZone');
const dropZoneContent = document.getElementById('dropZoneContent');
const sourcePreview = document.getElementById('sourcePreview');

const fileName = document.getElementById('fileName');
const fileDimensions = document.getElementById('fileDimensions');
const statusEl = document.getElementById('status');

const modeSegment = document.getElementById('modeSegment');
const snippetSection = document.getElementById('snippetSection');
const snippetCode = document.getElementById('snippetCode');
const copySnippetBtn = document.getElementById('copySnippet');

let currentBitmap = null;
let currentCanvases = new Map();
let resizeMode = loadResizeMode();
let previewUrl = null;

function initializeEventListeners() {
    downloadAllBtn.addEventListener('click', downloadAllPngs);
    downloadPackageBtn.addEventListener('click', downloadPackage);
    resetBtn.addEventListener('click', resetApp);
    imageInput.addEventListener('change', handleFileSelect);
    copySnippetBtn.addEventListener('click', copySnippet);

    initializeResizeModeControls();
    setReadyState(false);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    dropZone.addEventListener('dragenter', highlight, false);
    dropZone.addEventListener('dragover', highlight, false);
    dropZone.addEventListener('dragleave', unhighlight, false);
    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
}

function highlight() {
    dropZone.classList.add('drag-over');
}

function unhighlight() {
    dropZone.classList.remove('drag-over');
}

function handleDrop(event) {
    unhighlight();
    handleFiles(event.dataTransfer?.files);
}

function handleFileSelect(event) {
    handleFiles(event.target.files);
}

async function handleFiles(files) {
    if (!files || files.length === 0) {
        return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
        setStatus('Please upload an image file.', 'error');
        return;
    }

    setStatus('Loading image…');
    setReadyState(false);

    setFileLabel(file.name);
    setPreviewUrl(file);

    try {
        currentBitmap?.close?.();
        currentBitmap = await createImageBitmap(file);
        setDimensionsLabel(currentBitmap.width, currentBitmap.height);
        await generateFavicons();
    } catch (error) {
        console.error('Failed to load image:', error);
        setStatus('Could not read that image. Please try another file.', 'error');
        resetGeneratedOnly();
    }
}

function setPreviewUrl(file) {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    previewUrl = URL.createObjectURL(file);
    sourcePreview.src = previewUrl;
    sourcePreview.hidden = false;
    dropZoneContent.hidden = true;
}

async function generateFavicons() {
    if (!currentBitmap) {
        setStatus('Select an image to begin.', 'error');
        return;
    }

    setStatus('Generating…');
    previewContainer.setAttribute('aria-busy', 'true');
    previewContainer.innerHTML = '';
    currentCanvases = new Map();

    for (const size of SIZES) {
        const canvas = renderSize(currentBitmap, size, resizeMode);
        currentCanvases.set(size, canvas);
        previewContainer.appendChild(createPreviewItem(canvas, size));
    }

    previewContainer.setAttribute('aria-busy', 'false');
    setReadyState(true);
    updateSnippet();
    setStatus(`Ready. Generated ${SIZES.length} sizes.`);
}

function renderSize(bitmap, size, mode) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;

    ctx.clearRect(0, 0, size, size);

    if (mode === 'fit') {
        const scale = Math.min(size / sourceWidth, size / sourceHeight);
        const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
        const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
        const dx = Math.floor((size - drawWidth) / 2);
        const dy = Math.floor((size - drawHeight) / 2);
        ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);
    } else {
        const scale = Math.max(size / sourceWidth, size / sourceHeight);
        const cropWidth = size / scale;
        const cropHeight = size / scale;
        const cropX = Math.max(0, (sourceWidth - cropWidth) / 2);
        const cropY = Math.max(0, (sourceHeight - cropHeight) / 2);

        ctx.drawImage(
            bitmap,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            size,
            size
        );
    }

    return canvas;
}

function createPreviewItem(canvas, size) {
    const container = document.createElement('div');
    container.className = 'preview-item';

    container.appendChild(canvas);

    const label = document.createElement('div');
    label.textContent = `${size}×${size}`;
    container.appendChild(label);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Download PNG';
    button.addEventListener('click', async () => {
        await downloadPng(size);
    });
    container.appendChild(button);

    return container;
}

async function downloadPng(size) {
    const canvas = currentCanvases.get(size);
    if (!canvas) {
        setStatus('Missing generated size. Please generate again.', 'error');
        return;
    }

    try {
        const pngBytes = await canvasToPngBytes(canvas);
        downloadBytes(`favicon-${size}x${size}.png`, 'image/png', pngBytes);
        setStatus(`Downloaded ${size}×${size}.`);
    } catch (error) {
        console.error('PNG export failed:', error);
        setStatus('Download failed. Please try again.', 'error');
    }
}

async function downloadAllPngs() {
    if (!currentCanvases.size) {
        setStatus('Generate favicons first.', 'error');
        return;
    }

    setStatus('Building ZIP…');
    const files = [];
    for (const size of SIZES) {
        const canvas = currentCanvases.get(size);
        if (!canvas) {
            continue;
        }
        files.push({
            name: `favicon-${size}x${size}.png`,
            data: await canvasToPngBytes(canvas)
        });
    }

    const zipBytes = createZip(files);
    downloadBytes('favicons.zip', 'application/zip', zipBytes);
    setStatus('Downloaded ZIP of PNGs.');
}

async function downloadPackage() {
    if (!currentCanvases.size) {
        setStatus('Generate favicons first.', 'error');
        return;
    }

    for (const size of PACKAGE_REQUIRED_SIZES) {
        if (!currentCanvases.get(size)) {
            setStatus('Missing generated sizes. Please generate again.', 'error');
            return;
        }
    }

    setStatus('Building package…');

    const files = [];

    const icoBytes = await createIcoBytes();
    files.push({ name: 'favicon.ico', data: icoBytes });

    files.push({ name: 'favicon-16x16.png', data: await canvasToPngBytes(currentCanvases.get(16)) });
    files.push({ name: 'favicon-32x32.png', data: await canvasToPngBytes(currentCanvases.get(32)) });
    files.push({ name: 'apple-touch-icon.png', data: await canvasToPngBytes(currentCanvases.get(180)) });
    files.push({ name: 'android-chrome-192x192.png', data: await canvasToPngBytes(currentCanvases.get(192)) });
    files.push({ name: 'android-chrome-512x512.png', data: await canvasToPngBytes(currentCanvases.get(512)) });

    files.push({ name: 'site.webmanifest', data: new TextEncoder().encode(buildManifest()) });
    files.push({ name: 'favicon.html', data: new TextEncoder().encode(buildHtmlSnippet()) });

    const zipBytes = createZip(files);
    downloadBytes('favicon-package.zip', 'application/zip', zipBytes);
    setStatus('Downloaded favicon package.');
}

async function createIcoBytes() {
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const images = [];

    for (const size of icoSizes) {
        const canvas = currentCanvases.get(size);
        if (!canvas) {
            continue;
        }
        images.push({ size, png: await canvasToPngBytes(canvas) });
    }

    if (!images.length) {
        throw new Error('No ICO images available');
    }

    return encodeIco(images);
}

async function canvasToPngBytes(canvas) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
        throw new Error('PNG export failed');
    }
    return new Uint8Array(await blob.arrayBuffer());
}

function buildHtmlSnippet() {
    return [
        '<!-- Favicons -->',
        '<link rel="icon" href="/favicon.ico" sizes="any">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        ''
    ].join('\n');
}

function buildManifest() {
    const manifest = {
        name: 'Your Site',
        short_name: 'Site',
        icons: [
            {
                src: '/android-chrome-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: '/android-chrome-512x512.png',
                sizes: '512x512',
                type: 'image/png'
            }
        ]
    };
    return JSON.stringify(manifest, null, 2) + '\n';
}

function updateSnippet() {
    const snippet = buildHtmlSnippet();
    snippetCode.textContent = snippet;
    snippetSection.hidden = false;
}

async function copySnippet() {
    const text = snippetCode.textContent || '';
    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        copySnippetBtn.textContent = 'Copied';
        setTimeout(() => {
            copySnippetBtn.textContent = 'Copy';
        }, 1200);
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        copySnippetBtn.textContent = 'Copied';
        setTimeout(() => {
            copySnippetBtn.textContent = 'Copy';
        }, 1200);
    }
}

function initializeResizeModeControls() {
    const buttons = modeSegment.querySelectorAll('.segmented-btn');
    setResizeMode(resizeMode);

    buttons.forEach((button) => {
        button.addEventListener('click', async () => {
            const mode = button.getAttribute('data-mode');
            if (mode !== 'fit' && mode !== 'fill') {
                return;
            }
            if (mode === resizeMode) {
                return;
            }

            setResizeMode(mode);
            if (currentBitmap) {
                await generateFavicons();
            }
        });
    });
}

function setResizeMode(mode) {
    resizeMode = mode === 'fill' ? 'fill' : 'fit';
    saveResizeMode(resizeMode);

    const buttons = modeSegment.querySelectorAll('.segmented-btn');
    buttons.forEach((button) => {
        const isPressed = button.getAttribute('data-mode') === resizeMode;
        button.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
    });
}

function loadResizeMode() {
    try {
        const value = localStorage.getItem('favgen.resizeMode');
        return value === 'fill' ? 'fill' : 'fit';
    } catch {
        return 'fit';
    }
}

function saveResizeMode(mode) {
    try {
        localStorage.setItem('favgen.resizeMode', mode);
    } catch {
        // ignore
    }
}

function setReadyState(isReady) {
    downloadAllBtn.disabled = !isReady;
    downloadPackageBtn.disabled = !isReady;
    resetBtn.disabled = !isReady && !imageInput.files?.length;
}

function setStatus(message, tone = 'info') {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
}

function setFileLabel(name) {
    fileName.textContent = name || 'Selected image';
}

function setDimensionsLabel(width, height) {
    fileDimensions.textContent = `${width}×${height}`;
    fileDimensions.hidden = false;
}

function resetGeneratedOnly() {
    currentCanvases = new Map();
    previewContainer.innerHTML = '';
    previewContainer.setAttribute('aria-busy', 'false');
    snippetSection.hidden = true;
    setReadyState(false);
}

function resetApp() {
    currentBitmap?.close?.();
    currentBitmap = null;
    currentCanvases = new Map();

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    imageInput.value = '';
    previewContainer.innerHTML = '';
    previewContainer.setAttribute('aria-busy', 'false');
    snippetSection.hidden = true;

    sourcePreview.hidden = true;
    sourcePreview.removeAttribute('src');
    dropZoneContent.hidden = false;

    fileName.textContent = 'No image selected';
    fileDimensions.hidden = true;
    fileDimensions.textContent = '';

    setReadyState(false);
    setStatus('Select an image to begin.');
}

function downloadBytes(filename, mimeType, bytes) {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('DOMContentLoaded', initializeEventListeners);

