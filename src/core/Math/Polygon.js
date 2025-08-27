class Polygon {
  constructor(parent, position, ...vectors) {
    this.vertices = vectors.map(v => v.sub(position)); // Local coordinates of vertices
    this.position = position; // Position of the parent object
    this.rotation = 0; // Rotation angle in radians

    this.math = new MatterMath();

    this.parent = parent; // Parent object

    this.originalVertices = this.vertices;
  }

  projectOntoAxis(axis) {
    let min = Infinity;
    let max = -Infinity;

    this.vertices.forEach(vertex => {
      const globalVertex = vertex.add(this.position);
      const projection = vertex.x * axis.x + vertex.y * axis.y;
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    });

    return ({ min, max });
  }

  collidesWith(otherPolygon) {
    if (this === otherPolygon) {
      return false;
    }

    const axes = this.getAxes().concat(otherPolygon.getAxes());

    for (let axis of axes) {
      const projection1 = this.projectOntoAxis(axis);
      const projection2 = otherPolygon.projectOntoAxis(axis);

      if (projection1.max < projection2.min || projection2.max < projection1.min) {
        // No collision
        return false;
      }
    }


    // Collision detected
    return true;
  }

  // Check if a point is within this polygon
  collisionPoint(x, y) {
    const polygon = this;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Snaps the parent objects position back to the edge of the other polygon
  snapPositionBack(otherPolygon) {
    const mtv = this.calculateMTV(otherPolygon);
    if (mtv) {
      // Move the parent object by the negative of the MTV
      this.parent.x -= mtv.x;
      this.parent.y -= mtv.y;
    }
  }

  easePositionBack(otherPolygon, steps = 10) {
    const mtv = this.calculateMTV(otherPolygon);
    const stepSize = { x: mtv.x / steps, y: mtv.y / steps };

    for (let i = 0; i < steps; i++) {
      this.parent.x -= stepSize.x;
      this.parent.y -= stepSize.y;
      // Update the game/rendering logic here
    }
  }

  calculateMTV(otherPolygon) {
    let minOverlap = Infinity;
    let mtv = { x: 0, y: 0 };

    // Iterate over all edges (axes) of both polygons
    const axes = this.getAxes().concat(otherPolygon.getAxes());
    for (const axis of axes) {
      const projection1 = this.projectOntoAxis(axis);
      const projection2 = otherPolygon.projectOntoAxis(axis);

      // Check for overlap (collision)
      const overlap = Math.min(projection1.max, projection2.max) - Math.max(projection1.min, projection2.min);
      if (overlap < 0) {
        // No overlap on this axis, no collision
        return null;
      }

      // Keep track of the smallest overlap (MTV)
      if (overlap < minOverlap) {
        minOverlap = overlap;
        mtv = { x: axis.x * overlap, y: axis.y * overlap }; // Create a new vector
      }
    }

    return mtv;
  }

  // Check for a collision between a line and this polygon
  collisionLine(x1, y1, x2, y2) {
    const polygon = this;

    // Check if both line endpoints are inside the polygon
    if (this.collisionPoint(x1, y1) || this.collisionLine(x2, y2)) {
      return true;
    }

    // Check if the line intersects any polygon edge
    for (let i = 0; i < polygon.length; i++) {
      const x3 = polygon[i][0];
      const y3 = polygon[i][1];
      const x4 = polygon[(i + 1) % polygon.length][0];
      const y4 = polygon[(i + 1) % polygon.length][1];

      if (this.collisionLineLine(x1, y1, x2, y2, x3, y3, x4, y4)) {
        return true;
      }
    }

    return false;
  }

  // Check for a collision between a line and this polygon
  collisionLineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const polygon = this;

    // Calculate the direction vectors of the lines
    const dx1 = x2 - x1;
    const dy1 = y2 - y1;
    const dx2 = x4 - x3;
    const dy2 = y4 - y3;

    // Calculate determinants
    const det = dx1 * dy2 - dx2 * dy1;
    const detInv = 1 / det;

    // Check if lines are parallel (det === 0)
    if (Math.abs(det) < 1e-6) {
      return false;
    }

    // Calculate intersection point
    const t1 = (x3 - x1) * dy2 - (y3 - y1) * dx2;
    const t2 = (x3 - x1) * dy1 - (y3 - y1) * dx1;
    const tIntersect1 = t1 * detInv;
    const tIntersect2 = t2 * detInv;

    // Check if intersection point lies within both line segments
    if (tIntersect1 >= 0 && tIntersect1 <= 1 && tIntersect2 >= 0 && tIntersect2 <= 1) {
      return true;
    }

    return false;
  }

  getAxes() {
    const axes = [];
    for (let i = 0; i < this.vertices.length; i++) {
      const p1 = this.vertices[i];
      const p2 = this.vertices[i + 1 === this.vertices.length ? 0 : i + 1];
      const edge = (new Vector2(p2.x - p1.x, p2.y - p1.y));
      const normal = (new Vector2(-edge.y, edge.x));
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      const norm = new Vector2(normal.x / length, normal.y / length);
      axes.push(norm);
    }
    return axes;
  }

  update(position, rotation) {
    this.position = position;
    const r = rotation % 360;
    this.rotation = this.math.degtorad(r);

    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    this.vertices = this.originalVertices.map(vertex => {
      const rotatedX = cos * vertex.x - sin * vertex.y;
      const rotatedY = sin * vertex.x + cos * vertex.y;

      // console.log(rotatedX);

      return (new Vector2(rotatedX + this.position.x, rotatedY + this.position.y));
    });
  }

  // Preset shapes
  static rectangle(position, width, height, parent) {
    return (new Polygon(parent, position, new Vector2(position.x - (width), position.y - (height)),
      new Vector2(position.x + (width), position.y - (height)),
      new Vector2(position.x + (width), position.y + (height)),
      new Vector2(position.x - (width), position.y + (height))
    ));
  }

  // A rounded shape with resolution as the number of points, at a position for the center point and a radius size
  static round(position, resolution, radius, parent) {
    const vertices = [];
    for (let i = 0; i < resolution; i++) {
      const angle = (i / resolution) * 2 * Math.PI;

      const x = position.x + radius * Math.cos(angle);
      const y = position.y + radius * Math.sin(angle);

      vertices.push(new Vector2(x, y));
    }

    return (new Polygon(parent, position, ...vertices));
  }

  draw(ctx, color) {
    ctx.save();
    ctx.strokeStyle = color || "white";
    ctx.beginPath();
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      const to = this.vertices[(i + 1) % this.vertices.length];
      if (i === 0) {
        ctx.moveTo(v.x, v.y);
      }
      ctx.lineTo(to.x, to.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  toJSON() {
    return {
      x: this.position.x,
      y: this.position.y,
      position: { x: this.position.x, y: this.position.y },
      rotation: this.rotation,
      vertices: this.vertices.map(v => ({ x: v.x, y: v.y }))
    };
  }
}

window.Polygon = Polygon;