    import { Matrix } from './common/Matrix.js';
    import { HatGeometry } from './common/HatGeometry.js';
    import { TilingSystem } from './common/TilingSystem.js';
    import { Tile } from './common/Tile.js';

    class InfiniteExplorer {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d');
            this.edgeConstraints = this.buildEdgeConstraints();
            
            // Edge mapping tables
            this.neighborEdges = {
                false: { 
                    false: {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
                           5:[0,4,10],6:[3,9,13],7:[8,12],8:[3,7,9,13],9:[2,6,8,12],10:[1,5],11:[0,4],12:[3,7,9],13:[2,6,8]},
                    true: {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0,4],11:[1,5],12:[2,6,8],13:[3,7,9]}
                },
                true: { 
                    false: {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0,4],11:[1,5],12:[2,6,8],13:[3,7,9]},
                    true: {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
                          5:[0,4,10],6:[3,9,13],7:[8,12],8:[3,7,9,13],9:[2,6,8,12],10:[1,5],11:[0,4],12:[3,7,9],13:[2,6,8]}
                }
            };
            
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
            
            const shouldFlip = this.seededRandom() < 0.5;
            const rootColor = shouldFlip ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
            
            const randomAngle = this.seededRandom() * 2 * Math.PI;
            const rotation = Matrix.rotation(randomAngle);
            const scaling = Matrix.scale(20);
            const translation = Matrix.translation(400, 300);
            
            let rootTransform;
            if (shouldFlip) {
                const flip = Matrix.flipX();
                rootTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
            } else {
                rootTransform = translation.multiply(rotation).multiply(scaling);
            }
            
            const rootTile = tiling.addRootTile(rootTransform, rootColor);
            
            console.log(`\n🎲 Starting with tile 0 (${rootColor === Tile.DARK_BLUE ? 'DARK' : 'LIGHT'})`);
            
            // BETTER APPROACH: Round-robin through tiles
            let consecutiveFailures = 0;
            const maxConsecutiveFailures = tiling.tiles.length * 2; // Give up after trying each tile twice
            
            for (let i = 0; i < 50; i++) { // Try to place up to 50 tiles
                // Find all tiles with free edges
                const tilesWithFreeEdges = tiling.tiles.filter(tile => {
                    const occupiedCount = tile.occupiedEdges ? tile.occupiedEdges.length : 0;
                    return occupiedCount < 14;
                });
                
                if (tilesWithFreeEdges.length === 0) {
                    console.log('❌ All tiles have all edges occupied!');
                    break;
                }
                
                // Pick a random tile with free edges
                const randomIndex = Math.floor(this.seededRandom() * tilesWithFreeEdges.length);
                const parentTile = tilesWithFreeEdges[randomIndex];
                const parentIndex = tiling.tiles.indexOf(parentTile);
                
                console.log(`\n📍 Attempting to place tile ${tiling.tiles.length} as neighbor of tile ${parentIndex}`);
                const beforeCount = tiling.tiles.length;
                this.placeRandomNeighbor(tiling, parentTile, parentIndex);
                const afterCount = tiling.tiles.length;
                
                if (afterCount === beforeCount) {
                    console.log(`❌ Failed to place tile ${tiling.tiles.length}`);
                    consecutiveFailures++;
                    
                    if (consecutiveFailures >= maxConsecutiveFailures) {
                        console.log(`\n⚠️ Stopping: ${consecutiveFailures} consecutive failures`);
                        break;
                    }
                } else {
                    consecutiveFailures = 0; // Reset on success
                }
            }
            
            console.log(`\n✅ Final: ${tiling.tiles.length} tiles placed`);
                        
            tiling.draw(this.ctx, 0);
            tiling.drawVertexLabels(this.ctx);
            this.drawTileNumbers(tiling);
        }
        
        buildEdgeConstraints() {
            return {
                0: {
                    // Same chirality (flipped: false)
                    5: { reversed: true, flipped: false, blocks: [[1, 10], [2, 9], [12, 3], [12, 7], [12, 9], [13, 2], [13, 6], [13, 8]] },
                    11: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [1, 10], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] },
                    
                    // Opposite chirality (flipped: true)
                    10: { reversed: false, flipped: true, blocks: [[1, 11], [2, 12], [3, 13]] }
                },
                1: {
                    // Same chirality
                    0: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 2], [3, 6], [3, 8], [3, 12], [4, 1]] },
                    4: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 6], [3, 12], [12, 9], [13, 8]] },
                    10: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] },
                    
                    // Opposite chirality
                    11: { reversed: false, flipped: true, blocks: [[0, 10], [2, 12], [13, 3]] }
                },
                2: {
                    // Same chirality
                    3: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 6], [3, 12], ] },
                    9: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 0], [1, 4], [1, 10], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] },
                    13: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 2], [3, 6], [3, 8], [3, 12], [4, 1], [4, 5]] },
                    
                    // Opposite chirality
                    12: { reversed: false, flipped: true, blocks: [[0, 10], [1, 11], [3, 13]] }
                },
                3: {
                    // Same chirality
                    2: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [4, 1], [4, 5], [4, 11], [5, 10], [6, 9]] },
                    6: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [1, 10], [2, 3], [2, 13], [4, 1], [4, 5], [4, 11], [5, 10], [6, 9]] },
                    8: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [4, 1], [4, 5]] },
                    12: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [2, 3], [2, 9], [2, 13], [4, 1], [4, 5]] },
                    
                    // Opposite chirality
                    13: { reversed: false, flipped: true, blocks: [[0, 10], [1, 11], [2, 12]] }
                },
                4: {
                    // Same chirality
                    1: { reversed: true, flipped: false, blocks: [[1, 0], [2, 13], [3, 2], [3, 8], [5, 10], [6, 9]] },
                    5: { reversed: true, flipped: false, blocks: [[1, 0], [1, 4], [2, 3], [2, 13], [3, 2], [3, 6], [3, 8], [3, 12], [5, 10], [6, 9]] },
                    11: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [3, 9], [5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [7, 12]] },
                    
                    // Opposite chirality
                    10: { reversed: false, flipped: true, blocks: [[5, 11], [6, 12], [7, 13]] }
                },
                5: {
                    // Same chirality
                    0: { reversed: true, flipped: false, blocks: [[4, 11], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12], [8, 7], [8, 9]] },
                    4: { reversed: true, flipped: false, blocks: [[4, 11], [6, 3], [6, 9], [6, 13], [7, 12], [8, 9]] },
                    10: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [3, 12], [4, 1], [4, 5], [4, 11], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12]] },
                    
                    // Opposite chirality
                    11: { reversed: false, flipped: true, blocks: [[4, 10], [6, 12], [7, 13]] }
                },
                6: {
                    // Same chirality
                    3: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [7, 12], [8, 9]] },
                    9: { reversed: true, flipped: false, blocks: [[3, 2], [3, 6], [4, 1], [4, 5], [4, 11], [5, 0], [5, 4], [5, 10], [7, 12]] },
                    13: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [7, 8], [7, 12], [8, 7], [8, 9]] },
                    
                    // Opposite chirality
                    12: { reversed: false, flipped: true, blocks: [[4, 10], [5, 11], [7, 13]] }
                },
                7: {
                    // Same chirality
                    8: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [6, 13], [8, 3], [8, 7], [8, 9], [8, 13], [9, 6], [9, 12], [10, 5]] },
                    12: { reversed: true, flipped: false, blocks: [[4, 11], [5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [8, 7], [8, 9]] },
                    
                    // Opposite chirality
                    13: { reversed: false, flipped: true, blocks: [[4, 10], [5, 11], [6, 12]] }
                },
                8: {
                    // Same chirality
                    3: { reversed: true, flipped: false, blocks: [[7, 8], [9, 12], [10, 5]] },
                    7: { reversed: true, flipped: false, blocks: [[5, 0], [6, 13], [7, 8], [7, 12], [9, 6], [10, 5]] },
                    9: { reversed: true, flipped: false, blocks: [[5, 0], [5, 4], [5, 10], [6, 3], [6, 9], [6, 13], [7, 8], [7, 12]] },
                    13: { reversed: true, flipped: false, blocks: [[7, 8], [9, 2], [9, 6], [9, 8], [9, 12], [10, 1], [10, 5], [11, 0], [11, 4]] },
                    
                    // Opposite chirality
                    12: { reversed: false, flipped: true, blocks: [[9, 13], [10, 0], [11, 1]] }
                },
                9: {
                    // Same chirality
                    2: { reversed: true, flipped: false, blocks: [[8, 13], [10, 1], [10, 5], [11, 0], [11, 4]] },
                    6: { reversed: true, flipped: false, blocks: [[7, 8], [8, 7], [8, 13], [10, 1], [10, 5], [11, 0], [11, 4]] },
                    8: { reversed: true, flipped: false, blocks: [[8, 13], [10, 1], [10, 5], [11, 0], [11, 4], [12, 3], [12, 7]] },
                    12: { reversed: true, flipped: false, blocks: [[7, 8], [8, 3], [8, 7], [8, 9], [8, 13], [10, 5], [11, 4]] },
                    
                    // Opposite chirality
                    13: { reversed: false, flipped: true, blocks: [[8, 12], [10, 0], [11, 1]] }
                },
                10: {
                    // Same chirality
                    1: { reversed: true, flipped: false, blocks: [[8, 13], [9, 6], [9, 8], [11, 0], [11, 4]] },
                    5: { reversed: true, flipped: false, blocks: [[7, 8], [8, 3], [8, 7], [8, 13], [9, 2], [9, 6], [9, 8], [9, 12], [11, 0], [11, 4]] },
                    
                    // Opposite chirality
                    0: { reversed: false, flipped: true, blocks: [[9, 13], [11, 1], [11, 5], [12, 2], [12, 6], [12, 8], [13, 3], [13, 7], [13, 9]] },
                    4: { reversed: false, flipped: true, blocks: [[11, 1], [11, 5], [12, 2], [12, 6], [12, 8], [13, 3], [13, 7], [13, 9]] }
                },
                11: {
                    // Same chirality
                    0: { reversed: true, flipped: false, blocks: [[8, 13], [9, 2], [9, 6], [9, 8], [10, 1], [10, 5]] },
                    4: { reversed: true, flipped: false, blocks: [[8, 13], [9, 2], [9, 6], [9, 8], [9, 12], [10, 1], [10, 5]] },
                    
                    // Opposite chirality
                    1: { reversed: false, flipped: true, blocks: [[8, 12], [9, 13], [10, 0], [10, 4], [12, 2], [12, 6], [12, 8], [13, 3], [13, 7], [13, 9]] },
                    5: { reversed: false, flipped: true, blocks: [[10, 0], [10, 4], [12, 2], [12, 6], [12, 8], [13, 3], [13, 7], [13, 9]] }
                },
                12: {
                    // Same chirality
                    3: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [13, 2], [13, 6], [13, 8]] },
                    7: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [13, 2], [13, 6], [13, 8]] },
                    9: { reversed: true, flipped: false, blocks: [[0, 5], [1, 4], [13, 2], [13, 6], [13, 8]] },
                    
                    // Opposite chirality
                    2: { reversed: false, flipped: true, blocks: [[9, 13], [10, 0], [10, 4], [11, 1], [11, 5], [13, 3], [13, 7], [13, 8]] },
                    6: { reversed: false, flipped: true, blocks: [[10, 0], [10, 4], [11, 1], [11, 5], [13, 3], [13, 7], [13, 9]] },
                    8: { reversed: false, flipped: true, blocks: [[10, 0], [10, 4], [11, 1], [11, 5], [13, 3], [13, 7], [13, 9]] }
                },
                13: {
                    // Same chirality
                    2: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [3, 9], [12, 3], [12, 7], [12, 9]] },
                    6: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [1, 10], [2, 9], [12, 3], [12, 7], [12, 9]] },
                    8: { reversed: true, flipped: false, blocks: [[0, 5], [1, 4], [12, 3], [12, 7], [12, 9]] },
                    
                    // Opposite chirality
                    3: { reversed: false, flipped: true, blocks: [[10, 0], [10, 4], [11, 1], [11, 5], [12, 2], [12, 6], [12, 8]] },
                    7: { reversed: false, flipped: true, blocks: [[10, 0], [10, 4], [11, 1], [11, 5], [12, 2], [12, 6], [12, 8]] },
                    9: { reversed: false, flipped: true, blocks: [[11, 1], [11, 5], [12, 2], [12, 6], [12, 8]] }
                }
            };
        }
        
        canPlaceWithConstraints(tile, rootEdge, sourceEdge, reversed, flipped) {
            if (!tile.occupiedEdges) {
                tile.occupiedEdges = [];
            }
            
            for (let neighbor of tile.occupiedEdges) {
                const occupiedRootEdge = neighbor.rootEdge;
                const occupiedSourceEdge = neighbor.sourceEdge;
                const occupiedReversed = neighbor.reversed;
                const occupiedFlipped = neighbor.flipped;
                                
                // Check if occupied edge blocks new placement
                const rootConstraints1 = this.edgeConstraints[occupiedRootEdge];
                if (rootConstraints1) {
                    const sourceConstraints1 = rootConstraints1[occupiedSourceEdge];
                    if (sourceConstraints1 && 
                        sourceConstraints1.reversed === occupiedReversed && 
                        sourceConstraints1.flipped === occupiedFlipped) {
                        
                        for (let [blockedRoot, blockedSource] of sourceConstraints1.blocks) {
                            if (blockedRoot === rootEdge && blockedSource === sourceEdge) {
                                return false;
                            }
                        }
                    }
                }
                
                // Check if new placement blocks occupied edge
                const rootConstraints2 = this.edgeConstraints[rootEdge];
                if (rootConstraints2) {
                    const sourceConstraints2 = rootConstraints2[sourceEdge];
                    if (sourceConstraints2 && 
                        sourceConstraints2.reversed === reversed && 
                        sourceConstraints2.flipped === flipped) {
                        
                        for (let [blockedRoot, blockedSource] of sourceConstraints2.blocks) {
                            if (blockedRoot === occupiedRootEdge && blockedSource === occupiedSourceEdge) {
                                return false;
                            }
                        }
                    }
                }
            }
            
            return true;
        }
        
        placeRandomNeighbor(tiling, tile, parentIndex) {
            const parentIsFlipped = (tile.color === Tile.DARK_BLUE);
        
            if (!tile.occupiedEdges) tile.occupiedEdges = [];
        
            const allPossiblePlacements = [];
            
            for (let rootEdge = 0; rootEdge < 14; rootEdge++) {
                if (tile.occupiedEdges.some(n => n.rootEdge === rootEdge)) continue;
                
                for (let tryDarkBlue of [true, false]) {
                    const desiredColor = tryDarkBlue ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
                    const desiredFlipped = tryDarkBlue;
                    
                    for (let flippedParam of [true, false]) {
                        const sameChirality = (desiredFlipped === parentIsFlipped);
                        const validSources = this.neighborEdges[parentIsFlipped][desiredFlipped][rootEdge];
                        
                        if (!validSources || validSources.length === 0) continue;
                        
                        for (let sourceEdgeNum of validSources) {
                            allPossiblePlacements.push({
                                rootEdge,
                                sourceEdgeNum,
                                desiredColor,
                                desiredFlipped,
                                flippedParam,
                                sameChirality
                            });
                        }
                    }
                }
            }
            
            // Shuffle for randomness
            for (let i = allPossiblePlacements.length - 1; i > 0; i--) {
                const j = Math.floor(this.seededRandom() * (i + 1));
                [allPossiblePlacements[i], allPossiblePlacements[j]] = [allPossiblePlacements[j], allPossiblePlacements[i]];
            }
            
            console.log(`  Trying ${allPossiblePlacements.length} possible placements...`);
            
            // Try each placement
            for (let placement of allPossiblePlacements) {
                const { rootEdge, sourceEdgeNum, desiredColor, desiredFlipped, flippedParam, sameChirality } = placement;
        
                const reversedSource = sameChirality;
        
                if (!this.canPlaceWithConstraints(tile, rootEdge, sourceEdgeNum, reversedSource, flippedParam)) {
                    continue;
                }
        
                const sourceEdge = reversedSource
                    ? [(sourceEdgeNum + 1) % 14, sourceEdgeNum]
                    : [sourceEdgeNum, (sourceEdgeNum + 1) % 14];
        
                const targetEdge = [rootEdge, (rootEdge + 1) % 14];
                const neighbor = Tile.createAttached(sourceEdge, tile, targetEdge, {flipped: flippedParam, color: desiredColor});
        
                if (!neighbor || !neighbor.transform) {
                    continue;
                }
        
                const det = neighbor.transform.values[0] * neighbor.transform.values[4] - 
                            neighbor.transform.values[1] * neighbor.transform.values[3];
                const actuallyFlipped = det < 0;
        
                if (actuallyFlipped !== desiredFlipped) {
                    continue;
                }
        
                neighbor.color = desiredColor;
        
                if (this.hasGeometricConflict(neighbor, tiling.tiles, tile)) {
                    continue;
                }
        
                const newTileIndex = tiling.tiles.length;
                console.log(`  ✅ Tile ${newTileIndex} placed on edge ${rootEdge} of tile ${parentIndex} (${desiredColor === Tile.DARK_BLUE ? 'DARK' : 'LIGHT'})`);
                
                tile.occupiedEdges.push({rootEdge, sourceEdge: sourceEdgeNum, reversed: reversedSource, flipped: flippedParam});
                neighbor.occupiedEdges = [{rootEdge: sourceEdgeNum, sourceEdge: rootEdge, reversed: reversedSource, flipped: flippedParam}];
                tiling.tiles.push(neighbor);
                return;
            }
        
            console.log(`  ❌ No valid placement found (tried ${allPossiblePlacements.length} options)`);
        }
        
        hasGeometricConflict(newTile, existingTiles, parentTile) {
            if (existingTiles.length === 0) {
                return false;
            }
            
            const newVerts = this.getTransformedVertices(newTile);
            const newBBox = this.getBoundingBox(newVerts);
            
            for (let i = 0; i < existingTiles.length; i++) {
                const existingTile = existingTiles[i];
                if (existingTile === parentTile) continue;
                
                const existingVerts = this.getTransformedVertices(existingTile);
                const existingBBox = this.getBoundingBox(existingVerts);
                
                if (!this.bboxesOverlap(newBBox, existingBBox)) {
                    continue;
                }
                
                const sharedVertices = this.countSharedVertices(newVerts, existingVerts);
                
                // Tiles should share EXACTLY 2 vertices (one edge) or 0 vertices (separate)
                // Anything else is an overlap
                if (sharedVertices !== 0 && sharedVertices !== 2) {
                    return true;
                }
                
                // Even if shared vertices is 0 or 2, still check polygon overlap
                // (in case they overlap without sharing vertices, or share an edge but also overlap elsewhere)
                if (this.polygonsOverlap(newVerts, existingVerts)) {
                    return true;
                }
            }
            
            return false;
        }

        getTransformedVertices(tile) {
            const baseVertices = tile.geometry.vertices;
            return baseVertices.map(v => {
                const transformed = tile.transform.transformPoint(v);  // ✅ CORRECT
                return { x: transformed.x, y: transformed.y };
            });
        }
        
        countSharedVertices(verts1, verts2) {
            const tolerance = 0.05; // 0.05 units in scaled space (scale is 20)
            let count = 0;
            for (let v1 of verts1) {
                for (let v2 of verts2) {
                    const dx = v1.x - v2.x;
                    const dy = v1.y - v2.y;
                    if (Math.sqrt(dx*dx + dy*dy) < tolerance) {
                        count++;
                        break;
                    }
                }
            }
            return count;
        }

        polygonsOverlap(poly1, poly2, tolerance = 0.1) {
            const axes = [];
            
            // Get axes from poly1 edges
            for (let i = 0; i < poly1.length; i++) {
                const p1 = poly1[i];
                const p2 = poly1[(i + 1) % poly1.length];
                const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
                axes.push({ x: -edge.y, y: edge.x });
            }
            
            // Get axes from poly2 edges
            for (let i = 0; i < poly2.length; i++) {
                const p1 = poly2[i];
                const p2 = poly2[(i + 1) % poly2.length];
                const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
                axes.push({ x: -edge.y, y: edge.x });
            }
            
            // Test each axis
            for (let axis of axes) {
                const proj1 = this.projectPolygon(poly1, axis);
                const proj2 = this.projectPolygon(poly2, axis);
                
                // Add tolerance - if they're barely touching (shared edge), don't count as overlap
                const gap = Math.min(proj2.min - proj1.max, proj1.min - proj2.max);
                
                if (gap > tolerance) {
                    return false; // Found separating axis with margin
                }
            }
            
            return true; // Significant overlap
        }
        
        projectPolygon(vertices, axis) {
            let min = Infinity;
            let max = -Infinity;
            
            for (let v of vertices) {
                const projection = v.x * axis.x + v.y * axis.y;
                min = Math.min(min, projection);
                max = Math.max(max, projection);
            }
            
            return { min, max };
        }

        getBoundingBox(vertices) {
            return {
                minX: Math.min(...vertices.map(v => v.x)),
                maxX: Math.max(...vertices.map(v => v.x)),
                minY: Math.min(...vertices.map(v => v.y)),
                maxY: Math.max(...vertices.map(v => v.y))
            };
        }
        
        bboxesOverlap(box1, box2) {
            return !(box1.maxX < box2.minX || box2.maxX < box1.minX ||
                    box1.maxY < box2.minY || box2.maxY < box1.minY);
        }

        drawTileNumbers(tiling) {
            this.ctx.fillStyle = 'white';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            for (let i = 0; i < tiling.tiles.length; i++) {
                const tile = tiling.tiles[i];
                
                // Calculate center of tile
                const verts = this.getTransformedVertices(tile);
                const centerX = verts.reduce((sum, v) => sum + v.x, 0) / verts.length;
                const centerY = verts.reduce((sum, v) => sum + v.y, 0) / verts.length;
                
                const label = i.toString();
                
                // Draw text with outline for visibility
                this.ctx.strokeText(label, centerX, centerY);
                this.ctx.fillText(label, centerX, centerY);
            }
        }
    }    

    const explorer = new InfiniteExplorer('canvas');

    window.regenerate = () => {
        const seed = parseInt(document.getElementById('seed').value);
        explorer.setSeed(seed);
    };

    window.randomSeed = () => explorer.randomSeed();