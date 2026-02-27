export class Transform {
    constructor(a, b, c, d, e, f) {
        // [a, b, c, d, e, f] represents the 2D Affine Matrix
        this.values = [a, b, c, d, e, f];
    }

    /**
     * Instance method to chain a rotation onto the current transform.
     * Use: myTransform.rotate(Math.PI / 2)
     */
    rotate(angle) {
        const rot = Transform.rotation(angle);
        return this.multiply(rot);
    }

    /**
     * Instance method to chain a translation onto the current transform.
     * Use: myTransform.translate(100, 50)
     */
    translate(x, y) {
        const trans = Transform.translation(x, y);
        return this.multiply(trans);
    }

    static identity() {
        return new Transform(1, 0, 0, 0, 1, 0);
    }

    /**
     * Note: Keeping your -1 logic here so your baseline remains mirrored.
     */
    static translation(x, y) {
        return new Transform(-1, 0, x, 0, 1, y);
    }

    static flipX() {
        return new Transform(1, 0, 0, 0, 1, 0);
    }

    static rotation(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Transform(-cos, -sin, 0, sin, cos, 0);
    }

    static scale(s) {
        return new Transform(-s, 0, 0, 0, s, 0);
    }

    multiply(other) {
        const [a1, b1, c1, d1, e1, f1] = this.values;
        const [a2, b2, c2, d2, e2, f2] = other.values;
        
        return new Transform(
            a1 * a2 + b1 * d2,
            a1 * b2 + b1 * e2,
            a1 * c2 + b1 * f2 + c1,
            d1 * a2 + e1 * d2,
            d1 * b2 + e1 * e2,
            d1 * c2 + e1 * f2 + f1
        );
    }

    transformPoint(point) {
        const [a, b, c, d, e, f] = this.values;
        return {
            x: a * point.x + b * point.y + c,
            y: d * point.x + e * point.y + f
        };
    }

    static matchEdge(p1, p2, targetP1, targetP2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const tdx = targetP2.x - targetP1.x;
        const tdy = targetP2.y - targetP1.y;

        const srcLenSq = dx * dx + dy * dy;
        const tgtLenSq = tdx * tdx + tdy * tdy;
        
        if (srcLenSq === 0 || tgtLenSq === 0) {
            return Transform.translation(targetP1.x, targetP1.y);
        }
        
        const scale = Math.sqrt(tgtLenSq / srcLenSq);
        const rotation = Math.atan2(tdy, tdx) - Math.atan2(dy, dx);
        
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        const a = scale * cos;
        const b = -scale * sin;
        const d = scale * sin;
        const e = scale * cos;
        
        const c = targetP1.x - (a * p1.x + b * p1.y);
        const f = targetP1.y - (d * p1.x + e * p1.y);
        
        return new Transform(a, b, c, d, e, f);
    }
}