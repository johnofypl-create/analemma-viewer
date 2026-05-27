import { state, setAnalemmaData } from '../config.js';
import { calculateSunData } from './suncalc.js';
import { generateAnalemmaFromParams, calculateSunFromParams } from './vsop87.js';
import { getOrbitalParamsForYear } from './orbital-loader.js';
import { doyToDateLabel } from '../utils/math.js';
import { getLocalTimeStr } from '../utils/time.js';
import { drawSkyView } from '../ui/skyview.js';

// ==================== 是否使用 VSOP87 模式 ====================
let useVSOP87 = true;

export function setUseVSOP87(value) {
    useVSOP87 = value;
}

export function isUsingVSOP87() {
    return useVSOP87;
}

// ==================== 生成日行迹数据 ====================
export function generateAnalemma() {
    let data;

    if (useVSOP87) {
        // 使用 VSOP87 预计算数据
        const params = getOrbitalParamsForYear(state.currentYear);
        data = generateAnalemmaFromParams(params, state.currentTimeMinutes, state.currentLat, state.currentLng);
    } else {
        // 回退到 SunCalc
        data = calculateSunData(state.currentTimeMinutes, state.currentDayOfYear, state.currentLat, state.currentLng, state.currentYear);
    }

    setAnalemmaData(data);
    updateStats();
    drawSkyView();
}

// ==================== 获取指定日期的太阳位置（用于 3D 场景） ====================
export function getSunPositionForDate(dayOfYear, timeMinutes) {
    if (useVSOP87) {
        const params = getOrbitalParamsForYear(state.currentYear);
        return calculateSunFromParams(params, dayOfYear, timeMinutes, state.currentLat, state.currentLng);
    } else {
        // SunCalc 模式
        const hours = Math.floor(timeMinutes / 60);
        const minutes = timeMinutes % 60;
        const date = new Date(Date.UTC(state.currentYear, 0, dayOfYear + 1, hours, minutes, 0));
        const position = SunCalc.getPosition(date, state.currentLat, state.currentLng);
        return {
            altitude: position.altitude * 180 / Math.PI,
            azimuth: ((position.azimuth * 180 / Math.PI) + 180) % 360
        };
    }
}

// ==================== 更新统计 ====================
export function updateStats() {
    let belowCount = 0;

    const summerPoints = state.analemmaData.filter(p => p.month >= 5 && p.month <= 7);
    const winterPoints = state.analemmaData.filter(p => p.month >= 11 || p.month <= 1);

    let summerMax = summerPoints.length > 0 ? Math.max(...summerPoints.map(p => p.altitude)) : -90;
    let winterMax = winterPoints.length > 0 ? Math.max(...winterPoints.map(p => p.altitude)) : -90;

    let selectedAlt = null;

    for (const point of state.analemmaData) {
        if (point.altitude < 0) belowCount++;
        if (point.dayOfYear === state.currentDayOfYear) {
            selectedAlt = point;
        }
    }

    document.getElementById('currentYear').textContent = state.currentYear;
    document.getElementById('summerSolstice').textContent = `${summerMax.toFixed(1)}°`;
    document.getElementById('winterSolstice').textContent = `${winterMax.toFixed(1)}°`;
    document.getElementById('belowHorizon').textContent = `${belowCount} 天`;

    if (selectedAlt) {
        document.getElementById('selectedDate').textContent =
            `${selectedAlt.altitude.toFixed(1)}° / ${selectedAlt.azimuth.toFixed(1)}°`;
    } else {
        document.getElementById('selectedDate').textContent = '--';
    }

    const localTimeStr = getLocalTimeStr(state.currentTimeMinutes, state.currentLng);
    document.getElementById('localTime').textContent = localTimeStr;

    // 显示当前使用的算法模式
    const modeIndicator = document.getElementById('calcModeIndicator');
    if (modeIndicator) {
        modeIndicator.textContent = useVSOP87 ? 'VSOP87' : 'SunCalc';
        modeIndicator.style.color = useVSOP87 ? '#3cb878' : '#4ea8f6';
    }
}
