# 山海行 · Shanhai Walker

A browser-based open-world terrain explorer built with Three.js. Procedurally generate islands, sculpt terrain with a brush, and explore on foot or in flight.

## Run locally

No build step required — Three.js loads from CDN.

```bash
python3 -m http.server 5173
```

Open http://localhost:5173

Or with Vite:

```bash
npm install
npm run dev
```

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Space | Jump / glide |
| Shift | Sprint |
| E | Climb |
| F | Fly |
| Ctrl | Descend (fly) |
| G | Toggle grid |
| M | Minimap |
| T | Terrain brush editor |
| P | Island parameters panel |

## Island editor (P)

- Adjust island shape, mountains, hills, crescents, holes, and clearings — terrain updates live
- **导入 JSON 文件** / **粘贴 JSON** — load a saved world (includes hand-painted layer)
- **复制 JSON** — export world + paint data

## Tech

- Three.js (CDN import map)
- Custom heightmap island generator
- Hand-painted terrain deltas layered on procedural base
