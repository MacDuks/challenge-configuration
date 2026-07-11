import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  Bike,
  Building2,
  Download,
  ChevronDown,
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
  MoreHorizontal,
  Search,
  Shuffle,
  Trophy,
  Upload,
  Users,
  Waves,
  X,
} from 'lucide-react'
import { activityLabels, emptyDraft, initialChallenges, initialCompanies } from './data'
import type { Activity, Challenge, ChallengeDraft, ChallengeStatus, Company, Page } from './types'

const activityIcons = {
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

export function App() {
  const [page, setPage] = useState<Page>('challenges')
  const [mobileNav, setMobileNav] = useState(false)
  const [challenges, setChallenges] = useState(initialChallenges)
  const [companies, setCompanies] = useState(initialCompanies)
  const [draft, setDraft] = useState<ChallengeDraft>(emptyDraft)
  const [notice, setNotice] = useState('')

  function navigate(next: Page) {
    setPage(next)
    setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function saveChallenge(publish: boolean) {
    if (!draft.title.trim()) {
      setNotice('Добавьте название челленджа')
      return
    }
    if (draft.visibility === 'private' && draft.companyIds.length === 0) {
      setNotice('Выберите компанию для приватного челленджа')
      return
    }

    const challenge: Challenge = {
      id: Date.now(),
      title: draft.title,
      type: draft.type,
      activity: draft.activity,
      participants: 0,
      period: `${formatShortDate(draft.startDate)}–${formatShortDate(draft.endDate)}`,
      status: publish ? 'active' : 'draft',
    }
    setChallenges((items) => [challenge, ...items])
    setDraft(emptyDraft)
    setNotice(publish ? 'Челлендж опубликован' : 'Черновик сохранён')
    navigate('challenges')
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} open={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="app-main">
        <MobileTopbar onMenu={() => setMobileNav(true)} />
        {page === 'challenges' && (
          <ChallengeList challenges={challenges} onCreate={() => navigate('create')} notice={notice} />
        )}
        {page === 'create' && (
          <ChallengeCreate
            draft={draft}
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

function ChallengeList({ challenges, onCreate, notice }: { challenges: Challenge[]; onCreate: () => void; notice: string }) {
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
            <thead><tr><th>Название</th><th>Тип</th><th>Активность</th><th>Участники</th><th>Период</th><th>Статус</th><th /></tr></thead>
            <tbody>
              {filtered.map((challenge) => {
                const Icon = activityIcons[challenge.activity]
                return <tr key={challenge.id}>
                  <td><div className="challenge-name"><div className={`activity-thumb ${challenge.activity}`}><Icon size={18} /></div><strong>{challenge.title}</strong></div></td>
                  <td>{challenge.type === 'target' ? 'Целевой' : 'Соревновательный'}</td>
                  <td>{activityLabels[challenge.activity]}</td>
                  <td><span className="participant-cell"><Users size={15} />{challenge.participants}</span></td>
                  <td>{challenge.period}</td>
                  <td><span className={`status-badge ${challenge.status}`}><i />{statusLabels[challenge.status]}</span></td>
                  <td><button className="more-button"><MoreHorizontal size={19} /></button></td>
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

function ChallengeCreate({ draft, setDraft, companies, setCompanies, onBack, onSave, notice, clearNotice }: {
  draft: ChallengeDraft
  setDraft: React.Dispatch<React.SetStateAction<ChallengeDraft>>
  companies: Company[]
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>
  onBack: () => void
  onSave: (publish: boolean) => void
  notice: string
  clearNotice: () => void
}) {
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [teamCount, setTeamCount] = useState(4)
  const [teamFileName, setTeamFileName] = useState('')
  const [teamsExporting, setTeamsExporting] = useState(false)
  const [teams, setTeams] = useState([
    { name: 'Молния', code: 'A7K2M9' },
    { name: 'Альфа', code: 'B4N8Q2' },
    { name: 'Вектор', code: 'C6P3R7' },
    { name: 'Импульс', code: 'D9T5L1' },
  ])
  const set = <K extends keyof ChallengeDraft>(key: K, value: ChallengeDraft[K]) => {
    clearNotice()
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function toggleCompany(companyId: number) {
    set('companyIds', draft.companyIds.includes(companyId)
      ? draft.companyIds.filter((id) => id !== companyId)
      : [...draft.companyIds, companyId])
  }

  function createCompany() {
    const name = newCompanyName.trim()
    if (!name) return
    const company = { id: Date.now(), name }
    setCompanies((items) => [...items, company])
    set('companyIds', [...draft.companyIds, company.id])
    setNewCompanyName('')
    setCompanyDialogOpen(false)
  }

  function generateTeams() {
    const names = ['Молния', 'Альфа', 'Вектор', 'Импульс', 'Орбита', 'Комета', 'Пульс', 'Форсаж']
    const count = Math.max(2, Math.min(8, teamCount))
    setTeamCount(count)
    setTeams(names.slice(0, count).map((name, index) => ({
      name,
      code: `${String.fromCharCode(65 + index)}${7 + index}K${2 + index}M${9 - index}`,
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
        <span className="eyebrow">Новый челлендж</span>
        <h1>Создание челленджа</h1>
        <p>Заполните основную информацию и настройте механику челленджа.</p>
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
              <Field label="Дата начала"><input type="date" value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
              <Field label="Дата окончания"><input type="date" min={draft.startDate} value={draft.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
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
                <div><strong>Компании</strong><span>Выберите одну или несколько компаний</span></div>
                <button className="button secondary" onClick={() => setCompanyDialogOpen(true)}>Создать компанию</button>
              </div>
              <div className="company-options">
                {companies.map((company) => {
                  const selected = draft.companyIds.includes(company.id)
                  return <div className={`company-option ${selected ? 'selected' : ''}`} key={company.id}>
                    <label className="company-option-main">
                      <input type="checkbox" checked={selected} onChange={() => toggleCompany(company.id)} />
                      <span className="company-option-icon"><Building2 size={15} /></span>
                      <strong>{company.name}</strong>
                    </label>
                    {selected && <button className="company-remove" onClick={() => toggleCompany(company.id)} aria-label={`Убрать ${company.name} из выборки`} title="Убрать из выборки"><X size={15} /></button>}
                  </div>
                })}
              </div>
            </div>}
          </FormSection>
          <FormSection number="04" title="Выбор активности" subtitle="Что будут делать участники">
            <div className="activity-grid">
              {(Object.keys(activityLabels) as Activity[]).map((activity) => {
                const Icon = activityIcons[activity]
                return <button key={activity} className={`select-card ${draft.activity === activity ? 'selected' : ''}`} onClick={() => set('activity', activity)}>
                  <Icon size={23} /><span>{activityLabels[activity]}</span><i />
                </button>
              })}
            </div>
          </FormSection>
          <FormSection number="05" title="Тип челленджа" subtitle="Выберите принцип определения результата">
            <div className="choice-grid">
              <ChoiceCard selected={draft.type === 'target'} title="Целевой челлендж" text="Каждый участник стремится выполнить заданную цель." onClick={() => set('type', 'target')} />
              <ChoiceCard selected={draft.type === 'competitive'} title="Соревновательный" text="Участники соревнуются за место в рейтинге." onClick={() => set('type', 'competitive')} />
            </div>
            {draft.type === 'target' && <Field label={`Цель: ${activityLabels[draft.activity].toLocaleLowerCase()}`}><input type="number" min="1" value={draft.target} onChange={(e) => set('target', e.target.value)} /></Field>}
          </FormSection>
          {draft.type === 'competitive' && <FormSection number="06" title="Формат участия" subtitle="Индивидуальный или командный рейтинг">
            <div className="choice-grid">
              <ChoiceCard selected={draft.teamMode === 'solo'} title="Без команд" text="Общий рейтинг для всех участников." onClick={() => set('teamMode', 'solo')} />
              <ChoiceCard selected={draft.teamMode === 'teams'} title="С командами" text="Участники объединяются и соревнуются командами." onClick={() => set('teamMode', 'teams')} />
            </div>
            {draft.teamMode === 'teams' && <div className="team-formation">
              <h3>Формирование команд</h3>
              <div className="team-mode-list">
                <button className={draft.teamCreation === 'random' ? 'selected' : ''} onClick={() => set('teamCreation', 'random')}><i /><span>Сгенерировать случайно</span></button>
                <button className={draft.teamCreation === 'manual' ? 'selected' : ''} onClick={() => set('teamCreation', 'manual')}><i /><span>Загрузить самостоятельно</span></button>
              </div>
              {draft.teamCreation === 'random' ? <div className="team-generator">
                <div className="team-count-field"><Field label="Количество команд"><input type="number" min="2" max="8" value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))} /></Field></div>
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
          <FormSection number={draft.type === 'competitive' ? '07' : '06'} title="Оформление" subtitle="Добавьте фирменный стиль челленджа">
            <div className={`upload-grid ${draft.visibility === 'public' ? 'single' : ''}`}>
              {draft.visibility === 'private' && <UploadBox label="Логотип челленджа" note="PNG или SVG, до 5 МБ" />}
              <UploadBox label="Основная обложка" note="PNG или JPG, 1200×640" />
            </div>
          </FormSection>
        </div>
      </div>
      <div className="sticky-actions"><button className="button secondary" onClick={onBack}>Отмена</button><div><button className="button ghost" onClick={() => onSave(false)}>Сохранить черновик</button><button className="button primary" onClick={() => onSave(true)}>Опубликовать</button></div></div>
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

function formatShortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date)
}
