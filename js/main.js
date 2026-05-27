import { initGlobe, handleGlobeResize } from './core/earth.js';
import { updateSunLight } from './core/sun.js';
import { generateAnalemma } from './data/analemma.js';
import { initTimeControl, initDateControl, initYearControl, updateCoordsDisplay } from './ui/controls.js';
import { initHoverInteraction } from './ui/tooltip.js';
import { state } from './config.js';

// ==================== 模态框 ====================
function showAbout() {
    document.getElementById('aboutModal').classList.add('active');
}

function hideAbout() {
    document.getElementById('aboutModal').classList.remove('active');
}

// 暴露到全局供 HTML 内联事件使用
window.showAbout = showAbout;
window.hideAbout = hideAbout;

// ==================== 窗口大小调整 ====================
function handleResize() {
    import('./ui/skyview.js').then(skyview => {
        skyview.drawSkyView();
    });
}

// ==================== 初始化 ====================
async function init() {
    initGlobe();
    initTimeControl();
    initDateControl();
    await initYearControl();
    initHoverInteraction();
    updateCoordsDisplay();

    window.addEventListener('resize', handleResize);

    const gc = document.querySelector('.globe-container');
    if (gc) {
        new ResizeObserver(() => { handleGlobeResize(); }).observe(gc);
    }

    setTimeout(() => {
        handleGlobeResize();
        updateSunLight(state.currentTimeMinutes, state.currentDayOfYear);
        generateAnalemma();
    }, 200);
}

// 页面加载完成后初始化
window.addEventListener('load', init);
