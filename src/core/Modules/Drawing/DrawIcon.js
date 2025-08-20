class DrawIcon extends Module {
    static namespace = "Drawing";
    static description = "Draws a Font Awesome icon at the GameObject's position";
    static allowMultiple = false;
    static iconClass = "fas fa-icons";
    static iconColor = "#a200ffff";

    constructor() {
        super("IconDrawModule");

        this.icon = "fas fa-star";
        this.size = 48;
        this.color = "#FFD700";
        this.opacity = 1.0;

        this.exposeProperty("icon", "string", this.icon, {
            description: "Font Awesome icon class (e.g. 'fas fa-star')",
            onChange: val => { this.icon = val; }
        });
        this.exposeProperty("size", "number", this.size, {
            description: "Icon size in pixels",
            min: 8, max: 256, step: 1,
            onChange: val => { this.size = val; }
        });
        this.exposeProperty("color", "color", this.color, {
            description: "Icon color",
            onChange: val => { this.color = val; }
        });
        this.exposeProperty("opacity", "number", this.opacity, {
            description: "Icon opacity",
            min: 0, max: 1, step: 0.01,
            onChange: val => { this.opacity = val; }
        });

        // Create a hidden DOM element for rendering the icon to canvas
        this._iconElem = document.createElement("i");
        this._iconElem.style.position = "absolute";
        this._iconElem.style.visibility = "hidden";
        document.body.appendChild(this._iconElem);
    }

    style(style) {
        style.startGroup("Icon Settings", false, {
            backgroundColor: 'rgba(255,215,0,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("icon", "string", this.icon, {
            label: "Icon Class",
            description: "Font Awesome icon class"
        });
        style.exposeProperty("size", "number", this.size, {
            label: "Size (px)", min: 8, max: 256, step: 1
        });
        style.exposeProperty("color", "color", this.color, {
            label: "Color"
        });
        style.exposeProperty("opacity", "number", this.opacity, {
            label: "Opacity", min: 0, max: 1, step: 0.01
        });
        style.endGroup();
        style.addDivider();
        style.addHelpText(
            "Use any Font Awesome icon class, e.g. 'fas fa-star'. " +
            "See <a href='https://fontawesome.com/icons' target='_blank'>Font Awesome Icons</a>."
        );
    }

    draw(ctx) {
        // Prepare icon element
        this._iconElem.className = this.icon;
        this._iconElem.style.fontSize = this.size + "px";
        this._iconElem.style.color = this.color;
        this._iconElem.style.opacity = this.opacity;

        // Render icon to SVG, then to canvas
        // Get bounding box
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", this.size);
        svg.setAttribute("height", this.size);

        // Use foreignObject to render HTML icon
        const fo = document.createElementNS(svgNS, "foreignObject");
        fo.setAttribute("width", "100%");
        fo.setAttribute("height", "100%");
        fo.appendChild(this._iconElem.cloneNode(true));
        svg.appendChild(fo);

        // Serialize SVG and draw to canvas
        const img = new window.Image();
        const svgData = new XMLSerializer().serializeToString(svg);
        img.src = "data:image/svg+xml;base64," + btoa(svgData);

        // Draw image when loaded
        const pos = this.gameObject.position;
        img.onload = () => {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(img, -this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            icon: this.icon,
            size: this.size,
            color: this.color,
            opacity: this.opacity
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.icon = data.icon || "fas fa-star";
        this.size = data.size || 48;
        this.color = data.color || "#FFD700";
        this.opacity = data.opacity ?? 1.0;
    }
}

window.DrawIcon = DrawIcon;