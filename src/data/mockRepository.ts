import { IDataRepository } from './repository';
import { Group, Movement, UserProfile, MemberBalance, SimplifiedDebt } from '../core/types';
import { MOCK_USERS, MOCK_GROUPS, MOCK_MOVEMENTS, CURRENT_USER } from './mockData';
import { calculateGroupBalances } from '../core/balance';
import { simplifyDebts } from '../core/simplify';

export class MockRepository implements IDataRepository {
  private users: UserProfile[] = [...MOCK_USERS];
  private groups: Group[] = [...MOCK_GROUPS];
  private movements: Movement[] = [...MOCK_MOVEMENTS];

  async getCurrentUser(): Promise<UserProfile> {
    return CURRENT_USER;
  }

  async getUsers(): Promise<UserProfile[]> {
    return [...this.users];
  }

  async getUserById(id: string): Promise<UserProfile | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getGroups(): Promise<Group[]> {
    return [...this.groups];
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    return this.groups.find(g => g.id === id);
  }

  async createGroup(groupData: Omit<Group, 'id' | 'createdAt'>): Promise<Group> {
    const newGroup: Group = {
      ...groupData,
      id: `group-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.groups.unshift(newGroup);
    return newGroup;
  }

  async getMovements(groupId?: string): Promise<Movement[]> {
    let list = [...this.movements];
    if (groupId) {
      list = list.filter(m => m.groupId === groupId);
    }
    // Ordenar cronológicamente descendente (más recientes primero)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getMovementById(id: string): Promise<Movement | undefined> {
    return this.movements.find(m => m.id === id);
  }

  async createMovement(movementData: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> {
    const newMovement: Movement = {
      ...movementData,
      id: `mov-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.movements.unshift(newMovement);
    return newMovement;
  }

  async deleteMovement(id: string): Promise<boolean> {
    const prevLength = this.movements.length;
    this.movements = this.movements.filter(m => m.id !== id);
    return this.movements.length < prevLength;
  }

  async getGroupBalances(groupId: string): Promise<MemberBalance[]> {
    const group = await this.getGroupById(groupId);
    if (!group) return [];
    const groupMovements = await this.getMovements(groupId);
    const memberIds = group.members.map(m => m.userId);
    return calculateGroupBalances(memberIds, groupMovements);
  }

  async getGroupDebts(groupId: string): Promise<SimplifiedDebt[]> {
    const balances = await this.getGroupBalances(groupId);
    return simplifyDebts(balances);
  }

  async getUserOverallBalance(userId: string): Promise<{ totalOwedCents: number; totalOwesCents: number; netCents: number }> {
    let totalOwedCents = 0; // Lo que le deben al usuario
    let totalOwesCents = 0; // Lo que el usuario debe

    for (const group of this.groups) {
      const isMember = group.members.some(m => m.userId === userId);
      if (!isMember) continue;

      const debts = await this.getGroupDebts(group.id);
      for (const d of debts) {
        if (d.toUserId === userId) {
          totalOwedCents += d.amountCents;
        } else if (d.fromUserId === userId) {
          totalOwesCents += d.amountCents;
        }
      }
    }

    return {
      totalOwedCents,
      totalOwesCents,
      netCents: totalOwedCents - totalOwesCents,
    };
  }
}

// Instancia singleton para la aplicación
export const repository = new MockRepository();
