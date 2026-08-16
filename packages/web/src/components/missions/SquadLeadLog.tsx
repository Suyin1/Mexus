import { ExternalLink, NotebookText } from 'lucide-react'
import type { SquadLeadLogParseResult } from '@/stores/missionStore'

interface SquadLeadLogProps {
  log: SquadLeadLogParseResult | null
  onOpenSource?: (file: string, line?: number) => void
}

export function SquadLeadLog({ log, onOpenSource }: SquadLeadLogProps) {
  if (!log) {
    return (
      <section className="mission-panel mission-squad-log">
        <div className="mission-empty">暂无 Squad Lead 工作日志。</div>
      </section>
    )
  }

  if (!log.ok) {
    return (
      <section className="mission-panel mission-squad-log">
        <div className="mission-panel-header">
          <div>
            <h3>Squad Lead 工作日志</h3>
            <p>解析器降级</p>
          </div>
          {onOpenSource && (
            <button className="pane-action-btn" title="打开 squad-lead.md" onClick={() => onOpenSource('squad-lead.md')}>
              <ExternalLink className="icon-xs" />
            </button>
          )}
        </div>
        <div className="mission-warning">{log.error || '无法解析 squad-lead.md。'}</div>
        <pre className="mission-raw-fallback">{log.raw}</pre>
      </section>
    )
  }

  return (
    <section className="mission-panel mission-squad-log">
      <div className="mission-panel-header">
        <div>
          <h3>Squad Lead 工作日志</h3>
          <p>{log.entries.length} entries from squad-lead.md</p>
        </div>
        {onOpenSource ? (
          <button className="pane-action-btn" title="打开 squad-lead.md" onClick={() => onOpenSource('squad-lead.md')}>
            <ExternalLink className="icon-xs" />
          </button>
        ) : (
          <NotebookText className="icon-sm" style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      <div className="mission-squad-log-list">
        {log.entries.map((entry) => (
          <article className="mission-squad-log-entry" key={entry.id}>
            <div className="mission-squad-log-rail" aria-hidden="true">
              <span />
            </div>
            <div className="mission-squad-log-content">
              <div className="mission-squad-log-meta">
                <time>{entry.date || '-'}</time>
                <span>{entry.actor || 'Squad Lead'}</span>
                {onOpenSource && (
                  <button className="mission-squad-log-link" onClick={() => onOpenSource('squad-lead.md', entry.line)}>
                    line {entry.line}
                  </button>
                )}
              </div>
              <p>{entry.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
