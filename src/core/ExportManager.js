class ExportManager {
    constructor() {
        this.exportSettings = {
            format: 'html5',
            includeAssets: true,
            minifyCode: false,
            standalone: true,
            includeEngine: true,
            customTitle: '',
            customDescription: '',
            viewport: {
                width: 800,
                height: 600,
                scalable: true
            }
        };
    }

    /**
     * Export the current project as HTML5
     * @param {Object} project - The project data to export
     * @param {Object} settings - Export settings override
     */
    async exportProject(project, settings = {}) {
        // Merge settings
        const exportSettings = { ...this.exportSettings, ...settings };
        
        console.log('Starting HTML5 export...');
        
        try {
            // Collect all necessary files and data
            const exportData = await this.collectExportData(project, exportSettings);
            
            // Generate the HTML5 package
            const htmlContent = this.generateHTML(exportData, exportSettings);
            const jsContent = this.generateJavaScript(exportData, exportSettings);
            const cssContent = this.generateCSS(exportData, exportSettings);
            
            // Create downloadable package
            if (exportSettings.standalone) {
                // Single HTML file with everything embedded
                const standaloneHTML = this.createStandaloneHTML(htmlContent, jsContent, cssContent, exportData, exportSettings);
                this.downloadFile(standaloneHTML, `${project.name || 'game'}.html`, 'text/html');
            } else {
                // Multiple files in a ZIP
                await this.createZipPackage(htmlContent, jsContent, cssContent, exportData, exportSettings, project.name || 'game');
            }
            
            console.log('Export completed successfully!');
            return true;
            
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    /**
     * Collect all data needed for export
     */
    async collectExportData(project, settings) {
        const data = {
            scenes: [],
            assets: {},
            modules: [],
            engineFiles: [],
            customScripts: []
        };

        // Collect scenes
        if (project.scenes) {
            data.scenes = project.scenes.map(scene => this.serializeScene(scene));
        } else if (window.editor && window.editor.scenes) {
            data.scenes = window.editor.scenes.map(scene => this.serializeScene(scene));
        }

        // Collect assets if enabled
        if (settings.includeAssets) {
            data.assets = await this.collectAssets();
        }

        // Collect required engine files
        data.engineFiles = this.getRequiredEngineFiles();

        // Collect custom modules
        data.modules = this.collectModules();

        // Collect custom scripts
        data.customScripts = await this.collectCustomScripts();

        return data;
    }

    /**
     * Serialize a scene for export
     */
    serializeScene(scene) {
        return {
            name: scene.name,
            settings: scene.settings,
            gameObjects: scene.gameObjects.map(obj => this.serializeGameObject(obj))
        };
    }

    /**
     * Serialize a game object for export
     */
    serializeGameObject(obj) {
        const serialized = {
            id: obj.id,
            name: obj.name,
            position: { x: obj.position.x, y: obj.position.y },
            rotation: obj.rotation || 0,
            scale: obj.scale ? { x: obj.scale.x, y: obj.scale.y } : { x: 1, y: 1 },
            active: obj.active,
            visible: obj.visible !== false,
            depth: obj.depth || 0,
            modules: []
        };

        // Serialize modules
        if (obj.modules) {
            serialized.modules = obj.modules.map(module => this.serializeModule(module));
        }

        // Serialize children
        if (obj.children && obj.children.length > 0) {
            serialized.children = obj.children.map(child => this.serializeGameObject(child));
        }

        return serialized;
    }

    /**
     * Serialize a module for export
     */
    serializeModule(module) {
        const serialized = {
            type: module.constructor.name,
            enabled: module.enabled !== false,
            properties: {}
        };

        // Collect all exposed properties
        if (module.exposedProperties) {
            for (const [key, prop] of module.exposedProperties) {
                serialized.properties[key] = module[key];
            }
        }

        return serialized;
    }

    /**
     * Collect all assets used in the project
     */
    async collectAssets() {
        const assets = {};
        
        // This would collect images, sounds, etc.
        // For now, we'll return an empty object
        // In a full implementation, this would scan all modules for asset references
        
        return assets;
    }

    /**
     * Get list of required engine files
     */
    getRequiredEngineFiles() {
        return [
            'src/core/Math/Vector2.js',
            'src/core/Math/Vector3.js',
            'src/core/Module.js',
            'src/core/ModuleRegistry.js',
            'src/core/GameObject.js',
            'src/core/InputManager.js',
            'src/core/Scene.js',
            'src/core/Engine.js',
            'src/core/Math/CollisionSystem.js',
            'src/core/Math/Raycast.js'
        ];
    }

    /**
     * Collect all modules used in the project
     */
    collectModules() {
        const modules = [];
        
        // Get all registered modules
        if (window.moduleRegistry) {
            for (const [className, moduleClass] of window.moduleRegistry.modules) {
                modules.push({
                    className: className,
                    filePath: this.getModuleFilePath(className)
                });
            }
        }
        
        return modules;
    }

    /**
     * Get the file path for a module class
     */
    getModuleFilePath(className) {
        // Map common module names to their file paths
        const moduleMap = {
            'SpriteRenderer': 'src/core/Modules/Visual/SpriteRenderer.js',
            'SpriteSheetRenderer': 'src/core/Modules/Visual/SpriteSheetRenderer.js',
            'SimpleMovementController': 'src/core/Modules/Controllers/SimpleMovementController.js',
            'KeyboardController': 'src/core/Modules/Controllers/KeyboardController.js',
            'CameraController': 'src/core/Modules/Controllers/CameraController.js',
            'DrawCircle': 'src/core/Modules/Drawing/DrawCircle.js',
            'DrawRectangle': 'src/core/Modules/Drawing/DrawRectangle.js',
            'DrawPolygon': 'src/core/Modules/Drawing/DrawPolygon.js',
            'BoundingBoxCollider': 'src/core/Modules/BoundingBoxCollider.js',
            'Rigidbody': 'src/core/Modules/Rigidbody.js',
            'Collider': 'src/core/Modules/Collider.js',
            'SimpleHealth': 'src/core/Modules/SimpleHealth.js',
            'AudioPlayer': 'src/core/Modules/AudioPlayer.js',
            'BehaviorTrigger': 'src/core/Modules/BehaviorTrigger.js'
        };
        
        return moduleMap[className] || `src/core/Modules/${className}.js`;
    }

    /**
     * Collect custom scripts
     */
    async collectCustomScripts() {
        const scripts = [];
        
        // This would collect any custom scripts created by the user
        // For now, return empty array
        
        return scripts;
    }

    /**
     * Generate HTML content
     */
    generateHTML(data, settings) {
        const title = settings.customTitle || 'Dark Matter JS Game';
        const description = settings.customDescription || 'A game created with Dark Matter JS';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <style id="game-styles">
        /* CSS will be injected here */
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas" width="${settings.viewport.width}" height="${settings.viewport.height}"></canvas>
        <div id="loading-screen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
            <div>Loading...</div>
        </div>
    </div>
    <script id="game-script">
        /* JavaScript will be injected here */
    </script>
</body>
</html>`;
    }

    /**
     * Generate JavaScript content
     */
    generateJavaScript(data, settings) {
        let js = '';
        
        // Add engine files
        js += '// Dark Matter JS Engine\n';
        for (const filePath of data.engineFiles) {
            js += `// ${filePath}\n`;
            js += this.loadFileContent(filePath) + '\n\n';
        }
        
        // Add modules
        js += '// Game Modules\n';
        for (const module of data.modules) {
            js += `// ${module.filePath}\n`;
            js += this.loadFileContent(module.filePath) + '\n\n';
        }
        
        // Add custom scripts
        for (const script of data.customScripts) {
            js += `// ${script.name}\n`;
            js += script.content + '\n\n';
        }
        
        // Add game initialization
        js += this.generateGameInitialization(data, settings);
        
        return js;
    }

    /**
     * Generate CSS content
     */
    generateCSS(data, settings) {
        return `
body {
    margin: 0;
    padding: 0;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: Arial, sans-serif;
}

#game-container {
    position: relative;
    border: 1px solid #333;
}

#gameCanvas {
    display: block;
    background: #000;
}

#loading-screen {
    z-index: 1000;
}

/* Touch-friendly controls for mobile */
@media (max-width: 768px) {
    body {
        align-items: flex-start;
        padding: 10px;
    }
    
    #game-container {
        width: 100%;
        max-width: 100vw;
    }
    
    #gameCanvas {
        width: 100%;
        height: auto;
    }
}
`;
    }

    /**
     * Generate game initialization code
     */
    generateGameInitialization(data, settings) {
        return `
// Game Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing exported game...');
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    
    // Initialize module registry
    if (!window.moduleRegistry) {
        window.moduleRegistry = new ModuleRegistry();
    }
    
    // Initialize input manager
    if (!window.input) {
        window.input = new InputManager();
    }
    
    // Initialize engine
    const canvas = document.getElementById('gameCanvas');
    const engine = new Engine(canvas);
    
    // Load scenes
    const scenes = ${JSON.stringify(data.scenes, null, 2)};
    const loadedScenes = [];
    
    scenes.forEach(sceneData => {
        const scene = new Scene(sceneData.name);
        scene.settings = sceneData.settings;
        
        // Load game objects
        sceneData.gameObjects.forEach(objData => {
            const gameObject = createGameObjectFromData(objData);
            scene.gameObjects.push(gameObject);
        });
        
        loadedScenes.push(scene);
    });
    
    // Function to create game object from serialized data
    function createGameObjectFromData(data) {
        const obj = new GameObject(data.name);
        obj.id = data.id;
        obj.position = new Vector2(data.position.x, data.position.y);
        obj.rotation = data.rotation;
        obj.scale = new Vector2(data.scale.x, data.scale.y);
        obj.active = data.active;
        obj.visible = data.visible;
        obj.depth = data.depth;
        
        // Add modules
        data.modules.forEach(moduleData => {
            const ModuleClass = window.moduleRegistry.getModule(moduleData.type);
            if (ModuleClass) {
                const module = new ModuleClass();
                module.enabled = moduleData.enabled;
                
                // Set properties
                Object.keys(moduleData.properties).forEach(key => {
                    if (module.hasOwnProperty(key)) {
                        module[key] = moduleData.properties[key];
                    }
                });
                
                obj.addModule(module);
            }
        });
        
        // Add children
        if (data.children) {
            data.children.forEach(childData => {
                const child = createGameObjectFromData(childData);
                obj.addChild(child);
            });
        }
        
        return obj;
    }
    
    // Start the game
    if (loadedScenes.length > 0) {
        engine.loadScene(loadedScenes[0]);
        engine.start().then(() => {
            loadingScreen.style.display = 'none';
            console.log('Game started successfully!');
        }).catch(error => {
            console.error('Failed to start game:', error);
            loadingScreen.innerHTML = '<div>Error loading game</div>';
        });
    } else {
        loadingScreen.innerHTML = '<div>No scenes found</div>';
    }
});
`;
    }

    /**
     * Create standalone HTML file
     */
    createStandaloneHTML(html, js, css, data, settings) {
        return html
            .replace('/* CSS will be injected here */', css)
            .replace('/* JavaScript will be injected here */', js);
    }

    /**
     * Create ZIP package with multiple files
     */
    async createZipPackage(html, js, css, data, settings, projectName) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not available. Using standalone export instead.');
        }
        
        const zip = new JSZip();
        
        // Add main files
        zip.file('index.html', html.replace('/* CSS will be injected here */', '').replace('/* JavaScript will be injected here */', ''));
        zip.file('game.js', js);
        zip.file('style.css', css);
        
        // Add assets if any
        if (settings.includeAssets && Object.keys(data.assets).length > 0) {
            const assetsFolder = zip.folder('assets');
            for (const [path, content] of Object.entries(data.assets)) {
                assetsFolder.file(path, content);
            }
        }
        
        // Generate and download ZIP
        const content = await zip.generateAsync({ type: 'blob' });
        this.downloadFile(content, `${projectName}.zip`, 'application/zip');
    }

    /**
     * Load file content from the actual files
     */
    async loadFileContent(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status}`);
            }
            const content = await response.text();
            return content;
        } catch (error) {
            console.warn(`Could not load ${filePath}:`, error);
            // Return a fallback comment if file can't be loaded
            return `// Could not load ${filePath}: ${error.message}`;
        }
    }

    /**
     * Download a file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Show export dialog
     */
    showExportDialog() {
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.innerHTML = `
            <div class="export-modal-content">
                <div class="export-modal-header">
                    <h2>Export Game</h2>
                    <button class="export-close-button">&times;</button>
                </div>
                <div class="export-modal-body">
                    <div class="export-group">
                        <label>Game Title:</label>
                        <input type="text" id="export-title" value="${this.exportSettings.customTitle}" placeholder="My Awesome Game">
                    </div>
                    <div class="export-group">
                        <label>Description:</label>
                        <textarea id="export-description" placeholder="A game created with Dark Matter JS">${this.exportSettings.customDescription}</textarea>
                    </div>
                    <div class="export-group">
                        <label>Export Format:</label>
                        <select id="export-format">
                            <option value="standalone" ${this.exportSettings.standalone ? 'selected' : ''}>Standalone HTML</option>
                            <option value="zip" ${!this.exportSettings.standalone ? 'selected' : ''}>ZIP Package</option>
                        </select>
                    </div>
                    <div class="export-group">
                        <label>
                            <input type="checkbox" id="export-include-assets" ${this.exportSettings.includeAssets ? 'checked' : ''}>
                            Include Assets
                        </label>
                    </div>
                    <div class="export-group">
                        <label>
                            <input type="checkbox" id="export-minify" ${this.exportSettings.minifyCode ? 'checked' : ''}>
                            Minify Code
                        </label>
                    </div>
                </div>
                <div class="export-modal-footer">
                    <button id="export-cancel">Cancel</button>
                    <button id="export-start" class="primary">Export Game</button>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        const content = modal.querySelector('.export-modal-content');
        content.style.cssText = `
            background: #2d2d2d;
            color: white;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            padding: 0;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        
        document.body.appendChild(modal);
        
        // Event handlers
        modal.querySelector('.export-close-button').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#export-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#export-start').addEventListener('click', async () => {
            const settings = {
                customTitle: modal.querySelector('#export-title').value,
                customDescription: modal.querySelector('#export-description').value,
                standalone: modal.querySelector('#export-format').value === 'standalone',
                includeAssets: modal.querySelector('#export-include-assets').checked,
                minifyCode: modal.querySelector('#export-minify').checked
            };
            
            document.body.removeChild(modal);
            
            try {
                // Get current project data
                const project = {
                    name: settings.customTitle || 'game',
                    scenes: window.editor ? window.editor.scenes : []
                };
                
                await this.exportProject(project, settings);
            } catch (error) {
                alert('Export failed: ' + error.message);
            }
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// Create global instance
window.exportManager = new ExportManager();