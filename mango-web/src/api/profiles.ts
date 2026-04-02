import { api } from "./client"

// Типи — відображають що повертає бекенд
export type Profile = {
  id: string
  login: string
  name?: string
  surname?: string
  phone?: string
  email?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
}

export type GetProfilesQuery = {
  search?: string
  login?: string
  sortBy?: "name" | "surname" | "login" | "phone" | "email"
  sortOrder?: "asc" | "desc"
  take?: number
  skip?: number
}

export type CreateProfileBody = {
  login: string
  password: string
  name?: string
  surname?: string
  phone?: string
  email?: string
}

export type UpdateProfileBody = {
  name?: string
  surname?: string
  phone?: string
  email?: string
}

// API функції
export function getProfiles(query: GetProfilesQuery = {}): Promise<PaginatedResponse<Profile>> {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.login) params.set("login", query.login)
  if (query.sortBy) params.set("sortBy", query.sortBy)
  if (query.sortOrder) params.set("sortOrder", query.sortOrder)
  if (query.take) params.set("take", String(query.take))
  if (query.skip) params.set("skip", String(query.skip))

  const qs = params.toString()
  return api.get(`/profiles${qs ? `?${qs}` : ""}`)
}

export function createProfile(body: CreateProfileBody): Promise<Profile> {
  return api.post("/profiles", body)
}

export function updateProfile(id: string, body: UpdateProfileBody): Promise<void> {
  return api.patch(`/profiles/${id}`, body)
}

export function deleteProfile(id: string): Promise<void> {
  return api.delete(`/profiles/${id}`)
}