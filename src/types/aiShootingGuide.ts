/** Gemini가 사진+촬영 정보를 바탕으로 생성하는 "따라 찍기" 가이드. */
export interface AiShootingGuide {
  summary: string
  positionGuide: string
  directionGuide: string
  cameraGuide: string
  compositionGuide: string
  heightGuide: string
  timeGuide: string
  lightGuide: string
  editingGuide: string
  tips: string[]
}
