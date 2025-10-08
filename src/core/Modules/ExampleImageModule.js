/**
 * ExampleImageModule - Demonstrates image handling through AssetManager
 *
 * This is an example module showing how to load and display images using
 * the AssetManager system. It's designed as a template for users to create
 * their own image-based modules.
 *
 * Features demonstrated:
 * - Loading images through AssetManager
 * - AssetReference integration
 * - Export-ready serialization
 * - Editor and runtime compatibility
 */
class ExampleImageModule extends Module {
    static allowMultiple = true;
    static namespace = "Examples";
    static description = "Example module demonstrating image asset handling";
    static iconClass = "fas fa-image";

    constructor() {
        super("ExampleImageModule");

        // Image asset reference - demonstrates AssetManager integration
        this.imageAsset = new (window.AssetReference || function (p) { return { path: p }; })(null, 'image');

        // Display properties
        this.width = 128;
        this.height = 128;
        this.opacity = 1.0;
        this.tintColor = "#ffffff";

        // Animation properties for example
        this.rotationSpeed = 0; // Degrees per second
        this.pulseSpeed = 0; // Pulse animation speed
        this.currentRotation = 0;
        this.pulseOffset = 0;

        // Internal state
        this._image = null;
        this._isLoaded = false;
        this._imageWidth = 0;
        this._imageHeight = 0;

        // Register properties for the inspector
        this.registerProperties();
    }

    /**
     * Register all properties for this module
     */
    registerProperties() {
        // Clear any previously registered properties
        this.clearProperties();

        // Image asset property - demonstrates AssetManager integration
        this.exposeProperty("imageAsset", "asset", this.imageAsset, {
            description: "Image asset to display (loaded through AssetManager)",
            assetType: 'image',
            fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            onAssetSelected: (assetPath) => {
                this.setImage(assetPath);
            }
        });

        // Display properties
        this.exposeProperty("width", "number", this.width, {
            description: "Display width in pixels",
            min: 1,
            max: 1024,
            step: 1,
            onChange: (value) => {
                this.width = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("height", "number", this.height, {
            description: "Display height in pixels",
            min: 1,
            max: 1024,
            step: 1,
            onChange: (value) => {
                this.height = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("opacity", "number", this.opacity, {
            description: "Image opacity (0-1)",
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value) => {
                this.opacity = value;
                window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("tintColor", "color", this.tintColor, {
            description: "Color tint for the image",
            onChange: (value) => {
                this.tintColor = value;
                window.editor?.refreshCanvas();
            }
        });

        // Animation properties
        this.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            description: "Rotation speed in degrees per second (0 = no rotation)",
            min: -360,
            max: 360,
            step: 1,
            onChange: (value) => {
                this.rotationSpeed = value;
            }
        });

        this.exposeProperty("pulseSpeed", "number", this.pulseSpeed, {
            description: "Pulse animation speed (0 = no pulsing)",
            min: 0,
            max: 10,
            step: 0.1,
            onChange: (value) => {
                this.pulseSpeed = value;
            }
        });
    }

    /**
     * Clear previously registered properties
     */
    clearProperties() {
        if (this.properties) {
            for (const prop in this.properties) {
                if (this.properties.hasOwnProperty(prop)) {
                    delete this.properties[prop];
                }
            }
        }
    }

    /**
     * Called when the module is first activated
     */
    async start() {
        // Load the image if we have an asset path
        if (this.imageAsset && this.imageAsset.path) {
            await this.loadImage();
        }
    }

    /**
     * Set the image by path and load it through AssetManager
     * @param {string} path - File path to the image
     */
    async setImage(path) {
        console.log('ExampleImageModule: Setting image to:', path);

        if (path === null || path === undefined) {
            this.imageAsset = null;
            this._image = null;
            this._isLoaded = false;
            return;
        }

        if (this.imageAsset && this.imageAsset.path === path) {
            console.log('ExampleImageModule: Image path unchanged, skipping');
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
                    load: () => this.loadFromAssetManager(path)
                };
            }

            // Load the image through AssetManager
            await this.loadImage();

            // Refresh the canvas to show the new image
            if (window.editor) {
                window.editor.refreshCanvas();
            }

        } catch (error) {
            console.error("ExampleImageModule: Error setting image:", error);
        }
    }

    /**
     * Load image from AssetManager
     * @param {string} path - Asset path
     * @returns {Promise<HTMLImageElement>} - Loaded image
     */
    async loadFromAssetManager(path) {
        if (!path) return null;

        try {
            // Try to load from AssetManager first
            if (window.assetManager) {
                const asset = await window.assetManager.getAssetByPath(path);
                if (asset && asset instanceof HTMLImageElement) {
                    this._image = asset;
                    this._imageWidth = asset.naturalWidth || asset.width;
                    this._imageHeight = asset.naturalHeight || asset.height;
                    this._isLoaded = true;
                    console.log('ExampleImageModule: Image loaded from AssetManager:', path);

                    // Register for export if in editor
                    if (window.assetManager && !window.assetManager.hasAsset(this.getAssetId(path))) {
                        const assetId = this.getAssetId(path);
                        window.assetManager.addAsset(assetId, asset, 'image', {
                            path: path,
                            originalPath: path
                        }).catch(error => {
                            console.warn('Failed to register image for export:', error);
                        });
                    }

                    return asset;
                }
            }

            // Fallback for exported games or when AssetManager fails
            return await this.fallbackLoadImage(path);

        } catch (error) {
            console.error('ExampleImageModule: Error loading from AssetManager:', error);
            return null;
        }
    }

    /**
     * Get a unique asset ID for this module's asset
     * @param {string} path - Asset path
     * @returns {string} - Unique asset ID
     */
    getAssetId(path) {
        return path.replace(/^[\/\\]+/, '').replace(/[\/\\]/g, '_');
    }

    /**
     * Fallback method to load an image for exported games
     * @param {string} path - Path to the image
     * @returns {Promise<HTMLImageElement>} - Loaded image
     */
    fallbackLoadImage(path) {
        return new Promise((resolve, reject) => {
            if (!path) {
                reject(new Error('No image path provided'));
                return;
            }

            const img = new Image();

            // For exported games, try to load from asset cache
            if (window.assetManager && window.assetManager.cache) {
                const normalizedPath = window.assetManager.normalizePath ?
                    window.assetManager.normalizePath(path) :
                    path.replace(/^\/+/, '').replace(/\\/g, '/');

                console.log('ExampleImageModule: Looking for cached asset:', normalizedPath);

                // Try multiple path variations for lookup
                const pathVariations = [
                    path,
                    normalizedPath,
                    path.replace(/^[\/\\]+/, ''),
                    path.replace(/\\/g, '/'),
                    path.split('/').pop(),
                    path.split('\\').pop(),
                ];

                let cached = null;
                let foundPath = null;

                for (const variation of pathVariations) {
                    if (window.assetManager.cache[variation]) {
                        cached = window.assetManager.cache[variation];
                        foundPath = variation;
                        console.log('ExampleImageModule: Found cached asset with path variation:', foundPath);
                        break;
                    }
                }

                if (cached) {
                    if (cached instanceof HTMLImageElement) {
                        console.log('ExampleImageModule: Using cached HTMLImageElement');
                        this._image = cached;
                        this._imageWidth = cached.naturalWidth || cached.width;
                        this._imageHeight = cached.naturalHeight || cached.height;
                        this._isLoaded = true;
                        resolve(cached);
                        return;
                    } else if (typeof cached === 'string' && cached.startsWith('data:')) {
                        console.log('ExampleImageModule: Loading cached data URL');
                        img.src = cached;
                    }
                } else {
                    console.warn('ExampleImageModule: Asset not in cache, trying direct load');
                    img.src = path;
                }
            } else {
                console.warn('ExampleImageModule: No asset manager available');
                img.src = path;
            }

            img.onload = () => {
                console.log('ExampleImageModule: Image loaded successfully');
                this._image = img;
                this._imageWidth = img.naturalWidth || img.width;
                this._imageHeight = img.naturalHeight || img.height;
                this._isLoaded = true;
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('ExampleImageModule: Error loading image:', path, error);
                reject(new Error(`Failed to load image: ${path}`));
            };
        });
    }

    /**
     * Load the image from the asset reference
     */
    async loadImage() {
        if (!this.imageAsset || (!this.imageAsset.path && !this.imageAsset.embedded)) {
            console.warn('ExampleImageModule: No image asset path to load');
            return null;
        }

        try {
            console.log('ExampleImageModule: Loading image:', this.imageAsset.path);

            // Load through AssetManager
            const image = await this.loadFromAssetManager(this.imageAsset.path);

            if (image) {
                console.log('ExampleImageModule: Image loaded successfully');
            } else {
                console.warn('ExampleImageModule: Failed to load image');
            }

            return image;

        } catch (error) {
            console.error('ExampleImageModule: Error loading image:', error);
            this._image = null;
            this._isLoaded = false;
            return null;
        }
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        // Update rotation animation
        if (this.rotationSpeed !== 0) {
            this.currentRotation += this.rotationSpeed * deltaTime;
            this.currentRotation = this.currentRotation % 360;
        }

        // Update pulse animation
        if (this.pulseSpeed > 0) {
            this.pulseOffset = Math.sin(Date.now() * this.pulseSpeed * 0.001) * 0.1;
        }

        // Mark as needing redraw
        if ((this.rotationSpeed !== 0 || this.pulseSpeed > 0) && window.editor) {
            window.editor.refreshCanvas();
        }
    }

    /**
     * Draw the image
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Don't draw if we have no image
        if (!this._image || !this._isLoaded) {
            this.drawPlaceholder(ctx);
            return;
        }

        // Calculate position based on pivot (center)
        const pivotX = this.width / 2;
        const pivotY = this.height / 2;

        // Save context state
        ctx.save();

        // Move to position and apply transformations
        ctx.translate(pivotX, pivotY);

        // Apply rotation
        if (this.currentRotation !== 0) {
            ctx.rotate((this.currentRotation * Math.PI) / 180);
        }

        // Apply pulse scaling
        const scale = 1 + this.pulseOffset;
        ctx.scale(scale, scale);

        // Set opacity
        ctx.globalAlpha = this.opacity;

        // Draw the image
        ctx.drawImage(this._image, -pivotX, -pivotY, this.width, this.height);

        // Apply color tint if not white
        if (this.tintColor !== "#ffffff") {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this.tintColor;
            ctx.fillRect(-pivotX, -pivotY, this.width, this.height);
        }

        // Restore context state
        ctx.restore();
    }

    /**
     * Draw a placeholder when no image is loaded
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawPlaceholder(ctx) {
        const pivotX = this.width / 2;
        const pivotY = this.height / 2;

        ctx.save();

        // Draw placeholder rectangle
        ctx.strokeStyle = "#888888";
        ctx.fillStyle = "#444444";
        ctx.lineWidth = 2;

        ctx.fillRect(-pivotX, -pivotY, this.width, this.height);
        ctx.strokeRect(-pivotX, -pivotY, this.width, this.height);

        // Draw image icon
        ctx.fillStyle = "#888888";
        const iconSize = Math.min(this.width, this.height) * 0.3;
        const centerX = -pivotX + this.width / 2 - iconSize / 2;
        const centerY = -pivotY + this.height / 2 - iconSize / 2;

        // Draw simple image icon
        ctx.fillRect(centerX, centerY, iconSize, iconSize);

        // Draw a circle in the "image"
        ctx.fillStyle = "#444444";
        ctx.beginPath();
        ctx.arc(centerX + iconSize * 0.7, centerY + iconSize * 0.3, iconSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Override to handle serialization for export
     */
    toJSON() {
        const json = super.toJSON() || {};

        // Store asset reference for export
        json.imageAsset = this.imageAsset ? {
            path: this.imageAsset.path,
            type: 'image',
            embedded: this.imageAsset.embedded || false
        } : null;

        // Store display properties
        json.width = this.width;
        json.height = this.height;
        json.opacity = this.opacity;
        json.tintColor = this.tintColor;

        // Store animation properties
        json.rotationSpeed = this.rotationSpeed;
        json.pulseSpeed = this.pulseSpeed;

        return json;
    }

    /**
     * Override to handle deserialization from export
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        // Restore display properties
        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.opacity !== undefined) this.opacity = json.opacity;
        if (json.tintColor !== undefined) this.tintColor = json.tintColor;

        // Restore animation properties
        if (json.rotationSpeed !== undefined) this.rotationSpeed = json.rotationSpeed;
        if (json.pulseSpeed !== undefined) this.pulseSpeed = json.pulseSpeed;

        // Restore asset reference and load from AssetManager
        if (json.imageAsset && json.imageAsset.path) {
            console.log('ExampleImageModule: Loading image from AssetManager:', json.imageAsset.path);

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
                console.error("ExampleImageModule: Error restoring image asset:", error);
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
window.ExampleImageModule = ExampleImageModule;