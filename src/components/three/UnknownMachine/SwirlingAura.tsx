import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RAINBOW_COLORS } from './index';

interface SwirlingAuraProps {
  coreRadius?: number;
  count?: number;
  intensityRef: React.MutableRefObject<number>;
  debug?: boolean;
}

// Simplex noise GLSL implementation (Ashima Arts)
const simplexNoise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = `
${simplexNoise}

attribute vec3 aColor;
attribute float aPhase;
attribute float aSpeed;
attribute float aRadius;

uniform float uTime;
uniform float uIntensity;
uniform float uDebug;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;

  // Base swirl rotation around Y axis
  float angle = uTime * aSpeed + aPhase;

  // Convert to spherical-ish coordinates for swirling
  float x = position.x;
  float y = position.y;
  float z = position.z;

  // Rotate around Y axis (main swirl)
  float cosA = cos(angle);
  float sinA = sin(angle);
  float newX = x * cosA - z * sinA;
  float newZ = x * sinA + z * cosA;

  // Apply noise displacement for organic movement
  vec3 noiseInput = vec3(newX * 2.0, y * 2.0, newZ * 2.0 + uTime * 0.3);
  float noiseVal = snoise(noiseInput) * 0.15;

  // Secondary noise for vertical movement
  float verticalNoise = snoise(vec3(newX * 1.5, uTime * 0.5, newZ * 1.5)) * 0.1;

  // Construct final position
  vec3 newPos = vec3(newX, y + verticalNoise, newZ);

  // Radial displacement from noise
  vec3 radialDir = normalize(newPos);
  newPos += radialDir * noiseVal * uIntensity;

  // Pulse effect
  float pulse = 1.0 + sin(uTime * 2.0 + aPhase) * 0.05 * uIntensity;
  newPos *= pulse;

  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation with intensity boost
  float baseSize = 6.0;
  float size = baseSize * uIntensity;
  gl_PointSize = size * (300.0 / -mvPosition.z);

  // Higher alpha for better coverage
  vAlpha = 0.95;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circular particle
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  float alpha = smoothstep(0.5, 0.15, dist) * vAlpha;

  // Boost color intensity
  vec3 saturatedColor = vColor * 3.0;

  gl_FragColor = vec4(saturatedColor, alpha);
}
`;

export default function SwirlingAura({
  coreRadius = 0.25,
  count = 2000,
  intensityRef,
  debug = false,
}: SwirlingAuraProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Parse rainbow colors to THREE.Color
  const rainbowColors = useMemo(() => {
    const colors = RAINBOW_COLORS.map(hex => new THREE.Color(hex));
    if (debug) {
      console.log('[SwirlingAura] Rainbow colors:', RAINBOW_COLORS);
      console.log('[SwirlingAura] Parsed colors:', colors.map(c => ({ r: c.r, g: c.g, b: c.b })));
    }
    return colors;
  }, [debug]);

  // Generate particle attributes
  const { positions, colors, phases, speeds, radii } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const pha = new Float32Array(count);
    const spd = new Float32Array(count);
    const rad = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on spherical shell, further out than corona
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      // Shell from 1.2x to 2.4x core radius (20% smaller)
      const radiusMultiplier = 1.2 + Math.random() * 1.2;
      const r = coreRadius * radiusMultiplier;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Assign rainbow color
      const color = rainbowColors[i % rainbowColors.length];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      // Random phase and speed for variation
      pha[i] = Math.random() * Math.PI * 2;
      spd[i] = 0.3 + Math.random() * 0.4; // Varying rotation speeds
      rad[i] = r;
    }

    return { positions: pos, colors: col, phases: pha, speeds: spd, radii: rad };
  }, [coreRadius, count, rainbowColors]);

  // Update uniforms each frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uIntensity.value = intensityRef.current;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          args={[speeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aRadius"
          args={[radii, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uIntensity: { value: 1 },
          uDebug: { value: debug ? 1.0 : 0.0 },
        }}
        transparent
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </points>
  );
}
