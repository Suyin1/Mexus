import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startServer } from './index.ts'
import { CliError, resolveServerUrl, type CliHttpClient, type CliIo } from './cli/http.ts'
import { runPaneCommand } from './cli/pane.ts'
import { runMissionCommand } from './cli/mission.ts'
export function getCliCommandName(invokedPath?: string): 'mexus' | 'nexus' {
  const binaryName = invokedPath ? path.basename(invokedPath).toLowerCase() : ''
  return binaryName === 'nexus' ? 'nexus' : 'mexus'
}

export function shouldRunMain(invokedPath: string | undefined, moduleUrl: string): boolean {
  if (!invokedPath) return false

  try {
    const realInvokedPath = fs.realpathSync(invokedPath)
    return pathToFileURL(realInvokedPath).href === moduleUrl
  } catch {
    return pathToFileURL(path.resolve(invokedPath)).href === moduleUrl
  }
}

const COMMANDS = ['start', 'init', 'status', 'stop', 'hub', 'pane', 'mission', 'help'] as const

export function getSupportedCommands(): string[] {
  return [...COMMANDS]
}

// Check Node.js version — node-pty requires Node 22+
const nodeVersion = parseInt(process.versions.node.split('.')[0], 10)
if (nodeVersion < 22) {
  console.error(`错误: Mexus 需要 Node.js >= 22，但当前运行的是 v${process.versions.node}`)
  console.error(`  请升级: nvm install 22 && nvm use 22`)
  process.exit(1)
}

// Clean up parent session env so spawned PTYs don't detect nesting
delete process.env.CLAUDECODE
delete process.env.CLAUDE_CODE
delete process.env.CLAUDE_CODE_ENTRYPOINT

const DEFAULT_PORT = 7700
const DEFAULT_HUB_PORT = 7600

function printUsage(commandName: string) {
  console.log(`
  用法: ${commandName} [command] [directory]

  命令:
    start [dir]    启动 Mexus 服务（默认）
    init  [dir]    在项目中初始化 .nexus/ 配置
    status [dir]   查看工作区状态
    stop           停止正在运行的服务
    hub            启动 Mexus Hub 以管理所有实例
    pane           通过 REST 管理执行面板
    mission        通过 REST 管理 Agent Team Mission

  参数:
    dir            项目目录路径（默认当前目录）

  环境变量:
    NEXUS_PORT     服务端口（默认: ${DEFAULT_PORT}）
    NEXUS_HUB_PORT Hub 仪表盘端口（默认: ${DEFAULT_HUB_PORT}）

  示例:
    ${commandName}                        # 在当前目录启动
    ${commandName} ~/projects/my-app      # 以指定项目启动
    ${commandName} start ~/projects/app   # 显式 start 命令
    ${commandName} init .                 # 在当前目录初始化配置
`.trimEnd())
}

function findProjectRoot(startDir: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || ''

  // Walk up from startDir, prefer the highest-level match
  // (monorepo root, not a nested package)
  // Stop at HOME — never go above it
  let dir = startDir
  let bestMatch = startDir

  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir // pnpm monorepo root is definitive
    }
    if (
      fs.existsSync(path.join(dir, '.git')) ||
      fs.existsSync(path.join(dir, '.nexus'))
    ) {
      bestMatch = dir
    }
    const parent = path.dirname(dir)
    // Don't traverse above HOME directory
    if (home && parent === home && dir !== startDir) break
    dir = parent
  }

  // Warn if resolved to HOME — likely a mistake
  if (home && bestMatch === home && startDir === home) {
    console.warn(`警告: 正在 HOME 目录中运行 Mexus (${home}).`)
    console.warn(`  建议: mexus <project-path>`)
  }

  return bestMatch
}

function resolveProjectDir(dirArg?: string): string {
  if (process.env.NEXUS_PROJECT_DIR) {
    return path.resolve(process.env.NEXUS_PROJECT_DIR)
  }
  if (dirArg) {
    const resolved = path.resolve(dirArg)
    if (!fs.existsSync(resolved)) {
      console.error(`错误: 目录不存在: ${resolved}`)
      process.exit(1)
    }
    if (!fs.statSync(resolved).isDirectory()) {
      console.error(`错误: 不是目录: ${resolved}`)
      process.exit(1)
    }
    return resolved
  }
  return findProjectRoot(process.cwd())
}

const COMMAND_SET = new Set(getSupportedCommands())

export interface RunCliOptions {
  argv: string[]
  invokedPath?: string
  env?: NodeJS.ProcessEnv
  httpClient?: CliHttpClient
  io?: CliIo
}

export async function runCli(options: RunCliOptions): Promise<void> {
  const args = [...options.argv]
  const env = options.env || process.env
  const io = options.io || {
    stdout: (text: string) => console.log(text),
    stderr: (text: string) => console.error(text),
  }
  const httpClient = options.httpClient || { fetch }
  const commandName = getCliCommandName(options.invokedPath)

  // Parse command and directory argument
  // Support: mexus <dir>, mexus <cmd> <dir>, mexus <cmd>
  let command: string
  let dirArg: string | undefined

  if (args.length === 0) {
    command = 'start'
  } else if (args[0] === '--help' || args[0] === '-h') {
    command = 'help'
  } else if (COMMAND_SET.has(args[0])) {
    command = args[0]
    dirArg = args[1]
  } else {
    // First arg is not a known command — treat it as a directory
    command = 'start'
    dirArg = args[0]
  }

  if (command === 'help') {
    printUsage(commandName)
    return
  }

  if (command === 'pane') {
    await runPaneCommand(args.slice(1), resolveServerUrl(env), httpClient, io)
    return
  }

  if (command === 'mission') {
    await runMissionCommand(args.slice(1), resolveServerUrl(env), httpClient, io)
    return
  }

  if (command === 'hub') {
    const hubPort = parseInt(env.NEXUS_HUB_PORT || String(DEFAULT_HUB_PORT), 10)
    const { startHub } = await import('./hub/index.ts')
    await startHub(hubPort, process.argv[1] || '')
    const url = `http://localhost:${hubPort}`
    import('open').then((mod) => mod.default(url)).catch(() => {})
    return
  }

  const projectDir = resolveProjectDir(dirArg)

  switch (command) {
    case 'start': {
      const port = parseInt(env.NEXUS_PORT || String(DEFAULT_PORT), 10)
      await startServer(port, projectDir)
      break
    }

    case 'init': {
      const { ConfigManager } = await import('./workspace/ConfigManager.ts')
      const configManager = new ConfigManager(projectDir)
      configManager.loadGlobalConfig()
      configManager.initWorkspace()
      console.log(`已在 ${projectDir} 中初始化 .nexus/`)
      break
    }

    case 'status': {
      const { ConfigManager } = await import('./workspace/ConfigManager.ts')
      const configManager = new ConfigManager(projectDir)
      const wsConfig = configManager.loadWorkspaceConfig()
      if (!wsConfig) {
        console.log('未找到 .nexus/config.yaml。请先运行 `mexus init`。')
        break
      }
      console.log(`工作区: ${wsConfig.name}`)
      console.log(`执行面板: ${wsConfig.panes.length}`)
      for (const pane of wsConfig.panes) {
        console.log(`  - ${pane.id} [${pane.agent}] ${pane.name}${pane.task ? ` — ${pane.task}` : ''}`)
      }
      break
    }

    case 'stop': {
      try {
        const port = parseInt(env.NEXUS_PORT || String(DEFAULT_PORT), 10)
        const res = await httpClient.fetch(`http://localhost:${port}/api/health`)
        if (res.ok) {
          console.log('正在发送关闭信号...')
          process.kill(process.pid, 'SIGTERM')
        }
      } catch {
        console.log('未发现正在运行的 Mexus 服务。')
      }
      break
    }

    default:
      console.error(`未知命令: ${command}`)
      printUsage(commandName)
      process.exit(1)
  }
}

async function main() {
  try {
    await runCli({
      argv: process.argv.slice(2),
      invokedPath: process.argv[1],
      env: process.env,
      httpClient: { fetch },
    })
  } catch (err) {
    if (err instanceof CliError) {
      console.error(err.message)
      process.exit(err.exitCode)
    }
    throw err
  }
}

const isEntrypoint = shouldRunMain(process.argv[1], import.meta.url)

if (isEntrypoint) {
  main().catch((err) => {
    console.error('致命错误:', err)
    process.exit(1)
  })
}
