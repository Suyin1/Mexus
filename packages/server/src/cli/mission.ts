import type { MissionDetail, MissionSummary } from '../mission/MissionService.ts'
import { parseMissionKanban, parseMissionRoundtable } from '../mission/missionParsers.ts'
import type { PaneState } from '../types.ts'
import { CliError, type CliHttpClient, type CliIo, printJson, requestJson, requireArg, takeFlag } from './http.ts'

interface MissionListResponse {
  missions: MissionSummary[]
}

interface PaneListResponse {
  panes: PaneState[]
}

export async function runMissionCommand(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const [command, ...rest] = args
  switch (command) {
    case 'list':
      await listMissions(rest, serverUrl, client, io)
      return
    case 'active':
      await activeMission(rest, serverUrl, client, io)
      return
    case 'activate':
      await activateMission(rest, serverUrl, client, io)
      return
    case 'archive':
      await archiveMission(rest, serverUrl, client, io)
      return
    case 'validate':
      await validateMission(rest, serverUrl, client, io)
      return
    default:
      throw new CliError('用法: mexus mission <list|active|activate|archive|validate>')
  }
}

async function listMissions(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const json = takeFlag(args, '--json')
  if (args.length > 0) throw new CliError(`未知的 mission list 参数: ${args[0]}`)
  const response = await requestJson<MissionListResponse>(client, `${serverUrl}/api/missions`)
  if (json) {
    printJson(io, response)
  } else {
    for (const mission of response.missions) {
      io.stdout(`${mission.name} [${mission.lifecycle}]${mission.complete ? '' : ' incomplete'}`)
    }
  }
}

async function activeMission(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const json = takeFlag(args, '--json')
  if (args.length > 0) throw new CliError(`未知的 mission active 参数: ${args[0]}`)
  const response = await requestJson<MissionDetail>(client, `${serverUrl}/api/missions/active`)
  if (json) {
    printJson(io, response)
  } else {
    io.stdout(`${response.summary.name} [${response.summary.lifecycle}]`)
  }
}

async function activateMission(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const name = requireArg(args[0], '缺少 Mission 名称')
  if (args.length > 1) throw new CliError(`未知的 mission activate 参数: ${args[1]}`)
  const response = await requestJson<MissionDetail>(client, `${serverUrl}/api/missions/${encodeURIComponent(name)}/activate`, { method: 'POST' })
  io.stdout(`已激活 Mission ${response.summary.name}`)
}

async function archiveMission(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const force = takeFlag(args, '--force')
  const name = requireArg(args[0], '缺少 Mission 名称')
  if (args.length > 1) throw new CliError(`未知的 mission archive 参数: ${args[1]}`)

  if (!force) {
    const panes = await requestJson<PaneListResponse>(client, `${serverUrl}/api/panes?mission=${encodeURIComponent(name)}`)
    const running = panes.panes.filter((pane) => pane.status === 'running')
    if (running.length > 0) {
      throw new CliError(`Mission 存在运行中的执行面板: ${running.map((pane) => pane.id).join(', ')}。请使用 --force 重新运行以关闭它们。`)
    }
  }

  const response = await requestJson<{ name: string; path: string; closedPaneIds: string[] }>(client, `${serverUrl}/api/missions/${encodeURIComponent(name)}/archive`, {
    method: 'POST',
    body: JSON.stringify({ force }),
  })
  io.stdout(`已将 Mission ${response.name} 归档至 ${response.path}`)
}

async function validateMission(args: string[], serverUrl: string, client: CliHttpClient, io: CliIo): Promise<void> {
  const json = takeFlag(args, '--json')
  const name = requireArg(args[0], '缺少 Mission 名称')
  if (args.length > 1) throw new CliError(`未知的 mission validate 参数: ${args[1]}`)

  const mission = await requestJson<MissionDetail>(client, `${serverUrl}/api/missions/${encodeURIComponent(name)}`)
  const required = ['mission', 'agents', 'kanban', 'roundtable', 'squadLead'] as const
  const errors: string[] = []
  for (const key of required) {
    if (!mission.files[key]?.exists) errors.push(`缺少必需文件: ${mission.files[key]?.path || key}`)
  }
  const kanban = parseMissionKanban(mission.files.kanban?.raw || '')
  if (!kanban.ok) errors.push(`无效的 kanban.md: ${kanban.error}`)
  const roundtable = parseMissionRoundtable(mission.files.roundtable?.raw || '')
  if (!roundtable.ok) errors.push(`无效的 roundtable.md: ${roundtable.error}`)

  const report = { ok: errors.length === 0, mission: name, errors }
  if (json) {
    printJson(io, report)
  } else if (report.ok) {
    io.stdout(`Mission ${name} 校验通过`)
  } else {
    for (const error of errors) io.stderr(error)
  }
  if (!report.ok) throw new CliError(`Mission ${name} 校验未通过`)
}
