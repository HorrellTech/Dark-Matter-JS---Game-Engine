class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        return mag === 0 ? new Vector2() : new Vector2(this.x / mag, this.y / mag);
    }

    distanceTo(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }

    // Static constructors
    static zero() { return new Vector2(0, 0); }
    static one() { return new Vector2(1, 1); }
    static up() { return new Vector2(0, 1); }
    static down() { return new Vector2(0, -1); }
    static left() { return new Vector2(-1, 0); }
    static right() { return new Vector2(1, 0); }
    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    static random() {
        return new Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    }

    // Basic operations
    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    sub(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        if (scalar === 0) throw new Error("Division by zero");
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    // Vector operations
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    cross(other) {
        return this.x * other.y - this.y * other.x;
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    normalize() {
        const mag = this.magnitude();
        return mag === 0 ? Vector2.zero() : this.divide(mag);
    }

    // Angle operations
    angle() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    // Utility methods
    distance(other) {
        return this.subtract(other).magnitude();
    }

    distanceSquared(other) {
        return this.subtract(other).magnitudeSquared();
    }

    lerp(other, t) {
        return new Vector2(
            this.x + (other.x - this.x) * t,
            this.y + (other.y - this.y) * t
        );
    }

    clamp(min, max) {
        return new Vector2(
            Math.min(Math.max(this.x, min.x), max.x),
            Math.min(Math.max(this.y, min.y), max.y)
        );
    }

    reflect(normal) {
        const dot = this.dot(normal);
        return this.subtract(normal.multiply(2 * dot));
    }

    project(other) {
        const normalized = other.normalize();
        return normalized.multiply(this.dot(normalized));
    }

    perpendicular() {
        return new Vector2(-this.y, this.x);
    }

    // Comparison methods
    equals(other, epsilon = 0.000001) {
        return Math.abs(this.x - other.x) < epsilon && 
               Math.abs(this.y - other.y) < epsilon;
    }

    // Conversion methods
    toString() {
        return `Vector2(${this.x}, ${this.y})`;
    }

    toArray() {
        return [this.x, this.y];
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    toJSON() {
        return { x: this.x, y: this.y };
    }

    // Public API methods
    static up() { return new Vector2(0, 1); }
    static down() { return new Vector2(0, -1); }
    static left() { return new Vector2(-1, 0); }
    static right() { return new Vector2(1, 0); }

    static zero() { return new Vector2(0, 0); }
    static one() { return new Vector2(1, 1); }
    
    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    static forward() { return Vector2.up(); }
    static back() { return Vector2.down(); }

    static fromJSON(data) {
        if (!data) return Vector2.zero();
        return new Vector2(data.x ?? 0, data.y ?? 0);
    }
}

window.Vector2 = Vector2;