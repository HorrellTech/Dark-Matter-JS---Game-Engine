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

        // Re-register all properties
        this.exposeProperty("imageAsset", "asset", this.imageAsset, {
            description: "Sprite image to display",
            assetType: 'image',
            fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            onDropCallback: this.handleImageDrop.bind(this),
            showImageDropdown: true
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
            return this._image; // Should already be loaded via loadImageFromData
        }

        if (!this.imageAsset || !this.imageAsset.path) {
            // Only warn if we don't have an embedded image already loaded AND we're not in embedded mode
            if (!this._isLoaded && (!this.imageAsset || !this.imageAsset.embedded)) {
                console.warn('No image asset path to load');
            }
            return null;
        }

        try {
            console.log('Loading image for SpriteRenderer:', this.imageAsset.path);

            // Check if this asset uses embedded data
            if (this.imageAsset.embedded && this.imageAsset.load) {
                this._image = await this.imageAsset.load();
                console.log('Image loaded from embedded data successfully');
                return this._image;
            }

            // First try FileBrowser if available (editor mode)
            if (window.editor && window.editor.fileBrowser) {
                try {
                    console.log('Using FileBrowser to load image');
                    this._image = await this.loadImageFromFileBrowser(this.imageAsset.path);
                    console.log('Image loaded via FileBrowser successfully');
                    this._imageWidth = this._image.naturalWidth || this._image.width;
                    this._imageHeight = this._image.naturalHeight || this._image.height;
                    this._isLoaded = true;
                    return this._image;
                } catch (fileBrowserError) {
                    console.warn('FileBrowser failed, trying asset manager:', fileBrowserError.message);
                }
            }

            // Try the asset manager if available (runtime mode)
            if (window.assetManager) {
                try {
                    this._image = await window.assetManager.loadAsset(this.imageAsset.path);
                    console.log('Image loaded via asset manager successfully');
                    this._imageWidth = this._image.naturalWidth || this._image.width;
                    this._imageHeight = this._image.naturalHeight || this._image.height;
                    this._isLoaded = true;
                    return this._image;
                } catch (assetManagerError) {
                    console.warn('Asset manager failed, trying fallback:', assetManagerError.message);
                }
            }

            // Fallback to direct loading
            console.log('Using fallback loading method');
            this._image = await this.fallbackLoadImage(this.imageAsset.path);
            console.log('Image loaded successfully via fallback:', this.imageAsset.path);
            return this._image;

        } catch (error) {
            console.error('Error loading sprite image:', error);
            this._image = null;
            this._isLoaded = false;

            // Don't retry loading if we're in an exported game without fileBrowser
            if (!window.fileBrowser) {
                console.warn('Sprite image failed to load in exported game - this is expected if asset embedding failed');
            }

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

            // Check if content is already a data URL (for images)
            if (typeof content === 'string' && content.startsWith('data:image')) {
                console.log('Loading image from data URL via FileBrowser');
                return this.loadImageFromDataURL(content);
            } else {
                throw new Error(`File content is not a valid image data URL: ${path}`);
            }
        } catch (error) {
            console.error('Error loading image from FileBrowser:', error);
            throw error;
        }
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
            const img = new Image();

            // Check if path is null or undefined
            if (!path) {
                reject(new Error('No image path provided'));
                return;
            }

            // Normalize path for cache lookup
            const normalizedPath = window.assetManager?.normalizePath ?
                window.assetManager.normalizePath(path) :
                path.replace(/^\/+/, '').replace(/\\/g, '/');

            console.log('Loading image:', path, 'normalized:', normalizedPath);

            // Check asset cache first if asset manager exists
            if (window.assetManager && window.assetManager.cache) {
                console.log('Available cached assets:', Object.keys(window.assetManager.cache));

                // Try multiple path variations for lookup
                const pathVariations = [
                    path,
                    normalizedPath,
                    path.replace(/^\/+/, ''),
                    path.replace(/\\/g, '/'),
                    path.replace(/\\/g, '/').replace(/^\/+/, ''),
                    path.split('/').pop(),
                    path.split('\\').pop(),
                    decodeURIComponent(path),
                    encodeURIComponent(path.split('/').pop()),
                    path.replace(/\//g, '\\'),
                    path.replace(/\\/g, '/'),
                    '/' + path,
                    '/' + normalizedPath,
                    '/' + path.replace(/^\/+/, ''),
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
                    } else if (typeof cached === 'string') {
                        // If it's a data URL or regular URL, load it
                        console.log('Loading cached data URL or URL');
                        img.src = cached;
                    } else {
                        console.warn('Cached asset is not a valid image:', typeof cached, cached?.constructor?.name);
                        // For exported games, this is a critical error
                        if (window.location.protocol === 'file:' || !window.fileBrowser) {
                            return reject(new Error(`Cached asset for ${path} is not a valid image`));
                        }
                        // Try direct load as fallback
                        this.tryMultipleImagePaths(img, path).then(resolve).catch(reject);
                        return;
                    }
                } else {
                    console.warn('Image not found in asset cache:', path);
                    console.log('Tried path variations:', pathVariations);
                    console.log('Available assets:', Object.keys(window.assetManager.cache));

                    // For exported games, this is a critical error
                    if (window.location.protocol === 'file:' || !window.fileBrowser) {
                        return reject(new Error(`Image not found in asset cache: ${path}. Available assets: ${Object.keys(window.assetManager.cache).join(', ')}`));
                    }

                    // Fallback to trying multiple paths for development
                    console.log('Attempting multiple path resolution for development mode');
                    this.tryMultipleImagePaths(img, path).then(resolve).catch(reject);
                    return;
                }
            } else {
                // No asset manager - try multiple paths
                console.log('No asset manager found, attempting multiple path resolution');
                this.tryMultipleImagePaths(img, path).then(resolve).catch(reject);
                return;
            }

            img.onload = () => {
                console.log('Image loaded successfully:', img.src);
                this._image = img;
                this._imageWidth = img.naturalWidth || img.width;
                this._imageHeight = img.naturalHeight || img.height;
                this._isLoaded = true;
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('Error loading image:', path, error);
                // Try multiple paths as fallback
                this.tryMultipleImagePaths(img, path).then(resolve).catch(() => {
                    const errorMsg = `Error loading image: ${path}. ${window.assetManager ? `Asset cache contains: ${Object.keys(window.assetManager.cache).join(', ')}` : 'No asset manager available'}`;
                    reject(new Error(errorMsg));
                });
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
        // Remove leading slashes and normalize
        const cleanPath = originalPath.replace(/^\/+/, '').replace(/\\/g, '/');

        // Get the current base URL
        const currentUrl = new URL(window.location.href);
        const basePath = currentUrl.pathname.endsWith('/') ?
            currentUrl.pathname :
            currentUrl.pathname.substring(0, currentUrl.pathname.lastIndexOf('/') + 1);

        // Generate multiple possible paths to try
        const possiblePaths = [
            // Current directory level
            `${basePath}${cleanPath}`,
            // Common asset directories at current level
            `${basePath}assets/${cleanPath}`,
            `${basePath}images/${cleanPath}`,
            `${basePath}public/${cleanPath}`,
            `${basePath}public/assets/${cleanPath}`,
            `${basePath}public/images/${cleanPath}`,
            // Root level paths
            `${currentUrl.origin}/${cleanPath}`,
            `${currentUrl.origin}/assets/${cleanPath}`,
            `${currentUrl.origin}/images/${cleanPath}`,
            `${currentUrl.origin}/public/${cleanPath}`,
            `${currentUrl.origin}/public/assets/${cleanPath}`,
            `${currentUrl.origin}/public/images/${cleanPath}`,
            // Source directory paths (for development)
            `${basePath}src/assets/${cleanPath}`,
            `${basePath}src/images/${cleanPath}`,
            `${currentUrl.origin}/src/assets/${cleanPath}`,
            `${currentUrl.origin}/src/images/${cleanPath}`,
            // Direct original path
            originalPath
        ];

        console.log('Trying multiple paths for image:', originalPath, possiblePaths);

        // Try each path until one works
        for (const testPath of possiblePaths) {
            try {
                const success = await this.testImagePath(testPath);
                if (success) {
                    console.log('Successfully loaded image from path:', testPath);
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
            // Clear the sprite
            this.imageAsset = null;
            this._image = null;
            this._isLoaded = false;
            return;
        }

        if (this.imageAsset && this.imageAsset.path === path) {
            console.log('Sprite path unchanged, skipping');
            return;
        }

        // Create new asset reference in a safe way
        try {
            if (window.AssetReference) {
                this.imageAsset = new window.AssetReference(path, 'image');
            } else {
                // Simple fallback if AssetReference isn't available
                this.imageAsset = {
                    path: path,
                    type: 'image',
                    load: () => this.fallbackLoadImage(path)
                };
            }

            console.log('Created imageAsset:', this.imageAsset);

            // Load the image
            const image = await this.loadImage();

            if (image) {
                console.log('Image loaded successfully:', image.src);
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
     * Override to handle serialization
     */
    toJSON() {
        const json = super.toJSON() || {};

        // Serialize sprite properties
        json.imageAsset = this.imageAsset ? (typeof this.imageAsset.toJSON === 'function' ? this.imageAsset.toJSON() : { path: this.imageAsset.path }) : null;
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

        // Note: Don't embed image data here - let ExportManager handle it
        // This prevents double-encoding and corruption
        json.imageData = null;

        json.useEmbeddedData = true; // Indicate that this sprite uses embedded data

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

        // IMPORTANT: Don't clear existing loaded images unless we're explicitly replacing them
        const hasExistingImage = this._image && this._isLoaded;

        // Handle image loading based on export/embedded status
        if (json.useEmbeddedData === true && json.imageData) {
            // Exported game with embedded data - PRIORITY CASE
            console.log('Loading sprite from embedded image data');
            this.loadImageFromData(json.imageData).then(() => {
                console.log('Successfully loaded sprite from embedded data');
            }).catch(error => {
                console.error('Failed to load embedded image data:', error);
            });

            // Set a minimal imageAsset that won't try to load from path
            this.imageAsset = {
                path: null,
                type: 'image',
                embedded: true,
                load: () => this.loadImageFromData(json.imageData)
            };

        } else if (json.imageData && json.useEmbeddedData !== false) {
            // Legacy support for imageData without useEmbeddedData flag
            console.log('Loading sprite from legacy embedded image data');
            this.loadImageFromData(json.imageData).then(() => {
                console.log('Successfully loaded sprite from legacy embedded data');
            }).catch(error => {
                console.error('Failed to load legacy embedded image data:', error);
            });

            this.imageAsset = {
                path: null,
                type: 'image',
                embedded: true,
                load: () => this.loadImageFromData(json.imageData)
            };

        } else if (json.imageAsset && json.imageAsset.path) {
            // Development mode with normal imageAsset - only if we have a valid path
            console.log('Loading sprite from path:', json.imageAsset.path);
            try {
                if (window.AssetReference && typeof window.AssetReference.fromJSON === 'function') {
                    this.imageAsset = window.AssetReference.fromJSON(json.imageAsset);
                } else {
                    this.imageAsset = {
                        path: json.imageAsset.path,
                        type: 'image',
                        load: () => this.fallbackLoadImage(json.imageAsset.path)
                    };
                }
                // Delay loading slightly to ensure asset manager is ready
                setTimeout(() => {
                    this.loadImage().catch(error => {
                        console.error("Failed to load image from path:", error);
                    });
                }, 100);
            } catch (error) {
                console.error("Error restoring image asset:", error);
            }

        } else {
            // No valid image data or asset found
            // IMPORTANT: Only clear if we don't already have a loaded image
            if (!hasExistingImage) {
                console.log('No image data found in JSON, clearing image asset');
                this.imageAsset = {
                    path: null,
                    type: 'image',
                    load: () => Promise.resolve(null)
                };
                this._image = null;
                this._isLoaded = false;
            } else {
                console.log('No image data in JSON, but keeping existing loaded image');
            }
        }
    }
}

// Register module globally
window.SpriteRenderer = SpriteRenderer;