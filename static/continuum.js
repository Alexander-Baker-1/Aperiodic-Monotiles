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

// Get the hat outline vertices
function getHatOutline(a, b) {
    const c = Math.cos(Math.PI/3);
    const s = Math.sin(Math.PI/3);
    
    const moves = [
        [c*b, s*b], [b, 0], [0, a], [s*a, c*a],
        [c*b, -s*b], [-c*b, -s*b], [s*a, -c*a],
        [0, -a], [0, -a], [-s*a, -c*a],
        [-c*b, s*b], [-b, 0], [0, a], [-s*a, c*a]
    ];
    
    const vertices = [{x: 0, y: 0}];
    let x = 0, y = 0;
    
    for (let [dx, dy] of moves) {
        x += dx;
        y += dy;
        vertices.push({x, y});
    }
    
    return vertices;
}

function matVecMul(mat, vec) {
    return {
        x: mat[0] * vec.x + mat[1] * vec.y + mat[2],
        y: mat[3] * vec.x + mat[4] * vec.y + mat[5]
    };
}

function matMul(m1, m2) {
    return [
        m1[0]*m2[0] + m1[1]*m2[3],
        m1[0]*m2[1] + m1[1]*m2[4],
        m1[0]*m2[2] + m1[1]*m2[5] + m1[2],
        m1[3]*m2[0] + m1[4]*m2[3],
        m1[3]*m2[1] + m1[4]*m2[4],
        m1[3]*m2[2] + m1[4]*m2[5] + m1[5]
    ];
}

// Transform that maps two points to two target points
function matchShapes(p1, p2, targetP1, targetP2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    
    const tdx = targetP2.x - targetP1.x;
    const tdy = targetP2.y - targetP1.y;
    
    const scale = Math.sqrt((tdx*tdx + tdy*tdy) / (dx*dx + dy*dy));
    
    const angle1 = Math.atan2(dy, dx);
    const angle2 = Math.atan2(tdy, tdx);
    const rotation = angle2 - angle1;
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const a = scale * cos;
    const b = -scale * sin;
    const d = scale * sin;
    const e = scale * cos;
    
    const c = targetP1.x - (a * p1.x + b * p1.y);
    const f = targetP1.y - (d * p1.x + e * p1.y);
    
    return [a, b, c, d, e, f];
}

const identity = [1, 0, 0, 0, 1, 0];

function drawTileWithMatrix(mat, a, b, curve, color = 'black') {
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
    
    ctx.save();
    ctx.transform(mat[0], mat[3], mat[1], mat[4], mat[2], mat[5]);
    
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
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.restore();
}

function drawAll() {
    const a = parseFloat(aSlider.value);
    const b = parseFloat(bSlider.value);
    const curve = parseFloat(curveSlider.value);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const hatOutline = getHatOutline(a, b);
    
    const cx = 400;
    const cy = 400;
    const scale = 40;
    
    const tile1Mat = [scale, 0, cx, 0, scale, cy];
    
    drawTileWithMatrix(tile1Mat, a, b, curve, 'rgba(100, 150, 255, 0.7)');
    
    const p1 = matVecMul(tile1Mat, hatOutline[5]);
    const p2 = matVecMul(tile1Mat, hatOutline[6]);
    
    const tile2Mat = matchShapes(hatOutline[11], hatOutline[10], p1, p2);
    
    drawTileWithMatrix(tile2Mat, a, b, curve, 'rgba(255, 100, 100, 0.7)');
    
    const p3 = matVecMul(tile1Mat, hatOutline[9]);
    const p4 = matVecMul(tile1Mat, hatOutline[10]);
    
    const tile3Mat = matchShapes(hatOutline[11], hatOutline[10], p3, p4);
    
    drawTileWithMatrix(tile3Mat, a, b, curve, 'rgba(100, 255, 100, 0.7)');
    
    const p5 = matVecMul(tile2Mat, hatOutline[5]);
    const p6 = matVecMul(tile2Mat, hatOutline[6]);
    
    const tile4Mat = matchShapes(hatOutline[11], hatOutline[10], p5, p6);
    
    drawTileWithMatrix(tile4Mat, a, b, curve, 'rgba(255, 255, 100, 0.7)');
}

[aSlider, bSlider, curveSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        updateValues();
        drawAll();
    });
});

updateValues();
drawAll();