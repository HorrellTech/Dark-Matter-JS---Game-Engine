class EditorGrid {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.baseGridSize = 32;
        this.gridSize = this.baseGridSize;
        this.showGrid = true;
        this.snapToGrid = false;
        this.gridColor = 'rgba(255, 255, 255, 0.24)';
        this.subGridColor = 'rgba(255, 255, 255, 0.08)';
        this.minGridSize = 16; // Minimum grid size
        this.maxGridSize = 128; // Maximum grid size
    }

    draw(zoom = 1, cameraPosition = { x: 0, y: 0 }) {
        if (!this.showGrid) return;
        
        // Adjust grid size based on zoom
        this.adjustGridToZoom(zoom);
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Calculate grid offset based on camera position
        const offsetX = (cameraPosition.x % this.gridSize);
        const offsetY = (cameraPosition.y % this.gridSize);
        
        // Draw minor grid lines
        this.ctx.strokeStyle = this.subGridColor;
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = offsetX; x < w; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = offsetY; y < h; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        
        // Draw major grid lines
        const majorGridSize = this.gridSize * 5;
        const majorOffsetX = (cameraPosition.x % majorGridSize);
        const majorOffsetY = (cameraPosition.y % majorGridSize);
        
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;
        
        // Draw major vertical lines
        for (let x = majorOffsetX; x < w; x += majorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }

        // Draw major horizontal lines
        for (let y = majorOffsetY; y < h; y += majorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
    }

    snapValue(value) {
        if (!this.snapToGrid) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    adjustGridToZoom(zoom) {
        // Calculate grid size based on zoom level
        let newSize = this.baseGridSize * zoom;
        
        // Adjust grid size to stay within readable range
        if (newSize < this.minGridSize) {
            this.gridSize = this.baseGridSize / Math.ceil(this.minGridSize / newSize);
        } else if (newSize > this.maxGridSize) {
            this.gridSize = this.baseGridSize * Math.floor(newSize / this.maxGridSize);
        } else {
            this.gridSize = this.baseGridSize;
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