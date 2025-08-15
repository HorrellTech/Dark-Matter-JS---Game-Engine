class ProceduralSpaceship extends Module {
    static namespace = "Drawing";
    static description = "Generates pixel-perfect procedural spaceships facing right";
    static allowMultiple = false;

    constructor() {
        super("ProceduralSpaceship");

        // Master seed for overall ship generation
        this.masterSeed = 12345;
        
        // Ship dimensions (in pixels)
        this.shipWidth = 32;   // Main axis (right-facing)
        this.shipHeight = 16;  // Cross axis
        
        // Scale and rendering
        this.pixelScale = 2;   // How big each "pixel" should be
        this.enableOutline = true;
        this.outlineColor = "#000000";
        
        // Colors
        this.hullColor = "#4a90e2";
        this.accentColor = "#357abd";
        this.thrusterColor = "#ff6b35";
        this.windowColor = "#87ceeb";
        this.weaponColor = "#ff4444";
        this.detailColor = "#2e6ba8";
        
        // Generation parameters
        this.complexity = 0.7;
        this.symmetry = true;
        this.hullStyle = 0; // 0: classic, 1: angular, 2: organic
        
        // Part toggles
        this.enableWeapons = true;
        this.enableThrusters = true;
        this.enableWindows = true;
        this.enableDetails = true;
        this.enableWings = true;

        // Generated ship data (pixel grid)
        this.shipGrid = null;
        this.needsRegeneration = true;

        this.setupProperties();
    }

    setupProperties() {
        this.exposeProperty("masterSeed", "number", 12345, {
            description: "Master seed for ship generation",
            onChange: (val) => {
                this.masterSeed = Math.floor(val);
                this.forceRegeneration();
            }
        });

        this.exposeProperty("shipWidth", "number", 32, {
            description: "Ship width in pixels (facing direction)",
            onChange: (val) => {
                this.shipWidth = Math.max(8, Math.floor(val));
                this.forceRegeneration();
            }
        });

        this.exposeProperty("shipHeight", "number", 16, {
            description: "Ship height in pixels",
            onChange: (val) => {
                this.shipHeight = Math.max(4, Math.floor(val));
                this.forceRegeneration();
            }
        });

        this.exposeProperty("pixelScale", "number", 2, {
            description: "Size of each pixel when rendered",
            onChange: (val) => {
                this.pixelScale = Math.max(1, val);
            }
        });

        this.exposeProperty("enableOutline", "boolean", true, {
            description: "Draw outline around ship",
            onChange: (val) => {
                this.enableOutline = val;
            }
        });

        this.exposeProperty("outlineColor", "color", "#000000", {
            description: "Outline color",
            onChange: (val) => {
                this.outlineColor = val;
            }
        });

        this.exposeProperty("hullColor", "color", "#4a90e2", {
            description: "Main hull color",
            onChange: (val) => {
                this.hullColor = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("accentColor", "color", "#357abd", {
            description: "Accent/detail color",
            onChange: (val) => {
                this.accentColor = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("thrusterColor", "color", "#ff6b35", {
            description: "Thruster color",
            onChange: (val) => {
                this.thrusterColor = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("windowColor", "color", "#87ceeb", {
            description: "Window/cockpit color",
            onChange: (val) => {
                this.windowColor = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("weaponColor", "color", "#ff4444", {
            description: "Weapon color",
            onChange: (val) => {
                this.weaponColor = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("detailColor", "color", "#2e6ba8", {
            description: "Detail accent color",
            onChange: (val) => {
                this.detailColor = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("complexity", "number", 0.7, {
            description: "Ship complexity (0-1)",
            onChange: (val) => {
                this.complexity = Math.max(0, Math.min(1, val));
                this.forceRegeneration();
            }
        });

        this.exposeProperty("symmetry", "boolean", true, {
            description: "Generate symmetric ship",
            onChange: (val) => {
                this.symmetry = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("hullStyle", "enum", 0, {
            description: "Hull style",
            options: ["Classic", "Angular", "Organic"],
            onChange: (val) => {
                this.hullStyle = parseInt(val);
                this.forceRegeneration();
            }
        });

        this.exposeProperty("enableWeapons", "boolean", true, {
            description: "Generate weapons",
            onChange: (val) => {
                this.enableWeapons = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("enableThrusters", "boolean", true, {
            description: "Generate thrusters",
            onChange: (val) => {
                this.enableThrusters = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("enableWindows", "boolean", true, {
            description: "Generate windows",
            onChange: (val) => {
                this.enableWindows = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("enableWings", "boolean", true, {
            description: "Generate wings",
            onChange: (val) => {
                this.enableWings = val;
                this.forceRegeneration();
            }
        });

        this.exposeProperty("enableDetails", "boolean", true, {
            description: "Generate details",
            onChange: (val) => {
                this.enableDetails = val;
                this.forceRegeneration();
            }
        });
    }

    start() {
        this.generateShip();
    }

    forceRegeneration() {
        this.needsRegeneration = true;
        this.generateShip(); // Immediate generation for editor
    }

    createSeededRandom(seed) {
        let s = seed;
        return function() {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }

    generateShip() {
        if (!this.needsRegeneration && this.shipGrid) return;

        const rng = this.createSeededRandom(this.masterSeed);
        
        // Initialize grid with null (empty)
        this.shipGrid = Array(this.shipHeight).fill(null).map(() => Array(this.shipWidth).fill(null));
        
        // Generate ship components in order
        this.generateHull(rng);
        
        if (this.enableWings) this.generateWings(rng);
        if (this.enableThrusters) this.generateThrusters(rng);
        if (this.enableWeapons) this.generateWeapons(rng);
        if (this.enableWindows) this.generateWindows(rng);
        if (this.enableDetails) this.generateDetails(rng);

        this.needsRegeneration = false;
    }

    generateHull(rng) {
        const centerY = Math.floor(this.shipHeight / 2);
        
        // Generate hull profile based on style
        for (let x = 0; x < this.shipWidth; x++) {
            const t = x / (this.shipWidth - 1);
            let hullWidth = this.calculateHullWidth(t, rng);
            
            hullWidth = Math.min(hullWidth, this.shipHeight - 2); // Leave room for details
            hullWidth = Math.max(hullWidth, 1);
            
            // Draw hull with smooth curves
            this.drawHullSection(x, centerY, hullWidth, rng);
        }
        
        // Add hull details
        this.addHullAccents(rng, centerY);
        this.addHullPanels(rng, centerY);
    }

    calculateHullWidth(t, rng) {
        let baseWidth;
        
        switch (this.hullStyle) {
            case 0: // Classic
                if (t < 0.15) {
                    baseWidth = 2 + t * 6;
                } else if (t < 0.85) {
                    const midVariation = Math.sin(t * Math.PI * 2) * 0.1;
                    baseWidth = this.shipHeight * (0.7 + midVariation * rng());
                } else {
                    const taper = Math.pow(1 - ((t - 0.85) / 0.15), 1.5);
                    baseWidth = this.shipHeight * 0.7 * taper;
                }
                break;
                
            case 1: // Angular
                if (t < 0.2) {
                    baseWidth = 2 + t * 4;
                } else if (t < 0.7) {
                    baseWidth = this.shipHeight * 0.8;
                } else if (t < 0.9) {
                    baseWidth = this.shipHeight * (0.8 - (t - 0.7) * 2);
                } else {
                    baseWidth = this.shipHeight * 0.4 * (1 - (t - 0.9) * 10);
                }
                break;
                
            case 2: // Organic
                const curve = Math.sin(t * Math.PI);
                const noise = (rng() - 0.5) * 0.2;
                baseWidth = this.shipHeight * (0.1 + curve * 0.6 + noise);
                break;
        }
        
        return Math.floor(baseWidth);
    }

    drawHullSection(x, centerY, hullWidth, rng) {
        const halfWidth = Math.floor(hullWidth / 2);
        
        for (let dy = -halfWidth; dy <= halfWidth; dy++) {
            const y = centerY + dy;
            if (y >= 0 && y < this.shipHeight) {
                // Determine pixel type based on position
                if (Math.abs(dy) === halfWidth) {
                    // Hull edge
                    this.shipGrid[y][x] = this.hullColor;
                } else if (Math.abs(dy) < halfWidth) {
                    // Interior - sometimes hollow for larger ships
                    if (hullWidth <= 4 || rng() > 0.4) {
                        this.shipGrid[y][x] = this.hullColor;
                    }
                }
            }
        }
    }

    addHullAccents(rng, centerY) {
        // Add accent stripes
        const stripeCount = Math.floor(rng() * 2) + 1;
        
        for (let i = 0; i < stripeCount; i++) {
            const stripeY = centerY + (i % 2 === 0 ? 1 : -1) * Math.floor(1 + rng() * 2);
            if (stripeY >= 0 && stripeY < this.shipHeight) {
                const startX = Math.floor(this.shipWidth * (0.15 + rng() * 0.1));
                const endX = Math.floor(this.shipWidth * (0.7 + rng() * 0.15));
                
                for (let x = startX; x < endX; x++) {
                    if (this.shipGrid[stripeY][x] === this.hullColor) {
                        this.shipGrid[stripeY][x] = this.accentColor;
                    }
                }
            }
        }
    }

    addHullPanels(rng, centerY) {
        // Add panel details
        const panelCount = Math.floor(this.complexity * 3);
        
        for (let i = 0; i < panelCount; i++) {
            const panelX = Math.floor(this.shipWidth * (0.2 + rng() * 0.5));
            const panelY = centerY + Math.floor((rng() - 0.5) * (this.shipHeight * 0.6));
            const panelSize = Math.floor(2 + rng() * 3);
            
            // Draw small panel
            for (let dx = 0; dx < panelSize; dx++) {
                for (let dy = 0; dy < panelSize; dy++) {
                    const x = panelX + dx;
                    const y = panelY + dy;
                    
                    if (x >= 0 && x < this.shipWidth && y >= 0 && y < this.shipHeight &&
                        this.shipGrid[y][x] === this.hullColor) {
                        this.shipGrid[y][x] = this.detailColor;
                    }
                }
            }
        }
    }

    generateWings(rng) {
        if (!this.enableWings) return;
        
        const centerY = Math.floor(this.shipHeight / 2);
        const wingCount = Math.floor(rng() * 2) + 1;
        
        for (let i = 0; i < wingCount; i++) {
            const wingX = Math.floor(this.shipWidth * (0.3 + rng() * 0.3));
            const wingSpan = Math.floor(2 + rng() * 4);
            const wingLength = Math.floor(3 + rng() * 5);
            
            // Generate wings symmetrically
            for (let side of (this.symmetry ? [-1, 1] : [1])) {
                this.drawWing(wingX, centerY, wingSpan * side, wingLength, rng);
            }
        }
    }

    drawWing(startX, centerY, span, length, rng) {
        const direction = span > 0 ? 1 : -1;
        const absSpan = Math.abs(span);
        
        for (let i = 0; i < length; i++) {
            for (let j = 1; j <= absSpan; j++) {
                const x = startX + i;
                const y = centerY + direction * j;
                
                if (x >= 0 && x < this.shipWidth && y >= 0 && y < this.shipHeight) {
                    // Wing thickness tapers toward tip
                    const thickness = Math.max(1, absSpan - j + 1);
                    if (j <= thickness && this.isValidWingPosition(x, y)) {
                        this.shipGrid[y][x] = this.accentColor;
                    }
                }
            }
        }
    }

    isValidWingPosition(x, y) {
        // Check if wing can attach to hull
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX >= 0 && checkX < this.shipWidth && 
                    checkY >= 0 && checkY < this.shipHeight &&
                    this.shipGrid[checkY][checkX] === this.hullColor) {
                    return true;
                }
            }
        }
        return false;
    }

    generateThrusters(rng) {
        if (!this.enableThrusters) return;
        
        const centerY = Math.floor(this.shipHeight / 2);
        const thrusterCount = Math.floor(rng() * 2) + 1;
        
        for (let i = 0; i < thrusterCount; i++) {
            const thrusterY = this.symmetry ? 
                centerY + (i % 2 === 0 ? 1 : -1) * Math.floor(1 + rng() * 2) :
                Math.floor(rng() * this.shipHeight);
                
            this.drawThruster(thrusterY, rng);
        }
    }

    drawThruster(y, rng) {
        if (y < 0 || y >= this.shipHeight) return;
        
        const thrusterLength = Math.floor(2 + rng() * 3);
        const thrusterSize = Math.floor(1 + rng() * 2);
        
        // Draw thruster at rear of ship
        for (let x = 0; x < thrusterLength && x < this.shipWidth; x++) {
            for (let dy = -thrusterSize; dy <= thrusterSize; dy++) {
                const thrusterY = y + dy;
                if (thrusterY >= 0 && thrusterY < this.shipHeight &&
                    this.shipGrid[thrusterY][x] === this.hullColor) {
                    this.shipGrid[thrusterY][x] = this.thrusterColor;
                }
            }
        }
    }

    generateWeapons(rng) {
        if (!this.enableWeapons) return;
        
        const centerY = Math.floor(this.shipHeight / 2);
        const weaponCount = Math.floor(rng() * 3) + 1;
        
        for (let i = 0; i < weaponCount; i++) {
            const weaponX = Math.floor(this.shipWidth * (0.4 + rng() * 0.3));
            const weaponY = this.symmetry ?
                centerY + (i % 2 === 0 ? 0 : (i % 4 < 2 ? 1 : -1) * Math.floor(1 + rng() * 2)) :
                Math.floor(rng() * this.shipHeight);
                
            this.drawWeapon(weaponX, weaponY, rng);
        }
    }

    drawWeapon(x, y, rng) {
        if (!this.isValidWeaponPosition(x, y)) return;
        
        const barrelLength = Math.floor(2 + rng() * 3);
        
        // Weapon mount
        this.shipGrid[y][x] = this.weaponColor;
        
        // Weapon barrel extending forward
        for (let i = 1; i <= barrelLength; i++) {
            const barrelX = x + i;
            if (barrelX < this.shipWidth && this.shipGrid[y][barrelX] === null) {
                this.shipGrid[y][barrelX] = this.weaponColor;
            }
        }
    }

    isValidWeaponPosition(x, y) {
        if (x < 0 || x >= this.shipWidth || y < 0 || y >= this.shipHeight) return false;
        
        // Must be adjacent to hull
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX >= 0 && checkX < this.shipWidth && 
                    checkY >= 0 && checkY < this.shipHeight &&
                    this.shipGrid[checkY][checkX] === this.hullColor) {
                    return true;
                }
            }
        }
        return false;
    }

    generateWindows(rng) {
        if (!this.enableWindows) return;
        
        const centerY = Math.floor(this.shipHeight / 2);
        const windowCount = Math.floor(rng() * 3) + 1;
        
        for (let i = 0; i < windowCount; i++) {
            const windowX = Math.floor(this.shipWidth * (0.6 + rng() * 0.2));
            const windowY = centerY + Math.floor((rng() - 0.5) * 3);
            
            this.drawWindow(windowX, windowY, rng);
        }
    }

    drawWindow(x, y, rng) {
        if (x < 0 || x >= this.shipWidth || y < 0 || y >= this.shipHeight) return;
        
        const windowSize = Math.floor(1 + rng() * 2);
        
        for (let dx = 0; dx < windowSize; dx++) {
            for (let dy = 0; dy < windowSize; dy++) {
                const windowX = x + dx;
                const windowY = y + dy;
                
                if (windowX < this.shipWidth && windowY < this.shipHeight &&
                    this.shipGrid[windowY][windowX] === this.hullColor) {
                    this.shipGrid[windowY][windowX] = this.windowColor;
                }
            }
        }
    }

    generateDetails(rng) {
        if (!this.enableDetails) return;
        
        const detailCount = Math.floor(this.complexity * 8);
        
        for (let i = 0; i < detailCount; i++) {
            const x = Math.floor(this.shipWidth * (0.15 + rng() * 0.7));
            const y = Math.floor(rng() * this.shipHeight);
            
            if (this.shipGrid[y] && this.shipGrid[y][x] === this.hullColor) {
                this.addDetail(x, y, rng);
            }
        }
    }

    addDetail(x, y, rng) {
        const detailType = Math.floor(rng() * 4);
        
        switch (detailType) {
            case 0: // Accent dot
                this.shipGrid[y][x] = this.detailColor;
                break;
                
            case 1: // Small antenna
                if (y > 0 && this.shipGrid[y-1][x] === null) {
                    this.shipGrid[y-1][x] = this.detailColor;
                }
                break;
                
            case 2: // Sensor array
                if (x + 1 < this.shipWidth && this.shipGrid[y][x + 1] === this.hullColor) {
                    this.shipGrid[y][x + 1] = this.detailColor;
                }
                break;
                
            case 3: // Vent
                this.shipGrid[y][x] = this.accentColor;
                break;
        }
    }

    loop(deltaTime) {
        if (this.needsRegeneration) {
            this.generateShip();
        }
    }

    draw(ctx) {
        if (!this.shipGrid) {
            this.generateShip();
        }

        ctx.save();
        
        // Center the ship
        ctx.translate(-this.shipWidth * this.pixelScale / 2, -this.shipHeight * this.pixelScale / 2);
        
        // Draw each pixel with crisp edges
        ctx.imageSmoothingEnabled = false;
        
        for (let y = 0; y < this.shipHeight; y++) {
            for (let x = 0; x < this.shipWidth; x++) {
                const color = this.shipGrid[y][x];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        x * this.pixelScale,
                        y * this.pixelScale,
                        this.pixelScale,
                        this.pixelScale
                    );
                }
            }
        }
        
        // Draw outline if enabled
        if (this.enableOutline) {
            this.drawOutline(ctx);
        }
        
        ctx.restore();
    }

    drawOutline(ctx) {
        ctx.strokeStyle = this.outlineColor;
        ctx.lineWidth = 1;
        
        for (let y = 0; y < this.shipHeight; y++) {
            for (let x = 0; x < this.shipWidth; x++) {
                if (this.shipGrid[y][x]) {
                    const pixelX = x * this.pixelScale;
                    const pixelY = y * this.pixelScale;
                    
                    // Draw outline only on external edges
                    if (x === 0 || !this.shipGrid[y][x - 1]) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX, pixelY);
                        ctx.lineTo(pixelX, pixelY + this.pixelScale);
                        ctx.stroke();
                    }
                    if (x === this.shipWidth - 1 || !this.shipGrid[y][x + 1]) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX + this.pixelScale, pixelY);
                        ctx.lineTo(pixelX + this.pixelScale, pixelY + this.pixelScale);
                        ctx.stroke();
                    }
                    if (y === 0 || !this.shipGrid[y - 1][x]) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX, pixelY);
                        ctx.lineTo(pixelX + this.pixelScale, pixelY);
                        ctx.stroke();
                    }
                    if (y === this.shipHeight - 1 || !this.shipGrid[y + 1][x]) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX, pixelY + this.pixelScale);
                        ctx.lineTo(pixelX + this.pixelScale, pixelY + this.pixelScale);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    // Public methods
    regenerateShip() {
        this.forceRegeneration();
    }

    randomizeSeed() {
        this.masterSeed = Math.floor(Math.random() * 100000);
        this.forceRegeneration();
    }

    toJSON() {
        return {
            masterSeed: this.masterSeed,
            shipWidth: this.shipWidth,
            shipHeight: this.shipHeight,
            pixelScale: this.pixelScale,
            enableOutline: this.enableOutline,
            outlineColor: this.outlineColor,
            hullColor: this.hullColor,
            accentColor: this.accentColor,
            thrusterColor: this.thrusterColor,
            windowColor: this.windowColor,
            weaponColor: this.weaponColor,
            detailColor: this.detailColor,
            complexity: this.complexity,
            symmetry: this.symmetry,
            hullStyle: this.hullStyle,
            enableWeapons: this.enableWeapons,
            enableThrusters: this.enableThrusters,
            enableWindows: this.enableWindows,
            enableWings: this.enableWings,
            enableDetails: this.enableDetails
        };
    }

    fromJSON(data) {
        this.masterSeed = data.masterSeed || 12345;
        this.shipWidth = data.shipWidth || 32;
        this.shipHeight = data.shipHeight || 16;
        this.pixelScale = data.pixelScale || 2;
        this.enableOutline = data.enableOutline !== undefined ? data.enableOutline : true;
        this.outlineColor = data.outlineColor || "#000000";
        this.hullColor = data.hullColor || "#4a90e2";
        this.accentColor = data.accentColor || "#357abd";
        this.thrusterColor = data.thrusterColor || "#ff6b35";
        this.windowColor = data.windowColor || "#87ceeb";
        this.weaponColor = data.weaponColor || "#ff4444";
        this.detailColor = data.detailColor || "#2e6ba8";
        this.complexity = data.complexity || 0.7;
        this.symmetry = data.symmetry !== undefined ? data.symmetry : true;
        this.hullStyle = data.hullStyle || 0;
        this.enableWeapons = data.enableWeapons !== undefined ? data.enableWeapons : true;
        this.enableThrusters = data.enableThrusters !== undefined ? data.enableThrusters : true;
        this.enableWindows = data.enableWindows !== undefined ? data.enableWindows : true;
        this.enableWings = data.enableWings !== undefined ? data.enableWings : true;
        this.enableDetails = data.enableDetails !== undefined ? data.enableDetails : true;
        
        this.forceRegeneration();
    }
}

window.ProceduralSpaceship = ProceduralSpaceship;