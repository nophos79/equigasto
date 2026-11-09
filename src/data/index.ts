import type { IDataRepository } from './repository.ts';
import { SupabaseRepository } from './supabaseRepository.ts';

/** Repositorio de datos de la aplicación (Supabase). */
export const repository: IDataRepository = new SupabaseRepository();