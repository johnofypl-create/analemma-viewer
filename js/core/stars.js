// ==================== 创建星空 ====================
export function createStarField(earthGroup) {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
        const r = 40 + Math.random() * 30;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);

        const brightness = 0.6 + Math.random() * 0.4;
        const tint = Math.random();
        if (tint < 0.1) { colors[i] = 1; colors[i + 1] = 0.85; colors[i + 2] = 0.7; }
        else if (tint < 0.2) { colors[i] = 0.7; colors[i + 1] = 0.8; colors[i + 2] = 1; }
        else { colors[i] = brightness; colors[i + 1] = brightness; colors[i + 2] = brightness; }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.25,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    earthGroup.add(stars);
}
