class SettingsModal {
    constructor() {
        this.modal = null;
        this.settings = this.loadSettings();
        this.createModal();
    }

    loadSettings() {
        const saved = localStorage.getItem('darkMatterSettings');
        return saved ? JSON.parse(saved) : {
            // Editor settings
            //autoSave: true,
            //showSaveReminder: true,
            autoSaveInterval: 30, // seconds
            showGrid: true,
            gridSize: 32,
            snapToGrid: false,

            // Rendering settings
            antiAliasing: true,
            pixelPerfect: false,
            smoothing: true,

            // Touch settings
            touchSensitivity: 1.0,
            pinchZoomEnabled: true,
            touchPanEnabled: true,

            // Performance settings
            maxFPS: 120,
            enableVSync: true,

            // Export settings
            exportFormat: 'html5',
            includeAssets: true,
            minifyCode: false,

            // Theme settings
            theme: 'dark',
            fontSize: 14,

            // Debug settings
            showFPS: false,
            showDebugInfo: false,
            enableConsoleLogging: true
        };
    }

    saveSettings() {
        localStorage.setItem('darkMatterSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    applySettings() {
        // Apply editor settings
        if (window.editor) {
            if (window.editor.grid) {
                window.editor.grid.showGrid = this.settings.showGrid;
                window.editor.grid.gridSize = this.settings.gridSize;
                window.editor.grid.snapToGrid = this.settings.snapToGrid;

                // Update UI controls
                const showGridCheckbox = document.getElementById('showGrid');
                if (showGridCheckbox) showGridCheckbox.checked = this.settings.showGrid;

                const gridSizeInput = document.getElementById('gridSize');
                if (gridSizeInput) gridSizeInput.value = this.settings.gridSize;

                const snapToGridCheckbox = document.getElementById('snapToGrid');
                if (snapToGridCheckbox) snapToGridCheckbox.checked = this.settings.snapToGrid;
            }

            window.editor.refreshCanvas();
        }

        // Apply engine settings
        if (window.engine) {
            window.engine.renderConfig.smoothing = this.settings.smoothing;
            window.engine.renderConfig.pixelPerfect = this.settings.pixelPerfect;
            window.engine.setVSync(this.settings.enableVSync);
        }

        // Apply auto-save settings
        if (window.autoSaveManager && this.settings.autoSave) {
            window.autoSaveManager.setInterval(this.settings.autoSaveInterval * 1000);
        }

        // Apply showSaveReminder to ProjectManager if available
        if (window.ProjectManager) {
            window.ProjectManager.showSaveReminder = this.settings.showSaveReminder;
        }

        // Apply touch settings
        this.applyTouchSettings();
    }

    applyTouchSettings() {
        // Update touch sensitivity and other touch-related settings
        if (window.editor) {
            window.editor.touchSensitivity = this.settings.touchSensitivity;
            window.editor.pinchZoomEnabled = this.settings.pinchZoomEnabled;
            window.editor.touchPanEnabled = this.settings.touchPanEnabled;
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'settings-modal';
        this.modal.style.display = 'none';
        this.modal.innerHTML = `
            <div class="settings-modal-content">
                <div class="settings-modal-header">
                    <h2>Settings</h2>
                    <button class="settings-close-button">&times;</button>
                </div>
                <div class="settings-modal-body">
                    <div class="settings-tabs">
                        <button class="settings-tab active" data-tab="editor">Editor</button>
                        <button class="settings-tab" data-tab="rendering">Rendering</button>
                        <button class="settings-tab" data-tab="touch">Touch & Input</button>
                        <button class="settings-tab" data-tab="performance">Performance</button>
                        <button class="settings-tab" data-tab="export">Export</button>
                        <button class="settings-tab" data-tab="debug">Debug</button>
                    </div>
                    
                    <div class="settings-content">
                        <!-- Editor Settings -->
                        <div class="settings-panel active" id="editor-panel">
                            <h3>Editor Settings</h3>
                            <!--div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-auto-save" ${this.settings.autoSave ? 'checked' : ''}>
                                    Enable Auto-Save
                                </label>
                                <div class="setting-description">Automatically save your project at regular intervals</div>
                            </div-->
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-show-save-reminder" ${this.settings.showSaveReminder ? 'checked' : ''}>
                                    Show Save Reminder Toast
                                </label>
                                <div class="setting-description">Show periodic reminders to save your project</div>
                            </div>
                            <!--div class="settings-group">
                                <label>Auto-Save Interval (seconds):</label>
                                <input type="number" id="setting-auto-save-interval" value="${this.settings.autoSaveInterval}" min="10" max="300">
                            </div-->
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-show-grid" ${this.settings.showGrid ? 'checked' : ''}>
                                    Show Grid by Default
                                </label>
                            </div>
                            <div class="settings-group">
                                <label>Default Grid Size:</label>
                                <input type="number" id="setting-grid-size" value="${this.settings.gridSize}" min="8" max="128">
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-snap-to-grid" ${this.settings.snapToGrid ? 'checked' : ''}>
                                    Snap to Grid by Default
                                </label>
                            </div>
                        </div>

                        <!-- Rendering Settings -->
                        <div class="settings-panel" id="rendering-panel">
                            <h3>Rendering Settings</h3>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-anti-aliasing" ${this.settings.antiAliasing ? 'checked' : ''}>
                                    Enable Anti-Aliasing
                                </label>
                                <div class="setting-description">Smooth edges of rendered graphics</div>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-pixel-perfect" ${this.settings.pixelPerfect ? 'checked' : ''}>
                                    Pixel Perfect Rendering
                                </label>
                                <div class="setting-description">Disable smoothing for crisp pixel art</div>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-smoothing" ${this.settings.smoothing ? 'checked' : ''}>
                                    Image Smoothing
                                </label>
                                <div class="setting-description">Smooth scaling of images and sprites</div>
                            </div>
                        </div>

                        <!-- Touch & Input Settings -->
                        <div class="settings-panel" id="touch-panel">
                            <h3>Touch & Input Settings</h3>
                            <div class="settings-group">
                                <label>Touch Sensitivity:</label>
                                <input type="range" id="setting-touch-sensitivity" min="0.5" max="2.0" step="0.1" value="${this.settings.touchSensitivity}">
                                <span class="range-value">${this.settings.touchSensitivity}</span>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-pinch-zoom" ${this.settings.pinchZoomEnabled ? 'checked' : ''}>
                                    Enable Pinch to Zoom
                                </label>
                                <div class="setting-description">Allow pinch gestures for zooming in the editor</div>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-touch-pan" ${this.settings.touchPanEnabled ? 'checked' : ''}>
                                    Enable Touch Panning
                                </label>
                                <div class="setting-description">Allow touch gestures for panning the camera</div>
                            </div>
                        </div>

                        <!-- Performance Settings -->
                        <div class="settings-panel" id="performance-panel">
                            <h3>Performance Settings</h3>
                            <div class="settings-group">
                                <label>Maximum FPS:</label>
                                <select id="setting-max-fps">
                                    <option value="30" ${this.settings.maxFPS === 30 ? 'selected' : ''}>30 FPS</option>
                                    <option value="60" ${this.settings.maxFPS === 60 ? 'selected' : ''}>60 FPS</option>
                                    <option value="120" ${this.settings.maxFPS === 120 ? 'selected' : ''}>120 FPS</option>
                                    <option value="0" ${this.settings.maxFPS === 0 ? 'selected' : ''}>Unlimited</option>
                                </select>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-vsync" ${this.settings.enableVSync ? 'checked' : ''}>
                                    Enable V-Sync
                                </label>
                                <div class="setting-description">Synchronize frame rate with display refresh rate</div>
                            </div>
                        </div>

                        <!-- Export Settings -->
                        <div class="settings-panel" id="export-panel">
                            <h3>Export Settings</h3>
                            <div class="settings-group">
                                <label>Default Export Format:</label>
                                <select id="setting-export-format">
                                    <option value="html5" ${this.settings.exportFormat === 'html5' ? 'selected' : ''}>HTML5</option>
                                    <option value="standalone" ${this.settings.exportFormat === 'standalone' ? 'selected' : ''}>Standalone HTML</option>
                                </select>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-include-assets" ${this.settings.includeAssets ? 'checked' : ''}>
                                    Include Assets in Export
                                </label>
                                <div class="setting-description">Bundle all assets with the exported game</div>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-minify-code" ${this.settings.minifyCode ? 'checked' : ''}>
                                    Minify Exported Code
                                </label>
                                <div class="setting-description">Compress code for smaller file size</div>
                            </div>
                        </div>

                        <!-- Debug Settings -->
                        <div class="settings-panel" id="debug-panel">
                            <h3>Debug Settings</h3>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-show-fps" ${this.settings.showFPS ? 'checked' : ''}>
                                    Show FPS Counter
                                </label>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-show-debug-info" ${this.settings.showDebugInfo ? 'checked' : ''}>
                                    Show Debug Information
                                </label>
                            </div>
                            <div class="settings-group">
                                <label>
                                    <input type="checkbox" id="setting-console-logging" ${this.settings.enableConsoleLogging ? 'checked' : ''}>
                                    Enable Console Logging
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="settings-modal-footer">
                    <button class="settings-button" id="settings-reset">Reset to Defaults</button>
                    <button class="settings-button" id="settings-cancel">Cancel</button>
                    <button class="settings-button primary" id="settings-apply">Apply</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        this.modal.querySelector('.settings-close-button').addEventListener('click', () => {
            this.close();
        });

        // Tab switching
        this.modal.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Range input updates
        const touchSensitivityRange = this.modal.querySelector('#setting-touch-sensitivity');
        const touchSensitivityValue = this.modal.querySelector('.range-value');
        touchSensitivityRange.addEventListener('input', (e) => {
            touchSensitivityValue.textContent = e.target.value;
        });

        // Button handlers
        this.modal.querySelector('#settings-cancel').addEventListener('click', () => {
            this.close();
        });

        this.modal.querySelector('#settings-apply').addEventListener('click', () => {
            this.applyChanges();
        });

        this.modal.querySelector('#settings-reset').addEventListener('click', () => {
            this.resetToDefaults();
        });

        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Touch support for modal close (tap outside)
        this.modal.addEventListener('touchstart', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Touch support for tabs
        this.modal.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Touch support for buttons
        ['settings-cancel', 'settings-apply', 'settings-reset'].forEach(id => {
            const btn = this.modal.querySelector(`#${id}`);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.click();
                });
            }
        });

        // Prevent background scroll/zoom when modal is open
        this.modal.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    switchTab(tabName) {
        // Update tab buttons
        this.modal.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        this.modal.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    }

    applyChanges() {
        // Collect all settings from the form
        //this.settings.autoSave = this.modal.querySelector('#setting-auto-save').checked;
        //this.settings.autoSaveInterval = parseInt(this.modal.querySelector('#setting-auto-save-interval').value);
        this.settings.showGrid = this.modal.querySelector('#setting-show-grid').checked;
        this.settings.gridSize = parseInt(this.modal.querySelector('#setting-grid-size').value);
        this.settings.snapToGrid = this.modal.querySelector('#setting-snap-to-grid').checked;
        this.settings.showSaveReminder = this.modal.querySelector('#setting-show-save-reminder').checked;

        this.settings.antiAliasing = this.modal.querySelector('#setting-anti-aliasing').checked;
        this.settings.pixelPerfect = this.modal.querySelector('#setting-pixel-perfect').checked;
        this.settings.smoothing = this.modal.querySelector('#setting-smoothing').checked;

        this.settings.touchSensitivity = parseFloat(this.modal.querySelector('#setting-touch-sensitivity').value);
        this.settings.pinchZoomEnabled = this.modal.querySelector('#setting-pinch-zoom').checked;
        this.settings.touchPanEnabled = this.modal.querySelector('#setting-touch-pan').checked;

        this.settings.maxFPS = parseInt(this.modal.querySelector('#setting-max-fps').value);
        this.settings.enableVSync = this.modal.querySelector('#setting-vsync').checked;

        this.settings.exportFormat = this.modal.querySelector('#setting-export-format').value;
        this.settings.includeAssets = this.modal.querySelector('#setting-include-assets').checked;
        this.settings.minifyCode = this.modal.querySelector('#setting-minify-code').checked;

        this.settings.showFPS = this.modal.querySelector('#setting-show-fps').checked;
        this.settings.showDebugInfo = this.modal.querySelector('#setting-show-debug-info').checked;
        this.settings.enableConsoleLogging = this.modal.querySelector('#setting-console-logging').checked;

        this.saveSettings();

        if (window.engine) {
            window.engine.updateFPSLimit(this.settings.maxFPS);
        }
        this.close();

        // Show confirmation
        this.showNotification('Settings applied successfully!');
    }

    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to their default values?')) {
            this.settings = this.loadSettings(); // This loads defaults
            localStorage.removeItem('darkMatterSettings');
            this.close();
            this.applySettings();
            this.showNotification('Settings reset to defaults!');
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'settings-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    open() {
        // Reload settings from localStorage before showing modal
        this.settings = this.loadSettings();
        this.modal.style.display = 'flex';
        this.populateForm();
    }

    close() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('open');
    }

    populateForm() {
        // Populate form with current settings
        //this.modal.querySelector('#setting-auto-save').checked = this.settings.autoSave;
        //this.modal.querySelector('#setting-auto-save-interval').value = this.settings.autoSaveInterval;
        this.modal.querySelector('#setting-show-grid').checked = this.settings.showGrid;
        this.modal.querySelector('#setting-grid-size').value = this.settings.gridSize;
        this.modal.querySelector('#setting-snap-to-grid').checked = this.settings.snapToGrid;
        this.modal.querySelector('#setting-show-save-reminder').checked = this.settings.showSaveReminder;

        this.modal.querySelector('#setting-anti-aliasing').checked = this.settings.antiAliasing;
        this.modal.querySelector('#setting-pixel-perfect').checked = this.settings.pixelPerfect;
        this.modal.querySelector('#setting-smoothing').checked = this.settings.smoothing;

        this.modal.querySelector('#setting-touch-sensitivity').value = this.settings.touchSensitivity;
        this.modal.querySelector('.range-value').textContent = this.settings.touchSensitivity;
        this.modal.querySelector('#setting-pinch-zoom').checked = this.settings.pinchZoomEnabled;
        this.modal.querySelector('#setting-touch-pan').checked = this.settings.touchPanEnabled;

        this.modal.querySelector('#setting-max-fps').value = this.settings.maxFPS;
        this.modal.querySelector('#setting-vsync').checked = this.settings.enableVSync;

        this.modal.querySelector('#setting-export-format').value = this.settings.exportFormat;
        this.modal.querySelector('#setting-include-assets').checked = this.settings.includeAssets;
        this.modal.querySelector('#setting-minify-code').checked = this.settings.minifyCode;

        this.modal.querySelector('#setting-show-fps').checked = this.settings.showFPS;
        this.modal.querySelector('#setting-show-debug-info').checked = this.settings.showDebugInfo;
        this.modal.querySelector('#setting-console-logging').checked = this.settings.enableConsoleLogging;
    }
}

// Create global instance when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.settingsModal = new SettingsModal();
        console.log('SettingsModal initialized');
    });
} else {
    // DOM is already loaded
    window.settingsModal = new SettingsModal();
    console.log('SettingsModal initialized');
}