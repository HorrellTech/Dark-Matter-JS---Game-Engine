/**
 * Vector3 - A 3D vector implementation for the Dark Matter JS engine
 */
class Vector3 {
    /**
     * Create a new Vector3
     * @param {number} x - X component
     * @param {number} y - Y component
     * @param {number} z - Z component
     */
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Clone this vector
     * @returns {Vector3} A new vector with the same values
     */
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * Add a vector to this one
     * @param {Vector3} v - Vector to add
     * @returns {Vector3} New vector with the result
     */
    add(v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    /**
     * Subtract a vector from this one
     * @param {Vector3} v - Vector to subtract
     * @returns {Vector3} New vector with the result
     */
    subtract(v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    /**
     * Multiply this vector by a scalar value
     * @param {number} scalar - Value to multiply by
     * @returns {Vector3} New vector with the result
     */
    multiply(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    /**
     * Calculate the dot product of this vector and another
     * @param {Vector3} v - The other vector
     * @returns {number} The dot product
     */
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * Calculate the cross product of this vector and another
     * @param {Vector3} v - The other vector
     * @returns {Vector3} New vector with the result
     */
    cross(v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    /**
     * Calculate the magnitude (length) of this vector
     * @returns {number} The magnitude
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Normalize this vector (make it unit length)
     * @returns {Vector3} A new normalized vector
     */
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return this.clone();
        return new Vector3(this.x / mag, this.y / mag, this.z / mag);
    }

    /**
     * Convert this vector to a 2D vector by projecting onto XY plane
     * @returns {Vector2} 2D projection of this vector
     */
    toVector2() {
        return new Vector2(this.x, this.y);
    }

    /**
     * Create a Vector3 from a Vector2 by setting Z to 0
     * @param {Vector2} v2 - The 2D vector
     * @returns {Vector3} A new 3D vector
     */
    static fromVector2(v2, z = 0) {
        return new Vector3(v2.x, v2.y, z);
    }

    /**
     * Calculate the distance between this vector and another
     * @param {Vector3} v - The other vector
     * @returns {number} The distance
     */
    distance(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Rotate this vector around the X axis
     * @param {number} angle - Rotation angle in radians
     * @returns {Vector3} The rotated vector
     */
    rotateX(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const y = this.y * cos - this.z * sin;
        const z = this.y * sin + this.z * cos;
        return new Vector3(this.x, y, z);
    }

    /**
     * Rotate this vector around the Y axis
     * @param {number} angle - Rotation angle in radians
     * @returns {Vector3} The rotated vector
     */
    rotateY(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos + this.z * sin;
        const z = -this.x * sin + this.z * cos;
        return new Vector3(x, this.y, z);
    }

    /**
     * Rotate this vector around the Z axis
     * @param {number} angle - Rotation angle in radians
     * @returns {Vector3} The rotated vector
     */
    rotateZ(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        return new Vector3(x, y, this.z);
    }

    /**
     * Convert to a string representation
     * @returns {string} String representation of the vector
     */
    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}

// Make the Vector3 class available globally
window.Vector3 = Vector3;