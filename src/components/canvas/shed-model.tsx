"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  NoColorSpace,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
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
  getSidingAoIntensity,
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
const SKID_HEIGHT = 0.5;
const SKID_WIDTH = 0.55;
/** Distance from each sidewall as a fraction of width; a bit less than 1/3. */
const SKID_SIDE_RATIO = 0.24;
const DECK_THICKNESS = 0.06;
const ROOFING_THICKNESS = 0.035;
const OVERHANG = 0.16;
const ROOFING_DRIP = 0.045;
const SEAM_OVERLAP = 0.05;
const TRIM_WIDTH = 0.18;
const TRIM_THICKNESS = 0.05;
const SINGLE_DOOR_WIDTH = 3;
const DOUBLE_DOOR_WIDTH = 6;
const DOOR_HEIGHT = 6.5;
const DOOR_THICKNESS = 0.08;
const DOOR_GAP = 0.04;
const DOOR_HEADER_HEIGHT = 0.22;
const HARDWARE_COLOR = "#1c1c1c";
const VENT_FRAME = 0.065;
const VENT_DEPTH = 0.045;

type Point2 = { x: number; y: number };

type RoofPlaneSpec = {
  x: number;
  y: number;
  rotation: number;
  length: number;
};

function skidCenterXs(width: number, doorWidth = 0): number[] {
  const maxX = width / 2 - SKID_WIDTH / 2 - 0.08;
  const fromSide = width / 2 - width * SKID_SIDE_RATIO;
  const besideDoor = doorWidth > 0 ? doorWidth / 2 + SKID_WIDTH * 0.3 : 0;
  const x = Math.min(maxX, Math.max(fromSide, besideDoor));
  return [-x, x];
}

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
  ao: "/textures/siding/LP%20Smart/LP%20Smart%20Siding_AO.png",
};

const METAL_ROOF_MAPS = getRoofMaps(
  CATALOG.roofTypes.find((item) => item.id === "metal") ?? CATALOG.roofTypes[0],
);

const METAL_ROOF_MAP_URLS = METAL_ROOF_MAPS ?? {
  albedo: "/textures/roof/metal-roof/1k/metal-roof_albedo_1k.png",
  normal: "/textures/roof/metal-roof/1k/metal-roof_normal-ogl_1k.png",
  ao: "/textures/roof/metal-roof/1k/metal-roof_ao_1k.png",
  height: "/textures/roof/metal-roof/1k/metal-roof_height_1k.png",
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

/**
 * Map gable-cap vertices into the same 0–1 UV space as the rectangular
 * front/back wall so vertical siding planks continue through the eave line.
 * `flipU` matches BoxGeometry's -Z face, which reverses U across world X.
 */
function createGableWallUVGenerator(
  span: number,
  wallHeight: number,
  flipU: boolean,
) {
  const toUv = (x: number, y: number) =>
    new Vector2(
      flipU ? (span / 2 - x) / span : (x + span / 2) / span,
      (wallHeight + y) / wallHeight,
    );
  const uvAt = (vertices: number[], index: number) =>
    toUv(vertices[index * 3], vertices[index * 3 + 1]);

  return {
    generateTopUV(
      _geometry: BufferGeometry,
      vertices: number[],
      indexA: number,
      indexB: number,
      indexC: number,
    ) {
      return [uvAt(vertices, indexA), uvAt(vertices, indexB), uvAt(vertices, indexC)];
    },
    generateSideWallUV(
      _geometry: BufferGeometry,
      vertices: number[],
      indexA: number,
      indexB: number,
      indexC: number,
      indexD: number,
    ) {
      return [
        uvAt(vertices, indexA),
        uvAt(vertices, indexB),
        uvAt(vertices, indexC),
        uvAt(vertices, indexD),
      ];
    },
  };
}

type SidingTextureSet = {
  albedo: Texture;
  normal: Texture;
  roughness: Texture;
  metalness: Texture;
  ao: Texture;
};

function configureTiledTexture(
  source: Texture,
  repeatX: number,
  repeatY: number,
  colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
  rotation = 0,
): Texture {
  const texture = source.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.center.set(0.5, 0.5);
  texture.rotation = rotation;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

function configureSidingTexture(
  source: Texture,
  repeatX: number,
  repeatY: number,
  colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
  offsetX = 0,
  offsetY = 0,
): Texture {
  const texture = configureTiledTexture(source, repeatX, repeatY, colorSpace);
  texture.offset.set(offsetX, offsetY);
  texture.needsUpdate = true;
  return texture;
}

function tileSidingMaps(
  source: SidingTextureSet,
  repeatX: number,
  repeatY: number,
  offsetX = 0,
  offsetY = 0,
): SidingTextureSet {
  return {
    albedo: configureSidingTexture(
      source.albedo,
      repeatX,
      repeatY,
      SRGBColorSpace,
      offsetX,
      offsetY,
    ),
    normal: configureSidingTexture(
      source.normal,
      repeatX,
      repeatY,
      NoColorSpace,
      offsetX,
      offsetY,
    ),
    roughness: configureSidingTexture(
      source.roughness,
      repeatX,
      repeatY,
      NoColorSpace,
      offsetX,
      offsetY,
    ),
    metalness: configureSidingTexture(
      source.metalness,
      repeatX,
      repeatY,
      NoColorSpace,
      offsetX,
      offsetY,
    ),
    ao: configureSidingTexture(
      source.ao,
      repeatX,
      repeatY,
      NoColorSpace,
      offsetX,
      offsetY,
    ),
  };
}

function HardwareMaterial() {
  return (
    <meshStandardMaterial color={HARDWARE_COLOR} roughness={0.4} metalness={0.45} />
  );
}

function VentMetalMaterial({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.28}
      metalness={0.82}
      envMapIntensity={1.15}
    />
  );
}

function gableVentLayout(peakRise: number, halfSpan: number) {
  const sizeScale = 2 / 3;
  const height = Math.min(1.12 * sizeScale, Math.max(0.38, peakRise * 0.26));
  const width = Math.min(2.35 * sizeScale, Math.max(0.72, halfSpan * 0.52));
  const rakePad = 0.42;
  const neededHalf = width / 2 + rakePad;
  const yTopMax =
    peakRise * (1 - neededHalf / Math.max(halfSpan, 0.01));
  const yTop = Math.min(yTopMax, peakRise - 0.14) - TRIM_WIDTH;
  const centerY = yTop - height / 2;
  return { width, height, centerY };
}

function GableVent({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const innerW = Math.max(0.4, width - VENT_FRAME * 2);
  const innerH = Math.max(0.28, height - VENT_FRAME * 2);
  const louverCount = Math.max(6, Math.round(innerH / 0.11));
  const spacing = innerH / louverCount;

  return (
    <group>
      <mesh position={[0, 0, -VENT_DEPTH * 0.15]} castShadow>
        <boxGeometry args={[innerW, innerH, 0.02]} />
        <VentMetalMaterial color={color} />
      </mesh>
      <mesh position={[0, height / 2 - VENT_FRAME / 2, 0]} castShadow>
        <boxGeometry args={[width, VENT_FRAME, VENT_DEPTH]} />
        <VentMetalMaterial color={color} />
      </mesh>
      <mesh position={[0, -height / 2 + VENT_FRAME / 2, 0]} castShadow>
        <boxGeometry args={[width, VENT_FRAME, VENT_DEPTH]} />
        <VentMetalMaterial color={color} />
      </mesh>
      <mesh position={[-width / 2 + VENT_FRAME / 2, 0, 0]} castShadow>
        <boxGeometry args={[VENT_FRAME, innerH, VENT_DEPTH]} />
        <VentMetalMaterial color={color} />
      </mesh>
      <mesh position={[width / 2 - VENT_FRAME / 2, 0, 0]} castShadow>
        <boxGeometry args={[VENT_FRAME, innerH, VENT_DEPTH]} />
        <VentMetalMaterial color={color} />
      </mesh>
      {Array.from({ length: louverCount }, (_, index) => {
        const y = -innerH / 2 + spacing * (index + 0.55);
        return (
          <mesh
            key={`louver-${index}`}
            position={[0, y, 0.01]}
            rotation={[0.48, 0, 0]}
            castShadow
          >
            <boxGeometry args={[innerW - 0.016, 0.022, 0.05]} />
            <VentMetalMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

function DoorHinge({
  x,
  y,
  z,
  flip,
}: {
  x: number;
  y: number;
  z: number;
  flip: boolean;
}) {
  const dir = flip ? -1 : 1;
  return (
    <group position={[x, y, z]}>
      <mesh position={[dir * 0.04, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.22, 0.025]} />
        <HardwareMaterial />
      </mesh>
      <mesh position={[dir * 0.34, 0, 0]} castShadow>
        <boxGeometry args={[0.56, 0.09, 0.025]} />
        <HardwareMaterial />
      </mesh>
    </group>
  );
}

function SidingMaterial({
  color,
  roughness,
  metalness,
  normalScale,
  aoMapIntensity,
  maps,
}: {
  color: string;
  roughness: number;
  metalness: number;
  normalScale: [number, number];
  aoMapIntensity: number;
  maps: SidingTextureSet | null;
}) {
  return (
    <meshStandardMaterial
      color={color}
      map={maps?.albedo ?? null}
      normalMap={maps?.normal ?? null}
      roughnessMap={maps?.roughness ?? null}
      metalnessMap={maps?.metalness ?? null}
      aoMap={maps?.ao ?? null}
      roughness={roughness}
      metalness={metalness}
      normalScale={maps ? normalScale : [0, 0]}
      aoMapIntensity={maps ? aoMapIntensity : 0}
    />
  );
}

type RoofTextureSet = {
  albedo: Texture;
  normal: Texture;
  ao: Texture;
  height: Texture;
};

/** Roof box UVs: U along slope (plane.length), V along eaves (roofingLength). */
const ROOF_TEXTURE_ROTATION = Math.PI / 2;

function tileRoofMaps(
  source: RoofTextureSet,
  repeatAlongEaves: number,
  repeatAlongSlope: number,
): RoofTextureSet {
  return {
    albedo: configureTiledTexture(
      source.albedo,
      repeatAlongEaves,
      repeatAlongSlope,
      SRGBColorSpace,
      ROOF_TEXTURE_ROTATION,
    ),
    normal: configureTiledTexture(
      source.normal,
      repeatAlongEaves,
      repeatAlongSlope,
      NoColorSpace,
      ROOF_TEXTURE_ROTATION,
    ),
    ao: configureTiledTexture(
      source.ao,
      repeatAlongEaves,
      repeatAlongSlope,
      NoColorSpace,
      ROOF_TEXTURE_ROTATION,
    ),
    height: configureTiledTexture(
      source.height,
      repeatAlongEaves,
      repeatAlongSlope,
      NoColorSpace,
      ROOF_TEXTURE_ROTATION,
    ),
  };
}

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
      key={maps ? "mapped" : "flat"}
      color={color}
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
  const sidingType = getSidingType(config.sidingTypeId);
  const roofType = getRoofType(config.roofTypeId);
  const sidingMaps = getSidingMaps(sidingType);
  const [sidingTileW, sidingTileH] = getSidingTileFeet(sidingType);
  const sidingMetalness = getSidingMetalness(sidingType);
  const sidingNormalScale = getSidingNormalScale(sidingType);
  const sidingAoIntensity = getSidingAoIntensity(sidingType);
  const roofMaps = getRoofMaps(roofType);
  const [roofTileW, roofTileH] = getRoofTileFeet(roofType);
  const roofNormalScale = getRoofNormalScale(roofType);
  const loadedSiding = useTexture({
    albedo: LP_SMART_MAP_URLS.albedo,
    normal: LP_SMART_MAP_URLS.normal,
    roughness: LP_SMART_MAP_URLS.roughness,
    metalness: LP_SMART_MAP_URLS.metalness,
    ao: LP_SMART_MAP_URLS.ao,
  });
  const loadedShingle = useTexture({
    albedo: SHINGLE_MAP_URLS.albedo,
    normal: SHINGLE_MAP_URLS.normal,
    ao: SHINGLE_MAP_URLS.ao,
    height: SHINGLE_MAP_URLS.height,
  });
  const loadedMetalRoof = useTexture({
    albedo: METAL_ROOF_MAP_URLS.albedo,
    normal: METAL_ROOF_MAP_URLS.normal,
    ao: METAL_ROOF_MAP_URLS.ao,
    height: METAL_ROOF_MAP_URLS.height,
  });
  const loadedRoof =
    config.roofTypeId === "metal" ? loadedMetalRoof : loadedShingle;
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
      loadedSiding.ao,
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
      loadedSiding.ao,
      loadedSiding.metalness,
      loadedSiding.normal,
      loadedSiding.roughness,
      sidingTileH,
      sidingTileW,
    ],
  );
  const gableFrontUVGenerator = useMemo(
    () => createGableWallUVGenerator(width, height, false),
    [height, width],
  );
  const gableBackUVGenerator = useMemo(
    () => createGableWallUVGenerator(width, height, true),
    [height, width],
  );
  const pitch = style.pitch;
  const roofShape = getRoofShape(style);
  const { breakRatio, breakLift } = getGambrelParams(style);

  const halfWidth = width / 2;
  const halfLength = length / 2;
  const wallY = height / 2;
  const wallT = WALL_THICKNESS;

  const isDoubleDoor = config.doorStyle === "double";
  const nominalDoorWidth = isDoubleDoor ? DOUBLE_DOOR_WIDTH : SINGLE_DOOR_WIDTH;
  const doorWidth = Math.min(nominalDoorWidth, Math.max(2, width - 2));
  const doorHeight = Math.min(DOOR_HEIGHT, Math.max(5.5, height - 1.2));
  const doorLeafWidth = isDoubleDoor ? (doorWidth - DOOR_GAP) / 2 : doorWidth;
  const doorLeafCenters = isDoubleDoor
    ? [-(doorLeafWidth + DOOR_GAP) / 2, (doorLeafWidth + DOOR_GAP) / 2]
    : [0];
  const doorSidingMaps = useMemo(() => {
    if (!applySidingMaps) {
      return doorLeafCenters.map(() => null);
    }
    return doorLeafCenters.map((centerX) => {
      const leftEdge = centerX - doorLeafWidth / 2;
      return tileSidingMaps(
        loadedSiding,
        doorLeafWidth / sidingTileW,
        doorHeight / sidingTileH,
        (halfWidth + leftEdge) / sidingTileW,
        0,
      );
    });
  }, [
    applySidingMaps,
    doorHeight,
    doorLeafCenters,
    doorLeafWidth,
    halfWidth,
    loadedSiding.albedo,
    loadedSiding.ao,
    loadedSiding.metalness,
    loadedSiding.normal,
    loadedSiding.roughness,
    sidingTileH,
    sidingTileW,
  ]);

  const deckLength = length + OVERHANG * 2;
  const roofingLength = deckLength + ROOFING_DRIP * 2;
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
  const roofingPlaneLengths = roofingPlanes.map((plane) => plane.length).join(",");
  const tiledRoofMaps = useMemo(() => {
    if (!applyRoofMaps) {
      return roofingPlanes.map(() => null);
    }
    const repeatAlongEaves = roofingLength / roofTileW;
    return roofingPlanes.map((plane) =>
      tileRoofMaps(loadedRoof, repeatAlongEaves, plane.length / roofTileH),
    );
  }, [
    applyRoofMaps,
    loadedRoof.albedo,
    loadedRoof.ao,
    loadedRoof.height,
    loadedRoof.normal,
    roofTileH,
    roofTileW,
    roofingLength,
    roofingPlaneLengths,
  ]);
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

  const skids = skidCenterXs(
    width,
    config.doorStyle === "none" ? 0 : doorWidth,
  );
  const vent = gableVentLayout(peakRise, halfWidth);

  return (
    <group>
      {skids.map((x) => (
        <mesh key={`skid-${x}`} position={[x, SKID_HEIGHT / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[SKID_WIDTH, SKID_HEIGHT, length]} />
          <meshStandardMaterial color={siding.hex} roughness={0.72} metalness={0.04} />
        </mesh>
      ))}
      <group position={[0, SKID_HEIGHT, 0]}>
      <mesh position={[0, wallY, halfLength - wallT / 2]} castShadow>
        <boxGeometry args={[width, height, wallT]} onUpdate={ensureUv2} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          aoMapIntensity={sidingAoIntensity}
          maps={frontSidingMaps}
        />
      </mesh>
      <mesh position={[0, wallY, -halfLength + wallT / 2]} castShadow>
        <boxGeometry args={[width, height, wallT]} onUpdate={ensureUv2} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          aoMapIntensity={sidingAoIntensity}
          maps={frontSidingMaps}
        />
      </mesh>
      <mesh position={[-halfWidth + wallT / 2, wallY, 0]} castShadow>
        <boxGeometry args={[wallT, height, length]} onUpdate={ensureUv2} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          aoMapIntensity={sidingAoIntensity}
          maps={sideSidingMaps}
        />
      </mesh>
      <mesh position={[halfWidth - wallT / 2, wallY, 0]} castShadow>
        <boxGeometry args={[wallT, height, length]} onUpdate={ensureUv2} />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          aoMapIntensity={sidingAoIntensity}
          maps={sideSidingMaps}
        />
      </mesh>

      <mesh
        key={`gable-front-${roofShape}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
        position={[0, height, halfLength - wallT]}
        castShadow
      >
        <extrudeGeometry
          args={[
            gableShape,
            {
              depth: wallT,
              bevelEnabled: false,
              UVGenerator: gableFrontUVGenerator,
            },
          ]}
          onUpdate={ensureUv2}
        />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          aoMapIntensity={sidingAoIntensity}
          maps={frontSidingMaps}
        />
      </mesh>
      <mesh
        key={`gable-back-${roofShape}-${width}-${height}-${pitch}-${breakRatio}-${breakLift}`}
        position={[0, height, -halfLength]}
        castShadow
      >
        <extrudeGeometry
          args={[
            gableShape,
            {
              depth: wallT,
              bevelEnabled: false,
              UVGenerator: gableBackUVGenerator,
            },
          ]}
          onUpdate={ensureUv2}
        />
        <SidingMaterial
          color={siding.hex}
          roughness={sidingType.roughness}
          metalness={sidingMetalness}
          normalScale={sidingNormalScale}
          aoMapIntensity={sidingAoIntensity}
          maps={frontSidingMaps}
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

      {config.hasVent ? (
        <group position={[0, height + vent.centerY, halfLength + VENT_DEPTH / 2]}>
          <GableVent color={siding.hex} width={vent.width} height={vent.height} />
        </group>
      ) : null}

      {config.doorStyle !== "none" ? (
        <group position={[0, doorHeight / 2, halfLength + DOOR_THICKNESS / 2]}>
          {doorLeafCenters.map((centerX, index) => {
            const flip = centerX > 0;
            const hingeX = centerX + (flip ? doorLeafWidth / 2 - 0.08 : -doorLeafWidth / 2 + 0.08);
            const hingeZ = DOOR_THICKNESS / 2 + 0.015;
            return (
              <group key={`door-leaf-${index}`}>
                <mesh position={[centerX, 0, 0]} castShadow>
                  <boxGeometry args={[doorLeafWidth, doorHeight, DOOR_THICKNESS]} onUpdate={ensureUv2} />
                  <SidingMaterial
                    color={siding.hex}
                    roughness={sidingType.roughness}
                    metalness={sidingMetalness}
                    normalScale={sidingNormalScale}
                    aoMapIntensity={sidingAoIntensity}
                    maps={doorSidingMaps[index] ?? null}
                  />
                </mesh>
                <DoorHinge x={hingeX} y={doorHeight * 0.18} z={hingeZ} flip={flip} />
                <DoorHinge x={hingeX} y={-doorHeight * 0.28} z={hingeZ} flip={flip} />
              </group>
            );
          })}
          <mesh
            position={[
              0,
              doorHeight / 2 + DOOR_HEADER_HEIGHT / 2 - 0.04,
              0.02,
            ]}
            castShadow
          >
            <boxGeometry
              args={[doorWidth + 0.08, DOOR_HEADER_HEIGHT, DOOR_THICKNESS + 0.02]}
            />
            <meshStandardMaterial color={trim.hex} roughness={0.45} metalness={0.08} />
          </mesh>
          {isDoubleDoor ? (
            <mesh
              position={[0, 0.12, DOOR_THICKNESS / 2 + 0.02]}
              rotation={[0, 0, Math.PI / 4]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.1, 0.03]} />
              <HardwareMaterial />
            </mesh>
          ) : (
            <mesh
              position={[doorWidth / 2 - 0.18, 0.1, DOOR_THICKNESS / 2 + 0.02]}
              castShadow
            >
              <boxGeometry args={[0.08, 0.22, 0.04]} />
              <HardwareMaterial />
            </mesh>
          )}
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
            key={config.roofTypeId}
            color={roofColor.hex}
            metalness={roofType.metalness}
            roughness={roofType.roughness}
            normalScale={roofNormalScale}
            maps={tiledRoofMaps[index] ?? null}
          />
        </mesh>
      ))}
      </group>
    </group>
  );
}
