/**
 * AssetReference - A class that represents a reference to an asset in the file browser
 * 
 * This class allows module properties to reference assets in the file system,
 * such as images, audio files, and scripts, with proper serialization support.
 */
class AssetReference {
    constructor(path = null, type = 'any') {
        this.path = path;
        this.type = type; // 'image', 'audio', 'script', 'any'
        this._cachedData = null;
        this._isLoading = false;
        this._loadPromise = null;
    }
    
    /**
     * Check if this reference has a valid path
     */
    isValid() {
        return !!this.path;
    }
    
    /**
     * Get the filename without path
     */
    getFilename() {
        if (!this.path) return null;
        return this.path.split('/').pop().split('\\').pop();
    }
    
    /**
     * Get the file extension
     */
    getExtension() {
        if (!this.path) return null;
        return this.path.split('.').pop().toLowerCase();
    }
    
    /**
     * Load the referenced asset
     * @returns {Promise<any>} The loaded asset data
     */
    async load() {
        // If already loaded, return cached data
        if (this._cachedData) {
            return this._cachedData;
        }
        
        // If already loading, return the existing promise
        if (this._isLoading && this._loadPromise) {
            return this._loadPromise;
        }
        
        // If no path, return null
        if (!this.path) {
            return null;
        }
        
        this._isLoading = true;
        
        this._loadPromise = new Promise(async (resolve, reject) => {
            try {
                // Check for FileBrowser to read the file
                if (!window.fileBrowser) {
                    throw new Error("FileBrowser not available");
                }
                
                // Read file content based on type
                const content = await window.fileBrowser.readFile(this.path);
                
                if (!content) {
                    throw new Error(`File not found: ${this.path}`);
                }
                
                // Process content based on file type
                const extension = this.getExtension();
                
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) || content.startsWith('data:image/')) {
                    // Image asset
                    const img = new Image();
                    
                    // Create a promise that resolves when the image loads
                    const imgPromise = new Promise((imgResolve, imgReject) => {
                        img.onload = () => imgResolve(img);
                        img.onerror = (err) => imgReject(new Error(`Error loading image: ${err.message || 'Unknown error'}`));
                    });
                    
                    // Start loading the image
                    img.src = content;
                    
                    // Wait for the image to load
                    this._cachedData = await imgPromise;
                    resolve(this._cachedData);
                    
                } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
                    // Audio asset
                    const audio = new Audio();
                    
                    // Create a promise that resolves when the audio is ready
                    const audioPromise = new Promise((audioResolve, audioReject) => {
                        audio.oncanplaythrough = () => audioResolve(audio);
                        audio.onerror = (err) => audioReject(new Error(`Error loading audio: ${err.message || 'Unknown error'}`));
                    });
                    
                    // Start loading the audio
                    audio.src = content;
                    
                    // Wait for the audio to be ready
                    this._cachedData = await audioPromise;
                    resolve(this._cachedData);
                    
                } else if (extension === 'js') {
                    // Script asset (just return the content)
                    this._cachedData = content;
                    resolve(this._cachedData);
                    
                } else {
                    // Default case - just return the raw content
                    this._cachedData = content;
                    resolve(this._cachedData);
                }
                
            } catch (error) {
                console.error(`Error loading asset ${this.path}:`, error);
                this._cachedData = null;
                reject(error);
            } finally {
                this._isLoading = false;
            }
        });
        
        return this._loadPromise;
    }
    
    /**
     * Create a clone of this AssetReference
     */
    clone() {
        const clone = new AssetReference(this.path, this.type);
        clone._cachedData = this._cachedData;
        return clone;
    }
    
    /**
     * Convert to a simple object for serialization
     */
    toJSON() {
        return {
            path: this.path,
            type: this.type
        };
    }
    
    /**
     * Create an AssetReference from serialized data
     * @param {Object} json - Serialized data
     * @returns {AssetReference} The created AssetReference
     */
    static fromJSON(json) {
        if (!json) return new AssetReference();
        return new AssetReference(json.path, json.type || 'any');
    }
}

// Register globally
window.AssetReference = AssetReference;