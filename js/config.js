// ==================== UI 区域命名约定 ====================
// 状态栏: 最上方横条，包含标题和"关于"按钮
// 模型区: 3D 地球模型 + 晨昏线 + 太阳光标的交互区域
// 控制台: 时间滑块、经纬度坐标输入的区域
// 展示区: 右侧日行迹图表的 Canvas 绘制区域
// 数据区: 年份滑块 + 夏至/冬至高度角等轨道参数显示的区域

// ==================== 全局状态 ====================
// 使用对象包装，确保所有模块共享同一引用

export const state = {
    currentLat: 39.9042,
    currentLng: 116.4074,
    currentTimeMinutes: 720,
    currentYear: 2024,
    currentDayOfYear: Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000),
    analemmaData: [],
    isDragging: false,
    isDraggingMarker: false,
    dragMoved: false,
    previousMousePosition: { x: 0, y: 0 },
    earthRotation: { x: 0.3, y: 2.0 },
    cameraDistance: 2.5
};

// Three.js 对象引用
export const refs = {
    scene: null,
    camera: null,
    renderer: null,
    earthGroup: null,
    earthMesh: null,
    markerMesh: null,
    sunLight: null,
    sunMesh: null,
    atmosphere: null,
    glow: null,
    lensFlareCanvas: null,
    lensFlareCtx: null
};

// 兼容性导出（getter/setter）
export const currentLat = () => state.currentLat;
export const currentLng = () => state.currentLng;
export const currentTimeMinutes = () => state.currentTimeMinutes;
export const currentYear = () => state.currentYear;
export const currentDayOfYear = () => state.currentDayOfYear;
export const analemmaData = () => state.analemmaData;
export const isDragging = () => state.isDragging;
export const isDraggingMarker = () => state.isDraggingMarker;
export const dragMoved = () => state.dragMoved;
export const previousMousePosition = () => state.previousMousePosition;
export const earthRotation = () => state.earthRotation;
export const cameraDistance = () => state.cameraDistance;

export const earthMesh = () => refs.earthMesh;
export const markerMesh = () => refs.markerMesh;
export const camera = () => refs.camera;
export const earthGroup = () => refs.earthGroup;

// Setter 函数
export function setCurrentLat(val) { state.currentLat = val; }
export function setCurrentLng(val) { state.currentLng = val; }
export function setCurrentTimeMinutes(val) { state.currentTimeMinutes = val; }
export function setCurrentYear(val) { state.currentYear = val; }
export function setCurrentDayOfYear(val) { state.currentDayOfYear = val; }
export function setAnalemmaData(val) { state.analemmaData = val; }
export function setIsDragging(val) { state.isDragging = val; }
export function setIsDraggingMarker(val) { state.isDraggingMarker = val; }
export function setDragMoved(val) { state.dragMoved = val; }
export function setPreviousMousePosition(val) { state.previousMousePosition = val; }
export function setEarthRotation(val) { state.earthRotation = val; }
export function setCameraDistance(val) { state.cameraDistance = val; }

export function setScene(val) { refs.scene = val; }
export function setCamera(val) { refs.camera = val; }
export function setRenderer(val) { refs.renderer = val; }
export function setEarthGroup(val) { refs.earthGroup = val; }
export function setEarthMesh(val) { refs.earthMesh = val; }
export function setMarkerMesh(val) { refs.markerMesh = val; }
export function setSunLight(val) { refs.sunLight = val; }
export function setSunMesh(val) { refs.sunMesh = val; }
export function setAtmosphere(val) { refs.atmosphere = val; }
export function setGlow(val) { refs.glow = val; }
export function setLensFlareCanvas(val) { refs.lensFlareCanvas = val; }
export function setLensFlareCtx(val) { refs.lensFlareCtx = val; }
