import { parse } from 'exifr'
import type { ExifData } from '@/types'

export interface ExifAnalysisResult {
  exif: ExifData | null
  found: boolean
}

function toShutterSpeedLabel(exposureTime: number | undefined): string | undefined {
  if (!exposureTime) return undefined
  if (exposureTime >= 1) return `${exposureTime}s`
  return `1/${Math.round(1 / exposureTime)}s`
}

export async function analyzeExif(file: File): Promise<ExifAnalysisResult> {
  try {
    const output = await parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ISO', 'ExposureTime', 'DateTimeOriginal', 'latitude', 'longitude'],
    })

    if (!output) return { exif: null, found: false }

    const exif: ExifData = {
      cameraMake: output.Make,
      cameraModel: output.Model,
      lensModel: output.LensModel,
      focalLength: output.FocalLength,
      aperture: output.FNumber,
      iso: output.ISO,
      shutterSpeed: toShutterSpeedLabel(output.ExposureTime),
      shotAt: output.DateTimeOriginal instanceof Date ? output.DateTimeOriginal.toISOString() : undefined,
      latitude: output.latitude,
      longitude: output.longitude,
    }

    const found = Object.values(exif).some((value) => value !== undefined)
    return { exif: found ? exif : null, found }
  } catch {
    return { exif: null, found: false }
  }
}
