import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { render, type Instance as InkInstance } from 'ink'
import { listInstances } from './InstanceRegistry.ts'
import { HubConsoleView, type HubConsoleSnapshot } from './HubConsoleView.ts'

export type HubConsoleOptions = {
  port: number
  logDir: string
}

type HubConsoleHandle = {
  stop: () => void
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

function registryPath(): string {
  return path.join(process.env.NEXUS_REGISTRY_DIR || path.join(os.homedir(), '.nexus'), 'instances.json')
}

function readPackageVersion(): string {
  const candidates = [
    path.resolve(moduleDir, '../../../package.json'),
    path.resolve(moduleDir, '../../../../package.json'),
    path.resolve(process.cwd(), 'package.json'),
  ]
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as { name?: string; version?: string }
      if ((data.name === 'mexus-cli' || candidate.endsWith('/package.json')) && data.version) return data.version
    } catch { /* try next */ }
  }
  return 'dev'
}

function buildSnapshot(options: HubConsoleOptions): HubConsoleSnapshot {
  const instances = listInstances()
  const mem = process.memoryUsage()
  return {
    version: readPackageVersion(),
    port: options.port,
    pid: process.pid,
    nodeVersion: process.version,
    uptimeSeconds: process.uptime(),
    instances,
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
    },
    loadAverage: os.loadavg(),
    registryPath: registryPath(),
    logDir: options.logDir,
    warnings: [
      ...(!process.env.PATH ? ['PATH 为空；Agent 检测可能失败'] : []),
    ],
  }
}

function renderPlain(options: HubConsoleOptions): string {
  const instances = listInstances()
  const running = instances.filter((instance) => instance.status === 'running').length
  return [
    `Mexus Hub 正在运行，地址 http://localhost:${options.port}`,
    `  PID: ${process.pid}`,
    `  项目: ${running} 运行中 / ${instances.length} 已跟踪`,
    `  注册表: ${registryPath()}`,
    `  日志: ${options.logDir}`,
  ].join('\n')
}

export function startHubConsole(options: HubConsoleOptions): HubConsoleHandle {
  if (!process.stdout.isTTY || process.env.MEXUS_HUB_CONSOLE === 'plain') {
    console.log(renderPlain(options))
    return { stop: () => {} }
  }

  let ink: InkInstance | null = null
  let stopped = false

  const renderSnapshot = () => {
    if (stopped) return
    const element = React.createElement(HubConsoleView, { snapshot: buildSnapshot(options) })
    if (ink) ink.rerender(element)
    else ink = render(element, { stdout: process.stdout, stderr: process.stderr, stdin: process.stdin, exitOnCtrlC: false })
  }

  renderSnapshot()
  const timer = setInterval(renderSnapshot, 3000)

  return {
    stop: () => {
      stopped = true
      clearInterval(timer)
      ink?.unmount()
      ink = null
      console.log(renderPlain(options))
    },
  }
}
