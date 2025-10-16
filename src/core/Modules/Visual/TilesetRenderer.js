/**
 * TilesetRenderer - Renders and edits a tilemap using a SpriteRenderer's tileset image
 * 
 * This module manages a tilemap by referencing a SpriteRenderer for the tileset image,
 * allowing you to paint tiles from that tileset onto a grid in the editor.
 */
class TilesetRenderer extends Module {
    static allowMultiple = false;
    static namespace = "Visual";
    static description = "Renders and edits a tilemap from a SpriteRenderer tileset";
    static iconClass = "fas fa-th";

    constructor() {
        super("TilesetRenderer");

        this.require("SpriteRenderer");

        // Reference to the SpriteRenderer that contains the tileset image
        this.spriteRendererRef = null;

        // Tileset grid dimensions (how many tiles in the source image)
        this.tilesHorizontal = 8;
        this.tilesVertical = 8;

        // Map dimensions (how many tiles wide/tall to paint)
        this.mapWidth = 10;
        this.mapHeight = 10;

        // Tile data storage (2D conceptually, stored as 1D array: index = y * mapWidth + x)
        this.tileData = [];
        this.initializeTileData();

        // Current selected tile from the tileset (x, y in the tileset grid)
        this.selectedTileX = 0;
        this.selectedTileY = 0;

        // Display properties
        this.visible = true;
        this.opacity = 1.0;

        // Gizmo properties for editor
        this.showGridGizmo = true;
        this.showTileSelection = true;
        this.gridColor = "rgba(255, 255, 255, 0.3)";
        this.selectedTileColor = "rgba(255, 255, 0, 0.5)";
        this.selectedPointColor = "rgba(0, 150, 255, 0.8)";

        // Editor mode
        this.editorMode = "paint"; // "paint", "erase", "select"
        this.isPainting = false;
        this.lastPaintX = -1;
        this.lastPaintY = -1;

        // Gizmo interaction state
        this.hoveredTileX = -1;
        this.hoveredTileY = -1;
        this.isDraggingTile = false;
        this.dragStartX = -1;
        this.dragStartY = -1;

        // Internal state
        this._tilesetImage = null;
        this._isLoaded = false;
        this._imageWidth = 0;
        this._imageHeight = 0;
        this._tileWidth = 0;
        this._tileHeight = 0;

        this.setupProperties();
    }

    /**
     * Initialize empty tile data
     */
    initializeTileData() {
        const size = this.mapWidth * this.mapHeight;
        this.tileData = new Array(size).fill(-1); // -1 = empty tile
    }

    /**
     * Setup inspector properties
     */
    setupProperties() {
        this.clearProperties();

        /*this.exposeProperty("spriteRendererRef", "reference", this.spriteRendererRef, {
            description: "Reference to the SpriteRenderer containing the tileset image",
            onChange: (value) => {
                this.spriteRendererRef = value;
                this.loadTilesetFromSpriteRenderer();
            }
        });*/

        this.exposeProperty("tilesHorizontal", "number", this.tilesHorizontal, {
            description: "Number of tiles horizontally in the tileset",
            min: 1, max: 32, step: 1,
            onChange: (value) => {
                this.tilesHorizontal = value;
                this.updateTileDimensions();
                // window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("tilesVertical", "number", this.tilesVertical, {
            description: "Number of tiles vertically in the tileset",
            min: 1, max: 32, step: 1,
            onChange: (value) => {
                this.tilesVertical = value;
                this.updateTileDimensions();
                // window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("mapWidth", "number", this.mapWidth, {
            description: "Width of the tilemap in tiles",
            min: 1, max: 256, step: 1,
            onChange: (value) => {
                this.resizeMap(value, this.mapHeight);
            }
        });

        this.exposeProperty("mapHeight", "number", this.mapHeight, {
            description: "Height of the tilemap in tiles",
            min: 1, max: 256, step: 1,
            onChange: (value) => {
                this.resizeMap(this.mapWidth, value);
            }
        });

        this.exposeProperty("visible", "boolean", this.visible, {
            description: "Whether the tilemap is visible",
            onChange: (value) => {
                this.visible = value;
                // window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("opacity", "number", this.opacity, {
            description: "Opacity of the tilemap",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => {
                this.opacity = value;
                // window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("showGridGizmo", "boolean", this.showGridGizmo, {
            description: "Show grid lines in editor",
            onChange: (value) => {
                this.showGridGizmo = value;
                // window.editor?.refreshCanvas();
            }
        });

        this.exposeProperty("editorMode", "enum", this.editorMode, {
            description: "Editor mode",
            options: ["paint", "erase", "select"],
            onChange: (value) => {
                this.editorMode = value;
            }
        });

        this.exposeProperty("selectedTileX", "number", this.selectedTileX, {
            description: "Selected tile X in the tileset",
            min: 0, max: 31, step: 1,
            onChange: (value) => {
                this.selectedTileX = Math.max(0, Math.min(value, this.tilesHorizontal - 1));
            }
        });

        this.exposeProperty("selectedTileY", "number", this.selectedTileY, {
            description: "Selected tile Y in the tileset",
            min: 0, max: 31, step: 1,
            onChange: (value) => {
                this.selectedTileY = Math.max(0, Math.min(value, this.tilesVertical - 1));
            }
        });
    }

    clearProperties() {
        if (this.properties) {
            for (const prop in this.properties) {
                if (this.properties.hasOwnProperty(prop)) {
                    delete this.properties[prop];
                }
            }
        }
    }

    refreshInspector() {
        if (window.editor && window.editor.inspector) {
            if (window.editor.inspector.clearModuleCache) {
                window.editor.inspector.clearModuleCache(this);
            }
            window.editor.inspector.refreshModuleUI(this);
        }
    }

    /**
     * Load tileset from referenced SpriteRenderer
     */
    loadTilesetFromSpriteRenderer() {
        if (!this.spriteRendererRef) {
            this.spriteRendererRef = this.getModule("SpriteRenderer");
            //return;
        }

        // Get the image from the SpriteRenderer
        if (this.spriteRendererRef._image && this.spriteRendererRef._isLoaded) {
            this.spriteRendererRef.visible = false; // Hide the sprite itself
            this._tilesetImage = this.spriteRendererRef._image;
            this._imageWidth = this.spriteRendererRef._imageWidth;
            this._imageHeight = this.spriteRendererRef._imageHeight;
            this._isLoaded = true;
            this.updateTileDimensions();
            // window.editor?.refreshCanvas();
        }
    }

    /**
     * Update calculated tile dimensions based on tileset image size
     */
    updateTileDimensions() {
        if (!this._tilesetImage || !this._isLoaded) {
            this._tileWidth = 32;
            this._tileHeight = 32;
            return;
        }

        this._tileWidth = Math.floor(this._imageWidth / this.tilesHorizontal);
        this._tileHeight = Math.floor(this._imageHeight / this.tilesVertical);
    }

    /**
     * Resize the tilemap
     */
    resizeMap(newWidth, newHeight) {
        const newData = new Array(newWidth * newHeight).fill(-1);

        // Copy existing data
        for (let y = 0; y < Math.min(this.mapHeight, newHeight); y++) {
            for (let x = 0; x < Math.min(this.mapWidth, newWidth); x++) {
                newData[y * newWidth + x] = this.tileData[y * this.mapWidth + x];
            }
        }

        this.mapWidth = newWidth;
        this.mapHeight = newHeight;
        this.tileData = newData;
        //this.refreshInspector();
    }

    /**
     * Paint a tile at map coordinates
     */
    paintTile(mapX, mapY) {
        if (this.isValidMapPosition(mapX, mapY)) {
            const tileIndex = this.selectedTileY * this.tilesHorizontal + this.selectedTileX;
            this.tileData[mapY * this.mapWidth + mapX] = tileIndex;
        }
    }

    /**
     * Erase a tile at map coordinates
     */
    eraseTile(mapX, mapY) {
        if (this.isValidMapPosition(mapX, mapY)) {
            this.tileData[mapY * this.mapWidth + mapX] = -1;
        }
    }

    /**
     * Check if map position is valid
     */
    isValidMapPosition(mapX, mapY) {
        return mapX >= 0 && mapX < this.mapWidth && mapY >= 0 && mapY < this.mapHeight;
    }

    /**
     * Get map coordinates from world position
     */
    getMapCoordinatesFromWorld(worldX, worldY) {
        const worldPos = this.gameObject?.getWorldPosition() || new Vector2(0, 0);
        const localX = worldX - worldPos.x;
        const localY = worldY - worldPos.y;

        const mapX = Math.floor(localX / this._tileWidth);
        const mapY = Math.floor(localY / this._tileHeight);

        return { mapX, mapY };
    }

    /**
     * Get world coordinates from map position
     */
    getWorldCoordinatesFromMap(mapX, mapY) {
        const worldPos = this.gameObject?.getWorldPosition() || new Vector2(0, 0);
        const worldX = worldPos.x + mapX * this._tileWidth;
        const worldY = worldPos.y + mapY * this._tileHeight;
        return { worldX, worldY };
    }

    /**
     * Get tile at map coordinates (-1 if empty or invalid)
     */
    getTile(mapX, mapY) {
        if (!this.isValidMapPosition(mapX, mapY)) {
            return -1;
        }
        return this.tileData[mapY * this.mapWidth + mapX];
    }

    /**
     * Set tile at map coordinates
     */
    setTile(mapX, mapY, tileIndex) {
        if (this.isValidMapPosition(mapX, mapY)) {
            this.tileData[mapY * this.mapWidth + mapX] = tileIndex;
        }
    }

    /**
     * Get tile at world coordinates
     */
    getTileAtWorld(worldX, worldY) {
        const { mapX, mapY } = this.getMapCoordinatesFromWorld(worldX, worldY);
        return this.getTile(mapX, mapY);
    }

    /**
     * Check if world position has a tile (not empty)
     */
    hasTileAtWorld(worldX, worldY) {
        return this.getTileAtWorld(worldX, worldY) !== -1;
    }

    /**
     * Get tile bounds in world space
     */
    getTileBoundsWorld(mapX, mapY) {
        const { worldX, worldY } = this.getWorldCoordinatesFromMap(mapX, mapY);
        return {
            x: worldX,
            y: worldY,
            width: this._tileWidth,
            height: this._tileHeight,
            minX: worldX,
            minY: worldY,
            maxX: worldX + this._tileWidth,
            maxY: worldY + this._tileHeight
        };
    }

    /**
     * Get all tiles in a rectangular region (world space)
     */
    getTilesInRegion(minWorldX, minWorldY, maxWorldX, maxWorldY) {
        const minCoord = this.getMapCoordinatesFromWorld(minWorldX, minWorldY);
        const maxCoord = this.getMapCoordinatesFromWorld(maxWorldX, maxWorldY);

        const tiles = [];
        for (let y = minCoord.mapY; y <= maxCoord.mapY; y++) {
            for (let x = minCoord.mapX; x <= maxCoord.mapX; x++) {
                if (this.isValidMapPosition(x, y)) {
                    const tileIndex = this.getTile(x, y);
                    if (tileIndex !== -1) {
                        tiles.push({
                            mapX: x,
                            mapY: y,
                            tileIndex: tileIndex,
                            bounds: this.getTileBoundsWorld(x, y)
                        });
                    }
                }
            }
        }
        return tiles;
    }

    /**
     * Get map bounds in world space
     */
    getMapBoundsWorld() {
        const worldPos = this.gameObject?.getWorldPosition() || new Vector2(0, 0);
        return {
            x: worldPos.x,
            y: worldPos.y,
            width: this.mapWidth * this._tileWidth,
            height: this.mapHeight * this._tileHeight,
            minX: worldPos.x,
            minY: worldPos.y,
            maxX: worldPos.x + this.mapWidth * this._tileWidth,
            maxY: worldPos.y + this.mapHeight * this._tileHeight
        };
    }

    /**
     * Clear the tilemap
     */
    clearMap() {
        this.initializeTileData();
    }

    /**
     * Fill the entire map with a tile
     */
    fillMap(tileX, tileY) {
        const tileIndex = tileY * this.tilesHorizontal + tileX;
        if (tileIndex >= 0 && tileIndex < (this.tilesHorizontal * this.tilesVertical)) {
            this.tileData.fill(tileIndex);
        }
    }

    /**
     * Export tilemap data
     */
    exportData() {
        return {
            tilesHorizontal: this.tilesHorizontal,
            tilesVertical: this.tilesVertical,
            mapWidth: this.mapWidth,
            mapHeight: this.mapHeight,
            tileData: [...this.tileData],
            selectedTileX: this.selectedTileX,
            selectedTileY: this.selectedTileY
        };
    }

    /**
     * Import tilemap data
     */
    importData(data) {
        if (data.tilesHorizontal) this.tilesHorizontal = data.tilesHorizontal;
        if (data.tilesVertical) this.tilesVertical = data.tilesVertical;
        if (data.mapWidth) this.mapWidth = data.mapWidth;
        if (data.mapHeight) this.mapHeight = data.mapHeight;
        if (data.tileData) this.tileData = [...data.tileData];
        if (data.selectedTileX !== undefined) this.selectedTileX = data.selectedTileX;
        if (data.selectedTileY !== undefined) this.selectedTileY = data.selectedTileY;
        this.updateTileDimensions();
    }

    start() {
        //this.loadTilesetFromSpriteRenderer();
    }

    loop(deltaTime) {
        // Update logic
    }

    /**
     * Draw the tilemap using viewport culling
     */
    draw(ctx) {
        if(!this.spriteRendererRef) {
            this.spriteRendererRef = this.getModule("SpriteRenderer");
            this.loadTilesetFromSpriteRenderer();
        }

        if (!this.visible || !this._tilesetImage || !this._isLoaded) {
            return;
        }

        const viewport = this.viewport;
        if (!viewport) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Calculate which tiles are visible in the viewport
        const viewMinX = viewport.x - viewport.width / 2;
        const viewMaxX = viewport.x + viewport.width / 2;
        const viewMinY = viewport.y - viewport.height / 2;
        const viewMaxY = viewport.y + viewport.height / 2;

        const visibleTiles = this.getTilesInRegion(viewMinX, viewMinY, viewMaxX, viewMaxY);

        // Draw only visible tiles
        for (const tile of visibleTiles) {
            if (tile.tileIndex >= 0) {
                this.drawTile(ctx, tile.mapX, tile.mapY, tile.tileIndex);
            }
        }

        ctx.restore();
    }

    /**
     * Draw a single tile from the tileset
     */
    drawTile(ctx, mapX, mapY, tileIndex) {
        if (!this._tilesetImage) return;

        const tileX = tileIndex % this.tilesHorizontal;
        const tileY = Math.floor(tileIndex / this.tilesHorizontal);

        const srcX = tileX * this._tileWidth;
        const srcY = tileY * this._tileHeight;

        const { worldX, worldY } = this.getWorldCoordinatesFromMap(mapX, mapY);

        ctx.drawImage(
            this._tilesetImage,
            srcX, srcY, this._tileWidth, this._tileHeight,
            worldX, worldY, this._tileWidth, this._tileHeight
        );
    }

    /**
     * Draw gizmos for editor (grid and tile selection)
     */
    drawGizmos(ctx) {
        if (!this.gameObject) return;

        const worldPos = this.gameObject.getWorldPosition();

        ctx.save();

        // Draw tilemap grid
        if (this.showGridGizmo) {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 1;

            // Vertical lines
            for (let x = 0; x <= this.mapWidth; x++) {
                const startX = worldPos.x + x * this._tileWidth;
                const startY = worldPos.y;
                const endY = startY + this.mapHeight * this._tileHeight;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX, endY);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= this.mapHeight; y++) {
                const startY = worldPos.y + y * this._tileHeight;
                const startX = worldPos.x;
                const endX = startX + this.mapWidth * this._tileWidth;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, startY);
                ctx.stroke();
            }
        }

        // Draw outer boundary
        ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            worldPos.x,
            worldPos.y,
            this.mapWidth * this._tileWidth,
            this.mapHeight * this._tileHeight
        );

        // Draw selected tile preview
        if (this.showTileSelection && this._tilesetImage) {
            const previewX = worldPos.x + this.selectedTileX * this._tileWidth;
            const previewY = worldPos.y + this.selectedTileY * this._tileHeight;

            ctx.fillStyle = this.selectedTileColor;
            ctx.fillRect(previewX, previewY, this._tileWidth, this._tileHeight);

            ctx.strokeStyle = "rgba(255, 255, 0, 1)";
            ctx.lineWidth = 2;
            ctx.strokeRect(previewX, previewY, this._tileWidth, this._tileHeight);
        }

        // Draw hovered tile
        if (this.hoveredTileX >= 0 && this.hoveredTileY >= 0 && this.isValidMapPosition(this.hoveredTileX, this.hoveredTileY)) {
            const hoveredX = worldPos.x + this.hoveredTileX * this._tileWidth;
            const hoveredY = worldPos.y + this.hoveredTileY * this._tileHeight;

            ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(hoveredX, hoveredY, this._tileWidth, this._tileHeight);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    /**
     * Handle gizmo interaction from the editor
     */
    handleGizmoInteraction(worldPos, isClick = false) {
        if (!this.showGridGizmo) return null;

        if (isClick) {
            return this.onMouseDown(worldPos.x, worldPos.y, 0);
        } else {
            return this.onMouseMove(worldPos.x, worldPos.y);
        }
    }

    /**
     * Handle mouse down - only when Ctrl is held
     */
    onMouseDown(worldX, worldY, button) {
        if (!this.gameObject || !this._isLoaded) return false;

        const { mapX, mapY } = this.getMapCoordinatesFromWorld(worldX, worldY);

        if (!this.isValidMapPosition(mapX, mapY)) return false;

        if (this.editorMode === "paint") {
            this.paintTile(mapX, mapY);
            this.isPainting = true;
            this.lastPaintX = mapX;
            this.lastPaintY = mapY;
            //// window.editor?.refreshCanvas();
            return true;
        } else if (this.editorMode === "erase") {
            this.eraseTile(mapX, mapY);
            this.isPainting = true;
            this.lastPaintX = mapX;
            this.lastPaintY = mapY;
            //// window.editor?.refreshCanvas();
            return true;
        } else if (this.editorMode === "select") {
            this.selectedTileX = mapX;
            this.selectedTileY = mapY;
            //this.refreshInspector();
            //// window.editor?.refreshCanvas();
            return true;
        }

        return false;
    }

    /**
     * Handle mouse move
     */
    onMouseMove(worldX, worldY) {
        if (!this.gameObject) return false;

        const { mapX, mapY } = this.getMapCoordinatesFromWorld(worldX, worldY);

        // Update hover state
        if (this.isValidMapPosition(mapX, mapY)) {
            this.hoveredTileX = mapX;
            this.hoveredTileY = mapY;
        } else {
            this.hoveredTileX = -1;
            this.hoveredTileY = -1;
        }

        // Continue painting if mouse is down
        if (this.isPainting && this.isValidMapPosition(mapX, mapY)) {
            if (mapX !== this.lastPaintX || mapY !== this.lastPaintY) {
                if (this.editorMode === "paint") {
                    this.paintTile(mapX, mapY);
                } else if (this.editorMode === "erase") {
                    this.eraseTile(mapX, mapY);
                }
                this.lastPaintX = mapX;
                this.lastPaintY = mapY;
                // window.editor?.refreshCanvas();
            }
            return true;
        }

        return this.hoveredTileX >= 0;
    }

    /**
     * Handle mouse up
     */
    onMouseUp(worldX, worldY, button) {
        if (this.isPainting) {
            this.isPainting = false;
            this.lastPaintX = -1;
            this.lastPaintY = -1;
            // window.editor?.refreshCanvas();
            return true;
        }
        return false;
    }

    /**
     * Serialization
     */
    toJSON() {
        const json = super.toJSON() || {};
        json.tilesHorizontal = this.tilesHorizontal;
        json.tilesVertical = this.tilesVertical;
        json.mapWidth = this.mapWidth;
        json.mapHeight = this.mapHeight;
        json.tileData = [...this.tileData];
        json.selectedTileX = this.selectedTileX;
        json.selectedTileY = this.selectedTileY;
        json.visible = this.visible;
        json.opacity = this.opacity;
        return json;
    }

    /**
     * Deserialization
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        if (json.tilesHorizontal !== undefined) this.tilesHorizontal = json.tilesHorizontal;
        if (json.tilesVertical !== undefined) this.tilesVertical = json.tilesVertical;
        if (json.mapWidth !== undefined) this.mapWidth = json.mapWidth;
        if (json.mapHeight !== undefined) this.mapHeight = json.mapHeight;
        if (json.tileData !== undefined) this.tileData = [...json.tileData];
        if (json.selectedTileX !== undefined) this.selectedTileX = json.selectedTileX;
        if (json.selectedTileY !== undefined) this.selectedTileY = json.selectedTileY;
        if (json.visible !== undefined) this.visible = json.visible;
        if (json.opacity !== undefined) this.opacity = json.opacity;

        this.updateTileDimensions();
    }
}

window.TilesetRenderer = TilesetRenderer;