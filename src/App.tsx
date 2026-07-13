import { useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  Bike,
  Building2,
  Download,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Filter,
  Footprints,
  FileSpreadsheet,
  Globe2,
  LogOut,
  LockKeyhole,
  Menu,
  Search,
  Shuffle,
  Trophy,
  Upload,
  Waves,
  X,
} from 'lucide-react'
import { PUBLIC_COMPANY_ID, activityCatalog, activityLabels, emptyDraft, initialCompanies } from './data'
import { createChallenge, createCompany as createCompanyApi, exportAnalyticsCsv, exportInviteCodesCsv, isEveryApiConfigured, uploadFile } from './lib/everyApi'
import type {
  ActivityKey,
  ChallengeFormState,
  ChallengeListItem,
  ChallengeRecord,
  ChallengeStatus,
  CompanyRecord,
  CreateChallengePayload,
  Page,
  TeamRecord,
} from './types'

const activityIcons: Record<ActivityKey, typeof Footprints> = {
  steps: Footprints,
  run: ActivityIcon,
  bike: Bike,
  swim: Waves,
  moves: Dumbbell,
}

const statusLabels: Record<ChallengeStatus, string> = {
  active: 'Активный',
  draft: 'Черновик',
  completed: 'Завершён',
}

const scoringLabels = {
  sum: 'Лидерборд по сумме',
  average: 'Лидерборд по среднему значению',
} as const

const STORAGE_KEY = 'everyfit.challenge.configuration.state'

type DraftSaveContext = {
  coverFile: File | null
  teams: { name: string; code: string }[]
}

export function App() {
  const [page, setPage] = useState<Page>('challenges')
  const [mobileNav, setMobileNav] = useState(false)
  const [companies, setCompanies] = useState<CompanyRecord[]>(() => loadCompaniesState())
  const [draft, setDraft] = useState<ChallengeFormState>(emptyDraft)
  const [editingContext, setEditingContext] = useState<{ challengeId: string; companyId: string } | null>(null)
  const [notice, setNotice] = useState('')

  const listItems = useMemo(() => flattenChallenges(companies), [companies])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
  }, [companies])

  function navigate(next: Page) {
    setPage(next)
    setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCreate() {
    setEditingContext(null)
    setDraft(emptyDraft)
    setNotice('')
    navigate('create')
  }

  function openEdit(item: ChallengeListItem) {
    if (item.status === 'completed') {
      setNotice('Завершённый челлендж нельзя редактировать')
      return
    }

    const sourceCompany = companies.find((company) => company._id === item.company_id)
    const challenge = sourceCompany?.challenges.find((entry) => entry.id === item.id)
    if (!sourceCompany || !challenge) return

    setEditingContext({ challengeId: challenge.id, companyId: sourceCompany._id })
    setDraft({
      title: challenge.title,
      description: challenge.description,
      start_date: challenge.start_date.slice(0, 10),
      end_date: challenge.end_date.slice(0, 10),
      challenge_type: challenge.challenge_type,
      level: challenge.level,
      scoring_method: challenge.scoring_method,
      activity_type: challenge.activity_type,
      metric: challenge.metric,
      target_value: challenge.target_value,
      visibility: sourceCompany._id === PUBLIC_COMPANY_ID ? 'public' : 'private',
      company_ids: sourceCompany._id === PUBLIC_COMPANY_ID ? [] : [sourceCompany._id],
      ui_team_creation_mode: challenge.ui_team_creation_mode,
    })
    setNotice('')
    navigate('create')
  }

  async function saveChallenge(publish: boolean, context: DraftSaveContext) {
    if (!draft.title.trim()) {
      setNotice('Добавьте название челленджа')
      return
    }
    if (draft.visibility === 'private' && draft.company_ids.length === 0) {
      setNotice('Выберите компанию для приватного челленджа')
      return
    }
    if (publish && draft.visibility === 'public' && !editingContext) {
      setNotice('По текущим ручкам API можно создать только приватный челлендж внутри компании')
      return
    }

    const now = new Date().toISOString()
    const currentChallenge = editingContext
      ? companies
        .find((company) => company._id === editingContext.companyId)
        ?.challenges.find((challenge) => challenge.id === editingContext.challengeId) ?? null
      : null

    const targetCompanyId = draft.visibility === 'private' ? draft.company_ids[0] : PUBLIC_COMPANY_ID

    try {
      if (publish && draft.visibility === 'private' && !editingContext && isEveryApiConfigured()) {
        const photoId = context.coverFile ? (await uploadFile(context.coverFile)).id : undefined
        const teamNames = draft.level === 'team'
          ? context.teams.map((team) => ({ name: team.name }))
          : [{ name: companies.find((company) => company._id === targetCompanyId)?.name || draft.title }]

        const payload: CreateChallengePayload = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          start_date: `${draft.start_date}T00:00:00Z`,
          end_date: `${draft.end_date}T23:59:59Z`,
          challenge_type: draft.challenge_type,
          level: draft.level,
          scoring_method: draft.scoring_method,
          activity_type: draft.activity_type,
          metric: draft.metric,
          teams: teamNames,
          ...(draft.challenge_type === 'goal_based' && draft.target_value ? { target_value: Number(draft.target_value) } : {}),
          ...(photoId ? { photo_id: photoId } : {}),
        }

        const response = await createChallenge(targetCompanyId, payload)
        let inviteCode: string | undefined
        let participantsCount = 0
        try {
          inviteCode = parseInviteCodeCsv(await exportInviteCodesCsv(targetCompanyId, response.id))
        } catch {
          inviteCode = undefined
        }
        try {
          participantsCount = parseParticipantsCountCsv(await exportAnalyticsCsv(targetCompanyId, response.id))
        } catch {
          participantsCount = 0
        }
        const nextChallenge: ChallengeRecord = {
          id: response.id,
          title: response.title,
          description: response.description,
          start_date: response.start_date,
          end_date: response.end_date,
          challenge_type: response.challenge_type,
          level: response.level,
          scoring_method: response.scoring_method,
          activity_type: response.activity_type,
          metric: response.metric,
          target_value: String(response.target_value ?? draft.target_value ?? ''),
          photo_id: response.photo_id,
          teams: context.teams.map((team, index) => ({
            id: `${response.id}-${index + 1}`,
            challenge_id: response.id,
            name: team.name,
            members: [],
            invite_codes: index === 0 && inviteCode ? [{
              code: inviteCode,
              created_at: response.created_at ?? now,
              expires_at: response.end_date,
            }] : [],
          })),
          progress: [],
          created_by: response.created_by ?? 'api-admin',
          created_at: response.created_at ?? now,
          updated_at: response.updated_at ?? now,
          ui_status: 'active',
          ui_participants: participantsCount,
          ui_team_creation_mode: draft.ui_team_creation_mode,
        }

        setCompanies((items) => upsertChallenge(items, targetCompanyId, nextChallenge, editingContext))
        setEditingContext(null)
        setDraft(emptyDraft)
        setNotice('Челлендж создан в EveryFit API')
        navigate('challenges')
        return
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось создать челлендж через API')
      return
    }

    const nextChallenge: ChallengeRecord = {
      id: currentChallenge?.id ?? String(Date.now()),
      title: draft.title,
      description: draft.description,
      start_date: `${draft.start_date}T00:00:00.000+00:00`,
      end_date: `${draft.end_date}T23:59:59.000+00:00`,
      challenge_type: draft.challenge_type,
      level: draft.level,
      scoring_method: draft.scoring_method,
      activity_type: draft.activity_type,
      metric: draft.metric,
      target_value: draft.target_value,
      photo_id: currentChallenge?.photo_id,
      teams: buildTeamsForChallenge(currentChallenge, context.teams, draft.level === 'team'),
      progress: currentChallenge?.progress ?? [],
      created_by: currentChallenge?.created_by ?? 'local-admin',
      created_at: currentChallenge?.created_at ?? now,
      updated_at: now,
      ui_status: publish ? 'active' : 'draft',
      ui_participants: currentChallenge?.ui_participants ?? 0,
      ui_team_creation_mode: draft.ui_team_creation_mode,
    }

    setCompanies((items) => upsertChallenge(items, targetCompanyId, nextChallenge, editingContext))
    setEditingContext(null)
    setDraft(emptyDraft)
    setNotice(currentChallenge
      ? (publish ? 'Челлендж обновлён и опубликован' : 'Изменения сохранены в черновик')
      : (publish ? 'Челлендж опубликован' : 'Черновик сохранён'))
    navigate('challenges')
  }

  async function loadInviteCode(challenge: ChallengeListItem) {
    if (!challenge.company_id || challenge.company_id === PUBLIC_COMPANY_ID) {
      setNotice('Для публичного челленджа инвайт-код недоступен')
      return
    }

    try {
      const inviteCode = parseInviteCodeCsv(await exportInviteCodesCsv(challenge.company_id, challenge.id))
      if (!inviteCode) {
        setNotice('Инвайт-код не найден в export invite codes')
        return
      }

      setCompanies((items) => setInviteCodeForChallenge(items, challenge.company_id!, challenge.id, inviteCode))
      setNotice(`Инвайт-код загружен: ${inviteCode}`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось получить инвайт-код')
    }
  }

  async function exportReport(challenge: ChallengeListItem) {
    if (!challenge.company_id || challenge.company_id === PUBLIC_COMPANY_ID) {
      setNotice('Для публичного челленджа отчет недоступен')
      return
    }

    try {
      const csv = await exportAnalyticsCsv(challenge.company_id, challenge.id)
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Отчет')
      const rows = parseSemicolonCsv(csv)

      rows.forEach((row) => worksheet.addRow(row))
      worksheet.columns = buildWorksheetColumns(rows)

      worksheet.eachRow((row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values : [row.values]
        if (rowNumber === 1 || values.some((value) => value === 'Позиция')) {
          row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF5A1F' } }
        }
        row.alignment = { vertical: 'middle', wrapText: true }
      })

      worksheet.views = [{ state: 'frozen', ySplit: 1 }]
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${challenge.title.replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '-') || 'challenge'}-analytics.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось выгрузить отчет')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} open={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="app-main">
        <MobileTopbar onMenu={() => setMobileNav(true)} />
        {page === 'challenges' && (
          <ChallengeList
            challenges={listItems}
            onCreate={openCreate}
            onEdit={openEdit}
            onLoadInviteCode={loadInviteCode}
            onExportReport={exportReport}
            notice={notice}
          />
        )}
        {page === 'create' && (
          <ChallengeCreate
            draft={draft}
            isEditing={editingContext !== null}
            setDraft={setDraft}
            companies={companies}
            setCompanies={setCompanies}
            onBack={() => navigate('challenges')}
            onSave={saveChallenge}
            notice={notice}
            setNotice={setNotice}
            clearNotice={() => setNotice('')}
          />
        )}
      </div>
    </div>
  )
}

function Sidebar({ page, navigate, open, onClose }: { page: Page; navigate: (page: Page) => void; open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button className="nav-scrim" onClick={onClose} aria-label="Закрыть меню" />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <img className="brand-mark" src="/everyfit-challenge-icon.png" alt="EveryFit" />
          <span>EveryFit <b>Компании</b></span>
          <button className="mobile-close" onClick={onClose}><X size={20} /></button>
        </div>
        <nav className="primary-nav">
          <button className="active" onClick={() => navigate('challenges')}>
            <Trophy size={20} strokeWidth={2} />
            Челленджи
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <div className="profile-avatar">АС</div>
            <div><strong>Анна Смирнова</strong><span>Администратор</span></div>
            <LogOut size={17} />
          </div>
        </div>
      </aside>
    </>
  )
}

function MobileTopbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="mobile-topbar">
      <button className="menu-button" onClick={onMenu}><Menu size={22} /></button>
    </header>
  )
}

function ChallengeList({ challenges, onCreate, onEdit, onLoadInviteCode, onExportReport, notice }: {
  challenges: ChallengeListItem[]
  onCreate: () => void
  onEdit: (challenge: ChallengeListItem) => void
  onLoadInviteCode: (challenge: ChallengeListItem) => Promise<void>
  onExportReport: (challenge: ChallengeListItem) => Promise<void>
  notice: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ChallengeStatus>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loadingInviteId, setLoadingInviteId] = useState<string | null>(null)

  const filtered = useMemo(() => challenges.filter((challenge) => {
    const matchesQuery = challenge.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    return matchesQuery && (status === 'all' || challenge.status === status)
  }), [challenges, query, status])

  return (
    <main className="page-content list-page">
      {notice && <div className="toast">{notice}</div>}
      <div className="page-heading">
        <div><h1>Челленджи</h1></div>
        <button className="button primary" onClick={onCreate}>Создать челлендж</button>
      </div>
      <section className="panel table-panel">
        <div className="table-tools">
          <label className="search-input"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию" /></label>
          <div className="filter-wrap">
            <button className={`button secondary ${status !== 'all' ? 'has-filter' : ''}`} onClick={() => setFiltersOpen((value) => !value)}><Filter size={17} />Фильтры</button>
            {filtersOpen && <div className="filter-popover">
              <span>Статус</span>
              {(['all', 'active', 'draft', 'completed'] as const).map((item) => (
                <button key={item} className={status === item ? 'selected' : ''} onClick={() => { setStatus(item); setFiltersOpen(false) }}>
                  {item === 'all' ? 'Все' : statusLabels[item]}
                </button>
              ))}
            </div>}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Название</th><th>Компания</th><th>Инвайт-код</th><th>Тип</th><th>Активность</th><th>Период</th><th>Статус</th><th>Действие</th></tr></thead>
            <tbody>
              {filtered.map((challenge) => {
                const editingDisabled = challenge.status === 'completed'
                return <tr key={challenge.id}>
                  <td>
                    <div className="challenge-name">
                      {challenge.company_logo_url ? <img className="company-logo challenge-company-logo" src={challenge.company_logo_url} alt={challenge.company_name ?? 'Компания'} /> : <div className="company-logo company-logo-fallback challenge-company-logo">{(challenge.company_name ?? '—').slice(0, 1)}</div>}
                      <strong>{challenge.title}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="company-cell">
                      <span>{challenge.company_name ?? '—'}</span>
                    </div>
                  </td>
                  <td>
                    {challenge.invite_code ? (
                      <code className="invite-code">{challenge.invite_code}</code>
                    ) : challenge.company_id && challenge.company_id !== PUBLIC_COMPANY_ID ? (
                      <button
                        className="row-action"
                        disabled={loadingInviteId === challenge.id}
                        onClick={async () => {
                          setLoadingInviteId(challenge.id)
                          await onLoadInviteCode(challenge)
                          setLoadingInviteId(null)
                        }}
                      >
                        {loadingInviteId === challenge.id ? 'Загрузка...' : 'Получить'}
                      </button>
                    ) : '—'}
                  </td>
                  <td>{challenge.challenge_type === 'goal_based' ? 'Целевой' : 'Соревновательный'}</td>
                  <td>{activityLabels[challenge.activity_key]}</td>
                  <td>{challenge.period}</td>
                  <td><span className={`status-badge ${challenge.status}`}><i />{statusLabels[challenge.status]}</span></td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="row-icon-button muted"
                        onClick={() => onExportReport(challenge)}
                        title="Выгрузить отчет Excel"
                        aria-label="Выгрузить отчет Excel"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        className="row-icon-button"
                        disabled={editingDisabled}
                        onClick={() => onEdit(challenge)}
                        title={editingDisabled ? 'Редактирование недоступно' : 'Редактировать челлендж'}
                        aria-label={editingDisabled ? 'Редактирование недоступно' : 'Редактировать челлендж'}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              })}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state"><Search size={28} /><strong>Ничего не найдено</strong><span>Измените запрос или фильтр.</span></div>}
        </div>
        <div className="pagination"><span>Показано {filtered.length} записей</span><div><button disabled><ChevronLeft size={17} /></button><button className="current">1</button><button disabled><ChevronRight size={17} /></button></div></div>
      </section>
    </main>
  )
}

function ChallengeCreate({ draft, isEditing, setDraft, companies, setCompanies, onBack, onSave, notice, setNotice, clearNotice }: {
  draft: ChallengeFormState
  isEditing: boolean
  setDraft: React.Dispatch<React.SetStateAction<ChallengeFormState>>
  companies: CompanyRecord[]
  setCompanies: React.Dispatch<React.SetStateAction<CompanyRecord[]>>
  onBack: () => void
  onSave: (publish: boolean, context: DraftSaveContext) => Promise<void>
  notice: string
  setNotice: React.Dispatch<React.SetStateAction<string>>
  clearNotice: () => void
}) {
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [teamCountInput, setTeamCountInput] = useState('4')
  const [teamFileName, setTeamFileName] = useState('')
  const [teamsExporting, setTeamsExporting] = useState(false)
  const [teams, setTeams] = useState([
    { name: 'Молния', code: 'A7K2M9' },
    { name: 'Альфа', code: 'B4N8Q2' },
    { name: 'Вектор', code: 'C6P3R7' },
    { name: 'Импульс', code: 'D9T5L1' },
  ])
  const set = <K extends keyof ChallengeFormState>(key: K, value: ChallengeFormState[K]) => {
    clearNotice()
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const privateCompanies = companies.filter((company) => company._id !== PUBLIC_COMPANY_ID)
  const selectedActivity = getActivityKey(draft.activity_type, draft.metric)
  const visibleCompanies = privateCompanies.filter((company) =>
    company.name.toLocaleLowerCase().includes(companyQuery.toLocaleLowerCase()),
  )

  function toggleCompany(companyId: string) {
    set('company_ids', draft.company_ids.includes(companyId)
      ? draft.company_ids.filter((id) => id !== companyId)
      : [...draft.company_ids, companyId])
  }

  function chooseActivity(activityKey: ActivityKey) {
    const config = activityCatalog[activityKey]
    setDraft((current) => ({
      ...current,
      activity_type: config.activity_type,
      metric: config.metric,
    }))
    clearNotice()
  }

  async function createCompany() {
    const name = newCompanyName.trim()
    if (!name) return

    try {
      setCreatingCompany(true)

      if (isEveryApiConfigured()) {
        if (!companyLogoFile) {
          setNotice('Для создания компании в API нужно загрузить логотип')
          return
        }

        const uploadedLogo = await uploadFile(companyLogoFile)
        const created = await createCompanyApi({ name, logo_id: uploadedLogo.id })
        const company: CompanyRecord = {
          _id: created.id,
          name: created.name,
          logo_id: uploadedLogo.id,
          logo_url: created.logo_url,
          members: [],
          challenges: [],
          created_at: created.created_at,
        }
        setCompanies((items) => [...items, company])
        set('company_ids', [...draft.company_ids, company._id])
        setNotice('Компания создана в EveryFit API')
      } else {
        const company: CompanyRecord = { _id: String(Date.now()), name, members: [], challenges: [] }
        setCompanies((items) => [...items, company])
        set('company_ids', [...draft.company_ids, company._id])
      }

      setNewCompanyName('')
      setCompanyLogoFile(null)
      setCompanyQuery('')
      setCompanyDialogOpen(false)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось создать компанию')
    } finally {
      setCreatingCompany(false)
    }
  }

  function generateTeams() {
    const parsed = Number(teamCountInput)
    const count = Number.isFinite(parsed) ? Math.max(2, Math.min(100, parsed)) : 2
    setTeamCountInput(String(count))
    setTeams(new Array(count).fill(null).map((_, index) => ({
      name: buildTeamName(index),
      code: buildTeamCode(index),
    })))
  }

  async function exportTeamsExcel() {
    if (!teams.length || teamsExporting) return
    setTeamsExporting(true)
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Команды')
      worksheet.columns = [
        { header: 'Команда', key: 'name', width: 32 },
        { header: 'Код', key: 'code', width: 18 },
      ]
      worksheet.addRows(teams)
      const header = worksheet.getRow(1)
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF5A1F' } }
      header.alignment = { vertical: 'middle' }
      header.height = 24
      worksheet.views = [{ state: 'frozen', ySplit: 1 }]

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileBase = draft.title.trim().replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '-') || 'челлендж'
      link.href = url
      link.download = `${fileBase}-команды.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setTeamsExporting(false)
    }
  }

  return (
    <main className="create-page">

      <div className="create-heading page-content">
        
        <button className="back-link" onClick={onBack}><ChevronLeft size={19} />К челленджам</button>
        <h1>{isEditing ? 'Редактирование челленджа' : 'Создание челленджа'}</h1>
        <p>{isEditing ? 'Обновите параметры, механику и оформление челленджа.' : 'Заполните основную информацию и настройте механику челленджа'}</p>
        
      </div>

      <div className="builder-layout page-content">
        <div className="form-column">
          {notice && <div className="form-error">{notice}</div>}
          <FormSection 
            title="Основная информация" 
            subtitle="Название и описание для участников"
          >
            <Field label="Название челленджа" hint={`${draft.title.length}/60`}>
              <input maxLength={60} value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Например, 100 000 шагов вместе" />
            </Field>
            <Field label="Описание" hint={`${draft.description.length}/500`}>
              <textarea maxLength={500} rows={4} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Расскажите о цели и правилах челленджа" />
            </Field>
          </FormSection>
          <FormSection title="Даты челленджа" subtitle="Укажите период участия">
            <div className="field-row">
              <Field label="Дата начала"><input type="date" value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} /></Field>
              <Field label="Дата окончания"><input type="date" min={draft.start_date} value={draft.end_date} onChange={(e) => set('end_date', e.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title="Доступ к челленджу" subtitle="Определите, кто сможет принять участие">
            <div className="choice-grid">
              <AccessCard
                icon={Globe2}
                selected={draft.visibility === 'public'}
                title="Публичный"
                text="Челлендж доступен всем пользователям платформы"
                onClick={() => set('visibility', 'public')}
              />
              <AccessCard
                icon={LockKeyhole}
                selected={draft.visibility === 'private'}
                title="Приватный"
                text="Участвовать смогут сотрудники выбранных компаний"
                onClick={() => set('visibility', 'private')}
              />
            </div>
            {draft.visibility === 'public' && isEveryApiConfigured() && (
              <div className="form-error">По текущим ручкам API публикация доступна только для приватного челленджа внутри компании.</div>
            )}
            {draft.visibility === 'private' && <div className="companies-box">
              <div className="companies-heading">
                <div><strong>Компании</strong><span>Связываем челлендж с компанией</span></div>
                <button className="button secondary" onClick={() => setCompanyDialogOpen(true)}>Создать компанию</button>
              </div>
              {!!draft.company_ids.length && <div className="selected-companies">
                {privateCompanies.filter((company) => draft.company_ids.includes(company._id)).map((company) => (
                  <div className="selected-company-chip" key={company._id}>
                    <span className="company-option-icon"><Building2 size={15} /></span>
                    <strong>{company.name}</strong>
                    <button className="company-remove" onClick={() => toggleCompany(company._id)} aria-label={`Убрать ${company.name} из выборки`} title="Убрать из выборки"><X size={15} /></button>
                  </div>
                ))}
              </div>}
              <label className="company-search">
                <Search size={16} />
                <input value={companyQuery} onChange={(event) => setCompanyQuery(event.target.value)} placeholder="Найти компанию" />
              </label>
              <div className="company-results">
                {visibleCompanies.map((company) => {
                  const selected = draft.company_ids.includes(company._id)
                  return <button className={`company-result ${selected ? 'selected' : ''}`} key={company._id} onClick={() => toggleCompany(company._id)}>
                    <span className="company-option-icon"><Building2 size={15} /></span>
                    <strong>{company.name}</strong>
                    <i>{selected ? 'Добавлена' : 'Выбрать'}</i>
                  </button>
                })}
                {!visibleCompanies.length && <div className="company-empty">Компании не найдены</div>}
              </div>
            </div>}
          </FormSection>
          <FormSection title="Выбор активности" subtitle="Фиксируем вид активности">
            <div className="activity-grid">
              {(Object.keys(activityLabels) as ActivityKey[]).map((activityKey) => {
                const Icon = activityIcons[activityKey]
                return <button key={activityKey} className={`select-card ${selectedActivity === activityKey ? 'selected' : ''}`} onClick={() => chooseActivity(activityKey)}>
                  <Icon size={23} /><span>{activityLabels[activityKey]}</span><i />
                </button>
              })}
            </div>
          </FormSection>
          <FormSection title="Тип челленджа" subtitle="Выберите тип челленджа">
            <div className="choice-grid">
              <ChoiceCard selected={draft.challenge_type === 'goal_based'} title="Целевой челлендж" text="Каждый участник стремится выполнить заданную цель" onClick={() => set('challenge_type', 'goal_based')} />
              <ChoiceCard selected={draft.challenge_type === 'competitive'} title="Соревновательный" text="Участники соревнуются за место в рейтинге" onClick={() => set('challenge_type', 'competitive')} />
            </div>
            {draft.challenge_type === 'goal_based' && <Field label={`Цель: ${activityLabels[selectedActivity].toLocaleLowerCase()}`}><input type="number" min="1" value={draft.target_value} onChange={(e) => set('target_value', e.target.value)} /></Field>}
          </FormSection>
          {draft.challenge_type === 'competitive' && <FormSection title="Формат участия" subtitle="Настройка формата участия и подсчёта результатов">
            <div className="choice-grid">
              <ChoiceCard selected={draft.level === 'overall'} title="Без команд" text="Общий рейтинг для всех участников" onClick={() => set('level', 'overall')} />
              <ChoiceCard selected={draft.level === 'team'} title="С командами" text="Участники объединяются и соревнуются командами" onClick={() => set('level', 'team')} />
            </div>
            <div className="choice-grid">
              <ChoiceCard selected={draft.scoring_method === 'sum'} title={scoringLabels.sum} text="Подходит для общего объема результата" onClick={() => set('scoring_method', 'sum')} />
              <ChoiceCard selected={draft.scoring_method === 'average'} title={scoringLabels.average} text="Подходит для сравнения команд по среднему значению." onClick={() => set('scoring_method', 'average')} />
            </div>
            {draft.level === 'team' && <div className="team-formation">
              <h3>Формирование команд</h3>
              <div className="team-mode-list">
                <button className={draft.ui_team_creation_mode === 'random' ? 'selected' : ''} onClick={() => set('ui_team_creation_mode', 'random')}><i /><span>Сгенерировать случайно</span></button>
                <button className={draft.ui_team_creation_mode === 'manual' ? 'selected' : ''} onClick={() => set('ui_team_creation_mode', 'manual')}><i /><span>Загрузить самостоятельно</span></button>
              </div>
              {draft.ui_team_creation_mode === 'random' ? <div className="team-generator">
                <div className="team-count-field"><Field label="Количество команд"><input type="number" min="2" max="100" value={teamCountInput} onChange={(event) => setTeamCountInput(event.target.value)} /></Field></div>
                <button className="generate-teams-button" onClick={generateTeams}><Shuffle size={17} />Сгенерировать</button>
                <TeamTable teams={teams} onExport={exportTeamsExcel} exporting={teamsExporting} />
              </div> : <div className="team-importer">
                <label className={`team-file ${teamFileName ? 'has-file' : ''}`}>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => {
                    const name = event.target.files?.[0]?.name ?? ''
                    setTeamFileName(name)
                    if (name) setTeams([{ name: 'Команда 1', code: 'T1A8K4' }, { name: 'Команда 2', code: 'T2B7M3' }])
                  }} />
                  <span><FileSpreadsheet size={20} /></span>
                  <strong>{teamFileName || 'Загрузить список команд'}</strong>
                  <small>{teamFileName ? 'Файл загружен. Нажмите, чтобы заменить' : 'XLSX или CSV, колонки «Команда» и «Код»'}</small>
                </label>
                {teamFileName && <TeamTable teams={teams} onExport={exportTeamsExcel} exporting={teamsExporting} />}
              </div>}
            </div>}
          </FormSection>}
          <FormSection title="Оформление" subtitle="Добавьте фирменный стиль челленджа">
          
            <div className={`upload-grid ${draft.visibility === 'public' ? 'single' : ''}`}>
              <UploadBox label="Основная обложка" note="PNG или JPG, 1200×640" file={coverFile} onFileChange={setCoverFile} />
            </div>
          </FormSection>
        </div>
      </div>
      <div className="sticky-actions"><button className="button secondary" onClick={onBack} disabled={submitting}>Отмена</button><div><button className="button ghost" disabled={submitting} onClick={async () => { setSubmitting(true); await onSave(false, { coverFile, teams }); setSubmitting(false) }}>{isEditing ? 'Сохранить изменения' : 'Сохранить черновик'}</button><button className="button primary" disabled={submitting} onClick={async () => { setSubmitting(true); await onSave(true, { coverFile, teams }); setSubmitting(false) }}>{submitting ? 'Сохраняем...' : isEditing ? 'Обновить челлендж' : 'Опубликовать'}</button></div></div>
      {companyDialogOpen && <div className="modal-backdrop" onMouseDown={() => setCompanyDialogOpen(false)}>
        <section className="company-dialog" role="dialog" aria-modal="true" aria-labelledby="company-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="dialog-heading">
            <div><h2 id="company-dialog-title">Новая компания</h2><p>Компания появится в списке приватных челленджей.</p></div>
            <button onClick={() => setCompanyDialogOpen(false)} aria-label="Закрыть"><X size={20} /></button>
          </div>
          <div className="dialog-body">
            {notice && <div className="form-error">{notice}</div>}
            <Field label="Название компании"><input autoFocus value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} placeholder="Например, EveryFit" /></Field>
            <UploadBox label="Логотип компании" note="PNG или SVG, до 5 МБ" file={companyLogoFile} onFileChange={setCompanyLogoFile} />
          </div>
          <div className="dialog-actions"><button className="button secondary" disabled={creatingCompany} onClick={() => setCompanyDialogOpen(false)}>Отмена</button><button className="button primary" disabled={!newCompanyName.trim() || creatingCompany} onClick={createCompany}>{creatingCompany ? 'Создаём...' : 'Создать'}</button></div>
        </section>
      </div>}
    </main>
  )
}

function FormSection({title, subtitle, children }: {title: string; subtitle: string; children: React.ReactNode }) 
{
  return <section className="form-section">
  <div className="section-heading">
  <div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="section-body">{children}</div></section>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) 
{
  return <label className="field"><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>
}

function ChoiceCard({ selected, title, text, onClick }: { selected: boolean; title: string; text: string; onClick: () => void }) {
  return <button className={`choice-card ${selected ? 'selected' : ''}`} onClick={onClick}><i /><strong>{title}</strong><span>{text}</span></button>
}

function AccessCard({ icon: Icon, selected, title, text, onClick }: { icon: typeof Globe2; selected: boolean; title: string; text: string; onClick: () => void }) {
  return <button className={`access-card ${selected ? 'selected' : ''}`} onClick={onClick}><span><Icon size={20} /></span><div><strong>{title}</strong><small>{text}</small></div><i /></button>
}

function TeamTable({ teams, onExport, exporting }: { teams: { name: string; code: string }[]; onExport: () => void; exporting: boolean }) {
  return <><div className="teams-table-toolbar"><span>Сформировано команд: {teams.length}</span><button onClick={onExport} disabled={exporting}><Download size={16} />{exporting ? 'Создаём файл…' : 'Выгрузить Excel'}</button></div><div className="teams-table"><div className="teams-table-head"><span>Команда</span><span>Код</span></div>{teams.map((team) => <div className="teams-table-row" key={team.code}><strong>{team.name}</strong><code>{team.code}</code></div>)}</div></>
}

function UploadBox({ label, note, file, onFileChange }: { label: string; note: string; file: File | null; onFileChange: (file: File | null) => void }) {
  return <label className={`upload-box ${file ? 'has-file' : ''}`}><input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} /><div><Upload size={21} /></div><strong>{file?.name || label}</strong><span>{file ? 'Нажмите, чтобы заменить файл' : note}</span></label>
}

function getActivityKey(activityType: ChallengeFormState['activity_type'], metric: ChallengeFormState['metric']): ActivityKey {
  if (activityType === 'walking' && metric === 'steps') return 'steps'
  if (activityType === 'running') return 'run'
  if (activityType === 'cycling') return 'bike'
  if (activityType === 'swimming') return 'swim'
  return 'moves'
}

function loadCompaniesState(): CompanyRecord[] {
  if (typeof window === 'undefined') return initialCompanies

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialCompanies

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return initialCompanies

    const hasPublicCatalog = parsed.some((company) => company?._id === PUBLIC_COMPANY_ID)
    return hasPublicCatalog ? parsed : [...initialCompanies, ...parsed]
  } catch {
    return initialCompanies
  }
}

function parseInviteCodeCsv(csv: string) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines.slice(1)) {
    const match = line.match(/[A-Z0-9]{5,12}/)
    if (match) return match[0]
  }
  return undefined
}

function parseParticipantsCountCsv(csv: string) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim())
  const headerIndex = lines.findIndex((line) => line.startsWith('Позиция;'))
  if (headerIndex === -1) return 0

  return lines
    .slice(headerIndex + 1)
    .filter((line) => /^\d+;/.test(line))
    .length
}

function parseSemicolonCsv(csv: string) {
  return csv
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return ['']

      const cells: string[] = []
      let current = ''
      let inQuotes = false

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        const next = line[index + 1]

        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"'
            index += 1
          } else {
            inQuotes = !inQuotes
          }
          continue
        }

        if (char === ';' && !inQuotes) {
          cells.push(current.trim())
          current = ''
          continue
        }

        current += char
      }

      cells.push(current.trim())
      return cells
    })
}

function buildWorksheetColumns(rows: string[][]) {
  const maxColumns = Math.max(...rows.map((row) => row.length), 1)

  return new Array(maxColumns).fill(null).map((_, columnIndex) => {
    const width = rows.reduce((max, row) => Math.max(max, row[columnIndex]?.length ?? 0), 10)
    return { width: Math.min(Math.max(width + 4, 12), 36) }
  })
}

function buildCompanyLogoUrl(company: CompanyRecord) {
  if (company.logo_url) return company.logo_url
  if (company.logo_id) return `https://api.everyfit.app/v1/images/${company.logo_id}`
  return undefined
}

function flattenChallenges(companies: CompanyRecord[]): ChallengeListItem[] {
  return companies.flatMap((company) => company.challenges.map((challenge) => ({
    id: challenge.id,
    company_id: company._id,
    company_name: company._id === PUBLIC_COMPANY_ID ? undefined : company.name,
    company_logo_url: company._id === PUBLIC_COMPANY_ID ? undefined : buildCompanyLogoUrl(company),
    title: challenge.title,
    challenge_type: challenge.challenge_type,
    activity_key: getActivityKey(challenge.activity_type, challenge.metric),
    participants: challenge.ui_participants,
    period: `${formatShortDate(challenge.start_date)}–${formatShortDate(challenge.end_date)}`,
    status: challenge.ui_status,
    invite_code: challenge.teams.flatMap((team) => team.invite_codes).find((item) => item.code)?.code,
  })))
}

function buildTeamsForChallenge(currentChallenge: ChallengeRecord | null, teams: { name: string; code: string }[], shouldUseTeams: boolean): TeamRecord[] {
  if (!shouldUseTeams) return []
  if (currentChallenge?.teams.length) return currentChallenge.teams
  return teams.map((team, index) => ({
    id: `local-team-${index + 1}`,
    challenge_id: 'local',
    name: team.name,
    members: [],
    invite_codes: [],
  }))
}

function buildTeamName(index: number) {
  const presets = ['Молния', 'Альфа', 'Вектор', 'Импульс', 'Орбита', 'Комета', 'Пульс', 'Форсаж']
  if (index < presets.length) return presets[index]
  return `Команда ${index + 1}`
}

function buildTeamCode(index: number) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const first = letters[index % letters.length]
  const second = letters[Math.floor(index / letters.length) % letters.length]
  const numeric = String(index + 1).padStart(2, '0')
  return `${first}${numeric}${second}${9 - (index % 9)}K`
}

function upsertChallenge(
  companies: CompanyRecord[],
  targetCompanyId: string,
  nextChallenge: ChallengeRecord,
  editingContext: { challengeId: string; companyId: string } | null,
) {
  return companies.map((company) => {
    const withoutCurrent = editingContext
      ? company.challenges.filter((challenge) => challenge.id !== editingContext.challengeId)
      : company.challenges

    if (company._id !== targetCompanyId) {
      return { ...company, challenges: withoutCurrent }
    }

    const existingIndex = withoutCurrent.findIndex((challenge) => challenge.id === nextChallenge.id)
    const challenges = existingIndex >= 0
      ? withoutCurrent.map((challenge) => challenge.id === nextChallenge.id ? nextChallenge : challenge)
      : [nextChallenge, ...withoutCurrent]

    return { ...company, challenges }
  })
}

function setInviteCodeForChallenge(companies: CompanyRecord[], companyId: string, challengeId: string, inviteCode: string) {
  return companies.map((company) => {
    if (company._id !== companyId) return company

    return {
      ...company,
      challenges: company.challenges.map((challenge) => {
        if (challenge.id !== challengeId) return challenge

        const teams = challenge.teams.length
          ? challenge.teams.map((team, index) => index === 0
            ? {
              ...team,
              invite_codes: [{
                code: inviteCode,
                created_at: new Date().toISOString(),
                expires_at: challenge.end_date,
              }],
            }
            : team)
          : [{
            id: `${challengeId}-team-1`,
            challenge_id: challengeId,
            name: company.name,
            members: [],
            invite_codes: [{
              code: inviteCode,
              created_at: new Date().toISOString(),
              expires_at: challenge.end_date,
            }],
          }]

        return { ...challenge, teams }
      }),
    }
  })
}

function formatShortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date)
}
