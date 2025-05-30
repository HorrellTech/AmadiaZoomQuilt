// Zoom Quilt Generator - Main JavaScript File
class ZoomQuiltGenerator {    constructor() {
        this.images = [];
        this.animationId = null;
        this.isPlaying = false;
        this.zoomLevel = 0; // Changed to continuous zoom level
        this.zoomSpeed = 1;
        this.blendMode = 'normal';
        this.fadeIntensity = 20;
        this.scaleRatio = 0.5;
        this.canvas = null;
        this.ctx = null;
        this.loadedImages = [];
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateControlValues();
    }

    setupCanvas() {
        this.canvas = document.getElementById('zoomCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Fill with black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Control inputs
        document.getElementById('zoomSpeed').addEventListener('input', (e) => {
            this.zoomSpeed = parseFloat(e.target.value);
            document.getElementById('zoomSpeedValue').textContent = `${this.zoomSpeed}x`;
        });

        document.getElementById('blendMode').addEventListener('change', (e) => {
            this.blendMode = e.target.value;
        });

        document.getElementById('fadeIntensity').addEventListener('input', (e) => {
            this.fadeIntensity = parseInt(e.target.value);
            document.getElementById('fadeIntensityValue').textContent = `${this.fadeIntensity}%`;
        });

        document.getElementById('scaleRatio').addEventListener('input', (e) => {
            this.scaleRatio = parseFloat(e.target.value);
            document.getElementById('scaleRatioValue').textContent = this.scaleRatio;
        });

        // Action buttons
        document.getElementById('generateBtn').addEventListener('click', () => this.generateZoomQuilt());
        document.getElementById('previewBtn').addEventListener('click', () => this.previewZoomQuilt());
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAnimation());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadAnimation());
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
        });

        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    handleFileSelect(e) {
        this.handleFiles(e.target.files);
    }

    async handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        for (const file of imageFiles) {
            await this.loadImage(file);
        }
        
        this.updateImageList();
        this.updateButtons();
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const imageData = {
                        id: Date.now() + Math.random(),
                        file: file,
                        name: file.name,
                        size: file.size,
                        url: e.target.result,
                        image: img,
                        width: img.width,
                        height: img.height
                    };
                    this.images.push(imageData);
                    resolve(imageData);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    updateImageList() {
        const imageList = document.getElementById('imageList');
        
        if (this.images.length === 0) {
            imageList.innerHTML = `
                <div class="empty-state">
                    <p>No images imported yet. Add some images to get started!</p>
                </div>
            `;
            return;
        }

        imageList.innerHTML = this.images.map((img, index) => `
            <div class="image-item" data-id="${img.id}" draggable="true">
                <div class="image-index">${index + 1}</div>
                <img src="${img.url}" alt="${img.name}">
                <div class="image-info">
                    <h4>${img.name}</h4>
                    <p>${img.width} × ${img.height} | ${this.formatFileSize(img.size)}</p>
                </div>
                <div class="image-controls">
                    <button class="control-btn" onclick="zoomQuilt.removeImage('${img.id}')">×</button>
                </div>
            </div>
        `).join('');

        this.setupImageSorting();
    }

    setupImageSorting() {
        const imageList = document.getElementById('imageList');
        let draggedElement = null;

        imageList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('image-item')) {
                draggedElement = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
            }
        });

        imageList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('image-item')) {
                e.target.classList.remove('dragging');
                draggedElement = null;
            }
        });        imageList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement) {
                const afterElement = this.getDragAfterElement(imageList, e.clientY);
                if (afterElement == null) {
                    imageList.appendChild(draggedElement);
                } else {
                    imageList.insertBefore(draggedElement, afterElement);
                }
            }
        });

        imageList.addEventListener('drop', (e) => {
            e.preventDefault();
            this.reorderImages();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.image-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    reorderImages() {
        const imageElements = document.querySelectorAll('.image-item');
        const newOrder = [];
        
        imageElements.forEach(element => {
            const id = element.dataset.id;
            const image = this.images.find(img => img.id == id);
            if (image) {
                newOrder.push(image);
            }
        });
        
        this.images = newOrder;
        this.updateImageList();
    }

    removeImage(id) {
        this.images = this.images.filter(img => img.id != id);
        this.updateImageList();
        this.updateButtons();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateButtons() {
        const hasImages = this.images.length > 0;
        document.getElementById('generateBtn').disabled = !hasImages;
        document.getElementById('previewBtn').disabled = !hasImages;
    }

    updateControlValues() {
        document.getElementById('zoomSpeedValue').textContent = `${this.zoomSpeed}x`;
        document.getElementById('fadeIntensityValue').textContent = `${this.fadeIntensity}%`;
        document.getElementById('scaleRatioValue').textContent = this.scaleRatio;
    }

    async generateZoomQuilt() {
        if (this.images.length === 0) return;

        // Prepare images for rendering
        this.loadedImages = await this.prepareImages();
        
        // Start the animation
        this.startAnimation();
        
        // Enable download button
        document.getElementById('downloadBtn').disabled = false;
    }    async prepareImages() {
        const loadedImages = [];
        
        for (const imageData of this.images) {
            // Create canvas for each image with fade effect
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match the main canvas
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            
            // Calculate image scaling to cover the entire canvas (like CSS background-size: cover)
            const scaleX = canvas.width / imageData.width;
            const scaleY = canvas.height / imageData.height;
            const scale = Math.max(scaleX, scaleY); // Use max to cover entire canvas
            
            const scaledWidth = imageData.width * scale;
            const scaledHeight = imageData.height * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;
            
            // Fill canvas with black first
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Enable high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw the image to cover the entire canvas
            ctx.drawImage(imageData.image, x, y, scaledWidth, scaledHeight);
            
            // Apply fade effect to edges
            this.applyFadeEffect(ctx, canvas.width, canvas.height);
            
            loadedImages.push({
                canvas: canvas,
                ctx: ctx,
                originalData: imageData
            });
        }
        
        return loadedImages;
    }    applyFadeEffect(ctx, width, height) {
        if (this.fadeIntensity === 0) return;
        
        // Create a more sophisticated fade effect
        const fadeSize = (this.fadeIntensity / 100) * Math.min(width, height) * 0.2;
        
        // Create multiple gradients for edge fading
        const gradients = [];
        
        // Top fade
        const topGradient = ctx.createLinearGradient(0, 0, 0, fadeSize);
        topGradient.addColorStop(0, 'rgba(0,0,0,1)');
        topGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        // Bottom fade
        const bottomGradient = ctx.createLinearGradient(0, height - fadeSize, 0, height);
        bottomGradient.addColorStop(0, 'rgba(0,0,0,0)');
        bottomGradient.addColorStop(1, 'rgba(0,0,0,1)');
        
        // Left fade
        const leftGradient = ctx.createLinearGradient(0, 0, fadeSize, 0);
        leftGradient.addColorStop(0, 'rgba(0,0,0,1)');
        leftGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        // Right fade
        const rightGradient = ctx.createLinearGradient(width - fadeSize, 0, width, 0);
        rightGradient.addColorStop(0, 'rgba(0,0,0,0)');
        rightGradient.addColorStop(1, 'rgba(0,0,0,1)');
        
        // Apply fade effects
        ctx.globalCompositeOperation = 'destination-out';
        
        // Top
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, width, fadeSize);
        
        // Bottom
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, height - fadeSize, width, fadeSize);
        
        // Left
        ctx.fillStyle = leftGradient;
        ctx.fillRect(0, 0, fadeSize, height);
        
        // Right
        ctx.fillStyle = rightGradient;
        ctx.fillRect(width - fadeSize, 0, fadeSize, height);
        
        ctx.globalCompositeOperation = 'source-over';
    }startAnimation() {
        this.isPlaying = true;
        this.zoomLevel = 0; // Start from 0 for logarithmic zoom
        document.getElementById('playPauseBtn').textContent = '⏸️ Pause';
        this.animate();}    animate() {
        if (!this.isPlaying) return;
        
        if (this.loadedImages.length === 0) return;
        
        // Continuous zoom increment - this creates smooth infinite zoom
        this.zoomLevel += 0.005 * this.zoomSpeed;
        
        // Draw the zoom quilt frame
        this.drawZoomQuiltFrame();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }drawZoomQuiltFrame() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Clear the canvas first
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.loadedImages.length === 0) return;
        
        // Calculate which image should be the "base" (outermost) image
        const cycleLength = Math.log(1 / this.scaleRatio);
        const currentCycle = this.zoomLevel / cycleLength;
        const baseImageIndex = Math.floor(currentCycle) % this.loadedImages.length;
        const cycleProgress = currentCycle - Math.floor(currentCycle);
        
        // The main zoom factor for the current base image
        const baseZoom = Math.exp(cycleProgress * cycleLength);
        
        // Draw multiple nested layers
        for (let layer = 0; layer < this.loadedImages.length + 2; layer++) {
            // Calculate which image to use for this layer
            const imageIndex = (baseImageIndex + layer) % this.loadedImages.length;
            const imageCanvas = this.loadedImages[imageIndex].canvas;
            
            // Calculate the scale for this layer
            // Each layer is smaller by the scale ratio
            const layerScale = baseZoom * Math.pow(this.scaleRatio, layer);
            
            // Skip if too small to see
            if (layerScale < 0.001) continue;
            
            // Calculate dimensions and position (centered)
            const scaledWidth = this.canvas.width * layerScale;
            const scaledHeight = this.canvas.height * layerScale;
            const x = centerX - scaledWidth / 2;
            const y = centerY - scaledHeight / 2;
            
            // Set blend mode for layering
            this.ctx.globalCompositeOperation = this.blendMode;
            
            // Use image smoothing for better quality when scaling
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Draw the scaled image
            this.ctx.drawImage(imageCanvas, x, y, scaledWidth, scaledHeight);
        }
        
        // Reset blend mode
        this.ctx.globalCompositeOperation = 'source-over';
    }

    previewZoomQuilt() {
        if (this.images.length === 0) return;
        
        // Generate a single frame preview
        this.generateZoomQuilt();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseAnimation();
        } else {
            this.resumeAnimation();
        }
    }

    pauseAnimation() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        document.getElementById('playPauseBtn').textContent = '▶️ Play';
    }

    resumeAnimation() {
        this.isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️ Pause';
        this.animate();
    }    resetAnimation() {
        this.pauseAnimation();
        this.zoomLevel = 0; // Reset to 0 for logarithmic zoom
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.loadedImages.length > 0) {
            this.drawZoomQuiltFrame();
        }
    }

    async downloadAnimation() {
        if (this.loadedImages.length === 0) {
            alert('Please generate the zoom quilt first!');
            return;
        }        // Create a simple GIF-like sequence by capturing frames
        const frames = [];
        const frameCount = 60; // Number of frames for the loop
        const originalZoom = this.zoomLevel;
        
        // Disable animation while capturing
        const wasPlaying = this.isPlaying;
        this.pauseAnimation();
        
        // Capture frames
        for (let i = 0; i < frameCount; i++) {
            this.zoomLevel = (i / frameCount) * Math.log(1 / this.scaleRatio);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawZoomQuiltFrame();
            
            // Capture frame as data URL
            frames.push(this.canvas.toDataURL('image/png'));
        }
        
        // Restore original state
        this.zoomLevel = originalZoom;
        if (wasPlaying) {
            this.resumeAnimation();
        }
        
        // Create a zip file with all frames
        this.downloadFrames(frames);
    }

    downloadFrames(frames) {
        // For now, download the first frame as a sample
        // In a production app, you'd want to use a library like JSZip to create a proper archive
        const link = document.createElement('a');
        link.download = 'zoom-quilt-frame.png';
        link.href = frames[0];
        link.click();
        
        // Show info about additional frames
        alert(`Captured ${frames.length} frames! In a full implementation, these would be packaged as an animated GIF or video file.`);
    }
}

// Initialize the application when the page loads
let zoomQuilt;
document.addEventListener('DOMContentLoaded', () => {
    zoomQuilt = new ZoomQuiltGenerator();
    // Make it globally available for HTML onclick handlers
    window.zoomQuilt = zoomQuilt;
});
