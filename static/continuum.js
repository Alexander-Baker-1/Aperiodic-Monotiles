const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const aSlider = document.getElementById('a');
const bSlider = document.getElementById('b');
const curveSlider = document.getElementById('curve');

function updateValues() {
    document.getElementById('a-val').textContent = parseFloat(aSlider.value).toFixed(3);
    document.getElementById('b-val').textContent = parseFloat(bSlider.value).toFixed(3);
    document.getElementById('curve-val').textContent = parseFloat(curveSlider.value).toFixed(3);
}

// Draw a single tile at position (x, y) with rotation
function drawTile(x, y, rotation, reflected, a, b, curve, scale) {
    const c = Math.cos(Math.PI/3);
    const s = Math.sin(Math.PI/3);
    
    const moves = [
        [c*b, s*b], [b, 0], [0, a], [s*a, c*a],
        [c*b, -s*b], [-c*b, -s*b], [s*a, -c*a],
        [0, -a], [0, -a], [-s*a, -c*a],
        [-c*b, s*b], [-b, 0], [0, a], [-s*a, c*a]
    ];
    
    function twiddle([dx, dy]) {
        const [nx, ny] = [dy, -dx];
        return [-curve*nx+dx/2, -curve*ny+dy/2, curve*nx+dx/2, curve*ny+dy/2, dx, dy];
    }
    
    // Save current canvas state
    ctx.save();
    
    // Move to tile position
    ctx.translate(x, y);
    
    // Apply rotation (convert degrees to radians)
    ctx.rotate(rotation * Math.PI / 180);
    
    // Apply reflection if needed
    if (reflected) {
        ctx.scale(-1, 1);
    }
    
    // Scale the tile
    ctx.scale(scale, scale);
    
    // Draw the tile
    ctx.beginPath();
    ctx.moveTo(0, 0);
    
    let px = 0, py = 0;
    for (let [dx, dy] of moves) {
        const [dx1, dy1, dx2, dy2, x1, y1] = twiddle([dx, dy]);
        ctx.bezierCurveTo(dx1+px, dy1+py, dx2+px, dy2+py, px+dx, py+dy);
        px += dx;
        py += dy;
    }
    
    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5 / scale;
    ctx.stroke();
    
    // Restore canvas state
    ctx.restore();
}

// Draw a few tiles manually
function drawAll() {
    const a = parseFloat(aSlider.value);
    const b = parseFloat(bSlider.value);
    const curve = parseFloat(curveSlider.value);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // drawTile(x, y, rotation, reflected, a, b, curve, scale)
    const scale = 30;
    
    drawTile(200, 200, 0, false, a, b, curve, scale);
    drawTile(300, 200, 60, false, a, b, curve, scale);
    drawTile(250, 280, 120, false, a, b, curve, scale);
    drawTile(350, 250, 180, true, a, b, curve, scale);
}

// Update when sliders change
[aSlider, bSlider, curveSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        updateValues();
        drawAll();
    });
});

updateValues();
drawAll();