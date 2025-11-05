class ExportManager {
    constructor() {
        this.exportSettings = {
            format: 'html5',
            includeAssets: true,
            minifyCode: false,
            obfuscateCode: false,
            standalone: true,
            includeEngine: true,
            useWebGL: false,
            customTitle: '',
            customDescription: '',
            viewport: {
                width: 800,
                height: 600,
                scalable: true
            },
            maxFPS: 60,
            // Default dark theme colors
            loadingBg: '#000000ff',        // dark gray background
            spinnerColor: '#4F8EF7',     // blue accent
            progressColor: '#2D3748',      // darker gray for progress bar
            logoImage: null, // base64 or file path
            // New compression options
            compressAssets: false,         // Enable asset compression for smaller file size
            compressionQuality: 0.8,       // Image compression quality (0.1-1.0)
            maxFileSizeMB: 250             // Maximum file size in MB before warning
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
            // Ensure prefabs are loaded before collecting export data
            if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
                console.log('Pre-loading prefabs before export...');
                await window.editor.hierarchy.prefabManager.loadExistingPrefabs();
            }

            // Collect all necessary files and data
            const exportData = await this.collectExportData(project, exportSettings);

            // Check file size limits before generating content
            const sizeEstimates = await this.estimateExportSize(exportData, exportSettings);
            const warnings = this.checkSizeLimits(sizeEstimates, exportSettings);

            if (warnings.length > 0) {
                const warningMessage = warnings.join('\n\n');
                console.warn('Export size warnings:', warningMessage);

                // For critical warnings, ask user confirmation
                const criticalWarnings = warnings.filter(w =>
                    w.includes('Standalone HTML export') && w.includes('may fail') ||
                    w.includes('exceeds recommended limit')
                );

                if (criticalWarnings.length > 0) {
                    const proceed = confirm(
                        'Export Size Warning:\n\n' + criticalWarnings.join('\n\n') +
                        '\n\nDo you want to continue with the export anyway?'
                    );

                    if (!proceed) {
                        throw new Error('Export cancelled by user due to size warnings.');
                    }
                }
            }

            // Show size information to user
            console.log('Export size estimates:');
            console.log('  HTML:', this.formatFileSize(sizeEstimates.html));
            console.log('  CSS:', this.formatFileSize(sizeEstimates.css));
            console.log('  JavaScript:', this.formatFileSize(sizeEstimates.js));
            console.log('  Assets:', this.formatFileSize(sizeEstimates.assets));
            console.log('  Total:', this.formatFileSize(sizeEstimates.total));

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

        // Collect prefabs - IMPROVED VERSION
        if (window.editor && window.editor.hierarchy && window.editor.hierarchy.prefabManager) {
            console.log('Collecting prefabs from editor hierarchy prefab manager...');

            // Ensure prefabs are loaded first
            await window.editor.hierarchy.prefabManager.loadExistingPrefabs();

            // Export them using the existing export method
            data.prefabs = window.editor.hierarchy.prefabManager.exportPrefabs();
            console.log(`Collected ${Object.keys(data.prefabs).length} prefabs for export:`, Object.keys(data.prefabs));
        } else if (window.prefabManager && typeof window.prefabManager.exportPrefabs === 'function') {
            console.log('Collecting prefabs from global prefab manager...');
            data.prefabs = window.prefabManager.exportPrefabs();
            console.log(`Collected ${Object.keys(data.prefabs).length} prefabs for export:`, Object.keys(data.prefabs));
        } else {
            // Fallback: try to load prefabs directly from FileBrowser
            console.log('Using fallback prefab collection from file browser...');
            if (window.editor && window.editor.fileBrowser) {
                try {
                    const files = await window.editor.fileBrowser.getAllFiles();
                    const prefabFiles = files.filter(file => file.name.endsWith('.prefab'));

                    for (const file of prefabFiles) {
                        try {
                            const content = file.content || await window.editor.fileBrowser.readFile(file.path);
                            if (content) {
                                const prefabData = JSON.parse(content);
                                const prefabName = prefabData.metadata?.name || file.name.replace('.prefab', '');
                                data.prefabs[prefabName] = prefabData;
                            }
                        } catch (error) {
                            console.error(`Error loading prefab ${file.name} for export:`, error);
                        }
                    }
                    console.log(`Fallback collected ${Object.keys(data.prefabs).length} prefabs for export`);
                } catch (error) {
                    console.error('Error collecting prefabs via fallback method:', error);
                }
            }
        }

        // Collect custom modules (after scenes are serialized)
        data.modules = this.collectModules(data);

        // Collect assets if enabled - use AssetManager if available
        if (settings.includeAssets) {
            if (window.assetManager) {
                console.log('Collecting assets from AssetManager for export...');
                data.assets = await window.assetManager.exportAssetsForGame();

                // Also collect any additional assets from FileBrowser that might not be in AssetManager
                const fileBrowserAssets = await this.collectAssetsFromFileBrowser();
                for (const [path, asset] of Object.entries(fileBrowserAssets)) {
                    if (!data.assets[path]) {
                        data.assets[path] = asset;
                        console.log('Added additional asset from FileBrowser:', path);
                    }
                }

                console.log(`Export data includes ${Object.keys(data.assets).length} assets`);
            } else {
                console.log('AssetManager not available, falling back to FileBrowser collection...');
                data.assets = await this.collectAssets();
            }

            // Apply compression if enabled
            if (settings.compressAssets) {
                data.assets = await this.compressAssets(data.assets, settings);
            }
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
        const serialized = obj.toJSON();

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

                    // Remove any direct image content that might cause duplication
                    if (serialized.data.imageContent) {
                        delete serialized.data.imageContent;
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

                // Also check for other modules that might embed asset data
                if (serialized.data && typeof serialized.data === 'object') {
                    // Remove any large base64 image data that might be embedded
                    for (const [key, value] of Object.entries(serialized.data)) {
                        if (key.toLowerCase().includes('image') &&
                            typeof value === 'string' &&
                            value.startsWith('data:image/') &&
                            value.length > 100000) { // Only remove very large embedded images
                            console.log(`Removing embedded image data from ${module.constructor.name}.${key} to prevent duplication`);
                            delete serialized.data[key];
                        } else if (key.toLowerCase().includes('audio') &&
                            typeof value === 'string' &&
                            value.startsWith('data:audio/') &&
                            value.length > 100000) { // Only remove very large embedded audio
                            console.log(`Removing embedded audio data from ${module.constructor.name}.${key} to prevent duplication`);
                            delete serialized.data[key];
                        }
                    }
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
     * Collect assets from FileBrowser that might not be in AssetManager
     */
    async collectAssetsFromFileBrowser() {
        let assets = {};

        if (!window.fileBrowser || typeof window.fileBrowser.getAllFiles !== 'function') {
            return assets;
        }

        try {
            const files = await window.fileBrowser.getAllFiles();

            for (const file of files) {
                if (file.type === 'file') {
                    const normalizedPath = this.normalizePath(file.path);

                    // Determine if this is an asset file
                    const extension = file.path.split('.').pop().toLowerCase();
                    const assetExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 
                        'mp3', 'wav', 'ogg', 'json', 'txt'];

                    if (assetExtensions.includes(extension)) {
                        let content = file.content;
                        let mimeType = this.detectMimeType(file.path);

                        // If it's not already a data URL, convert it
                        if (!content.startsWith('data:')) {
                            if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
                                content = `data:${mimeType};base64,${content}`;
                            } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                                content = `data:${mimeType};base64,${content}`;
                            }
                        }

                        const assetSize = this.estimateAssetSize(content, mimeType);

                        assets[normalizedPath] = {
                            content: content,
                            type: mimeType,
                            source: 'fileBrowser',
                            size: assetSize
                        };

                        console.log('Collected additional asset from FileBrowser:', normalizedPath, this.formatFileSize(assetSize));
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to collect additional assets from FileBrowser:', error);
        }

        return assets;
    }

    /**
     * Collect all assets used in the project (avoiding duplicates)
     */
    async collectAssets() {
        let assets = {};
        const processedPaths = new Set(); // Track processed paths to avoid duplicates

        // First, try to get assets from AssetManager (most reliable source)
        if (window.assetManager) {
            try {
                const assetManagerAssets = await window.assetManager.exportAssetsForGame();

                // Process AssetManager assets first
                for (const [path, assetData] of Object.entries(assetManagerAssets)) {
                    const normalizedPath = this.normalizePath(path);

                    // Skip if already processed
                    if (processedPaths.has(normalizedPath)) {
                        continue;
                    }

                    assets[normalizedPath] = {
                        content: assetData.content,
                        type: assetData.type,
                        source: 'assetManager',
                        size: this.estimateAssetSize(assetData.content, assetData.type)
                    };

                    processedPaths.add(normalizedPath);
                    console.log('Collected asset from AssetManager:', normalizedPath, this.formatFileSize(assets[normalizedPath].size));
                }

                console.log('Collected assets from AssetManager:', Object.keys(assetManagerAssets).length);
            } catch (error) {
                console.warn('Failed to collect assets from AssetManager:', error);
            }
        }

        // Only scan FileBrowser if AssetManager didn't provide assets
        // This avoids double-counting assets that are already in AssetManager
        if (Object.keys(assets).length === 0 && window.fileBrowser && typeof window.fileBrowser.getAllFiles === 'function') {
            try {
                const files = await window.fileBrowser.getAllFiles();

                for (const file of files) {
                    if (file.type === 'file') {
                        const normalizedPath = this.normalizePath(file.path);

                        // Skip if already processed
                        if (processedPaths.has(normalizedPath)) {
                            continue;
                        }

                        // Determine if this is an asset file
                        const extension = file.path.split('.').pop().toLowerCase();
                        const assetExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'json'];

                        if (assetExtensions.includes(extension)) {
                            let content = file.content;
                            let mimeType = this.detectMimeType(file.path);

                            // If it's not already a data URL, convert it
                            if (!content.startsWith('data:')) {
                                if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
                                    content = `data:${mimeType};base64,${content}`;
                                } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                                    content = `data:${mimeType};base64,${content}`;
                                }
                            }

                            const assetSize = this.estimateAssetSize(content, mimeType);

                            assets[normalizedPath] = {
                                content: content,
                                type: mimeType,
                                source: 'fileBrowser',
                                size: assetSize
                            };

                            processedPaths.add(normalizedPath);
                            console.log('Collected asset from FileBrowser:', normalizedPath, this.formatFileSize(assetSize));
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to collect assets from FileBrowser:', error);
            }
        }

        // Remove any embedded image data from SpriteRenderer modules to avoid duplication
        // This is a common source of double-counting
        // Log asset collection summary
        const assetSummary = {};
        for (const [path, asset] of Object.entries(assets)) {
            const extension = path.split('.').pop().toLowerCase();
            assetSummary[extension] = (assetSummary[extension] || 0) + 1;
        }

        console.log('Final collected assets (no duplicates):', Object.keys(assets).length);
        console.log('Asset breakdown by type:', assetSummary);

        // Calculate total estimated size
        let totalSize = 0;
        for (const asset of Object.values(assets)) {
            totalSize += asset.size || 0;
        }
        console.log('Total estimated asset size:', this.formatFileSize(totalSize));

        return assets;
    }

    /**
     * Estimate the actual size of an asset (accounting for base64 encoding)
     * @param {string} content - Asset content (data URL or raw data)
     * @param {string} mimeType - MIME type
     * @returns {number} - Estimated size in bytes
     */
    estimateAssetSize(content, mimeType) {
        if (!content) return 0;

        try {
            if (typeof content === 'string' && content.startsWith('data:')) {
                // Extract base64 data from data URL
                const commaIndex = content.indexOf(',');
                if (commaIndex !== -1) {
                    const base64Data = content.substring(commaIndex + 1);
                    // Base64 is ~4/3 larger than original binary data
                    return Math.ceil((base64Data.length * 3) / 4);
                }
            }

            // For non-data URL content, estimate based on string length
            return content.length;
        } catch (error) {
            console.warn('Error estimating asset size:', error);
            return content.length || 0;
        }
    }

    /**
     * Compress assets for smaller file size
     * @param {Object} assets - Assets object to compress
     * @param {Object} settings - Export settings including compression options
     * @returns {Object} - Compressed assets object
     */
    async compressAssets(assets, settings) {
        if (!settings.compressAssets || !assets) {
            return assets;
        }

        console.log('Compressing assets for smaller file size...');
        const compressedAssets = {};
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;

        for (const [path, asset] of Object.entries(assets)) {
            const originalContent = asset.content;
            if (!originalContent) {
                compressedAssets[path] = asset;
                continue;
            }

            try {
                let compressedContent = originalContent;
                const extension = path.split('.').pop().toLowerCase();

                // Handle different asset types
                if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
                    compressedContent = await this.compressImage(originalContent, settings.compressionQuality);
                } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                    compressedContent = await this.compressAudio(originalContent, settings.compressionQuality);
                } else {
                    // For other asset types, keep as-is
                    compressedContent = originalContent;
                }

                // Calculate size difference
                const originalSize = typeof originalContent === 'string' ?
                    (originalContent.startsWith('data:') ?
                        Math.ceil((originalContent.split(',')[1].length * 3) / 4) :
                        originalContent.length) :
                    0;

                const compressedSize = typeof compressedContent === 'string' ?
                    (compressedContent.startsWith('data:') ?
                        Math.ceil((compressedContent.split(',')[1].length * 3) / 4) :
                        compressedContent.length) :
                    0;

                totalOriginalSize += originalSize;
                totalCompressedSize += compressedSize;

                // Only use compressed version if it's actually smaller
                if (compressedSize < originalSize && compressedSize > 0) {
                    compressedAssets[path] = {
                        ...asset,
                        content: compressedContent,
                        originalSize: originalSize,
                        compressedSize: compressedSize
                    };
                    console.log(`Compressed ${path}: ${this.formatFileSize(originalSize)} -> ${this.formatFileSize(compressedSize)}`);
                } else {
                    compressedAssets[path] = asset;
                    console.log(`Compression not beneficial for ${path}, keeping original`);
                }

            } catch (error) {
                console.warn(`Failed to compress asset ${path}:`, error);
                compressedAssets[path] = asset; // Keep original if compression fails
            }
        }

        const compressionRatio = totalOriginalSize > 0 ?
            Math.round((1 - totalCompressedSize / totalOriginalSize) * 100) : 0;

        console.log(`Asset compression completed: ${this.formatFileSize(totalOriginalSize)} -> ${this.formatFileSize(totalCompressedSize)} (${compressionRatio}% reduction)`);

        return compressedAssets;
    }

    /**
     * Compress image data
     * @param {string} imageDataUrl - Image data URL
     * @param {number} quality - Compression quality (0.1-1.0)
     * @returns {Promise<string>} - Compressed image data URL
     */
    async compressImage(imageDataUrl, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas dimensions
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw and compress
                    ctx.drawImage(img, 0, 0);

                    // Determine output format based on original
                    let outputFormat = 'image/jpeg'; // Default to JPEG for better compression
                    if (imageDataUrl.includes('image/png')) {
                        outputFormat = 'image/png';
                    } else if (imageDataUrl.includes('image/webp')) {
                        outputFormat = 'image/webp';
                    }

                    // Adjust quality based on format
                    let finalQuality = quality;
                    if (outputFormat === 'image/png') {
                        // PNG doesn't support quality parameter, but we can still compress by reducing colors
                        finalQuality = quality > 0.8 ? 0.8 : quality; // Cap PNG quality at 0.8
                    }

                    const compressedDataUrl = canvas.toDataURL(outputFormat, finalQuality);
                    resolve(compressedDataUrl);

                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = imageDataUrl;
        });
    }

    /**
     * Compress audio data (basic implementation)
     * @param {string} audioDataUrl - Audio data URL
     * @param {number} quality - Compression quality (0.1-1.0)
     * @returns {Promise<string>} - Compressed audio data URL (returns original for now)
     */
    async compressAudio(audioDataUrl, quality = 0.8) {
        // For now, return original audio as compression is more complex
        // In a full implementation, you might use Web Audio API or external libraries
        console.log('Audio compression not implemented yet, returning original');
        return audioDataUrl;
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

    async filePathToDataURL(path) {
        // Loads a local image and converts to base64 data URL
        try {
            const response = await fetch(path);
            const blob = await response.blob();
            return await this.blobToDataURL(blob);
        } catch (e) {
            console.warn('Could not convert file to base64:', path, e);
            return null;
        }
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
            'SupermandoNameGenerator.js',

            // Physics (if using Matter.js)
            'src/core/matter-js/PhysicsManager.js',

            // MelodiCode
            'src/MelodiCode/js/audio-engine.js',
            'src/MelodiCode/js/code-interpreter.js',
            'src/MelodiCode/MelodiCode.js',

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
        let modules = [];

        // Get all modules from the module registry instead of scanning scenes
        if (window.moduleRegistry && window.moduleRegistry.modules) {
            console.log('Collecting all modules from registry...');

            for (const [className, moduleClass] of window.moduleRegistry.modules) {
                modules.push({
                    className: className,
                    filePath: this.getModuleFilePath(className)
                });
            }

            console.log('Collected all modules for export:', modules.map(m => m.className));
        } else {
            console.warn('Module registry not found, using fallback module list');

            // Fallback: include common modules if registry is not available
            const commonModules = [
                'SpriteRenderer', 'SpriteSheetRenderer', 'DrawCircle', 'DrawRectangle',
                'DrawPolygon', 'DrawText', 'DrawLine', 'SimpleMovementController',
                'CameraController', 'RigidBody', 'Timer', 'Tween', 'ParticleSystem',
                'AudioPlayer', 'BasicPhysics', 'PhysicsKeyboardController'
            ];

            commonModules.forEach(className => {
                modules.push({
                    className: className,
                    filePath: this.getModuleFilePath(className)
                });
            });
        }

        // Also collect ALL modules defined in the getModuleFilePath mapping
        const allModuleMappings = this.getModuleFilePath();
        for (const className in allModuleMappings) {
            // Only add if not already included
            if (!modules.find(m => m.className === className)) {
                modules.push({
                    className: className,
                    filePath: allModuleMappings[className]
                });
            }
        }

        // collect object-specific modules if scene data is available
        if (data && data.scenes && data.scenes.length > 0) {
            const objectSpecificModules = this.collectModulesObjectSpecific(data);
            modules = modules.concat(objectSpecificModules);
        }

        // Remove duplicates
        const uniqueModules = Array.from(new Set(modules.map(m => m.className)))
            .map(className => modules.find(m => m.className === className));

        return uniqueModules;
    }

    /**
     * Collect all modules used in the project, only if theyre in use
     */
    collectModulesObjectSpecific(data) {
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

            // Add dependencies for specific modules
            if (moduleType === 'Spawner') {
                // Spawner might need RigidBody and Timer modules
                if (!usedModuleTypes.has('RigidBody')) {
                    modules.push({
                        className: 'RigidBody',
                        filePath: this.getModuleFilePath('RigidBody')
                    });
                }
                if (!usedModuleTypes.has('Timer')) {
                    modules.push({
                        className: 'Timer',
                        filePath: this.getModuleFilePath('Timer')
                    });
                }
            }
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
            //'SpriteRendererBackground': 'src/core/Modules/Visual/SpriteRendererBackground.js',
            //'SpriteSheetRenderer': 'src/core/Modules/Visual/SpriteSheetRenderer.js',
            //'ObjectTiling': 'src/core/Modules/Visual/ObjectTiling.js',
            // Utility Modules
            //'FollowTarget': 'src/core/Modules/Utility/FollowTarget.js',
            'Spawner': 'src/core/Modules/Utility/Spawner.js',
            //'PostScreenEffects': 'src/core/Modules/Visual/PostScreenEffects.js',

            // Controller Modules
            //'SimpleMovementController': 'src/core/Modules/Controllers/SimpleMovementController.js',
            'CameraController': 'src/core/Modules/Controllers/CameraController.js',

            /*'Camera3DRasterizer': 'src/core/3D/Camera3DRasterizer.js',
            'CubeMesh3D': 'src/core/3D/CubeMesh3D.js',
            'FlyCamera': 'src/core/3D/FlyCamera.js',
            'Mesh3D': 'src/core/3D/Mesh3D.js',
            'MouseLook': 'src/core/3D/MouseLook.js',
            'Material': 'src/core/3D/Material.js',*/

            // Drawing Modules
            /*'DrawCircle': 'src/core/Modules/Drawing/DrawCircle.js',
            'DrawRectangle': 'src/core/Modules/Drawing/DrawRectangle.js',
            'DrawPolygon': 'src/core/Modules/Drawing/DrawPolygon.js',
            'DrawPlatformerHills': 'src/core/Modules/Platform Game/DrawPlatformerHills.js',
            'DrawInfiniteStarFieldParallax': 'src/core/Modules/Drawing/DrawInfiniteStarFieldParallax.js',
            'DrawHeart': 'src/core/Modules/Drawing/DrawHeart.js',
            'DrawShield': 'src/core/Modules/Drawing/DrawShield.js',
            'DrawCapsule': 'src/core/Modules/Drawing/DrawCapsule.js',
            'DrawDiamond': 'src/core/Modules/Drawing/DrawDiamond.js',
            'DrawStar': 'src/core/Modules/Drawing/DrawStar.js',
            'DrawIcon': 'src/core/Modules/Drawing/DrawIcon.js',
            'DrawText': 'src/core/Modules/Drawing/DrawText.js',
            'DrawLine': 'src/core/Modules/Drawing/DrawLine.js',
            'DrawGrid': 'src/core/Modules/Drawing/DrawGrid.js',
            'MarchingCubesTerrain': 'src/core/Modules/Drawing/MarchingCubesTerrain.js',*/

            // Asteroid Modules
            //'PlayerShip': 'src/core/Modules/Asteroids/PlayerShip.js',
            //'DrawInfiniteStarFieldParallax': 'src/core/Modules/Asteroids/DrawInfiniteStarFieldParallax.js',
            //'AsteroidsPlanet': 'src/core/Modules/Asteroids/AsteroidsPlanet.js',
            //'EnemyShip': 'src/core/Modules/Asteroids/EnemyShip.js',
            //'AsteroidsBullet': 'src/core/Modules/Asteroids/AsteroidsBullet.js',
            //'Asteroid': 'src/core/Modules/Asteroids/Asteroid.js',
            //'AsteroidManager': 'src/core/Modules/Asteroids/AsteroidManager.js',

            // Animation Modules
            'Tween': 'src/core/Modules/Animation/Tween.js',
            'Timer': 'src/core/Modules/Animation/Timer.js',

            // Effects Modules
            'ParticleSystem': 'src/core/Modules/Effects/ParticleSystem.js',

            // Lighting Modules
            /*'DarknessModule': 'src/core/Modules/Lighting/DarknessModule.js',
            'PointLightModule': 'src/core/Modules/Lighting/PointLightModule.js',*/

            // Snake Game Modules
            /*'SnakePlayer': 'src/core/Modules/Snake/SnakePlayer.js',
            'SnakeSegment': 'src/core/Modules/Snake/SnakeApple.js',*/

            // Physics and Collision Modules
            /*'RigidBody': 'src/core/Modules/Matter-js/RigidBody.js',
            'RigidBodyDragger': 'src/core/Modules/Matter-js/RigidBodyDragger.js',
            'Joint': 'src/core/Modules/Matter-js/Joint.js',
            'GravityFieldMatter': 'src/core/Modules/Matter-js/GravityFieldMatter.js',
            'WindZoneMatter': 'src/core/Modules/Matter-js/WindZoneMatter.js',
            'VehiclePhysics': 'src/core/Modules/Matter-js/VehiclePhysics.js',
            'PlatformControllerMatter': 'src/core/Modules/Matter-js/PlatformControllerMatter.js',*/

            'BasicPhysics': 'src/core/Modules/Movement/BasicPhysics.js',
            'PhysicsKeyboardController': 'src/core/Modules/Movement/PhysicsKeyboardController.js',

            // Other Modules
            //'SimpleHealth': 'src/core/Modules/SimpleHealth.js',
            //'AudioPlayer': 'src/core/Modules/AudioPlayer.js',
            //'BehaviorTrigger': 'src/core/Modules/BehaviorTrigger.js'
        };

        // If no className provided, return the entire mapping
        if (!className) {
            return moduleMap;
        }

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

        // Filter out scripts that extend EditorWindow and only include .js files
        const filteredScripts = [];

        for (const file of files) {
            if (file.name.endsWith('.js')) {
                // Check if the script content extends EditorWindow
                if (file.content && typeof file.content === 'string') {
                    // Look for patterns that indicate this is an EditorWindow extension
                    const extendsEditorWindow =
                        file.content.includes('extends EditorWindow') ||
                        file.content.includes('class ') && file.content.includes('EditorWindow') ||
                        file.content.includes('EditorWindow.');

                    if (!extendsEditorWindow) {
                        filteredScripts.push({
                            name: file.name,
                            path: file.path,
                            content: file.content
                        });
                    } else {
                        console.log(`Excluding EditorWindow script from export: ${file.name}`);
                    }
                } else {
                    // If we can't read the content, include it to be safe
                    filteredScripts.push({
                        name: file.name,
                        path: file.path,
                        content: file.content
                    });
                }
            }
        }

        return filteredScripts;
    }

    /**
     * Generate HTML content
     */
    generateHTML(data, settings) {
        const title = settings.customTitle || 'Dark Matter Game';
        const description = settings.customDescription || 'A game created with Dark Matter JS Engine';

        const logoSrc = settings.logoImage ? settings.logoImage : './loading.png';

        // Use viewport dimensions or default to full screen
        const canvasWidth = settings.viewport?.width || window.innerWidth || 800;
        const canvasHeight = settings.viewport?.height || window.innerHeight || 600;

        let scriptAndStyleTags = '';
        if (!settings.standalone) {
            scriptAndStyleTags += `<link rel="stylesheet" href="style.css">\n    `;
            scriptAndStyleTags += `<script src="game.js"></script>\n`;
            if (data.customScripts && data.customScripts.length > 0) {
                for (const script of data.customScripts) {
                    scriptAndStyleTags += `    <script src="scripts/${script.path ? script.path.split('/').pop() : script.name}"></script>\n`;
                }
            }
        } else {
            scriptAndStyleTags = `<style id="game-styles">/* CSS will be injected here */</style>
    <script id="game-script">/* JavaScript will be injected here */</script>`;
        }

        // Remove loading text, spinner, and progress bar from loading screen
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const updateCanvasSize = () => {
                    const width = window.innerWidth;
                    const height = window.innerHeight;
                    canvas.width = width;
                    canvas.height = height;
                    canvas.style.width = width + 'px';
                    canvas.style.height = height + 'px';
                    if (window.engine && typeof window.engine.handleResize === 'function') {
                        window.engine.handleResize(width, height);
                    }
                };
                updateCanvasSize();
                window.addEventListener('resize', updateCanvasSize);
                window.addEventListener('orientationchange', () => {
                    setTimeout(updateCanvasSize, 100);
                });
            }
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

        document.addEventListener('DOMContentLoaded', function() {
            const startBtn = document.getElementById('start-game-btn');
            if (startBtn) {
                startBtn.addEventListener('click', function() {
                    startBtn.style.display = 'none';
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) loadingScreen.style.display = 'none';
                    if (window.melodicode && window.melodicode.audioEngine && window.melodicode.audioEngine.context) {
                        window.melodicode.audioEngine.context.resume();
                    }
                    if (typeof initializeGame === 'function') {
                        initializeGame();
                    }
                });
            }

            // Load Game Button Logic
            const loadBtn = document.getElementById('load-game-btn');
            if (loadBtn) {
                loadBtn.addEventListener('click', function() {
                    showLoadGameDialog();
                });
            }
        });

        document.addEventListener('DOMContentLoaded', function() {
            function showDescModal() {
                document.getElementById('desc-modal').style.display = 'flex';
            }
            function hideDescModal() {
                document.getElementById('desc-modal').style.display = 'none';
            }
            const descBtn = document.getElementById('desc-btn');
            if (descBtn) {
                descBtn.addEventListener('click', showDescModal);
                descBtn.addEventListener('touchstart', function(e){e.preventDefault();showDescModal();});
            }
            const descCloseBtn = document.getElementById('desc-close-btn');
            if (descCloseBtn) {
                descCloseBtn.addEventListener('click', hideDescModal);
                descCloseBtn.addEventListener('touchstart', function(e){e.preventDefault();hideDescModal();});
            }
            // Touch support for start/load buttons
            const startBtn = document.getElementById('start-game-btn');
            if (startBtn) {
                startBtn.addEventListener('touchstart', function(e){
                    e.preventDefault();
                    startBtn.click();
                });
            }
            const loadBtn = document.getElementById('load-game-btn');
            if (loadBtn) {
                loadBtn.addEventListener('touchstart', function(e){
                    e.preventDefault();
                    loadBtn.click();
                });
            }
        });

        // Load Game Dialog
        function showLoadGameDialog() {
            const modal = document.createElement('div');
            modal.id = 'load-game-modal';
            modal.style.position = 'fixed';
            modal.style.top = '0'; modal.style.left = '0';
            modal.style.width = '100vw'; modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.85)';
            modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
            modal.style.zIndex = '2000';

            // List local saves
            let saves = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('dmjs_save_')) {
                    saves.push(key.replace('dmjs_save_', ''));
                }
            }

            // Build options string
            let optionsHtml = '';
            if (saves.length) {
                optionsHtml = saves.map(s => \`<option value="\${s}">\${s}</option>\`).join('');
            } else {
                optionsHtml = '<option>No saves found</option>';
            }

            modal.innerHTML = \`
                <div style="background:#222;padding:32px;border-radius:16px;min-width:320px;max-width:90vw;">
                    <h2 style="color:#fff;">Load Game</h2>
                    <div>
                        <label style="color:#fff;">Local Saves:</label>
                        <select id="local-save-list" style="width:100%;margin-bottom:12px;">
                            \${optionsHtml}
                        </select>
                        <button id="load-local-btn" style="margin-right:8px;">Load Selected</button>
                        <button id="delete-local-btn" style="margin-right:8px;">Delete Selected</button>
                    </div>
                    <hr style="margin:16px 0;">
                    <div>
                        <label style="color:#fff;">Import Save File:</label>
                        <input type="file" id="import-save-file" accept=".json,.dmjs-save.json" style="margin-bottom:8px;">
                        <button id="import-file-btn">Import & Load</button>
                    </div>
                    <hr style="margin:16px 0;">
                    <button id="back-btn" style="margin-top:8px;">Back</button>
                </div>
            \`;
            document.body.appendChild(modal);

            // Load local
            modal.querySelector('#load-local-btn').onclick = async () => {
                const sel = modal.querySelector('#local-save-list').value;
                if (window.engine && sel) {
                    await window.engine.loadGame(sel);
                    modal.remove();
                    document.getElementById('loading-screen').style.display = 'none';
                }
            };
            // Delete local
            modal.querySelector('#delete-local-btn').onclick = () => {
                const sel = modal.querySelector('#local-save-list').value;
                if (sel && confirm('Delete save "' + sel + '"?')) {
                    localStorage.removeItem('dmjs_save_' + sel);
                    modal.remove();
                    showLoadGameDialog();
                }
            };
            // Import file
            modal.querySelector('#import-file-btn').onclick = async () => {
                const fileInput = modal.querySelector('#import-save-file');
                if (fileInput.files.length) {
                    const file = fileInput.files[0];
                    if (window.engine) {
                        await window.engine.loadGame(file);
                        modal.remove();
                        document.getElementById('loading-screen').style.display = 'none';
                    }
                }
            };
            // Back button
            modal.querySelector('#back-btn').onclick = () => {
                modal.remove();
            };
        }
    </script>
    
    ${scriptAndStyleTags.trim()}
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="loading-screen" style="background:${settings.loadingBg || '#111'};">
            <div class="loading-content">
                <img class="loading-logo" src="${logoSrc}" alt="Logo">
                <div class="game-title" style="
                    font-size:2em;
                    font-weight:700;
                    color:${settings.spinnerColor || '#09f'};
                    margin-bottom:16px;
                    text-align:center;
                    letter-spacing:1px;
                ">${title}</div>
                <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
                    <button id="start-game-btn" style="
                        margin-top:8px;
                        padding: 16px 48px;
                        font-size: 1.4em;
                        font-weight: bold;
                        color: #fff;
                        background: ${settings.spinnerColor || '#09f'};
                        border: none;
                        border-radius: 32px;
                        box-shadow: 0 2px 16px 0 ${settings.spinnerColor || '#09f'}44;
                        cursor: pointer;
                        transition: background 0.2s, box-shadow 0.2s;
                        outline: none;
                        letter-spacing: 1px;
                    ">Start Game</button>
                    <button id="desc-btn" aria-label="Show Description" style="
                        margin-top:8px;
                        padding: 0 16px;
                        font-size: 1.4em;
                        font-weight: bold;
                        color: ${settings.spinnerColor || '#09f'};
                        background: #222;
                        border: 2px solid ${settings.spinnerColor || '#09f'};
                        border-radius: 50%;
                        cursor: pointer;
                        transition: background 0.2s, box-shadow 0.2s;
                        outline: none;
                        height:48px;
                        width:48px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                    ">?</button>
                </div>
                <button id="load-game-btn" style="
                    margin-top:12px;
                    padding: 12px 32px;
                    font-size: 1.1em;
                    font-weight: bold;
                    color: #fff;
                    background: ${settings.spinnerColor || '#09f'};
                    border: none;
                    border-radius: 24px;
                    box-shadow: 0 2px 8px 0 ${settings.spinnerColor || '#09f'}44;
                    cursor: pointer;
                    transition: background 0.2s, box-shadow 0.2s;
                    outline: none;
                    letter-spacing: 1px;
                ">Load Game</button>
            </div>
        </div>
        <div id="desc-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:3000;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);">
            <div style="background:#222;padding:32px 24px;border-radius:16px;max-width:90vw;max-height:80vh;overflow:auto;box-shadow:0 8px 32px #000a;color:#fff;position:relative;">
                <button id="desc-close-btn" style="position:absolute;top:12px;right:16px;background:none;border:none;color:${settings.spinnerColor || '#09f'};font-size:1.6em;cursor:pointer;">&times;</button>
                <h2 style="color:${settings.spinnerColor || '#09f'};margin-top:0;margin-bottom:12px;font-size:1.3em;">About This Game</h2>
                <div style="font-size:1.1em;line-height:1.5;color:#eee;">${description}</div>
            </div>
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
            // Load Terser if minification or obfuscation is enabled
            if (settings.minifyCode || settings.obfuscateCode) {
                await this.loadTerser();
            }

            // Collect all JavaScript code first WITHOUT minification
            // Add engine files
            js += '// Dark Matter JS Engine\n';
            for (const filePath of data.engineFiles) {
                js += `// ${filePath}\n`;
                let fileContent = await this.loadFileContent(filePath);
                js += fileContent + '\n\n';
            }

            // Add modules
            js += '// Game Modules\n';
            for (const module of data.modules) {
                js += `// ${module.filePath}\n`;
                let moduleContent = await this.loadFileContent(module.filePath);
                js += moduleContent + '\n\n';
            }

            // Add custom scripts
            for (const script of data.customScripts) {
                js += `// ${script.name}\n`;
                js += script.content + '\n\n';
            }

            // Add game initialization code
            let initCode = this.generateGameInitialization(data, settings);
            js += initCode + '\n\n';

            // Add DOMContentLoaded handler
            const domHandler = `
document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            startBtn.style.display = 'none';
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (window.melodicode && window.melodicode.audioEngine && window.melodicode.audioEngine.context) {
                window.melodicode.audioEngine.context.resume();
            }
            if (typeof initializeGame === 'function') {
                initializeGame();
            }
        });
    }
});
`;
            js += domHandler;

            // NOW minify/obfuscate the ENTIRE combined code as one unit
            if (settings.minifyCode) {
                try {
                    console.log('Minifying entire codebase as one unit...');
                    const originalSize = js.length;
                    js = await this.minifyJavaScriptAdvanced(js, settings.obfuscateCode);
                    const reduction = Math.round((1 - js.length / originalSize) * 100);
                    console.log(`${settings.obfuscateCode ? 'Obfuscated and minified' : 'Minified'} entire codebase: ${originalSize} -> ${js.length} bytes (${reduction}% reduction)`);
                } catch (minifyError) {
                    console.warn('Failed to minify entire codebase, using original:', minifyError);
                }
            }

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

/* Enhanced loading screen */
#loading-screen {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: ${settings.loadingBg || '#111'};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    font-family: Arial, sans-serif;
}
.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.loading-spinner {
    width: 48px;
    height: 48px;
    border: 6px solid transparent;
    border-top: 6px solid ${settings.spinnerColor || '#09f'};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}
@keyframes spin {
    0% { transform: rotate(0deg);}
    100% { transform: rotate(360deg);}
}
.loading-text {
    font-size: 1.2em;
    margin-bottom: 12px;
    letter-spacing: 1px;
}
.loading-progress-bar {
    width: 200px;
    height: 8px;
    background: #222;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
}
.loading-progress {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #09f 0%, #0ff 100%);
    transition: width 0.3s;
}

/* Make the logo much larger and centered */
.loading-logo {
    display: block;
    margin: 0 auto 32px auto;
    max-width: 60vw;
    max-height: 60vh;
    width: auto;
    height: auto;
    object-fit: contain;
}

/* Stack loading text and spinner horizontally */
.loading-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    gap: 24px;
}

/* Loading text styling */
.loading-text {
    font-size: 2em;
    margin: 0;
    letter-spacing: 1px;
    color: #fff;
}

/* Spinner next to text, not inside logo */
.loading-spinner {
    width: 48px;
    height: 48px;
    border: 6px solid transparent;
    border-top: 6px solid ${settings.spinnerColor || '#09f'};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0;
}

#load-game-modal {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    font-family: 'Segoe UI', Arial, sans-serif;
}

#load-game-modal > div {
    background: #222;
    padding: 32px 40px;
    border-radius: 18px;
    min-width: 340px;
    max-width: 95vw;
    box-shadow: 0 8px 32px #000a;
    color: #fff;
}

#load-game-modal h2 {
    margin-top: 0;
    margin-bottom: 18px;
    font-size: 2em;
    font-weight: 700;
    letter-spacing: 1px;
    color:  ${settings.spinnerColor || '#09f'};
}

#load-game-modal label {
    font-weight: 500;
    margin-bottom: 6px;
    display: block;
    color: #eee;
}

#load-game-modal select,
#load-game-modal input[type="file"] {
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    border: none;
    background: #333;
    color: #fff;
    margin-bottom: 10px;
    font-size: 1em;
}

#load-game-modal button {
    padding: 10px 24px;
    border-radius: 8px;
    border: none;
    background: ${settings.spinnerColor || '#4F8EF7'};
    color: #fff;
    font-weight: 600;
    font-size: 1em;
    margin: 6px 4px 0 0;
    cursor: pointer;
    box-shadow: 0 2px 8px #4F8EF744;
    transition: background 0.2s, box-shadow 0.2s;
}

#load-game-modal button#back-btn {
    background: #444;
}

#load-game-modal button:hover {
    background: ${settings.spinnerColor || '#3574c3'};
}

#load-game-modal hr {
    border: none;
    border-top: 1px solid #444;
    margin: 18px 0;
}

* Style the file input for the load game modal */
#load-game-modal input[type="file"] {
    background: #2d3e5c; /* Slightly darker than spinner color */
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 1em;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px #4F8EF744;
    transition: background 0.2s, box-shadow 0.2s;
}

#load-game-modal input[type="file"]:hover,
#load-game-modal input[type="file"]:focus {
    background: #22304a; /* Even darker on hover/focus */
    outline: none;
}

/* --- Loading Screen --- */
#loading-screen {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: #111;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    font-family: Arial, sans-serif;
}
.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.loading-logo {
    display: block;
    margin: 0 auto 32px auto;
    max-width: 60vw;
    max-height: 60vh;
    width: auto;
    height: auto;
    object-fit: contain;
}
.game-title {
    font-size: 2em;
    font-weight: 700;
    color: #4F8EF7;
    margin-bottom: 16px;
    text-align: center;
    letter-spacing: 1px;
}
#start-game-btn, #load-game-btn {
    margin-top: 8px;
    padding: 16px 48px;
    font-size: 1.4em;
    font-weight: bold;
    color: #fff;
    background: #4F8EF7;
    border: none;
    border-radius: 32px;
    box-shadow: 0 2px 16px 0 #4F8EF744;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
    outline: none;
    letter-spacing: 1px;
    touch-action: manipulation;
}
#load-game-btn {
    margin-top: 12px;
    padding: 12px 32px;
    font-size: 1.1em;
    border-radius: 24px;
    box-shadow: 0 2px 8px 0 #4F8EF744;
}
#desc-btn {
    margin-top: 8px;
    padding: 0 16px;
    font-size: 1.4em;
    font-weight: bold;
    color: #4F8EF7;
    background: #222;
    border: 2px solid #4F8EF7;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
    outline: none;
    height: 48px;
    width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
}
#desc-btn:active, #desc-btn:focus {
    background: #333;
    border-color: #3574c3;
}
#desc-modal {
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: 3000;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.85);
}
#desc-modal > div {
    background: #222;
    padding: 32px 24px;
    border-radius: 16px;
    max-width: 90vw;
    max-height: 80vh;
    overflow: auto;
    box-shadow: 0 8px 32px #000a;
    color: #fff;
    position: relative;
}
#desc-close-btn {
    position: absolute;
    top: 12px;
    right: 16px;
    background: none;
    border: none;
    color: #4F8EF7;
    font-size: 1.6em;
    cursor: pointer;
    touch-action: manipulation;
}
#desc-modal h2 {
    color: #4F8EF7;
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.3em;
}
#desc-modal div {
    font-size: 1.1em;
    line-height: 1.5;
    color: #eee;
}
@media (max-width: 600px) {
    #desc-modal > div {
        padding: 18px 8px;
        min-width: 90vw;
    }
    #desc-modal h2 {
        font-size: 1.1em;
    }
    .game-title {
        font-size: 1.2em;
    }
    #start-game-btn, #load-game-btn {
        font-size: 1em;
        padding: 10px 24px;
    }
    #desc-btn {
        font-size: 1em;
        height: 36px;
        width: 36px;
    }
}
    
@media (max-width: 600px) {
    #load-game-modal > div {
        padding: 18px 8px;
        min-width: 90vw;
    }
    #load-game-modal h2 {
        font-size: 1.3em;
    }
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

        // For standalone mode, embed all assets
        // For ZIP mode, don't embed assets at all - they'll be loaded from files
        const assetsData = (settings.standalone && settings.includeAssets) ?
            this.safeStringify(data.assets) : 'null';

        // For ZIP mode, create asset mapping with just filenames as IDs
        const assetMapping = (!settings.standalone && settings.includeAssets) ?
            this.safeStringify(this.createAssetMapping(data.assets)) : 'null';

        // Get the starting scene index from settings, default to 0
        const startingSceneIndex = settings.startingSceneIndex || 0;
        const maxFPS = settings.maxFPS !== undefined ? settings.maxFPS : 60;


        return `
// Game Initialization - Fixed for Physics
let gameInitialized = false;

function setLoadingProgress(percent) {
    var bar = document.querySelector('.loading-progress');
    if (bar) bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
}

async function initializeGame() {
    if (gameInitialized) return;
    gameInitialized = true;
    
    console.log('Initializing exported game...');

    // Initialize AssetManager first
    if (!window.assetManager) {
        window.assetManager = new AssetManager(null);
    }

    // Initialize Global Prefab Manager
    if (!window.prefabManager) {
        window.prefabManager = {
            prefabs: new Map(),
            
            loadPrefabs: function(prefabsData) {
                if (!prefabsData) return;
                
                console.log('Loading prefabs into global manager:', Object.keys(prefabsData));
                for (const [name, prefabData] of Object.entries(prefabsData)) {
                    this.prefabs.set(name, prefabData);
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
                    // Use GameObject.fromJSON for proper deserialization (matches editor behavior)
                    const gameObject = GameObject.fromJSON(prefabData);
                    
                    // Override position if specified
                    if (position) {
                        gameObject.position.x = position.x;
                        gameObject.position.y = position.y;
                    }
                    
                    // Handle parenting
                    if (parent) {
                        parent.addChild(gameObject);
                    } else if (window.engine && window.engine.gameObjects) {
                        window.engine.gameObjects.push(gameObject);
                    }
                    
                    return gameObject;
                } catch (error) {
                    console.error('Error instantiating prefab:', error);
                    return null;
                }
            }
        };
    }

    ${settings.standalone ? `
    // Standalone mode - embed assets directly in the HTML
    const assetsData = ${assetsData};
    if (assetsData) {
        console.log('Loading embedded assets into AssetManager...');
        window.assetManager.addEmbeddedAssets(assetsData);
        
        // Wait a moment for async asset loading to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('AssetManager cache populated with:', Object.keys(window.assetManager.cache));
    }` : `
    // ZIP mode - load assets from separate files
    ${settings.includeAssets ? `
    console.log('ZIP mode: Pre-loading assets from asset files...');
    const assetMapping = ${assetMapping};

    let loadedCount = 0;
    const totalAssets = Object.keys(assetMapping).length;
    
    if (assetMapping) {
        for (const [originalPath, fileName] of Object.entries(assetMapping)) {
            try {
                const assetUrl = 'assets/' + fileName;
                const extension = fileName.split('.').pop().toLowerCase();
                
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    await new Promise((resolve, reject) => {
                        img.onload = () => {
                            const assetId = fileName.replace(/\\.[^.]+$/, '');
                            
                            // FIX: Normalize the original path to remove leading slashes
                            const normalizedOriginalPath = originalPath.replace(/^[\/\\\\]+/, '');
                            
                            // Cache under ALL possible path variations INCLUDING the original path with leading slash
                            const pathVariations = [
                                originalPath,                              // Original with slash (if present)
                                normalizedOriginalPath,                    // Without leading slash
                                fileName,                                   // Just the filename
                                assetId,                                    // Filename without extension
                                '/' + normalizedOriginalPath,              // With added leading slash
                                originalPath.split('/').pop(),             // Just filename from path
                                originalPath.split('\\\\').pop(),          // Just filename (Windows)
                                normalizedOriginalPath.split('/').pop(),   // Normalized filename
                                assetId.toLowerCase(),                     // Lowercase ID
                                fileName.toLowerCase()                     // Lowercase filename
                            ];
                            
                            // Remove duplicates and cache
                            const uniquePaths = [...new Set(pathVariations)];
                            uniquePaths.forEach(variation => {
                                window.assetManager.cache[variation] = img;
                            });
                            
                            console.log('Loaded image:', fileName, 'cached under', uniquePaths.length, 'variations:', uniquePaths);
                            resolve();
                        };
                        img.onerror = (error) => {
                            console.warn('Failed to load image:', assetUrl, error);
                            resolve();
                        };
                        img.src = assetUrl;
                    });
                } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
                    // FIXED: Proper audio loading
                    const response = await fetch(assetUrl);
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    
                    const audio = new Audio();
                    audio.crossOrigin = 'anonymous';
                    
                    await new Promise((resolve) => {
                        audio.addEventListener('canplaythrough', () => {
                            const assetId = fileName.replace(/\\.[^.]+$/, '');
                            const normalizedOriginalPath = originalPath.replace(/^[\/\\\\]+/, '');
                            
                            const pathVariations = [
                                originalPath,
                                normalizedOriginalPath,
                                fileName,
                                assetId,
                                '/' + normalizedOriginalPath,
                                originalPath.split('/').pop(),
                                originalPath.split('\\\\').pop(),
                                assetId.toLowerCase(),
                                fileName.toLowerCase()
                            ];
                            
                            const uniquePaths = [...new Set(pathVariations)];
                            uniquePaths.forEach(variation => {
                                window.assetManager.cache[variation] = audio;
                            });
                            
                            console.log('Loaded audio:', fileName);
                            resolve();
                        }, { once: true });
                        
                        audio.addEventListener('error', () => {
                            console.warn('Failed to load audio:', assetUrl);
                            resolve();
                        }, { once: true });
                        
                        audio.src = objectUrl;
                        audio.load();
                    });
                } else if (extension === 'json') {
                    const response = await fetch(assetUrl);
                    const jsonData = await response.json();
                    const assetId = fileName.replace(/\\.[^.]+$/, '');
                    const normalizedOriginalPath = originalPath.replace(/^[\/\\\\]+/, '');
                    
                    const pathVariations = [
                        originalPath,
                        normalizedOriginalPath,
                        fileName,
                        assetId,
                        '/' + normalizedOriginalPath
                    ];
                    
                    const uniquePaths = [...new Set(pathVariations)];
                    uniquePaths.forEach(variation => {
                        window.assetManager.cache[variation] = jsonData;
                    });
                    
                    console.log('Loaded JSON:', fileName);
                }
            } catch (error) {
                console.warn('Error loading asset:', originalPath, error);
            }

            loadedCount++;
            setLoadingProgress(Math.round((loadedCount / totalAssets) * 100));
        }
        
        console.log('Finished loading assets. Cache keys:', Object.keys(window.assetManager.cache));
    }` : `
    console.log('ZIP mode: Asset loading disabled');`}`}

    
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

    // Override AssetManager methods for ZIP mode
    ${!settings.standalone ? `
    // ZIP mode - Override AssetManager methods to handle dynamic loading
    console.log('ZIP mode: Setting up enhanced asset loading...');
    
    // Store the asset mapping for reference
    window.assetManager.assetMapping = ${assetMapping};
    
    // Override getAsset to handle asset ID lookups with mapping
    window.assetManager.originalGetAsset = window.assetManager.getAsset;
    window.assetManager.getAsset = function(assetId) {
        // First try direct cache lookup
        if (this.cache[assetId]) {
            console.log('Found asset in cache:', assetId);
            return this.cache[assetId];
        }
        
        // Try to find the asset using the mapping
        if (this.assetMapping) {
            for (const [originalPath, fileName] of Object.entries(this.assetMapping)) {
                const fileNameWithoutExt = fileName.replace(/\\.[^.]+$/, '');
                
                // Check if the assetId matches any part of the original path or filename
                if (assetId === fileNameWithoutExt || 
                    assetId === fileName || 
                    assetId === originalPath ||
                    originalPath.includes(assetId) ||
                    fileName.includes(assetId)) {
                    
                    // Try to find it in cache under various keys
                    const possibleKeys = [
                        fileNameWithoutExt,
                        fileName,
                        originalPath,
                        originalPath.replace(/^[\/\\\\]+/, ''),
                        '/' + originalPath.replace(/^[\/\\\\]+/, '')
                    ];
                    
                    for (const key of possibleKeys) {
                        if (this.cache[key]) {
                            console.log('Found mapped asset for ID "' + assetId + '" using cache key "' + key + '"');
                            this.cache[assetId] = this.cache[key]; // Cache under requested ID too
                            return this.cache[key];
                        }
                    }
                }
            }
        }
        
        // Try variations of the asset ID as fallback
        const possiblePaths = [
            assetId,
            assetId + '.png',
            assetId + '.jpg',
            assetId + '.jpeg',
            assetId + '.gif',
            assetId + '.webp',
            assetId + '.svg',
            assetId + '.mp3',
            assetId + '.wav',
            assetId + '.ogg',
            assetId + '.json'
        ];
        
        for (const path of possiblePaths) {
            if (this.cache[path]) {
                this.cache[assetId] = this.cache[path];
                console.log('Found asset for ID "' + assetId + '" using fallback cache key "' + path + '"');
                return this.cache[path];
            }
        }
        
        console.warn('Asset not found for ID:', assetId);
        console.log('Available cache keys:', Object.keys(this.cache));
        console.log('Asset mapping:', this.assetMapping);
        return null;
    };
    
    // Override loadAsset for dynamic loading from assets folder
    window.assetManager.originalLoadAsset = window.assetManager.loadAsset;
    window.assetManager.loadAsset = function(path) {
        const normalizedPath = this.normalizePath(path);
        
        console.log('Loading asset with path:', path, 'normalized:', normalizedPath);
        
        // First check if asset is already in cache under any variation
        const pathVariations = [
            path,
            normalizedPath,
            path.replace(/^[\/\\\\]+/, ''),
            normalizedPath.replace(/^[\/\\\\]+/, ''),
            path.split('/').pop(),
            normalizedPath.split('/').pop(),
            path.split('/').pop().replace(/\\.[^.]+$/, ''),
            normalizedPath.split('/').pop().replace(/\\.[^.]+$/, '')
        ];
        
        for (const variation of pathVariations) {
            if (this.cache[variation]) {
                console.log('Found cached asset for path:', path, 'using variation:', variation);
                return Promise.resolve(this.cache[variation]);
            }
        }
        
        // Try to find in asset mapping
        let targetFileName = null;
        if (this.assetMapping) {
            // Direct lookup in mapping
            if (this.assetMapping[path] || this.assetMapping[normalizedPath]) {
                targetFileName = this.assetMapping[path] || this.assetMapping[normalizedPath];
            } else {
                // Search for matching paths
                for (const [originalPath, fileName] of Object.entries(this.assetMapping)) {
                    if (originalPath.includes(path) || 
                        originalPath.includes(normalizedPath) ||
                        path.includes(originalPath.split('/').pop()) ||
                        normalizedPath.includes(originalPath.split('/').pop())) {
                        targetFileName = fileName;
                        break;
                    }
                }
            }
        }
        
        // Fallback to extracting filename from path
        if (!targetFileName) {
            targetFileName = normalizedPath.split('/').pop();
        }
        
        const assetUrl = 'assets/' + targetFileName;
        console.log('Loading asset dynamically from:', assetUrl);
        
        return fetch(assetUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Asset not found: ' + assetUrl);
                }
                
                const extension = targetFileName.split('.').pop().toLowerCase();
                const assetId = targetFileName.replace(/\\.[^.]+$/, '');
                
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
                    return response.blob().then(blob => {
                        const url = URL.createObjectURL(blob);
                        return new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                                URL.revokeObjectURL(url);
                                
                                // Cache under ALL possible variations
                                const allVariations = [
                                    ...pathVariations,
                                    targetFileName,
                                    assetId,
                                    assetUrl
                                ];
                                
                                allVariations.forEach(variation => {
                                    this.cache[variation] = img;
                                });
                                
                                console.log('Dynamically loaded and cached image asset:', assetId, 'under', allVariations.length, 'variations');
                                resolve(img);
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject(new Error('Failed to load image: ' + targetFileName));
                            };
                            img.src = url;
                        });
                    });
                } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
                    return response.blob().then(blob => {
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio();
                        audio.crossOrigin = 'anonymous';
                        audio.src = url;
                        
                        // Cache under all variations
                        const allVariations = [...pathVariations, targetFileName, assetId, assetUrl];
                        allVariations.forEach(variation => {
                            this.cache[variation] = audio;
                        });
                        
                        console.log('Dynamically loaded audio asset:', assetId);
                        return audio;
                    });
                } else if (extension === 'json') {
                    return response.json().then(data => {
                        // Cache under all variations
                        const allVariations = [...pathVariations, targetFileName, assetId, assetUrl];
                        allVariations.forEach(variation => {
                            this.cache[variation] = data;
                        });
                        
                        console.log('Dynamically loaded JSON asset:', assetId);
                        return data;
                    });
                } else {
                    return response.text().then(text => {
                        // Cache under all variations
                        const allVariations = [...pathVariations, targetFileName, assetId, assetUrl];
                        allVariations.forEach(variation => {
                            this.cache[variation] = text;
                        });
                        
                        console.log('Dynamically loaded text asset:', assetId);
                        return text;
                    });
                }
            })
            .catch(error => {
                console.error('Failed to load asset:', assetUrl, 'Original path:', path, 'Error:', error);
                throw error;
            });
    };` : ''}
    
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
            scenes: ${this.safeStringify(data.scenes)},
            assets: ${settings.includeAssets ? this.safeStringify(data.assets) : 'null'},
            prefabs: ${this.safeStringify(data.prefabs)}
        };
    } catch (error) {
        console.error('Error parsing game data:', error);
        loadingScreen.innerHTML = '<div>Error loading game data: ' + error.message + '</div>';
        return;
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

    if (gameData.prefabs && Object.keys(gameData.prefabs).length > 0) {
        console.log('Loading', Object.keys(gameData.prefabs).length, 'prefabs...');
        
        // Load into global prefab manager first
        window.prefabManager.loadPrefabs(gameData.prefabs);
        
        // Then load into engine
        if (typeof engine.loadPrefabs === 'function') {
            engine.loadPrefabs(gameData.prefabs);
        }
        
        console.log('Prefabs loaded. Available in global manager:', window.prefabManager.getAllPrefabNames());
        console.log('Available in engine:', engine.getAvailablePrefabs());
    } else {
        console.warn('No prefabs found in game data');
    }
    
    engine.updateFPSLimit(${maxFPS});
    
    this.ctx = canvas.ctx;
    
    // Make engine globally available for prefab instantiation
    window.engine = engine;
    
    // CRITICAL: Load prefabs into the engine BEFORE scene loading
    if (gameData.prefabs) {
        console.log('Loading prefabs into engine...');
        engine.loadPrefabs(gameData.prefabs);
        
        // Also ensure global prefab manager has the data
        if (window.prefabManager && typeof window.prefabManager.loadPrefabs === 'function') {
            window.prefabManager.loadPrefabs(gameData.prefabs);
        }
        
        console.log('Prefabs loaded. Available prefabs:', engine.getAvailablePrefabs());
    }

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
document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            // Hide button and loading screen
            startBtn.style.display = 'none';
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';

            // Resume AudioContext if needed
            if (window.melodicode && window.melodicode.audioEngine && window.melodicode.audioEngine.context) {
                window.melodicode.audioEngine.context.resume();
            }

            // Trigger game initialization if not already started
            if (typeof initializeGame === 'function') {
                initializeGame();
            }
        });
    }
});
`;
    }

    /**
     * Create asset mapping for ZIP mode (original path -> filename)
     * Enhanced to handle all path variations and edge cases
     */
    createAssetMapping(assets) {
        if (!assets) return {};

        const mapping = {};

        for (const originalPath of Object.keys(assets)) {
            const fileName = originalPath.split('/').pop();

            // Create comprehensive mapping for all possible path variations
            const pathVariations = [
                originalPath,
                originalPath.replace(/^[\/\\]+/, ''), // Remove leading slashes
                fileName,
                originalPath.split('/').pop(),
                originalPath.split('\\').pop(), // Handle Windows paths
                '/' + originalPath.replace(/^[\/\\]+/, ''), // Add leading slash
                originalPath.replace(/^[\/\\]+/, '').split('/').pop(), // Just filename
            ];

            // Add all variations to mapping
            pathVariations.forEach(variation => {
                if (variation && !mapping[variation]) {
                    mapping[variation] = fileName;
                }
            });

            // Also map the original path to filename
            mapping[originalPath] = fileName;
        }

        console.log('Created comprehensive asset mapping:', mapping);
        return mapping;
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
            // Check if the data is too large to safely stringify
            const dataSize = this.estimateDataSize(data);

            // If data is larger than 100MB, warn and consider using ZIP mode instead
            if (dataSize > 100 * 1024 * 1024) {
                console.warn('Data size is very large (' + Math.round(dataSize / 1024 / 1024) + 'MB). Consider using ZIP export mode instead.');

                // For standalone mode with huge assets, we need to be more careful
                // Try to chunk the data or reduce asset size
                if (data.assets && Object.keys(data.assets).length > 0) {
                    console.warn('Large asset data detected. Consider using ZIP export mode for better performance.');
                }
            }

            // Use JSON.stringify directly without additional escaping
            // The browser's JSON.stringify is optimized and handles special characters correctly
            return JSON.stringify(data);

        } catch (error) {
            console.error('Error in safeStringify:', error);

            // If we get a range error, the data is too large
            if (error instanceof RangeError) {
                console.error('Data is too large to stringify. Please use ZIP export mode or reduce asset sizes.');
                throw new Error('Export data too large. Please use ZIP export mode instead of standalone HTML.');
            }

            return 'null';
        }
    }

    /**
     * Estimate the size of data in bytes
     * @param {*} data - Data to estimate
     * @returns {number} - Estimated size in bytes
     */
    estimateDataSize(data) {
        if (data === null || data === undefined) {
            return 0;
        }

        try {
            // Quick estimation by converting to string and measuring length
            // This is much faster than actually stringifying everything
            let size = 0;

            if (typeof data === 'string') {
                // Strings: roughly 2 bytes per character (UTF-16)
                size = data.length * 2;
            } else if (typeof data === 'object') {
                if (Array.isArray(data)) {
                    // Arrays: sum of all elements
                    for (const item of data) {
                        size += this.estimateDataSize(item);
                    }
                } else {
                    // Objects: sum of keys and values
                    for (const [key, value] of Object.entries(data)) {
                        size += key.length * 2; // Key size
                        size += this.estimateDataSize(value); // Value size
                    }
                }
            } else {
                // Primitives: minimal size
                size = 8;
            }

            return size;
        } catch (error) {
            console.warn('Error estimating data size:', error);
            return 0;
        }
    }

    /**
     * Estimate the final export file size with better accuracy
     * @param {Object} exportData - The collected export data
     * @param {Object} settings - Export settings
     * @returns {Object} - Size estimates in bytes
     */
    async estimateExportSize(exportData, settings) {
        const estimates = {
            html: 0,
            css: 0,
            js: 0,
            assets: 0,
            total: 0,
            compressed: 0
        };

        try {
            // Estimate HTML size (base template + embedded content)
            const baseHTMLSize = 15000; // Base HTML template size
            estimates.html = baseHTMLSize;

            // Estimate CSS size
            const baseCSSSize = 20000; // Base CSS size
            estimates.css = baseCSSSize;

            // Estimate JavaScript size (engine + modules + game code)
            let jsSize = 0;

            // Engine files
            for (const filePath of exportData.engineFiles || []) {
                try {
                    const content = await this.loadFileContent(filePath);
                    jsSize += content.length;
                } catch (error) {
                    console.warn(`Could not estimate size for ${filePath}:`, error);
                    jsSize += 50000; // Estimate 50KB per engine file
                }
            }

            // Custom modules
            for (const module of exportData.modules || []) {
                try {
                    const content = await this.loadFileContent(module.filePath);
                    jsSize += content.length;
                } catch (error) {
                    console.warn(`Could not estimate size for module ${module.filePath}:`, error);
                    jsSize += 10000; // Estimate 10KB per module
                }
            }

            // Custom scripts
            for (const script of exportData.customScripts || []) {
                jsSize += (script.content || '').length;
            }

            // Game initialization code (estimated)
            jsSize += 50000; // Estimate 50KB for game init code

            estimates.js = jsSize;

            // Estimate assets size (now using deduplicated assets)
            if (settings.includeAssets && exportData.assets) {
                for (const [path, asset] of Object.entries(exportData.assets)) {
                    if (asset.size !== undefined) {
                        // Use pre-calculated size if available
                        estimates.assets += asset.size;
                    } else if (asset.content) {
                        // Fallback to calculating size
                        const assetSize = this.estimateAssetSize(asset.content, asset.type);
                        estimates.assets += assetSize;
                    } else {
                        // Estimate based on file type if no content available
                        const extension = path.split('.').pop().toLowerCase();
                        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
                            estimates.assets += 50000; // Estimate 50KB per image
                        } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
                            estimates.assets += 100000; // Estimate 100KB per audio file
                        } else {
                            estimates.assets += 10000; // Estimate 10KB for other assets
                        }
                    }
                }

                console.log(`Estimated assets size: ${this.formatFileSize(estimates.assets)} for ${Object.keys(exportData.assets).length} assets`);
            }

            // Apply compression estimates
            if (settings.compressAssets) {
                // Image compression typically reduces size by 30-70%
                estimates.assets = Math.ceil(estimates.assets * 0.5);
            }

            if (settings.minifyCode) {
                // Code minification typically reduces size by 20-40%
                estimates.js = Math.ceil(estimates.js * 0.7);
                estimates.css = Math.ceil(estimates.css * 0.8);
            }

            if (settings.obfuscateCode) {
                // Obfuscation can reduce size further by 10-20%
                estimates.js = Math.ceil(estimates.js * 0.85);
            }

            // Calculate total
            estimates.total = estimates.html + estimates.css + estimates.js + estimates.assets;

            // For standalone mode, account for JSON overhead in embedding
            if (settings.standalone) {
                estimates.total += 10000; // JSON structure overhead
            }

            return estimates;

        } catch (error) {
            console.warn('Error estimating export size:', error);
            // Return conservative estimates as fallback
            return {
                html: 15000,
                css: 20000,
                js: 500000,
                assets: 1000000,
                total: 2000000,
                compressed: 1500000
            };
        }
    }

    /**
     * Format bytes into human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} - Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Check if estimated size exceeds limits and return warnings
     * @param {Object} sizeEstimates - Size estimates from estimateExportSize
     * @param {Object} settings - Export settings
     * @returns {Array} - Array of warning messages
     */
    checkSizeLimits(sizeEstimates, settings) {
        const warnings = [];
        const maxSizeBytes = (settings.maxFileSizeMB || 250) * 1024 * 1024;

        if (sizeEstimates.total > maxSizeBytes) {
            warnings.push(`Export size (${this.formatFileSize(sizeEstimates.total)}) exceeds recommended limit (${this.formatFileSize(maxSizeBytes)}). Consider using ZIP export mode or reducing asset sizes.`);
        }

        if (sizeEstimates.total > 100 * 1024 * 1024) { // 100MB
            warnings.push('Export size is very large and may cause browser memory issues. Consider using ZIP export mode.');
        }

        if (settings.standalone && sizeEstimates.total > 50 * 1024 * 1024) { // 50MB for standalone
            warnings.push('Standalone HTML export with large files may fail. Strongly recommend using ZIP export mode.');
        }

        return warnings;
    }

    /**
     * Create standalone HTML file
     */
    createStandaloneHTML(html, js, css, data, settings) {
        try {
            // Check total size before processing
            const estimatedJSSize = js.length;
            const estimatedCSSSize = css.length;
            const estimatedHTMLSize = html.length;
            const totalSize = estimatedJSSize + estimatedCSSSize + estimatedHTMLSize;

            console.log('Export size estimate:');
            console.log('  JavaScript:', Math.round(estimatedJSSize / 1024), 'KB');
            console.log('  CSS:', Math.round(estimatedCSSSize / 1024), 'KB');
            console.log('  HTML:', Math.round(estimatedHTMLSize / 1024), 'KB');
            console.log('  Total:', Math.round(totalSize / 1024 / 1024), 'MB');

            // Warn if approaching browser limits (250MB as safe threshold)
            if (totalSize > 250 * 1024 * 1024) {
                throw new Error('Export file too large (' + Math.round(totalSize / 1024 / 1024) + 'MB). Please use ZIP export mode or reduce asset sizes.');
            }

            // Minify CSS separately if enabled
            let finalCSS = css;
            if (settings.minifyCode) {
                try {
                    finalCSS = this.minifyCSS(css);
                    console.log('CSS minified:', Math.round(css.length / 1024), 'KB ->', Math.round(finalCSS.length / 1024), 'KB');
                } catch (cssError) {
                    console.warn('CSS minification failed, using original:', cssError);
                    finalCSS = css;
                }
            }

            // Build the final HTML in chunks to avoid string length issues
            let finalHtml = html;

            // Replace CSS placeholder
            try {
                finalHtml = finalHtml.replace('/* CSS will be injected here */', finalCSS);
            } catch (error) {
                console.error('Failed to inject CSS:', error);
                throw new Error('Failed to embed CSS. File may be too large.');
            }

            // Replace JS placeholder
            try {
                finalHtml = finalHtml.replace('/* JavaScript will be injected here */', js);
            } catch (error) {
                console.error('Failed to inject JavaScript:', error);
                throw new Error('Failed to embed JavaScript. File may be too large.');
            }

            // Only minify HTML if specifically enabled - and do it carefully
            if (settings.minifyCode) {
                try {
                    const beforeMinify = finalHtml.length;
                    finalHtml = this.minifyHTML(finalHtml);
                    console.log('HTML minified:', Math.round(beforeMinify / 1024), 'KB ->', Math.round(finalHtml.length / 1024), 'KB');
                } catch (htmlError) {
                    console.warn('HTML minification failed, using original:', htmlError);
                    // Keep the unminified version
                }
            }

            console.log('Final export size:', Math.round(finalHtml.length / 1024 / 1024), 'MB');

            return finalHtml;

        } catch (error) {
            console.error('Error creating standalone HTML:', error);

            // Provide helpful error message
            if (error instanceof RangeError || error.message.includes('too large')) {
                throw new Error('Export file too large for standalone HTML mode. Please use ZIP export mode instead, or reduce asset sizes by:\n1. Compressing images\n2. Using lower quality audio files\n3. Removing unused assets');
            }

            throw error;
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
        <!-- Size Estimation Display -->
        <div id="export-size-estimation" class="export-size-display" style="display: none;">
            <h3>Estimated Export Size</h3>
            <div class="size-breakdown">
                <div class="size-item">
                    <span class="size-label">HTML:</span>
                    <span class="size-value" id="size-html">-</span>
                </div>
                <div class="size-item">
                    <span class="size-label">CSS:</span>
                    <span class="size-value" id="size-css">-</span>
                </div>
                <div class="size-item">
                    <span class="size-label">JavaScript:</span>
                    <span class="size-value" id="size-js">-</span>
                </div>
                <div class="size-item">
                    <span class="size-label">Assets:</span>
                    <span class="size-value" id="size-assets">-</span>
                </div>
                <div class="size-item size-total">
                    <span class="size-label">Total:</span>
                    <span class="size-value" id="size-total">-</span>
                </div>
            </div>
            <div id="size-warnings" class="size-warnings"></div>
        </div>
        <div class="export-group">
            <label>Game Title:</label>
            <input type="text" id="export-title" value="${this.exportSettings.customTitle}" placeholder="My Awesome Game">
        </div>
        <div class="export-group">
            <label>Description:</label>
            <textarea id="export-description" placeholder="A game created with Dark Matter JS">${this.exportSettings.customDescription}</textarea>
        </div>
        <div class="export-group">
            <label>Loading Background Color:</label>
            <input type="color" id="export-loading-bg" value="${this.exportSettings.loadingBg || '#111'}">
        </div>
        <div class="export-group">
            <label>Loading Screen Logo:</label>
            <input type="file" id="export-logo" accept="image/*">
            <small>(Optional. If not set, uses default Dark Matter logo.)</small>
        </div>
        <div class="export-group">
            <label>Loading Text:</label>
            <input type="text" id="export-loading-text" value="${this.exportSettings.loadingText || 'Loading Game...'}" placeholder="Loading Game...">
        </div>
        <div class="export-group">
            <label>Progress Bar Color:</label>
            <input type="color" id="export-progress-color" value="${this.exportSettings.progressColor || '#09f'}">
        </div>
        <div class="export-group">
            <label>Spinner/Start button Color:</label>
            <input type="color" id="export-spinner-color" value="${this.exportSettings.spinnerColor || '#09f'}">
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
                <option value="zip">ZIP Package (Recommended for projects with many assets)</option>
                <option value="standalone" ${this.exportSettings.standalone ? 'selected' : ''}>Standalone HTML (Single file, may fail for large projects)</option>
            </select>
            <small style="color: #888;">ZIP mode creates separate asset files and works better with large projects.</small>
        </div>
        <div class="export-group">
            <label>
                <input type="checkbox" id="export-include-assets" ${this.exportSettings.includeAssets ? 'checked' : ''}>
                Include Assets
            </label>
        </div>
        <div class="export-group">
            <label>
                <input type="checkbox" id="export-minify-code" ${this.exportSettings.minifyCode ? 'checked' : ''}>
                Minify Code (Reduces file size significantly)
            </label>
        </div>
        <div class="export-group">
            <label>
                <input type="checkbox" id="export-obfuscate-code" ${this.exportSettings.obfuscateCode ? 'checked' : ''}>
                Obfuscate Code (Makes code harder to read/edit)
            </label>
            <small style="color: #888;">Note: Obfuscation automatically enables minification and may increase export time.</small>
        </div>
        <div class="export-group">
            <label>
                <input type="checkbox" id="export-compress-assets" ${this.exportSettings.compressAssets ? 'checked' : ''}>
                Compress Assets (Reduces image file sizes)
            </label>
            <small style="color: #888;">Compresses images to reduce export file size. May affect image quality.</small>
        </div>
        <div class="export-group" id="compression-quality-group" style="display: none;">
            <label for="export-compression-quality">Compression Quality:</label>
            <select id="export-compression-quality">
                <option value="0.9" ${this.exportSettings.compressionQuality === 0.9 ? 'selected' : ''}>High (90% - Best quality)</option>
                <option value="0.8" ${this.exportSettings.compressionQuality === 0.8 ? 'selected' : ''}>Good (80% - Balanced)</option>
                <option value="0.7" ${this.exportSettings.compressionQuality === 0.7 ? 'selected' : ''}>Medium (70% - Good compression)</option>
                <option value="0.5" ${this.exportSettings.compressionQuality === 0.5 ? 'selected' : ''}>Low (50% - Maximum compression)</option>
            </select>
            <small style="color: #888;">Lower quality = smaller file size, but reduced image quality.</small>
        </div>
        <div class="export-group">
            <label for="export-max-size">Max File Size (MB):</label>
            <select id="export-max-size">
                <option value="100" ${this.exportSettings.maxFileSizeMB === 100 ? 'selected' : ''}>100 MB</option>
                <option value="250" ${this.exportSettings.maxFileSizeMB === 250 ? 'selected' : ''}>250 MB (Recommended)</option>
                <option value="500" ${this.exportSettings.maxFileSizeMB === 500 ? 'selected' : ''}>500 MB</option>
                <option value="1000" ${this.exportSettings.maxFileSizeMB === 1000 ? 'selected' : ''}>1 GB</option>
            </select>
            <small style="color: #888;">Warning threshold for large exports. ZIP mode recommended for large projects.</small>
        </div>
    </div>
    <div class="export-modal-footer">
        <button id="export-cancel">Cancel</button>
        <button id="export-start" class="primary">Export Game</button>
    </div>
</div>
`;

        document.body.appendChild(modal);

        // Auto-enable minify when obfuscate is checked
        const obfuscateCheckbox = modal.querySelector('#export-obfuscate-code');
        const minifyCheckbox = modal.querySelector('#export-minify-code');

        obfuscateCheckbox.addEventListener('change', () => {
            if (obfuscateCheckbox.checked) {
                minifyCheckbox.checked = true;
                minifyCheckbox.disabled = true;
            } else {
                minifyCheckbox.disabled = false;
            }
        });

        // Show/hide compression quality setting
        const compressCheckbox = modal.querySelector('#export-compress-assets');
        const qualityGroup = modal.querySelector('#compression-quality-group');

        compressCheckbox.addEventListener('change', () => {
            if (compressCheckbox.checked) {
                qualityGroup.style.display = 'block';
            } else {
                qualityGroup.style.display = 'none';
            }
        });

        // Initialize compression quality visibility
        if (compressCheckbox.checked) {
            qualityGroup.style.display = 'block';
        }

        // Size estimation and preview functionality
        async function updateSizeEstimation() {
            const sizeDisplay = modal.querySelector('#export-size-estimation');
            const sizeWarnings = modal.querySelector('#size-warnings');

            try {
                // Get current settings
                const currentSettings = {
                    includeAssets: modal.querySelector('#export-include-assets').checked,
                    minifyCode: modal.querySelector('#export-minify-code').checked,
                    obfuscateCode: modal.querySelector('#export-obfuscate-code').checked,
                    compressAssets: modal.querySelector('#export-compress-assets').checked,
                    compressionQuality: parseFloat(modal.querySelector('#export-compression-quality').value),
                    maxFileSizeMB: parseInt(modal.querySelector('#export-max-size').value),
                    standalone: modal.querySelector('#export-format').value === 'standalone'
                };

                // Get project data for estimation
                const project = {
                    name: modal.querySelector('#export-title').value || 'game',
                    scenes: window.editor ? window.editor.scenes : []
                };

                if (project.scenes.length === 0) {
                    sizeDisplay.style.display = 'none';
                    return;
                }

                // Collect export data for size estimation
                const exportManager = window.exportManager;
                const originalSettings = { ...exportManager.exportSettings };
                exportManager.exportSettings = { ...originalSettings, ...currentSettings };

                const exportData = await exportManager.collectExportData(project, currentSettings);

                // Get size estimates
                const sizeEstimates = await exportManager.estimateExportSize(exportData, currentSettings);
                const warnings = exportManager.checkSizeLimits(sizeEstimates, currentSettings);

                // Update display
                modal.querySelector('#size-html').textContent = exportManager.formatFileSize(sizeEstimates.html);
                modal.querySelector('#size-css').textContent = exportManager.formatFileSize(sizeEstimates.css);
                modal.querySelector('#size-js').textContent = exportManager.formatFileSize(sizeEstimates.js);
                modal.querySelector('#size-assets').textContent = exportManager.formatFileSize(sizeEstimates.assets);
                modal.querySelector('#size-total').textContent = exportManager.formatFileSize(sizeEstimates.total);

                // Show warnings
                if (warnings.length > 0) {
                    sizeWarnings.innerHTML = warnings.map(w => `<div class="warning-item">${w}</div>`).join('');
                } else {
                    sizeWarnings.innerHTML = '';
                }

                sizeDisplay.style.display = 'block';

                // Restore original settings
                exportManager.exportSettings = originalSettings;

            } catch (error) {
                console.warn('Error updating size estimation:', error);
                sizeDisplay.style.display = 'none';
            }
        }

        // Update size estimation when settings change
        const updateTriggers = [
            '#export-include-assets',
            '#export-minify-code',
            '#export-obfuscate-code',
            '#export-compress-assets',
            '#export-compression-quality',
            '#export-max-size',
            '#export-format'
        ];

        updateTriggers.forEach(selector => {
            const element = modal.querySelector(selector);
            if (element) {
                element.addEventListener('change', updateSizeEstimation);
            }
        });

        // Initial size estimation
        setTimeout(updateSizeEstimation, 100);

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
                loadingBg: modal.querySelector('#export-loading-bg').value,
                loadingText: modal.querySelector('#export-loading-text').value,
                progressColor: modal.querySelector('#export-progress-color').value,
                spinnerColor: modal.querySelector('#export-spinner-color').value,
                startingSceneIndex: parseInt(modal.querySelector('#export-starting-scene').value) || 0,
                maxFPS: parseInt(modal.querySelector('#export-max-fps').value) || 60,
                useWebGL: modal.querySelector('#export-webgl').value === 'true',
                standalone: modal.querySelector('#export-format').value === 'standalone',
                includeAssets: modal.querySelector('#export-include-assets').checked,
                minifyCode: modal.querySelector('#export-minify-code').checked,
                obfuscateCode: modal.querySelector('#export-obfuscate-code').checked,
                compressAssets: modal.querySelector('#export-compress-assets').checked,
                compressionQuality: parseFloat(modal.querySelector('#export-compression-quality').value),
                maxFileSizeMB: parseInt(modal.querySelector('#export-max-size').value)
            };

            // Check for large projects and recommend ZIP mode
            if (settings.standalone && settings.includeAssets) {
                const assetCount = Object.keys(await this.collectAssets()).length;
                if (assetCount > 20) {
                    const proceed = confirm(
                        `Your project has ${assetCount} assets. Standalone HTML mode may fail with large projects.\n\n` +
                        `Recommendation: Use ZIP export mode for better reliability.\n\n` +
                        `Continue with standalone export anyway?`
                    );

                    if (!proceed) {
                        return;
                    }
                }
            }

            // Obfuscation requires minification
            if (settings.obfuscateCode) {
                settings.minifyCode = true;
            }

            // Handle logo image if provided
            let logoImage = null;
            const logoInput = modal.querySelector('#export-logo');
            if (logoInput && logoInput.files && logoInput.files[0]) {
                logoImage = await this.fileToDataURL(logoInput.files[0]);
            }

            // If no logo selected, convert loading.png to base64
            if (!logoImage) {
                logoImage = await this.filePathToDataURL('loading.png');
                if (!logoImage) logoImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...";
            }
            settings.logoImage = logoImage;

            document.body.removeChild(modal);

            try {
                // Show loading indicator
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'export-loading';
                loadingDiv.innerHTML = `
        <div class="export-loading-content">
            <div class="export-loading-spinner"></div>
            <div>Exporting game${settings.obfuscateCode ? ' with obfuscation, which takes longer' : ''}
            ... Please wait${settings.obfuscateCode ? ' patiently' : ''}.</div>
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
                const features = [];
                if (settings.useWebGL) features.push('WebGL');
                else features.push('Canvas 2D');
                if (settings.obfuscateCode) features.push('obfuscated');
                else if (settings.minifyCode) features.push('minified');
                successDiv.textContent = `Game exported successfully (${features.join(', ')})!`;
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
                //document.body.removeChild(modal);
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

    async minifyJavaScriptAdvanced(code, obfuscate = false) {
        // Check if Terser is available
        if (typeof Terser !== 'undefined') {
            try {
                const options = {
                    compress: {
                        dead_code: true,
                        drop_console: false,
                        drop_debugger: obfuscate,
                        conditionals: true,
                        evaluate: true,
                        booleans: true,
                        loops: true,
                        unused: true,
                        hoist_funs: false,
                        keep_fargs: !obfuscate,
                        hoist_vars: false,
                        if_return: true,
                        join_vars: true,
                        side_effects: true,
                        warnings: false,
                        passes: obfuscate ? 3 : 1
                    },
                    mangle: obfuscate ? {
                        // Aggressive mangling for obfuscation
                        toplevel: true,
                        keep_classnames: false,
                        keep_fnames: false,
                        reserved: [
                            // Core engine classes
                            'Matter', 'Engine', 'Scene', 'GameObject', 'Module',
                            'Vector2', 'Vector3', 'InputManager', 'AssetManager',
                            'ModuleRegistry', 'PhysicsManager',
                            // Important functions
                            'initializeGame', 'createGameObjectFromData',
                            // DOM elements and events
                            'document', 'window', 'console',
                            // MelodiCode
                            'melodicode', 'audioEngine', 'context'
                        ]
                    } : {
                        // Conservative mangling for minification only
                        toplevel: false,
                        keep_classnames: true,
                        keep_fnames: true,
                        reserved: [
                            'Matter', 'Engine', 'Scene', 'GameObject', 'Module',
                            'Vector2', 'Vector3', 'InputManager', 'AssetManager',
                            'ModuleRegistry', 'PhysicsManager',
                            'initializeGame', 'createGameObjectFromData',
                            'document', 'window', 'console',
                            'melodicode', 'audioEngine', 'context'
                        ]
                    },
                    output: {
                        comments: false,
                        beautify: false,
                        semicolons: true,
                        ascii_only: obfuscate
                    }
                };

                // Add extra obfuscation techniques
                if (obfuscate) {
                    options.compress.sequences = true;
                    options.compress.properties = true;
                    options.compress.unsafe = true;
                    options.compress.unsafe_comps = true;
                    options.compress.unsafe_math = true;
                    options.compress.unsafe_proto = true;
                    options.compress.unsafe_regexp = true;
                    // Don't mangle properties - this can break things
                    // options.mangle.properties = { regex: /^_/ };
                }

                const result = await Terser.minify(code, options);

                if (result.error) {
                    throw result.error;
                }

                const reduction = Math.round((1 - result.code.length / code.length) * 100);
                console.log(`${obfuscate ? 'Obfuscated and minified' : 'Minified'} code: ${code.length} -> ${result.code.length} bytes (${reduction}% reduction)`);
                return result.code;
            } catch (error) {
                console.warn('Terser minification failed, using original code:', error);
                return code;
            }
        } else {
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
        if (!css) return css;

        try {
            return css
                // Remove all comments
                .replace(/\/\*[\s\S]*?\*\//g, '')
                // Remove whitespace around selectors and properties
                .replace(/\s*([{}:;,>+~])\s*/g, '$1')
                // Remove whitespace before !important
                .replace(/\s*!important/g, '!important')
                // Remove last semicolon in a block
                .replace(/;}/g, '}')
                // Remove empty rules
                .replace(/[^\}]+\{\}/g, '')
                // Compress multiple spaces/newlines to single space
                .replace(/\s+/g, ' ')
                // Remove spaces around combinators
                .replace(/\s*([>+~])\s*/g, '$1')
                // Remove leading/trailing whitespace
                .trim();
        } catch (error) {
            console.warn('Error minifying CSS:', error);
            return css;
        }
    }

    /**
     * Minify HTML content
     * @param {string} html - HTML content to minify
     * @returns {string} - Minified HTML content
     */
    minifyHTML(html) {
        if (!html) return html;

        try {
            // Store script and style blocks to preserve them
            const preservedBlocks = [];
            let blockIndex = 0;

            // Preserve script blocks
            html = html.replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/gi, (match) => {
                const placeholder = `___PRESERVED_BLOCK_${blockIndex}___`;
                preservedBlocks[blockIndex] = match;
                blockIndex++;
                return placeholder;
            });

            // Preserve style blocks
            html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (match) => {
                const placeholder = `___PRESERVED_BLOCK_${blockIndex}___`;
                preservedBlocks[blockIndex] = match;
                blockIndex++;
                return placeholder;
            });

            // Preserve pre and textarea content
            html = html.replace(/(<pre[^>]*>)([\s\S]*?)(<\/pre>)/gi, (match) => {
                const placeholder = `___PRESERVED_BLOCK_${blockIndex}___`;
                preservedBlocks[blockIndex] = match;
                blockIndex++;
                return placeholder;
            });

            html = html.replace(/(<textarea[^>]*>)([\s\S]*?)(<\/textarea>)/gi, (match) => {
                const placeholder = `___PRESERVED_BLOCK_${blockIndex}___`;
                preservedBlocks[blockIndex] = match;
                blockIndex++;
                return placeholder;
            });

            // Now minify the HTML
            html = html
                // Remove HTML comments (but keep conditional comments)
                .replace(/<!--(?!\[if|\s*<!)[\s\S]*?-->/g, '')
                // Remove whitespace between tags
                .replace(/>\s+</g, '><')
                // Remove whitespace at start of lines
                .replace(/^\s+/gm, '')
                // Remove whitespace at end of lines
                .replace(/\s+$/gm, '')
                // Collapse multiple spaces to single space
                .replace(/\s{2,}/g, ' ')
                // Remove quotes around attributes when safe
                .replace(/=["']([a-zA-Z0-9-_]+)["']/g, '=$1')
                // Remove optional closing tags before certain elements
                .replace(/<\/li>\s*<li/gi, '<li')
                .replace(/<\/dt>\s*<dt/gi, '<dt')
                .replace(/<\/dd>\s*<dd/gi, '<dd')
                .replace(/<\/option>\s*<option/gi, '<option')
                .replace(/<\/tr>\s*<tr/gi, '<tr')
                .replace(/<\/td>\s*<td/gi, '<td')
                .replace(/<\/th>\s*<th/gi, '<th')
                .trim();

            // Restore preserved blocks
            for (let i = 0; i < preservedBlocks.length; i++) {
                html = html.replace(`___PRESERVED_BLOCK_${i}___`, preservedBlocks[i]);
            }

            return html;
        } catch (error) {
            console.warn('Error minifying HTML:', error);
            return html;
        }
    }
}

// Create global instance
window.exportManager = new ExportManager();