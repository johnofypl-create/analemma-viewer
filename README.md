# 日行迹可视化器 (Analemma Viewer)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个基于 Web 的交互式太阳日行迹（Analemma）可视化工具。通过 3D 地球仪、精密轨道理论和超长年份跨度，直观展示太阳在天空中「8」字形轨迹的形态变化。

## 功能特性

- **3D 交互地球** — 基于 Three.js 渲染，支持拖拽旋转、滚轮缩放、点击选点；包含晨昏线、大气辉光与镜头眩光效果
- **日行迹展示区** — 二次贝塞尔平滑曲线绘制全年 365 天太阳位置，四季节气颜色区分
- **VSOP87 行星理论** — 基于 Laskar 1993 长期轨道模型，精确计算太阳赤经、赤纬、高度角、方位角
- **±10 万年超长跨度** — 年份范围从 -100000 到 +100000，展现黄赤交角、偏心率和近日点经度的长期演化对日行迹形态的影响
- **预计算轨道参数** — 101 个数据点（步进 2000 年）的轨道参数 JSON，运行时线性插值，兼顾精度与性能
- **双算法回退** — VSOP87 为主算法，轨道数据未加载时自动回退 SunCalc.js
- **高 DPI 支持** — Canvas 点对点渲染，Retina 屏幕清晰锐利
- **响应式布局** — 适配桌面端与移动端竖屏

## 技术栈

| 技术 | 用途 |
|------|------|
| Three.js | 3D 地球渲染、光照、交互 |
| D3.js | Equirectangular 地图纹理生成 (2048×1024) |
| SunCalc.js | 回退太阳位置计算 |
| VSOP87 / Laskar 1993 | 长期轨道参数精确计算 |
| ES6 Modules | 模块化架构 |
| Canvas API | 日行迹图表绘制 |

## 项目结构

```
analemma_V1.3_ES6/
├── index.html              # 入口页面
├── css/
│   └── main.css            # 全局样式
├── js/
│   ├── main.js             # 主入口
│   ├── config.js           # 全局状态 + UI区域命名约定
│   ├── core/
│   │   ├── earth.js        # 3D 地球初始化与渲染循环
│   │   ├── sun.js          # 太阳模型 + 日下点光照计算
│   │   ├── stars.js        # 星空背景
│   │   └── atmosphere.js   # (保留)
│   ├── data/
│   │   ├── analemma.js     # 日行迹数据生成调度
│   │   ├── vsop87.js       # VSOP87 太阳位置计算
│   │   ├── suncalc.js      # SunCalc 回退计算
│   │   └── orbital-loader.js # 轨道参数加载与插值
│   ├── map/
│   │   └── d3map.js        # D3 地图纹理生成
│   ├── ui/
│   │   ├── globe.js        # 地球交互事件
│   │   ├── skyview.js      # 日行迹图表 Canvas 绘制
│   │   ├── controls.js     # 时间/日期/年份滑块控制
│   │   ├── coord-input.js  # 经纬度输入处理
│   │   └── tooltip.js      # 悬停提示
│   └── utils/
│       ├── math.js         # 坐标转换 + 日期工具
│       └── time.js         # 时间格式与本地时间计算
├── data/
│   └── orbital-params.json # 预计算轨道参数 (101点)
└── scripts/
    └── precompute.js       # 轨道参数预计算脚本
```

## 快速开始

### 本地运行

直接用浏览器打开 `index.html` 即可，或使用任意 HTTP 服务器：

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

### 重新计算轨道参数

如需调整年份范围或步进：

```bash
node scripts/precompute.js
```

修改 `precompute.js` 中的 `startYear`、`endYear`、`step` 变量。

## 使用指南

1. **选择地点** — 在 3D 地球仪上拖拽旋转、滚轮缩放，点击任意位置选中观察点；也可点击经纬度数值手动输入
2. **调整时间** — 拖动时刻、日期、年份滑块，日行迹图表将实时更新
3. **查看数据** — 右侧面板展示夏至/冬至高度角、地平线以下天数、选中日期太阳位置、当地时间和时区

## 核心数学

太阳位置计算基于 VSOP87 轨道理论：

| 步骤 | 公式 |
|------|------|
| 平近点角 | M = L₀ − ϖ |
| 偏近点角 | E = M + e sin E（开普勒方程迭代） |
| 真近点角 | ν = 2·atan2(√(1+e)·sin(E/2), √(1−e)·cos(E/2)) |
| 太阳黄经 | λ = ν + ϖ |
| 太阳赤纬 | δ = arcsin(sin ε · sin λ) |
| 太阳赤经 | α = atan2(cos ε · sin λ, cos λ) |
| 时角 | H = GMST + lng − α |
| 高度角 | h = arcsin(sin φ·sin δ + cos φ·cos δ·cos H) |
| 方位角 | A = atan2(−cos δ·sin H, sin δ·cos φ − cos δ·sin φ·cos H) |

其中黄赤交角 ε、偏心率 e、近日点经度 ϖ 均随年份变化，来源为 Laskar 1993 长期解。

## 轨道参数范围（±10万年）

| 参数 | 最小值 | 最大值 |
|------|--------|--------|
| 黄赤交角 ε | 22.63° | 24.24° |
| 偏心率 e | 0.0114 | 0.0197 |
| 近日点经度 ϖ | 0° | 360° |

## License

MIT