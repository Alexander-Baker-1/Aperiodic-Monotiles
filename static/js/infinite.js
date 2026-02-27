import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class InfiniteExplorer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.edgeConstraints = this.buildEdgeConstraints();

        this.neighborEdges = {
            false: {
                false: {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
                       5:[0,4,10],6:[3,9,13],7:[8,12],8:[3,7,9,13],9:[2,6,8,12],10:[1,5],11:[0,4],12:[3,7,9],13:[2,6,8]},
                true:  {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0,4],11:[1,5],12:[2,6,8],13:[3,7,9]}
            },
            true: {
                false: {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0,4],11:[1,5],12:[2,6,8],13:[3,7,9]},
                true:  {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
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
        const translation = Matrix.translation(this.canvas.width / 2, this.canvas.height / 2);
    
        let rootTransform = translation.multiply(rotation).multiply(scaling);
        if (shouldFlip) {
            rootTransform = translation.multiply(rotation).multiply(Matrix.flipX()).multiply(scaling);
        }
    
        // ONLY ADD ONCE
        tiling.addRootTile(rootTransform, rootColor);
        this.rootTile = tiling.tiles[0];
    
        const TARGET_TILES = 12; 
        this.backtrackingFill(tiling, TARGET_TILES);
    
        tiling.draw(this.ctx, 0);
        this.drawTileNumbers(tiling);
    }

    backtrackingFill(tiling, targetCount) {
        const root = tiling.tiles[0];
        const rootPos = this._centroid(this.getTransformedVertices(root));
    
        // Initial expansion: Surround the root first
        this.fillTile(root, tiling);
    
        // Everything added by the root is now our starting "Frontier"
        let frontier = tiling.tiles.slice(1);
    
        let safety = 0;
        while (tiling.tiles.length < targetCount && frontier.length > 0 && safety < 200) {
            // SORT: This is the "secret sauce." 
            // We always pick the tile closest to the center to fill next.
            frontier.sort((a, b) => {
                const posA = this._centroid(this.getTransformedVertices(a));
                const posB = this._centroid(this.getTransformedVertices(b));
                return Math.hypot(posA.x - rootPos.x, posA.y - rootPos.y) - 
                       Math.hypot(posB.x - rootPos.x, posB.y - rootPos.y);
            });
    
            const currentTile = frontier.shift();
            const countBefore = tiling.tiles.length;
    
            // Try to fill all 14 edges of the chosen tile
            this.fillTile(currentTile, tiling);
    
            // If any brand new tiles were added, put them in the frontier
            if (tiling.tiles.length > countBefore) {
                const newTiles = tiling.tiles.slice(countBefore);
                frontier.push(...newTiles);
            }
            safety++;
        }
    }

    fillTile(tile, tiling) {
        const isFlipped = tile.color === Tile.DARK_BLUE;
        
        // 1. Check what is already around this tile
        this.markSharedEdges(tile, tiling.tiles);
        
        const edgeCandidates = [];
        for (let e = 0; e < 14; e++) {
            if (tile.occupiedEdges?.some(oe => oe.rootEdge === e)) {
                edgeCandidates.push({ rootEdge: e, candidates: [], nextIdx: 0 });
                continue;
            }
            edgeCandidates.push({ 
                rootEdge: e, 
                candidates: this._buildCandidates(tile, e, isFlipped), 
                nextIdx: 0 
            });
        }
        
        // 2. Iterate through all 14 edges
        for (let edgeIdx = 0; edgeIdx < 14; edgeIdx++) {
            // Refresh shared edges so we don't double-place in a gap
            this.markSharedEdges(tile, tiling.tiles);
            
            if (tile.occupiedEdges?.some(e => e.rootEdge === edgeIdx)) continue;
            
            const entry = edgeCandidates[edgeIdx];
            let placedSuccessfully = false;
            
            while (entry.nextIdx < entry.candidates.length) {
                const candidate = entry.candidates[entry.nextIdx++];
                
                // Check logical constraints
                if (!this.canPlaceWithConstraints(tile, edgeIdx, candidate.sourceEdgeNum, candidate.reversedSource, candidate.flippedParam)) continue;
                
                const result = this._tryPlace({ tile, rootEdge: edgeIdx }, candidate, tiling);
                
                if (result === 'duplicate') {
                    placedSuccessfully = true; 
                    break; // Space is already occupied by someone else
                } else if (result) {
                    const { neighbor, occupiedEntry } = result;
    
                    // STACKING PROTECTION:
                    const neighborCentroid = this._centroid(this.getTransformedVertices(neighbor));
                    const parentCentroid = this._centroid(this.getTransformedVertices(tile));
                    const dist = Math.hypot(neighborCentroid.x - parentCentroid.x, neighborCentroid.y - parentCentroid.y);
    
                    if (dist < 1.0) {
                        console.warn("Rejected stacked tile.");
                        continue; 
                    }
    
                    // VALID PLACEMENT
                    if (!tile.occupiedEdges) tile.occupiedEdges = [];
                    tile.occupiedEdges.push(occupiedEntry);
                    
                    // Link the neighbor back to the parent
                    neighbor.occupiedEdges = [{ 
                        rootEdge: candidate.sourceEdgeNum, 
                        sourceEdge: edgeIdx, 
                        reversed: candidate.reversedSource, 
                        flipped: candidate.flippedParam 
                    }];
                    
                    tiling.tiles.push(neighbor);
                    this.markSharedEdges(neighbor, tiling.tiles);
                    placedSuccessfully = true;
                    break;
                }
            }
        }
    }

    markSharedEdges(newTile, allTiles) {
        const newVerts = this.getTransformedVertices(newTile);
        const TOL = 1.0;
    
        for (const existingTile of allTiles) {
            if (existingTile === newTile) continue;
            const exVerts = this.getTransformedVertices(existingTile);
    
            for (let e = 0; e < 14; e++) {
                const ep1 = exVerts[e];
                const ep2 = exVerts[(e + 1) % 14];
                const v1shared = newVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < TOL);
                const v2shared = newVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < TOL);
                if (v1shared && v2shared) {
                    console.log(`  markShared: tile ${allTiles.indexOf(existingTile)} edge ${e} shared with tile ${allTiles.indexOf(newTile)}`);
                    if (!existingTile.occupiedEdges) existingTile.occupiedEdges = [];
                    if (!existingTile.occupiedEdges.some(oe => oe.rootEdge === e)) {
                        existingTile.occupiedEdges.push({ rootEdge: e, sourceEdge: -1, reversed: false, flipped: false });
                    }
                }
            }
    
            for (let e = 0; e < 14; e++) {
                const ep1 = newVerts[e];
                const ep2 = newVerts[(e + 1) % 14];
                const v1shared = exVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < TOL);
                const v2shared = exVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < TOL);
                if (v1shared && v2shared) {
                    if (!newTile.occupiedEdges) newTile.occupiedEdges = [];
                    if (!newTile.occupiedEdges.some(oe => oe.rootEdge === e)) {
                        newTile.occupiedEdges.push({ rootEdge: e, sourceEdge: -1, reversed: false, flipped: false });
                    }
                }
            }
        }
    }

    _undo(stack, frontier, tiling) {
        const frame = stack.pop();
        console.log(`  tile ${tiling.tiles.indexOf(tile)} BACKTRACK: undoing edge ${frame.edgeIdx}`);
        // Reset the candidate index for the edge we're returning to
        edgeCandidates[frame.edgeIdx].nextIdx = frame.candidateIdx; // try next candidate
        tiling.tiles.splice(tiling.tiles.indexOf(frame.placedTile), 1);

        const parent = srcEntry.tile;
        if (parent.occupiedEdges) {
            const oi = parent.occupiedEdges.indexOf(occupiedEntry);
            if (oi >= 0) parent.occupiedEdges.splice(oi, 1);
        }

        for (let i = frontier.length - 1; i >= 0; i--) {
            if (frontier[i].tile === placedTile) frontier.splice(i, 1);
        }

        frontier.splice(Math.min(srcEntryIdx, frontier.length), 0, srcEntry);
    }

    _cleanFrontier(frontier) {
        for (let i = frontier.length - 1; i >= 0; i--) {
            const f = frontier[i];
            if (f.tile.occupiedEdges?.some(n => n.rootEdge === f.rootEdge)) {
                frontier.splice(i, 1);
            }
        }
    }

    _addToFrontier(tile, tiling, frontier) {
        const parentIsFlipped = (tile.color === Tile.DARK_BLUE);
        
        // Refresh shared edges before checking what's occupied
        this.markSharedEdges(tile, tiling.tiles);
        
        const occupied = tile.occupiedEdges || [];
    
        for (let rootEdge = 0; rootEdge < 14; rootEdge++) {
            if (occupied.some(n => n.rootEdge === rootEdge)) continue;
    
            const candidates = this._buildCandidates(tile, rootEdge, parentIsFlipped);
    
            if (candidates.length > 0) {
                frontier.push({ tile, rootEdge, candidates, nextIdx: 0 });
            }
        }
    }

    _buildCandidates(tile, rootEdge, parentIsFlipped) {
        const candidates = [];
    
        const colorOptions = parentIsFlipped ? [false] : [true, false];
    
        for (const tryDarkBlue of colorOptions) {
            const desiredColor   = tryDarkBlue ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
            const desiredFlipped = tryDarkBlue;
            const reversedSource = (desiredFlipped === parentIsFlipped);
    
            const validSources = this.neighborEdges[parentIsFlipped][desiredFlipped][rootEdge];
            if (!validSources?.length) continue;
    
            for (const sourceEdgeNum of validSources) {
                for (const flippedParam of [true, false]) {
                    candidates.push({ rootEdge, sourceEdgeNum, desiredColor, desiredFlipped, flippedParam, reversedSource });
                }
            }
        }
    
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
    
        return candidates;
    }

    _nextValidCandidate(entry, tiling) {
        const isRoot = entry.tile === this.rootTile;
        while (entry.nextIdx < entry.candidates.length) {
            const c = entry.candidates[entry.nextIdx++];
            const ok = this.canPlaceWithConstraints(entry.tile, c.rootEdge, c.sourceEdgeNum, c.reversedSource, c.flippedParam);
            if (!ok && isRoot) {
                console.log(`ROOT Edge ${entry.rootEdge}: blocked src=${c.sourceEdgeNum} rev=${c.reversedSource} flip=${c.flippedParam}`);
            }
            if (ok) return c;
        }
        if (isRoot) {
            console.log(`ROOT Edge ${entry.rootEdge}: ALL ${entry.candidates.length} candidates exhausted`);
        }
        return null;
    }

    _tryPlace(entry, candidate, tiling) {
        const { rootEdge, sourceEdgeNum, desiredColor, desiredFlipped, flippedParam, reversedSource } = candidate;
        const isRoot = entry.tile === this.rootTile;
    
        const sourceEdge = reversedSource
            ? [(sourceEdgeNum + 1) % 14, sourceEdgeNum]
            : [sourceEdgeNum, (sourceEdgeNum + 1) % 14];
        const targetEdge = [rootEdge, (rootEdge + 1) % 14];
    
        const neighbor = Tile.createAttached(sourceEdge, entry.tile, targetEdge, { flipped: flippedParam, color: desiredColor });
        if (!neighbor?.transform) {
            if (isRoot) console.log(`ROOT Edge ${rootEdge}: no transform`);
            return null;
        }
    
        const det = neighbor.transform.values[0] * neighbor.transform.values[4]
                  - neighbor.transform.values[1] * neighbor.transform.values[3];
        if ((det < 0) !== desiredFlipped) {
            if (isRoot) console.log(`ROOT Edge ${rootEdge} src=${sourceEdgeNum} rev=${reversedSource} flip=${flippedParam}: det failed det=${det.toFixed(0)} want=${desiredFlipped}`);
            return null;
        }
    
        const centroid = this._centroid(this.getTransformedVertices(neighbor));
        const parentCentroid = this._centroid(this.getTransformedVertices(entry.tile));
        const edgeP1 = entry.tile.getVertex(rootEdge);
        const edgeP2 = entry.tile.getVertex(rootEdge === 13 ? 14 : rootEdge + 1);
    
        if (!this._onOppositeSides(edgeP1, edgeP2, centroid, parentCentroid)) {
            if (isRoot) console.log(`ROOT Edge ${rootEdge} src=${sourceEdgeNum} rev=${reversedSource} flip=${flippedParam}: wrong side`);
            else console.log(`  GEOM FAIL wrong-side: tile=${tiling.tiles.indexOf(entry.tile)} edge=${rootEdge} src=${sourceEdgeNum}`);
            return null;
        }
    
        neighbor.color = desiredColor;
    
        const conflict = this.hasGeometricConflict(neighbor, tiling.tiles, entry.tile);
        if (conflict === 'duplicate') {
            return 'duplicate';
        }
        if (conflict) {
            if (isRoot) console.log(`ROOT Edge ${rootEdge} src=${sourceEdgeNum} rev=${reversedSource} flip=${flippedParam}: geometric conflict`);
            else console.log(`  GEOM FAIL conflict: tile=${tiling.tiles.indexOf(entry.tile)} edge=${rootEdge} src=${sourceEdgeNum}`);
            return null;
        }
    
        if (isRoot) console.log(`ROOT Edge ${rootEdge} src=${sourceEdgeNum} rev=${reversedSource} flip=${flippedParam}: ✅ PLACED`);
    
        const occupiedEntry = { rootEdge, sourceEdge: sourceEdgeNum, reversed: reversedSource, flipped: flippedParam };
        return { neighbor, occupiedEntry };
    }

    canPlaceWithConstraints(tile, rootEdge, sourceEdge, reversed, flipped) {
        if (!tile.occupiedEdges) tile.occupiedEdges = [];

        for (const neighbor of tile.occupiedEdges) {
            const { rootEdge: oRE, sourceEdge: oSE, reversed: oRev, flipped: oFlip } = neighbor;

            const rc1 = this.edgeConstraints[oRE];
            if (rc1) {
                const sc1 = rc1[oSE];
                if (sc1 && sc1.reversed === oRev && sc1.flipped === oFlip) {
                    for (const [bR, bS] of sc1.blocks) {
                        if (bR === rootEdge && bS === sourceEdge) return false;
                    }
                }
            }

            const rc2 = this.edgeConstraints[rootEdge];
            if (rc2) {
                const sc2 = rc2[sourceEdge];
                if (sc2 && sc2.reversed === reversed && sc2.flipped === flipped) {
                    for (const [bR, bS] of sc2.blocks) {
                        if (bR === oRE && bS === oSE) return false;
                    }
                }
            }
        }

        return true;
    }

    hasGeometricConflict(newTile, existingTiles, parentTile) {
        if (existingTiles.length === 0) return false;
        const newVerts = this.getTransformedVertices(newTile);
        const newBBox = this.getBoundingBox(newVerts);
        
        for (const existingTile of existingTiles) {
            if (existingTile === parentTile) continue;
            const exVerts = this.getTransformedVertices(existingTile);
            const exBBox = this.getBoundingBox(exVerts);
            if (!this.bboxesOverlap(newBBox, exBBox)) continue;
            
            const shared = this.countSharedVertices(newVerts, exVerts);
            
            if (shared >= 9) {
                // This tile already exists there - mark the edge occupied and skip
                if (!newTile.occupiedEdges) newTile.occupiedEdges = [];
                // Don't conflict, but caller should mark this edge occupied
                return 'duplicate'; // special return value
            }
            if (newTile.color === Tile.DARK_BLUE && existingTile.color === Tile.DARK_BLUE && shared > 0) {
                console.log(`    conflict: dark-dark shared=${shared} with tile ${existingTiles.indexOf(existingTile)}`);
                return true;
            }
            if (shared === 3 || shared >= 5) {
                console.log(`    conflict: bad shared=${shared} with tile ${existingTiles.indexOf(existingTile)}`);
                return true;
            }
            if (shared === 0 && this.polygonsOverlap(newVerts, exVerts)) {
                console.log(`    conflict: SAT overlap with tile ${existingTiles.indexOf(existingTile)}`);
                return true;
            }
        }
        return false;
    }

    getTransformedVertices(tile) {
        return tile.geometry.vertices.map(v => {
            const t = tile.transform.transformPoint(v);
            return { x: t.x, y: t.y };
        });
    }

    countSharedVertices(verts1, verts2) {
        const TOL = 0.05;
        let count = 0;
        for (const v1 of verts1) {
            for (const v2 of verts2) {
                const dx = v1.x - v2.x, dy = v1.y - v2.y;
                if (Math.sqrt(dx*dx + dy*dy) < TOL) { count++; break; }
            }
        }
        return count;
    }

    polygonsOverlap(poly1, poly2, tolerance = 0.1) {
        const axes = [];
        const len1 = poly1.length - 1;
        const len2 = poly2.length - 1;
        
        for (let i = 0; i < len1; i++) {
            const dx = poly1[(i+1)%len1].x - poly1[i].x;
            const dy = poly1[(i+1)%len1].y - poly1[i].y;
            if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) continue;
            axes.push({ x: -dy, y: dx });
        }
        for (let i = 0; i < len2; i++) {
            const dx = poly2[(i+1)%len2].x - poly2[i].x;
            const dy = poly2[(i+1)%len2].y - poly2[i].y;
            if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) continue;
            axes.push({ x: -dy, y: dx });
        }
        for (const axis of axes) {
            const p1 = this.projectPolygon(poly1.slice(0, len1), axis);
            const p2 = this.projectPolygon(poly2.slice(0, len2), axis);
            if (Math.max(p2.min - p1.max, p1.min - p2.max) > 0) return false;
        }
        return true;
    }

    projectPolygon(vertices, axis) {
        let min = Infinity, max = -Infinity;
        for (const v of vertices) {
            const p = v.x * axis.x + v.y * axis.y;
            min = Math.min(min, p); max = Math.max(max, p);
        }
        return { min, max };
    }

    getBoundingBox(vertices) {
        return {
            minX: Math.min(...vertices.map(v => v.x)),
            maxX: Math.max(...vertices.map(v => v.x)),
            minY: Math.min(...vertices.map(v => v.y)),
            maxY: Math.max(...vertices.map(v => v.y)),
        };
    }

    bboxesOverlap(b1, b2) {
        return !(b1.maxX < b2.minX || b2.maxX < b1.minX || b1.maxY < b2.minY || b2.maxY < b1.minY);
    }

    drawTileNumbers(tiling) {
        this.ctx.fillStyle   = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth   = 3;
        this.ctx.font        = 'bold 16px Arial';
        this.ctx.textAlign   = 'center';
        this.ctx.textBaseline = 'middle';

        for (let i = 0; i < tiling.tiles.length; i++) {
            const verts   = this.getTransformedVertices(tiling.tiles[i]);
            const centerX = verts.reduce((s, v) => s + v.x, 0) / verts.length;
            const centerY = verts.reduce((s, v) => s + v.y, 0) / verts.length;
            this.ctx.strokeText(i.toString(), centerX, centerY);
            this.ctx.fillText(i.toString(),   centerX, centerY);
        }
    }

    _centroid(verts) {
        return {
            x: verts.reduce((s, v) => s + v.x, 0) / verts.length,
            y: verts.reduce((s, v) => s + v.y, 0) / verts.length
        };
    }

    _onOppositeSides(edgeP1, edgeP2, pointA, pointB) {
        const dx = edgeP2.x - edgeP1.x;
        const dy = edgeP2.y - edgeP1.y;
        const signA = Math.sign(dx * (pointA.y - edgeP1.y) - dy * (pointA.x - edgeP1.x));
        const signB = Math.sign(dx * (pointB.y - edgeP1.y) - dy * (pointB.x - edgeP1.x));
        return signA !== 0 && signB !== 0 && signA !== signB;
    }

    buildEdgeConstraints() {
        return {
            0: {
                5:  { reversed: true,  flipped: false, blocks: [[1,10],[2,9],[12,3],[12,7],[12,9],[13,2],[13,6],[13,8]] },
                11: { reversed: true,  flipped: false, blocks: [[1,0],[1,4],[1,10],[2,3],[2,9],[2,13],[3,12],[12,3],[12,7],[13,2],[13,6]] },
                10: { reversed: false, flipped: true,  blocks: [[1,11],[2,12],[3,13]] }
            },
            1: {
                0:  { reversed: true,  flipped: false, blocks: [[0,11],[2,3],[2,9],[2,13],[3,2],[3,6],[3,8],[3,12],[4,1]] },
                4:  { reversed: true,  flipped: false, blocks: [[0,11],[2,3],[2,9],[2,13],[3,6],[3,12],[12,9],[13,8]] },
                10: { reversed: true,  flipped: false, blocks: [[0,5],[0,11],[2,3],[2,9],[2,13],[3,12],[12,3],[12,7],[13,2],[13,6]] },
                11: { reversed: false, flipped: true,  blocks: [[0,10],[2,12],[13,3]] }
            },
            2: {
                3:  { reversed: true,  flipped: false, blocks: [[0,11],[1,0],[1,4],[1,10],[3,6],[3,12]] },
                9:  { reversed: true,  flipped: false, blocks: [[0,5],[0,11],[1,0],[1,4],[1,10],[3,12],[12,3],[12,7],[13,2],[13,6]] },
                13: { reversed: true,  flipped: false, blocks: [[0,11],[1,0],[1,4],[1,10],[3,2],[3,6],[3,8],[3,12],[4,1],[4,5]] },
                12: { reversed: false, flipped: true,  blocks: [[0,10],[1,11],[3,13]] }
            },
            3: {
                2:  { reversed: true,  flipped: false, blocks: [[1,0],[2,13],[4,1],[4,5],[4,11],[5,10],[6,9]] },
                6:  { reversed: true,  flipped: false, blocks: [[1,0],[1,4],[1,10],[2,3],[2,13],[4,1],[4,5],[4,11],[5,10],[6,9]] },
                8:  { reversed: true,  flipped: false, blocks: [[1,0],[2,13],[4,1],[4,5]] },
                12: { reversed: true,  flipped: false, blocks: [[0,11],[1,0],[1,4],[1,10],[2,3],[2,9],[2,13],[4,1],[4,5]] },
                13: { reversed: false, flipped: true,  blocks: [[0,10],[1,11],[2,12]] }
            },
            4: {
                1:  { reversed: true,  flipped: false, blocks: [[1,0],[2,13],[3,2],[3,8],[5,10],[6,9]] },
                5:  { reversed: true,  flipped: false, blocks: [[1,0],[1,4],[2,3],[2,13],[3,2],[3,6],[3,8],[3,12],[5,10],[6,9]] },
                11: { reversed: true,  flipped: false, blocks: [[3,2],[3,6],[3,9],[5,0],[5,4],[5,10],[6,3],[6,9],[6,13],[7,12]] },
                10: { reversed: false, flipped: true,  blocks: [[5,11],[6,12],[7,13]] }
            },
            5: {
                0:  { reversed: true,  flipped: false, blocks: [[4,11],[6,3],[6,9],[6,13],[7,8],[7,12],[8,7],[8,9]] },
                4:  { reversed: true,  flipped: false, blocks: [[4,11],[6,3],[6,9],[6,13],[7,12],[8,9]] },
                10: { reversed: true,  flipped: false, blocks: [[3,2],[3,6],[3,12],[4,1],[4,5],[4,11],[6,3],[6,9],[6,13],[7,8],[7,12]] },
                11: { reversed: false, flipped: true,  blocks: [[4,10],[6,12],[7,13]] }
            },
            6: {
                3:  { reversed: true,  flipped: false, blocks: [[4,11],[5,0],[5,4],[5,10],[7,12],[8,9]] },
                9:  { reversed: true,  flipped: false, blocks: [[3,2],[3,6],[4,1],[4,5],[4,11],[5,0],[5,4],[5,10],[7,12]] },
                13: { reversed: true,  flipped: false, blocks: [[4,11],[5,0],[5,4],[5,10],[7,8],[7,12],[8,7],[8,9]] },
                12: { reversed: false, flipped: true,  blocks: [[4,10],[5,11],[7,13]] }
            },
            7: {
                8:  { reversed: true,  flipped: false, blocks: [[4,11],[5,0],[5,4],[5,10],[6,13],[8,3],[8,7],[8,9],[8,13],[9,6],[9,12],[10,5]] },
                12: { reversed: true,  flipped: false, blocks: [[4,11],[5,0],[5,4],[5,10],[6,3],[6,9],[6,13],[8,7],[8,9]] },
                13: { reversed: false, flipped: true,  blocks: [[4,10],[5,11],[6,12]] }
            },
            8: {
                3:  { reversed: true,  flipped: false, blocks: [[7,8],[9,12],[10,5]] },
                7:  { reversed: true,  flipped: false, blocks: [[5,0],[6,13],[7,8],[7,12],[9,6],[10,5]] },
                9:  { reversed: true,  flipped: false, blocks: [[5,0],[5,4],[5,10],[6,3],[6,9],[6,13],[7,8],[7,12]] },
                13: { reversed: true,  flipped: false, blocks: [[7,8],[9,2],[9,6],[9,8],[9,12],[10,1],[10,5],[11,0],[11,4]] },
                12: { reversed: false, flipped: true,  blocks: [[9,13],[10,0],[11,1]] }
            },
            9: {
                2:  { reversed: true,  flipped: false, blocks: [[8,13],[10,1],[10,5],[11,0],[11,4]] },
                6:  { reversed: true,  flipped: false, blocks: [[7,8],[8,7],[8,13],[10,1],[10,5],[11,0],[11,4]] },
                8:  { reversed: true,  flipped: false, blocks: [[8,13],[10,1],[10,5],[11,0],[11,4],[12,3],[12,7]] },
                12: { reversed: true,  flipped: false, blocks: [[7,8],[8,3],[8,7],[8,9],[8,13],[10,5],[11,4]] },
                13: { reversed: false, flipped: true,  blocks: [[8,12],[10,0],[11,1]] }
            },
            10: {
                1:  { reversed: true,  flipped: false, blocks: [[8,13],[9,6],[9,8],[11,0],[11,4]] },
                5:  { reversed: true,  flipped: false, blocks: [[7,8],[8,3],[8,7],[8,13],[9,2],[9,6],[9,8],[9,12],[11,0],[11,4]] },
                0:  { reversed: false, flipped: true,  blocks: [[9,13],[11,1],[11,5],[12,2],[12,6],[12,8],[13,3],[13,7],[13,9]] },
                4:  { reversed: false, flipped: true,  blocks: [[11,1],[11,5],[12,2],[12,6],[12,8],[13,3],[13,7],[13,9]] }
            },
            11: {
                0:  { reversed: true,  flipped: false, blocks: [[8,13],[9,2],[9,6],[9,8],[10,1],[10,5]] },
                4:  { reversed: true,  flipped: false, blocks: [[8,13],[9,2],[9,6],[9,8],[9,12],[10,1],[10,5]] },
                1:  { reversed: false, flipped: true,  blocks: [[8,12],[9,13],[10,0],[10,4],[12,2],[12,6],[12,8],[13,3],[13,7],[13,9]] },
                5:  { reversed: false, flipped: true,  blocks: [[10,0],[10,4],[12,2],[12,6],[12,8],[13,3],[13,7],[13,9]] }
            },
            12: {
                3:  { reversed: true,  flipped: false, blocks: [[0,5],[0,11],[1,10],[2,9],[13,2],[13,6],[13,8]] },
                7:  { reversed: true,  flipped: false, blocks: [[0,5],[0,11],[1,10],[2,9],[13,2],[13,6],[13,8]] },
                9:  { reversed: true,  flipped: false, blocks: [[0,5],[1,4],[13,2],[13,6],[13,8]] },
                2:  { reversed: false, flipped: true,  blocks: [[9,13],[10,0],[10,4],[11,1],[11,5],[13,3],[13,7],[13,8]] },
                6:  { reversed: false, flipped: true,  blocks: [[10,0],[10,4],[11,1],[11,5],[13,3],[13,7],[13,9]] },
                8:  { reversed: false, flipped: true,  blocks: [[10,0],[10,4],[11,1],[11,5],[13,3],[13,7],[13,9]] }
            },
            13: {
                2:  { reversed: true,  flipped: false, blocks: [[0,5],[0,11],[1,10],[3,9],[12,3],[12,7],[12,9]] },
                6:  { reversed: true,  flipped: false, blocks: [[0,5],[0,11],[1,10],[2,9],[12,3],[12,7],[12,9]] },
                8:  { reversed: true,  flipped: false, blocks: [[0,5],[1,4],[12,3],[12,7],[12,9]] },
                3:  { reversed: false, flipped: true,  blocks: [[10,0],[10,4],[11,1],[11,5],[12,2],[12,6],[12,8]] },
                7:  { reversed: false, flipped: true,  blocks: [[10,0],[10,4],[11,1],[11,5],[12,2],[12,6],[12,8]] },
                9:  { reversed: false, flipped: true,  blocks: [[11,1],[11,5],[12,2],[12,6],[12,8]] }
            }
        };
    }
}

const explorer = new InfiniteExplorer('canvas');

window.regenerate  = () => {
    const seed = parseInt(document.getElementById('seed').value);
    explorer.setSeed(seed);
};
window.randomSeed = () => explorer.randomSeed();