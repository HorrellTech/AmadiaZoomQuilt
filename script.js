// Zoom Quilt Generator - Main JavaScript File
class ZoomQuiltGenerator {
    constructor() {
        this.images = [];
        this.animationId = null;
        this.isPlaying = false;
        this.zoomLevel = 0;
        this.zoomSpeed = 0.5;
        this.blendMode = 'normal';
        this.fadeIntensity = 100;
        this.scaleRatio = 0.1;
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
        this.audioFreqMin = 60;
        this.audioFreqMax = 250;
        this.baseZoomSpeed = 1.0;

        // Visualizer properties
        this.visualizers = {
            circular: {
                enabled: false,
                mode: 'rings', // 'rings', 'spline', 'same-radius'
                ringCount: 3,
                pointCount: 16, // For same-radius and spline modes
                baseSize: 100,
                thickness: 3,
                sensitivity: 2.0,
                freqMin: 60, // For spline and same-radius modes
                freqMax: 800, // For spline and same-radius modes
                colors: ['#667eea', '#764ba2', '#10b981']
            },
            bar: {
                enabled: false,
                count: 64,
                maxHeight: 150,
                width: 4,
                sensitivity: 2.0,
                gradientStart: '#667eea',
                gradientEnd: '#764ba2'
            }
        };

        // Fullscreen toolbar auto-hide
        this.fullscreenToolbarTimeout = null;
        this.lastMouseActivity = Date.now();

        this.init();
    }

    init() {
        this.setupCanvas();
        this.initializeUploadArea();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateControlValues();
        this.setupAudio();
        this.setupTabs();
        this.setupVisualizerControls();
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Remove active class from all tabs and panes
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding pane
                btn.classList.add('active');
                document.getElementById(`tab-${targetTab}`).classList.add('active');
            });
        });
    }

    setupVisualizerControls() {
        // Circular visualizer controls
        const circularEnabledCheckbox = document.getElementById('circularVisualizerEnabled');
        if (circularEnabledCheckbox) {
            circularEnabledCheckbox.addEventListener('change', (e) => {
                this.visualizers.circular.enabled = e.target.checked;
                this.updateVisualizerControls('circular');
            });
        }

        // Circular visualizer mode - Fix dropdown interaction
        const circularModeSelect = document.getElementById('circularMode');
        if (circularModeSelect) {
            // Remove any existing event listeners first
            circularModeSelect.removeEventListener('change', this.handleCircularModeChange);
            
            // Add event listener with proper binding
            this.handleCircularModeChange = (e) => {
                e.stopPropagation(); // Prevent event bubbling
                this.visualizers.circular.mode = e.target.value;
                this.updateCircularModeVisibility();
                this.updateCircularColorPickers();
            };
            
            circularModeSelect.addEventListener('change', this.handleCircularModeChange);
            
            // Also handle click events to ensure dropdown works
            circularModeSelect.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Ensure the dropdown is not disabled
            circularModeSelect.disabled = false;
        }

        // Add similar fixes for other circular controls
        const circularControls = [
            'circularRingCount',
            'circularPointCount', 
            'circularSize',
            'circularThickness',
            'circularSensitivity',
            'circularFreqMin',
            'circularFreqMax'
        ];

        circularControls.forEach(controlId => {
            const element = document.getElementById(controlId);
            if (element) {
                element.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const value = controlId.includes('Sensitivity') ? parseFloat(e.target.value) : parseInt(e.target.value);
                    
                    // Update the corresponding property
                    switch(controlId) {
                        case 'circularRingCount':
                            this.visualizers.circular.ringCount = value;
                            document.getElementById('circularRingCountValue').textContent = value;
                            this.updateCircularColorPickers();
                            break;
                        case 'circularPointCount':
                            this.visualizers.circular.pointCount = value;
                            document.getElementById('circularPointCountValue').textContent = value;
                            this.updateCircularColorPickers();
                            break;
                        case 'circularSize':
                            this.visualizers.circular.baseSize = value;
                            document.getElementById('circularSizeValue').textContent = `${value}px`;
                            break;
                        case 'circularThickness':
                            this.visualizers.circular.thickness = value;
                            document.getElementById('circularThicknessValue').textContent = `${value}px`;
                            break;
                        case 'circularSensitivity':
                            this.visualizers.circular.sensitivity = value;
                            document.getElementById('circularSensitivityValue').textContent = `${value}x`;
                            break;
                        case 'circularFreqMin':
                            this.visualizers.circular.freqMin = value;
                            document.getElementById('circularFreqMinValue').textContent = `${value}Hz`;
                            break;
                        case 'circularFreqMax':
                            this.visualizers.circular.freqMax = value;
                            document.getElementById('circularFreqMaxValue').textContent = `${value}Hz`;
                            break;
                    }
                });
            }
        });

        // Bar visualizer controls (existing code)
        const barEnabledCheckbox = document.getElementById('barVisualizerEnabled');
        if (barEnabledCheckbox) {
            barEnabledCheckbox.addEventListener('change', (e) => {
                this.visualizers.bar.enabled = e.target.checked;
                this.updateVisualizerControls('bar');
            });
        }

        const barControls = [
            'barCount',
            'barHeight',
            'barWidth',
            'barSensitivity'
        ];

        barControls.forEach(controlId => {
            const element = document.getElementById(controlId);
            if (element) {
                element.addEventListener('input', (e) => {
                    const value = controlId === 'barSensitivity' ? parseFloat(e.target.value) : parseInt(e.target.value);
                    
                    switch(controlId) {
                        case 'barCount':
                            this.visualizers.bar.count = value;
                            document.getElementById('barCountValue').textContent = value;
                            break;
                        case 'barHeight':
                            this.visualizers.bar.maxHeight = value;
                            document.getElementById('barHeightValue').textContent = `${value}px`;
                            break;
                        case 'barWidth':
                            this.visualizers.bar.width = value;
                            document.getElementById('barWidthValue').textContent = `${value}px`;
                            break;
                        case 'barSensitivity':
                            this.visualizers.bar.sensitivity = value;
                            document.getElementById('barSensitivityValue').textContent = `${value}x`;
                            break;
                    }
                });
            }
        });

        // Color picker event listeners
        const barGradientStart = document.getElementById('barGradientStart');
        const barGradientEnd = document.getElementById('barGradientEnd');
        
        if (barGradientStart) {
            barGradientStart.addEventListener('change', (e) => {
                this.visualizers.bar.gradientStart = e.target.value;
            });
        }
        
        if (barGradientEnd) {
            barGradientEnd.addEventListener('change', (e) => {
                this.visualizers.bar.gradientEnd = e.target.value;
            });
        }

        // Initialize
        this.updateCircularModeVisibility();
        this.updateCircularColorPickers();
    }

    updateVisualizerControls(type) {
        const controls = document.querySelector(`.${type}-controls`);
        if (controls) {
            const inputs = controls.querySelectorAll('input:not([type="checkbox"]), select');
            
            inputs.forEach(input => {
                // Don't disable the mode selector for circular visualizer
                if (type === 'circular' && input.id === 'circularMode') {
                    input.disabled = false;
                } else {
                    input.disabled = !this.visualizers[type].enabled;
                }
            });
        }
    }

    updateCircularModeVisibility() {
        const mode = this.visualizers.circular.mode;
        const ringCountGroup = document.getElementById('circularRingCountGroup');
        const pointCountGroup = document.getElementById('circularPointCountGroup');
        const freqRangeGroup = document.getElementById('circularFreqRangeGroup');
        const freqMaxGroup = document.getElementById('circularFreqMaxGroup');

        // Show/hide controls based on mode
        if (mode === 'rings') {
            ringCountGroup.style.display = 'block';
            pointCountGroup.style.display = 'none';
            freqRangeGroup.style.display = 'none';
            freqMaxGroup.style.display = 'none';
        } else if (mode === 'spline' || mode === 'same-radius') {
            ringCountGroup.style.display = 'none';
            pointCountGroup.style.display = 'block';
            freqRangeGroup.style.display = 'block';
            freqMaxGroup.style.display = 'block';
        }
    }

    updateCircularColorPickers() {
        const container = document.getElementById('circularColorPickers');
        const mode = this.visualizers.circular.mode;
        let colorCount;

        if (mode === 'rings') {
            colorCount = this.visualizers.circular.ringCount;
        } else {
            colorCount = Math.min(this.visualizers.circular.pointCount, 8); // Limit colors for performance
        }
        
        container.innerHTML = '';
        
        for (let i = 0; i < colorCount; i++) {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-picker-item';
            
            const label = document.createElement('label');
            label.textContent = mode === 'rings' ? `Ring ${i + 1}` : `Color ${i + 1}`;
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = this.visualizers.circular.colors[i] || this.generateRandomColor();
            colorInput.disabled = !this.visualizers.circular.enabled;
            
            colorInput.addEventListener('change', (e) => {
                if (!this.visualizers.circular.colors[i]) {
                    this.visualizers.circular.colors[i] = e.target.value;
                } else {
                    this.visualizers.circular.colors[i] = e.target.value;
                }
            });
            
            colorItem.appendChild(colorInput);
            colorItem.appendChild(label);
            container.appendChild(colorItem);
        }
    }

    generateRandomColor() {
        const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
        return colors[Math.floor(Math.random() * colors.length)];
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

    restartAudio() {
        if (this.audioElement) {
            this.audioElement.currentTime = 0;
            if (this.audioEnabled && this.audioElement.paused) {
                this.audioElement.play().catch(error => {
                    console.error('Failed to restart audio:', error);
                });
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isFullscreen()) {
                    // Restart audio in fullscreen mode
                    this.restartAudio();
                } else {
                    // Normal play/pause behavior
                    this.togglePlayPause();
                }
            }
        });

        // Fullscreen toolbar auto-hide
        this.setupFullscreenToolbarAutoHide();

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

    setupFullscreenToolbarAutoHide() {
        // Mouse movement tracking for fullscreen
        document.addEventListener('mousemove', (e) => {
            if (this.isFullscreen()) {
                this.handleMouseActivity();
            }
        });

        // Click and touch tracking
        document.addEventListener('click', (e) => {
            if (this.isFullscreen()) {
                this.handleMouseActivity();
            }
        });

        document.addEventListener('touchstart', (e) => {
            if (this.isFullscreen()) {
                this.handleMouseActivity();
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isFullscreen()) {
                this.handleMouseActivity();
            }
        });
    }

    handleMouseActivity() {
        this.lastMouseActivity = Date.now();
        this.showFullscreenToolbar();
        
        // Clear existing timeout
        if (this.fullscreenToolbarTimeout) {
            clearTimeout(this.fullscreenToolbarTimeout);
        }
        
        // Set new timeout to hide toolbar after 2 seconds
        this.fullscreenToolbarTimeout = setTimeout(() => {
            this.hideFullscreenToolbar();
        }, 2000);
    }

    showFullscreenToolbar() {
        const toolbar = document.querySelector('.canvas-container.fullscreen-active .canvas-controls');
        if (toolbar) {
            toolbar.style.opacity = '1';
            toolbar.style.transform = 'translateX(-50%) translateY(0)';
            toolbar.style.pointerEvents = 'auto';
            document.body.style.cursor = 'default';
        }
    }

    hideFullscreenToolbar() {
        const toolbar = document.querySelector('.canvas-container.fullscreen-active .canvas-controls');
        if (toolbar) {
            toolbar.style.opacity = '0';
            toolbar.style.transform = 'translateX(-50%) translateY(20px)';
            toolbar.style.pointerEvents = 'none';
            document.body.style.cursor = 'none';
        }
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
        // Filter for image files only
        const imageFiles = Array.from(files).filter(file => {
            return file.type.startsWith('image/') || 
                /\.(jpg|jpeg|png|bmp|webp|svg)$/i.test(file.name);
        });

        if (imageFiles.length === 0) {
            alert('No valid image files found. Please select image files (JPG, PNG, GIF, BMP, WebP, SVG).');
            return;
        }

        // Show non-image files warning if any were filtered out
        const filteredOut = files.length - imageFiles.length;
        if (filteredOut > 0) {
            this.showNotification(`${filteredOut} non-image file(s) were filtered out.`, 'warning');
        }

        // Show loading indicator
        this.showLoadingIndicator(imageFiles.length);

        let loadedCount = 0;
        for (const file of imageFiles) {
            try {
                await this.loadImage(file);
                loadedCount++;
                this.updateLoadingProgress(loadedCount, imageFiles.length);
            } catch (error) {
                console.error(`Failed to load image ${file.name}:`, error);
                this.showNotification(`Failed to load image: ${file.name}`, 'error');
            }
        }

        // Hide loading indicator
        this.hideLoadingIndicator();

        this.updateImageList();
        this.updateButtons();

        // Show success notification
        if (loadedCount > 0) {
            this.showNotification(`Successfully loaded ${loadedCount} image(s)!`, 'success');
        }
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
        const canvasContainer = document.querySelector('.canvas-container');
        const toolbar = document.querySelector('.canvas-controls');
        
        if (this.isFullscreen()) {
            fullscreenBtn.innerHTML = '🗗 Exit Fullscreen';
            fullscreenBtn.title = 'Exit Fullscreen';
            canvasContainer.classList.add('fullscreen-active');
            
            // Initialize toolbar auto-hide
            this.handleMouseActivity(); // Show toolbar initially
            
            // Resize canvas to fill screen while maintaining aspect ratio
            this.resizeCanvasForFullscreen();
        } else {
            fullscreenBtn.innerHTML = '🗖 Fullscreen';
            fullscreenBtn.title = 'Enter Fullscreen';
            canvasContainer.classList.remove('fullscreen-active');
            
            // Clear auto-hide timeout
            if (this.fullscreenToolbarTimeout) {
                clearTimeout(this.fullscreenToolbarTimeout);
                this.fullscreenToolbarTimeout = null;
            }
            
            // Reset cursor
            document.body.style.cursor = 'default';
            
            // Reset toolbar styles when exiting fullscreen
            if (toolbar) {
                toolbar.style.position = '';
                toolbar.style.bottom = '';
                toolbar.style.left = '';
                toolbar.style.transform = '';
                toolbar.style.zIndex = '';
                toolbar.style.background = '';
                toolbar.style.padding = '';
                toolbar.style.borderRadius = '';
                toolbar.style.backdropFilter = '';
                toolbar.style.opacity = '';
                toolbar.style.pointerEvents = '';
            }
            
            // Restore original canvas size
            this.restoreCanvasSize();
        }
    }

    resizeCanvasForFullscreen() {
        const canvas = this.canvas;
        const canvasContainer = document.querySelector('.canvas-container');
        
        // Store original dimensions
        if (!this.originalCanvasWidth) {
            this.originalCanvasWidth = canvas.width;
            this.originalCanvasHeight = canvas.height;
        }
        
        // Get actual viewport dimensions (not screen dimensions)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate the canvas aspect ratio
        const canvasAspectRatio = this.originalCanvasWidth / this.originalCanvasHeight;
        const viewportAspectRatio = viewportWidth / viewportHeight;
        
        let newWidth, newHeight;
        
        // Fit canvas to viewport while maintaining aspect ratio (contain mode for better centering)
        if (canvasAspectRatio > viewportAspectRatio) {
            // Canvas is wider than viewport ratio - fit to width
            newWidth = viewportWidth;
            newHeight = viewportWidth / canvasAspectRatio;
        } else {
            // Canvas is taller than viewport ratio - fit to height
            newHeight = viewportHeight;
            newWidth = viewportHeight * canvasAspectRatio;
        }
        
        // Update canvas size
        canvas.width = Math.round(newWidth);
        canvas.height = Math.round(newHeight);
        
        // Center the canvas using CSS
        canvas.style.position = 'fixed';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        canvas.style.zIndex = '1000';
        
        // Ensure container takes full viewport
        canvasContainer.style.width = '100vw';
        canvasContainer.style.height = '100vh';
        canvasContainer.style.display = 'flex';
        canvasContainer.style.alignItems = 'center';
        canvasContainer.style.justifyContent = 'center';
        
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
        const canvasContainer = document.querySelector('.canvas-container');
        
        // Restore original dimensions
        if (this.originalCanvasWidth && this.originalCanvasHeight) {
            canvas.width = this.originalCanvasWidth;
            canvas.height = this.originalCanvasHeight;
            
            // Reset canvas styling
            canvas.style.position = '';
            canvas.style.top = '';
            canvas.style.left = '';
            canvas.style.transform = '';
            canvas.style.zIndex = '';
            
            // Reset container styling
            canvasContainer.style.width = '';
            canvasContainer.style.height = '';
            canvasContainer.style.display = '';
            canvasContainer.style.alignItems = '';
            canvasContainer.style.justifyContent = '';
            
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
        document.getElementById('downloadBtn').disabled = !hasImages;
        
        // Update export status text
        const statusText = document.getElementById('exportStatusText');
        if (hasImages) {
            if (this.loadedImages.length > 0) {
                statusText.textContent = 'Ready to export! Click the button below.';
            } else {
                statusText.textContent = 'Generate the zoom quilt first, then export.';
            }
        } else {
            statusText.textContent = 'Add some images to get started.';
        }
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

        // Draw visualizers
        this.drawVisualizers();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawVisualizers() {
        if (!this.audioEnabled || !this.analyser || !this.dataArray) return;

        // Get audio data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Draw circular visualizer
        if (this.visualizers.circular.enabled) {
            this.drawCircularVisualizer();
        }

        // Draw bar visualizer
        if (this.visualizers.bar.enabled) {
            this.drawBarVisualizer();
        }
    }

    drawCircularVisualizer() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const config = this.visualizers.circular;
        
        // Calculate scale factor based on canvas size vs original size
        const scaleFactor = Math.min(this.canvas.width / 800, this.canvas.height / 600);
        const scaledConfig = {
            ...config,
            baseSize: config.baseSize * scaleFactor,
            thickness: Math.max(1, config.thickness * scaleFactor)
        };
        
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';

        switch (config.mode) {
            case 'rings':
                this.drawConcentricRings(centerX, centerY, scaledConfig);
                break;
            case 'spline':
                this.drawFrequencySpline(centerX, centerY, scaledConfig);
                break;
            case 'same-radius':
                this.drawSameRadiusPoints(centerX, centerY, scaledConfig);
                break;
        }

        this.ctx.restore();
    }

    drawConcentricRings(centerX, centerY, config) {
        for (let ring = 0; ring < config.ringCount; ring++) {
            // Calculate frequency range for this ring
            const freqStart = Math.floor((ring / config.ringCount) * this.dataArray.length);
            const freqEnd = Math.floor(((ring + 1) / config.ringCount) * this.dataArray.length);
            
            // Calculate average amplitude for this frequency range
            let sum = 0;
            for (let i = freqStart; i < freqEnd; i++) {
                sum += this.dataArray[i];
            }
            const avgAmplitude = sum / (freqEnd - freqStart);
            
            // Calculate ring size based on amplitude (with scaling)
            const amplitudeMultiplier = (avgAmplitude / 255) * config.sensitivity;
            const ringSpacing = 30 * (config.baseSize / 100); // Scale ring spacing with base size
            const ringSize = config.baseSize + (ring * ringSpacing) + (amplitudeMultiplier * 50 * (config.baseSize / 100));
            
            // Draw ring
            this.ctx.strokeStyle = config.colors[ring] || '#667eea';
            this.ctx.lineWidth = config.thickness;
            this.ctx.globalAlpha = 0.7 + (amplitudeMultiplier * 0.3);
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawFrequencySpline(centerX, centerY, config) {
        // Create a smooth spline that reacts to frequencies
        const radius = config.baseSize;
        const angleStep = (Math.PI * 2) / config.pointCount;
        
        // Calculate frequency bin range
        const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
        const fftSize = this.analyser ? this.analyser.fftSize : 2048;
        const binWidth = sampleRate / fftSize;
        const minBin = Math.floor(config.freqMin / binWidth);
        const maxBin = Math.floor(config.freqMax / binWidth);
        
        this.ctx.beginPath();
        this.ctx.lineWidth = config.thickness;
        
        const points = [];
        for (let i = 0; i < config.pointCount; i++) {
            const angle = i * angleStep;
            
            // Map point to frequency range
            const binIndex = Math.floor(minBin + (i / config.pointCount) * (maxBin - minBin));
            const amplitude = this.dataArray && this.dataArray[binIndex] ? this.dataArray[binIndex] : 0;
            const normalizedAmplitude = amplitude / 255;
            
            // Calculate radius with audio reactivity (scaled)
            const reactiveOffset = normalizedAmplitude * config.sensitivity * 50 * (config.baseSize / 100);
            const reactiveRadius = radius + reactiveOffset;
            
            const x = centerX + Math.cos(angle) * reactiveRadius;
            const y = centerY + Math.sin(angle) * reactiveRadius;
            
            points.push({ x, y, amplitude: normalizedAmplitude });
        }
        
        // Draw smooth spline
        if (points.length > 0) {
            this.ctx.strokeStyle = config.colors[0] || '#667eea';
            this.ctx.globalAlpha = 0.8;
            
            this.ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 0; i < points.length; i++) {
                const current = points[i];
                const next = points[(i + 1) % points.length];
                const controlX = (current.x + next.x) / 2;
                const controlY = (current.y + next.y) / 2;
                
                this.ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
            }
            
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    drawSameRadiusPoints(centerX, centerY, config) {
        const radius = config.baseSize;
        const angleStep = (Math.PI * 2) / config.pointCount;
        
        // Calculate frequency bin range
        const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
        const fftSize = this.analyser ? this.analyser.fftSize : 2048;
        const binWidth = sampleRate / fftSize;
        const minBin = Math.floor(config.freqMin / binWidth);
        const maxBin = Math.floor(config.freqMax / binWidth);
        
        for (let i = 0; i < config.pointCount; i++) {
            const angle = i * angleStep;
            
            // Map point to frequency range
            const binIndex = Math.floor(minBin + (i / config.pointCount) * (maxBin - minBin));
            const amplitude = this.dataArray && this.dataArray[binIndex] ? this.dataArray[binIndex] : 0;
            const normalizedAmplitude = amplitude / 255;
            
            // Base position on circle
            const baseX = centerX + Math.cos(angle) * radius;
            const baseY = centerY + Math.sin(angle) * radius;
            
            // Add reactive movement (scaled)
            const reactiveOffset = normalizedAmplitude * config.sensitivity * 30 * (config.baseSize / 100);
            const x = baseX + Math.cos(angle) * reactiveOffset;
            const y = baseY + Math.sin(angle) * reactiveOffset;
            
            // Draw point (scaled size)
            const colorIndex = i % config.colors.length;
            const pointSize = config.thickness + (normalizedAmplitude * 5 * (config.baseSize / 100));
            
            this.ctx.fillStyle = config.colors[colorIndex] || '#667eea';
            this.ctx.globalAlpha = 0.7 + (normalizedAmplitude * 0.3);
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, pointSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Optional: draw line from center to point
            this.ctx.strokeStyle = config.colors[colorIndex] || '#667eea';
            this.ctx.lineWidth = Math.max(1, config.thickness * 0.5);
            this.ctx.globalAlpha = 0.3 + (normalizedAmplitude * 0.4);
            this.ctx.beginPath();
            this.ctx.moveTo(baseX, baseY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
    }

    drawBarVisualizer() {
        const config = this.visualizers.bar;
        const barWidth = this.canvas.width / config.count;
        const canvasHeight = this.canvas.height;
        
        // Calculate scale factor for bar heights
        const scaleFactor = this.canvas.height / 600;
        const scaledMaxHeight = config.maxHeight * scaleFactor;
        const scaledBarWidth = Math.max(1, config.width * Math.min(this.canvas.width / 800, 1));
        
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';

        // Create gradient (scaled)
        const gradient = this.ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - scaledMaxHeight);
        gradient.addColorStop(0, config.gradientStart);
        gradient.addColorStop(1, config.gradientEnd);

        for (let i = 0; i < config.count; i++) {
            // Map bar index to frequency data index
            const dataIndex = Math.floor((i / config.count) * this.dataArray.length);
            const amplitude = this.dataArray[dataIndex];
            
            // Calculate bar height (scaled)
            const normalizedAmplitude = amplitude / 255;
            const barHeight = normalizedAmplitude * scaledMaxHeight * config.sensitivity;
            
            // Draw bar (scaled positioning)
            const x = i * barWidth + (barWidth - scaledBarWidth) / 2;
            const y = canvasHeight - barHeight;
            
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = 0.8;
            this.ctx.fillRect(x, y, scaledBarWidth, barHeight);
        }

        this.ctx.restore();
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
        // Increased buffer to prevent clipping of large images
        const totalLayers = this.loadedImages.length + 8; // Increased buffer
        
        // Draw layers from largest to smallest (background to foreground)
        for (let layer = -4; layer < totalLayers; layer++) { // Start from -4 instead of -3
            // Calculate which image to use for this layer
            // Handle negative indices properly
            const imageIndex = ((baseImageIndex + layer) % this.loadedImages.length + this.loadedImages.length) % this.loadedImages.length;
            const imageCanvas = this.loadedImages[imageIndex].canvas;
            
            // Calculate the scale for this layer
            // Each layer is smaller by the scale ratio
            const layerScale = baseZoom * Math.pow(this.scaleRatio, layer);
            
            // Keep drawing large images even when they're much bigger than the canvas
            // Extended range to prevent clipping - images should stay visible longer
            if (layerScale < 0.0005 || layerScale > 20) continue; // Extended both limits
            
            // Calculate dimensions and position (centered)
            const scaledWidth = this.canvas.width * layerScale;
            const scaledHeight = this.canvas.height * layerScale;
            const x = centerX - scaledWidth / 2;
            const y = centerY - scaledHeight / 2;
            
            // Only skip drawing if the image is completely outside the visible area
            // Add a buffer zone to ensure smooth transitions
            const buffer = Math.max(scaledWidth, scaledHeight) * 0.1; // 10% buffer
            if (x + scaledWidth + buffer < 0 || 
                y + scaledHeight + buffer < 0 || 
                x - buffer > this.canvas.width || 
                y - buffer > this.canvas.height) {
                continue; // Skip if completely outside with buffer
            }
            
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
        const totalLayers = exportImages.length + 8; // Increased buffer
        
        for (let layer = -4; layer < totalLayers; layer++) { // Start from -4
            const imageIndex = ((baseImageIndex + layer) % exportImages.length + exportImages.length) % exportImages.length;
            const imageCanvas = exportImages[imageIndex].canvas;
            const layerScale = baseZoom * Math.pow(this.scaleRatio, layer);
            
            if (layerScale < 0.0005 || layerScale > 20) continue; // Extended range
            
            const scaledWidth = width * layerScale;
            const scaledHeight = height * layerScale;
            const x = centerX - scaledWidth / 2;
            const y = centerY - scaledHeight / 2;
            
            // Add buffer zone for export too
            const buffer = Math.max(scaledWidth, scaledHeight) * 0.1;
            if (x + scaledWidth + buffer < 0 || 
                y + scaledHeight + buffer < 0 || 
                x - buffer > width || 
                y - buffer > height) {
                continue;
            }
            
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

    showLoadingIndicator(totalFiles) {
        // Remove existing indicator if any
        this.hideLoadingIndicator();

        const indicator = document.createElement('div');
        indicator.id = 'loadingIndicator';
        indicator.className = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>Loading Images...</h3>
                <div class="loading-progress-bar">
                    <div class="loading-progress-fill" id="loadingProgressFill"></div>
                </div>
                <p class="loading-text" id="loadingText">Preparing to load ${totalFiles} image(s)...</p>
            </div>
        `;

        document.body.appendChild(indicator);
    }

    updateLoadingProgress(loaded, total) {
        const progressFill = document.getElementById('loadingProgressFill');
        const loadingText = document.getElementById('loadingText');
        
        if (progressFill && loadingText) {
            const percentage = (loaded / total) * 100;
            progressFill.style.width = `${percentage}%`;
            loadingText.textContent = `Loading images... ${loaded}/${total} (${Math.round(percentage)}%)`;
        }
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        let icon = '';
        switch (type) {
            case 'success': icon = '✓'; break;
            case 'warning': icon = '⚠'; break;
            case 'error': icon = '✕'; break;
            default: icon = 'ℹ'; break;
        }
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease-out forwards;
            max-width: 350px;
            word-wrap: break-word;
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return 'linear-gradient(45deg, #10b981 0%, #059669 100%)';
            case 'warning': return 'linear-gradient(45deg, #f59e0b 0%, #d97706 100%)';
            case 'error': return 'linear-gradient(45deg, #ef4444 0%, #dc2626 100%)';
            default: return 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
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
