import { Group, Movement, UserProfile, MemberBalance, SimplifiedDebt } from '../core/types';

export interface IDataRepository {
  getCurrentUser(): Promise<UserProfile>;
  getUsers(): Promise<UserProfile[]>;
  getUserById(id: string): Promise<UserProfile | undefined>;
  
  getGroups(): Promise<Group[]>;
  getGroupById(id: string): Promise<Group | undefined>;
  createGroup(group: Omit<Group, 'id' | 'createdAt'>): Promise<Group>;
  updateGroup(id: string, groupData: Partial<Group>): Promise<Group>;
  addMemberToGroup(groupId: string, name: string, percentage?: number): Promise<Group>;
  
  getMovements(groupId?: string): Promise<Movement[]>;
  getMovementById(id: string): Promise<Movement | undefined>;
  createMovement(movement: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement>;
  updateMovement(id: string, movementData: Partial<Movement>): Promise<Movement>;
  deleteMovement(id: string): Promise<boolean>;

  getGroupBalances(groupId: string): Promise<MemberBalance[]>;
  getGroupDebts(groupId: string): Promise<SimplifiedDebt[]>;
  getUserOverallBalance(userId: string): Promise<{ totalOwedCents: number; totalOwesCents: number; netCents: number }>;
}
