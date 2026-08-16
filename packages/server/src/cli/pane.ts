import type { AgentType, PaneState } from '../types.ts'
import { CliError, type CliHttpClient, type CliIo, printJson, requestJson, requireArg, takeFlag, takeOption } from './http.ts'

interface PaneListResponse {
  panes: PaneState[]
}

interface PaneCreateResponse {
  pane: PaneState
}

const AGENTS = new Set(['claudecode', 'codex', 'opencode', 'kimi-cli', 'qodercli', 'qwencode'])

export async function runPaneCommand(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const [command, ...rest] = args
  switch (command) {
    case 'create':
      await createPane(rest, serverUrl, client, io)
      return
    case 'list':
      await listPanes(rest, serverUrl, client, io)
      return
    case 'close':
      await closePane(rest, serverUrl, client, io)
      return
    default:
      throw new CliError('用法: mexus pane <create|list|close>')
  }
}

async function createPane(rawArgs: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const args = [...rawArgs]
  const name = requireArg(takeOption(args, '--name'), '缺少 --name')
  const agent = requireArg(takeOption(args, '--agent'), '缺少 --agent')
  if (!AGENTS.has(agent)) throw new CliError(`未知 Agent: ${agent}`)
  const workdir = takeOption(args, '--workdir')
  const task = takeOption(args, '--task')
  const missionName = takeOption(args, '--mission')
  const missionAgent = takeOption(args, '--mission-agent')
  const missionRole = takeOption(args, '--mission-role') || 'mission-agent'
  const isolation = takeOption(args, '--isolation') || 'shared'
  const restore = takeOption(args, '--restore') || 'manual'
  const yolo = takeFlag(args, '--yolo')
  takeOption(args, '--runtime')
  const json = takeFlag(args, '--json')
  if (args.length > 0) throw new CliError(`未知的 pane create 参数: ${args[0]}`)
  if (missionRole !== 'squad-lead' && missionRole !== 'mission-agent') {
    throw new CliError(`无效的 mission 角色: ${missionRole}`)
  }

  const payload = {
    name,
    agent: agent as AgentType,
    workdir,
    task,
    mission: missionName
      ? {
          name: missionName,
          path: `agent-team/missions/${missionName}`,
          role: missionRole,
          agentName: missionAgent || (missionRole === 'squad-lead' ? 'Squad Lead' : undefined),
        }
      : undefined,
    isolation,
    restore,
    yolo,
  }

  const response = await requestJson<PaneCreateResponse>(client, `${serverUrl}/api/panes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (json) {
    printJson(io, response)
  } else {
    io.stdout(`已创建执行面板 ${response.pane.id}: ${response.pane.name}`)
  }
}

async function listPanes(rawArgs: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const args = [...rawArgs]
  const mission = takeOption(args, '--mission')
  const json = takeFlag(args, '--json')
  if (args.length > 0) throw new CliError(`未知的 pane list 参数: ${args[0]}`)

  const query = mission ? `?mission=${encodeURIComponent(mission)}` : ''
  const response = await requestJson<PaneListResponse>(client, `${serverUrl}/api/panes${query}`)
  if (json) {
    printJson(io, response)
    return
  }
  for (const pane of response.panes) {
    io.stdout(`${pane.id} [${pane.agent}] ${pane.name}${pane.mission ? ` (${pane.mission.name}:${pane.mission.agentName || pane.mission.role})` : ''}`)
  }
}

async function closePane(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const id = requireArg(args[0], '缺少 pane id')
  if (args.length > 1) throw new CliError(`未知的 pane close 参数: ${args[1]}`)
  await requestJson<{ ok: true }>(client, `${serverUrl}/api/panes/${encodeURIComponent(id)}`, { method: 'DELETE' })
  io.stdout(`已关闭执行面板 ${id}`)
}
