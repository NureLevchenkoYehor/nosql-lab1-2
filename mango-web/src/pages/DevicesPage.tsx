import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import {
  Box, Button, TextField, Typography, Paper, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Stack, Chip
} from "@mui/material"
import {
  getDevices, deleteDevice,
  type DeviceResponseDto, type GetDevicesQuery, type DeviceStatus
} from "../api/devices"
import { getDeviceModels } from "../api/deviceModels"
import { DeviceModal } from "../components/DeviceModal"

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit", device: DeviceResponseDto }

const STATUS_LABELS: Record<DeviceStatus, string> = {
  in_stock: "На складі",
  deployed: "Розгорнуто",
  fixing: "В ремонті",
  decommissioned: "Списано"
}

export function DevicesPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch] = useDebounce(searchInput, 300)
  const [modal, setModal] = useState<ModalState>({ mode: "closed" })

  const [query, setQuery] = useState<GetDevicesQuery>({
    take: 10, skip: 0, sortBy: "serialNumber", sortOrder: "asc",
    modelId: undefined, status: undefined, active: undefined,
  })

  const { data: modelsData } = useQuery({
    queryKey: ["deviceModels", { take: 100 }],
    queryFn: () => getDeviceModels({ take: 100 }),
  })

  const modelsMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (modelsData?.data) {
      modelsData.data.forEach(model => { map[model.id] = model.name })
    }
    return map
  }, [modelsData])

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["devices", { ...query, search: debouncedSearch }],
    queryFn: () => getDevices({
      ...query, serial: debouncedSearch || undefined, name: debouncedSearch || undefined
    }),
    placeholderData: prev => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  })

  function updateFilter(updates: Partial<GetDevicesQuery>) {
    setQuery(prev => ({ ...prev, ...updates, skip: 0 }))
  }

  function handleSort(field: GetDevicesQuery["sortBy"]) {
    setQuery(prev => ({
      ...prev, sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
      skip: 0,
    }))
  }

  function handleNextPage() {
    setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) + (prev.take ?? 10) }))
  }

  function handlePrevPage() {
    setQuery(prev => ({ ...prev, skip: Math.max(0, (prev.skip ?? 0) - (prev.take ?? 10)) }))
  }

  const totalPages = Math.ceil((data?.total ?? 0) / (query.take ?? 10)) || 1
  const currentPage = Math.floor((query.skip ?? 0) / (query.take ?? 10)) + 1

  if (isLoading) return <Box sx={{ p: 4 }}><CircularProgress /></Box>
  if (isError) return <Box sx={{ p: 4, color: 'error.main' }}>Не вдалось завантажити пристрої</Box>

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Пристрої</Typography>

      {/* Панель фільтрації */}
      <Box sx={{ p: 2, mb: 3, bgcolor: "grey.50", borderRadius: 1, border: "1px solid #e0e0e0" }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ alignItems: "center" }}>
          <TextField
            size="small" label="Пошук за серійником або назвою..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setQuery(prev => ({ ...prev, skip: 0 })) }}
            sx={{ minWidth: 250, flexGrow: 1 }}
          />

          <TextField
            select size="small" label="Модель"
            value={query.modelId ?? ""}
            onChange={e => updateFilter({ modelId: e.target.value || undefined })}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Всі моделі</MenuItem>
            {modelsData?.data.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>

          <TextField
            select size="small" label="Статус"
            value={query.status ?? ""}
            onChange={e => updateFilter({ status: (e.target.value as DeviceStatus) || undefined })}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Всі статуси</MenuItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <MenuItem key={val} value={val}>{label}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" label="Активність"
            value={query.active ?? ""}
            onChange={e => updateFilter({ active: (e.target.value as "true" | "false") || undefined })}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">Всі</MenuItem>
            <MenuItem value="true">Онлайн</MenuItem>
            <MenuItem value="false">Офлайн</MenuItem>
          </TextField>

          <Button variant="contained" onClick={() => setModal({ mode: "create" })} sx={{ ml: "auto" }}>
            + Додати
          </Button>
        </Stack>
        {isFetching && <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>Оновлення даних...</Typography>}
      </Box>

      {/* Таблиця */}
      {data?.data.length === 0 ? (
        <Typography>Пристроїв не знайдено</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell onClick={() => handleSort("modelId")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Модель {query.sortBy === "modelId" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => handleSort("serialNumber")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Серійник {query.sortBy === "serialNumber" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell onClick={() => handleSort("customName")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Назва {query.sortBy === "customName" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Статус</TableCell>
                <TableCell onClick={() => handleSort("batteryLevel")} sx={{ cursor: "pointer", fontWeight: "bold" }}>
                  Батарея {query.sortBy === "batteryLevel" && (query.sortOrder === "asc" ? "↑" : "↓")}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Активність</TableCell>
                <TableCell sx={{ fontWeight: "bold", width: 160 }}>Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data.map(device => (
                <TableRow key={device.id} hover>
                  <TableCell>{modelsMap[device.modelId] || "—"}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{device.serialNumber}</TableCell>
                  <TableCell>{device.customName ?? "—"}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[device.status]} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ color: device.batteryLevel !== null && device.batteryLevel < 20 ? "error.main" : "inherit" }}>
                    {device.batteryLevel !== null ? `${device.batteryLevel}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={device.isActive ? "Онлайн" : "Офлайн"}
                      color={device.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => setModal({ mode: "edit", device })}>Ред.</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => {
                        if (confirm("Архівувати пристрій?")) deleteMutation.mutate(device.id)
                      }}>Вид.</Button>
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
            Сторінка {currentPage} з {totalPages} (Всього: {data?.total})
          </Typography>
          <Button variant="text" onClick={handleNextPage} disabled={currentPage >= totalPages}>Вперед →</Button>
        </Stack>
      )}

      {/* Модальне вікно */}
      {modal.mode !== "closed" && (
        <DeviceModal
          mode={modal.mode}
          device={modal.mode === "edit" ? modal.device : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </Box>
  )
}