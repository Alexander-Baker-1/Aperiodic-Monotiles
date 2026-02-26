import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class ConstraintTester {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.geometry = new HatGeometry(1, Math.sqrt(3));
        
        this.tiling = null;
        this.tiles = []; // All tiles in order
        this.lockedTiles = new Set([0]); // Root is always locked
        
        this.createUI();
        this.generate();
    }
    
    createUI() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.left = '10px';
        container.style.background = 'white';
        container.style.padding = '15px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        container.style.maxWidth = '350px';
        container.style.maxHeight = '90vh';
        container.style.overflowY = 'auto';
        
        const title = document.createElement('h3');
        title.textContent = 'Edge Constraint Tester';
        title.style.marginTop = '0';
        container.appendChild(title);
        
        // Parent tile selector
        const parentLabel = document.createElement('label');
        parentLabel.textContent = 'Parent tile: ';
        container.appendChild(parentLabel);
        
        this.parentTileSelect = document.createElement('select');
        this.parentTileSelect.addEventListener('change', () => this.updateEdgeAvailability());
        container.appendChild(this.parentTileSelect);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Root edge selector
        const rootEdgeLabel = document.createElement('label');
        rootEdgeLabel.textContent = 'Parent tile edge: ';
        container.appendChild(rootEdgeLabel);
        
        this.rootEdgeSelect = document.createElement('select');
        container.appendChild(this.rootEdgeSelect);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Neighbor source edge selector
        const sourceEdgeLabel = document.createElement('label');
        sourceEdgeLabel.textContent = 'Neighbor source edge: ';
        container.appendChild(sourceEdgeLabel);
        
        this.sourceEdgeSelect = document.createElement('select');
        for (let i = 0; i < 14; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Edge ${i}`;
            this.sourceEdgeSelect.appendChild(option);
        }
        container.appendChild(this.sourceEdgeSelect);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Reverse source edge checkbox
        const reverseLabel = document.createElement('label');
        reverseLabel.textContent = 'Reverse source edge: ';
        container.appendChild(reverseLabel);
        
        this.reverseCheckbox = document.createElement('input');
        this.reverseCheckbox.type = 'checkbox';
        container.appendChild(this.reverseCheckbox);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Color selector
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Neighbor color: ';
        container.appendChild(colorLabel);
    
        this.colorSelect = document.createElement('select');
        const colors = [
            { name: 'Light Blue (Unflipped)', value: 'unflipped' },
            { name: 'Dark Blue (Flipped)', value: 'flipped' }
        ];
        for (let c of colors) {
            const option = document.createElement('option');
            option.value = c.value;
            option.textContent = c.name;
            this.colorSelect.appendChild(option);
        }
        
        container.appendChild(this.colorSelect);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Buttons row 1
        const placeBtn = document.createElement('button');
        placeBtn.textContent = 'Place Neighbor';
        placeBtn.onclick = () => this.placeNeighbor();
        container.appendChild(placeBtn);
        
        const lockBtn = document.createElement('button');
        lockBtn.textContent = 'Lock All';
        lockBtn.style.marginLeft = '10px';
        lockBtn.onclick = () => this.lockAll();
        container.appendChild(lockBtn);
        
        container.appendChild(document.createElement('br'));
        
        // Buttons row 2
        const clearUnlockedBtn = document.createElement('button');
        clearUnlockedBtn.textContent = 'Clear Unlocked';
        clearUnlockedBtn.style.marginTop = '5px';
        clearUnlockedBtn.onclick = () => this.clearUnlocked();
        container.appendChild(clearUnlockedBtn);
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset All';
        resetBtn.style.marginLeft = '10px';
        resetBtn.style.marginTop = '5px';
        resetBtn.onclick = () => this.reset();
        container.appendChild(resetBtn);
        
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Status display
        this.statusDiv = document.createElement('div');
        this.statusDiv.style.fontSize = '12px';
        this.statusDiv.style.color = '#666';
        container.appendChild(this.statusDiv);
        
        // Placed tiles log
        container.appendChild(document.createElement('br'));
        const logTitle = document.createElement('strong');
        logTitle.textContent = 'Placed Tiles:';
        container.appendChild(logTitle);
        
        this.logDiv = document.createElement('div');
        this.logDiv.style.fontSize = '11px';
        this.logDiv.style.marginTop = '10px';
        this.logDiv.style.fontFamily = 'monospace';
        this.logDiv.style.maxHeight = '200px';
        this.logDiv.style.overflowY = 'auto';
        container.appendChild(this.logDiv);
        
        document.body.appendChild(container);
    }
    
    generate() {
        this.tiling = new TilingSystem(this.geometry);
        
        const scaling = Matrix.scale(30);
        const translation = Matrix.translation(400, 300);
    
        // IMPORTANT: no manual flip here
        const baseTransform = translation.multiply(scaling);
    
        const rootTile = this.tiling.addRootTile(
            baseTransform,
            Tile.DARK_BLUE // color determines chirality
        );
    
        rootTile.occupiedEdges = [];
        rootTile.tileIndex = 0;
    
        this.tiles = [rootTile];
    
        this.updateParentSelector();
        this.updateStatus();
        this.draw();
    }
    
    updateParentSelector() {
        this.parentTileSelect.innerHTML = '';
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            const option = document.createElement('option');
            option.value = i;
            const color = tile.color === Tile.DARK_BLUE ? 'DARK' : 'LIGHT';
            const occupiedCount = tile.occupiedEdges ? tile.occupiedEdges.length : 0;
            const locked = this.lockedTiles.has(i) ? '🔒' : '';
            option.textContent = `${locked}Tile ${i} (${color}, ${occupiedCount}/14 edges used)`;
            this.parentTileSelect.appendChild(option);
        }
        this.updateEdgeAvailability();
    }
    
    updateEdgeAvailability() {
        const parentIndex = parseInt(this.parentTileSelect.value);
        const parentTile = this.tiles[parentIndex];
        
        this.rootEdgeSelect.innerHTML = '';
        for (let i = 0; i < 14; i++) {
            const isOccupied = parentTile.occupiedEdges && 
                             parentTile.occupiedEdges.some(e => e.rootEdge === i);
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Edge ${i}${isOccupied ? ' (occupied)' : ''}`;
            option.disabled = isOccupied;
            this.rootEdgeSelect.appendChild(option);
        }
        
        // this.updateReverseCheckbox();
    }
    
    updateReverseCheckbox() {
        const parentIndex = parseInt(this.parentTileSelect.value);
        const parentTile = this.tiles[parentIndex];
        const parentIsFlipped = parentTile.color === Tile.DARK_BLUE;
        const neighborIsFlipped = this.colorSelect.value === 'flipped';
        
        // Same chirality = reversed
        this.reverseCheckbox.checked = (neighborIsFlipped === parentIsFlipped);
    }
    
    placeNeighbor() {
        const parentIndex = parseInt(this.parentTileSelect.value);
        const parentTile = this.tiles[parentIndex];
        const rootEdge = parseInt(this.rootEdgeSelect.value);
        const sourceEdge = parseInt(this.sourceEdgeSelect.value);
        const reversed = this.reverseCheckbox.checked;
        const isFlipped = this.colorSelect.value === 'flipped';
        
        // Check if edge already occupied
        if (parentTile.occupiedEdges && parentTile.occupiedEdges.some(e => e.rootEdge === rootEdge)) {
            alert(`Edge ${rootEdge} on tile ${parentIndex} already has a neighbor!`);
            return;
        }
        
        const neighborColor = isFlipped ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
        const targetEdge = [rootEdge, (rootEdge + 1) % 14];
        const source = reversed
            ? [(sourceEdge + 1) % 14, sourceEdge]
            : [sourceEdge, (sourceEdge + 1) % 14];
        
        try {
            const neighbor = Tile.createAttached(
                source,
                parentTile,
                targetEdge,
                { flipped: isFlipped, color: neighborColor }
            );
            
            // Verify chirality
            const det = neighbor.transform.values[0] * neighbor.transform.values[4] - 
                        neighbor.transform.values[1] * neighbor.transform.values[3];
            const actuallyFlipped = det < 0;
                        
            // Check for overlap with ALL existing tiles
            // if (this.checkOverlap(neighbor, parentTile)) {
            //     alert(`⚠️ OVERLAP DETECTED!\n\nTile ${parentIndex}, Edge ${rootEdge} → Source ${sourceEdge}${reversed ? ' (reversed)' : ''} ${isFlipped ? 'FLIPPED' : 'UNFLIPPED'}\n\nOverlaps with existing tiles!`);
            //     return;
            // }
            
            // Success! Add the neighbor
            neighbor.occupiedEdges = [];
            neighbor.tileIndex = this.tiles.length;
            neighbor.parentIndex = parentIndex;
            neighbor.parentEdge = rootEdge;
            neighbor.sourceEdgeUsed = sourceEdge;
            neighbor.wasReversed = reversed;
            
            if (!parentTile.occupiedEdges) parentTile.occupiedEdges = [];
            parentTile.occupiedEdges.push({
                rootEdge: rootEdge,
                sourceEdge: sourceEdge,
                reversed: reversed,
                flipped: reversed
            });
            
            this.tiles.push(neighbor);
            this.tiling.tiles.push(neighbor);
            this.markSharedEdges(neighbor);
            
            this.updateParentSelector();
            this.updateStatus();
            this.draw();
            
        } catch (error) {
            alert(`Error placing neighbor: ${error.message}`);
        }
    }

    markSharedEdges(newTile) {
        const newVerts = this.getTransformedVertices(newTile);
        
        for (const existingTile of this.tiles) {
            if (existingTile === newTile) continue;
            const exVerts = this.getTransformedVertices(existingTile);
            
            for (let e = 0; e < 14; e++) {
                const ep1 = exVerts[e];
                const ep2 = exVerts[(e + 1) % 14];
                
                // Check if both vertices of this edge are shared with newTile
                const v1shared = newVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < 1.0);
                const v2shared = newVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < 1.0);
                
                if (v1shared && v2shared) {
                    if (!existingTile.occupiedEdges) existingTile.occupiedEdges = [];
                    if (!existingTile.occupiedEdges.some(oe => oe.rootEdge === e)) {
                        existingTile.occupiedEdges.push({ rootEdge: e, sourceEdge: -1, reversed: false, flipped: false });
                    }
                }
            }
        }

        // Also mark edges on the new tile that are shared with existing tiles
        for (let e = 0; e < 14; e++) {
            const ep1 = newVerts[e];
            const ep2 = newVerts[(e + 1) % 14];
            
            for (const existingTile of this.tiles) {
                if (existingTile === newTile) continue;
                const exVerts = this.getTransformedVertices(existingTile);
                
                const v1shared = exVerts.some(v => Math.hypot(v.x - ep1.x, v.y - ep1.y) < 1.0);
                const v2shared = exVerts.some(v => Math.hypot(v.x - ep2.x, v.y - ep2.y) < 1.0);
                
                if (v1shared && v2shared) {
                    if (!newTile.occupiedEdges) newTile.occupiedEdges = [];
                    if (!newTile.occupiedEdges.some(oe => oe.rootEdge === e)) {
                        newTile.occupiedEdges.push({ rootEdge: e, sourceEdge: -1, reversed: false, flipped: false });
                    }
                }
            }
        }
    }
    
    lockAll() {
        for (let i = 0; i < this.tiles.length; i++) {
            this.lockedTiles.add(i);
        }
        this.updateParentSelector();
        this.updateStatus();
        console.log(`🔒 Locked ${this.tiles.length} tiles`);
    }
    
    clearUnlocked() {
        const newTiles = [];
        const newTiling = new TilingSystem(this.geometry);
        
        for (let i = 0; i < this.tiles.length; i++) {
            if (this.lockedTiles.has(i)) {
                const tile = this.tiles[i];
                tile.tileIndex = newTiles.length;
                tile.occupiedEdges = []; // reset completely
                newTiles.push(tile);
                newTiling.tiles.push(tile);
            }
        }
        
        this.tiles = newTiles;
        this.tiling = newTiling;
        
        // Rebuild locked indices
        this.lockedTiles = new Set(newTiles.map((_, i) => i));
        
        // Re-run markSharedEdges for all locked tiles
        for (const tile of this.tiles) {
            this.markSharedEdges(tile);
        }
        
        this.updateParentSelector();
        this.updateStatus();
        this.draw();
    }
    
    reset() {
        this.lockedTiles = new Set([0]); // Only root is locked
        this.generate();
    }
    
    checkOverlap(newTile, parentTile) {
        const newVerts = this.getTransformedVertices(newTile);
        
        for (let i = 0; i < this.tiles.length; i++) {
            const existingTile = this.tiles[i];
            if (existingTile === parentTile) continue;
            
            const existingVerts = this.getTransformedVertices(existingTile);
            
            const sharedVertices = this.countSharedVertices(newVerts, existingVerts);
            
            if (sharedVertices !== 0 && sharedVertices !== 2) {
                return true;
            }
            
            if (this.polygonsOverlap(newVerts, existingVerts)) {
                return true;
            }
        }
        return false;
    }
    
    getTransformedVertices(tile) {
        const baseVertices = tile.geometry.vertices;
        return baseVertices.map(v => {
            const transformed = tile.transform.transformPoint(v);
            return { x: transformed.x, y: transformed.y };
        });
    }
    
    countSharedVertices(verts1, verts2) {
        const tolerance = 1.0;
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
        
        for (let i = 0; i < poly1.length; i++) {
            const p1 = poly1[i];
            const p2 = poly1[(i + 1) % poly1.length];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            axes.push({ x: -edge.y, y: edge.x });
        }
        
        for (let i = 0; i < poly2.length; i++) {
            const p1 = poly2[i];
            const p2 = poly2[(i + 1) % poly2.length];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            axes.push({ x: -edge.y, y: edge.x });
        }
        
        for (let axis of axes) {
            const proj1 = this.projectPolygon(poly1, axis);
            const proj2 = this.projectPolygon(poly2, axis);
            
            const gap = Math.min(proj2.min - proj1.max, proj1.min - proj2.max);
            
            if (gap > tolerance) {
                return false;
            }
        }
        
        return true;
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
    
    updateStatus() {
        const lockedCount = this.lockedTiles.size;
        const unlockedCount = this.tiles.length - lockedCount;
        this.statusDiv.textContent = `Total: ${this.tiles.length} tiles (${lockedCount} locked, ${unlockedCount} unlocked)`;
        
        let log = '';
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            const color = tile.color === Tile.DARK_BLUE ? 'DARK' : 'LIGHT';
            const locked = this.lockedTiles.has(i) ? '🔒 ' : '   ';
            
            if (i === 0) {
                log += `${locked}0. ROOT [${color}]\n`;
            } else {
                log += `${locked}${i}. Parent:${tile.parentIndex} Edge:${tile.parentEdge} → Src:${tile.sourceEdgeUsed}${tile.wasReversed ? 'R' : ''} [${color}]\n`;
            }
        }
        
        this.logDiv.textContent = log;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.tiling.draw(this.ctx, 0);
        this.tiling.drawVertexLabels(this.ctx);
        
        this.drawTileNumbers();
    }
    
    drawTileNumbers() {
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            const verts = this.getTransformedVertices(tile);
            const centerX = verts.reduce((sum, v) => sum + v.x, 0) / verts.length;
            const centerY = verts.reduce((sum, v) => sum + v.y, 0) / verts.length;
            
            const label = this.lockedTiles.has(i) ? `${i}🔒` : i.toString();
            
            this.ctx.strokeText(label, centerX, centerY);
            this.ctx.fillText(label, centerX, centerY);
        }
    }
}

const tester = new ConstraintTester('canvas');