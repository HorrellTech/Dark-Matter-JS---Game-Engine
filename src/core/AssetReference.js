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

        // --- Support exported runtime asset loading ---
        this._loadPromise = new Promise(async (resolve, reject) => {
            try {
                // If running in exported game (no FileBrowser), load from assets folder or embedded data
                if (!window.fileBrowser) {
                    // Try to load from assets folder (ZIP export) or embedded data (standalone HTML)
                    const extension = this.getExtension();
                    let assetUrl = null;

                    // If path is already a data URL, use it directly
                    if (this.path.startsWith('data:image/') || this.path.startsWith('data:audio/')) {
                        assetUrl = this.path;
                    } else if (window.__ASSET_MAP && window.__ASSET_MAP[this.path]) {
                        // If a global asset map is present (for standalone HTML), use it
                        assetUrl = window.__ASSET_MAP[this.path];
                    } else {
                        // Otherwise, assume assets are in 'assets/' folder (ZIP export)
                        assetUrl = 'assets/' + this.getFilename();
                    }

                    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) || assetUrl.startsWith('data:image/')) {
                        // Image asset
                        const img = new Image();
                        const imgPromise = new Promise((imgResolve, imgReject) => {
                            img.onload = () => imgResolve(img);
                            img.onerror = (err) => imgReject(new Error(`Error loading image: ${err.message || 'Unknown error'}`));
                        });
                        img.src = assetUrl;
                        this._cachedData = await imgPromise;
                        resolve(this._cachedData);

                    } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension) || assetUrl.startsWith('data:audio/')) {
                        // Audio asset
                        const audio = new Audio();
                        const audioPromise = new Promise((audioResolve, audioReject) => {
                            audio.oncanplaythrough = () => audioResolve(audio);
                            audio.onerror = (err) => audioReject(new Error(`Error loading audio: ${err.message || 'Unknown error'}`));
                        });
                        audio.src = assetUrl;
                        this._cachedData = await audioPromise;
                        resolve(this._cachedData);

                    } else if (extension === 'js') {
                        // Script asset (fetch as text)
                        try {
                            const response = await fetch(assetUrl);
                            if (!response.ok) throw new Error(`Failed to fetch script: ${assetUrl}`);
                            const scriptContent = await response.text();
                            this._cachedData = scriptContent;
                            resolve(this._cachedData);
                        } catch (err) {
                            reject(err);
                        }

                    } else {
                        // Default: fetch as text or blob
                        try {
                            const response = await fetch(assetUrl);
                            if (!response.ok) throw new Error(`Failed to fetch asset: ${assetUrl}`);
                            const content = await response.text();
                            this._cachedData = content;
                            resolve(this._cachedData);
                        } catch (err) {
                            reject(err);
                        }
                    }
                    return;
                }

                // Editor mode: use FileBrowser
                const content = await window.fileBrowser.readFile(this.path);
                if (!content) {
                    throw new Error(`File not found: ${this.path}`);
                }
                const extension = this.getExtension();
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) || content.startsWith('data:image/')) {
                    const img = new Image();
                    const imgPromise = new Promise((imgResolve, imgReject) => {
                        img.onload = () => imgResolve(img);
                        img.onerror = (err) => imgReject(new Error(`Error loading image: ${err.message || 'Unknown error'}`));
                    });
                    img.src = content;
                    this._cachedData = await imgPromise;
                    resolve(this._cachedData);
                } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
                    const audio = new Audio();
                    const audioPromise = new Promise((audioResolve, audioReject) => {
                        audio.oncanplaythrough = () => audioResolve(audio);
                        audio.onerror = (err) => audioReject(new Error(`Error loading audio: ${err.message || 'Unknown error'}`));
                    });
                    audio.src = content;
                    this._cachedData = await audioPromise;
                    resolve(this._cachedData);
                } else if (extension === 'js') {
                    this._cachedData = content;
                    resolve(this._cachedData);
                } else {
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