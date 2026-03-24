"use client";

import { useEffect, useRef } from "react";

type PixelatedSchoolLogoProps = {
  alt: string;
  className?: string;
  size?: number;
  src: string;
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

      for (let index = 0; index < source.length; index += 4) {
        const alpha = source[index + 3];

        if (alpha < 24) {
          target[index] = 0;
          target[index + 1] = 0;
          target[index + 2] = 0;
          target[index + 3] = 0;
          continue;
        }

        target[index] = source[index];
        target[index + 1] = source[index + 1];
        target[index + 2] = source[index + 2];
        target[index + 3] = alpha;
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
