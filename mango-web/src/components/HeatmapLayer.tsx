import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet.heat"

type Props = {
  points: Array<[number, number, number]>
}

export function HeatmapLayer({ points }: Props) {
  const map = useMap()

  // Зберігаємо інстанс шару теплової мапи між рендерами
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null)

  // 1. Ініціалізація шару (виконується лише один раз)
  useEffect(() => {
    if (!map) return

    // Створюємо порожній шар і додаємо його на мапу
    heatLayerRef.current = L.heatLayer([], {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.4: "blue",
        0.6: "cyan",
        0.7: "lime",
        0.8: "yellow",
        1.0: "red"
      }
    }).addTo(map)

    // Прибирання при демонтажі компонента
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
        heatLayerRef.current = null
      }
    }
  }, [map])

  // 2. Оновлення точок (без перестворення Canvas)
  useEffect(() => {
    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(points)
    }
  }, [points])

  return null
}