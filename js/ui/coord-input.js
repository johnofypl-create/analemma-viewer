import { state, refs, setCurrentLat, setCurrentLng } from '../config.js';
import { updateCoordsDisplay } from './controls.js';
import { updateMarkerPosition } from './globe.js';
import { updateSunLight } from '../core/sun.js';
import { generateAnalemma } from '../data/analemma.js';

// ── 相邻值 DOM 元素 ──
const adjAbove1 = document.createElement('span');
adjAbove1.className = 'adj-val adj-above-1';
const adjAbove2 = document.createElement('span');
adjAbove2.className = 'adj-val adj-above-2';
const adjBelow1 = document.createElement('span');
adjBelow1.className = 'adj-val adj-below-1';
const adjBelow2 = document.createElement('span');
adjBelow2.className = 'adj-val adj-below-2';

// ── 状态变量 ──
let hoverTimer = null;
let touchTimer = null;
let scrollAccum = 0;
let activeCard = null;
let cardScrollDir = 0;

// ── 格式化坐标显示 ──
function formatLat(val) {
    const dir = val >= 0 ? 'N' : 'S';
    return Math.abs(val).toFixed(4) + '° ' + dir;
}

function formatLng(val) {
    const dir = val >= 0 ? 'E' : 'W';
    return Math.abs(val).toFixed(4) + '° ' + dir;
}

// ── 解析输入 ──
function parseCoord(raw, isLat) {
    raw = raw.trim().toUpperCase();
    if (!raw) return null;

    let sign = 1;
    let numStr = raw;

    // 处理方向字母
    if (isLat) {
        if (raw.startsWith('S') || raw.endsWith('S')) { sign = -1; }
        else if (raw.startsWith('N') || raw.endsWith('N')) { sign = 1; }
    } else {
        if (raw.startsWith('W') || raw.endsWith('W')) { sign = -1; }
        else if (raw.startsWith('E') || raw.endsWith('E')) { sign = 1; }
    }

    // 提取数字
    const match = raw.match(/[+-]?\d+(\.\d+)?/);
    if (!match) return null;
    let val = parseFloat(match[0]);

    // 负数表示反方向
    if (raw.includes('-') && !raw.startsWith('+')) sign = -sign;

    val = sign * Math.abs(val);

    // 范围检查
    if (isLat) {
        if (val > 90 || val < -90) return null;
    } else {
        if (val > 180 || val < -180) return null;
    }

    return val;
}

// ── 更新坐标 ──
function applyCoordUpdate(lat, lng) {
    setCurrentLat(lat);
    setCurrentLng(lng);
    updateCoordsDisplay();
    updateMarkerPosition();
    updateSunLight(state.currentTimeMinutes, state.currentDayOfYear);
    generateAnalemma();
}

// ── 更新相邻值显示 ──
function updateAdjacentValues(card) {
    const isLat = card.id === 'latCard';
    const currentVal = isLat ? state.currentLat : state.currentLng;
    const max = isLat ? 90 : 180;

    const clone = card.querySelectorAll('.adj-val');
    const vals = [
        { el: clone[0], val: currentVal + 1 },
        { el: clone[1], val: currentVal + 2 },
        { el: clone[2], val: currentVal - 1 },
        { el: clone[3], val: currentVal - 2 }
    ];

    vals.forEach(({ el, val }) => {
        if (el && val <= max && val >= -max) {
            el.textContent = isLat ? formatLat(val) : formatLng(val);
        }
    });
}

// ── 进入滚动模式 ──
function enterScrollMode(card) {
    if (activeCard) exitScrollMode();
    activeCard = card;
    updateAdjacentValues(card);
    card.classList.add('scroll-mode');
}

// ── 退出滚动模式 ──
function exitScrollMode() {
    if (activeCard) {
        activeCard.classList.remove('scroll-mode');
        activeCard = null;
        scrollAccum = 0;
    }
}

// ── 进入输入模式 ──
function enterInputMode(card) {
    exitScrollMode();
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }

    const isLat = card.id === 'latCard';
    const span = card.querySelector('.value');
    const input = card.querySelector('.coord-input');
    const currentVal = isLat ? state.currentLat : state.currentLng;

    input.value = isLat ? Math.abs(currentVal).toFixed(4) : Math.abs(currentVal).toFixed(4);
    input.classList.remove('error');
    card.classList.add('input-mode');
    input.style.display = 'block';
    input.focus();
    input.select();
}

// ── 退出输入模式 ──
function exitInputMode(card) {
    card.classList.remove('input-mode');
}

// ── 步进坐标 ──
function stepCoord(card, delta) {
    const isLat = card.id === 'latCard';
    const max = isLat ? 90 : 180;
    let newVal;

    if (isLat) {
        newVal = state.currentLat + delta;
        newVal = Math.max(-max, Math.min(max, newVal));
    } else {
        newVal = state.currentLng + delta;
        if (newVal > max) newVal -= 360;
        if (newVal < -max) newVal += 360;
    }

    if (isLat) {
        applyCoordUpdate(newVal, state.currentLng);
    } else {
        applyCoordUpdate(state.currentLat, newVal);
    }

    updateAdjacentValues(card);

    card.classList.add('scroll-stepping');
    setTimeout(() => card.classList.remove('scroll-stepping'), 80);
}

// ── 振动反馈 ──
function vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
    }
}

// ── 初始化单张卡片 ──
function initCard(card) {
    const isLat = card.id === 'latCard';
    const input = card.querySelector('.coord-input');

    // 创建相邻值元素
    const a1 = adjAbove1.cloneNode();
    const a2 = adjAbove2.cloneNode();
    const b1 = adjBelow1.cloneNode();
    const b2 = adjBelow2.cloneNode();
    card.appendChild(a1);
    card.appendChild(a2);
    card.appendChild(b1);
    card.appendChild(b2);

    // ── 桌面端：悬停 → 滚动模式 ──
    card.addEventListener('mouseenter', () => {
        if (activeCard === card) return;
        hoverTimer = setTimeout(() => {
            enterScrollMode(card);
        }, 300);
    });

    card.addEventListener('mouseleave', () => {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        if (activeCard === card) exitScrollMode();
    });

    // ── 桌面端：滚轮 ──
    card.addEventListener('wheel', (e) => {
        if (activeCard !== card) return;
        e.preventDefault();
        stepCoord(card, e.deltaY > 0 ? -1 : 1);
    }, { passive: false });

    // ── 桌面端 & 移动端：点击 → 输入模式 ──
    card.addEventListener('click', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT') return;
        if (card.classList.contains('input-mode')) return;
        enterInputMode(card);
    });

    // ── 输入确认 ──
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = parseCoord(input.value, isLat);
            if (val !== null) {
                if (isLat) {
                    applyCoordUpdate(val, state.currentLng);
                } else {
                    applyCoordUpdate(state.currentLat, val);
                }
                exitInputMode(card);
            } else {
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 400);
            }
        }
        if (e.key === 'Escape') {
            exitInputMode(card);
            input.blur();
        }
    });

    // ── 输入框失焦 → 退出 ──
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (card.classList.contains('input-mode')) {
                exitInputMode(card);
            }
        }, 150);
    });

    // ── 移动端：按住 → 震动 → 滚动模式 ──
    card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        if (card.classList.contains('input-mode')) return;

        scrollAccum = 0;
        cardScrollDir = 0;
        touchTimer = setTimeout(() => {
            if (scrollAccum < 5) {
                vibrate();
                enterScrollMode(card);
            }
        }, 500);
    }, { passive: false });

    card.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        const dy = e.touches[0].clientY - e.changedTouches?.[0]?.clientY || 0;

        // 跟踪累计移动量（用于判断是否在震动前移动了）
        const lastY = card._lastTouchY || e.touches[0].clientY;
        scrollAccum += Math.abs(e.touches[0].clientY - lastY);
        card._lastTouchY = e.touches[0].clientY;

        // 如果在震动前就移动了很多 → 取消振动定时器（当成页面滚动）
        if (scrollAccum > 10 && touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }

        // 已进入滚动模式 → 处理步进
        if (activeCard === card) {
            e.preventDefault();
            // 用当前触摸位置计算 delta
            if (card._scrollStartY === undefined) {
                card._scrollStartY = e.touches[0].clientY;
            }
            const totalDy = e.touches[0].clientY - card._scrollStartY;
            const stepSize = 30;
            const steps = Math.floor(Math.abs(totalDy) / stepSize);
            if (steps > 0) {
                const dir = totalDy > 0 ? 1 : -1;
                stepCoord(card, dir);
                card._scrollStartY = e.touches[0].clientY;
            }
        }
    }, { passive: false });

    card.addEventListener('touchend', () => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
        card._lastTouchY = undefined;
        card._scrollStartY = undefined;
        if (activeCard === card) exitScrollMode();
    });

    card.addEventListener('touchcancel', () => {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
        card._lastTouchY = undefined;
        card._scrollStartY = undefined;
        if (activeCard === card) exitScrollMode();
    });
}

// ── 导出初始化入口 ──
export function initCoordInput() {
    const latCard = document.getElementById('latCard');
    const lngCard = document.getElementById('lngCard');
    if (latCard) initCard(latCard);
    if (lngCard) initCard(lngCard);
}