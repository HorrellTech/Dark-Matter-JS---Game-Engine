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
            this.imageAsset = new (window.AssetReference || function(p) { return { path: p }; })(null, 'image');
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
        
        // Expose properties
        this.exposeProperty("imageAsset", "asset", this.imageAsset, {
            description: "Sprite image to display",
            assetType: 'image',
            fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
            onDropCallback: this.handleImageDrop.bind(this),
            showImageDropdown: true, // Enable the dropdown menu
            customButtons: [
                { 
                    icon: 'fa-file', 
                    label: 'Load from File', 
                    action: this.loadImageFromFile.bind(this) 
                },
                { 
                    icon: 'fa-link', 
                    label: 'Load from URL', 
                    action: this.loadImageFromUrl.bind(this) 
                }
            ]
        });
        
        // Additional properties (width, height, color, etc.)
        this.exposeProperty("width", "number", this.width, {
            description: "Width of the sprite in pixels",
            min: 1,
            max: 2048,
            step: 1
        });
        
        this.exposeProperty("height", "number", this.height, {
            description: "Height of the sprite in pixels",
            min: 1,
            max: 2048,
            step: 1
        });
        
        this.exposeProperty("color", "color", this.color, {
            description: "Tint color for the sprite"
        });
        
        this.exposeProperty("flipX", "boolean", this.flipX, {
            description: "Flip the sprite horizontally"
        });
        
        this.exposeProperty("flipY", "boolean", this.flipY, {
            description: "Flip the sprite vertically"
        });
        
        this.exposeProperty("pivot", "vector2", this.pivot, {
            description: "Pivot point for rotation (0,0 = top left, 1,1 = bottom right)"
        });
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
        
        // Apply color tint if not white
        if (this.color !== "#ffffff") {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = this.color;
            ctx.fillRect(-pivotX, -pivotY, this.width, this.height);
            ctx.globalCompositeOperation = 'source-atop';
        }
        
        // Apply flipping
        if (this.flipX || this.flipY) {
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        }
        
        // Draw image
        if (this.frameWidth < this._imageWidth || this.frameHeight < this._imageHeight) {
            // Draw a specific frame from a spritesheet
            ctx.drawImage(
                this._image,
                this.frameX * this.frameWidth,
                this.frameY * this.frameHeight,
                this.frameWidth,
                this.frameHeight,
                -pivotX,
                -pivotY,
                this.width,
                this.height
            );
        } else if (this.sliceMode) {
            // Draw using 9-slice mode
            this.drawNineSlice(ctx, -pivotX, -pivotY);
        } else {
            // Draw the entire image
            ctx.drawImage(
                this._image,
                -pivotX,
                -pivotY,
                this.width,
                this.height
            );
        }
        
        // Restore context state
        ctx.restore();
    }

    /**
     * Handle dropped image files
     * @param {DataTransfer} dataTransfer - Drop event data
     * @returns {Promise<boolean>} - Success status
     */
    async handleImageDrop(dataTransfer) {
        try {
            // Check if we have files
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
            
            // Check if we have JSON data (from internal drag & drop)
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
        
        // Animation properties
        json.frameX = this.frameX;
        json.frameY = this.frameY;
        json.frameWidth = this.frameWidth;
        json.frameHeight = this.frameHeight;
        json.frames = this.frames;
        
        // 9-slice properties
        json.sliceMode = this.sliceMode;
        json.sliceBorder = { ...this.sliceBorder };
        
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
        
        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.color !== undefined) this.color = json.color;
        if (json.flipX !== undefined) this.flipX = json.flipX;
        if (json.flipY !== undefined) this.flipY = json.flipY;
        
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