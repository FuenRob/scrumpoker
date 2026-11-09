# Política de Cookies y Almacenamiento Local

**Última actualización:** Noviembre de 2026  
**Marco normativo:** Artículo 22.2 de la Ley 34/2002 (LSSI-CE), Directiva 2002/58/CE (ePrivacy) y Guía sobre el uso de cookies de la Agencia Española de Protección de Datos (AEPD).

---

## 1. ¿Qué son las Cookies y el Almacenamiento Web Local?

Una **cookie** es un pequeño archivo de texto que los sitios web descargan en el navegador del usuario para almacenar y recuperar información durante la navegación o en visitas posteriores.

El **Almacenamiento Local HTML5 (`localStorage`)** es una tecnología web estándar más moderna y eficiente que permite a las aplicaciones guardar datos directamente en el dispositivo del usuario sin enviarlos automáticamente en las cabeceras de red HTTP en cada petición al servidor. Esto reduce el consumo de datos, incrementa la velocidad y protege mejor la privacidad frente a rastreadores de terceros.

---

## 2. Tecnologías Empleadas en Scrum Poker

Scrum Poker **no utiliza cookies de seguimiento publicitario ni analítica comercial de terceros** (no se utiliza Google Analytics, ni Meta Pixel, ni herramientas de perfilado).

La aplicación utiliza exclusivamente almacenamiento local (`localStorage`) con fines **estrictamente técnicos y de personalización**, necesarios para que puedas participar en las salas de estimación sin que se pierda tu nombre o tus votos al refrescar la página.

---

## 3. Inventario Completo de Datos Almacenados en tu Navegador

A continuación se detalla cada una de las claves de almacenamiento local utilizadas por Scrum Poker:

| Clave de Almacenamiento | Tipo / Finalidad | Justificación Técnica | Exenta de Consentimiento previo |
| :--- | :--- | :--- | :---: |
| `scrumpoker_username` | Personalización técnica | Recuerda el alias o nombre de pantalla elegido voluntariamente por el usuario para no obligarle a escribirlo cada vez que entre a una sala. | **SÍ** (Solicitado por el usuario) |
| `scrumpoker_user_id` | Técnica y de sesión | Almacena un identificador aleatorio criptoseguro (`usr_...`) para mantener la correlación de la sesión de voto si la pestaña se refresca accidentalmente. | **SÍ** (Estrictamente necesaria) |
| `scrumpoker_avatar_color` | Personalización estética | Guarda el color hexadecimal elegido para tu avatar en la mesa de póker. | **SÍ** (Personalización) |
| `scrumpoker_is_spectator` | Funcional | Recuerda si tu rol preferido es votante o espectador/observador. | **SÍ** (Personalización) |
| `scrumpoker_recent_rooms` | Funcional | Mantiene un listado breve de los códigos de las últimas salas a las que has accedido para facilitar el reingreso rápido con un clic. | **SÍ** (Funcional) |
| `scrumpoker_crab_mode` | Funcional / Lúdico | Guarda la preferencia de activación del huevo de pascua visual de cartas. | **SÍ** (Personalización) |
| `scrumpoker_theme` | Personalización | Recuerda la preferencia de interfaz visual (tema claro u oscuro). | **SÍ** (Personalización) |

---

## 4. Régimen Legal y Exención de Banner de Cookies

El artículo 22.2 de la LSSI-CE y el Dictamen 4/2012 del Comité Europeo de Protección de Datos (EDPB) establecen que **quedan exceptuadas de la obligación de obtener el consentimiento informado previo (banner de cookies)** aquellas cookies y herramientas de almacenamiento local que tengan como finalidad:
1. Permitir únicamente la comunicación entre el equipo del usuario y la red.
2. Prestar estrictamente un servicio expresamente solicitado por el usuario (como recordar un alias de juego, el tema oscuro o mantener la sesión de votación en curso).

Dado que Scrum Poker no implementa cookies publicitarias ni de análisis estadístico de terceros, **la aplicación no requiere mostrar un banner bloqueante de aceptación de cookies**, garantizando una experiencia de usuario limpia, rápida y plenamente respetuosa con la legislación vigente.

---

## 5. Cómo Borrar o Desactivar tus Datos

El usuario tiene el control absoluto sobre sus datos en todo momento.

### A. Borrado Inmediato con 1 Clic desde la Aplicación
Puedes pulsar el botón **"Borrar todos mis datos de almacenamiento local"** situado al pie de esta ventana modal en la aplicación web para eliminar al instante todos los registros de `localStorage`.

### B. Desde las Opciones de tu Navegador
También puedes eliminar o bloquear el almacenamiento local en cualquier momento desde la configuración de tu navegador:
- **Google Chrome:** Configuración > Privacidad y seguridad > Cookies y otros datos de sitios web > Ver todos los datos y permisos de sitios.
- **Mozilla Firefox:** Ajustes > Privacidad & Seguridad > Cookies y datos del sitio > Limpiar datos.
- **Apple Safari:** Preferencias > Privacidad > Gestionar datos de sitios web.
- **Microsoft Edge:** Configuración > Permisos del sitio > Cookies y datos del sitio.
