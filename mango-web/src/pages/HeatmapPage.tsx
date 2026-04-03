import { useState, useMemo, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import { useQuery } from "@tanstack/react-query"
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
      const center = map.getCenter()
      const bounds = map.getBounds()
      // Вираховуємо радіус в метрах від центру до кута екрана
      const radius = map.distance(center, bounds.getNorthEast())
      onBoundsChange(center.lat, center.lng, radius)
    }
  })

  // Викликаємо один раз при першому завантаженні мапи
  useEffect(() => {
    const center = map.getCenter()
    const bounds = map.getBounds()
    const radius = map.distance(center, bounds.getNorthEast())
    onBoundsChange(center.lat, center.lng, radius)
  }, [map, onBoundsChange])

  return null
}

export function HeatmapPage() {
  // Стан для збереження поточної зони видимості
  const [viewport, setViewport] = useState<{ lat: number; lng: number; radius: number } | null>(null)

  // 1. ЗАПОБІЖНИК ВІД НЕСКІНЧЕННОГО ЦИКЛУ
  const handleBoundsChange = useCallback((lat: number, lng: number, radius: number) => {
    setViewport(prev => {
      // Якщо координати і радіус не змінилися — ігноруємо оновлення (це зупинить цикл)
      if (prev && prev.lat === lat && prev.lng === lng && prev.radius === radius) {
        return prev
      }
      return { lat, lng, radius }
    })
  }, [])

  // Запит за даними. Спрацьовує автоматично, коли змінюється viewport
  const { data, isFetching, isError } = useQuery({
    // Додаємо координати у ключ, щоб React Query розумів, коли робити новий запит
    // Використовуємо Math.round для радіуса, щоб не робити зайвих запитів при мікро-зсувах
    queryKey: ["measurements", viewport?.lat, viewport?.lng, Math.round(viewport?.radius ?? 0)],
    queryFn: () => getMeasurements({
      latitude: viewport!.lat,
      longitude: viewport!.lng,
      radius: Math.round(viewport!.radius),
      take: 2000, // Беремо багато точок для теплової мапи
    }),
    enabled: !!viewport, // Не робимо запит, поки мапа не ініціалізована
    staleTime: 60000, // Кешуємо дані на 1 хвилину, щоб не спамити бекенд при рухах мапи туди-сюди
  })

  // Трансформуємо DTO у формат, який розуміє Leaflet.heat ([lat, lng, intensity])
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

          {points.length > 0 && <HeatmapLayer points={points} />}
        </MapContainer>

        {/* Інформаційна панель зверху мапи */}
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
          Кількість точок: {data?.total ?? 0}<br />
          Макс. шум: {data?.stats.maxDba ? `${data.stats.maxDba} дБ` : "—"}<br />
          Серед. шум: {data?.stats.avgDba ? `${Math.round(data.stats.avgDba)} дБ` : "—"}
        </div>
      </div>
    </div>
  )
}