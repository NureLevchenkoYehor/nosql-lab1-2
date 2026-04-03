import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box
} from "@mui/material"
import {
  createDeviceModel, updateDeviceModel,
  type DeviceModel, type CreateDeviceModelBody, type UpdateDeviceModelBody
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
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "create" ? "Додати модель" : "Редагувати модель"}</DialogTitle>

      <DialogContent>
        {/* Box замінює <div> і дозволяє легко додавати відступи через sx (mt = margin-top) */}
        <Box sx={{ mt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Назва моделі"
            type="text"
            fullWidth
            variant="outlined"
            value={name}
            onChange={e => setName(e.target.value)}
            helperText={`${name.length}/100`}
            error={!!error}
            inputProps={{ maxLength: 100 }}
          />
          {error && <Box sx={{ color: 'error.main', mt: 1, fontSize: '0.875rem' }}>{error}</Box>}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>Скасувати</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          {isPending ? "Збереження..." : "Зберегти"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}