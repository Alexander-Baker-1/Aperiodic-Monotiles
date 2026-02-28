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

    addRootTile(transform, color = Tile.COLORS.LIGHT_BLUE) {
        const flipped = color === Tile.COLORS.DARK_BLUE;
        const tile = new Tile(this.geometry, transform, color, flipped);
        this.tiles.push(tile);
        return tile;
    }

    addRootTile(transform, color = Tile.COLORS.LIGHT_BLUE) {
        const flipped = color === Tile.COLORS.DARK_BLUE;
        const tile = new Tile(this.geometry, transform, color, flipped);
        this.tiles.push(tile);
        return tile;
    }
    
    computeAttachedTransform(sourceTile, sourceEdgeIdx, targetEdgeIdx, color) {
        const flipped = color === Tile.COLORS.DARK_BLUE;
        const reversed = sourceTile.flipped === flipped;
    
        let p1 = sourceTile.getVertexWorldPos(sourceEdgeIdx);
        let p2 = sourceTile.getVertexWorldPos((sourceEdgeIdx + 1) % this.geometry.vertices.length);
        if (reversed) [p1, p2] = [p2, p1];
    
        const sv1 = this.geometry.vertices[targetEdgeIdx];
        const sv2 = this.geometry.vertices[(targetEdgeIdx + 1) % this.geometry.vertices.length];
    
        if (flipped) {
            const flip = Transform.flipX();
            const v1 = flip.transformPoint(sv1);
            const v2 = flip.transformPoint(sv2);
            return Transform.matchEdge(v1, v2, p1, p2).multiply(flip);
        }
        return Transform.matchEdge(sv1, sv2, p1, p2);
    }
    
    commitTile(sourceTile, sourceEdgeIdx, neighbor, targetEdgeIdx) {
        sourceTile.occupiedEdges.set(sourceEdgeIdx, neighbor);
        neighbor.occupiedEdges.set(targetEdgeIdx, sourceTile);
        this.tiles.push(neighbor);
        return neighbor;
    }
    
    // Keep addAttachedTile for cluster.js usage
    addAttachedTile(sourceTile, sourceEdgeIdx, targetEdgeIdx, options = {}) {
        const { color = Tile.COLORS.LIGHT_BLUE } = options;
        const transform = this.computeAttachedTransform(sourceTile, sourceEdgeIdx, targetEdgeIdx, color);
        const flipped = color === Tile.COLORS.DARK_BLUE;
        const neighbor = new Tile(this.geometry, transform, color, flipped);
        return this.commitTile(sourceTile, sourceEdgeIdx, neighbor, targetEdgeIdx);
    }
    
    render(ctx, curve) {
        this.tiles.forEach(tile => tile.render(ctx, curve));
    }
}