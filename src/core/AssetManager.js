class AssetManager {
    constructor(fileBrowser = null) {
        this.fileBrowser = fileBrowser;
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.assetRegistry = new Map();
        this.modal = null;
        this.initialized = false; // Track if assets have been initialized

        // Asset type handlers
        this.typeHandlers = {
            'image': this.handleImageAsset.bind(this),
            'audio': this.handleAudioAsset.bind(this),
            'json': this.handleJsonAsset.bind(this),
            'text': this.handleTextAsset.bind(this)
        };

        // Enhanced FileBrowser integration
        this.setupFileBrowserIntegration();

        // Initialize modal after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initModal());
        } else {
            this.initModal();
        }
    }

    /**
     * Setup FileBrowser integration for automatic asset registration
     */
    setupFileBrowserIntegration() {
        // Don't try to override methods if FileBrowser isn't available yet
        if (!this.fileBrowser) {
            console.log('FileBrowser not available yet for AssetManager integration');
            return;
        }

        console.log('Setting up AssetManager integration with FileBrowser');

        // Store original methods
        const originalCreateFile = this.fileBrowser.createFile.bind(this.fileBrowser);
        const originalWriteFile = this.fileBrowser.writeFile ? this.fileBrowser.writeFile.bind(this.fileBrowser) : null;
        const originalDeleteItem = this.fileBrowser.deleteItem.bind(this.fileBrowser);

        // Override createFile to auto-register assets
        this.fileBrowser.createFile = async (path, content, overwrite = false) => {
            const result = await originalCreateFile(path, content, overwrite);
            if (result) {
                // Auto-register new assets
                setTimeout(() => this.registerAssetFromPath(path), 100);
            }
            return result;
        };

        // Override writeFile if it exists
        if (originalWriteFile) {
            this.fileBrowser.writeFile = async (path, content, overwrite = false) => {
                const result = await originalWriteFile(path, content, overwrite);
                if (result) {
                    setTimeout(() => this.registerAssetFromPath(path), 100);
                }
                return result;
            };
        }

        // Override deleteItem to remove from cache
        this.fileBrowser.deleteItem = async (path) => {
            const result = await originalDeleteItem(path);
            if (result) {
                this.removeAssetByPath(path);
            }
            return result;
        };
    }

    /**
     * Initialize assets on engine start - loads all assets from FileBrowser without duplicates
     */
    async initializeAssetsOnStart() {
        if (this.initialized) {
            console.log('Assets already initialized, skipping...');
            return;
        }

        if (!this.fileBrowser) {
            console.warn('No FileBrowser available for asset initialization');
            return;
        }

        try {
            console.log('Initializing Asset Pipeline - loading assets from FileBrowser...');
            const allFiles = await this.fileBrowser.getAllFiles();
            let loadedCount = 0;
            let duplicateCount = 0;

            for (const file of allFiles) {
                if (file.type === 'file') {
                    const assetType = this.detectAssetType(file.path);
                    if (assetType === 'image' || assetType === 'audio' || assetType === 'json' || assetType === 'text') {
                        const normalizedPath = this.normalizePath(file.path);
                        const assetId = this.generateAssetId(normalizedPath);

                        // Check if already exists to prevent duplicates
                        if (this.assetRegistry.has(assetId)) {
                            duplicateCount++;
                            continue;
                        }

                        try {
                            await this.registerAssetFromPath(file.path);
                            loadedCount++;
                        } catch (error) {
                            console.warn(`Failed to load asset ${file.path}:`, error);
                        }
                    }
                }
            }

            this.initialized = true;
            console.log(`Asset Pipeline initialized: ${loadedCount} assets loaded, ${duplicateCount} duplicates skipped`);
            console.log('Available assets:', this.getAvailableAssetPaths());

        } catch (error) {
            console.error('Error initializing assets on start:', error);
        }
    }

    /**
     * Scan FileBrowser for existing assets and register them
     */
    async scanAndRegisterAssets() {
        if (!this.fileBrowser) {
            console.warn('No FileBrowser available for asset scanning');
            return;
        }

        try {
            console.log('Scanning FileBrowser for assets...');
            const allFiles = await this.fileBrowser.getAllFiles();

            for (const file of allFiles) {
                if (file.type === 'file') {
                    const assetType = this.detectAssetType(file.path);
                    if (assetType === 'image' || assetType === 'audio' || assetType === 'json') {
                        await this.registerAssetFromPath(file.path);
                    }
                }
            }

            console.log(`Registered ${this.assetRegistry.size} assets from FileBrowser`);
        } catch (error) {
            console.error('Error scanning FileBrowser for assets:', error);
        }
    }

    /**
     * Enhanced asset registration with better deduplication
     * @param {string} path - Asset path
     * @param {string} type - Asset type
     * @param {any} content - Asset content
     * @returns {Promise<string>} - Asset ID
     */
    async registerAsset(path, type, content) {
        const normalizedPath = this.normalizePath(path);
        const assetId = this.generateAssetId(normalizedPath);
        
        // Check if already exists
        if (this.assetRegistry.has(assetId)) {
            console.log(`Asset already exists: ${assetId}`);
            return assetId;
        }

        try {
            // Process and store the asset
            const processedAsset = await this.typeHandlers[type](content, { path: normalizedPath });
            
            // Store in cache and registry
            this.cache.set(assetId, processedAsset);
            this.cache.set(normalizedPath, processedAsset);
            
            this.assetRegistry.set(assetId, {
                id: assetId,
                type: type,
                metadata: {
                    path: normalizedPath,
                    originalPath: path,
                    addedAt: Date.now(),
                    size: this.getAssetSize(processedAsset),
                    dimensions: this.getAssetDimensions(processedAsset)
                }
            });

            console.log(`Registered new asset: ${assetId} (${type})`);
            return assetId;
            
        } catch (error) {
            console.error(`Failed to register asset ${path}:`, error);
            throw error;
        }
    }

    /**
     * Batch import assets from files
     * @param {FileList|Array} files - Files to import
     * @returns {Promise<Object>} - Import results
     */
    async importFiles(files) {
        const results = {
            success: [],
            failed: [],
            duplicates: []
        };

        for (const file of files) {
            try {
                const assetType = this.detectAssetType(file.name);
                const assetId = this.generateAssetId(file.name);
                
                // Check for duplicates
                if (this.assetRegistry.has(assetId)) {
                    results.duplicates.push(file.name);
                    continue;
                }

                // Register the asset
                await this.registerAsset(file.name, assetType, file);
                results.success.push(file.name);
                
            } catch (error) {
                console.error(`Failed to import ${file.name}:`, error);
                results.failed.push({ name: file.name, error: error.message });
            }
        }

        return results;
    }

    /**
     * Register an asset automatically from a file path
     * @param {string} path - File path
     */
    async registerAssetFromPath(path) {
        const assetType = this.detectAssetType(path);
        if (assetType !== 'text' || path.endsWith('.json')) { // Register media assets and JSON
            const normalizedPath = this.normalizePath(path);
            const assetId = this.generateAssetId(normalizedPath);

            try {
                // Load content from FileBrowser
                if (this.fileBrowser) {
                    await this.loadAsset(normalizedPath);
                    console.log(`Auto-registered asset: ${assetId} from ${path}`);
                }
            } catch (error) {
                console.warn(`Failed to auto-register asset from ${path}:`, error);
            }
        }
    }

    /**
     * Remove asset by file path
     * @param {string} path - File path
     */
    removeAssetByPath(path) {
        const assetId = this.generateAssetId(path);
        this.removeAsset(assetId);

        // Also remove by path variations
        const normalizedPath = this.normalizePath(path);
        this.cache.delete(normalizedPath);
        this.cache.delete(path);
    }

    /**
     * Get asset by name (simple API for modules) - supports filename with extension
     * @param {string} assetName - Asset name (e.g., "player.png", "music.mp3")
     * @returns {any} - The asset or null if not found
     */
    getAsset(assetName) {
        if (!assetName) return null;

        // First try direct cache lookup
        if (this.cache.has(assetName)) {
            return this.cache.get(assetName);
        }

        // Try with generated asset ID
        const assetId = this.generateAssetId(assetName);
        if (this.cache.has(assetId)) {
            return this.cache.get(assetId);
        }

        // Try normalized path variations
        const normalizedPath = this.normalizePath(assetName);
        if (this.cache.has(normalizedPath)) {
            return this.cache.get(normalizedPath);
        }

        // Try all stored cache keys for partial matches
        for (const [key, asset] of this.cache) {
            if (key.endsWith(assetName) || assetName.endsWith(key)) {
                return asset;
            }
        }

        console.warn(`Asset not found: ${assetName}`);
        return null;
    }

    /**
     * Get asset by path (enhanced for module integration)
     * @param {string} path - Asset path
     * @returns {Promise<any>} - The asset or null if not found
     */
    async getAssetByPath(path) {
        if (!path) return null;

        const normalizedPath = this.normalizePath(path);
        const assetId = this.generateAssetId(normalizedPath);

        // Check if already in cache
        let asset = this.getAsset(assetId);
        if (asset) return asset;

        // PRIORITY: If we're in editor mode, try FileBrowser first
        if (window.editor && window.editor.fileBrowser && typeof this.fileBrowser?.readFile === 'function') {
            try {
                console.log('AssetManager: Loading from FileBrowser first:', normalizedPath);
                asset = await this.loadAsset(normalizedPath);
                return asset;
            } catch (error) {
                console.warn('AssetManager: FileBrowser loading failed:', error);
            }
        }

        // Try loading from FileBrowser if available
        if (!this.fileBrowser) {
            console.warn('No FileBrowser available for asset loading');
            return null;
        }

        try {
            asset = await this.loadAsset(normalizedPath);
            return asset;
        } catch (error) {
            console.warn(`Could not load asset from FileBrowser path: ${path}`, error);
            return null;
        }
    }

    /**
     * Enhanced loadAsset method with better FileBrowser integration
     */
    async loadAsset(path) {
        const normalizedPath = this.normalizePath(path);
        const assetId = this.generateAssetId(normalizedPath);

        // Check if already cached
        if (this.cache.has(assetId)) {
            return this.cache.get(assetId);
        }

        if (this.cache.has(normalizedPath)) {
            return this.cache.get(normalizedPath);
        }

        // Check if currently loading
        if (this.loadingPromises.has(normalizedPath)) {
            return this.loadingPromises.get(normalizedPath);
        }

        // ONLY use FileBrowser for asset loading
        if (!this.fileBrowser || typeof this.fileBrowser.readFile !== 'function') {
            console.warn(`No FileBrowser available, cannot load asset: ${normalizedPath}`);
            throw new Error(`Asset loading requires FileBrowser: ${normalizedPath}`);
        }

        const promise = this.loadFromFileBrowser(normalizedPath);
        this.loadingPromises.set(normalizedPath, promise);

        try {
            const asset = await promise;

            // Cache under multiple keys for easy lookup
            this.cache.set(assetId, asset);
            this.cache.set(normalizedPath, asset);
            this.cache.set(path, asset); // Original path too

            // Register in asset registry
            const assetType = this.detectAssetType(normalizedPath);
            this.assetRegistry.set(assetId, {
                id: assetId,
                type: assetType,
                metadata: {
                    path: normalizedPath,
                    originalPath: path,
                    addedAt: Date.now(),
                    loadedFromPath: true
                }
            });

            return asset;

        } catch (error) {
            console.error(`Failed to load asset ${normalizedPath}:`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(normalizedPath);
        }
    }

    /**
     * Get all available asset paths for modules to reference
     * @param {string} type - Optional type filter ('image', 'audio', etc.)
     * @returns {Array<Object>} - Array of {id, path, type} objects
     */
    getAvailableAssetPaths(type = null) {
        const assets = [];

        for (const [id, metadata] of this.assetRegistry) {
            if (!type || metadata.type === type) {
                assets.push({
                    id: id,
                    path: metadata.metadata.path || metadata.metadata.originalPath,
                    type: metadata.type,
                    displayName: this.getDisplayName(metadata.metadata.path || id)
                });
            }
        }

        return assets.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    /**
     * Get display name for asset dropdown
     */
    getDisplayName(path) {
        if (!path) return 'Unknown';
        return path.split('/').pop().split('\\').pop();
    }

    /**
     * Enhanced cache lookup that tries multiple path variations
     * @param {string} path - Asset path to look up
     * @returns {any} - The cached asset or null
     */
    getCachedAsset(path) {
        if (!path) return null;

        // Try direct lookup first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        // Try with generated asset ID
        const assetId = this.generateAssetId(path);
        if (this.cache.has(assetId)) {
            return this.cache.get(assetId);
        }

        // Try normalized path
        const normalizedPath = this.normalizePath(path);
        if (this.cache.has(normalizedPath)) {
            return this.cache.get(normalizedPath);
        }

        // Try all stored cache keys for partial matches
        for (const [key, asset] of this.cache) {
            if (key.endsWith(path) || path.endsWith(key)) {
                return asset;
            }
        }

        return null;
    }

    /**
     * Serialize cache for project saving
     * @returns {Object} - Serializable cache data
     */
    serializeCache() {
        const serializedCache = {};

        for (const [key, asset] of this.cache) {
            try {
                if (asset instanceof HTMLImageElement) {
                    // Convert image to data URL
                    const canvas = document.createElement('canvas');
                    canvas.width = asset.naturalWidth || asset.width;
                    canvas.height = asset.naturalHeight || asset.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(asset, 0, 0);

                    serializedCache[key] = {
                        type: 'image',
                        content: canvas.toDataURL('image/png'),
                        width: canvas.width,
                        height: canvas.height
                    };
                } else if (asset instanceof HTMLAudioElement) {
                    // For audio, store the source if it's a data URL
                    if (asset.src && asset.src.startsWith('data:')) {
                        serializedCache[key] = {
                            type: 'audio',
                            content: asset.src
                        };
                    }
                } else if (typeof asset === 'string' || typeof asset === 'object') {
                    // Store text and JSON data directly
                    serializedCache[key] = {
                        type: 'data',
                        content: asset
                    };
                }
            } catch (error) {
                console.warn(`Failed to serialize asset ${key}:`, error);
            }
        }

        // Also serialize asset registry metadata
        const registryData = {};
        for (const [id, metadata] of this.assetRegistry) {
            registryData[id] = {
                type: metadata.type,
                metadata: metadata.metadata
            };
        }

        return {
            cache: serializedCache,
            registry: registryData,
            version: '1.0'
        };
    }

    /**
     * Deserialize cache from project loading
     * @param {Object} data - Serialized cache data
     */
    async deserializeCache(data) {
        if (!data || !data.cache) {
            console.warn('No cache data to deserialize');
            return;
        }

        // Clear current cache
        this.cache.clear();
        this.assetRegistry.clear();

        try {
            // Restore cache entries
            for (const [key, assetData] of Object.entries(data.cache)) {
                try {
                    if (assetData.type === 'image') {
                        const img = await this.loadImage(assetData.content);
                        this.cache.set(key, img);
                    } else if (assetData.type === 'audio') {
                        const audio = await this.loadAudio(assetData.content);
                        this.cache.set(key, audio);
                    } else if (assetData.type === 'data') {
                        this.cache.set(key, assetData.content);
                    }
                } catch (error) {
                    console.warn(`Failed to deserialize asset ${key}:`, error);
                }
            }

            // Restore registry
            if (data.registry) {
                for (const [id, metadata] of Object.entries(data.registry)) {
                    this.assetRegistry.set(id, metadata);
                }
            }

            console.log(`Deserialized ${this.cache.size} assets and ${this.assetRegistry.size} registry entries`);

        } catch (error) {
            console.error('Error deserializing asset cache:', error);
        }
    }

    /**
     * Enhanced export method for ExportManager integration
     */
    async exportAssetsForGame() {
        const exportData = {};
        const processedAssets = new Set(); // Track processed assets to avoid duplicates

        console.log('Exporting assets from AssetManager...');
        console.log('Asset registry size:', this.assetRegistry.size);
        console.log('Cache size:', this.cache.size);

        // Export from asset registry first (preferred method)
        for (const [id, metadata] of this.assetRegistry) {
            const asset = this.cache.get(id);
            if (!asset) continue;

            const path = metadata.metadata.path || metadata.metadata.originalPath;
            const normalizedPath = this.normalizePath(path);

            // Skip if already processed
            if (processedAssets.has(normalizedPath)) {
                continue;
            }
            processedAssets.add(normalizedPath);

            try {
                if (metadata.type === 'image' && asset instanceof HTMLImageElement) {
                    // Convert image to data URL for export
                    const canvas = document.createElement('canvas');
                    canvas.width = asset.naturalWidth || asset.width;
                    canvas.height = asset.naturalHeight || asset.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(asset, 0, 0);

                    exportData[normalizedPath] = {
                        content: canvas.toDataURL('image/png'),
                        type: 'image/png'
                    };

                    console.log('Exported image asset:', normalizedPath);
                } else if (metadata.type === 'audio' && asset instanceof HTMLAudioElement) {
                    // For audio, we need the original data URL or file content
                    if (asset.src && asset.src.startsWith('data:')) {
                        exportData[normalizedPath] = {
                            content: asset.src,
                            type: 'audio/mpeg' // Default, should be detected properly
                        };
                        console.log('Exported audio asset:', normalizedPath);
                    }
                } else if (typeof asset === 'string') {
                    // Text content
                    exportData[normalizedPath] = {
                        content: asset,
                        type: 'text/plain'
                    };
                    console.log('Exported text asset:', normalizedPath);
                } else if (typeof asset === 'object' && asset !== null) {
                    // JSON content
                    exportData[normalizedPath] = {
                        content: JSON.stringify(asset),
                        type: 'application/json'
                    };
                    console.log('Exported JSON asset:', normalizedPath);
                }
            } catch (error) {
                console.warn(`Failed to export asset ${path}:`, error);
            }
        }

        console.log('Total assets exported:', Object.keys(exportData).length);
        return exportData;
    }

    /**
     * Add an asset to the manager with a unique ID
     * @param {string} id - Unique identifier for the asset
     * @param {string|File|Blob|HTMLImageElement|HTMLAudioElement} content - Asset content
     * @param {string} type - Asset type (image, audio, json, text)
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<string>} - Asset ID
     */
    async addAsset(id, content, type, metadata = {}) {
        console.log(`Adding asset: ${id} (type: ${type})`);

        // Store metadata
        this.assetRegistry.set(id, {
            id,
            type,
            metadata: {
                ...metadata,
                addedAt: Date.now(),
                originalPath: metadata.path || id
            }
        });

        // Process the content based on type
        const handler = this.typeHandlers[type] || this.handleGenericAsset.bind(this);
        const processedAsset = await handler(content, metadata);

        // Store the processed asset
        this.cache.set(id, processedAsset);

        console.log(`Asset added successfully: ${id}`);
        return id;
    }

    /**
     * Get an asset by ID
     * @param {string} id - Asset ID
     * @returns {any} - The asset or null if not found
     */
    getAsset(id) {
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        console.warn(`Asset not found: ${id}`);
        return null;
    }

    /**
     * Get an image asset by ID
     * @param {string} id - Image asset ID
     * @returns {HTMLImageElement|null} - The image element or null
     */
    getImage(id) {
        const asset = this.getAsset(id);
        if (asset && asset instanceof HTMLImageElement) {
            return asset;
        }

        console.warn(`Image asset not found or invalid type: ${id}`);
        return null;
    }

    /**
     * Get an audio asset by ID
     * @param {string} id - Audio asset ID
     * @returns {HTMLAudioElement|null} - The audio element or null
     */
    getAudio(id) {
        const asset = this.getAsset(id);
        if (asset && asset instanceof HTMLAudioElement) {
            return asset;
        }

        console.warn(`Audio asset not found or invalid type: ${id}`);
        return null;
    }

    /**
     * Get a JSON asset by ID
     * @param {string} id - JSON asset ID
     * @returns {Object|null} - The parsed JSON object or null
     */
    getJson(id) {
        const asset = this.getAsset(id);
        if (asset && typeof asset === 'object' && asset !== null) {
            return asset;
        }

        console.warn(`JSON asset not found or invalid type: ${id}`);
        return null;
    }

    /**
     * Get a text asset by ID
     * @param {string} id - Text asset ID
     * @returns {string|null} - The text content or null
     */
    getText(id) {
        const asset = this.getAsset(id);
        if (typeof asset === 'string') {
            return asset;
        }

        console.warn(`Text asset not found or invalid type: ${id}`);
        return null;
    }

    /**
     * Check if an asset exists
     * @param {string} id - Asset ID
     * @returns {boolean} - True if asset exists
     */
    hasAsset(id) {
        return this.cache.has(id);
    }

    /**
     * Remove an asset from the cache
     * @param {string} id - Asset ID
     * @returns {boolean} - True if asset was removed
     */
    removeAsset(id) {
        const removed = this.cache.delete(id);
        this.assetRegistry.delete(id);

        if (removed) {
            console.log(`Asset removed: ${id}`);
        }

        return removed;
    }

    /**
     * Get all asset IDs
     * @returns {string[]} - Array of asset IDs
     */
    getAssetIds() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get assets by type
     * @param {string} type - Asset type to filter by
     * @returns {Object[]} - Array of assets with their IDs
     */
    getAssetsByType(type) {
        const assets = [];

        for (const [id, metadata] of this.assetRegistry) {
            if (metadata.type === type) {
                assets.push({
                    id,
                    asset: this.cache.get(id),
                    metadata
                });
            }
        }

        return assets;
    }

    /**
     * Handle image asset processing
     */
    async handleImageAsset(content, metadata = {}) {
        if (content instanceof HTMLImageElement) {
            return content;
        }

        if (content instanceof File || content instanceof Blob) {
            const dataUrl = await this.blobToDataURL(content);
            return this.loadImage(dataUrl);
        }

        if (typeof content === 'string') {
            if (content.startsWith('data:image/') || content.startsWith('blob:') || content.startsWith('http')) {
                return this.loadImage(content);
            }
        }

        throw new Error('Invalid image content type');
    }

    /**
     * Handle audio asset processing
     */
    async handleAudioAsset(content, metadata = {}) {
        if (content instanceof HTMLAudioElement) {
            return content;
        }

        if (content instanceof File || content instanceof Blob) {
            const dataUrl = await this.blobToDataURL(content);
            return this.loadAudio(dataUrl);
        }

        if (typeof content === 'string') {
            if (content.startsWith('data:audio/') || content.startsWith('blob:') || content.startsWith('http')) {
                return this.loadAudio(content);
            }
        }

        throw new Error('Invalid audio content type');
    }

    /**
     * Handle JSON asset processing
     */
    async handleJsonAsset(content, metadata = {}) {
        if (typeof content === 'object' && content !== null) {
            return content;
        }

        if (typeof content === 'string') {
            return JSON.parse(content);
        }

        if (content instanceof File || content instanceof Blob) {
            const text = await content.text();
            return JSON.parse(text);
        }

        throw new Error('Invalid JSON content type');
    }

    /**
     * Handle text asset processing
     */
    async handleTextAsset(content, metadata = {}) {
        if (typeof content === 'string') {
            return content;
        }

        if (content instanceof File || content instanceof Blob) {
            return content.text();
        }

        throw new Error('Invalid text content type');
    }

    /**
     * Handle generic asset processing
     */
    async handleGenericAsset(content, metadata = {}) {
        return content;
    }

    /**
     * Add embedded assets for exported games
     * @param {Object} assetsData - Object containing all asset data
     */
    addEmbeddedAssets(assetsData) {
        console.log('Adding embedded assets to AssetManager:', Object.keys(assetsData));

        for (const [path, assetInfo] of Object.entries(assetsData)) {
            const assetId = this.generateAssetId(path);
            const assetType = assetInfo.type ? this.getAssetTypeFromMime(assetInfo.type) : this.detectAssetType(path);

            // Add asset using the standard method
            this.addAsset(assetId, assetInfo.content, assetType, {
                path,
                originalType: assetInfo.type,
                embedded: true
            }).then(() => {
                console.log('Successfully added embedded asset:', path);
            }).catch(error => {
                console.error(`Failed to add embedded asset ${path}:`, error);
            });
        }
    }

    /**
     * Get assets with enhanced metadata for UI display
     * @param {string} type - Optional type filter
     * @returns {Array<Object>} - Enhanced asset information
     */
    getEnhancedAssetInfo(type = null) {
        const assets = [];
        
        for (const [id, metadata] of this.assetRegistry) {
            if (type && metadata.type !== type) continue;
            
            const asset = this.cache.get(id);
            const assetInfo = {
                id: id,
                type: metadata.type,
                path: metadata.metadata.path || metadata.metadata.originalPath,
                displayName: this.getDisplayName(metadata.metadata.path || id),
                metadata: metadata.metadata,
                asset: asset,
                size: this.getAssetSize(asset),
                dimensions: this.getAssetDimensions(asset)
            };
            
            assets.push(assetInfo);
        }
        
        return assets.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    /**
     * Get asset size information
     * @param {any} asset - The asset object
     * @returns {string} - Formatted size string
     */
    getAssetSize(asset) {
        if (!asset) return '0 B';
        
        if (asset instanceof HTMLImageElement) {
            // Estimate image size (rough calculation)
            const width = asset.naturalWidth || asset.width || 64;
            const height = asset.naturalHeight || asset.height || 64;
            const estimatedBytes = width * height * 4; // Assuming RGBA
            return this.formatBytes(estimatedBytes);
        }
        
        if (asset instanceof HTMLAudioElement) {
            return 'Audio file';
        }
        
        if (typeof asset === 'string') {
            return this.formatBytes(asset.length);
        }
        
        if (typeof asset === 'object') {
            return this.formatBytes(JSON.stringify(asset).length);
        }
        
        return 'Unknown';
    }

    /**
     * Get asset dimensions for images
     * @param {any} asset - The asset object
     * @returns {Object|null} - Width and height or null
     */
    getAssetDimensions(asset) {
        if (asset instanceof HTMLImageElement) {
            return {
                width: asset.naturalWidth || asset.width || 0,
                height: asset.naturalHeight || asset.height || 0
            };
        }
        return null;
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} - Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Generate a unique asset ID from a path
     * @param {string} path - Asset path
     * @returns {string} - Generated asset ID
     */
    generateAssetId(path) {
        // Remove file extension and path separators, convert to camelCase
        const filename = path.split('/').pop().split('\\').pop();
        const nameWithoutExt = filename.split('.')[0];

        // Convert to camelCase and ensure it's a valid identifier
        const camelCase = nameWithoutExt
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        // Ensure it doesn't start with a number
        if (/^\d/.test(camelCase)) {
            return 'asset_' + camelCase;
        }

        return camelCase || 'asset_' + Date.now();
    }

    /**
     * Detect asset type from path/filename
     * @param {string} path - Asset path
     * @returns {string} - Detected asset type
     */
    detectAssetType(path) {
        const extension = path.split('.').pop().toLowerCase();

        const typeMap = {
            // Images
            'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image',
            'webp': 'image', 'svg': 'image', 'bmp': 'image', 'ico': 'image',

            // Audio
            'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'aac': 'audio',
            'flac': 'audio', 'm4a': 'audio', 'wma': 'audio',

            // Data
            'json': 'json',

            // Text
            'txt': 'text', 'md': 'text', 'csv': 'text', 'xml': 'text'
        };

        return typeMap[extension] || 'text';
    }

    /**
     * Get asset type from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} - Asset type
     */
    getAssetTypeFromMime(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('json')) return 'json';
        return 'text';
    }

    /**
     * Normalize path for consistent key lookup
     * @param {string} path - Path to normalize
     * @returns {string} - Normalized path
     */
    normalizePath(path) {
        if (!path) return '';

        // Ensure path uses forward slashes and starts with /
        let normalized = path.replace(/\\/g, '/');

        // Remove leading ./ if present
        if (normalized.startsWith('./')) {
            normalized = normalized.substring(2);
        }

        // Ensure it starts with / for FileBrowser
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }

        // Remove double slashes
        normalized = normalized.replace(/\/+/g, '/');

        try {
            normalized = decodeURIComponent(normalized);
        } catch (e) {
            // If decoding fails, use the original normalized path
        }

        return normalized;
    }

    /**
     * Load image from source
     * @param {string} src - Image source
     * @returns {Promise<HTMLImageElement>} - Loaded image
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
     * Load audio from source
     * @param {string} src - Audio source
     * @returns {Promise<HTMLAudioElement>} - Loaded audio
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
     * Convert Blob to data URL
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>} - Data URL
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
     * Load asset from file browser
     * @param {string} path - Asset path
     * @returns {Promise<any>} - Loaded asset
     */
    async loadFromFileBrowser(path) {
        try {
            // Ensure path starts with / for FileBrowser
            const fileBrowserPath = path.startsWith('/') ? path : `/${path}`;

            console.log(`Loading asset from FileBrowser: ${fileBrowserPath}`);

            // Read file content from FileBrowser
            const content = await this.fileBrowser.readFile(fileBrowserPath);
            if (!content) {
                throw new Error(`Asset not found in file browser: ${fileBrowserPath}`);
            }

            const assetType = this.detectAssetType(path);
            console.log(`Processing asset as type: ${assetType}`);

            // Handle different content types based on what FileBrowser returns
            if (typeof content === 'string') {
                // FileBrowser returned string content (could be data URL or text)
                if (assetType === 'image' && content.startsWith('data:image/')) {
                    return this.loadImage(content);
                } else if (assetType === 'audio' && content.startsWith('data:audio/')) {
                    return this.loadAudio(content);
                } else if (assetType === 'json') {
                    try {
                        return JSON.parse(content);
                    } catch (e) {
                        console.warn(`Failed to parse JSON from ${path}, treating as text`);
                        return content;
                    }
                } else {
                    // Text content
                    return content;
                }
            } else if (content instanceof Blob || content instanceof File) {
                // FileBrowser returned binary content
                const handler = this.typeHandlers[assetType] || this.handleGenericAsset.bind(this);
                return handler(content);
            } else {
                // Unknown content type, return as-is
                return content;
            }

        } catch (error) {
            throw new Error(`Failed to load asset from file browser: ${path} - ${error.message}`);
        }
    }

    /**
     * Load asset from URL
     * @param {string} path - Asset path
     * @returns {Promise<any>} - Loaded asset
     */
    async loadFromUrl(path) {
        try {
            const fullPath = this.basePath ? `${this.basePath}${path}` : path;
            const response = await fetch(fullPath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const assetType = this.detectAssetType(path);

            if (assetType === 'image') {
                const blob = await response.blob();
                const dataUrl = await this.blobToDataURL(blob);
                return this.loadImage(dataUrl);
            } else if (assetType === 'audio') {
                const blob = await response.blob();
                const dataUrl = await this.blobToDataURL(blob);
                return this.loadAudio(dataUrl);
            } else if (assetType === 'json') {
                return response.json();
            } else {
                return response.text();
            }

        } catch (error) {
            throw new Error(`Failed to load asset from URL: ${path} - ${error.message}`);
        }
    }

    /**
     * Clear all assets
     */
    clearAll() {
        this.cache.clear();
        this.assetRegistry.clear();
        this.loadingPromises.clear();
        console.log('All assets cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getStats() {
        const stats = {
            totalAssets: this.cache.size,
            byType: {}
        };

        for (const [id, metadata] of this.assetRegistry) {
            const type = metadata.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }

        return stats;
    }

    initModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'asset-modal';
        this.modal.innerHTML = `
            <div class="asset-modal-content">
                <div class="asset-modal-header">
                    <h2 class="asset-modal-title">Export Assets</h2>
                    <button class="asset-modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="asset-modal-body">
                    <div class="asset-tree"></div>
                    <div class="asset-actions">
                        <button class="asset-button select-all">Select All</button>
                        <button class="asset-button export">Export Selected</button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS styles for icon selector
        const style = document.createElement('style');
        style.textContent = `
            .asset-pack-info {
                margin-bottom: 20px;
                padding: 16px;
                background: #3d3d3d;
                border-radius: 6px;
                border: 1px solid #555;
            }
            
            .asset-input-group {
                margin-bottom: 16px;
            }
            
            .asset-input-group label {
                display: block;
                margin-bottom: 6px;
                color: #ccc;
                font-size: 14px;
                font-weight: 500;
            }
            
            .asset-input-group input,
            .asset-input-group textarea {
                width: 100%;
                padding: 8px 12px;
                background: #2a2a2a;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                font-size: 14px;
                font-family: inherit;
            }
            
            .asset-input-group input:focus,
            .asset-input-group textarea:focus {
                outline: none;
                border-color: #0078d4;
                box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
            }
            
            .icon-selector {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .icon-preview {
                width: 80px;
                height: 80px;
                background: #2a2a2a;
                border: 2px dashed #555;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #888;
                font-size: 12px;
                flex-shrink: 0;
            }
            
            .icon-preview img {
                border-radius: 4px;
            }
            
            .icon-preview span {
                margin-top: 4px;
                font-size: 10px;
            }
            
            .icon-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .asset-tree-section h3 {
                color: #fff;
                margin-bottom: 12px;
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        this.modal.querySelector('.asset-modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        // Select all button
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-all')) {
                const checkboxes = this.modal.querySelectorAll('.asset-item input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = true);
            }

            if (e.target.classList.contains('select-none')) {
                const checkboxes = this.modal.querySelectorAll('.asset-item input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = false);
            }

            if (e.target.classList.contains('export')) {
                this.exportSelected();
            }
        });

        // Click outside to close
        /*this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });*/
    }

    async showExportModal() {
        if (!this.fileBrowser) {
            console.error('FileBrowser not connected to AssetManager');
            return;
        }

        const files = await this.fileBrowser.getAllFiles();
        const tree = this.modal.querySelector('.asset-tree');
        tree.innerHTML = '';

        // Group files by directory
        const fileTree = this.buildFileTree(files);
        this.renderFileTree(fileTree, tree);

        // Update modal content to include name, description, and icon fields
        const modalBody = this.modal.querySelector('.asset-modal-body');
        modalBody.innerHTML = `
        <div class="asset-pack-info">
            <div class="asset-input-group">
                <label for="asset-pack-name">Asset Pack Name:</label>
                <input type="text" id="asset-pack-name" placeholder="Enter asset pack name" value="My Asset Pack">
            </div>
            <div class="asset-input-group">
                <label for="asset-pack-description">Description:</label>
                <textarea id="asset-pack-description" placeholder="Enter a description for this asset pack" rows="3"></textarea>
            </div>
            <div class="asset-input-group">
                <label for="asset-pack-version">Version:</label>
                <input type="text" id="asset-pack-version" placeholder="1.0.0" value="1.0.0">
            </div>
            <div class="asset-input-group">
                <label for="asset-pack-author">Author:</label>
                <input type="text" id="asset-pack-author" placeholder="Your name">
            </div>
            <div class="asset-input-group">
                <label for="asset-pack-icon">Icon (optional):</label>
                <div class="icon-selector">
                    <div class="icon-preview" id="icon-preview">
                        <i class="fas fa-image" style="font-size: 48px; color: #666;"></i>
                        <span>No icon selected</span>
                    </div>
                    <div class="icon-controls">
                        <button type="button" class="asset-button select-icon">Select Icon</button>
                        <button type="button" class="asset-button remove-icon" style="display: none;">Remove Icon</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="asset-tree-section">
            <h3>Select Assets to Export</h3>
            <div class="asset-tree"></div>
        </div>
        <div class="asset-actions">
            <button class="asset-button select-all">Select All</button>
            <button class="asset-button select-none">Select None</button>
            <button class="asset-button export">Export Selected</button>
        </div>
    `;

        // Re-render the file tree in the new structure
        const newTree = modalBody.querySelector('.asset-tree');
        this.renderFileTree(fileTree, newTree);

        // Setup icon selection
        this.setupIconSelector();

        this.modal.style.display = 'flex';
    }

    hideModal() {
        this.modal.style.display = 'none';
    }

    buildFileTree(files) {
        const tree = {};
        files.forEach(file => {
            const parts = file.path.split('/').filter(Boolean);
            let current = tree;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    if (!current.files) current.files = [];
                    current.files.push(file);
                } else {
                    current.dirs = current.dirs || {};
                    current.dirs[part] = current.dirs[part] || {};
                    current = current.dirs[part];
                }
            });
        });
        return tree;
    }

    renderFileTree(tree, container, path = '') {
        // Render directories
        if (tree.dirs) {
            Object.entries(tree.dirs).forEach(([name, subTree]) => {
                const dirElement = document.createElement('div');
                dirElement.className = 'asset-directory';
                dirElement.innerHTML = `
                    <div class="asset-dir-header">
                        <input type="checkbox" data-path="${path}/${name}">
                        <i class="fas fa-folder"></i>
                        <span>${name}</span>
                    </div>
                    <div class="asset-dir-content"></div>
                `;
                container.appendChild(dirElement);

                // Handle directory checkbox
                const checkbox = dirElement.querySelector('input[type="checkbox"]');
                const content = dirElement.querySelector('.asset-dir-content');
                checkbox.addEventListener('change', () => {
                    const items = content.querySelectorAll('input[type="checkbox"]');
                    items.forEach(item => item.checked = checkbox.checked);
                });

                this.renderFileTree(subTree, content, `${path}/${name}`);
            });
        }

        // Render files
        if (tree.files) {
            tree.files.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.className = 'asset-item';
                fileElement.innerHTML = `
                    <input type="checkbox" data-path="${file.path}">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                `;
                container.appendChild(fileElement);
            });
        }
    }

    setupIconSelector() {
        const selectIconBtn = this.modal.querySelector('.select-icon');
        const removeIconBtn = this.modal.querySelector('.remove-icon');
        const iconPreview = this.modal.querySelector('#icon-preview');

        // Store selected icon data
        this.selectedIcon = null;

        selectIconBtn.addEventListener('click', async () => {
            try {
                // Create file input for icon selection
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';

                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.handleIconSelection(file, iconPreview, removeIconBtn);
                    }
                };

                input.click();
            } catch (error) {
                console.error('Error selecting icon:', error);
                this.fileBrowser?.showNotification?.('Error selecting icon: ' + error.message, 'error');
            }
        });

        removeIconBtn.addEventListener('click', () => {
            this.selectedIcon = null;
            iconPreview.innerHTML = `
                <i class="fas fa-image" style="font-size: 48px; color: #666;"></i>
                <span>No icon selected</span>
            `;
            removeIconBtn.style.display = 'none';
        });
    }

    async handleIconSelection(file, iconPreview, removeIconBtn) {
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select a valid image file');
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image file size must be less than 5MB');
            }

            // Create image element for resizing
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Load the image
            const imageDataUrl = await this.fileToDataURL(file);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = imageDataUrl;
            });

            // Resize to 512x512
            canvas.width = 512;
            canvas.height = 512;

            // Draw image with proper scaling to maintain aspect ratio
            const { width, height, x, y } = this.calculateImageFit(img.width, img.height, 512, 512);

            // Fill background with transparent pixels
            ctx.clearRect(0, 0, 128, 128);

            // Draw the resized image
            ctx.drawImage(img, x, y, width, height);

            // Convert to data URL
            const resizedDataUrl = canvas.toDataURL('image/png');

            // Store the icon data
            this.selectedIcon = {
                data: resizedDataUrl,
                originalName: file.name,
                size: Math.round(resizedDataUrl.length * 0.75) // Approximate size
            };

            // Update preview
            iconPreview.innerHTML = `
                <img src="${resizedDataUrl}" style="width: 64px; height: 64px; border-radius: 4px; border: 1px solid #555;">
                <span style="font-size: 12px; color: #aaa;">${file.name} (512x512)</span>
            `;

            removeIconBtn.style.display = 'inline-block';

            this.fileBrowser?.showNotification?.('Icon resized and ready for export', 'success');

        } catch (error) {
            console.error('Error processing icon:', error);
            this.fileBrowser?.showNotification?.('Error processing icon: ' + error.message, 'error');
        }
    }

    calculateImageFit(srcWidth, srcHeight, targetWidth, targetHeight) {
        const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
        const width = srcWidth * scale;
        const height = srcHeight * scale;
        const x = (targetWidth - width) / 2;
        const y = (targetHeight - height) / 2;

        return { width, height, x, y };
    }

    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async exportSelected() {
        const selectedFiles = this.modal.querySelectorAll('.asset-item input[type="checkbox"]:checked');
        const selectedDirs = this.modal.querySelectorAll('.asset-dir-header input[type="checkbox"]:checked');
        const files = [];

        // Get pack metadata
        const packName = this.modal.querySelector('#asset-pack-name').value.trim() || 'Untitled Asset Pack';
        const packDescription = this.modal.querySelector('#asset-pack-description').value.trim() || '';
        const packVersion = this.modal.querySelector('#asset-pack-version').value.trim() || '1.0.0';
        const packAuthor = this.modal.querySelector('#asset-pack-author').value.trim() || '';

        // Collect explicitly selected directories
        const explicitlySelectedDirs = new Set();
        for (const checkbox of selectedDirs) {
            const dirPath = checkbox.dataset.path;
            explicitlySelectedDirs.add(dirPath);
        }

        // Collect selected files
        for (const checkbox of selectedFiles) {
            const path = checkbox.dataset.path;
            const file = await this.fileBrowser.getFile(path);
            if (file) {
                files.push({
                    path: file.path,
                    content: file.content,
                    type: file.type,
                    name: file.name,
                    parentPath: file.parentPath,
                    created: file.created,
                    modified: file.modified
                });
            }
        }

        if (files.length === 0) {
            alert('No files selected for export');
            return;
        }

        // Build directory structure - only include explicitly selected directories
        const directories = new Set();

        // Add explicitly selected directories first
        explicitlySelectedDirs.forEach(dirPath => {
            if (dirPath && dirPath !== '/') {
                directories.add(dirPath);
            }
        });

        // For each selected file, check if any parent directories are explicitly selected
        // If so, include those parent directories (but not auto-created ones)
        files.forEach(file => {
            let currentPath = file.parentPath;
            while (currentPath && currentPath !== '/') {
                // Only add this directory if it was explicitly selected
                if (explicitlySelectedDirs.has(currentPath)) {
                    directories.add(currentPath);

                    // Also add any parent directories of explicitly selected directories
                    let parentOfSelected = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
                    while (parentOfSelected && parentOfSelected !== '/' && explicitlySelectedDirs.has(parentOfSelected)) {
                        directories.add(parentOfSelected);
                        parentOfSelected = parentOfSelected.substring(0, parentOfSelected.lastIndexOf('/')) || '/';
                    }
                }
                currentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
            }
        });

        // Convert directories to array and sort
        const directoryList = Array.from(directories).sort();

        // Create enhanced asset package
        const assetPackage = {
            // Package metadata
            name: packName,
            description: packDescription,
            version: packVersion,
            author: packAuthor,
            timestamp: Date.now(),

            // Icon data (if selected)
            icon: this.selectedIcon ? {
                data: this.selectedIcon.data,
                originalName: this.selectedIcon.originalName,
                size: this.selectedIcon.size
            } : null,

            // Structure information
            directories: directoryList,
            totalFiles: files.length,
            totalDirectories: directoryList.length,

            // File data
            files: files,

            // Additional metadata
            metadata: {
                exportedBy: 'Dark Matter JS Game Engine',
                exportVersion: '1.0',
                engineVersion: window.engineVersion || '1.0.0',
                selectionMode: 'explicit-directories-only' // Indicates this export method
            }
        };

        // Create and download file
        const blob = new Blob([JSON.stringify(assetPackage, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Sanitize filename
        const sanitizedName = packName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${sanitizedName}.dmjs`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.fileBrowser.showNotification(`Asset pack "${packName}" exported successfully!`, 'success');
        this.hideModal();
    }

    async importAssets(file) {
        try {
            const content = await this.readFileContent(file);
            const assetPackage = JSON.parse(content);

            if (!assetPackage.version || !assetPackage.files) {
                throw new Error('Invalid asset package format');
            }

            // Show import confirmation with package details
            const confirmMessage = `Import Asset Pack: "${assetPackage.name}"
        
Description: ${assetPackage.description || 'No description'}
Version: ${assetPackage.version}
Author: ${assetPackage.author || 'Unknown'}
Files: ${assetPackage.totalFiles || assetPackage.files.length}
Directories: ${assetPackage.totalDirectories || 0}

Continue with import?`;

            if (!confirm(confirmMessage)) {
                return;
            }

            // Create directory based on package name
            const packageName = assetPackage.name || file.name.replace('.dmjs', '');
            const sanitizedPackageName = packageName.replace(/[^a-z0-9\s]/gi, '_');
            const importPath = `/${sanitizedPackageName}`;

            // Ensure the main directory exists
            await this.fileBrowser.createDirectory(importPath);

            // Create all directories first (if directory structure is preserved)
            if (assetPackage.directories) {
                for (const dirPath of assetPackage.directories) {
                    const newDirPath = `${importPath}${dirPath}`;
                    await this.fileBrowser.createDirectory(newDirPath);
                }
            }

            // Import files with preserved directory structure
            let successCount = 0;
            let errorCount = 0;

            for (const fileEntry of assetPackage.files) {
                try {
                    // Preserve original directory structure
                    const newPath = `${importPath}${fileEntry.path}`;

                    // Ensure parent directories exist
                    const parentPath = newPath.substring(0, newPath.lastIndexOf('/'));
                    if (parentPath !== importPath && parentPath !== '/') {
                        await this.fileBrowser.createDirectory(parentPath);
                    }

                    // Write the file
                    await this.fileBrowser.writeFile(newPath, fileEntry.content, true);
                    successCount++;
                } catch (error) {
                    console.error(`Error importing file ${fileEntry.path}:`, error);
                    errorCount++;
                }
            }

            this.fileBrowser.refreshFiles();

            const statusMessage = errorCount > 0
                ? `Asset pack imported with ${successCount} files succeeded, ${errorCount} files failed`
                : `Asset pack "${packageName}" imported successfully with ${successCount} files`;

            this.fileBrowser.showNotification(statusMessage, errorCount > 0 ? 'warning' : 'success');

            // Navigate to the newly created directory
            await this.fileBrowser.navigateTo(importPath);

        } catch (error) {
            console.error('Error importing assets:', error);
            this.fileBrowser.showNotification(`Error importing assets: ${error.message}`, 'error');
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e.target.error);
            reader.readAsText(file);
        });
    }
}

window.assetManager = new AssetManager(window.fileBrowser || null);