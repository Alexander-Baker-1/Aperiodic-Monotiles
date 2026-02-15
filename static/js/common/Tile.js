import { Tile } from './Tile.js';

export class TilingSystem {
    constructor(geometry) {
        this.geometry = geometry;
        this.tiles = [];
    }
    
    clear() {
        this.tiles = [];
    }
    
    addRootTile(transform, color) {
        const tile = Tile.createRoot(this.geometry, transform, color);
        this.tiles.push(tile);
        return tile;
    }
    
    addTile(sourceEdge, targetTile, targetEdge, options) {
        const tile = Tile.createAttached(sourceEdge, targetTile, targetEdge, options);
        this.tiles.push(tile);
        return tile;
    }

    addTileWithTransform(transform, color) {
        const tile = new Tile(transform, this.geometry, color);
        this.tiles.push(tile);
        return tile;
    }
    
    draw(ctx, curve) {
        this.tiles.forEach(tile => tile.draw(ctx, curve));
    }
    
    drawVertexLabels(ctx) {
        this.tiles.forEach(tile => tile.drawVertexLabels(ctx));
    }
}