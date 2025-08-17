class SnakePlayer extends Module {
    static namespace = "Snake";
    static description = "Slither.io style snake player controller";
    static allowMultiple = false;
    static iconClass = "fas fa-dragon";

    constructor() {
        super("SnakePlayer");

        // Movement
        this.moveSpeed = 180;
        this.turnSpeed = 160;
        this.leftKey = "arrowleft";
        this.rightKey = "arrowright";

        // Snake body
        this.startLength = 20;
        this.segmentSpacing = 8;
        this.headRadius = 18;
        this.tailRadius = 7;
        this.taperAmount = 0.6; // 0 = no taper, 1 = max taper
        this.minRadius = 5;

        // Coloration
        this.bodyColor = "#44ff88";
        this.shadeColor = "#226644";
        this.gradientStrength = 0.7;

        // Apple reference (GameObject name or id)
        this.appleObject = "";

        // Internal state
        this.segments = [];
        this.direction = 0; // degrees
        this.length = this.startLength;
        this.growQueued = 0;
        this.distanceAccumulator = 0;
        
        // Track actual head position separately from game object
        this.headX = 0;
        this.headY = 0;

        // Expose properties
        this.exposeProperty("moveSpeed", "number", 180, {
            description: "Snake forward speed (pixels/sec)",
            min: 50, max: 600, step: 10,
            onChange: v => this.moveSpeed = v
        });
        this.exposeProperty("turnSpeed", "number", 160, {
            description: "Turning speed (deg/sec)",
            min: 30, max: 360, step: 5,
            onChange: v => this.turnSpeed = v
        });
        this.exposeProperty("leftKey", "string", "ArrowLeft", {
            description: "Key for turning left",
            onChange: v => this.leftKey = v
        });
        this.exposeProperty("rightKey", "string", "ArrowRight", {
            description: "Key for turning right",
            onChange: v => this.rightKey = v
        });
        this.exposeProperty("startLength", "number", 20, {
            description: "Starting snake length (segments)",
            min: 5, max: 100, step: 1,
            onChange: v => { this.startLength = v; this.length = v; }
        });
        this.exposeProperty("segmentSpacing", "number", 8, {
            description: "Spacing between segments",
            min: 4, max: 20, step: 1,
            onChange: v => this.segmentSpacing = v
        });
        this.exposeProperty("headRadius", "number", 18, {
            description: "Head radius",
            min: 10, max: 40, step: 1,
            onChange: v => this.headRadius = v
        });
        this.exposeProperty("tailRadius", "number", 7, {
            description: "Tail radius",
            min: 3, max: 20, step: 1,
            onChange: v => this.tailRadius = v
        });
        this.exposeProperty("taperAmount", "number", 0.6, {
            description: "Tapering amount (0-1)",
            min: 0, max: 1, step: 0.05,
            onChange: v => this.taperAmount = v
        });
        this.exposeProperty("minRadius", "number", 5, {
            description: "Minimum segment radius",
            min: 2, max: 15, step: 1,
            onChange: v => this.minRadius = v
        });
        this.exposeProperty("bodyColor", "color", "#44ff88", {
            description: "Main body color",
            onChange: v => this.bodyColor = v
        });
        this.exposeProperty("shadeColor", "color", "#226644", {
            description: "Shading color",
            onChange: v => this.shadeColor = v
        });
        this.exposeProperty("gradientStrength", "number", 0.7, {
            description: "Radial gradient strength (0-1)",
            min: 0, max: 1, step: 0.05,
            onChange: v => this.gradientStrength = v
        });
        this.exposeProperty("appleObject", "string", "", {
            description: "Apple GameObject name/id",
            onChange: v => this.appleObject = v
        });
    }

    style(style) {
        style.startGroup("Movement", false, {
            backgroundColor: 'rgba(100,255,150,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("moveSpeed");
        style.exposeProperty("turnSpeed");
        style.exposeProperty("leftKey");
        style.exposeProperty("rightKey");
        style.endGroup();

        style.startGroup("Snake Body", false, {
            backgroundColor: 'rgba(100,150,255,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("startLength");
        style.exposeProperty("segmentSpacing");
        style.exposeProperty("headRadius");
        style.exposeProperty("tailRadius");
        style.exposeProperty("taperAmount");
        style.exposeProperty("minRadius");
        style.endGroup();

        style.startGroup("Coloration", false, {
            backgroundColor: 'rgba(255,200,100,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("bodyColor", "color", "#44ff88");
        style.exposeProperty("shadeColor", "color", "#226644");
        style.exposeProperty("gradientStrength", "number", 0.7, {
            description: "Radial gradient strength (0-1)",
            min: 0, max: 1, step: 0.05
        });
        style.endGroup();

        style.addDivider();
        style.exposeProperty("appleObject");
        style.addHelpText("Snake moves forward, left/right keys steer. Eats apple to grow.");
    }

    start() {
        // Initialize direction from game object's initial angle
        this.direction = this.gameObject.angle || 0;
        this.length = this.startLength;
        this.segments = [];
        this.distanceAccumulator = 0;
        this.growQueued = 0;
        
        // Initialize head position to match game object
        this.headX = this.gameObject.position.x;
        this.headY = this.gameObject.position.y;
        
        // Initialize segments behind the head position
        const dirRad = this.direction * Math.PI / 180;
        
        for (let i = 0; i < this.length; i++) {
            this.segments.push({
                x: this.headX - Math.cos(dirRad) * i * this.segmentSpacing,
                y: this.headY - Math.sin(dirRad) * i * this.segmentSpacing
            });
        }
    }

    loop(deltaTime) {
        // Handle input for turning
        if (window.input.keyDown(this.leftKey)) {
            this.direction -= this.turnSpeed * deltaTime;
        }
        if (window.input.keyDown(this.rightKey)) {
            this.direction += this.turnSpeed * deltaTime;
        }
        
        // Normalize direction angle
        this.direction = ((this.direction % 360) + 360) % 360;
        
        // Update game object angle to match direction
        //this.gameObject.angle = this.direction;

        // Move the head position forward based on direction
        const moveDist = this.moveSpeed * deltaTime;
        const dirRad = this.direction * Math.PI / 180;
        
        this.headX += Math.cos(dirRad) * moveDist;
        this.headY += Math.sin(dirRad) * moveDist;
        
        // Keep game object position synced with head
        //this.gameObject.position.x = this.headX;
        //this.gameObject.position.y = this.headY;

        this.distanceAccumulator += moveDist;

        // Update segments when we've moved enough distance
        if (this.distanceAccumulator >= this.segmentSpacing) {
            // Add new head segment at current head position
            this.segments.unshift({
                x: this.headX,
                y: this.headY
            });
            
            // Remove segments that exceed our current length
            while (this.segments.length > this.length) {
                this.segments.pop();
            }
            
            this.distanceAccumulator -= this.segmentSpacing;
        } else {
            // Always keep the first segment at the current head position
            if (this.segments.length > 0) {
                this.segments[0].x = this.headX;
                this.segments[0].y = this.headY;
            }
        }

        // Check apple collision
        if (this.appleObject && this.segments.length > 0) {
            const head = this.segments[0];
            const appleObj = window.engine.gameObjects.find(obj =>
                obj.name === this.appleObject || obj.id === this.appleObject
            );
            if (appleObj) {
                const dx = head.x - appleObj.position.x;
                const dy = head.y - appleObj.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.headRadius + 10) { // 10 = assumed apple radius
                    this.growQueued += 8;
                    // Move apple to random position
                    appleObj.position.x = Math.random() * window.engine.viewport.width + window.engine.viewport.x;
                    appleObj.position.y = Math.random() * window.engine.viewport.height + window.engine.viewport.y;
                }
            }
        }

        // Process growth queue
        if (this.growQueued > 0) {
            this.length++;
            this.growQueued--;
        }
    }

    draw(ctx) {
        if (this.segments.length < 1) return;

        // Draw snake body segments from tail to head
        for (let i = this.segments.length - 1; i >= 0; i--) {
            // Calculate tapering radius
            const t = i / Math.max(1, this.segments.length - 1);
            let radius = this.headRadius * (1 - t * this.taperAmount) + this.tailRadius * (t * this.taperAmount);
            radius = Math.max(radius, this.minRadius);

            // Create radial gradient for 3D effect
            const segment = this.segments[i];
            const grad = ctx.createRadialGradient(
                segment.x, segment.y, radius * (1 - this.gradientStrength),
                segment.x, segment.y, radius
            );
            grad.addColorStop(0, this.bodyColor);
            grad.addColorStop(1, this.shadeColor);

            ctx.save();
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.shadowColor = this.shadeColor;
            ctx.shadowBlur = radius * 0.3;
            ctx.fill();
            ctx.restore();
        }

        // Draw eyes on the head (first segment)
        if (this.segments.length > 0) {
            const head = this.segments[0];
            const eyeOffset = this.headRadius * 0.5;
            const eyeRadius = this.headRadius * 0.18;
            const dirRad = this.direction * Math.PI / 180;
            
            // Draw both eyes
            for (let side of [-1, 1]) {
                ctx.save();
                ctx.beginPath();
                const eyeX = head.x + Math.cos(dirRad + side * 0.4) * eyeOffset;
                const eyeY = head.y + Math.sin(dirRad + side * 0.4) * eyeOffset;
                ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
                ctx.fillStyle = "#222";
                ctx.shadowColor = "#000";
                ctx.shadowBlur = 2;
                ctx.fill();
                ctx.restore();
            }
        }
    }

    drawGizmos(ctx) {
        if (this.segments.length < 1) return;
        
        const head = this.segments[0];
        ctx.save();
        ctx.globalAlpha = 0.5;
        
        // Draw head radius
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw direction arrow
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        const dirRad = this.direction * Math.PI / 180;
        ctx.lineTo(
            head.x + Math.cos(dirRad) * this.headRadius * 2,
            head.y + Math.sin(dirRad) * this.headRadius * 2
        );
        ctx.stroke();
        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            moveSpeed: this.moveSpeed,
            turnSpeed: this.turnSpeed,
            leftKey: this.leftKey,
            rightKey: this.rightKey,
            startLength: this.startLength,
            segmentSpacing: this.segmentSpacing,
            headRadius: this.headRadius,
            tailRadius: this.tailRadius,
            taperAmount: this.taperAmount,
            minRadius: this.minRadius,
            bodyColor: this.bodyColor,
            shadeColor: this.shadeColor,
            gradientStrength: this.gradientStrength,
            appleObject: this.appleObject,
            length: this.length,
            headX: this.headX,
            headY: this.headY
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.moveSpeed = data.moveSpeed ?? 180;
        this.turnSpeed = data.turnSpeed ?? 160;
        this.leftKey = data.leftKey ?? "ArrowLeft";
        this.rightKey = data.rightKey ?? "ArrowRight";
        this.startLength = data.startLength ?? 20;
        this.segmentSpacing = data.segmentSpacing ?? 8;
        this.headRadius = data.headRadius ?? 18;
        this.tailRadius = data.tailRadius ?? 7;
        this.taperAmount = data.taperAmount ?? 0.6;
        this.minRadius = data.minRadius ?? 5;
        this.bodyColor = data.bodyColor ?? "#44ff88";
        this.shadeColor = data.shadeColor ?? "#226644";
        this.gradientStrength = data.gradientStrength ?? 0.7;
        this.appleObject = data.appleObject ?? "";
        this.length = data.length ?? this.startLength;
        this.headX = data.headX ?? this.gameObject?.position?.x ?? 0;
        this.headY = data.headY ?? this.gameObject?.position?.y ?? 0;
        this.segments = [];
    }
}

window.SnakePlayer = SnakePlayer;