import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "white", padding: 24, minWidth: 400 }}>
        <h2>{mode === "create" ? "Створити профіль" : "Редагувати профіль"}</h2>

        {mode === "create" && (
          <>
            <div>
              <label>Логін *</label>
              <input name="login" value={form.login} onChange={handleChange} />
            </div>
            <div>
              <label>Пароль *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} />
            </div>
          </>
        )}

        <div>
          <label>Ім'я</label>
          <input name="name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label>Прізвище</label>
          <input name="surname" value={form.surname} onChange={handleChange} />
        </div>
        <div>
          <label>Пошта</label>
          <input name="email" value={form.email} onChange={handleChange} />
        </div>
        <div>
          <label>Телефон</label>
          <input name="phone" value={form.phone} onChange={handleChange} />
        </div>

        {error && <div>{error}</div>}

        <div>
          <button onClick={onClose} disabled={isPending}>Скасувати</button>
          <button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Збереження..." : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  )
}