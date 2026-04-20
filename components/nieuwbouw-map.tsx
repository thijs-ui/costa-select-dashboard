// ============================================================================
// components/nieuwbouw-map.tsx
//
// Google Map met clustered pins. Selectie triggert parent state.
// Gebruikt @react-google-maps/api (voeg toe aan dependencies als nog niet aanwezig).
// ============================================================================
'use client'

import { useMemo, useRef, useCallback } from 'react'
import { GoogleMap, useLoadScript, OverlayView } from '@react-google-maps/api'
import type { Listing } from '@/components/nieuwbouw-types'

const MAP_CENTER = { lat: 36.51, lng: -4.88 }  // Costa del Sol centraal
const MAP_ZOOM = 10

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#EEF5F3' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7A8C8B' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFAEF' }] },
    { featureType: 'water', stylers: [{ color: '#CFE6E1' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.natural', stylers: [{ color: '#F5F0E1' }] },
  ],
}

interface Props {
  listings: Listing[]
  selectedId: string | null
  onSelect: (id: string) => void
  apiKey: string
}

export default function NieuwbouwMap({ listings, selectedId, onSelect, apiKey }: Props) {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey })
  const mapRef = useRef<google.maps.Map | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map }, [])

  const pins = useMemo(
    () => listings.filter(l => l.latitude != null && l.longitude != null),
    [listings]
  )

  if (!isLoaded) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#EEF5F3',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#7A8C8B', fontSize: 13 }}>
        Kaart laden…
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ position: 'absolute', inset: 0 }}
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      options={mapOptions}
      onLoad={onLoad}
    >
      {pins.map(l => (
        <OverlayView
          key={l.id}
          position={{ lat: l.latitude!, lng: l.longitude! }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <button
            onClick={() => onSelect(l.id)}
            aria-label={l.title ?? l.address ?? l.property_code}
            style={{
              transform: 'translate(-50%,-50%)',
              width: selectedId === l.id ? 28 : 22,
              height: selectedId === l.id ? 28 : 22,
              borderRadius: '50%',
              background: selectedId === l.id ? '#F5AF40' : '#0EAE96',
              border: `${selectedId === l.id ? 3 : 2}px solid #fff`,
              boxShadow: selectedId === l.id
                ? '0 0 0 8px rgba(245,175,64,.25),0 2px 8px rgba(0,75,70,.4)'
                : '0 2px 6px rgba(0,75,70,.4)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        </OverlayView>
      ))}
    </GoogleMap>
  )
}
