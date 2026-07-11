import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  Bike,
  Building2,
  Download,
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
  Users,
  Waves,
  X,
} from 'lucide-react'
import { PUBLIC_COMPANY_ID, activityCatalog, activityLabels, emptyDraft, initialCompanies } from './data'
import type {
  ActivityKey,
  ChallengeFormState,
  ChallengeListItem,
  ChallengeRecord,
  ChallengeStatus,
  CompanyRecord,
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
  sum: 'Сумма результата',
  average: 'Средний результат',
} as const

export function App() {
  const [page, setPage] = useState<Page>('challenges')
  const [mobileNav, setMobileNav] = useState(false)
  const [companies, setCompanies] = useState<CompanyRecord[]>(initialCompanies)
  const [draft, setDraft] = useState<ChallengeFormState>(emptyDraft)
  const [editingContext, setEditingContext] = useState<{ challengeId: string; companyId: string } | null>(null)
  const [notice, setNotice] = useState('')

  const listItems = useMemo(() => flattenChallenges(companies), [companies])

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

  function saveChallenge(publish: boolean) {
    if (!draft.title.trim()) {
      setNotice('Добавьте название челленджа')
      return
    }
    if (draft.visibility === 'private' && draft.company_ids.length === 0) {
      setNotice('Выберите компанию для приватного челленджа')
      return
    }

    const now = new Date().toISOString()
    const currentChallenge = editingContext
      ? companies
        .find((company) => company._id === editingContext.companyId)
        ?.challenges.find((challenge) => challenge.id === editingContext.challengeId) ?? null
      : null

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
      teams: buildTeamsForChallenge(currentChallenge, draft, draft.level === 'team'),
      progress: currentChallenge?.progress ?? [],
      created_by: currentChallenge?.created_by ?? 'local-admin',
      created_at: currentChallenge?.created_at ?? now,
      updated_at: now,
      ui_status: publish ? 'active' : 'draft',
      ui_participants: currentChallenge?.ui_participants ?? 0,
      ui_team_creation_mode: draft.ui_team_creation_mode,
    }

    const targetCompanyId = draft.visibility === 'private' ? draft.company_ids[0] : PUBLIC_COMPANY_ID
    setCompanies((items) => upsertChallenge(items, targetCompanyId, nextChallenge, editingContext))
    setEditingContext(null)
    setDraft(emptyDraft)
    setNotice(currentChallenge
      ? (publish ? 'Челлендж обновлён и опубликован' : 'Изменения сохранены в черновик')
      : (publish ? 'Челлендж опубликован' : 'Черновик сохранён'))
    navigate('challenges')
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} open={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="app-main">
        <MobileTopbar onMenu={() => setMobileNav(true)} />
        {page === 'challenges' && (
          <ChallengeList challenges={listItems} onCreate={openCreate} onEdit={openEdit} notice={notice} />
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

function ChallengeList({ challenges, onCreate, onEdit, notice }: {
  challenges: ChallengeListItem[]
  onCreate: () => void
  onEdit: (challenge: ChallengeListItem) => void
  notice: string
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ChallengeStatus>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

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
<<<<<<< Updated upstream
            <thead><tr><th>Название</th><th>Тип</th><th>Активность</th><th>Участники</th><th>Период</th><th>Компания</th><th>Статус</th><th /></tr></thead>
=======
            <thead><tr><th>Название</th><th>Компания</th><th>Тип</th><th>Активность</th><th>Участники</th><th>Период</th><th>Статус</th><th>Действие</th></tr></thead>
>>>>>>> Stashed changes
            <tbody>
              {filtered.map((challenge) => {
                const Icon = activityIcons[challenge.activity_key]
                const editingDisabled = challenge.status === 'completed'
                return <tr key={challenge.id}>
                  <td><div className="challenge-name"><div className={`activity-thumb ${challenge.activity_key}`}><Icon size={18} /></div><strong>{challenge.title}</strong></div></td>
                  <td>{challenge.company_name ?? '—'}</td>
                  <td>{challenge.challenge_type === 'target' ? 'Целевой' : 'Соревновательный'}</td>
                  <td>{activityLabels[challenge.activity_key]}</td>
                  <td><span className="participant-cell"><Users size={15} />{challenge.participants}</span></td>
                  <td>{challenge.period}</td>
                  <td>Росагролизинг</td>
                  <td><span className={`status-badge ${challenge.status}`}><i />{statusLabels[challenge.status]}</span></td>
<<<<<<< Updated upstream
=======
                  <td><button className="row-action" disabled={editingDisabled} onClick={() => onEdit(challenge)}>{editingDisabled ? 'Недоступно' : 'Редактировать'}</button></td>
>>>>>>> Stashed changes
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

function ChallengeCreate({ draft, isEditing, setDraft, companies, setCompanies, onBack, onSave, notice, clearNotice }: {
  draft: ChallengeFormState
  isEditing: boolean
  setDraft: React.Dispatch<React.SetStateAction<ChallengeFormState>>
  companies: CompanyRecord[]
  setCompanies: React.Dispatch<React.SetStateAction<CompanyRecord[]>>
  onBack: () => void
  onSave: (publish: boolean) => void
  notice: string
  clearNotice: () => void
}) {
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
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

  function createCompany() {
    const name = newCompanyName.trim()
    if (!name) return
    const company: CompanyRecord = { _id: String(Date.now()), name, members: [], challenges: [] }
    setCompanies((items) => [...items, company])
    set('company_ids', [...draft.company_ids, company._id])
    setNewCompanyName('')
    setCompanyQuery('')
    setCompanyDialogOpen(false)
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
        <span className="eyebrow">{isEditing ? 'Редактирование' : 'Новый челлендж'}</span>
        <h1>{isEditing ? 'Редактирование челленджа' : 'Создание челленджа'}</h1>
        <p>{isEditing ? 'Обновите параметры, механику и оформление челленджа.' : 'Заполните основную информацию и настройте механику челленджа.'}</p>
      </div>
      <div className="builder-layout page-content">
        <div className="form-column">
          {notice && <div className="form-error">{notice}</div>}
          <FormSection number="01" title="Основная информация" subtitle="Название и описание для участников">
            <Field label="Название челленджа" hint={`${draft.title.length}/60`}>
              <input maxLength={60} value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Например, 100 000 шагов вместе" />
            </Field>
            <Field label="Описание" hint={`${draft.description.length}/500`}>
              <textarea maxLength={500} rows={4} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Расскажите о цели и правилах челленджа" />
            </Field>
          </FormSection>
          <FormSection number="02" title="Даты челленджа" subtitle="Укажите период участия">
            <div className="field-row">
              <Field label="Дата начала"><input type="date" value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} /></Field>
              <Field label="Дата окончания"><input type="date" min={draft.start_date} value={draft.end_date} onChange={(e) => set('end_date', e.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection number="03" title="Доступ к челленджу" subtitle="Определите, кто сможет принять участие">
            <div className="choice-grid">
              <AccessCard
                icon={Globe2}
                selected={draft.visibility === 'public'}
                title="Публичный"
                text="Челлендж доступен всем пользователям платформы."
                onClick={() => set('visibility', 'public')}
              />
              <AccessCard
                icon={LockKeyhole}
                selected={draft.visibility === 'private'}
                title="Приватный"
                text="Участвовать смогут сотрудники выбранных компаний."
                onClick={() => set('visibility', 'private')}
              />
            </div>
            {draft.visibility === 'private' && <div className="companies-box">
              <div className="companies-heading">
                <div><strong>Компании</strong><span>Связываем челлендж с отдельной сущностью company</span></div>
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
          <FormSection number="04" title="Выбор активности" subtitle="Фиксируем activity_type и metric отдельно">
            <div className="activity-grid">
              {(Object.keys(activityLabels) as ActivityKey[]).map((activityKey) => {
                const Icon = activityIcons[activityKey]
                return <button key={activityKey} className={`select-card ${selectedActivity === activityKey ? 'selected' : ''}`} onClick={() => chooseActivity(activityKey)}>
                  <Icon size={23} /><span>{activityLabels[activityKey]}</span><i />
                </button>
              })}
            </div>
          </FormSection>
          <FormSection number="05" title="Тип челленджа" subtitle="Выберите challenge_type">
            <div className="choice-grid">
              <ChoiceCard selected={draft.challenge_type === 'target'} title="Целевой челлендж" text="Каждый участник стремится выполнить заданную цель." onClick={() => set('challenge_type', 'target')} />
              <ChoiceCard selected={draft.challenge_type === 'competitive'} title="Соревновательный" text="Участники соревнуются за место в рейтинге." onClick={() => set('challenge_type', 'competitive')} />
            </div>
            {draft.challenge_type === 'target' && <Field label={`Цель: ${activityLabels[selectedActivity].toLocaleLowerCase()}`}><input type="number" min="1" value={draft.target_value} onChange={(e) => set('target_value', e.target.value)} /></Field>}
          </FormSection>
          {draft.challenge_type === 'competitive' && <FormSection number="06" title="Формат участия" subtitle="Настройка level и scoring_method">
            <div className="choice-grid">
              <ChoiceCard selected={draft.level === 'overall'} title="Без команд" text="Общий рейтинг для всех участников." onClick={() => set('level', 'overall')} />
              <ChoiceCard selected={draft.level === 'team'} title="С командами" text="Участники объединяются и соревнуются командами." onClick={() => set('level', 'team')} />
            </div>
            <div className="choice-grid">
              <ChoiceCard selected={draft.scoring_method === 'sum'} title={scoringLabels.sum} text="Подходит для общего объема результата." onClick={() => set('scoring_method', 'sum')} />
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
          <FormSection number={draft.challenge_type === 'competitive' ? '07' : '06'} title="Оформление" subtitle="Добавьте фирменный стиль челленджа">
            <div className={`upload-grid ${draft.visibility === 'public' ? 'single' : ''}`}>
              {draft.visibility === 'private' && <UploadBox label="Логотип челленджа" note="PNG или SVG, до 5 МБ" />}
              <UploadBox label="Основная обложка" note="PNG или JPG, 1200×640" />
            </div>
          </FormSection>
        </div>
      </div>
      <div className="sticky-actions"><button className="button secondary" onClick={onBack}>Отмена</button><div><button className="button ghost" onClick={() => onSave(false)}>{isEditing ? 'Сохранить изменения' : 'Сохранить черновик'}</button><button className="button primary" onClick={() => onSave(true)}>{isEditing ? 'Обновить челлендж' : 'Опубликовать'}</button></div></div>
      {companyDialogOpen && <div className="modal-backdrop" onMouseDown={() => setCompanyDialogOpen(false)}>
        <section className="company-dialog" role="dialog" aria-modal="true" aria-labelledby="company-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="dialog-heading">
            <div><h2 id="company-dialog-title">Новая компания</h2><p>Компания появится в списке приватных челленджей.</p></div>
            <button onClick={() => setCompanyDialogOpen(false)} aria-label="Закрыть"><X size={20} /></button>
          </div>
          <div className="dialog-body">
            <Field label="Название компании"><input autoFocus value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} placeholder="Например, EveryFit" /></Field>
            <UploadBox label="Логотип компании" note="PNG или SVG, до 5 МБ" />
          </div>
          <div className="dialog-actions"><button className="button secondary" onClick={() => setCompanyDialogOpen(false)}>Отмена</button><button className="button primary" disabled={!newCompanyName.trim()} onClick={createCompany}>Создать</button></div>
        </section>
      </div>}
    </main>
  )
}

function FormSection({ number, title, subtitle, children }: { number: string; title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="form-section"><div className="section-heading"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="section-body">{children}</div></section>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

function UploadBox({ label, note }: { label: string; note: string }) {
  const [fileName, setFileName] = useState('')
  return <label className={`upload-box ${fileName ? 'has-file' : ''}`}><input type="file" accept="image/*" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} /><div><Upload size={21} /></div><strong>{fileName || label}</strong><span>{fileName ? 'Нажмите, чтобы заменить файл' : note}</span></label>
}

function getActivityKey(activityType: ChallengeFormState['activity_type'], metric: ChallengeFormState['metric']): ActivityKey {
  if (activityType === 'walking' && metric === 'steps') return 'steps'
  if (activityType === 'running') return 'run'
  if (activityType === 'cycling') return 'bike'
  if (activityType === 'swimming') return 'swim'
  return 'moves'
}

function flattenChallenges(companies: CompanyRecord[]): ChallengeListItem[] {
  return companies.flatMap((company) => company.challenges.map((challenge) => ({
    id: challenge.id,
    company_id: company._id,
    company_name: company._id === PUBLIC_COMPANY_ID ? undefined : company.name,
    title: challenge.title,
    challenge_type: challenge.challenge_type,
    activity_key: getActivityKey(challenge.activity_type, challenge.metric),
    participants: challenge.ui_participants,
    period: `${formatShortDate(challenge.start_date)}–${formatShortDate(challenge.end_date)}`,
    status: challenge.ui_status,
  })))
}

function buildTeamsForChallenge(currentChallenge: ChallengeRecord | null, draft: ChallengeFormState, shouldUseTeams: boolean): TeamRecord[] {
  if (!shouldUseTeams) return []
  return currentChallenge?.teams ?? []
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

function formatShortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date)
}
