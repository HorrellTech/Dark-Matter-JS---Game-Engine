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
            const htmlContent = this.generateHTML(exportData, exportSettings, exportData.customScripts);
            const jsContent = await this.generateJavaScript(exportData, exportSettings);
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

        // Collect custom modules (after scenes are serialized)
        data.modules = this.collectModules(data);

        // Collect assets if enabled
        if (settings.includeAssets) {
            data.assets = await this.collectAssets();
        }

        // Collect required engine files
        data.engineFiles = this.getRequiredEngineFiles();

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
            id: module.id,
            enabled: module.enabled !== false,
            data: {}
        };

        // Use the module's own toJSON method if available
        if (typeof module.toJSON === 'function') {
            try {
                serialized.data = module.toJSON();
            } catch (error) {
                console.warn(`Error serializing module ${module.constructor.name}:`, error);
                // Fallback to basic serialization
                serialized.data = this.fallbackSerializeModule(module);
            }
        } else {
            // Fallback serialization for modules without toJSON
            serialized.data = this.fallbackSerializeModule(module);
        }

        return serialized;
    }

    /**
     * Fallback serialization for modules without toJSON method
     */
    fallbackSerializeModule(module) {
        const data = {
            name: module.name,
            enabled: module.enabled,
            properties: {}
        };

        // Collect all exposed properties
        if (module.exposedProperties) {
            // Handle both Map and Array formats for exposedProperties
            if (module.exposedProperties instanceof Map) {
                for (const [key, prop] of module.exposedProperties) {
                    data.properties[key] = module[key];
                }
            } else if (Array.isArray(module.exposedProperties)) {
                for (const prop of module.exposedProperties) {
                    if (prop && prop.name) {
                        data.properties[prop.name] = module[prop.name];
                    }
                }
            }
        }

        return data;
    }

    normalizePath(path) {
        return path.replace(/^\/+/, '').replace(/\\/g, '/');
    }

    /**
     * Collect all assets used in the project
     */
    async collectAssets() {
        const assets = {};

        if (window.fileBrowser && typeof window.fileBrowser.getAllFiles === 'function') {
            const files = await window.fileBrowser.getAllFiles();
            for (const file of files) {
                // We only want to bundle assets, not code or configuration files that are already handled.
                if (file.name.endsWith('.js') || file.name.endsWith('.html') || file.name.endsWith('.css')) {
                    continue;
                }

                let content = file.content;
                const path = file.path || file.name;

                // For binary files (images, audio, fonts), convert to base64 data URL for embedding.
                if (file.type && (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('font/'))) {
                    if (content instanceof Blob) {
                        // Convert Blob to base64 data URL
                        content = await this.blobToDataURL(content);
                    } else if (content instanceof ArrayBuffer) {
                        // Convert ArrayBuffer to base64 data URL
                        content = this.arrayBufferToDataURL(content, file.type);
                    } else if (content instanceof File) {
                        // Convert File to base64 data URL
                        content = await this.fileToDataURL(content);
                    } else if (typeof content === 'string' && content.startsWith('data:')) {
                        // Already a data URL, use as-is
                        content = content;
                    } else {
                        console.warn(`Unexpected content type for binary file ${path}:`, typeof content, content);
                        continue;
                    }

                    const normalizedPath = this.normalizePath(path);
                    assets[normalizedPath] = {
                        content: content,
                        type: file.type,
                        binary: true,
                        originalFile: file
                    };
                } else {
                    // For text-based assets (JSON, TXT, etc.), ensure content is a string.
                    if (content instanceof Blob) {
                        content = await content.text();
                    } else if (content instanceof ArrayBuffer) {
                        content = new TextDecoder().decode(content);
                    } else if (content instanceof File) {
                        content = await content.text();
                    }
                    assets[path] = {
                        content: content,
                        type: file.type || 'text/plain',
                        binary: false
                    };
                }
            }
        }
        return assets;
    }

    /**
     * Convert Blob to data URL
     */
    async blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Convert File to data URL
     */
    async fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert ArrayBuffer to data URL
     */
    arrayBufferToDataURL(buffer, mimeType) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return `data:${mimeType};base64,${base64}`;
    }

    /**
     * Get list of required engine files
     */
    getRequiredEngineFiles() {
        return [
            // Core math and utilities
            'src/core/Math/Vector2.js',
            'src/core/Math/Vector3.js',
            'src/core/Math/CollisionSystem.js',
            'src/core/Math/Raycast.js',

            // Core engine components
            'src/core/Module.js',
            'src/core/ModuleRegistry.js',
            'src/core/GameObject.js',
            'src/core/InputManager.js',
            'src/core/Scene.js',
            'src/core/Engine.js',

            // Asset management
            'src/core/AssetManager.js',
            'src/core/AssetReference.js',

            // Physics (if using Matter.js)
            'src/core/matter-js/PhysicsManager.js'
        ];
    }

    /**
     * Collect all modules used in the project
     */
    collectModules(data) {
        const modules = [];
        const usedModuleTypes = new Set();

        // Scan all scenes and game objects to find actually used modules
        if (data && data.scenes) {
            data.scenes.forEach(scene => {
                this.scanGameObjectsForModules(scene.gameObjects, usedModuleTypes);
            });
        }

        // Convert used module types to module info
        for (const moduleType of usedModuleTypes) {
            modules.push({
                className: moduleType,
                filePath: this.getModuleFilePath(moduleType)
            });
        }

        // Also include modules from registry as fallback
        if (window.moduleRegistry && modules.length === 0) {
            console.warn('No modules found in scene data, falling back to registry');
            for (const [className, moduleClass] of window.moduleRegistry.modules) {
                modules.push({
                    className: className,
                    filePath: this.getModuleFilePath(className)
                });
            }
        }

        console.log('Collected modules for export:', modules.map(m => m.className));
        return modules;
    }

    /**
     * Recursively scan game objects for module types
     */
    scanGameObjectsForModules(gameObjects, usedModuleTypes) {
        if (!gameObjects) return;

        gameObjects.forEach(obj => {
            // Scan modules in this object
            if (obj.modules) {
                obj.modules.forEach(module => {
                    if (module.type) {
                        usedModuleTypes.add(module.type);
                    }
                });
            }

            // Recursively scan children
            if (obj.children) {
                this.scanGameObjectsForModules(obj.children, usedModuleTypes);
            }
        });
    }

    /**
     * Get the file path for a module class
     */
    getModuleFilePath(className) {
        // Map common module names to their file paths
        const moduleMap = {
            // Visual Modules
            'SpriteRenderer': 'src/core/Modules/Visual/SpriteRenderer.js',
            'SpriteSheetRenderer': 'src/core/Modules/Visual/SpriteSheetRenderer.js',

            // Controller Modules
            'SimpleMovementController': 'src/core/Modules/Controllers/SimpleMovementController.js',
            'KeyboardController': 'src/core/Modules/Controllers/KeyboardController.js',
            'CameraController': 'src/core/Modules/Controllers/CameraController.js',

            // Drawing Modules
            'DrawCircle': 'src/core/Modules/Drawing/DrawCircle.js',
            'DrawRectangle': 'src/core/Modules/Drawing/DrawRectangle.js',
            'DrawPolygon': 'src/core/Modules/Drawing/DrawPolygon.js',
            'DrawPlatformerHills': 'src/core/Modules/Drawing/DrawPlatformerHills.js',
            'DrawInfiniteStarFieldParallax': 'src/core/Modules/Drawing/DrawInfiniteStarFieldParallax.js',

            // Animation Modules
            'Tween': 'src/core/Modules/Animation/Tween.js',
            'Timer': 'src/core/Modules/Animation/Timer.js',

            // UI Modules
            'Button': 'src/core/Modules/UI/Button.js',
            'Text': 'src/core/Modules/UI/Text.js',

            // Effects Modules
            'ParticleSystem': 'src/core/Modules/Effects/ParticleSystem.js',

            // Utility Modules
            'FollowTarget': 'src/core/Modules/Utility/FollowTarget.js',
            'Spawner': 'src/core/Modules/Utility/Spawner.js',

            // Physics and Collision Modules
            'BoundingBoxCollider': 'src/core/Modules/BoundingBoxCollider.js',
            'Rigidbody': 'src/core/Modules/Rigidbody.js',
            'Collider': 'src/core/Modules/Collider.js',

            // Other Modules
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
        let scripts = [];
        // Editor custom scripts
        if (window.editor && Array.isArray(window.editor.customScripts)) {
            scripts = window.editor.customScripts.map(script => ({
                name: script.name,
                content: script.content
            }));
        }
        // Add FileBrowser scripts
        const fbScripts = await this.collectFileBrowserScripts();
        // Avoid duplicates by name
        const existingNames = new Set(scripts.map(s => s.name));
        fbScripts.forEach(script => {
            if (!existingNames.has(script.name)) {
                scripts.push({ name: script.name, content: script.content });
            }
        });
        return scripts;
    }

    /**
     * Collect custom scripts from FileBrowser
     */
    async collectFileBrowserScripts() {
        if (!window.fileBrowser || typeof window.fileBrowser.getAllFiles !== 'function') return [];
        const files = await window.fileBrowser.getAllFiles();
        // Only .js files, not modules (unless you want modules too)
        return files
            .filter(file => file.name.endsWith('.js'))
            .map(file => ({
                name: file.name,
                path: file.path,
                content: file.content
            }));
    }

    /**
     * Generate HTML content
     */
    generateHTML(data, settings) {
        const title = settings.customTitle || 'Dark Matter JS Game';
        const description = settings.customDescription || 'A game created with Dark Matter JS';

        let scriptAndStyleTags = '';
        if (!settings.standalone) {
            // Link external CSS and JS for ZIP package
            scriptAndStyleTags += `<link rel="stylesheet" href="style.css">\n    `;
            scriptAndStyleTags += `<script src="game.js"></script>\n`;
            if (data.customScripts && data.customScripts.length > 0) {
                for (const script of data.customScripts) {
                    scriptAndStyleTags += `    <script src="scripts/${script.path ? script.path.split('/').pop() : script.name}"></script>\n`;
                }
            }
        } else {
            // Placeholders for embedded content in standalone HTML
            scriptAndStyleTags = `<style id="game-styles">/* CSS will be injected here */</style>
    <script id="game-script">/* JavaScript will be injected here */</script>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- External Dependencies -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.18.0/matter.min.js"></script>
    
    ${scriptAndStyleTags.trim()}
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas" width="${settings.viewport.width}" height="${settings.viewport.height}"></canvas>
        <div id="loading-screen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
            <div>Loading...</div>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Generate JavaScript content
     */
    async generateJavaScript(data, settings) {
        let js = '';

        // Add engine files
        js += '// Dark Matter JS Engine\n';
        for (const filePath of data.engineFiles) {
            js += `// ${filePath}\n`;
            js += await this.loadFileContent(filePath) + '\n\n';
        }

        // Add modules
        js += '// Game Modules\n';
        for (const module of data.modules) {
            js += `// ${module.filePath}\n`;
            const moduleContent = await this.loadFileContent(module.filePath);
            js += moduleContent + '\n\n';

            // Verify the module class is defined after loading
            if (!moduleContent.includes(`class ${module.className}`)) {
                console.warn(`Module class ${module.className} may not be properly defined in ${module.filePath}`);
            }
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
/* Prevent scrollbars from reacting to key presses */
html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
    font-family: Arial, sans-serif;
    /* Prevent scrolling with arrow keys */
    overscroll-behavior: none;
}

/* Prevent default key behaviors that cause scrolling */
body {
    /* Disable default key behaviors */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

/* Main container fills entire viewport */
#game-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
}

/* Canvas styling for proper fit scaling */
#gameCanvas {
    display: block;
    background: #000;
    max-width: 100vw;
    max-height: 100vh;
    width: auto;
    height: auto;
    /* Maintain aspect ratio while fitting to screen */
    object-fit: contain;
    /* Center the canvas */
    margin: auto;
    /* Smooth scaling */
    image-rendering: auto;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    image-rendering: -webkit-optimize-contrast;
}

/* Loading screen covers entire viewport */
#loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
    z-index: 1000;
}

/* Prevent context menu on right click */
#gameCanvas {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    outline: none;
}

/* Mobile optimizations */
@media (max-width: 768px) {
    #gameCanvas {
        /* Ensure canvas scales properly on mobile */
        width: 100vw;
        height: 100vh;
        object-fit: contain;
    }
    
    /* Prevent mobile browser UI from interfering */
    body {
        position: fixed;
        overflow: hidden;
        -webkit-overflow-scrolling: touch;
    }
}

/* Prevent scrolling with keyboard */
body:focus {
    outline: none;
}

/* Hide scrollbars completely */
::-webkit-scrollbar {
    display: none;
}

html {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;
    }

    /**
 * Generate game initialization code
 */
    generateGameInitialization(data, settings) {
        const assetsJsonString = settings.standalone && settings.includeAssets ?
            JSON.stringify(data.assets).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'") :
            'null';

        return `
// Game Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing exported game...');
    
    // Prevent scrolling with keyboard
    document.addEventListener('keydown', (e) => {
        // Prevent arrow keys, space, page up/down from scrolling
        if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Prevent drag and drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    
    // Initialize module registry
    if (!window.moduleRegistry) {
        window.moduleRegistry = new ModuleRegistry();
    }
    
    // Register all available modules with the registry
    console.log('Registering modules...');
    console.log('Available module classes:', [${data.modules.map(module => `'${module.className}'`).join(', ')}]);
    ${data.modules.map(module => `
    if (typeof ${module.className} !== 'undefined') {
        window.moduleRegistry.register(${module.className});
        console.log('Registered module: ${module.className}');
    } else {
        console.error('Module class not found: ${module.className}');
        console.log('Available global objects:', Object.keys(window).filter(key => key.includes('${module.className.substring(0, 4)}')));
    }`).join('')}
    
    console.log('Total registered modules:', window.moduleRegistry.modules.size);
    console.log('Registered module names:', Array.from(window.moduleRegistry.modules.keys()));
    
    // Initialize input manager
    if (!window.input) {
        window.input = new InputManager();
    }
    
    // Initialize physics manager
    if (typeof PhysicsManager !== 'undefined' && !window.physicsManager) {
        window.physicsManager = new PhysicsManager();
    }

    // Initialize AssetManager
    const assetBasePath = ${!settings.standalone ? "'assets/'" : "''"};
    window.assetManager = new AssetManager(assetBasePath);
    
    // For standalone mode, pre-populate the asset cache from the embedded data
    if (${settings.standalone && settings.includeAssets}) {
        const preloadedAssets = ${settings.standalone && settings.includeAssets ? JSON.stringify(data.assets) : 'null'};

        if (preloadedAssets) {
            console.log('Pre-caching embedded assets...');
            const assetPromises = [];
            
            for (const path in preloadedAssets) {
                const assetInfo = preloadedAssets[path];
                // Use the new AssetManager method to load from data URL
                const promise = window.assetManager.addAssetToCache(path, assetInfo.content, assetInfo.type);
                assetPromises.push(promise);
            }
            
            // Wait for all assets to be processed by the cache before starting the game
            try {
                await Promise.all(assetPromises);
                console.log('All embedded assets cached successfully.');
            } catch (error) {
                console.error('Error caching assets:', error);
            }
        }
    }
    
    // Initialize engine
    const canvas = document.getElementById('gameCanvas');
    const engine = new Engine(canvas);
    
    // Setup canvas scaling
    function resizeCanvas() {
        const container = document.getElementById('game-container');
        const canvas = document.getElementById('gameCanvas');
        
        if (!canvas || !container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Get the original canvas dimensions
        const originalWidth = ${settings.viewport.width};
        const originalHeight = ${settings.viewport.height};
        
        // Calculate scale to fit while maintaining aspect ratio
        const scaleX = containerWidth / originalWidth;
        const scaleY = containerHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Apply the scale
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        
        canvas.style.width = scaledWidth + 'px';
        canvas.style.height = scaledHeight + 'px';
        
        // Center the canvas
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
    }
    
    // Initial resize
    resizeCanvas();
    
    // Resize on window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Connect physics to engine if available
    if (window.physicsManager) {
        const originalEngineUpdate = engine.update.bind(engine);
        engine.update = function(deltaTime) {
            window.physicsManager.update(deltaTime);
            originalEngineUpdate(deltaTime);
        };
        
        const originalEngineDraw = engine.draw.bind(engine);
        engine.draw = function() {
            originalEngineDraw();
            if (window.physicsManager && this.ctx) {
                window.physicsManager.drawDebug(this.ctx);
            }
        };
    }
    
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
        console.log('Creating game object:', data.name, 'with', data.modules.length, 'modules');
        
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
            console.log('Adding module:', moduleData.type, 'to', data.name);
            
            const ModuleClass = window.moduleRegistry.getModuleClass(moduleData.type);
            if (ModuleClass) {
                const module = new ModuleClass();
                module.enabled = moduleData.enabled;
                module.id = moduleData.id;
                
                // Restore module data using fromJSON if available
                if (moduleData.data && typeof module.fromJSON === 'function') {
                    module.fromJSON(moduleData.data);
                } else {
                    // Fallback: Set properties directly
                    Object.keys(moduleData.data.properties || {}).forEach(key => {
                        if (key in module) {
                            module[key] = moduleData.data.properties[key];
                        }
                    });
                }
                
                obj.addModule(module);
                console.log('Successfully added module:', moduleData.type);
            } else {
                console.error('Module class not found:', moduleData.type);
                console.log('Available modules:', Array.from(window.moduleRegistry.modules.keys()));
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
        try {
            engine.loadScene(loadedScenes[0]);
            await engine.start();
            loadingScreen.style.display = 'none';
            console.log('Game started successfully!');
        } catch (error) {
            console.error('Failed to start game:', error);
            loadingScreen.innerHTML = '<div>Error loading game: ' + error.message + '</div>';
        }
    } else {
        loadingScreen.innerHTML = '<div>No scenes found</div>';
    }
});
`;
    }

    /**
     * Create standalone HTML file
     */
    createStandaloneHTML(html, js, css) {
        // Embed the CSS and JS directly into the HTML placeholders
        const finalHtml = html
            .replace('/* CSS will be injected here */', css)
            .replace('/* JavaScript will be injected here */', js);
        return finalHtml;
    }

    /**
     * Create ZIP package with multiple files
     */
    async createZipPackage(html, js, css, data, settings, projectName) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not available. Please include it to use ZIP export.');
        }

        const zip = new JSZip();

        // Add main files to the root of the ZIP
        zip.file('index.html', html);
        zip.file('game.js', js);
        zip.file('style.css', css);

        // Add assets to a dedicated 'assets' folder
        if (settings.includeAssets && Object.keys(data.assets).length > 0) {
            const assetsFolder = zip.folder('assets');
            for (const [path, asset] of Object.entries(data.assets)) {
                if (asset.binary) {
                    // For binary assets, use the original file if available
                    if (asset.originalFile && asset.originalFile.content) {
                        let fileContent = asset.originalFile.content;

                        if (fileContent instanceof Blob) {
                            // Add Blob directly to ZIP
                            assetsFolder.file(path, fileContent);
                        } else if (fileContent instanceof File) {
                            // Add File directly to ZIP
                            assetsFolder.file(path, fileContent);
                        } else if (fileContent instanceof ArrayBuffer) {
                            // Add ArrayBuffer directly to ZIP
                            assetsFolder.file(path, fileContent);
                        } else if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
                            // Extract base64 data from data URL and convert to binary
                            const commaIndex = fileContent.indexOf(',');
                            if (commaIndex !== -1) {
                                const base64Data = fileContent.substring(commaIndex + 1);
                                assetsFolder.file(path, base64Data, { base64: true });
                            } else {
                                console.warn(`Invalid data URL format for asset ${path}`);
                            }
                        } else {
                            console.warn(`Unsupported content type for binary asset ${path}:`, typeof fileContent);
                        }
                    } else {
                        // Fallback: extract from data URL and convert to binary
                        if (typeof asset.content === 'string' && asset.content.startsWith('data:')) {
                            const commaIndex = asset.content.indexOf(',');
                            if (commaIndex !== -1) {
                                const base64Data = asset.content.substring(commaIndex + 1);
                                // Convert base64 to binary data for ZIP
                                assetsFolder.file(path, base64Data, { base64: true });
                            } else {
                                console.warn(`Invalid data URL format for asset ${path}`);
                            }
                        } else {
                            console.warn(`Binary asset ${path} is not in expected format`);
                        }
                    }
                } else {
                    // For text-based assets, save as text
                    assetsFolder.file(path, asset.content);
                }
            }
        }

        // Add custom scripts to a 'scripts' folder
        if (data.customScripts && data.customScripts.length > 0) {
            const scriptsFolder = zip.folder('scripts');
            for (const script of data.customScripts) {
                const fileName = script.path ? script.path.split('/').pop() : script.name;
                scriptsFolder.file(fileName, script.content);
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
     * Ensure export modal CSS is loaded
     */
    ensureExportModalCSS() {
        if (!document.querySelector('link[href*="export-modal.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'src/styles/export-modal.css';
            document.head.appendChild(link);
        }
    }

    /**
     * Show export dialog
     */
    showExportDialog() {
        // Ensure the CSS is loaded
        this.ensureExportModalCSS();

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
                // Show loading indicator
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'export-loading';
                loadingDiv.innerHTML = `
                    <div class="export-loading-content">
                        <div class="export-loading-spinner"></div>
                        <div>Exporting game... Please wait.</div>
                    </div>
                `;
                document.body.appendChild(loadingDiv);

                // Get current project data
                const project = {
                    name: settings.customTitle || 'game',
                    scenes: window.editor ? window.editor.scenes : []
                };

                if (!project.scenes || project.scenes.length === 0) {
                    throw new Error('No scenes found to export. Please create at least one scene with game objects.');
                }

                await this.exportProject(project, settings);

                // Remove loading indicator
                document.body.removeChild(loadingDiv);

                // Show success message
                const successDiv = document.createElement('div');
                successDiv.className = 'export-notification success';
                successDiv.textContent = 'Game exported successfully!';
                document.body.appendChild(successDiv);

                setTimeout(() => {
                    if (successDiv.parentNode) {
                        document.body.removeChild(successDiv);
                    }
                }, 3000);

            } catch (error) {
                // Remove loading indicator if it exists
                const loadingDiv = document.querySelector('div[style*="position: fixed"][style*="z-index: 10001"]');
                if (loadingDiv && loadingDiv.parentNode) {
                    document.body.removeChild(loadingDiv);
                }

                console.error('Export failed:', error);

                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'export-notification error';
                errorDiv.innerHTML = `<strong>Export failed:</strong><br>${error.message}`;
                document.body.appendChild(errorDiv);

                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        document.body.removeChild(errorDiv);
                    }
                }, 5000);
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