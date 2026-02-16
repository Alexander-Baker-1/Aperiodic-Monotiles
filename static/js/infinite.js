import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class InfiniteExplorer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.edgeConstraints = this.buildEdgeConstraints();
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
    
    buildEdgeConstraints() {
        return {
            // Root edge 0, Unflipped->Unflipped
            0: {
                5: { reversed: true, flipped: false, blocks: [[1, 10], [2, 9], [12, 3], [12, 7], [13, 2], [13, 6], [13, 8]] },
                11: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [1, 10], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] }
            },
            // Root edge 1, Unflipped->Unflipped
            1: {
                0: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 2], [3, 6], [3, 12], [4, 1]] },
                4: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 6], [3, 12]] },
                10: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] }
            },
            2: {
                3: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 6], [3, 12]] },
                9: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 0], [1, 4], [1, 10], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] },
                13: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 2], [3, 6], [3, 12], [4, 1]] }
            },
            3: {
                2: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [4, 1], [4, 11], [5, 10], [6, 9]] },
                6: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [1, 10], [2, 3], [2, 13], [4, 1], [4, 11], [5, 10], [6, 9]] },
                12: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [2, 3], [2, 9], [2, 13], [4, 1]] }
            },
            4: {
                1: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [3, 2], [5, 10], [6, 9]] },
                11: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [3, 9], [5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [7, 12]] }
            },
            5: {
                0: { reversed: true, flipped: false, blocks: [[4, 11], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12], [8, 7], [8, 9]] },
                4: { reversed: true, flipped: false, blocks: [[4, 11], [6, 3], [6, 9], [6, 13], [7, 12], [8, 9]] },
                10: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [3, 12], [4, 1], [4, 11], [6, 3], [6, 9], [6, 13], [7, 12]] }
            },
            6: {
                3: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [7, 12], [8, 9]] },
                9: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [4, 1], [4, 11], [5, 0], [5, 4], [5, 10], [7, 12]] },
                13: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [7, 8], [7, 12], [8, 7], [8, 9]] }
            },
            7: {
                8: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [6, 13], [8, 7], [8, 9], [9, 6]] },
                12: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [8, 7], [8, 9]] }
            },
            8: {
                7: { reversed: true, flipped: false, blocks: [[5, 0], [6, 13], [7, 8], [7, 12], [9, 6]] },
                9: { reversed: true, flipped: false, blocks: [[5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12]] },
                12: { reversed: true, flipped: false, blocks: [[5, 0], [5, 4], [5, 10], [6, 3], [6, 13], [7, 8], [7, 12], [9, 6]] }
            },
            9: {
                6: { reversed: true, flipped: false, blocks: [[7, 8], [8, 7], [10, 1], [11, 0]] },
                8: { reversed: true, flipped: false, blocks: [[10, 1], [11, 0], [12, 3], [12, 7]] }
            },
            10: {
                1: { reversed: true, flipped: false, blocks: [[9, 6], [9, 8], [11, 0]] }
            },
            11: {
                0: { reversed: true, flipped: false, blocks: [[9, 6], [9, 8], [10, 1]] }
            },
            12: {
                3: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [13, 2], [13, 6], [13, 8]] },
                7: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [13, 2], [13, 6], [13, 8]] }
            },
            13: {
                2: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [3, 9], [12, 3], [12, 7]] },
                6: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [12, 3], [12, 7]] },
                8: { reversed: true, flipped: false, blocks: [[0, 5], [12, 3], [12, 7]] }
            }
        };
    }
    
    canPlaceWithConstraints(tile, rootEdge, sourceEdge, reversed, flipped) {
        // Initialize occupiedEdges if needed
        if (!tile.occupiedEdges) {
            tile.occupiedEdges = [];
        }
        
        // Check each already-placed neighbor on this tile
        for (let neighbor of tile.occupiedEdges) {
            const occupiedRootEdge = neighbor.rootEdge;
            const occupiedSourceEdge = neighbor.sourceEdge;
            const occupiedReversed = neighbor.reversed;
            const occupiedFlipped = neighbor.flipped;
            
            // Look up constraints for that occupied edge
            const rootConstraints = this.edgeConstraints[occupiedRootEdge];
            if (!rootConstraints) continue;
            
            const sourceConstraints = rootConstraints[occupiedSourceEdge];
            if (!sourceConstraints) continue;
            
            // Check if reversed and flipped match
            if (sourceConstraints.reversed !== occupiedReversed) continue;
            if (sourceConstraints.flipped !== occupiedFlipped) continue;
            
            // Check if the new placement is in the blocked list
            for (let [blockedRoot, blockedSource] of sourceConstraints.blocks) {
                if (blockedRoot === rootEdge && blockedSource === sourceEdge) {
                    return false; // Blocked!
                }
            }
        }
        
        return true; // Not blocked
    }
    
    placeRandomNeighbor(tiling, tile) {
        const parentIsFlipped = (tile.color === Tile.DARK_BLUE);
        
        const unflippedToFlipped = {
            0: [10], 1: [11], 2: [12], 3: [13], 4: [10], 5: [11], 6: [12],
            7: [13], 8: [12], 9: [13], 10: [0, 4], 11: [1, 5], 12: [2, 6, 8], 13: [3, 7, 9]
        };
        
        const unflippedToUnflipped = {
            0: [5, 11], 1: [0, 4, 10], 2: [3, 9, 13], 3: [2, 8, 12], 4: [1, 11],
            5: [0, 4, 10], 6: [3, 9, 13], 7: [8, 12], 8: [7, 9], 9: [6, 8],
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
        
        // Initialize occupiedEdges if needed
        if (!tile.occupiedEdges) {
            tile.occupiedEdges = [];
        }
        
        // Try up to 50 times to find a valid placement
        for (let attempt = 0; attempt < 50; attempt++) {
            const randomEdge = Math.floor(this.seededRandom() * 14);
            
            // Check if edge is already occupied
            const edgeAlreadyUsed = tile.occupiedEdges.some(n => n.rootEdge === randomEdge);
            if (edgeAlreadyUsed) {
                continue;
            }
            
            let neighborColor, sourceEdgeNum, reversedSource, reversedTarget, targetEdge, flipped;
            
            if (!parentIsFlipped) {
                if (this.seededRandom() < 0.5) {
                    neighborColor = Tile.DARK_BLUE;
                    const validSources = unflippedToFlipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue; // SAFETY CHECK
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = false;
                    reversedTarget = false;
                    targetEdge = [randomEdge, (randomEdge + 1) % 14];
                    flipped = true;
                } else {
                    neighborColor = Tile.LIGHT_BLUE;
                    const validSources = unflippedToUnflipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue; // SAFETY CHECK
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
                    if (!validSources || validSources.length === 0) continue; // SAFETY CHECK
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = false;
                    reversedTarget = false;
                    targetEdge = [randomEdge, (randomEdge + 1) % 14];
                    flipped = false;
                } else {
                    neighborColor = Tile.DARK_BLUE;
                    const validSources = flippedToFlipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue; // SAFETY CHECK
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = false;
                    reversedTarget = true;
                    targetEdge = [(randomEdge + 1) % 14, randomEdge];
                    flipped = true;
                }
            }
            // ... determine neighbor placement ...
            
            // Check constraints before placing
            if (!this.canPlaceWithConstraints(tile, randomEdge, sourceEdgeNum, reversedSource, flipped)) {
                continue; // Skip this attempt, try another edge
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
            
            // Initialize occupiedEdges if needed
            if (!tile.occupiedEdges) {
                tile.occupiedEdges = [];
            }
            
            // Record this placement
            tile.occupiedEdges.push({
                rootEdge: randomEdge,
                sourceEdge: sourceEdgeNum,
                reversed: reversedSource,
                flipped: flipped
            });
            
            tiling.tiles.push(neighbor);
            return; // Success!
        }
        
        console.log('Could not place neighbor after 50 attempts');
    }
}

const explorer = new InfiniteExplorer('canvas');

window.regenerate = () => {
    const seed = parseInt(document.getElementById('seed').value);
    explorer.setSeed(seed);
};

window.randomSeed = () => explorer.randomSeed();