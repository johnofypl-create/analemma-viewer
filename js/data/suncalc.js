// ==================== 基于 SunCalc 的太阳位置计算 ====================
// 此模块依赖全局 SunCalc 对象（由 CDN 加载）

export function getSunPosition(date, lat, lng) {
    return SunCalc.getPosition(date, lat, lng);
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function calculateSunData(currentTimeMinutes, currentDayOfYear, currentLat, currentLng, currentYear = 2024) {
    const hours = Math.floor(currentTimeMinutes / 60);
    const minutes = currentTimeMinutes % 60;
    const daysInYear = isLeapYear(currentYear) ? 366 : 365;

    const data = [];
    for (let day = 0; day < daysInYear; day++) {
        const date = new Date(Date.UTC(
            currentYear,
            0,
            day + 1,
            hours, minutes, 0
        ));

        const position = SunCalc.getPosition(date, currentLat, currentLng);

        let azimuth = (position.azimuth * 180 / Math.PI) + 180;
        if (azimuth >= 360) azimuth -= 360;

        const altitude = position.altitude * 180 / Math.PI;

        const dayStart = new Date(Date.UTC(currentYear, 0, 0));
        const doy = Math.floor((date.getTime() - dayStart.getTime()) / 86400000);

        data.push({
            date: new Date(date),
            altitude: altitude,
            azimuth: azimuth,
            month: date.getUTCMonth(),
            dayOfYear: doy,
            isSolstice: isSolstice(date)
        });
    }

    data.sort((a, b) => a.date - b.date);
    return data;
}

// ==================== 判断节气 ====================
export function isSolstice(date) {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    if (month === 2 && day === 20) return '春分';
    if (month === 5 && day === 21) return '夏至';
    if (month === 8 && day === 22) return '秋分';
    if (month === 11 && day === 21) return '冬至';
    return null;
}
