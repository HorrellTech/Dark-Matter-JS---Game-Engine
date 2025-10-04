/**
 * MouseLook - Module for controlling camera rotation with the mouse
 * 
 * This module allows for camera rotation using mouse movement.
 * It needs to be attached to a GameObject with a Camera3D module.
 */
class MouseLook extends Module {
    static namespace = "3D";
    static description = "Controls camera rotation with mouse movement";
    static allowMultiple = false;
    static icon = "fa-mouse";
    
    /**
     * Create a new MouseLook
     */
    constructor() {
        super("MouseLook");
        
        // Setup requirements
        this.requires("Camera3DRasterizer");
        
        // Look settings
        this._sensitivity = 0.2; // Lower = less sensitive
        this._invertX = false;
        this._invertY = false;
        this._smoothing = 0.1; // Lower = more responsive, higher = smoother
        this._lockX = false; // Lock horizontal rotation
        this._lockY = false; // Lock vertical rotation
        
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
        this._activateMode = "rightButton"; // Options: "always", "rightButton", "middleButton", "leftButton", "freeLook"
        
        // Pointer lock settings
        this._lockCursor = false;
        this._isPointerLocked = false;

        // Screen wrap settings
        this._screenWrap = true; // Enable mouse wrap around screen edges
        this._wrapSensitivity = 1.0; // Sensitivity multiplier when wrapping
        
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

        this.exposeProperty("lockX", "boolean", false, {
            onChange: (val) => this._lockX = val
        });

        this.exposeProperty("lockY", "boolean", false, {
            onChange: (val) => this._lockY = val
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
            options: ["always", "rightButton", "middleButton", "leftButton", "freeLook"],
            onChange: (val) => this._activateMode = val
        });

        this.exposeProperty("lockCursor", "boolean", false, {
            onChange: (val) => this._lockCursor = val
        });

        this.exposeProperty("screenWrap", "boolean", true, {
            onChange: (val) => this._screenWrap = val
        });

        this.exposeProperty("wrapSensitivity", "number", 1.0, {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            onChange: (val) => this._wrapSensitivity = val
        });
        
        // Bind methods to maintain 'this' context
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleCanvasFocus = this.handleCanvasFocus.bind(this);
        this.handleCanvasBlur = this.handleCanvasBlur.bind(this);
    }
    
    /**
     * Called when the module starts
     */
    start() {
        // Get camera reference
        this.camera = this.gameObject.getModule("Camera3DRasterizer") || this.gameObject.getModule("Camera3D");
        
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
            canvas.addEventListener('mouseleave', this.handleMouseLeave);
            canvas.addEventListener('mouseenter', this.handleMouseEnter);
            document.addEventListener('pointerlockchange', this.handlePointerLockChange);
            document.addEventListener('keydown', this.handleKeyDown);
            canvas.addEventListener('focus', this.handleCanvasFocus);
            canvas.addEventListener('blur', this.handleCanvasBlur);
            
            // Make canvas focusable if it isn't already
            if (!canvas.hasAttribute('tabindex')) {
                canvas.setAttribute('tabindex', '0');
            }
        } else if (document.querySelector('canvas')) {
            // Fallback to any canvas in the document
            const canvas = document.querySelector('canvas');
            canvas.addEventListener('mousedown', this.handleMouseDown);
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
            canvas.addEventListener('mouseleave', this.handleMouseLeave);
            canvas.addEventListener('mouseenter', this.handleMouseEnter);
            document.addEventListener('pointerlockchange', this.handlePointerLockChange);
            document.addEventListener('keydown', this.handleKeyDown);
            canvas.addEventListener('focus', this.handleCanvasFocus);
            canvas.addEventListener('blur', this.handleCanvasBlur);
            
            // Make canvas focusable if it isn't already
            if (!canvas.hasAttribute('tabindex')) {
                canvas.setAttribute('tabindex', '0');
            }
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
            canvas.removeEventListener('mouseleave', this.handleMouseLeave);
            canvas.removeEventListener('mouseenter', this.handleMouseEnter);
            document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
            document.removeEventListener('keydown', this.handleKeyDown);
            canvas.removeEventListener('focus', this.handleCanvasFocus);
            canvas.removeEventListener('blur', this.handleCanvasBlur);
        }
        
        // Release pointer lock if active
        if (this._isPointerLocked) {
            document.exitPointerLock();
        }
    }

    /**
     * Handle canvas focus event
     */
    handleCanvasFocus() {
        if (this._lockCursor && this._activateMode === "freeLook") {
            this.requestPointerLock();
        }
    }

    /**
     * Handle canvas blur event
     */
    handleCanvasBlur() {
        if (this._isPointerLocked) {
            document.exitPointerLock();
        }
    }

    /**
     * Handle mouse leave event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseLeave(event) {
        if (!this._screenWrap || this._isPointerLocked) return;

        // Store that we're wrapping so we don't process this as normal mouse movement
        this._isWrapping = true;
        this._wrapStartTime = Date.now();
    }

    /**
     * Handle mouse enter event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseEnter(event) {
        if (!this._screenWrap || this._isPointerLocked) return;

        // If we were wrapping, simulate the mouse movement that got cut off
        if (this._isWrapping && this._lastMouseX !== undefined && this._lastMouseY !== undefined) {
            // Calculate how much mouse movement we might have missed
            const timeSinceLeave = Date.now() - this._wrapStartTime;
            if (timeSinceLeave < 100) { // Only if it was a quick leave/re-enter
                // Apply wrap movement based on the edge we left from
                this.simulateWrapMovement(event);
            }
        }

        this._isWrapping = false;
    }

    /**
     * Simulate mouse movement when wrapping around screen edges
     * @param {MouseEvent} event - The mouse enter event
     */
    simulateWrapMovement(event) {
        if (!this._isLooking) return;

        // Determine which edge we likely came from based on enter position
        const canvas = window.engine?.canvas || document.querySelector('canvas');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let simulatedDeltaX = 0;
        let simulatedDeltaY = 0;

        // If mouse entered from left edge, simulate rightward movement
        if (event.clientX <= rect.left + 10) {
            simulatedDeltaX = 50 * this._wrapSensitivity;
        }
        // If mouse entered from right edge, simulate leftward movement
        else if (event.clientX >= rect.right - 10) {
            simulatedDeltaX = -50 * this._wrapSensitivity;
        }
        // If mouse entered from top edge, simulate downward movement
        else if (event.clientY <= rect.top + 10) {
            simulatedDeltaY = 50 * this._wrapSensitivity;
        }
        // If mouse entered from bottom edge, simulate upward movement
        else if (event.clientY >= rect.bottom - 10) {
            simulatedDeltaY = -50 * this._wrapSensitivity;
        }

        if (simulatedDeltaX !== 0 || simulatedDeltaY !== 0) {
            // Apply the simulated rotation
            const yawDelta = this._lockX ? 0 : simulatedDeltaX * this.sensitivity * (this.invertX ? -1 : 1);
            const pitchDelta = this._lockY ? 0 : simulatedDeltaY * this.sensitivity * (this.invertY ? -1 : 1);

            this._targetRotation.z = (this._targetRotation.z + yawDelta) % 360;
            this._targetRotation.y = this._targetRotation.y - pitchDelta;
            this._targetRotation.y = Math.max(this.minPitch, Math.min(this.maxPitch, this._targetRotation.y));
        }
    }

    /**
     * Handle key down event
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        if (event.key === 'Escape' && this._isPointerLocked) {
            document.exitPointerLock();
        }
    }

    /**
     * Handle pointer lock change event
     */
    handlePointerLockChange() {
        const canvas = window.engine?.canvas || document.querySelector('canvas');
        this._isPointerLocked = document.pointerLockElement === canvas;
        
        if (this._isPointerLocked) {
            this._isLooking = true;
        } else if (this._activateMode === "freeLook") {
            this._isLooking = false;
        }
    }

    /**
     * Request pointer lock on the canvas
     */
    requestPointerLock() {
        const canvas = window.engine?.canvas || document.querySelector('canvas');
        if (canvas && !this._isPointerLocked) {
            canvas.requestPointerLock();
        }
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseDown(event) {
        if (!this.camera) return;
        
        // Handle freeLook mode with pointer lock
        if (this._activateMode === "freeLook") {
            if (this._lockCursor && !this._isPointerLocked) {
                this.requestPointerLock();
            } else if (!this._lockCursor) {
                this._isLooking = true;
                this._lastMouseX = event.clientX;
                this._lastMouseY = event.clientY;
            }
            return;
        }
        
        // Check if the correct mouse button was pressed
        if (this._activateMode === "always" ||
           (this._activateMode === "rightButton" && event.button === 2) ||
           (this._activateMode === "middleButton" && event.button === 1) ||
           (this._activateMode === "leftButton" && event.button === 0)) {
            
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
        
        let deltaX, deltaY;
        
        // Use movementX/Y for pointer lock, otherwise calculate delta
        if (this._isPointerLocked) {
            deltaX = event.movementX || 0;
            deltaY = event.movementY || 0;
        } else {
            // Calculate mouse movement
            deltaX = event.clientX - this._lastMouseX;
            deltaY = event.clientY - this._lastMouseY;
            
            // Update last mouse position
            this._lastMouseX = event.clientX;
            this._lastMouseY = event.clientY;
        }
        
        // Apply sensitivity and inversion, respecting axis locks
        const yawDelta = this._lockX ? 0 : deltaX * this.sensitivity * (this.invertX ? -1 : 1);
        const pitchDelta = this._lockY ? 0 : deltaY * this.sensitivity * (this.invertY ? -1 : 1);
        
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
        
        // Don't stop looking in freeLook mode without cursor lock or if pointer is locked
        if (this._activateMode === "freeLook" && (this._isPointerLocked || !this._lockCursor)) {
            if (!this._lockCursor) {
                this._isLooking = false;
            }
            return;
        }
        
        // Check if the correct mouse button was released
        if ((this._activateMode === "rightButton" && event.button === 2) ||
            (this._activateMode === "middleButton" && event.button === 1) ||
            (this._activateMode === "leftButton" && event.button === 0)) {
            
            this._isLooking = false;
        }
    }
    
    /**
     * Handle camera rotation each frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!this.camera) return;
        
        // For "always" mode, automatically enable looking
        if (this._activateMode === "always") {
            this._isLooking = true;
        }
        
        // For "freeLook" mode without cursor lock, enable looking
        if (this._activateMode === "freeLook" && !this._lockCursor) {
            this._isLooking = true;
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
            ...super.toJSON(),
            _type: "MouseLook",
            _sensitivity: this._sensitivity,
            _invertX: this._invertX,
            _invertY: this._invertY,
            _smoothing: this._smoothing,
            _lockX: this._lockX,
            _lockY: this._lockY,
            _minPitch: this._minPitch,
            _maxPitch: this._maxPitch,
            _activateMode: this._activateMode,
            _lockCursor: this._lockCursor,
            _screenWrap: this._screenWrap,
            _wrapSensitivity: this._wrapSensitivity
        };
    }

    /**
     * Deserialize the mouse look from JSON
     * @param {Object} json - JSON representation of the mouse look
     */
    fromJSON(json) {
        super.fromJSON(json);
        if (json._sensitivity !== undefined) this._sensitivity = json._sensitivity;
        if (json._invertX !== undefined) this._invertX = json._invertX;
        if (json._invertY !== undefined) this._invertY = json._invertY;
        if (json._smoothing !== undefined) this._smoothing = json._smoothing;
        if (json._lockX !== undefined) this._lockX = json._lockX;
        if (json._lockY !== undefined) this._lockY = json._lockY;
        if (json._minPitch !== undefined) this._minPitch = json._minPitch;
        if (json._maxPitch !== undefined) this._maxPitch = json._maxPitch;
        if (json._activateMode !== undefined) this._activateMode = json._activateMode;
        if (json._lockCursor !== undefined) this._lockCursor = json._lockCursor;
        if (json._screenWrap !== undefined) this._screenWrap = json._screenWrap;
        if (json._wrapSensitivity !== undefined) this._wrapSensitivity = json._wrapSensitivity;
    }

    // Getters and setters for properties
    get sensitivity() { return this._sensitivity; }
    set sensitivity(value) { this._sensitivity = value; }

    get invertX() { return this._invertX; }
    set invertX(value) { this._invertX = value; }

    get invertY() { return this._invertY; }
    set invertY(value) { this._invertY = value; }

    get lockX() { return this._lockX; }
    set lockX(value) { this._lockX = value; }

    get lockY() { return this._lockY; }
    set lockY(value) { this._lockY = value; }

    get smoothing() { return this._smoothing; }
    set smoothing(value) { this._smoothing = Math.max(0, Math.min(0.99, value)); }

    get minPitch() { return this._minPitch; }
    set minPitch(value) { this._minPitch = Math.max(-89.9, Math.min(this.maxPitch, value)); }

    get maxPitch() { return this._maxPitch; }
    set maxPitch(value) { this._maxPitch = Math.min(89.9, Math.max(this.minPitch, value)); }

    get activateMode() { return this._activateMode; }
    set activateMode(value) { this._activateMode = value; }

    get lockCursor() { return this._lockCursor; }
    set lockCursor(value) { this._lockCursor = value; }

    get screenWrap() { return this._screenWrap; }
    set screenWrap(value) { this._screenWrap = value; }

    get wrapSensitivity() { return this._wrapSensitivity; }
    set wrapSensitivity(value) { this._wrapSensitivity = Math.max(0.1, Math.min(5.0, value)); }
}

// Register the MouseLook module
window.MouseLook = MouseLook;