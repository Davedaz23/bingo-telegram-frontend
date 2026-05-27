import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  User,
  Game,
  BingoCard,
  Transaction,
  Withdrawal,
  AdminDashboard,
  DepositRequest,
  DepositAccounts,
} from '@/types'

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/')) {
        window.location.href = '/'
      }
    }
    return Promise.reject(err)
  }
)

function normalizeUser(u: Record<string, unknown>): User {
  return {
    _id: (u._id as string) || (u.id as string) || '',
    telegramId: u.telegramId as string,
    username: u.username as string | undefined,
    firstName: u.firstName as string,
    lastName: u.lastName as string | undefined,
    role: u.role as User['role'],
    balance: (u.balance as number) || 0,
    isActive: (u.isActive as boolean) ?? true,
    languageCode: (u.languageCode as string) || 'en',
    lastSeen: u.lastSeen as string | undefined,
    createdAt: (u.createdAt as string) || '',
  }
}

// ─── Auth ─────────────────────────────────────────────────────────

export async function authTelegram(initData: string): Promise<{ token: string; user: User }> {
  const { data } = await api.post('/api/auth/telegram', { initData })
  if (!data.success) throw new Error(data.message || 'Auth failed')
  return { token: data.token as string, user: normalizeUser(data.user) }
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get('/api/auth/me')
  if (!data.success || !data.user) throw new Error(data.message || 'Failed to get profile')
  return normalizeUser(data.user)
}

// ─── Games ────────────────────────────────────────────────────────

export async function getGames(): Promise<Game[]> {
  const { data } = await api.get('/api/games')
  return (data.games || []) as Game[]
}

export async function getGame(id: string): Promise<Game> {
  const { data } = await api.get(`/api/games/${id}`)
  if (!data.success || !data.game) throw new Error(data.message || 'Game not found')
  return data.game as Game
}

export async function getGameCards(gameId: string): Promise<BingoCard[]> {
  const { data } = await api.get(`/api/games/${gameId}/cards`)
  return (data.cards || []) as BingoCard[]
}

export async function selectCard(gameId: string, cardId: string): Promise<{ card: BingoCard; prizePool?: number }> {
  const { data } = await api.post(`/api/games/${gameId}/cards/${cardId}/select`)
  if (!data.success) throw new Error(data.message || 'Failed to select card')
  return { card: data.card as BingoCard, prizePool: data.prizePool as number | undefined }
}

export async function releaseCardApi(gameId: string, cardId: string): Promise<void> {
  const { data } = await api.post(`/api/games/${gameId}/cards/${cardId}/release`)
  if (!data.success) throw new Error(data.message || 'Failed to release card')
}

export async function purchaseCardApi(gameId: string, cardId: string): Promise<void> {
  const { data } = await api.post(`/api/games/${gameId}/cards/${cardId}/purchase`)
  if (!data.success) throw new Error(data.message || 'Failed to purchase card')
}

export async function claimBingoApi(gameId: string): Promise<void> {
  const { data } = await api.post(`/api/games/${gameId}/bingo`)
  if (!data.success) throw new Error(data.message || 'Failed to claim bingo')
}

export async function getGameHistory(): Promise<Game[]> {
  const { data } = await api.get('/api/games/history')
  return (data.games || []) as Game[]
}

// ─── Payments / Deposits ──────────────────────────────────────────

export async function getBalance(): Promise<number> {
  const { data } = await api.get('/api/payments/balance')
  if (!data.success) throw new Error('Failed to get balance')
  return (data.balance as number) || 0
}

export async function getDepositAccounts(): Promise<DepositAccounts> {
  const { data } = await api.get('/api/payments/deposit/accounts')
  if (!data.success) throw new Error('Failed to get deposit accounts')
  return data.accounts as DepositAccounts
}

export async function requestSmsDeposit(amount: number, channel: string, smsText: string): Promise<void> {
  const { data } = await api.post('/api/payments/deposit', { amount, channel, smsText })
  if (!data.success) throw new Error(data.message || 'Deposit request failed')
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data } = await api.get('/api/payments/transactions')
  return (data.transactions || []) as Transaction[]
}

export async function transfer(toTelegramId: string, amount: number): Promise<void> {
  const { data } = await api.post('/api/payments/transfer', { toTelegramId, amount })
  if (!data.success) throw new Error(data.message || 'Transfer failed')
}

// ─── Withdrawals ──────────────────────────────────────────────────

export async function createWithdrawalApi(wd: {
  amount: number
  accountNumber: string
  bankName?: string
  accountName?: string
}): Promise<{ withdrawal: Withdrawal }> {
  const { data } = await api.post('/api/withdrawals', wd)
  if (!data.success) throw new Error(data.message || 'Failed to create withdrawal')
  return { withdrawal: data.withdrawal as Withdrawal }
}

export async function getWithdrawals(): Promise<Withdrawal[]> {
  const { data } = await api.get('/api/withdrawals')
  return (data.withdrawals || []) as Withdrawal[]
}

// ─── Admin ────────────────────────────────────────────────────────

export async function getAdminDashboardData(): Promise<AdminDashboard> {
  const { data } = await api.get('/api/admin/dashboard')
  if (!data.success) throw new Error(data.message || 'Failed to load dashboard')
  return {
    stats: data.stats as AdminDashboard['stats'],
    recentTransactions: (data.recentTransactions || []) as Transaction[],
  }
}

export async function adminCreateGame(): Promise<void> {
  const { data } = await api.post('/api/admin/games')
  if (!data.success) throw new Error(data.message || 'Failed to create game')
}

export async function adminStartGame(id: string): Promise<void> {
  const { data } = await api.post(`/api/admin/games/${id}/start`)
  if (!data.success) throw new Error(data.message || 'Failed to start game')
}

export async function adminCancelGame(id: string): Promise<void> {
  const { data } = await api.post(`/api/admin/games/${id}/cancel`)
  if (!data.success) throw new Error(data.message || 'Failed to cancel game')
}

export async function adminGetUsers(): Promise<User[]> {
  const { data } = await api.get('/api/admin/users')
  return ((data.users || []) as Record<string, unknown>[]).map(normalizeUser)
}

export async function adminBanUser(id: string): Promise<void> {
  const { data } = await api.post(`/api/admin/users/${id}/ban`)
  if (!data.success) throw new Error(data.message || 'Failed to ban user')
}

export async function adminCreditUser(id: string, amount: number): Promise<void> {
  const { data } = await api.post(`/api/admin/users/${id}/credit`, { amount })
  if (!data.success) throw new Error(data.message || 'Failed to credit user')
}

// Admin: SMS Deposits
export async function adminGetDepositRequests(): Promise<DepositRequest[]> {
  const { data } = await api.get('/api/admin/deposits')
  return (data.deposits || []) as DepositRequest[]
}

export async function adminMatchSmsDeposit(id: string, adminSmsText: string): Promise<void> {
  const { data } = await api.post(`/api/admin/deposits/${id}/match`, { adminSmsText })
  if (!data.success) throw new Error(data.message || 'Failed to match SMS')
}

export async function adminConfirmDeposit(id: string): Promise<void> {
  const { data } = await api.post(`/api/admin/deposits/${id}/confirm`)
  if (!data.success) throw new Error(data.message || 'Failed to confirm deposit')
}

// Admin: Withdrawals
export async function adminGetWithdrawals(): Promise<Withdrawal[]> {
  const { data } = await api.get('/api/admin/withdrawals')
  return (data.withdrawals || []) as Withdrawal[]
}

export async function adminApproveWithdrawal(id: string): Promise<void> {
  const { data } = await api.post(`/api/admin/withdrawals/${id}/approve`)
  if (!data.success) throw new Error(data.message || 'Failed to approve withdrawal')
}

export async function adminRejectWithdrawal(id: string): Promise<void> {
  const { data } = await api.post(`/api/admin/withdrawals/${id}/reject`, { reason: 'Rejected by admin' })
  if (!data.success) throw new Error(data.message || 'Failed to reject withdrawal')
}
