import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class InfiniteExplorer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.randomSeed();
    }
    
    setSeed(seed) {
        this.seed = seed;
        document.getElementById('seed').value = this.seed;
        this.generate();
    }
    
    randomSeed() {
        this.seed = Math.floor(Math.random() * 1000000);
        document.getElementById('seed').value = this.seed;
        this.generate();
    }
    
    seededRandom() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }
    
    generate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const geometry = new HatGeometry(1, Math.sqrt(3));
        const tiling = new TilingSystem(geometry);
        
        const rootColor = this.seededRandom() < 0.5 ? Tile.LIGHT_BLUE : Tile.DARK_BLUE;
        const randomAngle = this.seededRandom() * 2 * Math.PI;
        const rotation = Matrix.rotation(randomAngle);
        const scaling = Matrix.scale(20);
        const translation = Matrix.translation(400, 300);
        
        let rootTransform;
        if (rootColor === Tile.DARK_BLUE) {
            rootTransform = translation.multiply(rotation).multiply(scaling);
        } else {
            const flip = Matrix.flipX();
            rootTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
        }
        
        const rootTile = tiling.addRootTile(rootTransform, rootColor);
        
        // Place tiles one at a time
        for (let i = 0; i < 2; i++) {
            // Pick a random existing tile
            const randomTileIndex = Math.floor(this.seededRandom() * tiling.tiles.length);
            const parentTile = tiling.tiles[randomTileIndex];
            
            // Place one neighbor on that tile
            this.placeRandomNeighbor(tiling, parentTile);
        }
        
        console.log(`Total tiles: ${tiling.tiles.length}`);
        
        tiling.draw(this.ctx, 0);
        tiling.drawVertexLabels(this.ctx);
    }
    
    placeRandomNeighbor(tiling, tile) {
        const parentIsFlipped = (tile.color === Tile.DARK_BLUE);
        
        const unflippedToFlipped = {
            0: [10], 1: [11], 2: [12], 3: [13], 4: [10], 5: [11], 6: [12],
            7: [13], 8: [12], 9: [13], 10: [0, 4], 11: [1, 5], 12: [2, 6, 8], 13: [3, 7, 9]
        };
        
        const unflippedToUnflipped = {
            0: [5, 11], 1: [0, 4, 10], 2: [3, 9, 13], 3: [2, 8, 12], 4: [1, 11],
            5: [0, 4, 10], 6: [3, 9, 13], 7: [8, 12], 8: [7, 9, 12], 9: [6, 8],
            10: [1], 11: [0], 12: [3, 7], 13: [2, 6, 8]
        };
        
        const flippedToUnflipped = {
            0: [10], 1: [11], 2: [12], 3: [13], 4: [10], 5: [11], 6: [12],
            7: [13], 8: [12], 9: [13], 10: [0, 4], 11: [1, 5], 12: [2, 6, 8], 13: [3, 7, 9]
        };
        
        const flippedToFlipped = {
            0: [5, 11], 1: [4, 10], 2: [3, 9, 13], 3: [2, 8, 12], 4: [1, 5, 11],
            5: [0, 4, 10], 6: [3, 13], 7: [8, 12], 8: [3, 7, 9, 13], 9: [2, 6, 8, 12],
            10: [1, 5], 11: [0, 4], 12: [3, 7, 9], 13: [2, 6, 8]
        };
        
        // Pick random edge
        const randomEdge = Math.floor(this.seededRandom() * 14);
        
        // Pick random neighbor type
        let neighborColor, sourceEdgeNum, reversedSource, reversedTarget, targetEdge, flipped;
        
        if (!parentIsFlipped) {
            if (this.seededRandom() < 0.5) {
                neighborColor = Tile.DARK_BLUE;
                const validSources = unflippedToFlipped[randomEdge];
                sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                reversedSource = false;
                reversedTarget = false;
                targetEdge = [randomEdge, (randomEdge + 1) % 14];
                flipped = true;
            } else {
                neighborColor = Tile.LIGHT_BLUE;
                const validSources = unflippedToUnflipped[randomEdge];
                sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                reversedSource = true;
                reversedTarget = false;
                targetEdge = [randomEdge, (randomEdge + 1) % 14];
                flipped = false;
            }
        } else {
            if (this.seededRandom() < 0.5) {
                neighborColor = Tile.LIGHT_BLUE;
                const validSources = flippedToUnflipped[randomEdge];
                sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                reversedSource = false;
                reversedTarget = false;
                targetEdge = [randomEdge, (randomEdge + 1) % 14];
                flipped = false;
            } else {
                neighborColor = Tile.DARK_BLUE;
                const validSources = flippedToFlipped[randomEdge];
                sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                reversedSource = false;
                reversedTarget = true;
                targetEdge = [(randomEdge + 1) % 14, randomEdge];
                flipped = true;
            }
        }
        
        const sourceEdge = reversedSource
            ? [(sourceEdgeNum + 1) % 14, sourceEdgeNum]
            : [sourceEdgeNum, (sourceEdgeNum + 1) % 14];
        
        const neighbor = Tile.createAttached(
            sourceEdge,
            tile,
            targetEdge,
            {flipped: flipped, color: neighborColor}
        );
        
        tiling.tiles.push(neighbor);
    }
}

const explorer = new InfiniteExplorer('canvas');

window.regenerate = () => {
    const seed = parseInt(document.getElementById('seed').value);
    explorer.setSeed(seed);
};

window.randomSeed = () => explorer.randomSeed();