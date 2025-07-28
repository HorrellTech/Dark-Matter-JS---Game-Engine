/**
 * TouchJoystick - On-screen joystick for touch/mouse movement
 * 
 * This module creates a virtual joystick UI for touch devices and mouse.
 * It moves a GameObject (by name) based on joystick direction.
 */
class TouchJoystick extends Module {
    static allowMultiple = false;
    static namespace = "Controllers";
    static description = "Touch joystick for moving GameObjects";
    static iconClass = "fas fa-gamepad";

    constructor() {
        super("TouchJoystick");

        // Joystick properties
        this.targetName = "Player"; // Name of GameObject to move
        this.joystickRadius = 60;   // Radius of joystick base
        this.knobRadius = 30;       // Radius of joystick knob
        this.active = false;        // Is joystick being touched
        this.direction = new Vector2(0, 0); // Current direction
        this.speed = 200;           // Movement speed (pixels/sec)
        this._touchId = null;       // Track which touch/mouse controls joystick

        // Expose properties for inspector
        this.exposeProperty("targetName", "string", this.targetName, {
            description: "Name of GameObject to move",
            onChange: (val) => this.targetName = val
        });
        this.exposeProperty("joystickRadius", "number", this.joystickRadius, {
            min: 30, max: 200, step: 5, description: "Joystick base radius",
            onChange: (val) => this.joystickRadius = val
        });
        this.exposeProperty("knobRadius", "number", this.knobRadius, {
            min: 10, max: 100, step: 2, description: "Joystick knob radius",
            onChange: (val) => this.knobRadius = val
        });
        this.exposeProperty("speed", "number", this.speed, {
            min: 10, max: 1000, step: 10, description: "Movement speed",
            onChange: (val) => this.speed = val
        });
    }

    start() {
        // Listen for touch and mouse events on the canvas
        const canvas = window.engine?.canvas || document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
            canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
            canvas.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });

            // Mouse events to simulate touch
            canvas.addEventListener('mousedown', this._onMouseDown.bind(this), { passive: false });
            canvas.addEventListener('mousemove', this._onMouseMove.bind(this), { passive: false });
            canvas.addEventListener('mouseup', this._onMouseUp.bind(this), { passive: false });
        }
    }

    onDestroy() {
        const canvas = window.engine?.canvas || document.getElementById('gameCanvas');
        if (canvas) {
            canvas.removeEventListener('touchstart', this._onTouchStart);
            canvas.removeEventListener('touchmove', this._onTouchMove);
            canvas.removeEventListener('touchend', this._onTouchEnd);

            canvas.removeEventListener('mousedown', this._onMouseDown);
            canvas.removeEventListener('mousemove', this._onMouseMove);
            canvas.removeEventListener('mouseup', this._onMouseUp);
        }
    }

    _getPointerPos(e) {
        // Accepts either Touch or MouseEvent
        const canvas = window.engine?.canvas || document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let x, y;
        if (e.touches) {
            // Touch event
            const touch = e.touches[0] || e.changedTouches[0];
            x = (touch.clientX - rect.left) * scaleX;
            y = (touch.clientY - rect.top) * scaleY;
        } else {
            // Mouse event
            x = (e.clientX - rect.left) * scaleX;
            y = (e.clientY - rect.top) * scaleY;
        }
        return new Vector2(x, y);
    }

    _getTouchPos(touch) {
        // Convert touch to canvas coordinates
        const canvas = window.engine?.canvas || document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return new Vector2(
            (touch.clientX - rect.left) * scaleX,
            (touch.clientY - rect.top) * scaleY
        );
    }

    _onTouchStart(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = this._getTouchPos(touch);
            if (pos.distanceTo(this.gameObject.position) < this.joystickRadius + this.knobRadius) {
                this.active = true;
                this._touchId = touch.identifier;
                this.direction = new Vector2(0, 0);
                e.preventDefault();
                break;
            }
        }
    }

    _onTouchMove(e) {
        if (!this.active) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this._touchId) {
                const pos = this._getTouchPos(touch);
                let dx = pos.x - this.gameObject.position.x;
                let dy = pos.y - this.gameObject.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > this.joystickRadius) {
                    dx = dx * this.joystickRadius / dist;
                    dy = dy * this.joystickRadius / dist;
                }
                this.direction = new Vector2(dx, dy).normalize();
                e.preventDefault();
                break;
            }
        }
    }

    _onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === this._touchId) {
                this.active = false;
                this._touchId = null;
                this.direction = new Vector2(0, 0);
                e.preventDefault();
                break;
            }
        }
    }

    _onMouseDown(e) {
        const pos = this._getPointerPos(e);
        if (pos.distanceTo(this.gameObject.position) < this.joystickRadius + this.knobRadius) {
            this.active = true;
            this._touchId = "mouse";
            this.direction = new Vector2(0, 0);
            e.preventDefault();
        }
    }

    _onMouseMove(e) {
        if (!this.active || this._touchId !== "mouse") return;
        const pos = this._getPointerPos(e);
        let dx = pos.x - this.gameObject.position.x;
        let dy = pos.y - this.gameObject.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.joystickRadius) {
            dx = dx * this.joystickRadius / dist;
            dy = dy * this.joystickRadius / dist;
        }
        this.direction = new Vector2(dx, dy).normalize();
        e.preventDefault();
    }

    _onMouseUp(e) {
        if (this._touchId === "mouse") {
            this.active = false;
            this._touchId = null;
            this.direction = new Vector2(0, 0);
            e.preventDefault();
        }
    }

    loop(deltaTime) {
        // Move target GameObject by direction
        if (this.active && (this.direction.x !== 0 || this.direction.y !== 0)) {
            // Use engine reference from gameObject if available
            const engine = this.gameObject?.engine || window.engine;
            if (engine && typeof engine.getGameObjectByName === "function") {
                const target = engine.getGameObjectByName(this.targetName);
                if (target) {
                    target.position.x += this.direction.x * this.speed * deltaTime;
                    target.position.y += this.direction.y * this.speed * deltaTime;
                }
            }
            else {
                console.warn(`TouchJoystick: Target GameObject "${this.targetName}" not found.`);
            }
        }
    }

    draw(ctx) {
        // Draw joystick base
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(this.gameObject.position.x, this.gameObject.position.y, this.joystickRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#222222";
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Draw knob
        let knobX = this.gameObject.position.x;
        let knobY = this.gameObject.position.y;
        if (this.active) {
            knobX += this.direction.x * this.joystickRadius;
            knobY += this.direction.y * this.joystickRadius;
        }
        ctx.beginPath();
        ctx.arc(knobX, knobY, this.knobRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#0af222";
        ctx.fill();
        ctx.restore();
    }
}

// Register module globally
window.TouchJoystick = TouchJoystick;