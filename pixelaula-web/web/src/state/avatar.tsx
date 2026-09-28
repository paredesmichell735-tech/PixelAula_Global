import type { AvatarConfig } from '@pixelaula/api';
import { useMe } from '../hooks/queries';
import { EXPRESSIONS, type Expression } from '../components/CharacterPortrait';

/**
 * Avatar del usuario.
 *
 * La fuente de verdad es el servidor: `GET /me` trae la configuración y
 * `PUT /me/avatar` la guarda. Antes esto vivía en localStorage, lo que hacía
 * que el avatar cambiara según el navegador desde el que entraras.
 */
export function useAvatar(): { config: AvatarConfig | null; expression: Expression } {
  const me = useMe();
  const config = me.data?.avatar ?? null;
  const raw = config?.expression;

  return {
    config,
    expression: EXPRESSIONS.includes(raw as Expression) ? (raw as Expression) : 'feliz',
  };
}

/**
 * Se mantiene como componente para no tocar el árbol de providers, pero ya no
 * guarda nada: el estado vive en la consulta de React Query.
 */
export function AvatarProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
