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

        // console.log('Starting HTML5 export...');

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

            // console.log('Export completed successfully!');
            return true;

        } catch (error) {
            // console.error('Export failed:', error);
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
            customScripts: [],
            prefabs: {} // Add prefabs to export data
        };

        // Collect scenes
        if (project.scenes) {
            data.scenes = project.scenes.map(scene => this.serializeScene(scene));
        } else if (window.editor && window.editor.scenes) {
            data.scenes = window.editor.scenes.map(scene => this.serializeScene(scene));
        }

        // Collect prefabs
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            data.prefabs = window.editor.hierarchy.prefabManager.exportPrefabs();
            // console.log(`Collected ${Object.keys(data.prefabs).length} prefabs for export`);
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

                // For SpriteRenderer, ensure we capture image data for export
                if (module.constructor.name === 'SpriteRenderer' && module._image && module._isLoaded) {
                    // Convert the loaded image to a data URL for embedding
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = module._image.naturalWidth;
                        canvas.height = module._image.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(module._image, 0, 0);

                        // Set the embedded data and flag
                        serialized.data.imageData = canvas.toDataURL('image/png');
                        serialized.data.useEmbeddedData = true;

                        // IMPORTANT: Completely remove the imageAsset to prevent any path loading
                        delete serialized.data.imageAsset;

                        // console.log('Embedded image data for SpriteRenderer and removed imageAsset completely');
                    } catch (error) {
                        // console.warn('Could not embed image data:', error);
                        // If embedding fails, keep the original imageAsset but mark as non-embedded
                        serialized.data.useEmbeddedData = false;
                    }
                } else if (module.constructor.name === 'SpriteRenderer') {
                    // No loaded image, ensure useEmbeddedData is false
                    serialized.data.useEmbeddedData = false;
                }
            } catch (error) {
                // console.warn(`Error serializing module ${module.constructor.name}:`, error);
                serialized.data = this.fallbackSerializeModule(module);
            }
        } else {
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
        if (!path) return '';

        // Remove leading slashes and backslashes, convert backslashes to forward slashes
        let normalized = path.replace(/^[\/\\]+/, '').replace(/\\/g, '/');

        // Handle URL decoding for paths with spaces and special characters
        try {
            normalized = decodeURIComponent(normalized);
        } catch (e) {
            // If decoding fails, use the original normalized path
            // console.warn('Failed to decode path:', normalized);
        }

        return normalized;
    }

    /**
     * Collect all assets used in the project
     */
    async collectAssets() {
        const assets = {};

        if (window.fileBrowser && typeof window.fileBrowser.getAllFiles === 'function') {
            const files = await window.fileBrowser.getAllFiles();
            for (const file of files) {
                // Skip code files - they're handled separately
                if (file.name.endsWith('.js') || file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.scene') || file.name.endsWith('.prefab')) {
                    continue;
                }

                const path = file.path || file.name;
                // Use AssetManager's normalization to ensure consistency
                const normalizedPath = this.normalizePath(path);

                let content = file.content;

                if (file.type && (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('font/'))) {
                    // For binary files, ensure we have a proper data URL
                    if (typeof content === 'string' && content.startsWith('data:')) {
                        // Already a data URL
                        assets[normalizedPath] = {
                            content: content,
                            type: file.type,
                            binary: true,
                            originalFile: file,
                            rawContent: content
                        };
                    } else if (content instanceof Blob) {
                        const dataUrl = await this.blobToDataURL(content);
                        assets[normalizedPath] = {
                            content: dataUrl,
                            type: file.type,
                            binary: true,
                            originalFile: file,
                            rawContent: content
                        };
                    } else if (content instanceof ArrayBuffer) {
                        const dataUrl = this.arrayBufferToDataURL(content, file.type);
                        assets[normalizedPath] = {
                            content: dataUrl,
                            type: file.type,
                            binary: true,
                            originalFile: file,
                            rawContent: content
                        };
                    } else if (content instanceof File) {
                        const dataUrl = await this.fileToDataURL(content);
                        assets[normalizedPath] = {
                            content: dataUrl,
                            type: file.type,
                            binary: true,
                            originalFile: file,
                            rawContent: content
                        };
                    } else {
                        // console.warn(`Unexpected content type for binary file ${path}:`, typeof content, content);
                        continue;
                    }
                } else {
                    // For text-based assets, ensure content is a string
                    if (content instanceof Blob) {
                        content = await content.text();
                    } else if (content instanceof ArrayBuffer) {
                        content = new TextDecoder().decode(content);
                    } else if (content instanceof File) {
                        content = await content.text();
                    }

                    assets[normalizedPath] = {
                        content: content,
                        type: file.type || 'text/plain',
                        binary: false
                    };
                }
            }
        }

        // console.log('Collected assets:', Object.keys(assets));
        return assets;
    }

    /**
     * Load an asset (enhanced version for export compatibility)
     * @param {string} path - Path to the asset
     * @returns {Promise<any>} The loaded asset
     */
    loadAsset(path) {
        const normalizedPath = this.normalizePath(path);

        // Check cache first with all possible path variations
        const pathVariations = [
            path,
            normalizedPath,
            path.replace(/^[\/\\]+/, ''),
            normalizedPath.replace(/^[\/\\]+/, ''),
            '/' + path.replace(/^[\/\\]+/, ''),
            '/' + normalizedPath.replace(/^[\/\\]+/, ''),
            decodeURIComponent(path),
            decodeURIComponent(normalizedPath),
            path.split('/').pop(),
            normalizedPath.split('/').pop()
        ];

        for (const variation of pathVariations) {
            if (this.cache[variation]) {
                // console.log('Found asset in cache with path variation:', variation);
                return Promise.resolve(this.cache[variation]);
            }
        }

        // Check if already loading
        if (this.loadingPromises[normalizedPath]) {
            return this.loadingPromises[normalizedPath];
        }

        // If not in cache and not loading, try to load from file system or URL
        let promise;

        if (this.fileBrowser && typeof this.fileBrowser.readFile === 'function') {
            // Try to load from file browser first
            promise = this.loadFromFileBrowser(normalizedPath);
        } else {
            // Fallback to URL loading
            promise = this.loadFromUrl(normalizedPath);
        }

        this.loadingPromises[normalizedPath] = promise;

        promise.then(asset => {
            // Cache under all path variations
            pathVariations.forEach(variation => {
                this.cache[variation] = asset;
            });
            delete this.loadingPromises[normalizedPath];
        }).catch(error => {
            // console.error(`Failed to load asset ${normalizedPath}:`, error);
            delete this.loadingPromises[normalizedPath];
        });

        return promise;
    }

    /**
     * Load asset from file browser
     * @param {string} path - Asset path
     * @returns {Promise<any>} The loaded asset
     */
    async loadFromFileBrowser(path) {
        try {
            const content = await this.fileBrowser.readFile(path);
            if (!content) {
                throw new Error(`Asset not found in file browser: ${path}`);
            }

            // Determine type and process accordingly
            const extension = path.split('.').pop().toLowerCase();

            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                return this.loadImage(content);
            } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
                return this.loadAudio(content);
            } else if (extension === 'json') {
                return JSON.parse(content);
            } else {
                return content;
            }
        } catch (error) {
            throw new Error(`Failed to load asset from file browser: ${path} - ${error.message}`);
        }
    }

    /**
     * Load asset from URL (fallback method)
     * @param {string} path - Asset path
     * @returns {Promise<any>} The loaded asset
     */
    async loadFromUrl(path) {
        try {
            // Construct full URL
            const fullPath = this.basePath ? `${this.basePath}${path}` : path;

            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const extension = path.split('.').pop().toLowerCase();

            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                const blob = await response.blob();
                const dataUrl = await this.blobToDataURL(blob);
                return this.loadImage(dataUrl);
            } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
                const blob = await response.blob();
                const dataUrl = await this.blobToDataURL(blob);
                return this.loadAudio(dataUrl);
            } else if (extension === 'json') {
                return response.json();
            } else {
                return response.text();
            }
        } catch (error) {
            throw new Error(`Failed to load asset from URL: ${path} - ${error.message}`);
        }
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
     * Load an image
     * @param {string} src - Image source (URL or data URL)
     * @returns {Promise<Image>} The loaded image
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    /**
     * Load an audio file
     * @param {string} src - Audio source (URL or data URL)
     * @returns {Promise<Audio>} The loaded audio
     */
    loadAudio(src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
            audio.src = src;
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
            // console.warn('No modules found in scene data, falling back to registry');
            for (const [className, moduleClass] of window.moduleRegistry.modules) {
                modules.push({
                    className: className,
                    filePath: this.getModuleFilePath(className)
                });
            }
        }

        // console.log('Collected modules for export:', modules.map(m => m.className));
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
            'DrawPlatformerHills': 'src/core/Modules/Platform Game/DrawPlatformerHills.js',
            'DrawInfiniteStarFieldParallax': 'src/core/Modules/Drawing/DrawInfiniteStarFieldParallax.js',

            // Asteroid Modules
            'PlayerShip': 'src/core/Modules/Asteroids/PlayerShip.js',
            'DrawInfiniteStarFieldParallax': 'src/core/Modules/Asteroids/DrawInfiniteStarFieldParallax.js',
            'AsteroidsPlanet': 'src/core/Modules/Asteroids/AsteroidsPlanet.js',
            'EnemyShip': 'src/core/Modules/Asteroids/EnemyShip.js',
            'AsteroidsBullet': 'src/core/Modules/Asteroids/AsteroidsBullet.js',
            'Asteroid': 'src/core/Modules/Asteroids/Asteroid.js',
            'AsteroidManager': 'src/core/Modules/Asteroids/AsteroidManager.js',

            // Animation Modules
            'Tween': 'src/core/Modules/Animation/Tween.js',
            'Timer': 'src/core/Modules/Animation/Timer.js',

            // UI Modules
            'Button': 'src/core/Modules/UI/Button.js',
            'Text': 'src/core/Modules/UI/Text.js',

            // Effects Modules
            'ParticleSystem': 'src/core/Modules/Effects/ParticleSystem.js',

            // Lighting Modules
            'DarknessModule': 'src/core/Modules/Lighting/DarknessModule.js',
            'PointLightModule': 'src/core/Modules/Lighting/PointLightModule.js',

            // Snake Game Modules
            'SnakePlayer': 'src/core/Modules/Snake/SnakePlayer.js',
            'SnakeSegment': 'src/core/Modules/Snake/SnakeApple.js',

            // Utility Modules
            'FollowTarget': 'src/core/Modules/Utility/FollowTarget.js',
            'Spawner': 'src/core/Modules/Utility/Spawner.js',
            'PostScreenEffects': 'src/core/Modules/Visual/PostScreenEffects.js',

            // Physics and Collision Modules
            'BoundingBoxCollider': 'src/core/Modules/BoundingBoxCollider.js',
            'Rigidbody': 'src/core/Modules/Rigidbody.js',
            'Collider': 'src/core/Modules/Collider.js',
            'PlatformCharacterAuto': 'src/core/Modules/Platform Game/PlatformCharacterAuto.js',
            'BasicPhysics': 'src/core/Modules/Movement/BasicPhysics.js',

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
                // console.warn(`Module class ${module.className} may not be properly defined in ${module.filePath}`);
            }
        }

        // Add custom scripts
        for (const script of data.customScripts) {
            js += `// ${script.name}\n`;
            js += script.content + '\n\n';
        }

        // Add game initialization - pass settings to include startingSceneIndex
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
        // Use safer JSON embedding approach
        const scenesData = this.safeStringify(data.scenes);
        const prefabsData = this.safeStringify(data.prefabs);
        const assetsData = settings.standalone && settings.includeAssets ?
            this.safeStringify(data.assets) : 'null';

        // Get the starting scene index from settings, default to 0
        const startingSceneIndex = settings.startingSceneIndex || 0;

        return `
// Game Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // console.log('Initializing exported game...');
    
    // Prevent scrolling with keyboard
    document.addEventListener('keydown', (e) => {
        if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent context menu and drag/drop
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
    
    const loadingScreen = document.getElementById('loading-screen');
    
    // Initialize module registry
    if (!window.moduleRegistry) {
        window.moduleRegistry = new ModuleRegistry();
    }
    
    // Register all available modules
    // console.log('Registering modules...');
    ${data.modules.map(module => `
    if (typeof ${module.className} !== 'undefined') {
        window.moduleRegistry.register(${module.className});
        // console.log('Registered module: ${module.className}');
    } else {
        // console.error('Module class not found: ${module.className}');
    }`).join('')}
    
    // console.log('Total registered modules:', window.moduleRegistry.modules.size);
    
    // Initialize input manager
    if (!window.input) {
        window.input = new InputManager();
    }
    
    // Initialize physics manager
    if (typeof PhysicsManager !== 'undefined' && !window.physicsManager) {
        window.physicsManager = new PhysicsManager();
    }

    // Initialize AssetManager with proper export mode handling
    if (!window.assetManager) {
        window.assetManager = new AssetManager(null);
    }

    // Enhanced path normalization function
    window.assetManager.normalizePath = function(path) {
        if (!path) return '';
        // Remove leading slashes/backslashes and normalize separators
        let normalized = path.replace(/^[\/\\\\]+/, '').replace(/\\\\/g, '/');
        // Handle URL encoding for spaces and special characters
        try {
            normalized = decodeURIComponent(normalized);
        } catch (e) {
            // If decoding fails, use the original normalized path
        }
        return normalized;
    };

    ${settings.standalone ?
                `// Standalone mode - override asset loading to use embedded assets
        window.assetManager.originalLoadAsset = window.assetManager.loadAsset;
        window.assetManager.loadAsset = function(path) {
            const normalizedPath = this.normalizePath(path);
            
            // Check cache first with all possible path variations
            const pathVariations = [
                path,
                normalizedPath,
                path.replace(/^[\/\\\\]+/, ''),
                normalizedPath.replace(/^[\/\\\\]+/, ''),
                '/' + path.replace(/^[\/\\\\]+/, ''),
                '/' + normalizedPath.replace(/^[\/\\\\]+/, ''),
                decodeURIComponent(path),
                decodeURIComponent(normalizedPath),
                path.split('/').pop(),
                normalizedPath.split('/').pop()
            ];
            
            for (const variation of pathVariations) {
                if (this.cache[variation]) {
                    // console.log('Found asset in cache with path variation:', variation);
                    return Promise.resolve(this.cache[variation]);
                }
            }
            
            // console.warn('Asset not found in cache:', path, 'Tried variations:', pathVariations);
            // console.warn('Available cached assets:', Object.keys(this.cache));
            return Promise.reject(new Error('Asset not found: ' + path));
        };

        // Override loadImage method to use cached assets
        window.assetManager.originalLoadImage = window.assetManager.loadImage;
        window.assetManager.loadImage = function(src) {
            // If src is already a data URL or blob URL, use it directly
            if (src.startsWith('data:') || src.startsWith('blob:')) {
                return this.originalLoadImage(src);
            }
            
            // Otherwise, try to find it in cache first
            const normalizedSrc = this.normalizePath(src);
            const pathVariations = [
                src,
                normalizedSrc,
                src.replace(/^[\/\\\\]+/, ''),
                normalizedSrc.replace(/^[\/\\\\]+/, ''),
                '/' + src.replace(/^[\/\\\\]+/, ''),
                '/' + normalizedSrc.replace(/^[\/\\\\]+/, ''),
                decodeURIComponent(src),
                decodeURIComponent(normalizedSrc),
                src.split('/').pop(),
                normalizedSrc.split('/').pop()
            ];
            
            for (const variation of pathVariations) {
                if (this.cache[variation]) {
                    // console.log('Loading cached image for:', src, 'found as:', variation);
                    return Promise.resolve(this.cache[variation]);
                }
            }
            
            // If not in cache, fall back to original method
            // console.warn('Image not found in cache, attempting direct load:', src);
            return this.originalLoadImage(src);
        };

        // Override loadAudio method to use cached assets  
        window.assetManager.originalLoadAudio = window.assetManager.loadAudio;
        window.assetManager.loadAudio = function(src) {
            // If src is already a data URL or blob URL, use it directly
            if (src.startsWith('data:') || src.startsWith('blob:')) {
                return this.originalLoadAudio(src);
            }
            
            // Otherwise, try to find it in cache first
            const normalizedSrc = this.normalizePath(src);
            const pathVariations = [
                src,
                normalizedSrc,
                src.replace(/^[\/\\\\]+/, ''),
                normalizedSrc.replace(/^[\/\\\\]+/, ''),
                '/' + src.replace(/^[\/\\\\]+/, ''),
                '/' + normalizedSrc.replace(/^[\/\\\\]+/, ''),
                decodeURIComponent(src),
                decodeURIComponent(normalizedSrc),
                src.split('/').pop(),
                normalizedSrc.split('/').pop()
            ];
            
            for (const variation of pathVariations) {
                if (this.cache[variation]) {
                    // console.log('Loading cached audio for:', src, 'found as:', variation);
                    return Promise.resolve(this.cache[variation]);
                }
            }
            
            // If not in cache, fall back to original method
            // console.warn('Audio not found in cache, attempting direct load:', src);
            return this.originalLoadAudio(src);
        };` :
                `// ZIP mode - set base path for assets
        window.assetManager.basePath = 'assets/';`
            }
    
    // Initialize Global Prefab Manager
    window.prefabManager = {
        prefabs: new Map(),
        
        // Load prefabs into the manager
        loadPrefabs: function(prefabsData) {
            if (!prefabsData) return;
            
            for (const [name, prefabData] of Object.entries(prefabsData)) {
                this.prefabs.set(name, prefabData);
                // console.log('Loaded prefab:', name);
            }
            
            // console.log('Total prefabs loaded:', this.prefabs.size);
        },
        
        // Find a prefab by name
        findPrefabByName: function(name) {
            if (!name) return null;
            
            // Try exact match first
            if (this.prefabs.has(name)) {
                return this.prefabs.get(name);
            }
            
            // Try case-insensitive search
            const lowerName = name.toLowerCase();
            for (const [key, value] of this.prefabs) {
                if (key.toLowerCase() === lowerName) {
                    return value;
                }
            }
            
            return null;
        },
        
        // Check if a prefab exists
        hasPrefab: function(name) {
            return this.findPrefabByName(name) !== null;
        },
        
        // Get all prefab names
        getAllPrefabNames: function() {
            return Array.from(this.prefabs.keys());
        },
        
        // Instantiate a prefab by name
        instantiatePrefabByName: function(name, position = null, parent = null) {
            const prefabData = this.findPrefabByName(name);
            if (!prefabData) {
                // console.error('Prefab not found:', name);
                return null;
            }
            
            return this.instantiatePrefab(prefabData, position, parent);
        },
        
        // Instantiate a prefab from data
        instantiatePrefab: function(prefabData, position = null, parent = null) {
            try {
                // Create the main GameObject
                const gameObject = new GameObject(prefabData.name);
                
                // Set position (use provided position or prefab's stored position)
                if (position) {
                    gameObject.position.x = position.x;
                    gameObject.position.y = position.y;
                } else {
                    gameObject.position.x = prefabData.position.x;
                    gameObject.position.y = prefabData.position.y;
                }

                // Set other properties
                gameObject.angle = prefabData.angle || 0;
                gameObject.scale.x = prefabData.scale?.x || 1;
                gameObject.scale.y = prefabData.scale?.y || 1;
                gameObject.active = prefabData.active !== false;

                // Add modules
                if (prefabData.modules && prefabData.modules.length > 0) {
                    prefabData.modules.forEach(moduleData => {
                        try {
                            // Get the module class
                            const ModuleClass = window.moduleRegistry.getModuleClass(moduleData.className);
                            if (!ModuleClass) {
                                // console.warn('Module class not found:', moduleData.className);
                                return;
                            }

                            // Create module instance
                            const moduleInstance = new ModuleClass();
                            
                            // Set properties
                            if (moduleData.properties) {
                                Object.keys(moduleData.properties).forEach(propName => {
                                    if (moduleInstance.hasOwnProperty(propName)) {
                                        moduleInstance[propName] = moduleData.properties[propName];
                                    }
                                });
                            }

                            // Add to GameObject
                            gameObject.addModule(moduleInstance);
                            
                        } catch (error) {
                            // console.error('Error adding module ' + moduleData.className + ':', error);
                        }
                    });
                }

                // Recursively instantiate children
                if (prefabData.children && prefabData.children.length > 0) {
                    prefabData.children.forEach(childData => {
                        const childGameObject = this.instantiatePrefab(childData, null, gameObject);
                        gameObject.addChild(childGameObject);
                    });
                }

                // Add to scene or parent
                if (parent) {
                    parent.addChild(gameObject);
                } else if (window.engine && window.engine.gameObjects) {
                    window.engine.gameObjects.push(gameObject);
                }

                return gameObject;

            } catch (error) {
                // console.error('Error instantiating prefab:', error);
                throw error;
            }
        }
    };
    
    // Load game data safely
    let gameData;
    try {
        gameData = {
            scenes: ${scenesData},
            assets: ${assetsData},
            prefabs: ${prefabsData}
        };
    } catch (error) {
        // console.error('Error parsing game data:', error);
        loadingScreen.innerHTML = '<div>Error loading game data: ' + error.message + '</div>';
        return;
    }
    
    // Load prefabs into the global prefab manager
    if (gameData.prefabs) {
        window.prefabManager.loadPrefabs(gameData.prefabs);
        // console.log('Loaded prefabs:', Object.keys(gameData.prefabs));
    }
    
    // Pre-load assets for standalone mode
    ${settings.standalone && settings.includeAssets ? `
    if (gameData.assets) {
        // console.log('Pre-caching embedded assets...');
        // console.log('Assets to cache:', Object.keys(gameData.assets));
        
        // Use the enhanced embedded assets method
        window.assetManager.addEmbeddedAssets(gameData.assets);
        
        // console.log('Asset caching completed.');
        // console.log('Final asset cache keys:', Object.keys(window.assetManager.cache));
    }` : ''}
    
    // Initialize engine
    const canvas = document.getElementById('gameCanvas');
    const engine = new Engine(canvas);
    
    // Make engine globally available for prefab instantiation
    window.engine = engine;
    
    // Setup canvas scaling
    function resizeCanvas() {
        const container = document.getElementById('game-container');
        const canvas = document.getElementById('gameCanvas');
        
        if (!canvas || !container) return;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const originalWidth = ${settings.viewport.width};
        const originalHeight = ${settings.viewport.height};
        
        const scaleX = containerWidth / originalWidth;
        const scaleY = containerHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        
        canvas.style.width = scaledWidth + 'px';
        canvas.style.height = scaledHeight + 'px';
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
    }
    
    resizeCanvas();
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
    const scenes = gameData.scenes || [];
    const loadedScenes = [];
    
    scenes.forEach(sceneData => {
        const scene = new Scene(sceneData.name);
        scene.settings = sceneData.settings;
        
        sceneData.gameObjects.forEach(objData => {
            const gameObject = createGameObjectFromData(objData);
            scene.gameObjects.push(gameObject);
        });
        
        loadedScenes.push(scene);
    });
    
    // Function to create game object from serialized data
    function createGameObjectFromData(data) {
        // console.log('Creating game object:', data.name, 'with', data.modules.length, 'modules');
        
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
            // console.log('Adding module:', moduleData.type, 'to', data.name);
            
            const ModuleClass = window.moduleRegistry.getModuleClass(moduleData.type);
            if (ModuleClass) {
                const module = new ModuleClass();
                module.enabled = moduleData.enabled;
                module.id = moduleData.id;
                
                // Restore module data
                if (moduleData.data) {
                    if (typeof module.fromJSON === 'function') {
                        try {
                            module.fromJSON(moduleData.data);
                            // console.log('Module data restored via fromJSON for:', moduleData.type);
                        } catch (error) {
                            // console.error('Error restoring module data via fromJSON:', error);
                            // Fallback to property restoration
                            if (moduleData.data.properties) {
                                Object.keys(moduleData.data.properties).forEach(key => {
                                    if (key in module) {
                                        module[key] = moduleData.data.properties[key];
                                    }
                                });
                            }
                        }
                    } else {
                        // Fallback: Set properties directly from data root or properties
                        const sourceData = moduleData.data.properties || moduleData.data;
                        Object.keys(sourceData).forEach(key => {
                            if (key in module) {
                                module[key] = sourceData[key];
                            }
                        });
                    }
                }
                
                obj.addModule(module);
                // console.log('Successfully added module:', moduleData.type);
            } else {
                // console.error('Module class not found:', moduleData.type);
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
    
    // Start the game with the selected starting scene
    if (loadedScenes.length > 0) {
        try {
            const startingSceneIndex = ${startingSceneIndex};
            const sceneToLoad = loadedScenes[startingSceneIndex] || loadedScenes[0];
            // console.log('Loading starting scene:', sceneToLoad.name, 'at index:', startingSceneIndex);
            
            engine.loadScene(sceneToLoad);
            await engine.start();
            loadingScreen.style.display = 'none';
            // console.log('Game started successfully with scene:', sceneToLoad.name);
        } catch (error) {
            // console.error('Failed to start game:', error);
            loadingScreen.innerHTML = '<div>Error loading game: ' + error.message + '</div>';
        }
    } else {
        loadingScreen.innerHTML = '<div>No scenes found</div>';
    }
});
`;
    }

    /**
     * Safely stringify JSON data for embedding in JavaScript code
     * @param {*} data - Data to stringify
     * @returns {string} - Safe JavaScript representation
     */
    safeStringify(data) {
        if (data === null || data === undefined) {
            return 'null';
        }

        try {
            // First stringify normally
            let jsonString = JSON.stringify(data);

            // Then escape it for safe embedding in JavaScript
            // Use a more comprehensive escaping approach
            /*jsonString = jsonString
                .replace(/\\/g, '\\\\')     // Escape backslashes
                .replace(/'/g, "\\'")       // Escape single quotes
                .replace(/"/g, '\\"')       // Escape double quotes
                .replace(/\n/g, '\\n')      // Escape newlines
                .replace(/\r/g, '\\r')      // Escape carriage returns
                .replace(/\t/g, '\\t')      // Escape tabs
                .replace(/\f/g, '\\f')      // Escape form feeds
                .replace(/\b/g, '\\b')      // Escape backspaces
                .replace(/\v/g, '\\v')      // Escape vertical tabs
                .replace(/\0/g, '\\0')      // Escape null characters
                .replace(/\u2028/g, '\\u2028') // Escape line separator
                .replace(/\u2029/g, '\\u2029') // Escape paragraph separator
                .replace(/</g, '\\u003c')   // Escape < to prevent script injection
                .replace(/>/g, '\\u003e')   // Escape > to prevent script injection
                .replace(/\//g, '\\/');     // Escape forward slashes last*/

            return JSON.stringify(data);
            //return `"${jsonString}"`;
        } catch (error) {
            // console.error('Error in safeStringify:', error);
            return 'null';
        }
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
                    // Use rawContent (original file content) for binary assets
                    const rawContent = asset.rawContent || asset.originalFile?.content;

                    if (rawContent instanceof Blob) {
                        assetsFolder.file(path, rawContent);
                    } else if (rawContent instanceof File) {
                        assetsFolder.file(path, rawContent);
                    } else if (rawContent instanceof ArrayBuffer) {
                        assetsFolder.file(path, rawContent);
                    } else if (typeof rawContent === 'string' && rawContent.startsWith('data:')) {
                        // Extract base64 data from data URL
                        const commaIndex = rawContent.indexOf(',');
                        if (commaIndex !== -1) {
                            const base64Data = rawContent.substring(commaIndex + 1);
                            assetsFolder.file(path, base64Data, { base64: true });
                        }
                    } else {
                        // Fallback: try to use the processed content
                        if (typeof asset.content === 'string' && asset.content.startsWith('data:')) {
                            const commaIndex = asset.content.indexOf(',');
                            if (commaIndex !== -1) {
                                const base64Data = asset.content.substring(commaIndex + 1);
                                assetsFolder.file(path, base64Data, { base64: true });
                            }
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
            // console.warn(`Could not load ${filePath}:`, error);
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

        // Get available scenes for the dropdown
        const availableScenes = window.editor ? window.editor.scenes : [];
        const sceneOptions = availableScenes.map((scene, index) =>
            `<option value="${index}">${scene.name}</option>`
        ).join('');

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
                    <label>Starting Scene:</label>
                    <select id="export-starting-scene">
                        ${sceneOptions || '<option value="0">No scenes available</option>'}
                    </select>
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
                startingSceneIndex: parseInt(modal.querySelector('#export-starting-scene').value) || 0,
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
                const loadingDiv = document.querySelector('.export-loading');
                if (loadingDiv && loadingDiv.parentNode) {
                    document.body.removeChild(loadingDiv);
                }

                // console.error('Export failed:', error);

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