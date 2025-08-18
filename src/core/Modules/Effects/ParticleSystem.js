/**
 * ParticleSystem - Creates and manages particle effects with image support and alpha gradients
 */
class ParticleSystem extends Module {
    static allowMultiple = true;
    static namespace = "Effects";
    static description = "Creates particle effects like fire, smoke, explosions with image support";
    static iconClass = "fas fa-fire";

    constructor() {
        super("ParticleSystem");

        // Emission properties
        this.emissionRate = 10; // particles per second
        this.maxParticles = 100;
        this.emissionShape = "point"; // point, circle, rectangle
        this.emissionRadius = 0;
        this.emissionWidth = 50;
        this.emissionHeight = 50;

        // Particle properties
        this.particleLifetime = 2.0;
        this.particleLifetimeVariation = 0.5;
        this.startSize = 5;
        this.endSize = 1;
        this.sizeVariation = 2;
        this.startColor = "#ffffff";
        this.endColor = "#ffffff";
        this.startAlpha = 1.0;
        this.endAlpha = 0.0;

        // Movement properties
        this.startVelocityX = 0;
        this.startVelocityY = -50;
        this.velocityVariationX = 20;
        this.velocityVariationY = 20;
        this.gravity = 0;
        this.drag = 0.98;

        // Visual properties
        this.particleShape = "circle"; // circle, square, line, image
        this.blendMode = "normal"; // normal, additive, multiply
        this.useAlphaGradient = false; // Enable alpha mask gradients
        this.gradientType = "radial"; // radial, linear
        this.gradientDirection = 0; // For linear gradients (degrees)

        // Image particle properties
        this.useImageParticles = false;
        this.imageAsset = null;
        this.imageScaleMode = "stretch"; // stretch, fit, maintain
        this.imageRotation = 0; // Additional rotation for image particles
        this.imageFlipX = false;
        this.imageFlipY = false;

        // Control properties
        this.autoStart = true;
        this.loopEmitter = true;
        this.duration = 5.0; // duration for non-looping systems

        // Performance properties
        this.useObjectPooling = true;
        this.enableBatching = true;
        this.maxBatchSize = 50;
        this.cullingEnabled = true;
        this.cullingMargin = 100;

        // Internal state
        this.particles = [];
        this.particlePool = []; // Object pool for performance
        this.isEmitting = false;
        this.emissionTimer = 0;
        this.systemTimer = 0;

        // Image loading state
        this._image = null;
        this._isImageLoaded = false;
        this._imageWidth = 0;
        this._imageHeight = 0;

        // Performance tracking
        this.lastCullTime = 0;
        this.cullInterval = 100; // ms

        // Batch rendering data
        this.batchedParticles = new Map(); // Group particles by rendering properties

        this.setupProperties();
        this.createImageAssetReference();
    }

    createImageAssetReference() {
        try {
            if (window.AssetReference) {
                this.imageAsset = new window.AssetReference(null, 'image');
            } else {
                this.imageAsset = {
                    path: null,
                    type: 'image',
                    embedded: false,
                    load: () => Promise.resolve(null)
                };
            }
        } catch (error) {
            console.error("Error creating AssetReference for ParticleSystem:", error);
            this.imageAsset = {
                path: null,
                type: 'image',
                embedded: false,
                load: () => Promise.resolve(null)
            };
        }
    }

    setupProperties() {
        // Emission properties
        this.exposeProperty("emissionRate", "number", this.emissionRate, {
            min: 0.1, max: 100, step: 0.1,
            description: "Particles emitted per second",
            onChange: (val) => { this.emissionRate = val; }
        });

        this.exposeProperty("maxParticles", "number", this.maxParticles, {
            min: 1, max: 1000, step: 1,
            description: "Maximum number of particles",
            onChange: (val) => { this.maxParticles = val; }
        });

        this.exposeProperty("emissionShape", "enum", this.emissionShape, {
            options: ["point", "circle", "rectangle"],
            description: "Shape of emission area",
            onChange: (val) => { this.emissionShape = val; }
        });

        this.exposeProperty("emissionRadius", "number", this.emissionRadius, {
            min: 0, max: 200, step: 1,
            description: "Radius for circle emission",
            onChange: (val) => { this.emissionRadius = val; }
        });

        // Particle properties
        this.exposeProperty("particleLifetime", "number", this.particleLifetime, {
            min: 0.1, max: 10, step: 0.1,
            description: "How long particles live (seconds)",
            onChange: (val) => { this.particleLifetime = val; }
        });

        this.exposeProperty("particleLifetimeVariation", "number", this.particleLifetimeVariation, {
            min: 0, max: 5, step: 0.1,
            description: "Random variation in lifetime",
            onChange: (val) => { this.particleLifetimeVariation = val; }
        });

        this.exposeProperty("startSize", "number", this.startSize, {
            min: 1, max: 50, step: 1,
            description: "Initial particle size",
            onChange: (val) => { this.startSize = val; }
        });

        this.exposeProperty("endSize", "number", this.endSize, {
            min: 0, max: 50, step: 1,
            description: "Final particle size",
            onChange: (val) => { this.endSize = val; }
        });

        this.exposeProperty("startColor", "color", this.startColor, {
            description: "Initial particle color",
            onChange: (val) => { this.startColor = val; }
        });

        this.exposeProperty("endColor", "color", this.endColor, {
            description: "Final particle color",
            onChange: (val) => { this.endColor = val; }
        });

        this.exposeProperty("startAlpha", "number", this.startAlpha, {
            min: 0, max: 1, step: 0.1,
            description: "Initial particle opacity",
            onChange: (val) => { this.startAlpha = val; }
        });

        this.exposeProperty("endAlpha", "number", this.endAlpha, {
            min: 0, max: 1, step: 0.1,
            description: "Final particle opacity",
            onChange: (val) => { this.endAlpha = val; }
        });

        // Movement properties
        this.exposeProperty("startVelocityY", "number", this.startVelocityY, {
            min: -200, max: 200, step: 1,
            description: "Initial Y velocity",
            onChange: (val) => { this.startVelocityY = val; }
        });

        this.exposeProperty("velocityVariationX", "number", this.velocityVariationX, {
            min: 0, max: 100, step: 1,
            description: "Random X velocity variation",
            onChange: (val) => { this.velocityVariationX = val; }
        });

        this.exposeProperty("velocityVariationY", "number", this.velocityVariationY, {
            min: 0, max: 100, step: 1,
            description: "Random Y velocity variation",
            onChange: (val) => { this.velocityVariationY = val; }
        });

        this.exposeProperty("gravity", "number", this.gravity, {
            min: -500, max: 500, step: 1,
            description: "Gravity force applied to particles",
            onChange: (val) => { this.gravity = val; }
        });

        this.exposeProperty("drag", "number", this.drag, {
            min: 0.9, max: 1.0, step: 0.01,
            description: "Air resistance (1.0 = no drag)",
            onChange: (val) => { this.drag = val; }
        });

        // Visual properties
        this.exposeProperty("particleShape", "enum", this.particleShape, {
            options: ["circle", "square", "line", "image"],
            description: "Shape of individual particles",
            onChange: (val) => {
                this.particleShape = val;
                this.useImageParticles = (val === "image");
                this.refreshInspector();
            }
        });

        this.exposeProperty("blendMode", "enum", this.blendMode, {
            options: ["normal", "additive", "multiply", "screen", "overlay"],
            description: "Particle blend mode",
            onChange: (val) => { this.blendMode = val; }
        });

        // Alpha gradient properties
        this.exposeProperty("useAlphaGradient", "boolean", this.useAlphaGradient, {
            description: "Use alpha mask gradients for particles",
            onChange: (val) => {
                this.useAlphaGradient = val;
                this.refreshInspector();
            }
        });

        if (this.useAlphaGradient) {
            this.exposeProperty("gradientType", "enum", this.gradientType, {
                options: ["radial", "linear"],
                description: "Type of alpha gradient",
                onChange: (val) => { this.gradientType = val; }
            });

            if (this.gradientType === "linear") {
                this.exposeProperty("gradientDirection", "number", this.gradientDirection, {
                    min: 0, max: 360, step: 1,
                    description: "Linear gradient direction (degrees)",
                    onChange: (val) => { this.gradientDirection = val; }
                });
            }
        }

        // Image particle properties
        if (this.useImageParticles) {
            this.exposeProperty("imageAsset", "asset", this.imageAsset, {
                description: "Image for particles",
                assetType: 'image',
                fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
                onDropCallback: this.handleImageDrop.bind(this),
                showImageDropdown: true

            });

            this.exposeProperty("imageScaleMode", "enum", this.imageScaleMode, {
                options: ["stretch", "fit", "maintain"],
                description: "How image scales to particle size",
                onChange: (val) => { this.imageScaleMode = val; }
            });

            this.exposeProperty("imageRotation", "number", this.imageRotation, {
                min: 0, max: 360, step: 1,
                description: "Additional image rotation (degrees)",
                onChange: (val) => { this.imageRotation = val; }
            });

            this.exposeProperty("imageFlipX", "boolean", this.imageFlipX, {
                description: "Flip image horizontally",
                onChange: (val) => { this.imageFlipX = val; }
            });

            this.exposeProperty("imageFlipY", "boolean", this.imageFlipY, {
                description: "Flip image vertically",
                onChange: (val) => { this.imageFlipY = val; }
            });
        }

        // Performance properties
        this.exposeProperty("useObjectPooling", "boolean", this.useObjectPooling, {
            description: "Use object pooling for better performance",
            onChange: (val) => {
                this.useObjectPooling = val;
                if (!val) this.particlePool = [];
            }
        });

        this.exposeProperty("enableBatching", "boolean", this.enableBatching, {
            description: "Enable batch rendering for similar particles",
            onChange: (val) => { this.enableBatching = val; }
        });

        this.exposeProperty("cullingEnabled", "boolean", this.cullingEnabled, {
            description: "Cull particles outside viewport",
            onChange: (val) => { this.cullingEnabled = val; }
        });

        // Control properties
        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start emitting automatically",
            onChange: (val) => { this.autoStart = val; }
        });

        this.exposeProperty("loopEmitter", "boolean", this.loopEmitter, {
            description: "Loop the particle system",
            onChange: (val) => { this.loopEmitter = val; }
        });
    }

    style(styleHelper) {
        styleHelper
            .addHeader("Particle System", "particle-header")
            .startGroup("Emission", false, { color: "#4A90E2" })
            .exposeProperty("emissionRate", "number", this.emissionRate, {
                label: "Emission Rate",
                min: 0.1, max: 100, step: 0.1,
                description: "Particles emitted per second"
            })
            .exposeProperty("maxParticles", "number", this.maxParticles, {
                label: "Max Particles",
                min: 1, max: 1000, step: 1,
                description: "Maximum number of particles"
            })
            .exposeProperty("emissionShape", "enum", this.emissionShape, {
                label: "Emission Shape",
                options: ["point", "circle", "rectangle"],
                description: "Shape of emission area"
            });

        if (this.emissionShape === "circle") {
            styleHelper.exposeProperty("emissionRadius", "number", this.emissionRadius, {
                label: "Emission Radius",
                min: 0, max: 200, step: 1,
                description: "Radius for circle emission"
            });
        }

        if (this.emissionShape === "rectangle") {
            styleHelper
                .exposeProperty("emissionWidth", "number", this.emissionWidth, {
                    label: "Emission Width",
                    min: 10, max: 500, step: 1,
                    description: "Width for rectangle emission"
                })
                .exposeProperty("emissionHeight", "number", this.emissionHeight, {
                    label: "Emission Height",
                    min: 10, max: 500, step: 1,
                    description: "Height for rectangle emission"
                });
        }

        styleHelper
            .endGroup()
            .startGroup("Particle Properties", false, { color: "#E74C3C" })
            .exposeProperty("particleLifetime", "number", this.particleLifetime, {
                label: "Lifetime",
                min: 0.1, max: 10, step: 0.1,
                description: "How long particles live (seconds)"
            })
            .exposeProperty("particleLifetimeVariation", "number", this.particleLifetimeVariation, {
                label: "Lifetime Variation",
                min: 0, max: 5, step: 0.1,
                description: "Random variation in lifetime"
            })
            .exposeProperty("startSize", "number", this.startSize, {
                label: "Start Size",
                min: 1, max: 50, step: 1,
                description: "Initial particle size"
            })
            .exposeProperty("endSize", "number", this.endSize, {
                label: "End Size",
                min: 0, max: 50, step: 1,
                description: "Final particle size"
            })
            .exposeProperty("sizeVariation", "number", this.sizeVariation, {
                label: "Size Variation",
                min: 0, max: 20, step: 1,
                description: "Random size variation"
            })
            .exposeProperty("startColor", "color", this.startColor, {
                label: "Start Color",
                description: "Initial particle color"
            })
            .exposeProperty("endColor", "color", this.endColor, {
                label: "End Color",
                description: "Final particle color"
            })
            .exposeProperty("startAlpha", "number", this.startAlpha, {
                label: "Start Alpha",
                min: 0, max: 1, step: 0.1,
                description: "Initial particle opacity"
            })
            .exposeProperty("endAlpha", "number", this.endAlpha, {
                label: "End Alpha",
                min: 0, max: 1, step: 0.1,
                description: "Final particle opacity"
            })
            .endGroup()
            .startGroup("Movement", false, { color: "#2ECC71" })
            .exposeProperty("startVelocityX", "number", this.startVelocityX, {
                label: "Start Velocity X",
                min: -200, max: 200, step: 1,
                description: "Initial X velocity"
            })
            .exposeProperty("startVelocityY", "number", this.startVelocityY, {
                label: "Start Velocity Y",
                min: -200, max: 200, step: 1,
                description: "Initial Y velocity"
            })
            .exposeProperty("velocityVariationX", "number", this.velocityVariationX, {
                label: "X Velocity Variation",
                min: 0, max: 100, step: 1,
                description: "Random X velocity variation"
            })
            .exposeProperty("velocityVariationY", "number", this.velocityVariationY, {
                label: "Y Velocity Variation",
                min: 0, max: 100, step: 1,
                description: "Random Y velocity variation"
            })
            .exposeProperty("gravity", "number", this.gravity, {
                label: "Gravity",
                min: -500, max: 500, step: 1,
                description: "Gravity force applied to particles"
            })
            .exposeProperty("drag", "number", this.drag, {
                label: "Drag",
                min: 0.9, max: 1.0, step: 0.01,
                description: "Air resistance (1.0 = no drag)"
            })
            .endGroup()
            .startGroup("Visual", false, { color: "#9B59B6" })
            .exposeProperty("particleShape", "enum", this.particleShape, {
                label: "Particle Shape",
                options: ["circle", "square", "line", "image"],
                description: "Shape of individual particles"
            })
            .exposeProperty("blendMode", "enum", this.blendMode, {
                label: "Blend Mode",
                options: ["normal", "additive", "multiply", "screen", "overlay"],
                description: "Particle blend mode"
            })
            .exposeProperty("useAlphaGradient", "boolean", this.useAlphaGradient, {
                label: "Use Alpha Gradient",
                description: "Use alpha mask gradients for particles"
            });

        if (this.useAlphaGradient) {
            styleHelper.exposeProperty("gradientType", "enum", this.gradientType, {
                label: "Gradient Type",
                options: ["radial", "linear"],
                description: "Type of alpha gradient"
            });

            if (this.gradientType === "linear") {
                styleHelper.exposeProperty("gradientDirection", "number", this.gradientDirection, {
                    label: "Gradient Direction",
                    min: 0, max: 360, step: 1,
                    description: "Linear gradient direction (degrees)"
                });
            }
        }

        styleHelper.endGroup();

        if (this.particleShape === "image") {
            styleHelper
                .startGroup("Image Particles", false, { color: "#F39C12" })
                .exposeProperty("imageAsset", "asset", this.imageAsset, {
                    label: "Particle Image",
                    description: "Image for particles",
                    assetType: 'image',
                    fileTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
                    onDropCallback: this.handleImageDrop.bind(this),
                    showImageDropdown: true
                })
                .exposeProperty("imageScaleMode", "enum", this.imageScaleMode, {
                    label: "Scale Mode",
                    options: ["stretch", "fit", "maintain"],
                    description: "How image scales to particle size"
                })
                .exposeProperty("imageRotation", "number", this.imageRotation, {
                    label: "Image Rotation",
                    min: 0, max: 360, step: 1,
                    description: "Additional image rotation (degrees)"
                })
                .exposeProperty("imageFlipX", "boolean", this.imageFlipX, {
                    label: "Flip X",
                    description: "Flip image horizontally"
                })
                .exposeProperty("imageFlipY", "boolean", this.imageFlipY, {
                    label: "Flip Y",
                    description: "Flip image vertically"
                })
                .endGroup();
        }

        styleHelper
            .startGroup("Performance", false, { color: "#34495E" })
            .exposeProperty("useObjectPooling", "boolean", this.useObjectPooling, {
                label: "Object Pooling",
                description: "Use object pooling for better performance"
            })
            .exposeProperty("enableBatching", "boolean", this.enableBatching, {
                label: "Enable Batching",
                description: "Enable batch rendering for similar particles"
            })
            .exposeProperty("maxBatchSize", "number", this.maxBatchSize, {
                label: "Max Batch Size",
                min: 10, max: 100, step: 5,
                description: "Maximum particles per batch"
            })
            .exposeProperty("cullingEnabled", "boolean", this.cullingEnabled, {
                label: "Culling Enabled",
                description: "Cull particles outside viewport"
            });

        if (this.cullingEnabled) {
            styleHelper.exposeProperty("cullingMargin", "number", this.cullingMargin, {
                label: "Culling Margin",
                min: 50, max: 500, step: 25,
                description: "Margin for particle culling"
            });
        }

        styleHelper
            .endGroup()
            .startGroup("Control", false, { color: "#1ABC9C" })
            .exposeProperty("autoStart", "boolean", this.autoStart, {
                label: "Auto Start",
                description: "Start emitting automatically"
            })
            .exposeProperty("loopEmitter", "boolean", this.loopEmitter, {
                label: "Loop Emitter",
                description: "Loop the particle system"
            });

        if (!this.loopEmitter) {
            styleHelper.exposeProperty("duration", "number", this.duration, {
                label: "Duration",
                min: 0.1, max: 60, step: 0.1,
                description: "Duration for non-looping systems"
            });
        }

        styleHelper.endGroup();
    }

    refreshInspector() {
        setTimeout(() => {
            if (window.editor && window.editor.inspector) {
                window.editor.inspector.refreshModuleUI(this);
            }
        }, 10);
    }

    async handleImageDrop(dataTransfer) {
        try {
            // Check if we have files directly dropped
            if (dataTransfer.files && dataTransfer.files.length > 0) {
                const file = dataTransfer.files[0];

                if (!file.type.startsWith('image/')) {
                    console.warn('Dropped file is not an image:', file.type);
                    return false;
                }

                const fileBrowser = window.editor?.fileBrowser || window.fileBrowser;
                if (!fileBrowser) {
                    console.warn('FileBrowser not available for image upload');
                    return false;
                }

                await fileBrowser.handleFileUpload(file);
                const path = `${fileBrowser.currentPath}/${file.name}`;
                await this.setParticleImage(path);

                console.log('Successfully set particle image to:', path);
                return true;
            }

            // Check for JSON data (internal drag & drop)
            const jsonData = dataTransfer.getData('application/json');
            if (jsonData) {
                try {
                    const items = JSON.parse(jsonData);
                    if (items && items.length > 0) {
                        const path = items[0].path;
                        if (path && this.isImagePath(path)) {
                            await this.setParticleImage(path);
                            console.log('Successfully set particle image to:', path);
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

    isImagePath(path) {
        if (!path) return false;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        const lowercasePath = path.toLowerCase();
        return imageExtensions.some(ext => lowercasePath.endsWith(ext));
    }

    async setParticleImage(path) {
        console.log('setParticleImage called with path:', path);

        if (path === null || path === undefined) {
            this.imageAsset = null;
            this._image = null;
            this._isImageLoaded = false;
            return;
        }

        if (this.imageAsset && this.imageAsset.path === path) {
            console.log('Particle image path unchanged, skipping');
            return;
        }

        try {
            if (window.AssetReference) {
                this.imageAsset = new window.AssetReference(path, 'image');
            } else {
                this.imageAsset = {
                    path: path,
                    type: 'image',
                    embedded: false,
                    load: () => this.fallbackLoadImage(path)
                };
            }

            // Add to AssetManager cache for export
            if (window.assetManager && typeof window.assetManager.addAssetToCache === 'function') {
                // You may want to pass the image data URL if available
                let imageContent = null;
                if (this._image && this._image.src && this._image.src.startsWith('data:image')) {
                    imageContent = this._image.src;
                }
                window.assetManager.addAssetToCache(path, imageContent || path, 'image/png');
            }

            console.log('Created imageAsset:', this.imageAsset);

            const image = await this.loadImage();
            if (image) {
                console.log('Particle image loaded successfully:', image.src);
            } else {
                console.warn('Failed to load particle image');
            }

            if (window.editor) {
                window.editor.refreshCanvas();
            }

        } catch (error) {
            console.error("Error setting particle image:", error);
        }
    }

    async loadImage() {
        if (this.imageAsset && this.imageAsset.embedded && !this.imageAsset.path) {
            console.log('Skipping path-based loading for embedded image data - already loaded');
            return this._image;
        }

        if (!this.imageAsset || !this.imageAsset.path) {
            if (!this._isImageLoaded && (!this.imageAsset || !this.imageAsset.embedded)) {
                console.warn('No particle image asset path to load');
            }
            return null;
        }

        try {
            console.log('Loading particle image:', this.imageAsset.path);

            if (this.imageAsset.embedded && this.imageAsset.load) {
                this._image = await this.imageAsset.load();
                console.log('Particle image loaded from embedded data successfully');
                return this._image;
            }

            // Try FileBrowser first (editor mode)
            if (window.editor && window.editor.fileBrowser) {
                try {
                    this._image = await this.loadImageFromFileBrowser(this.imageAsset.path);
                    console.log('Particle image loaded via FileBrowser successfully');
                    this._imageWidth = this._image.naturalWidth || this._image.width;
                    this._imageHeight = this._image.naturalHeight || this._image.height;
                    this._isImageLoaded = true;
                    return this._image;
                } catch (fileBrowserError) {
                    console.warn('FileBrowser failed, trying asset manager:', fileBrowserError.message);
                }
            }

            // Try asset manager (runtime mode)
            if (window.assetManager) {
                try {
                    const loadedImage = await window.assetManager.loadAsset(this.imageAsset.path);
                    console.log('Particle image loaded via asset manager successfully');

                    // Ensure we have a valid HTMLImageElement
                    if (loadedImage && loadedImage instanceof HTMLImageElement) {
                        this._image = loadedImage;
                        this._imageWidth = loadedImage.naturalWidth || loadedImage.width;
                        this._imageHeight = loadedImage.naturalHeight || loadedImage.height;
                        this._isImageLoaded = true;

                        // Validate the image is actually loaded
                        if (this._image.complete && this._imageWidth > 0 && this._imageHeight > 0) {
                            console.log('Particle image validated successfully, dimensions:', this._imageWidth, 'x', this._imageHeight);
                            return this._image;
                        } else {
                            console.warn('Asset manager returned invalid image, trying fallback');
                            throw new Error('Invalid image from asset manager');
                        }
                    } else {
                        console.warn('Asset manager did not return a valid HTMLImageElement');
                        throw new Error('Invalid image type from asset manager');
                    }
                } catch (assetManagerError) {
                    console.warn('Asset manager failed, trying fallback:', assetManagerError.message);
                }
            }

            // Fallback to direct loading
            console.log('Using fallback loading method for particle image');
            this._image = await this.fallbackLoadImage(this.imageAsset.path);
            console.log('Particle image loaded successfully via fallback:', this.imageAsset.path);
            return this._image;

        } catch (error) {
            console.error('Error loading particle image:', error);
            this._image = null;
            this._isImageLoaded = false;
            return null;
        }
    }

    /**
 * Force reload the particle image
 */
    async forceReloadImage() {
        console.log('Force reloading particle image...');
        this._image = null;
        this._isImageLoaded = false;
        this._imageWidth = 0;
        this._imageHeight = 0;

        if (this.imageAsset && this.imageAsset.path) {
            try {
                const image = await this.loadImage();
                if (image) {
                    console.log('Force reload successful');
                    if (window.editor) {
                        window.editor.refreshCanvas();
                    }
                }
            } catch (error) {
                console.error('Force reload failed:', error);
            }
        }
    }

    async loadImageFromFileBrowser(path) {
        try {
            const fileBrowser = window.editor.fileBrowser;
            const content = await fileBrowser.readFile(path);
            if (!content) {
                throw new Error(`Could not read file from FileBrowser: ${path}`);
            }

            if (typeof content === 'string' && content.startsWith('data:image')) {
                console.log('Loading particle image from data URL via FileBrowser');
                return this.loadImageFromDataURL(content);
            } else {
                throw new Error(`File content is not a valid image data URL: ${path}`);
            }
        } catch (error) {
            console.error('Error loading particle image from FileBrowser:', error);
            throw error;
        }
    }

    fallbackLoadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            if (!path) {
                reject(new Error('No image path provided'));
                return;
            }

            img.onload = () => {
                console.log('Particle image loaded successfully:', img.src);
                this._image = img;
                this._imageWidth = img.naturalWidth || img.width;
                this._imageHeight = img.naturalHeight || img.height;
                this._isImageLoaded = true;
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('Error loading particle image:', path, error);
                reject(new Error(`Error loading particle image: ${path}`));
            };

            img.src = path;
        });
    }

    loadImageFromDataURL(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                console.log('Particle image loaded from data URL successfully');
                this._image = img;
                this._imageWidth = img.naturalWidth || img.width;
                this._imageHeight = img.naturalHeight || img.height;
                this._isImageLoaded = true;
                resolve(img);
            };

            img.onerror = (error) => {
                console.error('Error loading particle image from data URL:', error);
                reject(new Error('Failed to load particle image from data URL'));
            };

            img.src = dataUrl;
        });
    }

    async loadImageFromData(dataUrl) {
        return new Promise((resolve, reject) => {
            if (!dataUrl || typeof dataUrl !== 'string') {
                reject(new Error('Invalid data URL provided'));
                return;
            }

            const img = new Image();

            img.onload = () => {
                // Validate the loaded image
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    reject(new Error('Image loaded but has invalid dimensions'));
                    return;
                }

                this._image = img;
                this._imageWidth = img.naturalWidth;
                this._imageHeight = img.naturalHeight;
                this._isImageLoaded = true;
                console.log('Particle image loaded from data URL, dimensions:', this._imageWidth, 'x', this._imageHeight);

                // Trigger canvas refresh if in editor
                if (window.editor) {
                    window.editor.refreshCanvas();
                }

                resolve(img);
            };

            img.onerror = (error) => {
                console.error('Failed to load particle image from data URL:', error);
                this._image = null;
                this._isImageLoaded = false;
                reject(new Error('Failed to load image from data URL'));
            };

            // Set a timeout to prevent hanging
            setTimeout(() => {
                if (!this._isImageLoaded) {
                    reject(new Error('Image loading timeout'));
                }
            }, 10000);

            img.src = dataUrl;
        });
    }

    start() {
        if (this.autoStart) {
            this.startEmission();
        }

        // Load image if using image particles
        if (this.useImageParticles && !this._isImageLoaded) {
            this.loadImage();
        }
    }

    startEmission() {
        this.isEmitting = true;
        this.systemTimer = 0;
    }

    stopEmission() {
        this.isEmitting = false;
    }

    clearParticles() {
        // Return particles to pool if using object pooling
        if (this.useObjectPooling) {
            this.particlePool.push(...this.particles);
        }
        this.particles = [];
    }

    loop(deltaTime) {
        const startTime = performance.now();

        this.systemTimer += deltaTime;

        // Handle non-looping systems
        if (!this.loopEmitter && this.systemTimer >= this.duration) {
            this.isEmitting = false;
        }

        // Emit new particles
        if (this.isEmitting) {
            this.emissionTimer += deltaTime;
            const emissionInterval = 1.0 / this.emissionRate;

            while (this.emissionTimer >= emissionInterval && this.particles.length < this.maxParticles) {
                this.emitParticle();
                this.emissionTimer -= emissionInterval;
            }
        }

        // Update existing particles
        this.updateParticles(deltaTime);

        // Periodic culling for performance
        const now = performance.now();
        if (this.cullingEnabled && now - this.lastCullTime > this.cullInterval) {
            this.cullParticles();
            this.lastCullTime = now;
        }

        // Prepare batched rendering if enabled
        if (this.enableBatching) {
            this.prepareBatchedParticles();
        }

        const endTime = performance.now();
        const frameTime = endTime - startTime;

        // Performance monitoring
        if (frameTime > 5) {
            console.warn(`ParticleSystem: Slow frame detected: ${frameTime.toFixed(2)}ms with ${this.particles.length} particles`);
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            this.updateParticle(particle, deltaTime);

            // Remove dead particles
            if (particle.life <= 0) {
                const deadParticle = this.particles.splice(i, 1)[0];

                // Return to pool if using object pooling
                if (this.useObjectPooling) {
                    this.resetParticle(deadParticle);
                    this.particlePool.push(deadParticle);
                }
            }
        }
    }

    cullParticles() {
        if (!window.engine || !window.engine.viewport) return;

        const viewport = window.engine.viewport;
        const margin = this.cullingMargin;
        const viewBounds = {
            left: viewport.x - viewport.width / 2 - margin,
            right: viewport.x + viewport.width / 2 + margin,
            top: viewport.y - viewport.height / 2 - margin,
            bottom: viewport.y + viewport.height / 2 + margin
        };

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            if (particle.x < viewBounds.left || particle.x > viewBounds.right ||
                particle.y < viewBounds.top || particle.y > viewBounds.bottom) {

                const culledParticle = this.particles.splice(i, 1)[0];

                if (this.useObjectPooling) {
                    this.resetParticle(culledParticle);
                    this.particlePool.push(culledParticle);
                }
            }
        }
    }

    prepareBatchedParticles() {
        this.batchedParticles.clear();

        for (const particle of this.particles) {
            const batchKey = this.getBatchKey(particle);

            if (!this.batchedParticles.has(batchKey)) {
                this.batchedParticles.set(batchKey, []);
            }

            const batch = this.batchedParticles.get(batchKey);
            if (batch.length < this.maxBatchSize) {
                batch.push(particle);
            }
        }
    }

    getBatchKey(particle) {
        // Group particles with similar properties for batch rendering
        const lifeRatio = particle.life / particle.maxLife;
        const lifeBucket = Math.floor(lifeRatio * 10); // 10 life buckets

        return `${this.particleShape}_${lifeBucket}_${Math.floor(particle.size / 5)}`;
    }

    emitParticle() {
        let particle;

        // Use object pooling if enabled
        if (this.useObjectPooling && this.particlePool.length > 0) {
            particle = this.particlePool.pop();
            this.resetParticle(particle);
        } else {
            particle = this.createParticle();
        }

        // Set emission position based on shape
        switch (this.emissionShape) {
            case "circle":
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * this.emissionRadius;
                particle.x = Math.cos(angle) * radius;
                particle.y = Math.sin(angle) * radius;
                break;

            case "rectangle":
                particle.x = (Math.random() - 0.5) * this.emissionWidth;
                particle.y = (Math.random() - 0.5) * this.emissionHeight;
                break;

            case "point":
            default:
                particle.x = 0;
                particle.y = 0;
                break;
        }

        this.particles.push(particle);
    }

    createParticle() {
        return {
            x: 0,
            y: 0,
            vx: this.startVelocityX + (Math.random() - 0.5) * this.velocityVariationX,
            vy: this.startVelocityY + (Math.random() - 0.5) * this.velocityVariationY,
            life: this.particleLifetime + (Math.random() - 0.5) * this.particleLifetimeVariation,
            maxLife: this.particleLifetime + (Math.random() - 0.5) * this.particleLifetimeVariation,
            size: this.startSize + (Math.random() - 0.5) * this.sizeVariation,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 5,
            // Additional properties for advanced features
            initialSize: this.startSize + (Math.random() - 0.5) * this.sizeVariation,
            targetSize: this.endSize,
            birthTime: performance.now()
        };
    }

    resetParticle(particle) {
        particle.x = 0;
        particle.y = 0;
        particle.vx = this.startVelocityX + (Math.random() - 0.5) * this.velocityVariationX;
        particle.vy = this.startVelocityY + (Math.random() - 0.5) * this.velocityVariationY;
        particle.life = this.particleLifetime + (Math.random() - 0.5) * this.particleLifetimeVariation;
        particle.maxLife = particle.life;
        particle.size = this.startSize + (Math.random() - 0.5) * this.sizeVariation;
        particle.rotation = Math.random() * Math.PI * 2;
        particle.rotationSpeed = (Math.random() - 0.5) * 5;
        particle.initialSize = particle.size;
        particle.targetSize = this.endSize;
        particle.birthTime = performance.now();
    }

    updateParticle(particle, deltaTime) {
        // Update life
        particle.life -= deltaTime;

        // Apply gravity relative to GameObject's rotation
        if (this.gravity !== 0) {
            const gameObjectAngle = (this.gameObject?.angle || 0) * Math.PI / 180;

            // Calculate gravity direction relative to GameObject rotation
            const gravityX = Math.sin(gameObjectAngle) * this.gravity * deltaTime;
            const gravityY = Math.cos(gameObjectAngle) * this.gravity * deltaTime;

            particle.vx += gravityX;
            particle.vy += gravityY;
        }

        // Apply drag
        particle.vx *= this.drag;
        particle.vy *= this.drag;

        // Update position
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;

        // Update rotation
        particle.rotation += particle.rotationSpeed * deltaTime;

        // Update size interpolation
        const lifeRatio = particle.life / particle.maxLife;
        const invLifeRatio = 1 - lifeRatio;
        particle.size = particle.initialSize * lifeRatio + particle.targetSize * invLifeRatio;
    }

    draw(ctx) {
        if (!this.enabled || this.particles.length === 0) return;

        // Additional safety check for canvas context
        if (!ctx || typeof ctx.save !== 'function') {
            console.warn('Invalid canvas context provided to ParticleSystem.draw');
            return;
        }

        ctx.save();

        // Set blend mode
        this.setBlendMode(ctx);

        if (this.enableBatching) {
            this.drawBatchedParticles(ctx);
        } else {
            this.drawIndividualParticles(ctx);
        }

        ctx.restore();
    }

    setBlendMode(ctx) {
        switch (this.blendMode) {
            case "additive":
                ctx.globalCompositeOperation = "lighter";
                break;
            case "multiply":
                ctx.globalCompositeOperation = "multiply";
                break;
            case "screen":
                ctx.globalCompositeOperation = "screen";
                break;
            case "overlay":
                ctx.globalCompositeOperation = "overlay";
                break;
            case "normal":
            default:
                ctx.globalCompositeOperation = "source-over";
                break;
        }
    }

    drawBatchedParticles(ctx) {
        for (const [batchKey, particles] of this.batchedParticles) {
            if (particles.length === 0) continue;

            // Set common properties for the batch
            this.setBatchProperties(ctx, particles[0]);

            // Draw all particles in the batch
            for (const particle of particles) {
                this.drawSingleParticle(ctx, particle);
            }
        }
    }

    drawIndividualParticles(ctx) {
        for (const particle of this.particles) {
            this.drawParticle(ctx, particle);
        }
    }

    setBatchProperties(ctx, sampleParticle) {
        const lifeRatio = sampleParticle.life / sampleParticle.maxLife;
        const invLifeRatio = 1 - lifeRatio;

        // Interpolate alpha
        const currentAlpha = this.startAlpha * lifeRatio + this.endAlpha * invLifeRatio;
        ctx.globalAlpha = currentAlpha;

        // Set fill style for shape-based particles
        if (this.particleShape !== "image") {
            const startRGB = this.hexToRgb(this.startColor);
            const endRGB = this.hexToRgb(this.endColor);
            const currentR = Math.round(startRGB.r * lifeRatio + endRGB.r * invLifeRatio);
            const currentG = Math.round(startRGB.g * lifeRatio + endRGB.g * invLifeRatio);
            const currentB = Math.round(startRGB.b * lifeRatio + endRGB.b * invLifeRatio);

            const color = `rgb(${currentR}, ${currentG}, ${currentB})`;
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
    }

    drawParticle(ctx, particle) {
        const lifeRatio = particle.life / particle.maxLife;
        const invLifeRatio = 1 - lifeRatio;

        // Interpolate size
        const currentSize = particle.size;

        // Interpolate colors
        const startRGB = this.hexToRgb(this.startColor);
        const endRGB = this.hexToRgb(this.endColor);
        const currentR = Math.round(startRGB.r * lifeRatio + endRGB.r * invLifeRatio);
        const currentG = Math.round(startRGB.g * lifeRatio + endRGB.g * invLifeRatio);
        const currentB = Math.round(startRGB.b * lifeRatio + endRGB.b * invLifeRatio);

        // Interpolate alpha
        const currentAlpha = this.startAlpha * lifeRatio + this.endAlpha * invLifeRatio;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = currentAlpha;

        if (this.particleShape === "image" && this.useImageParticles) {
            this.drawImageParticle(ctx, particle, currentSize);
        } else {
            this.drawShapeParticle(ctx, particle, currentSize, currentR, currentG, currentB);
        }

        ctx.restore();
    }

    drawSingleParticle(ctx, particle) {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        if (this.particleShape === "image" && this.useImageParticles) {
            this.drawImageParticle(ctx, particle, particle.size);
        } else {
            this.drawShapeParticleWithCurrentStyle(ctx, particle, particle.size);
        }

        ctx.restore();
    }

    drawImageParticle(ctx, particle, currentSize) {
        // Enhanced validation - check if image is actually a valid HTMLImageElement
        if (!this._image || !this._isImageLoaded ||
            !(this._image instanceof HTMLImageElement) ||
            !this._image.complete ||
            this._image.naturalWidth === 0) {
            // Fallback to circle if image not loaded or invalid
            this.drawFallbackParticle(ctx, currentSize);
            return;
        }

        ctx.save();

        // Apply image transformations
        if (this.imageFlipX || this.imageFlipY) {
            ctx.scale(this.imageFlipX ? -1 : 1, this.imageFlipY ? -1 : 1);
        }

        if (this.imageRotation !== 0) {
            ctx.rotate(this.imageRotation * Math.PI / 180);
        }

        // Calculate draw size based on scale mode
        let drawWidth, drawHeight;

        switch (this.imageScaleMode) {
            case "fit":
                const imageRatio = this._imageWidth / this._imageHeight;
                if (imageRatio > 1) {
                    drawWidth = currentSize;
                    drawHeight = currentSize / imageRatio;
                } else {
                    drawWidth = currentSize * imageRatio;
                    drawHeight = currentSize;
                }
                break;

            case "maintain":
                drawWidth = this._imageWidth;
                drawHeight = this._imageHeight;
                break;

            case "stretch":
            default:
                drawWidth = currentSize;
                drawHeight = currentSize;
                break;
        }

        // Apply alpha gradient if enabled
        if (this.useAlphaGradient) {
            this.applyAlphaGradient(ctx, drawWidth, drawHeight);
        }

        try {
            // Draw the image with additional error handling
            ctx.drawImage(
                this._image,
                -drawWidth / 2, -drawHeight / 2,
                drawWidth, drawHeight
            );
        } catch (error) {
            console.warn('Error drawing particle image, falling back to shape:', error);
            this.drawFallbackParticle(ctx, currentSize);
        }

        ctx.restore();
    }

    drawShapeParticle(ctx, particle, currentSize, r, g, b) {
        const color = `rgb(${r}, ${g}, ${b})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        if (this.useAlphaGradient) {
            this.drawShapeWithAlphaGradient(ctx, currentSize, color);
        } else {
            this.drawBasicShape(ctx, currentSize);
        }
    }

    drawShapeParticleWithCurrentStyle(ctx, particle, currentSize) {
        if (this.useAlphaGradient) {
            this.drawShapeWithAlphaGradient(ctx, currentSize, ctx.fillStyle);
        } else {
            this.drawBasicShape(ctx, currentSize);
        }
    }

    drawBasicShape(ctx, currentSize) {
        switch (this.particleShape) {
            case "circle":
                ctx.beginPath();
                ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "square":
                ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
                break;

            case "line":
                ctx.lineWidth = Math.max(1, currentSize / 4);
                ctx.beginPath();
                ctx.moveTo(-currentSize / 2, 0);
                ctx.lineTo(currentSize / 2, 0);
                ctx.stroke();
                break;
        }
    }

    drawShapeWithAlphaGradient(ctx, currentSize, color) {
        let gradient;

        if (this.gradientType === "radial") {
            gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize / 2);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.7, color.replace('rgb', 'rgba').replace(')', ', 0.5)'));
            gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));
        } else {
            // Linear gradient
            const angle = this.gradientDirection * Math.PI / 180;
            const radius = currentSize / 2;
            const x1 = Math.cos(angle + Math.PI) * radius;
            const y1 = Math.sin(angle + Math.PI) * radius;
            const x2 = Math.cos(angle) * radius;
            const y2 = Math.sin(angle) * radius;

            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0)'));
            gradient.addColorStop(0.3, color.replace('rgb', 'rgba').replace(')', ', 0.5)'));
            gradient.addColorStop(0.7, color);
            gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));
        }

        ctx.fillStyle = gradient;

        switch (this.particleShape) {
            case "circle":
                ctx.beginPath();
                ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case "square":
                ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
                break;

            case "line":
                // For lines, use stroke with gradient
                ctx.lineWidth = Math.max(1, currentSize / 4);
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(-currentSize / 2, 0);
                ctx.lineTo(currentSize / 2, 0);
                ctx.stroke();
                break;
        }
    }

    applyAlphaGradient(ctx, width, height) {
        let gradient;

        if (this.gradientType === "radial") {
            const radius = Math.max(width, height) / 2;
            gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
            gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.5)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        } else {
            // Linear gradient
            const angle = this.gradientDirection * Math.PI / 180;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            const x1 = Math.cos(angle + Math.PI) * halfWidth;
            const y1 = Math.sin(angle + Math.PI) * halfHeight;
            const x2 = Math.cos(angle) * halfWidth;
            const y2 = Math.sin(angle) * halfHeight;

            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
            gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.5)");
            gradient.addColorStop(0.7, "rgba(255, 255, 255, 1)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        }

        // Create a mask using the gradient
        ctx.save();
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = gradient;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
    }

    drawFallbackParticle(ctx, currentSize) {
        // Use the current particle color if available
        const lifeRatio = 1; // Assume full life for fallback
        const startRGB = this.hexToRgb(this.startColor);
        const endRGB = this.hexToRgb(this.endColor);
        const currentR = Math.round(startRGB.r);
        const currentG = Math.round(startRGB.g);
        const currentB = Math.round(startRGB.b);

        ctx.fillStyle = `rgb(${currentR}, ${currentG}, ${currentB})`;
        ctx.beginPath();
        ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    // Public API methods
    burst(count = 10) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            this.emitParticle();
        }
    }

    getParticleCount() {
        return this.particles.length;
    }

    getPoolSize() {
        return this.particlePool.length;
    }

    clone(newGameObject = null) {
        // Clone all base properties
        const cloned = super.clone(newGameObject);

        // Deep copy image asset and embedded image data for ParticleSystem
        if (this._image && this._isImageLoaded) {
            cloned._image = this._image;
            cloned._isImageLoaded = true;
            cloned._imageWidth = this._imageWidth;
            cloned._imageHeight = this._imageHeight;

            // If image is embedded, copy the data URL and asset reference
            if (this.imageAsset && this.imageAsset.embedded) {
                const imageSrc = this._image.src;
                cloned.imageAsset = {
                    path: null,
                    type: 'image',
                    embedded: true,
                    load: () => Promise.resolve(cloned._image)
                };
                // Optionally, copy the src if needed for serialization
                cloned._image.src = imageSrc;
            } else if (this.imageAsset) {
                // Copy asset reference for non-embedded images
                cloned.imageAsset = { ...this.imageAsset };
            }
        } else if (this.imageAsset) {
            // If only asset reference exists, copy it
            cloned.imageAsset = { ...this.imageAsset };
        }

        return cloned;
    }

    toJSON() {
        const json = super.toJSON();

        // Emission properties
        json.emissionRate = this.emissionRate;
        json.maxParticles = this.maxParticles;
        json.emissionShape = this.emissionShape;
        json.emissionRadius = this.emissionRadius;
        json.emissionWidth = this.emissionWidth;
        json.emissionHeight = this.emissionHeight;

        // Particle properties
        json.particleLifetime = this.particleLifetime;
        json.particleLifetimeVariation = this.particleLifetimeVariation;
        json.startSize = this.startSize;
        json.endSize = this.endSize;
        json.sizeVariation = this.sizeVariation;
        json.startColor = this.startColor;
        json.endColor = this.endColor;
        json.startAlpha = this.startAlpha;
        json.endAlpha = this.endAlpha;

        // Movement properties
        json.startVelocityX = this.startVelocityX;
        json.startVelocityY = this.startVelocityY;
        json.velocityVariationX = this.velocityVariationX;
        json.velocityVariationY = this.velocityVariationY;
        json.gravity = this.gravity;
        json.drag = this.drag;

        // Visual properties
        json.particleShape = this.particleShape;
        json.blendMode = this.blendMode;
        json.useAlphaGradient = this.useAlphaGradient;
        json.gradientType = this.gradientType;
        json.gradientDirection = this.gradientDirection;

        // Image properties
        json.useImageParticles = this.useImageParticles;
        json.imageAsset = this.imageAsset ? (typeof this.imageAsset.toJSON === 'function' ? this.imageAsset.toJSON() : { path: this.imageAsset.path }) : null;
        json.imageScaleMode = this.imageScaleMode;
        json.imageRotation = this.imageRotation;
        json.imageFlipX = this.imageFlipX;
        json.imageFlipY = this.imageFlipY;

        // Control properties
        json.autoStart = this.autoStart;
        json.loopEmitter = this.loopEmitter;
        json.duration = this.duration;

        // Performance properties
        json.useObjectPooling = this.useObjectPooling;
        json.enableBatching = this.enableBatching;
        json.cullingEnabled = this.cullingEnabled;

        // Save image data if available
        if (this._image && this._image.src && this._image.src.startsWith('data:image')) {
            const imageKey = this.imageAsset?.path || `particle_${Date.now()}`;
            if (window.assetManager && window.assetManager.cache) {
                if (!window.assetManager.cache[imageKey]) {
                    window.assetManager.cache[imageKey] = this._image.src;
                    console.log('Stored particle image in AssetManager cache:', imageKey);
                }
                json.imageData = imageKey;
            } else {
                // Fallback: store raw data directly
                json.imageDataRaw = this._image.src;
            }
        } else {
            json.imageData = null;
            json.imageDataRaw = null;
        }
        json.useEmbeddedData = true;

        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        // Emission properties
        if (json.emissionRate !== undefined) this.emissionRate = json.emissionRate;
        if (json.maxParticles !== undefined) this.maxParticles = json.maxParticles;
        if (json.emissionShape !== undefined) this.emissionShape = json.emissionShape;
        if (json.emissionRadius !== undefined) this.emissionRadius = json.emissionRadius;
        if (json.emissionWidth !== undefined) this.emissionWidth = json.emissionWidth;
        if (json.emissionHeight !== undefined) this.emissionHeight = json.emissionHeight;

        // Particle properties
        if (json.particleLifetime !== undefined) this.particleLifetime = json.particleLifetime;
        if (json.particleLifetimeVariation !== undefined) this.particleLifetimeVariation = json.particleLifetimeVariation;
        if (json.startSize !== undefined) this.startSize = json.startSize;
        if (json.endSize !== undefined) this.endSize = json.endSize;
        if (json.sizeVariation !== undefined) this.sizeVariation = json.sizeVariation;
        if (json.startColor !== undefined) this.startColor = json.startColor;
        if (json.endColor !== undefined) this.endColor = json.endColor;
        if (json.startAlpha !== undefined) this.startAlpha = json.startAlpha;
        if (json.endAlpha !== undefined) this.endAlpha = json.endAlpha;

        // Movement properties
        if (json.startVelocityX !== undefined) this.startVelocityX = json.startVelocityX;
        if (json.startVelocityY !== undefined) this.startVelocityY = json.startVelocityY;
        if (json.velocityVariationX !== undefined) this.velocityVariationX = json.velocityVariationX;
        if (json.velocityVariationY !== undefined) this.velocityVariationY = json.velocityVariationY;
        if (json.gravity !== undefined) this.gravity = json.gravity;
        if (json.drag !== undefined) this.drag = json.drag;

        // Visual properties
        if (json.particleShape !== undefined) {
            this.particleShape = json.particleShape;
            this.useImageParticles = (json.particleShape === "image");
        }
        if (json.blendMode !== undefined) this.blendMode = json.blendMode;
        if (json.useAlphaGradient !== undefined) this.useAlphaGradient = json.useAlphaGradient;
        if (json.gradientType !== undefined) this.gradientType = json.gradientType;
        if (json.gradientDirection !== undefined) this.gradientDirection = json.gradientDirection;

        // Image properties
        if (json.useImageParticles !== undefined) this.useImageParticles = json.useImageParticles;
        if (json.imageScaleMode !== undefined) this.imageScaleMode = json.imageScaleMode;
        if (json.imageRotation !== undefined) this.imageRotation = json.imageRotation;
        if (json.imageFlipX !== undefined) this.imageFlipX = json.imageFlipX;
        if (json.imageFlipY !== undefined) this.imageFlipY = json.imageFlipY;

        // Control properties
        if (json.autoStart !== undefined) this.autoStart = json.autoStart;
        if (json.loopEmitter !== undefined) this.loopEmitter = json.loopEmitter;
        if (json.duration !== undefined) this.duration = json.duration;

        // Performance properties
        if (json.useObjectPooling !== undefined) this.useObjectPooling = json.useObjectPooling;
        if (json.enableBatching !== undefined) this.enableBatching = json.enableBatching;
        if (json.cullingEnabled !== undefined) this.cullingEnabled = json.cullingEnabled;

        // Handle image loading
        const hasExistingImage = this._image && this._isImageLoaded;

        if (json.useEmbeddedData && json.imageData && window.assetManager && window.assetManager.cache) {
            const imageData = window.assetManager.cache[json.imageData];
            if (imageData) {
                this.loadImageFromData(imageData).then(() => {
                    console.log('Loaded particle image from AssetManager cache');
                }).catch(error => {
                    console.error('Failed to load image from cache:', error);
                });
                this.imageAsset = {
                    path: null,
                    type: 'image',
                    embedded: true,
                    load: () => this.loadImageFromData(imageData)
                };
            }
        } else if (json.imageDataRaw) {
            this.loadImageFromData(json.imageDataRaw).then(() => {
                console.log('Loaded particle image from raw data');
            }).catch(error => {
                console.error('Failed to load image from raw data:', error);
            });
            this.imageAsset = {
                path: null,
                type: 'image',
                embedded: true,
                load: () => this.loadImageFromData(json.imageDataRaw)
            };
        } else if (json.imageAsset && json.imageAsset.path) {
            // Fallback: restore imageAsset from path if no embedded data
            if (window.AssetReference) {
                this.imageAsset = new window.AssetReference(json.imageAsset.path, 'image');
            } else {
                this.imageAsset = {
                    path: json.imageAsset.path,
                    type: 'image',
                    embedded: false,
                    load: () => this.fallbackLoadImage(json.imageAsset.path)
                };
            }
            this._image = null;
            this._isImageLoaded = false;
            this.loadImage();
        } else {
            // No valid image data found
            if (!hasExistingImage) {
                this.imageAsset = {
                    path: null,
                    type: 'image',
                    embedded: false,
                    load: () => Promise.resolve(null)
                };
                this._image = null;
                this._isImageLoaded = false;
            }
        }
    }
}

window.ParticleSystem = ParticleSystem;