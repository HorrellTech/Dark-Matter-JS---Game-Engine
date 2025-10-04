/**
 * Light3D - Dynamic lighting system for 3D scenes
 * 
 * Supports point and spot lights with color, intensity, and range.
 * Works in conjunction with Camera3DRasterizer for scene lighting.
 */
class Light3D extends Module {
    static namespace = "3D";

    constructor() {
        super("Light3D");

        // Light type: "point" or "spot"
        this._lightType = "point";

        // Light properties
        this._color = "#FFFFFF";
        this._intensity = 1.0;
        this._range = 100; // Maximum distance light reaches
        this._attenuation = 2.0; // How quickly light falls off (quadratic by default)

        // Spot light specific properties
        this._spotAngle = 45; // Cone angle in degrees
        this._spotSoftness = 0.1; // Edge softness (0-1)
        this._spotDirection = new Vector3(0, 0, -1); // Direction in local space

        // Visual representation properties
        this._showLightSource = true; // Whether to draw the light as a visible glow
        this._lightSourceSize = 10; // Size of the visible light source
        this._lightSourceIntensity = 1.0; // Intensity of the glow (0-1)
        this._lightSourceGlow = true; // Whether to draw a glow around the light

        // Performance settings
        this._castShadows = true; // Whether this light casts shadows
        this._shadowQuality = "medium"; // "low", "medium", "high"

        // Internal references
        this._camera = null;
        this._cameraSearchInterval = 0;

        this.exposeProperty("lightType", "dropdown", this._lightType, {
            options: ["point", "spot"],
            onChange: (val) => this._lightType = val
        });

        this.exposeProperty("color", "color", this._color, {
            onChange: (val) => this._color = val
        });

        this.exposeProperty("intensity", "number", this._intensity, {
            min: 0,
            max: 5,
            step: 0.1,
            onChange: (val) => this._intensity = val
        });

        this.exposeProperty("range", "number", this._range, {
            min: 1,
            max: 1000,
            step: 1,
            onChange: (val) => this._range = val
        });

        this.exposeProperty("attenuation", "number", this._attenuation, {
            min: 0.5,
            max: 4,
            step: 0.1,
            onChange: (val) => this._attenuation = val
        });

        this.exposeProperty("spotAngle", "number", this._spotAngle, {
            min: 1,
            max: 180,
            step: 1,
            onChange: (val) => this._spotAngle = val
        });

        this.exposeProperty("spotSoftness", "number", this._spotSoftness, {
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => this._spotSoftness = val
        });

        this.exposeProperty("spotDirection", "vector3", this._spotDirection, {
            onChange: (val) => this._spotDirection = val
        });

        this.exposeProperty("showLightSource", "boolean", this._showLightSource, {
            onChange: (val) => this._showLightSource = val
        });

        this.exposeProperty("lightSourceSize", "number", this._lightSourceSize, {
            min: 1,
            max: 50,
            step: 1,
            onChange: (val) => this._lightSourceSize = val
        });

        this.exposeProperty("lightSourceIntensity", "number", this._lightSourceIntensity, {
            min: 0,
            max: 2,
            step: 0.1,
            onChange: (val) => this._lightSourceIntensity = val
        });

        this.exposeProperty("lightSourceGlow", "boolean", this._lightSourceGlow, {
            onChange: (val) => this._lightSourceGlow = val
        });

        this.exposeProperty("castShadows", "boolean", this._castShadows, {
            onChange: (val) => this._castShadows = val
        });

        this.exposeProperty("shadowQuality", "dropdown", this._shadowQuality, {
            options: ["low", "medium", "high"],
            onChange: (val) => this._shadowQuality = val
        });
    }

    /**
     * Find and register with the active camera
     */
    findAndRegisterCamera() {
        if (this._camera) return true;

        const allObjects = this.getAllGameObjects();

        for (const obj of allObjects) {
            const camera = obj.getModule("Camera3DRasterizer");
            if (camera && camera._isActive) {
                this._camera = camera;
                camera.registerLight(this);
                return true;
            }
        }

        return false;
    }

    /**
     * Get world position of this light
     */
    getWorldPosition() {
        if (!this.gameObject) return new Vector3(0, 0, 0);

        const pos = this.gameObject.getWorldPosition ?
            this.gameObject.getWorldPosition() :
            { x: 0, y: 0 };

        let depth = 0;
        if (typeof this.gameObject.getWorldDepth === 'function') {
            depth = this.gameObject.getWorldDepth();
        } else if (typeof this.gameObject.depth === 'number') {
            depth = this.gameObject.depth;
        } else if (this.gameObject.position && this.gameObject.position.z) {
            depth = this.gameObject.position.z;
        }

        return new Vector3(pos.x || 0, pos.y || 0, depth);
    }

    /**
     * Get world-space direction for spot lights
     */
    getWorldDirection() {
        if (this._lightType !== "spot") return new Vector3(0, 0, -1);

        const rotation = this.gameObject.getWorldRotation ?
            this.gameObject.getWorldRotation() : 0;

        // Convert 2D rotation to 3D (assuming rotation around Z-axis)
        const radZ = rotation * (Math.PI / 180);

        // Apply rotation to local direction
        const localDir = this._spotDirection;
        const cos = Math.cos(radZ);
        const sin = Math.sin(radZ);

        return new Vector3(
            localDir.x * cos - localDir.y * sin,
            localDir.x * sin + localDir.y * cos,
            localDir.z
        ).normalize();
    }

    /**
     * Calculate light contribution at a point
     */
    calculateLightContribution(worldPos, worldNormal) {
        const lightPos = this.getWorldPosition();
        const toLight = {
            x: lightPos.x - worldPos.x,
            y: lightPos.y - worldPos.y,
            z: lightPos.z - worldPos.z
        };

        const distance = Math.sqrt(toLight.x ** 2 + toLight.y ** 2 + toLight.z ** 2);

        // Check if point is within light range
        if (distance > this._range || distance < 0.001) {
            return { r: 0, g: 0, b: 0, intensity: 0 };
        }

        // Normalize light direction
        const lightDir = {
            x: toLight.x / distance,
            y: toLight.y / distance,
            z: toLight.z / distance
        };

        // Calculate attenuation (inverse square law by default)
        const attenuation = Math.pow(1.0 - (distance / this._range), this._attenuation);

        let spotFactor = 1.0;

        // Spot light cone calculation
        if (this._lightType === "spot") {
            const spotDir = this.getWorldDirection();
            const cosAngle = -(lightDir.x * spotDir.x + lightDir.y * spotDir.y + lightDir.z * spotDir.z);
            const spotAngleRad = this._spotAngle * (Math.PI / 180);
            const cosSpotAngle = Math.cos(spotAngleRad / 2);

            if (cosAngle < cosSpotAngle) {
                // Outside cone
                return { r: 0, g: 0, b: 0, intensity: 0 };
            }

            // Smooth edge falloff
            const softEdge = this._spotSoftness * (1.0 - cosSpotAngle);
            if (cosAngle < cosSpotAngle + softEdge) {
                spotFactor = (cosAngle - cosSpotAngle) / softEdge;
                spotFactor = spotFactor * spotFactor * (3 - 2 * spotFactor); // Smoothstep
            }
        }

        // Lambertian diffuse
        const normalLen = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2);
        const normal = {
            x: worldNormal.x / normalLen,
            y: worldNormal.y / normalLen,
            z: worldNormal.z / normalLen
        };

        const diffuse = Math.max(0, normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);

        // Final intensity
        const finalIntensity = this._intensity * attenuation * spotFactor * diffuse;

        if (finalIntensity < 0.001) {
            return { r: 0, g: 0, b: 0, intensity: 0 };
        }

        // Parse light color
        const color = this.hexToRgb(this._color);

        return {
            r: color.r * finalIntensity,
            g: color.g * finalIntensity,
            b: color.b * finalIntensity,
            intensity: finalIntensity,
            lightDir: lightDir,
            distance: distance
        };
    }

    /**
     * Helper to convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    /**
 * Draw visible light source in 3D space
 */
    drawLightSource(camera) {
        if (!this._showLightSource || !camera || !camera._renderTextureCtx) return;

        const lightWorldPos = this.getWorldPosition();

        // Check if light is in camera view
        const cameraPos = camera.worldToCameraSpace(lightWorldPos);
        if (cameraPos.x <= camera._nearPlane || cameraPos.x >= camera._farPlane) return;

        // Project to screen space
        const screenPos = camera.projectCameraPoint(cameraPos);
        if (!screenPos) return;

        const ctx = camera._renderTextureCtx;
        const buffer32 = new Uint32Array(camera._imageData.data.buffer);
        const w = camera._renderTextureWidth;
        const h = camera._renderTextureHeight;

        const centerX = Math.round(screenPos.x);
        const centerY = Math.round(screenPos.y);

        // Calculate size based on distance
        const distanceScale = Math.max(0.3, Math.min(2.0, 50 / cameraPos.x));
        const size = this._lightSourceSize * distanceScale;

        // Parse light color
        const lightColor = this.hexToRgb(this._color);

        // Draw glow if enabled
        if (this._lightSourceGlow) {
            const glowRadius = size * 3;
            const minX = Math.max(0, centerX - glowRadius);
            const maxX = Math.min(w - 1, centerX + glowRadius);
            const minY = Math.max(0, centerY - glowRadius);
            const maxY = Math.min(h - 1, centerY + glowRadius);

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const distSq = dx * dx + dy * dy;
                    const glowRadiusSq = glowRadius * glowRadius;

                    if (distSq <= glowRadiusSq) {
                        const distance = Math.sqrt(distSq);
                        const falloff = 1.0 - (distance / glowRadius);
                        const alpha = falloff * falloff * 0.2 * this._lightSourceIntensity;

                        if (alpha > 0.01) {
                            const pixelIdx = y * w + x;
                            const existing = buffer32[pixelIdx];

                            const existingR = existing & 0xFF;
                            const existingG = (existing >> 8) & 0xFF;
                            const existingB = (existing >> 16) & 0xFF;

                            const newR = Math.min(255, Math.round(existingR + lightColor.r * alpha));
                            const newG = Math.min(255, Math.round(existingG + lightColor.g * alpha));
                            const newB = Math.min(255, Math.round(existingB + lightColor.b * alpha));

                            buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                        }
                    }
                }
            }
        }

        // Draw bright core
        const coreRadius = size;
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
                    const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

                    const pixelIdx = y * w + x;
                    const existing = buffer32[pixelIdx];

                    const existingR = existing & 0xFF;
                    const existingG = (existing >> 8) & 0xFF;
                    const existingB = (existing >> 16) & 0xFF;

                    const intensity = 0.5 + smoothFalloff * 0.5 * this._lightSourceIntensity;
                    const newR = Math.min(255, Math.round(existingR * (1 - intensity) + lightColor.r * intensity));
                    const newG = Math.min(255, Math.round(existingG * (1 - intensity) + lightColor.g * intensity));
                    const newB = Math.min(255, Math.round(existingB * (1 - intensity) + lightColor.b * intensity));

                    buffer32[pixelIdx] = (255 << 24) | (newB << 16) | (newG << 8) | newR;
                }
            }
        }

        // Update image data
        ctx.putImageData(camera._imageData, 0, 0);
    }

    /**
     * Check if this light should affect a triangle (shadow casting)
     */
    isTriangleLit(triangleCenter, triangleNormal, allTriangles) {
        if (!this._castShadows || this._lightBleeding) return true;

        const lightPos = this.getWorldPosition();

        // Direction from triangle to light
        const toLight = {
            x: lightPos.x - triangleCenter.x,
            y: lightPos.y - triangleCenter.y,
            z: lightPos.z - triangleCenter.z
        };

        const distanceToLight = Math.sqrt(toLight.x ** 2 + toLight.y ** 2 + toLight.z ** 2);

        if (distanceToLight < 0.001) return true;

        // Normalize direction
        const lightDir = {
            x: toLight.x / distanceToLight,
            y: toLight.y / distanceToLight,
            z: toLight.z / distanceToLight
        };

        // Check if triangle is facing away from light (backface to light)
        const normalLen = Math.sqrt(triangleNormal.x ** 2 + triangleNormal.y ** 2 + triangleNormal.z ** 2);
        if (normalLen < 0.0001) return false;

        const normal = {
            x: triangleNormal.x / normalLen,
            y: triangleNormal.y / normalLen,
            z: triangleNormal.z / normalLen
        };

        const dotNL = normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z;
        if (dotNL <= 0.05) return false; // Facing away from light

        // Shadow quality determines how many triangles to check
        const maxChecks = this._shadowQuality === "high" ? allTriangles.length :
            this._shadowQuality === "medium" ? Math.min(50, allTriangles.length) :
                Math.min(20, allTriangles.length);

        // Check if any other triangle is blocking the light
        for (let i = 0; i < maxChecks; i++) {
            const otherTri = allTriangles[i];

            // Skip self - compare triangle centers
            const otherCenter = {
                x: (otherTri.worldVerts[0].x + otherTri.worldVerts[1].x + otherTri.worldVerts[2].x) / 3,
                y: (otherTri.worldVerts[0].y + otherTri.worldVerts[1].y + otherTri.worldVerts[2].y) / 3,
                z: (otherTri.worldVerts[0].z + otherTri.worldVerts[1].z + otherTri.worldVerts[2].z) / 3
            };

            const dx = otherCenter.x - triangleCenter.x;
            const dy = otherCenter.y - triangleCenter.y;
            const dz = otherCenter.z - triangleCenter.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            // Skip if it's the same triangle (or very close)
            if (distSq < 0.01) continue;

            // Check if this triangle blocks the light
            if (this.isTriangleBlockingLight(triangleCenter, lightPos, distanceToLight, otherTri, lightDir)) {
                return false; // This triangle IS in shadow
            }
        }

        return true; // No blockers found, triangle is lit
    }

    /**
     * Check if a triangle blocks light from reaching a point
     */
    isTriangleBlockingLight(point, lightPos, distanceToLight, blockingTriangle, lightDir) {
        const blockerWorldVerts = blockingTriangle.worldVerts;
        if (!blockerWorldVerts || blockerWorldVerts.length < 3) return false;

        // Calculate blocker center
        const blockerCenter = {
            x: (blockerWorldVerts[0].x + blockerWorldVerts[1].x + blockerWorldVerts[2].x) / 3,
            y: (blockerWorldVerts[0].y + blockerWorldVerts[1].y + blockerWorldVerts[2].y) / 3,
            z: (blockerWorldVerts[0].z + blockerWorldVerts[1].z + blockerWorldVerts[2].z) / 3
        };

        // Vector from point to blocker
        const toBlocker = {
            x: blockerCenter.x - point.x,
            y: blockerCenter.y - point.y,
            z: blockerCenter.z - point.z
        };

        const distanceToBlocker = Math.sqrt(toBlocker.x ** 2 + toBlocker.y ** 2 + toBlocker.z ** 2);

        if (distanceToBlocker < 0.1) return false; // Too close to be a blocker

        // Blocker must be closer than light source
        if (distanceToBlocker >= distanceToLight - 0.1) return false;

        // Check if blocker is roughly in line with light direction
        const normalizedToBlocker = {
            x: toBlocker.x / distanceToBlocker,
            y: toBlocker.y / distanceToBlocker,
            z: toBlocker.z / distanceToBlocker
        };

        const alignment = normalizedToBlocker.x * lightDir.x +
            normalizedToBlocker.y * lightDir.y +
            normalizedToBlocker.z * lightDir.z;

        // Must be well-aligned (within ~20 degrees) - blocker should be between point and light
        if (alignment < 0.94) return false;

        // Check if blocker triangle is facing toward the point (away from light)
        const blockerNormal = blockingTriangle.worldNormal;
        if (!blockerNormal) return false;

        const blockerNormalLen = Math.sqrt(blockerNormal.x ** 2 + blockerNormal.y ** 2 + blockerNormal.z ** 2);
        if (blockerNormalLen < 0.0001) return false;

        const blockerNormalized = {
            x: blockerNormal.x / blockerNormalLen,
            y: blockerNormal.y / blockerNormalLen,
            z: blockerNormal.z / blockerNormalLen
        };

        // Check if blocker is facing toward the light (to block it)
        // The blocker should be facing in the opposite direction of the light
        const dotBlockerLight = blockerNormalized.x * lightDir.x +
            blockerNormalized.y * lightDir.y +
            blockerNormalized.z * lightDir.z;

        // Blocker must be facing toward light to cast shadow
        if (dotBlockerLight <= 0.05) return false;

        return true; // This triangle IS blocking the light
    }

    /**
     * Loop method - try to find camera if not registered
     */
    beginLoop() {
        if (!this._camera) {
            // Only check every 60 frames to reduce overhead
            if (this._cameraSearchInterval++ % 60 === 0) {
                this.findAndRegisterCamera();
            }
        }
    }

    /**
     * Cleanup when destroyed
     */
    onDestroy() {
        if (this._camera) {
            this._camera.unregisterLight(this);
            this._camera = null;
        }
    }

    /**
     * Draw gizmo showing light range and color
     */
    drawGizmos(ctx) {
        if (!this.gameObject) return;

        ctx.save();

        const pos = this.gameObject.position;
        ctx.translate(pos.x, pos.y);

        // Draw light range circle
        ctx.strokeStyle = this._color;
        ctx.fillStyle = this._color + "22"; // Semi-transparent fill
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, this._range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw inner bright circle
        ctx.fillStyle = this._color + "88";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw spot light cone if applicable
        if (this._lightType === "spot") {
            const angle = this.gameObject.angle || 0;
            const direction = this._spotDirection;
            const coneAngleRad = (this._spotAngle / 2) * (Math.PI / 180);

            ctx.strokeStyle = this._color;
            ctx.fillStyle = this._color + "11";
            ctx.lineWidth = 1;

            // Calculate cone direction in 2D
            const dirAngle = Math.atan2(direction.y, direction.x) + (angle * Math.PI / 180);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this._range, dirAngle - coneAngleRad, dirAngle + coneAngleRad);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw center line
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(dirAngle) * this._range,
                Math.sin(dirAngle) * this._range
            );
            ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this._lightType === "spot" ? "SPOT" : "POINT", 0, -this._range - 10);

        ctx.restore();
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            _type: "Light3D",
            _lightType: this._lightType,
            _color: this._color,
            _intensity: this._intensity,
            _range: this._range,
            _attenuation: this._attenuation,
            _spotAngle: this._spotAngle,
            _spotSoftness: this._spotSoftness,
            _spotDirection: { x: this._spotDirection.x, y: this._spotDirection.y, z: this._spotDirection.z },
            _castShadows: this._castShadows,
            _shadowQuality: this._shadowQuality,
            _showLightSource: this._showLightSource,
            _lightSourceSize: this._lightSourceSize,
            _lightSourceIntensity: this._lightSourceIntensity,
            _lightSourceGlow: this._lightSourceGlow
        };
    }

    /**
     * Deserialize from JSON
     */
    fromJSON(json) {
        if (json._lightType !== undefined) this._lightType = json._lightType;
        if (json._color !== undefined) this._color = json._color;
        if (json._intensity !== undefined) this._intensity = json._intensity;
        if (json._range !== undefined) this._range = json._range;
        if (json._attenuation !== undefined) this._attenuation = json._attenuation;
        if (json._spotAngle !== undefined) this._spotAngle = json._spotAngle;
        if (json._spotSoftness !== undefined) this._spotSoftness = json._spotSoftness;
        if (json._spotDirection) this._spotDirection = new Vector3(json._spotDirection.x, json._spotDirection.y, json._spotDirection.z);
        if (json._castShadows !== undefined) this._castShadows = json._castShadows;
        if (json._shadowQuality !== undefined) this._shadowQuality = json._shadowQuality;
        if (json._showLightSource !== undefined) this._showLightSource = json._showLightSource;
        if (json._lightSourceSize !== undefined) this._lightSourceSize = json._lightSourceSize;
        if (json._lightSourceIntensity !== undefined) this._lightSourceIntensity = json._lightSourceIntensity;
        if (json._lightSourceGlow !== undefined) this._lightSourceGlow = json._lightSourceGlow;
    }

    // Getters and setters
    get lightType() { return this._lightType; }
    set lightType(value) { this._lightType = value; }

    get color() { return this._color; }
    set color(value) { this._color = value; }

    get intensity() { return this._intensity; }
    set intensity(value) { this._intensity = Math.max(0, value); }

    get range() { return this._range; }
    set range(value) { this._range = Math.max(1, value); }

    get attenuation() { return this._attenuation; }
    set attenuation(value) { this._attenuation = Math.max(0.5, value); }

    get spotAngle() { return this._spotAngle; }
    set spotAngle(value) { this._spotAngle = Math.max(1, Math.min(180, value)); }

    get spotSoftness() { return this._spotSoftness; }
    set spotSoftness(value) { this._spotSoftness = Math.max(0, Math.min(1, value)); }

    get showLightSource() { return this._showLightSource; }
    set showLightSource(value) { this._showLightSource = value; }

    get lightSourceSize() { return this._lightSourceSize; }
    set lightSourceSize(value) { this._lightSourceSize = Math.max(1, value); }

    get lightSourceIntensity() { return this._lightSourceIntensity; }
    set lightSourceIntensity(value) { this._lightSourceIntensity = Math.max(0, value); }

    get lightSourceGlow() { return this._lightSourceGlow; }
    set lightSourceGlow(value) { this._lightSourceGlow = value; }

    get castShadows() { return this._castShadows; }
    set castShadows(value) { this._castShadows = value; }

    get shadowQuality() { return this._shadowQuality; }
    set shadowQuality(value) { this._shadowQuality = value; }
}

window.Light3D = Light3D;