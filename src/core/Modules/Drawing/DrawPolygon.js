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
     * Ensure Vector2 objects are properly serialized
     */
    toJSON() {
        const json = super.toJSON();
        
        // Serialize vertices array - ensure each Vector2 is represented as an object
        if (this.vertices && Array.isArray(this.vertices)) {
            json.vertices = this.vertices.map(v => ({
                x: v.x || 0,
                y: v.y || 0
            }));
        }
        
        // Serialize offset Vector2
        if (this.offset) {
            json.offset = {
                x: this.offset.x || 0,
                y: this.offset.y || 0
            };
        }
        
        return json;
    }

    /**
     * Ensure Vector2 objects are properly reconstructed from serialized data
     * @param {Object} json - Serialized data
     */
    fromJSON(json) {
        super.fromJSON(json);
        
        // Reconstruct vertices array - check for valid data first
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
        
        // Reconstruct offset Vector2 - check for valid data first
        if (json.offset && typeof json.offset === 'object') {
            try {
                this.offset = new Vector2(json.offset.x || 0, json.offset.y || 0);
            } catch (e) {
                console.warn("Error reconstructing polygon offset:", e);
                this.offset = new Vector2(0, 0);
            }
        }
        
        // Don't call _onVerticesChanged here, as the gameObject may not be set yet
        // It will be called in onAttach
        
        return this;
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
        json.vertices = this.vertices.map(v => v.toJSON());
        json.offset = this.offset.toJSON();
        json.color = this.color;
        json.fill = this.fill;
        json.outline = this.outline;
        json.outlineColor = this.outlineColor;
        json.outlineWidth = this.outlineWidth;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        this.vertices = json.vertices.map(v => Vector2.fromJSON(v));
        this.offset = Vector2.fromJSON(json.offset) || new Vector2(0, 0);
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