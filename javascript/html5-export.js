class HTML5Exporter {
    constructor(zoomQuiltGenerator) {
        this.zoomQuilt = zoomQuiltGenerator;
    }

    async exportHTML5Package() {
        if (this.zoomQuilt.loadedImages.length === 0) {
            this.zoomQuilt.showNotification('Please import images first', 'warning');
            return;
        }

        try {
            // Show export modal with HTML5 option
            this.showHTML5ExportModal();
        } catch (error) {
            console.error('HTML5 export error:', error);
            this.zoomQuilt.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    showHTML5ExportModal() {
        const audioReactiveInfo = this.zoomQuilt.audioEnabled && this.zoomQuilt.audioFile ? `
            <div class="audio-export-info">
                <h4>🎵 Audio-Reactive Export Enabled</h4>
                <p>The HTML5 export will include your audio file and audio reactivity.</p>
                <p><strong>Audio File:</strong> ${this.zoomQuilt.audioFile.name}</p>
                <p><strong>Duration:</strong> ${this.zoomQuilt.audioElement.duration ? Math.floor(this.zoomQuilt.audioElement.duration / 60) + ':' + Math.floor(this.zoomQuilt.audioElement.duration % 60).toString().padStart(2, '0') : 'Unknown'}</p>
            </div>
        ` : '';

        const modalHtml = `
            <div class="modal-overlay" id="html5ExportModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🌐 Export HTML5 Package</h3>
                        <button class="modal-close" onclick="html5Exporter.closeHTML5ExportModal()">×</button>
                    </div>
                    <div class="modal-body">
                        ${audioReactiveInfo}
                        
                        <div class="export-options">
                            <div class="option-group">
                                <label for="html5Title">Project Title</label>
                                <input type="text" id="html5Title" value="My Zoom Quilt" placeholder="Enter project title">
                                <small>This will be used as the page title and filename</small>
                            </div>

                            <div class="option-group">
                                <label for="html5CanvasSize">Canvas Size</label>
                                <select id="html5CanvasSize">
                                    <option value="current">Current Size (${this.zoomQuilt.canvas.width}×${this.zoomQuilt.canvas.height})</option>
                                    <option value="800x600">800×600 (Standard)</option>
                                    <option value="1920x1080">1920×1080 (Full HD)</option>
                                    <option value="1280x720">1280×720 (HD)</option>
                                    <option value="1024x768">1024×768 (4:3)</option>
                                </select>
                            </div>

                            <div class="option-group">
                                <label for="html5AutoPlay">Auto-play Settings</label>
                                <div class="checkbox-options">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="html5AutoStart" checked>
                                        <span>Auto-start animation</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="html5ShowControls" checked>
                                        <span>Show playback controls</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="html5AllowFullscreen" checked>
                                        <span>Allow fullscreen</span>
                                    </label>
                                </div>
                            </div>

                            <div class="option-group">
                                <label for="html5BackgroundColor">Background Color</label>
                                <input type="color" id="html5BackgroundColor" value="#0f0f23">
                                <small>Background color for the webpage</small>
                            </div>

                            <div class="option-group">
                                <label>Export Quality</label>
                                <div class="radio-options">
                                    <label class="radio-label">
                                        <input type="radio" name="html5Quality" value="high" checked>
                                        <span>High Quality (Larger file size)</span>
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="html5Quality" value="medium">
                                        <span>Medium Quality (Balanced)</span>
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="html5Quality" value="low">
                                        <span>Low Quality (Smaller file size)</span>
                                    </label>
                                </div>
                            </div>

                            <div class="option-group">
                                <label>Include in Package</label>
                                <div class="checkbox-options">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="html5IncludeReadme" checked>
                                        <span>Include README.txt with instructions</span>
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="html5IncludeSource" checked>
                                        <span>Include source files (for editing)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-info">
                            <p id="html5ExportEstimate">Calculating package size...</p>
                            <div class="progress-container" id="html5ExportProgress" style="display: none;">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="html5ProgressFill"></div>
                                </div>
                                <span id="html5ProgressText">0%</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="html5Exporter.closeHTML5ExportModal()">Cancel</button>
                        <button class="btn btn-success" onclick="html5Exporter.startHTML5Export()">🌐 Create HTML5 Package</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupHTML5ExportModalListeners();
        this.updateHTML5ExportEstimate();
    }

    setupHTML5ExportModalListeners() {
        ['html5Title', 'html5CanvasSize', 'html5Quality'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateHTML5ExportEstimate());
            }
        });
    }

    updateHTML5ExportEstimate() {
        const quality = document.querySelector('input[name="html5Quality"]:checked')?.value || 'high';
        const canvasSize = document.getElementById('html5CanvasSize')?.value || 'current';
        const includeSource = document.getElementById('html5IncludeSource')?.checked || false;
        
        let estimatedSize = 0;

        // Base HTML/CSS/JS files
        estimatedSize += 0.5; // MB for core files

        // Images (estimate based on quality)
        const imageCount = this.zoomQuilt.images.length;
        const qualityMultipliers = { high: 1.0, medium: 0.6, low: 0.3 };
        const qualityMultiplier = qualityMultipliers[quality] || 1.0;
        
        estimatedSize += imageCount * 0.5 * qualityMultiplier; // Average 500KB per image

        // Audio file
        if (this.zoomQuilt.audioFile) {
            estimatedSize += this.zoomQuilt.audioFile.size / (1024 * 1024);
        }

        // Source files
        if (includeSource) {
            estimatedSize += 0.2; // Additional source files
        }

        const estimateElement = document.getElementById('html5ExportEstimate');
        if (estimateElement) {
            estimateElement.textContent = `Estimated package size: ~${Math.ceil(estimatedSize)}MB`;
        }
    }

    closeHTML5ExportModal() {
        const modal = document.getElementById('html5ExportModal');
        if (modal) {
            modal.remove();
        }
    }

    async startHTML5Export() {
        const title = document.getElementById('html5Title')?.value || 'My Zoom Quilt';
        const canvasSize = document.getElementById('html5CanvasSize')?.value || 'current';
        const quality = document.querySelector('input[name="html5Quality"]:checked')?.value || 'high';
        const autoStart = document.getElementById('html5AutoStart')?.checked || false;
        const showControls = document.getElementById('html5ShowControls')?.checked || true;
        const allowFullscreen = document.getElementById('html5AllowFullscreen')?.checked || true;
        const backgroundColor = document.getElementById('html5BackgroundColor')?.value || '#0f0f23';
        const includeReadme = document.getElementById('html5IncludeReadme')?.checked || true;
        const includeSource = document.getElementById('html5IncludeSource')?.checked || true;

        // Show progress
        document.getElementById('html5ExportProgress').style.display = 'block';

        try {
            await this.createHTML5Package({
                title,
                canvasSize,
                quality,
                autoStart,
                showControls,
                allowFullscreen,
                backgroundColor,
                includeReadme,
                includeSource
            });
        } catch (error) {
            console.error('HTML5 export failed:', error);
            this.zoomQuilt.showNotification('HTML5 export failed: ' + error.message, 'error');
        }

        this.closeHTML5ExportModal();
    }

    async addOriginalScriptToZip(zip) {
        // Try to fetch the original script.js file, but handle local file system limitations
        try {
            const response = await fetch('./script.js');
            if (!response.ok) {
                throw new Error('Failed to fetch script.js');
            }
            const scriptContent = await response.text();
            zip.file('script.js', scriptContent);
            console.log('Successfully included original script.js');
        } catch (error) {
            console.warn('Could not fetch original script.js, creating standalone version:', error);
            
            // Fallback: Create a minimal standalone version that doesn't require the original script.js
            // We'll modify the generateJS to include everything needed
            const standaloneScript = this.createStandaloneScript();
            zip.file('script.js', standaloneScript);
        }
    }

    createStandaloneScript() {
    // Create a minimal version of the script that includes only what's needed for the export
    return `// Standalone Zoom Quilt Script for HTML5 Export
// This is a minimal version created when the original script.js couldn't be loaded

class ZoomQuiltGenerator {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.images = [];
        this.loadedImages = [];
        this.animationId = null;
        this.isPlaying = false;
        this.zoomLevel = 0;
        this.rotationCounter = 0;
        this.imageRotationCounter = 0;
        
        // Default settings
        this.zoomSpeed = 1.0;
        this.scaleRatio = 0.5;
        this.fadeIntensity = 60;
        this.shapeType = 'rectangle';
        this.shapeSize = 1.0;
        this.shapeRotation = 0;
        this.shapeFeather = 70;
        this.rotationMode = 'fixed';
        this.shapeRotationEnabled = true;
        this.imageRotationEnabled = false;
        
        this.init();
    }
    
    init() {
        this.canvas = document.getElementById('zoomCanvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            console.log('Canvas initialized:', this.canvas.width, 'x', this.canvas.height);
        }
    }
    
    async processImages() {
        // Convert images to loadedImages format
        this.loadedImages = [];
        
        for (let i = 0; i < this.images.length; i++) {
            const imgData = this.images[i];
            const processedImage = await this.processImage(imgData, i);
            this.loadedImages.push(processedImage);
        }
        
        console.log('Processed', this.loadedImages.length, 'images');
    }
    
    async processImage(imgData, index) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = this.canvas.width;
                canvas.height = this.canvas.height;
                
                // Fill with black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Scale image to cover canvas
                const scaleX = canvas.width / img.width;
                const scaleY = canvas.height / img.height;
                const scale = Math.max(scaleX, scaleY);
                
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Apply image rotation if enabled
                if (this.imageRotationEnabled) {
                    const imageRotation = this.calculateImageRotationForImage(index);
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate((imageRotation * Math.PI) / 180);
                    ctx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                    ctx.restore();
                } else {
                    const x = (canvas.width - scaledWidth) / 2;
                    const y = (canvas.height - scaledHeight) / 2;
                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                }
                
                // Apply fade effects with shape support
                this.applyFadeEffect(ctx, canvas.width, canvas.height);
                
                resolve({
                    canvas: canvas,
                    originalImage: img,
                    name: imgData.name
                });
            };
            img.src = imgData.url;
        });
    }
    
    applyFadeEffect(ctx, width, height) {
        // Skip any processing if fade intensity is 0 and shape is rectangle
        if (this.fadeIntensity === 0 && this.shapeType === 'rectangle') return;
        
        if (this.shapeType === 'alpha-transparency') {
            this.applyAlphaTransparencyEffect(ctx, width, height);
            return;
        }
        
        // Apply shape mask first
        this.applyShapeMask(ctx, width, height);
        
        // Then apply shape-specific fade if feather > 0
        if (this.shapeFeather > 0) {
            this.applyShapeFade(ctx, width, height);
        }
        
        // Apply additional fade intensity for rectangle
        if (this.shapeType === 'rectangle' && this.fadeIntensity > 0) {
            this.applyRectangleFadeIntensity(ctx, width, height);
        }
    }

    applyAlphaTransparencyEffect(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];
            
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const normalizedLuminance = luminance / 255;
            
            const transparencyFactor = Math.pow(normalizedLuminance, 1 / this.shapeSize);
            const featherFactor = this.shapeFeather / 100;
            const smoothedTransparency = transparencyFactor * (1 - featherFactor) + featherFactor;
            
            data[i + 3] = Math.floor(alpha * smoothedTransparency);
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyShapeMask(ctx, width, height) {
        if (this.shapeType === 'alpha-transparency') return;
        
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = width;
        maskCanvas.height = height;

        const centerX = width / 2;
        const centerY = height / 2;
        const baseSize = Math.min(width, height) * 0.4 * this.shapeSize;

        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, width, height);

        maskCtx.save();
        maskCtx.translate(centerX, centerY);
        maskCtx.rotate((this.shapeRotation * Math.PI) / 180);

        maskCtx.beginPath();
        
        switch (this.shapeType) {
            case 'rectangle':
                this.drawRectangleMask(maskCtx, baseSize);
                break;
            case 'circle':
                this.drawCircleMask(maskCtx, baseSize);
                break;
            case 'heart':
                this.drawHeartMask(maskCtx, baseSize);
                break;
            case 'star':
                this.drawStarMask(maskCtx, baseSize);
                break;
            case 'triangle':
                this.drawTriangleMask(maskCtx, baseSize);
                break;
            case 'diamond':
                this.drawDiamondMask(maskCtx, baseSize);
                break;
            case 'pentagon':
                this.drawPolygonMask(maskCtx, baseSize, 5);
                break;
            case 'hexagon':
                this.drawPolygonMask(maskCtx, baseSize, 6);
                break;
            case 'flower':
                this.drawFlowerMask(maskCtx, baseSize);
                break;
        }

        maskCtx.restore();
        maskCtx.fillStyle = 'white';
        maskCtx.fill();

        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    drawRectangleMask(ctx, size) {
        const rectWidth = size * 2;
        const rectHeight = size * 1.5;
        ctx.rect(-rectWidth/2, -rectHeight/2, rectWidth, rectHeight);
    }

    drawCircleMask(ctx, size) {
        ctx.arc(0, 0, size, 0, Math.PI * 2);
    }

    drawHeartMask(ctx, size) {
        const scale = size / 100;
        ctx.moveTo(0, -40 * scale);
        ctx.bezierCurveTo(-50 * scale, -80 * scale, -100 * scale, -40 * scale, -50 * scale, 0);
        ctx.lineTo(0, 50 * scale);
        ctx.lineTo(50 * scale, 0);
        ctx.bezierCurveTo(100 * scale, -40 * scale, 50 * scale, -80 * scale, 0, -40 * scale);
    }

    drawStarMask(ctx, size) {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.4;
        let rotation = Math.PI / 2 * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(0, -outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            const x = Math.cos(rotation) * outerRadius;
            const y = Math.sin(rotation) * outerRadius;
            ctx.lineTo(x, y);
            rotation += step;

            const x2 = Math.cos(rotation) * innerRadius;
            const y2 = Math.sin(rotation) * innerRadius;
            ctx.lineTo(x2, y2);
            rotation += step;
        }
        
        ctx.lineTo(0, -outerRadius);
    }

    drawTriangleMask(ctx, size) {
        const height = size * Math.sqrt(3) / 2;
        ctx.moveTo(0, -height * 2/3);
        ctx.lineTo(-size / 2, height / 3);
        ctx.lineTo(size / 2, height / 3);
        ctx.closePath();
    }

    drawDiamondMask(ctx, size) {
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
    }

    drawPolygonMask(ctx, size, sides) {
        const angle = (Math.PI * 2) / sides;
        ctx.moveTo(size, 0);
        
        for (let i = 1; i < sides; i++) {
            const x = Math.cos(angle * i) * size;
            const y = Math.sin(angle * i) * size;
            ctx.lineTo(x, y);
        }
        
        ctx.closePath();
    }

    drawFlowerMask(ctx, size) {
        const petals = 6;
        
        for (let i = 0; i < petals; i++) {
            const angle = (i * Math.PI * 2) / petals;
            const x = Math.cos(angle) * size * 0.6;
            const y = Math.sin(angle) * size * 0.6;
            
            ctx.beginPath();
            ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    applyShapeFade(ctx, width, height) {
        if (this.shapeType === 'alpha-transparency') return;
        
        const fadeSize = this.shapeFeather;
        if (fadeSize === 0) return;
        
        const blurCanvas = document.createElement('canvas');
        const blurCtx = blurCanvas.getContext('2d');
        blurCanvas.width = width;
        blurCanvas.height = height;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const baseSize = Math.min(width, height) * 0.4 * this.shapeSize;
        
        blurCtx.filter = \`blur(\${fadeSize / 4}px)\`;
        
        blurCtx.save();
        blurCtx.translate(centerX, centerY);
        blurCtx.rotate((this.shapeRotation * Math.PI) / 180);
        blurCtx.fillStyle = 'white';
        blurCtx.beginPath();
        this.drawShapeForFeather(blurCtx, baseSize);
        blurCtx.fill();
        blurCtx.restore();
        
        for (let i = 1; i <= 3; i++) {
            const layerSize = baseSize + (fadeSize * i * 0.3);
            const layerBlur = fadeSize / 4 + (i * fadeSize / 8);
            const layerOpacity = 1 - (i * 0.2);
            
            blurCtx.filter = \`blur(\${layerBlur}px)\`;
            blurCtx.globalAlpha = layerOpacity * 0.3;
            
            blurCtx.save();
            blurCtx.translate(centerX, centerY);
            blurCtx.rotate((this.shapeRotation * Math.PI) / 180);
            blurCtx.fillStyle = 'white';
            blurCtx.beginPath();
            this.drawShapeForFeather(blurCtx, layerSize);
            blurCtx.fill();
            blurCtx.restore();
        }
        
        blurCtx.filter = 'none';
        blurCtx.globalAlpha = 1;
        
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(blurCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    drawShapeForFeather(ctx, size) {
        if (this.shapeType === 'alpha-transparency') return;
        
        switch (this.shapeType) {
            case 'rectangle':
                this.drawRectangleMask(ctx, size);
                break;
            case 'circle':
                this.drawCircleMask(ctx, size);
                break;
            case 'heart':
                this.drawHeartMask(ctx, size);
                break;
            case 'star':
                this.drawStarMask(ctx, size);
                break;
            case 'triangle':
                this.drawTriangleMask(ctx, size);
                break;
            case 'diamond':
                this.drawDiamondMask(ctx, size);
                break;
            case 'pentagon':
                this.drawPolygonMask(ctx, size, 5);
                break;
            case 'hexagon':
                this.drawPolygonMask(ctx, size, 6);
                break;
            case 'flower':
                this.drawFlowerMask(ctx, size);
                break;
        }
    }

    applyRectangleFadeIntensity(ctx, width, height) {
        const fadeIntensity = this.fadeIntensity / 100;
        if (fadeIntensity <= 0) return;
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const fadeSize = Math.min(width, height) * 0.5 * fadeIntensity;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const centerX = width / 2;
                const centerY = height / 2;
                
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                const maxDistance = Math.min(centerX, centerY);
                const fadeStart = maxDistance - fadeSize;
                
                if (distanceFromCenter > fadeStart) {
                    const fadeProgress = (distanceFromCenter - fadeStart) / fadeSize;
                    const alpha = Math.max(0, 1 - fadeProgress);
                    data[index + 3] *= alpha;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    calculateImageRotationForImage(index) {
        if (!this.imageRotationEnabled) return 0;
        
        switch (this.imageRotationMode) {
            case 'progressive':
                return (index * (this.imageProgressiveRotationStep || 10)) % 360;
            case 'random':
                const seed = index * 7919 + 28411;
                const randomValue = (seed % 233280) / 233280;
                const min = this.imageRandomRotationMin || 0;
                const max = this.imageRandomRotationMax || 360;
                return min + (randomValue * (max - min));
            default:
                return this.imageRotation || 0;
        }
    }
    
    calculateRotationForImage(index) {
        if (!this.shapeRotationEnabled) return 0;
        
        switch (this.rotationMode) {
            case 'progressive':
                return (index * (this.progressiveRotationStep || 15)) % 360;
            case 'random':
                const seed = index * 9301 + 49297;
                const randomValue = (seed % 233280) / 233280;
                const min = this.randomRotationMin || 0;
                const max = this.randomRotationMax || 360;
                return min + (randomValue * (max - min));
            default:
                return this.shapeRotation || 0;
        }
    }
    
    startZoomQuilt() {
        if (this.loadedImages.length === 0) {
            console.warn('No images loaded');
            return;
        }
        
        this.isPlaying = true;
        this.animate();
    }
    
    pauseZoomQuilt() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    resetZoomQuilt() {
        this.pauseZoomQuilt();
        this.zoomLevel = 0;
        this.rotationCounter = 0;
        this.imageRotationCounter = 0;
        
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        this.zoomLevel += 0.005 * (this.zoomSpeed || 1.0);
        this.drawZoomQuiltFrame();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    drawZoomQuiltFrame() {
        if (!this.ctx || this.loadedImages.length === 0) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const numLoadedImages = this.loadedImages.length;
        const scaleRatio = this.scaleRatio || 0.5;
        const cycleLength = Math.log(1 / scaleRatio);
        const currentCycle = this.zoomLevel / cycleLength;
        const baseImageIndex = Math.floor(currentCycle) % this.loadedImages.length;
        const cycleProgress = currentCycle - Math.floor(currentCycle);
        const baseZoom = Math.exp(cycleProgress * cycleLength);
        
        const visibleLayers = [];
        
        for (let layer = -6; layer < numLoadedImages + 6; layer++) {
            const imageIndex = ((baseImageIndex + layer) % this.loadedImages.length + this.loadedImages.length) % this.loadedImages.length;
            const imageToRender = this.loadedImages[imageIndex];
            
            if (!imageToRender || !imageToRender.canvas) continue;
            
            let layerScale = baseZoom * Math.pow(scaleRatio, layer);
            
            if (layerScale < 0.00005 || layerScale > 200) continue;
            
            const scaledWidth = this.canvas.width * layerScale;
            const scaledHeight = this.canvas.height * layerScale;
            const x = centerX - scaledWidth / 2;
            const y = centerY - scaledHeight / 2;
            
            let alpha = 1.0;
            
            if (layerScale < 0.02) {
                alpha = Math.max(0, layerScale / 0.02);
            }
            if (layerScale > 5) {
                alpha = Math.max(0, 1 - ((layerScale - 5) / 45));
            }
            
            if (alpha <= 0.01) continue;
            
            const conceptualLayerIndex = Math.floor(currentCycle) * numLoadedImages + baseImageIndex + layer;
            
            visibleLayers.push({
                imageCanvas: imageToRender.canvas,
                x, y, scaledWidth, scaledHeight,
                layerScale, alpha,
                rotationIndex: conceptualLayerIndex
            });
        }
        
        visibleLayers.sort((a, b) => b.layerScale - a.layerScale);
        
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        for (const layer of visibleLayers) {
            this.ctx.globalAlpha = layer.alpha;
            
            if (this.shapeRotationEnabled) {
                const rotation = this.calculateRotationForImage(layer.rotationIndex);
                this.ctx.save();
                this.ctx.translate(layer.x + layer.scaledWidth / 2, layer.y + layer.scaledHeight / 2);
                this.ctx.rotate((rotation * Math.PI) / 180);
                this.ctx.drawImage(
                    layer.imageCanvas,
                    -layer.scaledWidth / 2,
                    -layer.scaledHeight / 2,
                    layer.scaledWidth,
                    layer.scaledHeight
                );
                this.ctx.restore();
            } else {
                this.ctx.drawImage(
                    layer.imageCanvas,
                    layer.x,
                    layer.y,
                    layer.scaledWidth,
                    layer.scaledHeight
                );
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    setupAudio(audioElement) {
        this.audioElement = audioElement;
        this.audioEnabled = true;
        // Audio setup can be expanded here if needed
    }
}

console.log('Standalone Zoom Quilt Script loaded');
`;
}

    async createHTML5Package(options) {
        // Import JSZip library if not already loaded
        if (typeof JSZip === 'undefined') {
            await this.loadJSZip();
        }

        const zip = new JSZip();
        
        // Update progress
        this.updateHTML5Progress(10, 'Preparing files...');

        // Determine canvas dimensions
        let canvasWidth, canvasHeight;
        if (options.canvasSize === 'current') {
            canvasWidth = this.zoomQuilt.canvas.width;
            canvasHeight = this.zoomQuilt.canvas.height;
        } else {
            [canvasWidth, canvasHeight] = options.canvasSize.split('x').map(Number);
        }

        // Create the main HTML file
        const htmlContent = this.generateHTML(options, canvasWidth, canvasHeight);
        zip.file('index.html', htmlContent);

        this.updateHTML5Progress(20, 'Processing images...');

        // Process and add images
        await this.addImagesToZip(zip, options.quality);

        this.updateHTML5Progress(40, 'Adding application files...');

        // Add CSS
        const cssContent = this.generateCSS(options, canvasWidth, canvasHeight);
        zip.file('styles.css', cssContent);

        // Copy the original script.js file
        await this.addOriginalScriptToZip(zip);

        // Add our HTML5 initialization wrapper
        const jsContent = this.generateJS(options, canvasWidth, canvasHeight);
        zip.file('html5-init.js', jsContent);

        this.updateHTML5Progress(70, 'Adding audio...');

        // Add audio file if present
        if (this.zoomQuilt.audioFile) {
            zip.file(`audio/${this.zoomQuilt.audioFile.name}`, this.zoomQuilt.audioFile);
        }

        this.updateHTML5Progress(80, 'Creating documentation...');

        // Add README if requested
        if (options.includeReadme) {
            const readmeContent = this.generateReadme(options);
            zip.file('README.txt', readmeContent);
        }

        // Add source files if requested
        if (options.includeSource) {
            await this.addSourceFilesToZip(zip);
        }

        this.updateHTML5Progress(90, 'Generating package...');

        // Generate and download the zip file
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            const progress = 90 + (metadata.percent * 0.1);
            this.updateHTML5Progress(progress, 'Compressing...');
        });

        this.updateHTML5Progress(100, 'Download starting...');

        // Download the file
        const fileName = `${options.title.replace(/[^a-zA-Z0-9]/g, '_')}_html5_package.zip`;
        this.downloadBlob(zipBlob, fileName);

        this.zoomQuilt.showNotification('HTML5 package created successfully!', 'success');
    }

    async loadJSZip() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

   generateHTML(options, canvasWidth, canvasHeight) {
    const audioSection = this.zoomQuilt.audioFile ? `
        <audio id="audioElement" preload="auto" ${options.autoStart ? 'autoplay' : ''} loop>
            <source src="audio/${this.zoomQuilt.audioFile.name}" type="${this.zoomQuilt.audioFile.type}">
            Your browser does not support the audio element.
        </audio>` : '';

    const controlsSection = options.showControls ? `
        <div class="controls" id="controls">
            <button id="playPauseBtn" class="control-btn">${options.autoStart ? '⏸️ Pause' : '▶️ Play'}</button>
            <button id="resetBtn" class="control-btn">🔄 Reset</button>
            ${options.allowFullscreen ? '<button id="fullscreenBtn" class="control-btn">🗖 Fullscreen</button>' : ''}
            ${this.zoomQuilt.audioFile ? '<button id="audioToggleBtn" class="control-btn">🔊 Audio</button>' : ''}
        </div>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background: ${options.backgroundColor}; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            font-family: 'Segoe UI', system-ui, sans-serif;
        }
    </style>
</head>
<body>
    <div class="zoom-quilt-container">
        <canvas id="zoomCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
        ${controlsSection}
        ${audioSection}
    </div>
    
    <!-- Include the script -->
    <script src="script.js"></script>
    <!-- Include our HTML5 initialization -->
    <script src="html5-init.js"></script>
</body>
</html>`;
}

    generateCSS(options, canvasWidth, canvasHeight) {
        return `
/* Zoom Quilt Standalone Styles */
.zoom-quilt-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 15px;
    padding: 2rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
}

#zoomCanvas {
    max-width: 100vw;
    max-height: 80vh;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    background: #000;
}

.controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.control-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.control-btn:active {
    transform: translateY(0);
}

/* Fullscreen styles */
.zoom-quilt-container.fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: #000 !important;
    z-index: 9999 !important;
}

.zoom-quilt-container.fullscreen #zoomCanvas {
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: auto !important;
    height: auto !important;
    border-radius: 0 !important;
}

.zoom-quilt-container.fullscreen .controls {
    position: absolute !important;
    bottom: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    opacity: 0.8 !important;
}

.zoom-quilt-container.fullscreen .controls:hover {
    opacity: 1 !important;
}

/* Audio element hidden */
#audioElement {
    display: none;
}

/* Responsive design */
@media (max-width: 768px) {
    .zoom-quilt-container {
        padding: 1rem;
        margin: 1rem;
    }
    
    .controls {
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
    }
    
    .control-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
    }
}

/* Loading animation */
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 2rem auto;
}
`;
    }

    generateJS(options, canvasWidth, canvasHeight) {
    const currentSettings = this.exportCurrentSettings();
    
    // Use embedded image data instead of file references
    const embeddedImages = this.embeddedImageData || [];
    
    const embeddedImageDataArray = embeddedImages.map((imgData, index) => ({
        name: `embedded_image_${index}`,
        dataUrl: imgData.dataUrl,
        width: imgData.width,
        height: imgData.height
    }));

    return `// HTML5 Export Initialization Wrapper
// This file initializes the zoom quilt for standalone use

// Configuration for the exported HTML5 package
const HTML5_CONFIG = {
    autoStart: ${options.autoStart},
    showControls: ${options.showControls},
    allowFullscreen: ${options.allowFullscreen},
    audioEnabled: ${!!this.zoomQuilt.audioFile},
    settings: ${JSON.stringify(currentSettings, null, 2)},
    embeddedImages: ${JSON.stringify(embeddedImageDataArray, null, 2)}
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Create a mock file input handler for the exported version
    const mockFileHandler = {
        loadImagesFromConfig: function() {
            const imagePromises = HTML5_CONFIG.embeddedImages.map((imgData, index) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve({ img, index, name: imgData.name });
                    img.onerror = (error) => {
                        console.error('Failed to load embedded image:', index, error);
                        reject(error);
                    };
                    // Use the embedded base64 data URL
                    img.src = imgData.dataUrl;
                });
            });
            
            return Promise.all(imagePromises);
        }
    };

    // Initialize the main ZoomQuiltGenerator with HTML5 configuration
    window.zoomQuiltGenerator = new ZoomQuiltGenerator();
    
    // Override some methods for HTML5 export mode
    zoomQuiltGenerator.isHTML5Export = true;
    
    // Load images and apply settings
    mockFileHandler.loadImagesFromConfig().then(loadedImages => {
        // Convert loaded images to the expected format
        zoomQuiltGenerator.images = loadedImages.map(item => ({
            url: item.img.src, // This will be the data URL
            name: item.name,
            width: item.img.width || item.img.naturalWidth,
            height: item.img.height || item.img.naturalHeight,
            size: 0 // Not available for embedded images
        }));
        
        // Process images through the normal pipeline
        zoomQuiltGenerator.processImages().then(() => {
            // Apply exported settings
            Object.assign(zoomQuiltGenerator, HTML5_CONFIG.settings);
            
            // Set up audio if enabled
            if (HTML5_CONFIG.audioEnabled) {
                const audioElement = document.getElementById('audioElement');
                if (audioElement) {
                    zoomQuiltGenerator.setupAudio(audioElement);
                }
            }
            
            // Start animation if auto-start is enabled
            if (HTML5_CONFIG.autoStart) {
                zoomQuiltGenerator.startZoomQuilt();
            }
            
            // Setup controls
            if (HTML5_CONFIG.showControls) {
                setupHTML5Controls();
            }
            
            console.log('Zoom Quilt initialized with', zoomQuiltGenerator.loadedImages.length, 'embedded images');
        });
    }).catch(error => {
        console.error('Failed to load embedded images:', error);
        showHTML5Error('Failed to load embedded images. The export may be corrupted.');
    });
});

// HTML5 Control Functions
function setupHTML5Controls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const audioToggleBtn = document.getElementById('audioToggleBtn');

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (zoomQuiltGenerator.isPlaying) {
                zoomQuiltGenerator.pauseZoomQuilt();
                playPauseBtn.textContent = '▶️ Play';
            } else {
                zoomQuiltGenerator.startZoomQuilt();
                playPauseBtn.textContent = '⏸️ Pause';
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            zoomQuiltGenerator.resetZoomQuilt();
            if (playPauseBtn) {
                playPauseBtn.textContent = '▶️ Play';
            }
        });
    }

    if (fullscreenBtn && HTML5_CONFIG.allowFullscreen) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.querySelector('.zoom-quilt-container');
            
            if (!document.fullscreenElement) {
                container.requestFullscreen().then(() => {
                    container.classList.add('fullscreen');
                }).catch(console.warn);
            } else {
                document.exitFullscreen().then(() => {
                    container.classList.remove('fullscreen');
                }).catch(console.warn);
            }
        });
    }

    if (audioToggleBtn && HTML5_CONFIG.audioEnabled) {
        audioToggleBtn.addEventListener('click', () => {
            if (zoomQuiltGenerator.audioElement) {
                if (zoomQuiltGenerator.audioElement.muted) {
                    zoomQuiltGenerator.audioElement.muted = false;
                    audioToggleBtn.textContent = '🔊 Audio';
                } else {
                    zoomQuiltGenerator.audioElement.muted = true;
                    audioToggleBtn.textContent = '🔇 Audio';
                }
            }
        });
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                if (playPauseBtn) playPauseBtn.click();
                break;
            case 'KeyR':
                if (resetBtn) resetBtn.click();
                break;
            case 'KeyF':
                if (fullscreenBtn && HTML5_CONFIG.allowFullscreen) fullscreenBtn.click();
                break;
        }
    });
}

function showHTML5Error(message) {
    const container = document.querySelector('.zoom-quilt-container');
    if (container) {
        container.innerHTML = \`
            <div style="color: white; text-align: center; padding: 2rem;">
                <h3>⚠️ Error</h3>
                <p>\${message}</p>
                <p><small>Try opening this file through a local web server instead of directly in the browser.</small></p>
            </div>
        \`;
    }
}
`;
}

    async addImagesToZip(zip, quality) {
        const qualitySettings = {
            high: 0.95,
            medium: 0.8,
            low: 0.6
        };
        const jpegQuality = qualitySettings[quality] || 0.95;

        // Use loadedImages array which contains the actual processed image data
        const sourceImages = this.zoomQuilt.loadedImages && this.zoomQuilt.loadedImages.length > 0 
            ? this.zoomQuilt.loadedImages 
            : this.zoomQuilt.images || [];

        if (sourceImages.length === 0) {
            throw new Error('No images to export. Please load images first.');
        }

        // Store image data as base64 for embedding
        this.embeddedImageData = [];

        for (let i = 0; i < sourceImages.length; i++) {
            this.updateHTML5Progress(20 + (i / sourceImages.length) * 30, `Processing image ${i + 1}/${sourceImages.length}...`);
            
            let imageToProcess;
            
            // Handle different image source types
            if (sourceImages[i].canvas) {
                // If it's already a canvas (from loadedImages), use it directly
                imageToProcess = sourceImages[i].canvas;
            } else if (sourceImages[i].url || sourceImages[i].src) {
                // If it's an image object with URL, create canvas from it
                const img = new Image();
                img.src = sourceImages[i].url || sourceImages[i].src;
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    if (img.complete) resolve();
                });
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                imageToProcess = canvas;
            } else {
                console.warn('Skipping invalid image at index', i);
                continue;
            }
            
            // Create export canvas with quality scaling
            const exportCanvas = document.createElement('canvas');
            const exportCtx = exportCanvas.getContext('2d');
            
            // Set canvas size based on quality
            const maxDimension = quality === 'high' ? 1920 : quality === 'medium' ? 1280 : 800;
            const scale = Math.min(maxDimension / imageToProcess.width, maxDimension / imageToProcess.height, 1);
            
            exportCanvas.width = imageToProcess.width * scale;
            exportCanvas.height = imageToProcess.height * scale;
            
            // Draw the processed image to export canvas
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';
            exportCtx.drawImage(imageToProcess, 0, 0, exportCanvas.width, exportCanvas.height);
            
            // Convert to base64 data URL
            const dataUrl = exportCanvas.toDataURL('image/jpeg', jpegQuality);
            
            // Store for embedding in JS
            this.embeddedImageData.push({
                index: i,
                dataUrl: dataUrl,
                width: exportCanvas.width,
                height: exportCanvas.height
            });
        }
        
        // Note: We're not adding files to the images folder anymore since we're embedding
        console.log(`Embedded ${this.embeddedImageData.length} images as base64 data`);
    }

    async addSourceFilesToZip(zip) {
        const sourceFolder = zip.folder('source');
        
        // Add original script.js (simplified version)
        const sourceJS = `// Original settings and image data for editing
const originalSettings = ${JSON.stringify(this.exportCurrentSettings(), null, 2)};

const originalImages = ${JSON.stringify(this.zoomQuilt.images.map(img => ({
    name: img.name,
    width: img.width,
    height: img.height,
    size: img.size
})), null, 2)};

// To edit this zoom quilt:
// 1. Open the main Zoom Quilt Generator application
// 2. Import your images using the file selector
// 3. Apply the settings from 'originalSettings' above
// 4. Modify as needed and re-export
`;
        
        sourceFolder.file('original-settings.js', sourceJS);
        
        // Add a simple HTML template for editing
        const editTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Edit Template</title>
</head>
<body>
    <h1>Zoom Quilt Source Files</h1>
    <p>To edit this zoom quilt:</p>
    <ol>
        <li>Open the original Zoom Quilt Generator application</li>
        <li>Import your source images</li>
        <li>Load the settings from original-settings.js</li>
        <li>Make your modifications</li>
        <li>Export a new HTML5 package</li>
    </ol>
    
    <h2>Original Settings</h2>
    <pre id="settings"></pre>
    
    <script src="original-settings.js"></script>
    <script>
        document.getElementById('settings').textContent = JSON.stringify(originalSettings, null, 2);
    </script>
</body>
</html>`;
        
        sourceFolder.file('edit-template.html', editTemplate);
    }

    generateReadme(options) {
    return `Zoom Quilt HTML5 Package
========================

Project: ${options.title}
Generated: ${new Date().toLocaleDateString()}
Canvas Size: ${options.canvasSize}
Quality: ${options.quality}

CONTENTS:
---------
- index.html: Main webpage with the zoom quilt animation (contains embedded images)
- styles.css: Styling for the webpage
- script.js: Main zoom quilt functionality
- html5-init.js: Initialization code for the exported package
${this.zoomQuilt.audioFile ? '- audio/: Folder containing the audio file' : ''}
${options.includeSource ? '- source/: Original settings and editing templates' : ''}

IMPORTANT - EMBEDDED IMAGES:
----------------------------
This package uses embedded base64 images to avoid browser security restrictions.
All images are contained within the JavaScript files, so no separate image files are needed.

USAGE:
------
1. Extract all files to a folder
2. Open index.html in a web browser (works directly from local file system)
3. The animation will ${options.autoStart ? 'start automatically' : 'be ready to start'}

ALTERNATIVE - Local Web Server:
-------------------------------
For better performance, you can run a local web server:
1. Python: Run "python -m http.server 8000" in the folder
2. Node.js: Run "npx serve" in the folder  
3. Or use any other local web server
4. Open http://localhost:8000 in your browser

CONTROLS:
---------
${options.showControls ? `- Play/Pause: Click the play/pause button or press SPACEBAR
- Reset: Click reset button or press R
${options.allowFullscreen ? '- Fullscreen: Click fullscreen button or press F' : ''}
${this.zoomQuilt.audioFile ? '- Audio Toggle: Click audio button to mute/unmute' : ''}` : 'No controls are visible (configured for auto-play only)'}

HOSTING:
--------
To put this on a website:
1. Upload all files to your web server
2. Make sure the folder structure is preserved
3. Link to index.html from your main website

BROWSER COMPATIBILITY:
---------------------
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

TROUBLESHOOTING:
----------------
- If animation doesn't load: Check browser console for errors
- If audio doesn't work: Some browsers require user interaction before playing audio
- If animation is slow: The embedded images may be large; try re-exporting with lower quality
- If images appear corrupted: Try re-exporting the package

For more information, visit the Zoom Quilt Generator website.
`;
}

    exportCurrentSettings() {
        // Ensure we have valid settings with proper defaults
        return {
            zoomSpeed: this.zoomQuilt.zoomSpeed || 1.0,
            scaleRatio: this.zoomQuilt.scaleRatio || 0.5,
            zoomOffset: this.zoomQuilt.zoomOffset || 0,
            blendMode: this.zoomQuilt.blendMode || 'normal',
            fadeIntensity: this.zoomQuilt.fadeIntensity || 60,
            shapeType: this.zoomQuilt.shapeType || 'rectangle',
            shapeSize: this.zoomQuilt.shapeSize || 1.0,
            shapeRotation: this.zoomQuilt.shapeRotation || 0,
            shapeFeather: this.zoomQuilt.shapeFeather || 70,
            audioEnabled: this.zoomQuilt.audioEnabled || false,
            audioReactiveIntensity: this.zoomQuilt.audioReactiveIntensity || 2.0,
            audioFreqMin: this.zoomQuilt.audioFreqMin || 60,
            audioFreqMax: this.zoomQuilt.audioFreqMax || 250,
            imageCount: this.zoomQuilt.images ? this.zoomQuilt.images.length : 0,
            // Add rotation settings
            rotationMode: this.zoomQuilt.rotationMode || 'fixed',
            progressiveRotationStep: this.zoomQuilt.progressiveRotationStep || 15,
            randomRotationMin: this.zoomQuilt.randomRotationMin || 0,
            randomRotationMax: this.zoomQuilt.randomRotationMax || 360,
            imageRotationEnabled: this.zoomQuilt.imageRotationEnabled || false,
            shapeRotationEnabled: this.zoomQuilt.shapeRotationEnabled || true,
            imageRotationMode: this.zoomQuilt.imageRotationMode || 'fixed',
            imageRotation: this.zoomQuilt.imageRotation || 0,
            imageProgressiveRotationStep: this.zoomQuilt.imageProgressiveRotationStep || 10,
            imageRandomRotationMin: this.zoomQuilt.imageRandomRotationMin || 0,
            imageRandomRotationMax: this.zoomQuilt.imageRandomRotationMax || 360
        };
    }

    updateHTML5Progress(percentage, message) {
        const progressFill = document.getElementById('html5ProgressFill');
        const progressText = document.getElementById('html5ProgressText');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}% - ${message}`;
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export for use in main script
if (typeof window !== 'undefined') {
    window.HTML5Exporter = HTML5Exporter;
}