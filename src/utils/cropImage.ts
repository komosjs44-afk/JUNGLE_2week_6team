// 업로드 사진의 비율(가로/세로) 조절 — 원본 비율을 기본/우선으로 쓰고,
// 사용자가 프리셋(1:1, 4:5, 3:4 등)을 고르면 중앙 기준으로 잘라(center-crop) 그 비율에 맞춘다.

/** 프리셋 비율. 값은 width/height. 'original'은 크롭 없이 원본 비율 그대로 쓴다는 의미. */
export const ASPECT_RATIO_PRESETS = {
  original: null,
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
} as const

export type AspectRatioOption = keyof typeof ASPECT_RATIO_PRESETS

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
    img.src = url
  })
}

/** 이미지의 원본 비율(width/height)을 구한다. */
export async function getImageAspectRatio(url: string): Promise<number> {
  const img = await loadImage(url)
  return img.naturalWidth / img.naturalHeight
}

/**
 * 이미지를 지정한 비율로 중앙 기준 크롭한다. ratio는 width/height.
 * 원본이 목표보다 가로로 넓으면 좌우를, 세로로 길면 위아래를 잘라낸다.
 */
export async function cropToAspectRatio(url: string, ratio: number): Promise<Blob> {
  const img = await loadImage(url)
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const srcRatio = srcW / srcH

  let cropW = srcW
  let cropH = srcH
  if (srcRatio > ratio) {
    // 원본이 더 넓다 → 좌우를 잘라 세로 기준으로 맞춤
    cropW = Math.round(srcH * ratio)
  } else {
    // 원본이 더 길다 → 위아래를 잘라 가로 기준으로 맞춤
    cropH = Math.round(srcW / ratio)
  }
  const offsetX = Math.round((srcW - cropW) / 2)
  const offsetY = Math.round((srcH - cropH) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 생성하지 못했어요.')
  ctx.drawImage(img, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 크롭에 실패했어요.'))),
      'image/jpeg',
      0.92,
    )
  })
}
