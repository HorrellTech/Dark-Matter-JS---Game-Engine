/**
 * MouseLook - Module for controlling camera rotation with the mouse
 * 
 * This module allows for camera rotation using mouse movement.
 * It needs to be attached to a GameObject with a Camera3D module.
 */
class MouseLook extends Module {
    static namespace = "WIP";
    static description = "Controls camera rotation with mouse movement";
    static allowMultiple = false;
    static icon = "fa-mouse";
    
    /**
     * Create a new MouseLook
     */
    constructor() {
        super("MouseLook");
        
        // Setup requirements
        this.requires("Camera3D");
        
        // Look settings
        this._sensitivity = 0.2; // Lower = less sensitive
        this._invertX = false;
        this._invertY = false;
        this._smoothing = 0.1; // Lower = more responsive, higher = smoother
        
        // Range limits
        this._minPitch = -89.9; // Minimum vertical angle (looking down)
        this._maxPitch = 89.9;  // Maximum vertical angle (looking up)
        
        // Mouse state
        this._isLooking = false;
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        
        // Smoothing
        this._targetRotation = new Vector3(0, 0, 0);
        
        // Camera reference (will be set in start())
        this.camera = null;
        
        // Activate mode
        this._activateMode = "rightButton"; // Options: "always", "rightButton", "middleButton", "leftButton"
        
        // Expose properties to the inspector
        this.exposeProperty("sensitivity", "number", 0.2, {
            min: 0.01,
            max: 2,
            step: 0.01,
            onChange: (val) => this._sensitivity = val
        });

        this.exposeProperty("invertX", "boolean", false, {
            onChange: (val) => this._invertX = val
        });
        this.exposeProperty("invertY", "boolean", false, {
            onChange: (val) => this._invertY = val
        });

        this.exposeProperty("smoothing", "number", 0.1, {
            min: 0,
            max: 0.99,
            step: 0.01,
            onChange: (val) => this._smoothing = val
        });

        this.exposeProperty("minPitch", "number", -89.9, {
            min: -89.9,
            max: 89.9,
            onChange: (val) => this._minPitch = val
        });

        this.exposeProperty("maxPitch", "number", 89.9, {
            min: -89.9,
            max: 89.9,
            onChange: (val) => this._maxPitch = val
        });

        this.exposeProperty("activateMode", "enum", "rightButton", {
            options: ["always", "rightButton", "middleButton", "leftButton"],
            onChange: (val) => this._activateMode = val
        });
        
        // Bind methods to maintain 'this' context
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }
    
    /**
     * Called when the module starts
     */
    start() {
        // Get camera reference
        this.camera = this.gameObject.getModule("Camera3D");
        
        if (!this.camera) {
            console.error("MouseLook requires a Camera3D module on the same GameObject");
            return;
        }
        
        // Initialize target rotation to camera's current rotation
        this._targetRotation = new Vector3(
            this.camera.rotation.x,
            this.camera.rotation.y,
            this.camera.rotation.z
        );
        
        // Wait a short time to ensure engine is initialized
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    /**
     * Set up event listeners for mouse control
     */
    setupEventListeners() {
        // Set up event listeners
        if (window.engine && window.engine.canvas) {
            const canvas = window.engine.canvas;
            canvas.addEventListener('mousedown', this.handleMouseDown);
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        } else if (document.querySelector('canvas')) {
            // Fallback to any canvas in the document
            const canvas = document.querySelector('canvas');
            canvas.addEventListener('mousedown', this.handleMouseDown);
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
            console.log("MouseLook: Using fallback canvas");
        } else {
            console.warn("MouseLook: No canvas found for mouse events");
        }
    }
    
    /**
     * Called when the module is destroyed
     */
    onDestroy() {
        // Clean up event listeners
        const canvas = window.engine?.canvas || document.querySelector('canvas');
        if (canvas) {
            canvas.removeEventListener('mousedown', this.handleMouseDown);
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
        }
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseDown(event) {
        if (!this.camera) return;
        
        // Check if the correct mouse button was pressed
        if (this.activateMode === "always" ||
           (this.activateMode === "rightButton" && event.button === 2) ||
           (this.activateMode === "middleButton" && event.button === 1) ||
           (this.activateMode === "leftButton" && event.button === 0)) {
            
            this._isLooking = true;
            this._lastMouseX = event.clientX;
            this._lastMouseY = event.clientY;
            
            // Prevent default context menu if right click is used
            if (event.button === 2) {
                event.preventDefault();
                
                // Add a one-time event listener for context menu
                const contextMenuHandler = (e) => {
                    e.preventDefault();
                    document.removeEventListener('contextmenu', contextMenuHandler);
                };
                
                document.addEventListener('contextmenu', contextMenuHandler);
            }
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseMove(event) {
        if (!this.camera || !this._isLooking) return;
        
        // Calculate mouse movement
        const deltaX = event.clientX - this._lastMouseX;
        const deltaY = event.clientY - this._lastMouseY;
        
        // Update last mouse position
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        
        // Apply sensitivity and inversion
        const yawDelta = deltaX * this.sensitivity * (this.invertX ? -1 : 1);
        const pitchDelta = deltaY * this.sensitivity * (this.invertY ? -1 : 1);
        
        // Update target rotation using Z-up convention where:
        // - Z = yaw (turn left/right)
        // - Y = pitch (tilt up/down around right axis)
        // - X = roll (unused by mouse look unless explicitly set)
        this._targetRotation.z = (this._targetRotation.z + yawDelta) % 360;
        this._targetRotation.y = this._targetRotation.y - pitchDelta;

        // Clamp pitch (rotation.y) to prevent flipping
        this._targetRotation.y = Math.max(this.minPitch, Math.min(this.maxPitch, this._targetRotation.y));
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseUp(event) {
        if (!this.camera) return;
        
        // Check if the correct mouse button was released
        if ((this.activateMode === "rightButton" && event.button === 2) ||
            (this.activateMode === "middleButton" && event.button === 1) ||
            (this.activateMode === "leftButton" && event.button === 0)) {
            
            this._isLooking = false;
        }
    }
    
    /**
     * Handle camera rotation each frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!this.camera) return;
        
        if (this.activateMode === "always") {
            this._isLooking = true;
            
            // Get mouse movement from InputManager if available
            if (window.input) {
                const mouseDelta = window.input.getMouseDelta();
                if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
                    // Apply sensitivity and inversion
                    const yawDelta = mouseDelta.x * this.sensitivity * (this.invertX ? -1 : 1);
                    const pitchDelta = mouseDelta.y * this.sensitivity * (this.invertY ? -1 : 1);
                    
                    // Update target rotation
                    this._targetRotation.z = (this._targetRotation.z + yawDelta) % 360;
                    this._targetRotation.y = this._targetRotation.y - pitchDelta;

                    // Clamp pitch (rotation.y)
                    this._targetRotation.y = Math.max(this.minPitch, Math.min(this.maxPitch, this._targetRotation.y));
                }
            }
        }
        
        // Apply rotation with smoothing (Z-up: pitch = rotation.y, yaw = rotation.z, roll = rotation.x)
        if (this.smoothing > 0) {
            // Pitch -> rotation.y
            this.camera.rotation.y += (this._targetRotation.y - this.camera.rotation.y) * (1 - this.smoothing);
            // Roll -> rotation.x
            this.camera.rotation.x += (this._targetRotation.x - this.camera.rotation.x) * (1 - this.smoothing);
            // Yaw -> rotation.z
            this.camera.rotation.z += (this._targetRotation.z - this.camera.rotation.z) * (1 - this.smoothing);
        } else {
            // Direct rotation without smoothing
            this.camera.rotation.y = this._targetRotation.y; // Pitch (Y-axis)
            this.camera.rotation.x = this._targetRotation.x; // Roll (X-axis)
            this.camera.rotation.z = this._targetRotation.z; // Yaw (Z-axis)
        }
    }
    
    /**
     * Serialize the mouse look to JSON
     * @returns {Object} JSON representation of the mouse look
     */
    toJSON() {
        return {
            _type: "MouseLook",
            _sensitivity: this._sensitivity,
            _invertX: this._invertX,
            _invertY: this._invertY,
            _smoothing: this._smoothing,
            _minPitch: this._minPitch,
            _maxPitch: this._maxPitch,
            _activateMode: this._activateMode
        };
    }

    /**
     * Deserialize the mouse look from JSON
     * @param {Object} json - JSON representation of the mouse look
     */
    fromJSON(json) {
        if (json._sensitivity !== undefined) this._sensitivity = json._sensitivity;
        if (json._invertX !== undefined) this._invertX = json._invertX;
        if (json._invertY !== undefined) this._invertY = json._invertY;
        if (json._smoothing !== undefined) this._smoothing = json._smoothing;
        if (json._minPitch !== undefined) this._minPitch = json._minPitch;
        if (json._maxPitch !== undefined) this._maxPitch = json._maxPitch;
        if (json._activateMode !== undefined) this._activateMode = json._activateMode;
    }

    // Getters and setters for properties
    get sensitivity() { return this._sensitivity; }
    set sensitivity(value) { this._sensitivity = value; }

    get invertX() { return this._invertX; }
    set invertX(value) { this._invertX = value; }

    get invertY() { return this._invertY; }
    set invertY(value) { this._invertY = value; }

    get smoothing() { return this._smoothing; }
    set smoothing(value) { this._smoothing = Math.max(0, Math.min(0.99, value)); }

    get minPitch() { return this._minPitch; }
    set minPitch(value) { this._minPitch = Math.max(-89.9, Math.min(this.maxPitch, value)); }

    get maxPitch() { return this._maxPitch; }
    set maxPitch(value) { this._maxPitch = Math.min(89.9, Math.max(this.minPitch, value)); }

    get activateMode() { return this._activateMode; }
    set activateMode(value) { this._activateMode = value; }
}

// Register the MouseLook module
window.MouseLook = MouseLook;