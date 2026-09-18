"use client";

import { useMemo } from "react";
import { DoubleSide, Shape } from "three";
import {
  gableRise,
  gambrelBreakRise,
  getColor,
  getGambrelParams,
  getRoofShape,
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

type RoofPlaneSpec = {
  x: number;
  y: number;
  rotation: number;
  length: number;
};

function gableRoofPlanes(
  halfSpan: number,
  wallHeight: number,
  pitch: number,
): RoofPlaneSpec[] {
  const rise = gableRise(halfSpan, pitch);
  const slopeLength = halfSpan / Math.cos(pitch);
  const midY = wallHeight + rise / 2;
  return [
    { x: -halfSpan / 2, y: midY, rotation: pitch, length: slopeLength },
    { x: halfSpan / 2, y: midY, rotation: -pitch, length: slopeLength },
  ];
}

function gambrelRoofPlanes(
  halfSpan: number,
  wallHeight: number,
  pitch: number,
  breakRatio: number,
  breakLift: number,
): RoofPlaneSpec[] {
  const eaveY = wallHeight;
  const peakY = wallHeight + gableRise(halfSpan, pitch);
  const breakY =
    wallHeight + gambrelBreakRise(halfSpan, pitch, breakRatio, breakLift);
  const breakX = halfSpan * (1 - breakRatio);
  const segments = [
    { x1: -halfSpan, y1: eaveY, x2: -breakX, y2: breakY },
    { x1: -breakX, y1: breakY, x2: 0, y2: peakY },
    { x1: 0, y1: peakY, x2: breakX, y2: breakY },
    { x1: breakX, y1: breakY, x2: halfSpan, y2: eaveY },
  ];

  return segments.map(({ x1, y1, x2, y2 }) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2,
      rotation: Math.atan2(dy, dx),
      length: Math.hypot(dx, dy),
    };
  });
}

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
  const roofShape = getRoofShape(style);
  const { breakRatio, breakLift } = getGambrelParams(style);

  const halfWidth = width / 2;
  const halfLength = length / 2;
  const wallY = height / 2;

  const doorWidth = Math.min(DOOR_WIDTH, Math.max(2, width - 2));
  const doorHeight = Math.min(DOOR_HEIGHT, Math.max(5.5, height - 1.2));

  const roofWidth = width + OVERHANG * 2;
  const roofLength = length + OVERHANG * 2;
  const roofHalf = roofWidth / 2;
  const peakRise = gableRise(halfWidth, pitch);
  const breakRise = gambrelBreakRise(halfWidth, pitch, breakRatio, breakLift);
  const breakX = halfWidth * (1 - breakRatio);

  const gableShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);
    if (roofShape === "gambrel") {
      shape.lineTo(breakX, breakRise);
      shape.lineTo(0, peakRise);
      shape.lineTo(-breakX, breakRise);
    } else {
      shape.lineTo(0, peakRise);
    }
    shape.closePath();
    return shape;
  }, [breakRise, breakX, halfWidth, peakRise, roofShape]);

  const roofPlanes =
    roofShape === "gambrel"
      ? gambrelRoofPlanes(roofHalf, height, pitch, breakRatio, breakLift)
      : gableRoofPlanes(roofHalf, height, pitch);

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
        key={`gable-front-${roofShape}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
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
        key={`gable-back-${roofShape}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
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

      {roofPlanes.map((plane, index) => (
        <mesh
          key={`roof-${roofShape}-${index}-${width}-${length}-${height}-${pitch}-${breakRatio}-${breakLift}`}
          position={[plane.x, plane.y, 0]}
          rotation={[0, 0, plane.rotation]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[plane.length, ROOF_THICKNESS, roofLength]} />
          <meshStandardMaterial
            color={roofColor.hex}
            metalness={roofType.metalness}
            roughness={roofType.roughness}
          />
        </mesh>
      ))}
    </group>
  );
}
