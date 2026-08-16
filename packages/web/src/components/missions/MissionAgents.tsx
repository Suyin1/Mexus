import { Users } from 'lucide-react'
import type { MissionAgentsParseResult } from '@/stores/missionStore'

interface MissionAgentsProps {
  agents: MissionAgentsParseResult | null
}

export function MissionAgents({ agents }: MissionAgentsProps) {
  if (!agents) {
    return (
      <section className="mission-panel mission-agents">
        <div className="mission-empty">暂无 Mission Agent 数据。</div>
      </section>
    )
  }

  if (!agents.ok) {
    return (
      <section className="mission-panel mission-agents">
        <div className="mission-panel-header">
          <div>
            <h3>Mission 成员</h3>
            <p>解析器降级</p>
          </div>
        </div>
        <div className="mission-warning">{agents.error || '无法解析 agents.md。'}</div>
        <pre className="mission-raw-fallback">{agents.raw}</pre>
      </section>
    )
  }

  return (
    <section className="mission-panel mission-agents">
      <div className="mission-panel-header">
        <div>
          <h3>Mission 成员</h3>
          <p>{agents.agents.length} 个已分配</p>
        </div>
        <Users className="icon-sm" style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="mission-agent-list">
        {agents.agents.map((agent) => (
          <article className="mission-agent-card" key={agent.name}>
            <div className="mission-agent-card-head">
              <div className="mission-agent-avatar" aria-hidden="true">
                {agent.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="mission-agent-card-top">
                <div>
                  <strong>{agent.name}</strong>
                  <span>Mission Agent</span>
                </div>
                <span>{agent.taskCounts.total} 个任务</span>
              </div>
            </div>
            <div className="mission-agent-profile">
              <p>{agent.responsibility || '未记录职责。'}</p>
              <div className="mission-agent-counts">
                <span>{agent.taskCounts.toClaim} 待领取</span>
                <span>{agent.taskCounts.inProgress} 进行中</span>
                <span>{agent.taskCounts.done} 已完成</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
