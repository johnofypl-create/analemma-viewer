import {
    setScene, setCamera, setRenderer, setEarthGroup, setEarthMesh, setMarkerMesh,
    setSunLight, setSunMesh, setAtmosphere, setGlow, setLensFlareCanvas, setLensFlareCtx,
    state, refs
} from '../config.js';
import { latLngToVector3 } from '../utils/math.js';
import { createEarthTexture } from '../map/d3map.js';
import { createStarField } from './stars.js';
import { createSunModel } from './sun.js';
import { updateMarkerPosition } from '../ui/globe.js';
import { setupGlobeEvents } from '../ui/globe.js';
import { drawLensFlare } from './sun.js';

let frameCount = 0;
let animationId = null;

export function initGlobe() {
    const container = document.getElementById('globeCanvas');
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b14);
    setScene(scene);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = state.cameraDistance;
    setCamera(camera);

    const renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    setRenderer(renderer);

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    setEarthGroup(earthGroup);

    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthTexture = createEarthTexture();
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 25,
        specular: new THREE.Color(0x333333)
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);
    setEarthMesh(earthMesh);

    initAtmosphere(earthGroup);
    initMarker(earthGroup);
    initLighting(earthGroup);
    createStarField(earthGroup);
    createSunModel(earthGroup);
    initLensFlare();

    earthGroup.rotation.x = state.earthRotation.x;
    earthGroup.rotation.y = state.earthRotation.y;

    updateMarkerPosition();
    setupGlobeEvents(container);
    startAnimation();
}

function initAtmosphere(earthGroup) {
    const atmosphereVertexShader = `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vNormal = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const atmosphereFragmentShader = `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            float NdotV = max(dot(vNormal, vViewDir), 0.0);
            float rim = 1.0 - NdotV;
            float alpha = NdotV * 0.06 + pow(rim, 2.5) * 0.45;
            vec3 centerColor = vec3(0.12, 0.28, 0.55);
            vec3 edgeColor = vec3(0.24, 0.56, 0.85);
            vec3 color = mix(centerColor, edgeColor, rim);
            gl_FragColor = vec4(color, alpha);
        }
    `;
    const atmosphereGeometry = new THREE.SphereGeometry(1.03, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);
    setAtmosphere(atmosphere);

    const outerGlowVertexShader = `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vNormal = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const outerGlowFragmentShader = `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            float NdotV = max(dot(vNormal, vViewDir), 0.0);
            float rim = 1.0 - NdotV;
            float alpha = pow(rim, 4.0) * 0.15;
            gl_FragColor = vec4(0.2, 0.4, 0.7, alpha);
        }
    `;
    const glowGeometry = new THREE.SphereGeometry(1.06, 64, 64);
    const glowMaterial = new THREE.ShaderMaterial({
        vertexShader: outerGlowVertexShader,
        fragmentShader: outerGlowFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    earthGroup.add(glow);
    setGlow(glow);
}

function initMarker(earthGroup) {
    const markerGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.5
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    setMarkerMesh(marker);
    earthGroup.add(marker);

    const ringGeometry = new THREE.RingGeometry(0.05, 0.07, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    marker.add(ring);
}

function initLighting(earthGroup) {
    const ambientLight = new THREE.AmbientLight(0x1a2a4a, 0.6);
    earthGroup.parent.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
    sunLight.position.set(3, 2, -4);
    earthGroup.add(sunLight);
    earthGroup.add(sunLight.target);
    setSunLight(sunLight);

    const fillLight = new THREE.DirectionalLight(0x334466, 0.4);
    fillLight.position.set(-2, -1, 3);
    earthGroup.add(fillLight);
}

function initLensFlare() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    const gc = document.querySelector('.globe-container');
    canvas.width = gc.clientWidth;
    canvas.height = gc.clientHeight;
    setLensFlareCanvas(canvas);
    setLensFlareCtx(canvas.getContext('2d'));
    gc.appendChild(canvas);
}

export function handleGlobeResize() {
    const gc = document.querySelector('.globe-container');
    if (!gc) return;
    const width = gc.clientWidth;
    const height = gc.clientHeight;
    if (width === 0 || height === 0) return;

    if (refs.renderer) {
        refs.renderer.setPixelRatio(window.devicePixelRatio);
        refs.camera.aspect = width / height;
        refs.camera.updateProjectionMatrix();
        refs.renderer.setSize(width, height);
    }
}

function startAnimation() {
    animate();
}

export function animate() {
    animationId = requestAnimationFrame(animate);
    frameCount++;

    if (refs.markerMesh) {
        const scale = 1 + Math.sin(Date.now() * 0.003) * 0.2;
        refs.markerMesh.children[0].scale.set(scale, scale, scale);
    }

    drawLensFlare();

    if (frameCount % 3 === 0 && state.analemmaData.length > 0) {
        import('../ui/skyview.js').then(skyview => {
            skyview.drawSkyView();
        });
    }

    if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera);
    }
}

export function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}
