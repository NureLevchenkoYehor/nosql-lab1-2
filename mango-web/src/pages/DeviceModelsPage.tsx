import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
import {
  getDeviceModels,
  deleteDeviceModel,
  type DeviceModel,
  type GetDeviceModelsQuery
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
    take: 10,
    skip: 0,
    sortBy: "name",
    sortOrder: "asc",
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

  function handleNextPage() {
    setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) + (prev.take ?? 10) }))
  }

  function handlePrevPage() {
    setQuery(prev => ({ ...prev, skip: Math.max(0, (prev.skip ?? 0) - (prev.take ?? 10)) }))
  }

  function handleDelete(id: string) {
    if (confirm("Видалити (або архівувати) цю модель?")) {
      deleteMutation.mutate(id)
    }
  }

  const currentPage = Math.floor((query.skip ?? 0) / (query.take ?? 10)) + 1
  const totalPages = Math.ceil((data?.total ?? 0) / (query.take ?? 10)) || 1

  if (isLoading) return <div>Завантаження...</div>
  if (isError) return <div>Не вдалось завантажити моделі пристроїв</div>

  return (
    <div>
      <h1>Моделі пристроїв</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchInput}
          placeholder="Пошук за назвою..."
          onChange={handleSearch}
        />
        <button onClick={() => setModal({ mode: "create" })}>
          Додати модель
        </button>
      </div>

      {isFetching && <span>Оновлення...</span>}

      {data?.data.length === 0
        ? <div>Нічого не знайдено</div>
        : (
          <table style={{ width: "100%", textAlign: "left", marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={handleSort}>
                  Назва моделі {query.sortOrder === "asc" ? "↑" : "↓"}
                </th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map(model => (
                <tr key={model.id}>
                  <td>{model.name}</td>
                  <td>
                    <button onClick={() => setModal({ mode: "edit", model })}>
                      Редагувати
                    </button>
                    <button onClick={() => handleDelete(model.id)}>
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }

      {(data?.total ?? 0) > 0 && (
        <div style={{ marginTop: 16 }}>
          <span>Всього: {data?.total} — сторінка {currentPage} з {totalPages}</span>
          <button onClick={handlePrevPage} disabled={currentPage === 1}>← Назад</button>
          <button onClick={handleNextPage} disabled={currentPage >= totalPages}>Вперед →</button>
        </div>
      )}

      {modal.mode !== "closed" && (
        <DeviceModelModal
          mode={modal.mode}
          deviceModel={modal.mode === "edit" ? modal.model : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </div>
  )
}