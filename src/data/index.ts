import type { IDataRepository } from './repository.ts';
import { MockRepository } from './mockRepository.ts';
import { SupabaseRepository } from './supabaseRepository.ts';
import { isSupabaseConfigured } from './supabaseClient.ts';

class SmartRepository implements IDataRepository {
  private _mockRepo?: MockRepository;
  private _supabaseRepo?: SupabaseRepository;

  private get mockRepo(): MockRepository {
    if (!this._mockRepo) this._mockRepo = new MockRepository();
    return this._mockRepo;
  }

  private get supabaseRepo(): SupabaseRepository {
    if (!this._supabaseRepo) this._supabaseRepo = new SupabaseRepository();
    return this._supabaseRepo;
  }

  private get activeRepo(): IDataRepository {
    return isSupabaseConfigured ? this.supabaseRepo : this.mockRepo;
  }

  async getCurrentUser() {
    try {
      return await this.activeRepo.getCurrentUser();
    } catch {
      return this.mockRepo.getCurrentUser();
    }
  }

  async getUsers() {
    try {
      const users = await this.activeRepo.getUsers();
      return users.length > 0 ? users : this.mockRepo.getUsers();
    } catch {
      return this.mockRepo.getUsers();
    }
  }

  async getUserById(id: string) {
    try {
      return await this.activeRepo.getUserById(id);
    } catch {
      return this.mockRepo.getUserById(id);
    }
  }

  async getGroups() {
    try {
      const groups = await this.activeRepo.getGroups();
      return groups.length > 0 ? groups : this.mockRepo.getGroups();
    } catch {
      return this.mockRepo.getGroups();
    }
  }

  async getGroupById(id: string) {
    try {
      const grp = await this.activeRepo.getGroupById(id);
      return grp || this.mockRepo.getGroupById(id);
    } catch {
      return this.mockRepo.getGroupById(id);
    }
  }

  async createGroup(group: any) {
    try {
      return await this.activeRepo.createGroup(group);
    } catch {
      return this.mockRepo.createGroup(group);
    }
  }

  async updateGroup(id: string, groupData: any) {
    try {
      return await this.activeRepo.updateGroup(id, groupData);
    } catch {
      return this.mockRepo.updateGroup(id, groupData);
    }
  }

  async addMemberToGroup(groupId: string, name: string, percentage?: number) {
    try {
      return await this.activeRepo.addMemberToGroup(groupId, name, percentage);
    } catch {
      return this.mockRepo.addMemberToGroup(groupId, name, percentage);
    }
  }

  async getMovements(groupId?: string) {
    try {
      const movs = await this.activeRepo.getMovements(groupId);
      return movs.length > 0 ? movs : this.mockRepo.getMovements(groupId);
    } catch {
      return this.mockRepo.getMovements(groupId);
    }
  }

  async getMovementById(id: string) {
    try {
      return await this.activeRepo.getMovementById(id);
    } catch {
      return this.mockRepo.getMovementById(id);
    }
  }

  async createMovement(movement: any) {
    try {
      return await this.activeRepo.createMovement(movement);
    } catch {
      return this.mockRepo.createMovement(movement);
    }
  }

  async updateMovement(id: string, movementData: any) {
    try {
      return await this.activeRepo.updateMovement(id, movementData);
    } catch {
      return this.mockRepo.updateMovement(id, movementData);
    }
  }

  async deleteMovement(id: string) {
    try {
      return await this.activeRepo.deleteMovement(id);
    } catch {
      return this.mockRepo.deleteMovement(id);
    }
  }

  async getGroupBalances(groupId: string) {
    try {
      const bals = await this.activeRepo.getGroupBalances(groupId);
      return bals.length > 0 ? bals : this.mockRepo.getGroupBalances(groupId);
    } catch {
      return this.mockRepo.getGroupBalances(groupId);
    }
  }

  async getGroupDebts(groupId: string) {
    try {
      const debts = await this.activeRepo.getGroupDebts(groupId);
      return debts.length > 0 ? debts : this.mockRepo.getGroupDebts(groupId);
    } catch {
      return this.mockRepo.getGroupDebts(groupId);
    }
  }

  async getUserOverallBalance(userId: string) {
    try {
      return await this.activeRepo.getUserOverallBalance(userId);
    } catch {
      return this.mockRepo.getUserOverallBalance(userId);
    }
  }
}

export const repository: IDataRepository = new SmartRepository();
