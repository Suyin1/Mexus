import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import type { MissionKanbanParseResult, MissionTaskStatus } from '@/stores/missionStore'

interface MissionKanbanProps {
  kanban: MissionKanbanParseResult | null
  onOpenSource?: (file: string, line?: number) => void
}

const STATUS_COLUMNS: MissionTaskStatus[] = ['To Claim', 'In Progress', 'Done']

function statusKey(status: MissionTaskStatus): keyof MissionKanbanParseResult['counts'] {
  if (status === 'To Claim') return 'toClaim'
  if (status === 'In Progress') return 'inProgress'
  return 'done'
}

export function MissionKanban({ kanban, onOpenSource }: MissionKanbanProps) {
  const [statusFilter, setStatusFilter] = useState<MissionTaskStatus | 'all'>('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [query, setQuery] = useState('')

  const agents = useMemo(() => {
    const values = new Set<string>()
    for (const task of kanban?.tasks || []) {
      values.add(task.to)
      values.add(task.from)
    }
    return [...values].sort((a, b) => a.localeCompare(b))
  }, [kanban?.tasks])

  const filteredTasks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (kanban?.tasks || []).filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (agentFilter !== 'all' && task.to !== agentFilter && task.from !== agentFilter) return false
      if (!needle) return true
      return [
        task.to,
        task.from,
        task.scope,
        task.ref,
        task.request,
        task.reason,
        task.acceptance,
        task.updated,
        task.review,
      ].join(' ').toLowerCase().includes(needle)
    })
  }, [agentFilter, kanban?.tasks, query, statusFilter])

  if (!kanban) {
    return (
      <section className="mission-panel mission-kanban">
        <div className="mission-empty">暂无 Kanban 数据。</div>
      </section>
    )
  }

  if (!kanban.ok) {
    return (
      <section className="mission-panel mission-kanban">
        <div className="mission-panel-header">
          <div>
            <h3>Kanban</h3>
            <p>解析器降级</p>
          </div>
          {onOpenSource && (
            <button className="pane-action-btn" title="打开 kanban.md" onClick={() => onOpenSource('kanban.md')}>
              <ExternalLink className="icon-xs" />
            </button>
          )}
        </div>
        <div className="mission-warning">{kanban.error || '无法解析 kanban.md。'}</div>
        <pre className="mission-raw-fallback">{kanban.raw}</pre>
      </section>
    )
  }

  return (
    <section className="mission-panel mission-kanban">
      <div className="mission-panel-header">
        <div>
          <h3>Kanban</h3>
          <p>{kanban.counts.toClaim} to claim / {kanban.counts.inProgress} in progress / {kanban.counts.done} done</p>
        </div>
        {onOpenSource && (
          <button className="pane-action-btn" title="打开 kanban.md" onClick={() => onOpenSource('kanban.md')}>
            <ExternalLink className="icon-xs" />
          </button>
        )}
      </div>

      <div className="mission-kanban-filters" aria-label="Kanban 筛选">
        <label>
          <span>状态</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MissionTaskStatus | 'all')}>
            <option value="all">全部</option>
            {STATUS_COLUMNS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span>Agent</span>
          <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
            <option value="all">全部</option>
            {agents.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
          </select>
        </label>
        <label className="mission-search">
          <Search className="icon-xs" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选任务" />
        </label>
      </div>

      <div className="mission-kanban-grid">
        {STATUS_COLUMNS.map((status) => {
          const tasks = filteredTasks.filter((task) => task.status === status)
          return (
            <div className="mission-kanban-column" key={status}>
              <div className="mission-kanban-column-title">
                <span>{status}</span>
                <span>{tasks.length}/{kanban.counts[statusKey(status)]}</span>
              </div>
              <div className="mission-kanban-column-body">
                {tasks.length === 0 ? (
                  <div className="mission-empty">没有匹配的任务。</div>
                ) : tasks.map((task) => (
                  <article className="mission-task-card" key={`${task.status}-${task.ref}-${task.line}`}>
                    <div className="mission-task-card-top">
                      <strong>{task.ref || '无引用'}</strong>
                      {onOpenSource && (
                        <button className="pane-action-btn" title={`Open kanban.md line ${task.line}`} onClick={() => onOpenSource('kanban.md', task.line)}>
                          <ExternalLink className="icon-xs" />
                        </button>
                      )}
                    </div>
                    <div className="mission-task-meta">
                      <span>To {task.to} / From {task.from}</span>
                    </div>
                    <div className="mission-task-scope">{task.scope}</div>
                    <p>{task.request}</p>
                    <div className="mission-task-footer">
                      <span>{task.updated || '无更新'}</span>
                      <span
                        className={`mission-review-badge ${task.review.trim() ? 'mission-review-badge--reviewed' : 'mission-review-badge--pending'}`}
                        title={task.review.trim() ? '已审查' : '待审查'}
                        aria-label={task.review.trim() ? '已审查' : '待审查'}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
