import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class ChainPatterns {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.draw();
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // TODO: Implement chain patterns
    }
}

const patterns = new ChainPatterns('canvas');