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
        this._isActive = false;
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
        this._floorColor = "#8B4513"; // Brown
        this._skyColorHorizon = "#af686cff"; // Sky at horizon (default same as sky)
        this._floorColorHorizon = "#653721ff"; // Floor at horizon (darker brown)
        this._backgroundType = "skyfloor"; // "skyfloor", "transparent", "solid"

        // Specular properties
        this._specularEnabled = true;
        this._specularBleedingEnabled = false;
        this._specularPerMesh = false;

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
        this.exposeProperty("isActive", "boolean", false, {
            onChange: (val) => {
                this._isActive = val;
                if (val) this.setAsActiveCamera();
            }
        });
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
        this.exposeProperty("enableBackfaceCulling", "boolean", true, {
            onChange: (val) => this._enableBackfaceCulling = val
        });

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
        
        this.exposeProperty("backgroundType", "dropdown", "skyfloor", {
            options: ["skyfloor", "transparent", "solid"],
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

        this.exposeProperty("specularEnabled", "boolean", true, {
            onChange: (val) => this._specularEnabled = val
        });
        this.exposeProperty("specularBleedingEnabled", "boolean", true, {
            onChange: (val) => this._specularBleedingEnabled = val
        });
        this.exposeProperty("specularPerMesh", "boolean", false, {
            onChange: (val) => this._specularPerMesh = val
        });

        this.exposeProperty("showDebugInfo", "boolean", false, {
            onChange: (val) => this._showDebugInfo = val
        });

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

        // Reset debug stats
        this._debugStats.totalFaces = 0;
        this._debugStats.renderedTriangles = 0;
        this._debugStats.culledFaces = 0;
        this._debugStats.clippedFaces = 0;
        this._debugStats.specularHighlights = 0;

        const buffer32 = new Uint32Array(imgData.data.buffer);
        this.clearBackgroundFast(buffer32, w, h);

        // Collect ALL triangles for shadow calculation (including culled ones)
        const allTrianglesForShadows = [];
        const allTriangles = [];
        const specularHighlights = [];
        const meshSpecularData = new Map();

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const material = mesh.material;
            const faceColor = material ? material.diffuseColor : (mesh.faceColor || mesh._faceColor || "#888888");

            mesh.faces.forEach(face => {
                this._debugStats.totalFaces++;

                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
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

                // Triangulate and add to lists
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const triWorldVerts = [
                        worldVerts[0],
                        worldVerts[Math.min(i, worldVerts.length - 1)],
                        worldVerts[Math.min(i + 1, worldVerts.length - 1)]
                    ];

                    const centroidX = (screenVerts[0].cameraPos.x + screenVerts[i].cameraPos.x + screenVerts[i + 1].cameraPos.x) / 3;
                    const viewDepth = centroidX;

                    const tri = {
                        v0: screenVerts[0],
                        v1: screenVerts[i],
                        v2: screenVerts[i + 1],
                        worldVerts: triWorldVerts,
                        worldNormal: worldNormal,
                        material: material,
                        faceColor: faceColor,
                        avgDepth: viewDepth,
                        isCulled: isCulled
                    };

                    // Add ALL triangles to shadow list (even culled ones)
                    allTrianglesForShadows.push(tri);

                    // Only add visible triangles to render list
                    if (!isCulled) {
                        this._debugStats.renderedTriangles++;
                        allTriangles.push(tri);
                    } else {
                        this._debugStats.culledFaces++;
                    }
                }
            });
        });

        // Sort back-to-front (only visible triangles)
        allTriangles.sort((a, b) => b.avgDepth - a.avgDepth);

        // Calculate lighting for each triangle WITH dynamic lights (use allTrianglesForShadows for shadow checks)
        allTriangles.forEach(tri => {
            const litColor = this.calculateLightingWithDynamicLights(
                tri.worldVerts,
                tri.worldNormal,
                tri.faceColor,
                allTrianglesForShadows // Pass all triangles for shadow checks
            );

            const packedColor = (255 << 24) | (litColor.b << 16) | (litColor.g << 8) | litColor.r;
            tri.packedColor = packedColor;

            this.rasterizeTriangleFast(tri, buffer32, w, h);

            // Calculate specular if needed
            if (this._specularEnabled && tri.material && tri.material._specularColor) {
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

        ctx.putImageData(imgData, 0, 0);

        if (this._showDebugInfo) {
            this._debugStats.renderTime = performance.now() - startTime;
            this._debugStats.activeLights = this.getNearbyLights().length;
            this.drawDebugInfo(ctx);
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
     * Fast background clearing using 32-bit writes
     */
    clearBackgroundFast(buffer32, w, h) {
        if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            const bgPixel = (255 << 24) | (bgColor.b << 16) | (bgColor.g << 8) | bgColor.r;
            buffer32.fill(bgPixel);
        } else if (this._backgroundType === "skyfloor") {
            const fovRadians = this._fieldOfView * (Math.PI / 180);
            const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
            const maxPitch = fovRadians / 2;
            const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
            const horizonOffset = normalizedPitch * 0.5;
            const horizonRatio = 0.5 + horizonOffset;
            const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
            const horizonY = Math.floor(h * clampedHorizon);

            // Draw gradient sky and floor
            for (let y = 0; y < h; y++) {
                let color;
                if (y < horizonY) {
                    // Sky gradient
                    const t = y / horizonY;
                    color = this.interpolateColor(this._skyColor, this._skyColorHorizon, t);
                } else {
                    // Floor gradient
                    const t = (y - horizonY) / (h - horizonY);
                    color = this.interpolateColor(this._floorColorHorizon, this._floorColor, t);
                }
                const pixel = (255 << 24) | (color.b << 16) | (color.g << 8) | color.r;
                const rowStart = y * w;
                for (let x = 0; x < w; x++) {
                    buffer32[rowStart + x] = pixel;
                }
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

        // Edge setup (once per triangle)
        const v0x = p0.x, v0y = p0.y;
        const v1x = p1.x, v1y = p1.y;
        const v2x = p2.x, v2y = p2.y;

        const e0_dx = v1x - v0x, e0_dy = v1y - v0y;
        const e1_dx = v2x - v1x, e1_dy = v2y - v1y;
        const e2_dx = v0x - v2x, e2_dy = v0y - v2y;

        // Check if triangle is degenerate
        const area = e0_dx * (v2y - v0y) - e0_dy * (v2x - v0x);
        if (Math.abs(area) < 0.5) return;

        const packedColor = tri.packedColor;

        // Scanline loop with edge coherence
        for (let y = minY; y <= maxY; y++) {
            // Calculate edge values at start of scanline
            let w0 = e0_dx * (y - v0y) - e0_dy * (minX - v0x);
            let w1 = e1_dx * (y - v1y) - e1_dy * (minX - v1x);
            let w2 = e2_dx * (y - v2y) - e2_dy * (minX - v2x);

            // Edge increments for x-stepping
            const w0_step = -e0_dy;
            const w1_step = -e1_dy;
            const w2_step = -e2_dy;

            const rowOffset = y * w;

            for (let x = minX; x <= maxX; x++) {
                // Inside test using edge equations
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    buffer32[rowOffset + x] = packedColor;
                }

                // Increment edge values
                w0 += w0_step;
                w1 += w1_step;
                w2 += w2_step;
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

        // Radius decreases with higher shininess (tighter highlights)
        const baseRadius = triangleSize * 0.3;
        const shininessScale = Math.max(0.1, 1.0 - (shininess / 256));
        const highlightRadius = baseRadius * shininessScale;

        return {
            centerX: highlightScreenPos.x,
            centerY: highlightScreenPos.y,
            radius: highlightRadius,
            intensity: specularIntensity,
            color: specularColor,
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
     * Render specular highlights as circular gradients
     * @param {Array} specularHighlights - Array of specular highlight data
     * @param {ImageData} imgData - Image data to draw on
     * @param {number} w - Width
     * @param {number} h - Height
     */
    renderSpecularHighlights(specularHighlights, imgData, w, h) {
        const data = imgData.data;

        specularHighlights.forEach(highlight => {
            const { centerX, centerY, radius, intensity, color, triangleBounds } = highlight;

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

            // Pre-calculate edge functions for triangle bounds checking (only if not bleeding)
            let p0, p1, p2, e0_dx, e0_dy, e1_dx, e1_dy, e2_dx, e2_dy, area;

            if (!this._specularBleedingEnabled) {
                p0 = { x: triangleBounds.v0.x, y: triangleBounds.v0.y };
                p1 = { x: triangleBounds.v1.x, y: triangleBounds.v1.y };
                p2 = { x: triangleBounds.v2.x, y: triangleBounds.v2.y };

                e0_dx = p1.x - p0.x; e0_dy = p1.y - p0.y;
                e1_dx = p2.x - p1.x; e1_dy = p2.y - p1.y;
                e2_dx = p0.x - p2.x; e2_dy = p0.y - p2.y;

                area = e0_dx * (p2.y - p0.y) - e0_dy * (p2.x - p0.x);
                if (Math.abs(area) < 0.5) return;
            }

            // Limit intensity when bleeding is enabled
            const maxIntensity = this._specularBleedingEnabled ? 0.6 : 1.0;
            const limitedIntensity = Math.min(intensity, maxIntensity);

            // Render circular gradient
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    // Check if pixel is inside triangle (only if not bleeding)
                    if (!this._specularBleedingEnabled) {
                        const w0 = e0_dx * (y - p0.y) - e0_dy * (x - p0.x);
                        const w1 = e1_dx * (y - p1.y) - e1_dy * (x - p1.x);
                        const w2 = e2_dx * (y - p2.y) - e2_dy * (x - p2.x);

                        // Skip if outside triangle
                        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                    }

                    const dx = x - centerX;
                    const dy = y - centerY;
                    const distSq = dx * dx + dy * dy;

                    // Only process pixels within the circle
                    if (distSq <= radiusSq) {
                        const pixelIdx = (y * w + x) * 4;

                        // Calculate falloff (smooth gradient from center to edge)
                        const distance = Math.sqrt(distSq);
                        const falloff = 1.0 - (distance / radius);

                        // Apply smoothstep for smoother gradient
                        const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

                        // Final alpha based on limited intensity and falloff
                        const alpha = limitedIntensity * smoothFalloff;

                        if (alpha > 0.01) {
                            // Get existing pixel color
                            const existingR = data[pixelIdx];
                            const existingG = data[pixelIdx + 1];
                            const existingB = data[pixelIdx + 2];

                            // Additive blending with specular color
                            const specR = Math.min(255, existingR + color.r * alpha);
                            const specG = Math.min(255, existingG + color.g * alpha);
                            const specB = Math.min(255, existingB + color.b * alpha);

                            data[pixelIdx] = specR;
                            data[pixelIdx + 1] = specG;
                            data[pixelIdx + 2] = specB;
                            // Keep alpha channel unchanged
                        }
                    }
                }
            }
        });
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

    getRenderedTexture() {
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

        if (!this._isActive) return null;

        this.render3D();
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
            _specularEnabled: this._specularEnabled,
            _specularBleedingEnabled: this._specularBleedingEnabled,
            _specularPerMesh: this._specularPerMesh,
            _showDebugInfo: this._showDebugInfo,
            _maxLights: this._maxLights,
            _lightFindDistance: this._lightFindDistance,
            _useDynamicLighting: this._useDynamicLightin
       
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
        if (json._backgroundType !== undefined) { this._backgroundType = json._backgroundType; } else { this._backgroundType = "skyfloor"; }
        if (json._specularEnabled !== undefined) this._specularEnabled = json._specularEnabled;
        if (json._specularBleedingEnabled !== undefined) this._specularBleedingEnabled = json._specularBleedingEnabled;
        if (json._specularPerMesh !== undefined) this._specularPerMesh = json._specularPerMesh;
        if (json._showDebugInfo !== undefined) this._showDebugInfo = json._showDebugInfo;
        if (json._maxLights !== undefined) this._maxLights = json._maxLights;
        if (json._lightFindDistance !== undefined) this._lightFindDistance = json._lightFindDistance;
        if (json._useDynamicLighting !== undefined) this._useDynamicLighting = json._useDynamicLighting;
        
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