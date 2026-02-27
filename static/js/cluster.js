import { HatGeometry } from './common/HatGeometry.js';
import { TilingSystem } from './common/TilingSystem.js';
import { Tile } from './common/Tile.js';
import { Transform } from './common/Transform.js';

class TilingApp {
    static PRESETS = {
        chevron: { a: 0, b: 1, name: 'Chevron' },
        hat: { a: 1, b: Math.sqrt(3), name: 'Hat' },
        spectre: { a: 1, b: 1, name: 'Tile (1, 1)' },
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
        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 600;
    
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
    
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(a * dpr, d * dpr, b * dpr, e * dpr, c * dpr, f * dpr);
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
        const a = parseFloat(this.aSlider.value);
        const b = parseFloat(this.bSlider.value);
        const curve = parseFloat(this.curveSlider.value);
    
        const geometry = new HatGeometry(a, b);
        const tiling = new TilingSystem(geometry);
    
        const tile1Transform = Transform.identity()
            .multiply(Transform.scale(25))
            .translate(300 / 25, 200 / 25)
            .rotate(-Math.PI / 2);
    
        const t1 = tiling.addRootTile(tile1Transform, Tile.COLORS.WHITE);

        try {
            // CORE 
            const t2 = tiling.addAttachedTile(t1, 3, 13, { flipped: true, color: Tile.COLORS.DARK_BLUE });
            // const t3 = tiling.addAttachedTile(t2, 12, 6, { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            // const t4 = tiling.addAttachedTile(t1, 3, 7,  { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            // const t5 = tiling.addAttachedTile(t4, 9, 9,  { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            
            // FIRST EXPANSION
            // const t6 = tiling.addAttachedTile(t5, 13, 7, { flipped: true, color: Tile.COLORS.DARK_BLUE });
            // const t7 = tiling.addAttachedTile(t6, 11, 5, { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            // const t8 = tiling.addAttachedTile(t7, 13, 7, { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            // const t9 = tiling.addAttachedTile(t8, 10, 4, { flipped: true, color: Tile.COLORS.DARK_BLUE });
            // const t10 = tiling.addAttachedTile(t9, 10, 4, { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            
            // SECOND EXPANSION
            // const t11 = tiling.addAttachedTile(t9, 10, 0, { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            // const t12 = tiling.addAttachedTile(t11, 1, 5, { flipped: false, color: Tile.COLORS.LIGHT_BLUE });
            // const t13 = tiling.addAttachedTile(t12, 7, 9, { flipped: false, color: Tile.COLORS.WHITE });
            
            // PERIPHERY (The "Original" Gray/White Ring)
            // const t14 = tiling.addAttachedTile(t3, 1, 5, { flipped: false, color: Tile.COLORS.GRAY });
            // const t15 = tiling.addAttachedTile(t14, 3, 9, { flipped: false, color: Tile.COLORS.GRAY });
            // const t16 = tiling.addAttachedTile(t15, 9, 7, { flipped: false, color: Tile.COLORS.WHITE });
            // const t17 = tiling.addAttachedTile(t16, 10, 2, { flipped: false, color: Tile.COLORS.WHITE });
            
            // const t18 = tiling.addAttachedTile(t5, 1, 1, { flipped: false, color: Tile.COLORS.GRAY });
            // const t19 = tiling.addAttachedTile(t18, 1, 11, { flipped: false, color: Tile.COLORS.GRAY });
            // const t20 = tiling.addAttachedTile(t19, 3, 9, { flipped: false, color: Tile.COLORS.WHITE });
            // const t21 = tiling.addAttachedTile(t20, 2, 10, { flipped: false, color: Tile.COLORS.WHITE });
            
            // const t22 = tiling.addAttachedTile(t10, 1, 5, { flipped: false, color: Tile.COLORS.GRAY });
            // const t23 = tiling.addAttachedTile(t10, 13, 9, { flipped: false, color: Tile.COLORS.GRAY });
            // const t24 = tiling.addAttachedTile(t23, 4, 8, { flipped: false, color: Tile.COLORS.WHITE });
            // const t25 = tiling.addAttachedTile(t24, 3, 9, { flipped: false, color: Tile.COLORS.WHITE });
        
        } catch (e) {
            console.error("Connection failed at some point in the chain:", e);
        }
    
        this.ctx.lineWidth = 1.5 / 25;
        this.ctx.strokeStyle = "black";
        tiling.render(this.ctx, curve); 
        tiling.tiles.forEach(tile => tile.drawLabels(this.ctx));
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