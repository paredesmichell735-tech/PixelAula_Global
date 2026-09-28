import { Eye, EyeOff, Gamepad2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';

type Mode = 'signin' | 'signup';

export function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/app" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        navigate('/app');
      } else {
        await signUp(email, password, displayName);
        // Con la confirmación por correo activada no hay sesión todavía.
        setNotice('Cuenta creada. Revisa tu correo para confirmarla y vuelve a entrar.');
        setMode('signin');
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div>
          <img src="/assets/logo.png" alt="PixelAula" />
          <h1>Aprender jugando,<br />crecer creando.</h1>
          <p>Tu aventura educativa empieza aquí.</p>
        </div>
      </div>

      <form className="auth-card" onSubmit={onSubmit}>
        <Link to="/" className="auth-logo"><img src="/assets/logo.png" alt="PixelAula" /></Link>

        <span className="eyebrow"><Gamepad2 size={17} /> Bienvenido</span>

        <div className="auth-tabs">
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
            Iniciar sesión
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Registrarse
          </button>
        </div>

        {mode === 'signup' && (
          <label>
            Nombre
            <div className="input-shell">
              <UserRound size={18} />
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Alex"
                minLength={2}
                maxLength={40}
                required
              />
            </div>
          </label>
        )}

        <label>
          Correo
          <div className="input-shell">
            <Mail size={18} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@pixelaula.edu"
              autoComplete="email"
              required
            />
          </div>
        </label>

        <label>
          Contraseña
          <div className="input-shell">
            <LockKeyhole size={18} />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
            <button type="button" onClick={() => setShow(v => !v)} aria-label="Ver contraseña">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}

        <button className="pixel-button pixel-button--cyan pixel-button--full" type="submit" disabled={busy}>
          {busy ? 'Un momento...' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        <div className="auth-divider">o continúa con</div>

        <button
          className="pixel-button pixel-button--ghost pixel-button--full"
          type="button"
          onClick={() => void signInWithGoogle().catch(e => setError((e as Error).message))}
        >
          Google
        </button>

        <small>
          {mode === 'signin' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button type="button" className="link-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Crear una' : 'Inicia sesión'}
          </button>
        </small>
      </form>
    </div>
  );
}
