// ==================== 轨道参数数据加载器 ====================
// 从预计算的 JSON 加载轨道参数，并支持插值

let orbitalData = null;
let isLoading = false;
let loadPromise = null;

// ==================== 加载预计算数据 ====================
export async function loadOrbitalData() {
    if (orbitalData) return orbitalData;
    if (loadPromise) return loadPromise;

    isLoading = true;
    loadPromise = fetch('data/orbital-params.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load orbital data: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            orbitalData = data;
            isLoading = false;
            console.log(`[OrbitalData] Loaded ${data.metadata.totalPoints} points, range: ${data.metadata.startYear} to ${data.metadata.endYear}`);
            return data;
        })
        .catch(error => {
            isLoading = false;
            console.error('[OrbitalData] Failed to load:', error);
            throw error;
        });

    return loadPromise;
}

// ==================== 获取指定年份的轨道参数（带插值） ====================
export function getOrbitalParamsForYear(year) {
    if (!orbitalData) {
        console.warn('[OrbitalData] Data not loaded, using default parameters');
        return getDefaultParams(year);
    }

    const { data, metadata } = orbitalData;

    // 边界检查
    if (year < metadata.startYear) year = metadata.startYear;
    if (year > metadata.endYear) year = metadata.endYear;

    // 找到相邻的两个数据点
    const step = metadata.step;
    const index = Math.floor((year - metadata.startYear) / step);

    if (index < 0) return data[0];
    if (index >= data.length - 1) return data[data.length - 1];

    const p1 = data[index];
    const p2 = data[index + 1];

    // 线性插值
    const t = (year - p1.year) / (p2.year - p1.year);

    return {
        year: year,
        obliquity: lerp(p1.obliquity, p2.obliquity, t),
        eccentricity: lerp(p1.eccentricity, p2.eccentricity, t),
        perihelion: lerpAngle(p1.perihelion, p2.perihelion, t),
        precession: lerp(p1.precession, p2.precession, t)
    };
}

// ==================== 线性插值 ====================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ==================== 角度插值（处理 0°/360° 跳变） ====================
function lerpAngle(a, b, t) {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let result = a + diff * t;
    result = result % 360;
    if (result < 0) result += 360;
    return result;
}

// ==================== 默认参数（J2000 历元） ====================
function getDefaultParams(year) {
    return {
        year: year,
        obliquity: 23.439291,
        eccentricity: 0.01671047,
        perihelion: 102.93735,
        precession: 0
    };
}

// ==================== 获取数据范围 ====================
export function getYearRange() {
    if (!orbitalData) return { min: 2000, max: 2030 };
    return {
        min: orbitalData.metadata.startYear,
        max: orbitalData.metadata.endYear
    };
}

// ==================== 检查数据是否已加载 ====================
export function isOrbitalDataLoaded() {
    return orbitalData !== null;
}
