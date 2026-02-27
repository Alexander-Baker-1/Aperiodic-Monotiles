// import { Matrix } from './common/Matrix.js';
// import { HatGeometry } from './common/HatGeometry.js';
// import { TilingSystem } from './common/TilingSystem.js';
// import { Tile } from './common/Tile.js';

// class ChainPatterns {
//     constructor(canvasId) {
//         this.canvas = document.getElementById(canvasId);
//         this.ctx = this.canvas.getContext('2d');
        
//         this.draw();
//     }
    
//     draw() {
//         this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
//         // TODO: Implement chain patterns
//     }
// }

// const patterns = new ChainPatterns('canvas');

import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class ChainPatterns {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Use smaller values for a and b if you want it to fit the screen better, 
        // or larger for a big tile. 20 is a good start.
        // 1. Create the blueprint (The "Hat" shape)
        const hatGeo = new HatGeometry(20, 20);

        // 2. Create the position (Where it goes)
        const position = Matrix.translation(200, 200);

        // 3. Create the Hat Tile
        // This tells the Tile: "Use the Hat shape, put it here, and color it blue."
        const myHat = new Tile(position, hatGeo, Tile.DARK_BLUE);

        // 4. Draw it
        myHat.draw(this.ctx, 0.1);
        myHat.drawVertexLabels(this.ctx);
    }
}

const patterns = new ChainPatterns('canvas');