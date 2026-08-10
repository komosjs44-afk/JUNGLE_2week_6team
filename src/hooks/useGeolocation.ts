import { useEffect, useState } from 'react'
import type { DeviceLocation } from '@/types'

export type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error'
export type GeolocationErrorReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

interface UseGeolocationResult {
  location: DeviceLocation | null
  status: GeolocationStatus
  errorReason: GeolocationErrorReason | null
}

function toErrorReason(error: GeolocationPositionError): GeolocationErrorReason {
  if (error.code === error.PERMISSION_DENIED) return 'denied'
  if (error.code === error.TIMEOUT) return 'timeout'
  return 'unavailable'
}

/**
 * One-shot device geolocation (not a live watch) for centering the map on the user.
 * Distinct from EXIF-derived photo location — this only reads the browser/device's
 * current position via navigator.geolocation, never a photo's metadata.
 */
export function useGeolocation(): UseGeolocationResult {
  const [result, setResult] = useState<UseGeolocationResult>({
    location: null,
    status: 'idle',
    errorReason: null,
  })

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setResult({ location: null, status: 'error', errorReason: 'unsupported' })
      return
    }

    setResult((prev) => ({ ...prev, status: 'loading' }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: DeviceLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        if (import.meta.env.DEV) console.debug('[geolocation] success', location)
        setResult({ location, status: 'success', errorReason: null })
      },
      (error) => {
        const errorReason = toErrorReason(error)
        if (import.meta.env.DEV) console.debug('[geolocation] failed', errorReason, error.message)
        setResult({ location: null, status: 'error', errorReason })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [])

  return result
}
