// ==================== 生成地球纹理 ====================
let earthTextureCache = null;

export function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const W = 2048;
    const H = 1024;

    const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
    oceanGrad.addColorStop(0, '#1a3555');
    oceanGrad.addColorStop(0.15, '#1a3d62');
    oceanGrad.addColorStop(0.35, '#17406b');
    oceanGrad.addColorStop(0.5, '#123f66');
    oceanGrad.addColorStop(0.65, '#17406b');
    oceanGrad.addColorStop(0.85, '#1a3d62');
    oceanGrad.addColorStop(1, '#1a3555');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, W, H);

    drawGridAndLabels(ctx, W, H);
    loadWorldMap(ctx, W, H, canvas);

    earthTextureCache = new THREE.CanvasTexture(canvas);
    return earthTextureCache;
}

export function drawGridAndLabels(ctx, W, H) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= W; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
    }
    for (let i = 0; i <= H; i += 128) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(W, i);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 16]);
    const tropics = [H / 2 - H * 23.5 / 180, H / 2 + H * 23.5 / 180];
    for (const ty of tropics) {
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(W, ty);
        ctx.stroke();
    }
    const arcticCircles = [H * 66.5 / 180, H * (180 - 66.5) / 180];
    ctx.setLineDash([6, 18]);
    for (const ay of arcticCircles) {
        ctx.beginPath();
        ctx.moveTo(0, ay);
        ctx.lineTo(W, ay);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('赤道', W / 2, H / 2 - 8);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText('北回归线', W / 2, tropics[0] - 6);
    ctx.fillText('南回归线', W / 2, tropics[1] - 6);
    ctx.fillText('北极圈', W / 2, arcticCircles[0] - 6);
    ctx.fillText('南极圈', W / 2, arcticCircles[1] - 6);
}

export function loadWorldMap(ctx, W, H, canvas) {
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(data => {
            const countries = topojson.feature(data, data.objects.countries);

            const projection = d3.geoEquirectangular()
                .fitSize([W, H], { type: 'Sphere' });

            const path = d3.geoPath(projection, ctx);

            ctx.fillStyle = '#3a7d44';
            ctx.beginPath();
            path(countries);
            ctx.fill();

            ctx.strokeStyle = 'rgba(60, 120, 60, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            path(countries);
            ctx.stroke();

            drawGridAndLabels(ctx, W, H);

            if (earthTextureCache) {
                earthTextureCache.needsUpdate = true;
            }
        })
        .catch(err => {
            console.warn('地图数据加载失败，使用基础纹理:', err);
        });
}
