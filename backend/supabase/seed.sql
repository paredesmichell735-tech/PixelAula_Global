-- =====================================================================
-- PixelAula · seed
--
-- Contenido jugable SIN llamar a la IA: las materias de los mockups, la
-- misión "Circuitos en acción" con su simulador, el catálogo de avatar,
-- logros, insignias y tienda.
--
-- Se aplica con `npm run db:reset` (local) o `npm run db:seed:remote`.
-- Es idempotente: ejecutarlo dos veces no duplica nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo de avatar
-- ---------------------------------------------------------------------
insert into pa_avatar_options (category, slug, name, rarity, asset, price_coins, is_default, order_index) values
  ('skinTone','piel-1','Claro','COMMON','#FFD1AD',0,true,1),
  ('skinTone','piel-2','Medio','COMMON','#D9A278',0,true,2),
  ('skinTone','piel-3','Bronce','COMMON','#A76B4D',0,true,3),
  ('skinTone','piel-4','Oscuro','COMMON','#6B3D2E',0,true,4),

  ('hair','pelo-punta','Puntiagudo','COMMON','hair_spiky',0,true,1),
  ('hair','pelo-corto','Corto','COMMON','hair_short',0,false,2),
  ('hair','pelo-largo','Largo','UNCOMMON','hair_long',80,false,3),
  ('hair','pelo-rizado','Rizado','UNCOMMON','hair_curly',80,false,4),

  ('hairColor','color-castano','Castaño','COMMON','#7B2B1F',0,true,1),
  ('hairColor','color-negro','Negro','COMMON','#1A1820',0,false,2),
  ('hairColor','color-rojo','Rojo','COMMON','#D13A27',0,false,3),
  ('hairColor','color-rubio','Rubio','COMMON','#F4C02C',0,false,4),
  ('hairColor','color-azul','Azul','RARE','#177BD8',150,false,5),
  ('hairColor','color-blanco','Blanco','RARE','#DBE9FF',150,false,6),

  ('eyes','ojos-normales','Normales','COMMON','eyes_default',0,true,1),
  ('eyes','ojos-decididos','Decididos','COMMON','eyes_determined',0,false,2),
  ('eyebrows','cejas-normales','Normales','COMMON','brows_default',0,true,1),
  ('expression','feliz','Feliz','COMMON','feliz',0,true,1),
  ('expression','neutral','Neutral','COMMON','neutral',0,false,2),
  ('expression','emocionado','Emocionado','COMMON','emocionado',0,false,3),
  ('expression','riendo','Riendo','COMMON','riendo',0,false,4),
  ('expression','sorprendido','Sorprendido','COMMON','sorprendido',0,false,5),
  ('expression','concentrado','Concentrado','COMMON','concentrado',0,false,6),
  ('expression','pensativo','Pensativo','COMMON','pensativo',0,false,7),
  ('expression','dudoso','Dudoso','COMMON','dudoso',0,false,8),
  ('expression','determinado','Determinado','COMMON','determinado',0,false,9),
  ('expression','guino','Guiño','UNCOMMON','guino',50,false,10),

  ('top','chaqueta-azul','Chaqueta azul','COMMON','#1C74ED',0,true,1),
  ('top','chaqueta-roja','Chaqueta roja','COMMON','#D83B41',0,false,2),
  ('top','chaqueta-negra','Chaqueta negra','UNCOMMON','#191D2A',60,false,3),
  ('top','bata-cientifico','Bata de científico','RARE','#E8ECF4',200,false,4),

  ('bottom','pantalon-azul','Pantalón azul','COMMON','#172954',0,true,1),
  ('bottom','pantalon-negro','Pantalón negro','COMMON','#1A1820',0,false,2),

  ('shoes','zapatillas-rojas','Zapatillas rojas','COMMON','shoes_red',0,true,1),
  ('shoes','zapatillas-azules','Zapatillas azules','COMMON','shoes_blue',0,false,2),

  ('glasses','sin-gafas','Ninguna','COMMON','none',0,true,1),
  ('glasses','gafas-retro','Gafas retro','RARE','glasses_retro',120,false,2),
  ('glasses','gafas-vr','Visor futuro','EPIC','glasses_vr',400,false,3),

  ('headphones','audifonos-pixel','Audífonos Pixel','EPIC','headphones_pixel',0,true,1),
  ('headphones','sin-audifonos','Ninguno','COMMON','none',0,false,2),

  ('headwear','sin-sombrero','Ninguno','COMMON','none',0,true,1),
  ('headwear','gorra-urbana','Gorra urbana','COMMON','cap_urban',70,false,2),
  ('headwear','corona-pixel','Corona Pixel','LEGENDARY','crown_pixel',900,false,3),

  ('backpack','mochila-clasica','Mochila clásica','COMMON','backpack_classic',0,true,1),
  ('backpack','mochila-gamer','Mochila gamer','RARE','backpack_gamer',180,false,2),

  ('accessory','sin-accesorio','Ninguno','COMMON','none',0,true,1),
  ('accessory','alas-pixel','Alas Pixel','LEGENDARY','wings_pixel',1000,false,2),

  ('pet','sin-mascota','Ninguna','COMMON','none',0,true,1),
  ('pet','mascota-gato','Gato','EPIC','pet_cat',350,false,2),
  ('pet','mascota-robot','Robot','RARE','pet_robot',250,false,3),

  ('effect','sin-efecto','Ninguno','COMMON','none',0,true,1),
  ('effect','efecto-neon','Aura neón','EPIC','fx_neon',300,false,2),

  ('background','fondo-ciudad','Ciudad pixel','COMMON','bg_city',0,true,1),
  ('background','fondo-islas','Islas flotantes','UNCOMMON','bg_islands',90,false,2)
on conflict (category, slug) do nothing;

-- ---------------------------------------------------------------------
-- Materias
-- ---------------------------------------------------------------------
insert into pa_subjects (id, slug, name, description, icon, color, order_index, difficulty, required_xp, total_lessons, total_projects, min_level, narrative_theme) values
  ('a0000000-0000-4000-8000-000000000001','base-de-datos','Base de Datos',
   'Organiza, consulta y construye el futuro de la información.','database','#19D3FF',1,'FACIL',500,12,3,1,
   'Islas de cristal donde los datos fluyen como ríos de luz.'),
  ('a0000000-0000-4000-8000-000000000002','redes','Redes de Computación',
   'Conecta ideas, personas y posibilidades en un mundo sin límites.','network','#FF43D1',2,'MEDIO',400,10,4,1,
   'Una ciudad flotante unida por cables de neón.'),
  ('a0000000-0000-4000-8000-000000000003','fisica-electrica','Física Eléctrica',
   'Descubre la energía que mueve el mundo.','bolt','#FFD53A',3,'MEDIO',600,15,5,1,
   'Talleres de chispas donde la corriente dibuja caminos.'),
  ('a0000000-0000-4000-8000-000000000004','programacion','Programación',
   'Crea soluciones, da vida a tus ideas y construye el futuro.','code','#6B46FF',4,'MEDIO',600,14,6,1,
   'Torres de código que se levantan solas al escribirlas.'),
  ('a0000000-0000-4000-8000-000000000005','matematicas','Matemáticas',
   'Desarrolla tu lógica y resuelve desafíos del mundo real.','math','#44F0C0',5,'FACIL',400,16,4,1,
   'Jardines geométricos donde cada patrón esconde una regla.'),
  ('a0000000-0000-4000-8000-000000000006','inteligencia-artificial','Inteligencia Artificial',
   'Explora cómo las máquinas también pueden aprender.','brain','#2E5BFF',6,'DIFICIL',800,9,3,5,
   'Un observatorio que aprende de quien lo visita.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Misiones de Física Eléctrica (la del mockup)
-- ---------------------------------------------------------------------
insert into pa_missions (id, subject_id, slug, title, description, level_number, difficulty,
                         estimated_minutes, xp_reward, coins_reward, gems_reward, activity_count,
                         position_x, position_y, briefing_key_points, learned_points) values
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003',
   'la-energia-que-nos-mueve','La energía que nos mueve',
   'Descubre qué es la corriente eléctrica y de dónde sale.',1,'FACIL',8,80,15,0,3,
   18,62,'{"La corriente es el flujo de cargas","Necesita un circuito cerrado"}',
   '{"Identificar qué es la corriente eléctrica","Reconocer una fuente de energía"}'),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003',
   'conductores-y-aislantes','Conductores y aislantes',
   'Distingue los materiales que dejan pasar la corriente de los que no.',2,'FACIL',10,90,18,0,3,
   38,44,'{"Los metales conducen","El plástico aísla"}',
   '{"Clasificar materiales por conductividad"}'),
  ('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003',
   'circuitos-en-accion','Circuitos en acción',
   'Construye un circuito eléctrico y enciende todas las bombillas.',3,'MEDIO',12,280,40,1,4,
   58,58,'{"Un circuito debe estar cerrado","El interruptor abre y cierra el paso"}',
   '{"Identificar los componentes de un circuito","Comprender el flujo de la corriente eléctrica","Diferenciar circuitos en serie y paralelo","Aplicar conceptos para resolver problemas"}')
on conflict (subject_id, slug) do nothing;

-- Primera misión de cada otra materia, para que el mapa no quede vacío.
insert into pa_missions (id, subject_id, slug, title, description, level_number, difficulty,
                         estimated_minutes, xp_reward, coins_reward, activity_count, position_x, position_y) values
  ('b0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000001','primeros-pasos-sql','Primeros pasos en SQL',
   'Haz tu primera consulta a una base de datos.',1,'FACIL',10,100,20,3,20,60),
  ('b0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000001','disena-tu-primera-base','Diseña tu primera base de datos',
   'Crea un modelo de base de datos para una tienda en línea.',2,'MEDIO',15,200,35,3,45,40),
  ('b0000000-0000-4000-8000-000000000021','a0000000-0000-4000-8000-000000000002','tu-primera-red-local','Tu primera red local',
   'Conecta dispositivos en una red local y descubre cómo se comunican.',1,'FACIL',12,100,20,3,22,58),
  ('b0000000-0000-4000-8000-000000000041','a0000000-0000-4000-8000-000000000004','variables-y-tipos','Variables y tipos',
   'Guarda información y dale el tipo correcto.',1,'FACIL',10,100,20,3,20,55),
  ('b0000000-0000-4000-8000-000000000051','a0000000-0000-4000-8000-000000000005','logica-y-patrones','Lógica y patrones',
   'Encuentra la regla escondida en una secuencia.',1,'FACIL',8,90,18,3,20,55)
on conflict (subject_id, slug) do nothing;

-- ---------------------------------------------------------------------
-- Objetivos de "Circuitos en acción"
-- ---------------------------------------------------------------------
insert into pa_mission_objectives (mission_id, order_index, description, activity_index) values
  ('b0000000-0000-4000-8000-000000000003',1,'Coloca la batería',1),
  ('b0000000-0000-4000-8000-000000000003',2,'Conecta los cables',2),
  ('b0000000-0000-4000-8000-000000000003',3,'Usa el interruptor',3),
  ('b0000000-0000-4000-8000-000000000003',4,'Enciende todas las bombillas',4)
on conflict (mission_id, order_index) do nothing;

-- ---------------------------------------------------------------------
-- Actividades de "Circuitos en acción"
-- `payload` es lo público; `solution` nunca sale del servidor.
-- ---------------------------------------------------------------------
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000003',1,'MULTIPLE_CHOICE','La fuente de energía',
   '¿Qué componente aporta la energía para que circule la corriente?',
   '{"options":[{"id":"a","label":"La bombilla"},{"id":"b","label":"La batería"},{"id":"c","label":"El interruptor"},{"id":"d","label":"El cable"}]}'::jsonb,
   '{"optionId":"b"}'::jsonb,
   'La batería es la fuente: empuja las cargas desde el polo positivo al negativo. La bombilla consume esa energía, el cable la transporta y el interruptor solo abre o cierra el paso.',
   '{"Piensa en cuál de los cuatro guarda energía.","Los otros tres la transportan, la consumen o la cortan.","Es la que tiene polo + y polo -."}',
   'circuitos'),

  ('b0000000-0000-4000-8000-000000000003',2,'TRUE_FALSE','Circuito abierto',
   'Si el circuito está abierto en cualquier punto, la corriente sigue circulando.',
   '{}'::jsonb,
   '{"value":false}'::jsonb,
   'Falso. La corriente solo circula por un camino cerrado: basta un punto abierto para que todo el circuito deje de funcionar.',
   '{"Piensa en lo que pasa al desconectar un solo cable.","La corriente necesita un camino completo de ida y vuelta.","Si hay un hueco, no pasa nada."}',
   'circuitos'),

  ('b0000000-0000-4000-8000-000000000003',3,'ORDERING','Monta el circuito',
   'Ordena los pasos para montar el circuito correctamente.',
   '{"items":["Conectar los cables","Colocar la batería","Cerrar el interruptor","Comprobar que las bombillas encienden"]}'::jsonb,
   '{"order":["Colocar la batería","Conectar los cables","Cerrar el interruptor","Comprobar que las bombillas encienden"]}'::jsonb,
   'Primero la fuente, luego el camino, después se cierra el paso y al final se comprueba. Sin batería no hay nada que conducir.',
   '{"¿Qué necesitas antes de poder conectar nada?","La comprobación siempre va al final.","Empieza por la batería."}',
   'circuitos'),

  ('b0000000-0000-4000-8000-000000000003',4,'CIRCUIT_SIMULATION','Enciende las bombillas',
   'Construye un circuito cerrado y enciende todas las bombillas.',
   '{"components":[
       {"id":"battery","type":"BATTERY","label":"Batería"},
       {"id":"wire1","type":"WIRE","label":"Cable recto"},
       {"id":"wire2","type":"CORNER_WIRE","label":"Cable esquina"},
       {"id":"switch","type":"SWITCH","label":"Interruptor","state":"OPEN"},
       {"id":"bulb1","type":"BULB","label":"Bombilla 1"},
       {"id":"bulb2","type":"BULB","label":"Bombilla 2"}
     ],"requiredCircuitState":"CLOSED"}'::jsonb,
   '{"requiredConnections":[
       {"from":"battery","to":"wire1"},
       {"from":"wire1","to":"switch"},
       {"from":"switch","to":"bulb1"},
       {"from":"bulb1","to":"bulb2"},
       {"from":"bulb2","to":"wire2"},
       {"from":"wire2","to":"battery"}
     ],"requiredStates":{"switch":"CLOSED"}}'::jsonb,
   'La corriente debe formar un circuito cerrado desde el polo + de la batería hasta el polo -, pasando por el interruptor cerrado y las dos bombillas.',
   '{"La corriente solo circula si el circuito está cerrado.","Revisa el interruptor: abierto corta el paso.","Conecta batería → cable → interruptor → bombillas → vuelta a la batería, y cierra el interruptor."}',
   'circuitos')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Logros
-- ---------------------------------------------------------------------
insert into pa_achievements (slug, category, title, description, icon, metric, target_value, reward_xp, reward_coins, order_index) values
  ('primer-paso','APRENDIZAJE','Primer Paso','Completa tu primera misión.','trophy','missions_completed',1,50,20,1),
  ('estudiante-constante','CONSTANCIA','Estudiante Constante','Completa 10 misiones.','book','missions_completed',10,100,50,2),
  ('explorador-conocimiento','EXPLORACION','Explorador del Conocimiento','Completa 5 materias diferentes.','compass','subjects_started',5,150,75,3),
  ('maestro-pixel','ESPECIALES','Maestro del Pixel','Alcanza el nivel 20.','graduation','level',20,300,150,4),
  ('racha-semana','CONSTANCIA','Imparable','Mantén una racha de 7 días.','flame','streak_days',7,120,60,5),
  ('perfeccionista','APRENDIZAJE','Perfeccionista','Consigue 3 estrellas en 5 misiones.','star','perfect_missions',5,150,80,6),
  ('centurion','APRENDIZAJE','Centurión','Responde 100 actividades correctamente.','target','correct_answers',100,200,100,7),
  ('creativo','CREATIVIDAD','Creativo','Guarda 5 estilos de avatar distintos.','palette','avatar_styles',5,80,40,8)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Insignias
-- ---------------------------------------------------------------------
insert into pa_badges (slug, title, description, icon, rarity, order_index) values
  ('aprendiz','Aprendiz','Diste tus primeros pasos en PixelAula.','book','COMMON',1),
  ('matematico','Matemático','Dominaste los fundamentos de matemáticas.','sigma','UNCOMMON',2),
  ('cientifico','Científico','Completaste tu primer experimento.','flask','UNCOMMON',3),
  ('lector','Lector','Leíste 10 lecciones completas.','book-open','COMMON',4),
  ('explorador','Explorador','Visitaste todas las materias disponibles.','compass','RARE',5),
  ('circuitos-basicos','Circuitos Básicos','Completa tu primera misión de circuitos eléctricos.','bolt','UNCOMMON',6),
  ('conector-redes','Conector de Redes','Montaste tu primera red local.','network','UNCOMMON',7),
  ('base-datos-experto','Base de Datos Experto','Dominaste las consultas SQL.','database','EPIC',8),
  ('trabajo-equipo','Trabajo en Equipo','Participaste en un desafío colaborativo.','users','RARE',9),
  ('constante','Constante','Siete días seguidos aprendiendo.','flame','RARE',10),
  ('solucionador','Solucionador','Resolviste una misión sin usar pistas.','lightbulb','EPIC',11),
  ('especial','Especial','Insignia conmemorativa de la beta.','star','LEGENDARY',12)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Retos
-- ---------------------------------------------------------------------
insert into pa_challenges (slug, title, description, kind, metric, target_value, reward_xp, reward_coins, ends_at) values
  ('reto-semana','Reto de la semana','Completa 5 misiones de Matemáticas.','WEEKLY','missions_completed',5,300,100, now() + interval '7 days'),
  ('desafio-colaborativo','Desafío colaborativo','En equipo, resuelvan 10 ejercicios de Física.','TEAM','correct_answers',10,250,80, now() + interval '14 days'),
  ('explorador-contenidos','Explorador del conocimiento','Descubre 3 materias nuevas.','EXPLORATION','subjects_started',3,150,50, null),
  ('racha-imparable','Racha imparable','Mantén una racha de 7 días.','STREAK','streak_days',7,200,70, null)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Tienda
-- ---------------------------------------------------------------------
insert into pa_shop_items (slug, name, description, category, rarity, price_coins, price_gems, icon, effect, is_consumable, min_level) values
  ('pista-gratis','Pergamino de Pista','Revela una pista sin gastar gemas.','CONSUMIBLE','COMMON',60,0,'scroll','{"type":"free_hint"}'::jsonb,true,1),
  ('saltar-actividad','Ficha de Salto','Salta una actividad sin penalización.','CONSUMIBLE','UNCOMMON',90,0,'skip','{"type":"skip_activity"}'::jsonb,true,2),
  ('congelador-racha','Congelador de Racha','Protege tu racha un día de inactividad.','CONSUMIBLE','RARE',150,0,'snowflake','{"type":"streak_freeze"}'::jsonb,true,1),
  ('bolsa-gemas','Bolsa de Gemas','Cambia Pixeles por 5 gemas.','CONSUMIBLE','RARE',500,0,'gem','{"type":"gems","amount":5}'::jsonb,true,3)
on conflict (slug) do nothing;

-- Piezas de avatar comprables: se enlazan con su opción del catálogo.
insert into pa_shop_items (slug, name, description, category, rarity, price_coins, price_gems, icon, avatar_option_id, is_consumable, min_level)
select
  'avatar-' || o.slug,
  o.name,
  'Pieza de avatar: ' || o.name,
  case o.category
    when 'top' then 'ROPA'::inventory_category
    when 'bottom' then 'ROPA'::inventory_category
    when 'shoes' then 'ROPA'::inventory_category
    when 'backpack' then 'MOCHILAS'::inventory_category
    when 'pet' then 'MASCOTAS'::inventory_category
    when 'effect' then 'EFECTOS'::inventory_category
    else 'ACCESORIOS'::inventory_category
  end,
  o.rarity,
  o.price_coins,
  0,
  o.asset,
  o.id,
  false,
  1
from pa_avatar_options o
where o.price_coins > 0
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Clase y calendario de ejemplo
-- ---------------------------------------------------------------------
insert into pa_classes (id, name, code, teacher_name) values
  ('c0000000-0000-4000-8000-000000000001','10A - Los PixelPro','PIXEL10','Prof. Laura Méndez')
on conflict (code) do nothing;

insert into pa_calendar_events (class_id, title, description, kind, starts_at, ends_at, location, teacher_name) values
  ('c0000000-0000-4000-8000-000000000001','Clase en vivo: Redes de Computación',
   'Repaso de direccionamiento IP y configuración de routers.','LIVE_CLASS',
   now() + interval '2 days', now() + interval '2 days 1 hour','Sala virtual','Prof. Laura Méndez')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Manifiesto de assets
-- ---------------------------------------------------------------------
update pa_asset_manifest set version = 1, assets = '{
  "hero_idle":      {"path":"character/idle.png","w":320,"h":474},
  "hero_correr":    {"path":"character/correr.png","w":360,"h":474},
  "hero_saltar":    {"path":"character/saltar.png","w":320,"h":474},
  "hero_celebrar":  {"path":"character/celebrar.png","w":368,"h":474},
  "hero_senalar":   {"path":"character/senalar.png","w":360,"h":474},
  "hero_estudiar":  {"path":"character/estudiar.png","w":392,"h":474},
  "bg_city":        {"path":"backgrounds/bg-city.jpg"},
  "bg_islands":     {"path":"backgrounds/bg-islands.jpg"},
  "bg_school":      {"path":"backgrounds/bg-school.jpg"},
  "bg_cosmic":      {"path":"backgrounds/bg-cosmic.jpg"},
  "bg_classroom":   {"path":"backgrounds/bg-classroom.jpg"},
  "bg_path":        {"path":"backgrounds/bg-path.jpg"}
}'::jsonb, updated_at = now() where id = 1;
