"use client";

import { Suspense, memo, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  PerspectiveCamera,
  Vector4,
  WebGLRenderTarget,
  type Scene,
  type WebGLRenderer,
} from "three";
import { BuildingModel } from "@/src/features/cpq/components/building-model";
import type { BuildingCapture } from "@/src/features/cpq/components/building-scene";
import { getStyle, type BuildingConfig } from "@/src/features/cpq/utils/catalog";
import { roofPeakHeight } from "@/src/features/cpq/utils/geometry";

export type DesignAngle = "left" | "right" | "top" | "front";

export type DesignAngleView = {
  id: string;
  angle: DesignAngle;
  label: string;
  track: { current: HTMLElement | null };
  captureRef: { current: BuildingCapture | null };
};

type BuildingViewsProps = {
  config: BuildingConfig;
  views: DesignAngleView[];
  stageRef: RefObject<HTMLElement | null>;
  onReady: () => void;
};

const CAPTURE_WIDTH = 960;
const CAPTURE_HEIGHT = 720;
const FIELD_OF_VIEW = 40;
const CARD_RADIUS = 12;
const SKID_HEIGHT = 0.5;

const ANGLE_AIM: Record<DesignAngle, { polar: number; azimuth: number; fit: number }> = {
  front: { polar: 1.05, azimuth: 0, fit: 0.78 },
  right: { polar: 1.05, azimuth: Math.PI / 2, fit: 0.78 },
  left: { polar: 1.05, azimuth: -Math.PI / 2, fit: 0.78 },
  top: { polar: 0.12, azimuth: 0.2, fit: 0.82 },
};

type CameraPlacement = {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
};

function cameraPlacement(angle: DesignAngle, config: BuildingConfig): CameraPlacement {
  const { width, length, height } = config;
  const top = SKID_HEIGHT + roofPeakHeight(getStyle(config.styleId), height, width);
  const target: [number, number, number] = [0, top / 2, 0];
  const span = angle === "top" ? Math.hypot(width, length) : Math.max(width, length, height * 1.7);
  const distance = span / 2 / Math.tan((FIELD_OF_VIEW * Math.PI) / 360) / ANGLE_AIM[angle].fit;
  const aim = ANGLE_AIM[angle];
  const sinPolar = Math.sin(aim.polar);
  return {
    target,
    distance,
    position: [
      target[0] + distance * sinPolar * Math.sin(aim.azimuth),
      target[1] + distance * Math.cos(aim.polar),
      target[2] + distance * sinPolar * Math.cos(aim.azimuth),
    ],
  };
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

const linearToSrgb = new Uint8Array(256);
for (let value = 0; value < 256; value++) {
  const channel = value / 255;
  const encoded = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  linearToSrgb[value] = Math.round(Math.min(1, Math.max(0, encoded)) * 255);
}

function captureCamera(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, target: WebGLRenderTarget): Promise<Blob> {
  const previousTarget = renderer.getRenderTarget();
  const previousAspect = camera.aspect;
  const previousAutoClear = renderer.autoClear;
  const previousViewport = renderer.getViewport(new Vector4());
  const previousScissor = renderer.getScissor(new Vector4());
  const previousScissorTest = renderer.getScissorTest();
  const pixels = new Uint8Array(CAPTURE_WIDTH * CAPTURE_HEIGHT * 4);
  try {
    camera.aspect = CAPTURE_WIDTH / CAPTURE_HEIGHT;
    camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    renderer.autoClear = true;
    renderer.setRenderTarget(target);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    renderer.setClearColor("#ffffff", 1);
    renderer.clear(true, true);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT, pixels);
  } finally {
    camera.aspect = previousAspect;
    camera.updateProjectionMatrix();
    renderer.setRenderTarget(previousTarget);
    renderer.setViewport(previousViewport);
    renderer.setScissor(previousScissor);
    renderer.setScissorTest(previousScissorTest);
    renderer.autoClear = previousAutoClear;
  }

  const shot = document.createElement("canvas");
  shot.width = CAPTURE_WIDTH;
  shot.height = CAPTURE_HEIGHT;
  const context = shot.getContext("2d");
  if (!context) return Promise.reject(new Error("Could not capture the building"));
  const image = context.createImageData(CAPTURE_WIDTH, CAPTURE_HEIGHT);
  const row = CAPTURE_WIDTH * 4;
  for (let y = 0; y < CAPTURE_HEIGHT; y++) {
    const source = (CAPTURE_HEIGHT - 1 - y) * row;
    const destination = y * row;
    for (let offset = 0; offset < row; offset += 4) {
      image.data[destination + offset] = linearToSrgb[pixels[source + offset]];
      image.data[destination + offset + 1] = linearToSrgb[pixels[source + offset + 1]];
      image.data[destination + offset + 2] = linearToSrgb[pixels[source + offset + 2]];
      image.data[destination + offset + 3] = pixels[source + offset + 3];
    }
  }
  context.putImageData(image, 0, 0);
  return new Promise((resolve, reject) => {
    shot.toBlob((blob) => {
      if (!blob || blob.size === 0) {
        reject(new Error("Could not capture the building"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function applyDistance(control: OrbitControls, placement: CameraPlacement) {
  control.target.set(...placement.target);
  control.minDistance = Math.max(4, placement.distance * 0.4);
  control.maxDistance = placement.distance * 2.6;
  control.update();
}

function SharedStage({
  config,
  views,
  stageRef,
}: BuildingViewsProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const viewsRef = useRef(views);
  viewsRef.current = views;
  const cameras = useRef(new Map<string, PerspectiveCamera>());
  const controls = useRef(new Map<string, OrbitControls>());
  const placed = useRef(new Map<string, string>());
  const captureTarget = useRef<WebGLRenderTarget | null>(null);

  function renderTarget(): WebGLRenderTarget {
    if (!captureTarget.current) {
      captureTarget.current = new WebGLRenderTarget(CAPTURE_WIDTH, CAPTURE_HEIGHT);
    }
    return captureTarget.current;
  }

  function ensure(view: DesignAngleView) {
    const placement = cameraPlacement(view.angle, config);
    const key = `${view.angle}:${config.styleId}:${config.width}:${config.length}:${config.height}`;
    let camera = cameras.current.get(view.id);
    if (!camera) {
      camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 400);
      cameras.current.set(view.id, camera);
    }
    if (placed.current.get(view.id) !== key) {
      camera.position.set(...placement.position);
      camera.lookAt(...placement.target);
      camera.updateProjectionMatrix();
      placed.current.set(view.id, key);
      const existing = controls.current.get(view.id);
      if (existing) applyDistance(existing, placement);
    }
    const track = view.track.current;
    if (track && !controls.current.has(view.id)) {
      const control = new OrbitControls(camera, track);
      control.enablePan = false;
      control.enableDamping = true;
      control.minPolarAngle = 0.02;
      control.maxPolarAngle = Math.PI / 2 - 0.05;
      applyDistance(control, placement);
      controls.current.set(view.id, control);
    }
    view.captureRef.current = () => captureCamera(gl, scene, camera, renderTarget());
  }

  const signature = views.map((view) => `${view.id}:${view.angle}`).join("|");
  const sizeKey = `${config.styleId}:${config.width}:${config.length}:${config.height}`;

  useLayoutEffect(() => {
    const live = new Set(viewsRef.current.map((view) => view.id));
    for (const [id, control] of controls.current) {
      if (live.has(id)) continue;
      control.dispose();
      controls.current.delete(id);
      cameras.current.delete(id);
      placed.current.delete(id);
    }
    for (const view of viewsRef.current) ensure(view);
    // ensure reads the latest views, cameras, and building size for this signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, sizeKey]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    return () => {
      for (const control of controls.current.values()) control.dispose();
      controls.current.clear();
      captureTarget.current?.dispose();
      captureTarget.current = null;
      for (const view of viewsRef.current) view.captureRef.current = null;
    };
  }, [gl]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const apply = () => {
      const bounds = gl.domElement.getBoundingClientRect();
      const paths: string[] = [];
      for (const view of viewsRef.current) {
        const track = view.track.current;
        if (!track) continue;
        const rect = track.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        paths.push(
          roundedRectPath(rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height, CARD_RADIUS),
        );
      }
      gl.domElement.style.clipPath = paths.length > 0 ? `path('${paths.join(" ")}')` : "";
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(stage);
    for (const view of viewsRef.current) {
      if (view.track.current) observer.observe(view.track.current);
    }
    return () => observer.disconnect();
  }, [gl, signature, stageRef]);

  useFrame(() => {
    for (const view of viewsRef.current) {
      if (!controls.current.has(view.id) || view.captureRef.current == null) ensure(view);
    }
    for (const control of controls.current.values()) control.update();

    const canvasRect = gl.domElement.getBoundingClientRect();
    const scaleX = canvasRect.width > 0 ? gl.domElement.width / canvasRect.width : 1;
    const scaleY = canvasRect.height > 0 ? gl.domElement.height / canvasRect.height : 1;
    gl.setScissorTest(true);
    gl.setClearColor("#ffffff", 1);
    let drewShadow = false;
    for (const view of viewsRef.current) {
      const track = view.track.current;
      const camera = cameras.current.get(view.id);
      if (!track || !camera) continue;
      const rect = track.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const left = Math.round((rect.left - canvasRect.left) * scaleX);
      const bottom = Math.round((canvasRect.bottom - rect.bottom) * scaleY);
      const width = Math.round(rect.width * scaleX);
      const height = Math.round(rect.height * scaleY);
      if (width < 1 || height < 1) continue;
      const aspect = rect.width / rect.height;
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      gl.setViewport(left, bottom, width, height);
      gl.setScissor(left, bottom, width, height);
      gl.clear(true, true);
      if (!drewShadow) {
        gl.shadowMap.needsUpdate = true;
        drewShadow = true;
      }
      gl.render(scene, camera);
    }
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
  }, 1);

  return null;
}

const DesignShadow = memo(function DesignShadow() {
  return <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={50} blur={2.2} far={18} frames={1} />;
});

function ReadySignal({ onReady }: { onReady: () => void }) {
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    ready.current();
  }, []);
  return null;
}

export default function BuildingViews({ config, views, stageRef, onReady }: BuildingViewsProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: true }}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      camera={{ fov: FIELD_OF_VIEW, near: 0.1, far: 400, position: [0, 8, 24] }}
    >
      <color attach="background" args={["#ffffff"]} />
      <ambientLight intensity={0.62} />
      <directionalLight
        castShadow
        position={[12, 18, 10]}
        intensity={1.35}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={140}
        shadow-camera-near={1}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <hemisphereLight args={["#f7f8fa", "#8d968c", 0.38]} />
      <Suspense fallback={null}>
        <Environment preset="warehouse" environmentIntensity={0.4} />
        <BuildingModel config={config} />
        <DesignShadow key={`${config.styleId}:${config.width}:${config.length}:${config.height}`} />
        <ReadySignal onReady={onReady} />
      </Suspense>
      <SharedStage config={config} views={views} stageRef={stageRef} />
    </Canvas>
  );
}
