class ExportManager {
    constructor() {
        this.exportSettings = {
            format: 'html5',
            includeAssets: true,
            minifyCode: false,
            standalone: true,
            includeEngine: true,
            useWebGL: true,
            customTitle: '',
            customDescription: '',
            viewport: {
                width: 800,
                height: 600,
                scalable: true
            },
            maxFPS: 60
        };
    }

    /**
     * Load Terser library for advanced minification
     * @returns {Promise<boolean>} - True if Terser was loaded successfully
     */
    async loadTerser() {
        if (typeof Terser !== 'undefined') {
            return true; // Already loaded
        }

        try {
            // Load Terser from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/terser@5/dist/bundle.min.js';

            return new Promise((resolve) => {
                script.onload = () => {
                    console.log('Terser loaded successfully for advanced minification');
                    resolve(true);
                };
                script.onerror = () => {
                    console.warn('Failed to load Terser, using simple minification');
                    resolve(false);
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.warn('Error loading Terser:', error);
            return false;
        }
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
            // Load Terser if minification is enabled
            //if (exportSettings.minifyCode) {
            //    await this.loadTerser();
            //}

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
        // Store settings for later use in getRequiredEngineFiles
        this.exportSettings = { ...this.exportSettings, ...settings };

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

        // Collect required engine files (this now uses the stored settings)
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
            angle: obj.angle || 0,
            scale: obj.scale ? { x: obj.scale.x, y: obj.scale.y } : { x: 1, y: 1 },
            size: obj.size ? { width: obj.size.x, height: obj.size.y } : { width: 50, height: 50 },
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

                // For SpriteRenderer, DON'T embed image data - let AssetManager handle it
                if (module.constructor.name === 'SpriteRenderer') {
                    // Remove any embedded image data to force AssetManager usage
                    if (serialized.data.imageData) {
                        delete serialized.data.imageData;
                    }

                    // Ensure we're using asset references only
                    if (module.imageAsset && module.imageAsset.path) {
                        // Register the asset with AssetManager if it's not already there
                        if (window.assetManager && module._image && module._isLoaded) {
                            const assetId = window.assetManager.generateAssetId(module.imageAsset.path);
                            if (!window.assetManager.hasAsset(assetId)) {
                                window.assetManager.addAsset(assetId, module._image, 'image', {
                                    path: module.imageAsset.path,
                                    originalPath: module.imageAsset.path
                                }).catch(error => {
                                    console.warn('Failed to register sprite asset:', error);
                                });
                            }
                        }
                    }

                    console.log('Serialized SpriteRenderer without embedding image data, using asset reference:', serialized.data.imageAsset?.path);
                }
            } catch (error) {
                console.warn(`Error serializing module ${module.constructor.name}:`, error);
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
        let assets = {};

        // First, try to get assets from AssetManager
        if (window.assetManager) {
            try {
                const assetManagerAssets = await window.assetManager.exportAssetsForGame();
                assets = { ...assets, ...assetManagerAssets };
                console.log('Collected assets from AssetManager:', Object.keys(assetManagerAssets));
            } catch (error) {
                console.warn('Failed to collect assets from AssetManager:', error);
            }
        }

        // Also collect from FileBrowser for any additional assets
        if (window.fileBrowser && typeof window.fileBrowser.getAllFiles === 'function') {
            try {
                const files = await window.fileBrowser.getAllFiles();

                for (const file of files) {
                    if (file.type === 'file') {
                        const normalizedPath = this.normalizePath(file.path);

                        // Skip if already collected from AssetManager
                        if (assets[normalizedPath]) {
                            continue;
                        }

                        // Determine if this is an asset file
                        const extension = file.path.split('.').pop().toLowerCase();
                        const assetExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'json'];

                        if (assetExtensions.includes(extension)) {
                            // For binary files, we need to handle them properly
                            let content = file.content;
                            let mimeType = this.detectMimeType(file.path);
                            
                            // If it's not already a data URL, convert it
                            if (!content.startsWith('data:')) {
                                if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
                                    // For images, ensure it's a proper data URL
                                    content = `data:${mimeType};base64,${content}`;
                                } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                                    // For audio, ensure it's a proper data URL
                                    content = `data:${mimeType};base64,${content}`;
                                }
                            }
                            
                            assets[normalizedPath] = {
                                content: content,
                                type: mimeType,
                                source: 'fileBrowser'
                            };
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to collect assets from FileBrowser:', error);
            }
        }

        console.log('Final collected assets:', Object.keys(assets));
        return assets;
    }

    /**
     * Detect MIME type from file extension
     */
    detectMimeType(path) {
        const extension = path.split('.').pop().toLowerCase();
        const mimeMap = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'json': 'application/json'
        };
        return mimeMap[extension] || 'application/octet-stream';
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
        const coreFiles = [
            // Core math and utilities
            'src/core/Math/Vector2.js',
            'src/core/Math/Vector3.js',
            'src/core/Math/CollisionSystem.js',
            'src/core/Math/Raycast.js',
            'src/core/Math/MatterMath.js',
            'src/core/Math/Polygon.js',
            'src/core/matter-js/matter.min.js',

            // Physics (if using Matter.js)
            'src/core/matter-js/PhysicsManager.js',

            // Core engine components
            'src/core/Module.js',
            'src/core/ModuleRegistry.js',
            'src/core/ModuleReloader.js',
            'src/core/ModuleManager.js',
            'src/core/GameObject.js',
            'src/core/InputManager.js',
            'src/core/DecalChunk.js',
            'src/core/Scene.js',
            'src/core/Engine.js',

            // Asset management
            'src/core/AssetManager.js',
            'src/core/AssetReference.js'
        ];

        // Add WebGL files if WebGL is enabled
        if (this.exportSettings.useWebGL) {
            coreFiles.splice(6, 0, 'src/webgl-canvas.js'); // Insert after matter.min.js
        }

        return coreFiles;
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
            'CameraController': 'src/core/Modules/Controllers/CameraController.js',

            // Drawing Modules
            'DrawCircle': 'src/core/Modules/Drawing/DrawCircle.js',
            'DrawRectangle': 'src/core/Modules/Drawing/DrawRectangle.js',
            'DrawPolygon': 'src/core/Modules/Drawing/DrawPolygon.js',
            'DrawPlatformerHills': 'src/core/Modules/Platform Game/DrawPlatformerHills.js',
            'DrawInfiniteStarFieldParallax': 'src/core/Modules/Drawing/DrawInfiniteStarFieldParallax.js',
            'DrawHeart': 'src/core/Modules/Drawing/DrawHeart.js',
            'DrawShield': 'src/core/Modules/Drawing/DrawShield.js',
            'DrawCapsule': 'src/core/Modules/Drawing/DrawCapsule.js',
            'DrawStar': 'src/core/Modules/Drawing/DrawStar.js',
            'DrawIcon': 'src/core/Modules/Drawing/DrawIcon.js',
            'DrawText': 'src/core/Modules/Drawing/DrawText.js',
            'DrawLine': 'src/core/Modules/Drawing/DrawLine.js',
            'DrawGrid': 'src/core/Modules/Drawing/DrawGrid.js',

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
            'RigidBody': 'src/core/Modules/Matter-js/RigidBody.js',
            //'RigidBodyDragger': 'src/core/Modules/Matter-js/RigidBodyDragger.js',
            'Joint': 'src/core/Modules/Matter-js/Joint.js',
            'GravityFieldMatter': 'src/core/Modules/Matter-js/GravityFieldMatter.js',
            'VehiclePhysics': 'src/core/Modules/Matter-js/VehiclePhysics.js',
            'PlatformControllerMatter': 'src/core/Modules/Matter-js/PlatformControllerMatter.js',

            'BasicPhysics': 'src/core/Modules/Movement/BasicPhysics.js',
            'PhysicsKeyboardController': 'src/core/Modules/Movement/PhysicsKeyboardController.js',

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

        // Use viewport dimensions or default to full screen
        const canvasWidth = settings.viewport?.width || window.innerWidth || 800;
        const canvasHeight = settings.viewport?.height || window.innerHeight || 600;

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Prevent zoom and ensure full viewport usage -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <!-- External Dependencies -->
    <script>
        // Dynamic canvas sizing and Matter.js loading
        document.addEventListener('DOMContentLoaded', function() {
            // Set up full viewport canvas
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                // Set canvas internal resolution to viewport size
                const updateCanvasSize = () => {
                    const width = window.innerWidth;
                    const height = window.innerHeight;
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Update CSS size to match
                    canvas.style.width = width + 'px';
                    canvas.style.height = height + 'px';
                    
                    // Trigger resize event for game engine
                    if (window.engine && typeof window.engine.handleResize === 'function') {
                        window.engine.handleResize(width, height);
                    }
                };
                
                // Initial size
                updateCanvasSize();
                
                // Handle window resize
                window.addEventListener('resize', updateCanvasSize);
                window.addEventListener('orientationchange', () => {
                    setTimeout(updateCanvasSize, 100); // Small delay for orientation change
                });
            }
            
            // Load Matter.js if not already loaded
            if (typeof Matter === 'undefined') {
                console.log('Loading Matter.js from CDN as fallback...');
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.18.0/matter.min.js';
                script.onload = function() {
                    console.log('Matter.js loaded from CDN');
                    window.dispatchEvent(new Event('matter-loaded'));
                };
                document.head.appendChild(script);
            } else {
                window.dispatchEvent(new Event('matter-loaded'));
            }
        });
    </script>
    
    ${scriptAndStyleTags.trim()}
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="loading-screen">
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

        try {
            // Add engine files
            js += '// Dark Matter JS Engine\n';
            for (const filePath of data.engineFiles) {
                js += `// ${filePath}\n`;
                let fileContent = await this.loadFileContent(filePath);

                // Only minify if explicitly enabled AND content is valid
                if (settings.minifyCode && fileContent && !fileContent.includes('Could not load')) {
                    try {
                        fileContent = await this.minifyJavaScriptAdvanced(fileContent);
                    } catch (minifyError) {
                        console.warn(`Failed to minify ${filePath}, using original:`, minifyError);
                        // Keep original content if minification fails
                    }
                }

                js += fileContent + '\n\n';
            }

            // Add modules
            js += '// Game Modules\n';
            for (const module of data.modules) {
                js += `// ${module.filePath}\n`;
                let moduleContent = await this.loadFileContent(module.filePath);

                // Only minify if explicitly enabled AND content is valid
                if (settings.minifyCode && moduleContent && !moduleContent.includes('Could not load')) {
                    try {
                        moduleContent = await this.minifyJavaScriptAdvanced(moduleContent);
                    } catch (minifyError) {
                        console.warn(`Failed to minify ${module.filePath}, using original:`, minifyError);
                        // Keep original content if minification fails
                    }
                }

                js += moduleContent + '\n\n';

                // Verify the module class is defined after loading
                if (!moduleContent.includes(`class ${module.className}`)) {
                    console.warn(`Module class ${module.className} may not be properly defined in ${module.filePath}`);
                }
            }

            // Add custom scripts
            for (const script of data.customScripts) {
                js += `// ${script.name}\n`;
                let scriptContent = script.content;

                // Only minify if explicitly enabled AND content is valid
                if (settings.minifyCode && scriptContent) {
                    try {
                        scriptContent = await this.minifyJavaScriptAdvanced(scriptContent);
                    } catch (minifyError) {
                        console.warn(`Failed to minify ${script.name}, using original:`, minifyError);
                        // Keep original content if minification fails
                    }
                }

                js += scriptContent + '\n\n';
            }

            // Add game initialization - DON'T minify this critical code
            let initCode = this.generateGameInitialization(data, settings);
            js += initCode;

            return js;

        } catch (error) {
            console.error('Error generating JavaScript:', error);
            throw error;
        }
    }

    /**
     * Generate CSS content
     */
    generateCSS(data, settings) {
        let css = `
/* Full viewport coverage */
html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
    font-family: Arial, sans-serif;
    overscroll-behavior: none;
}

/* Game container fills entire viewport */
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
    margin: 0;
    padding: 0;
}

/* Canvas fills the game container while maintaining aspect ratio */
#gameCanvas {
    display: block;
    background: #000;
    width: 100%;
    height: 100%;
    /* Remove fixed dimensions and let it fill container */
    max-width: 100vw;
    max-height: 100vh;
    /* Maintain aspect ratio */
    object-fit: ${settings.maintainAspectRatio !== false ? 'contain' : 'fill'};
    /* Center the canvas */
    margin: 0;
    /* Smooth scaling */
    image-rendering: auto;
}

/* For pixel-perfect games, use pixelated rendering */
${settings.pixelPerfect ? `
#gameCanvas {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    image-rendering: -webkit-optimize-contrast;
}
` : ''}

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

/* Prevent context menu and selection */
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
    body {
        position: fixed;
        overflow: hidden;
        -webkit-overflow-scrolling: touch;
    }
    
    #gameCanvas {
        width: 100vw !important;
        height: 100vh !important;
    }
}

/* Orientation change handling */
@media screen and (orientation: portrait) {
    #game-container {
        flex-direction: column;
    }
}

@media screen and (orientation: landscape) {
    #game-container {
        flex-direction: row;
    }
}

/* Prevent scrolling */
body:focus {
    outline: none;
}

::-webkit-scrollbar {
    display: none;
}

html {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
`;

        // Minify CSS if enabled
        if (settings.minifyCode) {
            css = this.minifyCSS(css);
        }

        return css;
    }

    /**
     * Generate game initialization code
     */
    generateGameInitialization(data, settings) {
        // Use safer JSON embedding approach
        const scenesData = this.safeStringify(data.scenes);
        const prefabsData = this.safeStringify(data.prefabs);
        const assetsData = settings.includeAssets ?
            this.safeStringify(data.assets) : 'null';

        // Get the starting scene index from settings, default to 0
        const startingSceneIndex = settings.startingSceneIndex || 0;
        const maxFPS = settings.maxFPS !== undefined ? settings.maxFPS : 60;

        return `
// Game Initialization - Fixed for Physics
let gameInitialized = false;

async function initializeGame() {
    if (gameInitialized) return;
    gameInitialized = true;
    
    console.log('Initializing exported game...');

    // Initialize AssetManager first
    if (!window.assetManager) {
        window.assetManager = new AssetManager(null);
    }

    // Load embedded assets BEFORE anything else for BOTH standalone AND ZIP
    const assetsData = ${assetsData};
    if (assetsData) {
        console.log('Loading embedded assets into AssetManager...');
        window.assetManager.addEmbeddedAssets(assetsData);
        
        // Wait a moment for async asset loading to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('AssetManager cache populated with:', Object.keys(window.assetManager.cache));
    }
    
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
    
    // Wait for Matter.js to be available
    if (typeof Matter === 'undefined') {
        console.log('Waiting for Matter.js to load...');
        return; // Will be called again when matter-loaded event fires
    }
    
    console.log('Matter.js is available, proceeding with initialization...');
    
    // Initialize physics manager FIRST
    window.physicsManager = new PhysicsManager();
    
    // Initialize module registry
    if (!window.moduleRegistry) {
        window.moduleRegistry = new ModuleRegistry();
    }
    
    // Register all available modules
    console.log('Registering modules...');
    ${data.modules.map(module => `
    if (typeof ${module.className} !== 'undefined') {
        window.moduleRegistry.register(${module.className});
        console.log('Registered module: ${module.className}');
    } else {
        console.error('Module class not found: ${module.className}');
    }`).join('')}
    
    console.log('Total registered modules:', window.moduleRegistry.modules.size);
    
    // Initialize input manager
    if (!window.input) {
        window.input = new InputManager();
    }

    // Enhanced path normalization function
    window.assetManager.normalizePath = function(path) {
        if (!path) return '';
        let normalized = path.replace(/^[\/\\\\]+/, '').replace(/\\\\/g, '/');
        try {
            normalized = decodeURIComponent(normalized);
        } catch (e) {
            // If decoding fails, use the original normalized path
        }
        return normalized;
    };

    ${settings.standalone ? `
    // Standalone mode - assets already loaded above
    console.log('Standalone mode: Assets already embedded in AssetManager');` : `
    // ZIP mode - assets are already embedded in AssetManager above
    // Remove the fetch-based loading and just use the embedded assets
    console.log('ZIP mode: Using embedded assets in AssetManager');
    
    // Override AssetManager loadAsset to use embedded assets first, then fallback to fetch
    window.assetManager.originalLoadAsset = window.assetManager.loadAsset;
    window.assetManager.loadAsset = function(path) {
        const normalizedPath = this.normalizePath(path);
        
        // First check if asset is already in cache (from embedded assets)
        const pathVariations = [
            path,
            normalizedPath,
            path.replace(/^[\/\\\\]+/, ''),
            normalizedPath.replace(/^[\/\\\\]+/, ''),
            path.split('/').pop(),
            normalizedPath.split('/').pop()
        ];

        for (const variation of pathVariations) {
            if (this.cache[variation]) {
                console.log('Found embedded asset in cache:', variation);
                return Promise.resolve(this.cache[variation]);
            }
        }
        
        // If not in embedded cache, try to load from assets folder as fallback
        const fileName = normalizedPath.split('/').pop();
        const assetPath = 'assets/' + fileName;
        
        console.log('Asset not in embedded cache, trying to load from:', assetPath);
        
        return fetch(assetPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Asset not found: ' + assetPath);
                }
                
                const extension = normalizedPath.split('.').pop().toLowerCase();
                
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                    return response.blob().then(blob => {
                        const url = URL.createObjectURL(blob);
                        return new Promise((resolve, reject) => {
                            const img = new Image();
                            img.onload = () => {
                                URL.revokeObjectURL(url);
                                // Cache the loaded image
                                pathVariations.forEach(variation => {
                                    this.cache[variation] = img;
                                });
                                resolve(img);
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject(new Error('Failed to load image'));
                            };
                            img.src = url;
                        });
                    });
                } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
                    return response.blob().then(blob => {
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio();
                        audio.src = url;
                        // Cache the loaded audio
                        pathVariations.forEach(variation => {
                            this.cache[variation] = audio;
                        });
                        return audio;
                    });
                } else if (extension === 'json') {
                    return response.json().then(data => {
                        // Cache the loaded JSON
                        pathVariations.forEach(variation => {
                            this.cache[variation] = data;
                        });
                        return data;
                    });
                } else {
                    return response.text().then(text => {
                        // Cache the loaded text
                        pathVariations.forEach(variation => {
                            this.cache[variation] = text;
                        });
                        return text;
                    });
                }
            })
            .catch(error => {
                console.error('Failed to load asset:', assetPath, error);
                throw error;
            });
    };`}
    
    // Initialize Global Prefab Manager
    window.prefabManager = {
        prefabs: new Map(),
        
        loadPrefabs: function(prefabsData) {
            if (!prefabsData) return;
            
            for (const [name, prefabData] of Object.entries(prefabsData)) {
                this.prefabs.set(name, prefabData);
                console.log('Loaded prefab:', name);
            }
            
            console.log('Total prefabs loaded:', this.prefabs.size);
        },
        
        findPrefabByName: function(name) {
            if (!name) return null;
            
            if (this.prefabs.has(name)) {
                return this.prefabs.get(name);
            }
            
            const lowerName = name.toLowerCase();
            for (const [key, value] of this.prefabs) {
                if (key.toLowerCase() === lowerName) {
                    return value;
                }
            }
            
            return null;
        },
        
        hasPrefab: function(name) {
            return this.findPrefabByName(name) !== null;
        },
        
        getAllPrefabNames: function() {
            return Array.from(this.prefabs.keys());
        },
        
        instantiatePrefabByName: function(name, position = null, parent = null) {
            const prefabData = this.findPrefabByName(name);
            if (!prefabData) {
                console.error('Prefab not found:', name);
                return null;
            }
            
            return this.instantiatePrefab(prefabData, position, parent);
        },
        
        instantiatePrefab: function(prefabData, position = null, parent = null) {
            try {
                const gameObject = new GameObject(prefabData.name);
                
                if (position) {
                    gameObject.position.x = position.x;
                    gameObject.position.y = position.y;
                } else {
                    gameObject.position.x = prefabData.position.x;
                    gameObject.position.y = prefabData.position.y;
                }

                gameObject.angle = prefabData.angle || 0;
                gameObject.scale.x = prefabData.scale?.x || 1;
                gameObject.scale.y = prefabData.scale?.y || 1;
                gameObject.active = prefabData.active !== false;

                if (prefabData.modules && prefabData.modules.length > 0) {
                    prefabData.modules.forEach(moduleData => {
                        try {
                            const ModuleClass = window.moduleRegistry.getModuleClass(moduleData.className);
                            if (!ModuleClass) {
                                console.warn('Module class not found:', moduleData.className);
                                return;
                            }

                            const moduleInstance = new ModuleClass();
                            
                            if (moduleData.properties) {
                                Object.keys(moduleData.properties).forEach(propName => {
                                    if (moduleInstance.hasOwnProperty(propName)) {
                                        moduleInstance[propName] = moduleData.properties[propName];
                                    }
                                });
                            }

                            gameObject.addModule(moduleInstance);
                            
                        } catch (error) {
                            console.error('Error adding module ' + moduleData.className + ':', error);
                        }
                    });
                }

                if (prefabData.children && prefabData.children.length > 0) {
                    prefabData.children.forEach(childData => {
                        const childGameObject = this.instantiatePrefab(childData, null, gameObject);
                        gameObject.addChild(childGameObject);
                    });
                }

                if (parent) {
                    parent.addChild(gameObject);
                } else if (window.engine && window.engine.gameObjects) {
                    window.engine.gameObjects.push(gameObject);
                }

                return gameObject;

            } catch (error) {
                console.error('Error instantiating prefab:', error);
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
        console.error('Error parsing game data:', error);
        loadingScreen.innerHTML = '<div>Error loading game data: ' + error.message + '</div>';
        return;
    }
    
    // Load prefabs into the global prefab manager
    if (gameData.prefabs) {
        window.prefabManager.loadPrefabs(gameData.prefabs);
        console.log('Loaded prefabs:', Object.keys(gameData.prefabs));
    }
    
    // Pre-load assets for standalone mode
    ${settings.standalone && settings.includeAssets ? `
    if (gameData.assets) {
        console.log('Pre-caching embedded assets...');
        console.log('Assets to cache:', Object.keys(gameData.assets));
        
        window.assetManager.addEmbeddedAssets(gameData.assets);
        
        console.log('Asset caching completed.');
        console.log('Final asset cache keys:', Object.keys(window.assetManager.cache));
    }` : ''}
    
    // Initialize engine with WebGL option
    const canvas = document.getElementById('gameCanvas');

    // Get actual viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Set canvas to match viewport
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;

    const engineOptions = { 
        useWebGL: ${settings.useWebGL},
        enableFullscreen: true,
        pixelWidth: viewportWidth,
        pixelHeight: viewportHeight,
        pixelScale: 1
    };

    const engine = new Engine(canvas, engineOptions);
    engine.updateFPSLimit(${maxFPS});
    
    this.ctx = canvas.ctx;
    
    // Make engine globally available for prefab instantiation
    window.engine = engine;

    // Add resize handler to engine
    engine.handleResize = function(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        
        // Update WebGL viewport if using WebGL
        if (this.ctx && this.ctx.gl) {
            this.ctx.gl.viewport(0, 0, width, height);
        }
        
        // Update camera bounds if camera exists
        if (this.camera) {
            // Keep camera centered but update bounds
            this.camera.updateBounds(width, height);
        }
        
        console.log('Engine resized to:', width, 'x', height);
    };
    
    // CRITICAL: Connect physics to engine properly
    if (window.physicsManager) {
        console.log('Connecting physics to engine...');
        
        // Store original methods
        const originalEngineUpdate = engine.update.bind(engine);
        const originalEngineDraw = engine.draw.bind(engine);
        
        // Override engine update to include physics
        engine.update = function(deltaTime) {
            // Update physics first
            if (window.physicsManager && window.physicsManager.update) {
                window.physicsManager.update(deltaTime);
            }
            
            // Then update game objects
            originalEngineUpdate(deltaTime);
        };
        
        // Override engine draw to include physics debug
        engine.draw = function() {
            // Draw game objects
            originalEngineDraw();
            
            // Draw physics debug if enabled
            if (window.physicsManager && window.physicsManager.drawDebug && this.ctx) {
                window.physicsManager.drawDebug(this.ctx);
            }
        };
        
        console.log('Matter Physics connected to engine successfully');
    } else {
        console.error('Physics manager not found during engine setup');
    }
    
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
        console.log('Creating game object:', data.name, 'with', data.modules?.length || 0, 'modules');
        
        const obj = new GameObject(data.name);
        if (data.id) obj.id = data.id;

        obj.position = new Vector2(data.position.x, data.position.y);
        obj.angle = (typeof data.angle === 'number') ? data.angle : 0;
        obj.depth = data.depth;
        obj.useCollisions = data.useCollisions || false;
        obj.size = data.size ? new Vector2(data.size.width, data.size.height) : new Vector2(50, 50);

        // Restore scale if available
        if (data.scale) obj.scale = new Vector2(data.scale.x, data.scale.y);
        obj.editorColor = data.editorColor || obj.generateRandomColor();

        if (data.polygonPointCount !== undefined) {
            obj.polygonPointCount = data.polygonPointCount;
        }
        if (data.polygonPoints && Array.isArray(data.polygonPoints)) {
            obj.polygonPoints = data.polygonPoints.map(pt => new Vector2(pt.x, pt.y));
            // Pass parent, position, ...points
            obj.polygon = new Polygon(obj, obj.position.clone(), ...obj.polygonPoints.map(pt => pt.clone()));
        }

        if (data.usePolygonCollision !== undefined) {
            obj.usePolygonCollision = data.usePolygonCollision;
        }

        obj.active = data.active;
        if (data.visible !== undefined) obj.visible = data.visible;
        obj.tags = Array.isArray(data.tags) ? [...data.tags] : [];

        if (data.collisionEnabled !== undefined) obj.collisionEnabled = data.collisionEnabled;
        if (data.collisionLayer !== undefined) obj.collisionLayer = data.collisionLayer;
        if (data.collisionMask !== undefined) obj.collisionMask = data.collisionMask;

        // Add modules
        if (data.modules && data.modules.length > 0) {
            data.modules.forEach(moduleData => {
                console.log('Adding module:', moduleData.type, 'to', data.name);
                
                const ModuleClass = window.moduleRegistry.getModuleClass(moduleData.type);
                if (ModuleClass) {
                    const module = new ModuleClass();
                    module.enabled = moduleData.enabled;
                    module.id = moduleData.id;
                    
                    // CRITICAL: Skip body creation during deserialization for RigidBody
                    //if (module.constructor.name === 'RigidBody') {
                    //    module._skipRebuild = false;
                    //}
                    
                    // Restore module data
                    if (moduleData.data) {
                        if (typeof module.fromJSON === 'function') {
                            try {
                                module.fromJSON(moduleData.data);
                                console.log('Module data restored via fromJSON for:', moduleData.type);
                            } catch (error) {
                                console.error('Error restoring module data via fromJSON:', error);
                                if (moduleData.data.properties) {
                                    Object.keys(moduleData.data.properties).forEach(key => {
                                        if (key in module) {
                                            module[key] = moduleData.data.properties[key];
                                        }
                                    });
                                }
                            }
                        } else {
                            const sourceData = moduleData.data.properties || moduleData.data;
                            Object.keys(sourceData).forEach(key => {
                                if (key in module) {
                                    module[key] = sourceData[key];
                                }
                            });
                        }
                    }
                    
                    // Re-enable body creation after data restoration
                    //if (module.constructor.name === 'RigidBody') {
                    //    module._skipRebuild = false;
                        // Ensure pending creation is set for later initialization
                    //    module.pendingBodyCreation = true;
                    //}
                    
                    obj.addModule(module);
                    console.log('Successfully added module:', moduleData.type);
                }
            });
        }
        
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
            console.log('Loading starting scene:', sceneToLoad.name, 'at index:', startingSceneIndex);
            
            engine.loadScene(sceneToLoad);
            await engine.start();
            loadingScreen.style.display = 'none';
            console.log('Game started successfully with scene:', sceneToLoad.name);
        } catch (error) {
            console.error('Failed to start game:', error);
            loadingScreen.innerHTML = '<div>Error loading game: ' + error.message + '</div>';
        }
    } else {
        loadingScreen.innerHTML = '<div>No scenes found</div>';
    }
}

// Wait for both DOM and Matter.js to be ready
document.addEventListener('DOMContentLoaded', initializeGame);
window.addEventListener('matter-loaded', initializeGame);
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
    createStandaloneHTML(html, js, css, data, settings) {
        let finalHtml = html;

        try {
            // Minify CSS separately if enabled
            let finalCSS = css;
            if (settings.minifyCode) {
                try {
                    finalCSS = this.minifyCSS(css);
                } catch (cssError) {
                    console.warn('CSS minification failed, using original:', cssError);
                    finalCSS = css;
                }
            }

            // Embed the CSS and JS directly into the HTML placeholders
            finalHtml = html
                .replace('/* CSS will be injected here */', finalCSS)
                .replace('/* JavaScript will be injected here */', js);

            // Only minify HTML if specifically enabled - and do it carefully
            if (settings.minifyCode) {
                try {
                    finalHtml = this.minifyHTML(finalHtml);
                } catch (htmlError) {
                    console.warn('HTML minification failed, using original:', htmlError);
                    // Keep the unminified version
                }
            }

            return finalHtml;

        } catch (error) {
            console.error('Error creating standalone HTML:', error);
            // Return the basic version without minification
            return html
                .replace('/* CSS will be injected here */', css)
                .replace('/* JavaScript will be injected here */', js);
        }
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

        // Add assets to a dedicated 'assets' folder - FIXED handling
        if (settings.includeAssets && Object.keys(data.assets).length > 0) {
            const assetsFolder = zip.folder('assets');
            
            for (const [originalPath, asset] of Object.entries(data.assets)) {
                // Use just the filename for the ZIP structure
                const fileName = originalPath.split('/').pop();
                
                try {
                    if (asset.type && asset.type.startsWith('image/')) {
                        // Handle image assets
                        if (typeof asset.content === 'string' && asset.content.startsWith('data:')) {
                            // Extract base64 data from data URL
                            const commaIndex = asset.content.indexOf(',');
                            if (commaIndex !== -1) {
                                const base64Data = asset.content.substring(commaIndex + 1);
                                assetsFolder.file(fileName, base64Data, { base64: true });
                                console.log('Added image asset to ZIP:', fileName);
                            }
                        }
                    } else if (asset.type && asset.type.startsWith('audio/')) {
                        // Handle audio assets
                        if (typeof asset.content === 'string' && asset.content.startsWith('data:')) {
                            const commaIndex = asset.content.indexOf(',');
                            if (commaIndex !== -1) {
                                const base64Data = asset.content.substring(commaIndex + 1);
                                assetsFolder.file(fileName, base64Data, { base64: true });
                                console.log('Added audio asset to ZIP:', fileName);
                            }
                        }
                    } else {
                        // Handle text/JSON assets
                        assetsFolder.file(fileName, asset.content);
                        console.log('Added text asset to ZIP:', fileName);
                    }
                } catch (error) {
                    console.error('Error adding asset to ZIP:', fileName, error);
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
        const content = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });
        
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
                <label>Maximum FPS:</label>
                <select id="export-max-fps">
                    <option value="30" ${this.exportSettings.maxFPS === 30 ? 'selected' : ''}>30 FPS</option>
                    <option value="60" ${this.exportSettings.maxFPS === 60 ? 'selected' : ''}>60 FPS</option>
                    <option value="120" ${this.exportSettings.maxFPS === 120 ? 'selected' : ''}>120 FPS</option>
                    <option value="0" ${this.exportSettings.maxFPS === 0 ? 'selected' : ''}>Unlimited</option>
                </select>
            </div>
            <div class="export-group">
                <label>Rendering:</label>
                <select id="export-webgl">
                    <option value="true" ${this.exportSettings.useWebGL ? 'selected' : ''}>WebGL (Hardware Accelerated)</option>
                    <option value="false" ${!this.exportSettings.useWebGL ? 'selected' : ''}>Canvas 2D (Software)</option>
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
                maxFPS: parseInt(modal.querySelector('#export-max-fps').value) || 60,
                useWebGL: modal.querySelector('#export-webgl').value === 'true', // New WebGL setting
                standalone: modal.querySelector('#export-format').value === 'standalone',
                includeAssets: modal.querySelector('#export-include-assets').checked,
                minifyCode: false
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
                successDiv.textContent = `Game exported successfully with ${settings.useWebGL ? 'WebGL' : 'Canvas 2D'} rendering!`;
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

    /**
     * Simple JavaScript minifier
     * @param {string} code - JavaScript code to minify
     * @returns {string} - Minified JavaScript code
     */
    minifyJavaScript(code) {
        return code;

        try {
            // Much safer minification approach
            return code
                // Remove single-line comments ONLY at end of lines (not in strings/regex)
                .replace(/\/\/[^\r\n]*$/gm, '')
                // Remove multi-line comments (but preserve license comments and avoid breaking strings)
                .replace(/\/\*(?![\s\S]*?@license)[\s\S]*?\*\//g, '')
                // Remove extra whitespace (but preserve single spaces and line breaks where needed)
                .replace(/[ \t]+/g, ' ') // Replace tabs and multiple spaces with single space
                .replace(/\n\s*\n/g, '\n') // Remove empty lines
                // ONLY remove spaces around SAFE punctuation (avoid operators that could break)
                .replace(/\s*([{}();,])\s*/g, '$1')
                // Remove leading/trailing whitespace from lines
                .replace(/^\s+/gm, '')
                .replace(/\s+$/gm, '')
                // Ensure we don't have completely empty result
                .trim();
        } catch (error) {
            console.warn('Error minifying JavaScript:', error);
            return code; // Return original code if minification fails
        }
    }

    async minifyJavaScriptAdvanced(code) {
        return code;

        // Check if Terser is available
        if (typeof Terser !== 'undefined') {
            try {
                const result = await Terser.minify(code, {
                    compress: {
                        dead_code: false, // Disable aggressive dead code removal
                        drop_console: false, // Keep console for debugging
                        drop_debugger: false, // Keep debugger for debugging
                        conditionals: false, // Disable conditional optimizations that might break logic
                        evaluate: false, // Disable constant expression evaluation
                        booleans: false, // Disable boolean optimizations
                        loops: false, // Disable loop optimizations
                        unused: false, // Disable unused variable removal
                        hoist_funs: false, // Disable function hoisting
                        keep_fargs: true, // Keep function arguments
                        hoist_vars: false, // Disable variable hoisting
                        if_return: false, // Disable if-return optimizations
                        join_vars: false, // Disable variable joining
                        cascade: false, // Disable cascading optimizations
                        side_effects: false // Disable side effect optimizations
                    },
                    mangle: false, // Disable name mangling entirely to avoid breaking references
                    output: {
                        comments: true, // Keep comments for debugging
                        beautify: false
                    }
                });

                if (result.error) {
                    throw result.error;
                }

                return result.code;
            } catch (error) {
                console.warn('Terser minification failed, using original code:', error);
                return code; // Return ORIGINAL code, not simple minified
            }
        } else {
            // NO minification if Terser is not available - much safer
            console.log('Terser not available, skipping minification');
            return code;
        }
    }

    /**
     * Simple CSS minifier
     * @param {string} css - CSS code to minify
     * @returns {string} - Minified CSS code
     */
    minifyCSS(css) {
        return css;
        if (!css) return css;

        try {
            return css
                // Remove comments
                .replace(/\/\*[\s\S]*?\*\//g, '')
                // Replace multiple spaces/tabs with single space
                .replace(/[ \t]+/g, ' ')
                // Remove extra newlines
                .replace(/\n+/g, '\n')
                // Remove spaces around SAFE CSS characters only
                .replace(/\s*([{}:;,])\s*/g, '$1')
                // Remove trailing semicolons before closing braces
                .replace(/;}/g, '}')
                // Remove leading/trailing whitespace from lines
                .replace(/^\s+/gm, '')
                .replace(/\s+$/gm, '')
                .trim();
        } catch (error) {
            console.warn('Error minifying CSS:', error);
            return css; // Return original code if minification fails
        }
    }

    /**
     * Minify HTML content
     * @param {string} html - HTML content to minify
     * @returns {string} - Minified HTML content
     */
    minifyHTML(html) {
        return (html);
        if (!html) return html;

        try {
            return html
                // Remove HTML comments (but keep conditional comments for IE)
                .replace(/<!--(?!\[if)(?!<!)[^>]*-->/g, '')
                // Remove extra whitespace between tags (but preserve content)
                .replace(/>\s+</g, '><')
                // Remove leading whitespace from lines
                .replace(/^\s+/gm, '')
                // Remove trailing whitespace from lines  
                .replace(/\s+$/gm, '')
                // Compress multiple spaces to single space (but not in script/style tags)
                .replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/gi, (match, open, content, close) => {
                    return open + content + close; // Don't touch script content
                })
                .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (match, open, content, close) => {
                    return open + content + close; // Don't touch style content
                })
                .replace(/\s+/g, ' ')
                .trim();
        } catch (error) {
            console.warn('Error minifying HTML:', error);
            return html; // Return original HTML if minification fails
        }
    }
}

// Create global instance
window.exportManager = new ExportManager();