import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebounce } from "use-debounce"
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

  function handleNextPage() {
    setQuery(prev => ({ ...prev, skip: (prev.skip ?? 0) + (prev.take ?? 10) }))
  }

  function handlePrevPage() {
    setQuery(prev => ({ ...prev, skip: Math.max(0, (prev.skip ?? 0) - (prev.take ?? 10)) }))
  }

  function handleDelete(id: string) {
    if (confirm("Архівувати профіль?")) {
      deleteMutation.mutate(id)
    }
  }

  const currentPage = Math.floor((query.skip ?? 0) / (query.take ?? 10)) + 1
  const totalPages = Math.ceil((data?.total ?? 0) / (query.take ?? 10))

  if (isLoading) return <div>Завантаження...</div>
  if (isError) return <div>Не вдалось завантажити профілі</div>

  return (
    <div>
      <h1>Профілі</h1>

      <div>
        <input
          type="text"
          value={searchInput}
          placeholder="Пошук за ім'ям або логіном..."
          onChange={handleSearch}
        />
        <button onClick={() => setModal({ mode: "create" })}>
          Створити профіль
        </button>
      </div>

      {isFetching && <span>Оновлення...</span>}

      {data?.data.length === 0
        ? <div>Нічого не знайдено</div>
        : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("login")}>Логін</th>
                <th onClick={() => handleSort("name")}>Ім'я</th>
                <th onClick={() => handleSort("surname")}>Прізвище</th>
                <th onClick={() => handleSort("email")}>Пошта</th>
                <th onClick={() => handleSort("phone")}>Телефон</th>
                <th>Дії</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map(profile => (
                <tr key={profile.id}>
                  <td>{profile.login}</td>
                  <td>{profile.name ?? "—"}</td>
                  <td>{profile.surname ?? "—"}</td>
                  <td>{profile.email ?? "—"}</td>
                  <td>{profile.phone ?? "—"}</td>
                  <td>
                    <button onClick={() => setModal({ mode: "edit", profile })}>
                      Редагувати
                    </button>
                    <button onClick={() => handleDelete(profile.id)}>
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
        <div>
          <span>{data?.total} профілів — сторінка {currentPage} з {totalPages}</span>
          <button onClick={handlePrevPage} disabled={currentPage === 1}>← Назад</button>
          <button onClick={handleNextPage} disabled={currentPage >= totalPages}>Вперед →</button>
        </div>
      )}

      {modal.mode !== "closed" && (
        <ProfileModal
          mode={modal.mode}
          profile={modal.mode === "edit" ? modal.profile : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </div>
  )
}