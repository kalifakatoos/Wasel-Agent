#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client'
import { WebSocketEventBus } from './event-bus.ts'
import { AgentOrchestrator } from './agent-orchestrator.ts'
import { LangGraphRunner } from './langgraph-runner.ts'
import { APIServer } from './api-server.ts'

const prisma = new PrismaClient()
const eventBus = new WebSocketEventBus({
  realtimePort: 3003,
  bridgePort: 3013
})

const orchestrator = new AgentOrchestrator(prisma, eventBus)
const langGraphRunner = new LangGraphRunner(prisma)
const apiServer = new APIServer(orchestrator, langGraphRunner, prisma)

async function main() {
  console.log('🤖 Wasel Nalut Multi-Agent Intelligence Engine')
  console.log('📅 Started on 2026-10-18')
  console.log('🚀 Starting agents on ports 3020 (API), 3003 (Socket.io)')

  await Promise.all([
    eventBus.start(),
    apiServer.start(3020),
    orchestrator.start()
  ])

  console.log('✅ All agents online and listening')
}

main().catch(async (err) => {
  console.error('Fatal error starting agents:', err)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down agents...')
  await orchestrator.stop()
  await eventBus.stop()
  await prisma.$disconnect()
  process.exit(0)
})
