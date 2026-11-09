import type { IDataRepository } from './repository.ts';
import type { Group, Movement, UserProfile, MemberBalance, SimplifiedDebt } from '../core/types.ts';
import { supabase } from './supabaseClient.ts';
import { calculateGroupBalances } from '../core/balance.ts';
import { simplifyDebts } from '../core/simplify.ts';

export class SupabaseRepository implements IDataRepository {
  async getCurrentUser(): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión activa.');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) throw new Error('No se pudo leer tu perfil: ' + error.message);
    if (!profile) throw new Error('Tu perfil no existe en la base de datos.');

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      isProvisional: profile.is_provisional,
    };
  }

  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data) return [];

    return data.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatarUrl: p.avatar_url,
      isProvisional: p.is_provisional,
    }));
  }

  async getUserById(id: string): Promise<UserProfile | undefined> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
      isProvisional: data.is_provisional,
    };
  }

  async getGroups(): Promise<Group[]> {
    const { data: groupsData, error: gError } = await supabase
      .from('groups')
      .select('*, group_members(*)');

    if (gError || !groupsData) return [];

    return groupsData.map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      icon: g.icon,
      category: g.category as any,
      createdBy: g.created_by,
      createdAt: g.created_at,
      defaultSplitMode: g.default_split_mode,
      members: (g.group_members || []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        percentage: Number(m.percentage),
      })),
    }));
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const { data: g, error } = await supabase
      .from('groups')
      .select('*, group_members(*)')
      .eq('id', id)
      .single();

    if (error || !g) return undefined;

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      icon: g.icon,
      category: g.category as any,
      createdBy: g.created_by,
      createdAt: g.created_at,
      defaultSplitMode: g.default_split_mode,
      members: (g.group_members || []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        percentage: Number(m.percentage),
      })),
    };
  }

  async createGroup(groupData: Omit<Group, 'id' | 'createdAt'>): Promise<Group> {
    const { data: newGroup, error: gError } = await supabase
      .from('groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        icon: groupData.icon,
        category: groupData.category,
        created_by: groupData.createdBy,
        default_split_mode: groupData.defaultSplitMode,
      })
      .select()
      .single();

    if (gError || !newGroup) throw new Error('No se pudo crear el grupo: ' + (gError?.message ?? 'error desconocido'));

    if (groupData.members.length > 0) {
      const { error: mError } = await supabase.from('group_members').insert(
        groupData.members.map((m) => ({
          group_id: newGroup.id,
          user_id: m.userId,
          role: m.role,
          percentage: m.percentage,
        }))
      );
      if (mError) {
        // Revertir para no dejar un grupo huérfano
        await supabase.from('groups').delete().eq('id', newGroup.id);
        throw new Error('No se pudieron añadir los miembros: ' + mError.message);
      }
    }

    return this.getGroupById(newGroup.id) as Promise<Group>;
  }

  async updateGroup(id: string, groupData: Partial<Group>): Promise<Group> {
    const updatePayload: any = {};
    if (groupData.name !== undefined) updatePayload.name = groupData.name;
    if (groupData.description !== undefined) updatePayload.description = groupData.description;
    if (groupData.icon !== undefined) updatePayload.icon = groupData.icon;
    if (groupData.defaultSplitMode !== undefined) updatePayload.default_split_mode = groupData.defaultSplitMode;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('groups').update(updatePayload).eq('id', id);
    }

    if (groupData.members) {
      for (const m of groupData.members) {
        await supabase
          .from('group_members')
          .update({ percentage: m.percentage, role: m.role })
          .match({ group_id: id, user_id: m.userId });
      }
    }

    return this.getGroupById(id) as Promise<Group>;
  }

  async deleteGroup(id: string): Promise<void> {
    const { data, error } = await supabase.from('groups').delete().eq('id', id).select('id');
    if (error) throw new Error('No se pudo eliminar el grupo: ' + error.message);
    if (!data || data.length === 0) {
      throw new Error('No se eliminó nada: solo el creador del grupo puede eliminarlo.');
    }
  }

  async addMemberByEmail(groupId: string, email: string): Promise<Group> {
    const { error } = await supabase.rpc('add_member_by_email', {
      p_group_id: groupId,
      p_email: email.trim(),
    });
    if (error) throw new Error(error.message);
    return this.getGroupById(groupId) as Promise<Group>;
  }

  async addMemberToGroup(groupId: string, name: string, percentage?: number): Promise<Group> {
    // 1. Crear perfil provisional en Supabase
    const { data: provProfile, error: pError } = await supabase
      .from('profiles')
      .insert({
        name: `${name.trim()} (Invitado)`,
        email: null,
        is_provisional: true,
      })
      .select()
      .single();

    if (pError || !provProfile) throw pError || new Error('Error al crear perfil provisional');

    // 2. Asociar a group_members
    await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: provProfile.id,
      role: 'MEMBER',
      percentage: percentage || 0,
    });

    return this.getGroupById(groupId) as Promise<Group>;
  }

  async getMovements(groupId?: string): Promise<Movement[]> {
    let query = supabase.from('movements').select('*, movement_shares(*)').order('date', { ascending: false });
    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      groupId: m.group_id,
      type: m.type,
      concept: m.concept,
      amountCents: Number(m.amount_cents),
      paidById: m.paid_by_id,
      recipientId: m.recipient_id,
      splitMode: m.split_mode,
      date: m.date,
      createdAt: m.created_at,
      notes: m.notes,
      shares: (m.movement_shares || []).map((s: any) => ({
        userId: s.user_id,
        amountCents: Number(s.amount_cents),
        percentage: s.percentage ? Number(s.percentage) : undefined,
      })),
    }));
  }

  async getMovementById(id: string): Promise<Movement | undefined> {
    const { data: m, error } = await supabase
      .from('movements')
      .select('*, movement_shares(*)')
      .eq('id', id)
      .single();

    if (error || !m) return undefined;

    return {
      id: m.id,
      groupId: m.group_id,
      type: m.type,
      concept: m.concept,
      amountCents: Number(m.amount_cents),
      paidById: m.paid_by_id,
      recipientId: m.recipient_id,
      splitMode: m.split_mode,
      date: m.date,
      createdAt: m.created_at,
      notes: m.notes,
      shares: (m.movement_shares || []).map((s: any) => ({
        userId: s.user_id,
        amountCents: Number(s.amount_cents),
        percentage: s.percentage ? Number(s.percentage) : undefined,
      })),
    };
  }

  async createMovement(movementData: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> {
    const { data: newMov, error: mError } = await supabase
      .from('movements')
      .insert({
        group_id: movementData.groupId,
        type: movementData.type,
        concept: movementData.concept,
        amount_cents: movementData.amountCents,
        paid_by_id: movementData.paidById,
        recipient_id: movementData.recipientId,
        split_mode: movementData.splitMode,
        date: movementData.date,
      })
      .select()
      .single();

    if (mError || !newMov) throw mError || new Error('Error al registrar movimiento');

    if (movementData.shares.length > 0) {
      await supabase.from('movement_shares').insert(
        movementData.shares.map((s) => ({
          movement_id: newMov.id,
          user_id: s.userId,
          amount_cents: s.amountCents,
          percentage: s.percentage,
        }))
      );
    }

    return this.getMovementById(newMov.id) as Promise<Movement>;
  }

  async updateMovement(id: string, movementData: Partial<Movement>): Promise<Movement> {
    const updatePayload: any = {};
    if (movementData.concept !== undefined) updatePayload.concept = movementData.concept;
    if (movementData.amountCents !== undefined) updatePayload.amount_cents = movementData.amountCents;
    if (movementData.paidById !== undefined) updatePayload.paid_by_id = movementData.paidById;
    if (movementData.recipientId !== undefined) updatePayload.recipient_id = movementData.recipientId;
    if (movementData.splitMode !== undefined) updatePayload.split_mode = movementData.splitMode;
    if (movementData.date !== undefined) updatePayload.date = movementData.date;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('movements').update(updatePayload).eq('id', id);
    }

    if (movementData.shares) {
      await supabase.from('movement_shares').delete().eq('movement_id', id);
      await supabase.from('movement_shares').insert(
        movementData.shares.map((s) => ({
          movement_id: id,
          user_id: s.userId,
          amount_cents: s.amountCents,
          percentage: s.percentage,
        }))
      );
    }

    return this.getMovementById(id) as Promise<Movement>;
  }

  async deleteMovement(id: string): Promise<boolean> {
    const { error } = await supabase.from('movements').delete().eq('id', id);
    return !error;
  }

  async getGroupBalances(groupId: string): Promise<MemberBalance[]> {
    const group = await this.getGroupById(groupId);
    if (!group) return [];
    const groupMovements = await this.getMovements(groupId);
    const memberIds = group.members.map((m) => m.userId);
    return calculateGroupBalances(memberIds, groupMovements);
  }

  async getGroupDebts(groupId: string): Promise<SimplifiedDebt[]> {
    const balances = await this.getGroupBalances(groupId);
    return simplifyDebts(balances);
  }

  async getUserOverallBalance(userId: string): Promise<{ totalOwedCents: number; totalOwesCents: number; netCents: number }> {
    const groups = await this.getGroups();
    let totalOwedCents = 0;
    let totalOwesCents = 0;

    for (const group of groups) {
      const isMember = group.members.some((m) => m.userId === userId);
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
