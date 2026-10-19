import { AgentTask } from '@prisma/client'

export class TaskQueue {
  private queue: AgentTask[] = []
  private processing = false

  enqueue(task: AgentTask) {
    this.queue.push(task)
    // Keep queue sorted by priority (lower = higher priority)
    this.queue.sort((a, b) => a.priority - b.priority)
    console.log(`📥 Task enqueued: ${task.id} (${task.agentType})`)
  }

  dequeue(): AgentTask | undefined {
    if (this.processing) return undefined
    const task = this.queue.shift()
    if (task) {
      this.processing = true
      // Reset processing flag when task is picked up
      // The orchestrator handles resetting it in the finally block
    }
    return task
  }

  releaseProcessing() {
    this.processing = false
  }

  size(): number {
    return this.queue.length
  }
}