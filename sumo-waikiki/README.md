# 🌺 ALOHA SUMO — Waikiki Village Resort

A 3D browser game: you are a **huge sumo wrestler in Hawaiian gear** roaming the
grounds of the Waikiki Village Resort on Oʻahu — waddle down the palm-lined
promenade, cross the pool deck, hit the sand, wade into the turquoise Pacific,
and gaze at **Diamond Head** hazy on the horizon.

![The resort](screenshots/resort.jpg)
![Diamond Head from the beach](screenshots/diamond-head.jpg)

## ▶️ How to play

**No install, no build, no internet needed.** Just open the file:

1. Double-click `sumo-waikiki/index.html` (or drag it into any modern browser
   — Chrome, Edge, Firefox, Safari).
2. Click or press any key to begin.

Everything — Three.js, textures, sounds — is local or generated procedurally at
runtime. The whole game is this folder.

## 🎮 Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrow keys | Waddle around |
| `SHIFT` | Thunder-run |
| `SPACE` | **Shiko stomp** (leg lift → ground-shaking slam, dust + camera shake) |
| `F` | Shout **ALOHA!** and wave |
| Mouse drag | Orbit the camera |
| Scroll wheel | Zoom |
| `M` | Mute / unmute |
| `R` | Return to the plaza |

**Touch devices:** left half of the screen is a walk joystick, right half looks
around, and there's a dedicated STOMP button.

## 🏝️ Things to do

- Walk south from the plaza, past the tiki torches, onto **Waikiki Beach**.
- Wade into the sea — ripples ring your legs, splashes play, and the waves get
  louder the closer you get.
- Look **left (southeast)** from the water: that's **Diamond Head** across the bay.
- Shiko-stomp on the wet sand. Or in the pool area. Or anywhere, honestly.
- Find the pool deck, the loungers, the surfboards, and the
  *WAIKIKI VILLAGE RESORT* welcome arch. Watch the gulls circle at dusk-gold hour.

## 🔧 Tech notes

- Three.js r128 (vendored in `lib/`, plain script tags so `file://` works).
- Real-time planar-reflection ocean (`Water.js`) with a procedurally generated
  tileable normal map; atmospheric-scattering sky (`Sky.js`).
- Every texture (sand, lawns, pavers, tower facades, aloha-print fabric, palm
  fronds, the resort sign) is painted onto canvases at runtime — zero asset files.
- Diamond Head is a procedural heightfield with a crater rim that peaks on the
  ocean side, tinted by vertex colors and distance haze.
- The sumo is a fully procedural rig (hips/knees/shoulders/elbows/head pivots)
  with a waddle cycle, belly jiggle, idle breathing, a timeline-driven shiko
  stomp, and an ALOHA wave — dressed in a lei, floral mawashi, headband,
  sunglasses, and flip-flops.
- Ocean/wind/gull/thump/splash audio is synthesized with the Web Audio API.
