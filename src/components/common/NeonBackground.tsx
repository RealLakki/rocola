import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Fondo animado con three.js — aurora neon (violeta / cian / rosa) que fluye,
 * generada en un fragment shader a pantalla completa. Barata (un solo quad),
 * fija detrás del contenido. Si WebGL no está disponible, no renderiza nada.
 */
const FRAG = /* glsl */ `
precision highp float;
uniform float u_time;
uniform vec2  u_res;

// hash + noise + fbm (value noise, barato)
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;
  float t = u_time * 0.05;

  // domain warping para que fluya
  vec2 q = vec2(fbm(p*1.5 + t), fbm(p*1.5 - t + 4.0));
  float n = fbm(p*2.0 + q*1.8 + vec2(t*0.6, -t*0.4));

  vec3 violet = vec3(0.66, 0.33, 0.97);
  vec3 cyan   = vec3(0.13, 0.83, 0.93);
  vec3 pink   = vec3(0.98, 0.17, 0.42);
  vec3 col = mix(violet, cyan, smoothstep(0.25, 0.75, n));
  col = mix(col, pink, smoothstep(0.62, 0.95, fbm(p*3.0 - t)) * 0.5);

  // concentra el brillo arriba, se apaga hacia abajo (fondo oscuro)
  float glow = pow(1.0 - uv.y, 1.6) * (0.35 + 0.65 * n);
  col *= glow * 1.15;

  // base oscura azul-negra
  vec3 base = vec3(0.039, 0.039, 0.078);
  col = base + col;

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */ `
void main(){ gl_Position = vec4(position, 1.0); }
`;

export function NeonBackground({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    } catch {
      return; // sin WebGL → fondo CSS de respaldo (body) se ve igual
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const uniforms = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(mount.clientWidth, mount.clientHeight) },
    };
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }),
    );
    scene.add(mesh);

    const onResize = () => {
      if (!mount) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      uniforms.u_res.value.set(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const start = performance.now();
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // ~30fps para ahorrar batería/CPU
      if (now - last < 33) return;
      last = now;
      uniforms.u_time.value = (now - start) / 1000;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={['fixed inset-0 pointer-events-none', className].join(' ')}
      style={{ zIndex: -1, opacity: 0.9 }}
    />
  );
}
