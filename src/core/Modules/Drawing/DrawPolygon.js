class DrawPolygon extends Module {
    static namespace   = "Drawing";
    static description = "Draws a filled polygon at the GameObject's position";

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
                this._onVerticesChanged();
            }
        });
        
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

    _onVerticesChanged() {
        // if there's a Rigidbody on this object, sync its polygon verts
        const rb = this.gameObject.getModule("RigidBody") 
                || this.gameObject.getModule(RigidBody);
        if (rb) {
            rb.vertices = this.vertices.slice();
            rb.rebuildBody();
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
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

window.DrawPolygon = DrawPolygon;