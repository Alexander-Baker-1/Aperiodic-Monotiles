import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';
import { Transform } from './common/Transform.js';

const SPATIAL_CELL_SIZE = 100;

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
        //this.seed = Math.floor(Math.random() * 1000000);
        this.seed = 244952;
        document.getElementById('seed').value = this.seed;
        this.generate();
    }

    seededRandom() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    // ─── Vertex / bbox cache ───────────────────────────────────────────────────

    _vertsCache = new Map();   // tile -> Float32Array-ish [{x,y}]
    _bboxCache  = new Map();   // tile -> {minX,maxX,minY,maxY}

    _invalidateCache(tile) {
        this._vertsCache.delete(tile);
        this._bboxCache.delete(tile);
    }

    getTransformedVertices(tile) {
        if (this._vertsCache.has(tile)) return this._vertsCache.get(tile);
        const verts = tile.geometry.vertices.map(v => tile.transform.transformPoint(v));
        this._vertsCache.set(tile, verts);
        return verts;
    }

    _cachedBBox(tile) {
        if (this._bboxCache.has(tile)) return this._bboxCache.get(tile);
        const bb = this.getBoundingBox(this.getTransformedVertices(tile));
        this._bboxCache.set(tile, bb);
        return bb;
    }

    // ─── Spatial grid ─────────────────────────────────────────────────────────

    _spatialGrid = new Map();   // "gx,gy" -> Set<tile>

    _gridCells(bb) {
        const x1 = Math.floor((bb.minX - SPATIAL_CELL_SIZE) / SPATIAL_CELL_SIZE);
        const x2 = Math.floor((bb.maxX + SPATIAL_CELL_SIZE) / SPATIAL_CELL_SIZE);
        const y1 = Math.floor((bb.minY - SPATIAL_CELL_SIZE) / SPATIAL_CELL_SIZE);
        const y2 = Math.floor((bb.maxY + SPATIAL_CELL_SIZE) / SPATIAL_CELL_SIZE);
        const cells = [];
        for (let x = x1; x <= x2; x++)
            for (let y = y1; y <= y2; y++)
                cells.push(`${x},${y}`);
        return cells;
    }

    _addToGrid(tile) {
        const bb = this._cachedBBox(tile);
        for (const k of this._gridCells(bb)) {
            if (!this._spatialGrid.has(k)) this._spatialGrid.set(k, new Set());
            this._spatialGrid.get(k).add(tile);
        }
    }

    _removeFromGrid(tile) {
        const bb = this._cachedBBox(tile);
        for (const k of this._gridCells(bb)) {
            this._spatialGrid.get(k)?.delete(tile);
        }
    }

    _nearbyTiles(bb) {
        const result = new Set();
        for (const k of this._gridCells(bb)) {
            const cell = this._spatialGrid.get(k);
            if (cell) for (const t of cell) result.add(t);
        }
        return result;
    }

    // ─── Generate ─────────────────────────────────────────────────────────────

    generate() {
        // Reset caches on new generation
        this._vertsCache = new Map();
        this._bboxCache  = new Map();
        this._spatialGrid = new Map();

        const dpr = window.devicePixelRatio || 1;
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
        this._addToGrid(tiling.tiles[0]);

        const TARGET_TILES = 36;
        this.backtrackingFill(tiling, TARGET_TILES);
        //this._reorderTilesBFS(tiling);
        tiling.render(this.ctx, 0);
        this.drawTileNumbers(tiling);
        for (const tile of tiling.tiles) {
            tile.drawLabels(this.ctx);
        }
    }

    // _reorderTilesBFS(tiling) {
    //     const root = tiling.tiles[0];
    //     const visited = new Set();
    //     const queue = [root];
    //     const ordered = [];
    //     visited.add(root);
    
    //     while (queue.length > 0) {
    //         const tile = queue.shift();
    //         ordered.push(tile);
    //         // Visit all neighbors via occupiedEdges
    //         for (const [_, neighbor] of tile.occupiedEdges) {
    //             if (neighbor && typeof neighbor === 'object' && !visited.has(neighbor)) {
    //                 visited.add(neighbor);
    //                 queue.push(neighbor);
    //             }
    //         }
    //     }
    
    //     // Any tiles not reachable via occupiedEdges (shouldn't happen, but be safe)
    //     for (const tile of tiling.tiles) {
    //         if (!visited.has(tile)) ordered.push(tile);
    //     }
    
    //     tiling.tiles = ordered;
    // }

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
        const stack = [];
        const frontier = [tiling.tiles[0]];
        const processed = new Set();
        const retryCount = new Map();

        let safety = 0;
        while (tiling.tiles.length < targetCount && safety < 1000) {
            console.log(`frontier: [${frontier.map(t => tiling.tiles.indexOf(t))}]`);
            safety++;

            if (frontier.length === 0) break;

            const tile = frontier[0];

            if (processed.has(tile)) {
                frontier.shift();
                continue;
            }

            const retries = retryCount.get(tile) || 0;
            if (retries > 50) {
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
                    for (const t of tiling.tiles) {
                        for (const [e, occupier] of [...t.occupiedEdges]) {
                            if (occupier === neighbor) {
                                // console.log(`    clearing edge ${e} of tile ${tiling.tiles.indexOf(t)}`);
                                t.occupiedEdges.delete(e);
                            }
                        }
                    }

                    // Remove from spatial grid and caches
                    this._removeFromGrid(neighbor);
                    this._invalidateCache(neighbor);

                    const idx = tiling.tiles.indexOf(neighbor);
                    if (idx >= 0) tiling.tiles.splice(idx, 1);
                    last.tile.occupiedEdges.delete(parentEdge);
                    last.tile.algorithmPlacedEdges?.delete(parentEdge);
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
            this._addToGrid(neighbor);
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
        const placed = [];
        const tileIdx = tiling.tiles.indexOf(tile);

        console.group(`fillOneTile: tile ${tileIdx} (flipped=${isFlipped})`);
        // console.log(`occupied edges at start:`, [...tile.occupiedEdges.keys()]);

        for (const [e, occupier] of [...tile.occupiedEdges]) {
            if (occupier && !tiling.tiles.includes(occupier)) {
                tile.occupiedEdges.delete(e);
            }
        }

        const initiallyOccupied = new Set(tile.occupiedEdges.keys());

        const edgeCandidates = [];
        for (let e = 0; e < 14; e++) {
            edgeCandidates.push({
                candidates: this._buildCandidates(tile, e, isFlipped),
                nextIdx: 0
            });
        }

        for (let edgeIdx = 0; edgeIdx < 14; edgeIdx++) {
            // console.log(`  edge ${edgeIdx}: occupier=${tiling.tiles.indexOf(tile.occupiedEdges.get(edgeIdx))}, initiallyOccupied=${initiallyOccupied.has(edgeIdx)}`);

            if (initiallyOccupied.has(edgeIdx)) {
                const initialOccupier = tile.occupiedEdges.get(edgeIdx);
                // console.log(`  edge ${edgeIdx}: already occupied by tile ${tiling.tiles.indexOf(initialOccupier)}`);
                continue;
            }

            const occupier = tile.occupiedEdges.get(edgeIdx);
            if (occupier && placed.some(p => p.neighbor === occupier)) {
                // console.log(`  edge ${edgeIdx}: filled by neighbor tile ${tiling.tiles.indexOf(occupier)}`);
                continue;
            }
            tile.occupiedEdges.delete(edgeIdx);

            const entry = edgeCandidates[edgeIdx];

            if (entry.candidates.length === 0) {
                // console.log(`  edge ${edgeIdx}: no candidates, skipping`);
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
                    if (tile.occupiedEdges.has(edgeIdx)) {
                        filled = true;
                        break;
                    }
                    // console.warn(`    false duplicate on edge ${edgeIdx} — treating as rejection`);
                    continue;
                } else if (result) {
                    const { neighbor } = result;
                    this._addToGrid(neighbor);
                    this.markSharedEdges(neighbor, tiling.tiles);
                    tile.occupiedEdges.set(edgeIdx, neighbor);
                    tile.algorithmPlacedEdges = tile.algorithmPlacedEdges || new Set();
                    tile.algorithmPlacedEdges.add(edgeIdx);
                    placed.push({ neighbor, parentEdge: edgeIdx, neighborEdge: candidate.sourceEdgeNum });
                    filled = true;
                    break;
                }
            }

            if (!filled && !tile.occupiedEdges.has(edgeIdx)) {
                // console.warn(`  edge ${edgeIdx}: ALL candidates exhausted — FAILING`);
                console.groupEnd();
                for (const { neighbor, parentEdge, neighborEdge } of placed) {
                    this._removeFromGrid(neighbor);
                    this._invalidateCache(neighbor);
                    const idx = tiling.tiles.indexOf(neighbor);
                    if (idx >= 0) tiling.tiles.splice(idx, 1);
                    tile.occupiedEdges.delete(parentEdge);
                    neighbor.occupiedEdges.delete(neighborEdge);
                    for (const [e, occupier] of [...tile.occupiedEdges]) {
                        if (occupier === neighbor) tile.occupiedEdges.delete(e);
                    }
                }
                return { success: false, placed: [] };
            }
        }

        const unoccupied = [];
        for (let e = 0; e < 14; e++) {
            if (!tile.occupiedEdges.has(e)) unoccupied.push(e);
        }
        if (unoccupied.length > 0) {
            // console.warn(`  tile still has unoccupied edges after fill: ${unoccupied} — FAILING`);
            for (const { neighbor, parentEdge, neighborEdge } of placed) {
                this._removeFromGrid(neighbor);
                this._invalidateCache(neighbor);
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

        // console.log(`  done. placed ${placed.length} new tiles`);
        for (const p of placed) {
            // console.log(`    tile ${tiling.tiles.indexOf(p.neighbor)} on edge ${p.parentEdge} via sourceEdge=${p.neighborEdge}`);
        }
        console.groupEnd();
        return { success: true, placed };
    }

    _addEdgesToFrontier(tile, frontier, rootPos) {
        const isFlipped = tile.flipped;
        for (let e = 0; e < 14; e++) {
            if (tile.occupiedEdges.has(e)) continue;
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
            if (!tiling.tiles.includes(f.tile) || f.tile.occupiedEdges.has(f.edgeIdx)) {
                frontier.splice(i, 1);
            }
        }
    }

    markSharedEdges(newTile, allTiles) {
        const newVerts = this.getTransformedVertices(newTile);
        const TOL = 1.0;

        // Only check nearby tiles via spatial grid
        const newBB = this._cachedBBox(newTile);
        const nearby = this._nearbyTiles(newBB);

        for (const existingTile of nearby) {
            if (existingTile === newTile) continue;
            const exVerts = this.getTransformedVertices(existingTile);

            for (let e = 0; e < 14; e++) {
                const ep1 = exVerts[e];
                const ep2 = exVerts[(e + 1) % 14];
                const v1shared = newVerts.some(v => {
                    const d = Math.hypot(v.x - ep1.x, v.y - ep1.y);
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
            const lightSources = this.neighborEdges[parentIsFlipped][false][rootEdge];
            if (lightSources?.length) {
                for (const sourceEdgeNum of lightSources) {
                    lightBlue.push({ rootEdge, sourceEdgeNum, desiredColor: Tile.COLORS.LIGHT_BLUE, desiredFlipped: false });
                }
            }
            const darkSources = this.neighborEdges[parentIsFlipped][true][rootEdge];
            if (darkSources?.length) {
                for (const sourceEdgeNum of darkSources) {
                    darkBlue.push({ rootEdge, sourceEdgeNum, desiredColor: Tile.COLORS.DARK_BLUE, desiredFlipped: true });
                }
            }
        } else {
            const lightSources = this.neighborEdges[parentIsFlipped][false][rootEdge];
            if (lightSources?.length) {
                for (const sourceEdgeNum of lightSources) {
                    lightBlue.push({ rootEdge, sourceEdgeNum, desiredColor: Tile.COLORS.LIGHT_BLUE, desiredFlipped: false });
                }
            }
        }

        lightBlue = lightBlue.filter(c => !this._isBlocked(tile, c.rootEdge, c.sourceEdgeNum));
        darkBlue  = darkBlue.filter(c =>  !this._isBlocked(tile, c.rootEdge, c.sourceEdgeNum));

        for (let i = lightBlue.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom() * (i + 1));
            [lightBlue[i], lightBlue[j]] = [lightBlue[j], lightBlue[i]];
        }

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
            // .log(`    conflict check: ${conflict}`);
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

        // Only check spatially nearby tiles
        const candidates = this._nearbyTiles(newBBox);

        for (const existingTile of candidates) {
            if (existingTile === parentTile) continue;
            if (!existingTiles.includes(existingTile)) continue; // guard stale grid entries
            const exVerts = this.getTransformedVertices(existingTile);
            const exBBox = this._cachedBBox(existingTile);
            if (!this.bboxesOverlap(newBBox, exBBox)) {
                continue;
            }

            const shared = this.countSharedVertices(newVerts, exVerts);
            // if (shared > 0) console.log(`    shared=${shared}`);
            if (shared >= 9) return 'duplicate';
            if (newTile.color === Tile.COLORS.DARK_BLUE && existingTile.color === Tile.COLORS.DARK_BLUE && shared > 0) return true;
            if (newTile.color === Tile.COLORS.DARK_BLUE || existingTile.color === Tile.COLORS.DARK_BLUE) {
                if (shared >= 7) return true;
            } else {
                if (shared >= 5) return true;
            }
            if (shared >= 2) {
                const exCentroid = this._centroid(exVerts);
                const newCentroid = this._centroid(newVerts);
                
                for (let i = 0; i < exVerts.length; i++) {
                    const ep1 = exVerts[i];
                    const ep2 = exVerts[(i+1) % exVerts.length];
                    const v1match = newVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < 0.05);
                    const v2match = newVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < 0.05);
                    if (v1match && v2match) {
                        if (!this._onOppositeSides(ep1, ep2, newCentroid, exCentroid)) return true;
                    }
                }
                
                for (let i = 0; i < newVerts.length; i++) {
                    const ep1 = newVerts[i];
                    const ep2 = newVerts[(i+1) % newVerts.length];
                    const v1match = exVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < 0.05);
                    const v2match = exVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < 0.05);
                    if (v1match && v2match) {
                        if (!this._onOppositeSides(ep1, ep2, exCentroid, newCentroid)) return true;
                    }
                }
            }
            if (shared === 0 && this.polygonsOverlap(newVerts, exVerts)) return true;
        }
        return false;
    }

    _edgesIntersect(p1, p2, p3, p4) {
        const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < 0.001) return false;
        const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
        const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
        return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
    }

    _polygonsIntersectEdges(vertsA, vertsB) {
        for (let i = 0; i < vertsA.length; i++) {
            const a1 = vertsA[i], a2 = vertsA[(i + 1) % vertsA.length];
            for (let j = 0; j < vertsB.length; j++) {
                const b1 = vertsB[j], b2 = vertsB[(j + 1) % vertsB.length];
                if (this._edgesIntersect(a1, a2, b1, b2)) return true;
            }
        }
        return false;
    }

    getBoundingBox(vertices) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of vertices) {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        }
        return { minX, maxX, minY, maxY };
    }

    bboxesOverlap(b1, b2, padding = 5) {
        return !(b1.maxX + padding < b2.minX - padding ||
                 b2.maxX + padding < b1.minX - padding ||
                 b1.maxY + padding < b2.minY - padding ||
                 b2.maxY + padding < b1.minY - padding);
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
            if (p < min) min = p;
            if (p > max) max = p;
        }
        return { min, max };
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
        const algorithmEdges = tile.algorithmPlacedEdges || new Set();
        for (const [placedEdge, neighbor] of tile.occupiedEdges) {
            if (!algorithmEdges.has(placedEdge)) continue;
            if (!neighbor || typeof neighbor !== 'object') continue;

            const placedSourceEdge = [...neighbor.occupiedEdges.entries()]
                .find(([e, t]) => t === tile)?.[0];
            if (placedSourceEdge === null || placedSourceEdge === undefined) continue;

            const constraints = this.edgeConstraints[placedEdge]?.[placedSourceEdge];

            if (!constraints) continue;

            const blocked = constraints.blocks.some(([be, bs]) => be === rootEdge && bs === sourceEdgeNum);
            if (blocked) {
                // console.log(`  _isBlocked: edge ${rootEdge} sourceEdge ${sourceEdgeNum} blocked by placed edge ${placedEdge}`);
                return true;
            }
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