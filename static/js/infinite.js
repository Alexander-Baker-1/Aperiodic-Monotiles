import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';
import { Transform } from './common/Transform.js';

class InfiniteExplorer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.edgeConstraints = this.buildEdgeConstraints();

        this.neighborEdges = {
            false: {
                false: {0:[5,11],1:[0,4,10],2:[3,9,13],3:[2,6,8,12],4:[1,5,11],
                       5:[0,4,10],6:[3,9,13],7:[8,12],8:[3,7,9,13],9:[2,6,8,12],10:[1,5],11:[0,4],12:[3,7,9],13:[2,6,8]},
                true:  {0:[10],1:[11],2:[12],3:[13],4:[10],5:[11],6:[12],7:[13],8:[12],9:[13],10:[0],11:[1,5],12:[2,6,8],13:[3,7,9]}
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
        const dpr = window.devicePixelRatio || 1;
        
        // Set physical pixel size
        this.canvas.width = 800 * dpr;
        this.canvas.height = 600 * dpr;
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';
        
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

        const geometry = new HatGeometry(1, Math.sqrt(3));
        const tiling = new TilingSystem(geometry);

        const shouldFlip = this.seededRandom() < 0.5;
        const rootColor = shouldFlip ? Tile.COLORS.DARK_BLUE : Tile.COLORS.LIGHT_BLUE;
        const randomAngle = this.seededRandom() * 2 * Math.PI;

        let rootTransform = Transform.identity()
            .multiply(Transform.translation(this.canvas.width / 2, this.canvas.height / 2))
            .multiply(Transform.rotation(randomAngle))
            .multiply(Transform.scale(20));

        if (shouldFlip) {
            rootTransform = Transform.identity()
                .multiply(Transform.translation(this.canvas.width / 2, this.canvas.height / 2))
                .multiply(Transform.rotation(randomAngle))
                .multiply(Transform.flipX())
                .multiply(Transform.scale(20));
        }

        tiling.addRootTile(rootTransform, rootColor);
        this.rootTile = tiling.tiles[0];

        const TARGET_TILES = 12;
        this.backtrackingFill(tiling, TARGET_TILES);

        tiling.render(this.ctx, 0);
        this.drawTileNumbers(tiling);
        for (const tile of tiling.tiles) {
            tile.drawLabels(this.ctx);
        }        
    }

    _pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    backtrackingFill(tiling, targetCount) {
        const rootPos = this._centroid(this.getTransformedVertices(tiling.tiles[0]));
        const stack = [];
        const frontier = [tiling.tiles[0]];
        const processed = new Set();
        const retryCount = new Map(); // track retries per tile
    
        let safety = 0;
        while (tiling.tiles.length < targetCount && safety < 100) {
            safety++;
    
            if (frontier.length === 0) break;
    
            const tile = frontier[0];
    
            if (processed.has(tile)) {
                frontier.shift();
                continue;
            }
    
            const retries = retryCount.get(tile) || 0;
            if (retries > 3) {
                // Give up on this tile, move on
                frontier.shift();
                processed.add(tile);
                continue;
            }
    
            const result = this._fillOneTile(tile, tiling, targetCount);
    
            if (result.success) {
                processed.add(tile);
                frontier.shift();
                for (const { neighbor } of result.placed) {
                    if (!processed.has(neighbor)) frontier.push(neighbor);
                }
                stack.push({ tile, placed: result.placed });
            } else {
                retryCount.set(tile, retries + 1);
    
                if (stack.length === 0) {
                    frontier.shift();
                    continue;
                }
    
                const last = stack.pop();
    
                for (const { neighbor, parentEdge, neighborEdge } of last.placed) {
                    console.log(`  backtrack: removing tile ${tiling.tiles.indexOf(neighbor)}`);
                    // Clean up ghost references BEFORE removing from tiling.tiles
                    for (const t of tiling.tiles) {
                        for (const [e, occupier] of [...t.occupiedEdges]) {
                            if (occupier === neighbor) {
                                console.log(`    clearing edge ${e} of tile ${tiling.tiles.indexOf(t)}`);
                                t.occupiedEdges.delete(e);
                            }
                        }
                    }
                    
                    const idx = tiling.tiles.indexOf(neighbor);
                    if (idx >= 0) tiling.tiles.splice(idx, 1);
                    last.tile.occupiedEdges.delete(parentEdge);
                    neighbor.occupiedEdges.delete(neighborEdge);
                    const fi = frontier.indexOf(neighbor);
                    if (fi >= 0) frontier.splice(fi, 1);
                    processed.delete(neighbor);
                    retryCount.delete(neighbor);
                }
    
                processed.delete(last.tile);
                frontier.unshift(last.tile);
            }
        }
    
        console.log(`Done. Placed ${tiling.tiles.length} tiles in ${safety} iterations.`);
    }

    _fillDarkBlueTile(tile, tiling) {
        const pattern = [
            { parentEdge: 0,  sourceEdge: 10, color: Tile.COLORS.LIGHT_BLUE },
            { parentEdge: 4,  sourceEdge: 10, color: Tile.COLORS.LIGHT_BLUE },
            { parentEdge: 8,  sourceEdge: 12, color: Tile.COLORS.LIGHT_BLUE },
            { parentEdge: 10, sourceEdge: 4,  color: Tile.COLORS.LIGHT_BLUE },
        ];
    
        const placed = [];
        for (const { parentEdge, sourceEdge, color } of pattern) {
            if (tile.occupiedEdges.has(parentEdge)) continue;
    
            const transform = tiling.computeAttachedTransform(tile, parentEdge, sourceEdge, color);
            const neighbor = new Tile(tiling.geometry, transform, color, false);
    
            const conflict = this.hasGeometricConflict(neighbor, tiling.tiles, tile);
            if (conflict === 'duplicate') {
                tile.occupiedEdges.set(parentEdge, null);
                continue;
            }
            if (conflict) continue;
    
            tiling.commitTile(tile, parentEdge, neighbor, sourceEdge);
            this.markSharedEdges(neighbor, tiling.tiles);
            placed.push({ neighbor, parentEdge, neighborEdge: sourceEdge });
        }
    
        return placed;
    }
    
    _fillOneTile(tile, tiling, targetCount) {
        if (tile.flipped) {
            const placed = this._fillDarkBlueTile(tile, tiling);
            return { success: true, placed };
        }
    
        const isFlipped = tile.flipped;
        // this.markSharedEdges(tile, tiling.tiles);
        const placed = [];
        const tileIdx = tiling.tiles.indexOf(tile);
    
        console.group(`fillOneTile: tile ${tileIdx} (flipped=${isFlipped})`);
        console.log(`occupied edges at start:`, [...tile.occupiedEdges.keys()]);
    
        // Clean stale occupiedEdges before snapshotting
        for (const [e, occupier] of [...tile.occupiedEdges]) {
            if (occupier && !tiling.tiles.includes(occupier)) {
                tile.occupiedEdges.delete(e);
            }
        }

        // Snapshot which edges were occupied BEFORE we start placing
        const initiallyOccupied = new Set(tile.occupiedEdges.keys());
    
        const edgeCandidates = [];
        for (let e = 0; e < 14; e++) {
            edgeCandidates.push({
                candidates: this._buildCandidates(tile, e, isFlipped),
                nextIdx: 0
            });
        }
    
        for (let edgeIdx = 0; edgeIdx < 14; edgeIdx++) {
            if (tiling.tiles.length >= targetCount) break;
    
            // Skip if occupied before we started
            if (initiallyOccupied.has(edgeIdx)) {
                const initialOccupier = tile.occupiedEdges.get(edgeIdx);
                console.log(`  edge ${edgeIdx}: already occupied by tile ${tiling.tiles.indexOf(initialOccupier)}`);
                continue;
            }

            // Only skip if a tile WE placed is the occupier
            const occupier = tile.occupiedEdges.get(edgeIdx);
            if (occupier && placed.some(p => p.neighbor === occupier)) {
                console.log(`  edge ${edgeIdx}: filled by neighbor tile ${tiling.tiles.indexOf(occupier)}`);
                continue;
            }
            // Clear any other markings — don't trust pre-existing markSharedEdges
            tile.occupiedEdges.delete(edgeIdx);
    
            const entry = edgeCandidates[edgeIdx];
    
            if (entry.candidates.length === 0) {
                console.log(`  edge ${edgeIdx}: no candidates, skipping`);
                continue;
            }
    
            console.log(`  edge ${edgeIdx}: trying ${entry.candidates.length} candidates`);
            let filled = false;
    
            while (entry.nextIdx < entry.candidates.length) {
                const candidate = entry.candidates[entry.nextIdx++];
                console.log(`    candidate: sourceEdge=${candidate.sourceEdgeNum} color=${candidate.desiredColor}`);
                const result = this._tryPlace({ tile, rootEdge: edgeIdx }, candidate, tiling);
                console.log(`    result: ${result === 'duplicate' ? 'duplicate' : result ? 'placed' : 'rejected'}`);
    
                if (result === 'duplicate') {
                    // this.markSharedEdges(tile, tiling.tiles);
                    if (tile.occupiedEdges.has(edgeIdx)) {
                        filled = true;
                        break;
                    }
                    console.warn(`    false duplicate on edge ${edgeIdx} — treating as rejection`);
                    continue;
                } else if (result) {
                    const { neighbor } = result;
                    this.markSharedEdges(neighbor, tiling.tiles);
                    // Explicitly mark only this edge as occupied by neighbor
                    tile.occupiedEdges.set(edgeIdx, neighbor);
                    placed.push({ neighbor, parentEdge: edgeIdx, neighborEdge: candidate.sourceEdgeNum });

                    // Eagerly check if this placement created a dead end on any neighbor
                    // if (this._hasDeadEnd(neighbor, tiling)) {
                    //     tiling.tiles.splice(tiling.tiles.indexOf(neighbor), 1);
                    //     tile.occupiedEdges.delete(edgeIdx);
                    //     for (const [e, occupier] of [...tile.occupiedEdges]) {
                    //         if (occupier === neighbor) tile.occupiedEdges.delete(e);
                    //     }
                    //     placed.pop();
                    //     console.log(`    dead end detected — undoing placement`);
                    //     continue; // try next candidate
                    // }
                    
                    filled = true;
                    break;
                }
            }
    
            if (!filled && !tile.occupiedEdges.has(edgeIdx)) {
                console.warn(`  edge ${edgeIdx}: ALL candidates exhausted — FAILING`);
                console.groupEnd();
                for (const { neighbor, parentEdge, neighborEdge } of placed) {
                    const idx = tiling.tiles.indexOf(neighbor);
                    if (idx >= 0) tiling.tiles.splice(idx, 1);
                    tile.occupiedEdges.delete(parentEdge);
                    neighbor.occupiedEdges.delete(neighborEdge);
                    // Clear any edges on tile marked by this neighbor as a side effect
                    for (const [e, occupier] of [...tile.occupiedEdges]) {
                        if (occupier === neighbor) tile.occupiedEdges.delete(e);
                    }
                }
                return { success: false, placed: [] };
            }
        }
    
        // After the loop, verify all edges are truly occupied
        // this.markSharedEdges(tile, tiling.tiles);
        const unoccupied = [];
        for (let e = 0; e < 14; e++) {
            if (!tile.occupiedEdges.has(e)) unoccupied.push(e);
        }
        if (unoccupied.length > 0) {
            console.warn(`  tile still has unoccupied edges after fill: ${unoccupied} — FAILING`);
            for (const { neighbor, parentEdge, neighborEdge } of placed) {
                const idx = tiling.tiles.indexOf(neighbor);
                if (idx >= 0) tiling.tiles.splice(idx, 1);
                tile.occupiedEdges.delete(parentEdge);
                neighbor.occupiedEdges.delete(neighborEdge);
                for (const [e, occupier] of [...tile.occupiedEdges]) {
                    if (occupier === neighbor) tile.occupiedEdges.delete(e);
                }
            }
            console.groupEnd();
            return { success: false, placed: [] };
        }

        console.log(`  done. placed ${placed.length} new tiles`);
        for (const p of placed) {
            console.log(`    tile ${tiling.tiles.indexOf(p.neighbor)} on edge ${p.parentEdge} via sourceEdge=${p.neighborEdge}`);
        }
        console.groupEnd();
        return { success: true, placed };
    }
    
    _addEdgesToFrontier(tile, frontier, rootPos) {
        const isFlipped = tile.flipped;
        for (let e = 0; e < 14; e++) {
            if (tile.occupiedEdges.has(e)) continue;
            // Don't add duplicates
            if (frontier.some(f => f.tile === tile && f.edgeIdx === e)) continue;
            
            frontier.push({
                tile,
                edgeIdx: e,
                candidates: this._buildCandidates(tile, e, isFlipped),
                candidateIdx: 0
            });
        }
    }
    
    _cleanFrontier(frontier, tiling) {
        for (let i = frontier.length - 1; i >= 0; i--) {
            const f = frontier[i];
            // Remove if tile was removed from tiling or edge is now occupied
            if (!tiling.tiles.includes(f.tile) || f.tile.occupiedEdges.has(f.edgeIdx)) {
                frontier.splice(i, 1);
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
                const v1shared = newVerts.some(v => {
                    const d = Math.hypot(v.x - ep1.x, v.y - ep1.y);
                    if (d < 2.0) console.log(`  ep1 dist: ${d.toFixed(4)}`);
                    return d < TOL;
                });
                const v2shared = newVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < TOL);
                if (v1shared && v2shared) existingTile.occupiedEdges.set(e, newTile);
            }
    
            for (let e = 0; e < 14; e++) {
                const ep1 = newVerts[e];
                const ep2 = newVerts[(e + 1) % 14];
                const v1shared = exVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < TOL);
                const v2shared = exVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < TOL);
                if (v1shared && v2shared) newTile.occupiedEdges.set(e, existingTile);
            }
        }
    }

    _buildCandidates(tile, rootEdge, parentIsFlipped) {
        let lightBlue = [];
        let darkBlue = [];
    
        if (!parentIsFlipped) {
            // Light blue candidates
            const lightSources = this.neighborEdges[parentIsFlipped][false][rootEdge];
            if (lightSources?.length) {
                for (const sourceEdgeNum of lightSources) {
                    lightBlue.push({ rootEdge, sourceEdgeNum, desiredColor: Tile.COLORS.LIGHT_BLUE, desiredFlipped: false });
                }
            }
            // Dark blue candidates
            const darkSources = this.neighborEdges[parentIsFlipped][true][rootEdge];
            if (darkSources?.length) {
                for (const sourceEdgeNum of darkSources) {
                    darkBlue.push({ rootEdge, sourceEdgeNum, desiredColor: Tile.COLORS.DARK_BLUE, desiredFlipped: true });
                }
            }
        } else {
            // Parent is dark blue — only light blue allowed
            const lightSources = this.neighborEdges[parentIsFlipped][false][rootEdge];
            if (lightSources?.length) {
                for (const sourceEdgeNum of lightSources) {
                    lightBlue.push({ rootEdge, sourceEdgeNum, desiredColor: Tile.COLORS.LIGHT_BLUE, desiredFlipped: false });
                }
            }
        }
    
        lightBlue = lightBlue.filter(c => !this._isBlocked(tile, c.rootEdge, c.sourceEdgeNum));
        darkBlue = darkBlue.filter(c => !this._isBlocked(tile, c.rootEdge, c.sourceEdgeNum));

        // Shuffle light blue only
        for (let i = lightBlue.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom() * (i + 1));
            [lightBlue[i], lightBlue[j]] = [lightBlue[j], lightBlue[i]];
        }
    
        // Dark blue always comes last
        return [...lightBlue, ...darkBlue];
    }

    _tryPlace(entry, candidate, tiling, dryRun = false) {
        const { rootEdge, sourceEdgeNum, desiredColor } = candidate;
    
        const transform = tiling.computeAttachedTransform(
            entry.tile, rootEdge, sourceEdgeNum, desiredColor
        );
    
        const neighbor = new Tile(tiling.geometry, transform, desiredColor, desiredColor === Tile.COLORS.DARK_BLUE);
    
        const p1 = entry.tile.getVertexWorldPos(rootEdge);
        const p2 = entry.tile.getVertexWorldPos((rootEdge + 1) % 14);
        const parentCentroid = this._centroid(this.getTransformedVertices(entry.tile));
        const neighborCentroid = this._centroid(this.getTransformedVertices(neighbor));
    
        if (!this._onOppositeSides(p1, p2, neighborCentroid, parentCentroid)) return null;
    
        const dist = Math.hypot(neighborCentroid.x - parentCentroid.x, neighborCentroid.y - parentCentroid.y);
        if (dist < 1.0) return null;
    
        const conflict = this.hasGeometricConflict(neighbor, tiling.tiles, entry.tile);
        if (!dryRun) {
            console.log(`    conflict check: ${conflict}, shared verts with each tile:`);
            for (const t of tiling.tiles) {
                if (t === entry.tile) continue;
                const exVerts = this.getTransformedVertices(t);
                const shared = this.countSharedVertices(this.getTransformedVertices(neighbor), exVerts);
                if (shared > 0) console.log(`      vs tile ${tiling.tiles.indexOf(t)}: shared=${shared}`);
            }
        }
        if (conflict === 'duplicate') return 'duplicate';
        if (conflict) return null;
    
        if (dryRun) return { neighbor };
    
        tiling.commitTile(entry.tile, rootEdge, neighbor, sourceEdgeNum);
        return { neighbor, occupiedEntry: { rootEdge, sourceEdge: sourceEdgeNum } };
    }

    _shrinkPolygon(verts, amount = 0.1) {
        const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
        const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length;
        return verts.map(v => {
            const dx = v.x - cx;
            const dy = v.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.001) return { x: v.x, y: v.y };
            return {
                x: v.x - (dx / dist) * amount,
                y: v.y - (dy / dist) * amount
            };
        });
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
            if (shared >= 9) return 'duplicate';
            if (newTile.color === Tile.COLORS.DARK_BLUE && existingTile.color === Tile.COLORS.DARK_BLUE && shared > 0) return true;
            if (shared >= 5) return true;
            if (shared === 3) {
                const hasInterior = newVerts.some(v => {
                    const isShared = exVerts.some(ev => Math.hypot(v.x - ev.x, v.y - ev.y) < 0.05);
                    const inside = !isShared && this._pointInPolygon(v, exVerts);
                    if (inside) console.log(`  point inside polygon detected`);
                    return inside;
                });
                if (hasInterior) return true;
            }
            if (shared === 0 && this.polygonsOverlap(newVerts, exVerts)) return true;
        }
        return false;
    }

    // _hasDeadEnd(newTile, tiling) {
    //     const newVerts = this.getTransformedVertices(newTile);
        
    //     for (const t of tiling.tiles) {
    //         if (t === newTile || t.flipped) continue; // skip dark blue tiles
            
    //         const tVerts = this.getTransformedVertices(t);
    //         const isNeighbor = tVerts.some(v => 
    //             newVerts.some(nv => Math.hypot(v.x - nv.x, v.y - nv.y) < 1.0)
    //         );
    //         if (!isNeighbor) continue;
            
    //         for (let e = 0; e < 14; e++) {
    //             if (t.occupiedEdges.has(e)) continue;
    //             const candidates = this._buildCandidates(t, e, false);
    //             if (candidates.length === 0) continue;
    //             const hasValid = candidates.some(c => {
    //                 const result = this._tryPlace({ tile: t, rootEdge: e }, c, tiling, true);
    //                 return result && result !== 'duplicate';
    //             });
    //             if (!hasValid) {
    //                 console.log(`    dead end: tile ${tiling.tiles.indexOf(t)} edge ${e} has no valid candidates`);
    //                 return true;
    //             }
    //         }
    //     }
    //     return false;
    // }

    getTransformedVertices(tile) {
        return tile.geometry.vertices.map(v => tile.transform.transformPoint(v));
    }

    countSharedVertices(verts1, verts2) {
        const TOL = 0.05;
        let count = 0;
        for (const v1 of verts1) {
            for (const v2 of verts2) {
                if (Math.hypot(v1.x - v2.x, v1.y - v2.y) < TOL) { count++; break; }
            }
        }
        return count;
    }

    polygonsOverlap(poly1, poly2) {
        const axes = [];
        const len1 = poly1.length;
        const len2 = poly2.length;

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
            const p1 = this.projectPolygon(poly1, axis);
            const p2 = this.projectPolygon(poly2, axis);
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
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (let i = 0; i < tiling.tiles.length; i++) {
            const verts = this.getTransformedVertices(tiling.tiles[i]);
            const centerX = verts.reduce((s, v) => s + v.x, 0) / verts.length;
            const centerY = verts.reduce((s, v) => s + v.y, 0) / verts.length;
            this.ctx.strokeText(i.toString(), centerX, centerY);
            this.ctx.fillText(i.toString(), centerX, centerY);
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

    _isBlocked(tile, rootEdge, sourceEdgeNum) {
        // Check all already-placed neighbors on this tile
        for (const [placedEdge, neighbor] of tile.occupiedEdges) {
            if (!neighbor || typeof neighbor !== 'object') continue;
            // Find what sourceEdge was used for this placed neighbor
            const placedSourceEdge = neighbor.occupiedEdges ? 
                [...neighbor.occupiedEdges.entries()].find(([e, t]) => t === tile)?.[0] : null;
            if (placedSourceEdge === null || placedSourceEdge === undefined) continue;
            
            // Look up constraints for this placed connection
            const constraints = this.edgeConstraints[placedEdge]?.[placedSourceEdge];
            if (!constraints) continue;
            
            // Check if [rootEdge, sourceEdgeNum] is in the blocked list
            const blocked = constraints.blocks.some(([be, bs]) => be === rootEdge && bs === sourceEdgeNum);
            if (blocked) return true;
        }
        return false;
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

window.regenerate = () => {
    const seed = parseInt(document.getElementById('seed').value);
    explorer.setSeed(seed);
};
window.randomSeed = () => explorer.randomSeed();