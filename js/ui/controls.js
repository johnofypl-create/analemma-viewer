import {
    state,
    setCurrentTimeMinutes, setCurrentDayOfYear, setCurrentYear
} from '../config.js';
import { minutesToTime, timeToMinutes, getLocalTimeStr } from '../utils/time.js';
import { doyToDateLabel, isLeapYear } from '../utils/math.js';
import { updateSunLight } from '../core/sun.js';
import { generateAnalemma } from '../data/analemma.js';
import { loadOrbitalData, getYearRange } from '../data/orbital-loader.js';

// ==================== 更新坐标显示 ====================
export function updateCoordsDisplay() {
    const latDir = state.currentLat >= 0 ? 'N' : 'S';
    const lngDir = state.currentLng >= 0 ? 'E' : 'W';
    document.getElementById('latValue').textContent = `${Math.abs(state.currentLat).toFixed(4)}° ${latDir}`;
    document.getElementById('lngValue').textContent = `${Math.abs(state.currentLng).toFixed(4)}° ${lngDir}`;
}

// ==================== 获取当年最大天数 ====================
function getMaxDayOfYear() {
    return isLeapYear(state.currentYear) ? 365 : 364;
}

// ==================== 更新日期滑块范围 ====================
function updateDateSliderRange() {
    const dateSlider = document.getElementById('dateSlider');
    const maxDay = getMaxDayOfYear();
    dateSlider.max = maxDay;
    if (parseInt(dateSlider.value) > maxDay) {
        dateSlider.value = maxDay;
        setCurrentDayOfYear(maxDay);
    }
}

// ==================== 更新滑块轨道填充 ====================
export function updateSliderTrackFills() {
    const timeSlider = document.getElementById('timeSlider');
    const dateSlider = document.getElementById('dateSlider');
    const yearSlider = document.getElementById('yearSlider');
    const maxDay = getMaxDayOfYear();
    const yearRange = getYearRange();
    const timePct = (timeSlider.value / 1439) * 100;
    const datePct = (dateSlider.value / maxDay) * 100;
    const yearSpan = yearRange.max - yearRange.min;
    const yearPct = ((yearSlider.value - yearRange.min) / yearSpan) * 100;
    timeSlider.style.setProperty('--pct', timePct + '%');
    dateSlider.style.setProperty('--pct', datePct + '%');
    yearSlider.style.setProperty('--pct', yearPct + '%');
}

// ==================== 时间控制 ====================
export function initTimeControl() {
    const slider = document.getElementById('timeSlider');
    const input = document.getElementById('timeInput');

    updateSliderTrackFills();

    slider.addEventListener('input', function() {
        setCurrentTimeMinutes(parseInt(this.value));
        const timeStr = minutesToTime(state.currentTimeMinutes);
        input.value = timeStr;
        updateSliderTrackFills();
        updateSunLight(state.currentTimeMinutes, state.currentDayOfYear);
        generateAnalemma();
    });

    input.addEventListener('change', function() {
        const minutes = timeToMinutes(this.value);
        if (minutes !== null) {
            setCurrentTimeMinutes(minutes);
            slider.value = minutes;
            const timeStr = minutesToTime(minutes);
            input.value = timeStr;
            updateSliderTrackFills();
            updateSunLight(state.currentTimeMinutes, state.currentDayOfYear);
            generateAnalemma();
        }
    });
}

// ==================== 日期控制 ====================
export function initDateControl() {
    const slider = document.getElementById('dateSlider');
    const label = document.getElementById('dateLabel');

    updateDateSliderRange();
    slider.value = state.currentDayOfYear;
    const dateStr = doyToDateLabel(state.currentDayOfYear, state.currentYear);
    label.textContent = dateStr;
    updateSliderTrackFills();

    slider.addEventListener('input', function () {
        setCurrentDayOfYear(parseInt(this.value));
        const dateStr = doyToDateLabel(state.currentDayOfYear, state.currentYear);
        label.textContent = dateStr;
        updateSliderTrackFills();
        updateSunLight(state.currentTimeMinutes, state.currentDayOfYear);
        generateAnalemma();
    });
}

// ==================== 年份控制 ====================
export async function initYearControl() {
    const slider = document.getElementById('yearSlider');
    const label = document.getElementById('yearLabel');
    const dateSlider = document.getElementById('dateSlider');
    const dateLabel = document.getElementById('dateLabel');

    try {
        await loadOrbitalData();
        const range = getYearRange();
        slider.min = range.min;
        slider.max = range.max;
        console.log(`[YearControl] Extended range: ${range.min} to ${range.max}`);
    } catch (error) {
        console.warn('[YearControl] Failed to load orbital data, using default range');
        slider.min = 2000;
        slider.max = 2030;
    }

    slider.value = state.currentYear;
    label.textContent = state.currentYear;
    updateSliderTrackFills();

    slider.addEventListener('input', function () {
        setCurrentYear(parseInt(this.value));
        label.textContent = state.currentYear;

        updateDateSliderRange();
        const dateStr = doyToDateLabel(state.currentDayOfYear, state.currentYear);
        dateLabel.textContent = dateStr;

        updateSliderTrackFills();
        updateSunLight(state.currentTimeMinutes, state.currentDayOfYear);
        generateAnalemma();
    });
}
