import { PixelAulaError, messageFor } from '@pixelaula/api';
import { RotateCcw } from 'lucide-react';

/**
 * Estados de carga y error, con el tono del juego. Un spinner mudo rompe la
 * ilusión; un mensaje que culpa al jugador, más.
 */

const LOADING_LINES = [
  'Cargando tu aventura...',
  'Despertando a los píxeles...',
  'Buscando tu progreso...',
  'Encendiendo los circuitos...',
];

export function Loading({ label }: { label?: string }) {
  const line = label ?? LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
  return (
    <div className="async-state">
      <div className="async-state__bar"><i /></div>
      <p>{line}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isApi = error instanceof PixelAulaError;
  const message = isApi
    ? messageFor(error.code, error.message)
    : 'No pudimos conectar con el servidor.';

  const hint = isApi && error.code === 'NETWORK_ERROR'
    ? '¿Está encendido el backend en el puerto 3000?'
    : null;

  return (
    <div className="async-state async-state--error">
      <b>{message}</b>
      {hint && <small>{hint}</small>}
      {onRetry && (
        <button className="pixel-button pixel-button--cyan pixel-button--sm" onClick={onRetry}>
          <RotateCcw size={15} /> Reintentar
        </button>
      )}
    </div>
  );
}

/** Envoltorio para no repetir el if/else de carga y error en cada pantalla. */
export function Async<T>({
  query,
  children,
}: {
  query: { data: T | undefined; isLoading: boolean; error: unknown; refetch: () => void };
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return <Loading />;
  return <>{children(query.data)}</>;
}
