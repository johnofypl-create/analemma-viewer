import { state } from '../config.js';

// ==================== 鼠标悬停交互 ====================
export function initHoverInteraction() {
    const canvas = document.getElementById('skyCanvas');
    const tooltip = document.getElementById('tooltip');

    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const padding = { top: 40, right: 40, bottom: 60, left: 60 };
        const chartW = canvas.width - padding.left - padding.right;
        const chartH = canvas.height - padding.top - padding.bottom;

        let nearestPoint = null;
        let nearestDist = Infinity;

        for (const point of state.analemmaData) {
            const x = padding.left + (point.azimuth / 360) * chartW;
            const y = padding.top + chartH - (point.altitude / 90) * chartH;

            const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
            if (dist < 15 && dist < nearestDist) {
                nearestDist = dist;
                nearestPoint = point;
            }
        }

        if (nearestPoint) {
            document.getElementById('tooltipDate').textContent =
                `${nearestPoint.date.getFullYear()}年${nearestPoint.date.getMonth() + 1}月${nearestPoint.date.getDate()}日`;
            document.getElementById('tooltipAlt').textContent =
                `高度角: ${nearestPoint.altitude.toFixed(1)}°`;
            document.getElementById('tooltipAz').textContent =
                `方位角: ${nearestPoint.azimuth.toFixed(1)}°`;

            tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
            tooltip.style.top = (e.clientY - rect.top - 12) + 'px';
            tooltip.classList.add('visible');

            canvas.style.cursor = 'pointer';
        } else {
            tooltip.classList.remove('visible');
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mouseleave', function() {
        tooltip.classList.remove('visible');
    });
}
