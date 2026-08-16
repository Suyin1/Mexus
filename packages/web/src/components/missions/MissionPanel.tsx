import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Bot, ClipboardList, Loader2 } from 'lucide-react'
import { useMissionStore } from '@/stores/missionStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { MissionSelector } from './MissionSelector'
import { MissionOverview } from './MissionOverview'
import { MissionKanban } from './MissionKanban'
import { MissionAgents } from './MissionAgents'
import { SquadLeadLog } from './SquadLeadLog'
import { EnableAgentTeamBanner } from './EnableAgentTeamBanner'

export const MISSION_DETAIL_REFRESH_MS = 15_000
const AGENT_TEAM_PLUGIN_PROBE_PATH = '/.claude/plugins/mexus-agent-team/plugin.json'

interface MissionDetailAutoRefreshOptions {
  missionName: string
  loadMission: (name: string, options?: { silent?: boolean }) => Promise<void>
  getIsLoading: () => boolean
  readDocumentHidden?: () => boolean
  intervalMs?: number
}

async function detectAgentTeamPluginInstalled(signal: AbortSignal): Promise<boolean> {
  if (typeof fetch === 'undefined') return false
  try {
    const response = await fetch(AGENT_TEAM_PLUGIN_PROBE_PATH, { method: 'HEAD', signal })
    return response.ok
  } catch {
    return false
  }
}

export function shouldShowEnableAgentTeamBanner(missionCount: number, isPluginInstalled: boolean): boolean {
  return missionCount === 0 && !isPluginInstalled
}

export function startMissionDetailAutoRefresh({
  missionName,
  loadMission,
  getIsLoading,
  readDocumentHidden = () => typeof document !== 'undefined' && document.hidden,
  intervalMs = MISSION_DETAIL_REFRESH_MS,
}: MissionDetailAutoRefreshOptions): () => void {
  let stopped = false
  const tick = () => {
    if (stopped || readDocumentHidden() || getIsLoading()) return
    void loadMission(missionName, { silent: true })
  }
  const interval = globalThis.setInterval(tick, intervalMs)
  const onVisibilityChange = () => {
    if (!readDocumentHidden()) tick()
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  return () => {
    stopped = true
    globalThis.clearInterval(interval)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }
}

export const MISSION_ONBOARDING_KANBAN_COLUMNS = [
  {
    title: '待领取',
    cards: [
      '定义 Mission 框架',
      '发布 Agent 实现任务',
    ],
  },
  {
    title: '进行中',
    cards: [
      'Build Team observation UI',
      'Wire Mission lifecycle state',
    ],
  },
  {
    title: '已完成',
    cards: [
      '审查解析器降级行为',
      '验收已完成的 Mission 工作',
    ],
  },
]

export const MISSION_ONBOARDING_AGENTS = [
  {
    name: 'Squad Lead',
    role: 'Mission 拆解与任务审查',
  },
  {
    name: 'Implementation Agent',
    role: '在工作区文件中执行范围内任务',
  },
]

function CenterState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 24,
      color: 'var(--text-secondary)',
      textAlign: 'center',
    }}>
      {icon}
      <div style={{ color: 'var(--text-primary)', fontSize: 'var(--font-lg)' }}>{title}</div>
      <div style={{ maxWidth: 480, fontSize: 'var(--font-sm)', lineHeight: 1.45 }}>{detail}</div>
    </div>
  )
}

function ObservationShell() {
  const selectedMission = useMissionStore((s) => s.selectedMission)
  const overview = useMissionStore((s) => s.overview)
  const kanban = useMissionStore((s) => s.kanban)
  const agents = useMissionStore((s) => s.agents)
  const squadLeadLog = useMissionStore((s) => s.squadLeadLog)
  const openFileTab = useWorkspaceStore((s) => s.openFileTab)
  const [activeTab, setActiveTab] = useState<'kanban' | 'agents' | 'squad-log'>('kanban')

  if (!selectedMission) return null

  const openMissionSource = (file: string) => {
    openFileTab(selectedMission.path ? `${selectedMission.path}/${file}` : file)
  }

  return (
    <>
      <MissionOverview mission={selectedMission} overview={overview} kanban={kanban} />
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        overflow: 'auto',
      }}>
        <div className="mission-tabs" role="tablist" aria-label="Mission 观测视图">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'kanban'}
            className={`mission-tab ${activeTab === 'kanban' ? 'mission-tab--active' : ''}`}
            onClick={() => setActiveTab('kanban')}
          >
            Kanban
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'agents'}
            className={`mission-tab ${activeTab === 'agents' ? 'mission-tab--active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            Mission 成员
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'squad-log'}
            className={`mission-tab ${activeTab === 'squad-log' ? 'mission-tab--active' : ''}`}
            onClick={() => setActiveTab('squad-log')}
          >
            Squad Lead 日志
          </button>
        </div>

        <div className="mission-tab-panel" role="tabpanel">
          {activeTab === 'kanban' && <MissionKanban kanban={kanban} onOpenSource={openMissionSource} />}
          {activeTab === 'agents' && <MissionAgents agents={agents} />}
          {activeTab === 'squad-log' && <SquadLeadLog log={squadLeadLog} onOpenSource={openMissionSource} />}
        </div>
      </div>
    </>
  )
}

function MissionOnboarding({ showEnableAgentTeamBanner }: { showEnableAgentTeamBanner: boolean }) {
  return (
    <div className="mission-onboarding">
      {showEnableAgentTeamBanner && <EnableAgentTeamBanner />}
      <div className="mission-onboarding-intro">
        <div>
          <div className="mission-onboarding-kicker">团队工作区</div>
          <h2>通过 Markdown 文件协调 Mission 工作。</h2>
          <p>
            The Team tab observes Mission state from `mission.md`, `kanban.md`, and `agents.md`: Squad Lead pane creation,
            Kanban progress, Mission 成员, lifecycle, and review counts stay visible beside the Hub workspace.
          </p>
        </div>
      </div>

      <div className="mission-onboarding-preview" aria-label="Mission 布局预览">
        <section className="mission-onboarding-overview">
          <div className="mission-onboarding-overview-title">
            <ClipboardList className="icon-sm" />
            <div>
              <strong>Mission 概览</strong>
              <span>active - 2026-05-06</span>
            </div>
          </div>
          <div className="mission-onboarding-stats">
            <span>待领取 2</span>
            <span>进行中 2</span>
            <span>已完成 2</span>
            <span>未审查 1</span>
          </div>
        </section>

        <div className="mission-onboarding-grid">
          {MISSION_ONBOARDING_KANBAN_COLUMNS.map((column) => (
            <section className="mission-onboarding-column" key={column.title}>
              <div className="mission-onboarding-column-title">
                <span>{column.title}</span>
                <span>{column.cards.length}</span>
              </div>
              <div className="mission-onboarding-column-body">
                {column.cards.map((card) => (
                  <article className="mission-onboarding-card" key={card}>
                    <strong>{card}</strong>
                    <p>示例任务卡片，仅作预览展示。</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mission-onboarding-agents">
          {MISSION_ONBOARDING_AGENTS.map((agent) => (
            <article className="mission-onboarding-agent-card" key={agent.name}>
              <div>
                <Bot className="icon-sm" />
                <strong>{agent.name}</strong>
              </div>
              <p>{agent.role}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}

export function MissionPanel() {
  const missions = useMissionStore((s) => s.missions)
  const selectedMission = useMissionStore((s) => s.selectedMission)
  const isLoading = useMissionStore((s) => s.isLoading)
  const error = useMissionStore((s) => s.error)
  const refresh = useMissionStore((s) => s.refresh)
  const loadMission = useMissionStore((s) => s.loadMission)
  const [isAgentTeamPluginInstalled, setIsAgentTeamPluginInstalled] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (missions.length > 0) return undefined
    const controller = new AbortController()
    void detectAgentTeamPluginInstalled(controller.signal).then((installed) => {
      if (!controller.signal.aborted) setIsAgentTeamPluginInstalled(installed)
    })
    return () => controller.abort()
  }, [missions.length])

  useEffect(() => {
    if (!selectedMission?.name) return undefined
    return startMissionDetailAutoRefresh({
      missionName: selectedMission.name,
      loadMission,
      getIsLoading: () => useMissionStore.getState().isLoading,
    })
  }, [loadMission, selectedMission?.name])

  const showInitialLoading = isLoading && missions.length === 0 && !selectedMission

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-primary)' }}>
      <MissionSelector />
      {showInitialLoading && (
        <CenterState
          icon={<Loader2 className="icon-hero" style={{ color: 'var(--accent-primary)' }} />}
          title="加载 Mission 中"
          detail="Reading Mission files from the connected workspace."
        />
      )}
      {!showInitialLoading && missions.length === 0 && (
        <MissionOnboarding showEnableAgentTeamBanner={shouldShowEnableAgentTeamBanner(missions.length, isAgentTeamPluginInstalled)} />
      )}
      {!showInitialLoading && selectedMission?.incomplete && (
        <CenterState
          icon={<AlertTriangle className="icon-hero" style={{ color: '#F0883E' }} />}
          title="未完成的 Mission"
          detail={selectedMission.missingFiles?.length ? `Missing files: ${selectedMission.missingFiles.join(', ')}` : 'This Mission is missing one or more required files.'}
        />
      )}
      {!showInitialLoading && selectedMission && !selectedMission.incomplete && <ObservationShell />}
      {error && missions.length > 0 && (
        <div style={{ padding: '6px 12px', color: '#F0883E', fontSize: 'var(--font-xs)', borderTop: '1px solid var(--border-subtle)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
