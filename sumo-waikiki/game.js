/* ============================================================================
   ALOHA SUMO — Waikiki Village Resort
   A fully procedural 3D browser game. No downloads, no build step, no assets:
   every texture is painted at runtime onto canvases, every mesh is generated.
   World axes: +X = east (toward Diamond Head), +Z = south (toward the ocean).
   ============================================================================ */
(function () {
  "use strict";

  // ------------------------------------------------------------------ boot
  var canvas = document.getElementById("c");
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    document.getElementById("err").style.display = "flex";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfdfe8, 280, 1700);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 14000);

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ------------------------------------------------------------ world layout
  var SHORE_Z = 38;          // where the resort lawn gives way to sand
  var SEA_LEVEL = -1.0;      // world Y of the ocean surface
  var WATERLINE_Z = 76.5;    // where the sloping sand crosses SEA_LEVEL

  // beach slope: flat lawn until SHORE_Z, then an easing ramp into the sea
  function beachProfile(z) {
    if (z <= SHORE_Z) return 0;
    var t = z - SHORE_Z;
    return -0.03 * t * t / (t + 6);
  }
  function duneNoise(x, z) {
    if (z <= SHORE_Z + 1) return 0;
    var f = Math.min(1, (z - SHORE_Z - 1) / 8) * Math.max(0, 1 - (z - SHORE_Z) / 45);
    return 0.09 * f * Math.sin(x * 0.21 + 1.7) * Math.sin(z * 0.33 + 0.4);
  }
  function groundY(x, z) { return beachProfile(z) + duneNoise(x, z); }

  // ------------------------------------------------------------ tex helpers
  function makeCanvas(w, h, draw) {
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d"), w, h);
    return cv;
  }
  function canvasTexture(cv, srgb) {
    var t = new THREE.CanvasTexture(cv);
    if (srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function speckle(ctx, w, h, n, colors, rMin, rMax) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
      ctx.globalAlpha = 0.12 + Math.random() * 0.3;
      var r = rMin + Math.random() * (rMax - rMin);
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // draws a 5-petal plumeria/hibiscus style flower (no emoji fonts needed)
  function drawFlower(ctx, x, y, r, petal, center) {
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.translate(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = petal;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 0.62, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = center;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.26, 0, 6.283);
    ctx.fill();
  }

  // world-mapped ground canvas: canvas pixel <-> world rectangle
  function WorldCanvas(w, h, x0, z0, x1, z1) {
    this.cv = document.createElement("canvas");
    this.cv.width = w; this.cv.height = h;
    this.ctx = this.cv.getContext("2d");
    this.x0 = x0; this.z0 = z0; this.sx = w / (x1 - x0); this.sz = h / (z1 - z0);
  }
  WorldCanvas.prototype.px = function (x) { return (x - this.x0) * this.sx; };
  WorldCanvas.prototype.pz = function (z) { return (z - this.z0) * this.sz; };
  WorldCanvas.prototype.texture = function () {
    var t = new THREE.CanvasTexture(this.cv);
    t.flipY = false;
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };

  // builds a flat-XZ plane whose UVs map exactly onto a WorldCanvas rect
  function worldPlane(x0, z0, x1, z1, segX, segZ, heightFn) {
    var geo = new THREE.PlaneGeometry(1, 1, segX, segZ);
    var pos = geo.attributes.position, uv = geo.attributes.uv;
    for (var i = 0; i < pos.count; i++) {
      var u = pos.getX(i) + 0.5, v = 0.5 - pos.getY(i);
      var wx = x0 + u * (x1 - x0), wz = z0 + v * (z1 - z0);
      pos.setXYZ(i, wx, heightFn ? heightFn(wx, wz) : 0, wz);
      uv.setXY(i, u, v);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // ---------------------------------------------------------------- sky/sun
  var sky = new THREE.Sky();
  sky.scale.setScalar(7500);
  scene.add(sky);
  var skyU = sky.material.uniforms;
  skyU.turbidity.value = 3;
  skyU.rayleigh.value = 2.0;
  skyU.mieCoefficient.value = 0.004;
  skyU.mieDirectionalG.value = 0.97;
  renderer.toneMappingExposure = 0.75;

  // afternoon sun hanging to the southwest, out over the water
  var sunDir = new THREE.Vector3(-0.62, 0.5, 0.72).normalize();
  skyU.sunPosition.value.copy(sunDir);

  var sun = new THREE.DirectionalLight(0xffe2b8, 1.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 600;
  sun.shadow.camera.left = -85; sun.shadow.camera.right = 85;
  sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -85;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  var hemi = new THREE.HemisphereLight(0xbfd8f2, 0x8f7a55, 0.55);
  scene.add(hemi);
  var fill = new THREE.AmbientLight(0x223349, 0.7);
  scene.add(fill);

  // ------------------------------------------------------------------ ocean
  var waterNormals = (function () {
    // tileable sum-of-sines normal map so the water plane never shows seams
    var N = 256, height = new Float32Array(N * N);
    var comps = [];
    for (var k = 0; k < 14; k++) {
      comps.push({
        fx: 1 + ((Math.random() * 7) | 0), fy: 1 + ((Math.random() * 7) | 0),
        ph: Math.random() * 6.283, amp: 1 / (1 + k * 0.45)
      });
    }
    var x, y, i;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var v = 0;
      for (var c = 0; c < comps.length; c++) {
        var cc = comps[c];
        v += cc.amp * Math.sin((cc.fx * x + cc.fy * y) * 6.283 / N + cc.ph);
      }
      height[y * N + x] = v;
    }
    var cv = document.createElement("canvas");
    cv.width = N; cv.height = N;
    var ctx = cv.getContext("2d");
    var img = ctx.createImageData(N, N);
    var s = 2.2;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var xp = (x + 1) % N, xm = (x + N - 1) % N, yp = (y + 1) % N, ym = (y + N - 1) % N;
      var dx = (height[y * N + xp] - height[y * N + xm]) * s;
      var dy = (height[yp * N + x] - height[ym * N + x]) * s;
      var inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      i = (y * N + x) * 4;
      img.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();

  var water = new THREE.Water(new THREE.PlaneGeometry(6000, 6000), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: waterNormals,
    sunDirection: sunDir.clone(),
    sunColor: 0xffe0b0,
    waterColor: 0x14829c,
    distortionScale: 3.4,
    fog: true
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = SEA_LEVEL;
  water.material.uniforms.size.value = 4.2;
  scene.add(water);

  // turquoise shallows: translucent gradient hugging the shoreline
  (function () {
    var cv = makeCanvas(16, 256, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "rgba(64, 210, 205, 0.85)");
      g.addColorStop(0.45, "rgba(52, 185, 195, 0.45)");
      g.addColorStop(1.0, "rgba(30, 140, 165, 0.0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    var tex = canvasTexture(cv);
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 34),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, SEA_LEVEL + 0.04, WATERLINE_Z + 13);
    m.renderOrder = 2;
    scene.add(m);

    // deep-water band: turquoise fades into rich Pacific blue toward the horizon
    var cv2 = makeCanvas(16, 256, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "rgba(24, 130, 150, 0.55)");
      g.addColorStop(0.35, "rgba(14, 95, 135, 0.62)");
      g.addColorStop(0.8, "rgba(10, 70, 115, 0.55)");
      g.addColorStop(1.0, "rgba(10, 65, 110, 0.0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    var deep = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 420),
      new THREE.MeshBasicMaterial({ map: canvasTexture(cv2), transparent: true, depthWrite: false, fog: true })
    );
    deep.rotation.x = -Math.PI / 2;
    deep.position.set(0, SEA_LEVEL + 0.03, WATERLINE_Z + 30 + 210);
    deep.renderOrder = 1;
    scene.add(deep);
  })();

  // breaking surf foam — two offset animated strips
  var foamStrips = [];
  (function () {
    var cv = makeCanvas(1024, 64, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) {
        var x = Math.random() * w;
        var y = h / 2 + (Math.random() - 0.5) * h * 0.75 * Math.pow(Math.random(), 0.6);
        var r = 0.7 + Math.random() * 3.1;
        ctx.fillStyle = "rgba(255,255,255," + (0.10 + Math.random() * 0.4).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
    });
    var tex = canvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    for (var k = 0; k < 2; k++) {
      var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true });
      var strip = new THREE.Mesh(new THREE.PlaneGeometry(560, 7), mat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(0, SEA_LEVEL + 0.09 + k * 0.02, WATERLINE_Z + 2);
      strip.renderOrder = 3;
      strip.userData.phase = k * 2.4;
      scene.add(strip);
      foamStrips.push(strip);
    }
  })();

  // ---------------------------------------------------------------- terrain
  // far backdrop lawn so the horizon inland never shows raw ocean
  (function () {
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 3000),
      new THREE.MeshStandardMaterial({ color: 0x3d5a2c, roughness: 1 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, -0.08, SHORE_Z - 1500); // ends exactly at the shoreline
    m.receiveShadow = true;
    scene.add(m);
  })();

  // resort grounds: painted world-canvas (lawns, palm-lined paths, plaza, deck)
  (function () {
    var W = new WorldCanvas(2048, 1024, -130, -80, 130, SHORE_Z + 0.5);
    var ctx = W.ctx;

    // grass base
    ctx.fillStyle = "#4c6b33";
    ctx.fillRect(0, 0, 2048, 1024);
    speckle(ctx, 2048, 1024, 26000, ["#42602c", "#587a3b", "#3c5628", "#66884a"], 1, 4);

    function pavedRect(xa, za, xb, zb, base, tile) {
      var x = W.px(xa), z = W.pz(za), w = W.px(xb) - x, h = W.pz(zb) - z;
      ctx.fillStyle = base;
      ctx.fillRect(x, z, w, h);
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1.4;
      var step = tile * W.sx, gx, gz;
      for (gx = x; gx <= x + w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, z); ctx.lineTo(gx, z + h); ctx.stroke(); }
      for (gz = z; gz <= z + h; gz += tile * W.sz) { ctx.beginPath(); ctx.moveTo(x, gz); ctx.lineTo(x + w, gz); ctx.stroke(); }
    }

    // main promenade: lobby to beach, plus east-west cross path
    pavedRect(-7, -80, 7, SHORE_Z + 0.5, "#c9b389", 2.4);
    pavedRect(-56, -2, 56, 8, "#c9b389", 2.4);

    // central plaza circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(W.px(0), W.pz(14), 17 * W.sx, 0, 6.283);
    ctx.clip();
    ctx.fillStyle = "#d3bd94";
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.strokeStyle = "rgba(120,80,40,0.35)";
    ctx.lineWidth = 3;
    for (var r = 3; r <= 17; r += 3.5) {
      ctx.beginPath(); ctx.arc(W.px(0), W.pz(14), r * W.sx, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
    // subtle flower mosaic inlay at the plaza centre
    ctx.globalAlpha = 0.22;
    drawFlower(ctx, W.px(0), W.pz(14), 4.5 * W.sx, "rgba(170,80,80,0.9)", "rgba(200,160,80,0.95)");
    ctx.globalAlpha = 1;

    // pool deck pad
    pavedRect(-46, -6, -16, 16, "#d9c8a6", 1.6);

    // lobby forecourt
    pavedRect(-20, -34, 20, -14, "#c9b389", 2.4);

    speckle(ctx, 2048, 1024, 9000, ["#00000022", "#ffffff14"], 0.6, 1.8);

    var tex = W.texture();
    var geo = worldPlane(-130, -80, 130, SHORE_Z + 0.5, 64, 32, function () { return 0; });
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96 }));
    mesh.position.y = 0.02; // sits a hair above the sand seam to avoid z-fighting
    mesh.receiveShadow = true;
    scene.add(mesh);
  })();

  // the beach: sloping sand with a wet band at the waterline
  (function () {
    var W = new WorldCanvas(2048, 512, -260, SHORE_Z, 260, 130);
    var ctx = W.ctx;
    ctx.fillStyle = "#e6d3a3";
    ctx.fillRect(0, 0, 2048, 512);
    speckle(ctx, 2048, 512, 30000, ["#dcc793", "#f0e0b5", "#cdb887", "#f6ead0"], 0.6, 2.2);
    // wet sand band near the waterline
    var g = ctx.createLinearGradient(0, W.pz(WATERLINE_Z - 9), 0, W.pz(WATERLINE_Z + 14));
    g.addColorStop(0, "rgba(140,110,70,0)");
    g.addColorStop(0.45, "rgba(120,95,62,0.55)");
    g.addColorStop(1, "rgba(105,86,58,0.75)");
    ctx.fillStyle = g;
    ctx.fillRect(0, W.pz(WATERLINE_Z - 9), 2048, W.pz(130) - W.pz(WATERLINE_Z - 9));
    speckle(ctx, 2048, 512, 4000, ["#00000018", "#ffffff10"], 0.6, 1.6);

    var geo = worldPlane(-260, SHORE_Z, 260, 130, 150, 46, groundY);
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: W.texture(), roughness: 1 }));
    mesh.receiveShadow = true;
    scene.add(mesh);
  })();

  // ------------------------------------------------------------ Diamond Head
  (function () {
    // headland base
    var base = new THREE.Mesh(
      new THREE.CircleGeometry(430, 40),
      new THREE.MeshStandardMaterial({ color: 0x55663a, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(900, -0.4, 330);
    scene.add(base);

    // the crater itself: heightfield with a rim that peaks on the ocean side
    var seg = 72;
    var geo = new THREE.PlaneGeometry(1, 1, seg, seg);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var lowC = new THREE.Color(0x4f6030), midC = new THREE.Color(0x71663a), hiC = new THREE.Color(0x8a774c);
    var maxH = 150;
    for (var i = 0; i < pos.count; i++) {
      var u = pos.getX(i) * 2, v = pos.getY(i) * 2;           // -1..1
      var ang = Math.atan2(v, u);
      var rr = Math.sqrt(u * u * 1.15 + v * v * 1.7);          // elongated crater
      var rim = Math.exp(-Math.pow(rr - 0.62, 2) / 0.028);
      // famous high point of the rim faces the sea (toward -x/-v from crater center)
      rim *= 1 + 0.85 * Math.exp(-Math.pow(angDiff(ang, 2.4), 2) / 0.55);
      var domef = Math.max(0, 1 - Math.pow(rr / 1.15, 2));
      var hgt = maxH * (rim * 0.8 + 0.13 * domef);
      hgt *= 0.75 + 0.25 * Math.sin(u * 21 + v * 17) * 0.3 + 0.25; // rocky ridge noise
      var t = Math.min(1, hgt / maxH * 1.35);
      var c = t < 0.5 ? lowC.clone().lerp(midC, t * 2) : midC.clone().lerp(hiC, (t - 0.5) * 2);
      var j = 0.94 + Math.random() * 0.12;
      colors[i * 3] = c.r * j; colors[i * 3 + 1] = c.g * j; colors[i * 3 + 2] = c.b * j;
      pos.setXYZ(i, pos.getX(i) * 850, pos.getY(i) * 640, hgt);
    }
    function angDiff(a, b) {
      var d = a - b;
      while (d > Math.PI) d -= 6.283;
      while (d < -Math.PI) d += 6.283;
      return d;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    var dh = new THREE.Mesh(geo, mat);
    dh.rotation.x = -Math.PI / 2;
    dh.rotation.z = 0.5;
    dh.position.set(920, -1, 360);
    scene.add(dh);
  })();

  // lava rocks flanking the beach
  (function () {
    var rockMat = new THREE.MeshStandardMaterial({ color: 0x2e2a28, roughness: 0.95 });
    var geo = new THREE.DodecahedronGeometry(1, 1);
    var spots = [
      [-98, 70, 2.6], [-104, 78, 3.4], [-93, 82, 2.0], [-108, 66, 1.7],
      [104, 72, 3.0], [110, 80, 4.0], [97, 84, 2.2], [116, 68, 1.8], [102, 62, 1.4]
    ];
    spots.forEach(function (s) {
      var m = new THREE.Mesh(geo, rockMat);
      m.scale.set(s[2] * (0.8 + Math.random() * 0.4), s[2] * 0.62, s[2] * (0.8 + Math.random() * 0.4));
      m.position.set(s[0], groundY(s[0], s[1]) + s[2] * 0.18, s[1]);
      m.rotation.set(Math.random(), Math.random() * 6.28, Math.random() * 0.4);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
    });
  })();

  // ------------------------------------------------------------- palm trees
  var palms = [];
  (function () {
    var trunkTex = canvasTexture(makeCanvas(128, 256, function (ctx, w, h) {
      ctx.fillStyle = "#8a6f52";
      ctx.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 7 + Math.random() * 8) {
        ctx.fillStyle = "rgba(70,50,32," + (0.25 + Math.random() * 0.35).toFixed(2) + ")";
        ctx.fillRect(0, y, w, 3 + Math.random() * 4);
      }
      speckle(ctx, w, h, 500, ["#00000030", "#ffffff18"], 0.5, 2);
    }));
    trunkTex.wrapS = trunkTex.wrapT = THREE.RepeatWrapping;
    trunkTex.repeat.set(1, 3);
    var trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, roughness: 0.9 });

    var frondTex = canvasTexture(makeCanvas(256, 256, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#2e5c22";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      for (var x = 6; x < w; x += 5) {
        var len = 46 * (1 - Math.abs(x / w - 0.45) * 0.9) + 16;
        var g = ctx.createLinearGradient(x, h / 2, x, h / 2 - len);
        g.addColorStop(0, "#38702a");
        g.addColorStop(1, "#5b9440");
        ctx.strokeStyle = g;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x, h / 2);
        ctx.lineTo(x + 9, h / 2 - len);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, h / 2);
        ctx.lineTo(x + 9, h / 2 + len);
        ctx.stroke();
      }
    }));
    var frondMat = new THREE.MeshStandardMaterial({
      map: frondTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.85
    });
    var nutGeo = new THREE.SphereGeometry(0.13, 8, 6);
    var nutMat = new THREE.MeshStandardMaterial({ color: 0x6b4b2a, roughness: 0.8 });

    // one merged geometry containing every frond of a crown
    function crownGeometry(nFronds, len) {
      var positions = [], uvs = [], indices = [], vi = 0;
      for (var f = 0; f < nFronds; f++) {
        var yaw = (f / nFronds) * 6.283 + Math.random() * 0.35;
        var droop0 = 0.5 + Math.random() * 0.25;      // initial upward angle
        var droopRate = 1.5 + Math.random() * 0.7;    // how hard it bends down
        var L = len * (0.85 + Math.random() * 0.3);
        var segs = 7, prevA = null, px = 0, py = 0;
        for (var s2 = 0; s2 <= segs; s2++) {
          var t = s2 / segs;
          var ang = droop0 - droopRate * t * t;
          if (prevA !== null) {
            px += Math.cos(prevA) * (L / segs);
            py += Math.sin(prevA) * (L / segs);
          }
          prevA = ang;
          var wHalf = 0.42 * (1 - t * 0.8) * (t < 0.08 ? t / 0.08 : 1);
          var cy = Math.cos(yaw), sy = Math.sin(yaw);
          // left and right edge of the strip, offset horizontally perpendicular to yaw
          positions.push(px * cy - (-wHalf) * sy, py, px * sy + (-wHalf) * cy);
          positions.push(px * cy - (wHalf) * sy, py, px * sy + (wHalf) * cy);
          uvs.push(t, 0, t, 1);
          if (s2 > 0) {
            var a = vi + (s2 - 1) * 2, b = a + 1, c = a + 2, d = a + 3;
            indices.push(a, b, c, b, d, c);
          }
        }
        vi += (segs + 1) * 2;
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }

    function makePalm(x, z, h) {
      var tree = new THREE.Group();
      var leanA = Math.random() * 6.283;
      var lean = 0.12 + Math.random() * 0.2;
      var top = new THREE.Vector3(Math.cos(leanA) * lean * h, h, Math.sin(leanA) * lean * h);
      var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(top.x * 0.3, h * 0.5, top.z * 0.3),
        top
      ]);
      var trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 9, 0.17, 7, false), trunkMat);
      trunk.castShadow = true;
      tree.add(trunk);

      var crown = new THREE.Group();
      crown.position.copy(top);
      var fronds = new THREE.Mesh(crownGeometry(9, 2.6 + h * 0.12), frondMat);
      fronds.castShadow = true;
      crown.add(fronds);
      for (var n = 0; n < 3; n++) {
        var nut = new THREE.Mesh(nutGeo, nutMat);
        nut.position.set((Math.random() - 0.5) * 0.5, -0.18, (Math.random() - 0.5) * 0.5);
        crown.add(nut);
      }
      tree.add(crown);
      tree.position.set(x, groundY(x, z), z);
      tree.rotation.y = Math.random() * 6.283;
      tree.userData = { crown: crown, phase: Math.random() * 6.283, x: x, z: z };
      scene.add(tree);
      palms.push(tree);
      return tree;
    }

    // palms lining the promenade, plaza, pool, lobby and the top of the beach
    var spots = [
      [-10, 34, 8], [10, 33, 9], [-11, 22, 7.5], [11, 21, 8.5],
      [-10, 2, 8], [10, 3, 9], [-12, -12, 7], [12, -13, 8],
      [-24, 14, 9], [24, 13, 8], [-20, 26, 7], [21, 27, 8.2],
      [-50, 10, 8.5], [-52, -4, 7.5], [-14, -2, 7], [-48, 20, 9],
      [40, 8, 8], [52, 14, 9], [46, 26, 7.4], [62, 4, 8],
      [-30, 41, 9.5], [-58, 43, 8], [30, 42, 9], [58, 44, 8.5], [84, 42, 7.6], [-84, 41, 8.2],
      [-36, -28, 7], [36, -27, 7.5], [70, 30, 8.8], [-70, 32, 8.4]
    ];
    spots.forEach(function (s) { makePalm(s[0], s[1], s[2]); });
  })();

  // ------------------------------------------------------------- the resort
  var colliders = []; // {x,z,hx,hz} boxes the sumo can't walk through

  function addCollider(x, z, hx, hz) { colliders.push({ x: x, z: z, hx: hx, hz: hz }); }

  (function () {
    // ---- high-rise towers
    function facadeTexture(floors, cols, tint) {
      return canvasTexture(makeCanvas(512, 1024, function (ctx, w, h) {
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, w, h);
        var fh = h / floors, cw = w / cols;
        for (var f = 0; f < floors; f++) {
          // balcony slab line
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(0, f * fh + fh * 0.82, w, fh * 0.10);
          for (var c = 0; c < cols; c++) {
            var lit = Math.random();
            var glass;
            if (lit > 0.93) glass = "#ffd98a";                        // a few lamps on
            else if (lit > 0.5) glass = "#9fc4d8";
            else glass = "#7ba9c2";
            ctx.fillStyle = glass;
            ctx.fillRect(c * cw + cw * 0.14, f * fh + fh * 0.16, cw * 0.72, fh * 0.6);
            ctx.fillStyle = "rgba(255,255,255,0.25)";                  // sun glint
            ctx.fillRect(c * cw + cw * 0.14, f * fh + fh * 0.16, cw * 0.72, fh * 0.16);
            ctx.strokeStyle = "rgba(60,60,70,0.5)";
            ctx.strokeRect(c * cw + cw * 0.14, f * fh + fh * 0.16, cw * 0.72, fh * 0.6);
          }
        }
      }));
    }
    function tower(x, z, w, d, h, tint) {
      var faceW = facadeTexture(Math.round(h / 3.4), Math.round(w / 2.6), tint);
      var faceD = facadeTexture(Math.round(h / 3.4), Math.round(d / 2.6), tint);
      var roof = new THREE.MeshStandardMaterial({ color: 0x8e8478, roughness: 0.9 });
      var mw = new THREE.MeshStandardMaterial({ map: faceW, roughness: 0.55 });
      var md = new THREE.MeshStandardMaterial({ map: faceD, roughness: 0.55 });
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [md, md, roof, roof, mw, mw]);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      scene.add(mesh);
      var cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 3, d * 0.6),
        new THREE.MeshStandardMaterial({ color: 0x6e6459, roughness: 0.9 }));
      cap.position.set(x, h + 1.5, z);
      scene.add(cap);
      addCollider(x, z, w / 2 + 1, d / 2 + 1);
    }
    tower(-46, -54, 24, 16, 74, "#e8ddcb");
    tower(2, -60, 30, 17, 92, "#efe6d6");
    tower(50, -52, 22, 15, 64, "#e2d5c0");

    // ---- open-air lobby hale with pyramid roof + resort sign
    var lob = new THREE.Group();
    var wallMat = new THREE.MeshStandardMaterial({ color: 0xf0e3cc, roughness: 0.85 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(30, 7, 13), wallMat);
    body.position.y = 3.5;
    body.castShadow = true;
    lob.add(body);
    var roofTex = canvasTexture(makeCanvas(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#7a5a34";
      ctx.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 6) {
        ctx.strokeStyle = "rgba(50,34,16," + (0.3 + Math.random() * 0.3).toFixed(2) + ")";
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 4); ctx.stroke();
      }
    }));
    var roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), new THREE.MeshStandardMaterial({ map: roofTex, roughness: 1 }));
    roof.scale.set(24, 6.5, 12);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 10.2;
    roof.castShadow = true;
    lob.add(roof);
    for (var ci = -2; ci <= 2; ci++) {
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 7, 8),
        new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.8 }));
      col.position.set(ci * 6.5, 3.5, 7.4);
      col.castShadow = true;
      lob.add(col);
    }
    // the big sign
    var signCv = makeCanvas(1024, 288, function (ctx, w, h) {
      ctx.fillStyle = "#4a2e1a";
      ctx.fillRect(0, 0, w, h);
      for (var y = 8; y < h; y += 34) {
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = "#e8c97a";
      ctx.lineWidth = 10;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe9b8";
      ctx.font = "900 92px Georgia, 'Times New Roman', serif";
      ctx.fillText("WAIKIKI VILLAGE", w / 2, 128);
      ctx.font = "700 58px Georgia, 'Times New Roman', serif";
      ctx.fillStyle = "#e8c97a";
      ctx.fillText("R  E  S  O  R  T", w / 2, 208);
      ctx.font = "italic 34px Georgia, serif";
      ctx.fillStyle = "#ffd9a0";
      ctx.fillText("e komo mai — welcome", w / 2, 258);
      drawFlower(ctx, 78, h / 2, 52, "#ff6ea0", "#ffd166");
      drawFlower(ctx, w - 78, h / 2, 52, "#ff6ea0", "#ffd166");
    });
    lob.position.set(0, 0, -26);
    scene.add(lob);
    addCollider(0, -26, 16, 8);

    // freestanding welcome arch over the promenade, in front of the lobby
    var arch = new THREE.Group();
    var postMat = new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.85 });
    [-8.2, 8.2].forEach(function (px) {
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 7.6, 8), postMat);
      post.position.set(px, 3.8, 0);
      post.castShadow = true;
      arch.add(post);
      addCollider(px, -12.5, 0.6, 0.6);
    });
    var sign = new THREE.Mesh(new THREE.BoxGeometry(17.5, 4.4, 0.4),
      [postMat, postMat, postMat, postMat,
       new THREE.MeshStandardMaterial({ map: canvasTexture(signCv), roughness: 0.7 }),
       new THREE.MeshStandardMaterial({ map: canvasTexture(signCv), roughness: 0.7 })]);
    sign.position.y = 5.9;
    sign.castShadow = true;
    arch.add(sign);
    arch.position.set(0, 0, -12.5);
    scene.add(arch);

    // ---- swimming pool
    var pool = new THREE.Group();
    var pw = 22, pd = 12;
    // brimming pool: water sits at deck level (tile pattern painted into the water tint)
    var poolTex = canvasTexture(makeCanvas(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#37b8d2";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      for (var x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      speckle(ctx, w, h, 300, ["#7fe0ef", "#1d95b0"], 2, 9);
    }));
    var pwater = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd),
      new THREE.MeshStandardMaterial({ map: poolTex, transparent: true, opacity: 0.92, roughness: 0.12, metalness: 0.05 }));
    pwater.rotation.x = -Math.PI / 2;
    pwater.position.y = 0.07;
    pwater.receiveShadow = true;
    pool.add(pwater);
    // coping
    var copMat = new THREE.MeshStandardMaterial({ color: 0xe8dfca, roughness: 0.7 });
    [[0, pd / 2 + 0.5, pw + 2.4, 1], [0, -pd / 2 - 0.5, pw + 2.4, 1], [pw / 2 + 0.5, 0, 1, pd], [-pw / 2 - 0.5, 0, 1, pd]]
      .forEach(function (s) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(s[2], 0.26, s[3]), copMat);
        m.position.set(s[0], 0.13, s[1]);
        m.receiveShadow = true;
        pool.add(m);
      });
    pool.position.set(-31, 0, 5);
    scene.add(pool);
    addCollider(-31, 5, pw / 2 + 0.8, pd / 2 + 0.8);

    // ---- loungers + umbrellas
    var lounMatA = new THREE.MeshStandardMaterial({ color: 0xf5f1e6, roughness: 0.8 });
    var lounMatB = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.8 });
    function lounger(x, z, ry) {
      var g = new THREE.Group();
      var seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 2.1), lounMatA);
      seat.position.y = 0.42;
      seat.castShadow = true;
      g.add(seat);
      var back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.95), lounMatB);
      back.position.set(0, 0.65, -1.25);
      back.rotation.x = -0.7;
      back.castShadow = true;
      g.add(back);
      [[-0.36, 0.7], [0.36, 0.7], [-0.36, -0.7], [0.36, -0.7]].forEach(function (l) {
        var leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), lounMatB);
        leg.position.set(l[0], 0.21, l[1]);
        g.add(leg);
      });
      g.position.set(x, groundY(x, z), z);
      g.rotation.y = ry;
      scene.add(g);
    }
    function umbrella(x, z) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 6),
        new THREE.MeshStandardMaterial({ color: 0xd9d2c0 }));
      pole.position.y = 1.55;
      g.add(pole);
      var canTex = canvasTexture(makeCanvas(256, 64, function (ctx, w, h) {
        for (var i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? "#ff8f6b" : "#fff4e0";
          ctx.fillRect(i * w / 8, 0, w / 8, h);
        }
      }));
      canTex.wrapS = THREE.RepeatWrapping;
      var can = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.85, 12, 1, true),
        new THREE.MeshStandardMaterial({ map: canTex, side: THREE.DoubleSide, roughness: 0.85 }));
      can.position.y = 3.0;
      can.castShadow = true;
      g.add(can);
      g.position.set(x, groundY(x, z), z);
      g.rotation.y = Math.random() * 6.28;
      scene.add(g);
    }
    // pool row
    lounger(-42, -3.5, 0); lounger(-39, -3.5, 0); lounger(-36, -3.5, 0);
    lounger(-24, -3.5, 0); lounger(-21, -3.5, 0);
    umbrella(-40.5, -5); umbrella(-22.5, -5);
    // beach rows
    lounger(-18, 52, 3.14); lounger(-15, 52, 3.14); lounger(18, 53, 3.14); lounger(21, 53, 3.14);
    lounger(-40, 55, 3.4); lounger(44, 56, 2.9);
    umbrella(-16.5, 50); umbrella(19.5, 51); umbrella(-41, 53); umbrella(45, 54);

    // ---- surfboards standing in the sand
    var boards = [[30, 46, 0xff5e8a], [31.2, 46.3, 0x39c1e0], [-33, 47, 0xffd166]];
    boards.forEach(function (b, i) {
      var board = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshStandardMaterial({ color: b[2], roughness: 0.35 }));
      board.scale.set(0.34, 1.55, 0.09);
      board.position.set(b[0], groundY(b[0], b[1]) + 1.35, b[1]);
      board.rotation.z = (i - 1) * 0.14;
      board.rotation.y = 0.4 * (i - 1);
      board.castShadow = true;
      scene.add(board);
    });
  })();

  // ------------------------------------------------------------ tiki torches
  var torches = [];
  (function () {
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.9 });
    var bowlMat = new THREE.MeshStandardMaterial({ color: 0x3c2a16, roughness: 0.85 });
    var flameTex = canvasTexture(makeCanvas(64, 64, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,240,190,1)");
      g.addColorStop(0.35, "rgba(255,160,60,0.85)");
      g.addColorStop(0.7, "rgba(255,90,30,0.35)");
      g.addColorStop(1, "rgba(255,60,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));
    function torch(x, z, withLight) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.6, 6), poleMat);
      pole.position.y = 1.3;
      pole.castShadow = true;
      g.add(pole);
      var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.3, 8), bowlMat);
      bowl.position.y = 2.7;
      g.add(bowl);
      var flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
      }));
      flame.scale.set(0.85, 1.25, 1);
      flame.position.y = 3.15;
      g.add(flame);
      var light = null;
      if (withLight) {
        light = new THREE.PointLight(0xff9040, 0, 16, 2);
        light.position.y = 3.1;
        g.add(light);
      }
      g.position.set(x, groundY(x, z), z);
      scene.add(g);
      torches.push({ flame: flame, light: light, phase: Math.random() * 20 });
    }
    torch(-8, 36, true); torch(8, 36, true);
    torch(-8, 18, true); torch(8, 18, false);
    torch(-8, 0, false); torch(8, 0, true);
    torch(-19, 10, false); torch(19, 9, false);
    torch(-30, 44, true); torch(30, 44, true);
  })();

  // ------------------------------------------------------------- sky extras
  var clouds = [];
  (function () {
    var tex = canvasTexture(makeCanvas(256, 128, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < 26; i++) {
        var x = w * 0.5 + (Math.random() - 0.5) * w * 0.7;
        var y = h * 0.6 + (Math.random() - 0.5) * h * 0.4;
        var r = 14 + Math.random() * 26;
        var g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, "rgba(255,252,246,0.55)");
        g.addColorStop(1, "rgba(255,252,246,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }));
    for (var i = 0; i < 10; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
      sp.material.toneMapped = false;
      sp.material.opacity = 0.4;
      var a = Math.random() * 6.283, d = 750 + Math.random() * 500;
      sp.position.set(Math.cos(a) * d, 140 + Math.random() * 190, Math.sin(a) * d);
      var s = 220 + Math.random() * 260;
      sp.scale.set(s, s * 0.42, 1);
      sp.material.opacity = 0.3 + Math.random() * 0.2;
      sp.userData.speed = 1.2 + Math.random() * 1.6;
      scene.add(sp);
      clouds.push(sp);
    }
  })();

  var birds = [];
  (function () {
    var mat = new THREE.MeshBasicMaterial({ color: 0x3a3f4a });
    for (var i = 0; i < 6; i++) {
      var b = new THREE.Group();
      var wl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.3), mat);
      wl.position.x = -0.6;
      var wr = wl.clone();
      wr.position.x = 0.6;
      b.add(wl); b.add(wr);
      b.userData = {
        wl: wl, wr: wr,
        r: 45 + Math.random() * 70, h: 26 + Math.random() * 26,
        speed: 0.25 + Math.random() * 0.25, ph: Math.random() * 6.283,
        cx: (Math.random() - 0.5) * 120, cz: 30 + Math.random() * 50
      };
      scene.add(b);
      birds.push(b);
    }
  })();

  // ============================================================== THE SUMO
  var sumo = new THREE.Group();
  var rig = {};
  (function () {
    var skin = new THREE.MeshStandardMaterial({ color: 0xc57f45, roughness: 0.55 });
    var skinD = new THREE.MeshStandardMaterial({ color: 0xb5743f, roughness: 0.6 });
    var hair = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.35 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.4 });

    // aloha-print fabric for the mawashi + headband
    var floralTex = canvasTexture(makeCanvas(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#c62f45";
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 14; i++) {
        drawFlower(ctx, Math.random() * w, Math.random() * h, 14 + Math.random() * 12,
          "rgba(255,245,235,0.92)", "#ffd166");
      }
      for (i = 0; i < 20; i++) {
        ctx.strokeStyle = "rgba(20,90,60,0.5)";
        ctx.lineWidth = 3;
        var x = Math.random() * w, y = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 12, y - 16, x + 26, y - 8);
        ctx.stroke();
      }
    }));
    floralTex.wrapS = floralTex.wrapT = THREE.RepeatWrapping;
    var floral = new THREE.MeshStandardMaterial({ map: floralTex, roughness: 0.8 });

    function orb(mat, r, sx, sy, sz) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat);
      m.scale.set(sx || 1, sy || 1, sz || 1);
      m.castShadow = true;
      return m;
    }

    var hips = new THREE.Group();
    hips.position.y = 1.18;
    sumo.add(hips);
    rig.hips = hips;

    var torso = new THREE.Group();
    hips.add(torso);
    rig.torso = torso;

    var belly = orb(skin, 0.78, 1.14, 1.06, 1.04);
    belly.position.y = 0.45;
    torso.add(belly);
    rig.belly = belly;
    var navel = orb(skinD, 0.05, 1, 1.4, 0.5);
    navel.position.set(0, 0.32, 0.82);
    torso.add(navel);

    var chest = orb(skin, 0.6, 1.22, 0.92, 0.95);
    chest.position.y = 0.98;
    torso.add(chest);
    rig.chest = chest;
    var pecL = orb(skin, 0.27, 1.1, 0.9, 0.62);
    pecL.position.set(-0.28, 1.06, 0.44);
    torso.add(pecL);
    var pecR = pecL.clone();
    pecR.position.x = 0.28;
    torso.add(pecR);

    // mawashi
    var belt = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.17, 12, 28), floral);
    belt.scale.set(1.1, 1, 1.02);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.12;
    belt.castShadow = true;
    torso.add(belt);
    var apron = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.85, 12, 1, true, -0.45, 0.9), floral);
    apron.position.y = -0.25;
    apron.castShadow = true;
    torso.add(apron);
    var knot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.22), floral);
    knot.position.set(0, 0.1, -0.92);
    torso.add(knot);

    // lei
    var leiG = new THREE.Group();
    var leiCols = [0xff6ec7, 0xfff5ee, 0xffd166, 0xff477e];
    for (var li = 0; li < 26; li++) {
      var a = (li / 26) * 6.283;
      var fl = orb(new THREE.MeshStandardMaterial({ color: leiCols[li % 4], roughness: 0.75 }),
        0.085 + Math.random() * 0.03);
      fl.position.set(Math.sin(a) * 0.56, Math.cos(a) * 0.34, Math.cos(a) * 0.28);
      leiG.add(fl);
    }
    leiG.position.set(0, 1.28, 0.34);
    leiG.rotation.x = 0.42;
    torso.add(leiG);

    // head
    var headP = new THREE.Group();
    headP.position.y = 1.52;
    torso.add(headP);
    rig.head = headP;
    var head = orb(skin, 0.4, 0.98, 1.06, 0.98);
    head.position.y = 0.12;
    headP.add(head);
    var jowls = orb(skin, 0.24, 1.35, 0.72, 1.0);
    jowls.position.set(0, -0.1, 0.14);
    headP.add(jowls);
    var earL = orb(skin, 0.09);
    earL.position.set(-0.38, 0.12, 0.02);
    headP.add(earL);
    var earR = earL.clone();
    earR.position.x = 0.38;
    headP.add(earR);
    // hair + chonmage topknot
    var cap = orb(hair, 0.41, 1.0, 0.72, 1.0);
    cap.position.y = 0.3;
    headP.add(cap);
    var bun = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), hair);
    bun.rotation.x = Math.PI / 2 - 0.25;
    bun.position.set(0, 0.56, 0.1);
    headP.add(bun);
    // headband + tucked flower
    var band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), floral);
    band.rotation.x = Math.PI / 2 + 0.12;
    band.position.y = 0.3;
    headP.add(band);
    var flow = new THREE.Group();
    for (var p = 0; p < 5; p++) {
      var pa = (p / 5) * 6.283;
      var pet = orb(new THREE.MeshStandardMaterial({ color: 0xfff2f6, roughness: 0.7 }), 0.06, 1, 1, 0.4);
      pet.position.set(Math.cos(pa) * 0.07, Math.sin(pa) * 0.07, 0);
      flow.add(pet);
    }
    var fc = orb(new THREE.MeshStandardMaterial({ color: 0xffd166 }), 0.045);
    flow.add(fc);
    flow.position.set(0.36, 0.3, 0.22);
    flow.rotation.y = 0.9;
    headP.add(flow);
    // sunglasses
    var lensL = orb(dark, 0.13, 1, 0.82, 0.35);
    lensL.position.set(-0.16, 0.14, 0.36);
    headP.add(lensL);
    var lensR = lensL.clone();
    lensR.position.x = 0.16;
    headP.add(lensR);
    var bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), dark);
    bridge.position.set(0, 0.15, 0.4);
    headP.add(bridge);
    var armLft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.025), dark);
    armLft.rotation.y = Math.PI / 2;
    armLft.position.set(-0.3, 0.15, 0.22);
    headP.add(armLft);
    var armRgt = armLft.clone();
    armRgt.position.x = 0.3;
    headP.add(armRgt);
    // brows + smile
    var browL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.04), hair);
    browL.position.set(-0.16, 0.27, 0.35);
    browL.rotation.z = 0.18;
    headP.add(browL);
    var browR = browL.clone();
    browR.position.x = 0.16;
    browR.rotation.z = -0.18;
    headP.add(browR);
    var smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({ color: 0x6e352a, roughness: 0.6 }));
    smile.position.set(0, -0.08, 0.37);
    smile.rotation.z = Math.PI + Math.PI * 0.15;
    headP.add(smile);

    // arms
    function makeArm(side) { // side: -1 left, +1 right
      var sh = new THREE.Group();
      sh.position.set(side * 0.74, 1.08, 0);
      torso.add(sh);
      var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.58, 12), skin);
      upper.position.y = -0.29;
      upper.castShadow = true;
      sh.add(upper);
      var shoulderBall = orb(skin, 0.24);
      sh.add(shoulderBall);
      var el = new THREE.Group();
      el.position.y = -0.58;
      sh.add(el);
      var fore = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.52, 12), skin);
      fore.position.y = -0.26;
      fore.castShadow = true;
      el.add(fore);
      var hand = orb(skin, 0.2, 0.85, 1, 1.12);
      hand.position.y = -0.58;
      el.add(hand);
      return { sh: sh, el: el };
    }
    rig.armL = makeArm(-1);
    rig.armR = makeArm(1);

    // legs
    function makeLeg(side) {
      var hp = new THREE.Group();
      hp.position.set(side * 0.4, 0, 0);
      hips.add(hp);
      var thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.6, 12), skin);
      thigh.position.y = -0.32;
      thigh.castShadow = true;
      hp.add(thigh);
      var kn = new THREE.Group();
      kn.position.y = -0.62;
      hp.add(kn);
      var calf = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.52, 12), skin);
      calf.position.y = -0.26;
      calf.castShadow = true;
      kn.add(calf);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.55), skin);
      foot.position.set(0, -0.5, 0.12);
      foot.castShadow = true;
      kn.add(foot);
      var slip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.62),
        new THREE.MeshStandardMaterial({ color: 0xe8a23c, roughness: 0.85 }));
      slip.position.set(0, -0.585, 0.12);
      kn.add(slip);
      var strap = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 10, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xc62f45, roughness: 0.8 }));
      strap.position.set(0, -0.55, 0.24);
      strap.rotation.set(0, Math.PI / 2, Math.PI / 2);
      kn.add(strap);
      return { hip: hp, knee: kn };
    }
    rig.legL = makeLeg(-1);
    rig.legR = makeLeg(1);

    sumo.position.set(0, 0, 14);
    scene.add(sumo);
  })();

  // ------------------------------------------------------ particles/ripples
  var dust = [];
  (function () {
    var tex = canvasTexture(makeCanvas(64, 64, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(226,205,160,0.85)");
      g.addColorStop(1, "rgba(226,205,160,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));
    for (var i = 0; i < 22; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.visible = false;
      scene.add(sp);
      dust.push({ sp: sp, life: 0, vx: 0, vy: 0, vz: 0 });
    }
  })();
  function burstDust(x, y, z, n, spread) {
    var used = 0;
    for (var i = 0; i < dust.length && used < n; i++) {
      var d = dust[i];
      if (d.life > 0) continue;
      used++;
      d.life = 0.65 + Math.random() * 0.4;
      d.maxLife = d.life;
      var a = Math.random() * 6.283;
      d.vx = Math.cos(a) * spread * (0.5 + Math.random());
      d.vz = Math.sin(a) * spread * (0.5 + Math.random());
      d.vy = 1.2 + Math.random() * 1.6;
      d.sp.position.set(x + Math.cos(a) * 0.4, y + 0.1, z + Math.sin(a) * 0.4);
      d.sp.scale.set(0.6, 0.6, 1);
      d.sp.visible = true;
    }
  }

  var ripples = [];
  (function () {
    var mat = new THREE.MeshBasicMaterial({
      color: 0xeafcff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, fog: true
    });
    for (var i = 0; i < 10; i++) {
      var m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 24), mat.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 4;
      scene.add(m);
      ripples.push({ m: m, life: 0 });
    }
  })();
  function spawnRipple(x, z) {
    for (var i = 0; i < ripples.length; i++) {
      if (ripples[i].life > 0) continue;
      var r = ripples[i];
      r.life = 1;
      r.m.position.set(x, SEA_LEVEL + 0.05, z);
      r.m.scale.set(1, 1, 1);
      r.m.visible = true;
      return;
    }
  }

  // ------------------------------------------------------------------ input
  var keys = {};
  var started = false;
  var splash = document.getElementById("splash");
  function start() {
    if (started) return;
    started = true;
    splash.classList.add("hidden");
    audio.init();
  }
  window.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (e.code === "Space") { e.preventDefault(); triggerStomp(); }
    if (e.code === "KeyM" && started) audio.toggle();
    if (e.code === "KeyF") doAloha();
    if (e.code === "KeyR") { sumo.position.set(0, 0, 14); facing = 0; }
    start();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  splash.addEventListener("click", start);
  document.getElementById("sound-chip").addEventListener("click", function () {
    start();
    audio.toggle();
  });

  // camera orbit
  var camYaw = Math.PI;        // behind the sumo, looking south at the sea
  var camPitch = 0.24;
  var camDist = 9.5;
  var dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener("mousedown", function (e) { dragging = true; lastX = e.clientX; lastY = e.clientY; start(); });
  window.addEventListener("mouseup", function () { dragging = false; });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    camYaw -= (e.clientX - lastX) * 0.0052;
    camPitch += (e.clientY - lastY) * 0.0042;
    camPitch = Math.max(-0.08, Math.min(1.15, camPitch));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener("wheel", function (e) {
    camDist = Math.max(4.5, Math.min(17, camDist + e.deltaY * 0.008));
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  // touch: left half joystick, right half camera
  var joyEl = document.getElementById("joy");
  var joyKnob = joyEl.querySelector(".knob");
  var joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  var camTouch = { id: -1, x: 0, y: 0 };
  window.addEventListener("touchstart", function (e) {
    document.body.classList.add("touch");
    start();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.target && t.target.id === "stomp-btn") continue;
      if (t.clientX < window.innerWidth / 2 && !joy.active) {
        joy.active = true; joy.id = t.identifier;
        joy.ox = t.clientX; joy.oy = t.clientY; joy.x = 0; joy.y = 0;
        joyEl.style.display = "block";
        joyEl.style.left = (t.clientX - 60) + "px";
        joyEl.style.top = (t.clientY - 60) + "px";
      } else if (camTouch.id === -1) {
        camTouch.id = t.identifier; camTouch.x = t.clientX; camTouch.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  window.addEventListener("touchmove", function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (joy.active && t.identifier === joy.id) {
        var dx = t.clientX - joy.ox, dy = t.clientY - joy.oy;
        var len = Math.hypot(dx, dy), max = 48;
        if (len > max) { dx *= max / len; dy *= max / len; }
        joy.x = dx / max; joy.y = dy / max;
        joyKnob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
      } else if (t.identifier === camTouch.id) {
        camYaw -= (t.clientX - camTouch.x) * 0.007;
        camPitch += (t.clientY - camTouch.y) * 0.005;
        camPitch = Math.max(-0.08, Math.min(1.15, camPitch));
        camTouch.x = t.clientX; camTouch.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  window.addEventListener("touchend", function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joy.id) {
        joy.active = false; joy.id = -1; joy.x = 0; joy.y = 0;
        joyEl.style.display = "none";
        joyKnob.style.transform = "translate(-50%,-50%)";
      }
      if (t.identifier === camTouch.id) camTouch.id = -1;
    }
  });
  document.getElementById("stomp-btn").addEventListener("touchstart", function (e) {
    triggerStomp();
    e.preventDefault();
  }, { passive: false });

  // ------------------------------------------------------------------ audio
  var audio = {
    ctx: null, master: null, on: true, waveGain: null, waveFilter: null, gullTimer: 5,
    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(ctx.destination);
      // rolling ocean: looped noise through a swelling lowpass
      var len = ctx.sampleRate * 4;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.03 * w) / 1.03;
        d[i] = last * 4.4;
      }
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      this.waveFilter = ctx.createBiquadFilter();
      this.waveFilter.type = "lowpass";
      this.waveFilter.frequency.value = 420;
      this.waveGain = ctx.createGain();
      this.waveGain.gain.value = 0.3;
      src.connect(this.waveFilter);
      this.waveFilter.connect(this.waveGain);
      this.waveGain.connect(this.master);
      src.start();
    },
    toggle: function () {
      this.on = !this.on;
      if (this.master) this.master.gain.value = this.on ? 0.5 : 0;
      document.getElementById("sound-chip").textContent = this.on ? "🔊 Sound On" : "🔇 Muted";
    },
    update: function (t, dt, nearSea) {
      if (!this.ctx) return;
      // slow wave swells, louder near the water
      var swell = 0.22 + 0.16 * Math.sin(t * 0.45) + 0.1 * Math.sin(t * 0.23 + 2);
      var prox = 0.35 + 0.65 * nearSea;
      this.waveGain.gain.setTargetAtTime(swell * prox, this.ctx.currentTime, 0.4);
      this.waveFilter.frequency.setTargetAtTime(320 + 260 * Math.max(0, Math.sin(t * 0.45)), this.ctx.currentTime, 0.3);
      this.gullTimer -= dt;
      if (this.gullTimer < 0) {
        this.gullTimer = 6 + Math.random() * 12;
        this.gull();
      }
    },
    gull: function () {
      if (!this.ctx || !this.on) return;
      var ctx = this.ctx, t0 = ctx.currentTime;
      for (var i = 0; i < 2 + ((Math.random() * 2) | 0); i++) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle";
        var ts = t0 + i * 0.28;
        o.frequency.setValueAtTime(1350, ts);
        o.frequency.exponentialRampToValueAtTime(880, ts + 0.22);
        g.gain.setValueAtTime(0, ts);
        g.gain.linearRampToValueAtTime(0.05, ts + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, ts + 0.25);
        o.connect(g); g.connect(this.master);
        o.start(ts); o.stop(ts + 0.3);
      }
    },
    thump: function () {
      if (!this.ctx) return;
      var ctx = this.ctx, t0 = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(95, t0);
      o.frequency.exponentialRampToValueAtTime(32, t0 + 0.28);
      g.gain.setValueAtTime(0.9, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.4);
    },
    splash: function () {
      if (!this.ctx) return;
      var ctx = this.ctx, t0 = ctx.currentTime;
      var len = ctx.sampleRate * 0.25;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.7;
      var g = ctx.createGain();
      g.gain.value = 0.16;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    }
  };

  // ---------------------------------------------------------------- gameplay
  var walkPhase = 0, walkAmt = 0, speedNow = 0;
  var facing = 0;                       // sumo faces the ocean (+z) at spawn
  var stomp = { t: -1 };                // -1 idle, else 0..1 through the move
  var shake = 0;
  var alohaT = -1;
  var stepAcc = 0;

  function triggerStomp() {
    if (stomp.t < 0 && started) stomp.t = 0;
  }
  function doAloha() {
    if (!started) return;
    alohaT = 0;
    var pop = document.getElementById("aloha-pop");
    pop.classList.remove("show");
    void pop.offsetWidth;
    pop.classList.add("show");
    setTimeout(function () { pop.classList.remove("show"); }, 1100);
    audio.gull();
  }

  function resolveCollisions(px, pz, rad) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var dx = px - c.x, dz = pz - c.z;
      var ox = c.hx + rad - Math.abs(dx), oz = c.hz + rad - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) px = c.x + (dx > 0 ? 1 : -1) * (c.hx + rad);
        else pz = c.z + (dz > 0 ? 1 : -1) * (c.hz + rad);
      }
    }
    // palm trunks
    for (i = 0; i < palms.length; i++) {
      var t = palms[i].userData;
      var ddx = px - t.x, ddz = pz - t.z;
      var d2 = ddx * ddx + ddz * ddz, min = rad + 0.35;
      if (d2 < min * min && d2 > 0.0001) {
        var d = Math.sqrt(d2);
        px = t.x + ddx / d * min;
        pz = t.z + ddz / d * min;
      }
    }
    return { x: px, z: pz };
  }

  var zoneEl = document.getElementById("zone-chip");
  var zoneLast = "";
  function updateZone() {
    var x = sumo.position.x, z = sumo.position.z;
    var label;
    if (z > WATERLINE_Z + 1.5) label = "🌊 Wading in the Pacific — Diamond Head to your left!";
    else if (z > SHORE_Z + 4) label = "🏖️ Waikiki Beach";
    else if (x > -47 && x < -15 && z > -8 && z < 18) label = "🏊 Pool Deck";
    else if (z < -13) label = "🏨 Village Lobby";
    else label = "🌺 Resort Grounds";
    if (label !== zoneLast) {
      zoneLast = label;
      zoneEl.textContent = label;
    }
  }

  // easing helper for the stomp timeline
  function seg(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }
  function easeOut(x) { return 1 - (1 - x) * (1 - x); }
  function easeIn(x) { return x * x; }

  // ------------------------------------------------------------------- loop
  var clock = new THREE.Clock();
  var camPos = new THREE.Vector3(0, 4, 26);
  var camSnap = false;
  var stompImpactDone = false;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    // ---- movement input
    var ix = 0, iz = 0;
    if (started && stomp.t < 0) {
      if (keys.KeyW || keys.ArrowUp) iz -= 1;
      if (keys.KeyS || keys.ArrowDown) iz += 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1;
      if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (joy.active) { ix += joy.x; iz += joy.y; }
    }
    var moving = (ix !== 0 || iz !== 0);
    var run = keys.ShiftLeft || keys.ShiftRight;
    var targetSpeed = moving ? (run ? 9.0 : 4.4) : 0;
    speedNow += (targetSpeed - speedNow) * Math.min(1, dt * 6);

    if (moving) {
      var ang = Math.atan2(ix, iz) + camYaw; // camera-relative
      // steer smoothly (shortest arc)
      var diff = ang - facing;
      while (diff > Math.PI) diff -= 6.283;
      while (diff < -Math.PI) diff += 6.283;
      facing += diff * Math.min(1, dt * 9);

      var nx = sumo.position.x + Math.sin(facing) * speedNow * dt;
      var nz = sumo.position.z + Math.cos(facing) * speedNow * dt;
      nx = Math.max(-115, Math.min(115, nx));
      nz = Math.max(-62, Math.min(93, nz));
      var res = resolveCollisions(nx, nz, 1.0);
      sumo.position.x = res.x;
      sumo.position.z = res.z;
    }
    sumo.rotation.y = facing;
    var gy = groundY(sumo.position.x, sumo.position.z);
    sumo.position.y = gy;
    var inWater = gy < SEA_LEVEL;

    // ---- walk cycle
    var speedRatio = speedNow / 4.4;
    walkPhase += dt * speedRatio * 1.9;
    walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 7);
    var swing = Math.sin(walkPhase * 6.283);
    var swing2 = Math.cos(walkPhase * 6.283);

    var R = rig;
    if (stomp.t < 0) {
      R.legL.hip.rotation.x = swing * 0.5 * walkAmt;
      R.legR.hip.rotation.x = -swing * 0.5 * walkAmt;
      R.legL.hip.rotation.z = 0.14;
      R.legR.hip.rotation.z = -0.14;
      R.legL.knee.rotation.x = Math.max(0, -swing) * 0.85 * walkAmt;
      R.legR.knee.rotation.x = Math.max(0, swing) * 0.85 * walkAmt;
      R.armL.sh.rotation.x = -swing * 0.36 * walkAmt;
      R.armR.sh.rotation.x = swing * 0.36 * walkAmt;
      R.armL.sh.rotation.z = 0.62 + Math.sin(t * 1.7) * 0.02;
      R.armR.sh.rotation.z = -0.62 - Math.sin(t * 1.7) * 0.02;
      R.armL.el.rotation.x = -0.45;
      R.armR.el.rotation.x = -0.45;
      R.hips.position.y = 1.18 + Math.abs(swing2) * 0.085 * walkAmt + Math.sin(t * 1.8) * 0.012;
      R.hips.rotation.z = swing * 0.085 * walkAmt;
      R.hips.rotation.x = 0.07 * walkAmt * speedRatio * 0.6;
      R.belly.scale.set(1.14, 1.06 + 0.02 * Math.sin(walkPhase * 12.6), 1.04 + 0.015 * Math.sin(t * 1.8));
      R.chest.scale.y = 0.92 + 0.018 * Math.sin(t * 1.8);
      R.head.rotation.y = Math.sin(t * 0.4) * 0.14 * (1 - walkAmt);
      R.head.rotation.x = 0;

      // footstep events: dust kicks + splashes
      stepAcc += dt * speedRatio * 1.9 * 2; // two steps per cycle
      if (stepAcc > 1 && walkAmt > 0.5) {
        stepAcc = 0;
        if (inWater) {
          spawnRipple(sumo.position.x, sumo.position.z);
          audio.splash();
        } else if (sumo.position.z > SHORE_Z && run) {
          burstDust(sumo.position.x, gy, sumo.position.z, 3, 1.2);
        }
      }
    } else {
      // ---- shiko stomp timeline
      stomp.t += dt / 1.25;
      var s = stomp.t;
      var lift = easeOut(seg(s, 0, 0.32)) - easeIn(seg(s, 0.46, 0.56));
      var squat = easeOut(seg(s, 0.5, 0.62)) * (1 - easeOut(seg(s, 0.68, 1)));
      R.legR.hip.rotation.z = -1.25 * lift - 0.14;
      R.legR.hip.rotation.x = 0;
      R.legR.knee.rotation.x = 1.15 * lift;
      R.legL.hip.rotation.z = 0.14 + 0.1 * lift;
      R.legL.knee.rotation.x = 0.15 * lift;
      R.hips.rotation.z = 0.3 * lift;
      R.hips.position.y = 1.18 - 0.34 * squat + 0.06 * lift;
      R.armL.sh.rotation.z = 0.62 + 1.5 * lift;
      R.armR.sh.rotation.z = -0.62 - 1.5 * lift;
      R.armL.sh.rotation.x = 0;
      R.armR.sh.rotation.x = 0;
      R.head.rotation.x = -0.15 * lift;
      if (s > 0.56 && !stompImpactDone) {
        stompImpactDone = true;
        shake = 0.55;
        audio.thump();
        if (inWater) {
          spawnRipple(sumo.position.x, sumo.position.z);
          spawnRipple(sumo.position.x + 0.8, sumo.position.z + 0.4);
          audio.splash();
        } else {
          burstDust(sumo.position.x + Math.sin(facing + 0.4), gy, sumo.position.z + Math.cos(facing + 0.4), 9, 2.6);
        }
      }
      if (s >= 1) { stomp.t = -1; stompImpactDone = false; }
    }

    // aloha wave overrides the right arm
    if (alohaT >= 0) {
      alohaT += dt / 1.1;
      var wv = Math.sin(Math.min(1, alohaT) * Math.PI);
      R.armR.sh.rotation.z = -0.62 - 2.2 * wv;
      R.armR.el.rotation.x = -0.3 - Math.sin(alohaT * 18) * 0.35 * wv;
      if (alohaT >= 1) alohaT = -1;
    }

    // ---- camera
    var targetY = sumo.position.y + 2.6;
    var cx = sumo.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    var cz = sumo.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    var cy = targetY + Math.sin(camPitch) * camDist;
    var minY = groundY(cx, cz) + 0.6;
    if (cy < minY) cy = minY;
    if (cy < SEA_LEVEL + 0.5) cy = SEA_LEVEL + 0.5;
    if (camSnap) {
      camPos.set(cx, cy, cz);
      camSnap = false;
    }
    camPos.x += (cx - camPos.x) * Math.min(1, dt * 7);
    camPos.y += (cy - camPos.y) * Math.min(1, dt * 7);
    camPos.z += (cz - camPos.z) * Math.min(1, dt * 7);
    camera.position.copy(camPos);
    if (shake > 0.005) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
      shake *= Math.pow(0.0018, dt);
    }
    camera.lookAt(sumo.position.x, targetY, sumo.position.z);

    // sun + shadow frustum follow the player so shadows stay crisp
    sun.position.copy(sumo.position).addScaledVector(sunDir, 260);
    sun.target.position.copy(sumo.position);

    // ---- world life
    water.material.uniforms.time.value += dt * 0.75;
    for (var fi = 0; fi < foamStrips.length; fi++) {
      var fs = foamStrips[fi];
      var ph = t * 0.5 + fs.userData.phase;
      fs.position.z = WATERLINE_Z + 2 + Math.sin(ph) * 2.6;
      fs.material.opacity = 0.42 + 0.34 * Math.max(0, Math.sin(ph + 0.9));
      fs.material.map.offset.x = t * 0.004 * (fi ? -1 : 1);
    }
    for (var pi = 0; pi < palms.length; pi++) {
      var pu = palms[pi].userData;
      pu.crown.rotation.x = Math.sin(t * 1.1 + pu.phase) * 0.035;
      pu.crown.rotation.z = Math.cos(t * 0.9 + pu.phase) * 0.045;
    }
    for (var ti = 0; ti < torches.length; ti++) {
      var to = torches[ti];
      var fl = 0.8 + 0.28 * Math.sin(t * 13 + to.phase) + 0.18 * Math.sin(t * 29 + to.phase * 2);
      to.flame.scale.set(0.75 * fl, 1.2 * fl, 1);
      to.flame.material.opacity = 0.75 + 0.25 * Math.sin(t * 17 + to.phase);
      if (to.light) to.light.intensity = 0.9 * fl;
    }
    for (var bi = 0; bi < birds.length; bi++) {
      var b = birds[bi], u = b.userData;
      var ba = t * u.speed + u.ph;
      b.position.set(u.cx + Math.cos(ba) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 3, u.cz + Math.sin(ba) * u.r);
      b.rotation.y = -ba;
      var flap = Math.sin(t * 9 + u.ph) * 0.55;
      u.wl.rotation.z = flap;
      u.wr.rotation.z = -flap;
    }
    for (var ci2 = 0; ci2 < clouds.length; ci2++) {
      clouds[ci2].position.x += clouds[ci2].userData.speed * dt;
      if (clouds[ci2].position.x > 1400) clouds[ci2].position.x = -1400;
    }
    for (var di = 0; di < dust.length; di++) {
      var dd = dust[di];
      if (dd.life <= 0) continue;
      dd.life -= dt;
      if (dd.life <= 0) { dd.sp.visible = false; continue; }
      dd.sp.position.x += dd.vx * dt;
      dd.sp.position.y += dd.vy * dt;
      dd.sp.position.z += dd.vz * dt;
      dd.vy -= 1.4 * dt;
      var lf = dd.life / dd.maxLife;
      dd.sp.material.opacity = lf * 0.8;
      var sc = 0.6 + (1 - lf) * 2.2;
      dd.sp.scale.set(sc, sc, 1);
    }
    for (var ri = 0; ri < ripples.length; ri++) {
      var rp = ripples[ri];
      if (rp.life <= 0) continue;
      rp.life -= dt * 0.9;
      if (rp.life <= 0) { rp.m.visible = false; continue; }
      var sc2 = 1 + (1 - rp.life) * 4.5;
      rp.m.scale.set(sc2, sc2, 1);
      rp.m.material.opacity = rp.life * 0.55;
    }

    // ---- ui + audio
    updateZone();
    var seaProx = Math.max(0, Math.min(1, (sumo.position.z - 20) / 55));
    audio.update(t, dt, seaProx);

    renderer.render(scene, camera);
  }
  animate();

  // debug hooks for automated screenshots (harmless in normal play)
  window.__game = {
    start: start,
    _pos: function () {
      return { x: +sumo.position.x.toFixed(2), y: +sumo.position.y.toFixed(2), z: +sumo.position.z.toFixed(2) };
    },
    _fx: function () {
      var n = 0;
      for (var i = 0; i < dust.length; i++) if (dust[i].life > 0) n++;
      return { dust: n, stompT: stomp.t, shake: +shake.toFixed(3) };
    },
    tp: function (x, z, yaw) {
      sumo.position.x = x; sumo.position.z = z;
      if (yaw !== undefined) { facing = yaw; sumo.rotation.y = yaw; }
    },
    cam: function (yaw, pitch, dist) {
      camYaw = yaw; camPitch = pitch;
      if (dist) camDist = dist;
      camSnap = true;
    },
    stomp: triggerStomp
  };
})();
