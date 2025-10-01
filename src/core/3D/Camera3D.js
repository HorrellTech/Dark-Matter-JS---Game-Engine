/**
 * Camera3D - Module for 3D perspective cameras
 * 
 * This module provides 3D camera functionality with multiple rendering methods.
 * Supports: Painter's Algorithm, Z-Buffer, Scanline, and Raytracing.
 */
class Camera3D extends Module {
    static namespace = "WIP";

    constructor() {
        super("Camera3D");

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
        this._renderingMethod = "painter";
        this._enableBackfaceCulling = false;
        this._disableCulling = true;
        this._cullingFieldOfView = 60; // Use same FOV as main camera for consistent culling
        this._zBuffer = null;
        this._imageData = null;

        this._lightDirection = new Vector3(1, -1, -1); // Default light direction
        this._lightColor = "#ffffff";
        this._lightIntensity = 1.0;
        this._ambientIntensity = 0.3;

        // Depth of field properties
        this._depthOfFieldEnabled = false;
        this._focalDistance = 100;
        this._aperture = 50;
        this._maxBlurRadius = 3;

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

        /*this.exposeProperty("depthOfFieldEnabled", "boolean", false, {
            onChange: (val) => this._depthOfFieldEnabled = val
        });
        this.exposeProperty("focalDistance", "number", 100, {
            min: 1, max: 1000, step: 1, onChange: (val) => this._focalDistance = val
        });
        this.exposeProperty("aperture", "number", 50, {
            min: 1, max: 200, step: 1, onChange: (val) => this._aperture = val
        });
        this.exposeProperty("maxBlurRadius", "number", 3, {
            min: 1, max: 10, step: 0.5, onChange: (val) => this._maxBlurRadius = val
        });*/

        this.exposeProperty("backgroundColor", "color", "#000000", {
            onChange: (val) => this._backgroundColor = val
        });
        this.exposeProperty("drawGizmoInRuntime", "boolean", false, {
            onChange: (val) => this.drawGizmoInRuntime = val
        });
        this.exposeProperty("renderTextureWidth", "number", 320, {
            min: 64, max: 2048, step: 64,
            onChange: (val) => {
                this._renderTextureWidth = this._renderingMethod === "raytrace" ? Math.min(val, 160) : val;
                this.updateRenderTexture();
            }
        });
        this.exposeProperty("renderTextureHeight", "number", 240, {
            min: 64, max: 2048, step: 64,
            onChange: (val) => {
                this._renderTextureHeight = this._renderingMethod === "raytrace" ? Math.min(val, 120) : val;
                this.updateRenderTexture();
            }
        });
        this.exposeProperty("renderTextureSmoothing", "boolean", false, {
            onChange: (val) => this._renderTextureSmoothing = val
        });
        this.exposeProperty("renderingMethod", "dropdown", "painter", {
            options: ["painter", "zbuffer", "raytrace", "depthpass", "raster", "hybrid"],
            onChange: (val) => {
                this._renderingMethod = val;
                if (val === "raytrace") {
                    this._renderTextureWidth = Math.min(this._renderTextureWidth, 160);
                    this._renderTextureHeight = Math.min(this._renderTextureHeight, 120);
                    this.updateRenderTexture();
                }
            }
        });
        this.exposeProperty("enableBackfaceCulling", "boolean", false, {
            onChange: (val) => this._enableBackfaceCulling = val
        });
        this.exposeProperty("disableCulling", "boolean", false, {
            onChange: (val) => this._disableCulling = val
        });
        this.exposeProperty("cullingFieldOfView", "number", 90, {
            min: 1, max: 179, onChange: (val) => this._cullingFieldOfView = val
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
        const depth = -cameraPoint.z;  // Use Z as depth (negative because camera looks down -Z)
        if (depth <= this.nearPlane || depth >= this.farPlane) return null;
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);
        if (depth < 1e-6) return null;
        const ndcX = (cameraPoint.x / depth) * (f / aspect);  // X becomes screen X
        const ndcY = (cameraPoint.y / depth) * f;           // Y becomes screen Y
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
        const epsilon = 0.001; // Increased from 0.0001 for more stability

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const aIn = a.x >= nearPlane - epsilon;
            const bIn = b.x >= nearPlane - epsilon;

            if (aIn && bIn) {
                // Both vertices in front of near plane
                out.push(b);
            } else if (aIn && !bIn) {
                // Edge crosses near plane, going out
                const t = (nearPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    nearPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
            } else if (!aIn && bIn) {
                // Edge crosses near plane, coming in
                const t = (nearPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    nearPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
                out.push(b);
            }
            // If both are behind (!aIn && !bIn), skip both vertices
        }

        return out;
    }

    clipPolygonAgainstFarPlane(vertices, farPlane) {
        if (!vertices || vertices.length === 0) return [];
        const out = [];
        const epsilon = 0.001;

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const aIn = a.x <= farPlane + epsilon;
            const bIn = b.x <= farPlane + epsilon;

            if (aIn && bIn) {
                out.push(b);
            } else if (aIn && !bIn) {
                const t = (farPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    farPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
            } else if (!aIn && bIn) {
                const t = (farPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    farPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
                out.push(b);
            }
        }

        return out;
    }

    projectCameraPoint(cameraPoint, useCullingFov = false) {
        const depth = cameraPoint.x;
        // Remove this check since we clip beforehand
        // if (depth <= this.nearPlane || depth >= this.farPlane) return null;
        if (depth <= 1e-6) return null; // Only check for zero/negative depth

        const aspect = this.viewportWidth / this.viewportHeight;
        const fovToUse = useCullingFov ? this._cullingFieldOfView : this.fieldOfView;
        const fovRadians = fovToUse * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);
        const ndcX = (cameraPoint.y / depth) * (f / aspect);
        const ndcY = (cameraPoint.z / depth) * f;
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;
        return new Vector2(screenX, screenY);
    }

    isPointVisible(point, checkFOV = true) {
        const cameraPoint = this.worldToCameraSpace(point);

        // Check depth planes first
        if (cameraPoint.x < this.nearPlane || cameraPoint.x > this.farPlane) {
            return false;
        }

        // If FOV checking is disabled, just check depth planes
        if (!checkFOV || this._disableCulling) {
            return true;
        }

        // Calculate if point is within FOV
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians * 0.5);

        // Check if point is within horizontal FOV
        const horizontalBound = Math.abs(cameraPoint.y) / cameraPoint.x;
        const maxHorizontal = tanHalfFov * aspect;

        // Check if point is within vertical FOV
        const verticalBound = Math.abs(cameraPoint.z) / cameraPoint.x;
        const maxVertical = tanHalfFov;

        return horizontalBound <= maxHorizontal && verticalBound <= maxVertical;
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

    // Improved backface culling that works consistently across all rendering methods
    shouldCullFace(cameraSpaceVertices) {
        if (cameraSpaceVertices.length < 3) return true;

        const v0 = cameraSpaceVertices[0];
        const v1 = cameraSpaceVertices[1];
        const v2 = cameraSpaceVertices[2];

        // Calculate face normal in camera space using right-hand rule
        // For counter-clockwise winding, this gives us the front-facing normal
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        const normal = {
            x: edge1.y * edge2.z - edge1.z * edge2.y,
            y: edge1.z * edge2.x - edge1.x * edge2.z,
            z: edge1.x * edge2.y - edge1.y * edge2.x
        };

        // Normalize the normal vector
        const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        if (normalLength < 1e-10) return true; // Degenerate triangle

        const normalizedNormal = {
            x: normal.x / normalLength,
            y: normal.y / normalLength,
            z: normal.z / normalLength
        };

        // View direction in camera space is along +X axis (camera looking towards +X)
        const viewDir = { x: 1, y: 0, z: 0 };

        // Dot product between face normal and view direction
        // If dot > 0, face normal points towards camera (visible)
        // If dot < 0, face normal points away from camera (backface)
        const dot = normalizedNormal.x * viewDir.x + normalizedNormal.y * viewDir.y + normalizedNormal.z * viewDir.z;

        // For counter-clockwise winding, we want to cull faces where dot < 0 (backfaces)
        // But we need to ensure the cube faces are oriented correctly
        return dot < 0;
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

    renderPainter() {
        const allObjects = this.getGameObjects();
        const allFaces = [];

        // Collect all faces with their data
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            let texture = null, uvCoords = null;
            if (mesh.texture && (mesh.texture instanceof Image || mesh.texture instanceof HTMLCanvasElement)) {
                texture = mesh.texture;
                uvCoords = mesh.uvCoords || mesh.generateDefaultUVs();
            }

            mesh.faces.forEach((face, faceIndex) => {
                // Get world space vertices
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                // Transform to camera space
                const cameraSpaceVertices = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraSpaceVertices.length < 3) return;

                // Backface culling - only if enabled
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(cameraSpaceVertices)) return;
                }

                // Calculate world normal for lighting
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);

                // Calculate sorting depth
                const depths = cameraSpaceVertices.map(v => v.x);
                const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
                const minDepth = Math.min(...depths);
                const sortDepth = avgDepth * 0.7 + minDepth * 0.3;

                allFaces.push({
                    cameraSpaceVertices,
                    worldNormal,
                    mesh,
                    texture,
                    faceUVs: texture && uvCoords && uvCoords[faceIndex] ? uvCoords[faceIndex] : null,
                    sortDepth
                });
            });
        });

        // Sort back-to-front
        allFaces.sort((a, b) => b.sortDepth - a.sortDepth);

        const ctx = this._renderTextureCtx;

        // Render each face
        allFaces.forEach(({ cameraSpaceVertices, worldNormal, mesh, texture, faceUVs }) => {
            // Clip against near plane
            let clippedVerts = this.clipPolygonAgainstNearPlane(cameraSpaceVertices, this._nearPlane);
            if (clippedVerts.length < 3) return;

            // Clip against far plane
            clippedVerts = this.clipPolygonAgainstFarPlane(clippedVerts, this._farPlane);
            if (clippedVerts.length < 3) return;

            // Project to screen space
            const useExtendedFOV = !this._disableCulling;
            const projectedVerts = clippedVerts.map(cv => this.projectCameraPoint(cv, useExtendedFOV));

            // Filter to only valid projections, but keep vertex correspondence
            const validVerts = [];
            const validIndices = [];
            for (let i = 0; i < projectedVerts.length; i++) {
                if (projectedVerts[i] !== null) {
                    validVerts.push(projectedVerts[i]);
                    validIndices.push(i);
                }
            }

            // Need at least 3 valid vertices to render
            if (validVerts.length < 3) return;

            // Calculate lighting
            const baseColor = mesh.faceColor || mesh._faceColor || "#888888";
            const litColor = this.calculateLighting(worldNormal, baseColor);

            ctx.save();

            // Render textured triangles
            if (texture && faceUVs && faceUVs.length >= 3) {
                for (let i = 1; i < validVerts.length - 1; i++) {
                    const triVerts = [validVerts[0], validVerts[i], validVerts[i + 1]];
                    // Map UVs using valid indices
                    const triUVs = [
                        faceUVs[Math.min(validIndices[0], faceUVs.length - 1)],
                        faceUVs[Math.min(validIndices[i], faceUVs.length - 1)],
                        faceUVs[Math.min(validIndices[i + 1], faceUVs.length - 1)]
                    ];
                    this.drawTexturedTriangle(ctx, triVerts, triUVs, texture);
                }
            } else {
                // Render solid color
                if (mesh.renderMode === "solid" || mesh.renderMode === "both") {
                    ctx.fillStyle = `rgb(${litColor.r}, ${litColor.g}, ${litColor.b})`;
                    ctx.beginPath();
                    ctx.moveTo(validVerts[0].x, validVerts[0].y);
                    for (let i = 1; i < validVerts.length; i++) {
                        ctx.lineTo(validVerts[i].x, validVerts[i].y);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Render wireframe
            if (mesh.renderMode === "wireframe" || mesh.renderMode === "both") {
                ctx.strokeStyle = mesh.wireframeColor || mesh._wireframeColor || "#ffffff";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(validVerts[0].x, validVerts[0].y);
                for (let i = 1; i < validVerts.length; i++) {
                    ctx.lineTo(validVerts[i].x, validVerts[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    // Combines spatial subdivision with Z-buffering for better performance
    renderHZB() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;
        const bgColor = this.hexToRgb(this._backgroundColor);

        // Clear buffer
        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
        }

        // Build hierarchical structure (16x16 tiles)
        const tileSize = 16;
        const tilesX = Math.ceil(w / tileSize);
        const tilesY = Math.ceil(h / tileSize);
        const tiles = Array.from({ length: tilesY }, () =>
            Array.from({ length: tilesX }, () => ({ triangles: [], minDepth: Infinity }))
        );

        // Collect and bin triangles into tiles
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);
                //const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                //if (clippedVerts.length < 3) return;


                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Clip against near plane first
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling using consistent method (after clipping)
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) {
                        return; // Cull if facing away from camera
                    }
                }
                const rgb = litColor;

                const clippedFar = clippedVerts.filter(v => v.x <= this._farPlane);
                if (clippedFar.length < 3) return;

                const useExtendedFOV = !this._disableCulling;
                const screenVerts = clippedFar.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);
                if (screenVerts.length < 3) {
                    // When culling is disabled, check if we have any valid projections
                    if (!this._disableCulling || screenVerts.length === 0) return;
                }

                // Triangulate and bin into tiles
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const tri = [screenVerts[0], screenVerts[i], screenVerts[i + 1]];
                    const minDepth = Math.min(tri[0].depth, tri[1].depth, tri[2].depth);

                    // Calculate bounding box in tile space
                    const minX = Math.floor(Math.min(tri[0].screen.x, tri[1].screen.x, tri[2].screen.x) / tileSize);
                    const maxX = Math.floor(Math.max(tri[0].screen.x, tri[1].screen.x, tri[2].screen.x) / tileSize);
                    const minY = Math.floor(Math.min(tri[0].screen.y, tri[1].screen.y, tri[2].screen.y) / tileSize);
                    const maxY = Math.floor(Math.max(tri[0].screen.y, tri[1].screen.y, tri[2].screen.y) / tileSize);

                    // Add triangle to overlapping tiles
                    for (let ty = Math.max(0, minY); ty <= Math.min(tilesY - 1, maxY); ty++) {
                        for (let tx = Math.max(0, minX); tx <= Math.min(tilesX - 1, maxX); tx++) {
                            tiles[ty][tx].triangles.push({ tri, color: rgb, minDepth });
                            tiles[ty][tx].minDepth = Math.min(tiles[ty][tx].minDepth, minDepth);
                        }
                    }
                }
            });
        });

        // Render tiles front-to-back with early Z rejection
        const tileOrder = [];
        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                if (tiles[ty][tx].triangles.length > 0) {
                    tileOrder.push({ tx, ty, depth: tiles[ty][tx].minDepth });
                }
            }
        }
        tileOrder.sort((a, b) => a.depth - b.depth);

        // Render each tile
        tileOrder.forEach(({ tx, ty }) => {
            const tile = tiles[ty][tx];
            const xStart = tx * tileSize;
            const yStart = ty * tileSize;
            const xEnd = Math.min(xStart + tileSize, w);
            const yEnd = Math.min(yStart + tileSize, h);

            // Sort triangles in tile by depth
            tile.triangles.sort((a, b) => a.minDepth - b.minDepth);

            // Rasterize triangles in tile
            tile.triangles.forEach(({ tri, color }) => {
                for (let y = yStart; y < yEnd; y++) {
                    for (let x = xStart; x < xEnd; x++) {
                        const p0 = { x: tri[0].screen.x, y: tri[0].screen.y, z: tri[0].depth };
                        const p1 = { x: tri[1].screen.x, y: tri[1].screen.y, z: tri[1].depth };
                        const p2 = { x: tri[2].screen.x, y: tri[2].screen.y, z: tri[2].depth };

                        const bary = this.barycentric(p0, p1, p2, x, y);
                        if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                            const depth = bary.u * p0.z + bary.v * p1.z + bary.w * p2.z;
                            const idx = y * w + x;
                            if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                                this._zBuffer[idx] = depth;
                                const pixelIdx = idx * 4;
                                data[pixelIdx] = color.r;
                                data[pixelIdx + 1] = color.g;
                                data[pixelIdx + 2] = color.b;
                                data[pixelIdx + 3] = 255;
                            }
                        }
                    }
                }
            });
        });

        ctx.putImageData(imgData, 0, 0);
    }

    // Advanced depth-accurate rendering with hierarchical depth testing and depth of field
    renderDepthPass() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;
        const bgColor = this.hexToRgb(this._backgroundColor);

        // Clear buffers
        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
        }
        this._zBuffer.fill(Infinity);

        // Pre-process triangles with accurate depth information
        const allTriangles = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx =>
                    idx < transformedVertices.length ? transformedVertices[idx] : null
                ).filter(v => v);

                if (worldVerts.length < 3) return;
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);

                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);

                if (cameraVerts.length < 3) return;

                for (let i = 1; i < cameraVerts.length - 1; i++) {
                    const v0 = cameraVerts[0], v1 = cameraVerts[i], v2 = cameraVerts[i + 1];

                    // Clip triangles against near plane first
                    const clippedV0 = this.clipPolygonAgainstNearPlane([v0], this._nearPlane);
                    const clippedV1 = this.clipPolygonAgainstNearPlane([v1], this._nearPlane);
                    const clippedV2 = this.clipPolygonAgainstNearPlane([v2], this._nearPlane);

                    if (clippedV0.length === 0 || clippedV1.length === 0 || clippedV2.length === 0) {
                        continue; // All vertices clipped away
                    }

                    // Use clipped vertices for backface culling
                    const clippedTriangle = [clippedV0[0] || v0, clippedV1[0] || v1, clippedV2[0] || v2];

                    // Backface culling using consistent method (after clipping)
                    if (this._enableBackfaceCulling && !this._disableCulling) {
                        if (this.shouldCullFace(clippedTriangle)) {
                            continue;
                        }
                    }

                    const rgb = this.calculateLighting(worldNormal, faceColor);
                    allTriangles.push({
                        v0, v1, v2, color: rgb, worldNormal,
                        worldVerts: [worldVerts[0], worldVerts[i], worldVerts[i + 1]]
                    });
                }
            });
        });

        // Build hierarchical Z-buffer for accurate depth testing
        const hzbSize = Math.max(w, h);
        const hzbLevels = Math.ceil(Math.log2(hzbSize)) + 1;
        const hzbBuffers = [];

        // Create hierarchical Z-buffer levels
        for (let level = 0; level < hzbLevels; level++) {
            const levelSize = Math.max(1, hzbSize >> level);
            hzbBuffers[level] = new Float32Array(levelSize * levelSize).fill(Infinity);
        }

        // Primary depth pass with hierarchical optimization
        this.renderDepthPassPrimary(allTriangles, data, w, h, hzbBuffers);

        // Depth of field effect
        this.applyDepthOfField(data, w, h);

        ctx.putImageData(imgData, 0, 0);
    }

    // Primary depth pass with hierarchical Z-buffer optimization
    renderDepthPassPrimary(triangles, data, w, h, hzbBuffers) {
        // Sort triangles by average depth (back to front for proper depth testing)
        triangles.sort((a, b) => {
            const depthA = (a.v0.x + a.v1.x + a.v2.x) / 3;
            const depthB = (b.v0.x + b.v1.x + b.v2.x) / 3;
            return depthB - depthA; // Back to front
        });

        triangles.forEach(tri => {
            const { v0, v1, v2, color } = tri;

            // Project to screen space
            const useExtendedFOV = !this._disableCulling;
            const p0 = this.projectCameraPoint(v0, useExtendedFOV);
            const p1 = this.projectCameraPoint(v1, useExtendedFOV);
            const p2 = this.projectCameraPoint(v2, useExtendedFOV);

            if (!p0 || !p1 || !p2) return;

            // Calculate triangle bounds
            const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
            const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
            const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
            const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));

            // Early hierarchical depth culling
            const triDepth = (v0.x + v1.x + v2.x) / 3;
            if (this.canCullTriangleHZB(minX, minY, maxX, maxY, triDepth, hzbBuffers)) {
                return;
            }

            // Rasterize triangle with accurate depth testing
            for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
                for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
                    const bary = this.barycentric(
                        { x: p0.x, y: p0.y, z: v0.x },
                        { x: p1.x, y: p1.y, z: v1.x },
                        { x: p2.x, y: p2.y, z: v2.x },
                        x, y
                    );

                    if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                        const depth = bary.u * v0.x + bary.v * v1.x + bary.w * v2.x;
                        const idx = y * w + x;

                        // Hierarchical depth test
                        if (depth >= this._nearPlane && depth <= this._farPlane &&
                            depth < this._zBuffer[idx] &&
                            this.hierarchicalDepthTest(x, y, depth, hzbBuffers)) {

                            this._zBuffer[idx] = depth;
                            this.updateHZB(x, y, depth, hzbBuffers);

                            const pixelIdx = idx * 4;
                            data[pixelIdx] = color.r;
                            data[pixelIdx + 1] = color.g;
                            data[pixelIdx + 2] = color.b;
                            data[pixelIdx + 3] = 255;
                        }
                    }
                }
            }
        });
    }

    // Check if triangle can be culled using hierarchical Z-buffer
    canCullTriangleHZB(minX, minY, maxX, maxY, triDepth, hzbBuffers) {
        const levels = hzbBuffers.length;
        const startLevel = Math.max(0, Math.floor(Math.log2(Math.max(maxX - minX, maxY - minY))) - 2);

        for (let level = startLevel; level < levels; level++) {
            const levelSize = Math.max(1, hzbBuffers[0].length >> level);
            const scale = levelSize / Math.max(1, hzbBuffers[0].length >> (level + 1) || 1);

            const tileX = Math.floor((minX + maxX) * 0.5 / scale);
            const tileY = Math.floor((minY + maxY) * 0.5 / scale);

            if (tileX >= 0 && tileX < levelSize && tileY >= 0 && tileY < levelSize) {
                const hzbIdx = tileY * levelSize + tileX;
                if (hzbBuffers[level][hzbIdx] < triDepth) {
                    return true; // Triangle is behind HZB, cull it
                }
            }
        }
        return false;
    }

    // Hierarchical depth test
    hierarchicalDepthTest(x, y, depth, hzbBuffers) {
        const levels = hzbBuffers.length;

        for (let level = 0; level < levels; level++) {
            const levelSize = Math.max(1, hzbBuffers[0].length >> level);
            const tileX = Math.floor(x * levelSize / this._renderTextureWidth);
            const tileY = Math.floor(y * levelSize / this._renderTextureHeight);

            if (tileX >= 0 && tileX < levelSize && tileY >= 0 && tileY < levelSize) {
                const hzbIdx = tileY * levelSize + tileX;
                if (depth >= hzbBuffers[level][hzbIdx]) {
                    return false;
                }
            }
        }

        return true;
    }

    // Update hierarchical Z-buffer
    updateHZB(x, y, depth, hzbBuffers) {
        const levels = hzbBuffers.length;

        for (let level = 0; level < levels; level++) {
            const levelSize = Math.max(1, hzbBuffers[0].length >> level);
            const tileX = Math.floor(x * levelSize / this._renderTextureWidth);
            const tileY = Math.floor(y * levelSize / this._renderTextureHeight);

            if (tileX >= 0 && tileX < levelSize && tileY >= 0 && tileY < levelSize) {
                const hzbIdx = tileY * levelSize + tileX;
                hzbBuffers[level][hzbIdx] = Math.min(hzbBuffers[level][hzbIdx], depth);
            }
        }
    }

    // Apply depth of field effect
    applyDepthOfField(data, w, h) {
        if (!this._depthOfFieldEnabled) return;

        const tempBuffer = new Uint8ClampedArray(data);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                const depth = this._zBuffer[idx];

                if (depth === Infinity) continue;

                // Calculate blur amount based on depth difference from focal plane
                const depthDiff = Math.abs(depth - this._focalDistance);
                const blurRadius = Math.min(this._maxBlurRadius, (depthDiff / this._aperture));

                if (blurRadius < 1) continue;

                // Apply Gaussian blur
                let r = 0, g = 0, b = 0, samples = 0;
                const radius = Math.ceil(blurRadius);

                for (let by = -radius; by <= radius; by++) {
                    for (let bx = -radius; bx <= radius; bx++) {
                        const sx = x + bx;
                        const sy = y + by;

                        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                            const sIdx = sy * w + sx;
                            const distance = Math.sqrt(bx * bx + by * by);
                            const weight = Math.exp(-(distance * distance) / (2 * blurRadius * blurRadius));

                            r += tempBuffer[sIdx * 4] * weight;
                            g += tempBuffer[sIdx * 4 + 1] * weight;
                            b += tempBuffer[sIdx * 4 + 2] * weight;
                            samples += weight;
                        }
                    }
                }

                data[idx * 4] = Math.round(r / samples);
                data[idx * 4 + 1] = Math.round(g / samples);
                data[idx * 4 + 2] = Math.round(b / samples);
            }
        }
    }

    renderZBuffer() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;
        const bgColor = this.hexToRgb(this._backgroundColor);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
        }
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";
            const rgb = this.hexToRgb(faceColor);
            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);

                // Calculate world vertices for normal calculation
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);
                const rgb = litColor;

                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);
                if (screenVerts.length < 3) return;

                // Clip against near plane first
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Use consistent backface culling method (after clipping)
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) {
                        return;
                    }
                }

                for (let i = 1; i < screenVerts.length - 1; i++) {
                    this.rasterizeTriangle(screenVerts[0], screenVerts[i], screenVerts[i + 1], rgb, data, w, h);
                }
            });
        });
        ctx.putImageData(imgData, 0, 0);
    }

    rasterizeTriangle(v0, v1, v2, color, data, w, h) {
        const p0 = { x: Math.round(v0.screen.x), y: Math.round(v0.screen.y), z: v0.depth };
        const p1 = { x: Math.round(v1.screen.x), y: Math.round(v1.screen.y), z: v1.depth };
        const p2 = { x: Math.round(v2.screen.x), y: Math.round(v2.screen.y), z: v2.depth };
        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const bary = this.barycentric(p0, p1, p2, x, y);
                if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                    const depth = bary.u * p0.z + bary.v * p1.z + bary.w * p2.z;
                    const idx = y * w + x;
                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                        this._zBuffer[idx] = depth;
                        const pixelIdx = idx * 4;
                        data[pixelIdx] = color.r; data[pixelIdx + 1] = color.g;
                        data[pixelIdx + 2] = color.b; data[pixelIdx + 3] = 255;
                    }
                }
            }
        }
    }

    barycentric(p0, p1, p2, x, y) {
        const denom = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
        if (Math.abs(denom) < 0.001) return { u: -1, v: -1, w: -1 };
        const u = ((p1.y - p2.y) * (x - p2.x) + (p2.x - p1.x) * (y - p2.y)) / denom;
        const v = ((p2.y - p0.y) * (x - p2.x) + (p0.x - p2.x) * (y - p2.y)) / denom;
        return { u, v, w: 1 - u - v };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    renderScanline() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;

        // Clear buffers
        this._zBuffer.fill(Infinity);
        this.clearRenderTexture();

        // Build edge table and active edge table
        const edgeTable = Array.from({ length: h }, () => []);
        const activeEdges = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);

                if (cameraVerts.length < 3) return;

                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling using consistent method (after clipping)
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) {
                        return;
                    }
                }

                const useExtendedFOV = !this._disableCulling;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);

                if (screenVerts.length < 3) return;

                // Add edges to edge table for each triangle in the polygon
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const tri = [screenVerts[0], screenVerts[i], screenVerts[i + 1]];
                    this.addTriangleEdgesToEdgeTable(tri, edgeTable, h);
                }
            });
        });

        // Process scanlines using active edge table
        for (let y = 0; y < h; y++) {
            // Add edges that start at this scanline
            edgeTable[y].forEach(edge => {
                activeEdges.push(edge);
            });

            // Remove edges that end at this scanline
            for (let i = activeEdges.length - 1; i >= 0; i--) {
                if (Math.ceil(activeEdges[i].yEnd) <= y) {
                    activeEdges.splice(i, 1);
                }
            }

            if (activeEdges.length < 2) continue;

            // Sort active edges by x coordinate
            activeEdges.sort((a, b) => a.x - b.x);

            // Fill between edge pairs
            for (let i = 0; i < activeEdges.length - 1; i += 2) {
                const leftEdge = activeEdges[i];
                const rightEdge = activeEdges[i + 1];

                const xStart = Math.max(0, Math.ceil(leftEdge.x));
                const xEnd = Math.min(w - 1, Math.floor(rightEdge.x));

                if (xStart > xEnd) continue;

                // Calculate depth values for left and right edges
                const leftZ = leftEdge.z + (y - leftEdge.yStart) * leftEdge.zSlope;
                const rightZ = rightEdge.z + (y - rightEdge.yStart) * rightEdge.zSlope;

                // Fill scanline
                for (let x = xStart; x <= xEnd; x++) {
                    if (x < 0 || x >= w) continue;

                    const t = (xEnd - xStart) > 0 ? (x - xStart) / (xEnd - xStart) : 0;
                    const z = leftZ + t * (rightZ - leftZ);
                    const idx = y * w + x;

                    if (z >= this._nearPlane && z <= this._farPlane && z < this._zBuffer[idx]) {
                        this._zBuffer[idx] = z;

                        // Set pixel color (use a default color for now)
                        const color = leftEdge.color || "#888888";
                        ctx.fillStyle = color;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }

            // Update active edges for next scanline
            activeEdges.forEach(edge => {
                edge.x += edge.slope;
                edge.z += edge.zSlope;
            });
        }
    }

    // Advanced hybrid rasterizer with tile-based optimization and optional ray-traced effects
    renderRasterHybrid() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;
        const bgColor = this.hexToRgb(this._backgroundColor);

        // Clear buffers
        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
        }
        this._zBuffer.fill(Infinity);

        // Tile-based rendering setup (8x8 tiles for better cache coherency)
        const tileSize = 8;
        const tilesX = Math.ceil(w / tileSize);
        const tilesY = Math.ceil(h / tileSize);

        // Collect all triangles with preprocessing
        const allTriangles = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx =>
                    idx < transformedVertices.length ? transformedVertices[idx] : null
                ).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                // Clip against near/far planes first (consistent with other methods)
                let clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;
                clippedVerts = this.clipPolygonAgainstFarPlane(clippedVerts, this._farPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling - check after clipping to ensure accuracy
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                // Calculate lighting
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Triangulate polygon
                for (let i = 1; i < clippedVerts.length - 1; i++) {
                    const v0 = clippedVerts[0], v1 = clippedVerts[i], v2 = clippedVerts[i + 1];

                    // Backface culling already checked before clipping, no need to re-check

                    // Project to screen space
                    const useExtendedFOV = !this._disableCulling;
                    const p0 = this.projectCameraPoint(v0, useExtendedFOV);
                    const p1 = this.projectCameraPoint(v1, useExtendedFOV);
                    const p2 = this.projectCameraPoint(v2, useExtendedFOV);

                    if (!p0 || !p1 || !p2) continue;

                    allTriangles.push({
                        v0: { x: p0.x, y: p0.y, z: v0.x },
                        v1: { x: p1.x, y: p1.y, z: v1.x },
                        v2: { x: p2.x, y: p2.y, z: v2.x },
                        color: litColor,
                        worldNormal,
                        avgDepth: (v0.x + v1.x + v2.x) / 3
                    });
                }
            });
        });

        // Sort triangles front-to-back for early depth rejection
        allTriangles.sort((a, b) => a.avgDepth - b.avgDepth);

        // Bin triangles into tiles
        const tiles = Array.from({ length: tilesY }, () =>
            Array.from({ length: tilesX }, () => [])
        );

        allTriangles.forEach(tri => {
            const minX = Math.floor(Math.min(tri.v0.x, tri.v1.x, tri.v2.x) / tileSize);
            const maxX = Math.floor(Math.max(tri.v0.x, tri.v1.x, tri.v2.x) / tileSize);
            const minY = Math.floor(Math.min(tri.v0.y, tri.v1.y, tri.v2.y) / tileSize);
            const maxY = Math.floor(Math.max(tri.v0.y, tri.v1.y, tri.v2.y) / tileSize);

            for (let ty = Math.max(0, minY); ty <= Math.min(tilesY - 1, maxY); ty++) {
                for (let tx = Math.max(0, minX); tx <= Math.min(tilesX - 1, maxX); tx++) {
                    tiles[ty][tx].push(tri);
                }
            }
        });

        // Rasterize tiles with optimized inner loops
        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                const tileTris = tiles[ty][tx];
                if (tileTris.length === 0) continue;

                const xStart = tx * tileSize;
                const yStart = ty * tileSize;
                const xEnd = Math.min(xStart + tileSize, w);
                const yEnd = Math.min(yStart + tileSize, h);

                // Rasterize all triangles in this tile
                tileTris.forEach(tri => {
                    this.rasterizeTriangleOptimized(tri, data, w, h, xStart, yStart, xEnd, yEnd);
                });
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    // Optimized triangle rasterization with tight bounds and early rejection
    rasterizeTriangleOptimized(tri, data, width, height, tileX, tileY, tileEndX, tileEndY) {
        const { v0, v1, v2, color } = tri;

        // Calculate triangle bounds within tile
        const minX = Math.max(tileX, Math.floor(Math.min(v0.x, v1.x, v2.x)));
        const maxX = Math.min(tileEndX - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
        const minY = Math.max(tileY, Math.floor(Math.min(v0.y, v1.y, v2.y)));
        const maxY = Math.min(tileEndY - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

        if (minX > maxX || minY > maxY) return;

        // Precompute edge equations for faster inside testing
        const edge0 = this.computeEdgeFunction(v1, v2);
        const edge1 = this.computeEdgeFunction(v2, v0);
        const edge2 = this.computeEdgeFunction(v0, v1);

        // Calculate area (for barycentric coordinates)
        const area = edge0.c + edge1.c + edge2.c;
        if (Math.abs(area) < 0.001) return;

        const invArea = 1.0 / area;

        // Scanline rasterization with edge stepping
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Evaluate edge functions
                const w0 = edge0.a * x + edge0.b * y + edge0.c;
                const w1 = edge1.a * x + edge1.b * y + edge1.c;
                const w2 = edge2.a * x + edge2.b * y + edge2.c;

                // Inside test
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    // Calculate barycentric coordinates
                    const baryU = w0 * invArea;
                    const baryV = w1 * invArea;
                    const baryW = w2 * invArea;

                    // Interpolate depth
                    const depth = baryU * v0.z + baryV * v1.z + baryW * v2.z;
                    const idx = y * width + x;

                    // Depth test with early rejection
                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                        this._zBuffer[idx] = depth;
                        const pixelIdx = idx * 4;
                        data[pixelIdx] = color.r;
                        data[pixelIdx + 1] = color.g;
                        data[pixelIdx + 2] = color.b;
                        data[pixelIdx + 3] = 255;
                    }
                }
            }
        }
    }

    // Compute edge function coefficients for fast inside testing
    computeEdgeFunction(v0, v1) {
        const a = v0.y - v1.y;
        const b = v1.x - v0.x;
        const c = v0.x * v1.y - v0.y * v1.x;
        return { a, b, c };
    }

    // Ray-traced hybrid rendering with rasterized base and ray-traced enhancements
    renderRaytraceHybrid() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;
        const bgColor = this.hexToRgb(this._backgroundColor);

        // First pass: Fast rasterization for base geometry
        for (let i = 0; i < data.length; i += 4) {
            data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
        }
        this._zBuffer.fill(Infinity);

        // Collect triangles for both rasterization and ray tracing
        const allTriangles = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx =>
                    idx < transformedVertices.length ? transformedVertices[idx] : null
                ).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                // Backface culling will be handled per-triangle after clipping

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);

                for (let i = 1; i < cameraVerts.length - 1; i++) {
                    const v0 = cameraVerts[0], v1 = cameraVerts[i], v2 = cameraVerts[i + 1];

                    // Clip triangle against near plane
                    const clippedV0 = this.clipPolygonAgainstNearPlane([v0], this._nearPlane);
                    const clippedV1 = this.clipPolygonAgainstNearPlane([v1], this._nearPlane);
                    const clippedV2 = this.clipPolygonAgainstNearPlane([v2], this._nearPlane);

                    if (clippedV0.length > 0 && clippedV1.length > 0 && clippedV2.length > 0) {
                        const clippedTriangle = [clippedV0[0] || v0, clippedV1[0] || v1, clippedV2[0] || v2];

                        // Backface culling after clipping
                        if (this._enableBackfaceCulling && !this._disableCulling) {
                            if (this.shouldCullFace(clippedTriangle)) {
                                continue;
                            }
                        }

                        allTriangles.push({
                            v0: clippedV0[0] || v0,
                            v1: clippedV1[0] || v1,
                            v2: clippedV2[0] || v2,
                            worldNormal,
                            baseColor: faceColor
                        });
                    }
                }
            });
        });

        // Build BVH for ray tracing
        const bvh = this.buildBVH(allTriangles, 8);

        // Rasterize base geometry
        allTriangles.forEach(tri => {
            const useExtendedFOV = !this._disableCulling;
            const p0 = this.projectCameraPoint(tri.v0, useExtendedFOV);
            const p1 = this.projectCameraPoint(tri.v1, useExtendedFOV);
            const p2 = this.projectCameraPoint(tri.v2, useExtendedFOV);

            if (!p0 || !p1 || !p2) return;

            const screenTri = {
                v0: { x: p0.x, y: p0.y, z: tri.v0.x },
                v1: { x: p1.x, y: p1.y, z: tri.v1.x },
                v2: { x: p2.x, y: p2.y, z: tri.v2.x },
                color: this.calculateLighting(tri.worldNormal, tri.baseColor)
            };

            this.rasterizeTriangleOptimized(screenTri, data, w, h, 0, 0, w, h);
        });

        // Second pass: Ray-traced enhancements (reflections, shadows, etc.)
        // Only process pixels that have geometry and sample every 4th pixel for performance
        const rayStep = 4;
        const aspect = w / h;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians * 0.5);

        // Pre-filter triangles that are potentially visible for ray tracing
        const visibleTriangles = [];
        allTriangles.forEach(tri => {
            // Quick frustum check - only include triangles that might be visible
            const avgDepth = (tri.v0.x + tri.v1.x + tri.v2.x) / 3;
            if (avgDepth >= this._nearPlane && avgDepth <= this._farPlane) {
                // Check if triangle is within extended FOV for culling
                const useExtendedFov = !this._disableCulling;
                const p0 = this.projectCameraPoint(tri.v0, useExtendedFov);
                const p1 = this.projectCameraPoint(tri.v1, useExtendedFov);
                const p2 = this.projectCameraPoint(tri.v2, useExtendedFov);

                // If any vertex projects successfully, include triangle for ray tracing
                if (p0 || p1 || p2) {
                    visibleTriangles.push(tri);
                }
            }
        });

        for (let y = 0; y < h; y += rayStep) {
            for (let x = 0; x < w; x += rayStep) {
                const idx = y * w + x;
                const depth = this._zBuffer[idx];

                if (depth === Infinity || depth >= this._farPlane) continue;

                // Cast ray for this pixel
                const u = (x / w) * 2 - 1;
                const v = 1 - (y / h) * 2;
                const rayDirX = 1;
                const rayDirY = u * tanHalfFov * aspect;
                const rayDirZ = v * tanHalfFov;
                const rayLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
                const rayDir = { x: rayDirX / rayLen, y: rayDirY / rayLen, z: rayDirZ / rayLen };
                const rayOrigin = { x: 0, y: 0, z: 0 };

                // Simple ambient occlusion approximation using pre-filtered triangles
                const aoSamples = 3;
                let occluded = 0;

                for (let i = 0; i < aoSamples; i++) {
                    const offset = { x: rayDir.x * depth, y: rayDir.y * depth, z: rayDir.z * depth };
                    const sampleOrigin = {
                        x: offset.x + (Math.random() - 0.5) * 0.5,
                        y: offset.y + (Math.random() - 0.5) * 0.5,
                        z: offset.z + (Math.random() - 0.5) * 0.5
                    };

                    const hit = this.traceRayBVH(sampleOrigin, this._lightDirection, bvh, 0.01, 10);
                    if (hit) occluded++;
                }

                const ao = 1.0 - (occluded / aoSamples) * 0.5;
                const pixelIdx = idx * 4;
                data[pixelIdx] = Math.round(data[pixelIdx] * ao);
                data[pixelIdx + 1] = Math.round(data[pixelIdx + 1] * ao);
                data[pixelIdx + 2] = Math.round(data[pixelIdx + 2] * ao);
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    addTriangleEdgesToEdgeTable(tri, edgeTable, h) {
        // Calculate face normal and apply lighting
        const v0World = tri[0], v1World = tri[1], v2World = tri[2];
        const normal = this.calculateFaceNormal(
            { x: v0World.depth, y: v0World.screen.x, z: v0World.screen.y },
            { x: v1World.depth, y: v1World.screen.x, z: v1World.screen.y },
            { x: v2World.depth, y: v2World.screen.x, z: v2World.screen.y }
        );
        const litColor = this.calculateLighting(normal, "#888888");
        const colorStr = `rgb(${litColor.r}, ${litColor.g}, ${litColor.b})`;

        // Add all three edges of the triangle to the edge table
        const edges = [
            { v0: tri[0], v1: tri[1] },
            { v0: tri[1], v1: tri[2] },
            { v0: tri[2], v1: tri[0] }
        ];

        edges.forEach(edge => {
            let y0 = Math.round(edge.v0.screen.y);
            let y1 = Math.round(edge.v1.screen.y);
            let x0 = edge.v0.screen.x;
            let x1 = edge.v1.screen.x;
            let z0 = edge.v0.depth;
            let z1 = edge.v1.depth;

            // Make sure y0 <= y1
            if (y0 > y1) {
                [y0, y1, x0, x1, z0, z1] = [y1, y0, x1, x0, z1, z0];
            }

            // Skip horizontal edges
            if (y0 === y1) return;

            const yStart = Math.max(0, y0);
            const yEnd = Math.min(h - 1, y1);

            if (yStart >= yEnd) return;

            const deltaY = y1 - y0;
            const deltaX = x1 - x0;
            const deltaZ = z1 - z0;

            const slope = deltaX / deltaY;
            const zSlope = deltaZ / deltaY;

            // Add edge to edge table at starting y coordinate
            if (yStart < edgeTable.length) {
                edgeTable[yStart].push({
                    x: x0,
                    yStart: y0,
                    yEnd: y1,
                    slope: slope,
                    z: z0,
                    zSlope: zSlope,
                    color: colorStr
                });
            }
        });
    }

    renderRaytrace() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;
        const bgColor = this.hexToRgb(this._backgroundColor);
        const aspect = w / h;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians * 0.5);
        const allTriangles = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";
            const rgb = this.hexToRgb(faceColor);
            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);
                if (cameraVerts.length < 3) return;

                // Calculate world vertices for normal calculation
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                for (let i = 1; i < cameraVerts.length - 1; i++) {
                    allTriangles.push({
                        v0: cameraVerts[0], v1: cameraVerts[i], v2: cameraVerts[i + 1],
                        color: litColor
                    });
                }
            });
        });
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const pixelIdx = (y * w + x) * 4;
                const u = (x / w) * 2 - 1;
                const v = 1 - (y / h) * 2;
                const rayDirX = 1;
                const rayDirY = u * tanHalfFov * aspect;
                const rayDirZ = v * tanHalfFov;
                const rayLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
                const rayDir = { x: rayDirX / rayLen, y: rayDirY / rayLen, z: rayDirZ / rayLen };
                const rayOrigin = { x: 0, y: 0, z: 0 };
                let closestT = Infinity;
                let hitColor = null;
                allTriangles.forEach(tri => {
                    const t = this.rayTriangleIntersect(rayOrigin, rayDir, tri.v0, tri.v1, tri.v2);
                    if (t !== null && t < closestT && t >= this._nearPlane && t <= this._farPlane) {
                        closestT = t;
                        hitColor = tri.color;
                    }
                });
                if (hitColor) {
                    data[pixelIdx] = hitColor.r;
                    data[pixelIdx + 1] = hitColor.g;
                    data[pixelIdx + 2] = hitColor.b;
                    data[pixelIdx + 3] = 255;
                } else {
                    data[pixelIdx] = bgColor.r;
                    data[pixelIdx + 1] = bgColor.g;
                    data[pixelIdx + 2] = bgColor.b;
                    data[pixelIdx + 3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    rayTriangleIntersect(origin, dir, v0, v1, v2) {
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const h = {
            x: dir.y * edge2.z - dir.z * edge2.y,
            y: dir.z * edge2.x - dir.x * edge2.z,
            z: dir.x * edge2.y - dir.y * edge2.x
        };
        const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;
        if (Math.abs(a) < 0.0001) return null;
        const f = 1 / a;
        const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: origin.z - v0.z };
        const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);
        if (u < 0 || u > 1) return null;
        const q = {
            x: s.y * edge1.z - s.z * edge1.y,
            y: s.z * edge1.x - s.x * edge1.z,
            z: s.x * edge1.y - s.y * edge1.x
        };
        const v = f * (dir.x * q.x + dir.y * q.y + dir.z * q.z);
        if (v < 0 || u + v > 1) return null;
        const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);
        return t > 0.0001 ? t : null;
    }

    // BVH Node class for acceleration structure
    createBVHNode() {
        return {
            bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
            triangles: [],
            left: null,
            right: null,
            isLeaf: false
        };
    }

    // Calculate axis-aligned bounding box for a triangle
    calculateTriangleBounds(v0, v1, v2) {
        const min = {
            x: Math.min(v0.x, v1.x, v2.x),
            y: Math.min(v0.y, v1.y, v2.y),
            z: Math.min(v0.z, v1.z, v2.z)
        };
        const max = {
            x: Math.max(v0.x, v1.x, v2.x),
            y: Math.max(v0.y, v1.y, v2.y),
            z: Math.max(v0.z, v1.z, v2.z)
        };
        return { min, max };
    }

    // Calculate bounding box for multiple triangles
    calculateBounds(triangles) {
        if (triangles.length === 0) return null;

        let min = { x: Infinity, y: Infinity, z: Infinity };
        let max = { x: -Infinity, y: -Infinity, z: -Infinity };

        triangles.forEach(tri => {
            const bounds = this.calculateTriangleBounds(tri.v0, tri.v1, tri.v2);
            min.x = Math.min(min.x, bounds.min.x);
            min.y = Math.min(min.y, bounds.min.y);
            min.z = Math.min(min.z, bounds.min.z);
            max.x = Math.max(max.x, bounds.max.x);
            max.y = Math.max(max.y, bounds.max.y);
            max.z = Math.max(max.z, bounds.max.z);
        });

        return { min, max };
    }

    // Check if ray intersects AABB
    rayAABBIntersect(origin, dir, min, max) {
        const invDir = {
            x: 1 / dir.x,
            y: 1 / dir.y,
            z: 1 / dir.z
        };

        const t1 = (min.x - origin.x) * invDir.x;
        const t2 = (max.x - origin.x) * invDir.x;
        const tmin = Math.min(t1, t2);
        const tmax = Math.max(t1, t2);

        const t1y = (min.y - origin.y) * invDir.y;
        const t2y = (max.y - origin.y) * invDir.y;
        const tminy = Math.min(t1y, t2y);
        const tmaxy = Math.max(t1y, t2y);

        if (tmin > tmaxy || tminy > tmax) return null;

        const finalTmin = Math.max(tmin, tminy);
        const finalTmax = Math.min(tmax, tmaxy);

        const t1z = (min.z - origin.z) * invDir.z;
        const t2z = (max.z - origin.z) * invDir.z;
        const tminz = Math.min(t1z, t2z);
        const tmaxz = Math.max(t1z, t2z);

        if (finalTmin > tmaxz || tminz > finalTmax) return null;

        const finalTminZ = Math.max(finalTmin, tminz);
        const finalTmaxZ = Math.min(finalTmax, tmaxz);

        return finalTmaxZ >= Math.max(finalTminZ, 0) ? finalTminZ : null;
    }

    // Build BVH acceleration structure
    buildBVH(triangles, maxTrianglesPerLeaf = 4) {
        if (triangles.length === 0) return null;

        const axisNames = ['x', 'y', 'z'];
        const root = this.createBVHNode();
        root.bounds = this.calculateBounds(triangles);
        root.triangles = triangles;

        if (triangles.length <= maxTrianglesPerLeaf) {
            root.isLeaf = true;
            return root;
        }

        // Find the longest axis for splitting
        const extent = {
            x: root.bounds.max.x - root.bounds.min.x,
            y: root.bounds.max.y - root.bounds.min.y,
            z: root.bounds.max.z - root.bounds.min.z
        };

        let splitAxis = 0;
        if (extent.y > extent.x) splitAxis = 1;
        if (extent.z > extent.y && extent.z > extent.x) splitAxis = 2;

        // Sort triangles by centroid along split axis
        const sortedTriangles = [...triangles].sort((a, b) => {
            const aCentroid = (a.v0[axisNames[splitAxis]] + a.v1[axisNames[splitAxis]] + a.v2[axisNames[splitAxis]]) / 3;
            const bCentroid = (b.v0[axisNames[splitAxis]] + b.v1[axisNames[splitAxis]] + b.v2[axisNames[splitAxis]]) / 3;
            return aCentroid - bCentroid;
        });

        const mid = Math.floor(sortedTriangles.length / 2);
        const leftTriangles = sortedTriangles.slice(0, mid);
        const rightTriangles = sortedTriangles.slice(mid);

        root.left = this.buildBVH(leftTriangles, maxTrianglesPerLeaf);
        root.right = this.buildBVH(rightTriangles, maxTrianglesPerLeaf);

        return root;
    }

    // Accelerated ray tracing using BVH
    traceRayBVH(origin, dir, bvhNode, tMin, tMax) {
        if (!bvhNode) return null;

        // Test ray against node bounds first
        const t = this.rayAABBIntersect(origin, dir, bvhNode.bounds.min, bvhNode.bounds.max);
        if (t === null || t > tMax || t < tMin) return null;

        // If this is a leaf node, test all triangles
        if (bvhNode.isLeaf) {
            let closestHit = null;
            let closestT = tMax;

            for (const tri of bvhNode.triangles) {
                const t = this.rayTriangleIntersect(origin, dir, tri.v0, tri.v1, tri.v2);
                if (t !== null && t < closestT && t >= tMin) {
                    closestT = t;
                    closestHit = tri;
                }
            }

            return closestHit;
        }

        // Test child nodes
        const leftHit = this.traceRayBVH(origin, dir, bvhNode.left, tMin, tMax);
        const rightHit = this.traceRayBVH(origin, dir, bvhNode.right, tMin, tMax);

        // Return the closer hit
        if (leftHit && rightHit) {
            return leftHit; // For simplicity, return first hit found
        }
        return leftHit || rightHit;
    }

    render3D() {
        if (!this._renderTextureCtx || !this._isActive) return;
        this.clearRenderTexture();
        switch (this._renderingMethod) {
            case "painter": this.renderPainter(); break;
            case "zbuffer": this.renderZBuffer(); break;
            case "scanline": this.renderScanline(); break;
            case "raytrace": this.renderRaytrace(); break;
            case "hzb": this.renderHZB(); break;
            case "depthpass": this.renderDepthPass(); break;
            case "raster": this.renderRasterHybrid(); break;
            case "hybrid": this.renderRaytraceHybrid(); break;
            default: this.renderPainter();
        }
    }

    getRenderedTexture() {
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

    start() {
        this.updateViewport();
        this.updateRenderTexture();
        const cameras = this.getGameObjects()
            .map(obj => obj.getModule("Camera3D"))
            .filter(cam => cam !== null);
        if (cameras.length === 1 && cameras[0] === this) this._isActive = true;
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
            _type: "Camera3D", _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _fieldOfView: this._fieldOfView, _nearPlane: this._nearPlane, _farPlane: this._farPlane,
            _isActive: this._isActive, _backgroundColor: this._backgroundColor,
            _renderTextureWidth: this._renderTextureWidth, _renderTextureHeight: this._renderTextureHeight,
            _renderTextureSmoothing: this._renderTextureSmoothing, drawGizmoInRuntime: this.drawGizmoInRuntime,
            _renderingMethod: this._renderingMethod, _enableBackfaceCulling: this._enableBackfaceCulling,
            _cullingFieldOfView: this._cullingFieldOfView,
            _lightDirection: { x: this._lightDirection.x, y: this._lightDirection.y, z: this._lightDirection.z },
            _lightColor: this._lightColor,
            _lightIntensity: this._lightIntensity,
            _ambientIntensity: this._ambientIntensity,
            _depthOfFieldEnabled: this._depthOfFieldEnabled,
            _focalDistance: this._focalDistance,
            _aperture: this._aperture,
            _maxBlurRadius: this._maxBlurRadius
        };
    }

    fromJSON(json) {
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
        if (json._cullingFieldOfView !== undefined) this._cullingFieldOfView = json._cullingFieldOfView;
        if (json._lightDirection) this._lightDirection = new Vector3(json._lightDirection.x, json._lightDirection.y, json._lightDirection.z);
        if (json._lightColor !== undefined) this._lightColor = json._lightColor;
        if (json._lightIntensity !== undefined) this._lightIntensity = json._lightIntensity;
        if (json._ambientIntensity !== undefined) this._ambientIntensity = json._ambientIntensity;
        if (json._depthOfFieldEnabled !== undefined) this._depthOfFieldEnabled = json._depthOfFieldEnabled;
        if (json._focalDistance !== undefined) this._focalDistance = json._focalDistance;
        if (json._aperture !== undefined) this._aperture = json._aperture;
        if (json._maxBlurRadius !== undefined) this._maxBlurRadius = json._maxBlurRadius;
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
    get cullingFieldOfView() { return this._cullingFieldOfView; }
    set cullingFieldOfView(value) { this._cullingFieldOfView = Math.max(1, Math.min(179, value)); }
}

window.Camera3D = Camera3D;