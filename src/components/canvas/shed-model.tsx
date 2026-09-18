"use client";

import { useMemo } from "react";
import { DoubleSide, Shape } from "three";
import {
  getColor,
  getRoofType,
  getSidingType,
  getStyle,
  type ShedConfig,
} from "@/src/config/shed-config";

type ShedModelProps = {
  config: ShedConfig;
};

const WALL_THICKNESS = 0.15;
const ROOF_THICKNESS = 0.12;
const OVERHANG = 0.4;
const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 6.5;
const DOOR_THICKNESS = 0.08;

export function ShedModel({ config }: ShedModelProps) {
  const { width, length, height } = config;
  const style = getStyle(config.styleId);
  const siding = getColor(config.sidingColorId);
  const trim = getColor(config.trimColorId);
  const roofColor = getColor(config.roofColorId);
  const shutter = getColor(config.shutterColorId);
  const sidingType = getSidingType(config.sidingTypeId);
  const roofType = getRoofType(config.roofTypeId);
  const pitch = style.pitch;

  const halfWidth = width / 2;
  const halfLength = length / 2;
  const wallY = height / 2;

  const doorWidth = Math.min(DOOR_WIDTH, Math.max(2, width - 2));
  const doorHeight = Math.min(DOOR_HEIGHT, Math.max(5.5, height - 1.2));

  const roofWidth = width + OVERHANG * 2;
  const roofLength = length + OVERHANG * 2;
  const slopeWidth = roofWidth / 2 / Math.cos(pitch);
  const roofRise = (roofWidth / 2) * Math.tan(pitch);
  const roofMidY = height + roofRise / 2;
  const gableRise = halfWidth * Math.tan(pitch);

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
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[0, wallY, -halfLength]} castShadow receiveShadow>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshStandardMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[-halfWidth, wallY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, height, length]} />
        <meshStandardMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[halfWidth, wallY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, height, length]} />
        <meshStandardMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={0.04}
        />
      </mesh>

      <mesh
        key={`gable-front-${width}-${height}-${pitch}`}
        position={[0, height, halfLength - WALL_THICKNESS]}
        castShadow
      >
        <extrudeGeometry
          args={[gableShape, { depth: WALL_THICKNESS, bevelEnabled: false }]}
        />
        <meshStandardMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={0.04}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        key={`gable-back-${width}-${height}-${pitch}`}
        position={[0, height, -halfLength]}
        castShadow
      >
        <extrudeGeometry
          args={[gableShape, { depth: WALL_THICKNESS, bevelEnabled: false }]}
        />
        <meshStandardMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={0.04}
          side={DoubleSide}
        />
      </mesh>

      {config.doorStyle !== "none" ? (
        <group position={[0, doorHeight / 2, halfLength + WALL_THICKNESS / 2]}>
          <mesh castShadow>
            <boxGeometry args={[doorWidth + 0.16, doorHeight + 0.16, DOOR_THICKNESS]} />
            <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
          </mesh>
          {config.doorStyle === "double" ? (
            <>
              <mesh position={[-doorWidth / 4, 0, 0.02]} castShadow>
                <boxGeometry args={[doorWidth / 2 - 0.08, doorHeight - 0.2, 0.04]} />
                <meshStandardMaterial
                  color="#cfe4ef"
                  roughness={0.12}
                  metalness={0.35}
                  transparent
                  opacity={0.72}
                />
              </mesh>
              <mesh position={[doorWidth / 4, 0, 0.02]} castShadow>
                <boxGeometry args={[doorWidth / 2 - 0.08, doorHeight - 0.2, 0.04]} />
                <meshStandardMaterial
                  color="#cfe4ef"
                  roughness={0.12}
                  metalness={0.35}
                  transparent
                  opacity={0.72}
                />
              </mesh>
            </>
          ) : (
            <mesh position={[0, 0, 0.02]} castShadow>
              <boxGeometry args={[doorWidth - 0.16, doorHeight - 0.2, 0.04]} />
              <meshStandardMaterial color={trim.hex} roughness={0.5} metalness={0.08} />
            </mesh>
          )}
        </group>
      ) : null}

      {config.hasWindow ? (
        <group
          position={[
            -Math.min(width / 2 - 1.6, 4.2),
            height * 0.52,
            halfLength + WALL_THICKNESS / 2,
          ]}
        >
          <mesh castShadow>
            <boxGeometry args={[2.2, 2.4, 0.1]} />
            <meshStandardMaterial color={trim.hex} roughness={0.4} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[1.85, 2.05, 0.04]} />
            <meshStandardMaterial
              color="#d7ebf4"
              roughness={0.1}
              metalness={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh position={[-1.2, 0, 0.02]}>
            <boxGeometry args={[0.18, 2.2, 0.08]} />
            <meshStandardMaterial color={shutter.hex} roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh position={[1.2, 0, 0.02]}>
            <boxGeometry args={[0.18, 2.2, 0.08]} />
            <meshStandardMaterial color={shutter.hex} roughness={0.55} metalness={0.05} />
          </mesh>
        </group>
      ) : null}

      <mesh
        position={[-roofWidth / 4, roofMidY, 0]}
        rotation={[0, 0, pitch]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[slopeWidth, ROOF_THICKNESS, roofLength]} />
        <meshStandardMaterial
          color={roofColor.hex}
          metalness={roofType.metalness}
          roughness={roofType.roughness}
        />
      </mesh>
      <mesh
        position={[roofWidth / 4, roofMidY, 0]}
        rotation={[0, 0, -pitch]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[slopeWidth, ROOF_THICKNESS, roofLength]} />
        <meshStandardMaterial
          color={roofColor.hex}
          metalness={roofType.metalness}
          roughness={roofType.roughness}
        />
      </mesh>
    </group>
  );
}
