export class Matrix {
    constructor(a, b, c, d, e, f) {
        this.values = [a, b, c, d, e, f];
    }
    
    static identity() {
        return new Matrix(1, 0, 0, 0, 1, 0);
    }
    
    static flipX() {
        return new Matrix(-1, 0, 0, 0, 1, 0);
    }
    
    static rotation(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Matrix(cos, -sin, 0, sin, cos, 0);
    }
    
    static translation(x, y) {
        return new Matrix(1, 0, x, 0, 1, y);
    }
    
    static scale(s) {
        return new Matrix(s, 0, 0, 0, s, 0);
    }
    
    multiply(other) {
        const [a1, b1, c1, d1, e1, f1] = this.values;
        const [a2, b2, c2, d2, e2, f2] = other.values;
        
        return new Matrix(
            a1*a2 + b1*d2,
            a1*b2 + b1*e2,
            a1*c2 + b1*f2 + c1,
            d1*a2 + e1*d2,
            d1*b2 + e1*e2,
            d1*c2 + e1*f2 + f1
        );
    }
    
    transformPoint(point) {
        const [a, b, c, d, e, f] = this.values;
        return {
            x: a * point.x + b * point.y + c,
            y: d * point.x + e * point.y + f
        };
    }
    
    // Create a transformation that maps two points to two target points
    static matchEdge(p1, p2, targetP1, targetP2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        
        const tdx = targetP2.x - targetP1.x;
        const tdy = targetP2.y - targetP1.y;
        
        const scale = Math.sqrt((tdx*tdx + tdy*tdy) / (dx*dx + dy*dy));
        
        const angle1 = Math.atan2(dy, dx);
        const angle2 = Math.atan2(tdy, tdx);
        const rotation = angle2 - angle1;
        
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        const a = scale * cos;
        const b = -scale * sin;
        const d = scale * sin;
        const e = scale * cos;
        
        const c = targetP1.x - (a * p1.x + b * p1.y);
        const f = targetP1.y - (d * p1.x + e * p1.y);
        
        return new Matrix(a, b, c, d, e, f);
    }
}