import { Tile } from './Tile.js';
import { Transform } from './Transform.js';

export class TilingSystem {
    constructor(geometry) {
        this.geometry = geometry;
        this.tiles = [];
    }
    
    clear() {
        this.tiles = [];
    }
    
    /**
     * Places the first tile on the canvas.
     * Now accepts either (x, y) coordinates OR a full Transform object.
     */
    addRootTile(transform, color = Tile.COLORS.LIGHT_BLUE) {
        const tile = new Tile(this.geometry, transform, color, false);
        this.tiles.push(tile);
        return tile;
    }
    
    /**
     * Attaches a new tile to an existing one.
     * @param {Tile} sourceTile - The tile already on the canvas.
     * @param {number} sourceEdgeIdx - The edge index (0-13) on the existing tile.
     * @param {number} targetEdgeIdx - The edge index (0-13) on the new tile to align.
     */
    addAttachedTile(sourceTile, sourceEdgeIdx, targetEdgeIdx, options = {}) {
        const { color = Tile.COLORS.LIGHT_BLUE } = options;
        
        const flipped = options.flipped !== undefined ? options.flipped : color === Tile.COLORS.DARK_BLUE;
        
        // same type = reversed, different type = not reversed
        const reversed = sourceTile.flipped === flipped;
    
        let p1 = sourceTile.getVertexWorldPos(sourceEdgeIdx);
        let p2 = sourceTile.getVertexWorldPos((sourceEdgeIdx + 1) % this.geometry.vertices.length);
    
        if (reversed) [p1, p2] = [p2, p1];
    
        const sv1 = this.geometry.vertices[targetEdgeIdx];
        const sv2 = this.geometry.vertices[(targetEdgeIdx + 1) % this.geometry.vertices.length];
    
        let finalTransform;
        if (flipped) {
            const flip = Transform.flipX();
            const v1 = flip.transformPoint(sv1);
            const v2 = flip.transformPoint(sv2);
            const match = Transform.matchEdge(v1, v2, p1, p2);
            finalTransform = match.multiply(flip);
        } else {
            finalTransform = Transform.matchEdge(sv1, sv2, p1, p2);
        }
    
        const newTile = new Tile(this.geometry, finalTransform, color, flipped);
        this.tiles.push(newTile);
        return newTile;
    }
    
    render(ctx, curve) {
        this.tiles.forEach(tile => tile.render(ctx, curve));
    }
}