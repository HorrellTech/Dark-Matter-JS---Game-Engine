class EditorGrid {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 32;
        this.showGrid = true;
        this.snapToGrid = false;
        this.gridColor = 'rgba(255, 255, 255, 0.1)';
    }

    draw() {
        if (!this.showGrid) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;

        // Draw vertical lines
        for (let x = 0; x <= w; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= h; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
    }

    snapPosition(position) {
        if (!this.snapToGrid) return position;
        return new Vector2(
            Math.round(position.x / this.gridSize) * this.gridSize,
            Math.round(position.y / this.gridSize) * this.gridSize
        );
    }
}
