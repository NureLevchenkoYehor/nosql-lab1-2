import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createDevice,
  updateDevice,
  rotateDeviceKey,
  type DeviceResponseDto,
  type CreateDeviceBody,
  type UpdateDeviceBody,
  type DeviceStatus
} from "../api/devices"
import { getDeviceModels } from "../api/deviceModels"

type Props = {
  mode: "create" | "edit"
  device?: DeviceResponseDto
  onClose: () => void
}

const STATUSES: { value: DeviceStatus; label: string }[] = [
  { value: "in_stock", label: "На складі" },
  { value: "deployed", label: "Розгорнуто" },
  { value: "fixing", label: "В ремонті" },
  { value: "decommissioned", label: "Списано" },
]

export function DeviceModal({ mode, device, onClose }: Props) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    modelId: device?.modelId ?? "",
    serialNumber: device?.serialNumber ?? "",
    customName: device?.customName ?? "",
    status: device?.status ?? "in_stock" as DeviceStatus,
  })

  const [error, setError] = useState<string | null>(null)
  const [apiKeyToShow, setApiKeyToShow] = useState<string | null>(null)

  // Завантажуємо моделі для випадаючого списку (беремо 100 для спрощення)
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["deviceModels", { take: 100 }],
    queryFn: () => getDeviceModels({ take: 100 }),
    enabled: mode === "create",
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateDeviceBody) => createDevice(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      setApiKeyToShow(data.apiKey) // Показуємо ключ замість закриття
    },
    onError: () => setError("Не вдалось створити пристрій. Перевірте унікальність серійного номера."),
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdateDeviceBody) => updateDevice(device!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      onClose()
    },
    onError: () => setError("Не вдалось оновити пристрій."),
  })

  const rotateKeyMutation = useMutation({
    mutationFn: () => rotateDeviceKey(device!.id),
    onSuccess: (data) => setApiKeyToShow(data.apiKey),
    onError: () => setError("Не вдалось згенерувати новий ключ."),
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit() {
    setError(null)
    if (mode === "create") {
      if (!form.modelId || !form.serialNumber) {
        setError("Модель та серійний номер обов'язкові")
        return
      }
      createMutation.mutate({
        modelId: form.modelId,
        serialNumber: form.serialNumber.trim(),
        customName: form.customName.trim() || undefined,
      })
    } else {
      updateMutation.mutate({
        status: form.status,
        customName: form.customName.trim() || undefined,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || rotateKeyMutation.isPending

  // Якщо ми отримали ключ, показуємо лише його (екран успіху)
  if (apiKeyToShow) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "white", padding: 24, minWidth: 400 }}>
          <h2>Успіх!</h2>
          <p>Збережіть цей API ключ для прошивки пристрою. Ви більше його не побачите.</p>
          <code style={{ display: "block", background: "#f4f4f4", padding: 12, margin: "16px 0", wordBreak: "break-all" }}>
            {apiKeyToShow}
          </code>
          <button onClick={onClose}>Закрити</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", padding: 24, minWidth: 400 }}>
        <h2>{mode === "create" ? "Додати пристрій" : "Редагувати пристрій"}</h2>

        {mode === "create" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label>Модель *</label>
              {modelsLoading ? <span>Завантаження моделей...</span> : (
                <select name="modelId" value={form.modelId} onChange={handleChange} style={{ width: "100%" }}>
                  <option value="" disabled>Оберіть модель</option>
                  {modelsData?.data.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Серійний номер *</label>
              <input name="serialNumber" value={form.serialNumber} onChange={handleChange} maxLength={100} style={{ width: "100%" }} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <label>Користувацька назва</label>
          <input name="customName" value={form.customName} onChange={handleChange} maxLength={100} style={{ width: "100%" }} />
        </div>

        {mode === "edit" && (
          <div style={{ marginBottom: 12 }}>
            <label>Статус</label>
            <select name="status" value={form.status} onChange={handleChange} style={{ width: "100%" }}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}

        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px", marginTop: 16 }}>
          <button onClick={onClose} disabled={isPending}>Скасувати</button>
          <button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Збереження..." : "Зберегти"}
          </button>

          {mode === "edit" && (
            <button onClick={() => rotateKeyMutation.mutate()} disabled={isPending} style={{ background: "orange" }}>
              Перегенерувати ключ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}