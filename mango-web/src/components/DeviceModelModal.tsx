import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createDeviceModel,
  updateDeviceModel,
  type DeviceModel,
  type CreateDeviceModelBody,
  type UpdateDeviceModelBody
} from "../api/deviceModels"

type Props = {
  mode: "create" | "edit"
  deviceModel?: DeviceModel
  onClose: () => void
}

export function DeviceModelModal({ mode, deviceModel, onClose }: Props) {
  const queryClient = useQueryClient()

  const [name, setName] = useState(deviceModel?.name ?? "")
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (body: CreateDeviceModelBody) => createDeviceModel(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceModels"] })
      onClose()
    },
    onError: () => setError("Не вдалось створити модель. Можливо, така назва вже існує."),
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdateDeviceModelBody) => updateDeviceModel(deviceModel!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceModels"] })
      onClose()
    },
    onError: () => setError("Не вдалось оновити модель."),
  })

  function handleSubmit() {
    setError(null)
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError("Назва є обов'язковою")
      return
    }
    if (trimmedName.length > 100) {
      setError("Назва не може перевищувати 100 символів")
      return
    }

    if (mode === "create") {
      createMutation.mutate({ name: trimmedName })
    } else {
      updateMutation.mutate({ name: trimmedName })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "white", padding: 24, minWidth: 400 }}>
        <h2>{mode === "create" ? "Додати модель" : "Редагувати модель"}</h2>

        <div>
          <label>Назва моделі *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Введіть назву..."
            maxLength={100}
          />
          <small style={{ display: "block", color: "gray" }}>
            {name.length}/100
          </small>
        </div>

        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}

        <div style={{ marginTop: 16 }}>
          <button onClick={onClose} disabled={isPending}>Скасувати</button>
          <button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Збереження..." : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  )
}