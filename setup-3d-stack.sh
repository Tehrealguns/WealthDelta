#!/bin/bash
echo "Setting up 3D Showcase + UI/UX Pro Max stack..."

# --- UI/UX Pro Max Skill ---
npm install -g uipro-cli
uipro init --ai cursor

# --- 3D Dependencies ---
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing gsap leva
npm install -D @types/three

# --- MCP config ---
mkdir -p .cursor/rules

cat > .cursor/mcp.json << 'EOF'
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["blender-mcp"]
    },
    "three-js": {
      "command": "npx",
      "args": ["-y", "three-js-mcp"]
    },
    "sketchfab-models": {
      "command": "npx",
      "args": ["-y", "mcp-server-threejs"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "YOUR_KEY_HERE"
      }
    }
  }
}
EOF

# --- Cursor Rules ---
cat > .cursor/rules/3d-stack.mdc << 'EOF'
---
alwaysApply: true
---

# 3D Showcase Stack

## Rendering
- Always use Three.js + React Three Fiber (R3F) for any 3D element
- Use @react-three/drei for helpers (OrbitControls, Environment, useGLTF)
- Use @react-three/postprocessing for bloom, chromatic aberration, depth of field
- GSAP ScrollTrigger for scroll-driven camera — never CSS scroll-snap for hero sections
- Leva for live debug controls in dev only

## Visual quality (non-negotiable)
- ACESFilmic tonemapping always on
- PBR materials: metalness/roughness + normal maps minimum
- HDRI environment map + directional light always
- PCFSoftShadowMap, shadow frustum tight to scene
- Post: bloom on emissive surfaces, subtle vignette, light film grain

## Scroll
- GSAP ScrollTrigger pinned sections for camera paths
- Camera path via CatmullRomCurve3 with lerped progress
- Never raw window.addEventListener scroll

## Performance
- Drei Preload + Suspense boundaries
- Instanced meshes for repeated geometry
- Draco-compressed GLTF/GLB models
- Dispose geometries and textures on unmount

## Code structure
- R3F + TypeScript always
- Split files: Scene.tsx, Camera.tsx, Materials.tsx, Lights.tsx
- Custom hooks: useScrollProgress, useAssetLoader
EOF

echo ""
echo "Done! One manual step:"
echo ""
echo "   Blender addon: Open Blender > Edit > Preferences > Add-ons"
echo "   > Install from disk > blender_addon.py (from blender-mcp)"
echo ""
echo "   Firecrawl key: Edit .cursor/mcp.json and replace YOUR_KEY_HERE"
echo "   Get one free at: https://firecrawl.dev"
echo ""
echo "   Then restart Cursor and you're live"
