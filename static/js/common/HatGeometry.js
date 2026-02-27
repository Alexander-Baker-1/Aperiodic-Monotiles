export class HatGeometry {
    constructor(a, b) {
        this.a = a;
        this.b = b;
        this.vertices = this.computeVertices();
        this.edgeMoves = this.getEdgeMoves();
    }
    
    computeVertices() {
        const moves = this.getEdgeMoves(); // Use the getter to keep it DRY
        const vertices = [{x: 0, y: 0}];
        let x = 0, y = 0;
        
        for (let [dx, dy] of moves) {
            x += dx;
            y += dy;
            vertices.push({x, y});
        }
        
        return vertices;
    }
    
    getEdgeMoves() {
        const c = Math.cos(Math.PI/3);
        const s = Math.sin(Math.PI/3);
        const {a, b} = this;
        
        // MIRRORED VERSION: All original x-values (dx) are multiplied by -1
        return [
            [-c*b, s*b], [-b, 0], [0, a], [-s*a, c*a],
            [-c*b, -s*b], [c*b, -s*b], [-s*a, -c*a],
            [0, -a], [0, -a], [s*a, -c*a],
            [c*b, s*b], [b, 0], [0, a], [s*a, c*a]
        ];
    }
}