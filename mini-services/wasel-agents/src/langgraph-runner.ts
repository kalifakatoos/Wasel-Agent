import { PrismaClient } from '@prisma/client'
import { SalesAgent } from './agents/sales-agent.ts'
import { ProcurementAgent } from './agents/procurement-agent.ts'
import { DispatchAgent } from './agents/dispatch-agent.ts'
import { AccountingAgent } from './agents/accounting-agent.ts'
import { RevenueAgent } from './agents/revenue-agent.ts'
import { CustomerIntelAgent } from './agents/customer-intel-agent.ts'
import { OpsMonitorAgent } from './agents/ops-monitor-agent.ts'
import { AgentTypes } from './types.ts'

export class LangGraphRunner {
  private prisma: PrismaClient

  // Lazy-loaded agents — instantiated only when needed
  private agents = new Map<AgentTypes, any>()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  private getAgent(agentType: AgentTypes): any {
    if (this.agents.has(agentType)) {
      return this.agents.get(agentType)
    }

    let agent: any
    switch (agentType) {
      case 'sales':
        agent = new SalesAgent(this.prisma)
        break
      case 'procurement':
        agent = new ProcurementAgent(this.prisma)
        break
      case 'dispatch':
        agent = new DispatchAgent(this.prisma)
        break
      case 'accounting':
        agent = new AccountingAgent(this.prisma)
        break
      case 'revenue':
        agent = new RevenueAgent(this.prisma)
        break
      case 'customer_intel':
        agent = new CustomerIntelAgent(this.prisma)
        break
      case 'ops_monitor':
        agent = new OpsMonitorAgent(this.prisma)
        break
      default:
        throw new Error(`Unknown agent type: ${agentType}`)
    }

    this.agents.set(agentType, agent)
    return agent
  }

  async runAgent(agentType: AgentTypes, input: any): Promise<any> {
    const agent = this.getAgent(agentType)
    const startTime = Date.now()

    const result = await agent.execute(input)

    const durationMs = Date.now() - startTime
    console.log(`[${agentType}] Task completed in ${durationMs}ms`)

    return {
      agentType,
      input,
      result,
      durationMs
    }
  }
}