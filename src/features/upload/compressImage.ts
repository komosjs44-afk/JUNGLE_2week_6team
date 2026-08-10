import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
    })
  } catch {
    return file
  }
}
