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
        this._enableBackfaceCulling = true;
        this._zBuffer = null;
        this._imageData = null;

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
        this.exposeProperty("renderingMethod", "dropdown", "painter", {
            options: ["painter", "zbuffer", "scanline", "raytrace"],
            onChange: (val) => this._renderingMethod = val
        });
        this.exposeProperty("enableBackfaceCulling", "boolean", true, {
            onChange: (val) => this._enableBackfaceCulling = val
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

    renderPainter() {
        const allObjects = this.getGameObjects();
        const allFaces = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            let texture = null, uvCoords = null;
            if (mesh.texture && (mesh.texture instanceof Image || mesh.texture instanceof HTMLCanvasElement)) {
                texture = mesh.texture;
                uvCoords = mesh.uvCoords || mesh.generateDefaultUVs();
            }
            mesh.faces.forEach((face, faceIndex) => {
                const cameraSpaceVertices = face.map(idx => 
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);
                if (cameraSpaceVertices.length > 0) {
                    const visibleVerts = cameraSpaceVertices.filter(v => v.x > this._nearPlane);
                    const centerDepth = visibleVerts.length > 0 ?
                        visibleVerts.reduce((sum, v) => sum + v.x, 0) / visibleVerts.length :
                        this._farPlane + 1;
                    allFaces.push({
                        face, depth: centerDepth, mesh, transformedVertices,
                        cameraSpaceVertices, texture,
                        faceUVs: texture && uvCoords && uvCoords[faceIndex] ? uvCoords[faceIndex] : null
                    });
                }
            });
        });
        allFaces.sort((a, b) => b.depth - a.depth);
        const ctx = this._renderTextureCtx;
        allFaces.forEach(({ cameraSpaceVertices, mesh, texture, faceUVs }) => {
            const clippedVerts = this.clipPolygonAgainstNearPlane(cameraSpaceVertices, this._nearPlane);
            if (clippedVerts.length < 3) return;
            const screenVerts = clippedVerts.map(cv => 
                cv.x < this._farPlane ? this.projectCameraPoint(cv) : null
            ).filter(v => v);
            if (screenVerts.length < 3) return;
            if (this._enableBackfaceCulling && this.calculateScreenNormal(screenVerts) < 0) return;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, this.viewportWidth, this.viewportHeight);
            ctx.clip();
            if (texture && faceUVs && faceUVs.length >= 3) {
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    this.drawTexturedTriangle(ctx, 
                        [screenVerts[0], screenVerts[i], screenVerts[i + 1]],
                        [faceUVs[0], faceUVs[i] || faceUVs[1], faceUVs[i + 1] || faceUVs[2]],
                        texture);
                }
            } else {
                if (mesh.renderMode === "solid" || mesh.renderMode === "both") {
                    ctx.fillStyle = mesh.faceColor || mesh._faceColor;
                    ctx.beginPath();
                    ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
                    for (let i = 1; i < screenVerts.length; i++) ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            if (mesh.renderMode === "wireframe" || mesh.renderMode === "both") {
                ctx.strokeStyle = mesh.wireframeColor || mesh._wireframeColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
                for (let i = 1; i < screenVerts.length; i++) ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore();
        });
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
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";
            const rgb = this.hexToRgb(faceColor);
            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx => 
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);
                if (screenVerts.length < 3) return;
                if (this._enableBackfaceCulling) {
                    const sVerts = screenVerts.map(v => v.screen);
                    if (this.calculateScreenNormal(sVerts) < 0) return;
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
                    if (depth < this._zBuffer[idx]) {
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
        const scanlines = Array.from({ length: h }, () => []);
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";
            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx => 
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);
                if (screenVerts.length < 3) return;
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const tri = [screenVerts[0], screenVerts[i], screenVerts[i + 1]];
                    this.addTriangleToScanlines(tri, faceColor, scanlines, w, h);
                }
            });
        });
        for (let y = 0; y < h; y++) {
            const edges = scanlines[y];
            if (edges.length === 0) continue;
            edges.sort((a, b) => a.x - b.x);
            for (let i = 0; i < edges.length - 1; i += 2) {
                const x1 = Math.max(0, Math.ceil(edges[i].x));
                const x2 = Math.min(w - 1, Math.floor(edges[i + 1].x));
                const z1 = edges[i].z, z2 = edges[i + 1].z;
                ctx.fillStyle = edges[i].color;
                for (let x = x1; x <= x2; x++) {
                    const t = (x2 - x1) > 0 ? (x - x1) / (x2 - x1) : 0;
                    const z = z1 + t * (z2 - z1);
                    const idx = y * w + x;
                    if (z < this._zBuffer[idx]) {
                        this._zBuffer[idx] = z;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    }

    addTriangleToScanlines(tri, color, scanlines, w, h) {
        for (let i = 0; i < 3; i++) {
            const v0 = tri[i], v1 = tri[(i + 1) % 3];
            let y0 = Math.round(v0.screen.y), y1 = Math.round(v1.screen.y);
            let x0 = v0.screen.x, x1 = v1.screen.x, z0 = v0.depth, z1 = v1.depth;
            if (y0 > y1) {
                [y0, y1] = [y1, y0]; [x0, x1] = [x1, x0]; [z0, z1] = [z1, z0];
            }
            if (y0 === y1) continue;
            for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
                const t = (y - y0) / (y1 - y0);
                scanlines[y].push({ x: x0 + t * (x1 - x0), z: z0 + t * (z1 - z0), color });
            }
        }
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
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D");
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
                for (let i = 1; i < cameraVerts.length - 1; i++) {
                    allTriangles.push({
                        v0: cameraVerts[0], v1: cameraVerts[i], v2: cameraVerts[i + 1],
                        color: rgb
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

    render3D() {
        if (!this._renderTextureCtx || !this._isActive) return;
        this.clearRenderTexture();
        switch (this._renderingMethod) {
            case "painter": this.renderPainter(); break;
            case "zbuffer": this.renderZBuffer(); break;
            case "scanline": this.renderScanline(); break;
            case "raytrace": this.renderRaytrace(); break;
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

    start() {
        this.updateViewport();
        this.updateRenderTexture();
        const cameras = this.getGameObjects()
            .map(obj => obj.getModule("Camera3D"))
            .filter(cam => cam !== null);
        if (cameras.length === 1 && cameras[0] === this) this._isActive = true;
    }

    beginLoop() { this.updateViewport(); }
    draw(ctx) {}
    drawGizmos(ctx) {} // Implement if needed

    toJSON() {
        return {
            _type: "Camera3D", _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _fieldOfView: this._fieldOfView, _nearPlane: this._nearPlane, _farPlane: this._farPlane,
            _isActive: this._isActive, _backgroundColor: this._backgroundColor,
            _renderTextureWidth: this._renderTextureWidth, _renderTextureHeight: this._renderTextureHeight,
            _renderTextureSmoothing: this._renderTextureSmoothing, drawGizmoInRuntime: this.drawGizmoInRuntime,
            _renderingMethod: this._renderingMethod, _enableBackfaceCulling: this._enableBackfaceCulling
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

window.Camera3D = Camera3D;