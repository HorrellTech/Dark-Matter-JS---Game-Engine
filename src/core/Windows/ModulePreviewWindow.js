/**
 * Module Preview Window
 * A dedicated window for testing visual modules with an isolated engine instance
 */
class ModulePreviewWindow extends EditorWindow {
    constructor(builderWindow) {
        super("Module Preview", 400, 300);
        
        this.builderWindow = builderWindow;
        this.previewGameObject = null;
        this.previewModuleInstance = null;
        this.currentModuleClass = null;
        
        this.setupUI();
        this.initializePreviewEngine();
        
        // Show the window
        this.show();
    }

    setupUI() {
        this.content.style.cssText = `
            display: flex;
            flex-direction: column;
            padding: 0;
            gap: 0;
            background: #1a1a1a;
            overflow: hidden;
        `;

        // Control bar
        const controlBar = document.createElement('div');
        controlBar.style.cssText = `
            padding: 8px;
            background: #252525;
            border-bottom: 1px solid #444;
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
        `;

        // Play/Pause button
        const playPauseBtn = document.createElement('button');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playPauseBtn.title = 'Pause/Resume';
        playPauseBtn.style.cssText = `
            padding: 6px 12px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        playPauseBtn.onclick = () => {
            if (window.previewEngine) {
                if (window.previewEngine.running) {
                    window.previewEngine.pause();
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                } else {
                    window.previewEngine.resume();
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                }
            }
        };

        // Restart button
        const restartBtn = document.createElement('button');
        restartBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        restartBtn.title = 'Restart';
        restartBtn.style.cssText = `
            padding: 6px 12px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        restartBtn.onclick = () => this.restartPreview();

        // Info label
        const infoLabel = document.createElement('span');
        infoLabel.style.cssText = `
            color: #aaa;
            font-size: 12px;
            margin-left: auto;
        `;
        infoLabel.textContent = 'Live Preview';

        controlBar.appendChild(playPauseBtn);
        controlBar.appendChild(restartBtn);
        controlBar.appendChild(infoLabel);

        // Canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            flex: 1;
            position: relative;
            background: #000;
            overflow: hidden;
        `;

        // Preview canvas
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = 400;
        this.previewCanvas.height = 300;
        this.previewCanvas.style.cssText = `
            display: block;
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
        `;

        canvasContainer.appendChild(this.previewCanvas);

        this.content.appendChild(controlBar);
        this.content.appendChild(canvasContainer);

        // Handle window resize
        this.onResize = () => {
            if (this.previewCanvas && window.previewEngine) {
                const rect = canvasContainer.getBoundingClientRect();
                this.previewCanvas.width = rect.width;
                this.previewCanvas.height = rect.height;
                window.previewEngine.viewport.width = rect.width;
                window.previewEngine.viewport.height = rect.height;
                window.previewEngine.resizeCanvas();
            }
        };
    }

    async initializePreviewEngine() {
        console.log('Initializing preview engine...');
        console.log('Canvas dimensions:', this.previewCanvas.width, this.previewCanvas.height);
        console.log('Canvas in DOM:', document.body.contains(this.previewCanvas));
        
        // Wait for canvas to be in DOM before creating engine
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Canvas in DOM after timeout:', document.body.contains(this.previewCanvas));
        
        // Stop existing preview engine if it exists
        if (window.previewEngine) {
            console.log('Stopping existing preview engine...');
            window.previewEngine.stop();
        }
        
        // Store reference to main engine temporarily
        const mainEngine = window.engine;
        
        // Create isolated engine instance
        window.previewEngine = new Engine(this.previewCanvas);
        
        // Temporarily set as global engine so GameObject adds to this one
        window.engine = window.previewEngine;
        
        console.log('Engine created');
        console.log('Engine canvas exists:', !!window.previewEngine.canvas);
        console.log('Engine ctx exists:', !!window.previewEngine.ctx);
        
        // Create a simple scene
        const previewScene = new Scene("Preview Scene");
        previewScene.settings.backgroundColor = "#444444";
        
        // Create preview GameObject (DON'T load scene yet so it doesn't auto-add)
        this.previewGameObject = new GameObject("Preview Object");
        this.previewGameObject.position.x = this.previewCanvas.width / 2;
        this.previewGameObject.position.y = this.previewCanvas.height / 2;
        this.previewGameObject.size.x = 50;
        this.previewGameObject.size.y = 50;
        this.previewGameObject.color = "#00ff00"; // Make it visible with a green color
        
        console.log('Preview GameObject created');
        console.log('Position:', this.previewGameObject.position.x, this.previewGameObject.position.y);
        console.log('Size:', this.previewGameObject.size.x, this.previewGameObject.size.y);
        console.log('Color:', this.previewGameObject.color);
        
        // Manually add GameObject to scene
        previewScene.gameObjects.push(this.previewGameObject);
        
        console.log('GameObject added to scene. Scene has', previewScene.gameObjects.length, 'game objects');
        
        // Now load the scene
        window.previewEngine.loadScene(previewScene);
        
        // Restore main engine
        window.engine = mainEngine;
        
        console.log('Scene loaded with', window.previewEngine.currentScene.gameObjects.length, 'game objects');
        console.log('Main engine scene has', mainEngine.currentScene ? mainEngine.currentScene.gameObjects.length : 0, 'game objects');
        
        // Start engine (async)
        await window.previewEngine.start();
        console.log('Engine started, running:', window.previewEngine.running);
        console.log('Engine animationFrameId:', window.previewEngine.animationFrameId);
        console.log('Preview engine scene game objects:', window.previewEngine.currentScene.gameObjects.length);
    }

    updateModule(ModuleClass) {
        console.log('updateModule called with:', ModuleClass.name);
        
        if (!this.previewGameObject || !window.previewEngine) {
            console.warn('Preview not initialized');
            return;
        }

        // Clean up old module
        if (this.previewModuleInstance) {
            console.log('Cleaning up old module instance');
            if (this.previewModuleInstance.onDestroy) {
                this.previewModuleInstance.onDestroy();
            }
            const index = this.previewGameObject.modules.indexOf(this.previewModuleInstance);
            if (index !== -1) {
                this.previewGameObject.modules.splice(index, 1);
            }
        }

        // Create new module instance
        this.currentModuleClass = ModuleClass;
        try {
            this.previewModuleInstance = new ModuleClass();
            console.log('Module instance created:', this.previewModuleInstance.constructor.name);
        } catch (error) {
            console.error('Error creating module instance:', error);
            return;
        }
        
        // Add to GameObject
        this.previewGameObject.modules.push(this.previewModuleInstance);
        this.previewModuleInstance.gameObject = this.previewGameObject;
        console.log('Module added to GameObject. Total modules:', this.previewGameObject.modules.length);

        // Call start if it exists
        if (this.previewModuleInstance.start) {
            try {
                this.previewModuleInstance.start();
                console.log('Module start() called successfully');
            } catch (error) {
                console.error('Error calling module start():', error);
            }
        }

        // Ensure engine is running
        if (!window.previewEngine.running) {
            console.log('Engine not running, attempting to start...');
            window.previewEngine.start().then(() => {
                console.log('Engine running after start:', window.previewEngine.running);
            });
        }

        console.log('Module updated in preview:', ModuleClass.name);
        console.log('GameObject has', this.previewGameObject.modules.length, 'modules');
        console.log('Engine running:', window.previewEngine.running);
    }

    async restartPreview() {
        if (!window.previewEngine) return;

        console.log('Restarting preview...');
        
        // Stop current engine
        window.previewEngine.stop();

        // Reinitialize
        await this.initializePreviewEngine();

        // Reapply current module if we have one
        if (this.currentModuleClass) {
            this.updateModule(this.currentModuleClass);
        }

        console.log('Preview restarted');
    }

    close() {
        // Stop engine
        if (window.previewEngine) {
            window.previewEngine.stop();
            window.previewEngine = null;
        }

        // Clean up references
        this.previewGameObject = null;
        this.previewModuleInstance = null;
        this.currentModuleClass = null;

        super.close();
    }

    onResize() {
        // Override in setupUI
    }
}

// Make available globally
window.ModulePreviewWindow = ModulePreviewWindow;