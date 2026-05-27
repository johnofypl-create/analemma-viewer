// ==================== VSOP87 简化实现 - 仅地球轨道参数 ====================
// 基于 VSOP87 理论，提取地球轨道的三个关键长期变化参数：
// 1. 黄赤交角 (obliquity) - 地轴倾斜
// 2. 轨道偏心率 (eccentricity)
// 3. 近日点经度 (longitude of perihelion)
//
// 这些参数变化极慢，适合预计算和插值

// VSOP87 黄赤交角系数 (Laskar 1993 简化公式，精度 0.01" 内)
const OBLIQUITY_COEFFS = [
    { A: 84381.448, B: 0, C: 0 },           // 常数项
    { A: -46.8150, B: 0, C: 1 },            // t 项
    { A: -0.00059, B: 0, C: 2 },            // t² 项
    { A: 0.001813, B: 0, C: 3 },            // t³ 项
];

// VSOP87 地球轨道偏心率长期项 (主要周期项)
const ECCENTRICITY_COEFFS = [
    // 主要长期项 (约 41,000 年周期)
    { A: 0.016708617, B: 0, C:0, phase: 0 },
    // 振幅修正项
    { A: -0.000042037, B: 0, C:1 },
    { A: -0.0000001236, B: 0, C:2 },
    // 主要周期项 (来自 VSOP87 地球轨道元素)
    { A: 0.0044, B: 1.1405, C: 0.0003 },   // 约 95,000 年调制
];

// 近日点经度长期变化 (约 112,000 年周期，包含岁差)
const PERIHELION_COEFFS = [
    { A: 102.93735, B: 1.71946, C: 0 },     // 基本项 + 岁差
    { A: 0.322, B: 0.9856, C: 0 },          // 修正项
];

// ==================== 计算儒略世纪数 ====================
// t: 从 J2000.0 起算的儒略千年数
function getJulianMillennia(year) {
    const jd = Date.UTC(year, 0, 1, 12, 0, 0) / 86400000 + 2440587.5;
    return (jd - 2451545.0) / 365250;
}

// ==================== 计算黄赤交角 (度) ====================
export function getObliquity(year) {
    const t = getJulianMillennia(year);
    let eps = 0;
    for (const term of OBLIQUITY_COEFFS) {
        eps += term.A * Math.pow(t, term.C);
    }
    return eps / 3600; // 转换为度
}

// ==================== 计算轨道偏心率 ====================
export function getEccentricity(year) {
    const t = getJulianMillennia(year);
    let e = 0.0167086342;
    e += -0.000042037 * t;
    e += -0.0000001267 * t * t;
    // 添加主要周期项
    e += 0.0000044 * Math.cos(1.1405 + 0.0003 * t);
    return e;
}

// ==================== 计算近日点经度 (度) ====================
export function getPerihelionLongitude(year) {
    const t = getJulianMillennia(year);
    let varpi = 102.93735;
    varpi += 1.71946 * t;
    varpi += 0.00046 * t * t;
    // 归一化到 0-360
    varpi = varpi % 360;
    if (varpi < 0) varpi += 360;
    return varpi;
}

// ==================== 计算岁差 (度) ====================
export function getPrecession(year) {
    const t = getJulianMillennia(year);
    // 一般岁差 (pA)
    const pA = 5028.796195 * t +
               1.1054348 * t * t +
               0.00007964 * t * t * t;
    return pA / 3600; // 转换为度
}

// ==================== 获取指定年份的轨道参数 ====================
export function getOrbitalParameters(year) {
    return {
        year: year,
        obliquity: getObliquity(year),        // 黄赤交角 (度)
        eccentricity: getEccentricity(year),  // 偏心率
        perihelion: getPerihelionLongitude(year), // 近日点黄经 (度)
        precession: getPrecession(year)       // 岁差 (度)
    };
}

// ==================== 在两点间线性插值轨道参数 ====================
export function interpolateOrbitalParams(params1, params2, year) {
    const t = (year - params1.year) / (params2.year - params1.year);
    return {
        year: year,
        obliquity: params1.obliquity + t * (params2.obliquity - params1.obliquity),
        eccentricity: params1.eccentricity + t * (params2.eccentricity - params1.eccentricity),
        perihelion: params1.perihelion + t * (params2.perihelion - params1.perihelion),
        precession: params1.precession + t * (params2.precession - params1.precession)
    };
}

// ==================== 基于轨道参数计算太阳位置 ====================
// 使用简化但足够精确的公式
export function calculateSunFromParams(params, dayOfYear, timeMinutes, lat, lng) {
    const { obliquity, eccentricity, perihelion } = params;

    // 一年中的角度 (0 - 2π)
    const dayAngle = (dayOfYear / 365.25) * 2 * Math.PI;

    // 平近点角
    const M = dayAngle - (perihelion * Math.PI / 180);

    // 开普勒方程求解偏近点角 (简化迭代)
    let E = M;
    for (let i = 0; i < 5; i++) {
        E = M + eccentricity * Math.sin(E);
    }

    // 真近点角
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
        Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
    );

    // 太阳黄经
    const lambda = nu + (perihelion * Math.PI / 180);

    // 时间修正 (方程 of time 的简化)
    const hours = timeMinutes / 60;
    const timeOffset = (hours - 12) * 15 * Math.PI / 180; // 每小时 15 度

    // 时角
    const lst = timeOffset + (lng * Math.PI / 180); // 本地恒星时简化

    // 太阳赤纬
    const declination = Math.asin(Math.sin(obliquity * Math.PI / 180) * Math.sin(lambda));

    // 高度角
    const latRad = lat * Math.PI / 180;
    const altitude = Math.asin(
        Math.sin(latRad) * Math.sin(declination) +
        Math.cos(latRad) * Math.cos(declination) * Math.cos(lst)
    );

    // 方位角
    const azimuth = Math.atan2(
        -Math.cos(declination) * Math.sin(lst),
        Math.sin(declination) * Math.cos(latRad) - Math.cos(declination) * Math.sin(latRad) * Math.cos(lst)
    );

    return {
        altitude: altitude * 180 / Math.PI,
        azimuth: ((azimuth * 180 / Math.PI) + 180) % 360
    };
}

// ==================== 生成全年日行迹数据 ====================
export function generateAnalemmaFromParams(params, timeMinutes, lat, lng) {
    const data = [];
    const daysInYear = 365; // 简化，忽略闰年差异

    for (let day = 0; day < daysInYear; day++) {
        const pos = calculateSunFromParams(params, day, timeMinutes, lat, lng);
        const date = new Date(Date.UTC(params.year, 0, day + 1));

        data.push({
            date: date,
            altitude: pos.altitude,
            azimuth: pos.azimuth,
            month: date.getUTCMonth(),
            dayOfYear: day,
            isSolstice: isSolsticeDate(date)
        });
    }

    return data;
}

function isSolsticeDate(date) {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    if (month === 2 && day === 20) return '春分';
    if (month === 5 && day === 21) return '夏至';
    if (month === 8 && day === 22) return '秋分';
    if (month === 11 && day === 21) return '冬至';
    return null;
}
