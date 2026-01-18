import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class InfiniteExplorer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.seed = 12345;
        this.generate();
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
    
    // Linear Congruential Generator (LCG) for seeded random numbers
    seededRandom() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }
    
    generate() {
        const originalSeed = parseInt(document.getElementById('seed').value);
        this.seed = originalSeed;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const geometry = new HatGeometry(1, Math.sqrt(3));
        const tiling = new TilingSystem(geometry);
        
        const rootColor = this.randomColor();
        const randomAngle = this.seededRandom() * 2 * Math.PI;
        const rotation = Matrix.rotation(randomAngle);
        const scaling = Matrix.scale(20);
        const translation = Matrix.translation(400, 300);
        
        let rootTransform;
        if (rootColor === Tile.DARK_BLUE) {
            const flip = Matrix.flipX();
            rootTransform = translation.multiply(flip).multiply(rotation).multiply(scaling);
        } else {
            rootTransform = translation.multiply(rotation).multiply(scaling);
        }

        const rootTile = tiling.addRootTile(rootTransform, rootColor);
        
        tiling.draw(this.ctx, 0);
    }
    
    randomColor() {
        const colors = [Tile.DARK_BLUE, Tile.LIGHT_BLUE, Tile.WHITE, Tile.GRAY];
        return colors[Math.floor(this.seededRandom() * colors.length)];
    }
}

const explorer = new InfiniteExplorer('canvas');

window.regenerate = () => {
    const seed = parseInt(document.getElementById('seed').value);
    explorer.setSeed(seed);
};

window.randomSeed = () => explorer.randomSeed();