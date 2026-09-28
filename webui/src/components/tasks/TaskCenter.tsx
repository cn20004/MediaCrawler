import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, RotateCcw, Trash2, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { taskApi, type CrawlerTask } from '@/lib/api'

function statusVariant(status: string): 'default' | 'running' | 'outline' {
  if (status === 'running') return 'running'
  return status === 'success' ? 'default' : 'outline'
}

function taskSummary(task: CrawlerTask) {
  const cfg = task.config || {}
  const target =
    cfg.crawler_type === 'search'
      ? cfg.keywords
      : cfg.crawler_type === 'detail'
        ? cfg.specified_ids
        : cfg.creator_ids
  return target || '-'
}

export function TaskCenter() {
  const [tasks, setTasks] = useState<CrawlerTask[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await taskApi.list(30)
      setTasks(data.tasks)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 5000)
    return () => window.clearInterval(timer)
  }, [load])

  const counts = useMemo(() => ({
    running: tasks.filter((t) => t.status === 'running').length,
    success: tasks.filter((t) => t.status === 'success').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    stopped: tasks.filter((t) => t.status === 'stopped').length,
  }), [tasks])

  const retry = async (task: CrawlerTask) => {
    try {
      await taskApi.retry(task.id)
      toast.success(`任务 ${task.id} 已重新启动`)
      await load()
    } catch (error) {
      toast.error('重新启动失败，请检查是否已有任务正在运行')
      console.error(error)
    }
  }

  const remove = async (task: CrawlerTask) => {
    try {
      await taskApi.remove(task.id)
      setTasks((items) => items.filter((x) => x.id !== task.id))
      toast.success('任务记录已删除')
    } catch (error) {
      toast.error('删除任务记录失败')
      console.error(error)
    }
  }

  return (
    <section className="glass-panel rounded-lg border border-cyber-border-subtle overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-2 min-w-0"
        >
          <History className="w-4 h-4 text-cyber-neon-cyan" />
          <span className="font-mono font-semibold text-sm text-cyber-text-primary">任务中心</span>
          <span className="font-mono text-[10px] text-cyber-text-muted">郑老师魔改版 v0.2</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyber-text-muted">运行 {counts.running}</span>
          <span className="text-[10px] font-mono text-cyber-text-muted">成功 {counts.success}</span>
          <span className="text-[10px] font-mono text-cyber-text-muted">失败 {counts.failed}</span>
          <span className="text-[10px] font-mono text-cyber-text-muted">停止 {counts.stopped}</span>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-cyber-border-subtle max-h-44 overflow-auto">
          {tasks.length === 0 ? (
            <div className="px-3 py-4 text-xs font-mono text-cyber-text-muted">
              暂无任务历史。下一次启动采集后会自动记录，程序重启后记录仍然保留。
            </div>
          ) : (
            <div className="divide-y divide-cyber-border-subtle">
              {tasks.map((task) => (
                <div key={task.id} className="px-3 py-2 flex items-center gap-3 text-xs font-mono">
                  <Badge variant={statusVariant(task.status)} className="min-w-14 justify-center text-[10px]">
                    {task.status}
                  </Badge>
                  <span className="text-cyber-text-muted w-24 truncate">{task.id}</span>
                  <span className="text-cyber-text-secondary w-14">{task.config?.platform || '-'}</span>
                  <span className="text-cyber-text-secondary w-16">{task.config?.crawler_type || '-'}</span>
                  <span className="text-cyber-text-primary flex-1 truncate" title={taskSummary(task)}>
                    {taskSummary(task)}
                  </span>
                  <span className="text-cyber-text-muted hidden xl:block">
                    {task.started_at ? new Date(task.started_at).toLocaleString() : '-'}
                  </span>
                  {(task.status === 'failed' || task.status === 'stopped' || task.status === 'success') && (
                    <Button variant="ghost" size="sm" onClick={() => retry(task)} title="按原配置重新运行">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(task)} title="删除这条历史记录">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
