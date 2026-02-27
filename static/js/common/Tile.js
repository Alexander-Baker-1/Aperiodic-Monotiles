import { Transform } from './Transform.js';

export class Tile {
    // 1. COLOR "ENUMS" (Static constants shared by all Tiles)
    static COLORS = {
        DARK_BLUE: 'rgba(0, 137, 212, 1)',
        LIGHT_BLUE: 'rgba(148, 205, 235, 1)',
        WHITE: 'rgba(250, 250, 250, 1)',
        GRAY: 'rgba(191, 191, 191, 1)'
    };

    constructor(geometry, transform, color = Tile.COLORS.LIGHT_BLUE) {
        this.geometry = geometry;   // The Stencil (Math)
        this.transform = transform; // The Hand (Position/Pose)
        this.color = color;         // The Paint
    }

    /**
     * PURPOSE: The "Main Engine". It prepares the canvas, coordinates 
     * the drawing, and cleans up afterward.
     */
    render(ctx, curve) {
        ctx.save();
        const [a, b, c, d, e, f] = this.transform.values;
        ctx.transform(a, d, b, e, c, f);
    
        this.tracePath(ctx, curve);
        
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // The stroke must happen while the transform is applied
        // so it uses the '2 / scale' width correctly.
        ctx.stroke(); 
        
        ctx.restore();
    }

    /**
     * PURPOSE: The "Pathfinder". It iterates through the geometry's instructions 
     * to build the outline of the shape.
     */
    tracePath(ctx, curve) {
        const moves = this.geometry.edgeMoves;
        ctx.beginPath();
        ctx.moveTo(0, 0); // Start at the origin of the local coordinate system
        
        let px = 0, py = 0;
        for (let [dx, dy] of moves) {
            this.drawEdge(ctx, px, py, dx, dy, curve);
            px += dx; // Update current position relative to the previous move
            py += dy;
        }
        ctx.closePath();
    }

    /**
     * PURPOSE: The "Artist". It calculates how to turn a straight line 
     * into a smooth Bezier curve based on a "twiddle" factor.
     */
    drawEdge(ctx, x, y, dx, dy, curve) {
        // Calculate the "Normal" (a vector sticking out sideways from the edge)
        const nx = dy; 
        const ny = -dx;
        
        // Control Points: These "pull" the line outward to create the curve
        const cp1x = x - curve * nx + dx / 2;
        const cp1y = y - curve * ny + dy / 2;
        const cp2x = x + curve * nx + dx / 2;
        const cp2y = y + curve * ny + dy / 2;
        
        // Draw the cubic bezier from current (x,y) to the destination (x+dx, y+dy)
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x + dx, y + dy);
    }

    /**
     * PURPOSE: The "GPS". Translates a local point on the stencil 
     * into an actual pixel coordinate on the screen.
     */
    getVertexWorldPos(index) {
        return this.transform.transformPoint(this.geometry.vertices[index]);
    }
}