export type SplitMode = 'EQUAL' | 'PERCENTAGE';

export type MovementType = 
  | 'SHARED_EXPENSE'       // Gasto compartido entre varios/todos
  | 'INDIVIDUAL_EXPENSE'   // Adelanto 100% asumido por un miembro
  | 'LOAN'                 // Préstamo directo entre dos miembros
  | 'SETTLEMENT'          // Devolución / liquidación de deuda
  | 'INCOME';              // Ingreso personal (en grupos individuales)

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  avatarUrl?: string;
  isApproved?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
}

export interface GroupMemberConfig {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  percentage: number; // Porcentaje por defecto en reparto porcentual (ej. 33.33)
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon: string; // Emoji o identificador de icono
  category: 'trip' | 'home' | 'friends' | 'food' | 'other';
  createdBy: string;
  createdAt: string;
  defaultSplitMode: SplitMode;
  members: GroupMemberConfig[];
}

export interface MovementShare {
  userId: string;
  amountCents: number; // Cantidad que asume en céntimos enteros
  percentage?: number;  // Porcentaje aplicado en su momento histórico
}

export interface Movement {
  id: string;
  groupId: string;
  type: MovementType;
  concept: string;
  amountCents: number;   // Importe total en céntimos (ej. 12050 = 120,50 €)
  paidById: string;      // Quien paga / presta / transfiere
  recipientId?: string;  // Quien recibe el préstamo, a quien se le adelanta o quien recibe liquidación
  splitMode?: SplitMode; // Para gastos compartidos ('EQUAL' | 'PERCENTAGE')
  date: string;          // ISO string
  createdAt: string;
  notes?: string;
  shares: MovementShare[];
}

export interface MemberBalance {
  userId: string;
  paidCents: number;        // Total que ha pagado/adelantado
  shouldPayCents: number;   // Total que le corresponde asumir
  netBalanceCents: number;  // paidCents - shouldPayCents (> 0 le deben, < 0 debe)
}

export interface SimplifiedDebt {
  fromUserId: string; // Quien debe pagar
  toUserId: string;   // Quien debe recibir el dinero
  amountCents: number;
}
