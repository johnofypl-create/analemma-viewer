import { state } from '../config.js';
import { doyToDateLabel } from '../utils/math.js';

// ==================== 绘制天空视角 ====================
export function drawSkyView() {
    const canvas = document.getElementById('skyCanvas');
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, '#0c1445');
    gradient.addColorStop(0.5, '#1e3a5f');
    gradient.addColorStop(1, '#4a6741');
    ctx.fillStyle = gradient;
    ctx.fillRect(padding.left, padding.top, chartW, chartH);

    drawGrid(ctx, padding, chartW, chartH, w, h);
    drawDataPoints(ctx, padding, chartW, chartH);
    drawSolsticeLabels(ctx, padding, chartW, chartH);
}

// ==================== 绘制网格 ====================
function drawGrid(ctx, padding, chartW, chartH, w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let alt = 0; alt <= 90; alt += 15) {
        const y = padding.top + chartH - (alt / 90) * chartH;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();

        ctx.fillText(`${alt}°`, padding.left - 8, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const directions = [
        { angle: 0, label: '北' },
        { angle: 45, label: '东北' },
        { angle: 90, label: '东' },
        { angle: 135, label: '东南' },
        { angle: 180, label: '南' },
        { angle: 225, label: '西南' },
        { angle: 270, label: '西' },
        { angle: 315, label: '西北' },
        { angle: 360, label: '北' }
    ];

    for (const dir of directions) {
        const x = padding.left + (dir.angle / 360) * chartW;

        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartH);
        ctx.stroke();

        ctx.fillText(dir.label, x, padding.top + chartH + 8);
    }

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartH);
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.stroke();

    ctx.save();
    ctx.translate(16, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px sans-serif';
    ctx.fillText('高度角 (Altitude)', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px sans-serif';
    ctx.fillText('方位角 (Azimuth)', padding.left + chartW / 2, h - 8);
}

// ==================== 绘制数据点 ====================
function drawDataPoints(ctx, padding, chartW, chartH) {
    const seasonColors = {
        spring: '#4ade80',
        summer: '#f87171',
        autumn: '#fb923c',
        winter: '#60a5fa'
    };

    function getSeasonColor(month) {
        if (month >= 2 && month <= 4) return seasonColors.spring;
        if (month >= 5 && month <= 7) return seasonColors.summer;
        if (month >= 8 && month <= 10) return seasonColors.autumn;
        return seasonColors.winter;
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    let firstPoint = true;
    for (const point of state.analemmaData) {
        const x = padding.left + (point.azimuth / 360) * chartW;
        const y = padding.top + chartH - (point.altitude / 90) * chartH;

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    for (const point of state.analemmaData) {
        const x = padding.left + (point.azimuth / 360) * chartW;
        const y = padding.top + chartH - (point.altitude / 90) * chartH;

        const isBelowHorizon = point.altitude < 0;
        const color = isBelowHorizon ? 'rgba(148, 163, 184, 0.4)' : getSeasonColor(point.month);
        const radius = point.isSolstice ? 6 : 3;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (!isBelowHorizon) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    const selected = state.analemmaData.find(p => p.dayOfYear === state.currentDayOfYear);
    if (selected) {
        const sx = padding.left + (selected.azimuth / 360) * chartW;
        const sy = padding.top + chartH - (selected.altitude / 90) * chartH;

        const rOuter = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, rOuter, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, rOuter * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.25)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const labelText = doyToDateLabel(state.currentDayOfYear, state.currentYear);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const labelY = sy - 14;
        const textW = ctx.measureText(labelText).width + 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(sx - textW / 2, labelY - 14, textW, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#60a5fa';
        ctx.fillText(labelText, sx, labelY);
    }
}

// ==================== 绘制节气标注 ====================
function drawSolsticeLabels(ctx, padding, chartW, chartH) {
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const point of state.analemmaData) {
        if (point.isSolstice) {
            const x = padding.left + (point.azimuth / 360) * chartW;
            const y = padding.top + chartH - (point.altitude / 90) * chartH;

            ctx.fillStyle = '#fbbf24';
            ctx.fillText(point.isSolstice, x, y - 10);
        }
    }
}
