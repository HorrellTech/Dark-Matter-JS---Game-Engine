class DragGameObject extends Module {
    static namespace = "Movement";
    static description = "Allows dragging a game object with the mouse";
    static allowMultiple = false;

    constructor() {
        super("DragGameObject");
        this.isDragging = false;
        this.offset = { x: 0, y: 0 };
    }

    loop(deltaTime) {
        const mouse = window.input.getMousePosition(true);
        const leftDown = window.input.mouseDown("left");
        const leftPressed = window.input.mousePressed("left");
        const leftReleased = window.input.mouseReleased("left");

        // Get bounds
        const obj = this.gameObject;
        const halfW = obj.size.x / 2;
        const halfH = obj.size.y / 2;
        const minX = obj.position.x - halfW;
        const maxX = obj.position.x + halfW;
        const minY = obj.position.y - halfH;
        const maxY = obj.position.y + halfH;

        // Start dragging if mouse pressed inside bounds
        if (leftPressed && !this.isDragging) {
            if (
                mouse.x >= minX && mouse.x <= maxX &&
                mouse.y >= minY && mouse.y <= maxY
            ) {
                this.isDragging = true;
                this.offset.x = obj.position.x - mouse.x;
                this.offset.y = obj.position.y - mouse.y;
            }
        }

        // Dragging
        if (this.isDragging && leftDown) {
            obj.position.x = mouse.x + this.offset.x;
            obj.position.y = mouse.y + this.offset.y;
        }

        // Stop dragging on mouse release
        if (this.isDragging && leftReleased) {
            this.isDragging = false;
        }
    }
}