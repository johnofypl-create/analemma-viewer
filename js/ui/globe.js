import {
    state, refs,
    setCurrentLat, setCurrentLng,
    setIsDragging, setIsDraggingMarker, setDragMoved, setPreviousMousePosition,
    setEarthRotation, setCameraDistance
} from '../config.js';
import { latLngToVector3, vector3ToLatLng } from '../utils/math.js';
import { updateCoordsDisplay } from './controls.js';
import { updateSunLight } from '../core/sun.js';
import { generateAnalemma } from '../data/analemma.js';

// ==================== 更新标记位置 ====================
export function updateMarkerPosition() {
    if (refs.markerMesh) {
        const pos = latLngToVector3(state.currentLat, state.currentLng, 1.02);
        refs.markerMesh.position.copy(pos);
        refs.markerMesh.lookAt(new THREE.Vector3(0, 0, 0));
    }
}

// ==================== 地球交互事件 ====================
export function setupGlobeEvents(canvas) {
    const rect = () => canvas.getBoundingClientRect();

    function screenToNDC(ex, ey) {
        const r = rect();
        return new THREE.Vector2(
            ((ex - r.left) / r.width) * 2 - 1,
            -((ey - r.top) / r.height) * 2 + 1
        );
    }

    function isNearMarker(ex, ey) {
        if (!refs.markerMesh || !refs.camera) return false;
        const markerWorldPos = new THREE.Vector3();
        refs.markerMesh.getWorldPosition(markerWorldPos);
        const screenPos = markerWorldPos.clone().project(refs.camera);
        const r = rect();
        const sx = (screenPos.x * 0.5 + 0.5) * r.width + r.left;
        const sy = (-screenPos.y * 0.5 + 0.5) * r.height + r.top;
        const dist = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        return dist < 30;
    }

    function raycasterToLatLng(ex, ey) {
        if (!refs.earthMesh || !refs.camera || !refs.earthGroup) return null;
        const mouse = screenToNDC(ex, ey);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, refs.camera);
        const intersects = raycaster.intersectObject(refs.earthMesh);
        if (intersects.length > 0) {
            const worldPoint = intersects[0].point;
            const localPoint = refs.earthGroup.worldToLocal(worldPoint.clone());
            return vector3ToLatLng(localPoint);
        }
        return null;
    }

    function setCoordsAndUpdate(lat, lng) {
        setCurrentLat(lat);
        setCurrentLng(lng);
        updateCoordsDisplay();
        updateMarkerPosition();
        updateSunLight(state.currentTimeMinutes, state.currentDayOfYear, state.currentYear);
        generateAnalemma();
    }

    canvas.addEventListener('mousedown', (e) => {
        if (isNearMarker(e.clientX, e.clientY)) {
            setIsDraggingMarker(true);
            canvas.style.cursor = 'grabbing';
            const latLng = raycasterToLatLng(e.clientX, e.clientY);
            if (latLng) setCoordsAndUpdate(latLng.lat, latLng.lng);
        } else {
            setIsDragging(true);
            setDragMoved(false);
        }
        setPreviousMousePosition({ x: e.clientX, y: e.clientY });
    });

    canvas.addEventListener('mousemove', (e) => {
        if (state.isDraggingMarker) {
            const latLng = raycasterToLatLng(e.clientX, e.clientY);
            if (latLng) {
                setCurrentLat(latLng.lat);
                setCurrentLng(latLng.lng);
                updateCoordsDisplay();
                updateMarkerPosition();
                updateSunLight(state.currentTimeMinutes, state.currentDayOfYear, state.currentYear);
                generateAnalemma();
            }
            setPreviousMousePosition({ x: e.clientX, y: e.clientY });
        } else if (state.isDragging) {
            const deltaX = e.clientX - state.previousMousePosition.x;
            const deltaY = e.clientY - state.previousMousePosition.y;

            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) setDragMoved(true);

            const newRotY = state.earthRotation.y + deltaX * 0.005;
            const newRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.earthRotation.x + deltaY * 0.005));
            setEarthRotation({ x: newRotX, y: newRotY });
            if (refs.earthGroup) {
                refs.earthGroup.rotation.x = newRotX;
                refs.earthGroup.rotation.y = newRotY;
            }

            setPreviousMousePosition({ x: e.clientX, y: e.clientY });
        } else {
            canvas.style.cursor = isNearMarker(e.clientX, e.clientY) ? 'grab' : '';
        }
    });

    canvas.addEventListener('mouseup', () => {
        setIsDragging(false);
        setIsDraggingMarker(false);
        canvas.style.cursor = '';
    });

    canvas.addEventListener('mouseleave', () => {
        setIsDragging(false);
        setIsDraggingMarker(false);
        canvas.style.cursor = '';
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (refs.camera) {
            const newDist = Math.max(1.5, Math.min(5, state.cameraDistance + e.deltaY * 0.001));
            setCameraDistance(newDist);
            refs.camera.position.z = newDist;
        }
    });

    canvas.addEventListener('click', (e) => {
        if (state.dragMoved || state.isDraggingMarker) return;
        const latLng = raycasterToLatLng(e.clientX, e.clientY);
        if (latLng) setCoordsAndUpdate(latLng.lat, latLng.lng);
    });

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            if (isNearMarker(e.touches[0].clientX, e.touches[0].clientY)) {
                setIsDraggingMarker(true);
                const latLng = raycasterToLatLng(e.touches[0].clientX, e.touches[0].clientY);
                if (latLng) setCoordsAndUpdate(latLng.lat, latLng.lng);
            } else {
                setIsDragging(true);
                setDragMoved(false);
            }
            setPreviousMousePosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            if (state.isDraggingMarker) {
                const latLng = raycasterToLatLng(e.touches[0].clientX, e.touches[0].clientY);
                if (latLng) {
                    setCurrentLat(latLng.lat);
                    setCurrentLng(latLng.lng);
                    updateCoordsDisplay();
                    updateMarkerPosition();
                    updateSunLight(state.currentTimeMinutes, state.currentDayOfYear, state.currentYear);
                    generateAnalemma();
                }
            } else if (state.isDragging) {
                const deltaX = e.touches[0].clientX - state.previousMousePosition.x;
                const deltaY = e.touches[0].clientY - state.previousMousePosition.y;
                if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) setDragMoved(true);
                const newRotY = state.earthRotation.y + deltaX * 0.005;
                const newRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.earthRotation.x + deltaY * 0.005));
                setEarthRotation({ x: newRotX, y: newRotY });
                if (refs.earthGroup) {
                    refs.earthGroup.rotation.x = newRotX;
                    refs.earthGroup.rotation.y = newRotY;
                }
            }
            setPreviousMousePosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    });

    canvas.addEventListener('touchend', () => {
        setIsDragging(false);
        setIsDraggingMarker(false);
    });
}
