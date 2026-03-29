import { ObjectId } from "mongodb"
import { z } from "zod"

export type Profile = {
  _id: ObjectId
  login: string
  passwordHash: string
  name?: string
  surname?: string
  phone?: string
  email?: string
  archivedAt: Date | null
}

// Вхідні схеми
export const CreateProfileSchema = z.object({
  login: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(50).regex(/^[a-zA-Z0-9!?._ -]+$/),
  name: z.string().max(100).optional(),
  surname: z.string().max(100).optional(),
  phone: z.string().max(100).optional(),
  email: z.string().max(100).optional(),
})

export const UpdateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  surname: z.string().max(100).optional(),
  phone: z.string().max(100).optional(),
  email: z.string().max(100).optional(),
})

// Input DTO
export type CreateProfileDto = z.infer<typeof CreateProfileSchema>
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>

// Response DTO
export type ProfileResponseDto = {
  id: string
  login: string
  name?: string
  surname?: string
  phone?: string
  email?: string
}

// Маппінг
export function toProfileResponse(doc: Profile): ProfileResponseDto {
  return {
    id: doc._id.toString(),
    login: doc.login,
    name: doc.name,
    surname: doc.surname,
    phone: doc.phone,
    email: doc.email,
  }
}