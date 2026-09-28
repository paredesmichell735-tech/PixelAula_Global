
-- =====================================================================
-- Actividades del resto de misiones sembradas.
-- Sin esto la primera misión de cada materia es un callejón sin salida:
-- el intento arranca y no hay nada que responder.
-- =====================================================================

-- Física Eléctrica · Misión 1
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000001',1,'MULTIPLE_CHOICE','Qué es la corriente',
   '¿Qué es exactamente la corriente eléctrica?',
   '{"options":[{"id":"a","label":"El calor que produce un cable"},{"id":"b","label":"El flujo de cargas eléctricas"},{"id":"c","label":"La luz de una bombilla"},{"id":"d","label":"El peso de la batería"}]}'::jsonb,
   '{"optionId":"b"}'::jsonb,
   'La corriente es el movimiento ordenado de cargas por un material. El calor y la luz son efectos de ese movimiento, no la corriente en sí.',
   '{"Piensa en algo que se mueve dentro del cable.","No es un efecto, es lo que causa los efectos.","Son cargas eléctricas en movimiento."}','energia'),
  ('b0000000-0000-4000-8000-000000000001',2,'TRUE_FALSE','Fuentes de energía',
   'Una pila y un panel solar cumplen la misma función en un circuito: ser fuente de energía.',
   '{}'::jsonb,'{"value":true}'::jsonb,
   'Verdadero. Ambos aportan la energía que pone en movimiento las cargas; cambian en cómo la obtienen, no en su papel dentro del circuito.',
   '{"Piensa en para qué sirve cada uno.","Uno guarda energía química, el otro la toma del sol.","Los dos alimentan el circuito."}','energia'),
  ('b0000000-0000-4000-8000-000000000001',3,'MATCHING','Une cada cosa con lo suyo',
   'Empareja cada elemento con su función.',
   '{"pairs":[{"concept":"Batería","definition":"Aporta energía"},{"concept":"Cable","definition":"Transporta la corriente"},{"concept":"Bombilla","definition":"Consume energía y da luz"}]}'::jsonb,
   '{"pairs":[{"concept":"Batería","definition":"Aporta energía"},{"concept":"Cable","definition":"Transporta la corriente"},{"concept":"Bombilla","definition":"Consume energía y da luz"}]}'::jsonb,
   'Cada componente tiene un papel: uno da la energía, otro la lleva y otro la convierte en luz.',
   '{"Empieza por el que tiene polos + y -.","El cable no produce ni consume: solo lleva.","La bombilla es la que se enciende."}','energia')
on conflict do nothing;

-- Física Eléctrica · Misión 2
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000002',1,'MULTIPLE_CHOICE','Conductor o aislante',
   '¿Cuál de estos materiales conduce mejor la electricidad?',
   '{"options":[{"id":"a","label":"Goma"},{"id":"b","label":"Vidrio"},{"id":"c","label":"Cobre"},{"id":"d","label":"Madera seca"}]}'::jsonb,
   '{"optionId":"c"}'::jsonb,
   'El cobre es un metal: sus electrones se mueven con libertad. Goma, vidrio y madera seca los retienen, por eso se usan como aislantes.',
   '{"Tres de los cuatro se usan para aislar.","Piensa de qué está hecho el interior de un cable.","Es un metal de color rojizo."}','conductores'),
  ('b0000000-0000-4000-8000-000000000002',2,'TRUE_FALSE','Para qué sirve el plástico',
   'El plástico que recubre los cables está ahí solo por estética.',
   '{}'::jsonb,'{"value":false}'::jsonb,
   'Falso. Ese plástico es un aislante: evita que la corriente salte a donde no debe y que te dé una descarga al tocar el cable.',
   '{"Piensa qué pasaría si tocaras el metal desnudo.","No es decoración.","Sirve para aislar."}','conductores'),
  ('b0000000-0000-4000-8000-000000000002',3,'ORDERING','De mejor a peor conductor',
   'Ordena los materiales del que mejor conduce al que peor.',
   '{"items":["Plata","Cobre","Agua salada","Goma"]}'::jsonb,
   '{"order":["Plata","Cobre","Agua salada","Goma"]}'::jsonb,
   'Los metales encabezan la lista; el agua salada conduce por los iones disueltos, bastante peor que un metal; la goma cierra como aislante.',
   '{"Los metales van primero.","La plata conduce todavía mejor que el cobre.","La goma siempre va al final."}','conductores')
on conflict do nothing;

-- Base de Datos · Misión 1
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000011',1,'MULTIPLE_CHOICE','La sentencia para consultar',
   '¿Qué palabra clave de SQL se usa para leer datos de una tabla?',
   '{"options":[{"id":"a","label":"INSERT"},{"id":"b","label":"SELECT"},{"id":"c","label":"DELETE"},{"id":"d","label":"UPDATE"}]}'::jsonb,
   '{"optionId":"b"}'::jsonb,
   'SELECT lee. INSERT escribe filas nuevas, UPDATE modifica las que hay y DELETE las borra.',
   '{"Solo una de las cuatro no cambia nada.","Las otras tres escriben o borran.","Empieza por S."}','sql'),
  ('b0000000-0000-4000-8000-000000000011',2,'SQL_CHALLENGE','Completa la consulta',
   'Completa la consulta para traer los usuarios cuya ciudad es Bogotá.',
   '{"queryTemplate":"SELECT * FROM usuarios WHERE ___;","blankSlot":"___","options":["ciudad = @@Bogota@@","ciudad == @@Bogota@@","ciudad LIKE Bogota","WHERE ciudad = Bogota"]}'::jsonb,
   '{"value":"ciudad = @@Bogota@@","accepted":["ciudad = @@Bogota@@"]}'::jsonb,
   'En SQL la comparación se escribe con un solo signo igual, y los textos van entre comillas simples. El doble igual es de otros lenguajes.',
   '{"Fíjate en cuántos signos igual lleva.","Los textos necesitan comillas simples.","Es una sola igualdad y el texto entre comillas."}','sql'),
  ('b0000000-0000-4000-8000-000000000011',3,'TRUE_FALSE','El asterisco',
   'En SQL, SELECT * significa "trae todas las columnas".',
   '{}'::jsonb,'{"value":true}'::jsonb,
   'Verdadero. El asterisco es un comodín para todas las columnas. En producción conviene nombrarlas, pero para explorar viene bien.',
   '{"El asterisco suele ser un comodín.","¿Columnas o filas?","Son todas las columnas."}','sql')
on conflict do nothing;

-- Base de Datos · Misión 2
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000012',1,'MULTIPLE_CHOICE','La clave primaria',
   '¿Para qué sirve una clave primaria en una tabla?',
   '{"options":[{"id":"a","label":"Ordenar las filas alfabéticamente"},{"id":"b","label":"Identificar cada fila de forma única"},{"id":"c","label":"Cifrar los datos"},{"id":"d","label":"Hacer copias de seguridad"}]}'::jsonb,
   '{"optionId":"b"}'::jsonb,
   'La clave primaria distingue una fila de todas las demás. Sin ella no podrías señalar un registro concreto sin ambigüedad.',
   '{"Piensa en tu número de documento.","No tiene que ver con el orden ni con la seguridad.","Identifica de forma única."}','modelado'),
  ('b0000000-0000-4000-8000-000000000012',2,'MATCHING','Tablas de una tienda',
   'Empareja cada tabla con el dato que guardaría.',
   '{"pairs":[{"concept":"productos","definition":"Nombre y precio de cada artículo"},{"concept":"pedidos","definition":"Qué compró cada cliente y cuándo"},{"concept":"clientes","definition":"Datos de contacto de quien compra"}]}'::jsonb,
   '{"pairs":[{"concept":"productos","definition":"Nombre y precio de cada artículo"},{"concept":"pedidos","definition":"Qué compró cada cliente y cuándo"},{"concept":"clientes","definition":"Datos de contacto de quien compra"}]}'::jsonb,
   'Cada tabla guarda una sola clase de cosa. Mezclarlas es el error más común al empezar a modelar.',
   '{"Una tabla, una clase de cosa.","Los pedidos conectan clientes con productos.","El precio va con el artículo."}','modelado'),
  ('b0000000-0000-4000-8000-000000000012',3,'ORDERING','Pasos para modelar',
   'Ordena los pasos para diseñar una base de datos.',
   '{"items":["Definir las relaciones","Identificar las entidades","Elegir las claves primarias","Listar los atributos de cada entidad"]}'::jsonb,
   '{"order":["Identificar las entidades","Listar los atributos de cada entidad","Elegir las claves primarias","Definir las relaciones"]}'::jsonb,
   'Primero se decide de qué cosas hablamos, luego qué se guarda de cada una, después cómo se identifican y por último cómo se conectan.',
   '{"¿Puedes relacionar algo que aún no existe?","Las entidades van primero.","Las relaciones van al final."}','modelado')
on conflict do nothing;

-- Redes · Misión 1
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000021',1,'MULTIPLE_CHOICE','Qué es una LAN',
   '¿Qué significa que una red sea "local" (LAN)?',
   '{"options":[{"id":"a","label":"Que solo funciona sin internet"},{"id":"b","label":"Que conecta equipos en un mismo lugar físico"},{"id":"c","label":"Que es más lenta que internet"},{"id":"d","label":"Que solo admite dos equipos"}]}'::jsonb,
   '{"optionId":"b"}'::jsonb,
   'Local se refiere al alcance: una casa, una oficina, un aula. Puede tener internet, ser rápida y tener muchos equipos.',
   '{"La palabra clave es dónde, no cómo.","Piensa en la red de tu casa.","Es cuestión de alcance físico."}','redes'),
  ('b0000000-0000-4000-8000-000000000021',2,'NETWORK_SIMULATION','Conecta la red local',
   'Conecta los dos equipos al switch y el switch al router.',
   '{"devices":[{"id":"pc1","type":"PC","label":"PC 1","ip":"192.168.1.10"},{"id":"pc2","type":"PC","label":"PC 2","ip":"192.168.1.11"},{"id":"switch","type":"SWITCH","label":"Switch"},{"id":"router","type":"ROUTER","label":"Router"}],"requiredConnections":[{"from":"pc1","to":"switch"},{"from":"pc2","to":"switch"},{"from":"switch","to":"router"}]}'::jsonb,
   '{"requiredConnections":[{"from":"pc1","to":"switch"},{"from":"pc2","to":"switch"},{"from":"switch","to":"router"}]}'::jsonb,
   'En una LAN con switch, cada equipo va al switch y el switch sale al router. Conectar los PC entre sí directamente no escala.',
   '{"Los equipos no se conectan entre ellos.","Todo pasa por el switch.","PC1 y PC2 al switch, y el switch al router."}','redes'),
  ('b0000000-0000-4000-8000-000000000021',3,'TRUE_FALSE','Direcciones IP',
   'Dos equipos de la misma red local pueden tener la misma dirección IP.',
   '{}'::jsonb,'{"value":false}'::jsonb,
   'Falso. La IP identifica al equipo dentro de la red: si se repite, los datos no saben a cuál de los dos ir y aparece un conflicto.',
   '{"Piensa en dos casas con el mismo número.","La IP sirve para distinguir.","Se produciría un conflicto."}','redes')
on conflict do nothing;

-- Programación · Misión 1
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000041',1,'MULTIPLE_CHOICE','Valores que no cambian',
   '¿Qué palabra clave usarías para un valor que NO se va a reasignar?',
   '{"options":[{"id":"a","label":"let"},{"id":"b","label":"const"},{"id":"c","label":"var"},{"id":"d","label":"function"}]}'::jsonb,
   '{"optionId":"b"}'::jsonb,
   'const crea una vinculación que no admite reasignación. let sí la admite, y var además tiene un ámbito que provoca errores difíciles de ver.',
   '{"Piensa en cuál se traduce como constante.","Dos de las opciones permiten reasignar.","Empieza por c."}','variables'),
  ('b0000000-0000-4000-8000-000000000041',2,'MATCHING','Tipos de dato',
   'Empareja cada valor con su tipo.',
   '{"pairs":[{"concept":"42","definition":"number"},{"concept":"texto entre comillas","definition":"string"},{"concept":"true","definition":"boolean"}]}'::jsonb,
   '{"pairs":[{"concept":"42","definition":"number"},{"concept":"texto entre comillas","definition":"string"},{"concept":"true","definition":"boolean"}]}'::jsonb,
   'Las comillas marcan el texto, los números van sin ellas y true/false son booleanos. Confundir el texto "42" con el número 42 es la fuente clásica de errores.',
   '{"Fíjate en las comillas.","true y false tienen su propio tipo.","42 sin comillas es un número."}','tipos'),
  ('b0000000-0000-4000-8000-000000000041',3,'ORDERING','Declarar y usar',
   'Ordena los pasos para usar una variable correctamente.',
   '{"items":["Usar la variable","Declarar la variable","Asignarle un valor"]}'::jsonb,
   '{"order":["Declarar la variable","Asignarle un valor","Usar la variable"]}'::jsonb,
   'Primero se declara, después se le da valor y solo entonces se usa. Usarla antes de declararla lanza ReferenceError.',
   '{"No puedes usar algo que no existe.","Declarar va primero.","Usar va al final."}','variables')
on conflict do nothing;

-- Matemáticas · Misión 1
insert into pa_activities (mission_id, order_index, type, title, question, payload, solution, explanation, hints, concept) values
  ('b0000000-0000-4000-8000-000000000051',1,'MULTIPLE_CHOICE','Sigue la secuencia',
   '¿Qué número continúa la serie 2, 4, 8, 16, ...?',
   '{"options":[{"id":"a","label":"18"},{"id":"b","label":"24"},{"id":"c","label":"32"},{"id":"d","label":"20"}]}'::jsonb,
   '{"optionId":"c"}'::jsonb,
   'Cada término es el doble del anterior, así que después del 16 viene 32. Si sumaras siempre lo mismo, la serie sería 2, 4, 6, 8.',
   '{"Compara cada número con el anterior.","No se suma lo mismo cada vez: se multiplica.","16 por 2."}','patrones'),
  ('b0000000-0000-4000-8000-000000000051',2,'TRUE_FALSE','Orden de las operaciones',
   'En la expresión 2 + 3 × 4, primero se resuelve la suma.',
   '{}'::jsonb,'{"value":false}'::jsonb,
   'Falso. La multiplicación va antes que la suma: 3 × 4 = 12 y luego 2 + 12 = 14. Si sumaras primero saldría 20, que es el error típico.',
   '{"Recuerda la jerarquía de operaciones.","¿Suma o multiplicación primero?","La multiplicación tiene prioridad."}','patrones'),
  ('b0000000-0000-4000-8000-000000000051',3,'ORDERING','Resuelve por pasos',
   'Ordena los pasos para resolver (4 + 2) × 3 - 5.',
   '{"items":["Restar 5","Resolver el paréntesis","Multiplicar por 3"]}'::jsonb,
   '{"order":["Resolver el paréntesis","Multiplicar por 3","Restar 5"]}'::jsonb,
   'El paréntesis manda, después la multiplicación y al final la resta: (6) × 3 = 18, y 18 - 5 = 13.',
   '{"Los paréntesis van siempre primero.","Multiplicar antes que restar.","Paréntesis, multiplicación, resta."}','patrones')
on conflict do nothing;

-- El reto de SQL guarda las comillas simples como @@ para no pelear con el
-- escapado dentro del seed; aquí se devuelven a su forma real.
update pa_activities
set payload = replace(payload::text, '@@', '''')::jsonb,
    solution = replace(solution::text, '@@', '''')::jsonb
where type = 'SQL_CHALLENGE' and payload::text like '%@@%';

-- Objetivos de las misiones nuevas.
insert into pa_mission_objectives (mission_id, order_index, description, activity_index) values
  ('b0000000-0000-4000-8000-000000000001',1,'Identifica qué es la corriente',1),
  ('b0000000-0000-4000-8000-000000000001',2,'Reconoce una fuente de energía',2),
  ('b0000000-0000-4000-8000-000000000001',3,'Relaciona cada componente con su función',3),
  ('b0000000-0000-4000-8000-000000000002',1,'Distingue un conductor de un aislante',1),
  ('b0000000-0000-4000-8000-000000000002',2,'Explica para qué sirve el aislamiento',2),
  ('b0000000-0000-4000-8000-000000000002',3,'Ordena materiales por conductividad',3),
  ('b0000000-0000-4000-8000-000000000011',1,'Reconoce la sentencia de consulta',1),
  ('b0000000-0000-4000-8000-000000000011',2,'Escribe una condición WHERE',2),
  ('b0000000-0000-4000-8000-000000000011',3,'Entiende el comodín *',3),
  ('b0000000-0000-4000-8000-000000000012',1,'Explica qué es una clave primaria',1),
  ('b0000000-0000-4000-8000-000000000012',2,'Separa entidades en tablas',2),
  ('b0000000-0000-4000-8000-000000000012',3,'Ordena el proceso de modelado',3),
  ('b0000000-0000-4000-8000-000000000021',1,'Define qué es una LAN',1),
  ('b0000000-0000-4000-8000-000000000021',2,'Conecta los dispositivos al switch',2),
  ('b0000000-0000-4000-8000-000000000021',3,'Entiende por qué las IP no se repiten',3),
  ('b0000000-0000-4000-8000-000000000041',1,'Elige entre let y const',1),
  ('b0000000-0000-4000-8000-000000000041',2,'Identifica los tipos básicos',2),
  ('b0000000-0000-4000-8000-000000000041',3,'Ordena declarar, asignar y usar',3),
  ('b0000000-0000-4000-8000-000000000051',1,'Descubre la regla de una serie',1),
  ('b0000000-0000-4000-8000-000000000051',2,'Aplica la jerarquía de operaciones',2),
  ('b0000000-0000-4000-8000-000000000051',3,'Resuelve una expresión por pasos',3)
on conflict (mission_id, order_index) do nothing;
