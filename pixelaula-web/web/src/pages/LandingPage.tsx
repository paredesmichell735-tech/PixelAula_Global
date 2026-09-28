import { ArrowRight, Award, BookOpen, Gamepad2, GraduationCap, Layers3, Rocket, ShieldCheck, Sparkles, Trophy, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubjectIcon } from '../components/SubjectIcon';
import type { Subject } from '../types';

/**
 * Vitrina de la portada. Es contenido de marketing: la landing es pública y no
 * puede llamar a endpoints que exigen sesión, así que estas tres materias son
 * fijas a propósito.
 */
const ESCAPARATE: Subject[] = [
  {
    id: 'base-de-datos', name: 'Base de Datos',
    description: 'Organiza, consulta y construye el futuro de la información.',
    level: 1, lessons: 12, projects: 3, xp: 0, xpMax: 500, difficulty: 'Principiante',
    tone: 'cyan', iconName: 'database', background: '/assets/bg-city.jpg',
  },
  {
    id: 'redes', name: 'Redes de Computación',
    description: 'Conecta ideas, personas y posibilidades en un mundo sin límites.',
    level: 1, lessons: 10, projects: 4, xp: 0, xpMax: 400, difficulty: 'Intermedio',
    tone: 'magenta', iconName: 'network', background: '/assets/bg-school.jpg',
  },
  {
    id: 'fisica-electrica', name: 'Física Eléctrica',
    description: 'Descubre la energía que mueve el mundo.',
    level: 1, lessons: 15, projects: 5, xp: 0, xpMax: 600, difficulty: 'Intermedio',
    tone: 'yellow', iconName: 'bolt', background: '/assets/bg-cosmic.jpg',
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="landing-brand"><img src="/assets/logo.png" alt="PixelAula" /></Link>
        <nav>
          <a href="#materias">Materias</a><a href="#como-funciona">Cómo funciona</a><a href="#beneficios">Beneficios</a>
        </nav>
        <div className="landing-nav__actions"><Link to="/login" className="link-button">Iniciar sesión</Link><Link to="/app" className="pixel-button pixel-button--cyan">Comenzar aventura <ArrowRight size={17}/></Link></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__backdrop" />
          <div className="landing-hero__content">
            <div className="eyebrow"><Sparkles size={17}/> Plataforma educativa gamificada</div>
            <h1>Aprender jugando,<br/><span>crecer creando.</span></h1>
            <p>Convierte el conocimiento en tu mejor aventura. Avanza por misiones, gana insignias y domina nuevas habilidades.</p>
            <div className="hero-actions"><Link to="/app" className="pixel-button pixel-button--cyan pixel-button--lg">Comenzar aventura <ArrowRight size={20}/></Link><a className="pixel-button pixel-button--ghost pixel-button--lg" href="#como-funciona">Ver demo</a></div>
            <div className="hero-stats">
              <div><strong>50K+</strong><span>Estudiantes</span></div>
              <div><strong>12+</strong><span>Materias</span></div>
              <div><strong>100+</strong><span>Misiones</span></div>
              <div><strong>95%</strong><span>Recomienda PixelAula</span></div>
            </div>
          </div>
          <div className="landing-hero__preview">
            <img src="/assets/logo.png" alt="PixelAula" className="floating-logo"/>
            <div className="preview-card preview-card--top"><Trophy size={25}/><span><b>+250 XP</b>Misión completada</span></div>
            <div className="preview-card preview-card--bottom"><Award size={25}/><span><b>Nueva insignia</b>Circuitos básicos</span></div>
          </div>
        </section>

        <section className="landing-section" id="materias">
          <div className="section-heading"><span className="eyebrow">Múltiples materias</span><h2>Elige tu próxima aventura</h2><p>Las tres áreas base del proyecto ya están listas para conectarse con tu backend.</p></div>
          <div className="landing-subjects">
            {ESCAPARATE.map(subject => <article key={subject.id} className={`landing-subject tone-border-${subject.tone}`} style={{backgroundImage:`linear-gradient(180deg, rgba(8,20,46,.18), rgba(8,20,46,.98)),url(${subject.background})`}}><div className={`landing-subject__icon tone-bg-${subject.tone}`}><SubjectIcon subject={subject} size={42}/></div><h3>{subject.name}</h3><p>{subject.description}</p><span>Nivel {subject.level} · {subject.lessons} lecciones</span><Link to="/app/materias">Explorar <ArrowRight size={17}/></Link></article>)}
          </div>
        </section>

        <section className="landing-section" id="como-funciona">
          <div className="section-heading"><span className="eyebrow">Aprendizaje gamificado</span><h2>Aprende, supera retos y evoluciona</h2></div>
          <div className="steps-grid">
            <div className="step-card"><i>01</i><Gamepad2/><h3>Elige una misión</h3><p>Explora materias y niveles según tu progreso.</p></div>
            <div className="step-card"><i>02</i><BookOpen/><h3>Resuelve desafíos</h3><p>Interactúa con actividades, simulaciones y preguntas.</p></div>
            <div className="step-card"><i>03</i><Trophy/><h3>Gana recompensas</h3><p>Sube de nivel, desbloquea insignias y mejora tu racha.</p></div>
            <div className="step-card"><i>04</i><Rocket/><h3>Avanza en el mapa</h3><p>Abre nuevas rutas y aumenta la dificultad gradualmente.</p></div>
          </div>
        </section>

        <section className="landing-section landing-benefits" id="beneficios">
          <div className="benefit-art"><div className="benefit-art__screen"><img src="/assets/logo.png" alt=""/><p>Conocimiento real.<br/>Progreso visible.<br/>Aventura constante.</p></div></div>
          <div className="benefit-copy"><span className="eyebrow">¿Por qué PixelAula?</span><h2>Una experiencia diseñada para mantenerte aprendiendo</h2><div className="benefit-list"><div><Layers3/><span><b>Progreso visible</b>XP, niveles, rachas y objetivos claros.</span></div><div><UserRound/><span><b>Personaje personalizable</b>Tu identidad evoluciona contigo.</span></div><div><ShieldCheck/><span><b>Aprendizaje estructurado</b>Misiones cortas con dificultad progresiva.</span></div><div><GraduationCap/><span><b>Contenido educativo</b>Base de Datos, Redes y Física Eléctrica.</span></div></div><Link to="/app" className="pixel-button pixel-button--magenta">Entrar a PixelAula <ArrowRight size={18}/></Link></div>
        </section>
      </main>
      <footer className="landing-footer"><img src="/assets/logo.png" alt="PixelAula"/><span>Aprender jugando, crecer creando.</span><small>Starter web React + TypeScript listo para integrar.</small></footer>
    </div>
  );
}
