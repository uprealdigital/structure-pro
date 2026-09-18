"use client";

import { useLayoutEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  NoColorSpace,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  type BufferGeometry,
  type Texture,
} from "three";
import {
  CATALOG,
  gableRise,
  gambrelBreakRise,
  getColor,
  getGambrelParams,
  getRoofMaps,
  getRoofNormalScale,
  getRoofShape,
  getRoofTileFeet,
  getRoofType,
  getSidingMaps,
  getSidingMetalness,
  getSidingNormalScale,
  getSidingTileFeet,
  getSidingType,
  getStyle,
  type ShedConfig,
} from "@/src/config/shed-config";

type ShedModelProps = {
  config: ShedConfig;
};

const WALL_THICKNESS = 0.15;
const DECK_THICKNESS = 0.06;
const ROOFING_THICKNESS = 0.035;
const OVERHANG = 0.16;
const ROOFING_DRIP = 0.045;
const SEAM_OVERLAP = 0.05;
const TRIM_WIDTH = 0.18;
const TRIM_THICKNESS = 0.05;
const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 6.5;
const DOOR_THICKNESS = 0.08;

type Point2 = { x: number; y: number };

type RoofPlaneSpec = {
  x: number;
  y: number;
  rotation: number;
  length: number;
};

function extendHorizontal(from: Point2, through: Point2, extraX: number): Point2 {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  if (Math.abs(dx) < 1e-6) {
    return { x: through.x, y: through.y };
  }
  const scale = extraX / Math.abs(dx);
  return {
    x: through.x + Math.sign(dx) * extraX,
    y: through.y + dy * scale,
  };
}

function extendAlong(from: Point2, through: Point2, extra: number): Point2 {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: through.x + (dx / len) * extra,
    y: through.y + (dy / len) * extra,
  };
}

function extendPolylineEaves(points: Point2[], extra: number): Point2[] {
  if (points.length < 2) {
    return points;
  }
  const last = points.length - 1;
  return [
    extendAlong(points[1], points[0], extra),
    ...points.slice(1, last),
    extendAlong(points[last - 1], points[last], extra),
  ];
}

function inflateSegment(
  a: Point2,
  b: Point2,
  padStart: number,
  padEnd: number,
): [Point2, Point2] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return [
    { x: a.x - ux * padStart, y: a.y - uy * padStart },
    { x: b.x + ux * padEnd, y: b.y + uy * padEnd },
  ];
}

/** Place a roof board so its center sits `centerOffset` above the slope. */
function roofPlaneFromSegment(
  a: Point2,
  b: Point2,
  centerOffset: number,
): RoofPlaneSpec {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rotation = Math.atan2(dy, dx);
  return {
    x: (a.x + b.x) / 2 - Math.sin(rotation) * centerOffset,
    y: (a.y + b.y) / 2 + Math.cos(rotation) * centerOffset,
    rotation,
    length: Math.hypot(dx, dy),
  };
}

function planesFromPolyline(
  points: Point2[],
  centerOffset: number,
  jointPad: number,
): RoofPlaneSpec[] {
  const planes: RoofPlaneSpec[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const padStart = i > 0 ? jointPad : 0;
    const padEnd = i < points.length - 2 ? jointPad : 0;
    const [start, end] = inflateSegment(points[i], points[i + 1], padStart, padEnd);
    planes.push(roofPlaneFromSegment(start, end, centerOffset));
  }
  return planes;
}

function gableWallPolyline(
  halfSpan: number,
  wallHeight: number,
  peak: number,
  roofShape: "gable" | "gambrel",
  breakX: number,
  breakRise: number,
): Point2[] {
  if (roofShape === "gambrel") {
    return [
      { x: -halfSpan, y: wallHeight },
      { x: -breakX, y: wallHeight + breakRise },
      { x: 0, y: wallHeight + peak },
      { x: breakX, y: wallHeight + breakRise },
      { x: halfSpan, y: wallHeight },
    ];
  }
  return [
    { x: -halfSpan, y: wallHeight },
    { x: 0, y: wallHeight + peak },
    { x: halfSpan, y: wallHeight },
  ];
}

function eaveFascia(
  eave: Point2,
  towardRidge: Point2,
  run: number,
  width: number,
  thickness: number,
): RoofPlaneSpec & { run: number; thickness: number } {
  const dx = towardRidge.x - eave.x;
  const dy = towardRidge.y - eave.y;
  const len = Math.hypot(dx, dy) || 1;
  const rotation = Math.atan2(dy, dx);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -Math.sin(rotation);
  const ny = Math.cos(rotation);
  return {
    x: eave.x + ux * (width / 2) - nx * (thickness / 2),
    y: eave.y + uy * (width / 2) - ny * (thickness / 2),
    rotation,
    length: width,
    run,
    thickness,
  };
}

const LP_SMART_MAPS = getSidingMaps(
  CATALOG.sidingTypes.find((item) => item.id === "lp-smart") ??
    CATALOG.sidingTypes[0],
);

const LP_SMART_MAP_URLS = LP_SMART_MAPS ?? {
  albedo: "/textures/siding/LP%20Smart/LP%20Smart%20Siding_Basecolor.png",
  normal: "/textures/siding/LP%20Smart/LP%20Smart%20Siding_Normal.png",
  roughness:
    "/textures/siding/LP%20Smart/LP%20Smart%20Siding_Specularroughness.png",
  metalness: "/textures/siding/LP%20Smart/LP%20Smart%20Siding_Basemetalness.png",
};

const SHINGLE_MAPS = getRoofMaps(
  CATALOG.roofTypes.find((item) => item.id === "shingle") ?? CATALOG.roofTypes[0],
);

const SHINGLE_MAP_URLS = SHINGLE_MAPS ?? {
  albedo:
    "/textures/roof/alternating-asphalt-shingle/1k/alternating-asphalt-shingle_albedo_1k.png",
  normal:
    "/textures/roof/alternating-asphalt-shingle/1k/alternating-asphalt-shingle_normal-ogl_1k.png",
  ao: "/textures/roof/alternating-asphalt-shingle/1k/alternating-asphalt-shingle_ao_1k.png",
  height:
    "/textures/roof/alternating-asphalt-shingle/1k/alternating-asphalt-shingle_height_1k.png",
};

function ensureUv2(geometry: BufferGeometry) {
  const uv = geometry.getAttribute("uv");
  if (!uv || geometry.getAttribute("uv2")) {
    return;
  }
  geometry.setAttribute("uv2", uv.clone());
}

type SidingTextureSet = {
  albedo: Texture;
  normal: Texture;
  roughness: Texture;
  metalness: Texture;
};

function configureSidingTexture(
  source: Texture,
  repeatX: number,
  repeatY: number,
  colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
): Texture {
  const texture = source.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

function tileSidingMaps(
  source: SidingTextureSet,
  repeatX: number,
  repeatY: number,
): SidingTextureSet {
  return {
    albedo: configureSidingTexture(
      source.albedo,
      repeatX,
      repeatY,
      SRGBColorSpace,
    ),
    normal: configureSidingTexture(source.normal, repeatX, repeatY, NoColorSpace),
    roughness: configureSidingTexture(
      source.roughness,
      repeatX,
      repeatY,
      NoColorSpace,
    ),
    metalness: configureSidingTexture(
      source.metalness,
      repeatX,
      repeatY,
      NoColorSpace,
    ),
  };
}

function SidingMaterial({
  color,
  roughness,
  metalness,
  normalScale,
  maps,
}: {
  color: string;
  roughness: number;
  metalness: number;
  normalScale: [number, number];
  maps: SidingTextureSet | null;
}) {
  return (
    <meshStandardMaterial
      color={color}
      map={maps?.albedo ?? null}
      normalMap={maps?.normal ?? null}
      roughnessMap={maps?.roughness ?? null}
      metalnessMap={maps?.metalness ?? null}
      roughness={roughness}
      metalness={metalness}
      normalScale={maps ? normalScale : [0, 0]}
    />
  );
}

type RoofTextureSet = {
  albedo: Texture;
  normal: Texture;
  ao: Texture;
  height: Texture;
};

function RoofingMaterial({
  color,
  roughness,
  metalness,
  normalScale,
  maps,
}: {
  color: string;
  roughness: number;
  metalness: number;
  normalScale: [number, number];
  maps: RoofTextureSet | null;
}) {
  return (
    <meshStandardMaterial
      key={maps ? "shingle" : "metal"}
      color={maps ? "#ffffff" : color}
      roughness={roughness}
      metalness={metalness}
      normalScale={maps ? normalScale : [0, 0]}
      aoMapIntensity={maps ? 0.85 : 0}
      bumpScale={maps ? 0.06 : 0}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
    >
      {maps ? (
        <>
          <primitive attach="map" object={maps.albedo} />
          <primitive attach="normalMap" object={maps.normal} />
          <primitive attach="aoMap" object={maps.ao} />
          <primitive attach="bumpMap" object={maps.height} />
        </>
      ) : null}
    </meshStandardMaterial>
  );
}

function gableRoofOutline(
  halfSpan: number,
  wallHeight: number,
  pitch: number,
  overhang: number,
): Point2[] {
  const rise = gableRise(halfSpan, pitch);
  const peak: Point2 = { x: 0, y: wallHeight + rise };
  const leftEave = extendHorizontal(peak, { x: -halfSpan, y: wallHeight }, overhang);
  const rightEave = extendHorizontal(peak, { x: halfSpan, y: wallHeight }, overhang);
  return [leftEave, peak, rightEave];
}

function gambrelRoofOutline(
  halfSpan: number,
  wallHeight: number,
  pitch: number,
  breakRatio: number,
  breakLift: number,
  overhang: number,
): Point2[] {
  const eaveY = wallHeight;
  const peakY = wallHeight + gableRise(halfSpan, pitch);
  const breakY =
    wallHeight + gambrelBreakRise(halfSpan, pitch, breakRatio, breakLift);
  const breakX = halfSpan * (1 - breakRatio);
  const peak: Point2 = { x: 0, y: peakY };
  const leftBreak: Point2 = { x: -breakX, y: breakY };
  const rightBreak: Point2 = { x: breakX, y: breakY };
  const leftEave = extendHorizontal(leftBreak, { x: -halfSpan, y: eaveY }, overhang);
  const rightEave = extendHorizontal(rightBreak, { x: halfSpan, y: eaveY }, overhang);
  return [leftEave, leftBreak, peak, rightBreak, rightEave];
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
  const sidingMaps = getSidingMaps(sidingType);
  const [sidingTileW, sidingTileH] = getSidingTileFeet(sidingType);
  const sidingMetalness = getSidingMetalness(sidingType);
  const sidingNormalScale = getSidingNormalScale(sidingType);
  const roofMaps = getRoofMaps(roofType);
  const [roofTileW, roofTileH] = getRoofTileFeet(roofType);
  const roofNormalScale = getRoofNormalScale(roofType);
  const loadedSiding = useTexture({
    albedo: LP_SMART_MAP_URLS.albedo,
    normal: LP_SMART_MAP_URLS.normal,
    roughness: LP_SMART_MAP_URLS.roughness,
    metalness: LP_SMART_MAP_URLS.metalness,
  });
  const loadedShingle = useTexture({
    albedo: SHINGLE_MAP_URLS.albedo,
    normal: SHINGLE_MAP_URLS.normal,
    ao: SHINGLE_MAP_URLS.ao,
    height: SHINGLE_MAP_URLS.height,
  });
  const applyRoofMaps = Boolean(roofMaps);
  const applySidingMaps = Boolean(sidingMaps);
  const frontSidingMaps = useMemo(
    () =>
      applySidingMaps
        ? tileSidingMaps(loadedSiding, width / sidingTileW, height / sidingTileH)
        : null,
    [
      applySidingMaps,
      height,
      loadedSiding.albedo,
      loadedSiding.metalness,
      loadedSiding.normal,
      loadedSiding.roughness,
      sidingTileH,
      sidingTileW,
      width,
    ],
  );
  const sideSidingMaps = useMemo(
    () =>
      applySidingMaps
        ? tileSidingMaps(loadedSiding, length / sidingTileW, height / sidingTileH)
        : null,
    [
      applySidingMaps,
      height,
      length,
      loadedSiding.albedo,
      loadedSiding.metalness,
      loadedSiding.normal,
      loadedSiding.roughness,
      sidingTileH,
      sidingTileW,
    ],
  );
  const gableSidingMaps = useMemo(
    () =>
      applySidingMaps
        ? tileSidingMaps(loadedSiding, 1 / sidingTileW, 1 / sidingTileH)
        : null,
    [
      applySidingMaps,
      loadedSiding.albedo,
      loadedSiding.metalness,
      loadedSiding.normal,
      loadedSiding.roughness,
      sidingTileH,
      sidingTileW,
    ],
  );
  const pitch = style.pitch;
  const roofShape = getRoofShape(style);
  const { breakRatio, breakLift } = getGambrelParams(style);

  const halfWidth = width / 2;
  const halfLength = length / 2;
  const wallY = height / 2;
  const wallT = WALL_THICKNESS;

  const doorWidth = Math.min(DOOR_WIDTH, Math.max(2, width - 2));
  const doorHeight = Math.min(DOOR_HEIGHT, Math.max(5.5, height - 1.2));

  const deckLength = length + OVERHANG * 2;
  const roofingLength = deckLength + ROOFING_DRIP * 2;
  useLayoutEffect(() => {
    const repeatX = roofingLength / roofTileW;
    const repeatY = roofingLength / roofTileH;
    const maps = [
      loadedShingle.albedo,
      loadedShingle.normal,
      loadedShingle.ao,
      loadedShingle.height,
    ];
    loadedShingle.albedo.colorSpace = SRGBColorSpace;
    loadedShingle.normal.colorSpace = NoColorSpace;
    loadedShingle.ao.colorSpace = NoColorSpace;
    loadedShingle.height.colorSpace = NoColorSpace;
    for (const texture of maps) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.needsUpdate = true;
    }
  }, [
    loadedShingle.albedo,
    loadedShingle.ao,
    loadedShingle.height,
    loadedShingle.normal,
    roofTileH,
    roofTileW,
    roofingLength,
  ]);
  const peakRise = gableRise(halfWidth, pitch);
  const breakRise = gambrelBreakRise(halfWidth, pitch, breakRatio, breakLift);
  const breakX = halfWidth * (1 - breakRatio);

  const gableShape = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-halfWidth, -SEAM_OVERLAP);
    shape.lineTo(halfWidth, -SEAM_OVERLAP);
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

  const roofOutline =
    roofShape === "gambrel"
      ? gambrelRoofOutline(
          halfWidth,
          height,
          pitch,
          breakRatio,
          breakLift,
          OVERHANG,
        )
      : gableRoofOutline(halfWidth, height, pitch, OVERHANG);
  const roofingOutline = extendPolylineEaves(roofOutline, ROOFING_DRIP);
  const deckPlanes = planesFromPolyline(
    roofOutline,
    DECK_THICKNESS / 2,
    DECK_THICKNESS,
  );
  const roofingPlanes = planesFromPolyline(
    roofingOutline,
    DECK_THICKNESS + ROOFING_THICKNESS / 2,
    Math.max(DECK_THICKNESS, ROOFING_THICKNESS),
  );
  const rakePlanes = planesFromPolyline(
    gableWallPolyline(
      halfWidth,
      height,
      peakRise,
      roofShape,
      breakX,
      breakRise,
    ),
    -TRIM_WIDTH / 2,
    TRIM_WIDTH * 0.35,
  );
  const sideFascia = [
    eaveFascia(
      roofOutline[0],
      roofOutline[1],
      deckLength,
      TRIM_WIDTH,
      TRIM_THICKNESS,
    ),
    eaveFascia(
      roofOutline[roofOutline.length - 1],
      roofOutline[roofOutline.length - 2],
      deckLength,
      TRIM_WIDTH,
      TRIM_THICKNESS,
    ),
  ];
  const cornerSigns = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const;

  return (
    <group>
      <mesh position={[0, wallY, halfLength - wallT / 2]} castShadow>
        <boxGeometry args={[width, height, wallT]} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          maps={frontSidingMaps}
        />
      </mesh>
      <mesh position={[0, wallY, -halfLength + wallT / 2]} castShadow>
        <boxGeometry args={[width, height, wallT]} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          maps={frontSidingMaps}
        />
      </mesh>
      <mesh position={[-halfWidth + wallT / 2, wallY, 0]} castShadow>
        <boxGeometry args={[wallT, height, length]} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          maps={sideSidingMaps}
        />
      </mesh>
      <mesh position={[halfWidth - wallT / 2, wallY, 0]} castShadow>
        <boxGeometry args={[wallT, height, length]} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          maps={sideSidingMaps}
        />
      </mesh>

      <mesh
        key={`gable-front-${roofShape}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
        position={[0, height, halfLength - wallT]}
        castShadow
      >
        <extrudeGeometry
          args={[gableShape, { depth: wallT, bevelEnabled: false }]}
        />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          maps={gableSidingMaps}
        />
      </mesh>
      <mesh
        key={`gable-back-${roofShape}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
        position={[0, height, -halfLength]}
        castShadow
      >
        <extrudeGeometry
          args={[gableShape, { depth: wallT, bevelEnabled: false }]}
        />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          maps={gableSidingMaps}
        />
      </mesh>

      {cornerSigns.map(([xSign, zSign]) => (
        <group key={`corner-trim-${xSign}-${zSign}`}>
          <mesh
            position={[
              xSign * (halfWidth - TRIM_WIDTH / 2 + TRIM_THICKNESS / 2),
              wallY,
              zSign * (halfLength + TRIM_THICKNESS / 2),
            ]}
            castShadow
          >
            <boxGeometry args={[TRIM_WIDTH + TRIM_THICKNESS, height, TRIM_THICKNESS]} />
            <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
          </mesh>
          <mesh
            position={[
              xSign * (halfWidth + TRIM_THICKNESS / 2),
              wallY,
              zSign * (halfLength - TRIM_WIDTH / 2),
            ]}
            castShadow
          >
            <boxGeometry args={[TRIM_THICKNESS, height, TRIM_WIDTH]} />
            <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
          </mesh>
        </group>
      ))}

      {([-halfLength - TRIM_THICKNESS / 2, halfLength + TRIM_THICKNESS / 2] as const).map(
        (z) =>
          rakePlanes.map((plane, index) => (
            <mesh
              key={`rake-trim-${z}-${roofShape}-${index}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
              position={[plane.x, plane.y, z]}
              rotation={[0, 0, plane.rotation]}
              castShadow
            >
              <boxGeometry args={[plane.length, TRIM_WIDTH, TRIM_THICKNESS]} />
              <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
            </mesh>
          )),
      )}

      {([-1, 1] as const).map((xSign) => (
        <mesh
          key={`eave-wall-trim-${xSign}`}
          position={[
            xSign * (halfWidth + TRIM_THICKNESS / 2),
            height - TRIM_WIDTH / 2,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[TRIM_THICKNESS, TRIM_WIDTH, length]} />
          <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
        </mesh>
      ))}
      {sideFascia.map((plane, index) => (
        <mesh
          key={`eave-roof-trim-${index}-${roofShape}-${width}-${length}-${height}-${pitch}-${breakRatio}-${breakLift}`}
          position={[plane.x, plane.y, 0]}
          rotation={[0, 0, plane.rotation]}
          castShadow
        >
          <boxGeometry args={[plane.length, plane.thickness, plane.run]} />
          <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
        </mesh>
      ))}

      {config.doorStyle !== "none" ? (
        <group position={[0, doorHeight / 2, halfLength + DOOR_THICKNESS / 2]}>
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
            halfLength + 0.05,
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

      {deckPlanes.map((plane, index) => (
        <mesh
          key={`roof-deck-${roofShape}-${index}-${width}-${length}-${height}-${pitch}-${breakRatio}-${breakLift}`}
          position={[plane.x, plane.y, 0]}
          rotation={[0, 0, plane.rotation]}
          castShadow
        >
          <boxGeometry args={[plane.length, DECK_THICKNESS, deckLength]} />
          <meshStandardMaterial color={trim.hex} roughness={0.55} metalness={0.06} />
        </mesh>
      ))}
      {roofingPlanes.map((plane, index) => (
        <mesh
          key={`roofing-${roofShape}-${index}-${width}-${length}-${height}-${pitch}-${breakRatio}-${breakLift}`}
          position={[plane.x, plane.y, 0]}
          rotation={[0, 0, plane.rotation]}
          castShadow
        >
          <boxGeometry
            args={[plane.length, ROOFING_THICKNESS, roofingLength]}
            onUpdate={ensureUv2}
          />
          <RoofingMaterial
            color={roofColor.hex}
            metalness={roofType.metalness}
            roughness={roofType.roughness}
            normalScale={roofNormalScale}
            maps={applyRoofMaps ? loadedShingle : null}
          />
        </mesh>
      ))}
    </group>
  );
}
