/**
 * Metroidvania Camera Module
 * Camera system with room-based viewport management and smooth transitions
 */
class MetroidvaniaCamera extends Module {
    static namespace = "Metroidvania";
    static description = "Camera system with room-based viewport management and smooth transitions";
    static allowMultiple = false;
    static iconClass = "fas fa-video";
    static color = "#FF9800";

    constructor() {
        super("MetroidvaniaCamera");

        // Camera properties
        this.followTarget = null;
        this.followSpeed = 5;
        this.deadZoneWidth = 100;
        this.deadZoneHeight = 50;

        // Room-based camera properties
        this.roomBasedCamera = true;
        this.currentRoomBounds = null;
        this.cameraSmoothing = 0.1;
        this.snapToRoomEnabled = true;

        // Viewport properties
        this.viewportWidth = 800;
        this.viewportHeight = 600;
        this.minViewportX = -Infinity;
        this.maxViewportX = Infinity;
        this.minViewportY = -Infinity;
        this.maxViewportY = Infinity;

        // Shake properties
        this.shakeIntensity = 0;
        this.shakeDecay = 0.95;
        this.shakeX = 0;
        this.shakeY = 0;

        // Transition properties
        this.isTransitioning = false;
        this.transitionStart = { x: 0, y: 0 };
        this.transitionEnd = { x: 0, y: 0 };
        this.transitionProgress = 0;
        this.transitionDuration = 1.0;

        // Visual properties
        this.backgroundColor = "#000000";
        this.showDebugInfo = true;
        this.showDeadZone = true;
        this.showRoomBounds = true;

        // Internal state
        this.targetPosition = new Vector2(0, 0);
        this.currentPosition = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);

        this.setupProperties();
    }

    setupProperties() {
        this.exposeProperty("followTarget", "string", this.followTarget, {
            description: "Name of GameObject to follow",
            onChange: (value) => {
                this.followTarget = value;
                this.findTarget();
            }
        });

        this.exposeProperty("followSpeed", "number", this.followSpeed, {
            description: "Camera follow speed",
            min: 0.1, max: 20,
            onChange: (value) => { this.followSpeed = value; }
        });

        this.exposeProperty("deadZoneWidth", "number", this.deadZoneWidth, {
            description: "Dead zone width in pixels",
            min: 10, max: 400,
            onChange: (value) => { this.deadZoneWidth = value; }
        });

        this.exposeProperty("deadZoneHeight", "number", this.deadZoneHeight, {
            description: "Dead zone height in pixels",
            min: 10, max: 300,
            onChange: (value) => { this.deadZoneHeight = value; }
        });

        this.exposeProperty("roomBasedCamera", "boolean", this.roomBasedCamera, {
            description: "Enable room-based camera behavior",
            onChange: (value) => { this.roomBasedCamera = value; }
        });

        this.exposeProperty("cameraSmoothing", "number", this.cameraSmoothing, {
            description: "Camera movement smoothing (0 = instant, 1 = very smooth)",
            min: 0, max: 1, step: 0.05,
            onChange: (value) => { this.cameraSmoothing = value; }
        });

        this.exposeProperty("viewportWidth", "number", this.viewportWidth, {
            description: "Viewport width in pixels",
            min: 100, max: 2000,
            onChange: (value) => { this.viewportWidth = value; }
        });

        this.exposeProperty("viewportHeight", "number", this.viewportHeight, {
            description: "Viewport height in pixels",
            min: 100, max: 2000,
            onChange: (value) => { this.viewportHeight = value; }
        });

        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Background color outside camera bounds",
            onChange: (value) => { this.backgroundColor = value; }
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show debug information",
            onChange: (value) => { this.showDebugInfo = value; }
        });

        this.exposeProperty("showDeadZone", "boolean", this.showDeadZone, {
            description: "Show camera dead zone",
            onChange: (value) => { this.showDeadZone = value; }
        });

        this.exposeProperty("showRoomBounds", "boolean", this.showRoomBounds, {
            description: "Show room boundaries",
            onChange: (value) => { this.showRoomBounds = value; }
        });
    }

    start() {
        this.findTarget();
        this.updateViewport();
    }

    loop(deltaTime) {
        this.findTarget();
        this.updateTargetPosition(deltaTime);
        this.updateCameraPosition(deltaTime);
        this.updateShake(deltaTime);
        this.updateRoomTransition(deltaTime);
    }

    findTarget() {
        if (!this.followTarget) return;

        const scene = window.engine?.scene;
        if (!scene) return;

        const targetObject = scene.findGameObjectByName(this.followTarget) ||
                           window.engine?.findGameObjectByName(this.followTarget);

        if (targetObject && targetObject !== this.gameObject) {
            this.targetObject = targetObject;
        }
    }

    updateTargetPosition(deltaTime) {
        if (!this.targetObject) {
            this.targetPosition.x = this.currentPosition.x;
            this.targetPosition.y = this.currentPosition.y;
            return;
        }

        const targetPos = this.targetObject.position;

        if (this.roomBasedCamera) {
            this.updateRoomBasedTarget(targetPos);
        } else {
            this.updateFreeCameraTarget(targetPos);
        }
    }

    updateRoomBasedTarget(targetPos) {
        // Find current room
        const tilemapModule = this.getTilemapModule();
        if (!tilemapModule) {
            this.targetPosition.x = targetPos.x;
            this.targetPosition.y = targetPos.y;
            return;
        }

        const currentRoom = tilemapModule.getRoomAt(targetPos.x, targetPos.y);
        if (!currentRoom) {
            this.targetPosition.x = targetPos.x;
            this.targetPosition.y = targetPos.y;
            return;
        }

        // Calculate room center
        const roomCenterX = (currentRoom.x * 20 + currentRoom.width / 2) * tilemapModule.tileSize;
        const roomCenterY = (currentRoom.y * 15 + currentRoom.height / 2) * tilemapModule.tileSize;

        // Apply dead zone logic
        const deadZoneLeft = roomCenterX - this.deadZoneWidth / 2;
        const deadZoneRight = roomCenterX + this.deadZoneWidth / 2;
        const deadZoneTop = roomCenterY - this.deadZoneHeight / 2;
        const deadZoneBottom = roomCenterY + this.deadZoneHeight / 2;

        let targetX = roomCenterX;
        let targetY = roomCenterY;

        if (targetPos.x < deadZoneLeft) {
            targetX = targetPos.x + this.deadZoneWidth / 2;
        } else if (targetPos.x > deadZoneRight) {
            targetX = targetPos.x - this.deadZoneWidth / 2;
        }

        if (targetPos.y < deadZoneTop) {
            targetY = targetPos.y + this.deadZoneHeight / 2;
        } else if (targetPos.y > deadZoneBottom) {
            targetY = targetPos.y - this.deadZoneHeight / 2;
        }

        // Clamp to room bounds
        const roomLeft = (currentRoom.x * 20) * tilemapModule.tileSize;
        const roomRight = (currentRoom.x * 20 + currentRoom.width) * tilemapModule.tileSize;
        const roomTop = (currentRoom.y * 15) * tilemapModule.tileSize;
        const roomBottom = (currentRoom.y * 15 + currentRoom.height) * tilemapModule.tileSize;

        targetX = Math.max(roomLeft + this.viewportWidth / 2,
                          Math.min(roomRight - this.viewportWidth / 2, targetX));
        targetY = Math.max(roomTop + this.viewportHeight / 2,
                          Math.min(roomBottom - this.viewportHeight / 2, targetY));

        this.targetPosition.x = targetX;
        this.targetPosition.y = targetY;
        this.currentRoomBounds = {
            left: roomLeft,
            right: roomRight,
            top: roomTop,
            bottom: roomBottom
        };
    }

    updateFreeCameraTarget(targetPos) {
        // Apply dead zone logic for free camera
        const deadZoneLeft = this.targetPosition.x - this.deadZoneWidth / 2;
        const deadZoneRight = this.targetPosition.x + this.deadZoneWidth / 2;
        const deadZoneTop = this.targetPosition.y - this.deadZoneHeight / 2;
        const deadZoneBottom = this.targetPosition.y + this.deadZoneHeight / 2;

        let targetX = this.targetPosition.x;
        let targetY = this.targetPosition.y;

        if (targetPos.x < deadZoneLeft) {
            targetX = targetPos.x + this.deadZoneWidth / 2;
        } else if (targetPos.x > deadZoneRight) {
            targetX = targetPos.x - this.deadZoneWidth / 2;
        }

        if (targetPos.y < deadZoneTop) {
            targetY = targetPos.y + this.deadZoneHeight / 2;
        } else if (targetPos.y > deadZoneBottom) {
            targetY = targetPos.y - this.deadZoneHeight / 2;
        }

        // Apply viewport bounds
        targetX = Math.max(this.minViewportX + this.viewportWidth / 2,
                          Math.min(this.maxViewportX - this.viewportWidth / 2, targetX));
        targetY = Math.max(this.minViewportY + this.viewportHeight / 2,
                          Math.min(this.maxViewportY - this.viewportHeight / 2, targetY));

        this.targetPosition.x = targetX;
        this.targetPosition.y = targetY;
    }

    updateCameraPosition(deltaTime) {
        if (this.isTransitioning) return;

        // Smooth camera movement
        const deltaX = this.targetPosition.x - this.currentPosition.x;
        const deltaY = this.targetPosition.y - this.currentPosition.y;

        this.currentPosition.x += deltaX * (1 - Math.pow(1 - this.cameraSmoothing, deltaTime * 60));
        this.currentPosition.y += deltaY * (1 - Math.pow(1 - this.cameraSmoothing, deltaTime * 60));

        // Apply shake
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity;

        this.gameObject.position.x = this.currentPosition.x + shakeX;
        this.gameObject.position.y = this.currentPosition.y + shakeY;

        // Update engine viewport
        this.updateEngineViewport();
    }

    updateEngineViewport() {
        if (!window.engine || !window.engine.viewport) return;

        const viewport = window.engine.viewport;
        viewport.x = this.currentPosition.x - this.viewportWidth / 2;
        viewport.y = this.currentPosition.y - this.viewportHeight / 2;
        viewport.width = this.viewportWidth;
        viewport.height = this.viewportHeight;
    }

    updateShake(deltaTime) {
        if (this.shakeIntensity > 0) {
            this.shakeIntensity *= this.shakeDecay;
            if (this.shakeIntensity < 0.1) {
                this.shakeIntensity = 0;
            }
        }
    }

    updateRoomTransition(deltaTime) {
        if (!this.isTransitioning) return;

        this.transitionProgress += deltaTime / this.transitionDuration;

        if (this.transitionProgress >= 1) {
            this.finishRoomTransition();
        } else {
            // Interpolate camera position
            const t = this.transitionProgress;
            const easeT = this.easeInOutCubic(t);

            this.currentPosition.x = this.lerp(this.transitionStart.x, this.transitionEnd.x, easeT);
            this.currentPosition.y = this.lerp(this.transitionStart.y, this.transitionEnd.y, easeT);

            this.updateEngineViewport();
        }
    }

    startRoomTransition(targetRoom) {
        if (!this.roomBasedCamera) return;

        const tilemapModule = this.getTilemapModule();
        if (!tilemapModule) return;

        const roomCenterX = (targetRoom.x * 20 + targetRoom.width / 2) * tilemapModule.tileSize;
        const roomCenterY = (targetRoom.y * 15 + targetRoom.height / 2) * tilemapModule.tileSize;

        this.transitionStart.x = this.currentPosition.x;
        this.transitionStart.y = this.currentPosition.y;
        this.transitionEnd.x = roomCenterX;
        this.transitionEnd.y = roomCenterY;
        this.transitionProgress = 0;
        this.isTransitioning = true;
    }

    finishRoomTransition() {
        this.isTransitioning = false;
        this.currentPosition.x = this.transitionEnd.x;
        this.currentPosition.y = this.transitionEnd.y;
        this.updateEngineViewport();
    }

    snapToRoom(room) {
        if (!room) return;

        const tilemapModule = this.getTilemapModule();
        if (!tilemapModule) return;

        const roomCenterX = (room.x * 20 + room.width / 2) * tilemapModule.tileSize;
        const roomCenterY = (room.y * 15 + room.height / 2) * tilemapModule.tileSize;

        this.currentPosition.x = roomCenterX;
        this.currentPosition.y = roomCenterY;
        this.targetPosition.x = roomCenterX;
        this.targetPosition.y = roomCenterY;
        this.updateEngineViewport();
    }

    getTilemapModule() {
        const scene = window.engine?.scene;
        if (!scene) return null;

        for (const gameObject of scene.gameObjects) {
            const tilemapModule = gameObject.getModuleByType("MetroidvaniaTilemap");
            if (tilemapModule) {
                return tilemapModule;
            }
        }

        return null;
    }

    // Camera control methods
    setFollowTarget(targetName) {
        this.followTarget = targetName;
        this.findTarget();
    }

    setViewportBounds(minX, minY, maxX, maxY) {
        this.minViewportX = minX;
        this.minViewportY = minY;
        this.maxViewportX = maxX;
        this.maxViewportY = maxY;
    }

    setViewportSize(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.updateEngineViewport();
    }

    shakeCamera(intensity, duration = 0.5) {
        this.shakeIntensity = intensity;
        this.shakeDecay = Math.pow(0.1 / intensity, 1 / (duration * 60));
    }

    // Utility methods
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    worldToScreen(worldX, worldY) {
        const screenX = worldX - this.currentPosition.x + this.viewportWidth / 2;
        const screenY = worldY - this.currentPosition.y + this.viewportHeight / 2;
        return { x: screenX, y: screenY };
    }

    screenToWorld(screenX, screenY) {
        const worldX = screenX + this.currentPosition.x - this.viewportWidth / 2;
        const worldY = screenY + this.currentPosition.y - this.viewportHeight / 2;
        return { x: worldX, y: worldY };
    }

    draw(ctx) {
        // Camera doesn't draw anything directly, but we can draw debug info
        if (this.showDebugInfo) {
            this.drawDebugInfo(ctx);
        }
    }

    drawDebugInfo(ctx) {
        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        guiCtx.save();
        guiCtx.fillStyle = "#FFFFFF";
        guiCtx.font = "12px Arial";
        guiCtx.textAlign = "left";

        let y = 200;
        const lineHeight = 15;

        guiCtx.fillText(`=== Metroidvania Camera Debug ===`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Position: ${this.currentPosition.x.toFixed(1)}, ${this.currentPosition.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Target: ${this.targetPosition.x.toFixed(1)}, ${this.targetPosition.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Viewport: ${this.viewportWidth}x${this.viewportHeight}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Room Based: ${this.roomBasedCamera}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Transitioning: ${this.isTransitioning}`, 10, y);

        if (this.targetObject) {
            y += lineHeight;
            guiCtx.fillText(`Following: ${this.followTarget}`, 10, y);
        }

        guiCtx.restore();
    }

    drawGizmos(ctx) {
        if (!this.showDeadZone && !this.showRoomBounds) return;

        ctx.save();

        // Draw dead zone
        if (this.showDeadZone && this.targetPosition) {
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            const deadZoneLeft = this.targetPosition.x - this.deadZoneWidth / 2;
            const deadZoneRight = this.targetPosition.x + this.deadZoneWidth / 2;
            const deadZoneTop = this.targetPosition.y - this.deadZoneHeight / 2;
            const deadZoneBottom = this.targetPosition.y + this.deadZoneHeight / 2;

            ctx.strokeRect(
                deadZoneLeft - this.viewportWidth / 2,
                deadZoneTop - this.viewportHeight / 2,
                this.deadZoneWidth,
                this.deadZoneHeight
            );

            ctx.setLineDash([]);
        }

        // Draw room bounds
        if (this.showRoomBounds && this.currentRoomBounds) {
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 3;

            ctx.strokeRect(
                this.currentRoomBounds.left - this.viewportWidth / 2,
                this.currentRoomBounds.top - this.viewportHeight / 2,
                this.currentRoomBounds.right - this.currentRoomBounds.left,
                this.currentRoomBounds.bottom - this.currentRoomBounds.top
            );
        }

        ctx.restore();
    }

    toJSON() {
        const json = super.toJSON();
        json.followTarget = this.followTarget;
        json.followSpeed = this.followSpeed;
        json.deadZoneWidth = this.deadZoneWidth;
        json.deadZoneHeight = this.deadZoneHeight;
        json.roomBasedCamera = this.roomBasedCamera;
        json.cameraSmoothing = this.cameraSmoothing;
        json.viewportWidth = this.viewportWidth;
        json.viewportHeight = this.viewportHeight;
        json.minViewportX = this.minViewportX;
        json.maxViewportX = this.maxViewportX;
        json.minViewportY = this.minViewportY;
        json.maxViewportY = this.maxViewportY;
        json.backgroundColor = this.backgroundColor;
        json.showDebugInfo = this.showDebugInfo;
        json.showDeadZone = this.showDeadZone;
        json.showRoomBounds = this.showRoomBounds;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.followTarget !== undefined) this.followTarget = json.followTarget;
        if (json.followSpeed !== undefined) this.followSpeed = json.followSpeed;
        if (json.deadZoneWidth !== undefined) this.deadZoneWidth = json.deadZoneWidth;
        if (json.deadZoneHeight !== undefined) this.deadZoneHeight = json.deadZoneHeight;
        if (json.roomBasedCamera !== undefined) this.roomBasedCamera = json.roomBasedCamera;
        if (json.cameraSmoothing !== undefined) this.cameraSmoothing = json.cameraSmoothing;
        if (json.viewportWidth !== undefined) this.viewportWidth = json.viewportWidth;
        if (json.viewportHeight !== undefined) this.viewportHeight = json.viewportHeight;
        if (json.minViewportX !== undefined) this.minViewportX = json.minViewportX;
        if (json.maxViewportX !== undefined) this.maxViewportX = json.maxViewportX;
        if (json.minViewportY !== undefined) this.minViewportY = json.minViewportY;
        if (json.maxViewportY !== undefined) this.maxViewportY = json.maxViewportY;
        if (json.backgroundColor !== undefined) this.backgroundColor = json.backgroundColor;
        if (json.showDebugInfo !== undefined) this.showDebugInfo = json.showDebugInfo;
        if (json.showDeadZone !== undefined) this.showDeadZone = json.showDeadZone;
        if (json.showRoomBounds !== undefined) this.showRoomBounds = json.showRoomBounds;
    }
}

window.MetroidvaniaCamera = MetroidvaniaCamera;