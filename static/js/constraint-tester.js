import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class ConstraintTester {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.geometry = new HatGeometry(1, Math.sqrt(3));
        
        this.rootTile = null;
        this.neighbors = [];
        this.lockedNeighbors = [];
        this.discoveredConstraints = {};
        
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
        
        const title = document.createElement('h3');
        title.textContent = 'Edge Constraint Tester';
        title.style.marginTop = '0';
        container.appendChild(title);
        
        // Root tile color selector
        const rootColorLabel = document.createElement('label');
        rootColorLabel.textContent = 'Root tile color: ';
        container.appendChild(rootColorLabel);
        
        this.rootColorSelect = document.createElement('select');
        const rootColors = [
            { name: 'Light Blue (Unflipped)', value: 'unflipped' },
            { name: 'Dark Blue (Flipped)', value: 'flipped' }
        ];
        for (let c of rootColors) {
            const option = document.createElement('option');
            option.value = c.value;
            option.textContent = c.name;
            this.rootColorSelect.appendChild(option);
        }
        this.rootColorSelect.addEventListener('change', () => this.generate());
        container.appendChild(this.rootColorSelect);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Root edge selector
        const rootEdgeLabel = document.createElement('label');
        rootEdgeLabel.textContent = 'Root tile edge: ';
        container.appendChild(rootEdgeLabel);
        
        this.rootEdgeSelect = document.createElement('select');
        for (let i = 0; i < 14; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Edge ${i}`;
            this.rootEdgeSelect.appendChild(option);
        }
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
        
        // Auto-update reverse checkbox based on color
        this.colorSelect.addEventListener('change', () => {
            const isFlipped = this.colorSelect.value === 'flipped';
            const rootIsFlipped = this.rootColorSelect.value === 'flipped';
            
            // Unflipped→Unflipped or Flipped→Flipped = reversed
            if (isFlipped === rootIsFlipped) {
                this.reverseCheckbox.checked = true;
            } else {
                this.reverseCheckbox.checked = false;
            }
        });
        
        container.appendChild(this.colorSelect);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Place button
        const placeBtn = document.createElement('button');
        placeBtn.textContent = 'Place Neighbor';
        placeBtn.onclick = () => this.placeNeighbor();
        container.appendChild(placeBtn);
        
        // Lock button
        const lockBtn = document.createElement('button');
        lockBtn.textContent = 'Lock Current';
        lockBtn.style.marginLeft = '10px';
        lockBtn.onclick = () => this.lockNeighbors();
        container.appendChild(lockBtn);
        
        // Clear unlocked button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Unlocked';
        clearBtn.style.marginLeft = '10px';
        clearBtn.onclick = () => this.clear();
        container.appendChild(clearBtn);
        
        // Clear all button
        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.style.marginLeft = '10px';
        clearAllBtn.onclick = () => this.clearAll();
        container.appendChild(clearAllBtn);
        
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));
        
        // Status display
        this.statusDiv = document.createElement('div');
        this.statusDiv.style.fontSize = '12px';
        this.statusDiv.style.color = '#666';
        container.appendChild(this.statusDiv);
        
        // Placed neighbors log
        container.appendChild(document.createElement('br'));
        const logTitle = document.createElement('strong');
        logTitle.textContent = 'Placed Neighbors:';
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
        const tiling = new TilingSystem(this.geometry);
        
        const scaling = Matrix.scale(30);
        const translation = Matrix.translation(400, 300);
        
        // Determine root color from selector
        const rootIsFlipped = this.rootColorSelect.value === 'flipped';
        const rootColor = rootIsFlipped ? Tile.DARK_BLUE : Tile.LIGHT_BLUE;
        
        // Apply flip transform if root is unflipped (light blue)
        // In your system: LIGHT_BLUE = unflipped (needs flip in transform), DARK_BLUE = flipped (no flip)
        let baseTransform;
        if (rootIsFlipped) {
            // Dark blue (flipped) - no flip transform needed
            baseTransform = translation.multiply(scaling);
        } else {
            // Light blue (unflipped) - needs flip transform
            const flip = Matrix.flipX();
            baseTransform = translation.multiply(flip).multiply(scaling);
        }
        
        this.rootTile = tiling.addRootTile(baseTransform, rootColor);
        this.rootTile.occupiedEdges = new Set();
        
        // Re-add locked neighbors first
        for (let neighbor of this.lockedNeighbors) {
            tiling.tiles.push(neighbor);
            // Re-mark their edges as occupied
            for (let edge of neighbor.rootEdge) {
                this.rootTile.occupiedEdges.add(edge);
            }
        }
        
        // Then add unlocked neighbors
        for (let neighbor of this.neighbors) {
            tiling.tiles.push(neighbor);
        }
        
        this.updateStatus();
        this.draw(tiling);
    }
    
    placeNeighbor() {
        const rootEdge = parseInt(this.rootEdgeSelect.value);
        const sourceEdge = parseInt(this.sourceEdgeSelect.value);
        const reversed = this.reverseCheckbox.checked;
        const isFlipped = this.colorSelect.value === 'flipped';
        
        // Check if edge already occupied
        if (this.rootTile.occupiedEdges.has(rootEdge)) {
            alert(`Edge ${rootEdge} already has a neighbor!`);
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
                this.rootTile,
                targetEdge,
                { flipped: isFlipped, color: neighborColor }
            );
            
            neighbor.occupiedEdges = new Set([sourceEdge]);
            neighbor.sourceEdgeUsed = sourceEdge;
            neighbor.wasReversed = reversed;
            
            // Check for overlap with existing neighbors
            if (this.checkOverlap(neighbor)) {
                const conflicts = this.neighbors.map(n => 
                    `Edge ${Array.from(n.rootEdge)[0]} (src ${n.sourceEdgeUsed}${n.wasReversed ? 'R' : ''})`
                ).join(', ');
                
                alert(`⚠️ OVERLAP DETECTED!\n\nRoot edge ${rootEdge} → Source ${sourceEdge}${reversed ? ' (reversed)' : ''} ${isFlipped ? 'FLIPPED' : 'UNFLIPPED'}\n\nConflicts with: ${conflicts}`);
                return;
            }
            
            neighbor.rootEdge = new Set([rootEdge]);
            this.rootTile.occupiedEdges.add(rootEdge);
            this.neighbors.push(neighbor);
            
            this.generate();
            
        } catch (error) {
            alert(`Error placing neighbor: ${error.message}`);
        }
    }
    
    updateStatus() {
        this.statusDiv.textContent = `Neighbors placed: ${this.neighbors.length}`;
        
        // Log all placed neighbors
        let log = '';
        for (let i = 0; i < this.neighbors.length; i++) {
            const n = this.neighbors[i];
            const rootEdge = Array.from(n.rootEdge)[0];
            const color = n.color === Tile.DARK_BLUE ? 'FLIP' : 'UNFL';
            log += `${i + 1}. Root:${rootEdge} → Src:${n.sourceEdgeUsed}${n.wasReversed ? 'R' : ''} [${color}]\n`;
        }
        this.logDiv.textContent = log || 'None';
    }
    
    lockNeighbors() {
        // Move all current neighbors to locked
        this.lockedNeighbors.push(...this.neighbors);
        this.neighbors = [];
        this.updateStatus();
        console.log('Locked', this.lockedNeighbors.length, 'neighbors');
    }
    
    clear() {
        // Only clear unlocked neighbors
        this.neighbors = [];
        // Remove unlocked edges from rootTile.occupiedEdges
        const lockedEdges = new Set(this.lockedNeighbors.flatMap(n => Array.from(n.rootEdge)));
        const newOccupiedEdges = new Set();
        for (let edge of this.rootTile.occupiedEdges) {
            if (lockedEdges.has(edge)) {
                newOccupiedEdges.add(edge);
            }
        }
        this.rootTile.occupiedEdges = newOccupiedEdges;
        this.generate();
    }
    
    clearAll() {
        // Clear everything including locked
        this.neighbors = [];
        this.lockedNeighbors = [];
        this.rootTile.occupiedEdges.clear();
        this.generate();
    }
    
    updateStatus() {
        this.statusDiv.textContent = `Neighbors: ${this.neighbors.length} unlocked, ${this.lockedNeighbors.length} locked`;
        
        let log = '';
        
        // Show locked neighbors
        if (this.lockedNeighbors.length > 0) {
            log += '🔒 LOCKED:\n';
            for (let i = 0; i < this.lockedNeighbors.length; i++) {
                const n = this.lockedNeighbors[i];
                const rootEdge = Array.from(n.rootEdge)[0];
                const color = n.color === Tile.DARK_BLUE ? 'FLIP' : 'UNFL';
                log += `  ${i + 1}. Root:${rootEdge} → Src:${n.sourceEdgeUsed}${n.wasReversed ? 'R' : ''} [${color}]\n`;
            }
            log += '\n';
        }
        
        // Show unlocked neighbors
        for (let i = 0; i < this.neighbors.length; i++) {
            const n = this.neighbors[i];
            const rootEdge = Array.from(n.rootEdge)[0];
            const color = n.color === Tile.DARK_BLUE ? 'FLIP' : 'UNFL';
            log += `${i + 1}. Root:${rootEdge} → Src:${n.sourceEdgeUsed}${n.wasReversed ? 'R' : ''} [${color}]\n`;
        }
        
        this.logDiv.textContent = log || 'None';
    }
    
    checkOverlap(newTile) {
        const newPos = newTile.transform.transformPoint({x: 0, y: 0});
        
        // Check against both locked and unlocked neighbors
        const allNeighbors = [...this.lockedNeighbors, ...this.neighbors];
        
        for (let existingTile of allNeighbors) {
            const existingPos = existingTile.transform.transformPoint({x: 0, y: 0});
            const dist = Math.sqrt(
                Math.pow(newPos.x - existingPos.x, 2) + 
                Math.pow(newPos.y - existingPos.y, 2)
            );
            
            if (dist < 5) {
                return true;
            }
        }
        return false;
    }
    
    draw(tiling) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a background so you can see the canvas
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw tiles
        tiling.draw(this.ctx, 0);
        
        // Draw vertex labels
        tiling.drawVertexLabels(this.ctx);
        
        // Draw edge numbers on the root tile for reference
        this.drawEdgeNumbers();
    }
    
    drawEdgeNumbers() {
        if (!this.rootTile) return;
        
        this.ctx.fillStyle = 'red';
        this.ctx.font = 'bold 14px Arial';
        
        for (let i = 0; i < 14; i++) {
            const v = this.rootTile.getVertex(i);
            this.ctx.fillText(i.toString(), v.x - 5, v.y + 5);
        }
    }
}

const tester = new ConstraintTester('canvas');