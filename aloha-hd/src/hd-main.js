/* ALOHA SUMO HD — Hōshōryū at Waikiki Village Resort
   Real pipeline: Blender/MPFB2 GLB character, mocap clips retargeted from the
   three.js Soldier, HDRI image-based lighting, PBR ground, reflective ocean,
   bloom + SMAA post. Bundled fully self-contained (assets are base64). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { N8AOPass } from 'n8ao';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SUMO_GLB, TEX_WATERNORMALS, TEX_GRASS, SKY_FACES } from './hd-assets.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.68;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8ecf8, 420, 2800);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.25, 5000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const n8ao = new N8AOPass(scene, camera, innerWidth, innerHeight);
n8ao.configuration.aoRadius = 1.4;
n8ao.configuration.distanceFalloff = 3.0;
n8ao.configuration.intensity = 3.5;
n8ao.setQualityMode('Medium');
composer.addPass(n8ao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.15, 0.7, 0.95);
composer.addPass(bloom);
const smaa = new SMAAPass(innerWidth, innerHeight);
composer.addPass(smaa);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ------------------------------------------------------------------- world
const colliders = [];
const SEA_Y = -0.55, SHORE_Z = 26;
const beachY = z => z <= SHORE_Z ? 0 : -0.028 * (z - SHORE_Z) * (z - SHORE_Z) / ((z - SHORE_Z) + 6);
const groundY = (x, z) => beachY(z);

// sun matched to the HDRI sunrise over the water
const sunDir = new THREE.Vector3(-0.78, 0.6, 0.2).normalize();
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.near = 5; sun.shadow.camera.far = 300;
sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -24;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// photographic tropical sky: cubemap backdrop + PMREM image-based lighting
{
  const cube = new THREE.CubeTextureLoader().load(SKY_FACES, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromCubemap(t).texture;
    // the cubemap contains the sun itself, so cut indirect intensity way down
    scene.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(mm => { if (mm && 'envMapIntensity' in mm) mm.envMapIntensity = 0.45; });
      }
    });
    window.__envReady = true;
  });
}

// ocean
const water = new Water(new THREE.PlaneGeometry(6000, 6000), {
  textureWidth: 512, textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load(TEX_WATERNORMALS, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }),
  sunDirection: sunDir.clone(),
  sunColor: 0xfff0d8,
  waterColor: 0x086478,
  distortionScale: 1.6,
  fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.y = SEA_Y;
water.material.uniforms.size.value = 3;
scene.add(water);

// turquoise shallows overlay
{
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 256;
  const cx = cv.getContext('2d');
  const g = cx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(70,215,205,0.75)');
  g.addColorStop(0.5, 'rgba(45,175,185,0.4)');
  g.addColorStop(1, 'rgba(25,130,160,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 16, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 30),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, SEA_Y + 0.04, 62);
  scene.add(m);
  // deep Pacific blue running to the horizon
  const cv2 = document.createElement('canvas'); cv2.width = 16; cv2.height = 256;
  const cx2 = cv2.getContext('2d');
  const g2 = cx2.createLinearGradient(0, 0, 0, 256);
  g2.addColorStop(0, 'rgba(20,140,160,0.05)');
  g2.addColorStop(0.08, 'rgba(16,110,142,0.55)');
  g2.addColorStop(0.45, 'rgba(11,78,124,0.65)');
  g2.addColorStop(1, 'rgba(9,62,108,0.45)');
  cx2.fillStyle = g2; cx2.fillRect(0, 0, 16, 256);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(3000, 620),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv2), transparent: true, depthWrite: false, fog: true }));
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(0, SEA_Y + 0.03, 58 + 310);
  scene.add(deep);
}

// sand
function speck(cx, w, h, n, cols) {
  for (let i = 0; i < n; i++) {
    cx.fillStyle = cols[(Math.random() * cols.length) | 0];
    cx.globalAlpha = 0.1 + Math.random() * 0.3;
    cx.beginPath();
    cx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 1.8, 0, 7);
    cx.fill();
  }
  cx.globalAlpha = 1;
}
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#dcc79b'; cx.fillRect(0, 0, 1024, 1024);
  speck(cx, 1024, 1024, 26000, ['#d0ba8c', '#e8d6ae', '#c4ae80', '#f0e2c0']);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new THREE.PlaneGeometry(760, 70, 120, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i), wz = 47 + pos.getY(i) * -1; // plane local → world approx
  }
  const sand = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, SHORE_Z + 35);
  // slope it into the sea
  const p2 = sand.geometry.attributes.position;
  for (let i = 0; i < p2.count; i++) {
    const worldZ = SHORE_Z + 35 - p2.getY(i);
    p2.setZ(i, beachY(worldZ)); // local z becomes world y after rotation
  }
  sand.geometry.computeVertexNormals();
  sand.receiveShadow = true;
  scene.add(sand);
}
// lawn
{
  const t = new THREE.TextureLoader().load(TEX_GRASS, tt => {
    tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(60, 30);
    tt.colorSpace = THREE.SRGBColorSpace;
    tt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(1600, 800),
    new THREE.MeshStandardMaterial({ map: t, color: 0xa8b890, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(0, -0.02, SHORE_Z - 400);
  lawn.receiveShadow = true;
  scene.add(lawn);
}
// promenade pavers
{
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 1024;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#c9b389'; cx.fillRect(0, 0, 256, 1024);
  cx.strokeStyle = 'rgba(0,0,0,0.18)'; cx.lineWidth = 3;
  for (let y = 0; y < 1024; y += 64) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(256, y); cx.stroke(); }
  for (let x = 0; x < 256; x += 85) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, 1024); cx.stroke(); }
  speck(cx, 256, 1024, 1500, ['#00000022', '#ffffff18']);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  const path = new THREE.Mesh(new THREE.PlaneGeometry(10, 90),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.015, SHORE_Z - 45 + 45 - 45); // z: -19..? keep centered inland→shore
  path.position.z = SHORE_Z - 32;
  path.receiveShadow = true;
  scene.add(path);
}

// Diamond Head across the bay
{
  const mcv = document.createElement('canvas'); mcv.width = mcv.height = 512;
  const mx = mcv.getContext('2d');
  mx.fillStyle = '#8b8058'; mx.fillRect(0, 0, 512, 512);
  speck(mx, 512, 512, 9000, ['#6d7a45', '#7d7048', '#98865e', '#5c6b3c', '#a3906a']);
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 512;
    mx.strokeStyle = `rgba(70,60,40,${0.1 + Math.random() * 0.22})`;
    mx.lineWidth = 1 + Math.random() * 2;
    mx.beginPath(); mx.moveTo(x, Math.random() * 200); mx.lineTo(x + (Math.random() - 0.5) * 40, 512); mx.stroke();
  }
  const mot = new THREE.CanvasTexture(mcv);
  mot.wrapS = mot.wrapT = THREE.RepeatWrapping; mot.repeat.set(3, 3);
  mot.colorSpace = THREE.SRGBColorSpace;
  const seg = 96, geo = new THREE.PlaneGeometry(1, 1, seg, seg);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const lowC = new THREE.Color(0x6a7a48), midC = new THREE.Color(0x93875c), hiC = new THREE.Color(0xa89468);
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const maxH = 150;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) * 2, v = pos.getY(i) * 2;
    let ridge = 0.14 * sm(-1.0, -0.55, u) + 0.38 * sm(-0.75, -0.2, u) + 0.48 * sm(-0.05, 0.32, u);
    ridge *= 1 - sm(0.42, 0.85, u) * 0.96;
    const width = 0.55 + 0.25 * (1 - (u + 1) / 2);
    let hgt = maxH * ridge * Math.exp(-(v * v) / (2 * width * width));
    hgt -= maxH * 0.22 * Math.exp(-((u + 0.15) ** 2) / 0.18 - ((v + 0.55) ** 2) / 0.1);
    hgt = Math.max(0, hgt);
    hgt *= 1 + 0.032 * Math.sin(u * 40 + v * 31) + 0.05 * Math.sin(u * 13 + 2) + 0.025 * Math.sin(u * 90 - v * 70);
    const t2 = Math.min(1, hgt / maxH * 1.5);
    const c = t2 < 0.5 ? lowC.clone().lerp(midC, t2 * 2) : midC.clone().lerp(hiC, (t2 - 0.5) * 2);
    const j = 0.94 + Math.random() * 0.12;
    colors[i * 3] = c.r * j; colors[i * 3 + 1] = c.g * j; colors[i * 3 + 2] = c.b * j;
    pos.setXYZ(i, pos.getX(i) * 880, pos.getY(i) * 620, hgt);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const dh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: mot, roughness: 1 }));
  dh.rotation.x = -Math.PI / 2;
  dh.rotation.z = 0.55;
  dh.position.set(880, -1, 330);
  scene.add(dh);
  const base = new THREE.Mesh(new THREE.CircleGeometry(430, 40),
    new THREE.MeshStandardMaterial({ color: 0x55663a, roughness: 1 }));
  base.rotation.x = -Math.PI / 2;
  base.position.set(870, -0.42, 310);
  scene.add(base);
}

// palms (procedural, lit by the HDRI)
const palms = [];
{
  const trunkCv = document.createElement('canvas'); trunkCv.width = 128; trunkCv.height = 256;
  let cx = trunkCv.getContext('2d');
  cx.fillStyle = '#8a6f52'; cx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 8) {
    cx.fillStyle = `rgba(70,50,32,${0.25 + Math.random() * 0.35})`;
    cx.fillRect(0, y, 128, 3 + Math.random() * 4);
  }
  const trunkT = new THREE.CanvasTexture(trunkCv);
  trunkT.wrapS = trunkT.wrapT = THREE.RepeatWrapping; trunkT.repeat.set(1, 3);
  trunkT.colorSpace = THREE.SRGBColorSpace;
  const trunkM = new THREE.MeshStandardMaterial({ map: trunkT, roughness: 0.9 });

  const frondCv = document.createElement('canvas'); frondCv.width = frondCv.height = 256;
  cx = frondCv.getContext('2d');
  cx.clearRect(0, 0, 256, 256);
  for (let x = 6; x < 256; x += 5) {
    const len = 46 * (1 - Math.abs(x / 256 - 0.45) * 0.9) + 16;
    const g = cx.createLinearGradient(x, 128, x, 128 - len);
    g.addColorStop(0, '#37682a'); g.addColorStop(1, '#5d9440');
    cx.strokeStyle = g; cx.lineWidth = 3.4;
    cx.beginPath(); cx.moveTo(x, 128); cx.lineTo(x + 9, 128 - len); cx.stroke();
    cx.beginPath(); cx.moveTo(x, 128); cx.lineTo(x + 9, 128 + len); cx.stroke();
  }
  cx.strokeStyle = '#2e5c22'; cx.lineWidth = 5;
  cx.beginPath(); cx.moveTo(0, 128); cx.lineTo(256, 128); cx.stroke();
  const frondT = new THREE.CanvasTexture(frondCv);
  frondT.colorSpace = THREE.SRGBColorSpace;
  const frondM = new THREE.MeshStandardMaterial({ map: frondT, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 });

  function crown(n, len) {
    const posArr = [], uv = [], idx = [];
    let vi = 0;
    for (let f = 0; f < n; f++) {
      const yaw = f / n * Math.PI * 2 + Math.random() * 0.3;
      const d0 = 0.5 + Math.random() * 0.25, dr = 1.5 + Math.random() * 0.7;
      const L = len * (0.85 + Math.random() * 0.3), segs = 7;
      let pa = null, px = 0, py = 0;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs, ang = d0 - dr * t * t;
        if (pa !== null) { px += Math.cos(pa) * L / segs; py += Math.sin(pa) * L / segs; }
        pa = ang;
        const w = 0.42 * (1 - t * 0.8) * (t < 0.08 ? t / 0.08 : 1);
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        posArr.push(px * cy + w * sy, py, px * sy - w * cy, px * cy - w * sy, py, px * sy + w * cy);
        uv.push(t, 0, t, 1);
        if (s) { const a = vi + (s - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      vi += (segs + 1) * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function palm(x, z, h) {
    const tree = new THREE.Group();
    const la = Math.random() * 7, lean = 0.12 + Math.random() * 0.18;
    const top = new THREE.Vector3(Math.cos(la) * lean * h, h, Math.sin(la) * lean * h);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), top.clone().multiplyScalar(0.35).setY(h * 0.5), top]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 9, 0.16, 7), trunkM);
    trunk.castShadow = true;
    tree.add(trunk);
    const cr = new THREE.Group();
    cr.position.copy(top);
    const fr = new THREE.Mesh(crown(9, 2.4 + h * 0.12), frondM);
    fr.castShadow = true;
    cr.add(fr);
    tree.add(cr);
    tree.position.set(x, groundY(x, z), z);
    tree.rotation.y = Math.random() * 7;
    tree.userData = { cr, ph: Math.random() * 7 };
    scene.add(tree);
    palms.push(tree);
  }
  [[-9, 22, 8], [9, 21, 9], [-11, 8, 7.5], [11, 7, 8.5], [-9, -6, 8], [10, -8, 8.6],
   [-22, 14, 8.6], [22, 12, 8], [-16, 30, 7.6], [17, 30, 8.8],
   [-42, 4, 8.2], [44, 8, 8.8], [26, 28, 8.2], [46, 16, 9], [52, 30, 7.8],
   [-36, 30, 8.5], [-30, 40, 9.2], [-88, 32, 8.6], [-84, 14, 9], [-62, 2, 8.2],
   [-40, 20, 7.6], [30, 38, 8.8], [-14, 42, 8], [58, 6, 8.4], [64, 22, 8],
   [-52, 42, 8.8], [-72, 44, 8.2], [-96, 22, 7.8]].forEach(s => palm(s[0], s[1], s[2]));
}

// resort towers + welcome arch + torches (kept minimal, PBR-lit)
{
  function facade(fl, cols, tint) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 1024;
    const cx = cv.getContext('2d');
    cx.fillStyle = tint; cx.fillRect(0, 0, 512, 1024);
    const fh = 1024 / fl, cw = 512 / cols;
    for (let f = 0; f < fl; f++) {
      cx.fillStyle = 'rgba(255,255,255,0.5)';
      cx.fillRect(0, f * fh + fh * 0.84, 512, fh * 0.08);
      for (let c = 0; c < cols; c++) {
        const r = Math.random();
        cx.fillStyle = r > 0.92 ? '#ffd98a' : (r > 0.5 ? '#9fc4d8' : '#7ba9c2');
        cx.fillRect(c * cw + cw * 0.14, f * fh + fh * 0.15, cw * 0.72, fh * 0.62);
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function tower(x, z, w, d, h, tint, endTex) {
    const roofM = new THREE.MeshStandardMaterial({ color: 0x8e8478, roughness: 0.9 });
    const mW = new THREE.MeshStandardMaterial({ map: facade(Math.round(h / 3.4), Math.round(w / 2.6), tint), roughness: 0.4, metalness: 0.15 });
    const mD = endTex
      ? new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.5 })
      : new THREE.MeshStandardMaterial({ map: facade(Math.round(h / 3.4), Math.round(d / 2.6), tint), roughness: 0.4, metalness: 0.15 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mD, mD, roofM, roofM, mW, mW]);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    scene.add(m);
    colliders.push({ x, z, hx: w / 2 + 1, hz: d / 2 + 1 });
  }

  // Rainbow Tower: the icon — giant rainbow mosaics on both end walls
  const rainbowTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 1024;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#f2efe6'; cx.fillRect(0, 0, 256, 1024);
    const bands = ['#8a3fae', '#2b4fd8', '#1b9de0', '#27a84a', '#f2c72e', '#f28c1e', '#e13a2a'];
    const bw = 15;
    bands.forEach((c2, i) => {
      const r = 118 - i * bw;
      cx.strokeStyle = c2; cx.lineWidth = bw;
      cx.beginPath();
      cx.arc(128, 138, r, Math.PI, 0);       // arch at the top
      cx.stroke();
      cx.fillStyle = c2;                      // legs running down the full wall
      cx.fillRect(128 - r - bw / 2, 138, bw, 1024 - 138);
      cx.fillRect(128 + r - bw / 2, 138, bw, 1024 - 138);
    });
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  })();
  // tapa-pattern crown band for the Tapa Tower
  const tapaTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 1024;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#e3d5bd'; cx.fillRect(0, 0, 512, 1024);
    // windows
    for (let f = 0; f < 26; f++) for (let c2 = 0; c2 < 14; c2++) {
      cx.fillStyle = Math.random() > 0.5 ? '#9fc4d8' : '#7ba9c2';
      cx.fillRect(c2 * 36 + 6, 120 + f * 33 + 6, 25, 21);
    }
    // dark geometric tapa band at the crown
    cx.fillStyle = '#4a3524'; cx.fillRect(0, 0, 512, 100);
    cx.fillStyle = '#e3d5bd';
    for (let i = 0; i < 16; i++) {
      cx.beginPath();
      cx.moveTo(i * 32, 100); cx.lineTo(i * 32 + 16, 40); cx.lineTo(i * 32 + 32, 100);
      cx.closePath(); cx.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // the Hilton Hawaiian Village ensemble (approximate real layout)
  tower(-30, -10, 64, 17, 88, '#f0ebdd', rainbowTex);          // Rainbow Tower, beachfront
  {                                                             // Tapa Tower behind
    const m = new THREE.Mesh(new THREE.BoxGeometry(52, 100, 20),
      [new THREE.MeshStandardMaterial({ map: tapaTex, roughness: 0.5 }),
       new THREE.MeshStandardMaterial({ map: tapaTex, roughness: 0.5 }),
       new THREE.MeshStandardMaterial({ color: 0x8e8478 }),
       new THREE.MeshStandardMaterial({ color: 0x8e8478 }),
       new THREE.MeshStandardMaterial({ map: tapaTex, roughness: 0.5 }),
       new THREE.MeshStandardMaterial({ map: tapaTex, roughness: 0.5 })]);
    m.position.set(18, 50, -52);
    m.castShadow = true;
    scene.add(m);
    colliders.push({ x: 18, z: -52, hx: 27, hz: 11 });
  }
  tower(34, -8, 28, 15, 52, '#efe2cc');                         // Ali'i Tower, beachfront east
  tower(-78, -24, 38, 17, 72, '#e8ddcb');                       // Lagoon Tower, over the lagoon
  tower(52, -48, 30, 28, 86, '#e2d5c0');                        // Grand Islander, mauka east

  // arch
  const postM = new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.85 });
  [-7.5, 7.5].forEach(px => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 7, 10), postM);
    p.position.set(px, 3.5, -14);
    p.castShadow = true;
    scene.add(p);
  });
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 256;
  const sx = sc.getContext('2d');
  sx.fillStyle = '#4a2e1a'; sx.fillRect(0, 0, 1024, 256);
  sx.strokeStyle = '#e8c97a'; sx.lineWidth = 8; sx.strokeRect(12, 12, 1000, 232);
  sx.textAlign = 'center'; sx.fillStyle = '#ffe9b8';
  sx.font = '900 84px Georgia, serif';
  sx.fillText('WAIKIKI VILLAGE', 512, 110);
  sx.font = '700 52px Georgia, serif'; sx.fillStyle = '#e8c97a';
  sx.fillText('R E S O R T', 512, 190);
  const st = new THREE.CanvasTexture(sc);
  st.colorSpace = THREE.SRGBColorSpace;
  const sm = new THREE.MeshStandardMaterial({ map: st, roughness: 0.7 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 0.35), [postM, postM, postM, postM, sm, sm]);
  sign.position.set(0, 5.4, -14);
  sign.castShadow = true;
  scene.add(sign);

  // torches with real light
  const flameCv = document.createElement('canvas'); flameCv.width = flameCv.height = 64;
  const fx = flameCv.getContext('2d');
  const fg = fx.createRadialGradient(32, 32, 2, 32, 32, 32);
  fg.addColorStop(0, 'rgba(255,240,190,1)'); fg.addColorStop(0.4, 'rgba(255,150,50,0.8)');
  fg.addColorStop(1, 'rgba(255,80,20,0)');
  fx.fillStyle = fg; fx.fillRect(0, 0, 64, 64);
  const flameT = new THREE.CanvasTexture(flameCv);
  window.__torches = [];
  [[-6, 18], [6, 18], [-6, 2], [6, 2], [-6, -8], [6, -8]].forEach(([x, z], i) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.4, 7),
      new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.9 }));
    pole.position.y = 1.2; pole.castShadow = true;
    g.add(pole);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameT, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.scale.set(0.7, 1.05, 1); fl.position.y = 2.7;
    g.add(fl);
    let li = null;
    if (i < 4) { li = new THREE.PointLight(0xff9040, 6, 13, 2); li.position.y = 2.6; g.add(li); }
    g.position.set(x, groundY(x, z), z);
    scene.add(g);
    window.__torches.push({ fl, li, ph: Math.random() * 20 });
  });
}

// Duke Kahanamoku Lagoon: calm turquoise pool ringed with sand and palms
const LAGOON = { x: -62, z: 30, r: 24 };
{
  const rim = new THREE.Mesh(new THREE.CircleGeometry(LAGOON.r + 5, 48),
    new THREE.MeshStandardMaterial({ color: 0xdcc79b, roughness: 1 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(LAGOON.x, 0.03, LAGOON.z);
  rim.receiveShadow = true;
  scene.add(rim);
  const lag = new THREE.Mesh(new THREE.CircleGeometry(LAGOON.r, 48),
    new THREE.MeshStandardMaterial({ color: 0x35b9c9, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.94 }));
  lag.rotation.x = -Math.PI / 2;
  lag.position.set(LAGOON.x, 0.06, LAGOON.z);
  scene.add(lag);
  colliders.push({ x: LAGOON.x, z: LAGOON.z, hx: LAGOON.r, hz: LAGOON.r });
}

// breakwater sheltering the swimming beach
{
  const rockM = new THREE.MeshStandardMaterial({ color: 0x33302c, roughness: 0.95 });
  const rg = new THREE.DodecahedronGeometry(1, 1);
  for (let i = 0; i <= 22; i++) {
    const x = -48 + i * 3.4;
    const z = 70 + Math.sin(i * 0.35) * 3;
    const m = new THREE.Mesh(rg, rockM);
    const sc = 1.4 + Math.random() * 1.2;
    m.scale.set(sc, sc * 0.55, sc);
    m.position.set(x, SEA_Y + 0.25, z);
    m.rotation.set(Math.random(), Math.random() * 6.3, Math.random() * 0.4);
    m.castShadow = true;
    scene.add(m);
  }
}

// beach catamaran
{
  const g = new THREE.Group();
  const hullM = new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.4 });
  [-1.1, 1.1].forEach(hx => {
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hullM);
    hull.scale.set(0.32, 0.3, 2.6);
    hull.position.set(hx, 0.3, 0);
    hull.castShadow = true;
    g.add(hull);
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.8 }));
  deck.position.y = 0.55;
  deck.castShadow = true;
  g.add(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 7, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.5 }));
  mast.position.y = 4;
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 6.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2c72e, roughness: 0.7 }));
  sail.position.set(0.12, 3.9, 0);
  sail.rotation.z = 0.04;
  g.add(sail);
  g.position.set(14, groundY(14, 44), 44);
  g.rotation.y = 0.5;
  scene.add(g);
  colliders.push({ x: 14, z: 44, hx: 2.2, hz: 2.6 });
}

// Tropics-style thatched beach bar
{
  const g = new THREE.Group();
  const thCv = document.createElement('canvas'); thCv.width = 256; thCv.height = 128;
  const tx = thCv.getContext('2d');
  tx.fillStyle = '#8a6a3c'; tx.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 5) {
    tx.strokeStyle = `rgba(60,42,20,${0.3 + Math.random() * 0.3})`;
    tx.beginPath(); tx.moveTo(0, y); tx.lineTo(256, y + (Math.random() - 0.5) * 4); tx.stroke();
  }
  const thT = new THREE.CanvasTexture(thCv);
  thT.colorSpace = THREE.SRGBColorSpace;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 3, 4),
    new THREE.MeshStandardMaterial({ map: thT, roughness: 1 }));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.4, 1, 1);
  roof.position.y = 5;
  roof.castShadow = true;
  g.add(roof);
  [[-5, -2.5], [5, -2.5], [-5, 2.5], [5, 2.5]].forEach(pp => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x6e4a28 }));
    pole.position.set(pp[0], 1.9, pp[1]);
    g.add(pole);
  });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x8a5c30, roughness: 0.8 }));
  counter.position.set(0, 0.55, 1.6);
  counter.castShadow = true;
  g.add(counter);
  g.position.set(38, 0.02, 22);
  g.rotation.y = -0.25;
  scene.add(g);
  colliders.push({ x: 38, z: 22, hx: 5, hz: 3 });
}

// Super Pool at the Rainbow Tower's feet
{
  const pool = new THREE.Mesh(new THREE.CircleGeometry(11, 40),
    new THREE.MeshStandardMaterial({ color: 0x37b8d2, roughness: 0.1, metalness: 0.08, transparent: true, opacity: 0.94 }));
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(1.5, 1, 1);
  pool.position.set(-26, 0.05, 10);
  scene.add(pool);
  const deckR = new THREE.Mesh(new THREE.CircleGeometry(14.5, 40),
    new THREE.MeshStandardMaterial({ color: 0xd9cba8, roughness: 0.9 }));
  deckR.rotation.x = -Math.PI / 2;
  deckR.scale.set(1.5, 1, 1);
  deckR.position.set(-26, 0.028, 10);
  deckR.receiveShadow = true;
  scene.add(deckR);
  colliders.push({ x: -26, z: 10, hx: 16, hz: 11 });
}

// Friday fireworks over the lagoon — press F
const fireworks = [];
{
  const fCv = document.createElement('canvas'); fCv.width = fCv.height = 32;
  const fx = fCv.getContext('2d');
  const fg = fx.createRadialGradient(16, 16, 1, 16, 16, 16);
  fg.addColorStop(0, 'rgba(255,255,255,1)');
  fg.addColorStop(1, 'rgba(255,255,255,0)');
  fx.fillStyle = fg; fx.fillRect(0, 0, 32, 32);
  const fTex = new THREE.CanvasTexture(fCv);
  const cols = [0xff5e8a, 0xffd166, 0x9be15d, 0x39c1e0, 0xc98cff, 0xff8f4a];
  window.__launchFirework = () => {
    const cx0 = LAGOON.x + (Math.random() - 0.5) * 30;
    const cy0 = 55 + Math.random() * 25;
    const cz0 = LAGOON.z + (Math.random() - 0.5) * 20;
    const col = cols[(Math.random() * cols.length) | 0];
    const flash = new THREE.PointLight(col, 800, 220, 2);
    flash.position.set(cx0, cy0, cz0);
    scene.add(flash);
    const parts = [];
    for (let i = 0; i < 46; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: fTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sp.material.toneMapped = false;
      sp.position.set(cx0, cy0, cz0);
      sp.scale.set(1.6, 1.6, 1);
      const th = Math.random() * 6.283, ph2 = Math.acos(2 * Math.random() - 1);
      const v = 9 + Math.random() * 7;
      parts.push({ sp, vx: v * Math.sin(ph2) * Math.cos(th), vy: v * Math.cos(ph2), vz: v * Math.sin(ph2) * Math.sin(th) });
      scene.add(sp);
    }
    fireworks.push({ parts, flash, life: 1.9 });
    if (window.__music && window.__music.ctx) {
      const ctx = window.__music.ctx, t0 = ctx.currentTime;
      const o = ctx.createOscillator(), gg = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t0);
      o.frequency.exponentialRampToValueAtTime(40, t0 + 0.5);
      gg.gain.setValueAtTime(0.4, t0);
      gg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      o.connect(gg); gg.connect(window.__music.gain || ctx.destination);
      o.start(t0); o.stop(t0 + 0.8);
    }
  };
}

// ---------------------------------------------------------------- character
let sumo = null, mixer = null, actions = {}, current = null;
let facing = 0, camYaw = Math.PI, camPitch = 0.18, camDist = 6.5;
const keys = {}, camPos = new THREE.Vector3(0, 3, 18);
let ready = 0;

const loader = new GLTFLoader();
loader.load(SUMO_GLB, g => {
  sumo = g.scene;
  sumo.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(mm => { if (mm && 'envMapIntensity' in mm) mm.envMapIntensity = 0.5; });
    }
  });
  sumo.position.set(0, 0, 8);
  scene.add(sumo);
  mixer = new THREE.AnimationMixer(sumo);
  for (const clip of g.animations) {
    const m = clip.name.toLowerCase().match(/(idle|walk|run)/);
    if (!m) continue;
    // exporter may emit stub variants; keep the one whose hip sits at standing height
    const ht = clip.tracks.find(t => /Hips\.position/.test(t.name));
    const hy = ht ? ht.values[1] : 0;
    if (hy < 0.4 || hy > 1.6) continue;
    actions[m[1]] = mixer.clipAction(clip);
  }
  ready = 2;
  setAction('idle');
  document.getElementById('load').style.display = 'none';
});
function setAction(n) {
  if (current === n || !actions[n]) return;
  const prev = current && actions[current];
  actions[n].reset().fadeIn(0.22).play();
  if (prev) prev.fadeOut(0.22);
  current = n;
}

// ------------------------------------------------------------------- input
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && window.__launchFirework) {
    window.__launchFirework();
    setTimeout(() => window.__launchFirework(), 350);
    setTimeout(() => window.__launchFirework(), 800);
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
let drag = false, lx = 0, ly = 0;
canvas.addEventListener('mousedown', e => { drag = true; lx = e.clientX; ly = e.clientY; });
addEventListener('mouseup', () => drag = false);
addEventListener('mousemove', e => {
  if (!drag) return;
  camYaw -= (e.clientX - lx) * 0.005;
  camPitch = Math.max(-0.05, Math.min(1.1, camPitch + (e.clientY - ly) * 0.004));
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener('wheel', e => {
  camDist = Math.max(3, Math.min(14, camDist + e.deltaY * 0.006));
  e.preventDefault();
}, { passive: false });

// -------------------------------------------------------------------- loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  const moving = ix || iz;
  const run = keys.ShiftLeft || keys.ShiftRight;

  if (sumo) {
    if (moving) {
      const ang = Math.atan2(ix, iz) + camYaw;
      let diff = ang - facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facing += diff * Math.min(1, dt * 8);
      const speed = run ? 4.6 : 1.7;
      let nx = Math.max(-110, Math.min(110, sumo.position.x + Math.sin(facing) * speed * dt));
      let nz = Math.max(-60, Math.min(58, sumo.position.z + Math.cos(facing) * speed * dt));
      for (const c of colliders) {
        const dx = nx - c.x, dz = nz - c.z;
        const ox = c.hx + 0.8 - Math.abs(dx), oz = c.hz + 0.8 - Math.abs(dz);
        if (ox > 0 && oz > 0) {
          if (ox < oz) nx = c.x + (dx > 0 ? 1 : -1) * (c.hx + 0.8);
          else nz = c.z + (dz > 0 ? 1 : -1) * (c.hz + 0.8);
        }
      }
      sumo.position.x = nx;
      sumo.position.z = nz;
      setAction(run ? 'run' : 'walk');
    } else setAction('idle');
    sumo.rotation.y = facing + Math.PI; // model faces -Z
    sumo.position.y = groundY(sumo.position.x, sumo.position.z);

    const ty = sumo.position.y + 1.55;
    const cx = sumo.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const cz = sumo.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    let cy = ty + Math.sin(camPitch) * camDist;
    cy = Math.max(cy, groundY(cx, cz) + 0.4);
    camPos.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 7));
    camera.position.copy(camPos);
    camera.lookAt(sumo.position.x, ty, sumo.position.z);
    sun.position.copy(sumo.position).addScaledVector(sunDir, 120);
    sun.target.position.copy(sumo.position);
  }
  if (mixer) mixer.update(dt);
  if (window.__music) window.__music.update(dt);

  water.material.uniforms.time.value += dt * 0.5;
  for (const p of palms) {
    p.userData.cr.rotation.x = Math.sin(t * 1.1 + p.userData.ph) * 0.03;
    p.userData.cr.rotation.z = Math.cos(t * 0.9 + p.userData.ph) * 0.04;
  }
  for (const c of (window.__clouds || [])) {
    c.position.x += c.userData.v * dt;
    if (c.position.x > 1500) c.position.x = -1500;
  }
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    fw.life -= dt;
    if (fw.life <= 0) {
      fw.parts.forEach(pp => scene.remove(pp.sp));
      scene.remove(fw.flash);
      fireworks.splice(i, 1);
      continue;
    }
    fw.flash.intensity = Math.max(0, fw.life - 1.4) * 2000;
    for (const pp of fw.parts) {
      pp.sp.position.x += pp.vx * dt;
      pp.sp.position.y += pp.vy * dt;
      pp.sp.position.z += pp.vz * dt;
      pp.vy -= 4.5 * dt;
      pp.sp.material.opacity = Math.min(1, fw.life / 1.2);
    }
  }
  for (const to of (window.__torches || [])) {
    const f = 0.8 + 0.28 * Math.sin(t * 13 + to.ph) + 0.16 * Math.sin(t * 29 + to.ph * 2);
    to.fl.scale.set(0.65 * f, f, 1);
    if (to.li) to.li.intensity = 5.5 * f;
  }

  composer.render();
}
animate();

// ------------------------------------------------------------------ music
// Drop a file named waimanalo-blues.mp3 next to index.html and it will play.
// Otherwise an original slack-key-style island instrumental is synthesized.
const music = {
  started: false, muted: false, el: null, ctx: null, gain: null, timer: 0, step: 0,
  start() {
    if (this.started) return;
    this.started = true;
    const el = new Audio('waimanalo-blues.mp3');
    el.loop = true; el.volume = 0.55;
    el.play().then(() => { this.el = el; }).catch(() => this.synth());
    el.onerror = () => { if (!this.ctx) this.synth(); };
  },
  synth() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.5;
    this.gain.connect(this.ctx.destination);
  },
  pluck(f, t0, vel, slide) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = 'triangle';
    if (slide) { o.frequency.setValueAtTime(f * 0.94, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.12); }
    else o.frequency.value = f;
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(2400, t0);
    fl.frequency.exponentialRampToValueAtTime(650, t0 + 0.7);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vel, t0 + 0.014);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);
    o.connect(fl); fl.connect(g); g.connect(this.gain);
    o.start(t0); o.stop(t0 + 1.4);
  },
  bass(f, t0, dur) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.gain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  update(dt) {
    if (!this.ctx || this.muted) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    // laid-back island progression: C - Am - F - G7, finger-picked
    const C = [261.6, 329.6, 392.0, 523.3], Am = [220.0, 261.6, 329.6, 440.0];
    const F = [174.6, 261.6, 349.2, 440.0], G7 = [196.0, 246.9, 392.0, 493.9];
    const prog = [[C, 130.8], [Am, 110.0], [F, 87.3], [G7, 98.0]];
    const beat = 0.79;                      // ~76 bpm
    const bar = this.step % 4, chord = prog[((this.step / 4) | 0) % 4];
    const t0 = this.ctx.currentTime + 0.03;
    if (bar === 0) this.bass(chord[1], t0, beat * 2);
    if (bar === 2) this.bass(chord[1] * 1.5, t0, beat * 1.4);
    const notes = chord[0];
    const pick = [0, 2, 1, 3][bar];
    this.pluck(notes[pick], t0, 0.075, false);
    if (bar === 1) this.pluck(notes[3] * 1.0, t0 + beat * 0.5, 0.05, true);   // steel-ish slide
    if (bar === 3 && ((this.step / 4) | 0) % 4 === 3)
      this.pluck(notes[2] * 2, t0 + beat * 0.5, 0.045, true);
    this.step++;
    this.timer = beat;
  },
  toggle() {
    this.muted = !this.muted;
    if (this.el) this.el.muted = this.muted;
    if (this.gain) this.gain.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },
};
window.__music = music;
addEventListener('keydown', e => {
  music.start();
  if (e.code === 'KeyM') music.toggle();
});
addEventListener('mousedown', () => music.start());
addEventListener('touchstart', () => music.start());

// debug hooks
window.__game = {
  tp(x, z, yaw) { if (sumo) { sumo.position.x = x; sumo.position.z = z; if (yaw !== undefined) facing = yaw; } },
  cam(y, p, d) { camYaw = y; camPitch = p; if (d) camDist = d; camPos.set(1e9, 0, 0); },
  camSnap() {
    if (!sumo) return;
    const cx = sumo.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const cz = sumo.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    camPos.set(cx, sumo.position.y + 1.55 + Math.sin(camPitch) * camDist, cz);
  },
  act(n) { setAction(n); },
  state() {
    return { ready, clips: Object.keys(actions), current, pos: sumo ? sumo.position.toArray().map(v => +v.toFixed(1)) : null };
  },
  hdriRot(r) { if (scene.background) { scene.backgroundRotation.y = r; scene.environmentRotation.y = r; } },
  clipInfo() {
    const o = {};
    for (const k in actions) {
      const c = actions[k].getClip();
      const ht = c.tracks.find(t => /Hips\.position/.test(t.name));
      o[k] = { dur: +c.duration.toFixed(2), tracks: c.tracks.length,
        hip: ht ? Array.from(ht.values.slice(0, 3)).map(v => +v.toFixed(2)) : null };
    }
    return o;
  },
  stop() { for (const k in actions) actions[k].stop(); current = null; },
  bbox() {
    if (!sumo) return null;
    const b = new THREE.Box3().setFromObject(sumo);
    return { min: b.min.toArray().map(v => +v.toFixed(2)), max: b.max.toArray().map(v => +v.toFixed(2)) };
  },
};
