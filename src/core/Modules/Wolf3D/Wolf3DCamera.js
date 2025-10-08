/**
 * Wolf3DCamera - First-person camera module for Wolf3D-style games
 *
 * Provides first-person camera controls with movement and rotation.
 * Designed for classic FPS-style gameplay similar to Wolfenstein 3D.
 */
class Wolf3DCamera extends Module {
    static namespace = "Wolf3D";
    static iconClass = "fas fa-video-camera";

    constructor() {
        super("Wolf3DCamera");

        // Camera position and orientation
        this.position = new Vector2(0, 0); // 2D position (x, y)
        this.angle = 0; // Rotation angle in degrees
        this.height = 32; // Camera height (eye level)

        // Movement settings
        this.moveSpeed = 150; // Units per second
        this.turnSpeed = 120; // Degrees per second
        this.mouseSensitivity = 0.002;

        // Input state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.turnLeft = false;
        this.turnRight = false;

        // Mouse look
        this.mouseLookEnabled = true;
        this.mouseX = 0;
        this.mouseY = 0;
        this.prevMouseX = 0;
        this.prevMouseY = 0;

        // Collision settings
        this.collisionRadius = 8; // Radius for collision detection
        this.enableCollisions = true;

        // Camera settings
        this.fieldOfView = 60; // Degrees
        this.nearPlane = 1;
        this.farPlane = 1000;

        // 3D Camera integration
        this.isActive = false;
        this.renderTexture = null;
        this.renderTextureWidth = 320;
        this.renderTextureHeight = 200;

        // Expose properties for editor
        this.exposeProperty("position", "vector2", this.position, {
            onChange: (val) => this.position = val
        });
        this.exposeProperty("angle", "number", 0, {
            min: -360, max: 360, onChange: (val) => this.angle = val
        });
        this.exposeProperty("height", "number", 32, {
            min: 1, max: 100, onChange: (val) => this.height = val
        });
        this.exposeProperty("moveSpeed", "number", 150, {
            min: 10, max: 500, onChange: (val) => this.moveSpeed = val
        });
        this.exposeProperty("turnSpeed", "number", 120, {
            min: 10, max: 360, onChange: (val) => this.turnSpeed = val
        });
        this.exposeProperty("mouseSensitivity", "number", 0.002, {
            min: 0.0001, max: 0.01, step: 0.0001, onChange: (val) => this.mouseSensitivity = val
        });
        this.exposeProperty("collisionRadius", "number", 8, {
            min: 1, max: 50, onChange: (val) => this.collisionRadius = val
        });
        this.exposeProperty("enableCollisions", "boolean", true, {
            onChange: (val) => this.enableCollisions = val
        });
        this.exposeProperty("fieldOfView", "number", 60, {
            min: 30, max: 120, onChange: (val) => this.fieldOfView = val
        });
        this.exposeProperty("renderTextureWidth", "number", 320, {
            min: 160, max: 800, onChange: (val) => this.renderTextureWidth = val
        });
        this.exposeProperty("renderTextureHeight", "number", 200, {
            min: 100, max: 600, onChange: (val) => this.renderTextureHeight = val
        });
    }

    start() {
        // Initialize camera position from game object if available
        if (this.gameObject) {
            this.position.x = this.gameObject.position.x;
            this.position.y = this.gameObject.position.y;
            this.angle = this.gameObject.angle;
        }

        // Set up input handlers
        this.setupInputHandlers();

        // Set as active camera if this is the first one
        this.setAsActiveCamera();
    }

    setupInputHandlers() {
        // Input is handled in the loop() method using the global input system
        // No need to set up individual event handlers
    }

    setAsActiveCamera() {
        // Deactivate other Wolf3D cameras
        if (this.gameObject) {
            const allObjects = this.getAllGameObjects();
            allObjects.forEach(obj => {
                if (obj !== this.gameObject) {
                    const camera = obj.getModule("Wolf3DCamera");
                    if (camera) {
                        camera.isActive = false;
                    }
                }
            });
        }
        this.isActive = true;
    }

    loop(deltaTime) {
        if (!this.gameObject) return;

        // Use the global input system
        if (window.input) {
            // Handle mouse look
            if (this.mouseLookEnabled && window.input.didMouseMove()) {
                const mousePos = window.input.getMousePosition();
                if (this.prevMouseX !== 0 && this.prevMouseY !== 0) {
                    const deltaX = mousePos.x - this.prevMouseX;
                    const deltaY = mousePos.y - this.prevMouseY;

                    this.angle += deltaX * this.mouseSensitivity * 100;
                    // Optional: vertical look (pitch) - could be added later
                    // this.pitch += deltaY * this.mouseSensitivity * 100;
                }

                this.prevMouseX = mousePos.x;
                this.prevMouseY = mousePos.y;
            }

            // Handle turning (arrow keys as alternative to mouse)
            if (window.input.keyDown(window.key.left)) {
                this.angle -= this.turnSpeed * deltaTime;
            }
            if (window.input.keyDown(window.key.right)) {
                this.angle += this.turnSpeed * deltaTime;
            }

            // Normalize angle
            this.angle = ((this.angle % 360) + 360) % 360;

            // Calculate movement direction
            let moveX = 0;
            let moveY = 0;

            if (window.input.keyDown('w')) {
                moveX += Math.cos(this.angle * Math.PI / 180) * this.moveSpeed * deltaTime;
                moveY += Math.sin(this.angle * Math.PI / 180) * this.moveSpeed * deltaTime;
            }
            if (window.input.keyDown('s')) {
                moveX -= Math.cos(this.angle * Math.PI / 180) * this.moveSpeed * deltaTime;
                moveY -= Math.sin(this.angle * Math.PI / 180) * this.moveSpeed * deltaTime;
            }
            if (window.input.keyDown('a')) {
                moveX += Math.cos((this.angle - 90) * Math.PI / 180) * this.moveSpeed * deltaTime;
                moveY += Math.sin((this.angle - 90) * Math.PI / 180) * this.moveSpeed * deltaTime;
            }
            if (window.input.keyDown('d')) {
                moveX += Math.cos((this.angle + 90) * Math.PI / 180) * this.moveSpeed * deltaTime;
                moveY += Math.sin((this.angle + 90) * Math.PI / 180) * this.moveSpeed * deltaTime;
            }

            // Apply movement with collision detection
            if (this.enableCollisions) {
                this.moveWithCollision(moveX, moveY);
            } else {
                this.position.x += moveX;
                this.position.y += moveY;
            }

            // Update game object position and rotation
            this.gameObject.position.x = this.position.x;
            this.gameObject.position.y = this.position.y;
            this.gameObject.angle = this.angle;
        }
    }

    moveWithCollision(moveX, moveY) {
        // Try X movement first
        const newX = this.position.x + moveX;
        if (this.checkCollision(newX, this.position.y)) {
            this.position.x = newX;
        }

        // Try Y movement
        const newY = this.position.y + moveY;
        if (this.checkCollision(this.position.x, newY)) {
            this.position.y = newY;
        }
    }

    checkCollision(x, y) {
        if (!this.gameObject) return true;

        // Check collision with Wolf3DWall objects
        const allObjects = this.getAllGameObjects();
        for (const obj of allObjects) {
            if (obj === this.gameObject) continue;

            const wall = obj.getModule("Wolf3DWall");
            if (wall && wall.isSolid) {
                const dx = x - obj.position.x;
                const dy = y - obj.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.collisionRadius + wall.collisionRadius) {
                    return false; // Collision detected
                }
            }
        }

        return true; // No collision
    }

    /**
     * Cast a ray from the camera position in a given direction
     * @param {number} angle - Angle in degrees from camera forward direction
     * @param {number} maxDistance - Maximum distance to cast
     * @returns {Object|null} - Hit information or null if no hit
     */
    castRay(angle, maxDistance = this.farPlane) {
        const rayAngle = this.angle + angle;
        const rayDirX = Math.cos(rayAngle * Math.PI / 180);
        const rayDirY = Math.sin(rayAngle * Math.PI / 180);

        let closestHit = null;
        let closestDistance = maxDistance;

        // Check against all Wolf3DWall objects
        const allObjects = this.getAllGameObjects();
        for (const obj of allObjects) {
            if (obj === this.gameObject) continue;

            const wall = obj.getModule("Wolf3DWall");
            if (wall && wall.isSolid) {
                const hit = this.rayWallIntersection(
                    this.position.x, this.position.y,
                    rayDirX, rayDirY,
                    obj.position.x, obj.position.y,
                    wall
                );

                if (hit && hit.distance < closestDistance) {
                    closestHit = hit;
                    closestDistance = hit.distance;
                }
            }
        }

        return closestHit;
    }

    /**
     * Check intersection between ray and wall
     */
    rayWallIntersection(rayX, rayY, rayDirX, rayDirY, wallX, wallY, wall) {
        const dx = wallX - rayX;
        const dy = wallY - rayY;

        // Check if wall is in ray direction (dot product)
        const dot = dx * rayDirX + dy * rayDirY;
        if (dot <= 0) return null; // Wall is behind ray

        // Calculate perpendicular distance to wall
        const perpDist = Math.abs(dx * rayDirY - dy * rayDirX);
        if (perpDist > wall.collisionRadius) return null; // Ray misses wall

        // Calculate intersection point
        const distance = dot;
        const hitX = rayX + rayDirX * distance;
        const hitY = rayY + rayDirY * distance;

        // Check if hit point is within wall bounds
        const wallDx = hitX - wallX;
        const wallDy = hitY - wallY;
        const wallDistance = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

        if (wallDistance <= wall.collisionRadius) {
            return {
                distance: distance,
                hitX: hitX,
                hitY: hitY,
                wallX: wallX,
                wallY: wallY,
                wall: wall,
                side: this.getWallSide(wallDx, wallDy, wall)
            };
        }

        return null;
    }

    getWallSide(dx, dy, wall) {
        // Determine which side of the wall was hit
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const normalizedAngle = ((angle - wall.gameObject.angle) % 360 + 360) % 360;

        if (normalizedAngle < 90) return 'north';
        if (normalizedAngle < 180) return 'east';
        if (normalizedAngle < 270) return 'south';
        return 'west';
    }

    /**
     * Get the camera's view direction vector
     */
    getDirection() {
        return {
            x: Math.cos(this.angle * Math.PI / 180),
            y: Math.sin(this.angle * Math.PI / 180)
        };
    }

    /**
     * Get the camera's right vector (perpendicular to direction)
     */
    getRight() {
        const dir = this.getDirection();
        return {
            x: -dir.y,
            y: dir.x
        };
    }

    /**
     * Convert world coordinates to camera space
     */
    worldToCamera(worldX, worldY) {
        const dx = worldX - this.position.x;
        const dy = worldY - this.position.y;

        // Rotate to camera space
        const cos = Math.cos(-this.angle * Math.PI / 180);
        const sin = Math.sin(-this.angle * Math.PI / 180);

        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    }

    /**
     * Convert camera space coordinates to screen space
     */
    cameraToScreen(cameraX, cameraY, screenWidth, screenHeight) {
        const aspect = screenWidth / screenHeight;
        const fovRad = this.fieldOfView * Math.PI / 180;
        const tanHalfFov = Math.tan(fovRad / 2);

        // Perspective projection
        const screenX = (cameraY / cameraX) / (tanHalfFov * aspect);
        const screenY = -(cameraX * tanHalfFov) / cameraX; // Negative because Y increases downward

        return {
            x: (screenX * 0.5 + 0.5) * screenWidth,
            y: (screenY * 0.5 + 0.5) * screenHeight
        };
    }

    /**
     * Get the rendered texture for 3D camera integration
     * @param {boolean} forceUpdate - Force texture update
     * @returns {HTMLCanvasElement} - The rendered texture canvas
     */
    getRenderedTexture(forceUpdate = false) {
        // Create render texture if it doesn't exist
        if (!this.renderTexture || forceUpdate) {
            this.createRenderTexture();
            this.render();
        }
        return this.renderTexture;
    }

    /**
     * Create the render texture canvas
     */
    createRenderTexture() {
        this.renderTexture = document.createElement('canvas');
        this.renderTexture.width = this.renderTextureWidth;
        this.renderTexture.height = this.renderTextureHeight;
        this.renderTexture.style.imageRendering = 'pixelated';
    }

    /**
     * Render the 3D view using ray casting
     */
    render() {
        if (!this.renderTexture) {
            this.createRenderTexture();
        }

        const ctx = this.renderTexture.getContext('2d');
        const width = this.renderTexture.width;
        const height = this.renderTexture.height;

        // Clear the screen
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Calculate ray casting parameters
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const fovRadians = this.fieldOfView * Math.PI / 180;
        const angleStep = fovRadians / width;

        // Cast rays across the screen
        for (let x = 0; x < width; x++) {
            // Calculate ray angle relative to camera direction
            const rayAngle = this.angle - (this.fieldOfView / 2) + (x / width) * this.fieldOfView;

            // Cast ray and find the closest hit
            const hit = this.castRay(rayAngle - this.angle, this.farPlane);

            if (hit) {
                // Calculate distance and wall height
                const distance = hit.distance * Math.cos((rayAngle - this.angle) * Math.PI / 180);
                const wallHeight = (this.height / distance) * (height / 2);

                // Draw the wall column if the wall module exists
                if (hit.wall && hit.wall.drawWallColumn) {
                    hit.wall.drawWallColumn(ctx, x, distance, wallHeight, hit.side, hit.hitX);
                } else {
                    // Fallback: draw simple colored column
                    this.drawSimpleWallColumn(ctx, x, distance, wallHeight, hit.wall);
                }
            }
        }

        // Draw floor and ceiling
        this.drawFloorAndCeiling(ctx, width, height);
    }

    /**
     * Draw a simple wall column as fallback
     */
    drawSimpleWallColumn(ctx, screenX, distance, wallHeight, wall) {
        if (wallHeight <= 0) return;

        const screenHeight = ctx.canvas.height;
        const halfHeight = screenHeight / 2;

        // Calculate wall top and bottom on screen
        const wallTop = halfHeight - wallHeight / 2;
        const wallBottom = halfHeight + wallHeight / 2;

        // Clamp to screen bounds
        const drawTop = Math.max(0, Math.floor(wallTop));
        const drawBottom = Math.min(screenHeight - 1, Math.ceil(wallBottom));

        if (drawTop >= drawBottom) return;

        // Apply distance-based shading
        const shadeFactor = Math.max(0.1, 1.0 - distance / 1000);
        const grayValue = Math.round(200 * shadeFactor);

        ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        ctx.fillRect(screenX, drawTop, 1, drawBottom - drawTop + 1);
    }

    /**
     * Draw floor and ceiling
     */
    drawFloorAndCeiling(ctx, width, height) {
        const halfHeight = height / 2;

        // Draw ceiling (top half)
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, width, halfHeight);

        // Draw floor (bottom half)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, halfHeight, width, halfHeight);
    }

    draw(ctx) {
        // Camera doesn't draw anything by default
        // Could draw a crosshair or other HUD elements here
    }

    drawGizmos(ctx) {
        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        ctx.rotate(this.gameObject.angle * Math.PI / 180);

        // Draw camera direction indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // Draw collision radius
        if (this.enableCollisions) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, this.collisionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            position: { x: this.position.x, y: this.position.y },
            angle: this.angle,
            height: this.height,
            moveSpeed: this.moveSpeed,
            turnSpeed: this.turnSpeed,
            mouseSensitivity: this.mouseSensitivity,
            collisionRadius: this.collisionRadius,
            enableCollisions: this.enableCollisions,
            fieldOfView: this.fieldOfView,
            isActive: this.isActive,
            renderTextureWidth: this.renderTextureWidth,
            renderTextureHeight: this.renderTextureHeight
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.position) {
            this.position.x = json.position.x;
            this.position.y = json.position.y;
        }
        if (json.angle !== undefined) this.angle = json.angle;
        if (json.height !== undefined) this.height = json.height;
        if (json.moveSpeed !== undefined) this.moveSpeed = json.moveSpeed;
        if (json.turnSpeed !== undefined) this.turnSpeed = json.turnSpeed;
        if (json.mouseSensitivity !== undefined) this.mouseSensitivity = json.mouseSensitivity;
        if (json.collisionRadius !== undefined) this.collisionRadius = json.collisionRadius;
        if (json.enableCollisions !== undefined) this.enableCollisions = json.enableCollisions;
        if (json.fieldOfView !== undefined) this.fieldOfView = json.fieldOfView;
        if (json.isActive !== undefined) this.isActive = json.isActive;
        if (json.renderTextureWidth !== undefined) this.renderTextureWidth = json.renderTextureWidth;
        if (json.renderTextureHeight !== undefined) this.renderTextureHeight = json.renderTextureHeight;
    }
}

window.Wolf3DCamera = Wolf3DCamera;