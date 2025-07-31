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
        // Load the sprite image if we have one
        await this.loadImage();
    }

    /**
     * Load the sprite image from the asset reference
     */
    async loadImage() {
        if (!this.imageAsset || !this.imageAsset.path) {
            this._image = null;
            this._isLoaded = false;
            return null;
        }

        try {
            // Use a safe approach to load the image
            let image = null;
            if (typeof this.imageAsset.load === 'function') {
                image = await this.imageAsset.load();
            } else {
                // Fallback for when AssetReference isn't working correctly
                image = await this.fallbackLoadImage(this.imageAsset.path);
            }

            if (image instanceof HTMLImageElement) {
                this._image = image;
                this._imageWidth = image.naturalWidth;
                this._imageHeight = image.naturalHeight;
                this._isLoaded = true;

                // If width/height not set, use image dimensions
                if (this.width === 0 || this.height === 0) {
                    this.width = this._imageWidth;
                    this.height = this._imageHeight;
                }

                // Refresh canvas after image is loaded to ensure proper rendering
                window.editor?.refreshCanvas();

                return image;
            }

            return null;
        } catch (error) {
            console.error("Error loading sprite image:", error);
            this._image = null;
            this._isLoaded = false;
            return null;
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
            // Always normalize path for cache lookup
            const normalizedPath = window.assetManager?.normalizePath ? window.assetManager.normalizePath(path) : path.replace(/^\/+/, '');
            if (window.assetManager && window.assetManager.cache[normalizedPath]) {
                const cached = window.assetManager.cache[normalizedPath];
                if (cached instanceof HTMLImageElement) {
                    img.src = cached.src;
                } else if (typeof cached === 'string' && cached.startsWith('data:')) {
                    img.src = cached;
                } else {
                    return reject(new Error(`Asset cache for ${path} is not a valid image`));
                }
            } else {
                if (window.exportManager && window.exportManager.exportSettings?.standalone) {
                    return reject(new Error(`Image not found in asset cache for standalone export: ${path}`));
                }
                img.src = path;
            }
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Error loading image: Unknown error`));
        });
    }

    /**
     * Set the sprite image by path
     * @param {string} path - File path to the image
     */
    async setSprite(path) {
        if (this.imageAsset && this.imageAsset.path === path) return;

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

            // Load the image
            await this.loadImage();

            // Update UI if inspector is showing this component
            if (window.editor && window.editor.inspector) {
                window.editor.inspector.refreshModuleUI(this);
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
                const fileBrowser = window.editor?.fileBrowser;
                if (!fileBrowser) {
                    console.warn('FileBrowser not available for image upload');
                    return false;
                }

                // Upload to FileBrowser
                await fileBrowser.handleFileUpload(file);

                // Set the image asset to this path
                const path = `${fileBrowser.currentPath}/${file.name}`;
                await this.setSprite(path);
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
                window.editor?.refreshCanvas();
                resolve(img);
            };
            img.onerror = reject;
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

        // --- Serialize image as data URL if loaded ---
        if (this._image && this._isLoaded) {
            try {
                // Create a canvas to get the data URL
                const canvas = document.createElement('canvas');
                canvas.width = this._image.naturalWidth || this._image.width;
                canvas.height = this._image.naturalHeight || this._image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this._image, 0, 0);
                json.imageData = canvas.toDataURL('image/png');
            } catch (e) {
                json.imageData = null;
            }
        } else {
            json.imageData = null;
        }

        return json;
    }

    /**
     * Override to handle deserialization
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        // Restore sprite properties
        if (json.imageAsset) {
            // If imageData is present, use it instead of path
            if (json.imageData) {
                this.imageAsset = {
                    path: null,
                    type: 'image',
                    load: () => Promise.resolve(null) // Not used, we load from data below
                };
                // Actually load the image from the data URL and set _image/_isLoaded
                this.loadImageFromData(json.imageData);
            } else {
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
                    this.loadImage();
                } catch (error) {
                    console.error("Error restoring image asset:", error);
                }
            }
        }

        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.color !== undefined) this.color = json.color;
        if (json.flipX !== undefined) this.flipX = json.flipX;
        if (json.flipY !== undefined) this.flipY = json.flipY;
        if (json.scaleMode !== undefined) this.scaleMode = json.scaleMode;

        if (json.pivot) {
            this.pivot = new Vector2(json.pivot.x, json.pivot.y);
        }

        // Animation properties
        if (json.frameX !== undefined) this.frameX = json.frameX;
        if (json.frameY !== undefined) this.frameY = json.frameY;
        if (json.frameWidth !== undefined) this.frameWidth = json.frameWidth;
        if (json.frameHeight !== undefined) this.frameHeight = json.frameHeight;
        if (json.frames !== undefined) this.frames = json.frames;

        // 9-slice properties
        if (json.sliceMode !== undefined) this.sliceMode = json.sliceMode;
        if (json.sliceBorder) this.sliceBorder = { ...json.sliceBorder };
    }
}

// Register module globally
window.SpriteRenderer = SpriteRenderer;