// TODO: test orthographic
// TODO: add barycentric ?

import {Vec3} from '../math/Vec3.js';
import {Mat4} from '../math/Mat4.js';

const tempVec3a = new Vec3();
const tempVec3b = new Vec3();
const tempVec3c = new Vec3();
const tempMat4 = new Mat4();

export class Raycast {
    constructor(gl) {
        this.gl = gl;

        this.origin = new Vec3();
        this.direction = new Vec3();
    }

    // Set ray from mouse unprojection
    castMouse(camera, mouse = [0, 0]) {

        // Set origin
        // camera.worldMatrix.getTranslation(this.origin);
        this.origin.set(mouse[0], mouse[1], 0);

        // Set direction
        this.direction.set(mouse[0], mouse[1], 0.5);
        // camera.unproject(this.direction);
        // this.direction.sub(this.origin).normalize();
    }


    findIfHover(mesh) {
        if (!mesh.geometry.bounds) mesh.geometry.computeBoundingBox();

        let meshWidth = mesh.scale.x * (mesh.geometry.bounds.max.x - mesh.geometry.bounds.min.x)
        let meshHeight = mesh.scale.y * (mesh.geometry.bounds.max.y - mesh.geometry.bounds.min.y)

        if (this.origin.x >= mesh.position.x
            && this.origin.x <= (mesh.position.x + meshWidth)
            && this.origin.y <= mesh.position.y
            && this.origin.y >= (mesh.position.y - meshHeight)
        ) {
            return 1;
        }else{
            return 0;
        }
    }

    intersectBounds(meshes) {
        if (!Array.isArray(meshes)) meshes = [meshes];

        const invWorldMat4 = tempMat4;
        const origin = tempVec3a;
        const direction = tempVec3b;

        const hits = [];

        meshes.forEach(mesh => {

            // Create bounds
            if (!mesh.geometry.bounds) mesh.geometry.computeBoundingBox();
            if (mesh.geometry.raycast === 'sphere' && mesh.geometry.bounds === Infinity) mesh.geometry.computeBoundingSphere();

            // Take world space ray and make it object space to align with bounding box
            invWorldMat4.inverse(mesh.worldMatrix);
            origin.copy(this.origin).applyMatrix4(invWorldMat4);
            direction.copy(this.direction).transformDirection(invWorldMat4);

            let distance = 0;
            if (mesh.geometry.raycast === 'sphere') {
                distance = this.intersectSphere(mesh.geometry.bounds, origin, direction);
            } else {
                distance = this.findIfHover(mesh, origin, direction);
                // distance = this.intersectBox(mesh.geometry.bounds, origin, direction);
            }
            if (!distance) return;

            // Create object on mesh to avoid generating lots of objects
            if (!mesh.hit) mesh.hit = {localPoint: new Vec3()};

            mesh.hit.distance = distance;
            mesh.hit.localPoint.copy(direction).multiply(distance).add(origin);

            hits.push(mesh);
        });

        hits.sort((a, b) => a.hit.distance - b.hit.distance);
        return hits;
    }

    intersectSphere(sphere, origin = this.origin, direction = this.direction) {
        const ray = tempVec3c;
        ray.sub(sphere.center, origin);
        const tca = ray.dot(direction);
        const d2 = ray.dot(ray) - tca * tca;
        const radius2 = sphere.radius * sphere.radius;

        if (d2 > radius2) return 0;

        const thc = Math.sqrt(radius2 - d2);
        const t0 = tca - thc;
        const t1 = tca + thc;

        if (t0 < 0 && t1 < 0) return 0;

        if (t0 < 0) return t1;

        return t0;
    }

    // Ray AABB - Ray Axis aligned bounding box testing
    intersectBox(box, origin = this.origin, direction = this.direction) {
        let tmin, tmax, tYmin, tYmax, tZmin, tZmax;

        const invdirx = 1 / direction.x;
        const invdiry = 1 / direction.y;
        const invdirz = 1 / direction.z;

        const min = box.min;
        const max = box.max;

        tmin = ((invdirx >= 0 ? min.x : max.x) - origin.x) * invdirx;
        tmax = ((invdirx >= 0 ? max.x : min.x) - origin.x) * invdirx;

        tYmin = ((invdiry >= 0 ? min.y : max.y) - origin.y) * invdiry;
        tYmax = ((invdiry >= 0 ? max.y : min.y) - origin.y) * invdiry;

        if ((tmin > tYmax) || (tYmin > tmax)) return 0;

        if (tYmin > tmin) tmin = tYmin;
        if (tYmax < tmax) tmax = tYmax;

        tZmin = ((invdirz >= 0 ? min.z : max.z) - origin.z) * invdirz;
        tZmax = ((invdirz >= 0 ? max.z : min.z) - origin.z) * invdirz;

        if ((tmin > tZmax) || (tZmin > tmax)) return 0;
        if (tZmin > tmin) tmin = tZmin;
        if (tZmax < tmax) tmax = tZmax;

        if (tmax < 0) return 0;

        return tmin >= 0 ? tmin : tmax;
    }
}



