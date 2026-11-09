import type { IDataRepository } from './repository.ts';
import { MockRepository } from './mockRepository.ts';
import { SupabaseRepository } from './supabaseRepository.ts';
import { isSupabaseConfigured } from './supabaseClient.ts';

/**
 * Selecciona el repositorio según la configuración:
 * - Supabase configurado -> SupabaseRepository (datos reales; los errores se propagan,
 *   un resultado vacío es un estado vacío real, nunca se rellena con datos de prueba).
 * - Sin configurar -> MockRepository (modo demo).
 */
let active: IDataRepository | undefined;

function getActive(): IDataRepository {
  if (!active) {
    active = isSupabaseConfigured ? new SupabaseRepository() : new MockRepository();
  }
  return active;
}

export const repository: IDataRepository = new Proxy({} as IDataRepository, {
  get(_target, prop) {
    const repo = getActive() as any;
    const value = repo[prop];
    return typeof value === 'function' ? value.bind(repo) : value;
  },
});
