import {
  Award, Bell, BookOpen, ChevronLeft, Gamepad2, Home, LogOut, Menu, Search, Settings, Sparkles, Trophy, UserRound, UsersRound, X
} from 'lucide-react';
import { useState, type PropsWithChildren } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CharacterPortrait } from './CharacterPortrait';
import { useAvatar } from '../state/avatar';
import { useAuth } from '../state/auth';

const items = [
  { to: '/app', label: 'Inicio', icon: Home, end: true },
  { to: '/app/materias', label: 'Materias', icon: BookOpen },
  { to: '/app/niveles', label: 'Niveles', icon: Gamepad2 },
  { to: '/app/niveles', label: 'Misiones', icon: Sparkles },
  { to: '/app/logros', label: 'Logros', icon: Trophy },
  { to: '/app/avatar', label: 'Avatar', icon: Award },
  { to: '/app/comunidad', label: 'Comunidad', icon: UsersRound },
  { to: '/app/perfil', label: 'Perfil', icon: UserRound }
];

function Logo() {
  return <img className="brand-logo" src="/assets/logo.png" alt="PixelAula" />;
}

export function AppShell({ children }: PropsWithChildren) {
  const { expression } = useAvatar();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          {!collapsed && <Logo />}
          <button className="icon-button sidebar__collapse" onClick={() => setCollapsed(v => !v)} aria-label="Contraer menú">
            <ChevronLeft size={20} />
          </button>
          <button className="icon-button sidebar__close" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={22}/></button>
        </div>
        <nav className="sidebar__nav">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)} title={collapsed ? label : undefined}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <NavLink to="/app/perfil" className="nav-item"><Settings size={20}/><span>Configuración</span></NavLink>
          <button className="sidebar__signout" onClick={() => void signOut()}><LogOut size={20}/><span>Salir</span></button>
          {!collapsed && <div className="sidebar__promo"><Gamepad2 size={30}/><b>Convierte el aprendizaje</b><span>en tu mejor aventura.</span></div>}
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-button topbar__menu" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={22}/></button>
          <div className="topbar__brand-mobile"><Logo /></div>
          <div className="topbar__crumb">{items.find(i => i.to === location.pathname)?.label ?? 'PixelAula'}</div>
          <div className="topbar__search"><Search size={18}/><input placeholder="Buscar en PixelAula..." /></div>
          <button className="icon-button notification"><Bell size={20}/><i>1</i></button>
          <NavLink to="/app/perfil" className="avatar-button" aria-label="Ir a mi perfil"><CharacterPortrait expression={expression} size={42} /></NavLink>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav className="mobile-nav">
        {items.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={20}/><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {open && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
    </div>
  );
}
