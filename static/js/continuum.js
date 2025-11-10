import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';

class TilingApp {
    constructor(canvasId, aSlider, bSlider, curveSlider) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.aSlider = aSlider;
        this.bSlider = bSlider;
        this.curveSlider = curveSlider;
        
        this.setupEventListeners();
        this.updateValues();
        this.draw();
    }
    
    setupEventListeners() {
        [this.aSlider, this.bSlider, this.curveSlider].forEach(slider => {
            slider.addEventListener('input', () => {
                this.updateValues();
                this.draw();
            });
        });
    }
    
    updateValues() {
        document.getElementById('a-val').textContent = parseFloat(this.aSlider.value).toFixed(3);
        document.getElementById('b-val').textContent = parseFloat(this.bSlider.value).toFixed(3);
        document.getElementById('curve-val').textContent = parseFloat(this.curveSlider.value).toFixed(3);
    }
    
    draw() {
        const a = parseFloat(this.aSlider.value);
        const b = parseFloat(this.bSlider.value);
        const curve = parseFloat(this.curveSlider.value);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const geometry = new HatGeometry(a, b);
        const tiling = new TilingSystem(geometry);
        
        // Create the initial tile
        const rotation = Matrix.rotation(3 * Math.PI / 2);
        const scaling = Matrix.scale(40);
        const translation = Matrix.translation(530, 206);
        const flip = Matrix.flipX();
        
        const tile1Transform = translation.multiply(rotation).multiply(scaling).multiply(flip);
        const tile1 = tiling.addRootTile(tile1Transform, 'rgba(80, 150, 180, 1)');
        
        // Add connected tiles
        const tile2 = tiling.addTile(
            [3, 4], tile1, [13, 14],
            { color: 'rgba(20, 50, 130, 1)' }
        );
        
        const tile3 = tiling.addTile(
            [12, 13], tile2, [6, 7],
            { flipped: true, color: 'rgba(80, 150, 180, 1)' }
        );
        
        const tile4 = tiling.addTile(
            [3, 4], tile1, [7, 6],
            { flipped: true, color: 'rgba(80, 150, 180, 1)' }
        );
        
        const tile5 = tiling.addTile(
            [9, 8], tile4, [9, 10],
            { flipped: true, color: 'rgba(80, 150, 180, 1)' }
        );
        
        const tile6 = tiling.addTile(
            [13, 14], tile5, [7, 8],
            { color: 'rgba(20, 50, 130, 1)' }
        );
        
        // Draw everything
        tiling.draw(this.ctx, curve);
        tiling.drawVertexLabels(this.ctx);
    }
}

// Initialize the app
const app = new TilingApp(
    'canvas',
    document.getElementById('a'),
    document.getElementById('b'),
    document.getElementById('curve')
);