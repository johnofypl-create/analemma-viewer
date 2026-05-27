import { state, refs, setCurrentLat, setCurrentLng } from '../config.js';
import { updateCoordsDisplay } from './controls.js';
import { updateMarkerPosition } from './globe.js';
import { updateSunLight } from '../core/sun.js';
import { generateAnalemma } from '../data/analemma.js';

const adjAbove1 = document.createElement('span');
adjAbove1.className = 'adj-val adj-above-1';
const adjAbove2 = document.createElement('span');
adjAbove2.className = 'adj-val adj-above-2';
const adjBelow1 = document.createElement('span');
adjBelow1.className = 'adj-val adj-below-1';
const adjBelow2 = document.createElement('span');
adjBelow2.className = 'adj-val adj-below-2';

let hoverTimer = null;
let touchTimer = null;
let scrollAccum = 0;
let activeCard = null;

function formatLat(val) {
    const dir = val >= 0 ? 'N' : 'S';
    return Math.abs(val).toFixed(4) + '° ' + dir;
}

function formatLng(val) {
    const dir = val >= 0 ? 'E' : 'W';
    return Math.abs(val).toFixed(4) + '° ' + dir;
}

function parseCoord(raw, isLat) {
    raw = raw.trim().toUpperCase();
    if (!raw) return null;

    let sign = 1;

    if (isLat) {
        if (raw.startsWith('S') || raw.endsWith('S')) { sign = -1; }
        else if (raw.startsWith('N') || raw.endsWith('N')) { sign = 1; }
    } else {
        if (raw.startsWith('W') || raw.endsWith('W')) { sign = -1; }
        else if (raw.startsWith('E') || raw.endsWith('E')) { sign = 1; }
    }

    const match = raw.match(/[+-]?\d+(\.\d+)?/);
    if (!match) return null;
    let val = parseFloat(match[0]);

    if (raw.includes('-') && !raw.startsWith('+')) sign = -sign;

    val = sign * Math.abs(val);

    if (isLat) {
        if (val > 90 || val < -90) return null;
    } else {
        if (val > 180 || val < -180) return null;
    }

    return val;
}

function applyCoordUpdate(lat, lng) {
    setCurrentLat(lat);
    setCurrentLng(lng);
    updateCoordsDisplay();
    updateMarkerPosition();
    updateSunLight(state.currentTimeMinutes, state.currentDayOfYear, state.currentYear);
    generateAnalemma();
}

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

function enterScrollMode(card) {
    if (activeCard) exitScrollMode();
    activeCard = card;
    updateAdjacentValues(card);
    card.classList.add('scroll-mode');
}

function exitScrollMode() {
    if (activeCard) {
        activeCard.classList.remove('scroll-mode');
        activeCard = null;
        scrollAccum = 0;
    }
}

function enterInputMode(card) {
    exitScrollMode();
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }

    const isLat = card.id === 'latCard';
    const input = card.querySelector('.coord-input');
    const currentVal = isLat ? state.currentLat : state.currentLng;

    input.value = isLat ? Math.abs(currentVal).toFixed(4) : Math.abs(currentVal).toFixed(4);
    input.classList.remove('error');
    card.classList.add('input-mode');
    input.focus();
    input.select();
}

function exitInputMode(card) {
    const input = card.querySelector('.coord-input');
    input.style.removeProperty('display');
    card.classList.remove('input-mode');
}

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

    const dirClass = delta > 0 ? 'slide-up' : 'slide-down';

    card.classList.add(dirClass);

    if (isLat) {
        applyCoordUpdate(newVal, state.currentLng);
    } else {
        applyCoordUpdate(state.currentLat, newVal);
    }

    updateAdjacentValues(card);

    setTimeout(() => card.classList.remove(dirClass), 250);
}

function vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
    }
}

function initCard(card) {
    const isLat = card.id === 'latCard';
    const input = card.querySelector('.coord-input');

    const a1 = adjAbove1.cloneNode();
    const a2 = adjAbove2.cloneNode();
    const b1 = adjBelow1.cloneNode();
    const b2 = adjBelow2.cloneNode();
    card.appendChild(a1);
    card.appendChild(a2);
    card.appendChild(b1);
    card.appendChild(b2);

    card.addEventListener('mouseenter', () => {
        if (activeCard === card || card.classList.contains('input-mode')) return;
        hoverTimer = setTimeout(() => {
            enterScrollMode(card);
        }, 300);
    });

    card.addEventListener('mouseleave', () => {
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        if (activeCard === card) exitScrollMode();
    });

    card.addEventListener('wheel', (e) => {
        if (activeCard !== card) return;
        e.preventDefault();
        stepCoord(card, e.deltaY > 0 ? -1 : 1);
    }, { passive: false });

    card.addEventListener('click', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT') return;
        if (card.classList.contains('input-mode')) return;
        exitScrollMode();
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        enterInputMode(card);
    });

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

    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (card.classList.contains('input-mode')) {
                exitInputMode(card);
            }
        }, 150);
    });

    card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        if (card.classList.contains('input-mode')) return;

        scrollAccum = 0;
        touchTimer = setTimeout(() => {
            if (scrollAccum < 10) {
                vibrate();
                enterScrollMode(card);
            }
        }, 500);
    }, { passive: false });

    card.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;

        const lastY = card._lastTouchY || e.touches[0].clientY;
        scrollAccum += Math.abs(e.touches[0].clientY - lastY);
        card._lastTouchY = e.touches[0].clientY;

        if (scrollAccum > 10 && touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }

        if (activeCard === card) {
            e.preventDefault();
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

export function initCoordInput() {
    const latCard = document.getElementById('latCard');
    const lngCard = document.getElementById('lngCard');
    if (latCard) initCard(latCard);
    if (lngCard) initCard(lngCard);
}