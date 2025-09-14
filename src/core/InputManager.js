/**
 * InputManager - Handles keyboard, mouse and touch input
 * 
 * This is a global system that manages all input in a centralized way,
 * allowing modules to easily check for input states without adding their
 * own event listeners.
 */
class InputManager {
    constructor() {
        // Keyboard state tracking
        this.keys = {};          // Current key states (down/up)
        this.keysDown = {};      // Keys that went down this frame
        this.keysUp = {};        // Keys that went up this frame
        this.keysPressed = {};   // Keys that were pressed this frame (for continuous input)

        // Mouse state tracking
        this.mousePosition = new Vector2(0, 0);       // Current mouse position
        this.worldMousePosition = new Vector2(0, 0);  // Mouse position in world coordinates
        this.mouseButtons = {                         // Mouse button states
            left: false,
            middle: false,
            right: false
        };
        this.mouseButtonsDown = {                     // Mouse buttons that went down this frame
            left: false,
            middle: false,
            right: false
        };
        this.mouseButtonsUp = {                       // Mouse buttons that went up this frame
            left: false,
            middle: false,
            right: false
        };
        this.mouseWheel = 0;                          // Mouse wheel delta
        this.mouseMoveThisFrame = false;              // Whether the mouse moved this frame

        // Touch state tracking
        this.touches = {};                            // Current active touches
        this.touchesStarted = {};                     // Touches that started this frame
        this.touchesEnded = {};                       // Touches that ended this frame

        // Engine reference for coordinate transformations
        this.engine = null;

        // DOM element to attach listeners to
        this.targetElement = document;

        // Flag to indicate if input is enabled
        this.enabled = true;

        // Bind event handlers to preserve 'this' context
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
        this._handleWheel = this._handleWheel.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);

        // Initialize
        this.initialize();
    }

    /**
     * Initialize the input manager and attach event listeners
     */
    initialize() {
        // Keyboard events
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);

        // Mouse events
        this.targetElement.addEventListener('mousemove', this._handleMouseMove);
        this.targetElement.addEventListener('mousedown', this._handleMouseDown);
        this.targetElement.addEventListener('mouseup', this._handleMouseUp);
        this.targetElement.addEventListener('wheel', this._handleWheel);
        this.targetElement.addEventListener('contextmenu', (e) => {
            if (this.preventContextMenu) e.preventDefault();
        });

        // Touch events
        this.targetElement.addEventListener('touchstart', this._handleTouchStart);
        this.targetElement.addEventListener('touchmove', this._handleTouchMove);
        this.targetElement.addEventListener('touchend', this._handleTouchEnd);
        this.targetElement.addEventListener('touchcancel', this._handleTouchEnd);

        /*window.addEventListener('mousedown', this._handleMouseDown);
        window.addEventListener('mouseup', this._handleMouseUp);
        window.addEventListener('mousemove', this._handleMouseMove);
        window.addEventListener('wheel', this._handleWheel);
        window.addEventListener('contextmenu', (e) => {
            if (this.preventContextMenu) e.preventDefault();
        });*/

        console.log('InputManager initialized');
    }

    /**
     * Set the engine reference for coordinate transformations
     * @param {Engine} engine - The game engine
     */
    setEngine(engine) {
        this.engine = engine;
    }

    /**
     * Update input states (called at the beginning of each frame)
     */
    beginFrame() {
        // Reset frame-specific states
        this.keysDown = {};
        this.keysUp = {};
        this.mouseButtonsDown = { left: false, middle: false, right: false };
        this.mouseButtonsUp = { left: false, middle: false, right: false };
        this.mouseWheel = 0;
        this.mouseMoveThisFrame = false;
        this.touchesStarted = {};
        this.touchesEnded = {};
    }

    /**
     * Update input states (called at the end of each frame)
     */
    endFrame() {
        // Update pressed keys (held down)
        this.keysPressed = Object.assign({}, this.keys);
        // Update pressed mouse buttons (held down)
        //this.mouseButtonsPressed = Object.assign({}, this.mouseButtons);
        // Clear ended touches
        //this.touchesEnded = {};
        //this.touchesStarted = {};

        // Update world mouse position if engine is available
        if (this.engine && this.engine.ctx) {
            this.updateWorldMousePosition();
        }
    }

    /**
     * Update mouse position from event, handling canvas-relative coordinates
     * @private
     */
    _updateMousePosition(e) {
        // Always store the raw client coordinates
        const rawX = e.clientX;
        const rawY = e.clientY;

        // Convert to canvas-relative coordinates
        if (this.engine && this.engine.canvas) {
            const rect = this.engine.canvas.getBoundingClientRect();

            // Calculate canvas-relative position
            let canvasX = rawX - rect.left;
            let canvasY = rawY - rect.top;

            // Scale coordinates if canvas is scaled
            const scaleX = this.engine.canvas.width / rect.width;
            const scaleY = this.engine.canvas.height / rect.height;
            canvasX *= scaleX;
            canvasY *= scaleY;

            this.mousePosition.x = canvasX;
            this.mousePosition.y = canvasY;
        } else {
            // Fallback to raw coordinates
            this.mousePosition.x = rawX;
            this.mousePosition.y = rawY;
        }

        // Update world coordinates immediately
        this.updateWorldMousePosition();
    }

    /**
     * Convert screen mouse position to world coordinates
     */
    updateWorldMousePosition() {
        if (!this.engine || !this.engine.ctx) return;

        // Use the engine's screen to world conversion
        if (this.engine.screenToWorld) {
            const worldPos = this.engine.screenToWorld(this.mousePosition.x, this.mousePosition.y);
            this.worldMousePosition.x = worldPos.x;
            this.worldMousePosition.y = worldPos.y;
        } else {
            // Manual calculation if screenToWorld is not available
            // This takes into account viewport position, zoom, rotation, and shake
            const viewport = this.engine.viewport;
            if (viewport) {
                const centerX = this.engine.canvas.width / 2;
                const centerY = this.engine.canvas.height / 2;

                let worldX = this.mousePosition.x;
                let worldY = this.mousePosition.y;

                // Reverse rotation if viewport is rotated
                if (viewport.angle !== 0) {
                    const cos = Math.cos(-viewport.angle * Math.PI / 180);
                    const sin = Math.sin(-viewport.angle * Math.PI / 180);
                    const relativeX = worldX - centerX;
                    const relativeY = worldY - centerY;

                    worldX = centerX + (relativeX * cos - relativeY * sin);
                    worldY = centerY + (relativeX * sin + relativeY * cos);
                }

                // Reverse zoom transformation
                worldX = (worldX - centerX) / viewport.zoom + centerX;
                worldY = (worldY - centerY) / viewport.zoom + centerY;

                // Apply viewport position offset and reverse shake
                worldX = worldX + viewport.x - (viewport.shake?.x || 0);
                worldY = worldY + viewport.y - (viewport.shake?.y || 0);

                this.worldMousePosition.x = worldX;
                this.worldMousePosition.y = worldY;
            } else {
                // Fallback: copy canvas coordinates as world coordinates
                this.worldMousePosition.x = this.mousePosition.x;
                this.worldMousePosition.y = this.mousePosition.y;
            }
        }
    }

    // ----------------------
    // Keyboard Input Methods
    // ----------------------

    /**
     * Check if a key is currently down
     * @param {string} keyCode - The key code or name
     * @returns {boolean} True if the key is down
     */
    keyDown(keyCode) {
        return this.keys[keyCode.toLowerCase()] === true;
    }

    /**
     * Check if a key was pressed this frame
     * @param {string} keyCode - The key code or name
     * @returns {boolean} True if the key was pressed this frame
     */
    keyPressed(keyCode) {
        return this.keysDown[keyCode.toLowerCase()] === true;
    }

    /**
     * Check if a key was released this frame
     * @param {string} keyCode - The key code or name
     * @returns {boolean} True if the key was released this frame
     */
    keyReleased(keyCode) {
        return this.keysUp[keyCode.toLowerCase()] === true;
    }

    /**
     * Handle key down events
     * @private
     */
    _handleKeyDown(e) {
        if (!this.enabled) return;

        const key = e.key.toLowerCase();

        // Skip if already down (handles key repeat)
        if (!this.keys[key]) {
            this.keys[key] = true;
            this.keysDown[key] = true;
        }
    }

    /**
     * Handle key up events
     * @private
     */
    _handleKeyUp(e) {
        if (!this.enabled) return;

        const key = e.key.toLowerCase();
        this.keys[key] = false;
        this.keysUp[key] = true;
    }

    // -------------------
    // Mouse Input Methods
    // -------------------

    /**
     * Check if a mouse button is currently down
     * @param {string|number} button - Button to check ('left', 'middle', 'right' or button code)
     * @returns {boolean} True if the button is down
     */
    mouseDown(button) {
        if (typeof button === 'string') {
            return this.mouseButtons[button] === true;
        }

        switch (button) {
            case 0: return this.mouseButtons.left;
            case 1: return this.mouseButtons.middle;
            case 2: return this.mouseButtons.right;
            default: return false;
        }
    }

    /**
     * Check if a mouse button was pressed this frame
     * @param {string|number} button - Button to check ('left', 'middle', 'right' or button code)
     * @returns {boolean} True if the button was pressed this frame
     */
    mousePressed(button) {
        if (typeof button === 'string') {
            return this.mouseButtonsDown[button] === true;
        }

        switch (button) {
            case 0: return this.mouseButtonsDown.left;
            case 1: return this.mouseButtonsDown.middle;
            case 2: return this.mouseButtonsDown.right;
            default: return false;
        }
    }

    /**
     * Check if a mouse button was released this frame
     * @param {string|number} button - Button to check ('left', 'middle', 'right' or button code)
     * @returns {boolean} True if the button was released this frame
     */
    mouseReleased(button) {
        if (typeof button === 'string') {
            return this.mouseButtonsUp[button] === true;
        }

        switch (button) {
            case 0: return this.mouseButtonsUp.left;
            case 1: return this.mouseButtonsUp.middle;
            case 2: return this.mouseButtonsUp.right;
            default: return false;
        }
    }

    /**
     * Get the current mouse position
     * @param {boolean} worldSpace - If true, returns position in world coordinates
     * @returns {Vector2} The mouse position
     */
    getMousePosition(worldSpace = false) {
        return worldSpace ? this.worldMousePosition.clone() : this.mousePosition.clone();
    }

    /**
     * Check if the mouse moved this frame
     * @returns {boolean} True if the mouse moved this frame
     */
    didMouseMove() {
        return this.mouseMoveThisFrame;
    }

    /**
     * Get the mouse wheel delta
     * @returns {number} The mouse wheel delta
     */
    getMouseWheelDelta() {
        return this.mouseWheel;
    }

    /**
     * Handle mouse move events
     * @private
     */
    _handleMouseMove(e) {
        if (!this.enabled) return;

        this._updateMousePosition(e);
        this.mouseMoveThisFrame = true;
    }

    /**
     * Handle mouse down events
     * @private
     */
    _handleMouseDown(e) {
        if (!this.enabled) return;

        // Update mouse position first
        this._updateMousePosition(e);

        console.log('Mouse Down:', e.button, 'at screen:', e.clientX, e.clientY, 'canvas:', this.mousePosition.x, this.mousePosition.y, 'world:', this.worldMousePosition.x, this.worldMousePosition.y);

        switch (e.button) {
            case 0: // Left
                this.mouseButtons.left = true;
                this.mouseButtonsDown.left = true;
                break;
            case 1: // Middle
                this.mouseButtons.middle = true;
                this.mouseButtonsDown.middle = true;
                break;
            case 2: // Right
                this.mouseButtons.right = true;
                this.mouseButtonsDown.right = true;
                break;
        }
    }

    /**
     * Handle mouse up events
     * @private
     */
    _handleMouseUp(e) {
        if (!this.enabled) return;

        switch (e.button) {
            case 0: // Left
                this.mouseButtons.left = false;
                this.mouseButtonsUp.left = true;
                break;
            case 1: // Middle
                this.mouseButtons.middle = false;
                this.mouseButtonsUp.middle = true;
                break;
            case 2: // Right
                this.mouseButtons.right = false;
                this.mouseButtonsUp.right = true;
                break;
        }
    }

    /**
     * Handle mouse wheel events
     * @private
     */
    _handleWheel(e) {
        if (!this.enabled) return;

        this.mouseWheel = Math.sign(e.deltaY); // 1 for scroll down, -1 for scroll up
    }

    // -------------------
    // Touch Input Methods
    // -------------------

    /**
     * Handle touch start events
     * @private
     */
    _handleTouchStart(e) {
        if (!this.enabled) return;

        // Prevent default to avoid scrolling and other touch behaviors
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const id = touch.identifier;

            // Get canvas-relative coordinates
            let x = touch.clientX;
            let y = touch.clientY;

            // Convert to canvas coordinates
            if (this.engine && this.engine.canvas) {
                const rect = this.engine.canvas.getBoundingClientRect();
                x = touch.clientX - rect.left;
                y = touch.clientY - rect.top;

                // Scale coordinates if canvas is scaled
                const scaleX = this.engine.canvas.width / rect.width;
                const scaleY = this.engine.canvas.height / rect.height;
                x *= scaleX;
                y *= scaleY;
            } else {
                // Fallback: try to find game canvas
                const gameCanvas = document.getElementById('gameCanvas');
                const editorCanvas = document.getElementById('editorCanvas');
                const canvas = gameCanvas || editorCanvas;

                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    x = touch.clientX - rect.left;
                    y = touch.clientY - rect.top;

                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    x *= scaleX;
                    y *= scaleY;
                }
            }

            this.touches[id] = {
                id,
                position: new Vector2(x, y),
                startPosition: new Vector2(x, y),
                startTime: Date.now(),
                moved: false,
                totalDistance: 0
            };

            this.touchesStarted[id] = this.touches[id];

            // For single touch, simulate mouse events
            if (Object.keys(this.touches).length === 1) {
                this.mousePosition.x = touch.clientX;
                this.mousePosition.y = touch.clientY;
                this.mouseMoveThisFrame = true;
                this.mouseButtons.left = true;
                this.mouseButtonsDown.left = true;
            }
        }
    }

    /**
     * Handle touch move events
     * @private
     */
    _handleTouchMove(e) {
        if (!this.enabled) return;

        // Prevent default to avoid scrolling
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const id = touch.identifier;

            if (this.touches[id]) {
                // Get canvas-relative coordinates
                let x = touch.clientX;
                let y = touch.clientY;

                // Convert to canvas coordinates
                if (this.engine && this.engine.canvas) {
                    const rect = this.engine.canvas.getBoundingClientRect();
                    x = touch.clientX - rect.left;
                    y = touch.clientY - rect.top;

                    // Scale coordinates if canvas is scaled
                    const scaleX = this.engine.canvas.width / rect.width;
                    const scaleY = this.engine.canvas.height / rect.height;
                    x *= scaleX;
                    y *= scaleY;
                } else {
                    // Fallback: try to find game canvas
                    const gameCanvas = document.getElementById('gameCanvas');
                    const editorCanvas = document.getElementById('editorCanvas');
                    const canvas = gameCanvas || editorCanvas;

                    if (canvas) {
                        const rect = canvas.getBoundingClientRect();
                        x = touch.clientX - rect.left;
                        y = touch.clientY - rect.top;

                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        x *= scaleX;
                        y *= scaleY;
                    }
                }

                // Calculate movement distance
                const deltaX = x - this.touches[id].position.x;
                const deltaY = y - this.touches[id].position.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // Update touch data
                this.touches[id].position.x = x;
                this.touches[id].position.y = y;
                this.touches[id].moved = true;
                this.touches[id].totalDistance += distance;

                // For single touch, simulate mouse events
                if (Object.keys(this.touches).length === 1) {
                    this.mousePosition.x = touch.clientX;
                    this.mousePosition.y = touch.clientY;
                    this.mouseMoveThisFrame = true;
                }
            }
        }
    }

    /**
     * Handle touch end events
     * @private
     */
    _handleTouchEnd(e) {
        if (!this.enabled) return;

        // Prevent default to avoid ghost clicks
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const id = touch.identifier;

            if (this.touches[id]) {
                // Calculate final position
                let x = touch.clientX;
                let y = touch.clientY;

                // Convert to canvas coordinates
                if (this.engine && this.engine.canvas) {
                    const rect = this.engine.canvas.getBoundingClientRect();
                    x = touch.clientX - rect.left;
                    y = touch.clientY - rect.top;

                    // Scale coordinates if canvas is scaled
                    const scaleX = this.engine.canvas.width / rect.width;
                    const scaleY = this.engine.canvas.height / rect.height;
                    x *= scaleX;
                    y *= scaleY;
                } else {
                    // Fallback: try to find game canvas
                    const gameCanvas = document.getElementById('gameCanvas');
                    const editorCanvas = document.getElementById('editorCanvas');
                    const canvas = gameCanvas || editorCanvas;

                    if (canvas) {
                        const rect = canvas.getBoundingClientRect();
                        x = touch.clientX - rect.left;
                        y = touch.clientY - rect.top;

                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;
                        x *= scaleX;
                        y *= scaleY;
                    }
                }

                // Update final position
                this.touches[id].position.x = x;
                this.touches[id].position.y = y;

                // Store ended touch
                this.touchesEnded[id] = Object.assign({}, this.touches[id]);
                delete this.touches[id];

                // Update mouse buttons for single touch
                if (Object.keys(this.touches).length === 0) {
                    this.mouseButtons.left = false;
                    this.mouseButtonsUp.left = true;
                }
            }
        }
    }

    /**
     * Get active touch points
     * @returns {Object} Map of active touches
     */
    getTouches() {
        return this.touches;
    }

    /**
     * Get the count of active touches
     * @returns {number} Number of active touches
     */
    getTouchCount() {
        return Object.keys(this.touches).length;
    }

    /**
     * Check if a tap occurred this frame
     * @returns {boolean} True if a tap occurred
     */
    isTapped() {
        for (const id in this.touchesEnded) {
            const touch = this.touchesEnded[id];
            const duration = touch.startTime ? Date.now() - touch.startTime : 0;

            // Check if it's a short tap (less than 300ms)
            if (duration < 300) {
                // Check if finger didn't move too much
                const distance = touch.position.distanceTo(touch.startPosition);
                if (distance < 20) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if a long press occurred this frame
     * @returns {boolean} True if a long press occurred
     */
    isLongPressed() {
        for (const id in this.touchesEnded) {
            const touch = this.touchesEnded[id];
            const duration = touch.startTime ? Date.now() - touch.startTime : 0;

            // Check if it's a long press (more than 500ms) with minimal movement
            if (duration > 500) {
                const distance = touch.position.distanceTo(touch.startPosition);
                if (distance < 30) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get pinch zoom data for two-finger gestures
     * @returns {Object|null} Pinch data or null if not pinching
     */
    getPinchData() {
        const touchIds = Object.keys(this.touches);
        if (touchIds.length !== 2) return null;

        const touch1 = this.touches[touchIds[0]];
        const touch2 = this.touches[touchIds[1]];

        const currentDistance = touch1.position.distanceTo(touch2.position);
        const startDistance = touch1.startPosition.distanceTo(touch2.startPosition);

        const centerX = (touch1.position.x + touch2.position.x) / 2;
        const centerY = (touch1.position.y + touch2.position.y) / 2;

        return {
            scale: currentDistance / startDistance,
            center: new Vector2(centerX, centerY),
            distance: currentDistance,
            startDistance: startDistance
        };
    }

    /**
     * Check if currently pinching (two fingers)
     * @returns {boolean} True if pinching
     */
    isPinching() {
        return Object.keys(this.touches).length === 2;
    }

    /**
     * Get swipe direction if a swipe occurred this frame
     * @returns {string|null} Direction ('up', 'down', 'left', 'right') or null
     */
    getSwipeDirection() {
        for (const id in this.touchesEnded) {
            const touch = this.touchesEnded[id];
            const duration = touch.startTime ? Date.now() - touch.startTime : 0;

            // Check if it's a quick swipe (less than 300ms) with significant movement
            if (duration < 300 && touch.totalDistance > 50) {
                const deltaX = touch.position.x - touch.startPosition.x;
                const deltaY = touch.position.y - touch.startPosition.y;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    return deltaX > 0 ? 'right' : 'left';
                } else {
                    return deltaY > 0 ? 'down' : 'up';
                }
            }
        }
        return null;
    }

    /**
     * Clean up and remove all event listeners
     */
    destroy() {
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);

        this.targetElement.removeEventListener('mousemove', this._handleMouseMove);
        this.targetElement.removeEventListener('mousedown', this._handleMouseDown);
        this.targetElement.removeEventListener('mouseup', this._handleMouseUp);
        this.targetElement.removeEventListener('wheel', this._handleWheel);

        this.targetElement.removeEventListener('touchstart', this._handleTouchStart);
        this.targetElement.removeEventListener('touchmove', this._handleTouchMove);
        this.targetElement.removeEventListener('touchend', this._handleTouchEnd);
        this.targetElement.removeEventListener('touchcancel', this._handleTouchEnd);
    }

    /**
     * Enable input processing
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable input processing
     */
    disable() {
        this.enabled = false;

        // Clear all input states
        this.keys = {};
        this.keysDown = {};
        this.keysUp = {};
        this.keysPressed = {};

        this.mouseButtons = { left: false, middle: false, right: false };
        this.mouseButtonsDown = { left: false, middle: false, right: false };
        this.mouseButtonsUp = { left: false, middle: false, right: false };

        this.touches = {};
        this.touchesStarted = {};
        this.touchesEnded = {};
    }

    // Prevent context menu from showing on right click
    preventContextMenu() {
        this.preventContextMenu = true;
    }

    // Allow context menu to show on right click
    allowContextMenu() {
        this.preventContextMenu = false;
    }

    /**
 * Enable debug logging for input events
 */
    enableDebugMode() {
        this.debugMode = true;

        // Add console logs to event handlers
        const originalHandleMouseDown = this._handleMouseDown;
        const originalHandleMouseUp = this._handleMouseUp;
        const originalHandleMouseMove = this._handleMouseMove;

        this._handleMouseDown = (e) => {
            if (this.debugMode) console.log('Mouse down:', e.button, 'at', e.clientX, e.clientY);
            originalHandleMouseDown.call(this, e);
        };

        this._handleMouseUp = (e) => {
            if (this.debugMode) console.log('Mouse up:', e.button, 'at', e.clientX, e.clientY);
            originalHandleMouseUp.call(this, e);
        };

        this._handleMouseMove = (e) => {
            if (this.debugMode && this.frameCount % 60 === 0) { // Log every 60th frame to avoid spam
                console.log('Mouse move:', e.clientX, e.clientY);
            }
            originalHandleMouseMove.call(this, e);
        };

        this.frameCount = 0;
    }

    /**
     * Test if event listeners are properly attached
     */
    testEventListeners() {
        console.log('Testing event listeners...');
        console.log('Target element:', this.targetElement);
        console.log('Canvas element:', this.engine?.canvas);

        // Test with a temporary click handler
        const testHandler = (e) => {
            console.log('TEST: Click detected on', e.target.tagName, 'at', e.clientX, e.clientY);
            document.removeEventListener('click', testHandler);
        };

        document.addEventListener('click', testHandler);
        console.log('Click anywhere to test event detection...');
    }

    /**
     * Switch to canvas-based event listeners
     */
    useCanvasTarget() {
        if (!this.engine || !this.engine.canvas) {
            console.warn('Cannot switch to canvas target: engine or canvas not available');
            return;
        }

        // Remove existing listeners
        this.targetElement.removeEventListener('mousemove', this._handleMouseMove);
        this.targetElement.removeEventListener('mousedown', this._handleMouseDown);
        this.targetElement.removeEventListener('mouseup', this._handleMouseUp);
        this.targetElement.removeEventListener('wheel', this._handleWheel);

        // Switch target to canvas
        this.targetElement = this.engine.canvas;

        // Make canvas focusable
        this.targetElement.tabIndex = 0;

        // Re-attach listeners to canvas
        this.targetElement.addEventListener('mousemove', this._handleMouseMove);
        this.targetElement.addEventListener('mousedown', this._handleMouseDown);
        this.targetElement.addEventListener('mouseup', this._handleMouseUp);
        this.targetElement.addEventListener('wheel', this._handleWheel);

        console.log('Switched to canvas-based event listeners');
    }

    /**
     * Get current input state for debugging
     */
    getDebugState() {
        return {
            mousePosition: this.mousePosition,
            worldMousePosition: this.worldMousePosition,
            mouseButtons: this.mouseButtons,
            mouseButtonsDown: this.mouseButtonsDown,
            mouseButtonsUp: this.mouseButtonsUp,
            enabled: this.enabled,
            targetElement: this.targetElement.tagName || 'document',
            touchCount: this.getTouchCount()
        };
    }

    // Add constants for key codes and mouse buttons like 'key.a', 'key.alt', 'key.space', 'mouse.left', etc.
    /**
     * Constants for key codes and mouse buttons for easier use
     */
    static get key() {
        return {
            // Letters
            a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h',
            i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p',
            q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x',
            y: 'y', z: 'z',

            // Numbers
            0: '0', 1: '1', 2: '2', 3: '3', 4: '4',
            5: '5', 6: '6', 7: '7', 8: '8', 9: '9',

            // Special keys
            backspace: 'backspace',
            tab: 'tab',
            enter: 'enter',
            shift: 'shift',
            control: 'control',
            ctrl: 'control',
            alt: 'alt',
            pause: 'pause',
            capslock: 'capslock',
            escape: 'escape',
            esc: 'escape',
            space: ' ',
            pageup: 'pageup',
            pagedown: 'pagedown',
            end: 'end',
            home: 'home',

            // Arrow keys
            left: 'arrowleft',
            up: 'arrowup',
            right: 'arrowright',
            down: 'arrowdown',
            arrowleft: 'arrowleft',
            arrowup: 'arrowup',
            arrowright: 'arrowright',
            arrowdown: 'arrowdown',

            // Special characters
            insert: 'insert',
            delete: 'delete',

            // Function keys
            f1: 'f1', f2: 'f2', f3: 'f3', f4: 'f4', f5: 'f5',
            f6: 'f6', f7: 'f7', f8: 'f8', f9: 'f9', f10: 'f10',
            f11: 'f11', f12: 'f12',

            // Number pad
            numlock: 'numlock',
            numpad0: '0', numpad1: '1', numpad2: '2', numpad3: '3', numpad4: '4',
            numpad5: '5', numpad6: '6', numpad7: '7', numpad8: '8', numpad9: '9',

            // Operators
            multiply: '*',
            add: '+',
            subtract: '-',
            decimal: '.',
            divide: '/',

            // Others
            semicolon: ';',
            equal: '=',
            comma: ',',
            dash: '-',
            period: '.',
            slash: '/',
            graveaccent: '`',
            openbracket: '[',
            backslash: '\\',
            closebracket: ']',
            quote: "'",

            // Meta keys
            meta: 'meta',
            cmd: 'meta',
            win: 'meta'
        };
    }

    /**
     * Constants for mouse buttons for easier use
     */
    static get mouse() {
        return {
            left: 'left',
            middle: 'middle',
            right: 'right',
            button1: 0,   // Left button
            button2: 2,   // Right button
            button3: 1,   // Middle button
            button4: 3,   // Browser back button
            button5: 4    // Browser forward button
        };
    }

    /**
     * Constants for gamepad buttons
     */
    static get gamepad() {
        return {
            a: 0,
            b: 1,
            x: 2,
            y: 3,
            leftbumper: 4,
            rightbumper: 5,
            lefttrigger: 6,
            righttrigger: 7,
            select: 8,
            start: 9,
            leftstick: 10,
            rightstick: 11,
            dpadup: 12,
            dpaddown: 13,
            dpadleft: 14,
            dpadright: 15,
            home: 16
        };
    }
}

// Create a global instance
window.input = new InputManager();
window.key = InputManager.key;
window.mouse = InputManager.mouse;
window.gamepad = InputManager.gamepad;