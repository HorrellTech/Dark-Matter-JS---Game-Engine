/**
 * Camera3D - Module for 3D perspective cameras
 * 
 * This module provides 3D camera functionality for the Dark Matter JS engine.
 * It handles perspective projection of 3D points onto a 2D plane.
 */
class Camera3D extends Module {
    static namespace = "WIP";

    /**
     * Create a new Camera3D
     */
    constructor() {
        super("Camera3D");

        // Initialize instance variables
        this._position = new Vector3(0, 0, 0);
        this._rotation = new Vector3(0, 0, 0);
        this._fieldOfView = 60;
        this._nearPlane = 0.1;
        this._farPlane = 5000;
        this._isActive = false;
        this._backgroundColor = "#000000";

        // 3D Render texture settings
        this._renderTextureWidth = 320;
        this._renderTextureHeight = 240;
        this._renderTexture = null;
        this._renderTextureCtx = null;

        // Viewport dimensions (will be updated from engine)
        this.viewportWidth = 800;
        this.viewportHeight = 600;

        this.drawGizmoInRuntime = false;

        // Expose properties to the inspector
        this.exposeProperty("position", "vector3", this._position, {
            onChange: (val) => this._position = val
        });
        this.exposeProperty("rotation", "vector3", this._rotation, {
            onChange: (val) => this._rotation = val
        });
        this.exposeProperty("fieldOfView", "number", 60, {
            min: 1,
            max: 179,
            onChange: (val) => this._fieldOfView = val
        });
        this.exposeProperty("nearPlane", "number", 0.1, {
            min: 0.01,
            max: 10,
            step: 0.01,
            onChange: (val) => this._nearPlane = val
        });
        this.exposeProperty("farPlane", "number", 1000, {
            min: 10,
            max: 10000,
            step: 1,
            onChange: (val) => this._farPlane = val
        });
        this.exposeProperty("isActive", "boolean", false, {
            onChange: (val) => {
                this._isActive = val;
                if (val) {
                    // Deactivate other cameras if this one becomes active
                    this.setAsActiveCamera();
                }
            }
        });
        this.exposeProperty("backgroundColor", "color", "#000000", {
            onChange: (val) => this._backgroundColor = val
        });
        this.exposeProperty("drawGizmoInRuntime", "boolean", false, {
            onChange: (val) => this.drawGizmoInRuntime = val
        });

        // Expose 3D render texture settings
        this.exposeProperty("renderTextureWidth", "number", 512, {
            min: 64,
            max: 2048,
            step: 64,
            onChange: (val) => {
                this._renderTextureWidth = val;
                this.updateRenderTexture();
            }
        });

        this.exposeProperty("renderTextureHeight", "number", 512, {
            min: 64,
            max: 2048,
            step: 64,
            onChange: (val) => {
                this._renderTextureHeight = val;
                this.updateRenderTexture();
            }
        });

        // Initialize render texture
        this.updateRenderTexture();
    }

    /**
     * Set this camera as the active camera in the scene
     */
    setAsActiveCamera() {
        if (!this.gameObject) return;

        // Find all other cameras in the scene and deactivate them
        const allObjects = this.getGameObjects();
        allObjects.forEach(obj => {
            const camera = obj.getModule("Camera3D");
            if (camera && camera !== this) {
                camera._isActive = false;
            }
        });

        this._isActive = true;
    }

    /**
     * Get all game objects in the scene
     */
    getGameObjects() {
        if (!this.gameObject) return [];

        // Use the editor's method to get all game objects if available
        return this.getAllGameObjects();

        // Fallback to recursively finding game objects
        const allObjects = [];

        const scene = window.editor ? window.editor.activeScene :
            (window.engine ? window.engine.scene : null);

        if (engine.gameObjects) {
            const findObjects = (objects) => {
                objects.forEach(obj => {
                    allObjects.push(obj);
                    if (obj.children && obj.children.length > 0) {
                        findObjects(obj.children);
                    }
                });
            };

            findObjects(scene.gameObjects);
        }

        return allObjects;
    }

    /**
     * Project a 3D point to 2D screen space
     * @param {Vector3} point - The 3D point to project
     * @returns {Vector2|null} The 2D point in screen space, or null if behind camera
     */
    projectPoint(point) {
        // Transform the point from world space to camera space
        const cameraPoint = this.worldToCameraSpace(point);

        // In our convention: X = forward/back (positive = forward), Y = left/right (positive = right), Z = up
        // Depth is positive when the point is in front of the camera
        const depth = cameraPoint.x;

        // Cull by near / far
        if (depth <= this.nearPlane || depth >= this.farPlane) {
            return null;
        }

        // Perspective projection
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);

        // Avoid divide by zero
        if (depth < 1e-6) return null;

        // Map 3D -> NDC using Y and Z (Z is up, Y is right/left)
        const ndcX = (cameraPoint.y / depth) * (f / aspect);
        const ndcY = (cameraPoint.z / depth) * f;

        // NDC [-1..1] -> screen space (flip Y)
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;

        return new Vector2(screenX, screenY);
    }

    /**
      * Transform a point from world space to camera space
      * @param {Vector3} point - The point in world space
      * @returns {Vector3} The point in camera space
      */
    worldToCameraSpace(point) {
        // Build camera world position:
        // - gameObject provides X/Y in world space
        // - gameObject.depth (preferred) or position.z is used for Z (depth), module's position.z is local offset
        const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
            this.gameObject.getWorldPosition() : { x: 0, y: 0 };

        // Determine game object world depth (Z). Prefer getWorldDepth(), then depth, then position.z, else 0.
        let goDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                goDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                goDepth = this.gameObject.depth;
            } else if (this.gameObject.position.z && typeof this.gameObject.position.z === 'number') {
                goDepth = this.gameObject.position.z;
            }
        }

        // Combine with module local Z offset
        const camWorldX = (goPos.x || 0) + (this._position.x || 0);
        const camWorldY = (goPos.y || 0) + (this._position.y || 0);
        const camWorldZ = goDepth + (this._position.z || 0); // depth: negative = up, positive = down

        const cameraPos = new Vector3(camWorldX, camWorldY, camWorldZ);

        // Compute yaw as parent's world rotation (around Z) + local yaw (rotation.z)
        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = (parentAngleDeg + (this._rotation.z || 0)) * (Math.PI / 180);

        // Local pitch now uses rotation.y (tilt up/down around Y axis)
        const pitch = (this._rotation.y || 0) * (Math.PI / 180);

        // Local roll uses rotation.x around X axis
        const roll = (this._rotation.x || 0) * (Math.PI / 180);

        // Relative vector from camera to point
        let relativePos = this.subtractVector3(point, cameraPos);

        // Apply inverse camera rotations to bring world point into camera local space
        // Order: undo yaw (around Z), undo pitch (around Y), undo roll (around X)
        relativePos = this.rotateVectorZ(relativePos, -yaw);
        relativePos = this.rotateVectorY(relativePos, -pitch);
        relativePos = this.rotateVectorX(relativePos, -roll);

        // Resulting coordinate system: X = forward/back (positive = forward), Y = left/right (positive = right), Z = up
        return relativePos;
    }

    /**
     * Subtract two Vector3 objects
     * @param {Vector3} a - First vector
     * @param {Vector3} b - Second vector
     * @returns {Vector3} Result of a - b
     */
    subtractVector3(a, b) {
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    /**
     * Rotate a vector around the X axis
     * @param {Vector3} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @returns {Vector3} Rotated vector
     */
    rotateVectorX(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            v.x,
            v.y * cos - v.z * sin,
            v.y * sin + v.z * cos
        );
    }

    /**
     * Rotate a vector around the Y axis
     * @param {Vector3} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @returns {Vector3} Rotated vector
     */
    rotateVectorY(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            v.x * cos + v.z * sin,
            v.y,
            -v.x * sin + v.z * cos
        );
    }

    /**
     * Rotate a vector around the Z axis
     * @param {Vector3} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @returns {Vector3} Rotated vector
     */
    rotateVectorZ(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            v.x * cos - v.y * sin,
            v.x * sin + v.y * cos,
            v.z
        );
    }

    /**
     * Check if a point is visible to this camera
     * @param {Vector3} point - The point to check
     * @returns {boolean} True if the point is in front of the camera
     */
    isPointVisible(point) {
        const cameraPoint = this.worldToCameraSpace(point);
        const depth = cameraPoint.x; // positive when in front

        return depth >= this.nearPlane && depth <= this.farPlane;
    }

    /**
     * Create or update the render texture for 3D rendering
     */
    updateRenderTexture() {
        // Create new render texture if dimensions changed
        if (!this._renderTexture ||
            this._renderTexture.width !== this._renderTextureWidth ||
            this._renderTexture.height !== this._renderTextureHeight) {

            this._renderTexture = document.createElement('canvas');
            this._renderTexture.width = this._renderTextureWidth;
            this._renderTexture.height = this._renderTextureHeight;
            this._renderTextureCtx = this._renderTexture.getContext('2d');

            // Update viewport dimensions to match render texture
            this.viewportWidth = this._renderTextureWidth;
            this.viewportHeight = this._renderTextureHeight;
        }
    }

    /**
     * Get the render texture canvas
     * @returns {HTMLCanvasElement} The render texture canvas
     */
    getRenderTexture() {
        return this._renderTexture;
    }

    /**
     * Get the render texture context
     * @returns {CanvasRenderingContext2D} The render texture context
     */
    getRenderTextureContext() {
        return this._renderTextureCtx;
    }

    /**
     * Clear the render texture with background color
     */
    clearRenderTexture() {
        if (!this._renderTextureCtx) return;

        // Clear with background color
        this._renderTextureCtx.fillStyle = this._backgroundColor;
        this._renderTextureCtx.fillRect(0, 0, this._renderTextureWidth, this._renderTextureHeight);
    }

    /**
     * Update viewport dimensions from engine
     */
    updateViewport() {
        // For render texture cameras, we use the render texture dimensions
        this.viewportWidth = this._renderTextureWidth;
        this.viewportHeight = this._renderTextureHeight;
    }

    /**
     * Render all 3D objects to the render texture
     */
    render3D() {
        if (!this._renderTextureCtx || !this.isActive) return;

        // Clear render texture
        this.clearRenderTexture();

        // Find all 3D meshes in the scene
        const allObjects = this.getGameObjects();
        const meshObjects = [];

        allObjects.forEach(obj => {
            if (!obj.active) return; // Skip inactive objects

            const mesh3D = obj.getModule && obj.getModule("Mesh3D");
            const cubeMesh3D = obj.getModule && obj.getModule("CubeMesh3D");

            if (mesh3D) meshObjects.push({ obj, mesh: mesh3D });
            if (cubeMesh3D) meshObjects.push({ obj, mesh: cubeMesh3D });
        });

        // Render each mesh to the render texture
        meshObjects.forEach(({ obj, mesh }) => {
            if (mesh && mesh.drawToRenderTexture) {
                try {
                    mesh.drawToRenderTexture(this._renderTextureCtx, this);
                } catch (error) {
                    console.error('Error rendering mesh to texture:', error);
                }
            }
        });
    }

    /**
     * Get the rendered 3D texture for drawing to main canvas
     * @returns {HTMLCanvasElement|null} The rendered texture or null
     */
    getRenderedTexture() {
        if (!this.isActive) return null;

        // Render 3D scene to texture
        this.render3D();

        return this._renderTexture;
    }

    /**
     * Called when the module starts
     */
    start() {
        this.updateViewport();
        this.updateRenderTexture();

        // Set as active camera if it's the only one
        const cameras = this.getGameObjects()
            .map(obj => obj.getModule("Camera3D"))
            .filter(cam => cam !== null);

        if (cameras.length === 1 && cameras[0] === this) {
            this._isActive = true;
        }
    }

    /**
     * Called at the beginning of each frame
     */
    beginLoop() {
        this.updateViewport();
    }

    /**
     * Draw method for runtime rendering
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    draw(ctx) {
        ctx.imageSmoothingEnabled = false;
        // In runtime, we don't draw the gizmo by default
        // The 3D rendering is handled by the engine's draw3DCameras method
        // But we can optionally draw the gizmo if needed
        //if (this.drawGizmoInRuntime) {
        //    this.drawGizmos(ctx);
        //}
    }

    /**
     * Draw a visual gizmo representing the camera's viewport and frustum
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    drawGizmos(ctx) {
        if (!this.gameObject) return;

        ctx.save();

        // Get the camera's world position and rotation
        const worldPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        const worldRot = this.gameObject.getWorldRotation ? this.gameObject.getWorldRotation() : 0;

        // Apply camera transform
        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(worldRot * Math.PI / 180);

        // Draw camera body (simple rectangle)
        const cameraWidth = 40;
        const cameraHeight = 25;

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        // Draw camera body outline
        ctx.beginPath();
        ctx.rect(-cameraWidth / 2, -cameraHeight / 2, cameraWidth, cameraHeight);
        ctx.stroke();

        // Draw camera lens (circle at the front)
        ctx.beginPath();
        ctx.arc(cameraWidth / 2, 0, cameraHeight / 3, 0, Math.PI * 2);
        ctx.stroke();

        // Draw camera direction indicator (line from center to front)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cameraWidth / 2 + 10, 0);
        ctx.stroke();

        // Draw field of view lines
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const halfFov = fovRadians * 0.5;
        const maxDistance = 200; // Maximum distance to draw FOV lines

        const leftAngle = Math.PI - halfFov;
        const rightAngle = Math.PI + halfFov;

        // Calculate FOV line endpoints
        const leftX = Math.cos(leftAngle) * maxDistance;
        const leftY = Math.sin(leftAngle) * maxDistance;
        const rightX = Math.cos(rightAngle) * maxDistance;
        const rightY = Math.sin(rightAngle) * maxDistance;

        // Draw FOV lines
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(cameraWidth / 2, 0);
        ctx.lineTo(cameraWidth / 2 + leftX, leftY);
        ctx.moveTo(cameraWidth / 2, 0);
        ctx.lineTo(cameraWidth / 2 + rightX, rightY);
        ctx.stroke();

        // Draw near plane indicator at actual near plane distance
        const nearDistance = this.nearPlane * 100; // Scale for visibility
        const nearHeight = Math.tan(halfFov) * nearDistance * 2;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(cameraWidth / 2 + nearDistance, -nearHeight / 2);
        ctx.lineTo(cameraWidth / 2 + nearDistance, nearHeight / 2);
        ctx.stroke();

        // Draw far plane indicator at actual far plane distance
        const farDistance = this.farPlane * 0.1; // Scale for visibility (far plane is usually much larger)
        const farHeight = Math.tan(halfFov) * farDistance * 2;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(cameraWidth / 2 + farDistance, -farHeight / 2);
        ctx.lineTo(cameraWidth / 2 + farDistance, farHeight / 2);
        ctx.stroke();

        // Draw connecting lines between near and far planes
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        ctx.beginPath();
        ctx.moveTo(cameraWidth / 2 + nearDistance, -nearHeight / 2);
        ctx.lineTo(cameraWidth / 2 + farDistance, -farHeight / 2);
        ctx.moveTo(cameraWidth / 2 + nearDistance, nearHeight / 2);
        ctx.lineTo(cameraWidth / 2 + farDistance, farHeight / 2);
        ctx.stroke();

        // Draw plane distance labels
        ctx.fillStyle = '#ff0000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Near plane label
        ctx.fillText(`Near: ${this.nearPlane.toFixed(2)}`, cameraWidth / 2 + nearDistance + 5, -nearHeight / 2 - 5);

        // Far plane label
        ctx.fillText(`Far: ${this.farPlane.toFixed(0)}`, cameraWidth / 2 + farDistance + 5, -farHeight / 2 - 5);

        // Draw camera info text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Camera3D', 0, -cameraHeight / 2 - 20);

        // Draw FOV info
        ctx.fillText(`FOV: ${this.fieldOfView}°`, 0, cameraHeight / 2 + 20);

        ctx.restore();
    }

    /**
     * Serialize the camera to JSON
     * @returns {Object} JSON representation of the camera
     */
    toJSON() {
        return {
            _type: "Camera3D",
            _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _fieldOfView: this._fieldOfView,
            _nearPlane: this._nearPlane,
            _farPlane: this._farPlane,
            _isActive: this._isActive,
            _backgroundColor: this._backgroundColor,
            _renderTextureWidth: this._renderTextureWidth,
            _renderTextureHeight: this._renderTextureHeight,
            drawGizmoInRuntime: this.drawGizmoInRuntime
        };
    }

    /**
     * Deserialize the camera from JSON
     * @param {Object} json - JSON representation of the camera
     */
    fromJSON(json) {
        if (json._position) this._position = new Vector3(json._position.x, json._position.y, json._position.z);
        if (json._rotation) this._rotation = new Vector3(json._rotation.x, json._rotation.y, json._rotation.z);
        if (json._fieldOfView !== undefined) this._fieldOfView = json._fieldOfView;
        if (json._nearPlane !== undefined) this._nearPlane = json._nearPlane;
        if (json._farPlane !== undefined) this._farPlane = json._farPlane;
        if (json._isActive !== undefined) this._isActive = json._isActive;
        if (json._backgroundColor !== undefined) this._backgroundColor = json._backgroundColor;
        if (json._renderTextureWidth !== undefined) {
            this._renderTextureWidth = json._renderTextureWidth;
        }
        if (json._renderTextureHeight !== undefined) {
            this._renderTextureHeight = json._renderTextureHeight;
        }
        if (json.drawGizmoInRuntime !== undefined) {
            this.drawGizmoInRuntime = json.drawGizmoInRuntime;
        }

        // Update render texture after loading
        this.updateRenderTexture();
    }

    // Getters and setters for properties
    get renderTextureWidth() { return this._renderTextureWidth; }
    set renderTextureWidth(value) {
        this._renderTextureWidth = Math.max(64, Math.min(2048, value));
        this.updateRenderTexture();
    }

    get renderTextureHeight() { return this._renderTextureHeight; }
    set renderTextureHeight(value) {
        this._renderTextureHeight = Math.max(64, Math.min(2048, value));
        this.updateRenderTexture();
    }

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

// Register the Camera3D module
window.Camera3D = Camera3D;