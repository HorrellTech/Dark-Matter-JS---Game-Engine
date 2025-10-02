/**
 * Material - A comprehensive material system for 3D meshes
 * 
 * Supports textures, procedural generation, colors, and UV mapping
 * for the Dark Matter JS 3D engine.
 */
class Material extends Module {
    static namespace = "3D";

    /**
     * Create a new Material
     */
    constructor() {
        super("Material");

        // Material properties
        this._diffuseColor = "#FFFFFF";
        this._specularColor = "#FFFFFF";
        this._emissiveColor = "#000000";
        this._shininess = 32;
        this._opacity = 1.0;

        // Texture properties
        this._diffuseTexture = null; // Image URL or canvas
        this._normalTexture = null;
        this._specularTexture = null;
        this._emissiveTexture = null;

        // Procedural texture generation
        this._useProceduralTexture = false;
        this._proceduralType = "noise"; // "noise", "checker", "gradient", "cellular"
        this._proceduralSeed = 12345;
        this._proceduralScale = 1.0;
        this._proceduralColor1 = "#4CAF50";
        this._proceduralColor2 = "#2196F3";
        this._proceduralOctaves = 4;
        this._proceduralPersistence = 0.5;
        this._proceduralLacunarity = 2.0;

        // UV mapping properties
        this._uvScale = new Vector2(1, 1);
        this._uvOffset = new Vector2(0, 0);
        this._uvRotation = 0;

        // Material flags
        this._transparent = false;
        this._doubleSided = false;
        this._wireframe = false;

        // Generated texture cache
        this._generatedTexture = null;
        this._textureSize = 512;

        // Enhanced texture management
        this._loadedTextures = new Map(); // Cache for loaded textures
        this._texturePromises = new Map(); // Track loading promises
        this._textureLoadQueue = []; // Queue for background loading

        // Expose properties to inspector
        this.exposeProperty("diffuseColor", "color", this._diffuseColor, {
            onChange: (val) => this._diffuseColor = val
        });

        this.exposeProperty("specularColor", "color", this._specularColor, {
            onChange: (val) => this._specularColor = val
        });

        this.exposeProperty("emissiveColor", "color", this._emissiveColor, {
            onChange: (val) => this._emissiveColor = val
        });

        this.exposeProperty("shininess", "number", this._shininess, {
            min: 1,
            max: 128,
            onChange: (val) => this._shininess = val
        });

        this.exposeProperty("opacity", "number", this._opacity, {
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => {
                this._opacity = val;
                this._transparent = val < 1.0;
            }
        });

        this.exposeProperty("diffuseTexture", "asset", this._diffuseTexture, {
            assetType: "image",
            fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'],
            onChange: (val) => {
                this._diffuseTexture = val;
                this._useProceduralTexture = false;
                this._generatedTexture = null;

                // Preload texture if it's a path
                if (typeof val === 'string') {
                    this.preloadTexture(val);
                }
            }
        });

        this.exposeProperty("useProceduralTexture", "boolean", this._useProceduralTexture, {
            onChange: (val) => {
                this._useProceduralTexture = val;
                if (val) {
                    this._diffuseTexture = null;
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralType", "enum", this._proceduralType, {
            options: ["noise", "checker", "gradient", "cellular"],
            onChange: (val) => {
                this._proceduralType = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralSeed", "number", this._proceduralSeed, {
            onChange: (val) => {
                this._proceduralSeed = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralScale", "number", this._proceduralScale, {
            min: 0.1,
            max: 10,
            step: 0.1,
            onChange: (val) => {
                this._proceduralScale = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralColor1", "color", this._proceduralColor1, {
            onChange: (val) => {
                this._proceduralColor1 = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralColor2", "color", this._proceduralColor2, {
            onChange: (val) => {
                this._proceduralColor2 = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralOctaves", "number", this._proceduralOctaves, {
            min: 1,
            max: 8,
            onChange: (val) => {
                this._proceduralOctaves = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralPersistence", "number", this._proceduralPersistence, {
            min: 0.1,
            max: 1,
            step: 0.01,
            onChange: (val) => {
                this._proceduralPersistence = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("proceduralLacunarity", "number", this._proceduralLacunarity, {
            min: 1,
            max: 4,
            step: 0.1,
            onChange: (val) => {
                this._proceduralLacunarity = val;
                if (this._useProceduralTexture) {
                    this.generateProceduralTexture();
                }
            }
        });

        this.exposeProperty("uvScale", "vector2", this._uvScale, {
            onChange: (val) => this._uvScale = val
        });

        this.exposeProperty("uvOffset", "vector2", this._uvOffset, {
            onChange: (val) => this._uvOffset = val
        });

        this.exposeProperty("uvRotation", "number", this._uvRotation, {
            min: 0,
            max: 360,
            onChange: (val) => this._uvRotation = val
        });

        this.exposeProperty("transparent", "boolean", this._transparent, {
            onChange: (val) => this._transparent = val
        });

        this.exposeProperty("doubleSided", "boolean", this._doubleSided, {
            onChange: (val) => this._doubleSided = val
        });

        this.exposeProperty("wireframe", "boolean", this._wireframe, {
            onChange: (val) => this._wireframe = val
        });
    }

    /**
     * Generate a procedural texture based on current settings
     */
    generateProceduralTexture() {
        const size = this._textureSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;

        const color1 = this._parseColor(this._proceduralColor1);
        const color2 = this._parseColor(this._proceduralColor2);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const v = y / size;

                let value = 0;

                switch (this._proceduralType) {
                    case "noise":
                        value = this._generateNoise(u * this._proceduralScale, v * this._proceduralScale);
                        break;
                    case "checker":
                        value = this._generateChecker(u * this._proceduralScale, v * this._proceduralScale);
                        break;
                    case "gradient":
                        value = this._generateGradient(u, v);
                        break;
                    case "cellular":
                        value = this._generateCellular(u * this._proceduralScale, v * this._proceduralScale);
                        break;
                }

                // Normalize value to 0-1 range
                value = Math.max(0, Math.min(1, (value + 1) / 2));

                // Interpolate between colors
                const color = this._lerpColor(color1, color2, value);

                const index = (y * size + x) * 4;
                data[index] = color.r;     // Red
                data[index + 1] = color.g; // Green
                data[index + 2] = color.b; // Blue
                data[index + 3] = 255;     // Alpha
            }
        }

        ctx.putImageData(imageData, 0, 0);
        this._generatedTexture = canvas;

        return canvas;
    }

    /**
     * Generate noise value at given coordinates
     */
    _generateNoise(x, y) {
        // Simple pseudo-random noise using the seed
        const n = Math.sin(x * 12.9898 + y * 78.233 + this._proceduralSeed) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1; // Normalize to -1 to 1
    }

    /**
     * Generate checker pattern
     */
    _generateChecker(u, v) {
        const x = Math.floor(u * 8); // 8x8 checker pattern
        const y = Math.floor(v * 8);
        return (x + y) % 2 === 0 ? 1 : -1;
    }

    /**
     * Generate radial gradient
     */
    _generateGradient(u, v) {
        const centerU = 0.5;
        const centerV = 0.5;
        const distance = Math.sqrt((u - centerU) ** 2 + (v - centerV) ** 2);
        return Math.max(-1, Math.min(1, 1 - distance * 2));
    }

    /**
     * Generate cellular/Worley noise
     */
    _generateCellular(u, v) {
        let minDistance = Infinity;

        // Sample a few random points
        for (let i = 0; i < 8; i++) {
            const px = this._hash(i * 2) + Math.sin(i + this._proceduralSeed) * 0.5;
            const py = this._hash(i * 2 + 1) + Math.cos(i + this._proceduralSeed) * 0.5;

            const distance = Math.sqrt((u - px) ** 2 + (v - py) ** 2);
            minDistance = Math.min(minDistance, distance);
        }

        // Normalize distance (this is a simple approximation)
        return Math.max(-1, Math.min(1, 1 - minDistance * 4));
    }

    /**
     * Simple hash function for pseudo-random values
     */
    _hash(value) {
        const hash = ((value * 73856093) ^ (value * 19349663)) >>> 0;
        return (hash / 4294967295) * 2 - 1; // Normalize to -1 to 1
    }

    /**
     * Parse color string to RGB object
     */
    _parseColor(color) {
        if (!color) return { r: 255, g: 255, b: 255 };

        // Handle hex colors
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            } else if (hex.length === 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16)
                };
            }
        }

        // Handle rgb() format
        if (typeof color === 'string' && color.startsWith('rgb')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
        }

        return { r: 255, g: 255, b: 255 };
    }

    /**
     * Linear interpolation between two colors
     */
    _lerpColor(color1, color2, t) {
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * t),
            g: Math.round(color1.g + (color2.g - color1.g) * t),
            b: Math.round(color1.b + (color2.b - color1.b) * t)
        };
    }

    /**
     * Get the diffuse texture (either loaded or generated)
     */
    getDiffuseTexture() {
        if (this._useProceduralTexture) {
            return this._generatedTexture;
        }

        // If texture is already loaded, return it
        if (this._diffuseTexture && (this._diffuseTexture instanceof HTMLImageElement ||
            this._diffuseTexture instanceof HTMLCanvasElement ||
            this._diffuseTexture instanceof ImageData)) {
            return this._diffuseTexture;
        }

        // If texture is a string path, try to load it
        if (typeof this._diffuseTexture === 'string') {
            return this.loadTextureFromPath(this._diffuseTexture);
        }

        return this._diffuseTexture;
    }

    /**
     * Enhanced texture loading with caching and multiple fallback methods
     * @param {string} path - Path to the texture
     * @returns {Promise<HTMLImageElement|HTMLCanvasElement|null>} - Loaded texture
     */
    async loadTextureFromPath(path) {
        if (!path) return null;

        // Check cache first
        if (this._loadedTextures.has(path)) {
            return this._loadedTextures.get(path);
        }

        // Check if already loading
        if (this._texturePromises.has(path)) {
            return this._texturePromises.get(path);
        }

        // Create loading promise
        const loadPromise = this._loadTextureWithFallbacks(path);
        this._texturePromises.set(path, loadPromise);

        try {
            const texture = await loadPromise;
            this._loadedTextures.set(path, texture);
            return texture;
        } catch (error) {
            console.error('Failed to load texture:', path, error);
            this._texturePromises.delete(path);
            return null;
        }
    }

    /**
     * Load texture with multiple fallback methods (similar to SpriteRenderer)
     * @param {string} path - Path to the texture
     * @returns {Promise<HTMLImageElement|HTMLCanvasElement|null>} - Loaded texture
     */
    async _loadTextureWithFallbacks(path) {
        try {
            // PRIORITY 1: Load from AssetManager
            if (window.assetManager) {
                const asset = await window.assetManager.getAssetByPath(path);
                if (asset && (asset instanceof HTMLImageElement || asset instanceof HTMLCanvasElement)) {
                    console.log('Texture loaded from AssetManager:', path);
                    return asset;
                }
            }

            // PRIORITY 2: Load from FileBrowser (editor mode)
            if (window.editor && window.editor.fileBrowser) {
                try {
                    const texture = await this._loadTextureFromFileBrowser(path);
                    if (texture) {
                        console.log('Texture loaded via FileBrowser:', path);
                        return texture;
                    }
                } catch (error) {
                    console.warn('FileBrowser loading failed:', error);
                }
            }

            // PRIORITY 3: Direct URL loading (fallback)
            return await this._loadTextureDirect(path);

        } catch (error) {
            console.error('Error in texture loading pipeline:', error);
            return null;
        }
    }

    /**
     * Load texture from FileBrowser (editor mode)
     * @param {string} path - Path to the texture
     * @returns {Promise<HTMLImageElement|HTMLCanvasElement|null>} - Loaded texture
     */
    async _loadTextureFromFileBrowser(path) {
        const fileBrowser = window.editor.fileBrowser;

        // Try to read file content
        const content = await fileBrowser.readFile(path);
        if (!content) {
            throw new Error(`Could not read texture file: ${path}`);
        }

        // Handle data URL
        if (typeof content === 'string' && content.startsWith('data:image')) {
            return this._loadTextureFromDataURL(content);
        }

        // Handle base64 or raw content
        if (typeof content === 'string' && !content.startsWith('data:')) {
            const extension = path.split('.').pop().toLowerCase();
            const mimeType = this._getMimeType(extension);

            let dataUrl;
            if (content.startsWith('data:')) {
                dataUrl = content;
            } else {
                dataUrl = `data:${mimeType};base64,${content}`;
            }

            return this._loadTextureFromDataURL(dataUrl);
        }

        // Handle binary content
        if (content instanceof Blob || content instanceof ArrayBuffer) {
            let blob = content;
            if (content instanceof ArrayBuffer) {
                const extension = path.split('.').pop().toLowerCase();
                blob = new Blob([content], { type: `image/${extension}` });
            }

            const dataUrl = await this._blobToDataURL(blob);
            return this._loadTextureFromDataURL(dataUrl);
        }

        throw new Error(`Unsupported texture content type: ${typeof content}`);
    }

    /**
     * Load texture directly from URL/path
     * @param {string} path - Path to the texture
     * @returns {Promise<HTMLImageElement>} - Loaded texture
     */
    async _loadTextureDirect(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                console.log('Texture loaded successfully:', path);
                resolve(img);
            };

            img.onerror = () => {
                reject(new Error(`Failed to load texture: ${path}`));
            };

            // Handle cross-origin if needed
            if (path.startsWith('http') && !path.includes(window.location.hostname)) {
                img.crossOrigin = 'anonymous';
            }

            img.src = path;
        });
    }

    /**
     * Load texture from data URL
     * @param {string} dataUrl - Data URL of the texture
     * @returns {Promise<HTMLImageElement>} - Loaded texture
     */
    async _loadTextureFromDataURL(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load texture from data URL'));

            img.src = dataUrl;
        });
    }

    /**
     * Convert blob to data URL
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>} - Data URL
     */
    async _blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Get MIME type from file extension
     * @param {string} extension - File extension
     * @returns {string} - MIME type
     */
    _getMimeType(extension) {
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp'
        };

        return mimeTypes[extension] || 'image/png';
    }

    /**
     * Preload a texture for better performance
     * @param {string} path - Path to the texture to preload
     */
    preloadTexture(path) {
        if (!path || this._loadedTextures.has(path) || this._texturePromises.has(path)) {
            return;
        }

        // Add to loading queue
        this._textureLoadQueue.push(path);

        // Process queue if not already processing
        if (this._textureLoadQueue.length === 1) {
            this._processTextureQueue();
        }
    }

    /**
     * Process the texture loading queue
     */
    async _processTextureQueue() {
        while (this._textureLoadQueue.length > 0) {
            const path = this._textureLoadQueue.shift();
            try {
                await this.loadTextureFromPath(path);
            } catch (error) {
                console.warn('Failed to preload texture:', path, error);
            }
        }
    }

    /**
     * Clear texture cache
     * @param {string} path - Specific path to clear, or null to clear all
     */
    clearTextureCache(path = null) {
        if (path) {
            this._loadedTextures.delete(path);
            this._texturePromises.delete(path);
        } else {
            this._loadedTextures.clear();
            this._texturePromises.clear();
        }
    }

    /**
     * Get texture loading progress
     * @returns {Object} - Loading statistics
     */
    getTextureLoadingStats() {
        return {
            cached: this._loadedTextures.size,
            loading: this._texturePromises.size,
            queued: this._textureLoadQueue.length
        };
    }

    /**
     * Calculate lighting for a point on a surface
     * @param {Vector3} point - World position of the point
     * @param {Vector3} normal - Surface normal at the point
     * @param {Vector3} viewDir - Direction from point to camera
     * @param {Array} lights - Array of light objects with position, color, intensity
     * @returns {Object} - Lighting result with diffuse, specular, ambient components
     */
    calculateLighting(point, normal, viewDir, lights = []) {
        const result = {
            diffuse: { r: 0, g: 0, b: 0 },
            specular: { r: 0, g: 0, b: 0 },
            ambient: this._parseColor(this._emissiveColor)
        };

        // Normalize vectors
        const n = normal.clone().normalize();
        const v = viewDir.clone().normalize();

        for (const light of lights) {
            const lightDir = light.position.clone().sub(point).normalize();
            const lightColor = this._parseColor(light.color || "#FFFFFF");
            const intensity = light.intensity || 1.0;

            // Diffuse lighting (Lambert's cosine law)
            const diffuseFactor = Math.max(0, n.dot(lightDir));
            result.diffuse.r += lightColor.r * diffuseFactor * intensity;
            result.diffuse.g += lightColor.g * diffuseFactor * intensity;
            result.diffuse.b += lightColor.b * diffuseFactor * intensity;

            // Specular lighting (Phong reflection model)
            if (diffuseFactor > 0) {
                const reflectDir = n.clone().multiplyScalar(2 * n.dot(lightDir)).sub(lightDir);
                const specularFactor = Math.pow(Math.max(0, reflectDir.dot(v)), this._shininess);
                const specularIntensity = intensity * specularFactor;

                const specularColor = this._parseColor(this._specularColor);
                result.specular.r += specularColor.r * specularIntensity;
                result.specular.g += specularColor.g * specularIntensity;
                result.specular.b += specularColor.b * specularIntensity;
            }
        }

        // Clamp values to 0-255 range
        const clampColor = (color) => ({
            r: Math.max(0, Math.min(255, color.r)),
            g: Math.max(0, Math.min(255, color.g)),
            b: Math.max(0, Math.min(255, color.b))
        });

        result.diffuse = clampColor(result.diffuse);
        result.specular = clampColor(result.specular);

        return result;
    }

    /**
     * Get lit color for a surface point considering material properties
     * @param {Vector3} point - World position of the point
     * @param {Vector3} normal - Surface normal at the point
     * @param {Vector3} viewDir - Direction from point to camera
     * @param {Array} lights - Array of light objects
     * @param {Vector2} uv - UV coordinates for texture sampling
     * @returns {Object} - Final color with RGBA values
     */
    getLitSurfaceColor(point, normal, viewDir, lights = [], uv = new Vector2(0, 0)) {
        // Get base material color from texture or diffuse color
        let baseColor;
        if (this._diffuseTexture) {
            const textureColor = this.sampleTexture(uv.x, uv.y);
            if (textureColor) {
                // Parse RGBA from texture sample
                const match = textureColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (match) {
                    baseColor = {
                        r: parseInt(match[1]),
                        g: parseInt(match[2]),
                        b: parseInt(match[3]),
                        a: match[4] ? parseFloat(match[4]) : 1.0
                    };
                } else {
                    baseColor = this._parseColor(this._diffuseColor);
                }
            } else {
                baseColor = this._parseColor(this._diffuseColor);
            }
        } else {
            baseColor = this._parseColor(this._diffuseColor);
        }

        // Calculate lighting
        const lighting = this.calculateLighting(point, normal, viewDir, lights);

        // Combine base color with lighting
        const finalColor = {
            r: Math.round((baseColor.r * (lighting.ambient.r / 255 + lighting.diffuse.r / 255)) + lighting.specular.r),
            g: Math.round((baseColor.g * (lighting.ambient.g / 255 + lighting.diffuse.g / 255)) + lighting.specular.g),
            b: Math.round((baseColor.b * (lighting.ambient.b / 255 + lighting.diffuse.b / 255)) + lighting.specular.b),
            a: baseColor.a * this._opacity
        };

        // Clamp final values
        finalColor.r = Math.max(0, Math.min(255, finalColor.r));
        finalColor.g = Math.max(0, Math.min(255, finalColor.g));
        finalColor.b = Math.max(0, Math.min(255, finalColor.b));

        return finalColor;
    }

    /**
     * Simple lighting setup for scenes without explicit lights
     * @param {Vector3} point - World position of the point
     * @param {Vector3} normal - Surface normal at the point
     * @param {Vector3} viewDir - Direction from point to camera
     * @returns {Object} - Final color with RGBA values
     */
    getSimpleLitColor(point, normal, viewDir, uv = new Vector2(0, 0)) {
        // Default lighting setup
        const defaultLights = [
            {
                position: new Vector3(100, 100, 100),
                color: "#FFFFFF",
                intensity: 1.0
            },
            {
                position: new Vector3(-50, -50, 50),
                color: "#8888FF",
                intensity: 0.3
            }
        ];

        return this.getLitSurfaceColor(point, normal, viewDir, defaultLights, uv);
    }

    /**
     * Sample texture color at UV coordinates
     */
    sampleTexture(u, v, texture = null) {
        const tex = texture || this.getDiffuseTexture();
        if (!tex) {
            // Return diffuse color if no texture
            const color = this._parseColor(this._diffuseColor);
            return `rgba(${color.r}, ${color.g}, ${color.b}, ${this._opacity})`;
        }

        // Apply UV transformations
        let transformedU = u * this._uvScale.x + this._uvOffset.x;
        let transformedV = v * this._uvScale.y + this._uvOffset.y;

        // Apply rotation
        if (this._uvRotation !== 0) {
            const rad = this._uvRotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const centerU = 0.5;
            const centerV = 0.5;

            transformedU -= centerU;
            transformedV -= centerV;

            const rotatedU = transformedU * cos - transformedV * sin;
            const rotatedV = transformedU * sin + transformedV * cos;

            transformedU = rotatedU + centerU;
            transformedV = rotatedV + centerV;
        }

        // Wrap UV coordinates
        transformedU = ((transformedU % 1) + 1) % 1;
        transformedV = ((transformedV % 1) + 1) % 1;

        // Sample the texture
        const x = Math.floor(transformedU * tex.width);
        const y = Math.floor(transformedV * tex.height);

        if (x >= 0 && x < tex.width && y >= 0 && y < tex.height) {
            const canvas = tex;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(x, y, 1, 1);
            const data = imageData.data;

            return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] * this._opacity / 255})`;
        }

        // Fallback to diffuse color
        const color = this._parseColor(this._diffuseColor);
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${this._opacity})`;
    }

    /**
     * Create a simple test texture for debugging
     */
    createTestTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create a colorful test pattern
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const v = y / size;

                const r = Math.floor(u * 255);
                const g = Math.floor(v * 255);
                const b = Math.floor((u + v) / 2 * 255);

                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        this._diffuseTexture = canvas;
        this._useProceduralTexture = false;
        this._generatedTexture = null;

        return canvas;
    }

    /**
     * Clone this material
     */
    clone() {
        const cloned = new Material();
        cloned._diffuseColor = this._diffuseColor;
        cloned._specularColor = this._specularColor;
        cloned._emissiveColor = this._emissiveColor;
        cloned._shininess = this._shininess;
        cloned._opacity = this._opacity;
        cloned._diffuseTexture = this._diffuseTexture;
        cloned._normalTexture = this._normalTexture;
        cloned._specularTexture = this._specularTexture;
        cloned._emissiveTexture = this._emissiveTexture;
        cloned._useProceduralTexture = this._useProceduralTexture;
        cloned._proceduralType = this._proceduralType;
        cloned._proceduralSeed = this._proceduralSeed;
        cloned._proceduralScale = this._proceduralScale;
        cloned._proceduralColor1 = this._proceduralColor1;
        cloned._proceduralColor2 = this._proceduralColor2;
        cloned._proceduralOctaves = this._proceduralOctaves;
        cloned._proceduralPersistence = this._proceduralPersistence;
        cloned._proceduralLacunarity = this._proceduralLacunarity;
        cloned._uvScale = this._uvScale.clone();
        cloned._uvOffset = this._uvOffset.clone();
        cloned._uvRotation = this._uvRotation;
        cloned._transparent = this._transparent;
        cloned._doubleSided = this._doubleSided;
        cloned._wireframe = this._wireframe;

        return cloned;
    }

    /**
     * Serialize material to JSON
     */
    toJSON() {
        return {
            _type: "Material",
            _diffuseColor: this._diffuseColor,
            _specularColor: this._specularColor,
            _emissiveColor: this._emissiveColor,
            _shininess: this._shininess,
            _opacity: this._opacity,
            _diffuseTexture: this._diffuseTexture,
            _normalTexture: this._normalTexture,
            _specularTexture: this._specularTexture,
            _emissiveTexture: this._emissiveTexture,
            _useProceduralTexture: this._useProceduralTexture,
            _proceduralType: this._proceduralType,
            _proceduralSeed: this._proceduralSeed,
            _proceduralScale: this._proceduralScale,
            _proceduralColor1: this._proceduralColor1,
            _proceduralColor2: this._proceduralColor2,
            _proceduralOctaves: this._proceduralOctaves,
            _proceduralPersistence: this._proceduralPersistence,
            _proceduralLacunarity: this._proceduralLacunarity,
            _uvScale: { x: this._uvScale.x, y: this._uvScale.y },
            _uvOffset: { x: this._uvOffset.x, y: this._uvOffset.y },
            _uvRotation: this._uvRotation,
            _transparent: this._transparent,
            _doubleSided: this._doubleSided,
            _wireframe: this._wireframe
        };
    }

    /**
     * Deserialize material from JSON
     */
    fromJSON(json) {
        if (json._diffuseColor !== undefined) this._diffuseColor = json._diffuseColor;
        if (json._specularColor !== undefined) this._specularColor = json._specularColor;
        if (json._emissiveColor !== undefined) this._emissiveColor = json._emissiveColor;
        if (json._shininess !== undefined) this._shininess = json._shininess;
        if (json._opacity !== undefined) {
            this._opacity = json._opacity;
            this._transparent = json._opacity < 1.0;
        }
        if (json._diffuseTexture !== undefined) this._diffuseTexture = json._diffuseTexture;
        if (json._normalTexture !== undefined) this._normalTexture = json._normalTexture;
        if (json._specularTexture !== undefined) this._specularTexture = json._specularTexture;
        if (json._emissiveTexture !== undefined) this._emissiveTexture = json._emissiveTexture;
        if (json._useProceduralTexture !== undefined) this._useProceduralTexture = json._useProceduralTexture;
        if (json._proceduralType !== undefined) this._proceduralType = json._proceduralType;
        if (json._proceduralSeed !== undefined) this._proceduralSeed = json._proceduralSeed;
        if (json._proceduralScale !== undefined) this._proceduralScale = json._proceduralScale;
        if (json._proceduralColor1 !== undefined) this._proceduralColor1 = json._proceduralColor1;
        if (json._proceduralColor2 !== undefined) this._proceduralColor2 = json._proceduralColor2;
        if (json._proceduralOctaves !== undefined) this._proceduralOctaves = json._proceduralOctaves;
        if (json._proceduralPersistence !== undefined) this._proceduralPersistence = json._proceduralPersistence;
        if (json._proceduralLacunarity !== undefined) this._proceduralLacunarity = json._proceduralLacunarity;
        if (json._uvScale) this._uvScale = new Vector2(json._uvScale.x, json._uvScale.y);
        if (json._uvOffset) this._uvOffset = new Vector2(json._uvOffset.x, json._uvOffset.y);
        if (json._uvRotation !== undefined) this._uvRotation = json._uvRotation;
        if (json._transparent !== undefined) this._transparent = json._transparent;
        if (json._doubleSided !== undefined) this._doubleSided = json._doubleSided;
        if (json._wireframe !== undefined) this._wireframe = json._wireframe;

        // Regenerate procedural texture if needed
        if (this._useProceduralTexture) {
            this.generateProceduralTexture();
        }
    }

    // Getters and setters
    get diffuseColor() { return this._diffuseColor; }
    set diffuseColor(value) { this._diffuseColor = value; }

    get specularColor() { return this._specularColor; }
    set specularColor(value) { this._specularColor = value; }

    get emissiveColor() { return this._emissiveColor; }
    set emissiveColor(value) { this._emissiveColor = value; }

    get shininess() { return this._shininess; }
    set shininess(value) { this._shininess = Math.max(1, Math.min(128, value)); }

    get opacity() { return this._opacity; }
    set opacity(value) {
        this._opacity = Math.max(0, Math.min(1, value));
        this._transparent = this._opacity < 1.0;
    }

    get diffuseTexture() { return this._diffuseTexture; }
    set diffuseTexture(value) {
        this._diffuseTexture = value;
        this._useProceduralTexture = false;
        this._generatedTexture = null;

        // Preload texture if it's a path
        if (typeof value === 'string') {
            this.preloadTexture(value);
        }
    }

    get useProceduralTexture() { return this._useProceduralTexture; }
    set useProceduralTexture(value) {
        this._useProceduralTexture = value;
        if (value) {
            this._diffuseTexture = null;
            this.generateProceduralTexture();
        }
    }

    get proceduralType() { return this._proceduralType; }
    set proceduralType(value) { this._proceduralType = value; }

    get proceduralSeed() { return this._proceduralSeed; }
    set proceduralSeed(value) { this._proceduralSeed = value; }

    get proceduralScale() { return this._proceduralScale; }
    set proceduralScale(value) { this._proceduralScale = value; }

    get proceduralColor1() { return this._proceduralColor1; }
    set proceduralColor1(value) { this._proceduralColor1 = value; }

    get proceduralColor2() { return this._proceduralColor2; }
    set proceduralColor2(value) { this._proceduralColor2 = value; }

    get uvScale() { return this._uvScale; }
    set uvScale(value) { this._uvScale = value; }

    get uvOffset() { return this._uvOffset; }
    set uvOffset(value) { this._uvOffset = value; }

    get uvRotation() { return this._uvRotation; }
    set uvRotation(value) { this._uvRotation = value; }

    get transparent() { return this._transparent; }
    set transparent(value) { this._transparent = value; }

    get doubleSided() { return this._doubleSided; }
    set doubleSided(value) { this._doubleSided = value; }

    get wireframe() { return this._wireframe; }
    set wireframe(value) { this._wireframe = value; }
}

// Register the Material module
window.Material = Material;