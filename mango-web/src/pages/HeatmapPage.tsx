import { useState, useMemo, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import "leaflet/dist/leaflet.css"
import { HeatmapLayer } from "../components/HeatmapLayer"
import { getMeasurements } from "../api/measurements"

// Допоміжний компонент для відслідковування координат мапи
function MapController({
  onBoundsChange
}: {
  onBoundsChange: (lat: number, lng: number, radius: number) => void
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter().wrap()
      const bounds = map.getBounds()
      const latDiff = Math.abs(bounds.getNorth() - center.lat)
      const lngDiff = Math.abs(bounds.getEast() - center.lng)
      const radiusInDegrees = Math.min(latDiff, lngDiff)
      onBoundsChange(center.lat, center.lng, radiusInDegrees)
    }
  })

  useEffect(() => {
    const center = map.getCenter()
    const bounds = map.getBounds()
    const latDiff = Math.abs(bounds.getNorth() - center.lat)
    const lngDiff = Math.abs(bounds.getEast() - center.lng)
    const radiusInDegrees = Math.min(latDiff, lngDiff)
    onBoundsChange(center.lat, center.lng, radiusInDegrees)
  }, [map, onBoundsChange])

  return null
}

export function HeatmapPage() {
  const [viewport, setViewport] = useState<{ lat: number; lng: number; radius: number } | null>(null)

  const handleBoundsChange = useCallback((lat: number, lng: number, radius: number) => {
    setViewport(prev => {
      if (prev && prev.lat === lat && prev.lng === lng && prev.radius === radius) {
        return prev
      }
      return { lat, lng, radius }
    })
  }, [])

  const { data, isFetching, isError } = useQuery({
    queryKey: ["measurements", viewport?.lat, viewport?.lng, Math.round(viewport?.radius ?? 0)],
    queryFn: () => getMeasurements({
      latitude: viewport!.lat,
      longitude: viewport!.lng,
      radius: viewport!.radius,
      take: 2000,
    }),
    enabled: !!viewport,
    staleTime: 60000,
    placeholderData: keepPreviousData,
  })

  const points = useMemo(() => {
    if (!data?.data) return []

    return data.data.map(measurement => {
      // Нормалізуємо рівень шуму (avgDba) у значення від 0 до 1 для інтенсивності.
      // Припускаємо, що 120 дБ — це максимальний рівень гучності (дуже голосно)
      const intensity = Math.min(measurement.avgDba / 120, 1.0)

      return [
        measurement.location.latitude,
        measurement.location.longitude,
        intensity
      ] as [number, number, number]
    })
  }, [data])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Теплова мапа вимірів</h1>
        {isFetching && <span style={{ color: "blue" }}>Завантаження даних зони...</span>}
      </div>

      {isError && <div style={{ color: "red", marginBottom: 10 }}>Не вдалося завантажити виміри.</div>}

      <div style={{ flexGrow: 1, borderRadius: "8px", overflow: "hidden", border: "1px solid #ccc", position: "relative" }}>
        <MapContainer
          center={[50.4501, 30.5234]} // Старт у Києві
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController onBoundsChange={handleBoundsChange} />

          <HeatmapLayer points={points} />
        </MapContainer>

        {/* Інформаційна панель зверху мапи */}
        {data && (
          <div style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "rgba(255, 255, 255, 0.9)",
            padding: "10px 15px",
            borderRadius: "8px",
            zIndex: 1000,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
          }}>
            <b>Дані у цій зоні:</b><br />
            Кількість точок: {data.total}<br />
            Макс. шум: {data.stats?.maxDba ? `${data.stats.maxDba} дБ` : "—"}<br />
            Серед. шум: {data.stats?.avgDba ? `${Math.round(data.stats.avgDba)} дБ` : "—"}
          </div>
        )}
      </div>
    </div>
  )
}