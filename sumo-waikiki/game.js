/* ============================================================================
   ALOHA SUMO — A Yokozuna's Vacation  ·  Waikiki Village Resort, Oʻahu
   A fully procedural 3D life-sim. No downloads, no build step, no assets:
   every texture is painted at runtime onto canvases, every mesh is generated.
   World axes: +X = east (toward Diamond Head), +Z = south (toward the ocean).

   >>> ROSTER — edit names here. Sumo rosters change; these are best-effort.
   ============================================================================ */
(function () {
  "use strict";

  var ROSTER = {
    player: { name: "Hōshōryū", rank: "Yokozuna", stable: "Tatsunami" },
    master: { name: "Futagoyama Oyakata", rank: "ex-Ōzeki Miyabiyama" },
    // Futagoyama-beya — edit/extend to match the current heya roster:
    futagoyama: [
      { name: "Yoshii", rank: "Maegashira", skin: 0xc98a52, scale: 0.96, belly: 0.95,
        line: "Oyakata brought the whole heya to Hawaiʻi — but keiko comes first, beach or no beach!" },
      { name: "Futagoyama deshi", rank: "Tsukebito", skin: 0xba7a45, scale: 0.9, belly: 0.9, deshi: true,
        line: "I carry the water, I rake the dohyō... one day I'll be the one they cheer for." },
      { name: "Futagoyama deshi", rank: "Tsukebito", skin: 0xd09a62, scale: 0.88, belly: 0.85, deshi: true,
        line: "The oyakata's chanko recipe? Secret. But today it has pineapple in it. Aloha style!" }
    ],
    // visiting makuuchi for the inter-stable beach practice (degeiko):
    makuuchi: [
      { name: "Ōnosato", rank: "Yokozuna", skin: 0xd9a06a, scale: 1.06, belly: 1.02,
        line: "The sand slows the tachi-ai. Perfect — power through it, and the dohyō feels easy." },
      { name: "Kotozakura", rank: "Ōzeki", skin: 0xcf9258, scale: 1.02, belly: 1.14,
        line: "Grandfather always said: train where it is hardest. Sand keiko it is." },
      { name: "Kirishima", rank: "Sekiwake", skin: 0xb87c48, scale: 0.99, belly: 0.82,
        line: "Lower body, lower body, lower body. Then poi bowls." },
      { name: "Abi", rank: "Maegashira", skin: 0xc98a52, scale: 1.05, belly: 0.78,
        line: "Tsuppari practice on the beach — my arms are twin palm trunks today!" },
      { name: "Ura", rank: "Maegashira", skin: 0xdba672, scale: 0.9, belly: 0.96, mawashi: 0xf2a8bc,
        line: "If someone throws me out of the ring here... I just land in paradise. Win-win." },
      { name: "Tobizaru", rank: "Maegashira", skin: 0xc08048, scale: 0.92, belly: 0.84,
        line: "Flying monkey, meet flying fish! Did you see me dodge Abi's slap? Did you?!" },
      { name: "Takerufuji", rank: "Maegashira", skin: 0xc88b50, scale: 1.0, belly: 0.98,
        line: "Charge first, think later. Works on clay, works on sand." },
      { name: "Atamifuji", rank: "Maegashira", skin: 0xe0ac74, scale: 1.02, belly: 1.1,
        line: "After practice, shave ice. Maybe two. Okay, three shave ice." },
      { name: "Takayasu", rank: "Maegashira", skin: 0xa86e3e, scale: 1.01, belly: 1.0,
        line: "Thirty bouts of moshi-ai under this sun... this is real training." },
      { name: "Wakatakakage", rank: "Maegashira", skin: 0xbd8149, scale: 0.95, belly: 0.86,
        line: "My brothers will be jealous of this view. Don't tell them about the pool." }
    ],
    guests: [
      { name: "Susan", from: "Ohio", line: "Honey, that gentleman is ENORMOUS and so polite! Aloha!" },
      { name: "Dave", from: "honeymoon", line: "We watched the practice all morning. Better than TV. My wife loves Ura." },
      { name: "Mele", from: "Kailua", line: "E komo mai! The yokozuna staying at OUR resort? Chee-hoo!" },
      { name: "Kai", from: "surf instructor", line: "Braddah, you'd be unreal on a longboard. Tandem? I'll paddle. Maybe." },
      { name: "Noriko", from: "Osaka", line: "I flew here to escape sumo news and the WHOLE makuuchi is on the beach?! ...Autograph please." },
      { name: "Pierre", from: "Paris", line: "Magnifique! The footwork! The sand! I am moved to tears. Also sunburned." },
      { name: "Keanu", from: "Waimānalo", line: "The torches come on at golden hour. Best time for hula. You dance, big guy?" },
      { name: "Lani", from: "bartender", line: "One POG juice for the yokozuna! On the house — you stomped, the coconuts fell, saved me a climb." }
    ]
  };

  // ------------------------------------------------------------------ boot
  var canvas = document.getElementById("c");
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    document.getElementById("err").style.display = "flex";
    return;
  }
  var VISUAL = {
    exposure: 0.88,
    fogColor: 0xe6d8bf,
    fogNear: 340,
    fogFar: 1850,
    sunColor: 0xffd49a,
    sunIntensity: 1.55,
    hemiSky: 0xc9e6ff,
    hemiGround: 0x9b7644,
    hemiIntensity: 0.62,
    ambientColor: 0x253653,
    ambientIntensity: 0.54
  };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = VISUAL.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(VISUAL.fogColor, VISUAL.fogNear, VISUAL.fogFar);

  var camera = new THREE.PerspectiveCamera(57, window.innerWidth / window.innerHeight, 0.3, 14000);

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ------------------------------------------------------------ world layout
  var SHORE_Z = 38;          // where the resort lawn gives way to sand
  var SEA_LEVEL = -1.0;      // world Y of the ocean surface
  var WATERLINE_Z = 76.5;    // where the sloping sand crosses SEA_LEVEL

  function beachProfile(z) {
    if (z <= SHORE_Z) return 0;
    var t = z - SHORE_Z;
    return -0.03 * t * t / (t + 6);
  }

  // beach dohyō for the inter-stable practice
  var DOHYO = { x: 52, z: 55, half: 4.6, topY: beachProfile(55) + 0.5 };

  function duneNoise(x, z) {
    if (z <= SHORE_Z + 1) return 0;
    var f = Math.min(1, (z - SHORE_Z - 1) / 8) * Math.max(0, 1 - (z - SHORE_Z) / 45);
    // flatten the dunes around the dohyō so the practice area sits clean
    var dd = Math.hypot(x - DOHYO.x, z - DOHYO.z);
    if (dd < 14) f *= Math.max(0, (dd - 8) / 6);
    return 0.09 * f * Math.sin(x * 0.21 + 1.7) * Math.sin(z * 0.33 + 0.4);
  }
  function onDohyo(x, z) {
    return Math.abs(x - DOHYO.x) < DOHYO.half && Math.abs(z - DOHYO.z) < DOHYO.half;
  }
  function groundY(x, z) {
    if (onDohyo(x, z)) return DOHYO.topY;
    return beachProfile(z) + duneNoise(x, z);
  }
  // terrain height ignoring the dohyō platform (for water-depth checks)
  function terrainY(x, z) { return beachProfile(z) + duneNoise(x, z); }

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
  function tintColor(hex, amt) {
    var c = new THREE.Color(hex);
    c.offsetHSL(0, 0, amt);
    return "#" + c.getHexString();
  }
  function detailTexture(base, specks, scale) {
    var t = canvasTexture(makeCanvas(128, 128, function (ctx, w, h) {
      ctx.fillStyle = tintColor(base, 0);
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, specks || 900, [tintColor(base, -0.09), tintColor(base, 0.07), "rgba(255,255,255,0.08)", "rgba(0,0,0,0.08)"], 0.45, 1.8);
    }));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(scale || 2, scale || 2);
    return t;
  }
  function texturedStandard(base, roughness, repeat, metalness) {
    return new THREE.MeshStandardMaterial({
      color: base, map: detailTexture(base, 700, repeat || 2),
      roughness: roughness, metalness: metalness || 0
    });
  }
  function grainNormalTexture(repeatX, repeatY, strength) {
    var N = 96, cv = document.createElement("canvas"), ctx, img, x, y;
    cv.width = N; cv.height = N; ctx = cv.getContext("2d");
    img = ctx.createImageData(N, N);
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var n = Math.sin(x * 0.7) * 0.4 + Math.sin(y * 0.53) * 0.35 + (Math.random() - 0.5) * strength;
      var i = (y * N + x) * 4;
      img.data[i] = 128 + n * 18;
      img.data[i + 1] = 128 + n * 14;
      img.data[i + 2] = 238;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
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

  // afternoon sun hanging to the southwest, out over the water
  var sunDir = new THREE.Vector3(-0.62, 0.5, 0.72).normalize();
  skyU.sunPosition.value.copy(sunDir);

  var sun = new THREE.DirectionalLight(VISUAL.sunColor, VISUAL.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 600;
  sun.shadow.camera.left = -85; sun.shadow.camera.right = 85;
  sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -85;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  var hemi = new THREE.HemisphereLight(VISUAL.hemiSky, VISUAL.hemiGround, VISUAL.hemiIntensity);
  scene.add(hemi);
  var fill = new THREE.AmbientLight(VISUAL.ambientColor, VISUAL.ambientIntensity);
  scene.add(fill);

  // soft lens glare that rides the sun direction
  var glare = (function () {
    var tex = canvasTexture(makeCanvas(128, 128, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,245,220,0.9)");
      g.addColorStop(0.25, "rgba(255,225,170,0.4)");
      g.addColorStop(1, "rgba(255,210,140,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0.42, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending, fog: false
    }));
    sp.material.toneMapped = false;
    sp.scale.set(420, 420, 1);
    sp.renderOrder = 50;
    scene.add(sp);
    return sp;
  })();

  // ------------------------------------------------------------------ ocean
  var waterNormals = (function () {
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
    textureWidth: 320,
    textureHeight: 320,
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

  // turquoise shallows hugging the shoreline
  (function () {
    var cv = makeCanvas(16, 256, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "rgba(64, 210, 205, 0.85)");
      g.addColorStop(0.45, "rgba(52, 185, 195, 0.45)");
      g.addColorStop(1.0, "rgba(30, 140, 165, 0.0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 34),
      new THREE.MeshBasicMaterial({ map: canvasTexture(cv), transparent: true, depthWrite: false, fog: true })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, SEA_LEVEL + 0.04, WATERLINE_Z + 13);
    m.renderOrder = 2;
    scene.add(m);

    // deep-water band: turquoise fades into rich Pacific blue toward the horizon
    var cv2 = makeCanvas(16, 256, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "rgba(24, 130, 150, 0.0)");
      g.addColorStop(0.22, "rgba(16, 100, 138, 0.5)");
      g.addColorStop(0.5, "rgba(12, 82, 122, 0.62)");
      g.addColorStop(0.82, "rgba(10, 70, 115, 0.5)");
      g.addColorStop(1.0, "rgba(10, 65, 110, 0.0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    var deep = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 460),
      new THREE.MeshBasicMaterial({ map: canvasTexture(cv2), transparent: true, depthWrite: false, fog: true })
    );
    deep.rotation.x = -Math.PI / 2;
    deep.position.set(0, SEA_LEVEL + 0.03, WATERLINE_Z + 270);
    deep.renderOrder = 1;
    scene.add(deep);
  })();

  // breaking surf foam — two offset animated strips at the waterline
  var foamStrips = [];
  var foamTex;
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
    foamTex = canvasTexture(cv);
    foamTex.wrapS = THREE.RepeatWrapping;
    for (var k = 0; k < 2; k++) {
      var mat = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, fog: true });
      var strip = new THREE.Mesh(new THREE.PlaneGeometry(560, 8), mat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(0, SEA_LEVEL + 0.09 + k * 0.02, WATERLINE_Z + 2);
      strip.renderOrder = 3;
      strip.userData.phase = k * 2.4;
      scene.add(strip);
      foamStrips.push(strip);
    }
  })();

  // incoming swell sets: soft white crest lines rolling toward the beach
  var swells = [];
  (function () {
    var cv = makeCanvas(512, 32, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(240,252,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 500; i++) {
        ctx.fillStyle = "rgba(255,255,255," + (0.1 + Math.random() * 0.3).toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(Math.random() * w, h / 2 + (Math.random() - 0.5) * h * 0.5, 0.6 + Math.random() * 1.8, 0, 6.283);
        ctx.fill();
      }
    });
    var tex = canvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    for (var i = 0; i < 3; i++) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(620, 9),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, fog: true }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, SEA_LEVEL + 0.06, 300);
      m.renderOrder = 2;
      m.userData = { t0: i * 7 };
      scene.add(m);
      swells.push(m);
    }
  })();

  // ---------------------------------------------------------------- terrain
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

    pavedRect(-7, -80, 7, SHORE_Z + 0.5, "#c9b389", 2.4);
    pavedRect(-56, -2, 56, 8, "#c9b389", 2.4);

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
    ctx.globalAlpha = 0.22;
    drawFlower(ctx, W.px(0), W.pz(14), 4.5 * W.sx, "rgba(170,80,80,0.9)", "rgba(200,160,80,0.95)");
    ctx.globalAlpha = 1;

    pavedRect(-46, -6, -16, 16, "#d9c8a6", 1.6);
    pavedRect(-20, -34, 20, -14, "#c9b389", 2.4);
    speckle(ctx, 2048, 1024, 9000, ["#00000022", "#ffffff14"], 0.6, 1.8);

    var geo = worldPlane(-130, -80, 130, SHORE_Z + 0.5, 64, 32, function () { return 0; });
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: W.texture(), roughness: 0.92,
      normalMap: grainNormalTexture(48, 22, 1.4), normalScale: new THREE.Vector2(0.09, 0.09)
    }));
    mesh.position.y = 0.02;
    mesh.receiveShadow = true;
    scene.add(mesh);
  })();

  // the beach: sloping sand with a wet band at the waterline
  (function () {
    var W = new WorldCanvas(3072, 768, -260, SHORE_Z, 260, 130);
    var ctx = W.ctx;
    ctx.fillStyle = "#e6d3a3";
    ctx.fillRect(0, 0, 3072, 768);
    speckle(ctx, 3072, 768, 46000, ["#dcc793", "#f0e0b5", "#cdb887", "#f6ead0"], 0.7, 2.6);
    var g = ctx.createLinearGradient(0, W.pz(WATERLINE_Z - 9), 0, W.pz(WATERLINE_Z + 14));
    g.addColorStop(0, "rgba(140,110,70,0)");
    g.addColorStop(0.45, "rgba(120,95,62,0.55)");
    g.addColorStop(1, "rgba(105,86,58,0.75)");
    ctx.fillStyle = g;
    ctx.fillRect(0, W.pz(WATERLINE_Z - 9), 3072, W.pz(130) - W.pz(WATERLINE_Z - 9));
    speckle(ctx, 3072, 768, 6000, ["#00000018", "#ffffff10"], 0.6, 1.8);

    // wet-sand sheen: a grayscale roughness map sharing the same UVs, so the
    // strip near the waterline reads glossy/damp instead of flat matte sand
    var rW = new WorldCanvas(768, 192, -260, SHORE_Z, 260, 130);
    var rctx = rW.ctx;
    rctx.fillStyle = "#f0f0f0";
    rctx.fillRect(0, 0, 768, 192);
    var rg = rctx.createLinearGradient(0, rW.pz(WATERLINE_Z - 9), 0, rW.pz(WATERLINE_Z + 12));
    rg.addColorStop(0, "#f0f0f0");
    rg.addColorStop(0.55, "#5c5c5c");
    rg.addColorStop(1, "#3a3a3a");
    rctx.fillStyle = rg;
    rctx.fillRect(0, rW.pz(WATERLINE_Z - 9), 768, rW.pz(130) - rW.pz(WATERLINE_Z - 9));

    // fine tileable grain normal map (independent high-frequency repeat)
    var grainTex = (function () {
      var N = 128, h = new Float32Array(N * N), comps = [];
      for (var k = 0; k < 5; k++) {
        comps.push({ fx: 3 + ((Math.random() * 9) | 0), fy: 3 + ((Math.random() * 9) | 0), ph: Math.random() * 6.283 });
      }
      var x, y;
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
        var v = 0;
        for (var c = 0; c < comps.length; c++) {
          var cc = comps[c];
          v += Math.sin((cc.fx * x + cc.fy * y) * 6.283 / N + cc.ph) / comps.length;
        }
        v += (Math.random() - 0.5) * 0.5;
        h[y * N + x] = v;
      }
      var cv = document.createElement("canvas");
      cv.width = N; cv.height = N;
      var cx2 = cv.getContext("2d");
      var img = cx2.createImageData(N, N);
      var s = 1.4;
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
        var xp = (x + 1) % N, xm = (x + N - 1) % N, yp = (y + 1) % N, ym = (y + N - 1) % N;
        var dx = (h[y * N + xp] - h[y * N + xm]) * s, dy = (h[yp * N + x] - h[ym * N + x]) * s;
        var inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
        var i = (y * N + x) * 4;
        img.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
        img.data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
        img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
      cx2.putImageData(img, 0, 0);
      var t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(70, 16);
      return t;
    })();

    var geo = worldPlane(-260, SHORE_Z, 260, 130, 150, 46, terrainY);
    var mat = new THREE.MeshStandardMaterial({
      map: W.texture(), roughnessMap: rW.texture(), roughness: 1,
      normalMap: grainTex, normalScale: new THREE.Vector2(0.5, 0.5)
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // a scatter of shells and pebbles along the wet sand — cheap shared geometry
    (function () {
      var shellGeo = new THREE.ConeGeometry(0.06, 0.03, 7, 1, true);
      var pebbleGeo = new THREE.DodecahedronGeometry(0.045, 0);
      var shellMat = new THREE.MeshStandardMaterial({ color: 0xf2e4c8, roughness: 0.55 });
      var pebbleMats = [
        new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: 0x5c5248, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 0.75 })
      ];
      for (var i = 0; i < 46; i++) {
        var x = -110 + Math.random() * 220;
        var z = WATERLINE_Z - 10 + Math.random() * 20;
        var isShell = Math.random() < 0.4;
        var m = new THREE.Mesh(isShell ? shellGeo : pebbleGeo,
          isShell ? shellMat : pebbleMats[(Math.random() * 3) | 0]);
        m.position.set(x, terrainY(x, z) + 0.01, z);
        m.rotation.set(Math.random() * 0.6, Math.random() * 6.283, Math.random() * 0.6);
        var sc = 0.7 + Math.random() * 1.1;
        m.scale.set(sc, sc * (isShell ? 0.6 : 1), sc);
        m.castShadow = false;
        m.receiveShadow = true;
        scene.add(m);
      }
    })();
  })();

  // ------------------------------------------------------------ Diamond Head
  // rebuilt to match the true Waikiki profile: a long ridge rising from the
  // left to the famous 232 m peak with the steep cliff dropping to the sea,
  // crater bowl hidden behind the rim.
  (function () {
    var base = new THREE.Mesh(
      new THREE.CircleGeometry(460, 40),
      new THREE.MeshStandardMaterial({ color: 0x55663a, roughness: 1 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(900, -0.4, 330);
    scene.add(base);

    var mottle = canvasTexture(makeCanvas(512, 512, function (ctx, w, h) {
      ctx.fillStyle = "#8b8058";
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 9000, ["#6d7a45", "#7d7048", "#98865e", "#5c6b3c", "#a3906a"], 2, 9);
      // erosion striations running down the flanks
      for (var i = 0; i < 240; i++) {
        var x = Math.random() * w;
        ctx.strokeStyle = "rgba(70,60,40," + (0.1 + Math.random() * 0.22).toFixed(2) + ")";
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, Math.random() * h * 0.4);
        ctx.lineTo(x + (Math.random() - 0.5) * 40, h);
        ctx.stroke();
      }
    }));
    mottle.wrapS = mottle.wrapT = THREE.RepeatWrapping;
    mottle.repeat.set(3, 3);

    var seg = 96;
    var geo = new THREE.PlaneGeometry(1, 1, seg, seg);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var lowC = new THREE.Color(0x6a7a48), midC = new THREE.Color(0x93875c), hiC = new THREE.Color(0xa89468);
    function smooth(a, b, x) {
      var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }
    var maxH = 155;
    for (var i = 0; i < pos.count; i++) {
      var u = pos.getX(i) * 2, v = pos.getY(i) * 2;   // -1..1; u = along ridge
      // ridge line height profile along u (west -1 ... east +1):
      var ridge =
        0.14 * smooth(-1.0, -0.55, u) +               // toe rising from the west
        0.38 * smooth(-0.75, -0.2, u) +               // long shoulder
        0.48 * smooth(-0.05, 0.32, u);                // final climb to the summit
      ridge *= 1 - smooth(0.42, 0.85, u) * 0.96;      // steep sea-cliff drop east of the peak
      // across-ridge falloff, wider at the west end (crater massif behind)
      var width = 0.55 + 0.25 * (1 - (u + 1) / 2);
      var f = Math.exp(-(v * v) / (2 * width * width));
      var hgt = maxH * ridge * f;
      // crater bowl carved behind (north of) the rim
      hgt -= maxH * 0.22 * Math.exp(-((u + 0.15) * (u + 0.15)) / 0.18 - ((v + 0.55) * (v + 0.55)) / 0.1);
      hgt = Math.max(0, hgt);
      hgt *= 1 + 0.032 * Math.sin(u * 40 + v * 31) + 0.05 * Math.sin(u * 13 + 2) + 0.025 * Math.sin(u * 90 - v * 70);
      var t2 = Math.min(1, hgt / maxH * 1.5);
      var c = t2 < 0.5 ? lowC.clone().lerp(midC, t2 * 2) : midC.clone().lerp(hiC, (t2 - 0.5) * 2);
      var j = 0.94 + Math.random() * 0.12;
      colors[i * 3] = c.r * j; colors[i * 3 + 1] = c.g * j; colors[i * 3 + 2] = c.b * j;
      pos.setXYZ(i, pos.getX(i) * 880, pos.getY(i) * 620, hgt);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var dh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, map: mottle, roughness: 1
    }));
    dh.rotation.x = -Math.PI / 2;
    dh.rotation.z = 0.55;   // ridge runs roughly parallel to the coast
    dh.position.set(920, -1, 360);
    scene.add(dh);

    // Diamond Head lighthouse: tiny white tower at the foot of the sea cliff
    var lh = new THREE.Group();
    var towerM = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 });
    var t1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 17, 10), towerM);
    t1.position.y = 8.5;
    lh.add(t1);
    var t2 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 2.4, 10),
      new THREE.MeshStandardMaterial({ color: 0xb33c2e, roughness: 0.5 }));
    t2.position.y = 18;
    lh.add(t2);
    lh.position.set(688, 0, 470);
    scene.add(lh);
  })();

  // Honolulu skyline: hotel towers curving along the coast toward Diamond Head,
  // far enough out that the haze reads them as the real Waikiki backdrop
  (function () {
    var winTex = canvasTexture(makeCanvas(64, 256, function (ctx, w, h) {
      ctx.fillStyle = "#c5ced6";
      ctx.fillRect(0, 0, w, h);
      for (var x = 4; x < w; x += 10) {
        ctx.fillStyle = "rgba(90,110,130,0.55)";
        ctx.fillRect(x, 0, 5, h);
      }
      for (var y = 4; y < h; y += 8) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(0, y, w, 2);
      }
    }));
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    var mat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.85 });
    var mat2 = new THREE.MeshStandardMaterial({ map: winTex, color: 0xd8d2c4, roughness: 0.85 });
    // towers only to the west — eastward the coast opens into parkland so
    // Diamond Head stands unobstructed, just like the real Waikiki view
    var specs = [
      [-640, 315, 38, 88], [-720, 350, 44, 108], [-800, 390, 30, 74],
      [-885, 432, 40, 94], [-975, 476, 30, 66], [-560, 285, 30, 70]
    ];
    specs.forEach(function (s, i) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(s[2], s[3], s[2] * 0.7), i % 2 ? mat : mat2);
      m.position.set(s[0], s[3] / 2 - 1, s[1]);
      scene.add(m);
    });
    // Kapiolani-park green running east toward the Diamond Head headland
    var park = new THREE.Mesh(new THREE.PlaneGeometry(900, 130),
      new THREE.MeshStandardMaterial({ color: 0x4f6b38, roughness: 1 }));
    park.rotation.x = -Math.PI / 2;
    park.rotation.z = -0.42;
    park.position.set(600, -0.3, 280);
    scene.add(park);
    // sandy strip of distant shoreline under the west towers
    var arc2 = new THREE.Mesh(new THREE.PlaneGeometry(900, 120),
      new THREE.MeshStandardMaterial({ color: 0xdcc793, roughness: 1 }));
    arc2.rotation.x = -Math.PI / 2;
    arc2.rotation.z = 0.48;
    arc2.position.set(-800, -0.35, 415);
    scene.add(arc2);
    // misty Koʻolau ridge far inland
    var ridge = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12),
      new THREE.MeshStandardMaterial({ color: 0x5a7256, roughness: 1 }));
    ridge.scale.set(1500, 170, 300);
    ridge.position.set(200, -30, -900);
    scene.add(ridge);
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
      m.position.set(s[0], terrainY(s[0], s[1]) + s[2] * 0.18, s[1]);
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

    function crownGeometry(nFronds, len) {
      var positions = [], uvs = [], indices = [], vi = 0;
      for (var f = 0; f < nFronds; f++) {
        var yaw = (f / nFronds) * 6.283 + Math.random() * 0.35;
        var droop0 = 0.5 + Math.random() * 0.25;
        var droopRate = 1.5 + Math.random() * 0.7;
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
      tree.position.set(x, terrainY(x, z), z);
      tree.rotation.y = Math.random() * 6.283;
      tree.userData = { crown: crown, phase: Math.random() * 6.283, x: x, z: z };
      scene.add(tree);
      palms.push(tree);
      return tree;
    }

    var spots = [
      [-10, 34, 8], [10, 33, 9], [-11, 22, 7.5], [11, 21, 8.5],
      [-10, 2, 8], [10, 3, 9], [-12, -12, 7], [12, -13, 8],
      [-24, 14, 9], [24, 13, 8], [-20, 26, 7], [21, 27, 8.2],
      [-50, 10, 8.5], [-52, -4, 7.5], [-14, -2, 7], [-48, 20, 9],
      [40, 8, 8], [52, 14, 9], [46, 26, 7.4], [62, 4, 8],
      [-30, 41, 9.5], [-58, 43, 8], [30, 42, 9], [66, 43, 8.5], [84, 42, 7.6], [-84, 41, 8.2],
      [-36, -28, 7], [36, -27, 7.5], [70, 30, 8.8], [-70, 32, 8.4]
    ];
    spots.forEach(function (s) { makePalm(s[0], s[1], s[2]); });
  })();

  // ------------------------------------------------------------- the resort
  var colliders = [];
  function addCollider(x, z, hx, hz) { colliders.push({ x: x, z: z, hx: hx, hz: hz }); }
  var loungers = [];   // player/NPC-usable: {x, z, ry, taken}

  (function () {
    function facadeTexture(floors, cols, tint) {
      return canvasTexture(makeCanvas(512, 1024, function (ctx, w, h) {
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, w, h);
        var fh = h / floors, cw = w / cols;
        for (var f = 0; f < floors; f++) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(0, f * fh + fh * 0.82, w, fh * 0.10);
          for (var c = 0; c < cols; c++) {
            var lit = Math.random();
            var glass = lit > 0.93 ? "#ffd98a" : (lit > 0.5 ? "#9fc4d8" : "#7ba9c2");
            ctx.fillStyle = glass;
            ctx.fillRect(c * cw + cw * 0.14, f * fh + fh * 0.16, cw * 0.72, fh * 0.6);
            ctx.fillStyle = "rgba(255,255,255,0.25)";
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

    // open-air lobby hale
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
    var thatchMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 1 });
    var roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), thatchMat);
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

    // welcome arch over the promenade
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

    // swimming pool (no collider — you can swim in it)
    var pool = new THREE.Group();
    var pw = 22, pd = 12;
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
    var POOL = { x: -31, z: 5, hx: pw / 2, hz: pd / 2, y: 0.07 };
    window.__POOL = POOL; // referenced by the swim logic below

    // loungers + umbrellas
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
      g.position.set(x, terrainY(x, z), z);
      g.rotation.y = ry;
      scene.add(g);
      loungers.push({ x: x, z: z, ry: ry, taken: false });
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
      g.position.set(x, terrainY(x, z), z);
      g.rotation.y = Math.random() * 6.28;
      scene.add(g);
    }
    lounger(-42, -3.5, 0); lounger(-39, -3.5, 0); lounger(-36, -3.5, 0);
    lounger(-24, -3.5, 0); lounger(-21, -3.5, 0);
    umbrella(-40.5, -5); umbrella(-22.5, -5);
    lounger(-18, 52, 3.14); lounger(-15, 52, 3.14); lounger(18, 53, 3.14); lounger(21, 53, 3.14);
    lounger(-40, 55, 3.4); lounger(-44, 56, 2.9);
    umbrella(-16.5, 50); umbrella(19.5, 51); umbrella(-41, 53);

    // surfboards standing in the sand
    var boards = [[30, 46, 0xff5e8a], [31.2, 46.3, 0x39c1e0], [-33, 47, 0xffd166]];
    boards.forEach(function (b, i) {
      var board = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshStandardMaterial({ color: b[2], roughness: 0.35 }));
      board.scale.set(0.34, 1.55, 0.09);
      board.position.set(b[0], terrainY(b[0], b[1]) + 1.35, b[1]);
      board.rotation.z = (i - 1) * 0.14;
      board.rotation.y = 0.4 * (i - 1);
      board.castShadow = true;
      scene.add(board);
    });

    // tiki bar on the west lawn edge
    var bar = new THREE.Group();
    var counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.15, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x8a5c30, roughness: 0.85 }));
    counter.position.y = 0.575;
    counter.castShadow = true;
    bar.add(counter);
    [-2.6, 2.6].forEach(function (px) {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 7),
        new THREE.MeshStandardMaterial({ color: 0x6e4a28 }));
      pole.position.set(px, 1.7, -0.4);
      bar.add(pole);
    });
    var barRoof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 1.7, 8), thatchMat);
    barRoof.position.set(0, 4.1, -0.4);
    barRoof.castShadow = true;
    bar.add(barRoof);
    for (var bi2 = 0; bi2 < 6; bi2++) {
      var bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.42, 6),
        new THREE.MeshStandardMaterial({
          color: [0xff8f4a, 0xffd166, 0x9be15d, 0xff5e8a, 0x39c1e0, 0xc98cff][bi2], roughness: 0.3
        }));
      bottle.position.set(-1.6 + bi2 * 0.62, 1.4, -0.9);
      bar.add(bottle);
    }
    bar.position.set(-55, 0.02, 33);
    bar.rotation.y = 0.35;
    scene.add(bar);
    addCollider(-55, 33, 3.4, 1.4);

    // shave ice cart by the plaza
    var cart = new THREE.Group();
    var cbody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 0.6 }));
    cbody.position.y = 1.0;
    cbody.castShadow = true;
    cart.add(cbody);
    [[-0.7, 0.62], [0.7, 0.62]].forEach(function (wpos) {
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0x444a55 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wpos[0], 0.34, wpos[1] * 0);
      cart.add(wheel);
    });
    var scoop = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.66, 10),
      new THREE.MeshStandardMaterial({ color: 0xff9ad5, roughness: 0.4 }));
    scoop.position.set(-0.5, 2.0, 0);
    cart.add(scoop);
    var scoop2 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.66, 10),
      new THREE.MeshStandardMaterial({ color: 0x9ad5ff, roughness: 0.4 }));
    scoop2.position.set(0.5, 2.0, 0);
    cart.add(scoop2);
    var cartUmb = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xff6ea0, side: THREE.DoubleSide, roughness: 0.8 }));
    cartUmb.position.set(0, 3.0, 0);
    cart.add(cartUmb);
    var cartPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9d2c0 }));
    cartPole.position.set(0, 1.9, 0);
    cart.add(cartPole);
    cart.position.set(9, 0.02, 24);
    cart.rotation.y = -0.5;
    scene.add(cart);
    addCollider(9, 24, 1.5, 1.0);
  })();

  // ------------------------------------------------------------- the dohyō
  (function () {
    var topCv = makeCanvas(512, 512, function (ctx, w, h) {
      ctx.fillStyle = "#c8a06a";       // packed clay-sand
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 7000, ["#b8905c", "#d8b078", "#c09a62"], 0.8, 2.6);
      // brushed circles
      ctx.strokeStyle = "rgba(150,110,60,0.35)";
      for (var r = 30; r < 250; r += 14) {
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, 6.283); ctx.stroke();
      }
      // the ring (shōbu-dawara circle) and shikiri lines
      ctx.strokeStyle = "rgba(255,250,235,0.9)";
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.36, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(255,250,235,0.9)";
      ctx.fillRect(w / 2 - 40, h / 2 - 3.5, 30, 7);
      ctx.fillRect(w / 2 + 10, h / 2 - 3.5, 30, 7);
    });
    var platMat = new THREE.MeshStandardMaterial({ color: 0xb8905c, roughness: 1 });
    var topMat = new THREE.MeshStandardMaterial({ map: canvasTexture(topCv), roughness: 0.95 });
    var plat = new THREE.Mesh(new THREE.BoxGeometry(DOHYO.half * 2, 0.5, DOHYO.half * 2),
      [platMat, platMat, topMat, platMat, platMat, platMat]);
    var baseY = terrainY(DOHYO.x, DOHYO.z);
    plat.position.set(DOHYO.x, baseY + 0.25, DOHYO.z);
    plat.castShadow = true;
    plat.receiveShadow = true;
    scene.add(plat);

    // straw bales ring
    var bale = new THREE.Mesh(new THREE.TorusGeometry(3.32, 0.085, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xd9c088, roughness: 0.95 }));
    bale.rotation.x = -Math.PI / 2;
    bale.position.set(DOHYO.x, DOHYO.topY + 0.03, DOHYO.z);
    scene.add(bale);

    // chanko-nabe station: pot, stove, bowls, bench
    var pot = new THREE.Group();
    var stove = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.8 }));
    stove.position.y = 0.25;
    pot.add(stove);
    var kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 0.5, 14),
      new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: 0.4, metalness: 0.5 }));
    kettle.position.y = 0.78;
    kettle.castShadow = true;
    pot.add(kettle);
    var broth = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14),
      new THREE.MeshStandardMaterial({ color: 0xd8a75e, roughness: 0.3 }));
    broth.rotation.x = -Math.PI / 2;
    broth.position.y = 1.04;
    pot.add(broth);
    for (var b3 = 0; b3 < 4; b3++) {
      var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5 }));
      bowl.position.set(0.9 + (b3 % 2) * 0.32, 0.56 + Math.floor(b3 / 2) * 0.13, -0.3 + (b3 % 2) * 0.2);
      pot.add(bowl);
    }
    var bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x8a5c30, roughness: 0.9 }));
    bench.position.set(1.9, 0.45, 1.2);
    bench.castShadow = true;
    pot.add(bench);
    pot.position.set(60, terrainY(60, 48.5), 48.5);
    scene.add(pot);
    addCollider(60, 48.5, 1.0, 1.0);
    window.__CHANKO = { x: 60, z: 48.5 };
  })();

  // ------------------------------------------------------------- sky extras
  var clouds = [];
  (function () {
    // trade-wind cumulus: flat bases, puffy tops
    var tex = canvasTexture(makeCanvas(256, 128, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      var baseY = h * 0.72;
      for (var i = 0; i < 30; i++) {
        var x = w * 0.5 + (Math.random() - 0.5) * w * 0.72;
        var r = 12 + Math.random() * 24;
        var y = baseY - Math.abs((Math.random() - 0.5)) * h * 0.52 - r * 0.3;
        if (y > baseY - r * 0.4) y = baseY - r * 0.4;
        var g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, "rgba(255,253,248,0.75)");
        g.addColorStop(0.8, "rgba(252,248,240,0.28)");
        g.addColorStop(1, "rgba(252,248,240,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      // shave the bottom flat
      ctx.clearRect(0, baseY + 6, w, h - baseY - 6);
      var fade = ctx.createLinearGradient(0, baseY - 8, 0, baseY + 6);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = fade;
      ctx.fillRect(0, baseY - 8, w, 14);
      ctx.globalCompositeOperation = "source-over";
    }));
    for (var i = 0; i < 12; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
      sp.material.toneMapped = false;
      sp.material.opacity = 0.5 + Math.random() * 0.25;
      var a = Math.random() * 6.283, d = 950 + Math.random() * 550;
      sp.position.set(Math.cos(a) * d, 180 + Math.random() * 160, Math.sin(a) * d);
      var s = 240 + Math.random() * 160;
      sp.scale.set(s, s * 0.5, 1);
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
      g.position.set(x, terrainY(x, z), z);
      scene.add(g);
      torches.push({ flame: flame, light: light, phase: Math.random() * 20 });
    }
    torch(-8, 36, true); torch(8, 36, true);
    torch(-8, 18, true); torch(8, 18, false);
    torch(-8, 0, false); torch(8, 0, true);
    torch(-19, 10, false); torch(19, 9, false);
    torch(-30, 44, true); torch(30, 44, true);
  })();

  // ============================================================ PEOPLE RIGS
  function makeLabel(name, rank) {
    var cv = makeCanvas(512, 128, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = "800 46px 'Avenir Next', 'Segoe UI', sans-serif";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(10,20,35,0.85)";
      ctx.strokeText(name, w / 2, 58);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, w / 2, 58);
      if (rank) {
        ctx.font = "700 30px 'Avenir Next', 'Segoe UI', sans-serif";
        ctx.lineWidth = 6;
        ctx.strokeText(rank, w / 2, 100);
        ctx.fillStyle = "#ffd166";
        ctx.fillText(rank, w / 2, 100);
      }
    });
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: canvasTexture(cv), transparent: true, depthWrite: false
    }));
    sp.material.toneMapped = false;
    sp.scale.set(2.9, 0.72, 1);
    return sp;
  }

  function buildPerson(opts) {
    opts = opts || {};
    var scale = opts.scale || 1;
    var slim = !!opts.slim;
    var bellyF = opts.belly || 1, chestF = opts.chest || 1;
    var skin = texturedStandard(opts.skin || 0xc57f45, 0.58, 1.7);
    var skinD = texturedStandard(0x9c6234, 0.62, 1.6);
    var hairMat = texturedStandard(opts.hairColor || 0x14100e, 0.42, 1.2);
    var fabric = texturedStandard(opts.shirt || 0xff8f4a, 0.84, 2.8);
    var shorts = texturedStandard(opts.shorts || 0x3a6ea5, 0.82, 2.5);
    var mawashiMat = texturedStandard(opts.mawashi || 0xf0ead8, 0.78, 2.2);
    var isRikishi = opts.outfit === "rikishi";
    var isDress = opts.outfit === "dress";
    var isKimono = opts.outfit === "kimono";
    var torsoMat = isRikishi ? skin : fabric;
    var limbR = slim ? 0.6 : 1;

    var g = new THREE.Group();
    var rig = {};

    function orb(mat, r, sx, sy, sz) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
      m.scale.set(sx || 1, sy || 1, sz || 1);
      m.castShadow = true;
      return m;
    }

    var hips = new THREE.Group();
    hips.position.y = 1.18;
    g.add(hips);
    rig.hips = hips;

    var torso = new THREE.Group();
    hips.add(torso);
    rig.torso = torso;

    var belly = orb(torsoMat, 0.78, 1.14 * bellyF * (slim ? 0.62 : 1), 1.06, 1.04 * bellyF * (slim ? 0.7 : 1));
    belly.position.y = 0.45;
    torso.add(belly);
    rig.belly = belly;
    rig.bellyBase = belly.scale.clone();
    if (isRikishi) {
      var navel = orb(skinD, 0.05, 1, 1.4, 0.5);
      navel.castShadow = false; // tiny detail, not worth a shadow-pass draw call
      navel.position.set(0, 0.32, 0.78 * bellyF);
      torso.add(navel);
    }

    var chest = orb(torsoMat, 0.6, 1.22 * chestF * (slim ? 0.68 : 1), 0.92, 0.95 * (slim ? 0.72 : 1));
    chest.position.y = 0.98;
    torso.add(chest);
    rig.chest = chest;
    rig.chestBase = chest.scale.clone();
    if (isRikishi) {
      var pecL = orb(skin, 0.27, 1.1, 0.9, 0.62);
      pecL.castShadow = false;
      pecL.position.set(-0.28, 1.06, 0.44);
      torso.add(pecL);
      var pecR = pecL.clone();
      pecR.position.x = 0.28;
      torso.add(pecR);
    }

    // ---- outfit lower half
    if (isRikishi) {
      var belt = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.155, 12, 28), mawashiMat);
      belt.scale.set(1.06 * bellyF, 1, 0.98 * bellyF);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = 0.12;
      belt.castShadow = true;
      torso.add(belt);
      var knot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.22), mawashiMat);
      knot.position.set(0, 0.1, -0.9 * bellyF);
      torso.add(knot);
      if (opts.tsuna) {
        // the yokozuna's white rope, tied at the back, shide strips at the front
        var tsunaMat = texturedStandard(0xfaf6ea, 0.86, 2.4);
        var rope = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.115, 10, 30), tsunaMat);
        rope.scale.set(1.08 * bellyF, 1, 1.0 * bellyF);
        rope.rotation.x = Math.PI / 2;
        rope.position.y = 0.3;
        rope.castShadow = true;
        torso.add(rope);
        var loopL = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.07, 8, 12), tsunaMat);
        loopL.position.set(-0.18, 0.32, -0.95 * bellyF);
        loopL.rotation.y = 0.5;
        torso.add(loopL);
        var loopR = loopL.clone();
        loopR.position.x = 0.18;
        loopR.rotation.y = -0.5;
        torso.add(loopR);
        var shideTex = canvasTexture(makeCanvas(64, 128, function (ctx, w, h) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = "rgba(252,250,244,0.98)";
          // zigzag paper strip
          ctx.beginPath();
          ctx.moveTo(10, 0); ctx.lineTo(54, 0);
          ctx.lineTo(44, 34); ctx.lineTo(58, 34);
          ctx.lineTo(48, 72); ctx.lineTo(60, 72);
          ctx.lineTo(50, 118); ctx.lineTo(18, 118);
          ctx.lineTo(26, 76); ctx.lineTo(12, 76);
          ctx.lineTo(22, 36); ctx.lineTo(6, 36);
          ctx.closePath();
          ctx.fill();
        }));
        var shideMat = new THREE.MeshStandardMaterial({
          map: shideTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85
        });
        for (var sh2 = -2; sh2 <= 2; sh2++) {
          var strip = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.34), shideMat);
          var ang2 = sh2 * 0.34;
          strip.position.set(Math.sin(ang2) * 0.92 * bellyF, 0.1, Math.cos(ang2) * 0.95 * bellyF);
          strip.rotation.y = ang2;
          torso.add(strip);
        }
      }
    } else if (isDress) {
      var skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.85, 1.0, 12, 1, true), fabric);
      skirt.position.y = -0.32;
      skirt.castShadow = true;
      torso.add(skirt);
    } else if (isKimono) {
      var robe = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.95, 1.35, 12, 1, true), fabric);
      robe.position.y = -0.5;
      robe.castShadow = true;
      torso.add(robe);
      var obi = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8 }));
      obi.rotation.x = Math.PI / 2;
      obi.scale.set(1.02, 1, 0.95);
      obi.position.y = 0.18;
      torso.add(obi);
    }

    if (opts.lei) {
      var leiG = new THREE.Group();
      var leiCols = [0xff6ec7, 0xfff5ee, 0xffd166, 0xff477e];
      for (var li = 0; li < 26; li++) {
        var a2 = (li / 26) * 6.283;
        var fl = orb(new THREE.MeshStandardMaterial({ color: leiCols[li % 4], roughness: 0.75 }),
          0.085 + Math.random() * 0.03);
        fl.castShadow = false; // 26 tiny flowers per lei — skip the shadow pass
        fl.position.set(Math.sin(a2) * 0.56, Math.cos(a2) * 0.34, Math.cos(a2) * 0.28);
        leiG.add(fl);
      }
      leiG.position.set(0, 1.28, 0.34);
      leiG.rotation.x = 0.42;
      torso.add(leiG);
    }

    // ---- head
    var headP = new THREE.Group();
    headP.position.y = 1.52;
    torso.add(headP);
    rig.head = headP;
    var head = orb(skin, 0.4, 0.98, 1.06, 0.98);
    head.position.y = 0.12;
    headP.add(head);
    if (isRikishi) {
      var jowls = orb(skin, 0.24, 1.35, 0.72, 1.0);
      jowls.position.set(0, -0.1, 0.14);
      headP.add(jowls);
    }
    var earL = orb(skin, 0.09);
    earL.castShadow = false;
    earL.position.set(-0.38, 0.12, 0.02);
    headP.add(earL);
    var earR = earL.clone();
    earR.position.x = 0.38;
    headP.add(earR);

    var hair = opts.hair || "short";
    if (hair !== "bald") {
      var cap = orb(hairMat, 0.41, 1.0, hair === "gray" ? 0.55 : 0.72, 1.0);
      cap.position.y = hair === "gray" ? 0.34 : 0.3;
      headP.add(cap);
    }
    if (hair === "topknot") {
      var bun = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), hairMat);
      bun.rotation.x = Math.PI / 2 - 0.25;
      bun.position.set(0, 0.56, 0.1);
      headP.add(bun);
    }
    if (hair === "long") {
      var back = orb(hairMat, 0.3, 1.0, 1.3, 0.6);
      back.position.set(0, 0.02, -0.28);
      headP.add(back);
    }
    if (opts.hat === "straw") {
      var brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 14),
        new THREE.MeshStandardMaterial({ color: 0xd9c088, roughness: 0.9 }));
      brim.position.y = 0.42;
      headP.add(brim);
      var crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xd9c088, roughness: 0.9 }));
      crown.position.y = 0.52;
      headP.add(crown);
    }

    // face
    var dark = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.4 });
    if (opts.sunglasses) {
      var lensL = orb(dark, 0.13, 1, 0.82, 0.35);
      lensL.position.set(-0.16, 0.14, 0.36);
      headP.add(lensL);
      var lensR = lensL.clone();
      lensR.position.x = 0.16;
      headP.add(lensR);
      var bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), dark);
      bridge.position.set(0, 0.15, 0.4);
      headP.add(bridge);
    } else {
      var eyeMat = new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 0.3 });
      var pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a130e, roughness: 0.25 });
      [-0.15, 0.15].forEach(function (ex) {
        var eye = orb(eyeMat, 0.055, 1, 1, 0.5);
        eye.castShadow = false;
        eye.position.set(ex, 0.15, 0.35);
        headP.add(eye);
        var pupil = orb(pupilMat, 0.028, 1, 1, 0.6);
        pupil.castShadow = false;
        pupil.position.set(ex, 0.15, 0.385);
        headP.add(pupil);
      });
    }
    var browAng = opts.brow !== undefined ? opts.brow : 0.14;
    var browL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.04), hairMat);
    browL.position.set(-0.16, 0.27, 0.35);
    browL.rotation.z = browAng;
    headP.add(browL);
    var browR = browL.clone();
    browR.position.x = 0.16;
    browR.rotation.z = -browAng;
    headP.add(browR);
    if (!isRikishi) {
      var smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI * 0.7),
        new THREE.MeshStandardMaterial({ color: 0x6e352a, roughness: 0.6 }));
      smile.position.set(0, -0.08, 0.37);
      smile.rotation.z = Math.PI + Math.PI * 0.15;
      headP.add(smile);
    }

    // ---- arms
    function makeArm(side) {
      var sh = new THREE.Group();
      sh.position.set(side * (slim ? 0.5 : 0.74) * chestF, 1.08, 0);
      torso.add(sh);
      var sleeveMat = isRikishi ? skin : (isKimono ? fabric : fabric);
      var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.19 * limbR * (isKimono ? 1.5 : 1), 0.17 * limbR, 0.58, 10), sleeveMat);
      upper.position.y = -0.29;
      upper.castShadow = true;
      sh.add(upper);
      var shoulderBall = orb(sleeveMat, (slim ? 0.16 : 0.24));
      sh.add(shoulderBall);
      var el = new THREE.Group();
      el.position.y = -0.58;
      sh.add(el);
      var fore = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * limbR, 0.14 * limbR, 0.52, 10),
        isKimono ? fabric : skin);
      fore.position.y = -0.26;
      fore.castShadow = true;
      el.add(fore);
      var hand = orb(skin, 0.2 * (slim ? 0.7 : 1), 0.85, 1, 1.12);
      hand.position.y = -0.58;
      el.add(hand);
      return { sh: sh, el: el };
    }
    rig.armL = makeArm(-1);
    rig.armR = makeArm(1);

    // ---- legs
    function makeLeg(side) {
      var hp = new THREE.Group();
      hp.position.set(side * (slim ? 0.24 : 0.4), 0, 0);
      hips.add(hp);
      var thighMat = isRikishi || isKimono ? skin : shorts;
      var thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * limbR, 0.22 * limbR, 0.6, 10), thighMat);
      thigh.position.y = -0.32;
      thigh.castShadow = true;
      hp.add(thigh);
      var kn = new THREE.Group();
      kn.position.y = -0.62;
      hp.add(kn);
      var calf = new THREE.Mesh(new THREE.CylinderGeometry(0.21 * limbR, 0.15 * limbR, 0.52, 10), skin);
      calf.position.y = -0.26;
      calf.castShadow = true;
      kn.add(calf);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.34 * (slim ? 0.7 : 1), 0.14, 0.55 * (slim ? 0.8 : 1)), skin);
      foot.position.set(0, -0.5, 0.12);
      foot.castShadow = true;
      kn.add(foot);
      if (!isRikishi) {
        var slip = new THREE.Mesh(new THREE.BoxGeometry(0.38 * (slim ? 0.75 : 1), 0.05, 0.6 * (slim ? 0.85 : 1)),
          new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.85 }));
        slip.position.set(0, -0.575, 0.12);
        kn.add(slip);
      }
      return { hip: hp, knee: kn };
    }
    rig.legL = makeLeg(-1);
    rig.legR = makeLeg(1);

    if (opts.label) {
      var lbl = makeLabel(opts.label, opts.rank || "");
      lbl.position.y = 3.65;
      g.add(lbl);
      rig.label = lbl;
    }

    g.scale.setScalar(scale);
    return { g: g, rig: rig, opts: opts };
  }

  // ------------------------------------------------------------ pose library
  function resetPose(rig) {
    rig.hips.position.y = 1.18;
    rig.hips.rotation.set(0, 0, 0);
    rig.torso.rotation.set(0, 0, 0);
    rig.head.rotation.set(0, 0, 0);
    rig.armL.sh.rotation.set(0, 0, 0.62);
    rig.armR.sh.rotation.set(0, 0, -0.62);
    rig.armL.el.rotation.set(-0.45, 0, 0);
    rig.armR.el.rotation.set(-0.45, 0, 0);
    rig.legL.hip.rotation.set(0, 0, 0.14);
    rig.legR.hip.rotation.set(0, 0, -0.14);
    rig.legL.knee.rotation.set(0, 0, 0);
    rig.legR.knee.rotation.set(0, 0, 0);
    rig.belly.scale.copy(rig.bellyBase);
    rig.chest.scale.copy(rig.chestBase);
  }

  function poseBreathe(rig, t) {
    rig.chest.scale.y = rig.chestBase.y + 0.018 * Math.sin(t * 1.8);
    rig.belly.scale.z = rig.bellyBase.z + 0.015 * Math.sin(t * 1.8);
    rig.head.rotation.y = Math.sin(t * 0.4) * 0.14;
  }

  function poseWalk(rig, phase, amt, lean, t) {
    var swing = Math.sin(phase * 6.283);
    var swing2 = Math.cos(phase * 6.283);
    rig.legL.hip.rotation.x = swing * 0.5 * amt;
    rig.legR.hip.rotation.x = -swing * 0.5 * amt;
    rig.legL.knee.rotation.x = Math.max(0, -swing) * 0.85 * amt;
    rig.legR.knee.rotation.x = Math.max(0, swing) * 0.85 * amt;
    rig.armL.sh.rotation.x = -swing * 0.36 * amt;
    rig.armR.sh.rotation.x = swing * 0.36 * amt;
    rig.hips.position.y += Math.abs(swing2) * 0.085 * amt + Math.sin(t * 1.8) * 0.012;
    rig.hips.rotation.z = swing * 0.085 * amt;
    rig.hips.rotation.x = lean || 0;
    rig.belly.scale.y = rig.bellyBase.y + 0.02 * Math.sin(phase * 12.6) * amt;
  }

  function poseShiko(rig, s, side) {
    // side +1: lift right leg; -1: lift left
    function seg2(x, a, b) { return Math.max(0, Math.min(1, (x - a) / (b - a))); }
    function eo(x) { return 1 - (1 - x) * (1 - x); }
    function ei(x) { return x * x; }
    var lift = eo(seg2(s, 0, 0.32)) - ei(seg2(s, 0.46, 0.56));
    var squat = eo(seg2(s, 0.5, 0.62)) * (1 - eo(seg2(s, 0.68, 1)));
    var L = side > 0 ? rig.legR : rig.legL;
    var O = side > 0 ? rig.legL : rig.legR;
    L.hip.rotation.z = side * (-1.25 * lift - 0.14);
    L.knee.rotation.x = 1.15 * lift;
    O.hip.rotation.z = -side * (0.14 + 0.1 * lift);
    O.knee.rotation.x = 0.15 * lift;
    rig.hips.rotation.z = side * 0.3 * lift;
    rig.hips.position.y = 1.18 - 0.34 * squat + 0.06 * lift;
    rig.armL.sh.rotation.z = 0.62 + 1.5 * lift;
    rig.armR.sh.rotation.z = -0.62 - 1.5 * lift;
    rig.head.rotation.x = -0.15 * lift;
    return lift;
  }

  function poseCrouch(rig, f) {
    rig.hips.position.y = 1.18 - 0.52 * f;
    rig.hips.rotation.x = 0.42 * f;
    rig.legL.hip.rotation.x = -0.85 * f;
    rig.legR.hip.rotation.x = -0.85 * f;
    rig.legL.hip.rotation.z = 0.32 * f + 0.14;
    rig.legR.hip.rotation.z = -0.32 * f - 0.14;
    rig.legL.knee.rotation.x = 1.5 * f;
    rig.legR.knee.rotation.x = 1.5 * f;
    rig.armL.sh.rotation.x = -0.5 * f;
    rig.armR.sh.rotation.x = -0.5 * f;
    rig.armL.el.rotation.x = -0.45 - 0.4 * f;
    rig.armR.el.rotation.x = -0.45 - 0.4 * f;
    rig.head.rotation.x = -0.3 * f;
  }

  function poseLean(rig, f, stepT) {
    rig.hips.rotation.x = 0.55 * f;
    rig.hips.position.y = 1.18 - 0.3 * f;
    var st = Math.sin(stepT * 9) * 0.22 * f;
    rig.legL.hip.rotation.x = -0.45 * f + st;
    rig.legR.hip.rotation.x = -0.45 * f - st;
    rig.legL.knee.rotation.x = 0.8 * f;
    rig.legR.knee.rotation.x = 0.8 * f;
    rig.armL.sh.rotation.x = -1.25 * f;
    rig.armR.sh.rotation.x = -1.25 * f;
    rig.armL.sh.rotation.z = 0.25;
    rig.armR.sh.rotation.z = -0.25;
    rig.armL.el.rotation.x = -0.2;
    rig.armR.el.rotation.x = -0.2;
    rig.head.rotation.x = -0.5 * f;
  }

  function poseDance(rig, t) {
    var b = t * 2.4;
    rig.hips.rotation.z = Math.sin(b) * 0.13;
    rig.hips.position.y = 1.18 - 0.14 + Math.abs(Math.sin(b)) * 0.05;
    rig.legL.hip.rotation.z = 0.2 + Math.sin(b) * 0.08;
    rig.legR.hip.rotation.z = -0.2 + Math.sin(b) * 0.08;
    rig.legL.knee.rotation.x = 0.25 + Math.max(0, Math.sin(b)) * 0.2;
    rig.legR.knee.rotation.x = 0.25 + Math.max(0, -Math.sin(b)) * 0.2;
    var side = Math.sin(t * 0.5) > 0 ? 1 : -1;
    var A = side > 0 ? rig.armL : rig.armR;
    var B = side > 0 ? rig.armR : rig.armL;
    var sgn = side > 0 ? 1 : -1;
    A.sh.rotation.z = sgn * (1.55 + Math.sin(b) * 0.12);
    A.sh.rotation.x = -0.2;
    A.el.rotation.x = -0.25 + Math.sin(b + 1.2) * 0.28;
    B.sh.rotation.z = -sgn * (1.1 + Math.sin(b) * 0.12);
    B.sh.rotation.x = -0.35;
    B.el.rotation.x = -0.7 + Math.sin(b + 0.6) * 0.28;
    rig.head.rotation.z = Math.sin(b) * 0.09;
    rig.torso.rotation.y = Math.sin(b * 0.5) * 0.12;
  }

  function poseUke(rig, t) {
    rig.armL.sh.rotation.set(-0.55, 0, 1.02);
    rig.armL.el.rotation.set(-1.35, 0.3, 0);
    rig.armR.sh.rotation.set(-0.5, 0, -0.42);
    rig.armR.el.rotation.set(-1.0 + Math.sin(t * 7.5) * 0.22, 0, 0);
    rig.hips.rotation.z = Math.sin(t * 1.9) * 0.05;
    rig.hips.position.y = 1.18 + Math.sin(t * 3.8) * 0.02;
    rig.head.rotation.z = Math.sin(t * 1.9 + 0.5) * 0.07;
    rig.head.rotation.x = 0.18;
  }

  function poseEat(rig, t) {
    rig.armL.sh.rotation.set(-0.55, 0, 0.52);
    rig.armL.el.rotation.set(-1.45, 0, 0);
    var chew = Math.max(0, Math.sin(t * 5.5));
    rig.armR.sh.rotation.set(-0.45 - chew * 0.25, 0, -0.42);
    rig.armR.el.rotation.set(-1.0 - chew * 0.55, 0, 0);
    rig.head.rotation.x = 0.12 + chew * 0.1;
  }

  function poseSwim(rig, t) {
    var ph = t * 2.4;
    rig.hips.rotation.x = 1.22;
    rig.hips.rotation.z = Math.sin(ph) * 0.05;
    rig.head.rotation.x = -1.05;
    rig.armL.sh.rotation.set(-1.5 + Math.sin(ph) * 0.65, 0, 0.62 - 0.28 + Math.cos(ph) * 0.35);
    rig.armR.sh.rotation.set(-1.5 + Math.sin(ph) * 0.65, 0, -0.62 + 0.28 - Math.cos(ph) * 0.35);
    rig.armL.el.rotation.x = -0.2 + Math.sin(ph + 1) * 0.3;
    rig.armR.el.rotation.x = -0.2 + Math.sin(ph + 1) * 0.3;
    rig.legL.hip.rotation.x = Math.sin(ph * 2) * 0.28;
    rig.legR.hip.rotation.x = -Math.sin(ph * 2) * 0.28;
    rig.legL.knee.rotation.x = 0.35 + Math.max(0, Math.sin(ph * 2)) * 0.3;
    rig.legR.knee.rotation.x = 0.35 + Math.max(0, -Math.sin(ph * 2)) * 0.3;
  }

  function poseLie(rig, t) {
    rig.hips.rotation.x = -1.02;
    rig.hips.position.y = 0.62;
    rig.legL.hip.rotation.x = 1.22;
    rig.legR.hip.rotation.x = 1.22;
    rig.legL.knee.rotation.x = 0.22;
    rig.legR.knee.rotation.x = 0.22;
    rig.armL.sh.rotation.set(0.3, 0, 0.42);
    rig.armR.sh.rotation.set(0.3, 0, -0.42);
    rig.armL.el.rotation.x = -0.3;
    rig.armR.el.rotation.x = -0.3;
    rig.head.rotation.x = 0.62;
    if (t !== undefined) poseBreathe(rig, t);
  }

  function poseBow(rig, f) {
    rig.hips.rotation.x = 0.55 * f;
    rig.armL.sh.rotation.z = 0.28;
    rig.armR.sh.rotation.z = -0.28;
    rig.armL.el.rotation.x = -0.2;
    rig.armR.el.rotation.x = -0.2;
    rig.head.rotation.x = 0.3 * f;
  }

  function poseArmsCrossed(rig, t) {
    rig.armL.sh.rotation.set(-0.72, 0, 0.4);
    rig.armR.sh.rotation.set(-0.72, 0, -0.4);
    rig.armL.el.rotation.set(-1.6, 0.5, 0);
    rig.armR.el.rotation.set(-1.6, -0.5, 0);
    if (t !== undefined) poseBreathe(rig, t);
  }

  function poseStretch(rig, t) {
    var side = Math.sin(t * 0.35) > 0 ? 1 : -1;
    var L = side > 0 ? rig.legR : rig.legL;
    var O = side > 0 ? rig.legL : rig.legR;
    L.hip.rotation.z = side * -0.95;
    L.knee.rotation.x = 0.05;
    O.hip.rotation.z = -side * 0.3;
    O.knee.rotation.x = 1.35;
    rig.hips.position.y = 1.18 - 0.42;
    rig.hips.rotation.z = side * 0.18;
    rig.armL.sh.rotation.x = -0.6;
    rig.armR.sh.rotation.x = -0.6;
    rig.armL.el.rotation.x = -0.5;
    rig.armR.el.rotation.x = -0.5;
    rig.head.rotation.x = -0.15;
  }

  // ================================================================= PLAYER
  // The real Blender-built Hōshōryū (see aloha-hd/) loaded as a skinned GLB.
  // Locomotion (idle/walk/run) plays its baked mocap clips directly. Special
  // moves (stomp/dance/uke/eat/swim/relax) reuse the SAME poseX() functions
  // written for the procedural rig above, but since the mixamo skeleton's
  // bones have non-identity rest rotations (a real bind pose, not identity),
  // those functions write into throwaway Object3D "dummies" shaped exactly
  // like the procedural rig, and each frame we compose dummy.quaternion on
  // top of each bone's captured rest quaternion: final = rest * dummyPose.
  var sumo = new THREE.Group();
  sumo.position.set(0, 0, 14);
  scene.add(sumo);
  var rig = null;          // becomes the dummy adapter once the GLB loads
  var playerReady = false;
  var playerMixer = null;
  var playerActions = {};
  var playerCurrentAction = null;
  var playerBones = {};    // name -> real THREE.Bone
  var playerRest = {};     // name -> rest THREE.Quaternion
  var playerAllBones = [];
  var props = {};
  var waveDummySh = new THREE.Object3D(), waveDummyEl = new THREE.Object3D();

  (function () {
    var loader = new THREE.GLTFLoader();
    var bin = atob(window.HOSHORYU_GLB_B64);
    var buf = new ArrayBuffer(bin.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);

    loader.parse(buf, "", function (gltf) {
      var model = gltf.scene;
      model.traverse(function (o) {
        if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.frustumCulled = false; }
        if (o.isBone) {
          playerBones[o.name] = o;
          playerRest[o.name] = o.quaternion.clone();
          playerAllBones.push(o);
        }
      });
      // scale up to match the "huge sumo" fantasy proportions of this world
      model.scale.setScalar(1.6);
      sumo.add(model);

      playerMixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(function (clip) {
        var m = clip.name.toLowerCase().match(/(idle|walk|run)/);
        if (!m) return;
        var ht = clip.tracks.filter(function (t) { return /Hips\.position/.test(t.name); })[0];
        var hy = ht ? ht.values[1] : 1;
        if (hy < 0.3 || hy > 2.2) return; // skip malformed exporter duplicate tracks
        playerActions[m[1]] = playerMixer.clipAction(clip);
      });
      setPlayerAction("idle");

      var B = playerBones;
      var hipsRest = B["mixamorigHips"].position.clone();
      function dummy() { return new THREE.Object3D(); }
      rig = {
        hips: dummy(), torso: dummy(), chest: dummy(), belly: dummy(), head: dummy(),
        armL: { sh: dummy(), el: dummy() }, armR: { sh: dummy(), el: dummy() },
        legL: { hip: dummy(), knee: dummy() }, legR: { hip: dummy(), knee: dummy() }
      };
      rig.bellyBase = rig.belly.scale.clone();
      rig.chestBase = rig.chest.scale.clone();
      rig.hips.position.set(0, 1.18, 0);

      var COMPOSE = [
        [rig.hips, "mixamorigHips"], [rig.torso, "mixamorigSpine"], [rig.head, "mixamorigHead"],
        [rig.armL.sh, "mixamorigLeftArm"], [rig.armL.el, "mixamorigLeftForeArm"],
        [rig.armR.sh, "mixamorigRightArm"], [rig.armR.el, "mixamorigRightForeArm"],
        [rig.legL.hip, "mixamorigLeftUpLeg"], [rig.legL.knee, "mixamorigLeftLeg"],
        [rig.legR.hip, "mixamorigRightUpLeg"], [rig.legR.knee, "mixamorigRightLeg"]
      ];
      window.__applyPlayerPose = function () {
        for (var i = 0; i < playerAllBones.length; i++) {
          var b = playerAllBones[i];
          b.quaternion.copy(playerRest[b.name]);
        }
        for (var j = 0; j < COMPOSE.length; j++) {
          var d = COMPOSE[j][0], real = B[COMPOSE[j][1]];
          real.quaternion.copy(playerRest[COMPOSE[j][1]]).multiply(d.quaternion);
        }
        var hb = B["mixamorigHips"];
        hb.position.set(hipsRest.x + rig.hips.position.x,
          hipsRest.y + (rig.hips.position.y - 1.18), hipsRest.z + rig.hips.position.z);
      };

      // hand props, parented directly to the real bones so they follow the pose
      var uke = new THREE.Group();
      var ubody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xa8763e, roughness: 0.5 }));
      ubody.scale.set(1, 0.42, 1.28);
      uke.add(ubody);
      var neck = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x6e4a28, roughness: 0.5 }));
      neck.position.set(0, 0.02, -0.3);
      uke.add(neck);
      uke.position.set(0.02, -0.06, 0.12);
      uke.rotation.set(0.2, 0.4, 1.3);
      uke.visible = false;
      B["mixamorigLeftForeArm"].add(uke);
      props.uke = uke;

      var bowl = new THREE.Group();
      var bwl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.09, 12),
        new THREE.MeshStandardMaterial({ color: 0x8a3d2e, roughness: 0.4 }));
      bowl.add(bwl);
      var rice = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 }));
      rice.scale.y = 0.5;
      rice.position.y = 0.045;
      bowl.add(rice);
      bowl.position.set(0.02, -0.08, 0.1);
      bowl.visible = false;
      B["mixamorigLeftForeArm"].add(bowl);
      props.bowl = bowl;

      var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.135, 10),
        new THREE.MeshStandardMaterial({ color: 0xff9a3e, roughness: 0.3 }));
      cup.position.set(0.02, -0.08, 0.1);
      cup.visible = false;
      B["mixamorigRightForeArm"].add(cup);
      props.cup = cup;

      playerReady = true;
      var el = document.getElementById("splash");
    }, function (err) { console.error("Hoshoryu GLB load failed", err); });
  })();

  function setPlayerAction(n) {
    if (playerCurrentAction === n || !playerActions[n]) return;
    var prev = playerCurrentAction && playerActions[playerCurrentAction];
    playerActions[n].reset().fadeIn(0.22).play();
    if (prev) prev.fadeOut(0.22);
    playerCurrentAction = n;
  }

  // ==================================================================== NPCS
  var actors = [];

  function addActor(person, cfg) {
    var a = {
      p: person, g: person.g, rig: person.rig,
      name: cfg.name, line: cfg.line || "Aloha!",
      kind: cfg.kind, station: cfg.station || null, facing: cfg.facing || 0,
      state: cfg.state || "station", phase: Math.random() * 6.283,
      walkPhase: 0, target: null, speed: cfg.speed || 2.2,
      waypoints: cfg.waypoints || null, wpIdx: 0, pauseT: 0,
      lastS: 0
    };
    if (cfg.pos) {
      person.g.position.set(cfg.pos[0], groundY(cfg.pos[0], cfg.pos[1]), cfg.pos[1]);
      person.g.rotation.y = a.facing;
    }
    scene.add(person.g);
    actors.push(a);
    return a;
  }

  // ---- the beach dohyō practice: Futagoyama-beya hosts the makuuchi
  var ringPool = [];      // rikishi actors rotating through bouts
  (function () {
    var stations = [
      // [x, z, faceTowardRing?, activity]
      [43.0, 51.5, "shiko"], [43.0, 55.0, "shiko"], [43.0, 58.5, "shiko"],
      [46.0, 62.5, "stretch"], [49.5, 63.8, "stretch"],
      [56.5, 63.0, "wait"], [59.5, 61.5, "wait"], [61.0, 58.5, "wait"],
      [61.5, 52.0, "wait"], [45.5, 47.5, "stretch"], [48.0, 46.2, "wait"]
    ];
    var everyone = ROSTER.makuuchi.concat([ROSTER.futagoyama[0]]); // Yoshii trains with the makuuchi
    everyone.forEach(function (w, i) {
      var person = buildPerson({
        scale: w.scale, skin: w.skin, belly: w.belly, chest: 1.05,
        outfit: "rikishi", mawashi: w.mawashi || 0xf0ead8,
        hair: "topknot", brow: 0.3,
        label: w.name, rank: w.rank
      });
      var st = stations[i % stations.length];
      var face = Math.atan2(DOHYO.x - st[0], DOHYO.z - st[1]);
      var a = addActor(person, {
        name: w.name, line: w.line, kind: "rikishi",
        pos: [st[0], st[1]], facing: face,
        station: { x: st[0], z: st[1], facing: face, act: st[2] }
      });
      ringPool.push(a);
    });

    // Futagoyama oyakata, watching from the ring edge
    var masterP = buildPerson({
      scale: 0.94, skin: 0xc98a52, belly: 1.05, chest: 1.0,
      outfit: "kimono", shirt: 0x2b3a55, hair: "gray", hairColor: 0x8a8a88,
      brow: 0.22, label: ROSTER.master.name, rank: ROSTER.master.rank
    });
    var master = addActor(masterP, {
      name: ROSTER.master.name, kind: "master",
      pos: [57.8, 49.6], facing: Math.atan2(DOHYO.x - 57.8, DOHYO.z - 49.6),
      station: { x: 57.8, z: 49.6, facing: Math.atan2(DOHYO.x - 57.8, DOHYO.z - 49.6), act: "master" },
      line: "Hips LOWER! The sand forgives nothing — and neither do I. ...Then chanko. I put pineapple in it."
    });
    master.coachLines = [
      "Hips lower! Even in paradise, sumo is sumo.",
      "Mou ichiban! Again! The ocean isn't going anywhere.",
      "Good tachi-ai, Yoshii! Now do it fifty more times.",
      "Drive with the legs! The one who stops moving, loses.",
      "Water break! Then moshi-ai. Loser rakes the dohyō."
    ];
    window.__MASTER = master;

    // Futagoyama tsukebito: chanko duty and towel runs
    ROSTER.futagoyama.slice(1).forEach(function (w, i) {
      var person = buildPerson({
        scale: w.scale, skin: w.skin, belly: w.belly,
        outfit: "rikishi", mawashi: 0x2a2a33,
        hair: "topknot", brow: 0.18,
        label: w.name, rank: w.rank
      });
      if (i === 0) {
        addActor(person, {
          name: w.name, line: w.line, kind: "rikishi",
          pos: [60.8, 47.2], facing: 2.6,
          station: { x: 60.8, z: 47.2, facing: 2.6, act: "stir" }
        });
      } else {
        addActor(person, {
          name: w.name, line: w.line, kind: "rikishi", speed: 2.6,
          pos: [47, 44], facing: 1.2, state: "wander",
          waypoints: [[47, 44], [58, 45], [62, 55], [56, 64], [44, 62], [42, 48]]
        });
      }
    });
  })();

  // ---- resort guests
  (function () {
    var guestStyles = [
      { outfit: "aloha", shirt: 0xff8f4a, shorts: 0xf2ead8, hair: "short", hairColor: 0x5a3a1c, hat: null, sunglasses: true },
      { outfit: "aloha", shirt: 0x39c1e0, shorts: 0x2b3a55, hair: "short", hairColor: 0x1a130e, hat: "straw", sunglasses: false },
      { outfit: "dress", shirt: 0xff9ad5, hair: "long", hairColor: 0x6e4a28, hat: "straw", sunglasses: false, lei: true },
      { outfit: "aloha", shirt: 0x9be15d, shorts: 0xf2ead8, hair: "short", hairColor: 0x8a8a88, hat: null, sunglasses: true },
      { outfit: "dress", shirt: 0xffd166, hair: "long", hairColor: 0x1a130e, hat: null, sunglasses: false, lei: true },
      { outfit: "aloha", shirt: 0xc98cff, shorts: 0x3a6ea5, hair: "short", hairColor: 0x2a1a0c, hat: "cap", sunglasses: false },
      { outfit: "dress", shirt: 0x7ad5c0, hair: "long", hairColor: 0x9c6234, hat: "straw", sunglasses: true },
      { outfit: "aloha", shirt: 0xfff4e0, shorts: 0xb33c2e, hair: "short", hairColor: 0x4a2e1a, hat: null, sunglasses: false }
    ];
    var routes = [
      [[0, -8], [12, 6], [4, 20], [-8, 28], [-16, 12], [-6, -4]],
      [[-31, -2], [-40, 8], [-24, 12], [-18, 2]],
      [[-12, 40], [8, 46], [24, 50], [10, 58], [-14, 52]],
      [[14, -18], [22, 2], [12, 16], [2, 26], [-4, 10]],
      [[30, 40], [44, 46], [40, 58], [26, 52]],
      [[-50, 24], [-38, 32], [-28, 42], [-44, 44], [-56, 36]]
    ];
    var skins = [0xe8b48a, 0xc98a52, 0x8a5a32, 0xf0c8a0, 0xba7a45, 0xd9a06a];
    ROSTER.guests.forEach(function (gg, i) {
      var st = guestStyles[i % guestStyles.length];
      var person = buildPerson({
        scale: 0.6, slim: true, skin: skins[i % skins.length],
        belly: 0.9, chest: 0.9,
        outfit: st.outfit, shirt: st.shirt, shorts: st.shorts,
        hair: st.hair, hairColor: st.hairColor, hat: st.hat,
        sunglasses: st.sunglasses, lei: st.lei, brow: 0.1,
        label: gg.name, rank: gg.from
      });
      if (gg.from === "bartender") {
        addActor(person, {
          name: gg.name, line: gg.line, kind: "tourist",
          pos: [-55.6, 31.6], facing: 0.35 + Math.PI * 0 + 0.2,
          station: { x: -55.6, z: 31.6, facing: 0.55, act: "stand" }
        });
      } else if (i === 1 || i === 4) {
        // sunbathers on the beach loungers
        var L = loungers[i === 1 ? 6 : 8];
        L.taken = true;
        var a2 = addActor(person, {
          name: gg.name, line: gg.line, kind: "tourist",
          pos: [L.x, L.z], facing: L.ry, state: "lying"
        });
        a2.lounger = L;
      } else {
        addActor(person, {
          name: gg.name, line: gg.line, kind: "tourist", speed: 1.5,
          pos: routes[i % routes.length][0], state: "wander",
          waypoints: routes[i % routes.length]
        });
      }
    });
  })();

  // ---- bout scheduler
  var BOUT_T = 14;
  // start in the walk-in phase so the first pair strolls to the ring naturally
  var bout = { t: 11.6, cycle: 0, a: null, b: null, clashDone: false };
  function boutPair(cycle) {
    var n = ringPool.length;
    return [ringPool[(cycle * 2) % n], ringPool[(cycle * 2 + 1) % n]];
  }
  (function () {
    var p = boutPair(0);
    bout.a = p[0]; bout.b = p[1];
  })();

  function moveActorToward(a, tx, tz, dt, arriveFace) {
    var dx = tx - a.g.position.x, dz = tz - a.g.position.z;
    var d = Math.hypot(dx, dz);
    if (d > 0.18) {
      var ang = Math.atan2(dx, dz);
      var diff = ang - a.g.rotation.y;
      while (diff > Math.PI) diff -= 6.283;
      while (diff < -Math.PI) diff += 6.283;
      a.g.rotation.y += diff * Math.min(1, dt * 8);
      var step = Math.min(d, a.speed * dt);
      a.g.position.x += Math.sin(ang) * step;
      a.g.position.z += Math.cos(ang) * step;
      a.walkPhase += dt * 1.6;
      poseWalk(a.rig, a.walkPhase, 1, 0.06, a.walkPhase);
      return false;
    }
    if (arriveFace !== undefined) {
      var diff2 = arriveFace - a.g.rotation.y;
      while (diff2 > Math.PI) diff2 -= 6.283;
      while (diff2 < -Math.PI) diff2 += 6.283;
      a.g.rotation.y += diff2 * Math.min(1, dt * 6);
    }
    return true;
  }

  function updateBout(t, dt) {
    bout.t += dt;
    if (bout.t >= BOUT_T) {
      bout.t -= BOUT_T;
      bout.cycle++;
      bout.clashDone = false;
      var p = boutPair(bout.cycle);
      bout.a = p[0]; bout.b = p[1];
    }
    var bt = bout.t;
    var A = bout.a, B = bout.b;
    var cy = DOHYO.topY;
    var winner = bout.cycle % 2 === 0 ? 1 : -1;   // +1: A (west) wins, pushes east

    function place(a, x, face) {
      a.g.position.x += (x - a.g.position.x) * Math.min(1, dt * 10);
      a.g.position.z += (DOHYO.z - a.g.position.z) * Math.min(1, dt * 10);
      a.g.rotation.y = face;
    }

    if (bt < 1.8) {
      // at the shikiri lines, crouched
      var f = Math.min(1, bt / 0.6);
      if (moveActorToward(A, DOHYO.x - 1.15, DOHYO.z, dt, Math.PI / 2)) poseCrouch(A.rig, f);
      if (moveActorToward(B, DOHYO.x + 1.15, DOHYO.z, dt, -Math.PI / 2)) poseCrouch(B.rig, f);
    } else if (bt < 2.2) {
      var f2 = (bt - 1.8) / 0.4;
      place(A, DOHYO.x - 1.15 + f2 * 0.67, Math.PI / 2);
      place(B, DOHYO.x + 1.15 - f2 * 0.67, -Math.PI / 2);
      poseLean(A.rig, f2, t);
      poseLean(B.rig, f2, t + 3);
      if (!bout.clashDone && f2 > 0.9) {
        bout.clashDone = true;
        audio.clash(Math.hypot(sumo.position.x - DOHYO.x, sumo.position.z - DOHYO.z));
        burstDust(DOHYO.x, cy, DOHYO.z, 4, 1.4);
      }
    } else if (bt < 8.5) {
      var dv = bt - 2.2;
      var off = Math.sin(dv * 1.4) * 0.4 + (dv / 6.3) * winner * 2.2;
      place(A, DOHYO.x - 0.48 + off, Math.PI / 2);
      place(B, DOHYO.x + 0.48 + off, -Math.PI / 2);
      poseLean(A.rig, 1, t);
      poseLean(B.rig, 1, t + 3);
    } else if (bt < 10.2) {
      var f3 = (bt - 8.5) / 1.7;
      var off2 = winner * (2.2 + f3 * 1.9);
      var loser = winner > 0 ? B : A;
      var winr = winner > 0 ? A : B;
      place(winr, DOHYO.x + (winner > 0 ? -0.48 : 0.48) + off2 * 0.82, winner > 0 ? Math.PI / 2 : -Math.PI / 2);
      place(loser, DOHYO.x + (winner > 0 ? 0.48 : -0.48) + off2, winner > 0 ? -Math.PI / 2 : Math.PI / 2);
      poseLean(winr.rig, 1 - f3 * 0.6, t);
      poseLean(loser.rig, Math.max(0, 0.5 - f3), t);
      loser.rig.hips.rotation.x -= f3 * 0.15; // staggering upright
    } else if (bt < 12) {
      var f4 = (bt - 10.2) / 1.8;
      var bowF = Math.sin(Math.min(1, f4 * 1.4) * Math.PI);
      if (moveActorToward(A, DOHYO.x - 1.15, DOHYO.z, dt, Math.PI / 2)) poseBow(A.rig, bowF);
      if (moveActorToward(B, DOHYO.x + 1.15, DOHYO.z, dt, -Math.PI / 2)) poseBow(B.rig, bowF);
    } else {
      // walk home; the next pair starts walking in
      var next = boutPair(bout.cycle + 1);
      if (moveActorToward(A, A.station.x, A.station.z, dt, A.station.facing)) stationPose(A, t);
      if (moveActorToward(B, B.station.x, B.station.z, dt, B.station.facing)) stationPose(B, t);
      if (next[0] !== A && next[0] !== B) moveActorToward(next[0], DOHYO.x - 1.6, DOHYO.z + 1.4, dt);
      if (next[1] !== A && next[1] !== B) moveActorToward(next[1], DOHYO.x + 1.6, DOHYO.z + 1.4, dt);
    }
  }

  function stationPose(a, t) {
    var act = a.station ? a.station.act : "wait";
    var tt = t + a.phase;
    if (act === "shiko") {
      var cyc = tt * 0.38;
      var s = cyc % 1;
      var side = (Math.floor(cyc) % 2) ? 1 : -1;
      poseShiko(a.rig, s, side);
      if (a.lastS < 0.56 && s >= 0.56) {
        burstDust(a.g.position.x, a.g.position.y, a.g.position.z, 2, 1.0);
      }
      a.lastS = s;
    } else if (act === "stretch") {
      poseStretch(a.rig, tt);
    } else if (act === "master") {
      poseArmsCrossed(a.rig, tt);
      // point and coach now and then
      var gate = Math.sin(tt * 0.35);
      if (gate > 0.75) {
        var f = (gate - 0.75) / 0.25;
        a.rig.armR.sh.rotation.set(-1.1 * f, 0, -0.62 + 0.2 * f);
        a.rig.armR.el.rotation.x = -0.15 * f;
      }
    } else if (act === "stir") {
      // stirring the chanko pot
      a.rig.armR.sh.rotation.set(-0.8, 0, -0.35);
      a.rig.armR.el.rotation.x = -0.9 + Math.sin(tt * 2.2) * 0.25;
      a.rig.armR.el.rotation.z = Math.cos(tt * 2.2) * 0.2;
      a.rig.hips.rotation.x = 0.12;
      poseBreathe(a.rig, tt);
    } else {
      poseArmsCrossed(a.rig, tt);
      a.rig.head.rotation.y = Math.sin(tt * 0.3) * 0.3;
    }
  }

  function updateActors(t, dt) {
    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      var inBout = (a === bout.a || a === bout.b);
      resetPose(a.rig);
      if (!inBout) {
        if (a.state === "lying" && a.lounger) {
          poseLie(a.rig, t + a.phase);
          a.g.position.set(a.lounger.x, terrainY(a.lounger.x, a.lounger.z) + 0.1, a.lounger.z + 0.15);
          a.g.rotation.y = a.lounger.ry;
        } else if (a.state === "wander" && a.waypoints) {
          if (a.pauseT > 0) {
            a.pauseT -= dt;
            poseBreathe(a.rig, t + a.phase);
            a.rig.head.rotation.y = Math.sin((t + a.phase) * 0.5) * 0.5;
          } else {
            var wp = a.waypoints[a.wpIdx];
            if (moveActorToward(a, wp[0], wp[1], dt)) {
              a.wpIdx = (a.wpIdx + 1) % a.waypoints.length;
              a.pauseT = 3 + Math.random() * 6;
            }
          }
        } else if (a.station) {
          if (moveActorToward(a, a.station.x, a.station.z, dt, a.station.facing)) {
            stationPose(a, t);
          }
        } else {
          poseBreathe(a.rig, t + a.phase);
        }
      }
      // keep everyone glued to the ground (bout actors included)
      if (a.state !== "lying") {
        a.g.position.y = groundY(a.g.position.x, a.g.position.z);
      }
      // labels fade with distance
      if (a.rig.label) {
        var dd = Math.hypot(a.g.position.x - sumo.position.x, a.g.position.z - sumo.position.z);
        a.rig.label.visible = dd < 42;
        if (a.rig.label.visible) {
          a.rig.label.material.opacity = Math.max(0, Math.min(1, (42 - dd) / 14));
        }
      }
    }
    updateBout(t, dt);
  }

  function nearestActor(maxDist) {
    var best = null, bd = maxDist;
    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      var d = Math.hypot(a.g.position.x - sumo.position.x, a.g.position.z - sumo.position.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

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
    for (var i = 0; i < 26; i++) {
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

  var splashes = [];
  (function () {
    var tex = canvasTexture(makeCanvas(64, 64, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(245,255,255,0.95)");
      g.addColorStop(0.6, "rgba(220,248,255,0.4)");
      g.addColorStop(1, "rgba(220,248,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));
    for (var i = 0; i < 18; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.visible = false;
      scene.add(sp);
      splashes.push({ sp: sp, life: 0, vx: 0, vy: 0, vz: 0 });
    }
  })();
  function burstSplash(x, y, z, n) {
    var used = 0;
    for (var i = 0; i < splashes.length && used < n; i++) {
      var d = splashes[i];
      if (d.life > 0) continue;
      used++;
      d.life = 0.5 + Math.random() * 0.3;
      d.maxLife = d.life;
      var a = Math.random() * 6.283;
      d.vx = Math.cos(a) * 1.6 * (0.4 + Math.random());
      d.vz = Math.sin(a) * 1.6 * (0.4 + Math.random());
      d.vy = 2.2 + Math.random() * 2.0;
      d.sp.position.set(x, y + 0.15, z);
      d.sp.scale.set(0.5, 0.5, 1);
      d.sp.visible = true;
    }
  }

  var ripples = [];
  (function () {
    var mat = new THREE.MeshBasicMaterial({
      color: 0xeafcff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, fog: true
    });
    for (var i = 0; i < 12; i++) {
      var m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 24), mat.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 4;
      scene.add(m);
      ripples.push({ m: m, life: 0 });
    }
  })();
  function spawnRipple(x, z, waterY) {
    for (var i = 0; i < ripples.length; i++) {
      if (ripples[i].life > 0) continue;
      var r = ripples[i];
      r.life = 1;
      r.m.position.set(x, (waterY !== undefined ? waterY : SEA_LEVEL) + 0.05, z);
      r.m.scale.set(1, 1, 1);
      r.m.visible = true;
      return;
    }
  }

  // footprints pressed into dry sand
  var footprints = [];
  (function () {
    var tex = canvasTexture(makeCanvas(32, 48, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(110,88,55,0.5)");
      g.addColorStop(0.7, "rgba(110,88,55,0.3)");
      g.addColorStop(1, "rgba(110,88,55,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.36, h * 0.42, 0, 0, 6.283);
      ctx.fill();
    }));
    for (var i = 0; i < 26; i++) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 1;
      scene.add(m);
      footprints.push({ m: m, life: 0 });
    }
  })();
  var fpIdx = 0, fpSide = 1;
  function stampFootprint(x, z, facing) {
    var f = footprints[fpIdx];
    fpIdx = (fpIdx + 1) % footprints.length;
    fpSide = -fpSide;
    var px = x + Math.cos(facing) * 0.38 * fpSide;
    var pz = z - Math.sin(facing) * 0.38 * fpSide;
    f.life = 1;
    f.m.position.set(px, terrainY(px, pz) + 0.02, pz);
    f.m.rotation.z = -facing;
    f.m.visible = true;
  }

  // steam over the chanko pot
  var steam = [];
  (function () {
    var tex = canvasTexture(makeCanvas(48, 48, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));
    for (var i = 0; i < 4; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.userData.ph = i * 1.6;
      scene.add(sp);
      steam.push(sp);
    }
  })();

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
    if (e.code === "Tab") { e.preventDefault(); if (started) toggleChecklist(); }
    if (started) {
      if (e.code === "KeyM") audio.toggle();
      if (e.code === "KeyF") doAloha();
      if (e.code === "KeyE") doInteract();
      if (e.code === "KeyT") doTalk();
      if (e.code === "KeyU") toggleActivity("uke");
      if (e.code === "KeyG") toggleActivity("dance");
      if (e.code === "KeyR") { sumo.position.set(0, 0, 14); facing = 0; }
    }
    start();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  splash.addEventListener("click", start);
  document.getElementById("sound-chip").addEventListener("click", function () {
    start();
    audio.toggle();
  });
  document.getElementById("help-chip").addEventListener("click", function () {
    start();
    toggleChecklist();
  });

  var camYaw = Math.PI;
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

  var joyEl = document.getElementById("joy");
  var joyKnob = joyEl.querySelector(".knob");
  var joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  var camTouch = { id: -1, x: 0, y: 0 };
  window.addEventListener("touchstart", function (e) {
    document.body.classList.add("touch");
    start();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.target && t.target.classList && t.target.classList.contains("mbtn")) continue;
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
  function mbtn(id, fn) {
    document.getElementById(id).addEventListener("touchstart", function (e) {
      fn();
      e.preventDefault();
    }, { passive: false });
  }
  mbtn("btn-stomp", function () { triggerStomp(); });
  mbtn("btn-act", function () { if (!doInteract()) doTalk(); });
  mbtn("btn-uke", function () { toggleActivity("uke"); });
  mbtn("btn-hula", function () { toggleActivity("dance"); });

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
    clash: function (dist) {
      if (!this.ctx) return;
      var vol = Math.max(0, 0.5 - dist / 90);
      if (vol <= 0.01) return;
      var ctx = this.ctx, t0 = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(140, t0);
      o.frequency.exponentialRampToValueAtTime(48, t0 + 0.16);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.25);
    },
    splash: function () {
      if (!this.ctx) return;
      this._noise(0.25, 1400, 0.16);
    },
    splashBig: function () {
      if (!this.ctx) return;
      this._noise(0.5, 900, 0.3);
    },
    munch: function () {
      if (!this.ctx) return;
      var self = this;
      [0, 0.18, 0.36].forEach(function (dl) {
        setTimeout(function () { self._noise(0.08, 2200, 0.12); }, dl * 1000);
      });
    },
    _noise: function (dur, freq, vol) {
      var ctx = this.ctx, t0 = ctx.currentTime;
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.7;
      var g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    },
    pluck: function (freq, when, vel) {
      var ctx = this.ctx, t0 = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = "triangle";
      o.frequency.value = freq;
      f.type = "lowpass";
      f.frequency.setValueAtTime(2600, t0);
      f.frequency.exponentialRampToValueAtTime(700, t0 + 0.5);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vel || 0.09, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.85);
      o.connect(f); f.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.9);
    },
    // ukulele chords: C, G7, Am, F — the eternal island progression
    chords: [[392, 523.25, 659.25], [392, 493.88, 587.33], [440, 523.25, 659.25], [349.23, 440, 523.25]],
    strum: function (idx, accent) {
      if (!this.ctx || !this.on) return;
      var notes = this.chords[idx % 4];
      for (var i = 0; i < notes.length; i++) {
        this.pluck(notes[i], i * 0.035, accent ? 0.11 : 0.075);
      }
    },
    drum: function () {
      if (!this.ctx) return;
      var ctx = this.ctx, t0 = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(120, t0);
      o.frequency.exponentialRampToValueAtTime(60, t0 + 0.1);
      g.gain.setValueAtTime(0.16, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.16);
    }
  };

  // ---------------------------------------------------------------- gameplay
  var POOL = window.__POOL;
  var walkPhase = 0, walkAmt = 0, speedNow = 0;
  var facing = 0;
  var stomp = { t: -1 };
  var shake = 0;
  var alohaT = -1;
  var stepAcc = 0;
  var activity = null;       // null | 'dance' | 'uke' | 'eat' | 'relax'
  var activityT = 0;
  var eatKind = null;
  var relaxLounger = null;
  var swimming = false;
  var swimWater = SEA_LEVEL;
  var strumTimer = 0, strumN = 0;
  var watchT = 0;
  var coachTimer = 8;

  var needs = { hunger: 78, fun: 65, energy: 92 };

  // ---- checklist
  var TASKS = [
    ["swim", "🏊 Swim in the Pacific"],
    ["pool", "🩳 Take a dip in the pool"],
    ["shaveice", "🍧 Shave ice at the cart"],
    ["chanko", "🍲 Chanko by the dohyō"],
    ["pog", "🧃 POG juice at the tiki bar"],
    ["hula", "💃 Hula dance"],
    ["uke", "🎸 Play the ukulele"],
    ["talkR", "🥋 Talk to a makuuchi rikishi"],
    ["talkG", "🌺 Talk to a resort guest"],
    ["stomp", "🦶 Shiko stomp on the sand"],
    ["watch", "👀 Watch a practice bout"]
  ];
  var tasksDone = {};
  try { tasksDone = JSON.parse(localStorage.getItem("alohaSumoTasks") || "{}"); } catch (e2) {}
  var listEl = document.getElementById("list");
  var bannerShown = false;
  function renderChecklist() {
    var html = "";
    for (var i = 0; i < TASKS.length; i++) {
      var d = tasksDone[TASKS[i][0]];
      html += '<div class="item' + (d ? " done" : "") + '"><span class="mark">' + (d ? "✓" : "○") + "</span>" + TASKS[i][1] + "</div>";
    }
    listEl.querySelector(".items").innerHTML = html;
  }
  renderChecklist();
  function checkTask(key) {
    if (tasksDone[key]) return;
    tasksDone[key] = true;
    try { localStorage.setItem("alohaSumoTasks", JSON.stringify(tasksDone)); } catch (e3) {}
    renderChecklist();
    var label = "";
    for (var i = 0; i < TASKS.length; i++) if (TASKS[i][0] === key) label = TASKS[i][1];
    toast("✓ " + label);
    var all = TASKS.every(function (t2) { return tasksDone[t2[0]]; });
    if (all && !bannerShown) {
      bannerShown = true;
      var b = document.getElementById("banner");
      b.classList.add("show");
      setTimeout(function () { b.classList.remove("show"); }, 5200);
    }
  }
  function toggleChecklist() {
    listEl.style.display = listEl.style.display === "block" ? "none" : "block";
  }

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = 1;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.opacity = 0; }, 2600);
  }

  // ---- speech bubble
  var bubbleEl = document.getElementById("bubble");
  var bubbleActor = null, bubbleT = 0;
  function showBubble(actor, text, dur) {
    bubbleActor = actor;
    bubbleT = dur || 4.2;
    bubbleEl.querySelector(".who").textContent = actor.name;
    bubbleEl.querySelector(".txt").textContent = text;
    bubbleEl.style.display = "block";
  }
  var headWP = new THREE.Vector3();
  function updateBubble(dt) {
    if (!bubbleActor) return;
    bubbleT -= dt;
    var d = Math.hypot(bubbleActor.g.position.x - sumo.position.x, bubbleActor.g.position.z - sumo.position.z);
    if (bubbleT <= 0 || d > 12) {
      bubbleActor = null;
      bubbleEl.style.display = "none";
      return;
    }
    bubbleActor.rig.head.getWorldPosition(headWP);
    headWP.y += 0.9;
    headWP.project(camera);
    if (headWP.z > 1) { bubbleEl.style.display = "none"; return; }
    bubbleEl.style.display = "block";
    bubbleEl.style.left = ((headWP.x * 0.5 + 0.5) * window.innerWidth) + "px";
    bubbleEl.style.top = ((-headWP.y * 0.5 + 0.5) * window.innerHeight - 14) + "px";
  }

  // ---- interactions
  function stopActivity() {
    if (activity === "relax" && relaxLounger) relaxLounger.taken = false;
    relaxLounger = null;
    activity = null;
    props.uke.visible = false;
    props.bowl.visible = false;
    props.cup.visible = false;
  }
  function toggleActivity(kind) {
    if (!started || swimming || stomp.t >= 0) return;
    if (activity === kind) { stopActivity(); return; }
    stopActivity();
    activity = kind;
    activityT = 0;
    if (kind === "uke") {
      props.uke.visible = true;
      strumTimer = 0.1; strumN = 0;
      toast("🎸 Jamming — move to stop");
      checkTask("uke");
    }
    if (kind === "dance") {
      toast("💃 Hula time — move to stop");
      checkTask("hula");
    }
  }
  function startEat(kind) {
    stopActivity();
    activity = "eat";
    activityT = 0;
    eatKind = kind;
    if (kind === "pog") props.cup.visible = true;
    else props.bowl.visible = true;
    audio.munch();
    toast(kind === "pog" ? "🧃 Fresh POG incoming..." : (kind === "shaveice" ? "🍧 Scooping rainbow shave ice..." : "🍲 Ladling chanko..."));
  }

  var interactables = [
    { x: 9, z: 24, r: 3.4, label: "E — Shave ice 🍧", fn: function () { startEat("shaveice"); } },
    { x: 60, z: 48.5, r: 3.4, label: "E — Chanko-nabe 🍲", fn: function () { startEat("chanko"); } },
    { x: -55, z: 33, r: 4.0, label: "E — POG juice 🧃", fn: function () { startEat("pog"); } }
  ];
  function currentInteractable() {
    if (swimming || stomp.t >= 0) return null;
    for (var i = 0; i < interactables.length; i++) {
      var it = interactables[i];
      if (Math.hypot(it.x - sumo.position.x, it.z - sumo.position.z) < it.r) return it;
    }
    // free lounger nearby?
    for (var j = 0; j < loungers.length; j++) {
      var L = loungers[j];
      if (L.taken) continue;
      if (Math.hypot(L.x - sumo.position.x, L.z - sumo.position.z) < 2.4) {
        return {
          label: "E — Relax on the lounger 🌴", lounger: L,
          fn: function () {
            stopActivity();
            activity = "relax";
            relaxLounger = L;
            L.taken = true;
            sumo.position.x = L.x;
            sumo.position.z = L.z + 0.15;
            facing = L.ry;
            toast("😌 Recharging... move to get up");
          }
        };
      }
    }
    return null;
  }
  function doInteract() {
    if (!started) return false;
    if (activity === "relax") { stopActivity(); return true; }
    var it = currentInteractable();
    if (it) { it.fn(); return true; }
    return false;
  }
  function doTalk() {
    if (!started || swimming) return;
    var a = nearestActor(4.8);
    if (!a) return;
    // face each other
    var ang = Math.atan2(a.g.position.x - sumo.position.x, a.g.position.z - sumo.position.z);
    facing = ang;
    if (!(a === bout.a || a === bout.b) && a.state !== "lying") {
      a.g.rotation.y = ang + Math.PI;
    }
    var line = a.line;
    if (a.kind === "master" && a.coachLines) {
      line = a.coachLines[(Math.random() * a.coachLines.length) | 0];
    }
    showBubble(a, line, 4.6);
    activityT = 0;
    shake = Math.max(shake, 0.035);
    if (a.kind === "rikishi" || a.kind === "master") checkTask("talkR");
    if (a.kind === "tourist") checkTask("talkG");
    needs.fun = Math.min(100, needs.fun + 6);
  }

  function triggerStomp() {
    if (stomp.t < 0 && started && !swimming && activity !== "relax") {
      stopActivity();
      stomp.t = 0;
      toast("🦶 Shiko! The whole beach feels it.");
    }
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

  // ---- HUD
  var zoneEl = document.getElementById("zone-chip");
  var promptEl = document.getElementById("prompt");
  var zoneLast = "", promptLast = "";
  function updateHud() {
    var x = sumo.position.x, z = sumo.position.z;
    var label;
    if (Math.hypot(x - DOHYO.x, z - DOHYO.z) < 13) label = "🥋 Beach Dohyō — makuuchi keiko";
    else if (swimming && swimWater !== SEA_LEVEL) label = "🩳 In the Pool";
    else if (swimming) label = "🌊 Swimming in the Pacific";
    else if (z > WATERLINE_Z + 1.5) label = "🌊 Wading — Diamond Head to your left!";
    else if (z > SHORE_Z + 4) label = "🏖️ Waikiki Beach";
    else if (x > -47 && x < -15 && z > -8 && z < 18) label = "🏊 Pool Deck";
    else if (z < -13) label = "🏨 Village Lobby";
    else label = "🌺 Resort Grounds";
    if (label !== zoneLast) { zoneLast = label; zoneEl.textContent = label; }

    var ptxt = "";
    var it = currentInteractable();
    if (it) ptxt = it.label;
    else {
      var a = !swimming && nearestActor(4.8);
      if (a) ptxt = "T — Talk to " + a.name;
    }
    if (ptxt !== promptLast) {
      promptLast = ptxt;
      if (ptxt) {
        promptEl.innerHTML = ptxt.replace(/^([ET])\s—/, "<b>$1</b> —");
        promptEl.style.display = "block";
      } else promptEl.style.display = "none";
    }
  }
  var needEls = {
    hunger: document.querySelector("#nb-hunger .fill"),
    fun: document.querySelector("#nb-fun .fill"),
    energy: document.querySelector("#nb-energy .fill")
  };
  function updateNeedsUI() {
    needEls.hunger.style.width = needs.hunger + "%";
    needEls.fun.style.width = needs.fun + "%";
    needEls.energy.style.width = needs.energy + "%";
  }
  var lowNeedToastT = 0;

  function seg(t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }

  // ------------------------------------------------------------------- loop
  var clock = new THREE.Clock();
  var camPos = new THREE.Vector3(0, 4, 26);
  var camLook = new THREE.Vector3(0, 2.6, 0);
  var camSnap = false;
  var stompImpactDone = false;
  var hudAcc = 0;

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
    if (moving && activity) stopActivity();

    // ---- swim state
    var px2 = sumo.position.x, pz2 = sumo.position.z;
    var inPool = Math.abs(px2 - POOL.x) < POOL.hx + 0.2 && Math.abs(pz2 - POOL.z) < POOL.hz + 0.2;
    var oceanDepth = SEA_LEVEL - terrainY(px2, pz2);
    var nowSwimming = inPool || (oceanDepth > 0.6 && !onDohyo(px2, pz2));
    if (nowSwimming && !swimming) {
      audio.splashBig();
      burstSplash(px2, inPool ? POOL.y : SEA_LEVEL, pz2, 8);
      spawnRipple(px2, pz2, inPool ? POOL.y : SEA_LEVEL);
      checkTask(inPool ? "pool" : "swim");
      stopActivity();
    }
    swimming = nowSwimming;
    swimWater = inPool ? POOL.y : SEA_LEVEL;

    var run = (keys.ShiftLeft || keys.ShiftRight) && needs.energy > 12;
    var speedMul = needs.hunger < 15 ? 0.72 : 1;
    var targetSpeed = 0;
    if (moving) {
      targetSpeed = swimming ? (run ? 5.0 : 3.2) : (run ? 9.0 : 4.4);
      targetSpeed *= speedMul;
    }
    speedNow += (targetSpeed - speedNow) * Math.min(1, dt * 6);

    if (moving) {
      var ang = Math.atan2(ix, iz) + camYaw;
      var diff = ang - facing;
      while (diff > Math.PI) diff -= 6.283;
      while (diff < -Math.PI) diff += 6.283;
      facing += diff * Math.min(1, dt * 9);

      var nx = sumo.position.x + Math.sin(facing) * speedNow * dt;
      var nz = sumo.position.z + Math.cos(facing) * speedNow * dt;
      nx = Math.max(-115, Math.min(115, nx));
      nz = Math.max(-62, Math.min(122, nz));
      if (!swimming || inPool) {
        var res = resolveCollisions(nx, nz, 1.0);
        nx = res.x; nz = res.z;
      }
      sumo.position.x = nx;
      sumo.position.z = nz;
    }
    sumo.rotation.y = facing + Math.PI; // the GLB model faces -Z at rest
    var gy = groundY(sumo.position.x, sumo.position.z);
    var ty = terrainY(sumo.position.x, sumo.position.z);
    var inWater = !swimming && ty < SEA_LEVEL && !onDohyo(sumo.position.x, sumo.position.z);
    if (swimming) {
      var targetSwimY = swimWater - 1.62;
      sumo.position.y += (targetSwimY - sumo.position.y) * Math.min(1, dt * 5);
    } else {
      sumo.position.y = gy;
    }

    // ---- animation dispatch
    var speedRatio = speedNow / 4.4;
    walkPhase += dt * speedRatio * 1.9;
    walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 7);

    if (playerReady) {
    if (stomp.t >= 0) {
      resetPose(rig);
      stomp.t += dt / 1.25;
      var s = stomp.t;
      var lift = poseShiko(rig, Math.min(s, 1), 1);
      window.__applyPlayerPose();
      if (s > 0.56 && !stompImpactDone) {
        stompImpactDone = true;
        shake = 0.75;
        audio.thump();
        setTimeout(function () { audio.thump(); }, 95);
        needs.energy = Math.max(0, needs.energy - 2);
        needs.fun = Math.min(100, needs.fun + 3);
        if (inWater) {
          spawnRipple(sumo.position.x, sumo.position.z);
          spawnRipple(sumo.position.x + 0.8, sumo.position.z + 0.4);
          audio.splash();
        } else {
          burstDust(sumo.position.x + Math.sin(facing + 0.4), gy, sumo.position.z + Math.cos(facing + 0.4), 16, 3.4);
          stampFootprint(sumo.position.x + Math.sin(facing + 0.45), sumo.position.z + Math.cos(facing + 0.45), facing);
          if (sumo.position.z > SHORE_Z) checkTask("stomp");
        }
      }
      if (s >= 1) { stomp.t = -1; stompImpactDone = false; }
    } else if (swimming) {
      resetPose(rig);
      poseSwim(rig, t);
      window.__applyPlayerPose();
      if (moving) {
        stepAcc += dt * 1.6;
        if (stepAcc > 1) {
          stepAcc = 0;
          spawnRipple(sumo.position.x, sumo.position.z, swimWater);
          if (Math.random() < 0.4) burstSplash(sumo.position.x, swimWater, sumo.position.z, 2);
        }
      }
    } else if (activity === "dance") {
      resetPose(rig);
      activityT += dt;
      poseDance(rig, activityT);
      window.__applyPlayerPose();
      needs.fun = Math.min(100, needs.fun + 2.6 * dt);
      needs.energy = Math.max(0, needs.energy - 0.5 * dt);
      strumTimer -= dt;
      if (strumTimer <= 0) {
        strumTimer = 0.42;
        audio.drum();
        if (strumN % 2 === 0) audio.strum((strumN / 2) % 4, false);
        strumN++;
      }
    } else if (activity === "uke") {
      resetPose(rig);
      activityT += dt;
      poseUke(rig, activityT);
      window.__applyPlayerPose();
      needs.fun = Math.min(100, needs.fun + 2.6 * dt);
      strumTimer -= dt;
      if (strumTimer <= 0) {
        audio.strum(((strumN / 2) | 0) % 4, strumN % 2 === 0);
        strumTimer = strumN % 2 === 0 ? 0.62 : 0.34;
        strumN++;
      }
    } else if (activity === "eat") {
      resetPose(rig);
      activityT += dt;
      poseEat(rig, activityT);
      window.__applyPlayerPose();
      if (activityT > 1.4 && activityT - dt <= 1.4) audio.munch();
      if (activityT >= 3.0) {
        if (eatKind === "chanko") { needs.hunger = Math.min(100, needs.hunger + 55); checkTask("chanko"); toast("🍲 Oishii! The oyakata's chanko hits different."); }
        if (eatKind === "shaveice") { needs.hunger = Math.min(100, needs.hunger + 30); needs.fun = Math.min(100, needs.fun + 14); checkTask("shaveice"); toast("🍧 Brain freeze. Worth it."); }
        if (eatKind === "pog") { needs.hunger = Math.min(100, needs.hunger + 16); needs.fun = Math.min(100, needs.fun + 14); checkTask("pog"); toast("🧃 Passion-orange-guava. Mahalo, Lani!"); }
        stopActivity();
      }
    } else if (activity === "relax") {
      resetPose(rig);
      poseLie(rig, t);
      window.__applyPlayerPose();
      needs.energy = Math.min(100, needs.energy + 6 * dt);
      needs.fun = Math.min(100, needs.fun + 0.6 * dt);
      if (relaxLounger) {
        sumo.position.x = relaxLounger.x;
        sumo.position.z = relaxLounger.z + 0.15;
        sumo.position.y = terrainY(relaxLounger.x, relaxLounger.z) + 0.12;
        facing = relaxLounger.ry;
      }
    } else {
      var wantAction = moving ? (run ? "run" : "walk") : "idle";
      setPlayerAction(wantAction);
      if (playerMixer) playerMixer.update(dt);

      stepAcc += dt * speedRatio * 1.9 * 2;
      if (stepAcc > 1 && walkAmt > 0.5) {
        stepAcc = 0;
        if (inWater) {
          spawnRipple(sumo.position.x, sumo.position.z);
          audio.splash();
        } else if (sumo.position.z > SHORE_Z && !onDohyo(sumo.position.x, sumo.position.z)) {
          stampFootprint(sumo.position.x, sumo.position.z, facing);
          if (run) burstDust(sumo.position.x, gy, sumo.position.z, 3, 1.2);
        }
      }
    }

    if (alohaT >= 0) {
      alohaT += dt / 1.1;
      var wv = Math.sin(Math.min(1, alohaT) * Math.PI);
      waveDummySh.rotation.set(0, 0, -0.62 - 2.2 * wv);
      waveDummyEl.rotation.set(-0.3 - Math.sin(alohaT * 18) * 0.35 * wv, 0, 0);
      playerBones["mixamorigRightArm"].quaternion.copy(playerRest["mixamorigRightArm"]).multiply(waveDummySh.quaternion);
      playerBones["mixamorigRightForeArm"].quaternion.copy(playerRest["mixamorigRightForeArm"]).multiply(waveDummyEl.quaternion);
      if (alohaT >= 1) alohaT = -1;
    }
    } // playerReady

    // ---- needs decay
    needs.hunger = Math.max(0, needs.hunger - 0.2 * dt);
    needs.fun = Math.max(0, needs.fun - 0.14 * dt);
    if (run && moving) needs.energy = Math.max(0, needs.energy - 1.1 * dt);
    else if (swimming && moving) needs.energy = Math.max(0, needs.energy - 0.8 * dt);
    else if (activity !== "relax") needs.energy = Math.min(100, needs.energy + (moving ? 0.4 : 1.2) * dt);
    if (swimming) needs.fun = Math.min(100, needs.fun + 1.2 * dt);
    lowNeedToastT -= dt;
    if (lowNeedToastT <= 0) {
      if (needs.hunger < 15) { toast("🍲 The yokozuna is HUNGRY — find chanko or shave ice!"); lowNeedToastT = 12; }
      else if (needs.energy < 12) { toast("⚡ Exhausted — relax on a lounger to recharge."); lowNeedToastT = 12; }
      else if (needs.fun < 15) { toast("🎉 Bored? Hula (G), ukulele (U), or go bother Ura."); lowNeedToastT = 12; }
    }

    // watch-the-bout task
    if (Math.hypot(sumo.position.x - DOHYO.x, sumo.position.z - DOHYO.z) < 11 && bout.t > 2.2 && bout.t < 8.5) {
      watchT += dt;
      if (watchT > 5) checkTask("watch");
    }

    // ---- NPCs
    updateActors(t, dt);

    // master calls out coaching now and then
    coachTimer -= dt;
    if (coachTimer <= 0) {
      coachTimer = 13 + Math.random() * 8;
      var M = window.__MASTER;
      if (M && !bubbleActor &&
          Math.hypot(M.g.position.x - sumo.position.x, M.g.position.z - sumo.position.z) < 26) {
        showBubble(M, M.coachLines[(Math.random() * M.coachLines.length) | 0], 3.4);
      }
    }

    // ---- camera
    var activityLow = activity === "relax" || swimming;
    var targetY = sumo.position.y + (activityLow ? 1.65 : 2.55);
    var lookAhead = moving ? Math.min(3.2, speedNow * 0.32) : 0.7;
    var shoulder = swimming ? 0.25 : (moving ? 0.85 : 0.45);
    var lookX = sumo.position.x + Math.sin(facing) * lookAhead + Math.sin(camYaw + Math.PI / 2) * shoulder;
    var lookZ = sumo.position.z + Math.cos(facing) * lookAhead + Math.cos(camYaw + Math.PI / 2) * shoulder;
    var cx = sumo.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist + Math.sin(camYaw + Math.PI / 2) * shoulder;
    var cz = sumo.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist + Math.cos(camYaw + Math.PI / 2) * shoulder;
    var cy = targetY + Math.sin(camPitch) * camDist;
    var minY = groundY(cx, cz) + 0.6;
    if (cy < minY) cy = minY;
    if (cy < SEA_LEVEL + 0.5) cy = SEA_LEVEL + 0.5;
    if (camSnap) { camPos.set(cx, cy, cz); camLook.set(lookX, targetY, lookZ); camSnap = false; }
    camPos.x += (cx - camPos.x) * Math.min(1, dt * 7);
    camPos.y += (cy - camPos.y) * Math.min(1, dt * 7);
    camPos.z += (cz - camPos.z) * Math.min(1, dt * 7);
    camLook.x += (lookX - camLook.x) * Math.min(1, dt * 8);
    camLook.y += (targetY - camLook.y) * Math.min(1, dt * 8);
    camLook.z += (lookZ - camLook.z) * Math.min(1, dt * 8);
    camera.position.copy(camPos);
    if (shake > 0.005) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake;
      shake *= Math.pow(0.0018, dt);
    }
    camera.lookAt(camLook);

    sun.position.copy(sumo.position).addScaledVector(sunDir, 260);
    sun.target.position.copy(sumo.position);
    glare.position.copy(camera.position).addScaledVector(sunDir, 3000);

    // ---- world life
    water.material.uniforms.time.value += dt * 0.6;
    for (var fi = 0; fi < foamStrips.length; fi++) {
      var fs = foamStrips[fi];
      var ph = t * 0.5 + fs.userData.phase;
      fs.position.z = WATERLINE_Z + 2 + Math.sin(ph) * 2.6;
      fs.material.opacity = 0.42 + 0.34 * Math.max(0, Math.sin(ph + 0.9));
      fs.material.map.offset.x = t * 0.004 * (fi ? -1 : 1);
    }
    for (var si = 0; si < swells.length; si++) {
      var sw = swells[si];
      var sp2 = ((t + sw.userData.t0) % 21) / 21;
      sw.position.z = 320 - sp2 * (320 - (WATERLINE_Z + 8));
      sw.material.opacity = Math.sin(sp2 * Math.PI) * 0.34;
      sw.position.x = Math.sin(sp2 * 9 + si * 2) * 12;
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
      if (clouds[ci2].position.x > 1500) clouds[ci2].position.x = -1500;
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
    for (var si2 = 0; si2 < splashes.length; si2++) {
      var sd = splashes[si2];
      if (sd.life <= 0) continue;
      sd.life -= dt;
      if (sd.life <= 0) { sd.sp.visible = false; continue; }
      sd.sp.position.x += sd.vx * dt;
      sd.sp.position.y += sd.vy * dt;
      sd.sp.position.z += sd.vz * dt;
      sd.vy -= 6.5 * dt;
      var lf2 = sd.life / sd.maxLife;
      sd.sp.material.opacity = lf2 * 0.9;
      var sc3 = 0.4 + (1 - lf2) * 1.1;
      sd.sp.scale.set(sc3, sc3, 1);
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
    for (var fpi = 0; fpi < footprints.length; fpi++) {
      var fp = footprints[fpi];
      if (fp.life <= 0) continue;
      fp.life -= dt * 0.05;
      if (fp.life <= 0) { fp.m.visible = false; continue; }
      fp.m.material.opacity = Math.min(1, fp.life * 2);
    }
    for (var sti = 0; sti < steam.length; sti++) {
      var stm = steam[sti];
      var sph = (t * 0.5 + stm.userData.ph) % 2;
      stm.position.set(60 + Math.sin(sph * 4) * 0.15, terrainY(60, 48.5) + 1.1 + sph * 1.1, 48.5);
      stm.material.opacity = Math.max(0, 0.5 - sph * 0.28);
      var ssc = 0.5 + sph * 0.7;
      stm.scale.set(ssc, ssc, 1);
    }

    // ---- ui + audio
    hudAcc += dt;
    if (hudAcc > 0.25) {
      hudAcc = 0;
      updateHud();
      updateNeedsUI();
    }
    updateBubble(dt);
    var seaProx = Math.max(0, Math.min(1, (sumo.position.z - 20) / 55));
    audio.update(t, dt, seaProx);

    renderer.render(scene, camera);
  }
  animate();

  // debug hooks for automated tests (harmless in normal play)
  window.__game = {
    start: start,
    _scene: scene, _cam: camera,
    _pos: function () {
      return { x: +sumo.position.x.toFixed(2), y: +sumo.position.y.toFixed(2), z: +sumo.position.z.toFixed(2) };
    },
    _fx: function () {
      var n = 0;
      for (var i = 0; i < dust.length; i++) if (dust[i].life > 0) n++;
      return { dust: n, stompT: stomp.t, shake: +shake.toFixed(3) };
    },
    _state: function () {
      return {
        swimming: swimming, activity: activity, needs: { h: needs.hunger | 0, f: needs.fun | 0, e: needs.energy | 0 },
        tasks: Object.keys(tasksDone).length, actors: actors.length, boutT: +bout.t.toFixed(1)
      };
    },
    tp: function (x, z, yaw) {
      sumo.position.x = x; sumo.position.z = z;
      if (yaw !== undefined) { facing = yaw; sumo.rotation.y = yaw + Math.PI; }
    },
    cam: function (yaw, pitch, dist) {
      camYaw = yaw; camPitch = pitch;
      if (dist) camDist = dist;
      camSnap = true;
    },
    act: toggleActivity,
    eat: startEat,
    talk: doTalk,
    interact: doInteract,
    stomp: triggerStomp,
    resetTasks: function () { tasksDone = {}; renderChecklist(); }
  };
})();
