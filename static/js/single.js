import { HatGeometry } from './common/HatGeometry.js';

class SingleTileApp {
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
        
        this.displayWidth = 600;
        this.displayHeight = 400;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateValues();
        this.draw();
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = this.displayWidth * dpr;
        this.canvas.height = this.displayHeight * dpr;
        this.canvas.style.width = `${this.displayWidth}px`;
        this.canvas.style.height = `${this.displayHeight}px`;
        
        this.ctx.scale(dpr, dpr);
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
    
    calculateScale(a, b) {
        const COS_60 = Math.cos(Math.PI/3);
        const SIN_60 = Math.sin(Math.PI/3);
        
        const width = (1 + COS_60) * b + 2 * SIN_60 * a;
        const height = 2 * SIN_60 * b + 2 * (1 + COS_60) * a;
        
        const margin = 0.2;
        const scaleX = (this.displayWidth * (1 - 2 * margin)) / width;
        const scaleY = (this.displayHeight * (1 - 2 * margin)) / height;
        const scale = Math.min(scaleX, scaleY);
        
        return {
            scale: scale,
            xOffset: (width / 2) * scale,
        };
    }
    
    makeControlPoints(dx, dy, curveAmount) {
        const nx = dy;
        const ny = -dx;
        
        return [
            -curveAmount * nx + dx/2,
            -curveAmount * ny + dy/2,
            curveAmount * nx + dx/2,
            curveAmount * ny + dy/2,
            dx,
            dy
        ];
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const a = parseFloat(this.aSlider.value);
        const b = parseFloat(this.bSlider.value);
        const curve = parseFloat(this.curveSlider.value);
        
        const geometry = new HatGeometry(a, b);
        const edges = geometry.getEdgeMoves();
        
        const { scale, xOffset } = this.calculateScale(a, b);
        
        const centerX = this.displayWidth / 2;
        const centerY = this.displayHeight / 2;
        
        let x = centerX - xOffset;
        let y = centerY;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        edges.forEach(([dx, dy]) => {
            const scaledDx = dx * scale;
            const scaledDy = dy * scale;
            
            if (curve > 0) {
                const [cp1x, cp1y, cp2x, cp2y, endX, endY] = 
                    this.makeControlPoints(scaledDx, scaledDy, curve);
                
                this.ctx.bezierCurveTo(
                    x + cp1x, y + cp1y,
                    x + cp2x, y + cp2y,
                    x + endX, y + endY
                );
            } else {
                this.ctx.lineTo(x + scaledDx, y + scaledDy);
            }
            
            x += scaledDx;
            y += scaledDy;
        });
        
        this.ctx.closePath();
        this.ctx.fillStyle = 'black';
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    loadPreset(presetKey) {
        const preset = SingleTileApp.PRESETS[presetKey];
        
        this.aSlider.value = preset.a;
        this.bSlider.value = preset.b;
        this.curveSlider.value = 0;
        
        this.updateValues();
        this.draw();
    }
}

// Initialize the app
const app = new SingleTileApp(
    'canvas',
    document.getElementById('a'),
    document.getElementById('b'),
    document.getElementById('curve')
);

// Expose loadPreset for HTML buttons
window.loadPreset = (presetKey) => app.loadPreset(presetKey);