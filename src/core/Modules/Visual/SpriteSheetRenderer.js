/**
 * SpriteSheetRenderer - Renders sprites from a sprite sheet
 * 
 * This module handles rendering individual frames from a sprite sheet,
 * with automatic frame size calculation based on rows and columns.
 * 
 * @extends Module
 */
class SpriteSheetRenderer extends Module {
    static allowMultiple = false;
    static namespace = "Visual";
    static description = "Displays a frame from a sprite sheet";
    static iconClass = "fas fa-film";
    
    constructor() {
        super("SpriteSheetRenderer");
        
        // Import AssetReference if it's not already available
        if (!window.AssetReference) {
            console.warn("AssetReference not found, SpriteSheetRenderer may not work correctly");
        }
        
        // Sprite sheet image reference
        try {
            this.imageAsset = new (window.AssetReference || function(p) { return { path: p }; })(null, 'image');
        } catch (error) {
            console.error("Error creating AssetReference:", error);
            this.imageAsset = { path: null, load: () => Promise.resolve(null) };
        }
        
        // Sprite sheet properties
        this.columns = 4;  // Number of columns in the sprite sheet
        this.rows = 4;     // Number of rows in the sprite sheet
        this.currentColumn = 0;  // Current column (x-position in sheet)
        this.currentRow = 0;     // Current row (y-position in sheet)
        
        // Display properties
        this.width = 64;   // Display width 
        this.height = 64;  // Display height
        this.color = "#ffffff";  // Tint color
        this.flipX = false;
        this.flipY = false;
        this.pivot = new Vector2(0.5, 0.5);  // Center pivot by default
        
        // Animation properties (can be used by Animation module)
        this.frameWidth = 0;   // Will be calculated automatically
        this.frameHeight = 0;  // Will be calculated automatically
        this.totalFrames = 0;  // Will be calculated automatically
        
        // Internal state
        this._image = null;
        this._isLoaded = false;
        this._imageWidth = 0;
        this._imageHeight = 0;
        
        // Register properties
        this.registerProperties();
    }
    
    /**
     * Register all properties for this module
     */
    registerProperties() {
        // Clear any previously registered properties
        this.clearProperties();
        
        // Register all properties
        this.exposeProperty("imageAsset", "asset", this.imageAsset, {
            description: "Sprite sheet image",
            assetType: 'image',
            fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            onDropCallback: this.handleImageDrop.bind(this),
            showImageDropdown: true
        });
        
        this.exposeProperty("columns", "number", this.columns, {
            description: "Number of columns in the sprite sheet",
            min: 1,
            max: 32,
            step: 1,
            onChange: (value) => {
                this.columns = value;
                this.updateFrameDimensions();
                window.editor?.refreshCanvas();
            }
        });
        
        this.exposeProperty("rows", "number", this.rows, {
            description: "Number of rows in the sprite sheet",
            min: 1,
            max: 32,
            step: 1,
            onChange: (value) => {
                this.rows = value;
                this.updateFrameDimensions();
                window.editor?.refreshCanvas();
            }
        });
        
        this.exposeProperty("currentColumn", "number", this.currentColumn, {
            description: "Current column in the sprite sheet (zero-based)",
            min: 0,
            max: this.columns - 1,
            step: 1,
            onChange: (value) => {
                this.currentColumn = Math.min(value, this.columns - 1);
                window.editor?.refreshCanvas();
            }
        });
        
        this.exposeProperty("currentRow", "number", this.currentRow, {
            description: "Current row in the sprite sheet (zero-based)",
            min: 0,
            max: this.rows - 1,
            step: 1,
            onChange: (value) => {
                this.currentRow = Math.min(value, this.rows - 1);
                window.editor?.refreshCanvas();
            }
        });
        
        this.exposeProperty("width", "number", this.width, {
            description: "Display width in pixels",
            min: 1,
            max: 2048,
            step: 1,
            onChange: (value) => {
                this.width = value;
                window.editor?.refreshCanvas();
            }
        });
        
        this.exposeProperty("height", "number", this.height, {
            description: "Display height in pixels",
            min: 1,
            max: 2048,
            step: 1,
            onChange: (value) => {
                this.height = value;
                window.editor?.refreshCanvas();
            }
        });
        
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
    }
    
    /**
     * Update frame dimensions based on image and row/column settings
     */
    updateFrameDimensions() {
        if (!this._isLoaded || !this._image) return;
        
        // Calculate the dimensions of each frame
        this.frameWidth = Math.floor(this._imageWidth / this.columns);
        this.frameHeight = Math.floor(this._imageHeight / this.rows);
        this.totalFrames = this.rows * this.columns;
        
        // Clamp current row and column to valid ranges
        this.currentRow = Math.min(this.currentRow, this.rows - 1);
        this.currentColumn = Math.min(this.currentColumn, this.columns - 1);
        
        // Refresh inspector UI if visible
        this.refreshInspector();
    }
    
    /**
     * Helper method to clear properties
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
        }
    }
    
    /**
     * Called when the module is first activated
     */
    async start() {
        // Load the sprite sheet image if we have one
        await this.loadImage();
    }
    
    /**
     * Load the sprite sheet image from the asset reference
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
                
                // Update frame dimensions based on the loaded image
                this.updateFrameDimensions();
                
                // Refresh canvas after image is loaded
                window.editor?.refreshCanvas();
                
                return image;
            }
            
            return null;
        } catch (error) {
            console.error("Error loading sprite sheet image:", error);
            this._image = null;
            this._isLoaded = false;
            return null;
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
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
            img.src = path;
        });
    }
    
    /**
     * Set the sprite sheet image by path
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
            this.refreshInspector();
        } catch (error) {
            console.error("Error setting sprite sheet:", error);
        }
    }
    
    /**
     * Draw the current frame from the sprite sheet
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Don't draw if we have no image or dimensions are zero
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
        
        // Calculate source rectangle (which part of the sprite sheet to draw)
        const sx = this.currentColumn * this.frameWidth;
        const sy = this.currentRow * this.frameHeight;
        const sw = this.frameWidth;
        const sh = this.frameHeight;
        
        // Draw the current frame
        ctx.drawImage(
            this._image,
            sx, sy, sw, sh,               // Source rectangle
            -pivotX, -pivotY, this.width, this.height  // Destination rectangle
        );
        
        // Apply color tint if not white
        if (this.color !== "#ffffff") {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this.color;
            ctx.fillRect(-pivotX, -pivotY, this.width, this.height);
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Draw a placeholder when no image is loaded
     */
    drawPlaceholder(ctx) {
        // Calculate position based on pivot
        const pivotX = this.width * this.pivot.x;
        const pivotY = this.height * this.pivot.y;
        
        ctx.save();
        
        // Draw a placeholder rectangle with a grid pattern
        ctx.strokeStyle = "#aaaaaa";
        ctx.fillStyle = "#333333";
        ctx.lineWidth = 2;
        
        // Draw background
        ctx.fillRect(-pivotX, -pivotY, this.width || 64, this.height || 64);
        ctx.strokeRect(-pivotX, -pivotY, this.width || 64, this.height || 64);
        
        // Draw grid pattern to represent a sprite sheet
        const gridSize = Math.min((this.width || 64) / 4, (this.height || 64) / 4);
        ctx.strokeStyle = "#555555";
        ctx.lineWidth = 1;
        
        // Draw horizontal grid lines
        for (let y = 1; y < 4; y++) {
            ctx.beginPath();
            ctx.moveTo(-pivotX, -pivotY + y * gridSize);
            ctx.lineTo(-pivotX + (this.width || 64), -pivotY + y * gridSize);
            ctx.stroke();
        }
        
        // Draw vertical grid lines
        for (let x = 1; x < 4; x++) {
            ctx.beginPath();
            ctx.moveTo(-pivotX + x * gridSize, -pivotY);
            ctx.lineTo(-pivotX + x * gridSize, -pivotY + (this.height || 64));
            ctx.stroke();
        }
        
        // Draw film strip icon
        ctx.fillStyle = "#aaaaaa";
        const iconSize = Math.min(this.width || 64, this.height || 64) * 0.5;
        const centerX = -pivotX + (this.width || 64) / 2 - iconSize / 2;
        const centerY = -pivotY + (this.height || 64) / 2 - iconSize / 2;
        
        // Draw simplified film strip icon (just a rectangle with smaller rectangles on top and bottom)
        ctx.fillRect(centerX, centerY, iconSize, iconSize);
        
        ctx.fillStyle = "#333333";
        // Draw top film perforations
        for (let x = 0; x < 3; x++) {
            ctx.fillRect(centerX + (x + 0.25) * (iconSize / 3), centerY, iconSize / 8, iconSize / 8);
        }
        
        // Draw bottom film perforations
        for (let x = 0; x < 3; x++) {
            ctx.fillRect(centerX + (x + 0.25) * (iconSize / 3), centerY + iconSize - iconSize / 8, iconSize / 8, iconSize / 8);
        }
        
        ctx.restore();
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
        
        // Make it clickable to open file browser
        imagePreview.addEventListener('click', () => {
            this.loadImageFromFile();
        });
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
        
        // Sprite sheet specific properties
        json.columns = this.columns;
        json.rows = this.rows;
        json.currentColumn = this.currentColumn;
        json.currentRow = this.currentRow;
        json.frameWidth = this.frameWidth;
        json.frameHeight = this.frameHeight;
        json.totalFrames = this.totalFrames;
        
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
            // Handle AssetReference safely
            try {
                if (window.AssetReference && typeof window.AssetReference.fromJSON === 'function') {
                    this.imageAsset = window.AssetReference.fromJSON(json.imageAsset);
                } else {
                    // Simple fallback
                    this.imageAsset = { 
                        path: json.imageAsset.path, 
                        type: 'image',
                        load: () => this.fallbackLoadImage(json.imageAsset.path)
                    };
                }
                this.loadImage(); // Start loading the image
            } catch (error) {
                console.error("Error restoring image asset:", error);
            }
        }
        
        // Restore basic properties
        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.color !== undefined) this.color = json.color;
        if (json.flipX !== undefined) this.flipX = json.flipX;
        if (json.flipY !== undefined) this.flipY = json.flipY;
        
        if (json.pivot) {
            this.pivot = new Vector2(json.pivot.x, json.pivot.y);
        }
        
        // Restore sprite sheet specific properties
        if (json.columns !== undefined) this.columns = json.columns;
        if (json.rows !== undefined) this.rows = json.rows;
        if (json.currentColumn !== undefined) this.currentColumn = json.currentColumn;
        if (json.currentRow !== undefined) this.currentRow = json.currentRow;
        
        // These will be recalculated when the image loads
        if (json.frameWidth !== undefined) this.frameWidth = json.frameWidth;
        if (json.frameHeight !== undefined) this.frameHeight = json.frameHeight;
        if (json.totalFrames !== undefined) this.totalFrames = json.totalFrames;
    }
    
    /**
     * Navigate to a specific frame by index
     * @param {number} frameIndex - The frame index (0 to totalFrames-1)
     */
    setFrameByIndex(frameIndex) {
        if (!this._isLoaded || frameIndex < 0 || frameIndex >= this.totalFrames) return;
        
        this.currentRow = Math.floor(frameIndex / this.columns);
        this.currentColumn = frameIndex % this.columns;
        
        // Refresh if needed
        window.editor?.refreshCanvas();
    }
    
    /**
     * Get the current frame index
     * @returns {number} The current frame index
     */
    getCurrentFrameIndex() {
        return (this.currentRow * this.columns) + this.currentColumn;
    }
    
    /**
     * Generate custom UI for the Inspector
     */
    generateCustomInspectorUI() {
        // Frame selector UI will be generated here if needed
        const frameWidth = this.frameWidth || 0;
        const frameHeight = this.frameHeight || 0;
        const totalFrames = this.totalFrames || 0;
        const currentFrame = this.getCurrentFrameIndex();
        
        return `
            <div class="property-row">
                <label>Frame Info</label>
                <div class="frame-info">
                    <div>Size: ${frameWidth}×${frameHeight}px</div>
                    <div>Total Frames: ${totalFrames}</div>
                    <div>Current: ${currentFrame} (${this.currentColumn}, ${this.currentRow})</div>
                </div>
            </div>
        `;
    }
}

// Register module globally
window.SpriteSheetRenderer = SpriteSheetRenderer;