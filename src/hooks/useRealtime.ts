import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../data/supabaseClient';

export interface RealtimeSource {
  table: string;
  /** Filtro de Postgres, p. ej. "group_id=eq.<id>" */
  filter?: string;
}

/**
 * Se suscribe a cambios en tablas de Supabase y llama a `onChange`
 * (agrupando ráfagas de eventos en una sola llamada tras `debounceMs`).
 * Se desuscribe al desmontar. No hace nada en modo demo.
 */
export function useRealtime(
  channelName: string,
  sources: RealtimeSource[],
  onChange: () => void,
  debounceMs = 400,
) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;
  const key = JSON.stringify(sources);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current(), debounceMs);
    };

    let channel = supabase.channel(channelName);
    for (const s of JSON.parse(key) as RealtimeSource[]) {
      channel = channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
        trigger,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [channelName, key, debounceMs]);
}