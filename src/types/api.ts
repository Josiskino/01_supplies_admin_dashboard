// Types pour les réponses de l'API
export interface User {
  id: number
  fullName: string
  company: string
  role: string
  country: string
  contact: string
  email: string
  currentPlan: string
  status: string
  avatar: string
  billing: string
}

export interface UsersResponse {
  users: User[]
  totalUsers: number
}

export interface CreateUserDto {
  fullName: string
  username: string
  email: string
  company: string
  country: string
  contact: string
  role: string
  plan: string
  status: string
}

