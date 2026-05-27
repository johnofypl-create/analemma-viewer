import { refs } from '../config.js';

// ==================== 创建太阳模型 ====================
export function createSunModel(earthGroup) {
    const sunGeom = new THREE.SphereGeometry(0.25, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 });
    const sun = new THREE.Mesh(sunGeom, sunMat);
    sun.position.set(10, 0, 0);
    refs.sunMesh = sun;
    earthGroup.add(sun);

    const glowGeom1 = new THREE.SphereGeometry(0.32, 32, 32);
    const glowMat1 = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(1.0, 0.95, 0.5, intensity * 0.8);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glowMesh1 = new THREE.Mesh(glowGeom1, glowMat1);
    sun.add(glowMesh1);

    const glowGeom2 = new THREE.SphereGeometry(0.45, 32, 32);
    const glowMat2 = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
                gl_FragColor = vec4(1.0, 0.7, 0.2, intensity * 0.5);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const glowMesh2 = new THREE.Mesh(glowGeom2, glowMat2);
    sun.add(glowMesh2);
}

// ==================== 更新太阳光照方向 (日下点算法) ====================
export function updateSunLight(currentTimeMinutes, currentDayOfYear) {
    if (!refs.sunLight) return;
    const hours = Math.floor(currentTimeMinutes / 60);
    const minutes = currentTimeMinutes % 60;
    const doy = currentDayOfYear;

    const decDeg = 23.44 * Math.sin(2 * Math.PI * (doy - 81) / 365);
    const B = (360 / 365) * (doy - 81) * Math.PI / 180;
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const utcDecimal = hours + minutes / 60;

    let subLng = (12 - eot / 60 - utcDecimal) * 15;
    while (subLng > 180) subLng -= 360;
    while (subLng < -180) subLng += 360;

    const lightDir = latLngToVector3(decDeg, subLng, 6);
    refs.sunLight.position.copy(lightDir);
    if (refs.sunMesh) {
        refs.sunMesh.position.copy(lightDir.clone().normalize().multiplyScalar(15));
    }
}

function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    return new THREE.Vector3(x, y, z);
}

// ==================== 绘制镜头眩光 ====================
export function drawLensFlare() {
    const sunMesh = refs.sunMesh;
    const lensFlareCtx = refs.lensFlareCtx;
    const lensFlareCanvas = refs.lensFlareCanvas;
    const camera = refs.camera;

    if (!sunMesh || !lensFlareCtx) return;

    const container = document.querySelector('.globe-container');
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (lensFlareCanvas.width !== cw || lensFlareCanvas.height !== ch) {
        lensFlareCanvas.width = cw;
        lensFlareCanvas.height = ch;
    }

    const w = lensFlareCanvas.width;
    const h = lensFlareCanvas.height;
    lensFlareCtx.clearRect(0, 0, w, h);

    const worldPos = new THREE.Vector3();
    sunMesh.getWorldPosition(worldPos);
    const screenPos = worldPos.clone().project(camera);

    if (screenPos.z > 1) return;
    if (screenPos.x < -1.2 || screenPos.x > 1.2 || screenPos.y < -1.2 || screenPos.y > 1.2) return;

    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);
    const toSun = worldPos.clone().sub(cameraWorldPos);
    const sunDist = toSun.length();
    const sunDir = toSun.normalize();

    const earthDist = cameraWorldPos.length();
    const earthAngRad = Math.asin(Math.min(1, 1.0 / earthDist));
    const sunAngRad = Math.asin(Math.min(1, 0.25 / sunDist));
    const earthDir = cameraWorldPos.clone().normalize().negate();
    const cosAngle = Math.max(-1, Math.min(1, sunDir.dot(earthDir)));
    const angleBetween = Math.acos(cosAngle);

    const minAngle = Math.max(0, earthAngRad - sunAngRad);
    const maxAngle = earthAngRad + sunAngRad;

    let occlusionVis = 1.0;
    if (angleBetween >= maxAngle) {
        occlusionVis = 1.0;
    } else if (angleBetween <= minAngle) {
        occlusionVis = 0.0;
    } else {
        occlusionVis = (angleBetween - minAngle) / (maxAngle - minAngle);
    }

    const sx = (screenPos.x * 0.5 + 0.5) * w;
    const sy = (-screenPos.y * 0.5 + 0.5) * h;
    const cx = w / 2;
    const cy = h / 2;
    const dx = sx - cx;
    const dy = sy - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxDist = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
    const intensity = Math.max(0, 1 - dist / maxDist) * occlusionVis;
    if (intensity < 0.03) return;

    const base = Math.min(w, h) * 0.065;
    const sunRadius = base * 1.6;

    const halo = lensFlareCtx.createRadialGradient(sx, sy, 0, sx, sy, base * 6 * intensity);
    halo.addColorStop(0, 'rgba(255,240,200,0.18)');
    halo.addColorStop(0.4, 'rgba(255,200,80,0.08)');
    halo.addColorStop(0.7, 'rgba(255,140,40,0.03)');
    halo.addColorStop(1, 'rgba(255,100,20,0)');
    lensFlareCtx.fillStyle = halo;
    lensFlareCtx.fillRect(0, 0, w, h);

    const core = lensFlareCtx.createRadialGradient(sx, sy, 0, sx, sy, sunRadius * 1.2 * intensity);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.1, 'rgba(255,255,245,0.75)');
    core.addColorStop(0.3, 'rgba(255,220,80,0.3)');
    core.addColorStop(0.6, 'rgba(255,150,30,0.08)');
    core.addColorStop(1, 'rgba(255,100,20,0)');
    lensFlareCtx.fillStyle = core;
    lensFlareCtx.fillRect(0, 0, w, h);

    const streakLen = base * 16 * intensity;
    const streakH = base * 0.15 * intensity;
    const streakGrad = lensFlareCtx.createLinearGradient(sx - streakLen, sy, sx + streakLen, sy);
    streakGrad.addColorStop(0, 'rgba(100,180,255,0)');
    streakGrad.addColorStop(0.15, 'rgba(130,200,255,0.08)');
    streakGrad.addColorStop(0.4, 'rgba(180,220,255,0.2)');
    streakGrad.addColorStop(0.5, 'rgba(210,235,255,0.35)');
    streakGrad.addColorStop(0.6, 'rgba(180,220,255,0.2)');
    streakGrad.addColorStop(0.85, 'rgba(130,200,255,0.08)');
    streakGrad.addColorStop(1, 'rgba(100,180,255,0)');
    lensFlareCtx.fillStyle = streakGrad;
    lensFlareCtx.fillRect(sx - streakLen, sy - streakH, streakLen * 2, streakH * 2);

    const starLen = base * 5 * intensity;
    const starW = base * 0.1 * intensity;
    lensFlareCtx.save();
    lensFlareCtx.globalAlpha = 0.55 * intensity;
    for (let a = 0; a < 4; a++) {
        const angle = (Math.PI / 4) + a * (Math.PI / 2);
        lensFlareCtx.save();
        lensFlareCtx.translate(sx, sy);
        lensFlareCtx.rotate(angle);
        const starGrad = lensFlareCtx.createLinearGradient(0, 0, starLen, 0);
        starGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
        starGrad.addColorStop(0.2, 'rgba(255,230,190,0.3)');
        starGrad.addColorStop(1, 'rgba(255,180,100,0)');
        lensFlareCtx.fillStyle = starGrad;
        lensFlareCtx.fillRect(0, -starW, starLen, starW * 2);
        lensFlareCtx.restore();
    }
    lensFlareCtx.restore();

    const ghostPositions = [-0.85, -0.45, -0.18, 0.18, 0.45, 0.85];
    const ghostSizes = [0.4, 0.7, 1.0, 1.0, 0.7, 0.4];
    const ghostAlphas = [0.10, 0.16, 0.22, 0.22, 0.16, 0.10];

    for (let i = 0; i < ghostPositions.length; i++) {
        const t = ghostPositions[i];
        const gx = cx + dx * t;
        const gy = cy + dy * t;
        const alpha = ghostAlphas[i] * intensity;
        if (alpha < 0.005) continue;

        const r = base * ghostSizes[i];

        const ghostGrad = lensFlareCtx.createRadialGradient(gx, gy, r * 0.15, gx, gy, r);
        ghostGrad.addColorStop(0, 'rgba(255,255,245,0.4)');
        ghostGrad.addColorStop(0.25, 'rgba(255,230,170,0.25)');
        ghostGrad.addColorStop(0.6, 'rgba(255,170,90,0.08)');
        ghostGrad.addColorStop(1, 'rgba(255,120,40,0)');

        lensFlareCtx.save();
        lensFlareCtx.globalAlpha = alpha;
        lensFlareCtx.fillStyle = ghostGrad;
        lensFlareCtx.beginPath();
        lensFlareCtx.arc(gx, gy, r, 0, Math.PI * 2);
        lensFlareCtx.fill();

        lensFlareCtx.strokeStyle = 'rgba(255,230,190,0.22)';
        lensFlareCtx.lineWidth = r * 0.1;
        lensFlareCtx.stroke();
        lensFlareCtx.restore();
    }

    for (let i = 0; i < 3; i++) {
        const t = (i + 1) * 0.25;
        const bx = cx - dx * t;
        const by = cy - dy * t;
        const alpha = intensity * 0.07 * (1 - t);
        if (alpha < 0.003) continue;

        const hazeR = base * (2 + i * 1.5);
        const hazeGrad = lensFlareCtx.createRadialGradient(bx, by, hazeR * 0.3, bx, by, hazeR);
        hazeGrad.addColorStop(0, 'rgba(140,200,255,0.15)');
        hazeGrad.addColorStop(0.5, 'rgba(100,160,240,0.05)');
        hazeGrad.addColorStop(1, 'rgba(60,120,220,0)');
        lensFlareCtx.save();
        lensFlareCtx.globalAlpha = alpha;
        lensFlareCtx.fillStyle = hazeGrad;
        lensFlareCtx.fillRect(0, 0, w, h);
        lensFlareCtx.restore();
    }
}
