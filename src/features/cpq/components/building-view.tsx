"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import { BuildingModel } from "@/src/features/cpq/components/building-model";
import type { BuildingCapture } from "@/src/features/cpq/components/building-scene";
import type { BuildingConfig } from "@/src/features/cpq/utils/catalog";

export type DesignAngle = "left" | "right" | "top" | "front";

type BuildingViewProps = {
  config: BuildingConfig;
  angle: DesignAngle;
  label: string;
  captureRef: RefObject<BuildingCapture | null>;
};

const CAPTURE_WIDTH = 960;
const CAPTURE_HEIGHT = 720;
const FIELD_OF_VIEW = 40;

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

function cameraPlacement(angle: DesignAngle, width: number, length: number, height: number): CameraPlacement {
  const targetY = angle === "top" ? Math.max(1, height * 0.2) : Math.max(2.5, height * 0.45);
  const target: [number, number, number] = [0, targetY, 0];
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

function captureView(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): Promise<Blob> {
  const size = new Vector2();
  renderer.getSize(size);
  const pixelRatio = renderer.getPixelRatio();
  const aspect = camera.aspect;
  const shot = document.createElement("canvas");
  shot.width = CAPTURE_WIDTH;
  shot.height = CAPTURE_HEIGHT;
  const context = shot.getContext("2d");
  if (!context) return Promise.reject(new Error("Could not capture the building"));

  try {
    camera.aspect = CAPTURE_WIDTH / CAPTURE_HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(1);
    renderer.setSize(CAPTURE_WIDTH, CAPTURE_HEIGHT, false);
    renderer.render(scene, camera);
    context.drawImage(renderer.domElement, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  } finally {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.x, size.y, false);
    renderer.render(scene, camera);
  }

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

function ViewCamera({ placement }: { placement: CameraPlacement }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);

  useLayoutEffect(() => {
    camera.position.set(...placement.position);
    camera.lookAt(...placement.target);
    if (controls && "target" in controls && "update" in controls) {
      const orbit = controls as unknown as {
        target: { set: (x: number, y: number, z: number) => void };
        minDistance: number;
        maxDistance: number;
        update: () => void;
      };
      orbit.target.set(...placement.target);
      orbit.minDistance = Math.max(4, placement.distance * 0.4);
      orbit.maxDistance = placement.distance * 2.6;
      orbit.update();
    }
  }, [camera, controls, placement]);

  return null;
}

function CaptureBridge({ captureRef }: { captureRef: RefObject<BuildingCapture | null> }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    captureRef.current = () => captureView(gl, scene, camera as PerspectiveCamera);
    return () => {
      captureRef.current = null;
    };
  }, [camera, captureRef, gl, scene]);

  return null;
}

function BuildingView({ config, angle, label, captureRef }: BuildingViewProps) {
  const placement = useMemo(
    () => cameraPlacement(angle, config.width, config.length, config.height),
    [angle, config.height, config.length, config.width],
  );

  return (
    <div className="absolute inset-0" role="application" aria-label={label}>
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
        className="h-full w-full"
        camera={{
          position: placement.position,
          fov: FIELD_OF_VIEW,
          near: 0.1,
          far: 400,
        }}
      >
        <color attach="background" args={["#ffffff"]} />
        <ambientLight intensity={0.62} />
        <directionalLight
          castShadow
          position={[12, 18, 10]}
          intensity={1.35}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={80}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
        />
        <hemisphereLight args={["#f7f8fa", "#8d968c", 0.38]} />
        <Suspense fallback={null}>
          <Environment preset="warehouse" environmentIntensity={0.4} />
          <BuildingModel config={config} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={placement.target}
          enablePan={false}
          enableDamping
          minPolarAngle={0.02}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
        <ViewCamera placement={placement} />
        <CaptureBridge captureRef={captureRef} />
      </Canvas>
    </div>
  );
}

export default BuildingView;
