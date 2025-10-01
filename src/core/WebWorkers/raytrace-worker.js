self.onmessage = function(e) {
    const { 
        width, height, triangles, bgColor, 
        nearPlane, farPlane, fieldOfView 
    } = e.data;
    
    const data = new Uint8ClampedArray(width * height * 4);
    const aspect = width / height;
    const fovRadians = fieldOfView * (Math.PI / 180);
    const tanHalfFov = Math.tan(fovRadians * 0.5);
    
    // Fill with background color
    for (let i = 0; i < data.length; i += 4) {
        data[i] = bgColor.r;
        data[i + 1] = bgColor.g;
        data[i + 2] = bgColor.b;
        data[i + 3] = 255;
    }
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = (y * width + x) * 4;
            const u = (x / width) * 2 - 1;
            const v = 1 - (y / height) * 2;
            const rayDirX = 1;
            const rayDirY = u * tanHalfFov * aspect;
            const rayDirZ = v * tanHalfFov;
            const rayLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
            const rayDir = { x: rayDirX / rayLen, y: rayDirY / rayLen, z: rayDirZ / rayLen };
            const rayOrigin = { x: 0, y: 0, z: 0 };
            
            let closestT = Infinity;
            let hitColor = null;
            
            // Only test triangles that are within frustum (proper culling)
            for (let i = 0; i < triangles.length; i++) {
                const tri = triangles[i];

                // Proper frustum culling - check if triangle intersects frustum
                if (isTriangleInFrustum(tri.v0, tri.v1, tri.v2, nearPlane, farPlane)) {
                    const t = rayTriangleIntersect(rayOrigin, rayDir, tri.v0, tri.v1, tri.v2);
                    if (t !== null && t < closestT && t >= nearPlane && t <= farPlane) {
                        closestT = t;
                        hitColor = tri.color;
                    }
                }
            }
            
            if (hitColor) {
                data[pixelIdx] = hitColor.r;
                data[pixelIdx + 1] = hitColor.g;
                data[pixelIdx + 2] = hitColor.b;
            }
        }
    }
    
    self.postMessage({ data }, [data.buffer]);
};

function isTriangleInFrustum(v0, v1, v2, nearPlane, farPlane) {
    // Check if triangle intersects the viewing frustum
    // A triangle is visible if it intersects the frustum (between near and far planes)

    // Count vertices in front of near plane and behind far plane
    let inFrontNear = 0;
    let behindFar = 0;

    const vertices = [v0, v1, v2];

    for (const vertex of vertices) {
        if (vertex.x >= nearPlane) inFrontNear++;
        if (vertex.x <= farPlane) behindFar++;
    }

    // If all vertices are behind the far plane, cull
    if (behindFar === 0) return false;

    // If all vertices are in front of the near plane, include
    if (inFrontNear === 3) return true;

    // If some vertices are in front of near plane, include (even if others are behind)
    if (inFrontNear > 0) return true;

    // If no vertices are in front of near plane, but some are within far plane,
    // check if triangle intersects the near plane
    if (inFrontNear === 0 && behindFar > 0) {
        // All vertices are behind near plane but within far plane
        // Check if triangle plane intersects the near plane
        return doesTriangleIntersectNearPlane(v0, v1, v2, nearPlane);
    }

    return false;
}

function doesTriangleIntersectNearPlane(v0, v1, v2, nearPlane) {
    // Check if the triangle intersects the near plane
    // This handles cases where the triangle crosses the near plane

    const vertices = [v0, v1, v2];
    let positive = 0;
    let negative = 0;

    for (const vertex of vertices) {
        const distance = vertex.x - nearPlane;
        if (distance > 0.001) positive++;
        else if (distance < -0.001) negative++;
        else return true; // Vertex exactly on plane
    }

    // If all vertices are on the same side, no intersection
    if (positive === 3 || negative === 3) return false;

    // If vertices are on different sides, triangle intersects the plane
    return true;
}

function rayTriangleIntersect(origin, dir, v0, v1, v2) {
    const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    const h = {
        x: dir.y * edge2.z - dir.z * edge2.y,
        y: dir.z * edge2.x - dir.x * edge2.z,
        z: dir.x * edge2.y - dir.y * edge2.x
    };
    const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;
    if (Math.abs(a) < 0.0001) return null;
    const f = 1 / a;
    const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: origin.z - v0.z };
    const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);
    if (u < 0 || u > 1) return null;
    const q = {
        x: s.y * edge1.z - s.z * edge1.y,
        y: s.z * edge1.x - s.x * edge1.z,
        z: s.x * edge1.y - s.y * edge1.x
    };
    const v = f * (dir.x * q.x + dir.y * q.y + dir.z * q.z);
    if (v < 0 || u + v > 1) return null;
    const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);
    return t > 0.0001 ? t : null;
}