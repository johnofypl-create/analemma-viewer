// ==================== 预计算脚本 ====================
// 生成 -100000 到 +100000 年间每隔 2000 年的轨道参数
// 运行: node scripts/precompute.js

const fs = require('fs');
const path = require('path');

// 计算儒略千年数 (从 J2000.0 起算)
function getJulianMillennia(year) {
    const jd = Date.UTC(year, 0, 1, 12, 0, 0) / 86400000 + 2440587.5;
    return (jd - 2451545.0) / 365250;
}

// 黄赤交角计算 (Laskar 1993)
function getObliquity(year) {
    const t = getJulianMillennia(year);
    let eps = 84381.448;
    eps += -46.8150 * t;
    eps += -0.00059 * t * t;
    eps += 0.001813 * t * t * t;
    return eps / 3600; // 转换为度
}

// 轨道偏心率
function getEccentricity(year) {
    const t = getJulianMillennia(year);
    let e = 0.0167086342;
    e += -0.000042037 * t;
    e += -0.0000001267 * t * t;
    e += 0.0000044 * Math.cos(1.1405 + 0.0003 * t);
    return e;
}

// 近日点经度
function getPerihelion(year) {
    const t = getJulianMillennia(year);
    let varpi = 102.93735;
    varpi += 1.71946 * t;
    varpi += 0.00046 * t * t;
    varpi = varpi % 360;
    if (varpi < 0) varpi += 360;
    return varpi;
}

// 岁差
function getPrecession(year) {
    const t = getJulianMillennia(year);
    const pA = 5028.796195 * t +
               1.1054348 * t * t +
               0.00007964 * t * t * t;
    return pA / 3600;
}

// ==================== 生成预计算数据 ====================
function generatePrecomputedData() {
    const startYear = -100000;
    const endYear = 100000;
    const step = 2000;

    const data = [];

    for (let year = startYear; year <= endYear; year += step) {
        data.push({
            year: year,
            obliquity: parseFloat(getObliquity(year).toFixed(6)),
            eccentricity: parseFloat(getEccentricity(year).toFixed(8)),
            perihelion: parseFloat(getPerihelion(year).toFixed(6)),
            precession: parseFloat(getPrecession(year).toFixed(6))
        });
    }

    return {
        metadata: {
            startYear: startYear,
            endYear: endYear,
            step: step,
            totalPoints: data.length,
            generatedAt: new Date().toISOString(),
            description: "VSOP87-based orbital parameters for long-term analemma visualization"
        },
        data: data
    };
}

// ==================== 主程序 ====================
function main() {
    console.log('Starting precomputation of orbital parameters...');
    console.log('Range: -100000 to +100000, step: 2000 years');

    const result = generatePrecomputedData();

    // 确保目录存在
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // 写入 JSON 文件
    const outputPath = path.join(dataDir, 'orbital-params.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`\nPrecomputation complete!`);
    console.log(`Total data points: ${result.metadata.totalPoints}`);
    console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    console.log(`Output: ${outputPath}`);

    // 打印一些示例数据
    console.log('\nSample data points:');
    const samples = [-100000, -80000, -60000, -40000, -20000, 0, 20000, 40000, 60000, 80000, 100000];
    for (const year of samples) {
        const point = result.data.find(d => d.year === year);
        if (point) {
            console.log(`Year ${year}: ε=${point.obliquity}°, e=${point.eccentricity}, ϖ=${point.perihelion}°`);
        }
    }

    // 分析变化范围
    const obliquities = result.data.map(d => d.obliquity);
    const eccentricities = result.data.map(d => d.eccentricity);
    console.log('\nVariation ranges:');
    console.log(`Obliquity: ${Math.min(...obliquities).toFixed(3)}° to ${Math.max(...obliquities).toFixed(3)}°`);
    console.log(`Eccentricity: ${Math.min(...eccentricities).toFixed(5)} to ${Math.max(...eccentricities).toFixed(5)}`);
}

main();
