/**
 * PlatformerController - Simple platformer movement with bounding box collision
 */
class PlatformerController extends Module {
    static namespace = "Controllers";
    static description = "Platformer movement with collision against ground objects";
    static iconClass = "fas fa-running";

    constructor() {
        super("PlatformerController");
        this.speed = 180;
        this.jumpForce = 350;
        this.gravity = 900;
        this.maxFallSpeed = 600;
        this.velocity = new Vector2(0, 0);
        this.isGrounded = false;

        // Expose properties for inspector
        this.exposeProperty("speed", "number", this.speed, {
            min: 0, max: 500, step: 10,
            description: "Horizontal movement speed",
            style: { label: "Speed", slider: true },
            onChange: v => { this.speed = v; }
        });
        this.exposeProperty("jumpForce", "number", this.jumpForce, {
            min: 100, max: 1000, step: 10,
            description: "Jump force",
            style: { label: "Jump Force", slider: true },
            onChange: v => { this.jumpForce = v; }
        });
        this.exposeProperty("gravity", "number", this.gravity, {
            min: 100, max: 2000, step: 10,
            description: "Gravity strength",
            style: { label: "Gravity", slider: true },
            onChange: v => { this.gravity = v; }
        });
    }

    loop(deltaTime) {
        if (!window.input) return;

        // Horizontal movement
        let move = 0;
        if (window.input.keyDown("arrowleft") || window.input.keyDown("a")) move -= 1;
        if (window.input.keyDown("arrowright") || window.input.keyDown("d")) move += 1;

        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        if (this.velocity.y > this.maxFallSpeed) this.velocity.y = this.maxFallSpeed;

        // Jump
        if (this.isGrounded && (window.input.keyPressed("arrowup") || window.input.keyPressed("w") || window.input.keyPressed("space"))) {
            this.velocity.y = -this.jumpForce;
            this.isGrounded = false;
        }

        // Set horizontal velocity
        this.velocity.x = move * this.speed;

        // Predict next position
        const nextPos = new Vector2(
            this.gameObject.position.x + this.velocity.x * deltaTime,
            this.gameObject.position.y + this.velocity.y * deltaTime
        );

        // Get own bounding box at next position
        const collider = this.gameObject.getModule(BoundingBoxCollider);
        if (!collider) return;
        const nextBox = {
            ...collider.gameObject.getBoundingBox(),
            x: nextPos.x,
            y: nextPos.y
        };

        // Check collision with ground objects
        this.isGrounded = false;
        let blockedX = false, blockedY = false;
        for (const obj of window.scene.gameObjects) {
            if (obj === this.gameObject) continue;
            if (!obj.name || !obj.name.toLowerCase().includes("ground")) continue;
            const groundCollider = obj.getModule(BoundingBoxCollider);
            if (!groundCollider) continue;
            const groundBox = groundCollider.gameObject.getBoundingBox();

            // Check vertical collision (landing)
            if (this._intersectAABB(
                { ...nextBox, x: this.gameObject.position.x, y: nextPos.y },
                groundBox
            )) {
                if (this.velocity.y > 0) { // falling
                    nextPos.y = groundBox.y - groundBox.height / 2 - nextBox.height / 2;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                    blockedY = true;
                }
            }
            // Check horizontal collision (walls)
            if (this._intersectAABB(
                { ...nextBox, x: nextPos.x, y: this.gameObject.position.y },
                groundBox
            )) {
                nextPos.x = this.gameObject.position.x;
                this.velocity.x = 0;
                blockedX = true;
            }
        }

        // Apply position
        this.gameObject.position.x = nextPos.x;
        this.gameObject.position.y = nextPos.y;
    }

    /**
     * Simple AABB collision check
     */
    _intersectAABB(a, b) {
        return (
            Math.abs(a.x - b.x) < (a.width / 2 + b.width / 2) &&
            Math.abs(a.y - b.y) < (a.height / 2 + b.height / 2)
        );
    }
}

// Register globally
window.PlatformerController = PlatformerController;