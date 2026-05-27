// ==================== 时间转换函数 ====================
export function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeToMinutes(timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
}

// ==================== UTC/本地时间计算 ====================
export function getLocalTimeStr(currentTimeMinutes, currentLng) {
    const tzOffset = Math.round(currentLng / 15);
    const utcHours = Math.floor(currentTimeMinutes / 60);
    const utcMins = currentTimeMinutes % 60;
    let localHours = utcHours + tzOffset;
    if (localHours < 0) localHours += 24;
    if (localHours >= 24) localHours -= 24;
    return String(localHours).padStart(2, '0') + ':' + String(utcMins).padStart(2, '0');
}

export function getTimezoneStr(currentLng) {
    const timezoneOffset = Math.round(currentLng / 15);
    const sign = timezoneOffset >= 0 ? '+' : '';
    return `UTC${sign}${timezoneOffset}`;
}
