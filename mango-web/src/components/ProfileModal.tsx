import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Stack
} from "@mui/material"
import {
  createProfile,
  updateProfile,
  type Profile,
  type CreateProfileBody,
  type UpdateProfileBody
} from "../api/profiles"

type Props = {
  mode: "create" | "edit"
  profile?: Profile
  onClose: () => void
}

export function ProfileModal({ mode, profile, onClose }: Props) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    login: profile?.login ?? "",
    password: "",
    name: profile?.name ?? "",
    surname: profile?.surname ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  })

  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (body: CreateProfileBody) => createProfile(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] })
      onClose()
    },
    onError: () => setError("Не вдалось створити профіль"),
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(profile!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] })
      onClose()
    },
    onError: () => setError("Не вдалось оновити профіль"),
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit() {
    setError(null)

    if (mode === "create") {
      if (!form.login || !form.password) {
        setError("Логін та пароль обов'язкові")
        return
      }
      createMutation.mutate({
        login: form.login,
        password: form.password,
        name: form.name || undefined,
        surname: form.surname || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      })
    } else {
      updateMutation.mutate({
        name: form.name || undefined,
        surname: form.surname || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "create" ? "Створити профіль" : "Редагувати профіль"}</DialogTitle>

      <DialogContent>
        {/* Stack автоматично розставить вертикальні відступи між елементами */}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {mode === "create" && (
            <>
              <TextField label="Логін *" name="login" value={form.login} onChange={handleChange} fullWidth />
              <TextField label="Пароль *" name="password" type="password" value={form.password} onChange={handleChange} fullWidth />
            </>
          )}
          <TextField label="Ім'я" name="name" value={form.name} onChange={handleChange} fullWidth />
          <TextField label="Прізвище" name="surname" value={form.surname} onChange={handleChange} fullWidth />
          <TextField label="Пошта" name="email" value={form.email} onChange={handleChange} fullWidth />
          <TextField label="Телефон" name="phone" value={form.phone} onChange={handleChange} fullWidth />

          {error && <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>{error}</Box>}
        </Stack>
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