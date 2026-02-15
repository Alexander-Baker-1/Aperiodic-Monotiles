import { Matrix } from './common/Matrix.js';
import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';

class TilingApp {
    static PRESETS = {
        chevron: { a: 0, b: 1, name: 'Chevron' },
        hat: { a: 1, b: Math.sqrt(3), name: 'Hat' },
        spectre: { a: 1, b: 1, name: 'Spectre' },
        turtle: { a: Math.sqrt(3), b: 1, name: 'Turtle' },
        comet: { a: 1, b: 0, name: 'Comet' }
    };

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
    
    loadPreset(presetKey) {
        const preset = TilingApp.PRESETS[presetKey];
        
        this.aSlider.value = preset.a;
        this.bSlider.value = preset.b;
        this.curveSlider.value = 0;
        
        this.updateValues();
        this.draw();
    }
    
    draw() {
        var a = parseFloat(this.aSlider.value);
        var b = parseFloat(this.bSlider.value);
        const curve = parseFloat(this.curveSlider.value);

        if (a === 0) {
            a = 0.001;
        }
        if (b === 0) {
            b = 0.001;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const geometry = new HatGeometry(a, b);
        const tiling = new TilingSystem(geometry);
        
        // Create the initial tile
        const rotation = Matrix.rotation(3 * Math.PI / 2);
        const scaling = Matrix.scale(30);
        const translation = Matrix.translation(530, 206);
        const flip = Matrix.flipX();
        
        const tile1Transform = translation.multiply(rotation).multiply(scaling).multiply(flip);
        const tile1 = tiling.addRootTile(tile1Transform, Tile.LIGHT_BLUE);
        
        // Add connected tiles
        const tile2 = tiling.addTile(
            [3, 4], tile1, [13, 14],
            { flipped: true, color: Tile.DARK_BLUE }
        );

        const tile3 = tiling.addTile(
            [12, 13], tile2, [6, 7],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile4 = tiling.addTile(
            [3, 4], tile1, [7, 6],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile5 = tiling.addTile(
            [9, 8], tile4, [9, 10],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile6 = tiling.addTile(
            [13, 14], tile5, [7, 8],
            { flipped: true, color: Tile.DARK_BLUE }
        );

        const tile7 = tiling.addTile(
            [11, 12], tile6, [5, 6],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile8 = tiling.addTile(
            [13, 12], tile7, [7, 8],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile9 = tiling.addTile(
            [10, 11], tile8, [4, 5],
            { flipped: true, color: Tile.DARK_BLUE }
        );

        const tile10 = tiling.addTile(
            [10, 11], tile9, [4, 5],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile11 = tiling.addTile(
            [10, 11], tile9, [14, 1],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile12 = tiling.addTile(
            [1, 14], tile11, [5, 6],
            { flipped: false, color: Tile.LIGHT_BLUE }
        );

        const tile13 = tiling.addTile(
            [7, 6], tile12, [9, 10],
            { flipped: false, color: Tile.WHITE }
        );

        const tile14 = tiling.addTile(
            [1, 14], tile3, [5, 6],
            { flipped: false, color: Tile.GRAY }
        );

        const tile15 = tiling.addTile(
            [3, 2], tile14, [9, 10],
            { flipped: false, color: Tile.GRAY }
        );

        const tile16 = tiling.addTile(
            [9, 8], tile15, [7, 8],
            { flipped: false, color: Tile.WHITE }
        );

        const tile17 = tiling.addTile(
            [10, 9], tile16, [2, 3],
            { flipped: false, color: Tile.WHITE }
        );

        const tile18 = tiling.addTile(
            [1, 14], tile5, [1, 2],
            { flipped: false, color: Tile.GRAY }
        );

        const tile19 = tiling.addTile(
            [1, 14], tile18, [11, 12],
            { flipped: false, color: Tile.GRAY }
        );

        const tile20 = tiling.addTile(
            [3, 4], tile19, [9, 8],
            { flipped: false, color: Tile.WHITE }
        );

        const tile21 = tiling.addTile(
            [2, 3], tile20, [10, 9],
            { flipped: false, color: Tile.WHITE }
        );

        const tile22 = tiling.addTile(
            [1, 14], tile10, [5, 6],
            { flipped: false, color: Tile.GRAY }
        );

        const tile23 = tiling.addTile(
            [13, 12], tile10, [9, 10],
            { flipped: false, color: Tile.GRAY }
        );

        const tile24 = tiling.addTile(
            [4, 3], tile23, [8, 9],
            { flipped: false, color: Tile.WHITE }
        );

        const tile25 = tiling.addTile(
            [3, 2], tile24, [9, 10],
            { flipped: false, color: Tile.WHITE }
        );
        
        // Draw everything
        tiling.draw(this.ctx, curve);
        // tiling.drawVertexLabels(this.ctx);
    }
}

// Initialize the app
const app = new TilingApp(
    'canvas',
    document.getElementById('a'),
    document.getElementById('b'),
    document.getElementById('curve')
);

// Expose loadPreset for HTML buttons
window.loadPreset = (presetKey) => app.loadPreset(presetKey);