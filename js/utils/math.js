// ==================== 经纬度转三维坐标 ====================
// Three.js SphereGeometry: x=sin(phi)*sin(theta), y=cos(phi), z=sin(phi)*cos(theta)
// theta=0 (+Z) 对应 lng=-180 (纹理左边缘)
export function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);

    return new THREE.Vector3(x, y, z);
}

// ==================== 三维坐标转经纬度 ====================
export function vector3ToLatLng(vector) {
    const v = vector.clone().normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, v.y))) * 180 / Math.PI;

    let rawTheta = Math.atan2(v.x, v.z);
    if (rawTheta < 0) rawTheta += 2 * Math.PI;
    const lng = rawTheta * 180 / Math.PI - 180;

    return { lat, lng };
}

// ==================== 判断闰年 ====================
export function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// ==================== 日期标签转换 ====================
export function doyToDateLabel(doy, year = null) {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year && isLeapYear(year)) {
        daysInMonth[1] = 29;
    }
    let remaining = doy;
    for (let m = 0; m < 12; m++) {
        if (remaining < daysInMonth[m]) {
            return `${months[m]}月${remaining + 1}日`;
        }
        remaining -= daysInMonth[m];
    }
    return '12月31日';
}

// ==================== 获取一年中的第几天 ====================
export function getDayOfYear() {
    return Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
}
