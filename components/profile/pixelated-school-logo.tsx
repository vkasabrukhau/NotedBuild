"use client";

import { useEffect, useRef } from "react";

type PixelatedSchoolLogoProps = {
  alt: string;
  className?: string;
  size?: number;
  src: string;
};

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

const NEUTRAL_INK: RgbColor = {
  r: 86,
  g: 80,
  b: 72,
};

function getContainRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    height,
    width,
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mixColor(base: RgbColor, target: RgbColor, amount: number): RgbColor {
  return {
    r: Math.round(base.r + (target.r - base.r) * amount),
    g: Math.round(base.g + (target.g - base.g) * amount),
    b: Math.round(base.b + (target.b - base.b) * amount),
  };
}

function rgbToHsl({ r, g, b }: RgbColor) {
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const lightness = (max + min) / 2;

  if (max === min) {
    return {
      h: 0,
      l: lightness,
      s: 0,
    };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  switch (max) {
    case normalizedR:
      hue = (normalizedG - normalizedB) / delta + (normalizedG < normalizedB ? 6 : 0);
      break;
    case normalizedG:
      hue = (normalizedB - normalizedR) / delta + 2;
      break;
    default:
      hue = (normalizedR - normalizedG) / delta + 4;
      break;
  }

  return {
    h: hue / 6,
    l: lightness,
    s: saturation,
  };
}

function hueToRgb(p: number, q: number, t: number) {
  let nextT = t;

  if (nextT < 0) {
    nextT += 1;
  }

  if (nextT > 1) {
    nextT -= 1;
  }

  if (nextT < 1 / 6) {
    return p + (q - p) * 6 * nextT;
  }

  if (nextT < 1 / 2) {
    return q;
  }

  if (nextT < 2 / 3) {
    return p + (q - p) * (2 / 3 - nextT) * 6;
  }

  return p;
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  if (s === 0) {
    const grayscale = Math.round(l * 255);
    return {
      r: grayscale,
      g: grayscale,
      b: grayscale,
    };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function deriveInkColor(color: RgbColor) {
  const { h, l, s } = rgbToHsl(color);
  const softened = hslToRgb(
    h,
    clamp(s * 0.9, 0.18, 0.58),
    clamp(0.18 + l * 0.18, 0.2, 0.4),
  );

  return mixColor(softened, NEUTRAL_INK, 0.16);
}

export default function PixelatedSchoolLogo({
  alt,
  className,
  size = 132,
  src,
}: PixelatedSchoolLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) {
        return;
      }

      const pixelSize = 28;
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = pixelSize;
      sampleCanvas.height = pixelSize;
      const sampleContext = sampleCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      const displayContext = canvas.getContext("2d");

      if (!sampleContext || !displayContext) {
        return;
      }

      sampleContext.clearRect(0, 0, pixelSize, pixelSize);
      const containRect = getContainRect(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        pixelSize,
        pixelSize,
      );
      sampleContext.drawImage(
        image,
        containRect.x,
        containRect.y,
        containRect.width,
        containRect.height,
      );

      const sampleImage = sampleContext.getImageData(0, 0, pixelSize, pixelSize);
      const outputImage = sampleContext.createImageData(pixelSize, pixelSize);
      const source = sampleImage.data;
      const target = outputImage.data;

      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      let opaqueCount = 0;

      for (let index = 0; index < source.length; index += 4) {
        const alpha = source[index + 3];

        if (alpha < 24) {
          continue;
        }

        redTotal += source[index];
        greenTotal += source[index + 1];
        blueTotal += source[index + 2];
        opaqueCount += 1;
      }

      const averageColor =
        opaqueCount > 0
          ? {
              r: Math.round(redTotal / opaqueCount),
              g: Math.round(greenTotal / opaqueCount),
              b: Math.round(blueTotal / opaqueCount),
            }
          : NEUTRAL_INK;
      const inkColor = deriveInkColor(averageColor);
      const paperColor = mixColor(
        {
          r: 255,
          g: 255,
          b: 255,
        },
        averageColor,
        0.06,
      );

      for (let index = 0; index < source.length; index += 4) {
        const alpha = source[index + 3];

        if (alpha < 24) {
          target[index] = 0;
          target[index + 1] = 0;
          target[index + 2] = 0;
          target[index + 3] = 0;
          continue;
        }

        const luminance =
          (0.2126 * source[index] +
            0.7152 * source[index + 1] +
            0.0722 * source[index + 2]) /
          255;
        const coverage = alpha / 255;
        const inkStrength = clamp(coverage * (1 - luminance * 0.62), 0.28, 1);
        const outputColor = mixColor(paperColor, inkColor, inkStrength);

        target[index] = outputColor.r;
        target[index + 1] = outputColor.g;
        target[index + 2] = outputColor.b;
        target[index + 3] = Math.round(alpha * 0.96);
      }

      sampleContext.putImageData(outputImage, 0, 0);

      canvas.width = size;
      canvas.height = size;
      displayContext.clearRect(0, 0, size, size);
      displayContext.imageSmoothingEnabled = false;
      displayContext.drawImage(sampleCanvas, 0, 0, size, size);
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [size, src]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={alt}
      role="img"
      className={className ?? "absolute inset-0 h-full w-full object-contain p-5"}
      style={{
        imageRendering: "pixelated",
      }}
    />
  );
}
