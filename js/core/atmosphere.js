// ==================== 大气层 Shader ====================
export const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const atmosphereFragmentShader = `
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

export const outerGlowVertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const outerGlowFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
        float NdotV = max(dot(vNormal, vViewDir), 0.0);
        float rim = 1.0 - NdotV;
        float alpha = pow(rim, 4.0) * 0.15;
        gl_FragColor = vec4(0.2, 0.4, 0.7, alpha);
    }
`;
