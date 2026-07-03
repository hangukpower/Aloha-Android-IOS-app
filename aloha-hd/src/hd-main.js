/* ALOHA SUMO HD — Hōshōryū at Waikiki Village Resort
   Real pipeline: Blender/MPFB2 GLB character, mocap clips retargeted from the
   three.js Soldier, HDRI image-based lighting, PBR ground, reflective ocean,
   bloom + SMAA post. Bundled fully self-contained (assets are base64). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SUMO_GLB, HDR_BEACH, TEX_WATERNORMALS, TEX_GRASS } from './hd-assets.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfdde6, 220, 1400);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.25, 5000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.18, 0.7, 0.92);
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
const SEA_Y = -0.55, SHORE_Z = 26;
const beachY = z => z <= SHORE_Z ? 0 : -0.028 * (z - SHORE_Z) * (z - SHORE_Z) / ((z - SHORE_Z) + 6);
const groundY = (x, z) => beachY(z);

// sun matched to the HDRI sunrise over the water
const sunDir = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();
const sun = new THREE.DirectionalLight(0xffe6c0, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 5; sun.shadow.camera.far = 300;
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -30;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// HDRI: image-based lighting + photographic sky
new RGBELoader().load(HDR_BEACH, tex => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
  scene.background = tex;
  scene.backgroundRotation = new THREE.Euler(0, 2.0, 0);
  scene.environmentRotation = new THREE.Euler(0, 2.0, 0);
  scene.environmentIntensity = 1.0;
  scene.backgroundIntensity = 1.0;
});

// ocean
const water = new Water(new THREE.PlaneGeometry(6000, 6000), {
  textureWidth: 512, textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load(TEX_WATERNORMALS, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }),
  sunDirection: sunDir.clone(),
  sunColor: 0xfff0d8,
  waterColor: 0x0a5a70,
  distortionScale: 2.8,
  fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.y = SEA_Y;
water.material.uniforms.size.value = 5;
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
   [-22, 14, 8.6], [22, 12, 8], [-30, 26, 9], [30, 25, 8.4], [-16, 30, 7.6], [17, 30, 8.8],
   [-42, 4, 8.2], [44, 8, 8.8]].forEach(s => palm(s[0], s[1], s[2]));
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
  function tower(x, z, w, d, h, tint) {
    const roofM = new THREE.MeshStandardMaterial({ color: 0x8e8478, roughness: 0.9 });
    const mW = new THREE.MeshStandardMaterial({ map: facade(Math.round(h / 3.4), Math.round(w / 2.6), tint), roughness: 0.4, metalness: 0.15 });
    const mD = new THREE.MeshStandardMaterial({ map: facade(Math.round(h / 3.4), Math.round(d / 2.6), tint), roughness: 0.4, metalness: 0.15 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mD, mD, roofM, roofM, mW, mW]);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    scene.add(m);
  }
  tower(-34, -46, 22, 15, 66, '#e8ddcb');
  tower(12, -52, 28, 16, 84, '#efe6d6');

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

// ---------------------------------------------------------------- character
let sumo = null, mixer = null, actions = {}, current = null;
let facing = 0, camYaw = Math.PI, camPitch = 0.18, camDist = 6.5;
const keys = {}, camPos = new THREE.Vector3(0, 3, 18);
let ready = 0;

const loader = new GLTFLoader();
loader.load(SUMO_GLB, g => {
  sumo = g.scene;
  sumo.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; }
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
addEventListener('keydown', e => { keys[e.code] = true; });
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
      sumo.position.x = Math.max(-70, Math.min(70, sumo.position.x + Math.sin(facing) * speed * dt));
      sumo.position.z = Math.max(-55, Math.min(58, sumo.position.z + Math.cos(facing) * speed * dt));
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

  water.material.uniforms.time.value += dt * 0.5;
  for (const p of palms) {
    p.userData.cr.rotation.x = Math.sin(t * 1.1 + p.userData.ph) * 0.03;
    p.userData.cr.rotation.z = Math.cos(t * 0.9 + p.userData.ph) * 0.04;
  }
  for (const to of (window.__torches || [])) {
    const f = 0.8 + 0.28 * Math.sin(t * 13 + to.ph) + 0.16 * Math.sin(t * 29 + to.ph * 2);
    to.fl.scale.set(0.65 * f, f, 1);
    if (to.li) to.li.intensity = 5.5 * f;
  }

  composer.render();
}
animate();

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
