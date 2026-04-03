import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import {
  getDevices,
  deleteDevice,
  type DeviceResponseDto,
  type GetDevicesQuery,
  type DeviceStatus
} from "../api/devices"
import { getDeviceModels } from "../api/deviceModels"
import { DeviceModal } from "../components/DeviceModal"

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit", device: DeviceResponseDto }

const STATUS_LABELS: Record<DeviceStatus, string> = {
  in_stock: "На складі",
  deployed: "Розгорнуто",
  fixing: "В ремонті",
  decommissioned: "Списано"
}

export function DevicesPage() {
  const queryClient = useQueryClient()
  
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch] = useDebounce(searchInput, 300)
  
  const [modal, setModal] = useState<ModalState>({ mode: "closed" })

  const [query, setQuery] = useState<GetDevicesQuery>({
    take: 10,
    skip: 0,
    sortBy: "serialNumber",
    sortOrder: "asc",
    modelId: undefined,
    status: undefined,
    active: undefined,
  })

  // Завантажуємо список моделей для фільтра та мапінгу
  const { data: modelsData } = useQuery({
    queryKey: ["deviceModels", { take: 100 }],
    queryFn: () => getDeviceModels({ take: 100 }),
  })

  // Створюємо словник (id -> name) для швидкого доступу при рендері таблиці
  const modelsMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (modelsData?.data) {
      modelsData.data.forEach(model => {
        map[model.id] = model.name
      })
    }
    return map
  }, [modelsData])

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["devices", { ...query, search: debouncedSearch }],
    queryFn: () => getDevices({ 
      ...query, 
      serial: debouncedSearch || undefined, 
      name: debouncedSearch || undefined 
    }),
    placeholderData: prev => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  })

  function updateFilter(updates: Partial<GetDevicesQuery>) {
    setQuery(prev => ({ ...prev, ...updates, skip: 0 }))
  }

  function handleSort(field: GetDevicesQuery["sortBy"]) {
    setQuery(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
      skip: 0,
    }))
  }

  const totalPages = Math.ceil((data?.total ?? 0) / (query.take ?? 10)) || 1
  const currentPage = Math.floor((query.skip ?? 0) / (query.take ?? 10)) + 1

  if (isLoading) return <div>Завантаження...</div>
  if (isError) return <div>Не вдалось завантажити пристрої</div>

  return (
    <div>
      <h1>Пристрої</h1>

      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "20px", 
        flexWrap: "wrap",
        alignItems: "flex-end",
        background: "#f9f9f9",
        padding: "15px",
        borderRadius: "8px"
      }}>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Пошук</label>
          <input
            type="text"
            value={searchInput}
            placeholder="Серійник або назва..."
            onChange={(e) => {
              setSearchInput(e.target.value)
              setQuery(prev => ({ ...prev, skip: 0 }))
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Модель</label>
          <select 
            value={query.modelId ?? ""} 
            onChange={e => updateFilter({ modelId: e.target.value || undefined })}
          >
            <option value="">Всі моделі</option>
            {modelsData?.data.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Статус</label>
          <select 
            value={query.status ?? ""} 
            onChange={e => updateFilter({ status: (e.target.value as DeviceStatus) || undefined })}
          >
            <option value="">Всі статуси</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Активність</label>
          <select 
            value={query.active ?? ""} 
            onChange={e => updateFilter({ active: (e.target.value as "true" | "false") || undefined })}
          >
            <option value="">Всі</option>
            <option value="true">Онлайн</option>
            <option value="false">Офлайн</option>
          </select>
        </div>

        <button 
          onClick={() => setModal({ mode: "create" })}
          style={{ marginLeft: "auto", alignSelf: "center" }}
        >
          + Додати пристрій
        </button>
      </div>

      {isFetching && <div style={{ fontSize: "12px", color: "blue" }}>Оновлення даних...</div>}

      <table style={{ width: "100%", textAlign: "left", marginTop: 10 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee" }}>
            <th onClick={() => handleSort("modelId")} style={{ cursor: "pointer" }}>
              Модель {query.sortBy === "modelId" && (query.sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("serialNumber")} style={{ cursor: "pointer" }}>
              Серійник {query.sortBy === "serialNumber" && (query.sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("customName")} style={{ cursor: "pointer" }}>
              Назва {query.sortBy === "customName" && (query.sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th>Статус</th>
            <th onClick={() => handleSort("batteryLevel")} style={{ cursor: "pointer" }}>
              Батарея {query.sortBy === "batteryLevel" && (query.sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th>Активність</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map(device => (
            <tr key={device.id} style={{ borderBottom: "1px solid #eee" }}>
              {/* Відображаємо назву моделі зі словника, або fallback якщо моделі немає */}
              <td>{modelsMap[device.modelId] || "—"}</td>
              <td>{device.serialNumber}</td>
              <td>{device.customName ?? "—"}</td>
              <td>{STATUS_LABELS[device.status]}</td>
              <td>
                {device.batteryLevel !== null ? (
                  <span style={{ color: device.batteryLevel < 20 ? "red" : "inherit" }}>
                    {device.batteryLevel}%
                  </span>
                ) : "—"}
              </td>
              <td>
                <span style={{ 
                  display: "inline-block", 
                  width: "10px", 
                  height: "10px", 
                  borderRadius: "50%", 
                  backgroundColor: device.isActive ? "green" : "gray",
                  marginRight: "5px"
                }} />
                {device.isActive ? "Онлайн" : "Офлайн"}
              </td>
              <td>
                <button onClick={() => setModal({ mode: "edit", device })}>Ред.</button>
                <button onClick={() => {
                  if (confirm("Архівувати пристрій?")) deleteMutation.mutate(device.id)
                }}>Вид.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data?.data.length === 0 && <div style={{ padding: "20px", textAlign: "center" }}>Пристроїв не знайдено</div>}

      <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <button 
          disabled={currentPage === 1} 
          onClick={() => setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) - (prev.take ?? 10) }))}
        >
          ← Назад
        </button>
        <span>Сторінка {currentPage} з {totalPages} (Всього: {data?.total})</span>
        <button 
          disabled={currentPage >= totalPages} 
          onClick={() => setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) + (prev.take ?? 10) }))}
        >
          Вперед →
        </button>
      </div>

      {modal.mode !== "closed" && (
        <DeviceModal
          mode={modal.mode}
          device={modal.mode === "edit" ? modal.device : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </div>
  )
}