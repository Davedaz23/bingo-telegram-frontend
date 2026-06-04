export interface User {
  _id: string
  id?: string
  telegramId: string
  username?: string
  firstName: string
  lastName?: string
  role: 'user' | 'admin' | 'super_admin'
  balance: number
  isActive: boolean
  languageCode: string
  lastSeen?: string
  createdAt: string
}

export interface CardData {
  B: number[]
  I: number[]
  N: number[]
  G: number[]
  O: number[]
}

export interface WinningLine {
  type: 'row' | 'column' | 'diagonal' | 'full_card' | 'four_corners'
  index?: number
}

export interface GameWinner {
  userId: string
  telegramId?: string
  cardId?: string
  prizeAmount?: number
  winningNumber?: number
  claimedAt?: string
  winningLine?: WinningLine
}

export interface Game {
  _id: string
  gameCode: string
  status: 'selection' | 'starting' | 'active' | 'finished' | 'cancelled' | 'refunding'
  prizePool: number
  cardPrice: number
  platformFeePercent: number
  maxPlayers: number
  minPlayers: number
  drawnNumbers: number[]
  winner?: GameWinner
  countdownStartedAt?: string
  startedAt?: string
  finishedAt?: string
  endedAt?: string
  players?: PlayerInfo[]
  createdAt: string
  totalCards?: number
  purchasedCards?: number
}

export interface PlayerInfo {
  userId: string
  firstName: string
  cardCount?: number
  joinedAt?: string
}

export interface BingoCard {
  _id: string
  cardNumber: number
  status: 'available' | 'selected' | 'purchased' | 'released'
  price?: number
  isLockedByMe?: boolean
  isOwnedByMe?: boolean
  card?: CardData
  grid?: CardCell[][]
  lockExpiresAt?: string
  lockedBy?: string
  ownerId?: string
}

export interface CardCell {
  column: string
  number: number
  marked: boolean
}

export interface Transaction {
  _id: string
  userId?: string
  type: 'deposit' | 'withdrawal' | 'transfer' | 'card_purchase' | 'game_win' | 'refund' | 'platform_fee'
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  description?: string
  reference?: string
  createdAt: string
}

export interface Withdrawal {
  _id: string
  userId?: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  accountNumber: string
  bankName?: string
  accountName?: string
  remark?: string
  createdAt: string
  processedAt?: string
}

export interface DepositRequest {
  _id: string
  userId: { _id: string; firstName: string; username?: string; telegramId: string }
  amount: number
  channel: string
  userSmsText: string
  adminSmsText?: string
  status: 'pending' | 'sms_matched' | 'completed' | 'rejected'
  matchedRef?: string
  createdAt: string
}

export interface AdminStats {
  users: { total: number; active: number }
  games: { total: number; active: number; completed: number }
  pendingWithdrawals: number
  pendingDeposits: number
  platformRevenue: number
}

export interface AdminDashboard {
  stats: AdminStats
  recentTransactions: Transaction[]
}

export interface DepositAccounts {
  cbe: string
  cbebirr: string
  abyssinia: string
  telebirr: string
  accountName: string
}
