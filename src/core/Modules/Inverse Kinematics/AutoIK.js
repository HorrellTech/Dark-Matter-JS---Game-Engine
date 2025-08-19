class AutoIK extends Module {
    static namespace = "WIP";
    static description = "Inverse Kinematics chain that automatically finds child objects and points end effector toward target";
    static allowMultiple = false;
    static iconClass = "fas fa-link";

    constructor() {
        super("AutoIK");
        
        this.targetName = "";
        this.staticBase = true;
        this.iterations = 15;
        this.tolerance = 1.0;
        this.enabled = true;
        this.showDebug = false;
        
        // Joint settings
        this.baseJointLength = 25;  // Distance from object center to base joint
        this.endJointLength = 25;   // Distance from object center to end joint
        
        // Joint rotation limits
        this.enableJointLimits = false;
        this.jointMinAngle = -90;   // Minimum angle in degrees
        this.jointMaxAngle = 90;    // Maximum angle in degrees
        
        // IK chain data
        this.chain = [];
        this.target = null;
        this.lastTargetName = "";
        this.chainLengths = []; // Store segment lengths
        this.jointLimits = [];  // Store individual joint limits
        
        // Expose properties for inspector
        this.exposeProperty("targetName", "string", "", {
            description: "Name of GameObject to point toward",
            onChange: (val) => {
                this.targetName = val;
                this.findTarget();
            }
        });

        this.exposeProperty("staticBase", "boolean", true, {
            description: "Prevent root GameObject from moving (static base)",
            onChange: (val) => {
                this.staticBase = val;
            }
        });
        
        this.exposeProperty("iterations", "number", 15, {
            description: "Number of IK solver iterations",
            onChange: (val) => {
                this.iterations = val;
            }
        });
        
        this.exposeProperty("tolerance", "number", 1.0, {
            description: "Distance tolerance for IK solving",
            onChange: (val) => {
                this.tolerance = val;
            }
        });
        
        this.exposeProperty("enabled", "boolean", true, {
            description: "Enable/disable IK solving",
            onChange: (val) => {
                this.enabled = val;
            }
        });
        
        this.exposeProperty("showDebug", "boolean", false, {
            description: "Show debug visualization",
            onChange: (val) => {
                this.showDebug = val;
            }
        });

        // Joint length properties
        this.exposeProperty("baseJointLength", "number", 25, {
            description: "Distance from object center to base joint",
            onChange: (val) => {
                this.baseJointLength = val;
                this.buildChain();
            }
        });
        
        this.exposeProperty("endJointLength", "number", 25, {
            description: "Distance from object center to end joint",
            onChange: (val) => {
                this.endJointLength = val;
                this.buildChain();
            }
        });

        // Joint limit properties
        this.exposeProperty("enableJointLimits", "boolean", false, {
            description: "Enable joint rotation limits",
            onChange: (val) => {
                this.enableJointLimits = val;
                this.buildChain();
            }
        });

        this.exposeProperty("jointMinAngle", "number", -90, {
            description: "Minimum joint angle (degrees)",
            onChange: (val) => {
                this.jointMinAngle = val;
                this.updateJointLimits();
            }
        });

        this.exposeProperty("jointMaxAngle", "number", 90, {
            description: "Maximum joint angle (degrees)",
            onChange: (val) => {
                this.jointMaxAngle = val;
                this.updateJointLimits();
            }
        });
    }

    style(style) {
        style.startGroup("IK Settings", false, {
            backgroundColor: 'rgba(255,150,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("targetName", "string", this.targetName, {
            description: "Name of the GameObject to point toward",
            style: {
                label: "Target GameObject Name"
            }
        });

        style.exposeProperty("staticBase", "boolean", this.staticBase, {
            description: "Prevent root GameObject from moving (static base)",
            style: {
                label: "Static Base"
            }
        });
        
        style.exposeProperty("enabled", "boolean", this.enabled, {
            description: "Enable or disable IK solving",
            style: {
                label: "Enable IK"
            }
        });
        
        style.endGroup();

        style.startGroup("Joint Settings", false, {
            backgroundColor: 'rgba(150,100,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("baseJointLength", "number", this.baseJointLength, {
            description: "Distance from object center to base joint (where rotation occurs)",
            min: 1,
            max: 100,
            step: 1,
            style: {
                label: "Base Joint Length",
                slider: true
            }
        });
        
        style.exposeProperty("endJointLength", "number", this.endJointLength, {
            description: "Distance from object center to end joint (connection point to next segment)",
            min: 1,
            max: 100,
            step: 1,
            style: {
                label: "End Joint Length",
                slider: true
            }
        });
        
        style.endGroup();

        style.startGroup("Joint Limits", false, {
            backgroundColor: 'rgba(255,200,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("enableJointLimits", "boolean", this.enableJointLimits, {
            description: "Enable joint rotation limits (prevents backwards bending)",
            style: {
                label: "Enable Joint Limits"
            }
        });

        style.exposeProperty("jointMinAngle", "number", this.jointMinAngle, {
            description: "Minimum allowed joint angle in degrees",
            min: -180,
            max: 180,
            step: 5,
            style: {
                label: "Min Angle (deg)",
                slider: true
            }
        });

        style.exposeProperty("jointMaxAngle", "number", this.jointMaxAngle, {
            description: "Maximum allowed joint angle in degrees",
            min: -180,
            max: 180,
            step: 5,
            style: {
                label: "Max Angle (deg)",
                slider: true
            }
        });
        
        style.endGroup();
        
        style.startGroup("Solver Parameters", true, {
            backgroundColor: 'rgba(100,150,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("iterations", "number", this.iterations, {
            description: "Number of iterations for IK solver (higher = more accurate but slower)",
            min: 1,
            max: 50,
            step: 1,
            style: {
                label: "Solver Iterations",
                slider: true
            }
        });
        
        style.exposeProperty("tolerance", "number", this.tolerance, {
            description: "Distance tolerance for IK solving (lower = more precise)",
            min: 0.1,
            max: 10.0,
            step: 0.1,
            style: {
                label: "Tolerance",
                slider: true
            }
        });
        
        style.endGroup();
        
        style.startGroup("Debug", true, {
            backgroundColor: 'rgba(150,255,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("showDebug", "boolean", this.showDebug, {
            description: "Show debug visualization of IK chain, joints, and limits",
            style: {
                label: "Show Debug"
            }
        });
        
        style.endGroup();
        
        style.addDivider();
        style.addHelpText("This module creates an IK chain from child GameObjects. Each child's base joint (red) connects to its parent's end joint (blue). The chain's end effector points toward the target. Joint limits prevent unnatural bending.");
    }

    start() {
        this.buildChain();
        this.findTarget();
    }

    loop(deltaTime) {
        if (!this.enabled) return;
        
        // Rebuild chain if structure changed
        this.buildChain();
        
        // Find target if name changed
        if (this.targetName !== this.lastTargetName) {
            this.findTarget();
            this.lastTargetName = this.targetName;
        }
        
        // Solve IK
        if (this.chain.length >= 2 && this.target) {
            this.solveIK();
        }
    }

    buildChain() {
        this.chain = [];
        this.chainLengths = [];
        this.jointLimits = [];
        
        // Start from this GameObject (root of chain)
        let current = this.gameObject;
        this.chain.push(current);
        
        // Follow the longest chain of children
        while (current.children && current.children.length > 0) {
            let nextChild = this.findLongestChainChild(current);
            if (!nextChild) break;
            
            // Calculate segment length between parent's end joint and child's base joint
            let segmentLength = this.calculateProperSegmentLength(current, nextChild);
            
            this.chainLengths.push(segmentLength);
            this.chain.push(nextChild);
            
            // Set up joint limits for this joint
            this.jointLimits.push({
                min: this.jointMinAngle,
                max: this.jointMaxAngle,
                enabled: this.enableJointLimits
            });
            
            current = nextChild;
        }

        // Ensure proper positioning of children based on parent's end joint
        this.enforceJointConnections();
    }

    // Calculate the proper segment length and ensure child connects to parent's end joint
    calculateProperSegmentLength(parent, child) {
        // Position the child so its base joint connects to parent's end joint
        let parentEndJoint = this.getEndJointPosition(parent);
        let childAngle = (child.angle || 0) * Math.PI / 180;
        
        // Calculate where child's center should be based on its base joint connecting to parent's end joint
        let childCenterX = parentEndJoint.x + this.baseJointLength * Math.cos(childAngle);
        let childCenterY = parentEndJoint.y + this.baseJointLength * Math.sin(childAngle);
        
        // Update child position to maintain proper connection
        child.position.x = childCenterX;
        child.position.y = childCenterY;
        
        // Return the segment length (should be baseJointLength + endJointLength)
        return this.baseJointLength + this.endJointLength;
    }

    // Ensure all joints are properly connected
    enforceJointConnections() {
        for (let i = 1; i < this.chain.length; i++) {
            let parent = this.chain[i - 1];
            let child = this.chain[i];
            
            // Get parent's end joint position
            let parentEndJoint = this.getEndJointPosition(parent);
            
            // Calculate child's center position so its base joint connects to parent's end joint
            let childAngle = (child.angle || 0) * Math.PI / 180;
            let childCenterX = parentEndJoint.x + this.baseJointLength * Math.cos(childAngle);
            let childCenterY = parentEndJoint.y + this.baseJointLength * Math.sin(childAngle);
            
            // Update child position
            child.position.x = childCenterX;
            child.position.y = childCenterY;
        }
    }

    // Get base joint position relative to object (where rotation occurs)
    getBaseJointPosition(gameObject) {
        let angle = (gameObject.angle || 0) * Math.PI / 180;
        let baseX = gameObject.position.x - this.baseJointLength * Math.cos(angle);
        let baseY = gameObject.position.y - this.baseJointLength * Math.sin(angle);
        return { x: baseX, y: baseY };
    }

    // Get end joint position relative to object (connection point to next segment)
    getEndJointPosition(gameObject) {
        let angle = (gameObject.angle || 0) * Math.PI / 180;
        let endX = gameObject.position.x + this.endJointLength * Math.cos(angle);
        let endY = gameObject.position.y + this.endJointLength * Math.sin(angle);
        return { x: endX, y: endY };
    }

    findLongestChainChild(gameObject) {
        if (!gameObject.children || gameObject.children.length === 0) return null;
        
        let longestChild = null;
        let maxDepth = 0;
        
        for (let child of gameObject.children) {
            let depth = this.getChainDepth(child);
            if (depth > maxDepth) {
                maxDepth = depth;
                longestChild = child;
            }
        }
        
        return longestChild;
    }

    getChainDepth(gameObject) {
        if (!gameObject.children || gameObject.children.length === 0) return 1;
        
        let maxDepth = 0;
        for (let child of gameObject.children) {
            let depth = this.getChainDepth(child);
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }
        
        return maxDepth + 1;
    }

    findTarget() {
        if (!this.targetName) {
            this.target = null;
            return;
        }
        
        this.target = this.findGameObjectByName(this.targetName);
    }

    findGameObjectByName(name) {
        if (window.engine && window.engine.gameObjects) {
            for (let gameObject of window.engine.gameObjects) {
                if (gameObject.name === name) {
                    return gameObject;
                }
            }
        }
        return null;
    }

    getWorldPosition(gameObject) {
        let worldPos = { x: 0, y: 0 };
        let current = gameObject;
        let transformStack = [];
        
        while (current) {
            transformStack.unshift({
                position: { x: current.position.x, y: current.position.y },
                angle: current.angle || 0
            });
            current = current.parent;
        }
        
        let cumulativeAngle = 0;
        for (let transform of transformStack) {
            let cos = Math.cos(cumulativeAngle * Math.PI / 180);
            let sin = Math.sin(cumulativeAngle * Math.PI / 180);
            
            let rotatedX = transform.position.x * cos - transform.position.y * sin;
            let rotatedY = transform.position.x * sin + transform.position.y * cos;
            
            worldPos.x += rotatedX;
            worldPos.y += rotatedY;
            cumulativeAngle += transform.angle;
        }
        
        return worldPos;
    }

    solveIK() {
        if (this.chain.length < 2 || !this.target) return;
        
        let targetPos = this.getWorldPosition(this.target);
        
        for (let iteration = 0; iteration < this.iterations; iteration++) {
            // Calculate current end effector position (last child's end joint)
            let endEffectorPos = this.getEndEffectorPosition();
            
            // Check if we're close enough
            let distance = Math.sqrt(
                (targetPos.x - endEffectorPos.x) ** 2 + 
                (targetPos.y - endEffectorPos.y) ** 2
            );
            
            if (distance < this.tolerance) break;
            
            // Apply CCD algorithm
            this.applyCCD(targetPos);
            
            // Enforce joint connections after each iteration
            this.enforceJointConnections();
        }
    }

    // Get the end effector position (last object's end joint)
    getEndEffectorPosition() {
        if (this.chain.length === 0) return { x: 0, y: 0 };
        
        let lastObject = this.chain[this.chain.length - 1];
        return this.getEndJointPosition(lastObject);
    }

    // Apply Cyclic Coordinate Descent algorithm
    applyCCD(targetPos) {
        // Work backwards from the second-to-last joint (don't move the end effector itself)
        for (let i = this.chain.length - 2; i >= 0; i--) {
            // Skip the root translation if static base is enabled
            if (i === 0 && this.staticBase) {
                this.adjustJointAngle(i, targetPos);
                continue;
            }
            
            this.adjustJointAngle(i, targetPos);
        }
    }

    // Adjust a single joint's angle to point toward the target
    adjustJointAngle(jointIndex, targetPos) {
        let joint = this.chain[jointIndex];
        let jointPos = this.getBaseJointPosition(joint);
        let endEffectorPos = this.getEndEffectorPosition();
        
        // Calculate vectors from joint to end effector and joint to target
        let toEndEffector = {
            x: endEffectorPos.x - jointPos.x,
            y: endEffectorPos.y - jointPos.y
        };
        
        let toTarget = {
            x: targetPos.x - jointPos.x,
            y: targetPos.y - jointPos.y
        };
        
        // Skip if vectors are too small
        let endEffectorLength = Math.sqrt(toEndEffector.x ** 2 + toEndEffector.y ** 2);
        let targetLength = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2);
        
        if (endEffectorLength < 0.001 || targetLength < 0.001) return;
        
        // Calculate the angle between the vectors
        let currentAngle = Math.atan2(toEndEffector.y, toEndEffector.x);
        let targetAngle = Math.atan2(toTarget.y, toTarget.x);
        
        let angleDifference = targetAngle - currentAngle;
        
        // Normalize angle to [-π, π]
        while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
        while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;
        
        // Apply the rotation
        let currentJointAngle = joint.angle || 0;
        let newAngle = currentJointAngle + (angleDifference * 180 / Math.PI);
        
        // Apply joint limits if enabled
        if (this.enableJointLimits && jointIndex < this.jointLimits.length) {
            let limits = this.jointLimits[jointIndex];
            if (limits.enabled) {
                newAngle = this.clampAngle(newAngle, limits.min, limits.max);
            }
        }
        
        joint.angle = newAngle;
    }

    // Clamp angle within limits
    clampAngle(angle, min, max) {
        // Normalize angle to [-180, 180]
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;
        
        return Math.max(min, Math.min(max, angle));
    }

    // Update joint limits for all joints
    updateJointLimits() {
        for (let i = 0; i < this.jointLimits.length; i++) {
            this.jointLimits[i].min = this.jointMinAngle;
            this.jointLimits[i].max = this.jointMaxAngle;
            this.jointLimits[i].enabled = this.enableJointLimits;
        }
    }

    drawGizmos(ctx) {
        if (!this.showDebug || this.chain.length < 1) return;
        
        ctx.save();
        
        // Draw chain connections
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        // Draw connections between joints
        for (let i = 0; i < this.chain.length - 1; i++) {
            let parentEndPos = this.getEndJointPosition(this.chain[i]);
            let childBasePos = this.getBaseJointPosition(this.chain[i + 1]);
            
            ctx.moveTo(parentEndPos.x, parentEndPos.y);
            ctx.lineTo(childBasePos.x, childBasePos.y);
        }
        ctx.stroke();
        
        // Draw individual object segments (base to end joint)
        ctx.strokeStyle = '#FFAA00';
        ctx.lineWidth = 2;
        for (let i = 0; i < this.chain.length; i++) {
            let basePos = this.getBaseJointPosition(this.chain[i]);
            let endPos = this.getEndJointPosition(this.chain[i]);
            
            ctx.beginPath();
            ctx.moveTo(basePos.x, basePos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
        }
        
        // Draw joints and limits for each game object in the chain
        for (let i = 0; i < this.chain.length; i++) {
            let basePos = this.getBaseJointPosition(this.chain[i]);
            let endPos = this.getEndJointPosition(this.chain[i]);
            let centerPos = { x: this.chain[i].position.x, y: this.chain[i].position.y };
            
            // Draw joint limits arc if enabled
            if (this.enableJointLimits && i < this.jointLimits.length) {
                let limits = this.jointLimits[i];
                if (limits.enabled) {
                    ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    
                    let minAngleRad = limits.min * Math.PI / 180;
                    let maxAngleRad = limits.max * Math.PI / 180;
                    let radius = this.baseJointLength * 0.7;
                    
                    ctx.arc(basePos.x, basePos.y, radius, minAngleRad, maxAngleRad);
                    ctx.stroke();
                    
                    // Draw limit boundary lines
                    ctx.beginPath();
                    ctx.moveTo(basePos.x, basePos.y);
                    ctx.lineTo(
                        basePos.x + radius * Math.cos(minAngleRad),
                        basePos.y + radius * Math.sin(minAngleRad)
                    );
                    ctx.moveTo(basePos.x, basePos.y);
                    ctx.lineTo(
                        basePos.x + radius * Math.cos(maxAngleRad),
                        basePos.y + radius * Math.sin(maxAngleRad)
                    );
                    ctx.stroke();
                }
            }
            
            // Draw base joint as red cross (rotation point)
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            let crossSize = 8;
            ctx.beginPath();
            ctx.moveTo(basePos.x - crossSize, basePos.y - crossSize);
            ctx.lineTo(basePos.x + crossSize, basePos.y + crossSize);
            ctx.moveTo(basePos.x + crossSize, basePos.y - crossSize);
            ctx.lineTo(basePos.x - crossSize, basePos.y + crossSize);
            ctx.stroke();
            
            // Draw end joint as blue cross (connection point)
            ctx.strokeStyle = '#0000FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(endPos.x - crossSize, endPos.y - crossSize);
            ctx.lineTo(endPos.x + crossSize, endPos.y + crossSize);
            ctx.moveTo(endPos.x + crossSize, endPos.y - crossSize);
            ctx.lineTo(endPos.x - crossSize, endPos.y + crossSize);
            ctx.stroke();
            
            // Draw joint index labels
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText(`B${i}`, basePos.x + 10, basePos.y - 10);
            ctx.fillText(`E${i}`, endPos.x + 10, endPos.y - 10);
            
            // Draw object center as yellow circle
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(centerPos.x, centerPos.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Highlight end effector (last object's end joint)
        let endEffectorPos = this.getEndEffectorPosition();
        ctx.fillStyle = '#00FFFF';
        ctx.strokeStyle = '#00AAAA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endEffectorPos.x, endEffectorPos.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw target
        if (this.target) {
            let targetPos = this.getWorldPosition(this.target);
            ctx.fillStyle = '#FF00FF';
            ctx.strokeStyle = '#AA00AA';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(targetPos.x, targetPos.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw line from end effector to target
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(endEffectorPos.x, endEffectorPos.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw distance text
            let distance = Math.sqrt((targetPos.x - endEffectorPos.x) ** 2 + (targetPos.y - endEffectorPos.y) ** 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px Arial';
            ctx.fillText(`Distance: ${distance.toFixed(1)}`, targetPos.x + 15, targetPos.y + 15);
            
            // Draw angle info for joints with limits
            if (this.enableJointLimits) {
                ctx.font = '10px Arial';
                for (let i = 0; i < this.chain.length && i < this.jointLimits.length; i++) {
                    let joint = this.chain[i];
                    let limits = this.jointLimits[i];
                    if (limits.enabled) {
                        let basePos = this.getBaseJointPosition(joint);
                        let angle = joint.angle || 0;
                        let withinLimits = angle >= limits.min && angle <= limits.max;
                        ctx.fillStyle = withinLimits ? '#00FF00' : '#FF0000';
                        ctx.fillText(`${angle.toFixed(1)}°`, basePos.x - 15, basePos.y - 15);
                    }
                }
            }
        }
        
        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            targetName: this.targetName,
            staticBase: this.staticBase,
            iterations: this.iterations,
            tolerance: this.tolerance,
            enabled: this.enabled,
            showDebug: this.showDebug,
            baseJointLength: this.baseJointLength,
            endJointLength: this.endJointLength,
            enableJointLimits: this.enableJointLimits,
            jointMinAngle: this.jointMinAngle,
            jointMaxAngle: this.jointMaxAngle
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        
        if (!data) return;
        
        this.targetName = data.targetName || "";
        this.staticBase = data.staticBase !== undefined ? data.staticBase : true;
        this.iterations = data.iterations || 15;
        this.tolerance = data.tolerance || 1.0;
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.showDebug = data.showDebug !== undefined ? data.showDebug : false;
        this.baseJointLength = data.baseJointLength || 25;
        this.endJointLength = data.endJointLength || 25;
        this.enableJointLimits = data.enableJointLimits !== undefined ? data.enableJointLimits : false;
        this.jointMinAngle = data.jointMinAngle !== undefined ? data.jointMinAngle : -90;
        this.jointMaxAngle = data.jointMaxAngle !== undefined ? data.jointMaxAngle : 90;
        this.lastTargetName = "";
    }
}

window.AutoIK = AutoIK;