import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  skinTone: string;
  hairColor: string;
  alt: string;
  className?: string;
  mirrored?: boolean;
}

function parseHexColor(value: string): [number, number, number] | null {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (!match) return null;
  return [Number.parseInt(match[1]!, 16), Number.parseInt(match[2]!, 16), Number.parseInt(match[3]!, 16)];
}

type ColorRegion = {
  seeds: [number, number][];
  bounds: [number, number, number, number];
  minBlue?: number;
  minScale?: number;
};
type SkinRegion = {
  bounds: [number, number, number, number];
  minBlue?: number;
  minRed?: number;
  minGreenBlue?: number;
  minRedGreen?: number;
  maxRedGreen?: number;
};
const createLowBlueSkinRegion = (bounds: SkinRegion['bounds']): SkinRegion => ({
  bounds,
  minBlue: 8,
  minRed: 45,
  minGreenBlue: -90,
});

/** Recolors every skin-palette pixel in a small semantic area, including isolated highlights. */
function recolorSkinPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: SkinRegion,
  target: [number, number, number],
  originalPixels: Uint8ClampedArray,
  excludeMask?: Uint8Array,
): Uint8Array {
  const [left, top, right, bottom] = region.bounds;
  const minX = Math.max(0, Math.floor(left * width));
  const minY = Math.max(0, Math.floor(top * height));
  const maxX = Math.min(width - 1, Math.ceil(right * width));
  const maxY = Math.min(height - 1, Math.ceil(bottom * height));
  const recolored = new Uint8Array(width * height);
  const isLightTone = target[0] >= 240 && target[1] >= 180;
  const minimumScale = isLightTone ? 0.74 : 0.55;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const pixel = y * width + x;
      const offset = pixel * 4;
      if (excludeMask?.[pixel]) continue;
      const red = originalPixels[offset]!;
      const green = originalPixels[offset + 1]!;
      const blue = originalPixels[offset + 2]!;
      if (
        originalPixels[offset + 3]! <= 32
        || red <= (region.minRed ?? 65)
        || red - green < (region.minRedGreen ?? 8)
        || red - green > (region.maxRedGreen ?? 190)
        || blue < (region.minBlue ?? 55)
        // The source sprite uses saturated red-brown shadows on hands and
        // around the jaw. Include them in the low-blue pass so they receive
        // the selected skin tone instead of remaining as red patches.
        || green - blue < (region.minGreenBlue ?? ((region.minBlue ?? 55) < 55 ? -90 : -20))
      ) continue;

      const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 190;
      // Do not brighten highlights past the chosen swatch; this keeps dark
      // tones from turning reddish or orange on hands, face, and ankles.
      const scale = Math.max(minimumScale, Math.min(1, luminance));
      data[offset] = Math.round(target[0] * scale);
      data[offset + 1] = Math.round(target[1] * scale);
      data[offset + 2] = Math.round(target[2] * scale);
      recolored[pixel] = 1;
    }
  }

  return recolored;
}

function createFaceFeatureMask(
  width: number,
  height: number,
  isProfile: boolean,
  originalPixels: Uint8ClampedArray,
  isDarkTone: boolean,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const features = isProfile
    ? [{ x: 0.39, y: 0.323, rx: 0.052, ry: 0.038 }, { x: 0.31, y: 0.40, rx: 0.035, ry: 0.018 }]
    : [
      // Match the oval eye contours without masking a rectangular patch of
      // surrounding skin; both recoloring passes use this same protection.
      { x: 0.423, y: 0.332, rx: 0.074, ry: 0.039 },
      { x: 0.623, y: 0.332, rx: 0.064, ry: 0.039 },
      ...(!isDarkTone ? [{ x: 0.50, y: 0.402, rx: 0.036, ry: 0.015 }] : []),
    ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const normalizedX = x / width;
      const normalizedY = y / height;
      if (features.some(feature => {
        const dx = (normalizedX - feature.x) / feature.rx;
        const dy = (normalizedY - feature.y) / feature.ry;
        return dx * dx + dy * dy <= 1;
      })) mask[y * width + x] = 1;
    }
  }

  if (isDarkTone && !isProfile) {
    // Preserve the actual coral nose and smile pixels, but let the surrounding
    // face skin recolor. The old oval also protected a patch of pale source skin.
    const coralFeatureRegions: SkinRegion['bounds'][] = [
      [0.47, 0.37, 0.56, 0.40],
      [0.44, 0.405, 0.59, 0.43],
    ];
    for (const [left, top, right, bottom] of coralFeatureRegions) {
      for (let y = Math.floor(top * height); y <= Math.ceil(bottom * height); y++) {
        for (let x = Math.floor(left * width); x <= Math.ceil(right * width); x++) {
          const pixel = y * width + x;
          const offset = pixel * 4;
          const red = originalPixels[offset]!;
          const green = originalPixels[offset + 1]!;
          const blue = originalPixels[offset + 2]!;
          if (
            originalPixels[offset + 3]! > 32
            && red >= 150
            && red - green >= 80
            && green - blue >= 5
            && blue <= 135
          ) mask[pixel] = 1;
        }
      }
    }
  }

  return mask;
}

/** Recolors connected pixels inside a tight crop while retaining sprite shading. */
function recolorConnectedRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: ColorRegion,
  target: [number, number, number],
  mode: 'skin' | 'hair',
  originalPixels: Uint8ClampedArray,
  excludeMask?: Uint8Array,
): Uint8Array {
  const [left, top, right, bottom] = region.bounds;
  const minX = Math.max(0, Math.floor(left * width));
  const minY = Math.max(0, Math.floor(top * height));
  const maxX = Math.min(width - 1, Math.ceil(right * width));
  const maxY = Math.min(height - 1, Math.ceil(bottom * height));
  const source = originalPixels;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const isTargetPixel = (pixel: number) => {
    if (excludeMask?.[pixel]) return false;
    const offset = pixel * 4;
    const red = source[offset]!;
    const green = source[offset + 1]!;
    const blue = source[offset + 2]!;
    if (source[offset + 3]! <= 32) return false;
    if (mode === 'hair') {
      // Include the dark reddish shadows used by curly and coily hair while
      // keeping cyan accessories and near-black outlines untouched.
      return red > 45 && red - green >= 14 && red - green <= 170 && green - blue >= -24 && green - blue <= 200;
    }
    // Allow the warmer red shadows in the skin palette while neutral eye
    // whites, highlights, and dark outlines remain outside the mask.
    const minimumBlue = region.minBlue ?? (target[0] >= 240 && target[1] >= 180 ? 85 : 0);
    return red > 65 && red - green >= 8 && green - blue >= -12 && red - green <= 190 && blue >= minimumBlue;
  };

  for (const [seedXRatio, seedYRatio] of region.seeds) {
    const seedX = Math.round(seedXRatio * width);
    const seedY = Math.round(seedYRatio * height);
    const seedIndex = seedY * width + seedX;
    if (seedX < minX || seedX > maxX || seedY < minY || seedY > maxY || visited[seedIndex] || !isTargetPixel(seedIndex)) continue;
    visited[seedIndex] = 1;
    queue.push(seedIndex);
  }

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const pixel = queue[cursor]!;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const offset = pixel * 4;
    const red = source[offset]!;
    const green = source[offset + 1]!;
    const blue = source[offset + 2]!;
    const referenceLuminance = mode === 'hair' ? 72 : 190;
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / referenceLuminance;
    const lightSkinFloor = region.minScale ?? (target[0] >= 240 && target[1] >= 180 ? 0.74 : 0.55);
    const scale = mode === 'hair'
      ? Math.max(0.42, Math.min(1, luminance))
      : Math.max(lightSkinFloor, Math.min(1, luminance));
    data[offset] = Math.round(target[0] * scale);
    data[offset + 1] = Math.round(target[1] * scale);
    data[offset + 2] = Math.round(target[2] * scale);

    const neighbors = [x > minX ? pixel - 1 : -1, x < maxX ? pixel + 1 : -1,
      y > minY ? pixel - width : -1, y < maxY ? pixel + width : -1];
    for (const next of neighbors) {
      if (next < 0 || visited[next] || !isTargetPixel(next)) continue;
      visited[next] = 1;
      queue.push(next);
    }
  }
  return visited;
}

/** Draws the base sprite and recolors its skin pixels while preserving shading and alpha. */
export function AvatarCharacter({ src, skinTone, hairColor, alt, className = '', mirrored = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    const target = parseHexColor(skinTone);
    if (!canvas || !context || !target) return;
    const isLightTone = target[0] >= 240 && target[1] >= 180;
    const isMediumTone = target[0] === 217 && target[1] === 162 && target[2] === 120;
    const isDarkTone = target[0] === 107 && target[1] === 61 && target[2] === 46;
    const sprite = new Image();
    sprite.onload = () => {
      canvas.width = sprite.naturalWidth;
      canvas.height = sprite.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(sprite, 0, 0);

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = pixels;
      const originalPixels = data.slice();
      const isProfile = src.includes('profile-left');
      const isBack = src.includes('-back-');
      const featureMask = createFaceFeatureMask(width, height, isProfile, originalPixels, isDarkTone);

      // Recolor every skin-shaded pixel in compact face and neck bounds. This
      // covers disconnected pixel-art highlights without touching cool eye or
      // hair colors.
      const face: SkinRegion = isProfile
        ? { bounds: [0.24, 0.22, 0.54, 0.45], minBlue: 0 }
        : { bounds: [0.28, isLightTone ? 0.32 : 0.22, 0.72, 0.46], minBlue: isLightTone ? 85 : 0 };
      const neck: SkinRegion = isProfile
        ? { bounds: [0.36, 0.41, 0.54, 0.49], minBlue: 24, minRed: 90 }
        : { bounds: [0.42, 0.43, 0.60, 0.50], minBlue: 24, minRed: 90 };
      const hair: ColorRegion = isBack
        ? {
          seeds: [[0.32, 0.15], [0.50, 0.13], [0.68, 0.15], [0.35, 0.26], [0.65, 0.26], [0.38, 0.35], [0.62, 0.35]],
          bounds: [0.10, 0.03, 0.90, 0.45],
        }
        : isProfile
          ? {
            seeds: [[0.30, 0.16], [0.43, 0.13], [0.58, 0.16], [0.30, 0.25], [0.48, 0.24], [0.70, 0.25], [0.22, 0.34], [0.75, 0.34]],
            bounds: [0.08, 0.03, 0.92, 0.45],
          }
          : {
            seeds: [[0.25, 0.20], [0.35, 0.15], [0.50, 0.10], [0.65, 0.15], [0.75, 0.20], [0.35, 0.25], [0.50, 0.24], [0.65, 0.25], [0.18, 0.32], [0.82, 0.32], [0.25, 0.38], [0.75, 0.38]],
            bounds: [0.08, 0.02, 0.92, 0.45],
          };
      const skinMask = new Uint8Array(width * height);
      const addSkinMask = (regionMask: Uint8Array) => {
        for (let pixel = 0; pixel < regionMask.length; pixel++) {
          if (regionMask[pixel]) skinMask[pixel] = 1;
        }
      };
      if (!isBack) {
        // Start from cheek pixels and follow the connected skin component. The
        // previous rectangular sweep could cross the hairline and turn afro
        // curls into skin-colored patches before the hair mask was built.
        const faceSkinSeeds: [number, number][] = isProfile
          ? [[0.35, 0.36], [0.42, 0.37], [0.46, 0.38]]
          : [[0.39, 0.37], [0.61, 0.37], [0.50, 0.38]];
        addSkinMask(recolorConnectedRegion(
          data,
          width,
          height,
          { seeds: faceSkinSeeds, bounds: face.bounds, minBlue: face.minBlue },
          target,
          'skin',
          originalPixels,
          featureMask,
        ));
        if ((isLightTone || isMediumTone) && !isProfile) {
          // These are isolated forehead-skin islands visible between bangs in
          // all four front hair sprites. Keep each flood inside its own small
          // crop so it cannot cross the hairline into a neighboring lock.
          const isPointedFrontHair = src.includes('front-hair_type_1');
          const foreheadSkinRegions: ColorRegion[] = [
            {
              seeds: [[0.42, 0.28]],
              bounds: [0.34, 0.25, 0.49, isPointedFrontHair ? 0.36 : 0.32],
              minBlue: 85,
            },
            { seeds: [[0.62, 0.28]], bounds: [0.51, 0.25, 0.70, 0.32], minBlue: 85 },
            { seeds: [[0.50, 0.28]], bounds: [0.47, 0.25, 0.53, 0.31], minBlue: 55 },
            { seeds: [[0.50, 0.32]], bounds: [0.46, 0.31, 0.54, 0.35], minBlue: 85 },
          ];
          // Keep recoloring within the small gaps between hair locks. The
          // Keep these passes narrow so they recolor exposed skin between
          // locks without spreading across the hairline.
          for (const region of foreheadSkinRegions) {
            addSkinMask(recolorConnectedRegion(data, width, height, region, target, 'skin', originalPixels, featureMask));
          }
        }
        addSkinMask(recolorSkinPixels(data, width, height, neck, target, originalPixels));
      }
      const selectedHair = parseHexColor(hairColor);
      const hairExclusions = skinMask.slice();
      for (let pixel = 0; pixel < hairExclusions.length; pixel++) {
        if (featureMask[pixel]) hairExclusions[pixel] = 1;
      }
      const hairMask = selectedHair
        ? recolorConnectedRegion(data, width, height, hair, selectedHair, 'hair', originalPixels, hairExclusions)
        : new Uint8Array(width * height);
      if (isLightTone && !isProfile && !isBack && src.includes('front-hair_type_1')) {
        // Remove the tiny brown spill above the left eyebrow without repainting
        // the eyebrow or eye. This stays inside the marked forehead spot.
        const foreheadSpot: [number, number][] = [
          [0.402, 0.292], [0.406, 0.275], [0.414, 0.258],
          [0.429, 0.249], [0.444, 0.258], [0.448, 0.276], [0.438, 0.29],
        ];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pixel = y * width + x;
            const nx = (x + 0.5) / width;
            const ny = (y + 0.5) / height;
            let inside = false;
            for (let i = 0, j = foreheadSpot.length - 1; i < foreheadSpot.length; j = i++) {
              const [xi, yi] = foreheadSpot[i]!;
              const [xj, yj] = foreheadSpot[j]!;
              if ((yi > ny) !== (yj > ny) && nx < ((xj - xi) * (ny - yi)) / (yj - yi) + xi) inside = !inside;
            }
            if (!inside) continue;
            const offset = pixel * 4;
            const red = originalPixels[offset]!;
            const green = originalPixels[offset + 1]!;
            const blue = originalPixels[offset + 2]!;
            const brownHair = red > 55 && red - green >= 18 && green - blue >= 0 && blue < 135;
            if (featureMask[pixel] || (!hairMask[pixel] && !brownHair)) continue;
            const sourceLuminance = (
              red * 0.2126
              + green * 0.7152
              + blue * 0.0722
            ) / 190;
            const scale = Math.max(0.74, Math.min(1, sourceLuminance));
            data[offset] = Math.round(target[0] * scale);
            data[offset + 1] = Math.round(target[1] * scale);
            data[offset + 2] = Math.round(target[2] * scale);
            hairMask[pixel] = 0;
            skinMask[pixel] = 1;
          }
        }
      }
      if (!isBack) {
        if (!isLightTone) {
          const faceShadows: SkinRegion = {
            bounds: face.bounds,
            minBlue: 8,
            minRed: 45,
            minGreenBlue: -90,
            minRedGreen: 8,
          };
          const faceExclusions = featureMask.slice();
          for (let pixel = 0; pixel < faceExclusions.length; pixel++) {
            if (hairMask[pixel]) faceExclusions[pixel] = 1;
          }
          addSkinMask(recolorSkinPixels(data, width, height, faceShadows, target, originalPixels, faceExclusions));
        }
        const neckShadows: SkinRegion = {
          bounds: neck.bounds,
          minBlue: 8,
          minRed: 45,
          minRedGreen: isLightTone ? 0 : 8,
        };
        addSkinMask(recolorSkinPixels(data, width, height, neckShadows, target, originalPixels, hairMask));
        // For light skin, face pixels stay on the connected cheek component:
        // the broad shadow pass can catch afro highlights at the hairline.
        // Hair pixels stay protected from the neck shadow pass.
      }

      const limbSkin: SkinRegion[] = isProfile
        ? [
          createLowBlueSkinRegion([0.26, 0.62, 0.39, 0.77]),
          createLowBlueSkinRegion([0.45, 0.62, 0.64, 0.77]),
          createLowBlueSkinRegion([0.48, 0.82, 0.64, 0.88]),
        ]
        : [
          createLowBlueSkinRegion([0.16, 0.62, 0.34, 0.77]),
          createLowBlueSkinRegion([0.66, 0.62, 0.84, 0.77]),
          ...(isBack
            ? [
              // The exposed ankles reach inward beyond the outer leg edges;
              // include those inner pixels while staying above the shoes.
              createLowBlueSkinRegion([0.27, 0.82, 0.47, 0.88]),
              createLowBlueSkinRegion([0.53, 0.82, 0.74, 0.88]),
            ]
            : [
              createLowBlueSkinRegion([0.34, 0.81, 0.47, 0.88]),
              createLowBlueSkinRegion([0.53, 0.81, 0.66, 0.88]),
            ]),
        ];
      for (const region of limbSkin) {
        recolorSkinPixels(data, width, height, region, target, originalPixels);
      }

      context.putImageData(pixels, 0, 0);
    };
    sprite.src = src;

    return () => {
      sprite.onload = null;
    };
  }, [hairColor, skinTone, src]);

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${mirrored ? 'is-mirrored' : ''}`.trim()}
      role="img"
      aria-label={alt}
    />
  );
}
