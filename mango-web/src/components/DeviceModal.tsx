import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Stack, MenuItem, Typography
} from "@mui/material"
import {
  createDevice, updateDevice, rotateDeviceKey,
  type DeviceResponseDto, type CreateDeviceBody, type UpdateDeviceBody, type DeviceStatus
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

  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["deviceModels", { take: 100 }],
    queryFn: () => getDeviceModels({ take: 100 }),
    enabled: mode === "create",
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateDeviceBody) => createDevice(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
      setApiKeyToShow(data.apiKey)
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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

  return (
    <Dialog open={true} onClose={apiKeyToShow ? undefined : onClose} fullWidth maxWidth="sm">
      {apiKeyToShow ? (
        <>
          <DialogTitle sx={{ color: 'success.main' }}>Успіх!</DialogTitle>
          <DialogContent>
            <Typography>Збережіть цей API ключ для прошивки пристрою. Ви більше його не побачите.</Typography>
            <Box sx={{ 
              bgcolor: 'grey.100', p: 2, mt: 2, borderRadius: 1, 
              fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #ccc' 
            }}>
              {apiKeyToShow}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} variant="contained">Закрити</Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>{mode === "create" ? "Додати пристрій" : "Редагувати пристрій"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {mode === "create" && (
                <>
                  <TextField
                    select
                    label="Модель *"
                    name="modelId"
                    value={form.modelId}
                    onChange={handleChange}
                    fullWidth
                    disabled={modelsLoading}
                  >
                    <MenuItem value="" disabled>Оберіть модель</MenuItem>
                    {modelsData?.data.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                  </TextField>
                  <TextField 
                    label="Серійний номер *" name="serialNumber" value={form.serialNumber} 
                    onChange={handleChange} inputProps={{ maxLength: 100 }} fullWidth 
                  />
                </>
              )}

              <TextField 
                label="Користувацька назва" name="customName" value={form.customName} 
                onChange={handleChange} inputProps={{ maxLength: 100 }} fullWidth 
              />

              {mode === "edit" && (
                <TextField select label="Статус" name="status" value={form.status} onChange={handleChange} fullWidth>
                  {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </TextField>
              )}

              {error && <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>{error}</Box>}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
            <Box>
              {mode === "edit" && (
                <Button onClick={() => rotateKeyMutation.mutate()} disabled={isPending} color="warning">
                  Перегенерувати ключ
                </Button>
              )}
            </Box>
            <Box>
              <Button onClick={onClose} disabled={isPending} sx={{ mr: 1 }}>Скасувати</Button>
              <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
                {isPending ? "Збереження..." : "Зберегти"}
              </Button>
            </Box>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}