/**
 * Camera3DRasterizer - Module for 3D perspective cameras
 * 
 * This module provides 3D camera functionality with multiple rendering methods.
 * Supports: Rasterization Algorithm.
 * 
 * Axis orientation:
 *  - X axis: Forward/Backward
 *  - Y axis: Left/Right
 *  - Z axis: Up/Down
 */
class Camera3DRasterizer extends Module {
    static namespace = "3D";

    constructor() {
        super("Camera3DRasterizer");

        this._position = new Vector3(0, 0, 0);
        this._rotation = new Vector3(0, 0, 0);
        this._fieldOfView = 60;
        this._nearPlane = 0.1;
        this._farPlane = 5000;
        this._isActive = true;
        this._backgroundColor = "#000000";
        this._renderTextureWidth = 320;
        this._renderTextureHeight = 240;
        this._renderTextureSmoothing = false;
        this._renderTexture = null;
        this._renderTextureCtx = null;
        this.viewportWidth = 800;
        this.viewportHeight = 600;
        this.drawGizmoInRuntime = false;
        this._renderingMethod = "raster";
        this._enableBackfaceCulling = true;
        this._zBuffer = null;
        this._imageData = null;

        // Lighting properties
        this._lightDirection = new Vector3(1, -1, -1); // Default light direction
        this._lightColor = "#ffffff";
        this._lightIntensity = 1.0;
        this._ambientIntensity = 0.3;

        // Dynamic lighting properties
        this._dynamicLights = []; // Array of Light3D modules
        this._maxLights = 4; // Maximum number of lights to process
        this._lightFindDistance = 500; // Distance to search for lights
        this._useDynamicLighting = true; // Enable/disable dynamic lights

        // Background properties
        this._skyColor = "#87CEEB";  // Sky blue
        this._floorColor = "#95d5f3"; // Brown
        this._skyColorHorizon = "#da846aff"; // Sky at horizon (default same as sky)
        this._floorColorHorizon = "#1a2c46"; // Floor at horizon (darker brown)
        this._backgroundType = "skybox"; // "skybox", "transparent", "solid"

        // Cloud properties
        this._cloudsEnabled = true;
        this._cloudSpeed = 2.5; // Speed multiplier for cloud movement
        this._cloudDensity = 0.7; // 0-1, how much cloud coverage
        this._cloudScale = 250; // Size of cloud patterns (larger = bigger clouds)
        this._cloudSoftness = 0.8; // 0-1, edge softness
        this._cloudHeight = 0.2; // 0-1, where clouds appear (0=horizon, 1=zenith)
        this._cloudThickness = 0.8; // 0-1, vertical extent of cloud layer
        this._cloudBrightness = 0.9; // Cloud color brightness multiplier
        this._cloudTime = 0; // Animation time tracker
        this._cloudNoiseCache = null; // Cache for performance
        this._cloudResolution = 0.3; // 1.0 = full res, 0.5 = half res, etc.

        // Water animation properties
        this._waterEnabled = true;
        this._waterSpeed = 2.0; // Speed multiplier for wave animation
        this._waterWaveHeight = 6; // Height of wave pattern in pixels
        this._waterTime = 0; // Animation time tracker

        // Hills/Mountains properties
        this._hillsEnabled = true;
        this._hillsSeed = 12345; // Seed for procedural generation
        this._hillsMinHeight = 0.1; // 0-1, minimum height relative to horizon
        this._hillsMaxHeight = 0.4; // 0-1, maximum height relative to horizon
        this._hillsFrequency = 0.5; // How often hills appear (0-1)
        this._hillsRoughness = 0.6; // 0-1, how jagged the hills are
        this._hillsBaseColor = "#597561ff"; // Dark green base
        this._hillsTopColor = "#4ba152ff"; // Brown/tan peaks
        this._hillsUseFogColor = false; // Blend with fog color at distance
        this._hillsFogBlend = 0.7; // 0-1, how much fog affects hills

        // Water reflection properties
        this._waterReflectionEnabled = true; // Show hills reflected in water
        this._waterReflectionOpacity = 0.9; // 0-1, reflection visibility
        this._waterReflectionDistortion = 0.55; // 0-1, wave distortion on reflection

        // Sun properties (Sun is always in light direction and colored as light color)
        this._showSun = true;
        this._sunSize = 30; // Radius in pixels
        this._sunGlowSize = 60; // Glow radius in pixels

        // Lens flare properties
        this._lensFlareEnabled = true;
        this._lensFlareIntensity = 0.8; // 0-1 intensity multiplier
        this._lensFlareCount = 5; // Number of flare elements
        this._lensFlareSpacing = 0.25; // Distance between flares (0-1, screen space)
        this._lensFlareSize = 32; // Base size of flare elements
        this._lensFlareColorShift = true; // Apply chromatic aberration to flares

        // Specular properties
        this._specularEnabled = true;
        this._specularBleedingEnabled = false;
        this._specularPerMesh = false;
        this._specularFullFace = true;

        // Specular bloom properties
        this._specularBloomEnabled = true;
        this._specularBloomIntensity = 0.5;
        this._specularBloomRadius = 2.5; // Multiplier for base radius
        this._specularBloomThreshold = 0.3; // Minimum specular intensity to trigger bloom

        // Emissive properties
        this._emissiveIntensity = 1.0; // Emissive color brightness multiplier

        // Fog properties
        this._fogEnabled = false;
        this._fogColor = "#a0a0a0"; // Gray fog
        this._fogStart = 100; // Distance where fog starts
        this._fogEnd = 500; // Distance where fog is fully opaque
        this._fogDensity = 1.0; // Fog density multiplier (0-1)

        // Debug properties
        this._showDebugInfo = false;
        this._debugStats = {
            totalFaces: 0,
            renderedTriangles: 0,
            culledFaces: 0,
            clippedFaces: 0,
            specularHighlights: 0,
            renderTime: 0
        };

        this.exposeProperty("position", "vector3", this._position, {
            onChange: (val) => this._position = val
        });
        this.exposeProperty("rotation", "vector3", this._rotation, {
            onChange: (val) => this._rotation = val
        });
        this.exposeProperty("fieldOfView", "number", 60, {
            min: 1, max: 179, onChange: (val) => this._fieldOfView = val
        });
        this.exposeProperty("nearPlane", "number", 0.1, {
            min: 0.01, max: 10, step: 0.01, onChange: (val) => this._nearPlane = val
        });
        this.exposeProperty("farPlane", "number", 1000, {
            min: 10, max: 10000, step: 1, onChange: (val) => this._farPlane = val
        });
        /*this.exposeProperty("isActive", "boolean", false, {
            onChange: (val) => {
                this._isActive = val;
                if (val) this.setAsActiveCamera();
            }
        });*/
        this.exposeProperty("backgroundColor", "color", "#000000", {
            onChange: (val) => this._backgroundColor = val
        });
        this.exposeProperty("drawGizmoInRuntime", "boolean", false, {
            onChange: (val) => this.drawGizmoInRuntime = val
        });
        this.exposeProperty("renderTextureWidth", "number", 512, {
            min: 64, max: 2048, step: 64,
            onChange: (val) => {
                this._renderTextureWidth = val;
                this.updateRenderTexture();
            }
        });
        this.exposeProperty("renderTextureHeight", "number", 512, {
            min: 64, max: 2048, step: 64,
            onChange: (val) => {
                this._renderTextureHeight = val;
                this.updateRenderTexture();
            }
        });
        this.exposeProperty("renderTextureSmoothing", "boolean", false, {
            onChange: (val) => this._renderTextureSmoothing = val
        });
        this.exposeProperty("renderingMethod", "dropdown", "raster", {
            options: ["raster"],
            onChange: (val) => this._renderingMethod = val
        });
        /*this.exposeProperty("enableBackfaceCulling", "boolean", true, {
            onChange: (val) => this._enableBackfaceCulling = val
        });*/

        this.exposeProperty("lightDirection", "vector3", this._lightDirection, {
            onChange: (val) => this._lightDirection = val
        });
        this.exposeProperty("lightColor", "color", "#ffffff", {
            onChange: (val) => this._lightColor = val
        });
        this.exposeProperty("lightIntensity", "number", 1.0, {
            min: 0, max: 2, step: 0.1, onChange: (val) => this._lightIntensity = val
        });
        this.exposeProperty("ambientIntensity", "number", 0.3, {
            min: 0, max: 1, step: 0.05, onChange: (val) => this._ambientIntensity = val
        });

        this.exposeProperty("maxLights", "number", this._maxLights, {
            min: 0,
            max: 16,
            step: 1,
            onChange: (val) => this._maxLights = val
        });

        this.exposeProperty("lightFindDistance", "number", this._lightFindDistance, {
            min: 50,
            max: 2000,
            step: 50,
            onChange: (val) => this._lightFindDistance = val
        });

        this.exposeProperty("useDynamicLighting", "boolean", this._useDynamicLighting, {
            onChange: (val) => this._useDynamicLighting = val
        });


        this.exposeProperty("backgroundType", "dropdown", "skybox", {
            options: ["skybox", "transparent", "solid"],
            onChange: (val) => this._backgroundType = val
        });
        this.exposeProperty("backgroundColor", "color", "#000000", {
            onChange: (val) => this._backgroundColor = val
        });
        this.exposeProperty("skyColor", "color", "#87CEEB", {
            onChange: (val) => this._skyColor = val
        });
        this.exposeProperty("skyColorHorizon", "color", "#87CEEB", {
            onChange: (val) => this._skyColorHorizon = val
        });
        this.exposeProperty("floorColor", "color", "#8B4513", {
            onChange: (val) => this._floorColor = val
        });
        this.exposeProperty("floorColorHorizon", "color", "#654321", {
            onChange: (val) => this._floorColorHorizon = val
        });

        this.exposeProperty("cloudsEnabled", "boolean", false, {
            onChange: (val) => this._cloudsEnabled = val
        });
        this.exposeProperty("cloudSpeed", "number", 0.5, {
            min: 0.1,
            max: 3.0,
            step: 0.1,
            onChange: (val) => this._cloudSpeed = val
        });
        this.exposeProperty("cloudDensity", "number", 0.4, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._cloudDensity = val
        });
        this.exposeProperty("cloudScale", "number", 150, {
            min: 50,
            max: 500,
            step: 10,
            onChange: (val) => this._cloudScale = val
        });
        this.exposeProperty("cloudSoftness", "number", 0.6, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._cloudSoftness = val
        });
        this.exposeProperty("cloudHeight", "number", 0.3, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._cloudHeight = val
        });
        this.exposeProperty("cloudThickness", "number", 0.4, {
            min: 0.1,
            max: 1,
            step: 0.05,
            onChange: (val) => this._cloudThickness = val
        });
        this.exposeProperty("cloudBrightness", "number", 1.0, {
            min: 0.5,
            max: 2.0,
            step: 0.1,
            onChange: (val) => this._cloudBrightness = val
        });
        this.exposeProperty("cloudResolution", "number", 1.0, {
            min: 0.25,
            max: 1.0,
            step: 0.05,
            onChange: (val) => this._cloudResolution = val
        });

        this.exposeProperty("waterEnabled", "boolean", false, {
            onChange: (val) => this._waterEnabled = val
        });
        this.exposeProperty("waterSpeed", "number", 1.0, {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            onChange: (val) => this._waterSpeed = val
        });
        this.exposeProperty("waterWaveHeight", "number", 10, {
            min: 1,
            max: 50,
            step: 1,
            onChange: (val) => this._waterWaveHeight = val
        });

        this.exposeProperty("hillsEnabled", "boolean", false, {
            onChange: (val) => this._hillsEnabled = val
        });
        this.exposeProperty("hillsSeed", "number", 12345, {
            min: 0,
            max: 999999,
            step: 1,
            onChange: (val) => {
                this._hillsSeed = val;
                this._hillsCache = null; // Clear cache when seed changes
            }
        });
        this.exposeProperty("hillsMinHeight", "number", 0.1, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => {
                this._hillsMinHeight = val;
                this._hillsCache = null;
            }
        });
        this.exposeProperty("hillsMaxHeight", "number", 0.4, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => {
                this._hillsMaxHeight = val;
                this._hillsCache = null;
            }
        });
        this.exposeProperty("hillsFrequency", "number", 0.5, {
            min: 0.1,
            max: 2.0,
            step: 0.1,
            onChange: (val) => {
                this._hillsFrequency = val;
                this._hillsCache = null;
            }
        });
        this.exposeProperty("hillsRoughness", "number", 0.6, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => {
                this._hillsRoughness = val;
                this._hillsCache = null;
            }
        });
        this.exposeProperty("hillsBaseColor", "color", "#2d5016", {
            onChange: (val) => this._hillsBaseColor = val
        });
        this.exposeProperty("hillsTopColor", "color", "#8b7355", {
            onChange: (val) => this._hillsTopColor = val
        });
        this.exposeProperty("hillsUseFogColor", "boolean", true, {
            onChange: (val) => this._hillsUseFogColor = val
        });
        this.exposeProperty("hillsFogBlend", "number", 0.7, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._hillsFogBlend = val
        });
        this.exposeProperty("waterReflectionEnabled", "boolean", true, {
            onChange: (val) => this._waterReflectionEnabled = val
        });
        this.exposeProperty("waterReflectionOpacity", "number", 0.3, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._waterReflectionOpacity = val
        });
        this.exposeProperty("waterReflectionDistortion", "number", 0.05, {
            min: 0,
            max: 0.5,
            step: 0.01,
            onChange: (val) => this._waterReflectionDistortion = val
        });

        this.exposeProperty("showSun", "boolean", true, {
            onChange: (val) => this._showSun = val
        });
        this.exposeProperty("sunSize", "number", 30, {
            min: 10,
            max: 100,
            step: 5,
            onChange: (val) => this._sunSize = val
        });
        this.exposeProperty("sunGlowSize", "number", 60, {
            min: 20,
            max: 200,
            step: 10,
            onChange: (val) => this._sunGlowSize = val
        });

        this.exposeProperty("lensFlareEnabled", "boolean", true, {
            onChange: (val) => this._lensFlareEnabled = val
        });
        this.exposeProperty("lensFlareIntensity", "number", 0.8, {
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (val) => this._lensFlareIntensity = val
        });
        this.exposeProperty("lensFlareCount", "number", 5, {
            min: 1,
            max: 10,
            step: 1,
            onChange: (val) => this._lensFlareCount = val
        });
        this.exposeProperty("lensFlareSpacing", "number", 0.15, {
            min: 0.05,
            max: 0.5,
            step: 0.05,
            onChange: (val) => this._lensFlareSpacing = val
        });
        this.exposeProperty("lensFlareSize", "number", 20, {
            min: 5,
            max: 50,
            step: 5,
            onChange: (val) => this._lensFlareSize = val
        });
        this.exposeProperty("lensFlareColorShift", "boolean", true, {
            onChange: (val) => this._lensFlareColorShift = val
        });

        this.exposeProperty("specularEnabled", "boolean", true, {
            onChange: (val) => this._specularEnabled = val
        });
        /*this.exposeProperty("specularBleedingEnabled", "boolean", true, {
            onChange: (val) => this._specularBleedingEnabled = val
        });*/
        /*this.exposeProperty("specularPerMesh", "boolean", false, {
            onChange: (val) => this._specularPerMesh = val
        });*/
        this.exposeProperty("specularFullFace", "boolean", false, {
            onChange: (val) => this._specularFullFace = val
        });

        this.exposeProperty("specularBloomEnabled", "boolean", false, {
            onChange: (val) => this._specularBloomEnabled = val
        });
        this.exposeProperty("specularBloomIntensity", "number", 0.5, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._specularBloomIntensity = val
        });
        this.exposeProperty("specularBloomRadius", "number", 1.5, {
            min: 1.0,
            max: 3.0,
            step: 0.1,
            onChange: (val) => this._specularBloomRadius = val
        });
        this.exposeProperty("specularBloomThreshold", "number", 0.3, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._specularBloomThreshold = val
        });

        /*this.exposeProperty("emissiveIntensity", "number", 1.0, {
            min: 0,
            max: 3.0,
            step: 0.1,
            onChange: (val) => this._emissiveIntensity = val
        });*/

        this.exposeProperty("fogEnabled", "boolean", false, {
            onChange: (val) => this._fogEnabled = val
        });
        this.exposeProperty("fogColor", "color", "#a0a0a0", {
            onChange: (val) => this._fogColor = val
        });
        this.exposeProperty("fogStart", "number", 100, {
            min: 0,
            max: 1000,
            step: 10,
            onChange: (val) => this._fogStart = val
        });
        this.exposeProperty("fogEnd", "number", 500, {
            min: 10,
            max: 5000,
            step: 10,
            onChange: (val) => this._fogEnd = val
        });
        this.exposeProperty("fogDensity", "number", 1.0, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => this._fogDensity = val
        });

        this.exposeProperty("showDebugInfo", "boolean", false, {
            onChange: (val) => this._showDebugInfo = val
        });

        // Hills cache for performance
        this._hillsCache = null;
        this._hillsCacheYaw = null;

        this.updateRenderTexture();
    }

    setAsActiveCamera() {
        if (!this.gameObject) return;
        const allObjects = this.getGameObjects();
        allObjects.forEach(obj => {
            const camera = obj.getModule("Camera3D");
            if (camera && camera !== this) camera._isActive = false;
        });
        this._isActive = true;
    }

    getGameObjects() {
        if (!this.gameObject) return [];
        return this.getAllGameObjects();
    }

    projectPoint(point) {
        const cameraPoint = this.worldToCameraSpace(point);
        const depth = cameraPoint.x;
        if (depth <= this.nearPlane || depth >= this.farPlane) return null;
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);
        if (depth < 1e-6) return null;
        const ndcX = (cameraPoint.y / depth) * (f / aspect);
        const ndcY = (cameraPoint.z / depth) * f;
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;
        return new Vector2(screenX, screenY);
    }

    worldToCameraSpace(point) {
        const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
            this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        let goDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                goDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                goDepth = this.gameObject.depth;
            } else if (this.gameObject.position && this.gameObject.position.z) {
                goDepth = this.gameObject.position.z;
            }
        }
        const camWorldX = (goPos.x || 0) + (this._position.x || 0);
        const camWorldY = (goPos.y || 0) + (this._position.y || 0);
        const camWorldZ = goDepth + (this._position.z || 0);
        const cameraPos = new Vector3(camWorldX, camWorldY, camWorldZ);
        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = (parentAngleDeg + (this._rotation.z || 0)) * (Math.PI / 180);
        const pitch = (this._rotation.y || 0) * (Math.PI / 180);
        const roll = (this._rotation.x || 0) * (Math.PI / 180);
        let relativePos = this.subtractVector3(point, cameraPos);
        relativePos = this.rotateVectorZ(relativePos, -yaw);
        relativePos = this.rotateVectorY(relativePos, -pitch);
        relativePos = this.rotateVectorX(relativePos, -roll);
        return relativePos;
    }

    subtractVector3(a, b) {
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    rotateVectorX(v, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return new Vector3(v.x, v.y * cos - v.z * sin, v.y * sin + v.z * cos);
    }

    rotateVectorY(v, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return new Vector3(v.x * cos + v.z * sin, v.y, -v.x * sin + v.z * cos);
    }

    rotateVectorZ(v, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return new Vector3(v.x * cos - v.y * sin, v.x * sin + v.y * cos, v.z);
    }

    clipPolygonAgainstNearPlane(vertices, nearPlane) {
        if (!vertices || vertices.length === 0) return [];
        const out = [];
        const epsilon = 0.0001;
        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const aIn = a.x >= nearPlane - epsilon;
            const bIn = b.x >= nearPlane - epsilon;
            if (aIn && bIn) {
                out.push(b);
            } else if (aIn && !bIn) {
                const t = Math.max(0, Math.min(1, (nearPlane - a.x) / (b.x - a.x)));
                out.push(new Vector3(nearPlane, a.y + t * (b.y - a.y), a.z + t * (b.z - a.z)));
            } else if (!aIn && bIn) {
                const t = Math.max(0, Math.min(1, (nearPlane - a.x) / (b.x - a.x)));
                out.push(new Vector3(nearPlane, a.y + t * (b.y - a.y), a.z + t * (b.z - a.z)));
                out.push(b);
            }
        }
        return out;
    }

    projectCameraPoint(cameraPoint) {
        const depth = cameraPoint.x;
        if (depth <= 1e-6) return null;
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);
        const ndcX = (cameraPoint.y / depth) * (f / aspect);
        const ndcY = (cameraPoint.z / depth) * f;
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;
        return new Vector2(screenX, screenY);
    }

    isPointVisible(point) {
        const cameraPoint = this.worldToCameraSpace(point);
        return cameraPoint.x >= this.nearPlane && cameraPoint.x <= this.farPlane;
    }

    updateRenderTexture() {
        if (!this._renderTexture || this._renderTexture.width !== this._renderTextureWidth ||
            this._renderTexture.height !== this._renderTextureHeight) {
            this._renderTexture = document.createElement('canvas');
            this._renderTexture.width = this._renderTextureWidth;
            this._renderTexture.height = this._renderTextureHeight;
            this._renderTextureCtx = this._renderTexture.getContext('2d');
            this.viewportWidth = this._renderTextureWidth;
            this.viewportHeight = this._renderTextureHeight;
            this._zBuffer = new Float32Array(this._renderTextureWidth * this._renderTextureHeight);
            this._imageData = this._renderTextureCtx.createImageData(this._renderTextureWidth, this._renderTextureHeight);
        }
    }

    getRenderTexture() { return this._renderTexture; }
    getRenderTextureContext() { return this._renderTextureCtx; }

    clearRenderTexture() {
        if (!this._renderTextureCtx) return;
        this._renderTextureCtx.imageSmoothingEnabled = this._renderTextureSmoothing;
        this._renderTextureCtx.fillStyle = this._backgroundColor;
        this._renderTextureCtx.fillRect(0, 0, this._renderTextureWidth, this._renderTextureHeight);
        if (this._zBuffer) this._zBuffer.fill(Infinity);
    }

    updateViewport() {
        this.viewportWidth = this._renderTextureWidth;
        this.viewportHeight = this._renderTextureHeight;
    }

    calculateScreenNormal(vertices) {
        if (vertices.length < 3) return 0;
        const v0 = vertices[0], v1 = vertices[1], v2 = vertices[2];
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y };
        return edge1.x * edge2.y - edge1.y * edge2.x;
    }

    drawTexturedTriangle(ctx, vertices, uvs, texture) {
        if (!texture || vertices.length !== 3 || uvs.length !== 3) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();
        ctx.clip();
        const x0 = vertices[0].x, y0 = vertices[0].y;
        const x1 = vertices[1].x, y1 = vertices[1].y;
        const x2 = vertices[2].x, y2 = vertices[2].y;
        const u0 = uvs[0].x * texture.width, v0 = uvs[0].y * texture.height;
        const u1 = uvs[1].x * texture.width, v1 = uvs[1].y * texture.height;
        const u2 = uvs[2].x * texture.width, v2 = uvs[2].y * texture.height;
        const det = u0 * (v1 - v2) - u1 * (v0 - v2) + u2 * (v0 - v1);
        if (Math.abs(det) > 0.0001) {
            const a = (x0 * (v1 - v2) - x1 * (v0 - v2) + x2 * (v0 - v1)) / det;
            const b = (x0 * (u2 - u1) - x1 * (u2 - u0) + x2 * (u1 - u0)) / det;
            const c = (x0 * (u1 * v2 - u2 * v1) - x1 * (u0 * v2 - u2 * v0) + x2 * (u0 * v1 - u1 * v0)) / det;
            const d = (y0 * (v1 - v2) - y1 * (v0 - v2) + y2 * (v0 - v1)) / det;
            const e = (y0 * (u2 - u1) - y1 * (u2 - u0) + y2 * (u1 - u0)) / det;
            const f = (y0 * (u1 * v2 - u2 * v1) - y1 * (u0 * v2 - u2 * v0) + y2 * (u0 * v1 - u1 * v0)) / det;
            ctx.transform(a, d, b, e, c, f);
            ctx.drawImage(texture, 0, 0);
        }
        ctx.restore();
    }




    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
 * Register a light with this camera
 */
    registerLight(light) {
        if (!this._dynamicLights.includes(light)) {
            this._dynamicLights.push(light);
        }
    }

    /**
     * Unregister a light from this camera
     */
    unregisterLight(light) {
        const index = this._dynamicLights.indexOf(light);
        if (index > -1) {
            this._dynamicLights.splice(index, 1);
        }
    }

    /**
     * Get nearby lights sorted by distance
     */
    getNearbyLights() {
        if (!this._useDynamicLighting || this._maxLights === 0) {
            return [];
        }

        const cameraPos = this.getCameraWorldPosition();

        // Filter and sort lights by distance
        const nearbyLights = this._dynamicLights
            .filter(light => {
                if (!light.gameObject || !light.gameObject.active) return false;

                const lightPos = light.getWorldPosition();
                const dx = lightPos.x - cameraPos.x;
                const dy = lightPos.y - cameraPos.y;
                const dz = lightPos.z - cameraPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                return distance <= this._lightFindDistance;
            })
            .sort((a, b) => {
                const posA = a.getWorldPosition();
                const posB = b.getWorldPosition();

                const distA = Math.sqrt(
                    (posA.x - cameraPos.x) ** 2 +
                    (posA.y - cameraPos.y) ** 2 +
                    (posA.z - cameraPos.z) ** 2
                );

                const distB = Math.sqrt(
                    (posB.x - cameraPos.x) ** 2 +
                    (posB.y - cameraPos.y) ** 2 +
                    (posB.z - cameraPos.z) ** 2
                );

                return distA - distB;
            })
            .slice(0, this._maxLights);

        return nearbyLights;
    }

    /**
     * Get camera world position
     */
    getCameraWorldPosition() {
        const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
            this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        let goDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                goDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                goDepth = this.gameObject.depth;
            } else if (this.gameObject.position && this.gameObject.position.z) {
                goDepth = this.gameObject.position.z;
            }
        }
        return new Vector3(
            (goPos.x || 0) + (this._position.x || 0),
            (goPos.y || 0) + (this._position.y || 0),
            goDepth + (this._position.z || 0)
        );
    }

    /**
     * Calculate lighting with both directional and dynamic lights
     */
    calculateLightingWithDynamicLights(worldVerts, normal, baseColor, allTriangles) {
        // Parse base color
        const baseRgb = typeof baseColor === 'string' ? this.hexToRgb(baseColor) : baseColor;

        // Calculate triangle center for lighting
        const centerX = (worldVerts[0].x + worldVerts[1].x + worldVerts[2].x) / 3;
        const centerY = (worldVerts[0].y + worldVerts[1].y + worldVerts[2].y) / 3;
        const centerZ = (worldVerts[0].z + worldVerts[1].z + worldVerts[2].z) / 3;
        const triangleCenter = { x: centerX, y: centerY, z: centerZ };

        // Start with directional light
        const directionalLight = this.calculateLighting(normal, baseColor);

        // If dynamic lighting is disabled, return directional only
        if (!this._useDynamicLighting || this._maxLights === 0) {
            return directionalLight;
        }

        // Get nearby lights
        const nearbyLights = this.getNearbyLights();
        if (nearbyLights.length === 0) {
            return directionalLight;
        }

        // Accumulate light contributions
        let totalR = directionalLight.r;
        let totalG = directionalLight.g;
        let totalB = directionalLight.b;

        for (const light of nearbyLights) {
            // Check if light affects this triangle (shadow check)
            const isLit = light.isTriangleLit(triangleCenter, normal, allTriangles);
            if (!isLit) continue;

            // Calculate light contribution
            const contribution = light.calculateLightContribution(triangleCenter, normal);

            if (contribution.intensity > 0.001) {
                // Add light contribution to base color
                totalR += baseRgb.r * (contribution.r / 255);
                totalG += baseRgb.g * (contribution.g / 255);
                totalB += baseRgb.b * (contribution.b / 255);
            }
        }

        // Clamp final values
        return {
            r: Math.min(255, Math.round(totalR)),
            g: Math.min(255, Math.round(totalG)),
            b: Math.min(255, Math.round(totalB))
        };
    }

    /**
     * Calculate final color with emissive support
     * @param {Object} tri - Triangle data with material
     * @param {Object} litColor - Already calculated lighting color
     * @returns {Object} - Final RGB color with emission
     */
    calculateEmissiveColor(tri, litColor) {
        const material = tri.material;

        // If no material or no emissive color, return lit color as-is
        if (!material || !material._emissiveColor) {
            return litColor;
        }

        const emissiveRgb = this.hexToRgb(material._emissiveColor);
        const emissiveIntensity = (material._emissiveIntensity || 0) * (this._emissiveIntensity || 1.0);

        // Skip if emission is negligible
        if (emissiveIntensity < 0.01) {
            return litColor;
        }

        // Add emissive color additively (clamped to prevent overflow)
        return {
            r: Math.min(255, litColor.r + Math.round(emissiveRgb.r * emissiveIntensity)),
            g: Math.min(255, litColor.g + Math.round(emissiveRgb.g * emissiveIntensity)),
            b: Math.min(255, litColor.b + Math.round(emissiveRgb.b * emissiveIntensity))
        };
    }

    /**
     * Check if a point in camera space is occluded by any triangle
     * @param {Vector3} point - Point in camera space to test
     * @param {Array} allTriangles - All triangles to test against
     * @returns {boolean} - True if point is occluded
     */
    isPointOccluded(point, allTriangles, excludeTriangle = null) {
        if (!allTriangles || allTriangles.length === 0) return false;

        const testDepth = point.x;

        const screenPos = this.projectCameraPoint(point);
        if (!screenPos) return true;

        const px = Math.floor(screenPos.x);
        const py = Math.floor(screenPos.y);

        if (px < 0 || px >= this._renderTextureWidth || py < 0 || py >= this._renderTextureHeight) {
            return true;
        }

        const pxFloat = screenPos.x;
        const pyFloat = screenPos.y;

        for (const tri of allTriangles) {
            if (tri === excludeTriangle) continue;
            if (tri.isCulled) continue;
            if (!tri.v0 || !tri.v1 || !tri.v2) continue;
            if (!tri.v0.screen || !tri.v1.screen || !tri.v2.screen) continue;

            const v0 = tri.v0.screen;
            const v1 = tri.v1.screen;
            const v2 = tri.v2.screen;

            const denom = (v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y);
            if (Math.abs(denom) < 1e-6) continue;

            const w0 = ((v1.y - v2.y) * (pxFloat - v2.x) + (v2.x - v1.x) * (pyFloat - v2.y)) / denom;
            const w1 = ((v2.y - v0.y) * (pxFloat - v2.x) + (v0.x - v2.x) * (pyFloat - v2.y)) / denom;
            const w2 = 1 - w0 - w1;

            if (w0 >= -0.001 && w1 >= -0.001 && w2 >= -0.001) {
                const d0 = tri.v0.cameraPos?.x;
                const d1 = tri.v1.cameraPos?.x;
                const d2 = tri.v2.cameraPos?.x;
                if (d0 === undefined || d1 === undefined || d2 === undefined) continue;
                if (d0 <= 1e-6 || d1 <= 1e-6 || d2 <= 1e-6) continue;

                const invDepth = w0 / d0 + w1 / d1 + w2 / d2;
                if (invDepth <= 0) continue;

                const triDepth = 1 / invDepth;

                if (triDepth < testDepth - 0.05) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
 * Calculate fog factor based on distance
 * Returns 0 (no fog) to 1 (full fog)
 */
    calculateFogFactor(distance) {
        if (!this._fogEnabled) return 0;

        if (distance <= this._fogStart) return 0;
        if (distance >= this._fogEnd) return this._fogDensity;

        // Linear interpolation between fogStart and fogEnd
        const range = this._fogEnd - this._fogStart;
        const fogFactor = ((distance - this._fogStart) / range) * this._fogDensity;

        return Math.max(0, Math.min(this._fogDensity, fogFactor));
    }

    /**
     * Apply fog to a color based on distance
     */
    applyFog(color, distance) {
        if (!this._fogEnabled) return color;

        const fogFactor = this.calculateFogFactor(distance);
        if (fogFactor === 0) return color;

        const fogRgb = this.hexToRgb(this._fogColor);

        // Blend color with fog color based on fog factor
        return {
            r: Math.round(color.r * (1 - fogFactor) + fogRgb.r * fogFactor),
            g: Math.round(color.g * (1 - fogFactor) + fogRgb.g * fogFactor),
            b: Math.round(color.b * (1 - fogFactor) + fogRgb.b * fogFactor)
        };
    }

    /**
     * Check if a bounding sphere is within the camera frustum
     */
    isInFrustum(center, radius) {
        const cameraSpace = this.worldToCameraSpace(center);

        // Check depth
        if (cameraSpace.x + radius < this._nearPlane || cameraSpace.x - radius > this._farPlane) {
            return false;
        }

        // Check horizontal FOV
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const halfFovTan = Math.tan(fovRadians * 0.5);

        const maxY = cameraSpace.x * halfFovTan * aspect;
        if (Math.abs(cameraSpace.y) - radius > maxY) {
            return false;
        }

        // Check vertical FOV
        const maxZ = cameraSpace.x * halfFovTan;
        if (Math.abs(cameraSpace.z) - radius > maxZ) {
            return false;
        }

        return true;
    }

    /**
     * Optimized pure raster rendering using scanline algorithm
     * Fast forward rasterization without Z-buffer overhead
     */
    renderRasterOptimized() {
        const startTime = performance.now();

        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth;
        const h = this._renderTextureHeight;

        this._debugStats.totalFaces = 0;
        this._debugStats.renderedTriangles = 0;
        this._debugStats.culledFaces = 0;
        this._debugStats.clippedFaces = 0;
        this._debugStats.specularHighlights = 0;

        const buffer32 = new Uint32Array(imgData.data.buffer);
        this.clearBackgroundFast(buffer32, w, h);

        const allTrianglesForShadows = [];
        const allTriangles = [];
        const specularHighlights = [];
        const meshSpecularData = new Map();
            
        this.preRender(buffer32, w, h); 

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            // Calculate bounding sphere
            const worldPos = obj.getWorldPosition();
            const boundingRadius = mesh.getBoundingRadius ? mesh.getBoundingRadius() : 50;
            const center = new Vector3(worldPos.x, worldPos.y, obj.depth || 0);

            // Frustum culling
            if (!this.isInFrustum(center, boundingRadius)) {
                return; // Skip entire mesh
            }

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const material = mesh.material;
            const faceColor = material ? material.diffuseColor : (mesh.faceColor || mesh._faceColor || "#888888");

            // FIXED: Apply LOD subdivision if enabled
            const facesToRender = mesh.enableLOD && typeof mesh.applyLODSubdivision === 'function'
                ? mesh.applyLODSubdivision(mesh.faces, transformedVertices, this)
                : mesh.faces.map(face => ({ face: face, level: 0 }));

            facesToRender.forEach(({ face, level }) => {
                this._debugStats.totalFaces++;

                // FIXED: Handle both original faces (array of indices) and subdivided faces (array of Vector3)
                let worldVerts;
                if (face[0] instanceof Vector3) {
                    // Subdivided face - vertices are already in world space
                    worldVerts = face;
                } else {
                    // Original face - indices need to be resolved
                    const vertIndices = Array.isArray(face) ? face : face.indices;
                    if (!vertIndices || vertIndices.length < 3) return;
                    worldVerts = vertIndices.map(idx => transformedVertices[idx]).filter(v => v);
                }

                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) {
                    this._debugStats.clippedFaces++;
                    return;
                }

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const isCulled = this._enableBackfaceCulling && this.shouldCullFace(clippedVerts);

                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv);
                    return proj ? { screen: proj, depth: cv.x, cameraPos: cv } : null;
                }).filter(v => v);

                if (screenVerts.length < 3) return;

                // Get UV coordinates for this face
                const getUV = (vertIdx) => {
                    // For subdivided faces, use default UVs (can be enhanced later)
                    if (face[0] instanceof Vector3) {
                        return new Vector2(0, 0);
                    }

                    if (mesh.uvCoords && mesh.uvCoords[vertIdx]) {
                        return mesh.uvCoords[vertIdx];
                    }
                    return new Vector2(0, 0);
                };

                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const triWorldVerts = [
                        worldVerts[0],
                        worldVerts[Math.min(i, worldVerts.length - 1)],
                        worldVerts[Math.min(i + 1, worldVerts.length - 1)]
                    ];

                    // Get UVs for this triangle
                    let uv0, uv1, uv2;
                    if (face[0] instanceof Vector3) {
                        // Subdivided face - use default UVs
                        uv0 = new Vector2(0, 0);
                        uv1 = new Vector2(0, 0);
                        uv2 = new Vector2(0, 0);
                    } else {
                        // Original face - use proper UVs
                        const vertIndices = Array.isArray(face) ? face : face.indices;
                        uv0 = getUV(vertIndices[0]);
                        uv1 = getUV(vertIndices[Math.min(i, vertIndices.length - 1)]);
                        uv2 = getUV(vertIndices[Math.min(i + 1, vertIndices.length - 1)]);
                    }

                    const centroidX = (screenVerts[0].cameraPos.x + screenVerts[i].cameraPos.x + screenVerts[i + 1].cameraPos.x) / 3;
                    const viewDepth = centroidX;

                    const tri = {
                        v0: screenVerts[0],
                        v1: screenVerts[i],
                        v2: screenVerts[i + 1],
                        uv0: uv0,
                        uv1: uv1,
                        uv2: uv2,
                        worldVerts: triWorldVerts,
                        worldNormal: worldNormal,
                        material: material,
                        faceColor: faceColor,
                        avgDepth: viewDepth,
                        isCulled: isCulled,
                        lodLevel: level // Store LOD level for debugging
                    };

                    allTrianglesForShadows.push(tri);

                    if (!isCulled) {
                        this._debugStats.renderedTriangles++;
                        allTriangles.push(tri);
                    } else {
                        this._debugStats.culledFaces++;
                    }
                }
            });
        });

        // Cache triangles for occlusion testing
        this._allTrianglesCache = allTriangles;

        allTriangles.sort((a, b) => b.avgDepth - a.avgDepth);

        allTriangles.forEach(tri => {
            const litColor = this.calculateLightingWithDynamicLights(
                tri.worldVerts,
                tri.worldNormal,
                tri.faceColor,
                allTrianglesForShadows
            );

            // Apply emissive color
            const emissiveColor = this.calculateEmissiveColor(tri, litColor);

            // Apply fog to lit color based on triangle depth
            const foggedColor = this.applyFog(emissiveColor, tri.avgDepth);

            const packedColor = (255 << 24) | (foggedColor.b << 16) | (foggedColor.g << 8) | foggedColor.r;
            tri.packedColor = packedColor;
            tri.fogFactor = this.calculateFogFactor(tri.avgDepth); // Store fog factor for specular filtering

            this.rasterizeTriangleFast(tri, buffer32, w, h);

            // Only calculate specular if fog hasn't obscured the triangle
            if (this._specularEnabled && tri.material && tri.material._specularColor && tri.fogFactor < 0.9) {
                const projectedVerts = [tri.v0.screen, tri.v1.screen, tri.v2.screen];

                if (this._specularPerMesh) {
                    const mesh = tri.material.gameObject;
                    if (!meshSpecularData.has(mesh)) {
                        meshSpecularData.set(mesh, {
                            mesh: mesh,
                            triangles: [],
                            worldNormals: [],
                            projectedBounds: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
                        });
                    }

                    const meshData = meshSpecularData.get(mesh);
                    meshData.triangles.push(tri);
                    meshData.worldNormals.push(tri.worldNormal);

                    const triBounds = {
                        minX: Math.min(projectedVerts[0].x, projectedVerts[1].x, projectedVerts[2].x),
                        maxX: Math.max(projectedVerts[0].x, projectedVerts[1].x, projectedVerts[2].x),
                        minY: Math.min(projectedVerts[0].y, projectedVerts[1].y, projectedVerts[2].y),
                        maxY: Math.max(projectedVerts[0].y, projectedVerts[1].y, projectedVerts[2].y)
                    };
                    meshData.projectedBounds.minX = Math.min(meshData.projectedBounds.minX, triBounds.minX);
                    meshData.projectedBounds.maxX = Math.max(meshData.projectedBounds.maxX, triBounds.maxX);
                    meshData.projectedBounds.minY = Math.min(meshData.projectedBounds.minY, triBounds.minY);
                    meshData.projectedBounds.maxY = Math.max(meshData.projectedBounds.maxY, triBounds.maxY);
                } else {
                    const specular = this.calculateSpecularHighlight(tri, projectedVerts);
                    if (specular) {
                        // Store fog factor with specular for filtering
                        specular.fogFactor = tri.fogFactor;
                        specularHighlights.push(specular);
                    }
                }
            }
        });

        if (this._specularEnabled && this._specularPerMesh && meshSpecularData.size > 0) {
            this.calculateMeshSpecularHighlights(meshSpecularData, specularHighlights);
        }

        this._debugStats.specularHighlights = specularHighlights.length;

        if (specularHighlights.length > 0) {
            this.renderSpecularHighlights(specularHighlights, imgData, w, h);
        }

        this.postRender(buffer32, w, h);

        ctx.putImageData(imgData, 0, 0);

        // Draw visible light sources with occlusion testing
        const nearbyLights = this.getNearbyLights();
        nearbyLights.forEach(light => {
            if (light._showLightSource) {
                const lightWorldPos = light.getWorldPosition();
                const lightCameraPos = this.worldToCameraSpace(lightWorldPos);

                if (!this.isPointOccluded(lightCameraPos, allTriangles)) {
                    light.drawLightSource(this);
                }
            }
        });

        if (this._showDebugInfo) {
            this._debugStats.renderTime = performance.now() - startTime;
            this._debugStats.activeLights = this.getNearbyLights().length;
            this.drawDebugInfo(ctx);
        }

        // Clear cache
        this._allTrianglesCache = null;
    }

    // THESE METHODS CAN BE USED IN MODULES TO HOOK INTO RENDERING PROCESS FOR SCREEN EFFECTS
    preRender(buffer, width, height) {
        // Override this is you want to render something before the objects are rendered
    }

    postRender(buffer, width, height) {
        // Override this is you want to render something after the objects are rendered
    }

    // ==================== PUBLIC DRAWING API ====================
    // These methods can be used in custom modules for screen effects

    /**
     * Set a pixel color at specific coordinates
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    setPixel(buffer, x, y, r, g, b, width, height) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const idx = y * width + x;
        buffer[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
    }

    /**
     * Get pixel color at specific coordinates
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @returns {Object} - {r, g, b} color object or null if out of bounds
     */
    getPixel(buffer, x, y, width, height) {
        if (x < 0 || x >= width || y < 0 || y >= height) return null;
        const idx = y * width + x;
        const pixel = buffer[idx];
        return {
            r: pixel & 0xFF,
            g: (pixel >> 8) & 0xFF,
            b: (pixel >> 16) & 0xFF
        };
    }

    /**
     * Blend a pixel with an existing color using alpha
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} alpha - Alpha (0-1)
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    blendPixel(buffer, x, y, r, g, b, alpha, width, height) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        if (alpha <= 0) return;
        
        const idx = y * width + x;
        const existing = buffer[idx];
        const existingR = existing & 0xFF;
        const existingG = (existing >> 8) & 0xFF;
        const existingB = (existing >> 16) & 0xFF;
        
        const newR = Math.round(existingR * (1 - alpha) + r * alpha);
        const newG = Math.round(existingG * (1 - alpha) + g * alpha);
        const newB = Math.round(existingB * (1 - alpha) + b * alpha);
        
        buffer[idx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
    }

    /**
     * Draw a line using Bresenham's algorithm
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} x0 - Start X
     * @param {number} y0 - Start Y
     * @param {number} x1 - End X
     * @param {number} y1 - End Y
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    drawLine(buffer, x0, y0, x1, y1, r, g, b, width, height) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.setPixel(buffer, x0, y0, r, g, b, width, height);

            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    /**
     * Draw a circle (outline)
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} centerX - Center X
     * @param {number} centerY - Center Y
     * @param {number} radius - Radius
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    drawCircle(buffer, centerX, centerY, radius, r, g, b, width, height) {
        let x = 0;
        let y = radius;
        let d = 3 - 2 * radius;

        const drawCirclePoints = (cx, cy, x, y) => {
            this.setPixel(buffer, cx + x, cy + y, r, g, b, width, height);
            this.setPixel(buffer, cx - x, cy + y, r, g, b, width, height);
            this.setPixel(buffer, cx + x, cy - y, r, g, b, width, height);
            this.setPixel(buffer, cx - x, cy - y, r, g, b, width, height);
            this.setPixel(buffer, cx + y, cy + x, r, g, b, width, height);
            this.setPixel(buffer, cx - y, cy + x, r, g, b, width, height);
            this.setPixel(buffer, cx + y, cy - x, r, g, b, width, height);
            this.setPixel(buffer, cx - y, cy - x, r, g, b, width, height);
        };

        drawCirclePoints(centerX, centerY, x, y);
        while (y >= x) {
            x++;
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
            drawCirclePoints(centerX, centerY, x, y);
        }
    }

    /**
     * Fill a circle
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} centerX - Center X
     * @param {number} centerY - Center Y
     * @param {number} radius - Radius
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    fillCircle(buffer, centerX, centerY, radius, r, g, b, width, height) {
        const radiusSq = radius * radius;
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
        const minY = Math.max(0, Math.floor(centerY - radius));
        const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= radiusSq) {
                    this.setPixel(buffer, x, y, r, g, b, width, height);
                }
            }
        }
    }

    /**
     * Fill a rectangle
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} rectWidth - Rectangle width
     * @param {number} rectHeight - Rectangle height
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    fillRect(buffer, x, y, rectWidth, rectHeight, r, g, b, width, height) {
        const minX = Math.max(0, Math.floor(x));
        const maxX = Math.min(width - 1, Math.floor(x + rectWidth));
        const minY = Math.max(0, Math.floor(y));
        const maxY = Math.min(height - 1, Math.floor(y + rectHeight));

        const packedColor = (255 << 24) | (b << 16) | (g << 8) | r;

        for (let py = minY; py <= maxY; py++) {
            const rowStart = py * width;
            for (let px = minX; px <= maxX; px++) {
                buffer[rowStart + px] = packedColor;
            }
        }
    }

    /**
     * Detect edges using Sobel operator
     * Returns a new buffer with edge-detected image
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {number} threshold - Edge detection threshold (0-255)
     * @returns {Uint8Array} - Edge map (0 = no edge, 255 = edge)
     */
    detectEdges(buffer, width, height, threshold = 50) {
        const edgeMap = new Uint8Array(width * height);
        
        // Sobel kernels
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;

                // Apply Sobel kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = (y + ky) * width + (x + kx);
                        const pixel = buffer[idx];
                        
                        // Convert to grayscale (average of RGB)
                        const gray = ((pixel & 0xFF) + ((pixel >> 8) & 0xFF) + ((pixel >> 16) & 0xFF)) / 3;
                        
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        gx += gray * sobelX[kernelIdx];
                        gy += gray * sobelY[kernelIdx];
                    }
                }

                // Calculate gradient magnitude
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                const outputIdx = y * width + x;
                edgeMap[outputIdx] = magnitude > threshold ? 255 : 0;
            }
        }

        return edgeMap;
    }

    /**
     * Apply a convolution kernel to the buffer
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {Array} kernel - 3x3 kernel (9 values)
     * @param {number} divisor - Kernel divisor (sum of kernel values or custom)
     * @returns {Uint32Array} - New buffer with effect applied
     */
    applyKernel(buffer, width, height, kernel, divisor = null) {
        if (kernel.length !== 9) {
            console.error("Kernel must be 3x3 (9 values)");
            return buffer;
        }

        if (divisor === null) {
            divisor = kernel.reduce((sum, val) => sum + val, 0);
            if (divisor === 0) divisor = 1;
        }

        const output = new Uint32Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = (y + ky) * width + (x + kx);
                        const pixel = buffer[idx];
                        
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        const weight = kernel[kernelIdx];

                        r += (pixel & 0xFF) * weight;
                        g += ((pixel >> 8) & 0xFF) * weight;
                        b += ((pixel >> 16) & 0xFF) * weight;
                    }
                }

                r = Math.max(0, Math.min(255, Math.round(r / divisor)));
                g = Math.max(0, Math.min(255, Math.round(g / divisor)));
                b = Math.max(0, Math.min(255, Math.round(b / divisor)));

                const outputIdx = y * width + x;
                output[outputIdx] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        }

        // Copy edges from original
        for (let x = 0; x < width; x++) {
            output[x] = buffer[x]; // Top edge
            output[(height - 1) * width + x] = buffer[(height - 1) * width + x]; // Bottom edge
        }
        for (let y = 0; y < height; y++) {
            output[y * width] = buffer[y * width]; // Left edge
            output[y * width + (width - 1)] = buffer[y * width + (width - 1)]; // Right edge
        }

        return output;
    }

    /**
     * Apply a box blur
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {number} radius - Blur radius
     * @returns {Uint32Array} - Blurred buffer
     */
    applyBoxBlur(buffer, width, height, radius = 1) {
        const kernel = new Array(9).fill(1);
        return this.applyKernel(buffer, width, height, kernel, 9);
    }

    /**
     * Apply a Gaussian blur (approximate)
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @returns {Uint32Array} - Blurred buffer
     */
    applyGaussianBlur(buffer, width, height) {
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        return this.applyKernel(buffer, width, height, kernel, 16);
    }

    /**
     * Apply a sharpen filter
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @returns {Uint32Array} - Sharpened buffer
     */
    applySharpen(buffer, width, height) {
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        return this.applyKernel(buffer, width, height, kernel, 1);
    }

    /**
     * Apply brightness adjustment
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {number} amount - Brightness amount (-255 to 255)
     */
    adjustBrightness(buffer, width, height, amount) {
        for (let i = 0; i < buffer.length; i++) {
            const pixel = buffer[i];
            let r = (pixel & 0xFF) + amount;
            let g = ((pixel >> 8) & 0xFF) + amount;
            let b = ((pixel >> 16) & 0xFF) + amount;

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            buffer[i] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
    }

    /**
     * Apply contrast adjustment
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {number} amount - Contrast amount (0.5 = less contrast, 2 = more contrast)
     */
    adjustContrast(buffer, width, height, amount) {
        const factor = (259 * (amount + 255)) / (255 * (259 - amount));

        for (let i = 0; i < buffer.length; i++) {
            const pixel = buffer[i];
            let r = ((pixel & 0xFF) - 128) * factor + 128;
            let g = (((pixel >> 8) & 0xFF) - 128) * factor + 128;
            let b = (((pixel >> 16) & 0xFF) - 128) * factor + 128;

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            buffer[i] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
    }

    /**
     * Apply saturation adjustment
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {number} amount - Saturation amount (0 = grayscale, 1 = normal, 2 = double)
     */
    adjustSaturation(buffer, width, height, amount) {
        for (let i = 0; i < buffer.length; i++) {
            const pixel = buffer[i];
            const r = pixel & 0xFF;
            const g = (pixel >> 8) & 0xFF;
            const b = (pixel >> 16) & 0xFF;

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            const newR = Math.max(0, Math.min(255, gray + (r - gray) * amount));
            const newG = Math.max(0, Math.min(255, gray + (g - gray) * amount));
            const newB = Math.max(0, Math.min(255, gray + (b - gray) * amount));

            buffer[i] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
        }
    }

    /**
     * Convert buffer to grayscale
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     */
    toGrayscale(buffer, width, height) {
        for (let i = 0; i < buffer.length; i++) {
            const pixel = buffer[i];
            const r = pixel & 0xFF;
            const g = (pixel >> 8) & 0xFF;
            const b = (pixel >> 16) & 0xFF;

            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

            buffer[i] = (255 << 24) | (gray << 16) | (gray << 8) | gray;
        }
    }

    /**
     * Apply vignette effect
     * @param {Uint32Array} buffer - 32-bit pixel buffer
     * @param {number} width - Buffer width
     * @param {number} height - Buffer height
     * @param {number} intensity - Vignette intensity (0-1)
     */
    applyVignette(buffer, width, height, intensity = 0.5) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const vignette = 1 - (distance / maxDist) * intensity;

                const idx = y * width + x;
                const pixel = buffer[idx];
                let r = (pixel & 0xFF) * vignette;
                let g = ((pixel >> 8) & 0xFF) * vignette;
                let b = ((pixel >> 16) & 0xFF) * vignette;

                r = Math.max(0, Math.min(255, r));
                g = Math.max(0, Math.min(255, g));
                b = Math.max(0, Math.min(255, b));

                buffer[idx] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        }
    }

    /**
     * Draw debug information overlay
     */
    drawDebugInfo(ctx) {
        ctx.save();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, 200, 145);

        ctx.font = '11px monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const stats = this._debugStats;
        const lines = [
            `Total Faces: ${stats.totalFaces}`,
            `Rendered Tris: ${stats.renderedTriangles}`,
            `Culled: ${stats.culledFaces}`,
            `Clipped: ${stats.clippedFaces}`,
            `Specular: ${stats.specularHighlights}`,
            `Active Lights: ${stats.activeLights || 0}/${this._maxLights}`,
            `Render Time: ${stats.renderTime.toFixed(2)}ms`,
            `FPS: ${(1000 / stats.renderTime).toFixed(1)}`,
            `Resolution: ${this._renderTextureWidth}x${this._renderTextureHeight}`
        ];

        lines.forEach((line, index) => {
            ctx.fillText(line, 10, 10 + index * 14);
        });

        ctx.restore();
    }

    /**
     * Calculate sun position in screen space based on light direction
     * Returns null if sun is below horizon
     */
    calculateSunPosition() {
        if (!this._showSun || this._backgroundType !== "skybox") {
            return null;
        }

        // Normalize light direction (pointing FROM scene TO sun)
        const lightDir = this._lightDirection;
        const len = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
        const normalizedLight = {
            x: lightDir.x / len,
            y: lightDir.y / len,
            z: lightDir.z / len
        };

        // Sun position is opposite to light direction (sun is the source)
        const sunDir = {
            x: -normalizedLight.x,
            y: -normalizedLight.y,
            z: -normalizedLight.z
        };

        // Check if sun is above horizon (Z component positive means above in world space)
        if (sunDir.z <= 0) {
            return null; // Sun is below horizon
        }

        // Get camera rotation angles
        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = (parentAngleDeg + (this._rotation.z || 0)) * (Math.PI / 180);
        const pitch = (this._rotation.y || 0) * (Math.PI / 180);
        const roll = (this._rotation.x || 0) * (Math.PI / 180);

        // Apply camera rotations to sun direction (same order as camera space transform)
        // First yaw (Z rotation)
        const cosYaw = Math.cos(-yaw);
        const sinYaw = Math.sin(-yaw);
        let rotatedX = sunDir.x * cosYaw - sunDir.y * sinYaw;
        let rotatedY = sunDir.x * sinYaw + sunDir.y * cosYaw;
        let rotatedZ = sunDir.z;

        // Then pitch (Y rotation)
        const cosPitch = Math.cos(-pitch);
        const sinPitch = Math.sin(-pitch);
        const finalX = rotatedX * cosPitch + rotatedZ * sinPitch;
        const finalY = rotatedY;
        const finalZ = -rotatedX * sinPitch + rotatedZ * cosPitch;

        // Check if sun is behind camera after rotation
        if (finalX <= 0) {
            return null; // Sun is behind camera
        }

        // Project to screen space using perspective projection
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);

        // Perspective divide - treat as if sun is at a fixed large distance
        const sunDistance = 1000.0; // Large but not infinite for stability
        const ndcX = (finalY / sunDistance) * (f / aspect) / (finalX / sunDistance);
        const ndcY = (finalZ / sunDistance) * f / (finalX / sunDistance);

        // Convert NDC to screen space
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;

        return new Vector2(screenX, screenY);
    }

    /**
     * Draw sun on the background
     */
    drawSun(buffer32, w, h, sunPos) {
        if (!sunPos) return;

        const centerX = Math.round(sunPos.x);
        const centerY = Math.round(sunPos.y);

        // Parse light color for sun
        const sunColor = this.hexToRgb(this._lightColor);

        // Draw glow first (outer to inner for proper alpha blending)
        const glowRadius = this._sunGlowSize;
        const minGlowX = Math.max(0, centerX - glowRadius);
        const maxGlowX = Math.min(w - 1, centerX + glowRadius);
        const minGlowY = Math.max(0, centerY - glowRadius);
        const maxGlowY = Math.min(h - 1, centerY + glowRadius);

        for (let y = minGlowY; y <= maxGlowY; y++) {
            for (let x = minGlowX; x <= maxGlowX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distSq = dx * dx + dy * dy;
                const glowRadiusSq = glowRadius * glowRadius;

                if (distSq <= glowRadiusSq) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1.0 - (distance / glowRadius);
                    const alpha = falloff * falloff * 0.3; // Glow intensity

                    if (alpha > 0.01) {
                        const pixelIdx = y * w + x;
                        const existing = buffer32[pixelIdx];

                        // Extract existing RGB
                        const existingR = existing & 0xFF;
                        const existingG = (existing >> 8) & 0xFF;
                        const existingB = (existing >> 16) & 0xFF;

                        // Blend with sun color
                        const newR = Math.min(255, Math.round(existingR + sunColor.r * alpha));
                        const newG = Math.min(255, Math.round(existingG + sunColor.g * alpha));
                        const newB = Math.min(255, Math.round(existingB + sunColor.b * alpha));

                        buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                    }
                }
            }
        }

        // Draw sun core (bright center)
        const coreRadius = this._sunSize;
        const minCoreX = Math.max(0, centerX - coreRadius);
        const maxCoreX = Math.min(w - 1, centerX + coreRadius);
        const minCoreY = Math.max(0, centerY - coreRadius);
        const maxCoreY = Math.min(h - 1, centerY + coreRadius);

        for (let y = minCoreY; y <= maxCoreY; y++) {
            for (let x = minCoreX; x <= maxCoreX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distSq = dx * dx + dy * dy;
                const coreRadiusSq = coreRadius * coreRadius;

                if (distSq <= coreRadiusSq) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1.0 - (distance / coreRadius);

                    // Smooth falloff for softer edge
                    const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

                    const pixelIdx = y * w + x;
                    const existing = buffer32[pixelIdx];

                    // Extract existing RGB
                    const existingR = existing & 0xFF;
                    const existingG = (existing >> 8) & 0xFF;
                    const existingB = (existing >> 16) & 0xFF;

                    // Bright core with smooth falloff
                    const intensity = 0.7 + smoothFalloff * 0.3;
                    const newR = Math.min(255, Math.round(existingR * (1 - intensity) + 255 * intensity));
                    const newG = Math.min(255, Math.round(existingG * (1 - intensity) + 255 * intensity));
                    const newB = Math.min(255, Math.round(existingB * (1 - intensity) + 255 * intensity));

                    buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                }
            }
        }
    }

    /**
     * Draw lens flare effect
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {Vector2} sunPos - Sun position in screen space
     */
    drawLensFlare(buffer32, w, h, sunPos) {
        if (!this._lensFlareEnabled || !sunPos) return;

        // Calculate center of screen
        const centerX = w * 0.5;
        const centerY = h * 0.5;

        // Vector from sun to center (lens flare direction)
        const dirX = centerX - sunPos.x;
        const dirY = centerY - sunPos.y;

        // Calculate sun distance from center (for intensity falloff)
        const sunDistFromCenter = Math.sqrt(dirX * dirX + dirY * dirY);
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        const distanceFalloff = 1.0 - Math.min(1.0, sunDistFromCenter / maxDist);

        // Early exit if sun is too far from center
        if (distanceFalloff < 0.1) return;

        // Parse sun color
        const sunColor = this.hexToRgb(this._lightColor);

        // Create flare elements along the line from sun to center
        for (let i = 0; i < this._lensFlareCount; i++) {
            // Position along the sun-to-center line
            const t = (i + 1) * this._lensFlareSpacing;
            const flareX = sunPos.x + dirX * t;
            const flareY = sunPos.y + dirY * t;

            // Skip if flare is outside screen bounds
            if (flareX < 0 || flareX >= w || flareY < 0 || flareY >= h) continue;

            // Calculate flare properties
            const flareProgress = i / (this._lensFlareCount - 1); // 0 to 1
            const flareSize = this._lensFlareSize * (0.5 + flareProgress * 0.5); // Smaller flares closer to sun
            const flareIntensity = this._lensFlareIntensity * distanceFalloff * (1.0 - flareProgress * 0.3);

            // Apply chromatic aberration if enabled
            let flareColor = { ...sunColor };
            if (this._lensFlareColorShift) {
                // Shift colors based on flare index
                const hueShift = (i % 3) / 3; // 0, 0.33, 0.66 for RGB shift
                if (hueShift < 0.33) {
                    flareColor.r = Math.min(255, sunColor.r * 1.2);
                    flareColor.g = Math.min(255, sunColor.g * 0.8);
                    flareColor.b = Math.min(255, sunColor.b * 0.6);
                } else if (hueShift < 0.66) {
                    flareColor.r = Math.min(255, sunColor.r * 0.6);
                    flareColor.g = Math.min(255, sunColor.g * 1.2);
                    flareColor.b = Math.min(255, sunColor.b * 0.8);
                } else {
                    flareColor.r = Math.min(255, sunColor.r * 0.8);
                    flareColor.g = Math.min(255, sunColor.g * 0.6);
                    flareColor.b = Math.min(255, sunColor.b * 1.2);
                }
            }

            // Draw hexagonal flare element (more efficient than circle)
            this.drawFlareElement(buffer32, w, h, flareX, flareY, flareSize, flareIntensity, flareColor);
        }

        // Add a bright streak from sun position (lens reflection)
        if (distanceFalloff > 0.3) {
            this.drawLensStreak(buffer32, w, h, sunPos, centerX, centerY, sunColor, distanceFalloff);
        }
    }

    /**
     * Draw a single lens flare element (hexagonal shape for efficiency)
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} centerX - Flare center X
     * @param {number} centerY - Flare center Y
     * @param {number} size - Flare size
     * @param {number} intensity - Flare intensity (0-1)
     * @param {Object} color - RGB color object
     */
    drawFlareElement(buffer32, w, h, centerX, centerY, size, intensity, color) {
        const halfSize = size * 0.5;
        const minX = Math.max(0, Math.floor(centerX - halfSize));
        const maxX = Math.min(w - 1, Math.ceil(centerX + halfSize));
        const minY = Math.max(0, Math.floor(centerY - halfSize));
        const maxY = Math.min(h - 1, Math.ceil(centerY + halfSize));

        const sizeSq = halfSize * halfSize;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distSq = dx * dx + dy * dy;

                if (distSq <= sizeSq) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1.0 - (distance / halfSize);

                    // Smooth falloff with slight hexagonal shape
                    const angle = Math.atan2(dy, dx);
                    const hexFactor = 0.95 + 0.05 * Math.cos(angle * 6); // 6-sided approximation
                    const smoothFalloff = falloff * falloff * hexFactor;
                    const alpha = intensity * smoothFalloff * 0.6; // Reduced opacity for subtlety

                    if (alpha > 0.01) {
                        const pixelIdx = y * w + x;
                        const existing = buffer32[pixelIdx];

                        // Extract existing RGB
                        const existingR = existing & 0xFF;
                        const existingG = (existing >> 8) & 0xFF;
                        const existingB = (existing >> 16) & 0xFF;

                        // Additive blend with flare color
                        const newR = Math.min(255, Math.round(existingR + color.r * alpha));
                        const newG = Math.min(255, Math.round(existingG + color.g * alpha));
                        const newB = Math.min(255, Math.round(existingB + color.b * alpha));

                        buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                    }
                }
            }
        }
    }

    /**
     * Draw a lens streak effect (anamorphic flare)
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {Vector2} sunPos - Sun position
     * @param {number} centerX - Screen center X
     * @param {number} centerY - Screen center Y
     * @param {Object} color - RGB color object
     * @param {number} falloff - Distance falloff
     */
    drawLensStreak(buffer32, w, h, sunPos, centerX, centerY, color, falloff) {
        // Draw horizontal streak through sun position
        const streakLength = w * 0.3 * falloff;
        const streakThickness = 2;
        const streakIntensity = this._lensFlareIntensity * falloff * 0.3;

        const startX = Math.max(0, Math.floor(sunPos.x - streakLength));
        const endX = Math.min(w - 1, Math.ceil(sunPos.x + streakLength));
        const minY = Math.max(0, Math.floor(sunPos.y - streakThickness));
        const maxY = Math.min(h - 1, Math.ceil(sunPos.y + streakThickness));

        for (let y = minY; y <= maxY; y++) {
            const dy = Math.abs(y - sunPos.y);
            const yFalloff = 1.0 - (dy / streakThickness);

            for (let x = startX; x <= endX; x++) {
                const dx = Math.abs(x - sunPos.x);
                const xFalloff = 1.0 - (dx / streakLength);
                const alpha = streakIntensity * xFalloff * yFalloff;

                if (alpha > 0.01) {
                    const pixelIdx = y * w + x;
                    const existing = buffer32[pixelIdx];

                    const existingR = existing & 0xFF;
                    const existingG = (existing >> 8) & 0xFF;
                    const existingB = (existing >> 16) & 0xFF;

                    const newR = Math.min(255, Math.round(existingR + color.r * alpha));
                    const newG = Math.min(255, Math.round(existingG + color.g * alpha));
                    const newB = Math.min(255, Math.round(existingB + color.b * alpha));

                    buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                }
            }
        }
    }

    /**
 * Simple 2D Perlin-like noise function for clouds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} - Noise value 0-1
 */
    generateCloudNoise(x, y) {
        // Simple hash-based noise (fast but procedural)
        const hash = (n) => {
            n = (n << 13) ^ n;
            return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
        };

        const X = Math.floor(x);
        const Y = Math.floor(y);
        const xf = x - X;
        const yf = y - Y;

        // Smooth interpolation
        const u = xf * xf * (3.0 - 2.0 * xf);
        const v = yf * yf * (3.0 - 2.0 * yf);

        // Hash corners
        const a = hash(X + hash(Y));
        const b = hash(X + 1 + hash(Y));
        const c = hash(X + hash(Y + 1));
        const d = hash(X + 1 + hash(Y + 1));

        // Bilinear interpolation
        const k0 = a;
        const k1 = b - a;
        const k2 = c - a;
        const k3 = a - b - c + d;

        return (k0 + k1 * u + k2 * v + k3 * u * v) * 0.5 + 0.5;
    }

    /**
     * Fractional Brownian Motion for more detailed clouds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} octaves - Number of noise layers
     * @returns {number} - Combined noise value 0-1
     */
    generateCloudFBM(x, y, octaves = 4) {
        let value = 0;
        let amplitude = 1.0;
        let frequency = 1.0;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.generateCloudNoise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2.0;
        }

        return value / maxValue;
    }

    /**
     * Render clouds in the sky portion of the skybox
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} horizonY - Horizon line Y position
     */
    renderClouds(buffer32, w, h, horizonY) {
        if (!this._cloudsEnabled) return;

        // Update cloud animation
        this._cloudTime += 0.016 * this._cloudSpeed;

        // Cloud layer positioned relative to moving horizon
        const cloudLayerHeight = h * this._cloudThickness;
        const cloudTopOffset = horizonY - (h * this._cloudHeight);
        const cloudStartY = cloudTopOffset;
        const cloudEndY = cloudStartY - cloudLayerHeight;

        const renderStartY = Math.max(0, Math.floor(cloudEndY));
        const renderEndY = Math.min(h, Math.ceil(cloudStartY));

        if (renderStartY >= renderEndY) return;

        const pixelStep = Math.max(1, Math.round(1 / this._cloudResolution));

        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = -(parentAngleDeg + (this._rotation.z || 0)) * (Math.PI / 180);

        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const fovFactor = Math.tan(fovRadians / 2);

        for (let y = renderStartY; y < renderEndY; y += pixelStep) {
            if (y < 0 || y >= h) continue;

            const verticalPos = (cloudStartY - y) / cloudLayerHeight;
            if (verticalPos < 0 || verticalPos > 1) continue;

            const depthFactor = 1.0 - verticalPos;
            const perspectiveScale = 1.0 + depthFactor * 2.0;
            const layerFade = Math.sin(verticalPos * Math.PI);

            for (let x = 0; x < w; x += pixelStep) {
                const screenX = (x / w - 0.5) * 2.0;
                const viewDirX = screenX * fovFactor * (w / h);

                const rotatedX = Math.cos(yaw) * viewDirX - Math.sin(yaw) * 1.0;
                const rotatedY = Math.sin(yaw) * viewDirX + Math.cos(yaw) * 1.0;

                const noiseX = (rotatedX * perspectiveScale + this._cloudTime * 0.1) / (this._cloudScale * 0.01);
                const noiseY = (rotatedY * perspectiveScale + this._cloudTime * 0.05) / (this._cloudScale * 0.01);

                const cloudNoise = this.generateCloudFBM(noiseX, noiseY, 3);

                let cloudAlpha = (cloudNoise - (1.0 - this._cloudDensity)) / this._cloudDensity;
                cloudAlpha = Math.max(0, Math.min(1, cloudAlpha));

                if (this._cloudSoftness > 0) {
                    cloudAlpha = Math.pow(cloudAlpha, 1.0 + this._cloudSoftness * 2);
                }

                cloudAlpha *= layerFade;

                if (cloudAlpha > 0.01) {
                    const lightRgb = this.hexToRgb(this._lightColor);
                    const cloudR = Math.round(255 * this._cloudBrightness * (lightRgb.r / 255));
                    const cloudG = Math.round(255 * this._cloudBrightness * (lightRgb.g / 255));
                    const cloudB = Math.round(255 * this._cloudBrightness * (lightRgb.b / 255));

                    for (let py = 0; py < pixelStep && y + py < h; py++) {
                        const rowStart = (y + py) * w;
                        for (let px = 0; px < pixelStep && x + px < w; px++) {
                            const pixelIdx = rowStart + (x + px);
                            const existing = buffer32[pixelIdx];

                            const existingR = existing & 0xFF;
                            const existingG = (existing >> 8) & 0xFF;
                            const existingB = (existing >> 16) & 0xFF;

                            const newR = Math.round(existingR * (1 - cloudAlpha) + cloudR * cloudAlpha);
                            const newG = Math.round(existingG * (1 - cloudAlpha) + cloudG * cloudAlpha);
                            const newB = Math.round(existingB * (1 - cloudAlpha) + cloudB * cloudAlpha);

                            buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                        }
                    }
                }
            }
        }
    }

    /**
 * Seeded random number generator for consistent hill generation
 * @param {number} seed - Seed value
 * @returns {Function} - Random function
 */
    createSeededRandom(seed) {
        return function () {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    /**
     * Generate hills profile for the entire 360-degree panorama
     * Uses seed-based generation for consistency
     * @returns {Array} - Array of height values (0-1) for each angle
     */
    generateHillsProfile() {
        const random = this.createSeededRandom(this._hillsSeed);
        const profile = [];
        const resolution = 360; // One height value per degree

        // Generate base octave heights using Perlin-like noise
        const octaves = 4;
        const heights = new Array(resolution).fill(0);

        for (let octave = 0; octave < octaves; octave++) {
            const frequency = Math.pow(2, octave) * this._hillsFrequency;
            const amplitude = Math.pow(0.5, octave);

            // Generate control points for this octave
            const numPoints = Math.max(4, Math.floor(resolution / (20 / frequency)));
            const controlPoints = [];

            for (let i = 0; i < numPoints; i++) {
                controlPoints.push({
                    angle: (i / numPoints) * 360,
                    height: random()
                });
            }

            // Interpolate between control points
            for (let angle = 0; angle < resolution; angle++) {
                const t = (angle / resolution) * numPoints;
                const idx0 = Math.floor(t) % numPoints;
                const idx1 = (idx0 + 1) % numPoints;
                const localT = t - Math.floor(t);

                // Cubic interpolation for smoothness
                const smoothT = localT * localT * (3 - 2 * localT);

                const h0 = controlPoints[idx0].height;
                const h1 = controlPoints[idx1].height;
                const interpolated = h0 + (h1 - h0) * smoothT;

                heights[angle] += interpolated * amplitude;
            }
        }

        // Normalize and apply roughness
        for (let angle = 0; angle < resolution; angle++) {
            let height = heights[angle];

            // Apply roughness (adds detail/jaggedness)
            if (this._hillsRoughness > 0) {
                const detailNoise = (random() - 0.5) * this._hillsRoughness * 0.2;
                height += detailNoise;
            }

            // Clamp and scale to min/max range
            height = Math.max(0, Math.min(1, height));
            height = this._hillsMinHeight + height * (this._hillsMaxHeight - this._hillsMinHeight);

            profile.push(height);
        }

        return profile;
    }

    /**
     * Get hills height at a specific angle (with caching)
     * @param {number} angle - Angle in degrees (0-360)
     * @returns {number} - Height (0-1)
     */
    getHillsHeightAtAngle(angle) {
        if (!this._hillsCache) {
            this._hillsCache = this.generateHillsProfile();
        }

        // Normalize angle to 0-360
        angle = ((angle % 360) + 360) % 360;

        // Get integer angle and interpolate for sub-degree precision
        const idx0 = Math.floor(angle) % 360;
        const idx1 = (idx0 + 1) % 360;
        const t = angle - Math.floor(angle);

        return this._hillsCache[idx0] + (this._hillsCache[idx1] - this._hillsCache[idx0]) * t;
    }

    /**
     * Render hills/mountains on the skybox
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} horizonY - Horizon line Y position
     */
    renderHills(buffer32, w, h, horizonY) {
        if (!this._hillsEnabled) return;

        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = (parentAngleDeg + (this._rotation.z || 0));

        const baseColor = this.hexToRgb(this._hillsBaseColor);
        const topColor = this.hexToRgb(this._hillsTopColor);
        const fogColor = this._fogEnabled ? this.hexToRgb(this._fogColor) : null;

        // Calculate FOV-based angle per pixel
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const fovDegrees = this._fieldOfView;
        const aspect = w / h;
        const horizontalFOV = 2 * Math.atan(Math.tan(fovRadians / 2) * aspect) * (180 / Math.PI);
        const degreesPerPixel = horizontalFOV / w;

        for (let x = 0; x < w; x++) {
            // Calculate view angle relative to camera center, accounting for FOV
            const pixelOffsetFromCenter = x - (w / 2);
            const viewAngle = pixelOffsetFromCenter * degreesPerPixel;
            const worldAngle = yaw + viewAngle;

            const hillHeight = this.getHillsHeightAtAngle(worldAngle);
            const hillPixelHeight = h * hillHeight;

            // Hills always end at horizon
            const hillTopY = horizonY - hillPixelHeight;
            const hillBottomY = horizonY;

            const distanceFactor = Math.abs((x - w / 2) / (w / 2)); // 0 at center, 1 at edges

            // Calculate total height for gradient
            const totalHeight = hillBottomY - hillTopY;
            if (totalHeight <= 0) continue;

            // Render ONLY visible pixels
            const renderStartY = Math.max(0, Math.floor(hillTopY));
            const renderEndY = Math.min(h, Math.ceil(hillBottomY));

            if (renderStartY >= h || renderEndY <= 0) continue;

            for (let y = renderStartY; y < renderEndY; y++) {
                // Calculate gradient position
                const heightGradient = (y - hillTopY) / totalHeight;

                // Interpolate between top and base color
                let r = Math.round(topColor.r + (baseColor.r - topColor.r) * heightGradient);
                let g = Math.round(topColor.g + (baseColor.g - topColor.g) * heightGradient);
                let b = Math.round(topColor.b + (baseColor.b - topColor.b) * heightGradient);

                // Apply fog color blending if enabled
                if (this._hillsUseFogColor && fogColor) {
                    const fogBlend = this._hillsFogBlend * distanceFactor;
                    r = Math.round(r * (1 - fogBlend) + fogColor.r * fogBlend);
                    g = Math.round(g * (1 - fogBlend) + fogColor.g * fogBlend);
                    b = Math.round(b * (1 - fogBlend) + fogColor.b * fogBlend);
                }

                const pixelIdx = y * w + x;
                buffer32[pixelIdx] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        }
    }

    /**
     * Render water reflections of hills and sun
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} horizonY - Horizon line Y position
     * @param {Vector2} sunPos - Sun position in screen space (optional)
     */
    renderWaterReflections(buffer32, w, h, horizonY, sunPos = null) {
        if (!this._waterEnabled || !this._waterReflectionEnabled) return;

        // Render sun reflection first if sun is visible
        if (sunPos && this._showSun) {
            this.renderSunReflection(buffer32, w, h, horizonY, sunPos);
        }

        // Then render hills reflection
        if (this._hillsEnabled) {
            this.renderHillsReflection(buffer32, w, h, horizonY);
        }
    }

    /**
     * Render sun reflection in water
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} horizonY - Horizon line Y position
     * @param {Vector2} sunPos - Sun position in screen space
     */
    renderSunReflection(buffer32, w, h, horizonY, sunPos) {
        // Calculate reflected sun position relative to horizon
        // The reflection should stay at horizon regardless of camera pitch
        const sunDistanceFromHorizon = horizonY - sunPos.y;

        // Only reflect if sun is above horizon
        if (sunDistanceFromHorizon < 0) return;

        // Reflection position is mirrored across horizon line
        // Use reduced distance for artistic effect
        const reflectionDistance = sunDistanceFromHorizon * 0.5;
        const reflectedSunY = horizonY + reflectionDistance;

        // Only render if reflection is visible in water area
        if (reflectedSunY < horizonY || reflectedSunY >= h) return;

        const centerX = Math.round(sunPos.x);
        const centerY = Math.round(reflectedSunY);

        // Parse light color for sun reflection
        const sunColor = this.hexToRgb(this._lightColor);

        // Sun reflection properties (slightly different from direct sun)
        const reflectionOpacity = this._waterReflectionOpacity * 0.8; // Slightly dimmer
        const coreRadius = this._sunSize * 0.7; // Smaller core
        const glowRadius = this._sunGlowSize * 0.5; // Less glow

        // Calculate distance from horizon for fade effect
        const distanceFromHorizon = centerY - horizonY;
        const maxDistance = h - horizonY;
        const distanceFade = 1.0 - Math.min(1.0, distanceFromHorizon / maxDistance);

        // Draw glow first (outer to inner for proper alpha blending)
        const minGlowX = Math.max(0, centerX - glowRadius);
        const maxGlowX = Math.min(w - 1, centerX + glowRadius);
        const minGlowY = Math.max(Math.ceil(horizonY), centerY - glowRadius);
        const maxGlowY = Math.min(h - 1, centerY + glowRadius);

        for (let y = minGlowY; y <= maxGlowY; y++) {
            // Apply wave distortion to Y coordinate
            const waveOffset = Math.sin((y / h) * Math.PI * 4 + this._waterTime) *
                this._waterReflectionDistortion * h * 0.5;

            for (let x = minGlowX; x <= maxGlowX; x++) {
                // Apply wave distortion to X coordinate
                const xWaveOffset = Math.sin((x / w) * Math.PI * 8 + this._waterTime * 1.3) *
                    this._waterReflectionDistortion * w * 0.3;

                const distortedX = x + xWaveOffset;
                const distortedY = y + waveOffset;

                const dx = distortedX - centerX;
                const dy = distortedY - centerY;
                const distSq = dx * dx + dy * dy;
                const glowRadiusSq = glowRadius * glowRadius;

                if (distSq <= glowRadiusSq) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1.0 - (distance / glowRadius);
                    const alpha = falloff * falloff * 0.2 * reflectionOpacity * distanceFade;

                    if (alpha > 0.01) {
                        const pixelIdx = y * w + x;
                        const existing = buffer32[pixelIdx];

                        const existingR = existing & 0xFF;
                        const existingG = (existing >> 8) & 0xFF;
                        const existingB = (existing >> 16) & 0xFF;

                        const newR = Math.min(255, Math.round(existingR + sunColor.r * alpha));
                        const newG = Math.min(255, Math.round(existingG + sunColor.g * alpha));
                        const newB = Math.min(255, Math.round(existingB + sunColor.b * alpha));

                        buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                    }
                }
            }
        }

        // Draw sun core (bright center)
        const minCoreX = Math.max(0, centerX - coreRadius);
        const maxCoreX = Math.min(w - 1, centerX + coreRadius);
        const minCoreY = Math.max(Math.ceil(horizonY), centerY - coreRadius);
        const maxCoreY = Math.min(h - 1, centerY + coreRadius);

        for (let y = minCoreY; y <= maxCoreY; y++) {
            // Apply wave distortion
            const waveOffset = Math.sin((y / h) * Math.PI * 4 + this._waterTime) *
                this._waterReflectionDistortion * h * 0.5;

            for (let x = minCoreX; x <= maxCoreX; x++) {
                const xWaveOffset = Math.sin((x / w) * Math.PI * 8 + this._waterTime * 1.3) *
                    this._waterReflectionDistortion * w * 0.3;

                const distortedX = x + xWaveOffset;
                const distortedY = y + waveOffset;

                const dx = distortedX - centerX;
                const dy = distortedY - centerY;
                const distSq = dx * dx + dy * dy;
                const coreRadiusSq = coreRadius * coreRadius;

                if (distSq <= coreRadiusSq) {
                    const distance = Math.sqrt(distSq);
                    const falloff = 1.0 - (distance / coreRadius);
                    const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
                    const intensity = 0.5 + smoothFalloff * 0.3;

                    const pixelIdx = y * w + x;
                    const existing = buffer32[pixelIdx];

                    const existingR = existing & 0xFF;
                    const existingG = (existing >> 8) & 0xFF;
                    const existingB = (existing >> 16) & 0xFF;

                    const alpha = intensity * reflectionOpacity * distanceFade;
                    const newR = Math.min(255, Math.round(existingR * (1 - alpha) + 255 * alpha));
                    const newG = Math.min(255, Math.round(existingG * (1 - alpha) + 255 * alpha));
                    const newB = Math.min(255, Math.round(existingB * (1 - alpha) + 255 * alpha));

                    buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                }
            }
        }
    }

    /**
     * Render hills reflection in water (extracted from renderWaterReflections)
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} horizonY - Horizon line Y position
     */
    renderHillsReflection(buffer32, w, h, horizonY) {
        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = (parentAngleDeg + (this._rotation.z || 0));

        const baseColor = this.hexToRgb(this._hillsBaseColor);
        const topColor = this.hexToRgb(this._hillsTopColor);

        // Calculate FOV-based angle per pixel (same as renderHills)
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const aspect = w / h;
        const horizontalFOV = 2 * Math.atan(Math.tan(fovRadians / 2) * aspect) * (180 / Math.PI);
        const degreesPerPixel = horizontalFOV / w;

        for (let x = 0; x < w; x++) {
            const pixelOffsetFromCenter = x - (w / 2);
            const viewAngle = pixelOffsetFromCenter * degreesPerPixel;
            const worldAngle = yaw + viewAngle;

            const hillHeight = this.getHillsHeightAtAngle(worldAngle);
            const hillPixelHeight = h * hillHeight;
            const hillTopY = horizonY - hillPixelHeight;
            const hillBottomY = horizonY;

            if (hillPixelHeight <= 0) continue;

            const distanceFactor = Math.abs((x - w / 2) / (w / 2));

            const reflectionStartY = Math.ceil(horizonY);
            const reflectionEndY = Math.ceil(horizonY + hillPixelHeight);

            const renderStartY = Math.max(0, reflectionStartY);
            const renderEndY = Math.min(h, reflectionEndY);

            if (renderStartY >= renderEndY) continue;

            for (let y = renderStartY; y < renderEndY; y++) {
                const offsetFromHorizon = y - horizonY;

                const waveOffset = Math.sin((x / w) * Math.PI * 4 + this._waterTime) *
                    this._waterReflectionDistortion * h;

                const sourceY = horizonY - offsetFromHorizon + waveOffset;

                const totalHeight = hillBottomY - hillTopY;
                if (totalHeight <= 0) continue;

                const positionInHill = sourceY - hillTopY;
                const clampedPositionInHill = Math.max(0, Math.min(totalHeight, positionInHill));
                const heightGradient = clampedPositionInHill / totalHeight;

                let r = Math.round(topColor.r + (baseColor.r - topColor.r) * heightGradient);
                let g = Math.round(topColor.g + (baseColor.g - topColor.g) * heightGradient);
                let b = Math.round(topColor.b + (baseColor.b - topColor.b) * heightGradient);

                const pixelIdx = y * w + x;
                const existing = buffer32[pixelIdx];
                const existingR = existing & 0xFF;
                const existingG = (existing >> 8) & 0xFF;
                const existingB = (existing >> 16) & 0xFF;

                const reflectionProgress = (y - reflectionStartY) / (reflectionEndY - reflectionStartY);
                const reflectionFade = 1.0 - reflectionProgress;
                const opacity = this._waterReflectionOpacity * reflectionFade * (1 - distanceFactor * 0.5);

                r = Math.round(existingR * (1 - opacity) + r * opacity);
                g = Math.round(existingG * (1 - opacity) + g * opacity);
                b = Math.round(existingB * (1 - opacity) + b * opacity);

                buffer32[pixelIdx] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        }
    }

    /**
     * Fast background clearing using 32-bit writes
     */
    clearBackgroundFast(buffer32, w, h) {
        if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            const bgPixel = (255 << 24) | (bgColor.b << 16) | (bgColor.g << 8) | bgColor.r;
            buffer32.fill(bgPixel);
        } else if (this._backgroundType === "skybox") {
            // Calculate horizon position based on camera pitch
            const fovRadians = this._fieldOfView * (Math.PI / 180);
            const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);

            // Calculate how pitch affects horizon position (reduced intensity)
            // Horizon moves up when looking down (negative pitch), down when looking up (positive pitch)
            const fovHalfRadians = fovRadians / 2;
            const pitchFactor = (-pitchRadians / fovHalfRadians) * 0.6; // Reduced from 1.0 to 0.6
            const horizonY = (h * 0.5) + (h * pitchFactor);

            // Large gradient heights to cover entire screen regardless of horizon position
            const skyGradientHeight = h * 2.0;
            const floorGradientHeight = h * 2.0;

            // Sky gradient - extends upward from horizon
            const skyStartY = horizonY - skyGradientHeight;
            const skyEndY = horizonY;

            // Floor gradient - extends downward from horizon
            const floorStartY = horizonY;
            const floorEndY = horizonY + floorGradientHeight;

            // Render all visible pixels
            for (let y = 0; y < h; y++) {
                let color;

                if (y < horizonY) {
                    // Sky region
                    const gradientPos = Math.max(0, Math.min(1, (y - skyStartY) / (skyEndY - skyStartY)));
                    color = this.interpolateColor(this._skyColor, this._skyColorHorizon, gradientPos);
                } else {
                    // Floor region
                    const gradientPos = Math.max(0, Math.min(1, (y - floorStartY) / (floorEndY - floorStartY)));

                    if (this._waterEnabled) {
                        // Animated water
                        const yOffset = y - horizonY;
                        const primaryWave = (yOffset / this._waterWaveHeight) + this._waterTime;
                        const secondaryWave = (yOffset / (this._waterWaveHeight * 2.3)) + this._waterTime * 0.7;
                        const tertiaryWave = (yOffset / (this._waterWaveHeight * 4.1)) + this._waterTime * 1.3;

                        const baseWaveOffset = (
                            Math.sin(primaryWave) * 0.035 +
                            Math.sin(secondaryWave) * 0.020 +
                            Math.sin(tertiaryWave) * 0.015
                        ) * gradientPos * gradientPos;

                        const animatedT = Math.max(0, Math.min(1, gradientPos + baseWaveOffset));
                        color = this.interpolateColor(this._floorColorHorizon, this._floorColor, animatedT);
                    } else {
                        color = this.interpolateColor(this._floorColorHorizon, this._floorColor, gradientPos);
                    }
                }

                const pixel = (255 << 24) | (color.b << 16) | (color.g << 8) | color.r;
                const rowStart = y * w;
                for (let x = 0; x < w; x++) {
                    buffer32[rowStart + x] = pixel;
                }
            }

            // Update water animation time
            if (this._waterEnabled) {
                this._waterTime += 0.016 * this._waterSpeed;
            }

            // Draw sun on top of sky gradient and hills (if visible and above horizon)
            const sunPos = this.calculateSunPosition();
            if (sunPos && sunPos.y < horizonY) { // Only draw if sun position is above horizon line
                this.drawSun(buffer32, w, h, sunPos);

                // Draw lens flare if enabled
                if (this._lensFlareEnabled) {
                    this.drawLensFlare(buffer32, w, h, sunPos);
                }
            }

            // Draw hills if enabled (BEFORE sun/clouds/water reflections)
            if (this._hillsEnabled) {
                this.renderHills(buffer32, w, h, horizonY);
            }

            // Draw water reflections if enabled (sun + hills) - pass sunPos
            if (this._waterEnabled && this._waterReflectionEnabled) {
                this.renderWaterReflections(buffer32, w, h, horizonY, sunPos);
            }

            // Draw clouds if enabled (AFTER sun so clouds can partially obscure it)
            if (this._cloudsEnabled) {
                this.renderClouds(buffer32, w, h, horizonY);
            }
        } else if (this._backgroundType === "transparent") {
            buffer32.fill(0);
        }
    }

    /**
     * Ultra-fast scanline triangle rasterization
     * Uses edge-walking for maximum performance
     */
    rasterizeTriangleFast(tri, buffer32, w, h) {
        const p0 = { x: Math.round(tri.v0.screen.x), y: Math.round(tri.v0.screen.y) };
        const p1 = { x: Math.round(tri.v1.screen.x), y: Math.round(tri.v1.screen.y) };
        const p2 = { x: Math.round(tri.v2.screen.x), y: Math.round(tri.v2.screen.y) };

        // Calculate bounding box
        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));

        if (minX > maxX || minY > maxY) return;

        // Edge setup
        const v0x = p0.x, v0y = p0.y;
        const v1x = p1.x, v1y = p1.y;
        const v2x = p2.x, v2y = p2.y;

        const e0_dx = v1x - v0x, e0_dy = v1y - v0y;
        const e1_dx = v2x - v1x, e1_dy = v2y - v1y;
        const e2_dx = v0x - v2x, e2_dy = v0y - v2y;

        const area = e0_dx * (v2y - v0y) - e0_dy * (v2x - v0x);
        if (Math.abs(area) < 0.5) return;

        // Check if material has a texture
        const material = tri.material;
        const hasTexture = material && (material.getDiffuseTexture() || material._useProceduralTexture);

        if (hasTexture) {
            // Get texture
            const texture = material.getDiffuseTexture();
            if (!texture) return; // Texture not loaded yet

            // Get UVs
            const uv0 = tri.uv0 || new Vector2(0, 0);
            const uv1 = tri.uv1 || new Vector2(0, 0);
            const uv2 = tri.uv2 || new Vector2(0, 0);

            // Pre-calculate barycentric denominators
            const invArea = 1.0 / area;

            // Precalculate depths at vertices
            const d0 = tri.v0.depth;
            const d1 = tri.v1.depth;
            const d2 = tri.v2.depth;

            // Early depth rejection if triangle is entirely behind something
            const minDepth = Math.min(d0, d1, d2);


            // Scanline loop with texture sampling
            for (let y = minY; y <= maxY; y++) {
                let w0 = e0_dx * (y - v0y) - e0_dy * (minX - v0x);
                let w1 = e1_dx * (y - v1y) - e1_dy * (minX - v1x);
                let w2 = e2_dx * (y - v2y) - e2_dy * (minX - v2x);

                const w0_step = -e0_dy;
                const w1_step = -e1_dy;
                const w2_step = -e2_dy;

                const rowOffset = y * w;

                for (let x = minX; x <= maxX; x++) {
                    if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                        const pixelIdx = rowOffset + x;

                        // Quick depth test BEFORE barycentric interpolation
                        if (this._zBuffer && minDepth > this._zBuffer[pixelIdx]) {
                            w0 += w0_step;
                            w1 += w1_step;
                            w2 += w2_step;
                            continue;
                        }

                        // Calculate barycentric for accurate depth
                        const lambda0 = ((v1y - v2y) * (x - v2x) + (v2x - v1x) * (y - v2y)) * invArea;
                        const lambda1 = ((v2y - v0y) * (x - v2x) + (v0x - v2x) * (y - v2y)) * invArea;
                        const lambda2 = 1.0 - lambda0 - lambda1;

                        const depth = d0 * lambda0 + d1 * lambda1 + d2 * lambda2;

                        // Z-buffer test
                        if (this._zBuffer && depth >= this._zBuffer[pixelIdx]) {
                            w0 += w0_step;
                            w1 += w1_step;
                            w2 += w2_step;
                            continue;
                        }

                        if (this._zBuffer) {
                            this._zBuffer[pixelIdx] = depth;
                        }

                        // Interpolate UV coordinates
                        const u = uv0.x * lambda0 + uv1.x * lambda1 + uv2.x * lambda2;
                        const v = uv0.y * lambda0 + uv1.y * lambda1 + uv2.y * lambda2;

                        // Sample texture
                        const textureColor = material.sampleTexture(u, v, texture);

                        // Parse texture color (returns rgba string)
                        const match = textureColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                        if (match) {
                            const baseR = parseInt(match[1]);
                            const baseG = parseInt(match[2]);
                            const baseB = parseInt(match[3]);

                            // Apply lighting (use pre-calculated lit color from tri.packedColor)
                            // Extract RGB from packed color
                            const litR = tri.packedColor & 0xFF;
                            const litG = (tri.packedColor >> 8) & 0xFF;
                            const litB = (tri.packedColor >> 16) & 0xFF;

                            // Blend texture with lighting
                            const finalR = Math.round((baseR / 255) * litR);
                            const finalG = Math.round((baseG / 255) * litG);
                            const finalB = Math.round((baseB / 255) * litB);

                            // Pack into 32-bit color
                            const packedColor = (255 << 24) | (finalB << 16) | (finalG << 8) | finalR;
                            buffer32[rowOffset + x] = packedColor;
                        }
                    }

                    w0 += w0_step;
                    w1 += w1_step;
                    w2 += w2_step;
                }
            }
        } else {
            // Original solid color rendering (existing code)
            const packedColor = tri.packedColor;

            for (let y = minY; y <= maxY; y++) {
                let w0 = e0_dx * (y - v0y) - e0_dy * (minX - v0x);
                let w1 = e1_dx * (y - v1y) - e1_dy * (minX - v1x);
                let w2 = e2_dx * (y - v2y) - e2_dy * (minX - v2x);

                const w0_step = -e0_dy;
                const w1_step = -e1_dy;
                const w2_step = -e2_dy;

                const rowOffset = y * w;

                for (let x = minX; x <= maxX; x++) {
                    if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                        buffer32[rowOffset + x] = packedColor;
                    }

                    w0 += w0_step;
                    w1 += w1_step;
                    w2 += w2_step;
                }
            }
        }
    }

    /**
     * Calculate specular highlight position in screen space
     * @param {Object} tri - Triangle with world vertices and normal
     * @param {Array} projectedVerts - Screen space vertices [p0, p1, p2]
     * @returns {Object|null} - Specular data or null if no highlight
     */
    calculateSpecularHighlight(tri, projectedVerts) {
        const material = tri.material;
        if (!material) return null;

        const specularColor = this.hexToRgb(material._specularColor || "#FFFFFF");
        const shininess = material._shininess || 32;

        // If specular color is black, skip
        if (specularColor.r === 0 && specularColor.g === 0 && specularColor.b === 0) {
            return null;
        }

        // Get camera world position
        const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
            this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        let goDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                goDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                goDepth = this.gameObject.depth;
            }
        }
        const camWorldPos = {
            x: (goPos.x || 0) + (this._position.x || 0),
            y: (goPos.y || 0) + (this._position.y || 0),
            z: goDepth + (this._position.z || 0)
        };

        // Calculate triangle center in world space
        const worldVerts = tri.worldVerts || [tri.v0, tri.v1, tri.v2];
        const centerX = (worldVerts[0].x + worldVerts[1].x + worldVerts[2].x) / 3;
        const centerY = (worldVerts[0].y + worldVerts[1].y + worldVerts[2].y) / 3;
        const centerZ = (worldVerts[0].z + worldVerts[1].z + worldVerts[2].z) / 3;

        // View direction = camera position - triangle center
        const viewDir = {
            x: camWorldPos.x - centerX,
            y: camWorldPos.y - centerY,
            z: camWorldPos.z - centerZ
        };
        const viewLen = Math.sqrt(viewDir.x ** 2 + viewDir.y ** 2 + viewDir.z ** 2);
        if (viewLen < 0.0001) return null;

        viewDir.x /= viewLen;
        viewDir.y /= viewLen;
        viewDir.z /= viewLen;

        // Normalize world normal
        const worldNormal = tri.worldNormal;
        const normalLen = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2);
        if (normalLen < 0.0001) return null;

        const n = {
            x: worldNormal.x / normalLen,
            y: worldNormal.y / normalLen,
            z: worldNormal.z / normalLen
        };

        // Normalize light direction
        const lightDir = this._lightDirection;
        const lightLen = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
        const normalizedLightDir = {
            x: lightDir.x / lightLen,
            y: lightDir.y / lightLen,
            z: lightDir.z / lightLen
        };

        // Calculate reflection direction: R = 2(N·L)N - L
        const dotNL = n.x * (-normalizedLightDir.x) + n.y * (-normalizedLightDir.y) + n.z * (-normalizedLightDir.z);

        // Early exit if surface is facing away from light
        if (dotNL <= 0) return null;

        const reflectDir = {
            x: 2 * dotNL * n.x - (-normalizedLightDir.x),
            y: 2 * dotNL * n.y - (-normalizedLightDir.y),
            z: 2 * dotNL * n.z - (-normalizedLightDir.z)
        };

        // Calculate specular intensity using Phong model: (R·V)^shininess
        const dotRV = Math.max(0, reflectDir.x * viewDir.x + reflectDir.y * viewDir.y + reflectDir.z * viewDir.z);
        const specularIntensity = Math.pow(dotRV, shininess) * this._lightIntensity;

        // Early exit if intensity too low
        if (specularIntensity < 0.01) return null;

        // Calculate specular highlight offset in world space
        const offsetDistance = 0.5;
        const highlightWorldPos = {
            x: centerX + reflectDir.x * offsetDistance,
            y: centerY + reflectDir.y * offsetDistance,
            z: centerZ + reflectDir.z * offsetDistance
        };

        // Transform highlight position to camera space and project to screen
        const highlightCameraPos = this.worldToCameraSpace(highlightWorldPos);

        // Skip if highlight is behind camera
        if (highlightCameraPos.x <= this._nearPlane) return null;

        const highlightScreenPos = this.projectCameraPoint(highlightCameraPos);
        if (!highlightScreenPos) return null;

        // Calculate highlight radius based on triangle size, distance, and shininess
        const triangleSize = Math.max(
            Math.abs(projectedVerts[1].x - projectedVerts[0].x),
            Math.abs(projectedVerts[2].x - projectedVerts[0].x),
            Math.abs(projectedVerts[1].y - projectedVerts[0].y),
            Math.abs(projectedVerts[2].y - projectedVerts[0].y)
        );

        // Radius decreases with higher shininess (tighter highlights) and distance
        const baseRadius = triangleSize * 0.3;
        const shininessScale = Math.max(0.1, 1.0 - (shininess / 256));
        const distanceScale = Math.max(0.5, Math.min(1.0, 100 / highlightCameraPos.x));
        const highlightRadius = baseRadius * shininessScale * distanceScale;

        return {
            centerX: highlightScreenPos.x,
            centerY: highlightScreenPos.y,
            radius: Math.max(3, highlightRadius), // Minimum radius to prevent division issues
            intensity: specularIntensity,
            color: specularColor,
            depth: highlightCameraPos.x, // Store depth for occlusion testing
            cameraPos: highlightCameraPos, // Store camera space position for occlusion testing
            triangleBounds: {
                minX: Math.min(projectedVerts[0].x, projectedVerts[1].x, projectedVerts[2].x),
                maxX: Math.max(projectedVerts[0].x, projectedVerts[1].x, projectedVerts[2].x),
                minY: Math.min(projectedVerts[0].y, projectedVerts[1].y, projectedVerts[2].y),
                maxY: Math.max(projectedVerts[0].y, projectedVerts[1].y, projectedVerts[2].y),
                v0: projectedVerts[0],
                v1: projectedVerts[1],
                v2: projectedVerts[2]
            }
        };
    }

    /**
     * Calculate specular highlights per mesh instead of per triangle
     * @param {Map} meshSpecularData - Map of mesh specular data
     * @param {Array} specularHighlights - Array to store final specular highlights
     */
    calculateMeshSpecularHighlights(meshSpecularData, specularHighlights) {
        meshSpecularData.forEach((meshData, mesh) => {
            const material = meshData.mesh.material;
            if (!material || !material._specularColor) return;

            const specularColor = this.hexToRgb(material._specularColor || "#FFFFFF");
            const shininess = material._shininess || 32;

            // If specular color is black, skip
            if (specularColor.r === 0 && specularColor.g === 0 && specularColor.b === 0) {
                return;
            }

            // Get camera world position
            const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
                this.gameObject.getWorldPosition() : { x: 0, y: 0 };
            let goDepth = 0;
            if (this.gameObject) {
                if (typeof this.gameObject.getWorldDepth === 'function') {
                    goDepth = this.gameObject.getWorldDepth();
                } else if (typeof this.gameObject.depth === 'number') {
                    goDepth = this.gameObject.depth;
                }
            }
            const camWorldPos = {
                x: (goPos.x || 0) + (this._position.x || 0),
                y: (goPos.y || 0) + (this._position.y || 0),
                z: goDepth + (this._position.z || 0)
            };

            // Process each triangle to create individual specular highlights that respect triangle bounds
            meshData.triangles.forEach((tri, triIndex) => {
                const worldVerts = tri.worldVerts;
                const worldNormal = meshData.worldNormals[triIndex];

                // Calculate triangle center in world space
                const centerX = (worldVerts[0].x + worldVerts[1].x + worldVerts[2].x) / 3;
                const centerY = (worldVerts[0].y + worldVerts[1].y + worldVerts[2].y) / 3;
                const centerZ = (worldVerts[0].z + worldVerts[1].z + worldVerts[2].z) / 3;

                // View direction = camera position - triangle center
                const viewDir = {
                    x: camWorldPos.x - centerX,
                    y: camWorldPos.y - centerY,
                    z: camWorldPos.z - centerZ
                };
                const viewLen = Math.sqrt(viewDir.x ** 2 + viewDir.y ** 2 + viewDir.z ** 2);
                if (viewLen < 0.0001) return;

                viewDir.x /= viewLen;
                viewDir.y /= viewLen;
                viewDir.z /= viewLen;

                // Normalize world normal
                const normalLen = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2);
                if (normalLen < 0.0001) return;

                const normalizedNormal = {
                    x: worldNormal.x / normalLen,
                    y: worldNormal.y / normalLen,
                    z: worldNormal.z / normalLen
                };

                // Normalize light direction
                const lightDir = this._lightDirection;
                const lightLen = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
                const normalizedLightDir = {
                    x: lightDir.x / lightLen,
                    y: lightDir.y / lightLen,
                    z: lightDir.z / lightLen
                };

                // Calculate reflection direction: R = 2(N·L)N - L
                const dotNL = normalizedNormal.x * (-normalizedLightDir.x) + normalizedNormal.y * (-normalizedLightDir.y) + normalizedNormal.z * (-normalizedLightDir.z);

                // Early exit if surface is facing away from light
                if (dotNL <= 0) return;

                const reflectDir = {
                    x: 2 * dotNL * normalizedNormal.x - (-normalizedLightDir.x),
                    y: 2 * dotNL * normalizedNormal.y - (-normalizedLightDir.y),
                    z: 2 * dotNL * normalizedNormal.z - (-normalizedLightDir.z)
                };

                // Calculate specular intensity using Phong model: (R·V)^shininess
                const dotRV = Math.max(0, reflectDir.x * viewDir.x + reflectDir.y * viewDir.y + reflectDir.z * viewDir.z);
                const specularIntensity = Math.pow(dotRV, shininess) * this._lightIntensity;

                // Early exit if intensity too low
                if (specularIntensity < 0.01) return;

                // Calculate specular highlight offset in world space
                const offsetDistance = 0.5;
                const highlightWorldPos = {
                    x: centerX + reflectDir.x * offsetDistance,
                    y: centerY + reflectDir.y * offsetDistance,
                    z: centerZ + reflectDir.z * offsetDistance
                };

                // Transform highlight position to camera space and project to screen
                const highlightCameraPos = this.worldToCameraSpace(highlightWorldPos);

                // Skip if highlight is behind camera
                if (highlightCameraPos.x <= this._nearPlane) return;

                const highlightScreenPos = this.projectCameraPoint(highlightCameraPos);
                if (!highlightScreenPos) return;

                // Get screen-space triangle vertices for this specific triangle
                const projectedVerts = [
                    tri.v0.screen,
                    tri.v1.screen,
                    tri.v2.screen
                ];

                // Calculate highlight radius based on triangle size
                const triangleSize = Math.max(
                    Math.abs(projectedVerts[1].x - projectedVerts[0].x),
                    Math.abs(projectedVerts[2].x - projectedVerts[0].x),
                    Math.abs(projectedVerts[1].y - projectedVerts[0].y),
                    Math.abs(projectedVerts[2].y - projectedVerts[0].y)
                );

                // Radius decreases with higher shininess (tighter highlights)
                const baseRadius = triangleSize * 0.3;
                const shininessScale = Math.max(0.1, 1.0 - (shininess / 256));
                const highlightRadius = baseRadius * shininessScale;

                // Create specular highlight for this triangle
                const specularHighlight = {
                    centerX: highlightScreenPos.x,
                    centerY: highlightScreenPos.y,
                    radius: highlightRadius,
                    intensity: specularIntensity,
                    color: specularColor,
                    depth: highlightCameraPos.x, // Store depth for occlusion testing
                    cameraPos: highlightCameraPos, // Store camera space position for occlusion testing
                    triangleBounds: {
                        minX: Math.min(projectedVerts[0].x, projectedVerts[1].x, projectedVerts[2].x),
                        maxX: Math.max(projectedVerts[0].x, projectedVerts[1].x, projectedVerts[2].x),
                        minY: Math.min(projectedVerts[0].y, projectedVerts[1].y, projectedVerts[2].y),
                        maxY: Math.max(projectedVerts[0].y, projectedVerts[1].y, projectedVerts[2].y),
                        v0: projectedVerts[0],
                        v1: projectedVerts[1],
                        v2: projectedVerts[2]
                    },
                    isMeshSpecular: true
                };

                specularHighlights.push(specularHighlight);
            });
        });
    }

    /**
     * Render specular highlights as circular gradients with occlusion testing
     * @param {Array} specularHighlights - Array of specular highlight data
     * @param {ImageData} imgData - Image data to draw on
     * @param {number} w - Width
     * @param {number} h - Height
     */
    renderSpecularHighlights(specularHighlights, imgData, w, h) {
        const data = imgData.data;
        const buffer32 = new Uint32Array(imgData.data.buffer);

        const bgColors = [
            this.hexToRgb(this._skyColor),
            this.hexToRgb(this._floorColor),
            this.hexToRgb(this._backgroundColor)
        ];

        specularHighlights.forEach(highlight => {
            const { centerX, centerY, radius, intensity, color, triangleBounds, depth, cameraPos, fogFactor } = highlight;

            // Skip specular if too much fog (>90% fog coverage)
            if (fogFactor !== undefined && fogFactor > 0.9) {
                return;
            }

            // Skip if highlight center is occluded
            if (cameraPos && this.isPointOccluded(cameraPos, this._allTrianglesCache)) {
                return;
            }

            // Reduce specular intensity based on fog
            const fogAdjustedIntensity = fogFactor !== undefined ?
                intensity * (1 - fogFactor) : intensity;

            if (fogAdjustedIntensity < 0.01) return;

            // Create fog-adjusted highlight
            const fogAdjustedHighlight = {
                ...highlight,
                intensity: fogAdjustedIntensity
            };

            if (this._specularFullFace) {
                this.renderFullFaceSpecular(fogAdjustedHighlight, buffer32, data, w, h, bgColors);
            } else {
                this.renderGradientSpecular(fogAdjustedHighlight, buffer32, data, w, h, bgColors);
            }

            // Add bloom effect if enabled and intensity is above threshold (also affected by fog)
            if (this._specularBloomEnabled && fogAdjustedIntensity >= this._specularBloomThreshold) {
                this.renderSpecularBloom(fogAdjustedHighlight, buffer32, data, w, h);
            }
        });
    }

    /**
     * Render specular bloom effect (bleeding beyond geometry)
     * @param {Object} highlight - Specular highlight data
     * @param {Uint32Array} buffer32 - 32-bit pixel buffer
     * @param {Uint8ClampedArray} data - Image data array
     * @param {number} w - Width
     * @param {number} h - Height
     */
    renderSpecularBloom(highlight, buffer32, data, w, h) {
        const { centerX, centerY, radius, intensity, color } = highlight;

        // Calculate bloom radius (larger than base specular)
        const bloomRadius = radius * this._specularBloomRadius;
        const bloomIntensity = intensity * this._specularBloomIntensity;

        // Calculate bounding box (NOT constrained to triangle - full bleed)
        const minX = Math.max(0, Math.floor(centerX - bloomRadius));
        const maxX = Math.min(w - 1, Math.ceil(centerX + bloomRadius));
        const minY = Math.max(0, Math.floor(centerY - bloomRadius));
        const maxY = Math.min(h - 1, Math.ceil(centerY + bloomRadius));

        if (minX > maxX || minY > maxY) return;

        const radiusSq = bloomRadius * bloomRadius;
        const invRadiusSq = 1.0 / radiusSq;

        // Optimization: Sample every N pixels when radius is large
        const pixelStep = bloomRadius > 80 ? 2 : 1;

        // Render bloom with softer falloff - NO TRIANGLE BOUNDS CHECKING
        for (let y = minY; y <= maxY; y += pixelStep) {
            const dy = y - centerY;
            const dySq = dy * dy;

            for (let x = minX; x <= maxX; x += pixelStep) {
                const dx = x - centerX;
                const distSq = dx * dx + dySq;

                if (distSq <= radiusSq) {
                    const pixelIdx = y * w + x;
                    const existing = buffer32[pixelIdx];
                    const existingR = existing & 0xFF;
                    const existingG = (existing >> 8) & 0xFF;
                    const existingB = (existing >> 16) & 0xFF;

                    // Calculate bloom falloff (softer than regular specular)
                    const normalizedDistSq = distSq * invRadiusSq;
                    const falloff = 1.0 - Math.sqrt(normalizedDistSq);

                    // Extra smooth falloff for bloom (cubic for softer edges)
                    const smoothFalloff = falloff * falloff * falloff;
                    const alpha = bloomIntensity * smoothFalloff;

                    if (alpha > 0.005) { // Lower threshold for bloom
                        const dataIdx = pixelIdx * 4;

                        // Additive blending for bloom effect
                        const bloomR = Math.min(255, Math.round(existingR + color.r * alpha));
                        const bloomG = Math.min(255, Math.round(existingG + color.g * alpha));
                        const bloomB = Math.min(255, Math.round(existingB + color.b * alpha));

                        data[dataIdx] = bloomR;
                        data[dataIdx + 1] = bloomG;
                        data[dataIdx + 2] = bloomB;

                        // Fill adjacent pixels if using step optimization
                        if (pixelStep > 1) {
                            for (let py = 0; py < pixelStep && y + py <= maxY; py++) {
                                for (let px = 0; px < pixelStep && x + px <= maxX; px++) {
                                    if (px === 0 && py === 0) continue;
                                    const fillIdx = (y + py) * w + (x + px);
                                    const fillDataIdx = fillIdx * 4;

                                    // Make sure we're within bounds
                                    if (fillIdx >= 0 && fillIdx < w * h) {
                                        data[fillDataIdx] = bloomR;
                                        data[fillDataIdx + 1] = bloomG;
                                        data[fillDataIdx + 2] = bloomB;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Render full-face specular highlighting
     */
    renderFullFaceSpecular(highlight, buffer32, data, w, h, bgColors) {
        const { intensity, color, triangleBounds } = highlight;
        const tolerance = 5;

        // Get triangle bounds
        const minX = Math.max(0, Math.floor(triangleBounds.minX));
        const maxX = Math.min(w - 1, Math.ceil(triangleBounds.maxX));
        const minY = Math.max(0, Math.floor(triangleBounds.minY));
        const maxY = Math.min(h - 1, Math.ceil(triangleBounds.maxY));

        if (minX > maxX || minY > maxY) return;

        // Pre-calculate edge functions for triangle bounds checking
        const p0 = { x: triangleBounds.v0.x, y: triangleBounds.v0.y };
        const p1 = { x: triangleBounds.v1.x, y: triangleBounds.v1.y };
        const p2 = { x: triangleBounds.v2.x, y: triangleBounds.v2.y };

        const e0_dx = p1.x - p0.x; const e0_dy = p1.y - p0.y;
        const e1_dx = p2.x - p1.x; const e1_dy = p2.y - p1.y;
        const e2_dx = p0.x - p2.x; const e2_dy = p0.y - p2.y;

        // Limit intensity
        const maxIntensity = 1.0; // No longer limited by bleeding
        const limitedIntensity = Math.min(intensity, maxIntensity);

        // Apply uniform specular to all pixels in triangle
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Check if pixel is inside triangle
                const w0 = e0_dx * (y - p0.y) - e0_dy * (x - p0.x);
                const w1 = e1_dx * (y - p1.y) - e1_dy * (x - p1.x);
                const w2 = e2_dx * (y - p2.y) - e2_dy * (x - p2.x);

                if (w0 < 0 || w1 < 0 || w2 < 0) continue;

                const pixelIdx = y * w + x;
                const existing = buffer32[pixelIdx];
                const existingR = existing & 0xFF;
                const existingG = (existing >> 8) & 0xFF;
                const existingB = (existing >> 16) & 0xFF;

                // Check if pixel is background (skip if not bleeding)
                if (!this._specularBleedingEnabled) {
                    let isBackground = false;
                    for (const bgColor of bgColors) {
                        if (Math.abs(existingR - bgColor.r) <= tolerance &&
                            Math.abs(existingG - bgColor.g) <= tolerance &&
                            Math.abs(existingB - bgColor.b) <= tolerance) {
                            isBackground = true;
                            break;
                        }
                    }
                    if (isBackground) continue;
                }

                // Apply uniform specular intensity
                const dataIdx = pixelIdx * 4;
                const specR = Math.min(255, existingR + color.r * limitedIntensity);
                const specG = Math.min(255, existingG + color.g * limitedIntensity);
                const specB = Math.min(255, existingB + color.b * limitedIntensity);

                data[dataIdx] = specR;
                data[dataIdx + 1] = specG;
                data[dataIdx + 2] = specB;
            }
        }
    }

    /**
     * Render gradient specular highlighting (existing circular gradient mode)
     */
    renderGradientSpecular(highlight, buffer32, data, w, h, bgColors) {
        const { centerX, centerY, radius, intensity, color, triangleBounds } = highlight;
        const tolerance = 5;

        // Calculate bounding box - with or without triangle clipping based on setting
        let minX, maxX, minY, maxY;

        if (this._specularBleedingEnabled) {
            // Allow bleeding - only screen bounds
            minX = Math.max(0, Math.floor(centerX - radius));
            maxX = Math.min(w - 1, Math.ceil(centerX + radius));
            minY = Math.max(0, Math.floor(centerY - radius));
            maxY = Math.min(h - 1, Math.ceil(centerY + radius));
        } else {
            // Constrain to triangle bounds
            minX = Math.max(0, Math.floor(Math.max(triangleBounds.minX, centerX - radius)));
            maxX = Math.min(w - 1, Math.ceil(Math.min(triangleBounds.maxX, centerX + radius)));
            minY = Math.max(0, Math.floor(Math.max(triangleBounds.minY, centerY - radius)));
            maxY = Math.min(h - 1, Math.ceil(Math.min(triangleBounds.maxY, centerY + radius)));
        }

        if (minX > maxX || minY > maxY) return;

        const radiusSq = radius * radius;
        const invRadiusSq = 1.0 / radiusSq;

        // Pre-calculate edge functions for triangle bounds checking (only if not bleeding)
        let p0, p1, p2, e0_dx, e0_dy, e1_dx, e1_dy, e2_dx, e2_dy;

        if (!this._specularBleedingEnabled) {
            p0 = { x: triangleBounds.v0.x, y: triangleBounds.v0.y };
            p1 = { x: triangleBounds.v1.x, y: triangleBounds.v1.y };
            p2 = { x: triangleBounds.v2.x, y: triangleBounds.v2.y };

            e0_dx = p1.x - p0.x; e0_dy = p1.y - p0.y;
            e1_dx = p2.x - p1.x; e1_dy = p2.y - p1.y;
            e2_dx = p0.x - p2.x; e2_dy = p0.y - p2.y;
        }

        // No intensity limiting - full specular power
        const maxIntensity = 1.0;
        const limitedIntensity = Math.min(intensity, maxIntensity);

        // Optimization: Sample every N pixels when radius is large
        const pixelStep = radius > 50 ? 2 : 1;

        // Render circular gradient with occlusion testing
        for (let y = minY; y <= maxY; y += pixelStep) {
            const dy = y - centerY;
            const dySq = dy * dy;

            for (let x = minX; x <= maxX; x += pixelStep) {
                // Check if pixel is inside triangle (only if not bleeding)
                if (!this._specularBleedingEnabled) {
                    const w0 = e0_dx * (y - p0.y) - e0_dy * (x - p0.x);
                    const w1 = e1_dx * (y - p1.y) - e1_dy * (x - p1.x);
                    const w2 = e2_dx * (y - p2.y) - e2_dy * (x - p2.x);

                    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                }

                const dx = x - centerX;
                const distSq = dx * dx + dySq;

                if (distSq <= radiusSq) {
                    const pixelIdx = y * w + x;

                    const existing = buffer32[pixelIdx];
                    const existingR = existing & 0xFF;
                    const existingG = (existing >> 8) & 0xFF;
                    const existingB = (existing >> 16) & 0xFF;

                    let isBackground = false;
                    for (const bgColor of bgColors) {
                        if (Math.abs(existingR - bgColor.r) <= tolerance &&
                            Math.abs(existingG - bgColor.g) <= tolerance &&
                            Math.abs(existingB - bgColor.b) <= tolerance) {
                            isBackground = true;
                            break;
                        }
                    }

                    if (!this._specularBleedingEnabled && isBackground) {
                        continue;
                    }

                    const normalizedDistSq = distSq * invRadiusSq;
                    const falloff = 1.0 - Math.sqrt(normalizedDistSq);
                    const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
                    const alpha = limitedIntensity * smoothFalloff;

                    if (alpha > 0.01) {
                        const dataIdx = pixelIdx * 4;

                        const specR = Math.min(255, existingR + color.r * alpha);
                        const specG = Math.min(255, existingG + color.g * alpha);
                        const specB = Math.min(255, existingB + color.b * alpha);

                        data[dataIdx] = specR;
                        data[dataIdx + 1] = specG;
                        data[dataIdx + 2] = specB;

                        if (pixelStep > 1) {
                            for (let py = 0; py < pixelStep && y + py <= maxY; py++) {
                                for (let px = 0; px < pixelStep && x + px <= maxX; px++) {
                                    if (px === 0 && py === 0) continue;
                                    const fillIdx = (y + py) * w + (x + px);
                                    const fillDataIdx = fillIdx * 4;
                                    data[fillDataIdx] = specR;
                                    data[fillDataIdx + 1] = specG;
                                    data[fillDataIdx + 2] = specB;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    interpolateColor(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        return {
            r: Math.round(c1.r + (c2.r - c1.r) * t),
            g: Math.round(c1.g + (c2.g - c1.g) * t),
            b: Math.round(c1.b + (c2.b - c1.b) * t)
        };
    }

    calculateLighting(normal, baseColor) {
        // Normalize light direction
        const len = Math.sqrt(this._lightDirection.x ** 2 + this._lightDirection.y ** 2 + this._lightDirection.z ** 2);
        const lightDir = {
            x: this._lightDirection.x / len,
            y: this._lightDirection.y / len,
            z: this._lightDirection.z / len
        };

        // Calculate diffuse lighting (Lambertian)
        const dotProduct = -(normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);
        const diffuse = Math.max(0, dotProduct) * this._lightIntensity;

        // Combine ambient and diffuse
        const lighting = this._ambientIntensity + diffuse * (1 - this._ambientIntensity);

        // Apply light color
        const lightRgb = this.hexToRgb(this._lightColor);
        const baseRgb = typeof baseColor === 'string' ? this.hexToRgb(baseColor) : baseColor;

        return {
            r: Math.min(255, Math.round(baseRgb.r * lighting * (lightRgb.r / 255))),
            g: Math.min(255, Math.round(baseRgb.g * lighting * (lightRgb.g / 255))),
            b: Math.min(255, Math.round(baseRgb.b * lighting * (lightRgb.b / 255)))
        };
    }

    calculateFaceNormal(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const normal = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
        if (len > 1e-10) {
            return { x: normal.x / len, y: normal.y / len, z: normal.z / len };
        }
        // Return a default normal if calculation fails (shouldn't happen with valid triangles)
        return { x: 0, y: 0, z: 1 };
    }

    // Improved backface culling that works consistently across all rendering methods
    // Improved backface culling that works consistently across all rendering methods
    shouldCullFace(cameraSpaceVertices) {
        // If backface culling is disabled, never cull
        if (!this._enableBackfaceCulling) {
            return false;
        }

        if (cameraSpaceVertices.length < 3) return true;

        const v0 = cameraSpaceVertices[0];
        const v1 = cameraSpaceVertices[1];
        const v2 = cameraSpaceVertices[2];

        // Calculate face normal in camera space using cross product
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        // Cross product (edge1 x edge2)
        const normal = {
            x: edge1.y * edge2.z - edge1.z * edge2.y,
            y: edge1.z * edge2.x - edge1.x * edge2.z,
            z: edge1.x * edge2.y - edge1.y * edge2.x
        };

        // Normalize the normal
        const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        if (normalLength < 1e-10) return true; // Degenerate triangle

        const normalizedNormal = {
            x: normal.x / normalLength,
            y: normal.y / normalLength,
            z: normal.z / normalLength
        };

        // Use centroid of triangle for view direction
        const centroidX = (v0.x + v1.x + v2.x) / 3;
        const centroidY = (v0.y + v1.y + v2.y) / 3;
        const centroidZ = (v0.z + v1.z + v2.z) / 3;

        // View direction from centroid to camera (camera is at origin in camera space)
        const viewDir = {
            x: -centroidX,
            y: -centroidY,
            z: -centroidZ
        };

        const viewLen = Math.sqrt(viewDir.x * viewDir.x + viewDir.y * viewDir.y + viewDir.z * viewDir.z);
        if (viewLen < 1e-10) return false;

        viewDir.x /= viewLen;
        viewDir.y /= viewLen;
        viewDir.z /= viewLen;

        // Dot product between normal and view direction
        // If positive, face is front-facing; if negative, back-facing
        const dotProduct = normalizedNormal.x * viewDir.x + normalizedNormal.y * viewDir.y + normalizedNormal.z * viewDir.z;

        // More lenient culling threshold to prevent side-on faces from being culled
        const isBackface = dotProduct < -0.05; // Reduced from 0.01 to -0.05 for more lenient culling

        return isBackface;
    }

    render3D() {
        if (!this._renderTextureCtx) return;

        // Check if this camera should be active
        if (!this._isActive) {
            // Try to activate if no other camera is active
            const allObjects = this.getGameObjects();
            const activeCameras = allObjects.filter(obj => {
                const camera = obj.getModule("Camera3DRasterizer") || obj.getModule("Camera3D");
                return camera && camera._isActive && camera !== this;
            });

            if (activeCameras.length === 0) {
                this._isActive = true;
            }
        }

        if (!this._isActive) return;

        this.renderRasterOptimized();
    }

    uploadToWebGLTexture(gl, texture) {
        if (!this._renderTexture || !this._isActive) return false;

        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Upload the 2D canvas as a WebGL texture
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            this._renderTexture
        );

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
            this._renderTextureSmoothing ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,
            this._renderTextureSmoothing ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return true;
    }

    getRenderedTexture(useWebGL = false, gl = null, webGLTexture = null) {
        if (!this._isActive) {
            const allObjects = this.getGameObjects();
            const activeCameras = allObjects.filter(obj => {
                const camera = obj.getModule("Camera3DRasterizer") || obj.getModule("Camera3D");
                return camera && camera._isActive && camera !== this;
            });

            if (activeCameras.length === 0) {
                this._isActive = true;
            }
        }

        if (!this._isActive) return null;

        this.render3D();

        // If WebGL mode, upload to WebGL texture
        if (useWebGL && gl && webGLTexture) {
            this.uploadToWebGLTexture(gl, webGLTexture);
            return webGLTexture;
        }

        return this._renderTexture;
    }

    drawRenderedTexture(ctx, x = 0, y = 0, width = null, height = null) {
        if (!this._renderTexture || !this._isActive) return;
        ctx.imageSmoothingEnabled = this._renderTextureSmoothing;
        const drawWidth = width || this._renderTextureWidth;
        const drawHeight = height || this._renderTextureHeight;
        ctx.drawImage(this._renderTexture, x, y, drawWidth, drawHeight);
    }

    start() {
        this.updateViewport();
        this.updateRenderTexture();

        // Check for other active cameras and auto-activate if this is the only one
        const allObjects = this.getGameObjects();
        const allCameras = allObjects
            .map(obj => obj.getModule("Camera3DRasterizer") || obj.getModule("Camera3D"))
            .filter(cam => cam !== null && cam !== undefined);

        const activeCameras = allCameras.filter(cam => cam._isActive);

        if (allCameras.length === 1 && allCameras[0] === this) {
            // Only camera, auto-activate
            this._isActive = true;
        } else if (activeCameras.length === 0) {
            // No active cameras, activate this one
            this._isActive = true;
        }
    }

    beginLoop() { this.updateViewport(); }
    draw(ctx) { }
    drawGizmos(ctx) {
        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        ctx.rotate((this.gameObject.angle * Math.PI) / 180);

        // Draw a small camera icon at (0, 0)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -3, 6, 6); // Small body
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#000000';
        ctx.fill(); // Lens

        // Draw frustum showing FOV, near, and far planes
        const halfFovRad = (this._fieldOfView / 2) * (Math.PI / 180);
        const near = this._nearPlane * 10; // Scale for visibility
        const far = this._farPlane * 0.1; // Scale down far plane
        const nearHalfWidth = near * Math.tan(halfFovRad);
        const farHalfWidth = far * Math.tan(halfFovRad);

        ctx.strokeStyle = '#ffff00'; // Yellow lines
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Lines from camera to near plane
        ctx.moveTo(0, 0);
        ctx.lineTo(near, -nearHalfWidth);
        ctx.moveTo(0, 0);
        ctx.lineTo(near, nearHalfWidth);

        // Near plane
        ctx.moveTo(near, -nearHalfWidth);
        ctx.lineTo(near, nearHalfWidth);

        // Lines from near to far plane
        ctx.moveTo(near, -nearHalfWidth);
        ctx.lineTo(far, -farHalfWidth);
        ctx.moveTo(near, nearHalfWidth);
        ctx.lineTo(far, farHalfWidth);

        // Far plane
        ctx.moveTo(far, -farHalfWidth);
        ctx.lineTo(far, farHalfWidth);

        ctx.stroke();

        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            _type: "Camera3DRasterizer", _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _fieldOfView: this._fieldOfView, _nearPlane: this._nearPlane, _farPlane: this._farPlane,
            _isActive: this._isActive, _backgroundColor: this._backgroundColor,
            _renderTextureWidth: this._renderTextureWidth, _renderTextureHeight: this._renderTextureHeight,
            _renderTextureSmoothing: this._renderTextureSmoothing, drawGizmoInRuntime: this.drawGizmoInRuntime,
            _renderingMethod: this._renderingMethod, _enableBackfaceCulling: this._enableBackfaceCulling,
            _lightDirection: { x: this._lightDirection.x, y: this._lightDirection.y, z: this._lightDirection.z },
            _lightColor: this._lightColor,
            _lightIntensity: this._lightIntensity,
            _ambientIntensity: this._ambientIntensity,
            _skyColor: this._skyColor,
            _skyColorHorizon: this._skyColorHorizon,
            _floorColor: this._floorColor,
            _floorColorHorizon: this._floorColorHorizon,
            _backgroundType: this._backgroundType,
            _showSun: this._showSun,
            _sunSize: this._sunSize,
            _sunGlowSize: this._sunGlowSize,
            _specularEnabled: this._specularEnabled,
            _specularBleedingEnabled: this._specularBleedingEnabled,
            _specularPerMesh: this._specularPerMesh,
            _specularFullFace: this._specularFullFace,
            _specularBloomEnabled: this._specularBloomEnabled,
            _specularBloomIntensity: this._specularBloomIntensity,
            _specularBloomRadius: this._specularBloomRadius,
            _specularBloomThreshold: this._specularBloomThreshold,
            _showDebugInfo: this._showDebugInfo,
            _maxLights: this._maxLights,
            _lightFindDistance: this._lightFindDistance,
            _useDynamicLighting: this._useDynamicLighting,
            _lensFlareEnabled: this._lensFlareEnabled,
            _lensFlareIntensity: this._lensFlareIntensity,
            _lensFlareCount: this._lensFlareCount,
            _lensFlareSpacing: this._lensFlareSpacing,
            _lensFlareSize: this._lensFlareSize,
            _lensFlareColorShift: this._lensFlareColorShift,
            _fogEnabled: this._fogEnabled,
            _fogColor: this._fogColor,
            _fogStart: this._fogStart,
            _fogEnd: this._fogEnd,
            _fogDensity: this._fogDensity,
            _waterEnabled: this._waterEnabled,
            _waterSpeed: this._waterSpeed,
            _waterWaveHeight: this._waterWaveHeight,
            _cloudsEnabled: this._cloudsEnabled,
            _cloudSpeed: this._cloudSpeed,
            _cloudDensity: this._cloudDensity,
            _cloudScale: this._cloudScale,
            _cloudSoftness: this._cloudSoftness,
            _cloudHeight: this._cloudHeight,
            _cloudThickness: this._cloudThickness,
            _cloudBrightness: this._cloudBrightness,
            _cloudResolution: this._cloudResolution,
            _emissiveIntensity: this._emissiveIntensity || 1.0,
            _hillsEnabled: this._hillsEnabled,
            _hillsSeed: this._hillsSeed,
            _hillsMinHeight: this._hillsMinHeight,
            _hillsMaxHeight: this._hillsMaxHeight,
            _hillsFrequency: this._hillsFrequency,
            _hillsRoughness: this._hillsRoughness,
            _hillsBaseColor: this._hillsBaseColor,
            _hillsTopColor: this._hillsTopColor,
            _hillsUseFogColor: this._hillsUseFogColor,
            _hillsFogBlend: this._hillsFogBlend,
            _waterReflectionEnabled: this._waterReflectionEnabled,
            _waterReflectionOpacity: this._waterReflectionOpacity,
            _waterReflectionDistortion: this._waterReflectionDistortion
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json._position) this._position = new Vector3(json._position.x, json._position.y, json._position.z);
        if (json._rotation) this._rotation = new Vector3(json._rotation.x, json._rotation.y, json._rotation.z);
        if (json._fieldOfView !== undefined) this._fieldOfView = json._fieldOfView;
        if (json._nearPlane !== undefined) this._nearPlane = json._nearPlane;
        if (json._farPlane !== undefined) this._farPlane = json._farPlane;
        if (json._isActive !== undefined) this._isActive = json._isActive;
        if (json._backgroundColor !== undefined) this._backgroundColor = json._backgroundColor;
        if (json._renderTextureWidth !== undefined) this._renderTextureWidth = json._renderTextureWidth;
        if (json._renderTextureHeight !== undefined) this._renderTextureHeight = json._renderTextureHeight;
        if (json._renderTextureSmoothing !== undefined) this._renderTextureSmoothing = json._renderTextureSmoothing;
        if (json.drawGizmoInRuntime !== undefined) this.drawGizmoInRuntime = json.drawGizmoInRuntime;
        if (json._renderingMethod !== undefined) this._renderingMethod = json._renderingMethod;
        if (json._enableBackfaceCulling !== undefined) this._enableBackfaceCulling = json._enableBackfaceCulling;
        if (json._lightDirection) this._lightDirection = new Vector3(json._lightDirection.x, json._lightDirection.y, json._lightDirection.z);
        if (json._lightColor !== undefined) this._lightColor = json._lightColor;
        if (json._lightIntensity !== undefined) this._lightIntensity = json._lightIntensity;
        if (json._ambientIntensity !== undefined) this._ambientIntensity = json._ambientIntensity;
        if (json._skyColor !== undefined) { this._skyColor = json._skyColor; } else { this._skyColor = "#87CEEB"; }
        if (json._skyColorHorizon !== undefined) { this._skyColorHorizon = json._skyColorHorizon; } else { this._skyColorHorizon = "#87CEEB"; }
        if (json._floorColor !== undefined) { this._floorColor = json._floorColor; } else { this._floorColor = "#8B4513"; }
        if (json._floorColorHorizon !== undefined) { this._floorColorHorizon = json._floorColorHorizon; } else { this._floorColorHorizon = "#654321"; }
        if (json._backgroundType !== undefined) { this._backgroundType = json._backgroundType; } else { this._backgroundType = "skybox"; }
        if (json._showSun !== undefined) { this._showSun = json._showSun; } else { this._showSun = true; }
        if (json._sunSize !== undefined) { this._sunSize = json._sunSize; } else { this._sunSize = 30; }
        if (json._sunGlowSize !== undefined) { this._sunGlowSize = json._sunGlowSize; } else { this._sunGlowSize = 60; }
        if (json._specularEnabled !== undefined) { this._specularEnabled = json._specularEnabled; } else { this._specularEnabled = true; }
        if (json._specularBleedingEnabled !== undefined) { this._specularBleedingEnabled = json._specularBleedingEnabled; } else { this._specularBleedingEnabled = false; }
        if (json._specularPerMesh !== undefined) { this._specularPerMesh = json._specularPerMesh; } else { this._specularPerMesh = false; }
        if (json._specularFullFace !== undefined) { this._specularFullFace = json._specularFullFace; } else { this._specularFullFace = false; }
        if (json._specularBloomEnabled !== undefined) { this._specularBloomEnabled = json._specularBloomEnabled; } else { this._specularBloomEnabled = false; }
        if (json._specularBloomIntensity !== undefined) { this._specularBloomIntensity = json._specularBloomIntensity; } else { this._specularBloomIntensity = 0.5; }
        if (json._specularBloomRadius !== undefined) { this._specularBloomRadius = json._specularBloomRadius; } else { this._specularBloomRadius = 1.5; }
        if (json._specularBloomThreshold !== undefined) { this._specularBloomThreshold = json._specularBloomThreshold; } else { this._specularBloomThreshold = 0.3; }
        if (json._showDebugInfo !== undefined) this._showDebugInfo = json._showDebugInfo;
        if (json._maxLights !== undefined) this._maxLights = json._maxLights;
        if (json._lightFindDistance !== undefined) this._lightFindDistance = json._lightFindDistance;
        if (json._useDynamicLighting !== undefined) this._useDynamicLighting = json._useDynamicLighting;
        if (json._lensFlareEnabled !== undefined) { this._lensFlareEnabled = json._lensFlareEnabled; } else { this._lensFlareEnabled = true; }
        if (json._lensFlareIntensity !== undefined) { this._lensFlareIntensity = json._lensFlareIntensity; } else { this._lensFlareIntensity = 0.8; }
        if (json._lensFlareCount !== undefined) { this._lensFlareCount = json._lensFlareCount; } else { this._lensFlareCount = 5; }
        if (json._lensFlareSpacing !== undefined) { this._lensFlareSpacing = json._lensFlareSpacing; } else { this._lensFlareSpacing = 0.15; }
        if (json._lensFlareSize !== undefined) { this._lensFlareSize = json._lensFlareSize; } else { this._lensFlareSize = 20; }
        if (json._lensFlareColorShift !== undefined) { this._lensFlareColorShift = json._lensFlareColorShift; } else { this._lensFlareColorShift = true; }
        if (json._fogEnabled !== undefined) { this._fogEnabled = json._fogEnabled; } else { this._fogEnabled = false; }
        if (json._fogColor !== undefined) { this._fogColor = json._fogColor; } else { this._fogColor = "#a0a0a0"; }
        if (json._fogStart !== undefined) { this._fogStart = json._fogStart; } else { this._fogStart = 100; }
        if (json._fogEnd !== undefined) { this._fogEnd = json._fogEnd; } else { this._fogEnd = 500; }
        if (json._fogDensity !== undefined) { this._fogDensity = json._fogDensity; } else { this._fogDensity = 1.0; }
        if (json._waterEnabled !== undefined) { this._waterEnabled = json._waterEnabled; } else { this._waterEnabled = false; }
        if (json._waterSpeed !== undefined) { this._waterSpeed = json._waterSpeed; } else { this._waterSpeed = 1.0; }
        if (json._waterWaveHeight !== undefined) { this._waterWaveHeight = json._waterWaveHeight; } else { this._waterWaveHeight = 10; }
        if (json._cloudsEnabled !== undefined) { this._cloudsEnabled = json._cloudsEnabled; } else { this._cloudsEnabled = false; }
        if (json._cloudSpeed !== undefined) { this._cloudSpeed = json._cloudSpeed; } else { this._cloudSpeed = 0.5; }
        if (json._cloudDensity !== undefined) { this._cloudDensity = json._cloudDensity; } else { this._cloudDensity = 0.4; }
        if (json._cloudScale !== undefined) { this._cloudScale = json._cloudScale; } else { this._cloudScale = 150; }
        if (json._cloudSoftness !== undefined) { this._cloudSoftness = json._cloudSoftness; } else { this._cloudSoftness = 0.6; }
        if (json._cloudHeight !== undefined) { this._cloudHeight = json._cloudHeight; } else { this._cloudHeight = 0.3; }
        if (json._cloudThickness !== undefined) { this._cloudThickness = json._cloudThickness; } else { this._cloudThickness = 0.4; }
        if (json._cloudBrightness !== undefined) { this._cloudBrightness = json._cloudBrightness; } else { this._cloudBrightness = 1.0; }
        if (json._cloudResolution !== undefined) { this._cloudResolution = json._cloudResolution; } else { this._cloudResolution = 0.5; }
        if (json._emissiveIntensity !== undefined) {
            this._emissiveIntensity = json._emissiveIntensity;
        } else {
            this._emissiveIntensity = 1.0;
        }
        if (json._hillsEnabled !== undefined) { this._hillsEnabled = json._hillsEnabled; } else { this._hillsEnabled = false; }
        if (json._hillsSeed !== undefined) { this._hillsSeed = json._hillsSeed; } else { this._hillsSeed = 12345; }
        if (json._hillsMinHeight !== undefined) { this._hillsMinHeight = json._hillsMinHeight; } else { this._hillsMinHeight = 0.1; }
        if (json._hillsMaxHeight !== undefined) { this._hillsMaxHeight = json._hillsMaxHeight; } else { this._hillsMaxHeight = 0.4; }
        if (json._hillsFrequency !== undefined) { this._hillsFrequency = json._hillsFrequency; } else { this._hillsFrequency = 0.5; }
        if (json._hillsRoughness !== undefined) { this._hillsRoughness = json._hillsRoughness; } else { this._hillsRoughness = 0.6; }
        if (json._hillsBaseColor !== undefined) { this._hillsBaseColor = json._hillsBaseColor; } else { this._hillsBaseColor = "#2d5016"; }
        if (json._hillsTopColor !== undefined) { this._hillsTopColor = json._hillsTopColor; } else { this._hillsTopColor = "#8b7355"; }
        if (json._hillsUseFogColor !== undefined) { this._hillsUseFogColor = json._hillsUseFogColor; } else { this._hillsUseFogColor = true; }
        if (json._hillsFogBlend !== undefined) { this._hillsFogBlend = json._hillsFogBlend; } else { this._hillsFogBlend = 0.7; }
        if (json._waterReflectionEnabled !== undefined) { this._waterReflectionEnabled = json._waterReflectionEnabled; } else { this._waterReflectionEnabled = true; }
        if (json._waterReflectionOpacity !== undefined) { this._waterReflectionOpacity = json._waterReflectionOpacity; } else { this._waterReflectionOpacity = 0.3; }
        if (json._waterReflectionDistortion !== undefined) { this._waterReflectionDistortion = json._waterReflectionDistortion; } else { this._waterReflectionDistortion = 0.05; }

        this.updateRenderTexture();
    }

    get renderTextureWidth() { return this._renderTextureWidth; }
    set renderTextureWidth(value) { this._renderTextureWidth = Math.max(64, Math.min(2048, value)); this.updateRenderTexture(); }
    get renderTextureHeight() { return this._renderTextureHeight; }
    set renderTextureHeight(value) { this._renderTextureHeight = Math.max(64, Math.min(2048, value)); this.updateRenderTexture(); }
    get renderTextureSmoothing() { return this._renderTextureSmoothing; }
    set renderTextureSmoothing(value) { this._renderTextureSmoothing = value; }
    get backgroundColor() { return this._backgroundColor; }
    set backgroundColor(value) { this._backgroundColor = value; }
    get position() { return this._position; }
    set position(value) { this._position = value; }
    get rotation() { return this._rotation; }
    set rotation(value) { this._rotation = value; }
    get fieldOfView() { return this._fieldOfView; }
    set fieldOfView(value) { this._fieldOfView = Math.max(1, Math.min(179, value)); }
    get nearPlane() { return this._nearPlane; }
    set nearPlane(value) { this._nearPlane = Math.max(0.01, value); }
    get farPlane() { return this._farPlane; }
    set farPlane(value) { this._farPlane = Math.max(1, value); }
    get isActive() { return this._isActive; }
    set isActive(value) { this._isActive = value; }
}

window.Camera3DRasterizer = Camera3DRasterizer;