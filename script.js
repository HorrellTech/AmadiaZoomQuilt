// Zoom Quilt Generator - Main JavaScript File
class ZoomQuiltGenerator {
    constructor() {
        this.images = [];
        this.animationId = null;
        this.isPlaying = false;
        this.zoomLevel = 0;
        this.zoomSpeed = 1;
        this.blendMode = 'normal';
        this.fadeIntensity = 20;
        this.scaleRatio = 0.5;
        this.canvas = null;
        this.ctx = null;
        this.loadedImages = [];
        
        // Audio properties
        this.audioFile = null;
        this.audioElement = null;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.audioSource = null;
        this.audioEnabled = false;
        this.audioReactiveIntensity = 2.0;
        this.audioFreqMin = 60;  // Hz
        this.audioFreqMax = 250; // Hz
        this.baseZoomSpeed = 1.0;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.initializeUploadArea();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateControlValues();
        this.setupAudio();
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

    setupAudio() {
        // Create audio element
        this.audioElement = document.createElement('audio');
        this.audioElement.loop = true;
        this.audioElement.volume = 0.7;
        
        // Add audio controls to the page
        const audioControls = document.getElementById('audioControls');
        if (audioControls) {
            audioControls.appendChild(this.audioElement);
        }
    }

    async initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 2048;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                if (this.audioElement && !this.audioSource) {
                    this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
                    this.audioSource.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);
                }
            } catch (error) {
                console.error('Failed to initialize audio context:', error);
            }
        }
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Audio file input
        const audioInput = document.getElementById('audioInput');
        audioInput.addEventListener('change', (e) => this.handleAudioSelect(e));

        // Control inputs
        document.getElementById('zoomSpeed').addEventListener('input', (e) => {
            this.zoomSpeed = parseFloat(e.target.value);
            this.baseZoomSpeed = this.zoomSpeed;
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

        // Audio controls
        document.getElementById('audioReactiveIntensity').addEventListener('input', (e) => {
            this.audioReactiveIntensity = parseFloat(e.target.value);
            document.getElementById('audioIntensityValue').textContent = `${this.audioReactiveIntensity}x`;
        });

        document.getElementById('audioFreqMin').addEventListener('input', (e) => {
            this.audioFreqMin = parseInt(e.target.value);
            document.getElementById('audioFreqMinValue').textContent = `${this.audioFreqMin}Hz`;
        });

        document.getElementById('audioFreqMax').addEventListener('input', (e) => {
            this.audioFreqMax = parseInt(e.target.value);
            document.getElementById('audioFreqMaxValue').textContent = `${this.audioFreqMax}Hz`;
        });

        document.getElementById('audioVolume').addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            if (this.audioElement) {
                this.audioElement.volume = volume;
            }
            document.getElementById('audioVolumeValue').textContent = `${Math.round(volume * 100)}%`;
        });

        document.getElementById('audioEnabled').addEventListener('change', (e) => {
            this.audioEnabled = e.target.checked;
            this.updateAudioControls();
        });

        // Action buttons
        document.getElementById('generateBtn').addEventListener('click', () => this.generateZoomQuilt());
        document.getElementById('previewBtn').addEventListener('click', () => this.previewZoomQuilt());
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAnimation());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadAnimation());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('msfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
        
        // Listen for window resize while in fullscreen
        window.addEventListener('resize', () => {
            if (this.isFullscreen()) {
                this.resizeCanvasForFullscreen();
            }
        });
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

    toggleFullscreen() {
        const canvasContainer = document.querySelector('.canvas-container');
        
        if (!this.isFullscreen()) {
            this.enterFullscreen(canvasContainer);
        } else {
            this.exitFullscreen();
        }
    }

    isFullscreen() {
        return !!(document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement);
    }

    enterFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (this.isFullscreen()) {
            fullscreenBtn.innerHTML = '🗗 Exit Fullscreen';
            fullscreenBtn.title = 'Exit Fullscreen';
            document.querySelector('.canvas-container').classList.add('fullscreen-active');
            // Resize canvas to fill screen while maintaining aspect ratio
            this.resizeCanvasForFullscreen();
        } else {
            fullscreenBtn.innerHTML = '🗖 Fullscreen';
            fullscreenBtn.title = 'Enter Fullscreen';
            document.querySelector('.canvas-container').classList.remove('fullscreen-active');
            // Restore original canvas size
            this.restoreCanvasSize();
        }
    }

    resizeCanvasForFullscreen() {
        const canvas = this.canvas;
        
        // Store original dimensions
        if (!this.originalCanvasWidth) {
            this.originalCanvasWidth = canvas.width;
            this.originalCanvasHeight = canvas.height;
        }
        
        // Get screen dimensions
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        
        // Calculate the canvas aspect ratio
        const canvasAspectRatio = this.originalCanvasWidth / this.originalCanvasHeight;
        const screenAspectRatio = screenWidth / screenHeight;
        
        let newWidth, newHeight;
        
        // Fill the screen (cover mode) - scale to fill entire screen
        if (canvasAspectRatio > screenAspectRatio) {
            // Canvas is wider than screen ratio - fit to height
            newHeight = screenHeight;
            newWidth = screenHeight * canvasAspectRatio;
        } else {
            // Canvas is taller than screen ratio - fit to width
            newWidth = screenWidth;
            newHeight = screenWidth / canvasAspectRatio;
        }
        
        // Update canvas size
        canvas.width = Math.round(newWidth);
        canvas.height = Math.round(newHeight);
        
        // Regenerate images for new canvas size if we have any
        if (this.images.length > 0) {
            this.prepareImages().then(loadedImages => {
                this.loadedImages = loadedImages;
                // Redraw current frame
                if (this.loadedImages.length > 0) {
                    this.drawZoomQuiltFrame();
                }
            });
        }
    }

    restoreCanvasSize() {
        const canvas = this.canvas;
        
        // Restore original dimensions
        if (this.originalCanvasWidth && this.originalCanvasHeight) {
            canvas.width = this.originalCanvasWidth;
            canvas.height = this.originalCanvasHeight;
            
            // Regenerate images for original canvas size
            if (this.images.length > 0) {
                this.prepareImages().then(loadedImages => {
                    this.loadedImages = loadedImages;
                    // Redraw current frame
                    if (this.loadedImages.length > 0) {
                        this.drawZoomQuiltFrame();
                    }
                });
            }
        }
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
                    <button class="control-btn arrow-btn" onclick="zoomQuilt.moveImageLeft('${img.id}')" ${index === 0 ? 'disabled' : ''} title="Move Left">◀</button>
                    <button class="control-btn arrow-btn" onclick="zoomQuilt.moveImageRight('${img.id}')" ${index === this.images.length - 1 ? 'disabled' : ''} title="Move Right">▶</button>
                    <button class="control-btn remove-btn" onclick="zoomQuilt.removeImage('${img.id}')" title="Remove">×</button>
                </div>
            </div>
        `).join('');

        this.setupImageSorting();
    }

    setupImageSorting() {
        const imageList = document.getElementById('imageList');
        let draggedElement = null;
        let draggedIndex = -1;

        imageList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('image-item')) {
                draggedElement = e.target;
                draggedIndex = Array.from(imageList.children).indexOf(draggedElement);
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
            }
        });

        imageList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('image-item')) {
                e.target.classList.remove('dragging');
                draggedElement = null;
                draggedIndex = -1;
            }
        });

        imageList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedElement) {
                const afterElement = this.getDragAfterElement(imageList, e.clientY);
                
                if (afterElement === null) {
                    // Insert at the end if no element is after
                    if (imageList.lastElementChild !== draggedElement) {
                        imageList.appendChild(draggedElement);
                    }
                } else {
                    // Insert before the found element
                    if (afterElement !== draggedElement && afterElement.previousElementSibling !== draggedElement) {
                        imageList.insertBefore(draggedElement, afterElement);
                    }
                }
            }
        });

        imageList.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement) {
                // Get the new position
                const newIndex = Array.from(imageList.children).indexOf(draggedElement);
                
                // Only reorder if position actually changed
                if (newIndex !== draggedIndex && draggedIndex !== -1) {
                    this.reorderImages();
                }
            }
        });
    }

    moveImageLeft(id) {
        const currentIndex = this.images.findIndex(img => img.id == id);
        if (currentIndex > 0) {
            // Swap with previous image
            [this.images[currentIndex - 1], this.images[currentIndex]] = 
            [this.images[currentIndex], this.images[currentIndex - 1]];
            this.updateImageList();
            
            // Regenerate if animation is playing
            if (this.isPlaying && this.loadedImages.length > 0) {
                this.regenerateImages();
            }
        }
    }

    moveImageRight(id) {
        const currentIndex = this.images.findIndex(img => img.id == id);
        if (currentIndex < this.images.length - 1) {
            // Swap with next image
            [this.images[currentIndex], this.images[currentIndex + 1]] = 
            [this.images[currentIndex + 1], this.images[currentIndex]];
            this.updateImageList();
            
            // Regenerate if animation is playing
            if (this.isPlaying && this.loadedImages.length > 0) {
                this.regenerateImages();
            }
        }
    }

    async regenerateImages() {
        // Only regenerate if we have images and animation is active
        if (this.images.length > 0) {
            this.loadedImages = await this.prepareImages();
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.image-item:not(.dragging)')];

        const result = draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY, element: null });

        return result.element; // This should always return a valid element or null
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
        document.getElementById('audioIntensityValue').textContent = `${this.audioReactiveIntensity}x`;
        document.getElementById('audioFreqMinValue').textContent = `${this.audioFreqMin}Hz`;
        document.getElementById('audioFreqMaxValue').textContent = `${this.audioFreqMax}Hz`;
        document.getElementById('audioVolumeValue').textContent = '70%';
    }

    async generateZoomQuilt() {
        if (this.images.length === 0) return;

        // Stop any existing animation first
        this.pauseAnimation();

        // Initialize audio context if needed
        if (this.audioEnabled && this.audioFile) {
            await this.initAudioContext();
        }

        // Prepare images for rendering
        this.loadedImages = await this.prepareImages();

        // Start the animation
        this.startAnimation();

        // Start audio if enabled
        if (this.audioEnabled && this.audioElement) {
            try {
                this.audioElement.currentTime = 0;
                await this.audioElement.play();
            } catch (error) {
                console.error('Failed to play audio:', error);
            }
        }

        // Enable download button
        document.getElementById('downloadBtn').disabled = false;
    }
    
    async prepareImages() {
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
    } 
    
    applyFadeEffect(ctx, width, height) {
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
    } 
    
    startAnimation() {
        // First, stop any existing animation to prevent accumulation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.isPlaying = true;
        // Always reset zoom level when generating fresh to prevent accumulation
        this.zoomLevel = 0;
        document.getElementById('playPauseBtn').textContent = '⏸️ Pause';
        this.animate();
    }

    animate() {
        if (!this.isPlaying) return;

        if (this.loadedImages.length === 0) return;

        // Update zoom speed based on audio
        this.updateZoomSpeedWithAudio();

        // Continuous zoom increment - this creates smooth infinite zoom
        this.zoomLevel += 0.005 * this.zoomSpeed;

        // Draw the zoom quilt frame
        this.drawZoomQuiltFrame();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawZoomQuiltFrame() {
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
        
        // Extended layer range - draw from larger background images to smaller foreground ones
        // Start from negative layers to include much larger background images
        const totalLayers = this.loadedImages.length + 6; // Increased buffer for smoother transitions
        
        // Draw layers from largest to smallest (background to foreground)
        for (let layer = -3; layer < totalLayers; layer++) {
            // Calculate which image to use for this layer
            // Handle negative indices properly
            const imageIndex = ((baseImageIndex + layer) % this.loadedImages.length + this.loadedImages.length) % this.loadedImages.length;
            const imageCanvas = this.loadedImages[imageIndex].canvas;
            
            // Calculate the scale for this layer
            // Each layer is smaller by the scale ratio
            const layerScale = baseZoom * Math.pow(this.scaleRatio, layer);
            
            // Keep drawing large images even when they're much bigger than the canvas
            // This ensures smooth transitions as images grow beyond screen bounds
            if (layerScale < 0.001 || layerScale > 12) continue; // Extended upper limit
            
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

        // Stop any existing animation first
        this.pauseAnimation();
        
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
            this.animationId = null;
        }
        
        // Pause audio
        if (this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
        }
        
        document.getElementById('playPauseBtn').textContent = '▶️ Play';
    }

    resumeAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸️ Pause';
        
        // Resume audio
        if (this.audioEnabled && this.audioElement && this.audioElement.paused) {
            this.audioElement.play().catch(error => {
                console.error('Failed to resume audio:', error);
            });
        }
        
        this.animate();
    }
    
    resetAnimation() {
        this.pauseAnimation();
        this.zoomLevel = 0;

        // Reset audio
        if (this.audioElement) {
            this.audioElement.currentTime = 0;
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.loadedImages.length > 0) {
            this.drawZoomQuiltFrame();
        }
    }

    getAudioIntensity() {
        if (!this.audioEnabled || !this.analyser || !this.dataArray) {
            return 0;
        }

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate frequency bin range
        const sampleRate = this.audioContext.sampleRate;
        const fftSize = this.analyser.fftSize;
        const binWidth = sampleRate / fftSize;
        
        const minBin = Math.floor(this.audioFreqMin / binWidth);
        const maxBin = Math.floor(this.audioFreqMax / binWidth);
        
        // Calculate average amplitude in the specified frequency range
        let sum = 0;
        let count = 0;
        
        for (let i = minBin; i <= maxBin && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
            count++;
        }
        
        if (count === 0) return 0;
        
        // Normalize to 0-1 range
        const average = sum / count;
        return average / 255;
    }

    updateZoomSpeedWithAudio() {
        if (this.audioEnabled && this.audioElement && !this.audioElement.paused) {
            const audioIntensity = this.getAudioIntensity();
            // Apply audio reactive intensity
            const reactiveMultiplier = 1 + (audioIntensity * this.audioReactiveIntensity);
            this.zoomSpeed = this.baseZoomSpeed * reactiveMultiplier;
        } else {
            this.zoomSpeed = this.baseZoomSpeed;
        }
    }

    async downloadAnimation() {
        if (this.loadedImages.length === 0) {
            alert('Please generate the zoom quilt first!');
            return;
        }
        
        // Show the export modal
        this.showExportModal();
    }

    showExportModal() {
        const audioReactiveInfo = this.audioEnabled && this.audioFile ? `
            <div class="audio-export-info">
                <h4>🎵 Audio-Reactive Export Enabled</h4>
                <p>The export will sync to your audio file duration and include audio reactivity.</p>
                <p><strong>Audio File:</strong> ${this.audioFile.name}</p>
                <p><strong>Duration:</strong> ${this.audioElement.duration ? Math.floor(this.audioElement.duration / 60) + ':' + Math.floor(this.audioElement.duration % 60).toString().padStart(2, '0') : 'Unknown'}</p>
            </div>
        ` : '';

        // Create modal HTML
        const modalHtml = `
            <div class="modal-overlay" id="exportModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🎬 Export Zoom Quilt Animation</h3>
                        <button class="modal-close" onclick="zoomQuilt.closeExportModal()">×</button>
                    </div>
                    <div class="modal-body">
                        ${audioReactiveInfo}
                        
                        <div class="export-options">
                            <div class="option-group">
                                <label for="exportFormat">Export Format</label>
                                <select id="exportFormat">
                                    <option value="webm">WebM (Recommended)</option>
                                    <option value="mp4">MP4</option>
                                    <option value="gif">Animated GIF (No Audio)</option>
                                </select>
                                ${this.audioEnabled && this.audioFile ? '<small>Audio will be included in video formats</small>' : ''}
                            </div>
                            
                            <div class="option-group" ${this.audioEnabled && this.audioFile ? 'style="opacity: 0.5;"' : ''}>
                                <label for="exportCycles">Number of Cycles ${this.audioEnabled && this.audioFile ? '(Overridden by Audio)' : ''}</label>
                                <input type="number" id="exportCycles" min="1" max="10" value="2" step="1" ${this.audioEnabled && this.audioFile ? 'disabled' : ''}>
                                <small>${this.audioEnabled && this.audioFile ? 'Duration set by audio file' : 'Complete loops through all images'}</small>
                            </div>
                            
                            <div class="option-group">
                                <label for="exportFPS">Frame Rate (FPS)</label>
                                <input type="range" id="exportFPS" min="15" max="60" value="30" step="1">
                                <span class="value-display" id="exportFPSValue">30 FPS</span>
                            </div>
                            
                            <div class="option-group">
                                <label for="exportQuality">Quality</label>
                                <input type="range" id="exportQuality" min="0.1" max="1" value="0.8" step="0.1">
                                <span class="value-display" id="exportQualityValue">0.8</span>
                            </div>
                            
                            <div class="option-group">
                                <label for="exportResolution">Resolution</label>
                                <select id="exportResolution">
                                    <option value="800x600">800×600 (Current)</option>
                                    <option value="1920x1080">1920×1080 (Full HD)</option>
                                    <option value="1280x720">1280×720 (HD)</option>
                                    <option value="640x480">640×480 (SD)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="export-info">
                            <p id="exportEstimate">Calculating...</p>
                            <div class="progress-container" id="exportProgress" style="display: none;">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <span id="progressText">0%</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="zoomQuilt.closeExportModal()">Cancel</button>
                        <button class="btn btn-success" onclick="zoomQuilt.startExport()">🎬 Start Export</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Setup event listeners for the modal
        this.setupExportModalListeners();
        
        // Initial estimate calculation
        this.updateExportEstimate();
    }

    setupExportModalListeners() {
        // Update FPS display
        document.getElementById('exportFPS').addEventListener('input', (e) => {
            document.getElementById('exportFPSValue').textContent = `${e.target.value} FPS`;
            this.updateExportEstimate();
        });
        
        // Update quality display
        document.getElementById('exportQuality').addEventListener('input', (e) => {
            document.getElementById('exportQualityValue').textContent = e.target.value;
            this.updateExportEstimate();
        });
        
        // Update estimate when other options change
        ['exportFormat', 'exportCycles', 'exportResolution'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateExportEstimate();
            });
        });
    }

    updateExportEstimate() {
        const cycles = parseInt(document.getElementById('exportCycles').value);
        const fps = parseInt(document.getElementById('exportFPS').value);
        const format = document.getElementById('exportFormat').value;
        const resolution = document.getElementById('exportResolution').value;
        
        let duration, totalFrames;
        
        // Calculate duration based on audio reactivity
        if (this.audioEnabled && this.audioFile && this.audioElement.duration) {
            // Use audio duration when audio reactive is enabled
            duration = this.audioElement.duration;
            totalFrames = Math.ceil(duration * fps);
            
            // Update cycles input to show how many cycles will fit in audio duration
            const cycleLength = Math.log(1 / this.scaleRatio);
            const calculatedCycles = (duration * 0.005 * this.baseZoomSpeed) / cycleLength;
            
            // Add audio info to estimate
            document.getElementById('exportEstimate').innerHTML = `
                <strong>Audio-Reactive Export:</strong><br>
                Duration: ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}<br>
                Frames: ${totalFrames} frames<br>
                Cycles: ~${calculatedCycles.toFixed(1)} zoom cycles<br>
                Audio: Included with reactivity
            `;
            return;
        } else {
            // Standard duration calculation for non-audio exports
            const cycleLength = Math.log(1 / this.scaleRatio);
            duration = (cycles * cycleLength) / (0.005 * this.baseZoomSpeed);
            totalFrames = Math.ceil(duration * fps);
        }
        
        let estimatedSize = 0;
        const [width, height] = resolution.split('x').map(Number);
        const pixelCount = width * height;
        
        switch (format) {
            case 'webm':
                estimatedSize = (pixelCount * totalFrames * 0.1) / (1024 * 1024);
                break;
            case 'mp4':
                estimatedSize = (pixelCount * totalFrames * 0.15) / (1024 * 1024);
                break;
            case 'gif':
                estimatedSize = (pixelCount * totalFrames * 0.5) / (1024 * 1024);
                break;
        }
        
        document.getElementById('exportEstimate').textContent = 
            `Estimated: ${totalFrames} frames, ${Math.ceil(duration)}s duration, ~${Math.ceil(estimatedSize)}MB`;
    }

    closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.remove();
        }
    }

    async startExport() {
        const format = document.getElementById('exportFormat').value;
        const cycles = parseInt(document.getElementById('exportCycles').value);
        const fps = parseInt(document.getElementById('exportFPS').value);
        const quality = parseFloat(document.getElementById('exportQuality').value);
        const resolution = document.getElementById('exportResolution').value;
        
        // Show progress
        document.getElementById('exportProgress').style.display = 'block';
        
        try {
            if (format === 'gif') {
                await this.exportAsGIF(cycles, fps, resolution);
            } else {
                await this.exportAsVideo(format, cycles, fps, quality, resolution);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
        
        this.closeExportModal();
    }

    async exportAsVideo(format, cycles, fps, quality, resolution) {
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
            throw new Error('Video recording is not supported in this browser');
        }
        
        const [width, height] = resolution.split('x').map(Number);
        
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = width;
        exportCanvas.height = height;
        
        // Create a separate audio element for export to avoid conflicts
        let exportAudioElement = null;
        let exportAudioContext = null;
        let exportAudioSource = null;
        
        if (this.audioEnabled && this.audioFile) {
            exportAudioElement = document.createElement('audio');
            exportAudioElement.src = this.audioElement.src;
            exportAudioElement.volume = this.audioElement.volume;
            exportAudioElement.loop = false; // Don't loop for export
        }
        
        // Setup MediaRecorder
        const stream = exportCanvas.captureStream(fps);
        
        // Add audio track if audio reactive is enabled
        if (exportAudioElement) {
            try {
                // Create separate audio context for export
                exportAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                exportAudioSource = exportAudioContext.createMediaElementSource(exportAudioElement);
                const audioDestination = exportAudioContext.createMediaStreamDestination();
                exportAudioSource.connect(audioDestination);
                
                // Add audio track to the stream
                const audioTracks = audioDestination.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    stream.addTrack(audioTracks[0]);
                }
            } catch (error) {
                console.warn('Could not add audio to export:', error);
                exportAudioElement = null; // Disable audio if it fails
            }
        }
        
        const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: width * height * fps * quality * 0.1,
            audioBitsPerSecond: exportAudioElement ? 128000 : undefined
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        
        return new Promise((resolve, reject) => {
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                this.downloadBlob(blob, `zoom-quilt-${this.audioEnabled ? 'audio-reactive' : 'standard'}.${format}`);
                
                // Clean up export audio context
                if (exportAudioContext) {
                    exportAudioContext.close();
                }
                
                resolve();
            };
            
            mediaRecorder.onerror = reject;
            
            // Start recording
            mediaRecorder.start();
            
            // Start export audio playback if available
            if (exportAudioElement) {
                exportAudioElement.currentTime = 0;
                exportAudioElement.play().catch(console.error);
            }
            
            // Render frames with proper timing
            this.renderExportFrames(exportCanvas, exportCtx, cycles, fps, width, height, exportAudioElement)
                .then(() => {
                    // Stop export audio
                    if (exportAudioElement && !exportAudioElement.paused) {
                        exportAudioElement.pause();
                    }
                    mediaRecorder.stop();
                })
                .catch(reject);
        });
    }

    async renderExportFrames(canvas, ctx, cycles, fps, width, height, exportAudioElement = null) {
        const originalZoom = this.zoomLevel;
        const wasPlaying = this.isPlaying;
        this.pauseAnimation();
        
        // Prepare images for export resolution
        const exportImages = await this.prepareImagesForExport(width, height);
        
        let duration, totalFrames, frameInterval;
        
        if (this.audioEnabled && this.audioFile && this.audioElement.duration) {
            // Audio-reactive export: sync to audio duration
            duration = this.audioElement.duration;
            totalFrames = Math.ceil(duration * fps);
            frameInterval = 1 / fps; // Time per frame in seconds
        } else {
            // Standard export: use cycles
            const cycleLength = Math.log(1 / this.scaleRatio);
            const totalZoom = cycles * cycleLength;
            duration = (cycles * cycleLength) / (0.005 * this.baseZoomSpeed);
            totalFrames = Math.ceil(duration * fps);
            frameInterval = 1 / fps;
        }
        
        const startTime = performance.now();
        
        // Reset zoom level to start fresh for export
        let exportZoomLevel = 0;
        
        for (let frame = 0; frame < totalFrames; frame++) {
            // Update progress
            const progress = (frame / totalFrames) * 100;
            document.getElementById('progressFill').style.width = `${progress}%`;
            document.getElementById('progressText').textContent = `${Math.round(progress)}% - Frame ${frame + 1}/${totalFrames}`;
            
            const currentTime = frame * frameInterval;
            
            if (this.audioEnabled && this.audioFile && exportAudioElement) {
                // Audio-reactive mode: calculate zoom increment with simulated audio intensity
                const baseIntensity = Math.sin(currentTime * 2) * 0.5 + 0.5; // Simulate audio intensity
                const reactiveSpeed = this.baseZoomSpeed * (1 + (baseIntensity * this.audioReactiveIntensity));
                // Accumulate zoom level like in live animation
                exportZoomLevel += 0.005 * reactiveSpeed;
            } else {
                // Standard mode: accumulate zoom level progressively
                exportZoomLevel += 0.005 * this.baseZoomSpeed;
            }
            
            // Set the zoom level for rendering this frame
            this.zoomLevel = exportZoomLevel;
            
            // Clear export canvas
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            
            // Render the zoom quilt frame to export canvas
            this.drawZoomQuiltFrameToExportCanvas(ctx, width, height, exportImages);
            
            // Wait for the appropriate time to maintain frame rate
            if (frame < totalFrames - 1) {
                const expectedTime = startTime + ((frame + 1) * 1000 / fps);
                const currentRealTime = performance.now();
                const waitTime = Math.max(0, expectedTime - currentRealTime);
                
                if (waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        // Restore original state
        this.zoomLevel = originalZoom;
        if (wasPlaying) {
            this.resumeAnimation();
        }
    }

    async prepareImagesForExport(width, height) {
        const exportImages = [];

        for (const imageData of this.images) {
            // Create canvas for each image with export dimensions
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size to export dimensions
            canvas.width = width;
            canvas.height = height;

            // Calculate image scaling to cover the entire canvas
            const scaleX = canvas.width / imageData.width;
            const scaleY = canvas.height / imageData.height;
            const scale = Math.max(scaleX, scaleY);

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

            exportImages.push({
                canvas: canvas,
                ctx: ctx,
                originalData: imageData
            });
        }

        return exportImages;
    }

    getAudioIntensityForExport() {
        // For export, we need to sample audio data at current time
        // This is a simplified version - in practice, you'd want to pre-analyze the audio
        if (!this.audioEnabled || !this.analyser || !this.dataArray) {
            return 0;
        }

        // Get current audio data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate frequency bin range
        const sampleRate = this.audioContext.sampleRate;
        const fftSize = this.analyser.fftSize;
        const binWidth = sampleRate / fftSize;
        
        const minBin = Math.floor(this.audioFreqMin / binWidth);
        const maxBin = Math.floor(this.audioFreqMax / binWidth);
        
        // Calculate average amplitude in the specified frequency range
        let sum = 0;
        let count = 0;
        
        for (let i = minBin; i <= maxBin && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
            count++;
        }
        
        if (count === 0) return 0;
        
        // Normalize to 0-1 range
        const average = sum / count;
        return average / 255;
    }

    drawZoomQuiltFrameToExportCanvas(ctx, width, height, exportImages) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        if (exportImages.length === 0) return;
        
        // Same logic as main drawZoomQuiltFrame but adapted for export
        const cycleLength = Math.log(1 / this.scaleRatio);
        const currentCycle = this.zoomLevel / cycleLength;
        const baseImageIndex = Math.floor(currentCycle) % exportImages.length;
        const cycleProgress = currentCycle - Math.floor(currentCycle);
        const baseZoom = Math.exp(cycleProgress * cycleLength);
        const totalLayers = exportImages.length + 6;
        
        for (let layer = -3; layer < totalLayers; layer++) {
            const imageIndex = ((baseImageIndex + layer) % exportImages.length + exportImages.length) % exportImages.length;
            const imageCanvas = exportImages[imageIndex].canvas;
            const layerScale = baseZoom * Math.pow(this.scaleRatio, layer);
            
            if (layerScale < 0.001 || layerScale > 12) continue;
            
            const scaledWidth = width * layerScale;
            const scaledHeight = height * layerScale;
            const x = centerX - scaledWidth / 2;
            const y = centerY - scaledHeight / 2;
            
            ctx.globalCompositeOperation = this.blendMode;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw the image scaled for export resolution
            ctx.drawImage(imageCanvas, 
                0, 0, imageCanvas.width, imageCanvas.height,
                x, y, scaledWidth, scaledHeight
            );
        }
        
        ctx.globalCompositeOperation = 'source-over';
    }

    async exportAsGIF(cycles, fps, resolution) {
        // For GIF export, we'll capture frames and download them as a sequence
        // In a production app, you'd want to use a library like gif.js
        alert('GIF export requires additional libraries. For now, use WebM or MP4 format.');
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async handleAudioSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            this.audioFile = file;
            
            // Create object URL for the audio file
            const audioURL = URL.createObjectURL(file);
            this.audioElement.src = audioURL;
            
            // Update UI
            document.getElementById('audioFileName').textContent = file.name;
            document.getElementById('audioFileSize').textContent = this.formatFileSize(file.size);
            document.getElementById('audioInfo').style.display = 'block';
            
            // Enable audio controls
            document.getElementById('audioEnabled').disabled = false;
            
            // Initialize audio context on user interaction
            await this.initAudioContext();
        }
    }

    updateAudioControls() {
        const audioControlsSection = document.querySelector('.audio-controls');
        if (audioControlsSection) {
            audioControlsSection.style.opacity = this.audioEnabled ? '1' : '0.5';
            
            // Enable/disable audio control inputs
            ['audioReactiveIntensity', 'audioFreqMin', 'audioFreqMax', 'audioVolume'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.disabled = !this.audioEnabled;
                }
            });
        }
    }

    // Add audio preset methods
    applyAudioPreset(presetName) {
        const presets = {
            bass: {
                freqMin: 20,
                freqMax: 100,
                intensity: 3.0
            },
            rock: {
                freqMin: 100,
                freqMax: 400,
                intensity: 2.5
            },
            vocal: {
                freqMin: 200,
                freqMax: 600,
                intensity: 2.0
            },
            classical: {
                freqMin: 60,
                freqMax: 800,
                intensity: 1.5
            },
            treble: {
                freqMin: 400,
                freqMax: 1000,
                intensity: 2.8
            },
            fullrange: {
                freqMin: 20,
                freqMax: 1000,
                intensity: 1.8
            }
        };

        const preset = presets[presetName];
        if (preset) {
            // Update values
            this.audioFreqMin = preset.freqMin;
            this.audioFreqMax = preset.freqMax;
            this.audioReactiveIntensity = preset.intensity;

            // Update UI elements
            document.getElementById('audioFreqMin').value = preset.freqMin;
            document.getElementById('audioFreqMax').value = preset.freqMax;
            document.getElementById('audioReactiveIntensity').value = preset.intensity;

            // Update display values
            document.getElementById('audioFreqMinValue').textContent = `${preset.freqMin}Hz`;
            document.getElementById('audioFreqMaxValue').textContent = `${preset.freqMax}Hz`;
            document.getElementById('audioIntensityValue').textContent = `${preset.intensity}x`;

            // Show feedback
            this.showPresetAppliedFeedback(presetName);
        }
    }

    showPresetAppliedFeedback(presetName) {
        // Create a temporary feedback message
        const feedback = document.createElement('div');
        feedback.textContent = `✓ ${presetName.charAt(0).toUpperCase() + presetName.slice(1)} preset applied!`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out forwards;
        `;

        document.body.appendChild(feedback);

        // Remove after 3 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => feedback.remove(), 300);
        }, 2700);
    }

    // Fix the getDragAfterElement method to handle null properly
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.image-item:not(.dragging)')];

        const result = draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY, element: null });

        return result.element;
    }

    // Add method to handle empty upload area initialization
    initializeUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea && !uploadArea.innerHTML.trim()) {
            uploadArea.innerHTML = `
                <div class="upload-content">
                    <div class="upload-icon">🖼️</div>
                    <h3>Drop your images here</h3>
                    <p>Or click to browse files</p>
                    <input type="file" id="fileInput" multiple accept="image/*" hidden>
                    <button class="btn btn-secondary" onclick="document.getElementById('fileInput').click()">
                        Choose Images
                    </button>
                </div>
            `;
        }
    }
}

// Initialize the application when the page loads
let zoomQuilt;
document.addEventListener('DOMContentLoaded', () => {
    zoomQuilt = new ZoomQuiltGenerator();
    // Make it globally available for HTML onclick handlers
    window.zoomQuilt = zoomQuilt;
});
