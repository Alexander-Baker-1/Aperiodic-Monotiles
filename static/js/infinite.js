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
            
            // Randomly choose to flip or not
            const shouldFlip = this.seededRandom() < 0.5;
            
            // Dark blue = flipped, Light blue = unflipped (ALWAYS)
            const rootColor = shouldFlip ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
            
            const randomAngle = this.seededRandom() * 2 * Math.PI;
            const rotation = Matrix.rotation(randomAngle);
            const scaling = Matrix.scale(20);
            const translation = Matrix.translation(400, 300);
            
            // Apply flip if and only if it's dark blue
            let rootTransform;
            if (shouldFlip) {
                const flip = Matrix.flipX();
                rootTransform = translation.multiply(rotation).multiply(flip).multiply(scaling);
            } else {
                rootTransform = translation.multiply(rotation).multiply(scaling);
            }
            
            const rootTile = tiling.addRootTile(rootTransform, rootColor);
            
            // Place tiles one at a time
            for (let i = 0; i < 2; i++) {
                // First, try to use the root tile
                let parentTile = tiling.tiles[0]; // Always start with root
                
                // If root is full (all 14 edges occupied), then look for other tiles
                const rootOccupiedCount = parentTile.occupiedEdges ? parentTile.occupiedEdges.length : 0;
                if (rootOccupiedCount >= 14) {
                    // Root is full, find other tiles with free edges
                    const tilesWithFreeEdges = tiling.tiles.filter(tile => {
                        const occupiedCount = tile.occupiedEdges ? tile.occupiedEdges.length : 0;
                        return occupiedCount < 14;
                    });
                    
                    if (tilesWithFreeEdges.length === 0) {
                        break;
                    }
                    
                    // Pick a random tile from those with free edges
                    const randomTileIndex = Math.floor(this.seededRandom() * tilesWithFreeEdges.length);
                    parentTile = tilesWithFreeEdges[randomTileIndex];
                }
                
                const actualIndex = tiling.tiles.indexOf(parentTile);

                // Place one neighbor on that tile
                const beforeCount = tiling.tiles.length;
                this.placeRandomNeighbor(tiling, parentTile);
                const afterCount = tiling.tiles.length;
            }
                        
            tiling.draw(this.ctx, 0);
            tiling.drawVertexLabels(this.ctx);
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
                    4: { reversed: true, flipped: false, blocks: [[0, 11], [2, 3], [2, 9], [2, 13], [3, 6], [3, 12], [12, 9]] },
                    10: { reversed: true, flipped: false, blocks: [[0, 5], [0, 11], [2, 3], [2, 9], [2, 13], [3, 12], [12, 3], [12, 7], [13, 2], [13, 6]] },
                    
                    // Opposite chirality
                    11: { reversed: false, flipped: true, blocks: [[0, 10], [2, 12], [13, 3]] }
                },
                2: {
                    // Same chirality
                    3: { reversed: true, flipped: false, blocks: [[0, 11], [1, 0], [1, 4], [1, 10], [3, 6], [3, 12]] },
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
                    8: { reversed: true, flipped: false, blocks: [[0, 5], [12, 3], [12, 7], [12, 9]] },
                    
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
                                
                // DIRECTION 1: Check if occupied edge blocks new placement
                const rootConstraints1 = this.edgeConstraints[occupiedRootEdge];
                if (rootConstraints1) {
                    const sourceConstraints1 = rootConstraints1[occupiedSourceEdge];
                    if (sourceConstraints1) {
                        
                        if (sourceConstraints1.reversed === occupiedReversed && 
                            sourceConstraints1.flipped === occupiedFlipped) {
                            
                            
                            for (let [blockedRoot, blockedSource] of sourceConstraints1.blocks) {
                                if (blockedRoot === rootEdge && blockedSource === sourceEdge) {
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
                        
                        if (sourceConstraints2.reversed === reversed && 
                            sourceConstraints2.flipped === flipped) {
                            
                            
                            for (let [blockedRoot, blockedSource] of sourceConstraints2.blocks) {
                                if (blockedRoot === occupiedRootEdge && blockedSource === occupiedSourceEdge) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
            
            return true;
        }
        
        placeRandomNeighbor(tiling, tile) {
            const parentIsFlipped = (tile.color === Tile.DARK_BLUE); // Dark blue = always flipped
                    
            const unflippedToUnflipped = {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
                5:[0,4,10],6:[3,9,13],7:[8,12],8:[3,7,9,13],9:[2,6,8,12],10:[1,5],11:[0,4],12:[3,7,9],13:[2,6,8]};
            const unflippedToFlipped   = {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0,4],11:[1,5],12:[2,6,8],13:[3,7,9]};
            const flippedToUnflipped   = {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0,4],11:[1,5],12:[2,6,8],13:[3,7,9]};
            const flippedToFlipped     = {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
                5:[0,4,10],6:[3,9,13],7:[8,12],8:[3,7,9,13],9:[2,6,8,12],10:[1,5],11:[0,4],12:[3,7,9],13:[2,6,8]};
        
            const neighborEdges = {
                false: { false: unflippedToUnflipped, true: unflippedToFlipped },
                true:  { false: flippedToUnflipped,     true: flippedToFlipped   }
            };
        
            if (!tile.occupiedEdges) tile.occupiedEdges = [];
        
            // Create array of all possible placements
            const allPossiblePlacements = [];
            
            for (let rootEdge = 0; rootEdge < 14; rootEdge++) {
                // Skip already occupied edges
                if (tile.occupiedEdges.some(n => n.rootEdge === rootEdge)) continue;
                
                // Try both neighbor colors randomly
                for (let tryDarkBlue of [true, false]) {
                    const desiredColor = tryDarkBlue ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
                    const desiredFlipped = tryDarkBlue;
                    
                    // Try BOTH flipped parameter values
                    for (let flippedParam of [true, false]) {
                        const sameChirality = (desiredFlipped === parentIsFlipped);
                        const validSources = neighborEdges[parentIsFlipped][desiredFlipped][rootEdge];
                        
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
            
            // Shuffle the placements array for randomness
            for (let i = allPossiblePlacements.length - 1; i > 0; i--) {
                const j = Math.floor(this.seededRandom() * (i + 1));
                [allPossiblePlacements[i], allPossiblePlacements[j]] = [allPossiblePlacements[j], allPossiblePlacements[i]];
            }
            
            // Try each placement
            for (let placement of allPossiblePlacements) {
                const { rootEdge, sourceEdgeNum, desiredColor, desiredFlipped, flippedParam, sameChirality } = placement;

                console.log(`\nTrying: Root edge ${rootEdge}, Source edge ${sourceEdgeNum}, Color: ${desiredColor === Tile.DARK_BLUE ? 'DARK_BLUE' : 'LIGHT_BLUE'}, flippedParam: ${flippedParam}`);

                const reversedSource = sameChirality;

                const sourceEdge = reversedSource
                    ? [(sourceEdgeNum + 1) % 14, sourceEdgeNum]
                    : [sourceEdgeNum, (sourceEdgeNum + 1) % 14];

                const targetEdge = [rootEdge, (rootEdge + 1) % 14];
                const neighbor = Tile.createAttached(sourceEdge, tile, targetEdge, {flipped: flippedParam, color: desiredColor});

                if (!neighbor || !neighbor.transform) continue;

                // Check actual chirality
                const det = neighbor.transform.values[0] * neighbor.transform.values[4] - 
                            neighbor.transform.values[1] * neighbor.transform.values[3];
                const actuallyFlipped = det < 0;

                if (actuallyFlipped !== desiredFlipped) {
                    continue; // Wrong chirality
                }

                neighbor.color = desiredColor;

                // Check for geometric conflict
                if (this.hasGeometricConflict(neighbor, tiling.tiles, tile)) {
                    continue;
                }

                // No conflict - place the tile
                tile.occupiedEdges.push({rootEdge, sourceEdge: sourceEdgeNum, reversed: reversedSource, flipped: flippedParam});
                neighbor.occupiedEdges = [{rootEdge: sourceEdgeNum, sourceEdge: rootEdge, reversed: reversedSource, flipped: flippedParam}];
                tiling.tiles.push(neighbor);
                return;
            }
        
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
    }    

    const explorer = new InfiniteExplorer('canvas');

    window.regenerate = () => {
        const seed = parseInt(document.getElementById('seed').value);
        explorer.setSeed(seed);
    };

    window.randomSeed = () => explorer.randomSeed();