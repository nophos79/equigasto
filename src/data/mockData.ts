import { UserProfile, Group, Movement } from '../core/types';

export const CURRENT_USER: UserProfile = {
  id: 'user-1',
  name: 'Ana Martín',
  email: 'ana.martin@example.com',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  isProvisional: false,
};

export const MOCK_USERS: UserProfile[] = [
  CURRENT_USER,
  {
    id: 'user-2',
    name: 'Luis Gómez',
    email: 'luis.gomez@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isProvisional: false,
  },
  {
    id: 'user-3',
    name: 'Marta Sánchez',
    email: 'marta.sanchez@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    isProvisional: false,
  },
  {
    id: 'user-4',
    name: 'Carlos Ruiz (Pendiente)',
    email: null,
    isProvisional: true, // Invitado sin registrar aún
  },
  {
    id: 'user-5',
    name: 'Elena Torres (Pendiente)',
    email: null,
    isProvisional: true, // Invitado sin registrar aún
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: 'group-1',
    name: 'Viaje a Lisboa 🇵🇹',
    description: 'Escapada de fin de semana en mayo',
    icon: '✈️',
    category: 'trip',
    createdBy: 'user-1',
    createdAt: '2026-05-10T10:00:00Z',
    defaultSplitMode: 'EQUAL',
    members: [
      { userId: 'user-1', role: 'ADMIN', percentage: 33.34 },
      { userId: 'user-2', role: 'MEMBER', percentage: 33.33 },
      { userId: 'user-3', role: 'MEMBER', percentage: 33.33 },
    ],
  },
  {
    id: 'group-2',
    name: 'Piso Lavapiés 🏠',
    description: 'Gastos mensuales y suministros del piso',
    icon: '🏡',
    category: 'home',
    createdBy: 'user-1',
    createdAt: '2026-01-01T08:00:00Z',
    defaultSplitMode: 'PERCENTAGE',
    members: [
      { userId: 'user-1', role: 'ADMIN', percentage: 50 },
      { userId: 'user-2', role: 'MEMBER', percentage: 30 },
      { userId: 'user-3', role: 'MEMBER', percentage: 20 },
    ],
  },
  {
    id: 'group-3',
    name: 'Amigos Pádel 🎾',
    description: 'Reservas de pistas, bolas y cañas post-partido',
    icon: '🎾',
    category: 'friends',
    createdBy: 'user-2',
    createdAt: '2026-03-15T18:00:00Z',
    defaultSplitMode: 'EQUAL',
    members: [
      { userId: 'user-1', role: 'MEMBER', percentage: 25 },
      { userId: 'user-2', role: 'ADMIN', percentage: 25 },
      { userId: 'user-4', role: 'MEMBER', percentage: 25 }, // Carlos (provisional)
      { userId: 'user-5', role: 'MEMBER', percentage: 25 }, // Elena (provisional)
    ],
  },
];

export const MOCK_MOVEMENTS: Movement[] = [
  // Movimiento 1: Gasto compartido en Lisboa (Cena Barrio Alto)
  // Ana pagó 120 €, partes iguales entre 3 (40 € cada uno)
  {
    id: 'mov-1',
    groupId: 'group-1',
    type: 'SHARED_EXPENSE',
    concept: 'Cena en Barrio Alto',
    amountCents: 12000,
    paidById: 'user-1',
    splitMode: 'EQUAL',
    date: '2026-05-12T21:30:00Z',
    createdAt: '2026-05-12T21:40:00Z',
    shares: [
      { userId: 'user-1', amountCents: 4000 },
      { userId: 'user-2', amountCents: 4000 },
      { userId: 'user-3', amountCents: 4000 },
    ],
  },
  // Movimiento 2: Gasto compartido en Lisboa (Uber aeropuerto)
  // Luis pagó 45 €, partes iguales entre 3 (15 € cada uno)
  {
    id: 'mov-2',
    groupId: 'group-1',
    type: 'SHARED_EXPENSE',
    concept: 'Uber aeropuerto al centro',
    amountCents: 4500,
    paidById: 'user-2',
    splitMode: 'EQUAL',
    date: '2026-05-11T12:00:00Z',
    createdAt: '2026-05-11T12:15:00Z',
    shares: [
      { userId: 'user-1', amountCents: 1500 },
      { userId: 'user-2', amountCents: 1500 },
      { userId: 'user-3', amountCents: 1500 },
    ],
  },
  // Movimiento 3: Gasto individual (Ana adelanta billete de tranvía a Luis)
  // Ana paga 15 € correspondientes íntegramente a Luis
  {
    id: 'mov-3',
    groupId: 'group-1',
    type: 'INDIVIDUAL_EXPENSE',
    concept: 'Abono tranvía 28 para Luis',
    amountCents: 1500,
    paidById: 'user-1',
    recipientId: 'user-2',
    date: '2026-05-12T10:15:00Z',
    createdAt: '2026-05-12T10:20:00Z',
    shares: [
      { userId: 'user-2', amountCents: 1500 },
    ],
  },
  // Movimiento 4: Préstamo entre miembros
  // Ana presta 50 € en efectivo a Luis en Lisboa
  {
    id: 'mov-4',
    groupId: 'group-1',
    type: 'LOAN',
    concept: 'Efectivo para compras en mercadillo',
    amountCents: 5000,
    paidById: 'user-1',
    recipientId: 'user-2',
    date: '2026-05-13T16:00:00Z',
    createdAt: '2026-05-13T16:05:00Z',
    shares: [
      { userId: 'user-2', amountCents: 5000 },
    ],
  },
  // Movimiento 5: Liquidación (Luis devuelve 60 € a Ana por Bizum)
  {
    id: 'mov-5',
    groupId: 'group-1',
    type: 'SETTLEMENT',
    concept: 'Bizum devolución parcial',
    amountCents: 6000,
    paidById: 'user-2',
    recipientId: 'user-1',
    date: '2026-05-14T09:30:00Z',
    createdAt: '2026-05-14T09:35:00Z',
    shares: [],
  },
  // Movimiento 6: En Piso Lavapiés (Reparto porcentual 50/30/20)
  // Ana paga internet y fibra: 60 € -> Ana 30€ (50%), Luis 18€ (30%), Marta 12€ (20%)
  {
    id: 'mov-6',
    groupId: 'group-2',
    type: 'SHARED_EXPENSE',
    concept: 'Fibra y Wifi Mayo',
    amountCents: 6000,
    paidById: 'user-1',
    splitMode: 'PERCENTAGE',
    date: '2026-05-01T10:00:00Z',
    createdAt: '2026-05-01T10:05:00Z',
    shares: [
      { userId: 'user-1', amountCents: 3000, percentage: 50 },
      { userId: 'user-2', amountCents: 1800, percentage: 30 },
      { userId: 'user-3', amountCents: 1200, percentage: 20 },
    ],
  },
  // Movimiento 7: En Amigos Pádel con participante provisional
  // Luis pagó pista 28 € entre 4 (7 € cada uno)
  {
    id: 'mov-7',
    groupId: 'group-3',
    type: 'SHARED_EXPENSE',
    concept: 'Pista de cristal 90 min',
    amountCents: 2800,
    paidById: 'user-2',
    splitMode: 'EQUAL',
    date: '2026-05-08T19:00:00Z',
    createdAt: '2026-05-08T19:05:00Z',
    shares: [
      { userId: 'user-1', amountCents: 700 },
      { userId: 'user-2', amountCents: 700 },
      { userId: 'user-4', amountCents: 700 }, // Carlos (provisional)
      { userId: 'user-5', amountCents: 700 }, // Elena (provisional)
    ],
  },
];
