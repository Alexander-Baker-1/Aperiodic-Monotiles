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
            // Find tiles that still have free edges
            const tilesWithFreeEdges = tiling.tiles.filter(tile => {
                const occupiedCount = tile.occupiedEdges ? tile.occupiedEdges.length : 0;
                return occupiedCount < 14; // Hat tile has 14 edges
            });
            
            if (tilesWithFreeEdges.length === 0) {
                console.log('No tiles with free edges available');
                break;
            }
            
            // Pick a random tile from those with free edges
            const randomTileIndex = Math.floor(this.seededRandom() * tilesWithFreeEdges.length);
            const parentTile = tilesWithFreeEdges[randomTileIndex];
            
            const actualIndex = tiling.tiles.indexOf(parentTile);
            console.log(`Parent tile ${actualIndex}: color = ${parentTile.color === Tile.DARK_BLUE ? 'DARK_BLUE' : 'LIGHT_BLUE'}`);

            // Place one neighbor on that tile
            const beforeCount = tiling.tiles.length;
            this.placeRandomNeighbor(tiling, parentTile);
            const afterCount = tiling.tiles.length;

            if (afterCount === beforeCount) {
                console.log('⚠️ Failed to place neighbor - no valid placement found');
            }
        }
        
        console.log(`Total tiles: ${tiling.tiles.length}`);
        
        tiling.draw(this.ctx, 0);
        tiling.drawVertexLabels(this.ctx);
    }
    
    buildEdgeConstraints() {
        return {
            // Root edge 0, Unflipped->Unflipped
            0: {
                5: { reversed: true, flipped: false, blocks: [[1, 10], [2, 9], [12, 3], [12, 7], [12, 9], [13, 2], [13, 6], [13, 8]] },
                11: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [1, 10], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] }
            },
            // Root edge 1, Unflipped->Unflipped
            1: {
                0: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 2], [3, 6], [3, 8], [3, 12], [4, 1]] },
                4: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 6], [3, 12]] },
                10: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] }
            },
            2: {
                3: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 6], [3, 12]] },
                9: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 0], [1, 4], [1, 10], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] },
                13: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 2], [3, 6], [3, 8], [3, 12], [4, 1], [4, 5]] }
            },
            3: {
                2: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [4, 1], [4, 5], [4, 11], [5, 10], [6, 9]] },
                6: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [1, 10], [2, 3], [2, 13], [4, 1], [4, 5], [4, 11], [5, 10], [6, 9]] },
                8: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [4, 1], [4, 5]] },
                12: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [2, 3], [2, 9], [2, 13], [4, 1], [4, 5]] }
            },
            4: {
                1: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [3, 2], [3, 8], [5, 10], [6, 9]] },
                5: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [2, 3], [2, 13], [3, 2], [3, 6], [3, 8], [3, 12], [5, 10], [6, 9]] },
                11: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [3, 9], [5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [7, 12]] }
            },
            5: {
                0: { reversed: true, flipped: false, blocks: [[4, 11], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12], [8, 7], [8, 9]] },
                4: { reversed: true, flipped: false, blocks: [[4, 11], [6, 3], [6, 9], [6, 13], [7, 12], [8, 9]] },
                10: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [3, 12], [4, 1], [4, 5], [4, 11], [6, 3], [6, 9], [6, 13], [7, 12]] }
            },
            6: {
                3: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [7, 12], [8, 9]] },
                9: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [4, 1], [4, 5], [4, 11], [5, 0], [5, 4], [5, 10], [7, 12]] },
                13: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [7, 8], [7, 12], [8, 7], [8, 9]] }
            },
            7: {
                8: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [6, 13], [8, 3], [8, 7], [8, 9], [9, 6], [9, 12]] },
                12: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [8, 7], [8, 9]] }
            },
            8: {
                3: {reversed: true, flipped: false, blocks: [[7, 8], [9, 12], [10, 5]] },
                7: { reversed: true, flipped: false, blocks: [[5, 0], [6, 13], [7, 8], [7, 12], [9, 6], [10, 5]] },
                9: { reversed: true, flipped: false, blocks: [[5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12]] },
            },
            9: {
                2: {reversed: true, flipped: false, blocks: [[10, 1], [10, 5], [11, 0], [11, 4]] },
                6: { reversed: true, flipped: false, blocks: [[7, 8], [8, 7], [10, 1], [10, 5], [11, 0], [11, 4]] },
                8: { reversed: true, flipped: false, blocks: [[10, 1], [10, 5], [11, 0], [11, 4], [12, 3], [12, 7]] },
                12: {reversed: true, flipped: false, blocks: [[7, 8], [8, 3], [8, 7], [8, 9], [10, 5], [11, 4]] }
            },
            10: {
                1: { reversed: true, flipped: false, blocks: [[9, 6], [9, 8], [11, 0], [11, 4]] },
                5: {reversed: true, flipped: false, blocks: [[8, 3], [8, 7], [9, 2], [9, 6], [9, 8], [9, 12], [11, 0], [11, 4]] }
            },
            11: {
                0: { reversed: true, flipped: false, blocks: [[9, 2], [9, 6], [9, 8], [10, 1], [10, 5]] },
                4: { reversed: true, flipped: false, blocks: [[9, 2], [9, 6], [9, 8], [9, 12], [10, 1], [10, 5]] }
            },
            12: {
                3: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [13, 2], [13, 6], [13, 8]] },
                7: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [13, 2], [13, 6], [13, 8]] },
                9: { reversed: true, flipped: false, blocks: [[0, 5], [13, 2], [13, 6], [13, 8]] }
            },
            13: {
                2: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [3, 9], [12, 3], [12, 7], [12, 9]] },
                6: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [12, 3], [12, 7], [12, 9]] },
                8: { reversed: true, flipped: false, blocks: [[0, 5], [12, 3], [12, 7], [12, 9]] }
            }
        };
    }
    
    canPlaceWithConstraints(tile, rootEdge, sourceEdge, reversed, flipped) {
        if (!tile.occupiedEdges) {
            tile.occupiedEdges = [];
        }
        
        console.log(`\n=== Checking constraints for NEW: Root ${rootEdge}, Source ${sourceEdge}, Rev ${reversed}, Flip ${flipped}`);
        console.log(`Currently occupied edges:`, tile.occupiedEdges);
        
        for (let neighbor of tile.occupiedEdges) {
            const occupiedRootEdge = neighbor.rootEdge;
            const occupiedSourceEdge = neighbor.sourceEdge;
            const occupiedReversed = neighbor.reversed;
            const occupiedFlipped = neighbor.flipped;
            
            console.log(`  Checking against OCCUPIED: Root ${occupiedRootEdge}, Source ${occupiedSourceEdge}, Rev ${occupiedReversed}, Flip ${occupiedFlipped}`);
            
            // DIRECTION 1: Check if occupied edge blocks new placement
            const rootConstraints1 = this.edgeConstraints[occupiedRootEdge];
            if (rootConstraints1) {
                const sourceConstraints1 = rootConstraints1[occupiedSourceEdge];
                if (sourceConstraints1) {
                    console.log(`    Found constraints for occupied edge. Rev match: ${sourceConstraints1.reversed === occupiedReversed}, Flip match: ${sourceConstraints1.flipped === occupiedFlipped}`);
                    
                    if (sourceConstraints1.reversed === occupiedReversed && 
                        sourceConstraints1.flipped === occupiedFlipped) {
                        
                        console.log(`    Blocks:`, sourceConstraints1.blocks);
                        
                        for (let [blockedRoot, blockedSource] of sourceConstraints1.blocks) {
                            if (blockedRoot === rootEdge && blockedSource === sourceEdge) {
                                console.log(`    ❌ BLOCKED! Occupied ${occupiedRootEdge}→${occupiedSourceEdge} blocks new ${rootEdge}→${sourceEdge}`);
                                return false;
                            }
                        }
                    }
                }
            }
            
            // DIRECTION 2: Check if new placement blocks occupied edge
            const rootConstraints2 = this.edgeConstraints[rootEdge];
            if (rootConstraints2) {
                const sourceConstraints2 = rootConstraints2[sourceEdge];
                if (sourceConstraints2) {
                    console.log(`    Found constraints for new edge. Rev match: ${sourceConstraints2.reversed === reversed}, Flip match: ${sourceConstraints2.flipped === flipped}`);
                    
                    if (sourceConstraints2.reversed === reversed && 
                        sourceConstraints2.flipped === flipped) {
                        
                        console.log(`    Blocks:`, sourceConstraints2.blocks);
                        
                        for (let [blockedRoot, blockedSource] of sourceConstraints2.blocks) {
                            if (blockedRoot === occupiedRootEdge && blockedSource === occupiedSourceEdge) {
                                console.log(`    ❌ BLOCKED! New ${rootEdge}→${sourceEdge} blocks occupied ${occupiedRootEdge}→${occupiedSourceEdge}`);
                                return false;
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`  ✅ Not blocked`);
        return true;
    }
    
    placeRandomNeighbor(tiling, tile) {
        const parentIsFlipped = (tile.color === Tile.LIGHT_BLUE);
                
        const unflippedToFlipped = {
            0: [10], 1: [11], 2: [12], 3: [13], 4: [10], 5: [11], 6: [12],
            7: [13], 8: [12], 9: [13], 10: [0, 4], 11: [1, 5], 12: [2, 6, 8], 13: [3, 7, 9]
        };
        
        const unflippedToUnflipped = {
            0: [5, 11], 1: [0, 4, 10], 2: [3, 9, 13], 3: [2, 6, 12], 4: [1, 11],
            5: [0, 4, 10], 6: [3, 13], 7: [8, 12], 8: [3, 7, 9, 13], 9: [6, 8],
            10: [1], 11: [0], 12: [3, 7], 13: [2, 6, 8]
        };
        
        const flippedToUnflipped = {
            0: [10], 1: [11], 2: [12], 3: [13], 4: [10], 5: [11], 6: [12],
            7: [13], 8: [12], 9: [13], 10: [0, 4], 11: [1, 5], 12: [2, 6, 8], 13: [3, 7, 9]
        };
        
        const flippedToFlipped = {
            0: [5, 11], 1: [0, 4, 10], 2: [3, 9, 13], 3: [2, 6, 8, 12], 4: [1, 5, 11],
            5: [0, 4, 10], 6: [3, 9, 13], 7: [8, 12], 8: [3, 7, 9], 9: [2, 6, 8, 12],
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
            
            if (!parentIsFlipped) {  // Parent is DARK_BLUE (unflipped)
                if (this.seededRandom() < 0.5) {
                    // CASE 1: Unflipped → Flipped
                    neighborColor = Tile.LIGHT_BLUE;
                    const validSources = unflippedToFlipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue;
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = false;
                    reversedTarget = false;
                    targetEdge = [randomEdge, (randomEdge + 1) % 14];
                    flipped = true;
                } else {
                    // CASE 2: Unflipped → Unflipped (SAME CHIRALITY)
                    neighborColor = Tile.DARK_BLUE;
                    const validSources = unflippedToUnflipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue;
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = true;
                    reversedTarget = false;
                    targetEdge = [randomEdge, (randomEdge + 1) % 14];
                    flipped = false;
                }
            } else {  // Parent is LIGHT_BLUE (flipped)
                if (this.seededRandom() < 0.5) {
                    // CASE 3: Flipped → Unflipped
                    neighborColor = Tile.DARK_BLUE;
                    const validSources = flippedToUnflipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue;
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = false;
                    reversedTarget = false;
                    targetEdge = [randomEdge, (randomEdge + 1) % 14];
                    flipped = false;
                } else {
                    // CASE 4: Flipped → Flipped (SAME CHIRALITY)
                    neighborColor = Tile.LIGHT_BLUE;
                    const validSources = flippedToFlipped[randomEdge];
                    if (!validSources || validSources.length === 0) continue;
                    sourceEdgeNum = validSources[Math.floor(this.seededRandom() * validSources.length)];
                    reversedSource = true;
                    reversedTarget = false;
                    targetEdge = [randomEdge, (randomEdge + 1) % 14];
                    flipped = false;
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
            
            // Record this placement on the PARENT
            tile.occupiedEdges.push({
                rootEdge: randomEdge,
                sourceEdge: sourceEdgeNum,
                reversed: reversedSource,
                flipped: flipped
            });
            
            // ALSO record on the CHILD that it used an edge to connect
            if (!neighbor.occupiedEdges) {
                neighbor.occupiedEdges = [];
            }
            neighbor.occupiedEdges.push({
                rootEdge: sourceEdgeNum,
                sourceEdge: randomEdge,
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