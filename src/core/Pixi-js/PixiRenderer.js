class PixiRenderer {
    constructor(canvas, width = 800, height = 600, options = {}) {
        console.log("PixiRenderer constructor called");
        this.app = new PIXI.Application({
            view: canvas,
            width,
            height,
            backgroundColor: this.stringToHex(options.backgroundColor) || 0x000000,
            antialias: options.antialias !== undefined ? options.antialias : true,
            resolution: window.devicePixelRatio || 1
        });
        this.graphics = new PIXI.Graphics();
        this.app.stage.addChild(this.graphics);

        this._fillColor = undefined;
        this._strokeColor = undefined;
        this._lineWidth = 1;
        this._font = '16px Arial';
        this._textAlign = 'left';
    }

    stringToHex(color) {
        if (PIXI && PIXI.utils && PIXI.utils.string2hex) {
            return PIXI.utils.string2hex(color);
        }
        // Fallback: handle #RRGGBB or #RGB
        if (typeof color === "string" && color.startsWith("#")) {
            return parseInt(color.slice(1), 16);
        }
        // Default to white
        return 0xffffff;
    }

    async Init() {
        if(this.app) {
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }

    // API
    clear() {
        this.graphics.clear();
    }

    setFillStyle(color) {
        this._fillColor = PIXI.utils.string2hex(color);
    }

    setStrokeStyle(color, lineWidth = 1) {
        this._strokeColor = PIXI.utils.string2hex(color);
        this._lineWidth = lineWidth;
    }

    drawRect(x, y, width, height) {
        if (this._fillColor !== undefined) {
            this.graphics.beginFill(this._fillColor);
        }
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.drawRect(x, y, width, height);
        this.graphics.endFill();
    }

    drawCircle(x, y, radius) {
        if (this._fillColor !== undefined) {
            this.graphics.beginFill(this._fillColor);
        }
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.drawCircle(x, y, radius);
        this.graphics.endFill();
    }

    drawLine(x1, y1, x2, y2) {
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
    }

    drawText(text, x, y, style = {}) {
        const pixiText = new PIXI.Text(text, style);
        pixiText.x = x;
        pixiText.y = y;
        this.app.stage.addChild(pixiText);
    }

    // For images, use PIXI.Texture.from(imageSrc)
    drawImage(texture, x, y, width, height) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        if (width && height) {
            sprite.width = width;
            sprite.height = height;
        }
        this.app.stage.addChild(sprite);
    }

    setGlobalAlpha(alpha) {
        this.graphics.alpha = alpha;
    }

    setFont(font) {
        this._font = font;
    }

    setTextAlign(align) {
        this._textAlign = align;
    }

    drawEllipse(x, y, width, height) {
        if (this._fillColor !== undefined) {
            this.graphics.beginFill(this._fillColor);
        }
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.drawEllipse(x, y, width, height);
        this.graphics.endFill();
    }

    drawArc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
        if (this._fillColor !== undefined) {
            this.graphics.beginFill(this._fillColor);
        }
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.arc(x, y, radius, startAngle, endAngle, anticlockwise);
        this.graphics.endFill();
    }

    arc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
        if (this._fillColor !== undefined) {
            this.graphics.beginFill(this._fillColor);
        }
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.arc(x, y, radius, startAngle, endAngle, anticlockwise);
        this.graphics.endFill();
    }

    drawPolygon(points) {
        if (this._fillColor !== undefined) {
            this.graphics.beginFill(this._fillColor);
        }
        if (this._strokeColor !== undefined) {
            this.graphics.lineStyle(this._lineWidth || 1, this._strokeColor);
        }
        this.graphics.drawPolygon(points);
        this.graphics.endFill();
    }

    fill() {
        this.graphics.endFill();
    }

    stroke() {
        this.graphics.endFill();
    }

    beginPath() {
        this.graphics.beginPath();
    }

    closePath() {
        this.graphics.closePath();
    }

    moveTo(x, y) {
        this.graphics.moveTo(x, y);
    }

    lineTo(x, y) {
        this.graphics.lineTo(x, y);
    }

    arcTo(x1, y1, x2, y2, radius) {
        // Pixi does not support arcTo directly, will need to work around it
    }

    setLineDash(segments) {
        // Pixi does not support line dash natively; you may need a workaround
    }

    setShadow(color, blur, offsetX, offsetY) {
        // Pixi supports shadow via filters, but not directly on Graphics
        // You can use PIXI.filters.DropShadowFilter if needed
    }

    setCompositeOperation(mode) {
        // Pixi supports blend modes via graphics.blendMode
        this.graphics.blendMode = PIXI.BLEND_MODES[mode.toUpperCase()] || PIXI.BLEND_MODES.NORMAL;
    }

    save() {
        // Pixi does not support save/restore on Graphics, but you can implement a stack for transforms
        if (!this._transformStack) this._transformStack = [];
        this._transformStack.push({
            x: this.graphics.x,
            y: this.graphics.y,
            rotation: this.graphics.rotation,
            scaleX: this.graphics.scale.x,
            scaleY: this.graphics.scale.y,
            alpha: this.graphics.alpha
        });
    }

    restore() {
        if (this._transformStack && this._transformStack.length > 0) {
            const t = this._transformStack.pop();
            this.graphics.x = t.x;
            this.graphics.y = t.y;
            this.graphics.rotation = t.rotation;
            this.graphics.scale.x = t.scaleX;
            this.graphics.scale.y = t.scaleY;
            this.graphics.alpha = t.alpha;
        }
    }

    translate(x, y) {
        this.graphics.x += x;
        this.graphics.y += y;
    }

    rotate(angle) {
        this.graphics.rotation += angle;
    }

    scale(x, y) {
        this.graphics.scale.x *= x;
        this.graphics.scale.y *= y;
    }

    render() {
        if (this.app.renderer && this.app.stage) {
            this.app.renderer.render(this.app.stage);
        }
        /*else {
            console.warn("PixiRenderer: Renderer or stage not available.");
        }*/
    }

    addDisplayObject(obj) {
        this.app.stage.addChild(obj);
    }

    removeDisplayObject(obj) {
        this.app.stage.removeChild(obj);
    }
}

window.PixiRenderer = PixiRenderer;