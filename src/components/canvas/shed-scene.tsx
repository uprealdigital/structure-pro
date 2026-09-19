"use client";

import { memo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { ShedModel } from "@/src/components/canvas/shed-model";
import type { ShedConfig } from "@/src/config/shed-config";

type ShedSceneProps = {
  config: ShedConfig;
};

function ShedScene({ config }: ShedSceneProps) {
  return (
    <div className="h-full w-full" role="application" aria-label="3D shed view">
      <Canvas
        shadows
        className="h-full w-full"
        camera={{
          position: [20, 12, 24],
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
          <ShedModel config={config} />
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
      </Canvas>
    </div>
  );
}

export default memo(ShedScene);
