import { useEffect, useState } from 'react'
import { Eye, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { watchlistApi, type WatchlistItem } from '@/lib/api'

export function WatchlistPanel() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [platform, setPlatform] = useState('dy')
  const [creatorId, setCreatorId] = useState('')
  const [name, setName] = useState('')

  const load = async () => {
    try {
      const { data } = await watchlistApi.list()
      setItems(data.items)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { load() }, [])

  const add = async () => {
    if (!creatorId.trim()) return
    try {
      await watchlistApi.add({ platform, creator_id: creatorId.trim(), name: name.trim(), enabled: true })
      setCreatorId('')
      setName('')
      await load()
      toast.success('已加入同行监控')
    } catch (e) {
      toast.error('添加失败')
      console.error(e)
    }
  }

  return (
    <section className="glass-panel rounded-lg border border-cyber-border-subtle overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2">
        <Eye className="w-4 h-4 text-cyber-neon-cyan" />
        <span className="font-mono font-semibold text-sm">同行监控</span>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}
          className="ml-auto h-8 rounded-md bg-cyber-bg-tertiary border border-cyber-border-subtle px-2 text-xs font-mono">
          <option value="dy">抖音</option><option value="xhs">小红书</option><option value="bili">B站</option>
          <option value="ks">快手</option><option value="wb">微博</option><option value="zhihu">知乎</option><option value="tieba">贴吧</option>
        </select>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="账号备注名" className="h-8 w-32 text-xs" />
        <Input value={creatorId} onChange={(e) => setCreatorId(e.target.value)} placeholder="创作者ID/主页标识" className="h-8 w-56 text-xs" />
        <Button size="sm" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" />添加</Button>
      </div>
      {items.length > 0 && (
        <div className="border-t border-cyber-border-subtle max-h-36 overflow-auto divide-y divide-cyber-border-subtle">
          {items.map((item) => (
            <div key={item.id} className="px-3 py-2 flex items-center gap-3 text-xs font-mono">
              <span className="w-12 text-cyber-text-muted">{item.platform}</span>
              <span className="w-32 truncate text-cyber-text-primary">{item.name || '未命名'}</span>
              <span className="flex-1 truncate text-cyber-text-secondary">{item.creator_id}</span>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={item.enabled}
                  onChange={async (e) => { await watchlistApi.update(item.id, { enabled: e.target.checked }); await load() }} />
                启用
              </label>
              <Button size="sm" variant="ghost" disabled={!item.enabled}
                onClick={async () => {
                  try { await watchlistApi.check(item.id); toast.success('已启动该账号采集'); await load() }
                  catch (e) { toast.error('启动失败，可能已有任务在运行'); console.error(e) }
                }}>
                <Play className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost"
                onClick={async () => { await watchlistApi.remove(item.id); await load() }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
