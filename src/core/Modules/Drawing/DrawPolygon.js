class DrawPolygon extends Module {
    static namespace   = "Drawing";
    static description = "Draws a filled polygon at the GameObject's position";
    static iconColor = "#a200ffff";

    constructor() {
        super("DrawPolygon");
        // Default triangle
        this.vertices = [
            new Vector2(0, -50),
            new Vector2(50, 50),
            new Vector2(-50, 50)
        ];
        this.offset   = new Vector2(0,0);
        this.color    = "#ffffff";
        this.fill     = true;
        this.outline  = false;
        this.outlineColor = "#000000";
        this.outlineWidth = 2;

        // Gizmo properties for editor
        this.showGizmos = true;
        this.gizmoRadius = 8;
        this.selectedVertexIndex = -1;
        this.draggingVertexIndex = -1;
        this.isDragging = false;
        this.dragOffset = new Vector2(0, 0);
        this.hoveredVertex = -1;

        this.exposeProperty("vertices", "polygon", this.vertices, {
            description: "Array of Vector2 points (min 3)",
            minItems: 3,
            onChange: (val) => {
                this.vertices = val;
                // Only call _onVerticesChanged if gameObject exists
                if (this.gameObject) {
                    this._onVerticesChanged();
                }
            }
        });
        
        // Remaining property exposures...
        this.exposeProperty("offset", "vector2", this.offset, { 
            description: "Offset from center",
            onChange: (val) => this.offset = val
        });
        
        this.exposeProperty("color", "color", this.color, { 
            description: "Fill color",
            onChange: (val) => this.color = val
        });
        
        this.exposeProperty("fill", "boolean", this.fill, { 
            description: "Fill polygon",
            onChange: (val) => this.fill = val
        });
        
        this.exposeProperty("outline", "boolean", this.outline, { 
            description: "Show outline",
            onChange: (val) => this.outline = val
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, { 
            description: "Stroke color",
            onChange: (val) => this.outlineColor = val
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, { 
            description: "Outline thickness", 
            min: 0,
            max: 20,
            step: 0.5,
            onChange: (val) => this.outlineWidth = val
        });
    }

    getBoundingBox() {
        if (!this.vertices || this.vertices.length < 3) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const v of this.vertices) {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        }
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    _onVerticesChanged() {
        // Safety check: only continue if gameObject exists
        if (!this.gameObject) return;
        
        // if there's a Rigidbody on this object, sync its polygon verts
        try {
            const rb = this.gameObject.getModule("RigidBody") || 
                     (typeof RigidBody !== 'undefined' ? this.gameObject.getModule(RigidBody) : null);
            
            if (rb) {
                rb.vertices = this.vertices.slice();
                rb.rebuildBody();
            }
        } catch (e) {
            console.warn("Error syncing polygon vertices with RigidBody:", e);
        }
    }

    draw(ctx) {
        if (!this.enabled || this.vertices.length < 3) return;
        ctx.save();
        ctx.translate(this.offset.x, this.offset.y);
        
        // Draw fill
        if(this.fill) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
            for (let i = 1; i < this.vertices.length; i++) {
                ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw outline if enabled
        if (this.outline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.beginPath();
            ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
            for (let i = 1; i < this.vertices.length; i++) {
                ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Draw gizmos for interactive editing in the editor
     */
    drawGizmos(ctx) {
        if (!this.showGizmos || !this.vertices || this.vertices.length === 0 || !this.gameObject) return;

        ctx.save();

        // Apply GameObject transform
        const worldPos = this.gameObject.getWorldPosition();
        const worldAngle = this.gameObject.angle;

        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(worldAngle * Math.PI / 180);
        ctx.translate(this.offset.x, this.offset.y);

        // Only draw full gizmos if object is selected
        if (!this.gameObject.isEditorSelected) {
            // Draw polygon icon
            ctx.translate(-this.offset.x, -this.offset.y);
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(162, 0, 255, 0.6)";
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw polygon shape icon
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-6, -4);
            ctx.lineTo(0, -6);
            ctx.lineTo(6, -4);
            ctx.lineTo(6, 4);
            ctx.lineTo(0, 6);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.stroke();

            ctx.restore();
            return;
        }

        // Draw connecting lines between vertices
        ctx.strokeStyle = "rgba(162, 0, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (this.vertices.length > 0) {
            ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
            for (let i = 1; i < this.vertices.length; i++) {
                ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
            }
            ctx.closePath();
        }
        ctx.stroke();

        // Draw vertex points
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            const isSelected = i === this.selectedVertexIndex;
            const isHovered = i === this.hoveredVertex;
            const isDragging = i === this.draggingVertexIndex;

            // Draw outer glow for hovered/selected
            if (isHovered || isSelected || isDragging) {
                ctx.beginPath();
                ctx.arc(vertex.x, vertex.y, this.gizmoRadius * 2, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(162, 0, 255, 0.2)";
                ctx.fill();
            }

            // Draw vertex circle
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y,
                isDragging ? this.gizmoRadius * 1.7 :
                    (isSelected ? this.gizmoRadius * 1.5 : this.gizmoRadius),
                0, Math.PI * 2);

            ctx.fillStyle = isDragging ? "#FF4444" :
                (isSelected ? "#FF0000" :
                    (isHovered ? "#CC00FF" : "#A200FF"));
            ctx.fill();

            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw vertex index
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(i.toString(), vertex.x, vertex.y);

            // Draw delete hint on right-click hover
            if (isHovered && this.vertices.length > 3) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.font = "10px Arial";
                ctx.textAlign = "center";
                ctx.fillText("Right-click to delete", vertex.x, vertex.y - this.gizmoRadius * 2 - 5);
            }
        }

        // Draw polygon icon at object center
        ctx.translate(-this.offset.x, -this.offset.y);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#A200FF";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw polygon shape icon
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(0, -6);
        ctx.lineTo(6, -4);
        ctx.lineTo(6, 4);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Handle gizmo interaction from the editor
     */
    handleGizmoInteraction(worldPos, isClick = false) {
        if (!this.showGizmos) return null;

        if (isClick) {
            return this.onMouseDown(worldPos, 0);
        } else {
            return this.onMouseMove(worldPos);
        }
    }

    /**
     * Convert world position to local position (accounting for GameObject transform)
     */
    worldToLocal(worldPos) {
        if (!this.gameObject) return worldPos.clone();

        const gameObjectWorldPos = this.gameObject.getWorldPosition();
        const gameObjectAngle = this.gameObject.angle;

        // Translate to local space
        let localX = worldPos.x - gameObjectWorldPos.x;
        let localY = worldPos.y - gameObjectWorldPos.y;

        // Rotate to local space
        const angleRad = -gameObjectAngle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;

        // Account for offset
        return new Vector2(rotatedX - this.offset.x, rotatedY - this.offset.y);
    }

    /**
     * Handle mouse down event for gizmo interaction
     */
    onMouseDown(worldPos, button) {
        if (!this.showGizmos) return false;

        const localPos = this.worldToLocal(worldPos);

        // Right click - delete vertex
        if (button === 2) {
            for (let i = 0; i < this.vertices.length; i++) {
                if (this.vertices.length <= 3) break; // Keep at least 3 vertices

                const vertex = this.vertices[i];
                const distance = Math.sqrt(
                    Math.pow(localPos.x - vertex.x, 2) +
                    Math.pow(localPos.y - vertex.y, 2)
                );

                if (distance <= this.gizmoRadius * 2) {
                    this.removeVertex(i);
                    this.selectedVertexIndex = -1;
                    return true;
                }
            }
            return false;
        }

        // Left click - select/drag vertex
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            const distance = Math.sqrt(
                Math.pow(localPos.x - vertex.x, 2) +
                Math.pow(localPos.y - vertex.y, 2)
            );

            if (distance <= this.gizmoRadius * 2) {
                this.selectedVertexIndex = i;
                this.draggingVertexIndex = i;
                this.isDragging = true;
                this.dragOffset.x = localPos.x - vertex.x;
                this.dragOffset.y = localPos.y - vertex.y;
                return true;
            }
        }

        return false;
    }

    /**
     * Handle mouse move event for gizmo interaction
     */
    onMouseMove(worldPos) {
        if (!this.showGizmos) return false;

        const localPos = this.worldToLocal(worldPos);

        // Update dragging
        if (this.isDragging && this.draggingVertexIndex >= 0) {
            this.vertices[this.draggingVertexIndex].x = localPos.x - this.dragOffset.x;
            this.vertices[this.draggingVertexIndex].y = localPos.y - this.dragOffset.y;
            this._onVerticesChanged(); // Update RigidBody if present
            return true;
        }

        // Update hover states
        this.hoveredVertex = -1;

        // Check vertices
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            const distance = Math.sqrt(
                Math.pow(localPos.x - vertex.x, 2) +
                Math.pow(localPos.y - vertex.y, 2)
            );

            if (distance <= this.gizmoRadius * 2) {
                this.hoveredVertex = i;
                return true;
            }
        }

        return false;
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(worldPos, button) {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggingVertexIndex = -1;
            return true;
        }
        return false;
    }

    /**
     * Called when the module is attached to a game object
     * This is a good place to sync vertices with RigidBody
     */
    onAttach() {
        // Now it's safe to sync with RigidBody if needed
        if (this.vertices && this.vertices.length >= 3) {
            this._onVerticesChanged();
        }
    }

    /**
     * Set a vertex at a specific index
     * @param {number} index - Index of the vertex to modify
     * @param {Vector2|Object} value - New vertex value
     */
    setVertex(index, value) {
        if (!this.vertices || index < 0 || index >= this.vertices.length) {
            console.warn(`Vertex index out of bounds: ${index}`);
            return;
        }
        
        // Ensure we're working with a Vector2
        const vertex = value instanceof Vector2 ? value : new Vector2(value.x || 0, value.y || 0);
        
        // Update the vertex
        this.vertices[index] = vertex;
        
        // Trigger any necessary updates - only if we have a gameObject
        if (this.gameObject) {
            this._onVerticesChanged();
        }
    }

    /**
     * Add a new vertex to the polygon
     * @param {Vector2|Object} vertex - New vertex to add
     * @param {number} [index] - Optional position to insert (defaults to end)
     */
    addVertex(vertex, index = undefined) {
        if (!this.vertices) {
            this.vertices = [];
        }
        
        // Ensure we're working with a Vector2
        const newVertex = vertex instanceof Vector2 ? vertex : new Vector2(vertex.x || 0, vertex.y || 0);
        
        if (index !== undefined) {
            // Insert at specific position
            this.vertices.splice(index, 0, newVertex);
        } else {
            // Add to end
            this.vertices.push(newVertex);
        }
        
        // Trigger any necessary updates - only if we have a gameObject
        if (this.gameObject) {
            this._onVerticesChanged();
        }
    }

    /**
     * Remove a vertex at the specified index
     * @param {number} index - Index of vertex to remove
     */
    removeVertex(index) {
        if (!this.vertices || index < 0 || index >= this.vertices.length) {
            console.warn(`Vertex index out of bounds: ${index}`);
            return;
        }
        
        // Don't allow removing if we'll have fewer than 3 vertices
        if (this.vertices.length <= 3) {
            console.warn("Cannot remove vertex: polygon must have at least 3 vertices");
            return;
        }
        
        // Remove the vertex
        this.vertices.splice(index, 1);
        
        // Trigger any necessary updates - only if we have a gameObject
        if (this.gameObject) {
            this._onVerticesChanged();
        }
    }

    toJSON() {
        const json = super.toJSON();
        json.vertices = this.vertices.map(v => v.toJSON ? v.toJSON() : { x: v.x || 0, y: v.y || 0 });
        json.offset = this.offset.toJSON ? this.offset.toJSON() : { x: this.offset.x || 0, y: this.offset.y || 0 };
        json.color = this.color;
        json.fill = this.fill;
        json.outline = this.outline;
        json.outlineColor = this.outlineColor;
        json.outlineWidth = this.outlineWidth;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        
        // Reconstruct vertices array
        if (json.vertices && Array.isArray(json.vertices)) {
            try {
                this.vertices = json.vertices.map(v => new Vector2(v.x || 0, v.y || 0));
            } catch (e) {
                console.warn("Error reconstructing polygon vertices:", e);
                // Fallback to default triangle
                this.vertices = [
                    new Vector2(0, -50),
                    new Vector2(50, 50),
                    new Vector2(-50, 50)
                ];
            }
        }
        
        // Reconstruct offset Vector2
        if (json.offset && typeof json.offset === 'object') {
            try {
                this.offset = new Vector2(json.offset.x || 0, json.offset.y || 0);
            } catch (e) {
                console.warn("Error reconstructing polygon offset:", e);
                this.offset = new Vector2(0, 0);
            }
        }
        
        this.color = json.color || "#ffffff";
        this.fill = json.fill !== undefined ? json.fill : true;
        this.outline = json.outline !== undefined ? json.outline : false;
        this.outlineColor = json.outlineColor || "#000000";
        this.outlineWidth = json.outlineWidth || 2;
        
        // Call _onVerticesChanged to sync with RigidBody if needed
        if (this.gameObject) {
            this._onVerticesChanged();
        }
        
        return this;
    }
}

// Register the module globally
window.DrawPolygon = DrawPolygon;