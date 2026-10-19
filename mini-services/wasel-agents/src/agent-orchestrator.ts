import { PrismaClient } from '@prisma/client'
import { WebSocketEventBus } from './event-bus.ts'
import { TaskQueue } from './task-queue.ts'
import { AgentTypes } from './types.ts'
import { LangGraphRunner } from './langgraph-runner.ts'

export class AgentOrchestrator {
  private prisma: PrismaClient
  private eventBus: WebSocketEventBus
  private taskQueue: TaskQueue
  private runner: LangGraphRunner
  private runningTasks = new Map<string, boolean>()

  constructor(prisma: PrismaClient, eventBus: WebSocketEventBus) {
    this.prisma = prisma
    this.eventBus = eventBus
    this.taskQueue = new TaskQueue()
    this.runner = new LangGraphRunner(prisma)

    // Subscribe to core events
    this.eventBus.on('order:created', this.handleOrderCreated.bind(this))
    this.eventBus.on('order:delivered', this.handleOrderDelivered.bind(this))
    this.eventBus.on('store:stock-low', this.handleStockLow.bind(this))
    this.eventBus.on('promo:rejected', this.handlePromoRejected.bind(this))
  }

  async start() {
    console.log('🎯 Agent Orchestrator started')

    // Load pending tasks from DB
    const pendingTasks = await this.prisma.agentTask.findMany({
      where: { status: 'pending' },
      orderBy: { priority: 'asc' }
    })

    for (const task of pendingTasks) {
      this.taskQueue.enqueue(task)
    }

    // Start processing loop
    this.processQueue()
  }

  async stop() {
    console.log('🛑 Agent Orchestrator stopping')
    for (const [taskId] of this.runningTasks) {
      await this.cancelTask(taskId)
    }
  }

  private async processQueue() {
    setInterval(async () => {
      const task = this.taskQueue.dequeue()
      if (task && !this.runningTasks.has(task.id)) {
        this.executeTask(task).catch(console.error)
      }
    }, 100)
  }

  private async executeTask(task: any) {
    this.runningTasks.set(task.id, true)

    await this.prisma.agentTask.update({
      where: { id: task.id },
      data: { status: 'running', startedAt: new Date() }
    })

    await this.log(task.id, 'info', `Starting ${task.agentType} task`)

    try {
      const input = JSON.parse(task.inputJson)
      const runnerResult = await this.runner.runAgent(task.agentType as AgentTypes, input)

      await this.prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          outputJson: JSON.stringify(runnerResult.result),
          completedAt: new Date()
        }
      })

      // Emit completion event for downstream systems
      this.eventBus.emit('task:completed', {
        taskId: task.id,
        agentType: task.agentType,
        result: runnerResult.result
      })

      await this.log(task.id, 'info', `Task completed successfully`)
    } catch (error) {
      await this.prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date()
        }
      })

      this.eventBus.emit('task:failed', {
        taskId: task.id,
        agentType: task.agentType,
        error: error instanceof Error ? error.message : String(error)
      })

      await this.log(task.id, 'error', `Task failed: ${error}`)
    } finally {
      this.runningTasks.delete(task.id)
      this.taskQueue.releaseProcessing()
    }
  }

  private async handleOrderCreated(event: any) {
    // Sales agent: conversational upsell
    // Dispatch agent: optimize route
    await this.createTask({
      agentType: 'sales',
      inputJson: JSON.stringify({
        type: 'order_created',
        orderId: event.orderId,
        customerPhone: event.customerPhone,
        storeId: event.storeId
      }),
      priority: 3
    })

    await this.createTask({
      agentType: 'dispatch',
      inputJson: JSON.stringify({
        type: 'optimize_dispatch',
        orderId: event.orderId,
        storeLat: event.storeLat,
        storeLng: event.storeLng,
        customerLat: event.customerLat,
        customerLng: event.customerLng
      }),
      priority: 1
    })
  }

  private async handleOrderDelivered(event: any) {
    await this.createTask({
      agentType: 'accounting',
      inputJson: JSON.stringify({
        type: 'settle_order',
        orderId: event.orderId,
        totalLyd: event.totalLyd
      }),
      priority: 4
    })

    await this.createTask({
      agentType: 'customer_intel',
      inputJson: JSON.stringify({
        type: 'update_customer_profile',
        customerPhone: event.customerPhone,
        orderValue: event.totalLyd
      }),
      priority: 6
    })
  }

  private async handleStockLow(event: any) {
    await this.createTask({
      agentType: 'procurement',
      inputJson: JSON.stringify({
        type: 'reorder',
        storeId: event.storeId,
        productId: event.productId,
        threshold: event.threshold
      }),
      priority: 2
    })
  }

  private async handlePromoRejected(event: any) {
    await this.createTask({
      agentType: 'revenue',
      inputJson: JSON.stringify({
        type: 'analyze_promo_rejet',
        code: event.code,
        subtotal: event.subtotal
      }),
      priority: 5
    })
  }

  private async createTask(data: any) {
    await this.prisma.agentTask.create({ data })
  }

  private async log(taskId: string, level: string, message: string, metadataJson?: string) {
    await this.prisma.agentLog.create({
      data: {
        taskId,
        level,
        message,
        metadataJson
      }
    })
  }

  private async cancelTask(taskId: string) {
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'cancelled' }
    })
  }
}
