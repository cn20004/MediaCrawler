import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface CrawlerConfig {
  platform: string
  login_type: string
  crawler_type: string
  keywords: string
  start_page: number
  enable_comments: boolean
  enable_sub_comments: boolean
  save_option: string
  cookies: string
  headless: boolean
}

export interface CrawlerStatus {
  status: 'idle' | 'running' | 'stopping' | 'error'
  platform: string | null
  crawler_type: string | null
  started_at: string | null
  task_id: string | null
  error_message: string | null
}

export interface LogEntry {
  id: number
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success' | 'debug'
  message: string
}

export interface DataFile {
  name: string
  path: string
  size: number
  modified_at: number
  record_count: number | null
  type: string
}

export interface FilePreviewResponse {
  data: Record<string, unknown>[]
  total: number
  columns?: string[]
}

export interface Platform {
  value: string
  label: string
  icon: string
}

export interface ConfigOption {
  value: string
  label: string
}

// API functions
export const crawlerApi = {
  start: (config: CrawlerConfig) => api.post('/crawler/start', config),
  stop: () => api.post('/crawler/stop'),
  getStatus: () => api.get<CrawlerStatus>('/crawler/status'),
  getLogs: (limit = 100) => api.get<{ logs: LogEntry[] }>('/crawler/logs', { params: { limit } }),
}

export const dataApi = {
  getFiles: (platform?: string, fileType?: string) =>
    api.get<{ files: DataFile[] }>('/data/files', { params: { platform, file_type: fileType } }),
  getFileContent: (path: string, limit = 100) =>
    api.get<FilePreviewResponse>('/data/files/' + path, { params: { preview: true, limit } }),
  getStats: () => api.get('/data/stats'),
  getDownloadUrl: (path: string) => `/api/data/download/${path}`,
}

export const configApi = {
  getPlatforms: () => api.get<{ platforms: Platform[] }>('/config/platforms'),
  getOptions: () =>
    api.get<{
      login_types: ConfigOption[]
      crawler_types: ConfigOption[]
      save_options: ConfigOption[]
    }>('/config/options'),
}

export interface CrawlerTask {
  id: string
  status: 'running' | 'success' | 'failed' | 'stopped'
  created_at: string
  started_at: string | null
  finished_at: string | null
  exit_code: number | null
  error: string | null
  retry_of: string | null
  config: Record<string, any>
}

export const taskApi = {
  list: (limit = 100, status?: string) =>
    api.get<{ tasks: CrawlerTask[] }>('/tasks', { params: { limit, status } }),
  get: (taskId: string) => api.get<CrawlerTask>(`/tasks/${taskId}`),
  retry: (taskId: string) => api.post(`/tasks/${taskId}/retry`),
  remove: (taskId: string) => api.delete(`/tasks/${taskId}`),
  clear: (status?: string) => api.delete('/tasks', { params: { status } }),
}

export interface WatchlistItem {
  id: string
  platform: string
  creator_id: string
  name: string
  note: string
  enabled: boolean
  created_at: string
  updated_at: string
  last_checked_at: string | null
  last_task_id: string | null
  last_status: string | null
}

export const watchlistApi = {
  list: () => api.get<{ items: WatchlistItem[] }>('/watchlist'),
  add: (payload: { platform: string; creator_id: string; name?: string; note?: string; enabled?: boolean }) =>
    api.post<WatchlistItem>('/watchlist', payload),
  update: (id: string, payload: Partial<Pick<WatchlistItem, 'name' | 'note' | 'enabled'>>) =>
    api.patch<WatchlistItem>(`/watchlist/${id}`, payload),
  remove: (id: string) => api.delete(`/watchlist/${id}`),
  check: (id: string) => api.post(`/watchlist/${id}/check`),
}

export interface EnvCheckResult {
  success: boolean
  message: string
  output?: string
  error?: string
}

export const envApi = {
  check: () => api.get<EnvCheckResult>('/env/check'),
}

export default api
