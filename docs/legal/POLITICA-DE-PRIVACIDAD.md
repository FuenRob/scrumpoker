# Política de Privacidad

**Última actualización:** Noviembre de 2026  
**Marco normativo:** Reglamento General de Protección de Datos (RGPD / GDPR - Reglamento UE 2016/679) y Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).

---

## 1. Responsable del Tratamiento de los Datos

- **Identidad:** Roberto Morais ("FuenRob")
- **Proyecto:** Scrum Poker (Software libre de estimación ágil)
- **Repositorio:** [https://github.com/FuenRob/scrumpoker](https://github.com/FuenRob/scrumpoker)
- **Contacto para el ejercicio de derechos:** Mediante la apertura de un ticket o issue en el repositorio oficial ([https://github.com/FuenRob/scrumpoker/issues](https://github.com/FuenRob/scrumpoker/issues)) o por los canales públicos de contacto del titular.

---

## 2. Principios de Protección de Datos (Privacidad por Diseño)

Scrum Poker ha sido concebida bajo los principios de **Minimización de Datos** (Art. 5.1.c RGPD) y **Privacidad por Defecto y desde el Diseño** (Art. 25 RGPD):
- **Sin registro de cuentas:** No se solicita correo electrónico, contraseña, nombre real, número de teléfono ni datos de facturación.
- **Sin bases de datos de perfiles permanentes:** Las salas de estimación no se indexan ni se archivan permanentemente en bases de datos relacionales externas. Los votos residen en memoria RAM volátil mientras dura la sesión activa de la sala.
- **Voto secreto garantizado:** El software enmascara criptográficamente los votos en el servidor o entre pares durante la fase de votación oculta, impidiendo que otros participantes o intrusos en red puedan espiar la carta seleccionada antes de la revelación simultánea.

---

## 3. Categorías de Datos Tratados y Finalidades

| Dato / Variable | Origen | Finalidad | Base Legal | Duración |
| :--- | :--- | :--- | :--- | :--- |
| **Alias / Nombre de pantalla** | Proporcionado voluntariamente por el usuario | Identificar visualmente a la persona dentro de la mesa de póker de la sala. | Consentimiento (Art. 6.1.a RGPD) y ejecución del servicio (Art. 6.1.b RGPD). | Reside en `localStorage` del cliente hasta que el usuario lo modifique o borre. |
| **Color de avatar y rol** (participante u observador) | Configurado por el usuario | Distinguir a los participantes en la mesa virtual y gestionar turnos de voto. | Ejecución del servicio (Art. 6.1.b RGPD). | Reside en `localStorage` del cliente. |
| **Identificador seudónimo de sesión** (`usr_...`) | Generado aleatoriamente con entropía local | Evitar duplicados si el usuario refresca la pestaña y reconectar su voto en curso. | Interés legítimo técnico (Art. 6.1.f RGPD). | Reside en `localStorage` del cliente. |
| **Dirección IP y metadatos de red** | Transmisión TCP/IP del navegador | Enrutamiento de paquetes en tiempo real (Socket.IO) y negociación P2P (WebRTC/STUN). | Interés legítimo y necesidad técnica de conectividad (Art. 6.1.f RGPD). | Tratamiento en memoria volátil; no se archiva en registros permanentes ni se asocia a identidades reales. |
| **Votos y títulos de historias** | Introducidos en la sala | Calcular estadísticas de la estimación (media, mediana, consenso) y exportar resultados. | Ejecución del servicio (Art. 6.1.b RGPD). | Memoria volátil de la sala. Se elimina automáticamente al vaciarse la sala o reiniciarse el servidor. |

---

## 4. Comunicaciones P2P y Terceros Prestadores de Servicios

1. **Modo Servidor (Socket.IO):** Cuando la aplicación corre conectada al servidor Node.js/Express, el flujo de eventos se gestiona en memoria sin persistencia secundaria en disco.
2. **Modo Serverless P2P (WebRTC & PeerJS):**
   - En despliegues estáticos (por ejemplo, GitHub Pages), la aplicación utiliza WebRTC para establecer un canal de datos directo entre los navegadores de los participantes.
   - Para que los navegadores puedan descubrirse y atravesar routers/NAT domésticos, se utilizan servidores de señalización pública (PeerJS) y servidores STUN estándar (como los provistos por Google o Mozilla). Estos servidores únicamente procesan los paquetes de saludo ICE y direcciones IP efímeras necesarios para enlazar los dispositivos, sin inspeccionar el contenido de las votaciones.
3. **Alojamientos de Terceros:** En caso de acceder mediante GitHub Pages o plataformas cloud (Railway, Render, Vercel), la infraestructura subyacente puede registrar logs técnicos estándar de acceso HTTP conforme a sus respectivas políticas de privacidad.

---

## 5. Medidas de Seguridad Técnicas y Organizativas

En cumplimiento del artículo 32 del RGPD, se aplican medidas técnicas para garantizar la seguridad de la información:
- **Canales cifrados:** Toda la comunicación web y WebSockets se realiza mediante HTTPS y WSS (TLS/SSL).
- **Enmascaramiento de votos en servidor:** El estado de la sala que se difunde a los participantes omite el valor real del voto ajeno hasta que el usuario con privilegios pulse "Revelar cartas".
- **Límites de tasa (Rate Limiting):** Prevención de inundación de eventos para proteger la estabilidad de los servicios.
- **Sanitización estricta de entradas:** Todo texto introducido (nombre, títulos de historias, código de sala) pasa por algoritmos de escape contra inyecciones XSS y ataques de polución de prototipos.

---

## 6. Derechos del Usuario (ARCO-POL)

El RGPD y la LOPDGDD garantizan al Usuario los siguientes derechos:
- **Derecho de Acceso:** Conocer qué datos se están tratando.
- **Derecho de Rectificación:** Modificar su alias, color o rol en cualquier momento desde el menú de la aplicación.
- **Derecho de Supresión ("Derecho al Olvido"):** Eliminar sus datos. Puesto que no existe base de datos centralizada de cuentas, el usuario puede ejercer de forma inmediata y autónoma su derecho de supresión simplemente borrando el almacenamiento local de su navegador (disponible con un solo clic desde la Política de Cookies de esta aplicación).
- **Derecho a la Limitación del Tratamiento y Oposición.**
- **Derecho a la Portabilidad de los Datos:** La aplicación permite exportar el historial de votaciones en formato texto/Markdown directamente desde la interfaz.

Para cualquier consulta sobre estos derechos, el usuario puede abrir un issue en el repositorio de GitHub. Asimismo, el usuario tiene derecho a presentar una reclamación ante la autoridad de control competente, en España la **Agencia Española de Protección de Datos (AEPD)** en [https://www.aepd.es](https://www.aepd.es).
