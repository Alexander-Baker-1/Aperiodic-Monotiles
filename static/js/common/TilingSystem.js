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
     * Note: This will be the mirrored version because of our HatGeometry refactor.
     */
    addRootTile(x, y, color = Tile.COLORS.DARK_BLUE) {
        const transform = Transform.translation(x, y);
        const tile = new Tile(this.geometry, transform, color);
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
        const { flipped = false, color = Tile.COLORS.LIGHT_BLUE } = options;

        // 1. Get the world position of the edge vertices on the source tile
        const p1 = sourceTile.getVertexWorldPos(sourceEdgeIdx);
        const p2 = sourceTile.getVertexWorldPos((sourceEdgeIdx + 1) % this.geometry.vertices.length);

        // 2. Get the local positions of the edge on the new tile
        const sv1 = this.geometry.vertices[targetEdgeIdx];
        const sv2 = this.geometry.vertices[(targetEdgeIdx + 1) % this.geometry.vertices.length];

        let finalTransform;
        
        // If we want a "reflected" version of our already-mirrored baseline:
        if (flipped) {
            const flip = Transform.flipX();
            const v1 = flip.transformPoint(sv1);
            const v2 = flip.transformPoint(sv2);
            const match = Transform.matchEdge(v1, v2, p1, p2);
            finalTransform = match.multiply(flip);
        } else {
            // Standard edge alignment
            finalTransform = Transform.matchEdge(sv1, sv2, p1, p2);
        }

        const newTile = new Tile(this.geometry, finalTransform, color);
        this.tiles.push(newTile);
        return newTile;
    }
    
    render(ctx, curve) {
        this.tiles.forEach(tile => tile.render(ctx, curve));
    }
}