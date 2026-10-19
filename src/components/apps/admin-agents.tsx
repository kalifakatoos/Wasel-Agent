import React, { useState, useEffect } from 'react'
import { Bot, Cpu, Sparkles, ShoppingBag, Truck, DollarSign, BarChart3, ShieldCheck, Zap, RefreshCw, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AgentStatus {
  agentType: string
  _count: { _all: number }
}

export function AdminAgentsTab() {
  const [activeAgents, setActiveAgents] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('procurement')
  const [inputData, setInputData] = useState<string>('{"productName": "شواحن هواتف ذكية بالجملة", "requiredQty": 200}')
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [executing, setExecuting] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3020/api/agents/status')
      if (res.ok) {
        const data = await res.json()
        setActiveAgents(data.activeAgents || [])
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err)
    }
  }

  useEffect(() => {
    void fetchStatus()
    const timer = setInterval(() => { void fetchStatus() }, 5000)
    return () => clearInterval(timer)
  }, [])

  const runAgentTask = async () => {
    setExecuting(true)
    setExecutionResult(null)
    try {
      let parsedInput = {}
      try {
        parsedInput = JSON.parse(inputData)
      } catch {
        parsedInput = { rawText: inputData }
      }

      const res = await fetch('http://localhost:3020/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: selectedAgent, input: parsedInput })
      })

      const data = await res.json()
      setExecutionResult(data)
      void fetchStatus()
    } catch (err: any) {
      setExecutionResult({ error: err.message })
    } finally {
      setExecuting(false)
    }
  }

  const agentDefinitions = [
    { type: 'sales', name: 'وكيل المبيعات والاقناع', icon: Sparkles, desc: 'يتفاعل مع الزبائن، يعرض المنتجات، ويقترح البدائل والعروض المخصصة بذكاء.' },
    { type: 'procurement', name: 'وكيل المشتريات والجملة', icon: ShoppingBag, desc: 'يبحث في Alibaba و 1688 و AliExpress، يحسب أقل كمية طلب (MOQ)، والشحن والتخليص.' },
    { type: 'dispatch', name: 'وكيل التوصيل والأسطول', icon: Truck, desc: 'يحسن مسارات السائقين، يوزع الطلبات بناءً على الموقع الجغرافي وحمولة الكابتن.' },
    { type: 'accounting', name: 'وكيل المحاسبة المزدوجة', icon: DollarSign, desc: 'يفصل التسويات المالية آلياً بين حصة التاجر، عمولة المنصة، ورسوم السائق بدقة متناهية.' },
    { type: 'revenue', name: 'وكيل الإيرادات والاستثمار', icon: BarChart3, desc: 'يحلل هوامش الربح، يراقب تدفق السيولة، ويقترح استراتيجيات التسعير الديناميكي.' },
    { type: 'customer_intel', name: 'وكيل استخبارات العملاء', icon: ShieldCheck, desc: 'يتوقع الاحتياجات، يكتشف السلات المتروكة، ويعيد استهداف الزبائن بعروض مدروسة.' },
    { type: 'ops_monitor', name: 'وكيل العمليات والمراقبة', icon: Cpu, desc: 'يراقب صحة الخدمات، يكتشف الاختناقات في الوقت الفعلي، ويدير الطوارئ.' },
  ]

  return (
    <div className="space-y-6">
      {/* 🟢 رأس لوحة الذكاء الاصطناعي */}
      <div className="relative overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.3)] bg-gradient-to-l from-[#062319] via-[#093022] to-[#062319] p-6 shadow-xl">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[rgba(212,175,55,0.1)] blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(212,175,55,0.18)] text-[#F5D061] shadow">
                <Bot className="h-5 w-5 animate-pulse" />
              </span>
              <h2 className="text-xl font-extrabold text-[#F8F5EE]">شبكة وكلاء الذكاء الاصطناعي (Multi-Agent System)</h2>
            </div>
            <p className="mt-1.5 text-[13px] text-[#938E7E]">
              نظام تشغيل ذكي متكامل لادارة المبيعات، المشتريات الدولية (Alibaba/1688)، التوصيل، والمحاسبة بشكل آلي بالكامل.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] px-3.5 py-2 text-[12.5px] font-bold text-[#10B981]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] animate-ping" />
              wasel-agents v1.0 نشط على المنفذ 3020
            </span>
            <Button
              onClick={() => void fetchStatus()}
              variant="outline"
              size="sm"
              className="border-[rgba(212,175,55,0.3)] bg-[#041710] text-[#F5D061] hover:bg-[#062319]"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث الحالة
            </Button>
          </div>
        </div>
      </div>

      {/* 🤖 بطاقات الوكلاء السبعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agentDefinitions.map((agent) => {
          const activeCount = activeAgents.find(a => a.agentType === agent.type)?._count._all || 0
          const isSelected = selectedAgent === agent.type

          return (
            <div
              key={agent.type}
              onClick={() => setSelectedAgent(agent.type)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-[rgba(212,175,55,0.6)] bg-gradient-to-b from-[#093022] to-[#062319] shadow-lg shadow-[rgba(212,175,55,0.15)] ring-1 ring-[rgba(212,175,55,0.4)]'
                  : 'border-[rgba(212,175,55,0.15)] bg-[#041710]/70 hover:border-[rgba(212,175,55,0.35)] hover:bg-[#062319]/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(212,175,55,0.12)] text-[#F5D061]">
                  <agent.icon className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  activeCount > 0
                    ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
                    : 'bg-[rgba(147,142,126,0.1)] text-[#938E7E] border border-[rgba(147,142,126,0.2)]'
                }`}>
                  {activeCount > 0 ? `${activeCount} مهام نشطة` : 'جاهز للعمل'}
                </span>
              </div>
              <h3 className="mt-3 text-[14.5px] font-extrabold text-[#F8F5EE]">{agent.name}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#938E7E] line-clamp-2">{agent.desc}</p>
            </div>
          )
        })}
      </div>

      {/* ⚡ لوحة تشخيص واختبار الوكيل المختار */}
      <div className="rounded-2xl border border-[rgba(212,175,55,0.25)] bg-[#041710]/90 p-6 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.15)] pb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#F5D061]" />
            <h3 className="text-base font-extrabold text-[#F8F5EE]">
              تنفيذ مهمة فورية لـ: <span className="gold-text">{agentDefinitions.find(a => a.type === selectedAgent)?.name}</span>
            </h3>
          </div>
          <span className="text-[11px] text-[#938E7E] font-mono">POST /api/agents/run</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[12.5px] font-bold text-[#C7D2FE]">مدخلات المهمة (JSON أو نص حر):</label>
            <textarea
              rows={5}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#062319] p-3 text-[13px] text-[#F8F5EE] font-mono focus:border-[#F5D061] focus:outline-none"
              placeholder='{"productName": "شواحن هواتف", "requiredQty": 100}'
            />
            <Button
              disabled={executing}
              onClick={() => void runAgentTask()}
              className="gold-sweep w-full min-h-12 bg-gradient-to-l from-[#D4AF37] to-[#F5D061] text-[13.5px] font-extrabold text-[#041710] hover:from-[#C59B27] hover:to-[#D4AF37]"
            >
              <Send className="h-4 w-4" />
              {executing ? 'جارٍ تنفيذ الوكيل واستخراج النتائج...' : 'تشغيل الوكيل الآن'}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-[12.5px] font-bold text-[#C7D2FE]">نتائج التنفيذ والذكاء الاصطناعي:</label>
            <div className="h-[185px] w-full overflow-y-auto rounded-xl border border-[rgba(212,175,55,0.2)] bg-[#020D09] p-3 font-mono text-[12px] text-[#A7F3D0]">
              {executing && (
                <div className="flex items-center justify-center h-full gap-2 text-[#F5D061]">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>الوكيل يعالج الطلب ويحلل الأسواق...</span>
                </div>
              )}
              {!executing && !executionResult && (
                <span className="text-[#938E7E]">اضغط على "تشغيل الوكيل الآن" لاختبار الوكيل واستعراض المخرجات هنا...</span>
              )}
              {!executing && executionResult && (
                <pre className="whitespace-pre-wrap">{JSON.stringify(executionResult, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
