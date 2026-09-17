"use client";

import { useMemo } from "react";
import { DoubleSide, Shape } from "three";
import { getRoof, getSiding, type ShedConfig } from "@/lib/shed-config";

type ShedModelProps = {
  config: ShedConfig;
};

const WALL_THICKNESS = 0.15;
const ROOF_THICKNESS = 0.12;
const OVERHANG = 0.4;
const PITCH = Math.PI / 6;
const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 6.5;
const DOOR_THICKNESS = 0.08;

export function ShedModel({ config }: ShedModelProps) {
  const { width, length, height } = config;
  const siding = getSiding(config.sidingId);
  const roof = getRoof(config.roofId);

  const halfWidth = width / 2;
  const halfLength = length / 2;
  const wallY = height / 2;

  const doorWidth = Math.min(DOOR_WIDTH, Math.max(2, width - 2));
  const doorHeight = Math.min(DOOR_HEIGHT, Math.max(5.5, height - 1.2));

  const roofWidth = width + OVERHANG * 2;
  const roofLength = length + OVERHANG * 2;
  const slopeWidth = roofWidth / 2 / Math.cos(PITCH);
  const roofRise = (roofWidth / 2) * Math.tan(PITCH);
  const roofMidY = height + roofRise / 2;
  const gableRise = halfWidth * Math.tan(PITCH);

  const gableShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(0, gableRise);
    shape.closePath();
    return shape;
  }, [halfWidth, gableRise]);

  return (
    <group>
      <mesh position={[0, wallY, halfLength]} castShadow receiveShadow>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshStandardMaterial
          color={siding.color}
          roughness={siding.roughness}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[0, wallY, -halfLength]} castShadow receiveShadow>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshStandardMaterial
          color={siding.color}
          roughness={siding.roughness}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[-halfWidth, wallY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, height, length]} />
        <meshStandardMaterial
          color={siding.color}
          roughness={siding.roughness}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[halfWidth, wallY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, height, length]} />
        <meshStandardMaterial
          color={siding.color}
          roughness={siding.roughness}
          metalness={0.04}
        />
      </mesh>

      <mesh
        key={`gable-front-${width}-${height}`}
        position={[0, height, halfLength - WALL_THICKNESS]}
        castShadow
      >
        <extrudeGeometry
          args={[
            gableShape,
            { depth: WALL_THICKNESS, bevelEnabled: false },
          ]}
        />
        <meshStandardMaterial
          color={siding.color}
          roughness={siding.roughness}
          metalness={0.04}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        key={`gable-back-${width}-${height}`}
        position={[0, height, -halfLength]}
        castShadow
      >
        <extrudeGeometry
          args={[
            gableShape,
            { depth: WALL_THICKNESS, bevelEnabled: false },
          ]}
        />
        <meshStandardMaterial
          color={siding.color}
          roughness={siding.roughness}
          metalness={0.04}
          side={DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, doorHeight / 2, halfLength + WALL_THICKNESS / 2]}
        castShadow
      >
        <boxGeometry args={[doorWidth, doorHeight, DOOR_THICKNESS]} />
        <meshStandardMaterial color="#2a2420" roughness={0.55} metalness={0.1} />
      </mesh>

      <mesh
        position={[-roofWidth / 4, roofMidY, 0]}
        rotation={[0, 0, PITCH]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[slopeWidth, ROOF_THICKNESS, roofLength]} />
        <meshStandardMaterial
          color={roof.color}
          metalness={roof.metalness}
          roughness={roof.roughness}
        />
      </mesh>
      <mesh
        position={[roofWidth / 4, roofMidY, 0]}
        rotation={[0, 0, -PITCH]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[slopeWidth, ROOF_THICKNESS, roofLength]} />
        <meshStandardMaterial
          color={roof.color}
          metalness={roof.metalness}
          roughness={roof.roughness}
        />
      </mesh>
    </group>
  );
}
