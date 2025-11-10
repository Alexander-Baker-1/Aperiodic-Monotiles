import { Matrix } from './Matrix.js';

export class Tile {
    // Color constants as static properties
    static DARK_BLUE = 'rgba(20, 50, 130, 1)';
    static LIGHT_BLUE = 'rgba(80, 150, 180, 1)';
    static WHITE = 'rgba(255, 255, 255, 1)';
    static GRAY = 'rgba(128, 128, 128, 1)';
    
    constructor(transform, geometry, color = Tile.LIGHT_BLUE) {
        this.transform = transform;
        this.geometry = geometry;
        this.color = color;
    }
    
    getVertex(index) {
        return this.transform.transformPoint(this.geometry.vertices[index]);
    }
    
    getEdge(v1Index, v2Index) {
        return [this.getVertex(v1Index), this.getVertex(v2Index)];
    }
    
    draw(ctx, curve) {
        const moves = this.geometry.getEdgeMoves();
        
        function twiddle([dx, dy]) {
            const [nx, ny] = [dy, -dx];
            return [
                -curve*nx + dx/2, -curve*ny + dy/2,
                curve*nx + dx/2, curve*ny + dy/2,
                dx, dy
            ];
        }
        
        ctx.save();
        const [a, b, c, d, e, f] = this.transform.values;
        ctx.transform(a, d, b, e, c, f);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        
        let px = 0, py = 0;
        for (let [dx, dy] of moves) {
            const [dx1, dy1, dx2, dy2, x1, y1] = twiddle([dx, dy]);
            ctx.bezierCurveTo(dx1+px, dy1+py, dx2+px, dy2+py, px+dx, py+dy);
            px += dx;
            py += dy;
        }
        
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.restore();
    }
    
    drawVertexLabels(ctx) {
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < this.geometry.vertices.length; i++) {
            const p = this.getVertex(i);
            ctx.fillText(i, p.x, p.y);
        }
        
        ctx.restore();
    }
    
    static createRoot(geometry, transform, color) {
        return new Tile(transform, geometry, color);
    }
    
    static createAttached(sourceEdge, targetTile, targetEdge, options = {}) {
        const { flipped = false, color = Tile.LIGHT_BLUE } = options;
        const geometry = targetTile.geometry;
        
        const [targetP1, targetP2] = targetTile.getEdge(targetEdge[0], targetEdge[1]);
        
        let transform;
        if (!flipped) {
            const flipX = Matrix.flipX();
            const v1 = flipX.transformPoint(geometry.vertices[sourceEdge[0]]);
            const v2 = flipX.transformPoint(geometry.vertices[sourceEdge[1]]);
            const tempTransform = Matrix.matchEdge(v1, v2, targetP1, targetP2);
            transform = tempTransform.multiply(flipX);
        } else {
            transform = Matrix.matchEdge(
                geometry.vertices[sourceEdge[0]],
                geometry.vertices[sourceEdge[1]],
                targetP1,
                targetP2
            );
        }
        
        return new Tile(transform, geometry, color);
    }
}