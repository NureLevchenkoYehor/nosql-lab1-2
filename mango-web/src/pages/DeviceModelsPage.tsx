import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import {
  Box, Button, TextField, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Stack
} from "@mui/material"
import {
  getDeviceModels, deleteDeviceModel,
  type DeviceModel, type GetDeviceModelsQuery
} from "../api/deviceModels"
import { DeviceModelModal } from "../components/DeviceModelModal"

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit", model: DeviceModel }

export function DeviceModelsPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch] = useDebounce(searchInput, 300)
  const [modal, setModal] = useState<ModalState>({ mode: "closed" })

  const [query, setQuery] = useState<GetDeviceModelsQuery>({
    take: 10, skip: 0, sortBy: "name", sortOrder: "asc",
  })

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["deviceModels", { ...query, search: debouncedSearch }],
    queryFn: () => getDeviceModels({ ...query, search: debouncedSearch }),
    placeholderData: prev => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeviceModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deviceModels"] }),
  })

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value)
    setQuery(prev => ({ ...prev, skip: 0 }))
  }

  function handleSort() {
    setQuery(prev => ({
      ...prev,
      sortBy: "name",
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
      skip: 0,
    }))
  }

  function handleNextPage() { setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) + (prev.take ?? 10) })) }
  function handlePrevPage() { setQuery(prev => ({ ...prev, skip: Math.max(0, (prev.skip ?? 0) - (prev.take ?? 10)) })) }

  function handleDelete(model: DeviceModel) {
    const count = model.devicesCount ?? 0
    const message = count > 0
      ? `У моделі є ${count} пристроїв. Вони будуть видалені разом з моделлю. Продовжити?`
      : "Видалити (або архівувати) цю модель?"

    if (confirm(message)) {
      deleteMutation.mutate(model.id)
    }
  }

  const currentPage = Math.floor((query.skip ?? 0) / (query.take ?? 10)) + 1
  const totalPages = Math.ceil((data?.total ?? 0) / (query.take ?? 10)) || 1

  if (isLoading) return <Box sx={{ p: 4 }}><CircularProgress /></Box>
  if (isError) return <Box sx={{ p: 4, color: 'error.main' }}>Не вдалось завантажити моделі пристроїв</Box>

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Моделі пристроїв</Typography>

      {/* Панель інструментів */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
        <TextField
          size="small"
          variant="outlined"
          value={searchInput}
          placeholder="Пошук за назвою..."
          onChange={handleSearch}
          sx={{ width: 300 }}
        />
        <Button variant="contained" onClick={() => setModal({ mode: "create" })}>
          Додати модель
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
                <TableCell
                  onClick={handleSort}
                  sx={{ cursor: "pointer", fontWeight: "bold" }}
                >
                  Назва моделі {query.sortOrder === "asc" ? "↑" : "↓"}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 200 }}>Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map(model => (
                <TableRow key={model.id} hover>
                  <TableCell>{model.name}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => setModal({ mode: "edit", model })}>
                        Ред.
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(model)}>
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

      {/* Пагінація */}
      {(data?.total ?? 0) > 0 && (
        <Stack direction="row" spacing={2} sx={{ mt: 3, alignItems: "center" }}>
          <Button variant="text" onClick={handlePrevPage} disabled={currentPage === 1}>← Назад</Button>
          <Typography variant="body2">
            Всього: {data?.total} — сторінка {currentPage} з {totalPages}
          </Typography>
          <Button variant="text" onClick={handleNextPage} disabled={currentPage >= totalPages}>Вперед →</Button>
        </Stack>
      )}

      {/* Модальне вікно */}
      {modal.mode !== "closed" && (
        <DeviceModelModal
          mode={modal.mode}
          deviceModel={modal.mode === "edit" ? modal.model : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </Box>
  )
}