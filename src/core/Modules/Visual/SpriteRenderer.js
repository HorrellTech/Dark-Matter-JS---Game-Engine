/**
 * SpriteRenderer - Renders sprite images
 * 
 * This module renders sprite images and supports sprite properties 
 * like size, pivot, and flip modes.
 */
class SpriteRenderer extends Module {
    static allowMultiple = false;
    static namespace = "Visual";
    static description = "Displays a sprite/image";
    static iconClass = "fas fa-image";

    constructor() {
        super("SpriteRenderer");

        // Import AssetReference if it's not already available
        if (!window.AssetReference) {
            console.warn("AssetReference not found, SpriteRenderer may not work correctly");
        }

        // Sprite image reference - use a safe way to create an AssetReference
        try {
            this.imageAsset = new (window.AssetReference || function (p) { return { path: p }; })(null, 'image');
        } catch (error) {
            console.error("Error creating AssetReference:", error);
            this.imageAsset = { path: null, load: () => Promise.resolve(null) };
        }

        // Sprite size
        this.width = 64;
        this.height = 64;

        this.drawingCanvas = "normal"; // Options: normal, background, gui

        this.visible = true;

        // Sprite properties
        this.color = "#ffffff";
        this.flipX = false;
        this.flipY = false;
        this.pivot = new Vector2(0.5, 0.5); // Center pivot by default
        this.sliceMode = false; // 9-slice rendering mode
        this.sliceBorder = { left: 10, right: 10, top: 10, bottom: 10 };

        // New scaling property
        this.scaleMode = "stretch"; // Options: stretch, fit, fill, tile

        // Animation properties
        this.frameX = 0;
        this.frameY = 0;
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.frames = 1;

        // Internal state
        this._image = null;
        this._isLoaded = false;
        this._imageWidth = 0;
        this._imageHeight = 0;

        this.imageCache = new Map();

        // Make sure this is called after all properties are set up
        this.registerProperties();

        // Attempt to refresh Inspector if already available
        setTimeout(() => this.refreshInspector(), 100);

        // Add custom styles to the document
        this.addCustomStyles();
    }

    /**
     * Register all properties for this module
     */
    registerProperties() {
        // Clear any previously registered properties
        this.clearProperties();

        // Enhanced image asset property with AssetManager integration
        this.exposeProperty("imageAsset", "asset", this.imageAsset, {
            description: "Sprite image to display",
            assetType: 'image',  // This tells the Inspector it's an image asset
            fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            onAssetSelected: (assetPath) => {
                this.setSprite(assetPath);  // Your custom handler
            }
        });

        this.exposeProperty("drawingCanvas", "enum", this.drawingCanvas, {
            description: "Which canvas to draw the sprite on",
            options: [
                { value: "normal", label: "Normal" },
                { value: "background", label: "Background" },
                { value: "gui", label: "GUI" }
            ],
            onChange: (value) => {
                this.drawingCanvas = value;
            }
        });

        this.exposeProperty("visible", "boolean", this.visible, {
            description: "Whether the sprite is visible",
            onChange: (value) => {
                this.visible = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("width", "number", this.width, {
            description: "Width of the sprite in pixels",
            min: 1,
            max: 2048,
            step: 1,
            onChange: (value) => {
                this.width = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("height", "number", this.height, {
            description: "Height of the sprite in pixels",
            min: 1,
            max: 2048,
            step: 1,
            onChange: (value) => {
                this.height = value;
                window.editor?.refreshCanvas();
            }
        });

        // Make sure the scaleMode property is correctly registered with onChange handler
        this.exposeProperty("scaleMode", "enum", this.scaleMode, {
            description: "How the image should be scaled to fit the dimensions",
            enumValues: [
                { value: "stretch", label: "Stretch" },
                { value: "fit", label: "Fit (preserve aspect ratio)" },
                { value: "fill", label: "Fill (preserve aspect ratio, may crop)" },
                { value: "tile", label: "Tile (repeat image)" },
                { value: "9-slice", label: "9-Slice (stretchable borders)" }
            ],
            onChange: (value) => {
                // Store previous mode to check for changes
                const previousMode = this.scaleMode;

                // Update the scale mode
                this.scaleMode = value;

                // Handle 9-slice mode toggle
                if (value === "9-slice") {
                    this.sliceMode = true;

                    // Only refresh border controls if we're switching TO 9-slice mode
                    if (previousMode !== "9-slice") {
                        this.refreshBorderControls();
                    }
                } else {
                    this.sliceMode = false;

                    // If we're switching FROM 9-slice mode, refresh to remove border controls
                    if (previousMode === "9-slice") {
                        this.refreshBorderControls();
                    }
                }

                // Refresh the canvas
                window.editor?.refreshCanvas();
            },
            cssClass: "scale-mode-dropdown" // Add custom CSS class for styling
        });

        // Register remaining properties
        this.exposeProperty("color", "color", this.color, {
            description: "Tint color for the sprite",
            onChange: (value) => {
                this.color = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("flipX", "boolean", this.flipX, {
            description: "Flip the sprite horizontally",
            onChange: (value) => {
                this.flipX = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("flipY", "boolean", this.flipY, {
            description: "Flip the sprite vertically",
            onChange: (value) => {
                this.flipY = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("pivot", "vector2", this.pivot, {
            description: "Pivot point for rotation (0,0 = top left, 1,1 = bottom right)",
            onChange: (value) => {
                this.pivot = value;
                window.editor?.refreshCanvas();
            }
        });

        // Only show slice border options when 9-slice mode is active
        if (this.scaleMode === "9-slice" || this.sliceMode) {
            this.addSliceBorderProperties();
        }
    }

    /**
     * Add 9-slice border properties to the inspector
     */
    addSliceBorderProperties() {
        this.exposeProperty("sliceBorder.left", "number", this.sliceBorder.left, {
            description: "Left border size for 9-slice",
            min: 0,
            max: 100,
            step: 1,
            label: "Border Left",
            onChange: (value) => {
                this.sliceBorder.left = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("sliceBorder.right", "number", this.sliceBorder.right, {
            description: "Right border size for 9-slice",
            min: 0,
            max: 100,
            step: 1,
            label: "Border Right",
            onChange: (value) => {
                this.sliceBorder.right = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("sliceBorder.top", "number", this.sliceBorder.top, {
            description: "Top border size for 9-slice",
            min: 0,
            max: 100,
            step: 1,
            label: "Border Top",
            onChange: (value) => {
                this.sliceBorder.top = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("sliceBorder.bottom", "number", this.sliceBorder.bottom, {
            description: "Bottom border size for 9-slice",
            min: 0,
            max: 100,
            step: 1,
            label: "Border Bottom",
            onChange: (value) => {
                this.sliceBorder.bottom = value;
                window.editor?.refreshCanvas();
            }
        });
    }

    clearProperties() {
        // Clear any previously registered properties
        if (this.properties) {
            for (const prop in this.properties) {
                if (this.properties.hasOwnProperty(prop)) {
                    delete this.properties[prop];
                }
            }
        }
    }

    /**
     * Refresh border controls when switching to 9-slice mode
     */
    refreshBorderControls() {
        // Re-register all properties to include/exclude slice border properties
        this.registerProperties();

        // Force a refresh of the inspector UI
        this.refreshInspector();
    }

    /**
     * Called when the module is first activated
     */
    async start() {
        // Only load the sprite image if we don't already have embedded data loaded
        if (!this._isLoaded) {
            await this.loadImage();
        }
    }

    /**
     * Load the sprite image from the asset reference
     */
    async loadImage() {
        // If we have embedded data and no path, don't try to load from path
        if (this.imageAsset && this.imageAsset.embedded && !this.imageAsset.path) {
            console.log('Skipping path-based loading for embedded image data - already loaded');
            return this._image;
        }

        if (!this.imageAsset || (!this.imageAsset.path && !this.imageAsset.embedded)) {
            if (!this._isLoaded && (!this.imageAsset || !this.imageAsset.embedded)) {
                console.warn('No image asset path to load');
            }
            return null;
        }

        try {
            console.log('Loading image for SpriteRenderer:', this.imageAsset.path);

            // PRIORITY 1: Load from AssetManager (both editor and exported games)
            if (this.imageAsset.path) {
                const asset = await this.loadFromAssetManager(this.imageAsset.path);
                if (asset) {
                    return asset;
                }
            }

            // PRIORITY 2: If we're in editor mode with FileBrowser, load from FileBrowser
            if (window.editor && window.editor.fileBrowser && this.imageAsset.path) {
                try {
                    const image = await this.loadImageFromFileBrowser(this.imageAsset.path);
                    if (image) {
                        console.log('Image loaded via FileBrowser successfully');
                        this._image = image;
                        this._imageWidth = image.naturalWidth || image.width;
                        this._imageHeight = image.naturalHeight || image.height;
                        this._isLoaded = true;
                        return image;
                    }
                } catch (error) {
                    console.warn('FileBrowser loading failed, trying fallback:', error);
                }
            }

            // If we have embedded data, use the load function
            if (this.imageAsset.embedded && typeof this.imageAsset.load === 'function') {
                console.log('Loading embedded image data');
                const image = await this.imageAsset.load();
                if (image) {
                    this._image = image;
                    this._imageWidth = image.naturalWidth || image.width;
                    this._imageHeight = image.naturalHeight || image.height;
                    this._isLoaded = true;
                    return image;
                }
            }

            // Final fallback for exported games
            if (this.imageAsset.path) {
                return await this.fallbackLoadImage(this.imageAsset.path);
            }

            return null;

        } catch (error) {
            console.error('Error loading sprite image:', error);
            this._image = null;
            this._isLoaded = false;
            return null;
        }
    }

    /**
     * Load image from FileBrowser (editor mode)
     * @param {string} path - Path to the image
     * @returns {Promise<HTMLImageElement>} - Loaded image
     */
    async loadImageFromFileBrowser(path) {
        try {
            const fileBrowser = window.editor.fileBrowser;

            // Read the file content from FileBrowser
            const content = await fileBrowser.readFile(path);
            if (!content) {
                throw new Error(`Could not read file from FileBrowser: ${path}`);
            }

            console.log('FileBrowser content type:', typeof content, content.substring ? content.substring(0, 50) + '...' : 'Binary data');

            // Check if content is already a data URL (for images)
            if (typeof content === 'string' && content.startsWith('data:image')) {
                console.log('Loading image from data URL via FileBrowser');
                const image = await this.loadImageFromDataURL(content);

                // Auto-size the sprite to match the image if dimensions are default
                if (this.width === 64 && this.height === 64) {
                    this.width = image.naturalWidth;
                    this.height = image.naturalHeight;
                    console.log(`Auto-sized sprite to ${this.width}x${this.height}`);

                    // Refresh inspector to show new dimensions
                    if (window.editor && window.editor.inspector) {
                        window.editor.inspector.refreshModuleUI(this);
                    }
                }

                return image;
            }
            // Handle cases where FileBrowser returns the content differently
            else if (typeof content === 'string' && !content.startsWith('data:')) {
                // If it's a string but not a data URL, it might be base64 or raw content
                // Try to construct a data URL
                try {
                    // Detect image type from path
                    const extension = path.split('.').pop().toLowerCase();
                    let mimeType = 'image/png'; // default

                    if (extension === 'jpg' || extension === 'jpeg') {
                        mimeType = 'image/jpeg';
                    } else if (extension === 'gif') {
                        mimeType = 'image/gif';
                    } else if (extension === 'webp') {
                        mimeType = 'image/webp';
                    } else if (extension === 'svg') {
                        mimeType = 'image/svg+xml';
                    }

                    let dataUrl;
                    if (content.startsWith('data:')) {
                        // Already has data URL prefix, might be malformed
                        dataUrl = content.startsWith('data:') ? content : `data:${mimeType};base64,${content}`;
                    } else {
                        // Assume it's base64 data
                        dataUrl = `data:${mimeType};base64,${content}`;
                    }

                    console.log('Attempting to load as constructed data URL');
                    const image = await this.loadImageFromDataURL(dataUrl);

                    // Auto-size the sprite to match the image if dimensions are default
                    if (this.width === 64 && this.height === 64) {
                        this.width = image.naturalWidth;
                        this.height = image.naturalHeight;
                        console.log(`Auto-sized sprite to ${this.width}x${this.height}`);

                        // Refresh inspector to show new dimensions
                        if (window.editor && window.editor.inspector) {
                            window.editor.inspector.refreshModuleUI(this);
                        }
                    }

                    return image;
                } catch (error) {
                    console.error('Failed to construct data URL:', error);
                    throw new Error(`File content is not a valid image: ${path}`);
                }
            }
            // Handle binary content (Blob/ArrayBuffer)
            else if (content instanceof Blob || content instanceof ArrayBuffer) {
                console.log('Converting binary content to data URL');
                let blob = content;
                if (content instanceof ArrayBuffer) {
                    blob = new Blob([content], { type: `image/${path.split('.').pop().toLowerCase()}` });
                }

                const dataUrl = await this.blobToDataURL(blob);
                const image = await this.loadImageFromDataURL(dataUrl);

                // Auto-size the sprite to match the image if dimensions are default
                if (this.width === 64 && this.height === 64) {
                    this.width = image.naturalWidth;
                    this.height = image.naturalHeight;
                    console.log(`Auto-sized sprite to ${this.width}x${this.height}`);

                    // Refresh inspector to show new dimensions
                    if (window.editor && window.editor.inspector) {
                        window.editor.inspector.refreshModuleUI(this);
                    }
                }

                return image;
            }
            else {
                throw new Error(`Unsupported file content type for image: ${typeof content}`);
            }
        } catch (error) {
            console.error('Error loading image from FileBrowser:', error);
            throw error;
        }
    }

    async blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Force a refresh of the Inspector UI for this module
     */
    refreshInspector() {
        if (window.editor && window.editor.inspector) {
            // Clear any cached property data
            if (window.editor.inspector.clearModuleCache) {
                window.editor.inspector.clearModuleCache(this);
            }

            // Re-generate the module UI
            window.editor.inspector.refreshModuleUI(this);

            // Refresh the canvas to show visual changes
            window.editor.refreshCanvas();
        }
    }

    /**
     * Fallback method to load an image when AssetReference isn't working
     * @param {string} path - Path to the image
     * @returns {Promise<HTMLImageElement>} - Loaded image
     */
    fallbackLoadImage(path) {
        return new Promise((resolve, reject) => {
            // Check if path is null or undefined
            if (!path) {
                reject(new Error('No image path provided'));
                return;
            }

            const img = new Image();

            // For exported games, if asset manager has no cache, that's a critical error
            if (window.assetManager && window.assetManager.cache) {
                const normalizedPath = window.assetManager.normalizePath ?
                    window.assetManager.normalizePath(path) :
                    path.replace(/^\/+/, '').replace(/\\/g, '/');

                console.log('Looking for cached asset:', normalizedPath);
                console.log('Available cached assets:', Object.keys(window.assetManager.cache));

                // Try multiple path variations for lookup
                const pathVariations = [
                    path,
                    normalizedPath,
                    path.replace(/^[\/\\]+/, ''),
                    path.replace(/\\/g, '/'),
                    path.split('/').pop(),
                    path.split('\\').pop(),
                    decodeURIComponent(path),
                    '/' + path.replace(/^[\/\\]+/, ''),
                    '/' + normalizedPath,
                ];

                let cached = null;
                let foundPath = null;

                for (const variation of pathVariations) {
                    if (window.assetManager.cache[variation]) {
                        cached = window.assetManager.cache[variation];
                        foundPath = variation;
                        console.log('Found cached asset with path variation:', foundPath);
                        break;
                    }
                }

                if (cached) {
                    if (cached instanceof HTMLImageElement) {
                        console.log('Using cached HTMLImageElement');
                        this._image = cached;
                        this._imageWidth = cached.naturalWidth || cached.width;
                        this._imageHeight = cached.naturalHeight || cached.height;
                        this._isLoaded = true;
                        resolve(cached);
                        return;
                    } else if (typeof cached === 'string' && cached.startsWith('data:')) {
                        console.log('Loading cached data URL');
                        img.src = cached;
                    } else if (cached.content && typeof cached.content === 'string' && cached.content.startsWith('data:')) {
                        console.log('Loading cached asset content as data URL');
                        img.src = cached.content;
                    } else {
                        console.error('Cached asset is not a valid image format:', typeof cached, cached);
                        reject(new Error(`Cached asset for ${path} is not a valid image`));
                        return;
                    }
                } else {
                    // Critical error for exported games
                    const isExportedGame = window.location.protocol === 'file:' || !window.fileBrowser;
                    if (isExportedGame) {
                        const errorMsg = `Image not found in asset cache: ${path}. This is likely an export issue. Available assets: ${Object.keys(window.assetManager.cache).join(', ')}`;
                        console.error(errorMsg);
                        reject(new Error(errorMsg));
                        return;
                    } else {
                        // Development mode - try direct loading
                        console.warn('Asset not in cache, trying direct load for development mode');
                        this.tryMultipleImagePaths(img, path).then(resolve).catch(reject);
                        return;
                    }
                }
            } else {
                console.warn('No asset manager or cache available');
                // Try direct loading
                img.src = path;
            }

            img.onload = () => {
                console.log('Image loaded successfully:', img.src.substring(0, 100) + '...');
                this._image = img;
                this._imageWidth = img.naturalWidth || img.width;
                this._imageHeight = img.naturalHeight || img.height;
                this._isLoaded = true;
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('Error loading image:', path, error);
                reject(new Error(`Failed to load image: ${path}`));
            };
        });
    }

    /**
     * Try loading an image from multiple possible paths
     * @param {HTMLImageElement} img - Image element to load into
     * @param {string} originalPath - Original path that failed
     * @returns {Promise<HTMLImageElement>} - Promise that resolves when image loads
     */
    async tryMultipleImagePaths(img, originalPath) {
        // First, try to use FileBrowser to resolve the path
        if (window.editor && window.editor.fileBrowser) {
            const fileBrowser = window.editor.fileBrowser;

            // Try different relative paths within the FileBrowser's workspace
            const possiblePaths = [
                originalPath,
                originalPath.replace(/^[\/\\]+/, ''), // Remove leading slashes
                `assets/${originalPath.replace(/^[\/\\]+/, '')}`,
                `images/${originalPath.replace(/^[\/\\]+/, '')}`,
                `src/assets/${originalPath.replace(/^[\/\\]+/, '')}`,
                `public/assets/${originalPath.replace(/^[\/\\]+/, '')}`,
                // Also try just the filename in common directories
                `assets/${originalPath.split(/[\/\\]/).pop()}`,
                `images/${originalPath.split(/[\/\\]/).pop()}`,
                `src/assets/${originalPath.split(/[\/\\]/).pop()}`,
                `public/assets/${originalPath.split(/[\/\\]/).pop()}`
            ];

            console.log('Trying FileBrowser paths for image:', originalPath, possiblePaths);

            // Try each path with FileBrowser
            for (const testPath of possiblePaths) {
                try {
                    if (await fileBrowser.fileExists(testPath)) {
                        console.log('Found file in FileBrowser:', testPath);
                        const image = await this.loadImageFromFileBrowser(testPath);
                        if (image) {
                            this._image = image;
                            this._imageWidth = image.naturalWidth || image.width;
                            this._imageHeight = image.naturalHeight || image.height;
                            this._isLoaded = true;
                            return image;
                        }
                    }
                } catch (error) {
                    // Continue to next path
                    continue;
                }
            }
        }

        // If FileBrowser approach failed, try AssetManager cache with normalized paths
        if (window.assetManager && window.assetManager.cache) {
            const cache = window.assetManager.cache;
            const cleanPath = originalPath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');

            const pathVariations = [
                originalPath,
                cleanPath,
                `/${cleanPath}`,
                cleanPath.split('/').pop(), // Just filename
                cleanPath.split('\\').pop(), // Just filename (Windows)
                decodeURIComponent(originalPath),
                decodeURIComponent(cleanPath)
            ];

            console.log('Trying AssetManager cache paths:', pathVariations);
            console.log('Available cached assets:', Object.keys(cache));

            for (const variation of pathVariations) {
                if (cache[variation]) {
                    const cached = cache[variation];
                    if (cached instanceof HTMLImageElement) {
                        console.log('Found cached image:', variation);
                        this._image = cached;
                        this._imageWidth = cached.naturalWidth || cached.width;
                        this._imageHeight = cached.naturalHeight || cached.height;
                        this._isLoaded = true;
                        return cached;
                    } else if (typeof cached === 'string' && cached.startsWith('data:')) {
                        console.log('Loading cached data URL:', variation);
                        return this.loadImageFromDataURL(cached);
                    }
                }
            }
        }

        // Last resort: only for exported games or when all else fails
        console.warn('All relative path attempts failed, falling back to direct URL loading');
        return this.directUrlFallback(img, originalPath);
    }

    /**
 * Direct URL fallback (only for exported games or when other methods fail)
 * @param {HTMLImageElement} img - Image element to load into
 * @param {string} originalPath - Original path that failed
 * @returns {Promise<HTMLImageElement>} - Promise that resolves when image loads
 */
    async directUrlFallback(img, originalPath) {
        // Only use direct URL loading as a last resort and warn about it
        console.warn('Using direct URL fallback - this may not work in all environments:', originalPath);

        // Remove leading slashes and normalize
        const cleanPath = originalPath.replace(/^\/+/, '').replace(/\\/g, '/');

        // Generate minimal possible paths to try
        const possiblePaths = [
            cleanPath, // Relative to current directory
            `assets/${cleanPath}`,
            `images/${cleanPath}`,
            originalPath // Original path as-is
        ];

        console.log('Trying direct URL paths:', possiblePaths);

        // Try each path until one works
        for (const testPath of possiblePaths) {
            try {
                const success = await this.testImagePath(testPath);
                if (success) {
                    console.log('Successfully loaded image from direct URL:', testPath);
                    return new Promise((resolve, reject) => {
                        img.onload = () => {
                            this._image = img;
                            this._imageWidth = img.naturalWidth || img.width;
                            this._imageHeight = img.naturalHeight || img.height;
                            this._isLoaded = true;
                            resolve(img);
                        };
                        img.onerror = reject;
                        img.src = testPath;
                    });
                }
            } catch (error) {
                // Continue to next path
                continue;
            }
        }

        throw new Error(`Could not load image from any of the attempted paths for: ${originalPath}`);
    }

    /**
     * Test if an image can be loaded from a specific path
     * @param {string} path - Path to test
     * @returns {Promise<boolean>} - True if image loads successfully
     */
    testImagePath(path) {
        return new Promise((resolve) => {
            const testImg = new Image();
            testImg.onload = () => resolve(true);
            testImg.onerror = () => resolve(false);

            // Set a timeout to avoid hanging
            setTimeout(() => resolve(false), 3000);

            testImg.src = path;
        });
    }

    /**
     * Resolve image path for direct loading
     * @param {string} path - Original path
     * @returns {string} - Resolved path
     */
    resolveImagePath(path) {
        if (!path) return '';

        // If it's already a full URL or data URL, return as-is
        if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }

        // Remove leading slashes and normalize
        const cleanPath = path.replace(/^\/+/, '').replace(/\\/g, '/');

        // Try to construct a proper path relative to the current location
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');

        // Check if the file exists in common asset directories
        const possiblePaths = [
            cleanPath,
            `assets/${cleanPath}`,
            `images/${cleanPath}`,
            `src/assets/${cleanPath}`,
            `src/images/${cleanPath}`,
            `public/${cleanPath}`,
            `public/assets/${cleanPath}`,
            `public/images/${cleanPath}`
        ];

        // For now, return the first possible path
        // In a real implementation, you might want to test each path
        return baseUrl + possiblePaths[0];
    }

    /**
     * Set the sprite image by path
     * @param {string} path - File path to the image
     */
    async setSprite(path) {
        console.log('setSprite called with path:', path);

        if (path === null || path === undefined) {
            this.imageAsset = null;
            this._image = null;
            this._isLoaded = false;
            return;
        }

        // Normalize the path to prevent issues with double slashes or malformed paths
        path = path.replace(/\/+/g, '/'); // Collapse multiple slashes to a single slash
        if (!path.startsWith('/')) {
            path = '/' + path; // Ensure it starts with a single slash
        }

        if (this.imageAsset && this.imageAsset.path === path) {
            console.log('Sprite path unchanged, skipping');
            return;
        }

        try {
            // Create new asset reference
            if (window.AssetReference) {
                this.imageAsset = new window.AssetReference(path, 'image');
            } else {
                this.imageAsset = {
                    path: path,
                    type: 'image',
                    load: () => window.assetManager ?
                        window.assetManager.getAssetByPath(path) :
                        this.fallbackLoadImage(path)
                };
            }

            // Load via AssetManager
            const image = await this.loadImage();

            if (image) {
                console.log('Image loaded successfully:', image.src || 'data URL');

                // Auto-size sprite to match image if using defaults
                if (this.width === 64 && this.height === 64) {
                    this.width = image.naturalWidth;
                    this.height = image.naturalHeight;
                    console.log(`Auto-sized sprite to ${this.width}x${this.height}`);
                }
            } else {
                console.warn('Failed to load image');
            }

            // Force refresh of UI and canvas
            if (window.editor) {
                window.editor.refreshCanvas();
            }

        } catch (error) {
            console.error("Error setting sprite:", error);
        }
    }

    /**
      * Draw the sprite
      * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
      */
    draw(ctx) {
        if (!this.visible) return;

        // Don't draw if we have no image or width/height is zero
        if (!this._image || !this._isLoaded || this.width === 0 || this.height === 0) {
            this.drawPlaceholder(ctx);
            return;
        }

        // Calculate draw position based on pivot
        const pivotX = this.width * this.pivot.x;
        const pivotY = this.height * this.pivot.y;

        // Save current context state
        ctx.save();

        // Apply flipping
        if (this.flipX || this.flipY) {
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        }

        // Handle drawing based on frame/slice/scale mode
        //if (this.frameWidth < this._imageWidth || this.frameHeight < this._imageHeight) {
        // Draw a specific frame from a spritesheet
        //    this.drawFrame(ctx, -pivotX, -pivotY);
        //} else {
        /*if(this.drawingCanvas == "background") {
            ctx = this.getBackgroundCanvas();
        } else if(this.drawingCanvas == "gui") {
            ctx = this.getGUIContextCanvas();
        } else {
            ctx = this.getMainCanvas();
        }*/

        // Draw based on scale mode - Always use drawWithScaleMode
        this.drawWithScaleMode(ctx, -pivotX, -pivotY);
        //}

        // Apply color tint if not white (after drawing the image)
        if (this.color !== "#ffffff") {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this.color;
            ctx.fillRect(-pivotX, -pivotY, this.width, this.height);
        }

        // Restore context state
        ctx.restore();
    }

    /**
     * Draw a frame from a spritesheet
     */
    drawFrame(ctx, x, y) {
        ctx.drawImage(
            this._image,
            this.frameX * this.frameWidth,
            this.frameY * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            x, y,
            this.width,
            this.height
        );
    }

    /**
     * Register this module with the Inspector to handle custom UI
     */
    registerCustomInspectorHandlers() {
        if (!window.editor || !window.editor.inspector) return;

        // Register a custom UI creator for this module type
        window.editor.inspector.registerCustomUIHandler(
            'SpriteRenderer',
            'imageAsset',
            (element, module) => {
                // Set up drag and drop for the image preview
                if (element.classList.contains('image-preview')) {
                    module.setupDragAndDrop(element);
                }
            }
        );
    }

    /**
     * Override to handle image preview in the Inspector
     */
    onInspectorCreated() {
        // Register custom handlers for the Inspector
        this.registerCustomInspectorHandlers();
    }

    /**
     * Set up the image preview element to handle drag and drop
     * @param {HTMLElement} imagePreview - The image preview element 
     */
    setupDragAndDrop(imagePreview) {
        if (!imagePreview) return;

        // Enable drag & drop
        imagePreview.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imagePreview.classList.add('drag-over');
        });

        imagePreview.addEventListener('dragleave', () => {
            imagePreview.classList.remove('drag-over');
        });

        imagePreview.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            imagePreview.classList.remove('drag-over');

            const success = await this.handleImageDrop(e.dataTransfer);
            if (success) {
                // Find the parent Inspector instance to refresh UI
                if (window.editor && window.editor.inspector) {
                    window.editor.inspector.refreshModuleUI(this);
                    window.editor.refreshCanvas();
                }
            }
        });
    }

    /**
 * Handle dropped image files
 * @param {DataTransfer} dataTransfer - Drop event data
 * @returns {Promise<boolean>} - Success status
 */
    async handleImageDrop(dataTransfer) {
        try {
            // Check if we have files directly dropped
            if (dataTransfer.files && dataTransfer.files.length > 0) {
                const file = dataTransfer.files[0];

                // Validate it's an image
                if (!file.type.startsWith('image/')) {
                    console.warn('Dropped file is not an image:', file.type);
                    return false;
                }

                // Get the FileBrowser instance
                const fileBrowser = window.editor?.fileBrowser || window.fileBrowser;
                if (!fileBrowser) {
                    console.warn('FileBrowser not available for image upload');
                    return false;
                }

                // Upload to FileBrowser
                await fileBrowser.handleFileUpload(file);

                // Set the image asset to this path
                const path = `${fileBrowser.currentPath}/${file.name}`;
                await this.setSprite(path);

                console.log('Successfully set sprite to:', path);
                return true;
            }

            // Check if we have JSON data (from internal drag & drop from file browser)
            const jsonData = dataTransfer.getData('application/json');
            if (jsonData) {
                try {
                    const items = JSON.parse(jsonData);
                    if (items && items.length > 0) {
                        // Get the first item's path
                        const path = items[0].path;
                        if (path && this.isImagePath(path)) {
                            await this.setSprite(path);
                            console.log('Successfully set sprite to:', path);
                            return true;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing drag JSON data:', e);
                }
            }

            // Check if we have plain text (from copy link etc)
            const textData = dataTransfer.getData('text/plain');
            if (textData && this.isImagePath(textData)) {
                await this.setSprite(textData);
                console.log('Successfully set sprite to:', textData);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error handling image drop:', error);
            return false;
        }
    }

    /**
     * Check if a path is an image file based on extension
     * @param {string} path - File path
     * @returns {boolean} - True if it's an image file
     */
    isImagePath(path) {
        if (!path) return false;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        const lowercasePath = path.toLowerCase();
        return imageExtensions.some(ext => lowercasePath.endsWith(ext));
    }

    /**
     * Load an image from local file
     */
    async loadImageFromFile() {
        // Create a file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        // Listen for file selection
        input.onchange = async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];

                // Get the FileBrowser instance
                const fileBrowser = window.editor?.fileBrowser;
                if (!fileBrowser) {
                    console.warn('FileBrowser not available for image upload');
                    return;
                }

                // Upload to FileBrowser
                await fileBrowser.handleFileUpload(file);

                // Set the sprite to this path
                const path = `${fileBrowser.currentPath}/${file.name}`;
                await this.setSprite(path);
            }
        };

        // Trigger file selection
        input.click();
    }

    /**
 * Load image from data URL
 * @param {string} dataUrl - Data URL of the image
 * @returns {Promise<HTMLImageElement>} - Loaded image
 */
    loadImageFromDataURL(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                console.log('Image loaded from data URL successfully');
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('Error loading image from data URL:', error);
                reject(new Error('Failed to load image from data URL'));
            };

            img.src = dataUrl;
        });
    }

    /**
     * Load an image from URL
     */
    async loadImageFromUrl() {
        // Show a prompt for URL input
        const url = await this.promptUrlInput();
        if (!url) return;

        try {
            // Create a temporary image to validate the URL
            const tempImg = new Image();

            // Create a promise to wait for image loading
            const loaded = new Promise((resolve, reject) => {
                tempImg.onload = () => resolve(true);
                tempImg.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`));

                // Set a timeout in case the image never loads
                setTimeout(() => reject(new Error('Image loading timed out')), 10000);
            });

            // Start loading the image
            tempImg.crossOrigin = "anonymous";
            tempImg.src = url;

            // Wait for the image to load
            await loaded;

            // Get the FileBrowser instance
            const fileBrowser = window.editor?.fileBrowser;
            if (!fileBrowser) {
                console.warn('FileBrowser not available for image upload');
                // Use direct URL as fallback
                await this.setSprite(url);
                return;
            }

            // Convert the image to a data URL (fetch the image first to ensure CORS doesn't block it)
            const imgData = await this.fetchImageAsDataURL(url);

            // Generate a filename from the URL
            const filename = this.generateFilenameFromUrl(url);

            // Save to FileBrowser
            await fileBrowser.createFile(`${fileBrowser.currentPath}/${filename}`, imgData);

            // Set the sprite to this path
            const path = `${fileBrowser.currentPath}/${filename}`;
            await this.setSprite(path);
        } catch (error) {
            console.error('Error loading image from URL:', error);
            alert(`Failed to load image: ${error.message}`);
        }
    }

    /**
     * Fetch an image and convert to data URL
     * @param {string} url - Image URL
     * @returns {Promise<string>} - Data URL
     */
    async fetchImageAsDataURL(url) {
        try {
            // Try to fetch the image
            const response = await fetch(url, { mode: 'cors' });
            const blob = await response.blob();

            // Convert to data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Could not fetch image (possible CORS issue), using direct URL');
            return url;
        }
    }

    /**
     * Generate a filename from URL
     * @param {string} url - Image URL
     * @returns {string} - Filename
     */
    generateFilenameFromUrl(url) {
        try {
            // Try to get the filename from the URL
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();

            // If we have a valid filename with extension, use it
            if (filename && filename.includes('.')) {
                return filename;
            }
        } catch (e) {
            // URL parsing failed
        }

        // Generate a random filename
        const randomId = Math.random().toString(36).substring(2, 10);
        return `image_${randomId}.png`;
    }

    /**
     * Show a prompt dialog for URL input
     * @returns {Promise<string>} - URL or null if canceled
     */
    async promptUrlInput() {
        return new Promise((resolve) => {
            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.className = 'url-input-dialog';
            dialog.innerHTML = `
                <div class="url-input-content">
                    <h3>Enter Image URL</h3>
                    <input type="text" placeholder="https://example.com/image.png" class="url-input-field">
                    <div class="url-input-buttons">
                        <button class="cancel-btn">Cancel</button>
                        <button class="ok-btn">OK</button>
                    </div>
                </div>
            `;

            // Add styles for the dialog
            const style = document.createElement('style');
            style.innerHTML = `
                .url-input-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .url-input-content {
                    background-color: #2a2a2a;
                    border-radius: 4px;
                    padding: 20px;
                    width: 400px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                .url-input-content h3 {
                    margin-top: 0;
                    color: #eee;
                }
                .url-input-field {
                    width: 100%;
                    padding: 8px;
                    margin: 10px 0;
                    background: #333;
                    border: 1px solid #555;
                    color: #eee;
                    border-radius: 2px;
                }
                .url-input-buttons {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 15px;
                }
                .url-input-buttons button {
                    padding: 6px 12px;
                    margin-left: 10px;
                    background: #444;
                    border: none;
                    color: #eee;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .url-input-buttons button.ok-btn {
                    background: #2196F3;
                }
                .url-input-buttons button:hover {
                    opacity: 0.9;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(dialog);

            // Get elements
            const input = dialog.querySelector('.url-input-field');
            const cancelBtn = dialog.querySelector('.cancel-btn');
            const okBtn = dialog.querySelector('.ok-btn');

            // Functions to handle dialog interaction
            const close = () => {
                document.body.removeChild(dialog);
                document.head.removeChild(style);
            };

            const cancel = () => {
                close();
                resolve(null);
            };

            const confirm = () => {
                const url = input.value.trim();
                close();
                resolve(url ? url : null);
            };

            // Set up event listeners
            cancelBtn.addEventListener('click', cancel);
            okBtn.addEventListener('click', confirm);

            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') confirm();
                if (e.key === 'Escape') cancel();
            });

            // Focus the input field
            setTimeout(() => input.focus(), 50);
        });
    }

    /**
     * Draw a placeholder when no image is loaded
     */
    drawPlaceholder(ctx) {
        // Calculate position based on pivot
        const pivotX = this.width * this.pivot.x;
        const pivotY = this.height * this.pivot.y;

        ctx.save();

        // Draw a placeholder rectangle with an "image" icon
        ctx.strokeStyle = "#aaaaaa";
        ctx.fillStyle = "#333333";
        ctx.lineWidth = 2;

        // Draw background
        ctx.fillRect(-pivotX, -pivotY, this.width || 64, this.height || 64);
        ctx.strokeRect(-pivotX, -pivotY, this.width || 64, this.height || 64);

        // Draw image icon
        ctx.fillStyle = "#aaaaaa";
        const iconSize = Math.min(this.width || 64, this.height || 64) * 0.5;
        const centerX = -pivotX + (this.width || 64) / 2 - iconSize / 2;
        const centerY = -pivotY + (this.height || 64) / 2 - iconSize / 2;

        // Draw simplified image icon
        ctx.fillRect(centerX, centerY, iconSize, iconSize);
        ctx.fillStyle = "#333333";
        ctx.beginPath();
        ctx.arc(centerX + iconSize * 0.7, centerY + iconSize * 0.3, iconSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw the image using the selected scale mode
     */
    drawWithScaleMode(ctx, x, y) {
        // Add some debugging
        //console.log(`Drawing with scale mode: ${this.scaleMode}`);

        switch (this.scaleMode) {
            case "fit":
                this.drawFit(ctx, x, y);
                break;
            case "fill":
                this.drawFill(ctx, x, y);
                break;
            case "tile":
                this.drawTile(ctx, x, y);
                break;
            case "9-slice":
                this.drawNineSlice(ctx, x, y);
                break;
            case "stretch":
            default:
                // Default to stretch (simple drawImage)
                ctx.drawImage(this._image, x, y, this.width, this.height);
                break;
        }
    }

    /**
     * Draw the image preserving aspect ratio and fitting inside dimensions
     */
    drawFit(ctx, x, y) {
        // Calculate aspect ratios
        const imageRatio = this._imageWidth / this._imageHeight;
        const targetRatio = this.width / this.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imageRatio > targetRatio) {
            // Image is wider than the target area relative to height
            drawWidth = this.width;
            drawHeight = this.width / imageRatio;
            offsetX = 0;
            offsetY = (this.height - drawHeight) / 2;
        } else {
            // Image is taller than the target area relative to width
            drawHeight = this.height;
            drawWidth = this.height * imageRatio;
            offsetX = (this.width - drawWidth) / 2;
            offsetY = 0;
        }

        // Draw the image centered
        ctx.drawImage(this._image, 0, 0, this._imageWidth, this._imageHeight,
            x + offsetX, y + offsetY, drawWidth, drawHeight);
    }

    /**
     * Draw the image preserving aspect ratio and filling the entire area (may crop)
     */
    drawFill(ctx, x, y) {
        // Calculate aspect ratios
        const imageRatio = this._imageWidth / this._imageHeight;
        const targetRatio = this.width / this.height;

        let sourceX, sourceY, sourceWidth, sourceHeight;

        if (imageRatio > targetRatio) {
            // Image is wider than the target area relative to height
            sourceHeight = this._imageHeight;
            sourceWidth = this._imageHeight * targetRatio;
            sourceX = (this._imageWidth - sourceWidth) / 2;
            sourceY = 0;
        } else {
            // Image is taller than the target area relative to width
            sourceWidth = this._imageWidth;
            sourceHeight = this._imageWidth / targetRatio;
            sourceX = 0;
            sourceY = (this._imageHeight - sourceHeight) / 2;
        }

        // Draw the image cropped to fill the entire target area
        ctx.drawImage(
            this._image,
            sourceX, sourceY, sourceWidth, sourceHeight,
            x, y, this.width, this.height
        );
    }

    /**
     * Draw the image tiled to fill the entire area
     */
    drawTile(ctx, x, y) {
        // Create a pattern and fill the area
        const pattern = ctx.createPattern(this._image, 'repeat');
        if (!pattern) {
            // Fallback if pattern creation fails
            ctx.drawImage(this._image, x, y, this.width, this.height);
            return;
        }

        // Save context to isolate the pattern drawing
        ctx.save();

        // Clip to the target rectangle
        ctx.beginPath();
        ctx.rect(x, y, this.width, this.height);
        ctx.clip();

        // Fill with the pattern
        ctx.fillStyle = pattern;
        ctx.fillRect(x, y, this.width, this.height);

        // Restore context
        ctx.restore();
    }

    /**
     * Draw a nine-slice image
     */
    drawNineSlice(ctx, x, y) {
        // Implementation of 9-slice rendering
        const img = this._image;
        const w = this.width;
        const h = this.height;
        const border = this.sliceBorder;

        // Ensure border values are valid and don't exceed image dimensions
        const validLeft = Math.min(border.left, this._imageWidth / 3);
        const validRight = Math.min(border.right, this._imageWidth / 3);
        const validTop = Math.min(border.top, this._imageHeight / 3);
        const validBottom = Math.min(border.bottom, this._imageHeight / 3);

        // Ensure borders don't overlap
        const maxHorizontalBorder = Math.floor(this._imageWidth / 2);
        const maxVerticalBorder = Math.floor(this._imageHeight / 2);

        const safeLeft = Math.min(validLeft, maxHorizontalBorder);
        const safeRight = Math.min(validRight, maxHorizontalBorder);
        const safeTop = Math.min(validTop, maxVerticalBorder);
        const safeBottom = Math.min(validBottom, maxVerticalBorder);

        // Source coordinates (slices from the original image)
        const srcX = [0, safeLeft, this._imageWidth - safeRight, this._imageWidth];
        const srcY = [0, safeTop, this._imageHeight - safeBottom, this._imageHeight];

        // Destination coordinates (where to draw on the canvas)
        const dstX = [x, x + safeLeft, x + w - safeRight, x + w];
        const dstY = [y, y + safeTop, y + h - safeBottom, y + h];

        // Draw all 9 slices
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const sx = srcX[col];
                const sy = srcY[row];
                const sw = srcX[col + 1] - sx;
                const sh = srcY[row + 1] - sy;

                const dx = dstX[col];
                const dy = dstY[row];
                const dw = dstX[col + 1] - dx;
                const dh = dstY[row + 1] - dy;

                // Only draw if width and height are positive
                if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
                    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
                }
            }
        }
    }

    /**
     * Add custom styles for the SpriteRenderer's UI
     */
    addCustomStyles() {
        // Check if styles already exist
        if (document.getElementById('sprite-renderer-styles')) {
            return;
        }

        // Create style element
        const style = document.createElement('style');
        style.id = 'sprite-renderer-styles';
        style.innerHTML = `
            .scale-mode-dropdown {
                width: 100%;
                background-color: #333;
                color: #eee;
                border: 1px solid #555;
                padding: 8px;
                border-radius: 3px;
                font-size: 12px;
                height: auto !important;
                appearance: menulist; /* Show dropdown arrow */
            }
            
            .scale-mode-dropdown option {
                background-color: #333;
                color: #eee;
                padding: 6px;
            }
            
            .scale-mode-dropdown:focus {
                outline: none;
                border-color: #2196F3;
            }
            
            /* Ensure border controls are correctly aligned */
            .property-row input[data-prop-name^="sliceBorder"] {
                width: 60px;
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Load image from data URL (for deserialization)
     */
    async loadImageFromData(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this._image = img;
                this._imageWidth = img.naturalWidth;
                this._imageHeight = img.naturalHeight;
                this._isLoaded = true;
                console.log('Image loaded from data URL, dimensions:', this._imageWidth, 'x', this._imageHeight);

                // Trigger canvas refresh if in editor
                if (window.editor) {
                    window.editor.refreshCanvas();
                }

                resolve(img);
            };
            img.onerror = (error) => {
                console.error('Failed to load image from data URL:', error);
                reject(error);
            };
            img.src = dataUrl;
        });
    }

    /**
 * Load image from AssetManager
 * @param {string} path - Asset path
 * @returns {Promise<HTMLImageElement>} - Loaded image
 */
    async loadFromAssetManager(path) {
        if (!path) return null;

        try {
            // Always try to load from AssetManager first
            if (window.assetManager) {
                const asset = await window.assetManager.getAssetByPath(path);
                if (asset && asset instanceof HTMLImageElement) {
                    this._image = asset;
                    this._imageWidth = asset.naturalWidth || asset.width;
                    this._imageHeight = asset.naturalHeight || asset.height;
                    this._isLoaded = true;
                    console.log('Image loaded from AssetManager:', path);
                    return asset;
                }
            }

            // Fallback to direct loading if not in AssetManager
            return await this.fallbackLoadImage(path);
        } catch (error) {
            console.error('Error loading from AssetManager:', error);
            return null;
        }
    }

    /**
     * Enhanced asset selection from Asset Browser
     * @param {string} assetId - Asset ID from AssetManager
     */
    async selectAssetById(assetId) {
        if (!assetId) return;

        try {
            // Get asset info from AssetManager
            if (window.assetManager) {
                const assetInfo = window.assetManager.assetRegistry.get(assetId);
                if (assetInfo) {
                    await this.setSprite(assetInfo.metadata.path || assetId);
                    return;
                }
            }

            // Fallback to direct path
            await this.setSprite(assetId);

        } catch (error) {
            console.error('Error selecting asset by ID:', error);
        }
    }

    /**
     * Override to handle serialization
     */
    toJSON() {
        const json = super.toJSON() || {};

        // Only store the asset reference, not the actual image data
        json.imageAsset = this.imageAsset ? {
            path: this.imageAsset.path,
            type: 'image',
            embedded: this.imageAsset.embedded || false
        } : null;

        json.width = this.width;
        json.height = this.height;
        json.color = this.color;
        json.flipX = this.flipX;
        json.flipY = this.flipY;
        json.pivot = { x: this.pivot.x, y: this.pivot.y };
        json.scaleMode = this.scaleMode;

        // Animation properties
        json.frameX = this.frameX;
        json.frameY = this.frameY;
        json.frameWidth = this.frameWidth;
        json.frameHeight = this.frameHeight;
        json.frames = this.frames;

        // 9-slice properties
        json.sliceMode = this.sliceMode;
        json.sliceBorder = { ...this.sliceBorder };

        // DON'T store image data here - let AssetManager handle it
        return json;
    }

    /**
     * Override to handle deserialization
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        // Restore other properties first
        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.color !== undefined) this.color = json.color;
        if (json.flipX !== undefined) this.flipX = json.flipX;
        if (json.flipY !== undefined) this.flipY = json.flipY;
        if (json.pivot !== undefined) this.pivot = json.pivot;
        if (json.scaleMode !== undefined) this.scaleMode = json.scaleMode;
        if (json.sliceMode !== undefined) this.sliceMode = json.sliceMode;
        if (json.sliceBorder !== undefined) this.sliceBorder = json.sliceBorder;

        // Restore asset reference and load from AssetManager
        if (json.imageAsset && json.imageAsset.path) {
            console.log('Loading sprite from AssetManager:', json.imageAsset.path);

            try {
                if (window.AssetReference) {
                    this.imageAsset = new window.AssetReference(json.imageAsset.path, 'image');
                } else {
                    this.imageAsset = {
                        path: json.imageAsset.path,
                        type: 'image',
                        embedded: json.imageAsset.embedded || false,
                        load: () => this.loadFromAssetManager(json.imageAsset.path)
                    };
                }

                // Load the asset from AssetManager
                this.loadFromAssetManager(json.imageAsset.path);
            } catch (error) {
                console.error("Error restoring image asset:", error);
            }
        } else {
            this.imageAsset = {
                path: null,
                type: 'image',
                load: () => Promise.resolve(null)
            };
            this._image = null;
            this._isLoaded = false;
        }
    }
}

// Register module globally
window.SpriteRenderer = SpriteRenderer;