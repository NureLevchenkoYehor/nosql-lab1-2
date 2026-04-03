import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import {
  Box, Button, TextField, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Stack
} from "@mui/material"
import {
  getProfiles,
  deleteProfile,
  type Profile,
  type GetProfilesQuery
} from "../api/profiles"
import { ProfileModal } from "../components/ProfileModal"

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit", profile: Profile }

export function ProfilesPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch] = useDebounce(searchInput, 300)
  const [modal, setModal] = useState<ModalState>({ mode: "closed" })

  const [query, setQuery] = useState<GetProfilesQuery>({
    take: 10,
    skip: 0,
    sortBy: "login",
    sortOrder: "asc",
  })

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["profiles", { ...query, search: debouncedSearch }],
    queryFn: () => getProfiles({ ...query, search: debouncedSearch }),
    placeholderData: prev => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  })

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value)
    setQuery(prev => ({ ...prev, skip: 0 }))
  }

  function handleSort(field: GetProfilesQuery["sortBy"]) {
    setQuery(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
      skip: 0,
    }))
  }

  function handleNextPage() { setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) + (prev.take ?? 10) })) }
  function handlePrevPage() { setQuery(prev => ({ ...prev, skip: Math.max(0, (prev.skip ?? 0) - (prev.take ?? 10)) })) }

  function handleDelete(id: string) {
    if (confirm("Архівувати профіль?")) {
      deleteMutation.mutate(id)
    }
  }

  const currentPage = Math.floor((query.skip ?? 0) / (query.take ?? 10)) + 1
  const totalPages = Math.ceil((data?.total ?? 0) / (query.take ?? 10)) || 1

  if (isLoading) return <Box sx={{ p: 4 }}><CircularProgress /></Box>
  if (isError) return <Box sx={{ p: 4, color: 'error.main' }}>Не вдалось завантажити профілі</Box>

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Профілі</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
        <TextField
          size="small"
          variant="outlined"
          value={searchInput}
          placeholder="Пошук за ім'ям або логіном..."
          onChange={handleSearch}
          sx={{ width: 300 }}
        />
        <Button variant="contained" onClick={() => setModal({ mode: "create" })}>
          Створити профіль
        </Button>
        {isFetching && <CircularProgress size={24} />}
      </Stack>

      {data?.data.length === 0 ? (
        <Typography>Нічого не знайдено</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell onClick={() => handleSort("login")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Логін {query.sortBy === "login" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => handleSort("name")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Ім'я {query.sortBy === "name" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => handleSort("surname")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Прізвище {query.sortBy === "surname" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => handleSort("email")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Пошта {query.sortBy === "email" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => handleSort("phone")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Телефон {query.sortBy === "phone" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 200 }}>Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map(profile => (
                <TableRow key={profile.id} hover>
                  <TableCell>{profile.login}</TableCell>
                  <TableCell>{profile.name ?? "—"}</TableCell>
                  <TableCell>{profile.surname ?? "—"}</TableCell>
                  <TableCell>{profile.email ?? "—"}</TableCell>
                  <TableCell>{profile.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => setModal({ mode: "edit", profile })}>
                        Ред.
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(profile.id)}>
                        Вид.
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {(data?.total ?? 0) > 0 && (
        <Stack direction="row" spacing={2} sx={{ mt: 3, alignItems: "center" }}>
          <Button variant="text" onClick={handlePrevPage} disabled={currentPage === 1}>← Назад</Button>
          <Typography variant="body2">
            Всього: {data?.total} — сторінка {currentPage} з {totalPages}
          </Typography>
          <Button variant="text" onClick={handleNextPage} disabled={currentPage >= totalPages}>Вперед →</Button>
        </Stack>
      )}

      {modal.mode !== "closed" && (
        <ProfileModal
          mode={modal.mode}
          profile={modal.mode === "edit" ? modal.profile : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </Box>
  )
}