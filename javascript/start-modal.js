class StartModal {
    constructor() {
        this.modal = null;
        this.showOnStartup = localStorage.getItem('showStartupModal') !== 'false';
        this.init();
    }

    init() {
        this.createModal();
        this.createHelpButton();
        this.setupEventListeners();
        
        // Show modal on startup if enabled
        if (this.showOnStartup) {
            this.show();
        }
    }

    createHelpButton() {
        const helpButton = document.createElement('button');
        helpButton.id = 'helpButton';
        helpButton.className = 'help-button';
        helpButton.innerHTML = '?';
        helpButton.title = 'Show Help & Tutorial';
        helpButton.onclick = () => this.show();
        
        document.body.appendChild(helpButton);
    }

    createModal() {
        const modalHTML = `
            <div class="start-modal-overlay" id="startModalOverlay">
                <div class="start-modal">
                    <div class="start-modal-header">
                        <h2>🌌 Welcome to Zoom Quilt Generator</h2>
                        <button class="start-modal-close" id="startModalClose">&times;</button>
                    </div>
                    
                    <div class="start-modal-content">
                        <div class="start-modal-section">
                            <h3>✨ What is a Zoom Quilt?</h3>
                            <p>A Zoom Quilt is a mesmerizing infinite zoom animation where images seamlessly transition into each other, creating an endless tunnel effect. Perfect for music videos, presentations, or artistic expression!</p>
                        </div>

                        <div class="start-modal-section">
                            <h3>🚀 How to Get Started</h3>
                            <div class="start-modal-steps">
                                <div class="step">
                                    <div class="step-number">1</div>
                                    <div class="step-content">
                                        <h4>📁 Import Your Images</h4>
                                        <p>Drag and drop images or click "Choose Files" in the Images tab. Use 5-15 images for best results.</p>
                                    </div>
                                </div>
                                
                                <div class="step">
                                    <div class="step-number">2</div>
                                    <div class="step-content">
                                        <h4>⚡ Choose Your Mode</h4>
                                        <p><strong>Simple Mode:</strong> Basic controls for quick creation<br>
                                        <strong>Advanced Mode:</strong> Full control over effects and settings</p>
                                    </div>
                                </div>
                                
                                <div class="step">
                                    <div class="step-number">3</div>
                                    <div class="step-content">
                                        <h4>🎬 Generate & Preview</h4>
                                        <p>Click "Generate" to create your zoom quilt, then use "Preview" to see it in action!</p>
                                    </div>
                                </div>
                                
                                <div class="step">
                                    <div class="step-number">4</div>
                                    <div class="step-content">
                                        <h4>🎵 Add Audio (Optional)</h4>
                                        <p>Import an audio file in the Audio tab to create reactive zoom effects that respond to music.</p>
                                    </div>
                                </div>
                                
                                <div class="step">
                                    <div class="step-number">5</div>
                                    <div class="step-content">
                                        <h4>💾 Export Your Creation</h4>
                                        <p>Use the Export button to save your zoom quilt as a video file or animated GIF.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="start-modal-section">
                            <h3>💡 Pro Tips</h3>
                            <div class="pro-tips">
                                <div class="tip">
                                    <span class="tip-icon">🖼️</span>
                                    <p><strong>Image Quality:</strong> Use high-resolution images (1920x1080 or higher) for crisp results</p>
                                </div>
                                <div class="tip">
                                    <span class="tip-icon">🎨</span>
                                    <p><strong>Image Order:</strong> Drag images in the list to reorder them for better flow</p>
                                </div>
                                <div class="tip">
                                    <span class="tip-icon">⚡</span>
                                    <p><strong>Performance:</strong> Start with fewer images and simple settings, then add complexity</p>
                                </div>
                                <div class="tip">
                                    <span class="tip-icon">🎵</span>
                                    <p><strong>Audio Sync:</strong> Use music with strong beats for the best reactive effects</p>
                                </div>
                            </div>
                        </div>

                        <div class="start-modal-section">
                            <h3>🛠️ Advanced Features</h3>
                            <div class="advanced-features">
                                <div class="feature">
                                    <h4>✨ Shape Effects</h4>
                                    <p>Choose from circles, hearts, stars, and more to create unique transition shapes</p>
                                </div>
                                <div class="feature">
                                    <h4>🌊 Audio Visualizers</h4>
                                    <p>Add reactive visual effects like frequency bars, particle systems, and starfields</p>
                                </div>
                                <div class="feature">
                                    <h4>🌑 Vignette Effects</h4>
                                    <p>Apply edge darkening for a cinematic look</p>
                                </div>
                                <div class="feature">
                                    <h4>🎬 Multiple Export Formats</h4>
                                    <p>Export as MP4, WebM, or animated GIF with custom quality settings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="start-modal-footer">
                        <label class="start-modal-checkbox">
                            <input type="checkbox" id="showOnStartupCheckbox" ${this.showOnStartup ? 'checked' : ''}>
                            <span>Show this dialog on startup</span>
                        </label>
                        <div class="start-modal-buttons">
                            <button class="btn btn-primary" id="startModalOk">Let's Create!</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('startModalOverlay');
    }

    setupEventListeners() {
        const closeBtn = document.getElementById('startModalClose');
        const cancelBtn = document.getElementById('startModalCancel');
        const okBtn = document.getElementById('startModalOk');
        const checkbox = document.getElementById('showOnStartupCheckbox');
        const overlay = document.getElementById('startModalOverlay');

        // Close modal events
        [closeBtn, cancelBtn, okBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hide());
            }
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        });

        // Checkbox change event
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.showOnStartup = e.target.checked;
                localStorage.setItem('showStartupModal', this.showOnStartup.toString());
            });
        }

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });
    }

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Animate in
            setTimeout(() => {
                this.modal.classList.add('active');
            }, 10);
        }
    }

    hide() {
        if (this.modal) {
            this.modal.classList.remove('active');
            
            // Wait for animation to complete
            setTimeout(() => {
                this.modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    }

    isVisible() {
        return this.modal && this.modal.style.display === 'flex';
    }

    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Export for use in app.js
window.StartModal = StartModal;