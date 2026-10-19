import http from 'http'
import { PrismaClient } from '@prisma/client'
import { AgentOrchestrator } from './agent-orchestrator.ts'
import { LangGraphRunner } from './langgraph-runner.ts'

export class APIServer {
  private server: http.Server | null = null
  private orchestrator: AgentOrchestrator
  private langGraphRunner: LangGraphRunner
  private prisma: PrismaClient

  constructor(orchestrator: AgentOrchestrator, langGraphRunner: LangGraphRunner, prisma: PrismaClient) {
    this.orchestrator = orchestrator
    this.langGraphRunner = langGraphRunner
    this.prisma = prisma
  }

  async start(port: number) {
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`)
      const pathname = url.pathname

      // CORS headers for browser requests from Next.js frontend
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Content-Type', 'application/json')

      // Preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      try {
        if (pathname === '/health') {
          res.writeHead(200)
          res.end(JSON.stringify({ status: 'ok', service: 'wasel-agents' }))
          return
        }

        if (pathname === '/api/agents/status') {
          const stats = await this.prisma.agentTask.groupBy({
            by: ['agentType'],
            where: { status: { in: ['pending', 'running'] } },
            _count: { _all: true }
          })
          res.writeHead(200)
          res.end(JSON.stringify({ activeAgents: stats }))
          return
        }

        if (pathname === '/api/agents/run' && (req.method === 'POST' || req.method === 'OPTIONS')) {
          if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
          }

          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { agentType, input } = JSON.parse(body)
              this.langGraphRunner.runAgent(agentType, input)
                .then(result => {
                  res.writeHead(200)
                  res.end(JSON.stringify(result))
                })
                .catch(err => {
                  res.writeHead(500)
                  res.end(JSON.stringify({ error: err.message }))
                })
            } catch (err) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'Invalid request body' }))
            }
          })
          return
        }

        // Fallback
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Not found' }))
      } catch (err: any) {
        res.writeHead(500)
        res.end(JSON.stringify({ error: err.message }))
      }
    })

    await new Promise<void>((resolve) => {
      this.server?.listen(port, () => {
        console.log(`🌐 Agent API server listening on port ${port}`)
        resolve()
      })
    })
  }

  async stop() {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve())
      })
    }
  }
}