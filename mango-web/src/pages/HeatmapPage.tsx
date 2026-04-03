import { useState, useMemo, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDebounce } from "use-debounce" // <--- Додали для повзунка
import { Box, Typography, Paper, CircularProgress, Stack, Alert, TextField, Slider } from "@mui/material"
import "leaflet/dist/leaflet.css"
import { HeatmapLayer } from "../components/HeatmapLayer"
import { getMeasurements } from "../api/measurements"

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
      const radiusInDegrees = Math.min(latDiff, lngDiff) // Ваша зміна на min
      onBoundsChange(center.lat, center.lng, radiusInDegrees)
    }
  })

  useEffect(() => {
    const center = map.getCenter().wrap()
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

  // --- СТАН ДЛЯ ЧАСОВОГО ФІЛЬТРА ---
  // Отримуємо сьогоднішню локальну дату у форматі YYYY-MM-DD
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().split('T')[0]
  })
  
  // Проміжок годин від 0 до 24
  const [hourRange, setHourRange] = useState<number[]>([0, 24])
  // Дебаунс, щоб не робити 100 запитів під час перетягування повзунка
  const [debouncedHourRange] = useDebounce(hourRange, 500)

  // Конвертуємо зручний UI-стан у точні ISO-рядки для бекенду (з урахуванням часового поясу)
  const { fromISO, toISO } = useMemo(() => {
    const [year, month, day] = dateStr.split('-').map(Number)
    
    // Початок проміжку
    const fromDate = new Date(year, month - 1, day, debouncedHourRange[0], 0, 0)
    
    // Кінець проміжку (якщо 24, то ставимо кінець доби 23:59:59)
    const toHour = debouncedHourRange[1] === 24 ? 23 : debouncedHourRange[1]
    const toMinSec = debouncedHourRange[1] === 24 ? 59 : 0
    const toDate = new Date(year, month - 1, day, toHour, toMinSec, toMinSec, 999)

    return {
      fromISO: fromDate.toISOString(),
      toISO: toDate.toISOString()
    }
  }, [dateStr, debouncedHourRange])

  const handleBoundsChange = useCallback((lat: number, lng: number, radius: number) => {
    setViewport(prev => {
      if (prev && prev.lat === lat && prev.lng === lng && prev.radius === radius) return prev
      return { lat, lng, radius }
    })
  }, [])

  const { data, isFetching, isError } = useQuery({
    // Додали fromISO та toISO у ключ кешу, щоб запит оновлювався при зміні часу
    queryKey: ["measurements", viewport?.lat, viewport?.lng, viewport?.radius, fromISO, toISO],
    queryFn: () => getMeasurements({
      latitude: viewport!.lat,
      longitude: viewport!.lng,
      radius: viewport!.radius,
      from: fromISO,
      to: toISO,
      take: 2000,
    }),
    enabled: !!viewport,
    staleTime: 60000,
    placeholderData: keepPreviousData,
  })

  const points = useMemo(() => {
    if (!data?.data) return []
    return data.data.map(measurement => {
      const intensity = Math.min(measurement.avgDba / 120, 1.0)
      return [measurement.location.latitude, measurement.location.longitude, intensity] as [number, number, number]
    })
  }, [data])

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">Теплова мапа вимірів</Typography>
        {isFetching && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} />
            <Typography variant="body2" color="primary">Оновлення зони...</Typography>
          </Stack>
        )}
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>Не вдалося завантажити виміри.</Alert>
      )}

      <Paper elevation={2} sx={{ flexGrow: 1, borderRadius: 2, overflow: "hidden", position: "relative" }}>
        <MapContainer
          center={[49.4444, 32.0598]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController onBoundsChange={handleBoundsChange} />
          <HeatmapLayer points={points} />
        </MapContainer>

        {/* --- ПАНЕЛЬ ФІЛЬТРІВ ЧАСУ ЗВЕРХУ ПРАВОРУЧ --- */}
        <Paper elevation={4} sx={{
          position: "absolute",
          top: 20,
          right: 20,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: 2,
          borderRadius: 2,
          zIndex: 1000,
          width: 280
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
            Часовий проміжок
          </Typography>
          
          <TextField
            type="date"
            size="small"
            fullWidth
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Години: {hourRange[0]}:00 — {hourRange[1] === 24 ? "23:59" : `${hourRange[1]}:00`}
          </Typography>
          
          <Box sx={{ px: 1 }}>
            <Slider
              value={hourRange}
              onChange={(_, newValue) => setHourRange(newValue as number[])}
              valueLabelDisplay="auto"
              step={1}
              marks
              min={0}
              max={24}
              disableSwap
            />
          </Box>
        </Paper>

        {/* --- ПАНЕЛЬ СТАТИСТИКИ ЗНИЗУ ЛІВОРУЧ --- */}
        {data && (
          <Paper elevation={4} sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            padding: 2,
            borderRadius: 2,
            zIndex: 1000,
            minWidth: 200
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Дані у цій зоні:
            </Typography>
            <Typography variant="body2">
              Кількість точок: {data.total}
            </Typography>
            <Typography variant="body2">
              Макс. шум: {data.stats?.maxDba ? `${data.stats.maxDba} дБ` : "—"}
            </Typography>
            <Typography variant="body2">
              Серед. шум: {data.stats?.avgDba ? `${Math.round(data.stats.avgDba)} дБ` : "—"}
            </Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  )
}