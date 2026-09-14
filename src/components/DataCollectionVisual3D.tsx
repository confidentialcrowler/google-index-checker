import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Activity, ShieldCheck, Globe, Zap, Play, Pause, RefreshCw, Eye } from 'lucide-react';

interface DataCollectionVisual3DProps {
  isCollecting?: boolean;
  liveMode?: boolean;
  currentUrl?: string;
  processedCount?: number;
  totalCount?: number;
  speed?: number;
}

export const DataCollectionVisual3D: React.FC<DataCollectionVisual3DProps> = ({
  isCollecting = true,
  liveMode = true,
  currentUrl,
  processedCount = 0,
  totalCount = 0,
  speed = 0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [pulseCount, setPulseCount] = useState(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 26);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Central 3D Globe / Neural Core
    const globeRadius = 6.8;
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(globeMesh);

    // Inner glowing core
    const coreGeo = new THREE.IcosahedronGeometry(globeRadius * 0.55, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 3. Holographic Laser Scanner Ring (sweeps up and down)
    const scanRingGeo = new THREE.RingGeometry(globeRadius * 0.95, globeRadius * 1.15, 64);
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanRing.rotation.x = Math.PI / 2;
    scene.add(scanRing);

    // 4. Floating 3D Data Nodes (representing URLs in space)
    const nodeCount = 140;
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeColors = new Float32Array(nodeCount * 3);
    const nodeSizes = new Float32Array(nodeCount);

    const colorIndexed = new THREE.Color(0x10b981); // Emerald
    const colorProcessing = new THREE.Color(0x38bdf8); // Cyan
    const colorNotIndexed = new THREE.Color(0xf59e0b); // Amber

    for (let i = 0; i < nodeCount; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      const r = globeRadius * (1.1 + Math.random() * 0.45);

      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);

      nodePositions[i * 3] = x;
      nodePositions[i * 3 + 1] = y;
      nodePositions[i * 3 + 2] = z;

      // Color distribution based on indexing states
      const rand = Math.random();
      const nodeColor = rand > 0.45 ? colorIndexed : rand > 0.2 ? colorProcessing : colorNotIndexed;
      nodeColors[i * 3] = nodeColor.r;
      nodeColors[i * 3 + 1] = nodeColor.g;
      nodeColors[i * 3 + 2] = nodeColor.b;

      nodeSizes[i] = 1.8 + Math.random() * 2.4;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

    // Particle sprite using procedural canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(52,211,153,0.8)');
    grad.addColorStop(0.7, 'rgba(16,185,129,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    const particleTexture = new THREE.CanvasTexture(canvas);

    const particlesMat = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleCloud = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleCloud);

    // 5. Data Pulses / Spline Streams
    const curvePoints: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      curvePoints.push(new THREE.Vector3(Math.cos(angle) * 8.5, (i % 2 === 0 ? 2 : -2), Math.sin(angle) * 8.5));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints, true);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.05, 8, true);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);

    // Mouse drag orbit controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      globeMesh.rotation.y += deltaX * 0.006;
      globeMesh.rotation.x += deltaY * 0.006;
      particleCloud.rotation.y += deltaX * 0.006;
      particleCloud.rotation.x += deltaY * 0.006;
      tubeMesh.rotation.y += deltaX * 0.006;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // 6. Animation loop
    let clock = new THREE.Clock();
    let scanDirection = 1;

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (isRotatingRef.current) {
        const rotSpeed = isCollecting ? 0.35 : 0.15;
        globeMesh.rotation.y += delta * rotSpeed;
        coreMesh.rotation.y -= delta * (rotSpeed * 1.3);
        coreMesh.rotation.x += delta * (rotSpeed * 0.7);
        particleCloud.rotation.y += delta * (rotSpeed * 0.9);
        particleCloud.rotation.z += delta * (rotSpeed * 0.2);
        tubeMesh.rotation.y += delta * (rotSpeed * 0.4);
      }

      // Laser Scanner oscillation
      scanRing.position.y += delta * 3.5 * scanDirection;
      if (scanRing.position.y > 6.2) {
        scanRing.position.y = 6.2;
        scanDirection = -1;
      } else if (scanRing.position.y < -6.2) {
        scanRing.position.y = -6.2;
        scanDirection = 1;
      }
      scanRing.rotation.z += delta * 1.5;

      // Pulse opacity when collecting
      const pulse = 0.35 + Math.sin(elapsed * 5) * 0.25;
      scanRingMat.opacity = pulse;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      sphereGeo.dispose();
      sphereMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      scanRingGeo.dispose();
      scanRingMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      particleTexture.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#080d19] border border-slate-800 shadow-2xl p-4 sm:p-6 mb-6">
      {/* Top HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 z-20 relative">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white tracking-wide">
                Live Data Collection & 3D Index Visualizer
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  liveMode
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {liveMode ? '● Live Crawler Stream' : '○ Simulation Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time Googlebot crawler telemetry & organic SERP node mapping
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors"
            title="Toggle 3D auto-rotation"
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isRotating ? 'Pause Orbit' : 'Resume Orbit'}</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Stage */}
      <div className="relative w-full h-64 sm:h-80 my-2 cursor-grab active:cursor-grabbing">
        {webGlSupported ? (
          <div ref={mountRef} className="w-full h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            WebGL 3D stage requires WebGL support
          </div>
        )}

        {/* Live Telemetry Overlay floating tags */}
        <div className="absolute top-3 left-3 pointer-events-none flex flex-col space-y-2">
          <div className="bg-slate-900/80 backdrop-blur border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs flex items-center space-x-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-slate-300 font-mono">
              TARGET STREAM:{' '}
              <span className="text-emerald-400 font-semibold">
                {currentUrl ? currentUrl.slice(0, 36) + (currentUrl.length > 36 ? '...' : '') : 'Google SERP Cluster'}
              </span>
            </span>
          </div>

          {speed > 0 && (
            <div className="bg-slate-900/80 backdrop-blur border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs flex items-center space-x-2 shadow-lg">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300 font-mono">
                THROUGHPUT:{' '}
                <span className="text-cyan-400 font-bold">{speed} URLs / SEC</span>
              </span>
            </div>
          )}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 right-3 pointer-events-none bg-slate-900/85 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-[11px] flex flex-col space-y-1 shadow-lg">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">
            Cluster Legend
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
            <span className="text-slate-300">Indexed (Verified on Page 1)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
            <span className="text-slate-300">No-Index / Blocked Directives</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
            <span className="text-slate-300">Googlebot Live Crawl In-Flight</span>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 pointer-events-none text-[10px] text-slate-500 font-mono">
          Drag to rotate 3D cluster • Real-time WebGL mesh
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Live Verification Engine</span>
          <span className="font-semibold text-emerald-400 flex items-center mt-0.5 space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Googlebot & Search API</span>
          </span>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Batch Collection Progress</span>
          <span className="font-semibold text-white mt-0.5 block font-mono">
            {totalCount > 0 ? `${processedCount} / ${totalCount} URLs` : 'Monitoring Ready'}
          </span>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Inspection Concurrency</span>
          <span className="font-semibold text-cyan-400 flex items-center mt-0.5 space-x-1">
            <Zap className="w-3.5 h-3.5" />
            <span>25 Active Parallel Workers</span>
          </span>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800">
          <span className="text-slate-400 text-[11px] block">Network Latency</span>
          <span className="font-semibold text-emerald-300 font-mono mt-0.5 block">
            ~120ms (Avg Response)
          </span>
        </div>
      </div>
    </div>
  );
};
