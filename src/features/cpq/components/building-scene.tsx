"use client";

import {
  memo,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import {
  Box3,
  Color,
  Vector2,
  Vector3,
  type Camera,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { BuildingModel } from "@/src/features/cpq/components/building-model";
import type { BuildingConfig } from "@/src/features/cpq/utils/catalog";

export type BuildingCapture = () => Promise<Blob>;

export type QuoteRevisionRenderFiles = {
  full: Blob;
  medium: Blob;
  small: Blob;
};

export type QuoteRevisionRenderCapture = () => Promise<QuoteRevisionRenderFiles>;

type BuildingSceneProps = {
  config: BuildingConfig;
  captureRef: RefObject<BuildingCapture | null>;
  renderCaptureRef?: RefObject<QuoteRevisionRenderCapture | null>;
};

const CAPTURE_MAX_EDGE = 1280;
const CAPTURE_JPEG_QUALITY = 0.85;
const RENDER_FIELD_OF_VIEW = 40;
const RENDER_FULL = { width: 1200, height: 900 };
const RENDER_MEDIUM = { width: 600, height: 450 };
const RENDER_SMALL = { width: 150, height: 150 };
const PERSPECTIVE_AIM = { polar: 1.05, azimuth: Math.PI / 5, fit: 0.82 };
const FRAME_LIMIT = 0.9;

const DESKTOP_CAMERA: [number, number, number] = [20, 12, 24];
const MOBILE_CAMERA: [number, number, number] = [30, 16, 36];
const MOBILE_QUERY = "(max-width: 1023px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function SceneCamera({ isMobile }: { isMobile: boolean }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);

  useLayoutEffect(() => {
    const position = isMobile ? MOBILE_CAMERA : DESKTOP_CAMERA;
    camera.position.set(...position);
    if (controls && "update" in controls) {
      (controls as { update: () => void }).update();
    }
  }, [camera, controls, isMobile]);

  return null;
}

function captureBuildingJpeg(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
): Promise<Blob> {
  renderer.render(scene, camera);
  const source = renderer.domElement;
  const longSide = Math.max(source.width, source.height);
  const scale = longSide > CAPTURE_MAX_EDGE ? CAPTURE_MAX_EDGE / longSide : 1;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Could not capture the building"));
  }
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error("Could not capture the building"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      CAPTURE_JPEG_QUALITY,
    );
  });
}

type OrbitState = {
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
};

function orbitState(controls: unknown): OrbitState | null {
  if (!controls || typeof controls !== "object" || !("target" in controls) || !("update" in controls)) return null;
  const orbit = controls as Partial<OrbitState>;
  if (!orbit.target || typeof orbit.update !== "function") return null;
  return orbit as OrbitState;
}

function perspectivePlacement(width: number, length: number, height: number, aspect: number) {
  const targetY = Math.max(2.5, height * 0.45);
  const target: [number, number, number] = [0, targetY, 0];
  const span = Math.max(width, length, height * 1.7);
  const vertical = Math.tan((RENDER_FIELD_OF_VIEW * Math.PI) / 360);
  const distance = span / 2 / Math.min(vertical, vertical * aspect) / PERSPECTIVE_AIM.fit;
  const sinPolar = Math.sin(PERSPECTIVE_AIM.polar);
  return {
    target,
    position: [
      target[0] + distance * sinPolar * Math.sin(PERSPECTIVE_AIM.azimuth),
      target[1] + distance * Math.cos(PERSPECTIVE_AIM.polar),
      target[2] + distance * sinPolar * Math.cos(PERSPECTIVE_AIM.azimuth),
    ] as [number, number, number],
  };
}

function canvasBlob(source: HTMLCanvasElement, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context || source.width === 0 || source.height === 0) {
    return Promise.reject(new Error("Could not capture the building"));
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error("Could not capture the building"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function isBuildingMesh(object: Object3D): object is Mesh {
  const mesh = object as Mesh;
  if (!mesh.isMesh || !mesh.geometry || mesh.geometry.type === "PlaneGeometry") return false;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return !materials.some((material) => material?.type === "ShadowMaterial");
}

function buildingBounds(scene: Scene): Box3 {
  const box = new Box3();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!isBuildingMesh(object)) return;
    box.expandByObject(object);
  });
  return box;
}

function boxCorners(box: Box3): Vector3[] {
  const { min, max } = box;
  return [
    new Vector3(min.x, min.y, min.z),
    new Vector3(min.x, min.y, max.z),
    new Vector3(min.x, max.y, min.z),
    new Vector3(min.x, max.y, max.z),
    new Vector3(max.x, min.y, min.z),
    new Vector3(max.x, min.y, max.z),
    new Vector3(max.x, max.y, min.z),
    new Vector3(max.x, max.y, max.z),
  ];
}

function viewDirection(): Vector3 {
  const sinPolar = Math.sin(PERSPECTIVE_AIM.polar);
  return new Vector3(
    sinPolar * Math.sin(PERSPECTIVE_AIM.azimuth),
    Math.cos(PERSPECTIVE_AIM.polar),
    sinPolar * Math.cos(PERSPECTIVE_AIM.azimuth),
  ).normalize();
}

function placeCamera(camera: PerspectiveCamera, center: Vector3, direction: Vector3, distance: number) {
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.lookAt(center);
  camera.updateMatrixWorld();
}

function projectedExtent(camera: PerspectiveCamera, corners: Vector3[]): number {
  const point = new Vector3();
  let extent = 0;
  for (const corner of corners) {
    point.copy(corner).project(camera);
    if (point.z < -1 || point.z > 1) return Number.POSITIVE_INFINITY;
    extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
  }
  return extent;
}

function frameBuilding(camera: PerspectiveCamera, box: Box3, width: number, height: number) {
  const center = box.getCenter(new Vector3());
  const corners = boxCorners(box);
  const direction = viewDirection();
  const span = box.getSize(new Vector3()).length();
  camera.aspect = width / height;
  camera.near = 0.05;
  camera.far = Math.max(400, span * 20);
  camera.updateProjectionMatrix();

  const fits = (distance: number) => {
    placeCamera(camera, center, direction, distance);
    camera.updateProjectionMatrix();
    return projectedExtent(camera, corners) <= FRAME_LIMIT;
  };

  let low = Math.max(0.5, span * 0.15);
  let high = Math.max(span * 4, 12);
  while (!fits(high) && high < span * 80) high *= 1.7;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) high = mid;
    else low = mid;
  }
  placeCamera(camera, center, direction, high);
  camera.updateProjectionMatrix();
}

function frameRender(
  camera: PerspectiveCamera,
  controls: unknown,
  config: BuildingConfig,
  box: Box3,
  width: number,
  height: number,
) {
  if (!box.isEmpty()) {
    frameBuilding(camera, box, width, height);
    return;
  }
  const placement = perspectivePlacement(config.width, config.length, config.height, width / height);
  camera.position.set(...placement.position);
  camera.lookAt(...placement.target);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const orbit = orbitState(controls);
  if (!orbit) return;
  orbit.target.set(...placement.target);
  orbit.update();
}

function captureRevisionRenders(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  controls: unknown,
  config: BuildingConfig,
): Promise<QuoteRevisionRenderFiles> {
  const position = camera.position.clone();
  const quaternion = camera.quaternion.clone();
  const orbit = orbitState(controls);
  const orbitTarget = orbit ? orbit.target.clone() : null;
  const minDistance = orbit?.minDistance;
  const maxDistance = orbit?.maxDistance;
  const size = new Vector2();
  renderer.getSize(size);
  const pixelRatio = renderer.getPixelRatio();
  const aspect = camera.aspect;
  const previousBackground = scene.background;
  const near = camera.near;
  const far = camera.far;
  const bounds = buildingBounds(scene);

  if (orbit) {
    orbit.minDistance = 1;
    orbit.maxDistance = 800;
  }

  try {
    scene.background = new Color("#ffffff");
    renderer.setPixelRatio(1);
    renderer.setScissorTest(false);
    frameRender(camera, controls, config, bounds, RENDER_FULL.width, RENDER_FULL.height);
    renderer.setSize(RENDER_FULL.width, RENDER_FULL.height, false);
    renderer.setViewport(0, 0, RENDER_FULL.width, RENDER_FULL.height);
    renderer.render(scene, camera);
    const full = canvasBlob(renderer.domElement, RENDER_FULL.width, RENDER_FULL.height, 0.9);
    const medium = canvasBlob(renderer.domElement, RENDER_MEDIUM.width, RENDER_MEDIUM.height, 0.86);
    frameRender(camera, controls, config, bounds, RENDER_SMALL.width, RENDER_SMALL.height);
    renderer.setSize(RENDER_SMALL.width, RENDER_SMALL.height, false);
    renderer.setViewport(0, 0, RENDER_SMALL.width, RENDER_SMALL.height);
    renderer.render(scene, camera);
    const small = canvasBlob(renderer.domElement, RENDER_SMALL.width, RENDER_SMALL.height, 0.9);
    return Promise.all([full, medium, small]).then(([fullBlob, mediumBlob, smallBlob]) => ({
      full: fullBlob,
      medium: mediumBlob,
      small: smallBlob,
    }));
  } finally {
    scene.background = previousBackground;
    camera.near = near;
    camera.far = far;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.position.copy(position);
    camera.quaternion.copy(quaternion);
    if (orbit && orbitTarget && minDistance != null && maxDistance != null) {
      orbit.target.copy(orbitTarget);
      orbit.minDistance = minDistance;
      orbit.maxDistance = maxDistance;
      orbit.update();
    }
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.x, size.y, false);
    renderer.render(scene, camera);
  }
}

function CaptureBridge({
  captureRef,
  renderCaptureRef,
  config,
}: {
  captureRef: RefObject<BuildingCapture | null>;
  renderCaptureRef?: RefObject<QuoteRevisionRenderCapture | null>;
  config: BuildingConfig;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    captureRef.current = () => captureBuildingJpeg(gl, scene, camera);
    if (renderCaptureRef) {
      renderCaptureRef.current = () =>
        captureRevisionRenders(gl, scene, camera as PerspectiveCamera, controls, config);
    }
    return () => {
      captureRef.current = null;
      if (renderCaptureRef) renderCaptureRef.current = null;
    };
  }, [camera, captureRef, config, controls, gl, renderCaptureRef, scene]);

  return null;
}

function BuildingScene({ config, captureRef, renderCaptureRef }: BuildingSceneProps) {
  const isMobile = useIsMobile();

  return (
    <div className="h-full w-full" role="application" aria-label="3D building view">
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        className="h-full w-full"
        camera={{
          position: isMobile ? MOBILE_CAMERA : DESKTOP_CAMERA,
          fov: 40,
          near: 0.1,
          far: 200,
        }}
      >
        <color attach="background" args={["#e6e8ea"]} />
        <ambientLight intensity={0.55} />
        <directionalLight
          castShadow
          position={[12, 18, 10]}
          intensity={1.35}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={60}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <hemisphereLight args={["#f4f7fb", "#8a9488", 0.35]} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <shadowMaterial transparent opacity={0.35} />
        </mesh>

        <Suspense fallback={null}>
          <Environment preset="warehouse" environmentIntensity={0.4} />
          <BuildingModel config={config} />
        </Suspense>

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.4}
          scale={50}
          blur={2.2}
          far={18}
        />
        <OrbitControls
          makeDefault
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2 - 0.08}
          minDistance={8}
          maxDistance={60}
          target={[0, 4, 0]}
          enableDamping
        />
        <SceneCamera isMobile={isMobile} />
        <CaptureBridge captureRef={captureRef} renderCaptureRef={renderCaptureRef} config={config} />
      </Canvas>
    </div>
  );
}

export default memo(BuildingScene);
