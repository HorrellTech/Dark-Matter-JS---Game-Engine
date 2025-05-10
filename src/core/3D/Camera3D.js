/**
 * Camera3D - Module for 3D perspective cameras
 * 
 * This module provides 3D camera functionality for the Dark Matter JS engine.
 * It handles perspective projection of 3D points onto a 2D plane.
 */
class Camera3D extends Module {
    /**
     * Create a new Camera3D
     */
    constructor() {
        super("Camera3D");
        
        // Initialize instance variables
        this._position = new Vector3(0, 0, -500);
        this._rotation = new Vector3(0, 0, 0);
        this._fieldOfView = 60;
        this._nearPlane = 0.1;
        this._farPlane = 1000;
        this._isActive = false;
        this._backgroundColor = "#000000";
        
        // Viewport dimensions
        this.viewportWidth = 800;
        this.viewportHeight = 600;
        
        // Expose properties to the inspector
        this.exposeProperty("position", "vector3", this._position);
        this.exposeProperty("rotation", "vector3", this._rotation);
        this.exposeProperty("fieldOfView", "number", 60, {
            min: 1,
            max: 179,
            onChange: (value) => {
                // Additional validation or side effects can go here
                console.log(`FOV changed to ${value} degrees`);
            }
        });
        this.exposeProperty("nearPlane", "number", 0.1, {
            min: 0.01,
            max: 10
        });
        this.exposeProperty("farPlane", "number", 1000, {
            min: 10,
            max: 10000
        });
        this.exposeProperty("isActive", "boolean", false, {
            onChange: (value) => {
                if (value) {
                    // Deactivate other cameras if this one becomes active
                    this.setAsActiveCamera();
                }
            }
        });
        this.exposeProperty("backgroundColor", "color", "#000000");
    }
    
    /**
     * Set this camera as the active camera in the scene
     */
    setAsActiveCamera() {
        if (!this.gameObject) return;
        
        // Find all other cameras in the scene and deactivate them
        const allObjects = this.getAllGameObjects();
        allObjects.forEach(obj => {
            const camera = obj.getModule("Camera3D");
            if (camera && camera !== this) {
                camera.isActive = false;
            }
        });
        
        this.isActive = true;
    }
    
    /**
     * Get all game objects in the scene
     */
    getAllGameObjects() {
        if (!this.gameObject || !window.editor) return [];
        
        // Use the editor's method to get all game objects if available
        if (window.editor.getAllGameObjects) {
            return window.editor.getAllGameObjects();
        }
        
        // Fallback to recursively finding game objects
        const allObjects = [];
        
        const findObjects = (objects) => {
            objects.forEach(obj => {
                allObjects.push(obj);
                if (obj.children && obj.children.length > 0) {
                    findObjects(obj.children);
                }
            });
        };
        
        if (window.editor.scene && window.editor.scene.gameObjects) {
            findObjects(window.editor.scene.gameObjects);
        }
        
        return allObjects;
    }
    
    /**
     * Project a 3D point to 2D screen space
     * @param {Vector3} point - The 3D point to project
     * @returns {Vector2} The 2D point in screen space, or null if behind camera
     */
    projectPoint(point) {
        // Transform the point from world space to camera space
        let cameraPoint = this.worldToCameraSpace(point);
        
        // Check if the point is behind the camera
        if (cameraPoint.z < this.nearPlane) {
            return null;
        }
        
        // Apply perspective projection
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const scale = Math.tan(fovRadians * 0.5);
        
        // Normalized device coordinates (NDC)
        const ndcX = cameraPoint.x / (cameraPoint.z * scale * aspect);
        const ndcY = cameraPoint.y / (cameraPoint.z * scale);
        
        // Convert NDC to screen space
        const screenX = (ndcX + 1) * 0.5 * this.viewportWidth;
        const screenY = (1 - ndcY) * 0.5 * this.viewportHeight;
        
        return new Vector2(screenX, screenY);
    }
    
    /**
     * Transform a point from world space to camera space
     * @param {Vector3} point - The point in world space
     * @returns {Vector3} The point in camera space
     */
    worldToCameraSpace(point) {
        // Calculate the relative position of the point to the camera
        let relativePos = point.subtract(this.position);
        
        // Apply camera rotation (convert rotation from degrees to radians)
        const rotX = this.rotation.x * (Math.PI / 180);
        const rotY = this.rotation.y * (Math.PI / 180);
        const rotZ = this.rotation.z * (Math.PI / 180);
        
        // Apply rotations in order: Y, X, Z (typically for first-person camera)
        relativePos = relativePos.rotateY(-rotY);
        relativePos = relativePos.rotateX(-rotX);
        relativePos = relativePos.rotateZ(-rotZ);
        
        return relativePos;
    }
    
    /**
     * Check if a point is visible to this camera
     * @param {Vector3} point - The point to check
     * @returns {boolean} True if the point is in front of the camera
     */
    isPointVisible(point) {
        const cameraPoint = this.worldToCameraSpace(point);
        return cameraPoint.z >= this.nearPlane && cameraPoint.z <= this.farPlane;
    }
    
    /**
     * Update viewport dimensions from scene settings
     */
    updateViewport() {
        if (!this.gameObject) return;
        
        // Get scene settings from editor or engine
        const scene = window.editor ? window.editor.activeScene : 
                     (window.engine ? window.engine.scene : null);
        
        if (scene && scene.settings) {
            this.viewportWidth = scene.settings.viewportWidth || 800;
            this.viewportHeight = scene.settings.viewportHeight || 600;
        }
    }
    
    /**
     * Called when the module starts
     */
    start() {
        this.updateViewport();
        
        // Set as active camera if it's the only one
        const cameras = this.getAllGameObjects()
            .map(obj => obj.getModule("Camera3D"))
            .filter(cam => cam !== null);
        
        if (cameras.length === 1 && cameras[0] === this) {
            this.isActive = true;
        }
    }
    
    /**
     * Called at the beginning of each frame
     */
    beginLoop() {
        this.updateViewport();
    }
}

// Register the Camera3D module
window.Camera3D = Camera3D;