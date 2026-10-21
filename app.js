const STORE_KEY = "wispr_wireless_platform_v7";
const SESSION_KEY = "wispr:session:v7";
const THEME_KEY = "wispr_theme_v1";
const TOKEN_KEY = "wispr:token:v1";
// URL base del backend. Vacío = mismo origen que el frontend. Para apuntar a
// otro servidor basta con <meta name="wispr-api" content="https://…"> en index.html.
const API = (document.querySelector('meta[name="wispr-api"]')?.content || "").replace(/\/+$/, "");
const difficultyOrder = { Foundation: 1, Medium: 2, Hard: 3, Expert: 4 };
const difficultyColors = { Foundation: "#65e6b4", Medium: "#f5b544", Hard: "#ff7c5c", Expert: "#ca7dff" };
const theoryModules = [
  { id: 1, title: "Fundamentos Wi-Fi", topics: ["802.11", "SSID / BSSID", "MAC", "AP y clientes", "Canales y frecuencias", "Frames"] },
  { id: 2, title: "Seguridad Wi-Fi", topics: ["WEP", "WPA y WPA2", "WPA3", "Cifrado", "Autenticación"] },
  { id: 3, title: "Autenticación", topics: ["Four-Way Handshake", "PMK", "PTK", "GTK", "Nonce", "MIC", "PMKID"] },
  { id: 4, title: "Ataques a Wi-Fi", topics: ["Deauthentication", "Evil Twin", "Rogue AP", "Captive Portal", "WPS / Pixie Dust", "MAC Spoofing"] },
  { id: 5, title: "Bluetooth", topics: ["Bluetooth clásico vs BLE", "Descubrimiento", "Emparejamiento", "Seguridad Bluetooth", "Amenazas comunes"] },
  { id: 6, title: "Análisis", topics: ["Capturas .pcap", "Wireshark", "Identificación de frames", "Identificación de dispositivos", "Detección de anomalías", "Análisis de incidentes"] }
];

// Vincula un tema de un módulo con una lección interactiva (Aprender → Practicar →
// Comprobar). Si un tema no aparece aquí se muestra como texto plano.
const topicLessons = {
  "802.11": "802-11",
  "SSID / BSSID": "ssid-bssid",
  "MAC": "mac-address",
  "AP y clientes": "ap-clientes",
  "Canales y frecuencias": "canales-frecuencias",
  "Frames": "frames-802-11",
  "WEP": "m2-wep",
  "WPA y WPA2": "m2-wpa-wpa2",
  "WPA3": "m2-wpa3",
  "Cifrado": "m2-cifrado",
  "Autenticación": "m2-autenticacion",
  "Bluetooth clásico vs BLE": "bt-classic-ble",
  "Descubrimiento": "bt-descubrimiento",
  "Emparejamiento": "bt-emparejamiento",
  "Seguridad Bluetooth": "bt-seguridad",
  "Amenazas comunes": "bt-amenazas",
  "Four-Way Handshake": "four-way-handshake",
  "PMK": "pmk",
  "PTK": "ptk",
  "GTK": "gtk",
  "Nonce": "nonce",
  "MIC": "mic",
  "PMKID": "pmkid"
};

// Lecciones interactivas por tema. Las del Módulo 3 (Autenticación) se
// definen más abajo, en el bloque "MÓDULO 3", y se agregan con Object.assign.
const lessons = {
  // Primer tema con el formato "learn por pasos" (sin video) + práctica tipo
  // "match": sirve de plantilla reutilizable para el resto de temas de los
  // módulos 1, 3 y 5 — ver renderLearnVisual() para los tipos de paso
  // disponibles (list-select, node-cluster, compare-pair, icon-row).
  "ssid-bssid": {
    id: "ssid-bssid",
    moduleId: 1,
    title: "SSID / BSSID",
    learn: {
      steps: [
        {
          concept: "SSID: el nombre que ves",
          explanation: "El SSID (Service Set Identifier) es el nombre de red que el punto de acceso transmite para que los usuarios la encuentren. Lo elige quien configura el router — no identifica al equipo en sí.",
          visual: {
            type: "list-select",
            prompt: "Toca una red para ver qué información te da su nombre.",
            items: [
              { id: "cafe", label: "Café_Central_WiFi", note: "Solo dice el nombre elegido por el dueño del local — no indica qué router ni qué marca es." },
              { id: "casa", label: "Familia_Rojas_5G", note: "Un SSID personalizado tampoco revela el hardware real detrás de la red." },
              { id: "oficina", label: "Oficina_Piso3", note: "Dos pisos distintos del mismo edificio podrían usar un nombre parecido sin ser la misma red." }
            ]
          },
          check: {
            prompt: "¿El SSID identifica de forma única a un punto de acceso?",
            options: ["Sí, cada router tiene un SSID exclusivo", "No, el nombre se puede repetir o reutilizar"],
            correct: 1,
            feedback: ["Exacto: el SSID es solo un nombre, se puede repetir o incluso clonar.", "Repasa: el SSID es un nombre elegido manualmente, no un identificador exclusivo del hardware."]
          }
        },
        {
          concept: "BSSID: la identidad real del punto de acceso",
          explanation: "El BSSID es la dirección MAC de la radio del punto de acceso. A diferencia del SSID, no se escribe a mano: viene grabada en el hardware y es, en teoría, única para cada AP.",
          visual: {
            type: "node-cluster",
            note: "Toca cada punto de acceso para revelar su BSSID real.",
            nodes: [
              { id: "ap1", label: "AP — Entrada", sublabel: "SSID: Café_Central_WiFi", detail: "BSSID: AA:BB:CC:11:22:33" },
              { id: "ap2", label: "AP — Terraza", sublabel: "SSID: Café_Central_WiFi", detail: "BSSID: AA:BB:CC:11:22:44" },
              { id: "ap3", label: "AP — Segundo piso", sublabel: "SSID: Café_Central_WiFi", detail: "BSSID: AA:BB:CC:11:22:55" }
            ]
          },
          check: {
            prompt: "Los tres puntos de acceso de arriba comparten el mismo SSID. ¿Qué los distingue entre sí?",
            options: ["Nada, son indistinguibles", "El BSSID (MAC) de cada uno es distinto"],
            correct: 1,
            feedback: ["No del todo: aunque el nombre sea igual, cada AP sigue teniendo su propio BSSID.", "Correcto: aunque compartan SSID (típico en redes con varios puntos de acceso), cada radio tiene su propio BSSID."]
          }
        },
        {
          concept: "¿Por qué importa la diferencia?",
          explanation: "Herramientas de análisis Wi-Fi (como airodump-ng) listan redes por BSSID, no solo por nombre, porque el nombre se puede clonar fácilmente — pero imitar el BSSID exacto de un equipo real es mucho más difícil.",
          visual: {
            type: "compare-pair",
            left: { title: "Red legítima", rows: [{ label: "SSID", value: "Café_Central_WiFi" }, { label: "BSSID", value: "AA:BB:CC:11:22:33" }, { label: "Canal", value: "6" }] },
            right: { title: "Red clonada (Evil Twin)", rows: [{ label: "SSID", value: "Café_Central_WiFi" }, { label: "BSSID", value: "9C:3D:11:7A:40:02" }, { label: "Canal", value: "11" }] }
          },
          check: {
            prompt: "Un atacante clona el nombre de esta red para engañar a los usuarios. ¿Qué dato ayuda a detectar el engaño?",
            options: ["El SSID, porque es idéntico", "El BSSID, porque no coincide con el original"],
            correct: 1,
            feedback: ["El SSID no sirve aquí: el atacante lo copió exactamente igual.", "Correcto: el BSSID del AP falso no coincide con el de la red real, aunque el nombre sea idéntico."]
          }
        },
        {
          concept: "En resumen",
          explanation: "Dos conceptos distintos para un mismo punto de acceso.",
          visual: {
            type: "icon-row",
            items: [
              { icon: "🏷️", label: "SSID", caption: "Nombre visible, elegido a mano, se puede repetir." },
              { icon: "🔑", label: "BSSID", caption: "MAC real de la radio, única por punto de acceso." }
            ]
          }
        }
      ]
    },
    practice: {
      type: "match",
      prompt: "Relaciona cada red con su identificador real",
      instructions: "Elige primero un nombre de red (izquierda) y después el BSSID que le corresponde (derecha).",
      hint: "Esa combinación no es correcta. Recuerda: el SSID es el nombre público; el BSSID es la MAC exacta de ESE punto de acceso.",
      success: "¡Bien! Aunque los nombres se parezcan o se repitan, cada punto de acceso tiene su propio BSSID.",
      pairs: [
        { id: "p1", left: "Café_Central_WiFi (entrada)", right: "AA:BB:CC:11:22:33" },
        { id: "p2", left: "Biblioteca_Campus", right: "DE:AD:BE:EF:00:01" },
        { id: "p3", left: "Oficina_Piso3", right: "02:14:F3:9A:7B:5C" },
        { id: "p4", left: "Hogar_Martinez", right: "C4:41:1E:3A:90:0F" }
      ]
    },
    quiz: [
      {
        id: "q1", concept: "SSID",
        prompt: "¿Qué es el SSID de una red Wi-Fi?",
        options: ["La dirección MAC del punto de acceso", "El nombre de red que eligió quien la configuró", "El canal de frecuencia que usa la red", "La contraseña de la red"],
        correct: 1,
        feedback: ["Correcto: el SSID es simplemente el nombre visible de la red.", "El SSID es el nombre de la red — no es una dirección MAC, ni un canal, ni la contraseña."]
      },
      {
        id: "q2", concept: "BSSID",
        prompt: "¿Qué identifica el BSSID?",
        options: ["El nombre de la red", "La dirección MAC del punto de acceso específico", "El fabricante del router", "La velocidad máxima de la red"],
        correct: 1,
        feedback: ["Correcto: el BSSID es la MAC de la radio de ese punto de acceso en particular.", "El BSSID es una dirección MAC — identifica al punto de acceso físico, no el nombre ni la velocidad."]
      },
      {
        id: "q3", concept: "SSID duplicado",
        prompt: "Verdadero o falso: dos puntos de acceso distintos pueden transmitir el mismo SSID al mismo tiempo.",
        options: ["Verdadero", "Falso"],
        correct: 0,
        feedback: ["Correcto: es común en redes con varios puntos de acceso (y también lo aprovechan los ataques Evil Twin).", "Es verdadero: varios AP (legítimos o no) pueden compartir el mismo nombre de red."]
      },
      {
        id: "q4", concept: "Evil Twin",
        prompt: "Un atacante crea un punto de acceso con el mismo nombre que una red legítima para engañar a los usuarios. ¿Qué es más difícil que el atacante clone exactamente?",
        options: ["El SSID de la red", "El BSSID del punto de acceso original", "El canal que usa la red", "La intensidad de la señal"],
        correct: 1,
        feedback: ["El SSID es justamente lo más fácil de copiar: es solo texto.", "Correcto: el BSSID depende del hardware real; clonarlo exactamente requiere imitar esa MAC específica."]
      }
    ]
  },

  "802-11": {
    id: "802-11",
    moduleId: 1,
    title: "802.11",
    learn: {
      steps: [
        {
          concept: "¿Qué es 802.11?",
          explanation: "IEEE 802.11 es la familia de estándares que define cómo se comunican los dispositivos en una red inalámbrica de área local (WLAN) — qué frecuencias usar, cómo formar una red y cómo intercambiar datos sin cables.",
          visual: {
            type: "node-cluster",
            note: "Toca cada elemento para ver qué papel cumple dentro de la red.",
            nodes: [
              { id: "ap", label: "Punto de acceso (AP)", sublabel: "Coordina la red", detail: "Crea la red inalámbrica y coordina cómo los demás dispositivos se conectan y comparten el medio." },
              { id: "laptop", label: "Laptop", sublabel: "Cliente", detail: "Se asocia al AP para enviar y recibir datos siguiendo las reglas que define 802.11." },
              { id: "phone", label: "Teléfono", sublabel: "Cliente", detail: "También es un cliente: compite por el medio inalámbrico igual que cualquier otro dispositivo asociado." }
            ]
          },
          check: {
            prompt: "¿Qué define exactamente el estándar 802.11?",
            options: ["El diseño físico de los routers", "Cómo se comunican los dispositivos en una red inalámbrica"],
            correct: 1,
            feedback: ["802.11 no habla de diseño de hardware, sino de reglas de comunicación.", "Correcto: 802.11 define las reglas de comunicación inalámbrica, no el aspecto físico de los equipos."]
          }
        },
        {
          concept: "¿Cómo se comunican los dispositivos?",
          explanation: "La comunicación ocurre como un intercambio de mensajes: el cliente pide unirse, el AP responde, y después ambos intercambian datos siguiendo el mismo estándar para entenderse.",
          visual: {
            type: "list-select",
            prompt: "Toca cada mensaje para ver quién lo envía y para qué sirve.",
            items: [
              { id: "req", label: "Solicitud de conexión", note: "La envía el cliente (laptop o teléfono) para pedir unirse a la red del AP." },
              { id: "resp", label: "Respuesta del AP", note: "El AP confirma la conexión y el cliente queda asociado a la red." },
              { id: "data", label: "Datos de navegación", note: "Una vez asociado, el cliente y el AP se intercambian datos en ambas direcciones — esta es la comunicación normal del día a día." }
            ]
          },
          check: {
            prompt: "¿Quién inicia normalmente el proceso de conexión?",
            options: ["El punto de acceso", "El dispositivo cliente"],
            correct: 1,
            feedback: ["El AP responde, pero no es quien inicia la solicitud.", "Correcto: el cliente es quien solicita unirse a la red primero."]
          }
        },
        {
          concept: "Las generaciones Wi-Fi",
          explanation: "802.11 se ha actualizado varias veces con el tiempo. Cada versión mejoró la velocidad, el alcance o la eficiencia de la anterior.",
          visual: {
            type: "timeline",
            items: [
              { id: "b", era: "802.11b", title: "802.11b", detail: "Una de las primeras versiones ampliamente usadas. Opera en 2.4 GHz con velocidades bajas comparadas con los estándares actuales." },
              { id: "g", era: "802.11g", title: "802.11g", detail: "Sigue en 2.4 GHz, pero con mayor velocidad que 802.11b, manteniendo compatibilidad con dispositivos anteriores." },
              { id: "n", era: "802.11n · Wi-Fi 4", title: "802.11n (Wi-Fi 4)", detail: "Introduce múltiples antenas (MIMO) y puede operar en 2.4 GHz o 5 GHz, mejorando velocidad y alcance." },
              { id: "ac", era: "802.11ac · Wi-Fi 5", title: "802.11ac (Wi-Fi 5)", detail: "Opera solo en 5 GHz con mayores velocidades, pensado para redes con muchos dispositivos exigentes." },
              { id: "ax", era: "802.11ax · Wi-Fi 6", title: "802.11ax (Wi-Fi 6)", detail: "Mejora la eficiencia en redes con muchos dispositivos conectados a la vez, no solo la velocidad máxima." }
            ]
          },
          check: {
            prompt: "¿Qué generación corresponde al estándar 802.11ac?",
            options: ["Wi-Fi 4", "Wi-Fi 5", "Wi-Fi 6"],
            correct: 1,
            feedback: ["Wi-Fi 4 corresponde a 802.11n, no a 802.11ac.", "Correcto: 802.11ac es la generación que se comercializa como Wi-Fi 5."]
          }
        },
        {
          concept: "En resumen",
          explanation: "802.11 es el estándar que hace posible que distintos fabricantes de routers, laptops y teléfonos puedan comunicarse entre sí sin cables, sin importar la marca.",
          visual: {
            type: "icon-row",
            items: [
              { icon: "📡", label: "802.11", caption: "La familia de estándares de las redes Wi-Fi." },
              { icon: "🔁", label: "Compatibilidad", caption: "Permite que equipos de distintas marcas se entiendan entre sí." }
            ]
          },
          check: {
            prompt: "¿Qué estándar introdujo mejoras pensadas para redes con muchos dispositivos conectados a la vez?",
            options: ["802.11b", "802.11ax (Wi-Fi 6)"],
            correct: 1,
            feedback: ["802.11b es de las versiones más antiguas y simples.", "Correcto: Wi-Fi 6 (802.11ax) se enfoca en eficiencia con muchos dispositivos simultáneos."]
          }
        }
      ]
    },
    practice: {
      type: "build-network",
      prompt: "Construye una red inalámbrica",
      instructions: "Elige un dispositivo y después toca el punto de acceso para conectarlo. Conecta los tres dispositivos para formar la red.",
      hint: "Elige primero un dispositivo de la lista; después toca el punto de acceso para conectarlo.",
      success: "¡Red construida! Cada dispositivo se asoció al AP siguiendo las reglas que define 802.11 — así es como cualquier red Wi-Fi real empieza a funcionar.",
      zones: [{ id: "ap1", label: "AP — Aula de cómputo" }],
      devices: [
        { id: "laptop", label: "Laptop de estudiante", icon: "💻" },
        { id: "phone", label: "Teléfono", icon: "📱" },
        { id: "tablet", label: "Tableta", icon: "📟" }
      ]
    },
    quiz: [
      {
        id: "q1", concept: "Definición de 802.11",
        prompt: "¿Qué es IEEE 802.11?",
        options: ["Un tipo de cable de red", "La familia de estándares que define las redes WLAN", "Una marca de routers", "Un protocolo exclusivo de redes 5G móviles"],
        correct: 1,
        feedback: ["Correcto: 802.11 es el conjunto de estándares para redes inalámbricas de área local.", "802.11 no es una marca ni un cable: es el estándar que define cómo funcionan las redes Wi-Fi."]
      },
      {
        id: "q2", concept: "AP vs cliente",
        prompt: "Un dispositivo coordina la red y permite que otros se conecten a través de él. ¿Qué rol cumple?",
        options: ["Cliente", "Punto de acceso (AP)"],
        correct: 1,
        feedback: ["Un cliente se conecta a la red, pero no la coordina.", "Correcto: ese es el rol del punto de acceso."]
      },
      {
        id: "q3", concept: "Generaciones Wi-Fi",
        prompt: "¿Qué estándar corresponde a Wi-Fi 6?",
        options: ["802.11n", "802.11ac", "802.11ax", "802.11g"],
        correct: 2,
        feedback: ["802.11n es Wi-Fi 4.", "Correcto: 802.11ax es la generación que se vende como Wi-Fi 6."]
      },
      {
        id: "q4", concept: "Aplicación",
        prompt: "En una cafetería, varios celulares y laptops se conectan al mismo router Wi-Fi para navegar. ¿Qué estándar hace posible esa comunicación entre equipos de distintas marcas?",
        options: ["802.11", "HTTP", "TCP/IP exclusivamente", "Bluetooth"],
        correct: 0,
        feedback: ["HTTP y TCP/IP funcionan después de que la conexión inalámbrica ya existe.", "Correcto: 802.11 es el que permite que esos dispositivos, sin importar la marca, se comuniquen de forma inalámbrica."]
      }
    ]
  },

  "mac-address": {
    id: "mac-address",
    moduleId: 1,
    title: "MAC",
    learn: {
      steps: [
        {
          concept: "¿Qué es una dirección MAC?",
          explanation: "Una dirección MAC es un identificador que usan los dispositivos para comunicarse en la capa de enlace. No siempre es una prueba definitiva de identidad: existen mecanismos como la aleatorización y la suplantación que pueden cambiarla u ocultarla.",
          visual: {
            type: "list-select",
            prompt: "Toca cada dato para ampliarlo.",
            items: [
              { id: "fab", label: "Se graba al fabricar la tarjeta de red", note: "Por defecto viene asignada de fábrica, aunque hoy en día muchos dispositivos pueden cambiarla." },
              { id: "bits", label: "Tiene 48 bits", note: "Se representa normalmente como 6 bloques de 2 dígitos hexadecimales, separados por dos puntos." },
              { id: "cambia", label: "Puede cambiar", note: "La aleatorización de MAC (común en teléfonos modernos) y la suplantación hacen que no sea una identidad 100% confiable por sí sola." }
            ]
          },
          check: {
            prompt: "¿Una dirección MAC es siempre una prueba confiable de la identidad de un dispositivo?",
            options: ["Sí, nunca cambia", "No, puede ser aleatoria o suplantada"],
            correct: 1,
            feedback: ["Repasa: existen mecanismos que la cambian o la imitan.", "Correcto: la aleatorización y la suplantación hacen que no sea 100% confiable por sí sola."]
          }
        },
        {
          concept: "Descubre su estructura",
          explanation: "Una dirección MAC convencional de 48 bits se escribe como seis octetos hexadecimales. Toca cada bloque para ver qué representa.",
          visual: {
            type: "byte-breakdown",
            value: "A4:5E:60:12:AB:9F",
            note: "Toca cualquier bloque para ver su función.",
            groups: [
              { index: 0, label: "Identificador de fabricante (1/3)", detail: "Los primeros tres octetos suelen identificar al fabricante de la tarjeta de red (el OUI)." },
              { index: 1, label: "Identificador de fabricante (2/3)", detail: "Sigue siendo parte del identificador de fabricante." },
              { index: 2, label: "Identificador de fabricante (3/3)", detail: "Completa el identificador de fabricante (OUI)." },
              { index: 3, label: "Identificador del dispositivo (1/3)", detail: "Los últimos tres octetos son específicos de ese dispositivo en particular, asignados por el fabricante." },
              { index: 4, label: "Identificador del dispositivo (2/3)", detail: "Sigue siendo parte del identificador específico del dispositivo." },
              { index: 5, label: "Identificador del dispositivo (3/3)", detail: "Completa el identificador específico de ese equipo." }
            ]
          },
          check: {
            prompt: "¿Cuántos octetos hexadecimales tiene una dirección MAC convencional?",
            options: ["4", "6"],
            correct: 1,
            feedback: ["Son seis bloques, no cuatro.", "Correcto: son seis octetos (48 bits en total)."]
          }
        },
        {
          concept: "¿Dónde encontramos las direcciones MAC?",
          explanation: "Tanto los puntos de acceso como los clientes incluyen direcciones MAC en los campos de dirección de las tramas 802.11 — es parte de cómo cada trama sabe de dónde viene y hacia dónde va.",
          visual: {
            type: "node-cluster",
            note: "Toca cada dispositivo para ver su dirección MAC (ficticia).",
            nodes: [
              { id: "ap", label: "AP — Sala de reuniones", sublabel: "Punto de acceso", detail: "MAC: 9C:3D:11:7A:40:02" },
              { id: "laptop", label: "Laptop de Ana", sublabel: "Cliente", detail: "MAC: A4:5E:60:12:AB:9F" },
              { id: "phone", label: "Teléfono de Luis", sublabel: "Cliente", detail: "MAC: DE:AD:BE:EF:33:21" }
            ]
          },
          check: {
            prompt: "¿Solo el punto de acceso incluye una dirección MAC en las tramas 802.11?",
            options: ["Sí, solo el AP", "No, también los clientes"],
            correct: 1,
            feedback: ["Los clientes también tienen su propia MAC en las tramas.", "Correcto: tanto el AP como los clientes incluyen su MAC en los campos de dirección."]
          }
        },
        {
          concept: "¿Una MAC siempre identifica al mismo dispositivo?",
          explanation: "No necesariamente. Muchos dispositivos modernos usan una MAC aleatoria distinta en cada red a la que se conectan (o incluso en cada escaneo), precisamente para dificultar el seguimiento.",
          visual: {
            type: "compare-pair",
            left: { title: "Mismo teléfono — Escaneo 1", rows: [{ label: "Red", value: "Café_Central_WiFi" }, { label: "MAC vista", value: "2E:11:9A:00:4C:5D" }] },
            right: { title: "Mismo teléfono — Escaneo 2", rows: [{ label: "Red", value: "Café_Central_WiFi" }, { label: "MAC vista", value: "6B:88:3F:21:C0:17" }] }
          },
          check: {
            prompt: "Si un análisis de tráfico ve dos MAC distintas en escaneos separados, ¿significa necesariamente que son dos dispositivos distintos?",
            options: ["Sí, siempre son dos dispositivos distintos", "No, podría ser el mismo dispositivo usando MAC aleatoria"],
            correct: 1,
            feedback: ["No siempre: la aleatorización puede hacer parecer que son dos equipos.", "Correcto: con MAC aleatoria, el mismo dispositivo puede mostrar direcciones distintas en cada ocasión."]
          }
        }
      ]
    },
    practice: {
      type: "classify",
      prompt: "Investigador de direcciones",
      instructions: "Clasifica cada entrada de esta tabla ficticia de red según lo que representa.",
      success: "¡Buen trabajo! Reconociste el formato válido, una dirección duplicada y una posible MAC aleatoria — justo lo que hace un analista al revisar una captura.",
      categories: [
        { id: "valida", label: "Formato válido" },
        { id: "invalida", label: "Formato inválido" },
        { id: "duplicada", label: "Dirección duplicada" },
        { id: "aleatoria", label: "Posible MAC aleatoria" }
      ],
      items: [
        {
          id: "i1", label: "A4:5E:60:12:AB:9F", detail: "Vista una sola vez, asociada al dispositivo \"Laptop-Ana\".",
          correctCategory: "valida", explain: "Correcto: tiene 6 octetos hexadecimales separados por \":\" — formato válido.",
          wrongHint: "Cuenta los octetos: tiene 6 bloques de 2 dígitos hexadecimales — eso es un formato válido."
        },
        {
          id: "i2", label: "A4:5E:60:12:AB", detail: "Aparece en un registro de la tabla con solo 5 bloques.",
          correctCategory: "invalida", explain: "Correcto: le falta un octeto — una MAC real siempre tiene 6 bloques.",
          wrongHint: "Cuenta los bloques: le falta uno para completar los 6 octetos que necesita una MAC válida."
        },
        {
          id: "i3", label: "9C:3D:11:7A:40:02", detail: "Esta misma dirección aparece asociada a \"AP-Recepción\" Y, por separado, a \"AP-Bodega\" en el mismo instante.",
          correctCategory: "duplicada", explain: "Correcto: la misma MAC no debería aparecer en dos equipos distintos funcionando al mismo tiempo — es una señal de duplicación o posible suplantación.",
          wrongHint: "Fíjate en el detalle: la misma dirección está asociada a dos dispositivos diferentes a la vez."
        },
        {
          id: "i4", label: "2E:11:9A:00:4C:5D → 6B:88:3F:21:C0:17", detail: "El mismo teléfono mostró la primera MAC ayer y la segunda hoy, en la misma red.",
          correctCategory: "aleatoria", explain: "Correcto: un mismo dispositivo mostrando MAC distintas en ocasiones distintas es el comportamiento típico de la aleatorización de MAC.",
          wrongHint: "El dato clave es que es EL MISMO teléfono mostrando direcciones distintas en momentos distintos."
        },
        {
          id: "i5", label: "DE:AD:BE:EF:33:21", detail: "Vista una sola vez, asociada al dispositivo \"Telefono-Luis\".",
          correctCategory: "valida", explain: "Correcto: 6 octetos hexadecimales, sin repetirse en la tabla — formato válido y sin señales de alerta.",
          wrongHint: "Revisa el formato: tiene 6 bloques hexadecimales y no se repite en la tabla."
        }
      ]
    },
    quiz: [
      {
        id: "q1", concept: "Formato MAC",
        prompt: "¿Cuál de estas cadenas tiene el formato correcto de una dirección MAC?",
        options: ["192.168.1.1", "A4:5E:60:12:AB:9F", "WISPR-Red-5G", "AB-12-CD"],
        correct: 1,
        feedback: ["Esa es una dirección IP, no una MAC.", "Correcto: 6 octetos hexadecimales separados por \":\" es el formato de una MAC."]
      },
      {
        id: "q2", concept: "Bits de una MAC",
        prompt: "¿Cuántos bits tiene una dirección MAC convencional?",
        options: ["16 bits", "32 bits", "48 bits", "128 bits"],
        correct: 2,
        feedback: ["128 bits es el tamaño de una dirección IPv6, no de una MAC.", "Correcto: una MAC convencional tiene 48 bits (6 octetos de 8 bits cada uno)."]
      },
      {
        id: "q3", concept: "Función de la MAC",
        prompt: "¿Para qué se usa una dirección MAC en una red 802.11?",
        options: ["Para cifrar el tráfico de la red", "Para identificar el origen y destino de una trama en la capa de enlace", "Para asignar el canal de la red", "Para generar la contraseña del Wi-Fi"],
        correct: 1,
        feedback: ["El cifrado y la contraseña no dependen de la MAC.", "Correcto: identifica el origen y destino de cada trama en la capa de enlace."]
      },
      {
        id: "q4", concept: "Análisis de escenario",
        prompt: "Un analista observa que el mismo teléfono muestra una MAC distinta cada vez que se conecta a una red pública. ¿Qué explica mejor esta situación?",
        options: ["El teléfono está dañado", "El teléfono usa aleatorización de MAC por privacidad", "Es imposible, las MAC nunca cambian", "La red pública asigna la MAC"],
        correct: 1,
        feedback: ["No es un daño del equipo, es un comportamiento normal de privacidad.", "Correcto: muchos teléfonos modernos aleatorizan su MAC para dificultar el seguimiento entre redes."]
      }
    ]
  },

  "ap-clientes": {
    id: "ap-clientes",
    moduleId: 1,
    title: "AP y clientes",
    learn: {
      steps: [
        {
          concept: "El punto de acceso",
          explanation: "Un punto de acceso (AP) permite que los dispositivos inalámbricos se conecten a una red y coordina ciertas funciones de la comunicación dentro de su BSS (el conjunto de dispositivos asociados a él).",
          visual: {
            type: "list-select",
            prompt: "Toca cada función para ver en qué consiste.",
            items: [
              { id: "coord", label: "Coordina el acceso", note: "Organiza cómo los dispositivos asociados comparten el medio inalámbrico." },
              { id: "retrans", label: "Retransmite el tráfico", note: "Normalmente conecta la red inalámbrica con una red cableada o con Internet." },
              { id: "id", label: "Identifica la red", note: "Transmite el SSID y tiene su propio BSSID, como viste en la lección anterior." }
            ]
          },
          check: {
            prompt: "¿Qué es el BSS de un punto de acceso?",
            options: ["El conjunto de dispositivos asociados a él", "Un tipo de cifrado"],
            correct: 0,
            feedback: ["El cifrado es un concepto distinto, se ve en otro módulo.", "Correcto: el BSS es el conjunto de dispositivos asociados a ese punto de acceso."]
          }
        },
        {
          concept: "Los clientes",
          explanation: "Cualquier dispositivo que se asocia a un punto de acceso para usar la red es un cliente — sin importar su tipo.",
          visual: {
            type: "node-cluster",
            note: "Toca cada dispositivo para ver su rol como cliente.",
            nodes: [
              { id: "laptop", label: "Laptop", sublabel: "Cliente", detail: "Se asocia al AP para navegar, igual que cualquier otro cliente." },
              { id: "phone", label: "Teléfono", sublabel: "Cliente", detail: "También es un cliente — compite por el medio igual que los demás." },
              { id: "tablet", label: "Tableta", sublabel: "Cliente", detail: "Mismo rol: se conecta al AP para enviar y recibir datos." },
              { id: "printer", label: "Impresora inalámbrica", sublabel: "Cliente", detail: "Aunque no la usemos para navegar, también es un cliente asociado al AP." }
            ]
          },
          check: {
            prompt: "¿Una impresora inalámbrica conectada al Wi-Fi también es un cliente de la red?",
            options: ["No, solo cuenta como cliente un dispositivo con pantalla", "Sí, cualquier dispositivo asociado al AP es un cliente"],
            correct: 1,
            feedback: ["No depende de tener pantalla: depende de si está asociado al AP.", "Correcto: ser cliente depende de estar asociado al AP, no del tipo de dispositivo."]
          }
        },
        {
          concept: "Observa cómo se conectan",
          explanation: "Antes de asociarse, un dispositivo solo \"ve\" la red. Después de asociarse, ya puede enviar y recibir tráfico a través del AP.",
          visual: {
            type: "compare-pair",
            left: { title: "Antes de asociarse", rows: [{ label: "Estado", value: "Buscando redes" }, { label: "Tráfico", value: "Ninguno" }, { label: "Dirección IP", value: "Sin asignar" }] },
            right: { title: "Después de asociarse", rows: [{ label: "Estado", value: "Asociado al AP" }, { label: "Tráfico", value: "Puede enviar y recibir" }, { label: "Dirección IP", value: "Asignada" }] }
          },
          check: {
            prompt: "¿Un dispositivo puede enviar tráfico normal por la red ANTES de asociarse al AP?",
            options: ["Sí, puede enviar datos igual", "No, primero debe asociarse"],
            correct: 1,
            feedback: ["Antes de asociarse, el dispositivo todavía no forma parte de la red.", "Correcto: primero debe asociarse al AP para poder enviar y recibir tráfico normal."]
          }
        },
        {
          concept: "¿Todos los dispositivos cumplen la misma función?",
          explanation: "No siempre. Un mismo dispositivo puede actuar como cliente en una situación y como punto de acceso en otra, según cómo esté configurado.",
          visual: {
            type: "list-select",
            prompt: "Toca cada escenario para ver qué rol cumple el dispositivo.",
            items: [
              { id: "s1", label: "Un router doméstico retransmite Internet a toda la casa", note: "Rol: punto de acceso — coordina y retransmite para los demás dispositivos." },
              { id: "s2", label: "Un teléfono comparte sus datos móviles como hotspot", note: "Rol: punto de acceso — en este caso, el teléfono actúa como AP para otros dispositivos, aunque normalmente sea un cliente." },
              { id: "s3", label: "Una laptop conectada al Wi-Fi de la oficina", note: "Rol: cliente — se asocia a un AP ya existente." }
            ]
          }
        }
      ]
    },
    practice: {
      type: "build-network",
      prompt: "Arquitecto de redes",
      instructions: "Conecta la computadora y la impresora al AP de Oficina (están ahí físicamente), y los teléfonos y la tableta al AP de Recepción (es donde se usan).",
      hint: "Revisa dónde está físicamente cada dispositivo según la descripción — esa es la pista para elegir el AP correcto.",
      success: "¡Red bien distribuida! Agrupar los dispositivos por el AP más cercano reduce la distancia de señal y reparte mejor la carga entre ambos puntos de acceso.",
      zones: [
        { id: "ap-recepcion", label: "AP — Recepción" },
        { id: "ap-oficina", label: "AP — Oficina" }
      ],
      devices: [
        { id: "pc", label: "Computadora de oficina", icon: "🖥️", correctZone: "ap-oficina" },
        { id: "printer", label: "Impresora inalámbrica", icon: "🖨️", correctZone: "ap-oficina" },
        { id: "phone1", label: "Teléfono — Recepción", icon: "📱", correctZone: "ap-recepcion" },
        { id: "phone2", label: "Teléfono — Visitas", icon: "📱", correctZone: "ap-recepcion" },
        { id: "tablet", label: "Tableta de Recepción", icon: "📟", correctZone: "ap-recepcion" }
      ]
    },
    quiz: [
      {
        id: "q1", concept: "Identificar AP",
        prompt: "En una red, un dispositivo retransmite el tráfico y permite que los demás se asocien a través de él. ¿Qué es?",
        options: ["Un cliente", "Un punto de acceso", "Un frame de datos", "Un canal"],
        correct: 1,
        feedback: ["Un cliente se asocia, no coordina a los demás.", "Correcto: ese es el rol de un punto de acceso."]
      },
      {
        id: "q2", concept: "Cliente vs AP",
        prompt: "¿Qué diferencia principal hay entre un cliente y un punto de acceso?",
        options: ["El cliente coordina la red; el AP solo se conecta", "El AP coordina la red; el cliente se asocia a ella", "No hay ninguna diferencia real", "Un cliente nunca puede ser también un AP"],
        correct: 1,
        feedback: ["Es al revés: el AP coordina, el cliente se asocia.", "Correcto: el AP coordina la red y el cliente se asocia a ella (aunque un mismo equipo pueda cumplir distintos roles según su configuración)."]
      },
      {
        id: "q3", concept: "Dispositivo no asociado",
        prompt: "¿Qué sucede cuando un dispositivo todavía no está asociado a un AP?",
        options: ["Puede navegar con normalidad", "Todavía no forma parte de la red ni puede enviar tráfico normal", "Automáticamente se convierte en AP", "Bloquea la red para los demás"],
        correct: 1,
        feedback: ["Sin asociarse, el dispositivo no puede enviar tráfico normal por esa red.", "Correcto: hasta que se asocia, el dispositivo no forma parte funcional de la red."]
      },
      {
        id: "q4", concept: "Análisis de topología",
        prompt: "Una topología muestra un AP central con tres líneas hacia una laptop, un teléfono y una impresora. ¿Qué representan esas tres líneas?",
        options: ["Tres puntos de acceso distintos", "Tres clientes asociados al mismo AP", "Tres redes separadas", "Tres canales de frecuencia"],
        correct: 1,
        feedback: ["Solo hay un AP en el centro; los otros tres son clientes.", "Correcto: representan tres clientes asociados a ese mismo punto de acceso."]
      }
    ]
  },

  "canales-frecuencias": {
    id: "canales-frecuencias",
    moduleId: 1,
    title: "Canales y frecuencias",
    learn: {
      steps: [
        {
          concept: "¿Qué son las frecuencias?",
          explanation: "Una red Wi-Fi transmite usando ondas de radio dentro de una banda de frecuencia específica. Dentro de esa banda, el espectro se divide en canales más pequeños que distintas redes pueden usar.",
          visual: {
            type: "list-select",
            prompt: "Toca cada término para ver su definición.",
            items: [
              { id: "banda", label: "Banda", note: "Un rango amplio de frecuencias, como 2.4 GHz o 5 GHz." },
              { id: "canal", label: "Canal", note: "Una subdivisión más estrecha dentro de una banda, por donde transmite una red en concreto." },
              { id: "ancho", label: "Ancho de banda", note: "Cuánto espacio del espectro ocupa una transmisión — a mayor ancho, más datos caben, pero también más espacio consume." }
            ]
          },
          check: {
            prompt: "¿Un canal y una banda son lo mismo?",
            options: ["Sí, son sinónimos", "No, el canal es una subdivisión dentro de la banda"],
            correct: 1,
            feedback: ["No son lo mismo: la banda es el rango amplio, el canal es una parte de ella.", "Correcto: la banda es el rango general; el canal es una subdivisión dentro de esa banda."]
          }
        },
        {
          concept: "Explora las bandas",
          explanation: "Wi-Fi funciona principalmente en dos bandas, con características distintas.",
          visual: {
            type: "compare-pair",
            left: { title: "2.4 GHz", rows: [{ label: "Alcance", value: "Mayor, atraviesa mejor paredes" }, { label: "Canales no solapados", value: "1, 6, 11" }, { label: "Congestión típica", value: "Alta" }] },
            right: { title: "5 GHz", rows: [{ label: "Alcance", value: "Menor, más sensible a obstáculos" }, { label: "Canales no solapados", value: "Muchos más disponibles" }, { label: "Congestión típica", value: "Menor" }] }
          },
          check: {
            prompt: "¿Qué banda suele tener más canales disponibles sin solaparse?",
            options: ["2.4 GHz", "5 GHz"],
            correct: 1,
            feedback: ["2.4 GHz tiene muchos menos canales utilizables sin solapar.", "Correcto: 5 GHz ofrece más canales disponibles, aunque con menor alcance."]
          }
        },
        {
          concept: "Descubre los canales",
          explanation: "En 2.4 GHz, los canales están muy cerca entre sí: si dos redes usan canales demasiado próximos, sus señales se solapan y pueden interferirse. La disponibilidad exacta de canales depende de la región, el equipo y la normativa local.",
          visual: {
            type: "channel-spectrum",
            note: "Toca cada red para ver con cuáles otras se solapa.",
            channels_axis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            overlapThreshold: 5,
            networks: [
              { id: "redA", label: "Red A", channel: 1 },
              { id: "redB", label: "Red B", channel: 4 },
              { id: "redC", label: "Red C", channel: 11 }
            ]
          }
        },
        {
          concept: "Comprueba lo aprendido",
          explanation: "Regla práctica: en 2.4 GHz, dos redes con canales a menos de 5 de distancia suelen solaparse.",
          visual: {
            type: "icon-row",
            items: [
              { icon: "📶", label: "Canales cercanos", caption: "Se solapan y pueden interferirse." },
              { icon: "↔️", label: "Canales separados", caption: "1, 6 y 11 no se solapan entre sí en 2.4 GHz." }
            ]
          },
          check: {
            prompt: "¿Cuál de estos pares de redes se solapa: (canal 2 y canal 9) o (canal 2 y canal 4)?",
            options: ["Canal 2 y canal 9", "Canal 2 y canal 4"],
            correct: 1,
            feedback: ["Esos dos están a 7 de distancia — no se solapan.", "Correcto: están a solo 2 de distancia (menos de 5), así que sí se solapan."]
          }
        }
      ]
    },
    practice: {
      type: "channel-assign",
      prompt: "Controlador del espectro",
      instructions: "Asigna un canal a cada punto de acceso y observa el espectro. Prueba distintas combinaciones hasta encontrar una sin solapamientos.",
      success: "Encontraste una distribución sin solapamientos. No es la única posible: lo importante es entender cómo la separación entre canales reduce la interferencia.",
      aps: [
        { id: "ap1", label: "AP — Recepción" },
        { id: "ap2", label: "AP — Oficina" },
        { id: "ap3", label: "AP — Bodega" }
      ],
      channels: [1, 3, 6, 9, 11],
      axis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      overlapThreshold: 5
    },
    quiz: [
      {
        id: "q1", concept: "Banda vs canal",
        prompt: "¿Cuál es la diferencia entre una banda y un canal?",
        options: ["Son lo mismo", "La banda es un rango amplio de frecuencias; el canal es una subdivisión dentro de ella", "El canal es más amplio que la banda", "La banda solo existe en 5 GHz"],
        correct: 1,
        feedback: ["No son lo mismo.", "Correcto: la banda es el rango amplio (p. ej. 2.4 GHz); el canal es una parte más estrecha dentro de esa banda."]
      },
      {
        id: "q2", concept: "Identificar bandas",
        prompt: "Una red ofrece mayor alcance pero menos canales disponibles sin solapar. ¿Qué banda es más probable que esté usando?",
        options: ["2.4 GHz", "5 GHz"],
        correct: 0,
        feedback: ["5 GHz tiene menor alcance, no mayor.", "Correcto: 2.4 GHz ofrece mayor alcance pero menos canales libres de solapamiento."]
      },
      {
        id: "q3", concept: "Solapamiento",
        prompt: "Dos redes usan los canales 1 y 2 en la banda de 2.4 GHz. ¿Qué es más probable que ocurra?",
        options: ["No hay ningún problema, están muy separados", "Es probable que se solapen e interfieran entre sí", "Automáticamente se combinan en una sola red", "Usan bandas distintas, así que no importa"],
        correct: 1,
        feedback: ["Canal 1 y canal 2 están muy cerca — sí pueden interferirse.", "Correcto: al estar tan cerca, es probable que sus señales se solapen."]
      },
      {
        id: "q4", concept: "Distribución de canales",
        prompt: "Dos puntos de acceso ya usan los canales 1 y 6. ¿Qué canal conviene más para un tercer AP en la misma zona, para minimizar solapamientos?",
        options: ["Canal 2", "Canal 11", "Canal 5", "Canal 1 también"],
        correct: 1,
        feedback: ["El canal 2 está muy cerca del canal 1.", "Correcto: el canal 11 está suficientemente alejado de 1 y 6 para no solaparse con ninguno."]
      }
    ]
  },

  "frames-802-11": {
    id: "frames-802-11",
    moduleId: 1,
    title: "Frames",
    learn: {
      steps: [
        {
          concept: "¿Qué es un frame?",
          explanation: "Un frame (o trama) 802.11 es la unidad básica de transmisión en la capa de enlace: todo lo que los dispositivos se envían por el aire viaja empaquetado en frames.",
          visual: {
            type: "list-select",
            prompt: "Toca cada dato para ampliarlo.",
            items: [
              { id: "def", label: "Frame = trama", note: "Es la unidad de datos que se transmite en la capa de enlace (capa 2)." },
              { id: "capa", label: "Capa de enlace", note: "Es una capa más baja que las páginas web o los correos — estos viajan \"dentro\" de los frames." },
              { id: "aire", label: "Se transmite por el aire", note: "A diferencia de una red cableada, aquí los frames viajan como ondas de radio." }
            ]
          },
          check: {
            prompt: "¿Un frame 802.11 pertenece a la misma capa que una página web (HTTP)?",
            options: ["Sí, es la misma capa", "No, el frame es de una capa más baja (capa de enlace)"],
            correct: 1,
            feedback: ["HTTP opera en una capa más alta.", "Correcto: el frame es de la capa de enlace, una capa más baja que protocolos como HTTP."]
          }
        },
        {
          concept: "Explora las tres categorías",
          explanation: "Los frames 802.11 se agrupan en tres categorías según su función.",
          visual: {
            type: "node-cluster",
            note: "Toca cada categoría para ver ejemplos.",
            nodes: [
              { id: "mgmt", label: "Gestión", sublabel: "Administra la red", detail: "Ejemplos: Beacon, Probe Request/Response, Authentication, Association Request." },
              { id: "ctrl", label: "Control", sublabel: "Facilita la entrega", detail: "Ejemplos: RTS, CTS, ACK — ayudan a coordinar el acceso al medio y confirmar recepción." },
              { id: "data", label: "Datos", sublabel: "Transportan la información", detail: "Llevan el contenido real que se está transmitiendo entre los dispositivos." }
            ]
          },
          check: {
            prompt: "¿A qué categoría pertenece un frame que confirma que un mensaje se recibió bien?",
            options: ["Gestión", "Control"],
            correct: 1,
            feedback: ["La gestión administra la red, no confirma recepción.", "Correcto: confirmar la recepción (ACK) es una función de los frames de control."]
          }
        },
        {
          concept: "Observa una trama",
          explanation: "La estructura exacta varía según el tipo de trama — no todas contienen los mismos campos. Esta es una trama genérica simplificada con fines educativos.",
          visual: {
            type: "frame-fields",
            frameLabel: "Trama 802.11 — estructura simplificada",
            note: "Toca cada campo para ver su función.",
            fields: [
              { id: "fc", label: "Frame Control", width: 2, detail: "Indica el tipo y subtipo de trama, y otras banderas de control." },
              { id: "dur", label: "Duration", width: 1, detail: "Indica cuánto tiempo estará ocupado el medio por esta transmisión." },
              { id: "addr", label: "Address fields", width: 3, detail: "Contienen las direcciones MAC relevantes (origen, destino, y a veces el AP)." },
              { id: "seq", label: "Sequence Control", width: 1, detail: "Ayuda a ordenar los fragmentos y detectar tramas duplicadas." },
              { id: "body", label: "Frame Body", width: 2, detail: "Contiene los datos reales, cuando el tipo de trama lo incluye." },
              { id: "fcs", label: "FCS", width: 1, detail: "Un código de verificación que ayuda a detectar errores de transmisión." }
            ]
          },
          check: {
            prompt: "¿Todas las tramas 802.11 contienen exactamente los mismos campos?",
            options: ["Sí, siempre son idénticas", "No, varían según el tipo de trama"],
            correct: 1,
            feedback: ["La estructura cambia según el tipo (por ejemplo, un ACK no lleva Frame Body).", "Correcto: la estructura exacta depende del tipo de trama."]
          }
        },
        {
          concept: "Identifica los mensajes",
          explanation: "Reconocer la categoría de una trama ayuda a entender qué está pasando en una captura de tráfico.",
          visual: {
            type: "list-select",
            prompt: "Toca cada ejemplo para ver su categoría.",
            items: [
              { id: "beacon", label: "Beacon", note: "Categoría: Gestión — el AP lo transmite periódicamente para anunciar la red." },
              { id: "ack", label: "ACK", note: "Categoría: Control — confirma que una trama se recibió correctamente." },
              { id: "data", label: "Data", note: "Categoría: Datos — transporta el contenido real que se está enviando." }
            ]
          }
        }
      ]
    },
    practice: {
      type: "classify",
      prompt: "Analista de tramas",
      instructions: "Clasifica cada tipo de trama en su categoría correcta: Gestión, Control o Datos.",
      success: "¡Clasificación completa! Reconocer estas categorías es exactamente lo que hace un analista al revisar una captura de tráfico Wi-Fi.",
      categories: [
        { id: "mgmt", label: "Gestión" },
        { id: "ctrl", label: "Control" },
        { id: "data", label: "Datos" }
      ],
      items: [
        { id: "beacon", label: "Beacon", detail: "El AP la transmite periódicamente para anunciar la red.", correctCategory: "mgmt", explain: "Correcto: el Beacon anuncia la presencia de la red — es gestión." },
        { id: "probereq", label: "Probe Request", detail: "Un cliente la envía buscando redes cercanas.", correctCategory: "mgmt", explain: "Correcto: buscar redes es parte de la gestión de la conexión." },
        { id: "proberesp", label: "Probe Response", detail: "El AP responde a un Probe Request.", correctCategory: "mgmt", explain: "Correcto: es la respuesta del AP dentro del proceso de descubrimiento de redes." },
        { id: "auth", label: "Authentication", detail: "Paso previo a asociarse a una red.", correctCategory: "mgmt", explain: "Correcto: forma parte del proceso de gestión de la conexión, antes de asociarse." },
        { id: "assocreq", label: "Association Request", detail: "El cliente pide asociarse formalmente al AP.", correctCategory: "mgmt", explain: "Correcto: es otro paso de gestión, antes de poder transmitir datos." },
        { id: "ack", label: "ACK", detail: "Confirma que una trama anterior se recibió bien.", correctCategory: "ctrl", explain: "Correcto: confirmar la recepción es una función de control." },
        { id: "rts", label: "RTS (Request to Send)", detail: "Pide permiso para transmitir y reservar el medio.", correctCategory: "ctrl", explain: "Correcto: coordina el acceso al medio — es control." },
        { id: "cts", label: "CTS (Clear to Send)", detail: "Responde autorizando la transmisión solicitada.", correctCategory: "ctrl", explain: "Correcto: también coordina el acceso al medio — es control." },
        { id: "data", label: "Data", detail: "Lleva el contenido real que se está transmitiendo.", correctCategory: "data", explain: "Correcto: transporta la información — es una trama de datos." }
      ]
    },
    quiz: [
      {
        id: "q1", concept: "Categorías de frames",
        prompt: "¿Cuáles son las tres categorías principales de frames 802.11?",
        options: ["Rápidos, lentos y medios", "Gestión, control y datos", "Públicos, privados y mixtos", "Entrada, salida y reenvío"],
        correct: 1,
        feedback: ["Esas no son categorías reales de 802.11.", "Correcto: gestión, control y datos son las tres categorías principales."]
      },
      {
        id: "q2", concept: "Beacon",
        prompt: "¿Qué función cumple un frame Beacon?",
        options: ["Confirma la recepción de un mensaje", "Anuncia periódicamente la presencia de la red", "Transporta el contenido de una página web", "Pide permiso para transmitir"],
        correct: 1,
        feedback: ["Esa es la función de un ACK, no de un Beacon.", "Correcto: el Beacon anuncia la red periódicamente."]
      },
      {
        id: "q3", concept: "ACK vs Data",
        prompt: "¿En qué se diferencia una trama ACK de una trama Data?",
        options: ["Son exactamente lo mismo", "El ACK confirma recepción; la trama Data transporta el contenido real", "El ACK transporta datos; la trama Data solo confirma recepción", "El ACK solo lo envía el AP"],
        correct: 1,
        feedback: ["Son funciones distintas, no lo mismo.", "Correcto: el ACK confirma recepción (control); la trama Data lleva el contenido real."]
      },
      {
        id: "q4", concept: "Campos de una trama",
        prompt: "¿Qué campo de una trama ayuda a detectar errores de transmisión?",
        options: ["Duration", "FCS", "Sequence Control", "Address fields"],
        correct: 1,
        feedback: ["Duration indica cuánto tiempo estará ocupado el medio, no detecta errores.", "Correcto: el FCS es el código de verificación que ayuda a detectar errores."]
      },
      {
        id: "q5", concept: "Clasificar una secuencia",
        prompt: "Una comunicación sigue esta secuencia: Probe Request → Probe Response → Authentication → Association Request. ¿A qué categoría pertenece toda esta secuencia?",
        options: ["Control", "Datos", "Gestión", "Ninguna categoría específica"],
        correct: 2,
        feedback: ["Ninguno de esos pasos transporta datos ni confirma recepción.", "Correcto: toda esa secuencia forma parte de la gestión de la conexión, antes de poder transmitir datos."]
      }
    ]
  }
};

// ===========================================================================
// MÓDULO 3 — AUTENTICACIÓN
// Siete lecciones (Four-Way Handshake, PMK, PTK, GTK, Nonce, MIC, PMKID) más
// la misión final "Operación: Autenticación". Usan el mismo motor de
// lecciones (Aprender → Practicar → Comprobar) con piezas visuales y
// prácticas nuevas propias del módulo (ver el bloque "MÓDULO 3 — componentes"
// más abajo). Todo es una simulación educativa: ningún valor hexadecimal
// mostrado es real ni se realiza ninguna operación de red.
// ===========================================================================

// Orden del recorrido del módulo: define la navegación entre lecciones, las
// "conexiones" al terminar cada una y el desbloqueo de la misión final.
const M3_SEQUENCE = ["four-way-handshake", "pmk", "ptk", "gtk", "nonce", "mic", "pmkid"];
const M3_MISSION_ID = "m3-mision";
// Módulos que tienen misión final propia (barra de progreso + fila de misión
// en Teoría). Por ahora solo el Módulo 3.
const moduleMissions = { 3: { missionId: M3_MISSION_ID, sequence: M3_SEQUENCE } };

Object.assign(lessons, {
  "four-way-handshake": {
    id: "four-way-handshake",
    moduleId: 3,
    title: "Four-Way Handshake",
    subtitle: "La conversación de autenticación",
    labTheme: true,
    bridge: "Ya viste la conversación completa. Ahora descubre de dónde parte todo: la clave que ambos lados conocen antes de empezar.",
    ctf: "En los retos analizarás capturas reales de handshakes: ahora sabes qué ocurre en cada uno de los cuatro mensajes.",
    learn: {
      steps: [
        {
          concept: "Detrás de la conexión",
          explanation: "Tocas «Conectar» y en un segundo estás en línea. Pero antes de enviar un solo dato, el cliente y el AP mantienen una conversación de cuatro mensajes. Pulsa «Conectar» y obsérvala.",
          visual: { type: "connect-reveal", ssid: "Café_Central_WiFi" },
          check: {
            prompt: "Durante esa conversación, ¿viaja la contraseña de la red por el aire?",
            options: ["Sí, el cliente se la envía al AP", "No, nunca se transmite"],
            correct: 1,
            feedback: ["Exacto: ninguno de los cuatro mensajes lleva la contraseña.", "Repasa: la contraseña nunca se transmite; ambos lados demuestran que la conocen sin enviarla."]
          }
        },
        {
          concept: "Los cuatro mensajes",
          explanation: "Toca cada mensaje para ver lo esencial que lleva. Fíjate en la dirección de la flecha: quién lo envía.",
          visual: {
            type: "hs-explorer",
            note: "Toca un mensaje para inspeccionarlo.",
            messages: [
              { n: 1, title: "El AP inicia: envía su ANonce", detail: "El AP genera un valor aleatorio, el ANonce, y se lo envía al cliente. Con él, el cliente ya tiene todo lo necesario para calcular la PTK.", tags: ["ANonce"] },
              { n: 2, title: "El cliente responde: SNonce + MIC", detail: "El cliente genera su propio SNonce, calcula la PTK y envía el SNonce acompañado de un MIC. El MIC demuestra que conoce la clave correcta, sin revelarla.", tags: ["SNonce", "PTK", "MIC"] },
              { n: 3, title: "El AP valida, instala y entrega la GTK", detail: "Con el SNonce, el AP calcula su propia PTK y verifica el MIC. Si coincide, indica que se instalen las claves y entrega la GTK cifrada.", tags: ["PTK", "MIC", "GTK"] },
              { n: 4, title: "El cliente confirma", detail: "El cliente confirma (también con MIC) que instaló las claves. El handshake termina y el tráfico ya viaja protegido.", tags: ["MIC"] }
            ],
            summary: "AP → ANonce · Cliente → SNonce + MIC · AP → claves + GTK · Cliente → confirmación"
          }
        },
        {
          concept: "Observa la conversación completa",
          explanation: "Este video recorre el intercambio de principio a fin. Al terminar, pasa al siguiente paso.",
          visual: { type: "video", src: "./img/four-way-handshake.mp4", before: "Observa la conversación completa.", after: "Ahora comprueba si puedes reconstruirla." }
        },
        {
          concept: "Ahora comprueba si puedes reconstruirla",
          explanation: "Elige cada punto de la línea de tiempo y responde quién envía ese mensaje. Completa los cuatro para ver el resumen.",
          visual: {
            type: "hs-recall",
            items: [
              { n: 1, sender: "ap", explain: "El AP abre la conversación con su ANonce.", hint: "Piensa: ¿quién inicia el intercambio de nonces?" },
              { n: 2, sender: "client", explain: "El cliente responde con su SNonce y un MIC.", hint: "Este mensaje responde al primero. ¿Quién recibió el mensaje 1?" },
              { n: 3, sender: "ap", explain: "El AP verifica el MIC, indica instalar las claves y entrega la GTK.", hint: "La GTK es la clave de grupo: ¿quién la reparte a todos los clientes?" },
              { n: 4, sender: "client", explain: "El cliente confirma y el handshake termina.", hint: "El último mensaje cierra la conversación respondiendo al mensaje 3." }
            ]
          }
        }
      ]
    },
    practice: {
      type: "hs-builder",
      prompt: "Reconstruye el Handshake",
      instructions: "Coloca cada tarjeta de función en su mensaje, elige quién lo envía y añade el elemento principal que viaja en él. Puedes arrastrar o tocar una pieza y después la casilla.",
      success: "Así es: el AP abre con su ANonce, el cliente responde con su SNonce y un MIC, el AP valida, instala las claves y entrega la GTK, y el cliente confirma.",
      cards: [
        { id: "f1", slot: 1, text: "Abre el intercambio enviando un valor aleatorio propio.", hint: "Piensa: ¿quién inicia el intercambio de este valor? Solo puede abrir quien no ha recibido nada todavía." },
        { id: "f2", slot: 2, text: "Responde con su propio valor aleatorio y una prueba (MIC) de que ya calculó la PTK.", hint: "Para calcular la PTK hacen falta los dos nonces: este mensaje solo puede ir después de recibir el primero." },
        { id: "f3", slot: 3, text: "Verifica el MIC, indica instalar las claves y entrega la clave de grupo cifrada.", hint: "La clave de grupo solo puede entregarse cifrada cuando ambos lados ya tienen la PTK y el MIC fue verificado." },
        { id: "f4", slot: 4, text: "Confirma que las claves quedaron instaladas; desde aquí el tráfico va protegido.", hint: "Una confirmación siempre cierra la conversación: no puede ir antes de que se entreguen las claves." }
      ],
      senders: { 1: "ap", 2: "client", 3: "ap", 4: "client" },
      senderHint: "Revisa la dirección de este mensaje: los mensajes 1 y 3 los envía el AP; el 2 y el 4, el cliente. ¿Quién genera lo que viaja en él?",
      tokens: [
        { id: "anonce", slot: 1, label: "ANonce", hint: "El ANonce es el valor aleatorio del AP (Authenticator) y es lo primero que viaja." },
        { id: "snonce", slot: 2, label: "SNonce + MIC", hint: "El SNonce es del cliente (Supplicant): lo envía como respuesta, ya protegido con MIC." },
        { id: "gtk", slot: 3, label: "GTK + MIC", hint: "La GTK la entrega el AP, y solo después de comprobar el MIC del cliente." },
        { id: "conf", slot: 4, label: "Solo MIC (confirmación)", hint: "El último mensaje no aporta valores nuevos: solo confirma, con su MIC." }
      ]
    },
    quizTitle: "Desafío: Four-Way Handshake",
    quiz: [
      {
        id: "q1", concept: "Orden de los mensajes",
        prompt: "¿Cuál es el orden correcto del Four-Way Handshake?",
        options: ["ANonce (AP) → SNonce + MIC (cliente) → claves + GTK (AP) → confirmación (cliente)", "SNonce (cliente) → ANonce (AP) → confirmación (cliente) → GTK (AP)", "GTK (AP) → ANonce (AP) → SNonce (cliente) → confirmación (cliente)", "Contraseña (cliente) → PMK (AP) → PTK (cliente) → GTK (AP)"],
        correct: 0,
        feedback: ["Correcto: el AP abre con su ANonce y el cliente cierra confirmando.", "El intercambio empieza con el ANonce del AP; la GTK llega en el mensaje 3 y la contraseña nunca viaja."]
      },
      {
        id: "q2", concept: "AP y cliente",
        prompt: "¿Quién envía los mensajes 1 y 3?",
        options: ["El AP", "El cliente", "El cliente envía el 1 y el AP el 3", "Un servidor externo"],
        correct: 0,
        feedback: ["Correcto: el AP envía el 1 (ANonce) y el 3 (claves + GTK); el cliente, el 2 y el 4.", "Los mensajes impares los envía el AP: el 1 con el ANonce y el 3 con la GTK."]
      },
      {
        id: "q3", concept: "Nonces",
        prompt: "¿Qué función cumplen el ANonce y el SNonce?",
        options: ["Son la contraseña cifrada", "Son valores aleatorios nuevos que, junto con la PMK y las MAC, permiten derivar una PTK distinta en cada sesión", "Indican el canal de la red", "Reemplazan a la PMK"],
        correct: 1,
        feedback: ["Correcto: los nonces aportan valores nuevos en cada sesión.", "Los nonces son valores aleatorios de un solo uso que participan en la derivación de la PTK."]
      },
      {
        id: "q4", concept: "PTK",
        prompt: "¿Cuándo tiene el cliente todo lo necesario para calcular la PTK?",
        options: ["Antes de que empiece el handshake", "Después de recibir el mensaje 1, porque ya tiene el ANonce y su propio SNonce", "Solo después del mensaje 4", "Nunca: la PTK solo la calcula el AP"],
        correct: 1,
        feedback: ["Correcto: con el ANonce del mensaje 1 ya tiene los cinco ingredientes.", "El cliente calcula la PTK tras recibir el ANonce (mensaje 1); por eso el mensaje 2 ya lleva un MIC."]
      },
      {
        id: "q5", concept: "MIC",
        prompt: "En el mensaje 2, ¿qué le demuestra al AP un MIC válido?",
        options: ["Que el cliente cifró la contraseña", "Que el canal está libre", "Que el cliente obtuvo la misma PTK (y por tanto conoce la clave correcta) y que el mensaje no fue alterado", "Que el cliente ya recibió la GTK"],
        correct: 2,
        feedback: ["Correcto: el MIC prueba que el cliente conoce la clave, sin revelarla, y protege la integridad del mensaje.", "El MIC no cifra nada: sirve para verificar que el mensaje no fue alterado y que el emisor tiene la clave correcta."]
      }
    ]
  },

  "pmk": {
    id: "pmk",
    moduleId: 3,
    title: "PMK",
    subtitle: "La clave maestra",
    labTheme: true,
    bridge: "Ya conoces la clave maestra. Ahora descubre cómo se utiliza junto con otros valores para establecer la PTK.",
    ctf: "Toda la cadena de claves depende de la PMK: por eso la fortaleza de la contraseña de una red es tan importante en un análisis de seguridad.",
    learn: {
      steps: [
        {
          link: "En el handshake viste que ambos lados ya comparten algo antes de empezar. Esa pieza es la PMK.",
          concept: "¿De dónde sale la PMK?",
          explanation: "Origen → proceso → resultado. Toca cada etapa.",
          visual: {
            type: "flow-chain",
            nodes: [
              { id: "origin", label: "Contraseña + SSID", sub: "Origen", detail: "En WPA2-Personal, el punto de partida es la contraseña de la red junto con su nombre (SSID). En redes empresariales, la PMK proviene de la autenticación 802.1X." },
              { id: "proc", label: "Derivación", sub: "Proceso", detail: "Una función criptográfica transforma esos datos en una clave de 256 bits. El cliente y el AP hacen el mismo cálculo, cada uno por su lado." },
              { id: "pmk", label: "PMK", sub: "Resultado", tone: "key", detail: "Pairwise Master Key: la clave maestra. Ambos lados la tienen ANTES del handshake y nunca se envía por el aire." }
            ],
            final: "PMK lista: ahora puede participar en el establecimiento de claves."
          },
          check: {
            prompt: "¿El cliente le envía la PMK al AP para que la compruebe?",
            options: ["Sí, en el mensaje 2", "No, cada uno la obtiene por su cuenta"],
            correct: 1,
            feedback: ["Exacto: la PMK nunca viaja; cada lado ya la tiene.", "Repasa: la PMK nunca se transmite. El AP comprueba que el cliente la conoce mediante el MIC."]
          }
        },
        {
          concept: "PMK ≠ PTK",
          explanation: "La PMK no cifra tu tráfico directamente: participa en el establecimiento de una clave nueva para cada sesión.",
          visual: {
            type: "flow-chain",
            nodes: [
              { id: "pmk", label: "PMK", sub: "Clave maestra", tone: "key", detail: "Se mantiene igual mientras no cambie la contraseña de la red." },
              { id: "est", label: "Establecimiento de claves", sub: "Four-Way Handshake", detail: "Durante el handshake, la PMK se combina con otros valores (nonces y direcciones MAC)." },
              { id: "ptk", label: "PTK", sub: "Clave de sesión", tone: "key", detail: "Una clave temporal nueva para esta sesión. Es la que protege el tráfico individual." }
            ],
            final: "La PMK es el origen; la PTK es el resultado de cada sesión."
          },
          check: {
            prompt: "¿La PMK y la PTK son la misma clave?",
            options: ["Sí, son sinónimos", "No: la PTK se deriva de la PMK en cada sesión"],
            correct: 1,
            feedback: ["Son distintas: una es la maestra y la otra es temporal.", "Correcto: la PTK se deriva de la PMK, junto con otros valores, en cada sesión."]
          }
        },
        {
          concept: "¿Quién conoce la PMK?",
          explanation: "Ambos extremos la tienen; el aire, no. Toca cada elemento de la escena.",
          visual: {
            type: "auth-scene",
            note: "Toca cada pieza para ver qué representa.",
            tokens: [
              { id: "pmk-ap", side: "ap", label: "PMK", tone: "key", detail: "El AP conoce la PMK (en WPA2-Personal la obtiene de la contraseña configurada en la red)." },
              { id: "air", side: "air", label: "Aire: nonces y MIC", tone: "air", detail: "Por el aire solo viajan los nonces, los MIC y la GTK cifrada. Ni la contraseña ni la PMK." },
              { id: "pmk-cl", side: "client", label: "PMK", tone: "key", detail: "El cliente obtiene la misma PMK a partir de la contraseña que escribió el usuario." }
            ]
          },
          check: {
            prompt: "Si alguien escucha todo el handshake, ¿ve la PMK?",
            options: ["Sí, viaja en claro en el mensaje 1", "No, la PMK nunca se transmite"],
            correct: 1,
            feedback: ["Repasa: la PMK no aparece en ningún mensaje.", "Correcto: la PMK nunca viaja por el aire."]
          }
        },
        {
          concept: "En resumen",
          explanation: "Dos claves, dos papeles distintos.",
          visual: {
            type: "compare-pair",
            left: { title: "PMK", rows: [{ label: "Rol", value: "Clave maestra" }, { label: "¿Cambia en cada sesión?", value: "No" }, { label: "¿Viaja por el aire?", value: "No" }, { label: "Uso", value: "Punto de partida" }] },
            right: { title: "PTK", rows: [{ label: "Rol", value: "Clave de sesión" }, { label: "¿Cambia en cada sesión?", value: "Sí" }, { label: "¿Viaja por el aire?", value: "No" }, { label: "Uso", value: "Proteger el tráfico individual" }] }
          }
        }
      ]
    },
    practice: {
      type: "identify-match",
      prompt: "Encuentra la PMK",
      identify: {
        prompt: "Seis elementos de autenticación, sin nombre. Lee sus propiedades y elige cuál es la PMK.",
        layout: "cards",
        items: [
          { id: "a", label: "Elemento A", reveal: "PTK", value: "f3 91 0c 7a … 5e 2d", meta: ["Se calcula durante el handshake", "Cambia en cada conexión"], hint: "Este cambia en cada conexión: es una clave derivada, no la maestra. (Es la PTK.)" },
          { id: "b", label: "Elemento B", reveal: "PMK", value: "a3 f1 9e 04 … 77 c2", meta: ["256 bits", "En WPA2-Personal se deriva de la contraseña y el SSID", "Ambos lados la conocen antes del handshake"], correct: true },
          { id: "c", label: "Elemento C", reveal: "Contraseña", value: "Cafe2024!", meta: ["Texto que escribe el usuario"], hint: "Es la contraseña: el punto de partida, pero no la clave maestra. La PMK se deriva de ella." },
          { id: "d", label: "Elemento D", reveal: "ANonce", value: "1f 6a 93 c0 … 7b e2", meta: ["Valor aleatorio de un solo uso", "Lo genera el AP"], hint: "Un valor aleatorio de un solo uso es un nonce (este es el ANonce), no una clave." },
          { id: "e", label: "Elemento E", reveal: "MIC", value: "5e 1b 77 a0 … 9c 4d", meta: ["Acompaña a un mensaje", "Permite detectar alteraciones"], hint: "Algo que acompaña a un mensaje para detectar alteraciones es un MIC." },
          { id: "f", label: "Elemento F", reveal: "GTK", value: "08 bd 42 e1 … 3a 90", meta: ["La comparten todos los clientes", "Protege el tráfico broadcast"], hint: "Una clave compartida por todos los clientes para el tráfico de grupo es la GTK." }
        ],
        success: "¡Encontrada! La PMK es la clave maestra: existe antes del handshake y no cambia en cada conexión."
      },
      match: {
        prompt: "Ahora relaciona cada término con su papel.",
        hint: "Esa combinación no es correcta. Pista: la maestra existe antes de la sesión; la temporal nace en cada handshake.",
        pairs: [
          { id: "pmk", left: "PMK", right: "Clave maestra: punto de partida del establecimiento de claves" },
          { id: "ptk", left: "PTK", right: "Clave temporal derivada para la sesión" },
          { id: "pass", left: "Contraseña", right: "Lo que escribe el usuario; en WPA2-Personal, origen de la PMK" }
        ]
      },
      success: "¡Bien! Distingues la contraseña, la clave maestra y la clave de sesión."
    },
    quizTitle: "Desafío: PMK",
    quiz: [
      {
        id: "q1", concept: "Qué es la PMK",
        prompt: "¿Qué representa la PMK?",
        options: ["La clave temporal que cambia en cada sesión", "La clave maestra de la que parte el establecimiento de claves", "El nombre de la red", "Un valor aleatorio de un solo uso"],
        correct: 1,
        feedback: ["Correcto: es la Pairwise Master Key, la clave maestra.", "La PMK es la clave maestra; la que cambia en cada sesión es la PTK."]
      },
      {
        id: "q2", concept: "Origen de la PMK",
        prompt: "En una red WPA2-Personal, ¿de dónde proviene la PMK?",
        options: ["La genera el AP al azar en cada conexión", "Viaja por el aire en el mensaje 1", "Se deriva de la contraseña de la red y el SSID", "Es la dirección MAC del AP"],
        correct: 2,
        feedback: ["Correcto: contraseña + SSID → derivación → PMK.", "En WPA2-Personal la PMK se deriva de la contraseña y el SSID; nunca viaja por el aire."]
      },
      {
        id: "q3", concept: "PMK vs PTK",
        prompt: "¿Cuál es la diferencia entre la PMK y la PTK?",
        options: ["Son la misma clave con distinto nombre", "La PMK es la clave maestra; la PTK es una clave temporal derivada de ella en cada sesión", "La PTK es la maestra y la PMK la temporal", "La PMK protege el tráfico de grupo"],
        correct: 1,
        feedback: ["Correcto: de una PMK estable nace una PTK nueva en cada sesión.", "La PMK es la maestra (estable); la PTK es la de sesión (cambia cada vez)."]
      },
      {
        id: "q4", concept: "La PMK no viaja",
        prompt: "Verdadero o falso: durante el Four-Way Handshake, el cliente envía la PMK al AP para que la compruebe.",
        options: ["Verdadero", "Falso"],
        correct: 1,
        feedback: ["Correcto: la PMK nunca viaja; el AP lo comprueba con el MIC.", "Es falso: ambos lados ya tienen la PMK y el AP comprueba que el cliente la conoce mediante el MIC."]
      }
    ]
  },

  "ptk": {
    id: "ptk",
    moduleId: 3,
    title: "PTK",
    subtitle: "Construyendo la clave de sesión",
    labTheme: true,
    bridge: "La PTK protege lo que el AP habla con UN cliente. ¿Y cuando el AP necesita hablarle a todos a la vez?",
    ctf: "Saber qué entra en la PTK te permite reconocer qué datos de una captura describen una sesión: nonces y direcciones MAC.",
    learn: {
      steps: [
        {
          link: "Ya aprendiste qué es la PMK. Ahora observa cómo participa en la generación de la PTK.",
          concept: "Los ingredientes de la PTK",
          explanation: "Toca cada componente para descubrir por qué participa. Cuando los conozcas todos, verás nacer la PTK.",
          visual: {
            type: "key-merge",
            note: "Simulación conceptual: no se realiza ningún cálculo criptográfico real.",
            inputs: [
              { id: "pmk", label: "PMK", tone: "key", detail: "El secreto compartido: solo el cliente y el AP legítimos la conocen." },
              { id: "apmac", label: "MAC del AP", tone: "mac", detail: "Liga la clave a ESTE punto de acceso." },
              { id: "climac", label: "MAC del cliente", tone: "mac", detail: "Liga la clave a ESTE cliente." },
              { id: "anonce", label: "ANonce", tone: "nonce", detail: "Valor aleatorio del AP: hace que la clave sea nueva." },
              { id: "snonce", label: "SNonce", tone: "nonce", detail: "Valor aleatorio del cliente: aporta su parte de novedad." }
            ],
            output: { label: "PTK", detail: "Pairwise Transient Key: la clave de esta sesión entre este cliente y este AP." }
          },
          check: {
            prompt: "¿Por qué participan las direcciones MAC?",
            options: ["Para que la clave quede ligada a ese par concreto de dispositivos", "Para elegir el canal de la red"],
            correct: 0,
            feedback: ["Correcto: así la PTK pertenece solo a ese cliente y ese AP.", "Las MAC no tienen que ver con el canal: ligan la clave a esos dos dispositivos."]
          }
        },
        {
          concept: "Misma PMK, distinta PTK",
          explanation: "Mismo cliente, misma red, misma contraseña, dos días distintos. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "Sesión del lunes", rows: [{ label: "PMK", value: "a3f1…77c2" }, { label: "MAC AP / cliente", value: "9C:3D… / A4:5E…" }, { label: "ANonce", value: "1f6a…7be2" }, { label: "SNonce", value: "c84d…0a35" }, { label: "PTK", value: "7e02…b419" }] },
            right: { title: "Sesión del martes", rows: [{ label: "PMK", value: "a3f1…77c2" }, { label: "MAC AP / cliente", value: "9C:3D… / A4:5E…" }, { label: "ANonce", value: "9b30…e15d" }, { label: "SNonce", value: "44fa…c6e8" }, { label: "PTK", value: "d1c8…02af" }] }
          },
          check: {
            prompt: "¿Qué hace que la PTK cambie de una sesión a otra?",
            options: ["Los nonces nuevos", "La PMK cambia sola cada día"],
            correct: 0,
            feedback: ["Correcto: la PMK y las MAC son iguales; los nonces son los que cambian.", "La PMK es la misma ambos días: lo que cambia son los nonces."]
          }
        },
        {
          concept: "¿Qué hay dentro de la PTK?",
          explanation: "No necesitas memorizar los nombres: fíjate en que una sola PTK alimenta al MIC, a la entrega de la GTK y al cifrado de tus datos.",
          visual: {
            type: "frame-fields",
            frameLabel: "PTK — se divide en partes con funciones distintas",
            note: "Toca cada parte.",
            fields: [
              { id: "kck", label: "KCK", width: 1, detail: "Key Confirmation Key: se usa para calcular el MIC de los mensajes del handshake." },
              { id: "kek", label: "KEK", width: 1, detail: "Key Encryption Key: protege la entrega de la GTK en el mensaje 3." },
              { id: "tk", label: "TK", width: 2, detail: "Temporal Key: cifra el tráfico individual cuando el handshake termina." }
            ]
          }
        },
        {
          link: "Ya sabes de dónde viene la PTK. Ahora observa cómo participa durante el intercambio.",
          concept: "La PTK durante el handshake",
          explanation: "Toca cada mensaje y sigue a la PTK.",
          visual: {
            type: "hs-explorer",
            messages: [
              { n: 1, title: "Llega el ANonce", detail: "Al recibir el ANonce, el cliente ya tiene los cinco ingredientes y calcula la PTK.", tags: ["ANonce"] },
              { n: 2, title: "SNonce protegido con la PTK", detail: "El cliente envía su SNonce con un MIC calculado con una parte de su PTK (KCK).", tags: ["SNonce", "MIC"] },
              { n: 3, title: "El AP obtiene la misma PTK", detail: "Con el SNonce, el AP calcula su PTK y comprueba el MIC: si coincide, ambos tienen la misma PTK.", tags: ["PTK", "MIC", "GTK"] },
              { n: 4, title: "PTK instalada", detail: "El cliente confirma; ambos instalan la PTK y el tráfico individual queda protegido.", tags: ["PTK"] }
            ],
            summary: "La PTK nunca viaja: cada lado la calcula y el MIC demuestra que coinciden."
          },
          check: {
            prompt: "¿Se envía la PTK por el aire durante el handshake?",
            options: ["Sí, en el mensaje 3", "No, cada lado la calcula por separado"],
            correct: 1,
            feedback: ["Repasa: la PTK no aparece en ningún mensaje.", "Correcto: cada lado la deriva y el MIC demuestra que coinciden."]
          }
        }
      ]
    },
    practice: {
      type: "slot-builder",
      prompt: "Construye la PTK",
      instructions: "Coloca cada componente en el papel que cumple dentro del esquema. Hay piezas que NO participan: descártalas.",
      output: "PTK",
      slots: [
        { id: "secret", role: "Secreto compartido", accepts: "pmk" },
        { id: "aa", role: "Identidad del AP", accepts: "apmac" },
        { id: "spa", role: "Identidad del cliente", accepts: "climac" },
        { id: "an", role: "Valor aleatorio del AP", accepts: "anonce" },
        { id: "sn", role: "Valor aleatorio del cliente", accepts: "snonce" }
      ],
      tiles: [
        { id: "pmk", label: "PMK", tone: "key" },
        { id: "apmac", label: "MAC del AP", tone: "mac" },
        { id: "climac", label: "MAC del cliente", tone: "mac" },
        { id: "anonce", label: "ANonce", tone: "nonce" },
        { id: "snonce", label: "SNonce", tone: "nonce" },
        { id: "ssid", label: "SSID", decoy: true, hint: "El SSID participa antes, al derivar la PMK en WPA2-Personal, pero no directamente en la PTK." },
        { id: "pass", label: "Contraseña", decoy: true, hint: "La contraseña nunca entra directamente: ya está «resumida» dentro de la PMK." },
        { id: "gtk", label: "GTK", decoy: true, hint: "La GTK es otra clave (la de grupo): no se usa para derivar la PTK." },
        { id: "mic", label: "MIC", decoy: true, hint: "El MIC se calcula DESPUÉS, usando una parte de la PTK. No puede ser uno de sus ingredientes." }
      ],
      success: "PMK + MAC del AP + MAC del cliente + ANonce + SNonce: una clave nueva y exclusiva para esta sesión."
    },
    quizTitle: "Desafío: PTK",
    quiz: [
      {
        id: "q1", concept: "Qué es la PTK",
        prompt: "¿Qué representa la PTK?",
        options: ["La clave maestra de la red", "La clave temporal de la sesión entre un cliente y el AP", "La clave compartida por todos los clientes", "El identificador de la PMK"],
        correct: 1,
        feedback: ["Correcto: Pairwise Transient Key, la clave de sesión individual.", "La PTK es la clave temporal de la sesión entre un cliente y el AP."]
      },
      {
        id: "q2", concept: "Componentes de la PTK",
        prompt: "¿Qué elementos participan en la derivación de la PTK?",
        options: ["Solo la contraseña", "La GTK y el SSID", "PMK, ANonce, SNonce, MAC del AP y MAC del cliente", "El MIC y el canal"],
        correct: 2,
        feedback: ["Correcto: los cinco ingredientes que colocaste en la práctica.", "Son cinco: PMK, ANonce, SNonce y las MAC del AP y del cliente."]
      },
      {
        id: "q3", concept: "PMK vs PTK",
        prompt: "Un cliente se conecta el lunes y el martes a la misma red, con la misma contraseña. ¿Su PTK será la misma?",
        options: ["Sí, porque la PMK es la misma", "No: los nonces cambian, así que la PTK es distinta en cada sesión"],
        correct: 1,
        feedback: ["Correcto: la PMK se mantiene, pero los nonces nuevos producen una PTK nueva.", "La PMK es la misma, pero los nonces cambian: la PTK es distinta cada vez."]
      },
      {
        id: "q4", concept: "PTK y handshake",
        prompt: "¿Qué relación tiene la PTK con el Four-Way Handshake?",
        options: ["La PTK se transmite en el mensaje 1", "Se deriva durante el handshake y el MIC demuestra que ambos lados obtuvieron la misma", "No tienen relación", "El handshake usa la PTK para cifrar la contraseña"],
        correct: 1,
        feedback: ["Correcto: el handshake permite que ambos la deriven y comprueben que coincide.", "La PTK nunca viaja: se deriva durante el handshake y el MIC confirma que coincide en ambos lados."]
      }
    ]
  },

  "gtk": {
    id: "gtk",
    moduleId: 3,
    title: "GTK",
    subtitle: "Cuando la comunicación es para el grupo",
    labTheme: true,
    bridge: "Ya conoces las claves. Ahora observa los valores que hacen única cada sesión: los Nonces.",
    ctf: "Distinguir tráfico individual y de grupo te ayudará a interpretar los paquetes broadcast y multicast de una captura.",
    learn: {
      steps: [
        {
          link: "La PTK protege lo que el AP habla con UN cliente. ¿Y cuando habla con todos?",
          concept: "Uno a uno vs. uno a todos",
          explanation: "Envía un mensaje individual y después uno para todo el grupo. Observa qué clave usa el AP y quién puede leerlo.",
          visual: { type: "group-net", clients: ["Cliente 1", "Cliente 2", "Cliente 3"], unicastTarget: 1 },
          check: {
            prompt: "Si el AP usara la PTK del Cliente 1 para un mensaje broadcast, ¿quién podría leerlo?",
            options: ["Solo el Cliente 1", "Todos los clientes"],
            correct: 0,
            feedback: ["Exacto: por eso hace falta una clave común para el grupo, la GTK.", "Repasa: cada PTK es individual; solo el Cliente 1 la tiene."]
          }
        },
        {
          link: "Ya viste el mensaje 3 del Four-Way Handshake.",
          concept: "¿Cómo recibe cada cliente la GTK?",
          explanation: "El AP genera la GTK y se la entrega a cada cliente en el mensaje 3, cifrada con la parte de la PTK reservada para eso (KEK). Toca cada situación.",
          visual: {
            type: "list-select",
            items: [
              { id: "m3", label: "Mensaje 3 del handshake", note: "La GTK viaja cifrada dentro del mensaje 3: solo ese cliente puede descifrarla." },
              { id: "nuevo", label: "Un cliente nuevo se conecta", note: "Recibe la GTK vigente en su propio mensaje 3. Así todos los clientes comparten la misma." },
              { id: "sale", label: "Un cliente se desconecta", note: "El AP puede renovar la GTK y repartir la nueva a quienes siguen conectados (Group Key Handshake), para que quien se fue no pueda leer el tráfico de grupo futuro." }
            ]
          },
          check: {
            prompt: "¿La GTK viaja en claro dentro del mensaje 3?",
            options: ["Sí", "No, va cifrada"],
            correct: 1,
            feedback: ["Repasa: va cifrada con una parte de la PTK de ese cliente.", "Correcto: va cifrada, protegida por la PTK de ese cliente."]
          }
        },
        {
          concept: "PTK vs GTK",
          explanation: "Dos claves, dos alcances. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "PTK", rows: [{ label: "Alcance", value: "Un cliente ↔ AP" }, { label: "Tráfico", value: "Individual (unicast)" }, { label: "¿Quién la tiene?", value: "Ese cliente y el AP" }, { label: "¿Cómo se obtiene?", value: "Se deriva en el handshake" }] },
            right: { title: "GTK", rows: [{ label: "Alcance", value: "Todos los clientes" }, { label: "Tráfico", value: "Grupo (broadcast / multicast)" }, { label: "¿Quién la tiene?", value: "El AP y todos los clientes" }, { label: "¿Cómo se obtiene?", value: "El AP la entrega en el mensaje 3" }] }
          },
          check: {
            prompt: "¿Cuál de las dos es compartida por todos los clientes de la red?",
            options: ["La PTK", "La GTK"],
            correct: 1,
            feedback: ["La PTK es individual: cada cliente tiene la suya.", "Correcto: la GTK es la clave común del grupo."]
          }
        }
      ]
    },
    practice: {
      type: "packet-sort",
      prompt: "¿Qué clave corresponde?",
      instructions: "Llegan paquetes al AP. Clasifica cada uno según la clave que lo protege: arrástralo o toca el compartimento correcto.",
      bins: [
        { id: "ptk", label: "PTK", caption: "Tráfico individual", icon: "👤" },
        { id: "gtk", label: "GTK", caption: "Tráfico de grupo", icon: "👥" }
      ],
      items: [
        { id: "i1", text: "La laptop de Ana descarga una página web a través del AP.", bin: "ptk", explain: "Solo Ana debe poder leerlo: PTK de Ana." },
        { id: "i2", text: "El AP envía un ARP broadcast: «¿quién tiene la IP 192.168.1.20?»", bin: "gtk", explain: "Un broadcast va a todos: GTK." },
        { id: "i3", text: "Un teléfono envía un correo electrónico; su tráfico va al AP.", bin: "ptk", explain: "Tráfico de un solo cliente: su PTK." },
        { id: "i4", text: "El AP reenvía un anuncio multicast de descubrimiento (mDNS) a todos los dispositivos.", bin: "gtk", explain: "Multicast para varios clientes: GTK." },
        { id: "i5", text: "El AP le responde solo a la impresora con el estado de su trabajo.", bin: "ptk", explain: "Destinatario único: PTK de la impresora." },
        { id: "i6", text: "Una transmisión multicast de video llega a todos los clientes suscritos.", bin: "gtk", explain: "Varios receptores a la vez: GTK." }
      ],
      hints: {
        ptk: "Solo un dispositivo debe poder leerlo: ¿qué clave comparte el AP únicamente con ese cliente?",
        gtk: "Varios clientes deben poder leerlo a la vez: ninguna PTK individual sirve para todos."
      },
      success: "Unicast → PTK de ese cliente. Broadcast/multicast → GTK compartida."
    },
    quizTitle: "Desafío: GTK",
    quiz: [
      {
        id: "q1", concept: "Qué es la GTK",
        prompt: "¿Qué representa la GTK?",
        options: ["La clave maestra de la red", "La clave compartida que protege el tráfico de grupo (broadcast/multicast)", "La clave individual de cada cliente", "Un valor aleatorio del AP"],
        correct: 1,
        feedback: ["Correcto: Group Temporal Key, la clave del grupo.", "La GTK es la clave compartida para el tráfico de grupo."]
      },
      {
        id: "q2", concept: "Tráfico de grupo",
        prompt: "El AP envía un mensaje broadcast a todos los clientes. ¿Qué clave lo protege?",
        options: ["La PTK de cada cliente", "La PMK", "La GTK", "El MIC"],
        correct: 2,
        feedback: ["Correcto: el broadcast se protege con la GTK.", "Un broadcast va a todos: necesita una clave que todos compartan, la GTK."]
      },
      {
        id: "q3", concept: "GTK vs PTK",
        prompt: "¿Cuál es la diferencia conceptual entre la GTK y la PTK?",
        options: ["La PTK es individual (un cliente y el AP); la GTK es compartida por todos los clientes", "Son la misma clave", "La GTK protege el tráfico individual y la PTK el de grupo", "La GTK reemplaza a la PMK"],
        correct: 0,
        feedback: ["Correcto: una es individual y la otra, de grupo.", "La PTK es individual; la GTK, compartida."]
      },
      {
        id: "q4", concept: "Entrega de la GTK",
        prompt: "¿En qué mensaje del Four-Way Handshake recibe el cliente la GTK?",
        options: ["Mensaje 1, en claro", "Mensaje 3, cifrada", "Mensaje 4, en claro", "No se entrega en el handshake"],
        correct: 1,
        feedback: ["Correcto: el AP la entrega cifrada en el mensaje 3.", "Llega en el mensaje 3, cifrada con una parte de la PTK."]
      }
    ]
  },

  "nonce": {
    id: "nonce",
    moduleId: 3,
    title: "Nonce",
    subtitle: "El valor que cambia",
    labTheme: true,
    bridge: "Ya identificaste los Nonces y dónde aparecen en el Four-Way Handshake. Ahora descubre cómo se comprueba que esos mensajes no fueron alterados.",
    ctf: "En una captura, los nonces viajan en claro en los mensajes 1 y 2: ahora sabes reconocerlos y para qué sirven.",
    learn: {
      steps: [
        {
          concept: "Un número que se usa una vez",
          explanation: "Nonce = «number used once». Genera varios en cada lado y compara: nunca se repiten.",
          visual: { type: "nonce-gen" },
          check: {
            prompt: "¿Qué ocurre si se genera otro nonce?",
            options: ["Sale un valor nuevo", "Se repite el anterior"],
            correct: 0,
            feedback: ["Exacto: cada nonce es nuevo e impredecible.", "Repasa: un nonce no se repite; se usa una sola vez."]
          }
        },
        {
          concept: "ANonce y SNonce",
          explanation: "Cada lado aporta su propio nonce. Toca cada uno.",
          visual: {
            type: "auth-scene",
            note: "«Authenticator» es el AP; «Supplicant» es el cliente.",
            tokens: [
              { id: "an", side: "ap", label: "ANonce", tone: "nonce", detail: "Authenticator Nonce: lo genera el AP para esta sesión." },
              { id: "sn", side: "client", label: "SNonce", tone: "nonce", detail: "Supplicant Nonce: lo genera el cliente para esta sesión." }
            ]
          },
          check: {
            prompt: "¿Quién genera el SNonce?",
            options: ["El cliente", "El AP"],
            correct: 0,
            feedback: ["Correcto: S de Supplicant, el cliente.", "El AP genera el ANonce; el SNonce es del cliente (Supplicant)."]
          }
        },
        {
          link: "Ya identificaste los Nonces. Ahora observa dónde aparecen durante el Four-Way Handshake.",
          concept: "Los nonces en el handshake",
          explanation: "Toca cada mensaje y busca los nonces.",
          visual: {
            type: "hs-explorer",
            messages: [
              { n: 1, title: "Aquí viaja el ANonce", detail: "El ANonce viaja en claro: no es secreto, solo tiene que ser nuevo.", tags: ["ANonce"] },
              { n: 2, title: "Aquí viaja el SNonce", detail: "El SNonce viaja junto con el MIC del cliente.", tags: ["SNonce", "MIC"] },
              { n: 3, title: "Sin nonces nuevos", detail: "El AP repite su ANonce para que el cliente confirme que es la misma conversación, pero no se genera ninguno nuevo.", tags: ["ANonce", "GTK"] },
              { n: 4, title: "Sin nonces", detail: "Solo la confirmación final.", tags: ["MIC"] }
            ],
            summary: "Tras el mensaje 2, ambos lados tienen los dos nonces → pueden calcular la misma PTK."
          }
        },
        {
          concept: "¿Por qué deben cambiar?",
          explanation: "Los nonces garantizan que cada sesión tenga claves frescas y que un mensaje antiguo no pueda reutilizarse. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "Si los nonces se repitieran", rows: [{ label: "ANonce / SNonce", value: "Iguales que ayer" }, { label: "PTK", value: "Igual que ayer" }, { label: "Mensaje grabado ayer", value: "Podría reutilizarse" }] },
            right: { title: "Con nonces nuevos", rows: [{ label: "ANonce / SNonce", value: "Nuevos" }, { label: "PTK", value: "Nueva" }, { label: "Mensaje grabado ayer", value: "No sirve: ya no coincide" }] }
          },
          check: {
            prompt: "¿Qué evitan principalmente los nonces?",
            options: ["Que se reutilicen claves o mensajes de una sesión anterior", "Que la red aparezca en un escaneo"],
            correct: 0,
            feedback: ["Correcto: claves frescas y mensajes que no se pueden repetir.", "No tienen que ver con la visibilidad de la red: garantizan claves y mensajes nuevos."]
          }
        }
      ]
    },
    practice: {
      type: "nonce-hunt",
      prompt: "Encuentra los Nonces",
      fields: {
        prompt: "Campos extraídos de un handshake simplificado (valores ficticios). Marca SOLO los que son nonces y pulsa «Comprobar».",
        items: [
          { id: "anonce", label: "ANonce", value: "1f6a 93c0 … 7be2", isNonce: true },
          { id: "mic", label: "MIC", value: "5e1b 77a0 … 9c4d", hint: "El MIC es un código de verificación de integridad, no un valor aleatorio de un solo uso." },
          { id: "snonce", label: "SNonce", value: "c84d 21e9 … 0a35", isNonce: true },
          { id: "mac", label: "MAC del AP", value: "9C:3D:11:7A:40:02", hint: "Una dirección MAC identifica a un dispositivo y no cambia en cada handshake." },
          { id: "replay", label: "Replay Counter", value: "1", hint: "El contador aumenta de forma predecible (1, 2, 3…); un nonce es aleatorio." },
          { id: "pmk", label: "PMK", value: "(no viaja)", hint: "La PMK es una clave que ambos ya conocen; nunca viaja y no cambia en cada handshake." }
        ]
      },
      place: {
        prompt: "Ahora coloca cada nonce en el mensaje donde viaja por primera vez.",
        tokens: [
          { id: "anonce", label: "ANonce", message: 1, hint: "El ANonce lo genera el AP y abre la conversación. ¿Qué mensaje envía primero el AP?" },
          { id: "snonce", label: "SNonce", message: 2, hint: "El SNonce es la respuesta del cliente al ANonce. ¿Qué mensaje envía primero el cliente?" }
        ]
      },
      success: "¡Perfecto! ANonce en el mensaje 1 (AP → cliente) y SNonce en el mensaje 2 (cliente → AP)."
    },
    quizTitle: "Desafío: Nonce",
    quiz: [
      {
        id: "q1", concept: "Qué es un nonce",
        prompt: "¿Qué es un nonce?",
        options: ["Una contraseña temporal", "Un valor aleatorio que se usa una sola vez", "La dirección MAC del AP", "Un código de integridad"],
        correct: 1,
        feedback: ["Correcto: «number used once».", "Un nonce es un valor aleatorio de un solo uso."]
      },
      {
        id: "q2", concept: "ANonce vs SNonce",
        prompt: "¿Cuál es la diferencia entre ANonce y SNonce?",
        options: ["El ANonce lo genera el AP; el SNonce, el cliente", "El ANonce es secreto y el SNonce público", "Son el mismo valor", "El SNonce lo genera el AP"],
        correct: 0,
        feedback: ["Correcto: A de Authenticator (AP), S de Supplicant (cliente).", "A = Authenticator (AP); S = Supplicant (cliente)."]
      },
      {
        id: "q3", concept: "Dónde aparecen",
        prompt: "¿Dónde aparecen por primera vez durante el Four-Way Handshake?",
        options: ["Ambos en el mensaje 4", "El ANonce en el mensaje 1 y el SNonce en el mensaje 2", "El SNonce en el mensaje 1 y el ANonce en el 2", "No viajan, se quedan en cada dispositivo"],
        correct: 1,
        feedback: ["Correcto: el AP abre con su ANonce y el cliente responde con su SNonce.", "El ANonce viaja en el mensaje 1 y el SNonce en el mensaje 2."]
      },
      {
        id: "q4", concept: "Nonces y PTK",
        prompt: "¿Por qué los nonces hacen que la PTK sea distinta en cada sesión?",
        options: ["Porque reemplazan a la PMK", "Porque son valores nuevos en cada handshake y participan en la derivación de la PTK", "Porque cifran la PTK", "Porque cambian la contraseña"],
        correct: 1,
        feedback: ["Correcto: ingredientes nuevos → PTK nueva.", "Son ingredientes de la PTK que cambian en cada handshake."]
      }
    ]
  },

  "mic": {
    id: "mic",
    moduleId: 3,
    title: "MIC",
    subtitle: "¿El mensaje fue alterado?",
    labTheme: true,
    bridge: "Ya sabes cómo se comprueba la integridad del mensaje. Falta una última pieza relacionada con la PMK: el PMKID.",
    ctf: "El MIC es la pieza que permite comprobar si los valores de un handshake son coherentes: lo verás al analizar capturas en los retos.",
    learn: {
      steps: [
        {
          concept: "Un sello de integridad",
          explanation: "El emisor calcula un MIC a partir del mensaje y de una clave. El receptor lo recalcula: si coinciden, el mensaje llegó intacto. Prueba las dos opciones.",
          visual: { type: "mic-sim" },
          check: {
            prompt: "Si alguien cambia el mensaje en el camino, ¿qué ocurre al recalcular el MIC?",
            options: ["No coincide y el mensaje se rechaza", "Coincide igual"],
            correct: 0,
            feedback: ["Correcto: cualquier cambio produce un MIC distinto.", "Repasa la simulación: al alterar el mensaje, el MIC recalculado ya no coincide."]
          }
        },
        {
          concept: "MIC no es cifrado",
          explanation: "Responden preguntas distintas. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "Cifrado", rows: [{ label: "Pregunta que responde", value: "¿Quién puede leerlo?" }, { label: "¿Oculta el contenido?", value: "Sí" }, { label: "Resultado", value: "Mensaje ilegible sin la clave" }] },
            right: { title: "MIC (integridad)", rows: [{ label: "Pregunta que responde", value: "¿Fue alterado? ¿Lo envió quien tiene la clave?" }, { label: "¿Oculta el contenido?", value: "No" }, { label: "Resultado", value: "Mensaje aceptado o rechazado" }] }
          },
          check: {
            prompt: "¿El MIC oculta el contenido del mensaje?",
            options: ["Sí", "No, solo permite detectar alteraciones"],
            correct: 1,
            feedback: ["Repasa: ocultar es tarea del cifrado.", "Correcto: el MIC verifica, no oculta."]
          }
        },
        {
          link: "Ya conoces la PTK: el MIC se calcula con una de sus partes (KCK).",
          concept: "El MIC en el handshake",
          explanation: "Toca cada mensaje y busca dónde aparece el MIC.",
          visual: {
            type: "hs-explorer",
            messages: [
              { n: 1, title: "Sin MIC", detail: "Todavía no existe una PTK con la cual calcularlo.", tags: ["ANonce"] },
              { n: 2, title: "Primer MIC", detail: "Demuestra al AP que el cliente derivó la misma PTK — es decir, que conoce la PMK — sin enviarla.", tags: ["SNonce", "MIC"] },
              { n: 3, title: "MIC del AP", detail: "El AP también protege su mensaje con un MIC; así el cliente sabe que habla con un AP que tiene la clave correcta.", tags: ["GTK", "MIC"] },
              { n: 4, title: "MIC de la confirmación", detail: "La confirmación final también va con MIC.", tags: ["MIC"] }
            ],
            summary: "Los mensajes 2, 3 y 4 llevan MIC; el 1, no."
          },
          check: {
            prompt: "¿Qué mensaje del handshake no lleva MIC?",
            options: ["El mensaje 1", "El mensaje 4"],
            correct: 0,
            feedback: ["Correcto: en el mensaje 1 aún no hay PTK.", "El mensaje 4 sí lleva MIC; el que no lo lleva es el 1."]
          }
        }
      ]
    },
    practice: {
      type: "mic-verify",
      prompt: "Verifica el mensaje",
      instructions: "Eres el receptor. Para cada mensaje (ficticio), recalcula el MIC, decide si es íntegro y explica por qué.",
      messages: [
        { id: "m1", title: "Mensaje 2 · Cliente → AP", lines: ["SNonce: c84d 21e9 … 0a35", "Replay Counter: 1"] },
        { id: "m2", title: "Mensaje 3 · AP → Cliente", lines: ["Instalar claves: sí", "Replay Counter: 7", "GTK (cifrada): 8f2c … 41d0"], original: ["Instalar claves: sí", "Replay Counter: 2", "GTK (cifrada): 8f2c … 41d0"], tamperNote: "En el camino alguien cambió el Replay Counter de 2 a 7." },
        { id: "m3", title: "Mensaje 4 · Cliente → AP", lines: ["Confirmación", "Replay Counter: 2"] },
        { id: "m4", title: "Mensaje 2 · Otro cliente → AP", lines: ["SNonce: 44fa 0be1 … c6e8", "Replay Counter: 1"], forgedMic: true, tamperNote: "El MIC no lo calculó alguien con la clave correcta: no corresponde al contenido." }
      ],
      reasons: [
        "El MIC recalculado coincide: el mensaje llegó íntegro y lo generó alguien con la clave correcta.",
        "El MIC no coincide: el mensaje fue alterado o no lo generó alguien con la clave correcta.",
        "El mensaje está cifrado; por eso el MIC es distinto."
      ],
      success: "Si el MIC recalculado coincide, el mensaje se acepta; si no, se descarta — sin necesidad de cifrar nada."
    },
    quizTitle: "Desafío: MIC",
    quiz: [
      {
        id: "q1", concept: "Qué es el MIC",
        prompt: "¿Qué es el MIC?",
        options: ["Un algoritmo que cifra el tráfico", "Un código que permite verificar que un mensaje no fue alterado y que lo generó alguien con la clave correcta", "La clave de grupo", "Un valor aleatorio de un solo uso"],
        correct: 1,
        feedback: ["Correcto: Message Integrity Code.", "El MIC es un código de integridad: no cifra ni es una clave."]
      },
      {
        id: "q2", concept: "Para qué sirve",
        prompt: "El receptor recalcula el MIC y no coincide con el recibido. ¿Qué debe concluir?",
        options: ["Que el mensaje está cifrado", "Que el mensaje fue alterado o no proviene de alguien con la clave correcta, y lo descarta", "Que debe aceptarlo igual", "Que debe cambiar de canal"],
        correct: 1,
        feedback: ["Correcto: un MIC que no coincide → mensaje rechazado.", "Un MIC que no coincide indica alteración o un emisor sin la clave: se descarta."]
      },
      {
        id: "q3", concept: "MIC y handshake",
        prompt: "¿Qué mensaje del Four-Way Handshake NO lleva MIC?",
        options: ["El mensaje 1: todavía no existe una PTK con la cual calcularlo", "El mensaje 2", "El mensaje 3", "El mensaje 4"],
        correct: 0,
        feedback: ["Correcto: el MIC aparece a partir del mensaje 2.", "Los mensajes 2, 3 y 4 llevan MIC; el 1 no, porque aún no hay PTK."]
      },
      {
        id: "q4", concept: "Integridad vs cifrado",
        prompt: "¿Cuál es la diferencia entre integridad (MIC) y cifrado?",
        options: ["Son lo mismo", "El cifrado oculta el contenido; el MIC no lo oculta, solo permite detectar alteraciones", "El MIC oculta el contenido y el cifrado detecta alteraciones", "El MIC reemplaza al cifrado"],
        correct: 1,
        feedback: ["Correcto: preguntas distintas, mecanismos distintos.", "El cifrado responde «¿quién puede leerlo?»; el MIC, «¿fue alterado?»."]
      }
    ]
  },

  "pmkid": {
    id: "pmkid",
    moduleId: 3,
    title: "PMKID",
    subtitle: "Una pieza más de la autenticación",
    labTheme: true,
    bridge: "Ya tienes todas las piezas. Ahora reconstruye todo el proceso en la misión final: Operación: Autenticación.",
    ctf: "Como se deriva de la PMK, el PMKID es información de autenticación que puede aparecer en capturas; en el módulo de Ataques a Wi-Fi verás por qué los analistas le prestan atención.",
    learn: {
      steps: [
        {
          link: "Ya conoces la PMK. Ahora descubre una pieza que se calcula a partir de ella.",
          concept: "De la PMK al PMKID",
          explanation: "Toca cada etapa.",
          visual: {
            type: "flow-chain",
            nodes: [
              { id: "pmk", label: "PMK", sub: "Clave maestra", tone: "key", detail: "La clave maestra que ya conoces." },
              { id: "calc", label: "«PMK Name» + MAC AP + MAC cliente", sub: "Cálculo", detail: "Se combina la PMK con una etiqueta fija y las dos direcciones MAC. No intervienen nonces." },
              { id: "pmkid", label: "PMKID", sub: "Identificador", tone: "id", detail: "PMK Identifier: un valor de 128 bits que sirve para referirse a esa PMK sin revelarla." }
            ],
            final: "El PMKID es una «etiqueta» de la PMK, no la PMK en sí."
          },
          check: {
            prompt: "¿El PMKID es la PMK?",
            options: ["Sí, es otro nombre", "No, es un identificador calculado a partir de ella"],
            correct: 1,
            feedback: ["Repasa: se deriva de la PMK, pero no es la PMK.", "Correcto: es un identificador derivado de la PMK."]
          }
        },
        {
          concept: "¿Dónde aparece?",
          explanation: "El PMKID tiene sentido cuando cliente y AP necesitan referirse a una PMK. Toca cada situación.",
          visual: {
            type: "list-select",
            items: [
              { id: "rec", label: "Reconexión a un AP conocido", note: "El cliente puede indicar el PMKID de una PMK que ya estableció antes para reutilizarla (caché de PMK) y evitar repetir toda la autenticación." },
              { id: "roam", label: "Roaming entre AP de la misma red", note: "En redes empresariales ayuda a moverse entre puntos de acceso con más rapidez." },
              { id: "m1", label: "Mensaje 1 del handshake", note: "Algunos AP incluyen el PMKID en el mensaje 1, dentro del campo RSN, antes de que el cliente responda." }
            ]
          },
          check: {
            prompt: "¿Para qué sirve principalmente el PMKID?",
            options: ["Para identificar una PMK ya establecida y poder reutilizarla", "Para cifrar el tráfico de grupo"],
            correct: 0,
            feedback: ["Correcto: es una referencia a una PMK.", "El tráfico de grupo lo protege la GTK; el PMKID identifica una PMK."]
          }
        },
        {
          concept: "PMKID vs PTK",
          explanation: "Ambos nacen de la PMK, pero no se parecen. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "PMKID", rows: [{ label: "¿Qué es?", value: "Un identificador" }, { label: "¿Se deriva de la PMK?", value: "Sí" }, { label: "¿Usa nonces?", value: "No" }, { label: "¿Cifra tráfico?", value: "No" }] },
            right: { title: "PTK", rows: [{ label: "¿Qué es?", value: "Una clave de sesión" }, { label: "¿Se deriva de la PMK?", value: "Sí" }, { label: "¿Usa nonces?", value: "Sí" }, { label: "¿Cifra tráfico?", value: "Sí (su parte TK)" }] }
          },
          check: {
            prompt: "¿Cuál de los dos protege el tráfico de la sesión?",
            options: ["El PMKID", "La PTK"],
            correct: 1,
            feedback: ["El PMKID solo identifica; no cifra nada.", "Correcto: la PTK es la clave de sesión."]
          }
        },
        {
          concept: "Tres piezas, una misma raíz",
          explanation: "Todas parten de la PMK, pero cumplen papeles distintos.",
          visual: {
            type: "icon-row",
            items: [
              { icon: "🔑", label: "PMK", caption: "La clave maestra." },
              { icon: "🏷️", label: "PMKID", caption: "Identificador de esa PMK en un contexto (AP + cliente)." },
              { icon: "⏱️", label: "PTK", caption: "Clave derivada para la sesión." }
            ]
          }
        }
      ]
    },
    practice: {
      type: "identify-match",
      prompt: "Identifica el PMKID",
      identify: {
        prompt: "Captura simplificada y ficticia del mensaje 1 (AP → cliente). Toca el campo que corresponde al PMKID.",
        layout: "capture",
        captureTitle: "EAPOL-Key · Mensaje 1 de 4 · AP → Cliente",
        items: [
          { id: "src", label: "Origen", value: "9C:3D:11:7A:40:02 (AP)", hint: "Es la dirección MAC del AP: identifica al emisor, no a la PMK." },
          { id: "dst", label: "Destino", value: "A4:5E:60:12:AB:9F (Cliente)", hint: "Es la dirección MAC del cliente." },
          { id: "rc", label: "Replay Counter", value: "1", hint: "Es un contador que aumenta en cada mensaje." },
          { id: "nonce", label: "Key Nonce", value: "1f6a93c0 … 7be2", hint: "Ese campo es el ANonce: el valor aleatorio del AP." },
          { id: "mic", label: "Key MIC", value: "0000 … 0000 (vacío)", hint: "Es el MIC, vacío porque en el mensaje 1 aún no hay PTK." },
          { id: "pmkid", label: "Key Data › RSN › PMKID", value: "4d2a7f19 c3e0b85a 61f20e9d 47c3a1b6", correct: true }
        ],
        followUp: {
          prompt: "¿De qué se calcula el PMKID?",
          options: ["De la PMK junto con las MAC del AP y del cliente", "Del ANonce y el SNonce", "De la GTK"],
          correct: 0,
          feedback: ["Correcto: PMK + «PMK Name» + MAC del AP + MAC del cliente.", "Repasa: el PMKID no usa nonces ni la GTK; se calcula a partir de la PMK y las dos MAC."]
        },
        success: "¡Encontrado! El PMKID viaja dentro del campo RSN del mensaje 1 en algunos AP."
      },
      match: {
        prompt: "Relaciona cada término con lo que es.",
        hint: "Esa combinación no es correcta. Pista: uno es la raíz, otro es una etiqueta y otro es la clave de la sesión.",
        pairs: [
          { id: "pmk", left: "PMK", right: "Clave maestra" },
          { id: "pmkid", left: "PMKID", right: "Identificador asociado a esa PMK en determinado contexto" },
          { id: "ptk", left: "PTK", right: "Clave derivada utilizada en la sesión" }
        ]
      },
      success: "¡Bien! PMK → raíz, PMKID → su identificador, PTK → clave de la sesión."
    },
    quizTitle: "Desafío: PMKID",
    quiz: [
      {
        id: "q1", concept: "Qué es el PMKID",
        prompt: "¿Qué es el PMKID?",
        options: ["Una clave que cifra el tráfico", "Un identificador calculado a partir de la PMK que permite referirse a ella", "El nombre de la red", "Un nonce del AP"],
        correct: 1,
        feedback: ["Correcto: PMK Identifier.", "El PMKID es un identificador derivado de la PMK; no cifra nada."]
      },
      {
        id: "q2", concept: "PMKID y PMK",
        prompt: "¿Qué relación tiene el PMKID con la PMK?",
        options: ["Son lo mismo", "Se deriva de la PMK junto con las MAC del AP y del cliente; no es la PMK en sí", "La PMK se deriva del PMKID", "No tienen relación"],
        correct: 1,
        feedback: ["Correcto: nace de la PMK, pero no la revela directamente.", "El PMKID se calcula a partir de la PMK y las MAC; no es la PMK."]
      },
      {
        id: "q3", concept: "PMKID vs PTK",
        prompt: "¿Cuál es la diferencia entre el PMKID y la PTK?",
        options: ["El PMKID identifica una PMK; la PTK es la clave que protege la sesión", "Ambos cifran el tráfico", "El PMKID usa nonces y la PTK no", "La PTK identifica a la PMK"],
        correct: 0,
        feedback: ["Correcto: etiqueta vs. clave de sesión.", "El PMKID es un identificador (sin nonces); la PTK es la clave de sesión (con nonces)."]
      },
      {
        id: "q4", concept: "Contexto",
        prompt: "¿En qué contexto puede aparecer un PMKID?",
        options: ["Solo en el tráfico broadcast", "En el mensaje 1 del handshake (campo RSN) o al reconectarse para reutilizar una PMK ya establecida", "En el nombre de la red", "En el mensaje 4, junto con la GTK"],
        correct: 1,
        feedback: ["Correcto: caché de PMK, roaming o el mensaje 1 de algunos AP.", "Aparece al reutilizar una PMK (caché/roaming) y en el mensaje 1 de algunos AP."]
      }
    ]
  },

  // Misión final: no es una lección de tres etapas sino un laboratorio de dos
  // fases (colocar piezas en el diagrama AP ↔ Cliente y reconstruir la
  // cadena), con su propia pantalla de finalización del módulo.
  [M3_MISSION_ID]: {
    id: M3_MISSION_ID,
    moduleId: 3,
    mission: true,
    title: "Operación: Autenticación",
    subtitle: "Misión final del Módulo 3",
    labTheme: true,
    badge: { icon: "🛡️", name: "Analista de Autenticación" },
    claim: "Ahora entiendes qué está pasando detrás de una conexión Wi-Fi.",
    ctfLinks: [
      ["Four-Way Handshake", "comprender el proceso de autenticación"],
      ["PMK / PTK", "comprender cómo se establecen las claves"],
      ["Nonce", "reconocer los valores usados durante el intercambio"],
      ["MIC", "comprender cómo se verifica la integridad"],
      ["GTK", "distinguir el tráfico de grupo del individual"],
      ["PMKID", "reconocer información relacionada con la autenticación"]
    ],
    lab: {
      tokens: [
        { id: "pmk", label: "PMK", tone: "key" },
        { id: "pmkid", label: "PMKID", tone: "id" },
        { id: "fwh", label: "Four-Way Handshake", tone: "proc" },
        { id: "anonce", label: "ANonce", tone: "nonce" },
        { id: "snonce", label: "SNonce", tone: "nonce" },
        { id: "ptk", label: "PTK", tone: "key" },
        { id: "mic", label: "MIC", tone: "mic" },
        { id: "gtk", label: "GTK", tone: "key" }
      ],
      slots: {
        pmk: { clue: "Clave maestra que ambos ya poseen. Nunca viaja.", hint: "Esta casilla describe algo que existe ANTES de la conversación y nunca se transmite." },
        pmkid: { clue: "Identificador de esa clave maestra; algunos AP lo incluyen en el mensaje 1.", hint: "Busca la pieza que IDENTIFICA a la clave maestra sin ser una clave." },
        fwh: { clue: "Nombre de toda esta conversación de cuatro mensajes.", hint: "Esta casilla no es un valor: es el nombre del proceso completo." },
        anonce: { clue: "Valor aleatorio que el AP envía para abrir la conversación.", hint: "Lo genera el AP y viaja en el mensaje 1: su nombre empieza por A (Authenticator)." },
        snonce: { clue: "Valor aleatorio con el que responde el cliente.", hint: "Lo genera el cliente (Supplicant) y viaja en el mensaje 2." },
        mic: { clue: "Código que prueba que el mensaje no fue alterado.", hint: "Esta pieza no es una clave ni un valor aleatorio: verifica la integridad." },
        ptk: { clue: "Clave de sesión que ambos derivan por separado.", hint: "Se deriva de la PMK + nonces + MAC; nunca viaja." },
        gtk: { clue: "Clave de grupo; viaja cifrada en el mensaje 3.", hint: "Es la clave que comparten todos los clientes para el tráfico de grupo." }
      }
    },
    chain: {
      steps: [
        { id: "pmk", label: "PMK", caption: "Clave maestra de partida" },
        { id: "nonces", label: "Nonces + direcciones MAC", caption: "Valores nuevos de la sesión" },
        { id: "ptk", label: "PTK", caption: "Clave de sesión derivada" },
        { id: "fwh", label: "Four-Way Handshake", caption: "La conversación que la establece" },
        { id: "mic", label: "Verificación con MIC", caption: "Prueba de que ambos tienen la misma clave" },
        { id: "install", label: "Instalación de claves", caption: "El tráfico queda protegido" },
        { id: "gtk", label: "GTK", caption: "Clave para el tráfico de grupo" }
      ],
      hints: {
        pmk: "Todo empieza por la clave que ambos ya conocen antes de hablar.",
        nonces: "Antes de derivar la clave de sesión hacen falta los valores nuevos de esta sesión.",
        ptk: "Con PMK + nonces + MAC ya se puede derivar la clave de sesión.",
        fwh: "La clave de sesión se establece y confirma durante la conversación de cuatro mensajes.",
        mic: "Dentro de la conversación, cada lado comprueba que el otro tiene la misma clave.",
        install: "Solo después de verificar se instalan las claves.",
        gtk: "Al final llega la clave para hablarle a todo el grupo."
      },
      pmkidQuestion: {
        prompt: "Última pregunta: ¿dónde encaja el PMKID en esta cadena?",
        options: ["Se deriva de la PMK (con las MAC) y la identifica; no usa nonces", "Se deriva de los nonces y reemplaza a la PTK", "Es la clave que protege el tráfico de grupo"],
        correct: 0,
        feedback: ["Correcto: el PMKID cuelga directamente de la PMK.", "Repasa: el PMKID se calcula a partir de la PMK y las MAC, sin nonces, y solo la identifica."]
      }
    }
  }
});

// ===========================================================================
// MÓDULO 5 — BLUETOOTH
// Cinco temas (Clásico vs BLE, Descubrimiento, Emparejamiento, Seguridad,
// Amenazas) + la misión final "Misión: Bluetooth". Reutiliza el motor de
// lecciones, los registros del Módulo 3 y moduleMissions (progreso, XP,
// insignia, desbloqueo). El tema de amenazas es deliberadamente defensivo:
// reconocer y prevenir, sin procedimientos de ataque. Nombres, direcciones
// y códigos mostrados son ficticios.
// ===========================================================================

const BT_SEQUENCE = ["bt-classic-ble", "bt-descubrimiento", "bt-emparejamiento", "bt-seguridad", "bt-amenazas"];
const BT_MISSION_ID = "bt-mision";
moduleMissions[5] = { missionId: BT_MISSION_ID, sequence: BT_SEQUENCE };

// Feedback con el formato pedido para este módulo.
const BT_OK = "✓ Correcto";
const BT_REVIEW = "✗ Revisa este concepto";

Object.assign(lessons, {
  "bt-classic-ble": {
    id: "bt-classic-ble",
    moduleId: 5,
    title: "Bluetooth clásico vs BLE",
    subtitle: "Bluetooth: dos formas de comunicarse",
    labTheme: true,
    quizWrongTitle: BT_REVIEW,
    bridge: "Ya sabes qué tipo de Bluetooth usa cada dispositivo. Ahora descubre cómo se encuentran entre sí antes de conectarse.",
    ctf: "En un reto, identificar el tipo de dispositivo puede ser la primera pista.",
    learn: {
      steps: [
        {
          concept: "Dos tecnologías bajo un mismo nombre",
          explanation: "Toca cada dispositivo para descubrir cómo se comunica.",
          visual: {
            type: "bt-compare",
            options: [
              {
                id: "classic", icon: "🎧", label: "Bluetooth clásico", tag: "BR/EDR", power: 78,
                rows: [
                  { k: "Consumo", v: "Mayor: la radio se mantiene activa" },
                  { k: "Comunicación", v: "Conexión continua, flujo constante de datos" },
                  { k: "Usos", v: "Audio, llamadas, transferencia de archivos" }
                ],
                devices: ["🎧 Audífonos", "🔊 Altavoces", "🚗 Manos libres", "⌨️ Periféricos"]
              },
              {
                id: "ble", icon: "⌚", label: "Bluetooth Low Energy", tag: "BLE", power: 18,
                rows: [
                  { k: "Consumo", v: "Muy bajo: duerme la mayor parte del tiempo" },
                  { k: "Comunicación", v: "Ráfagas cortas de datos pequeños" },
                  { k: "Usos", v: "Sensores, IoT, wearables, balizas" }
                ],
                devices: ["⌚ Smartwatch", "🌡️ Sensores", "💓 Pulseras", "🏷️ Etiquetas / balizas"]
              }
            ],
            summary: "Mismo nombre «Bluetooth», pero dos formas distintas de comunicarse: no son compatibles entre sí por sí solas."
          },
          check: {
            prompt: "¿Cuál está pensada para que una batería pequeña dure meses?",
            options: ["Bluetooth clásico", "BLE"],
            correct: 1,
            feedback: ["Correcto: BLE prioriza el bajo consumo.", "Revisa: el clásico mantiene la radio activa; BLE duerme entre ráfagas."]
          }
        },
        {
          concept: "Flujo continuo vs ráfagas",
          explanation: "Observa cómo usa la radio cada tecnología. Toca cada carril.",
          visual: {
            type: "bt-signal",
            lanes: [
              { id: "classic", label: "Clásico · audio", mode: "stream", detail: "Un flujo constante: ideal para música o una llamada, pero la radio casi nunca descansa." },
              { id: "ble", label: "BLE · sensor", mode: "burst", detail: "Despierta, envía un dato pequeño y vuelve a dormir. Por eso un sensor puede funcionar meses con una pila." }
            ]
          },
          check: {
            prompt: "Un sensor envía su temperatura cada 10 segundos. ¿Qué patrón le conviene?",
            options: ["Flujo continuo", "Ráfagas cortas"],
            correct: 1,
            feedback: ["Correcto: pocos datos, de vez en cuando → BLE.", "Revisa: enviar un dato pequeño cada tanto no necesita una conexión continua."]
          }
        },
        {
          concept: "¿Y si un dispositivo usa ambos?",
          explanation: "La frontera no siempre es rígida. Toca cada caso.",
          visual: {
            type: "node-cluster",
            note: "Toca cada dispositivo.",
            nodes: [
              { id: "phone", label: "📱 Smartphone", sublabel: "«Dual-mode»", detail: "Tiene ambas tecnologías: usa clásico con tus audífonos y BLE con tu reloj." },
              { id: "kbd", label: "⌨️ Teclado y mouse", sublabel: "Depende del modelo", detail: "Existen versiones clásicas y versiones BLE. Hay que mirar la implementación concreta." },
              { id: "audio", label: "🎧 Audífonos recientes", sublabel: "LE Audio", detail: "Los dispositivos más nuevos pueden transmitir audio también sobre BLE (LE Audio), aunque lo tradicional es el clásico." }
            ]
          }
        }
      ]
    },
    practice: {
      type: "packet-sort",
      prompt: "¿Clásico o BLE?",
      instructions: "Clasifica cada dispositivo según la tecnología que usa habitualmente. Arrástralo o toca un compartimento.",
      itemLabel: "📡 Dispositivo",
      countLabel: "Dispositivos clasificados",
      binPrefix: "",
      okTitle: BT_OK,
      wrongTitle: BT_REVIEW,
      bins: [
        { id: "classic", label: "Bluetooth clásico", caption: "Continuo · más consumo", icon: "🎧" },
        { id: "ble", label: "BLE", caption: "Ráfagas · bajo consumo", icon: "⌚" }
      ],
      items: [
        { id: "headset", icon: "🎧", text: "Audífonos que reproducen música durante horas.", bin: "classic", explain: "El audio continuo es el uso típico del Bluetooth clásico.", hint: "Piensa en el tipo de comunicación: ¿la música llega en ráfagas o como un flujo constante?" },
        { id: "temp", icon: "🌡️", text: "Sensor de temperatura con una pila que debe durar un año.", bin: "ble", explain: "Pocos datos y batería mínima: BLE.", hint: "Revisa el consumo: con una pila de botón para un año, ¿qué tecnología lo permite?" },
        { id: "watch", icon: "⌚", text: "Smartwatch que sincroniza pasos y notificaciones.", bin: "ble", explain: "Los wearables usan BLE para sincronizar datos pequeños con bajo consumo.", hint: "Un wearable debe ahorrar batería y envía datos pequeños: ¿cuál tecnología fue diseñada para eso?" },
        { id: "iot", icon: "💡", text: "Bombilla inteligente que recibe órdenes de encendido.", bin: "ble", explain: "Un dispositivo IoT que recibe órdenes cortas usa normalmente BLE.", hint: "Las órdenes son mensajes muy pequeños y esporádicos." },
        { id: "keyboard", icon: "⌨️", text: "Teclado inalámbrico de oficina.", bin: "classic", accept: ["classic", "ble"], explain: "Depende del modelo: existen teclados clásicos y BLE. Ambas respuestas son válidas." },
        { id: "mouse", icon: "🖱️", text: "Mouse inalámbrico.", bin: "ble", accept: ["classic", "ble"], explain: "Depende de la implementación: hay mouse clásicos y BLE. Ambas respuestas son válidas." },
        { id: "car", icon: "🚗", text: "Manos libres del auto para llamadas.", bin: "classic", explain: "Las llamadas son audio continuo: Bluetooth clásico.", hint: "Una llamada es un flujo de voz continuo." }
      ],
      hints: {},
      success: "Audio y flujos continuos → clásico. Datos pequeños con bajo consumo → BLE. Y algunos periféricos existen en ambas versiones."
    },
    quizTitle: "Desafío: Clásico vs BLE",
    quiz: [
      {
        id: "q1", concept: "Consumo energético",
        prompt: "¿Cuál es la principal ventaja de BLE frente al Bluetooth clásico?",
        options: ["Mayor velocidad para audio", "Un consumo energético mucho menor", "Mayor alcance garantizado", "No necesita emparejarse nunca"],
        correct: 1,
        feedback: ["Correcto: BLE está diseñado para el bajo consumo.", "BLE nació para consumir muy poca energía; el clásico es mejor para flujos continuos como el audio."]
      },
      {
        id: "q2", concept: "Usos del clásico",
        prompt: "Unos audífonos transmiten música de forma continua durante horas. ¿Qué tecnología se ha usado tradicionalmente?",
        options: ["Bluetooth clásico", "BLE"],
        correct: 0,
        feedback: ["Correcto: el audio continuo es el terreno del clásico.", "El audio continuo se ha transmitido tradicionalmente con Bluetooth clásico (LE Audio es más reciente)."]
      },
      {
        id: "q3", concept: "Usos de BLE",
        prompt: "Un sensor envía un dato pequeño cada pocos segundos y su batería debe durar meses. ¿Qué tecnología encaja mejor?",
        options: ["Bluetooth clásico", "BLE"],
        correct: 1,
        feedback: ["Correcto: ráfagas pequeñas y bajo consumo → BLE.", "Datos pequeños y batería de meses es el caso típico de BLE."]
      },
      {
        id: "q4", concept: "Dual-mode",
        prompt: "Verdadero o falso: un mismo smartphone puede usar Bluetooth clásico y BLE.",
        options: ["Verdadero", "Falso"],
        correct: 0,
        feedback: ["Correcto: los teléfonos suelen ser «dual-mode».", "Es verdadero: la mayoría de teléfonos y laptops soportan ambas tecnologías."]
      }
    ]
  },

  "bt-descubrimiento": {
    id: "bt-descubrimiento",
    moduleId: 5,
    title: "Descubrimiento",
    subtitle: "¿Qué dispositivos están cerca?",
    labTheme: true,
    quizWrongTitle: BT_REVIEW,
    bridge: "Encontrar un dispositivo no es lo mismo que confiar en él. Descubre cómo dos dispositivos se emparejan.",
    ctf: "En análisis inalámbrico, saber qué dispositivos están presentes ayuda a construir el contexto.",
    learn: {
      steps: [
        {
          concept: "Antes de conectarse, hay que encontrar",
          explanation: "Tu laptop busca dispositivos cercanos. Pulsa «Escanear» y toca cada resultado.",
          visual: {
            type: "bt-radar",
            devices: [
              { id: "phone", icon: "📱", name: "Pixel-Luis", addr: "4C:EB:42:1A:90:3D", x: 22, y: 26, state: "found", detail: "Detectable: responde a la búsqueda con su nombre y su dirección." },
              { id: "buds", icon: "🎧", name: "Audífonos-Ana", addr: "00:1B:66:8F:21:C4", x: 76, y: 22, state: "found", detail: "En modo emparejamiento: se anuncia para que otros lo encuentren." },
              { id: "watch", icon: "⌚", name: "Reloj-Marta", addr: "7A:2F:… (aleatoria)", x: 80, y: 70, state: "found", detail: "BLE: envía anuncios periódicos. Su dirección es aleatoria y cambia para proteger la privacidad." },
              { id: "sensor", icon: "🌡️", name: "Sensor-Temp-03", addr: "D4:36:39:0B:77:12", x: 30, y: 78, state: "found", detail: "BLE: anuncia su presencia y algunos datos básicos, sin necesidad de conectarse." },
              { id: "unknown", icon: "❔", name: "(sin nombre)", addr: "E2:91:5C:3A:0F:7B", x: 56, y: 85, state: "found", detail: "Aparece solo con su dirección: un dispositivo desconocido. Vale la pena identificarlo antes de confiar en él." },
              { id: "laptop", icon: "💻", name: "Laptop-Profe", addr: "—", x: 14, y: 54, state: "hidden", detail: "Está cerca y encendida, pero no es detectable: no responde a búsquedas. Puede seguir conectándose con dispositivos que ya conoce." },
              { id: "speaker", icon: "🔊", name: "Altavoz-Pasillo", addr: "—", x: 93, y: 46, state: "far", detail: "Es detectable, pero está fuera de alcance: su señal no llega hasta tu laptop." }
            ]
          },
          check: {
            prompt: "La laptop del profesor está a dos metros, pero no aparece en el escaneo. ¿Por qué?",
            options: ["Está apagada sí o sí", "No está en modo detectable"],
            correct: 1,
            feedback: ["Correcto: puede estar encendida y simplemente no responder a búsquedas.", "Revisa: un dispositivo encendido puede no ser detectable; entonces no aparece en el escaneo."]
          }
        },
        {
          concept: "¿Qué muestra un resultado de escaneo?",
          explanation: "Cada dispositivo encontrado deja una «tarjeta» con algunos datos. Toca cada campo.",
          visual: {
            type: "frame-fields",
            frameLabel: "Resultado de escaneo (simplificado)",
            note: "Toca cada campo.",
            fields: [
              { id: "name", label: "Nombre", width: 2, detail: "El nombre que el dispositivo anuncia, como «Audífonos-Ana». Lo elige el fabricante o el usuario: puede repetirse o imitarse." },
              { id: "addr", label: "Dirección", width: 2, detail: "Identificador de 48 bits, parecido a una MAC. En BLE muchos dispositivos usan direcciones aleatorias que cambian, por privacidad." },
              { id: "rssi", label: "Señal (RSSI)", width: 1, detail: "Intensidad de la señal recibida: da una idea aproximada de qué tan cerca está." },
              { id: "svc", label: "Tipo / servicios", width: 2, detail: "Pistas sobre qué es: audio, reloj, sensor… En BLE algunos anuncios incluyen los servicios que ofrece." }
            ]
          },
          check: {
            prompt: "¿Un escaneo te muestra la información que ese dispositivo intercambia con otros?",
            options: ["Sí, todo su contenido", "No, solo datos de presentación: nombre, dirección, señal…"],
            correct: 1,
            feedback: ["Revisa: el descubrimiento solo muestra cómo se presenta el dispositivo.", "Correcto: el escaneo muestra la «tarjeta de presentación», no las comunicaciones."]
          }
        },
        {
          concept: "Encontrado ≠ conectado",
          explanation: "Aparecer en la lista es solo el primer paso. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "Dispositivo encontrado", rows: [{ label: "Lo ves en la lista", value: "Sí" }, { label: "Intercambian datos", value: "No" }, { label: "Confianza establecida", value: "No" }] },
            right: { title: "Dispositivo conectado", rows: [{ label: "Lo ves en la lista", value: "Sí" }, { label: "Intercambian datos", value: "Sí" }, { label: "Confianza establecida", value: "Sí (tras emparejar)" }] }
          },
          check: {
            prompt: "«Audífonos-Ana» aparece en tu escaneo. ¿Ya están conectados a tu laptop?",
            options: ["Sí, aparecer implica conexión", "No, solo fueron encontrados"],
            correct: 1,
            feedback: ["Revisa: encontrar un dispositivo no establece ninguna conexión.", "Correcto: descubrir solo significa que sabes que existe."]
          }
        }
      ]
    },
    practice: {
      type: "scan-classify",
      prompt: "¿Cuáles están disponibles para conectar?",
      instructions: "Este es el informe del escáner de tu laptop (simulado). Clasifica el estado de cada dispositivo.",
      categories: [
        { id: "available", label: "Disponible" },
        { id: "hidden", label: "No disponible" },
        { id: "far", label: "Fuera de alcance" },
        { id: "connected", label: "Ya conectado" }
      ],
      items: [
        { id: "buds", icon: "🎧", name: "Audífonos-Ana", bars: 4, clues: ["Aparece en el escaneo", "Modo emparejamiento activo"], answer: "available", explain: "Aparece y acepta emparejarse: está disponible para conexión.", hint: "Fíjate: aparece en el escaneo y está esperando que alguien se empareje." },
        { id: "laptop", icon: "💻", name: "Laptop-Profe", bars: 4, clues: ["A 2 m, encendida", "No responde a la búsqueda"], answer: "hidden", explain: "Está cerca, pero no es detectable: no se puede encontrar para iniciar una conexión nueva.", hint: "La señal llegaría, pero el dispositivo no responde: ¿qué configuración tiene?" },
        { id: "speaker", icon: "🔊", name: "Altavoz-Pasillo", bars: 0, clues: ["Detectable", "Está en otro edificio: no se recibe señal"], answer: "far", explain: "Aunque sea detectable, su señal no llega: está fuera de alcance.", hint: "Mira las barras de señal: ¿llega algo hasta tu laptop?" },
        { id: "mouse", icon: "🖱️", name: "Mouse-Oficina", bars: 3, clues: ["Emparejado con tu laptop", "Se está usando ahora mismo"], answer: "connected", explain: "Ya existe una conexión activa con tu laptop.", hint: "Este dispositivo ya está intercambiando datos con tu laptop." },
        { id: "sensor", icon: "🌡️", name: "Sensor-Temp-03", bars: 2, clues: ["Envía anuncios BLE cada segundo", "Acepta conexiones"], answer: "available", explain: "Se anuncia y acepta conexiones: disponible.", hint: "Se anuncia y acepta conexiones: ¿qué impide conectarse?" }
      ],
      success: "Disponible = se puede encontrar y acepta conexión. No detectable, fuera de alcance o ya conectado son situaciones distintas, aunque el dispositivo exista."
    },
    quizTitle: "Desafío: Descubrimiento",
    quiz: [
      {
        id: "q1", concept: "Descubrimiento",
        prompt: "¿Qué es el descubrimiento en Bluetooth?",
        options: ["Cifrar la comunicación", "El proceso de encontrar dispositivos cercanos antes de conectarse", "Guardar las claves de un dispositivo", "Cambiar el nombre del dispositivo"],
        correct: 1,
        feedback: ["Correcto: primero hay que saber qué dispositivos existen cerca.", "El descubrimiento es encontrar dispositivos cercanos; cifrar y guardar claves ocurre después."]
      },
      {
        id: "q2", concept: "Detectable",
        prompt: "¿Qué significa que un dispositivo sea detectable?",
        options: ["Que ya está conectado", "Que responde a búsquedas o anuncia su presencia, así otros pueden encontrarlo", "Que su comunicación no está cifrada", "Que tiene la batería llena"],
        correct: 1,
        feedback: ["Correcto: detectable = se deja encontrar.", "Detectable significa que otros pueden encontrarlo en un escaneo; no implica conexión."]
      },
      {
        id: "q3", concept: "Información observable",
        prompt: "¿Qué información suele verse en un resultado de escaneo?",
        options: ["Nombre, dirección e intensidad de señal", "Las claves de emparejamiento", "El contenido de sus mensajes", "La contraseña del usuario"],
        correct: 0,
        feedback: ["Correcto: datos de presentación, no comunicaciones.", "Un escaneo muestra cómo se presenta el dispositivo (nombre, dirección, señal), no claves ni contenido."]
      },
      {
        id: "q4", concept: "Encontrado vs conectado",
        prompt: "Tu laptop muestra «Audífonos-Ana» en la lista de dispositivos encontrados. ¿Qué significa?",
        options: ["Que ya están conectados y emparejados", "Que fueron encontrados, pero todavía no hay conexión", "Que son un dispositivo malicioso", "Que están fuera de alcance"],
        correct: 1,
        feedback: ["Correcto: encontrado ≠ conectado.", "Aparecer en la lista solo indica que fueron descubiertos; la conexión requiere más pasos."]
      }
    ]
  },

  "bt-emparejamiento": {
    id: "bt-emparejamiento",
    moduleId: 5,
    title: "Emparejamiento",
    subtitle: "Del descubrimiento a la conexión",
    labTheme: true,
    quizWrongTitle: BT_REVIEW,
    bridge: "Ya sabes cómo nace la confianza entre dos dispositivos. Ahora observa qué mecanismos la protegen.",
    ctf: "Comprender el proceso de emparejamiento permite interpretar correctamente una captura o un incidente.",
    learn: {
      steps: [
        {
          concept: "Del descubrimiento a la conexión",
          explanation: "Avanza etapa por etapa y observa qué cambia entre el teléfono y los audífonos.",
          visual: {
            type: "bt-pairing",
            stages: [
              { id: "discover", icon: "🔍", label: "Descubrimiento", link: "none", detail: "El teléfono encuentra «Audífonos-Ana» en el escaneo. Todavía no hay ninguna relación entre ellos." },
              { id: "select", icon: "👆", label: "Selección", link: "request", detail: "El usuario elige los audífonos: el teléfono envía una solicitud de emparejamiento." },
              { id: "pair", icon: "🔢", label: "Emparejamiento", link: "verify", code: "482 913", detail: "Ambos acuerdan claves. Con comparación numérica, los dos muestran el mismo código y el usuario confirma que coincide: eso autentica al otro dispositivo." },
              { id: "trust", icon: "🔑", label: "Confianza", link: "key", detail: "Cada uno guarda la clave del otro (vinculación). Ya se reconocen como dispositivos de confianza." },
              { id: "connect", icon: "🔒", label: "Conexión", link: "secure", detail: "Se conectan usando esas claves: la comunicación queda autenticada y cifrada. La próxima vez se reconectarán sin repetir el emparejamiento." }
            ],
            summary: "Descubrir es encontrar. Emparejar es acordar claves y establecer confianza. Solo entonces llega la conexión protegida."
          },
          check: {
            prompt: "¿Qué ocurre durante el emparejamiento que no ocurre en el descubrimiento?",
            options: ["Se acuerdan claves y se establece confianza", "Se muestra el nombre del dispositivo"],
            correct: 0,
            feedback: ["Correcto: el emparejamiento crea la confianza.", "Revisa: el nombre ya se ve al descubrir; emparejar es acordar claves."]
          }
        },
        {
          concept: "¿Cómo se confirma?",
          explanation: "Según las pantallas y botones de cada dispositivo, la confirmación cambia. Toca cada método.",
          visual: {
            type: "node-cluster",
            note: "Toca cada método.",
            nodes: [
              { id: "num", label: "🔢 Comparación numérica", sublabel: "Ambos tienen pantalla", detail: "Los dos muestran el mismo código de 6 dígitos y el usuario confirma que coinciden." },
              { id: "pass", label: "⌨️ Código (passkey)", sublabel: "Uno tiene teclado", detail: "Un dispositivo muestra un código y el usuario lo escribe en el otro." },
              { id: "jw", label: "⚡ Just Works", sublabel: "Sin pantalla ni teclado", detail: "Se empareja sin confirmación visible. Es cómodo, pero no permite comprobar que hablas con el dispositivo correcto." },
              { id: "oob", label: "📶 Fuera de banda (OOB)", sublabel: "p. ej. NFC", detail: "La información de emparejamiento se intercambia por otro canal, como acercar los dispositivos con NFC." }
            ]
          },
          check: {
            prompt: "¿Qué método NO permite al usuario comprobar que se empareja con el dispositivo correcto?",
            options: ["Comparación numérica", "Just Works"],
            correct: 1,
            feedback: ["Revisa: en la comparación numérica el usuario verifica el código.", "Correcto: Just Works no tiene un paso de verificación del usuario."]
          }
        },
        {
          concept: "Descubrir vs emparejar",
          explanation: "Dos pasos distintos del mismo camino. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "Descubrimiento", rows: [{ label: "Objetivo", value: "Encontrar dispositivos" }, { label: "Claves", value: "Ninguna" }, { label: "Confianza", value: "No" }, { label: "Requiere acción del usuario", value: "No siempre" }] },
            right: { title: "Emparejamiento", rows: [{ label: "Objetivo", value: "Establecer confianza" }, { label: "Claves", value: "Se acuerdan y guardan" }, { label: "Confianza", value: "Sí" }, { label: "Requiere acción del usuario", value: "Normalmente confirmar" }] }
          }
        }
      ]
    },
    practice: {
      type: "sequence-build",
      prompt: "Ordena el proceso",
      instructions: "Toca (o arrastra) los pasos en el orden lógico, desde que el teléfono encuentra los audífonos hasta que se conectan.",
      steps: [
        { id: "discover", label: "Descubrir dispositivo", icon: "🔍", hint: "Todo empieza encontrando el dispositivo: no puedes emparejarte con algo que no conoces." },
        { id: "start", label: "Iniciar emparejamiento", icon: "👆", hint: "Una vez encontrado, alguien debe solicitar el emparejamiento." },
        { id: "auth", label: "Confirmar / autenticar", icon: "🔢", hint: "Tras la solicitud, el usuario confirma (por ejemplo, el código) para autenticar al otro dispositivo." },
        { id: "trust", label: "Establecer confianza", icon: "🔑", hint: "Con la autenticación hecha, las claves se guardan: nace la confianza." },
        { id: "connect", label: "Establecer conexión", icon: "🔒", hint: "La conexión protegida llega al final, usando las claves acordadas." }
      ],
      success: "Descubrir → iniciar → autenticar → confianza → conexión. Cada paso depende del anterior."
    },
    quizTitle: "Desafío: Emparejamiento",
    quiz: [
      {
        id: "q1", concept: "Descubrir vs emparejar",
        prompt: "¿Cuál es la diferencia entre descubrimiento y emparejamiento?",
        options: ["Son lo mismo", "Descubrir es encontrar un dispositivo; emparejar es acordar claves y establecer confianza", "Emparejar ocurre antes de descubrir", "Descubrir cifra la comunicación"],
        correct: 1,
        feedback: ["Correcto: primero se encuentra, luego se establece la confianza.", "Descubrir solo encuentra el dispositivo; emparejar crea las claves y la confianza."]
      },
      {
        id: "q2", concept: "Propósito",
        prompt: "¿Cuál es el propósito principal del emparejamiento?",
        options: ["Hacer visible el dispositivo", "Crear claves compartidas para reconocerse y proteger la comunicación", "Aumentar el alcance de la señal", "Cambiar de Bluetooth clásico a BLE"],
        correct: 1,
        feedback: ["Correcto: las claves son la base de la conexión segura.", "El emparejamiento existe para acordar claves; no cambia el alcance ni la tecnología."]
      },
      {
        id: "q3", concept: "Autenticación",
        prompt: "En la comparación numérica, ambos dispositivos muestran 482 913. ¿Qué debe hacer el usuario?",
        options: ["Aceptar siempre, el número no importa", "Confirmar solo si el código coincide en ambas pantallas", "Escribir su contraseña", "Apagar el Bluetooth"],
        correct: 1,
        feedback: ["Correcto: comprobar el código autentica al otro dispositivo.", "El código sirve para verificar que hablas con el dispositivo correcto: solo se confirma si coincide."]
      },
      {
        id: "q4", concept: "Confianza y conexión",
        prompt: "¿Por qué dos dispositivos ya emparejados pueden reconectarse sin repetir todo el proceso?",
        options: ["Porque guardaron las claves: la confianza ya está establecida", "Porque Bluetooth no usa claves", "Porque siempre están en modo detectable", "Porque comparten la misma dirección"],
        correct: 0,
        feedback: ["Correcto: las claves guardadas permiten reconectar con confianza.", "Al emparejarse guardan las claves; con ellas se reconocen y reconectan."]
      }
    ]
  },

  "bt-seguridad": {
    id: "bt-seguridad",
    moduleId: 5,
    title: "Seguridad Bluetooth",
    subtitle: "¿Cómo protege Bluetooth una conexión?",
    labTheme: true,
    quizWrongTitle: BT_REVIEW,
    bridge: "Conoces las defensas. Ahora aprende a reconocer qué puede salir mal cuando fallan o están mal configuradas.",
    ctf: "Los mecanismos de autenticación y cifrado ayudan a determinar qué tan protegida está una comunicación.",
    learn: {
      steps: [
        {
          link: "En el emparejamiento se acordaron claves. Ahora observa qué protegen.",
          concept: "Tres preguntas, tres capas",
          explanation: "Toca cada capa alrededor de la conexión para ver un ejemplo.",
          visual: {
            type: "bt-layers",
            layers: [
              { id: "authn", tone: "authn", icon: "🪪", label: "Autenticación", question: "¿Con quién estoy hablando?", example: "Al reconectarse, los audífonos demuestran con la clave guardada que son los mismos que emparejaste ayer." },
              { id: "authz", tone: "authz", icon: "🛂", label: "Autorización", question: "¿Qué puede hacer este dispositivo?", example: "Tu teléfono pregunta: «¿Permitir que este reloj acceda a tus contactos?». Puede conectarse, pero solo hace lo que permites." },
              { id: "crypto", tone: "crypto", icon: "🔐", label: "Cifrado", question: "¿Cómo protegemos la información en el camino?", example: "El audio viaja cifrado: alguien que capture la señal solo ve datos ilegibles." }
            ],
            summary: "Autenticación = identidad · Autorización = permisos · Cifrado = confidencialidad. Las tres trabajan juntas."
          },
          check: {
            prompt: "«¿Qué puede hacer este dispositivo?» corresponde a…",
            options: ["Autenticación", "Autorización", "Cifrado"],
            correct: 1,
            feedback: ["Correcto: la autorización define los permisos.", "Revisa: la autenticación verifica identidad; la autorización decide qué se permite."]
          }
        },
        {
          concept: "Todo empieza en las claves",
          explanation: "Toca cada etapa de la cadena.",
          visual: {
            type: "flow-chain",
            nodes: [
              { id: "pair", label: "Emparejamiento", sub: "Origen", detail: "Ambos dispositivos acuerdan claves y las guardan." },
              { id: "keys", label: "Claves compartidas", sub: "Base de confianza", tone: "key", detail: "Solo esos dos dispositivos las conocen: con ellas pueden autenticarse y cifrar." },
              { id: "conn", label: "Conexión protegida", sub: "Resultado", detail: "Autenticada (saben con quién hablan) y cifrada (nadie más la entiende)." }
            ],
            final: "Si el emparejamiento fue débil, todo lo que depende de esas claves también lo es."
          },
          check: {
            prompt: "¿De dónde salen las claves que usan la autenticación y el cifrado?",
            options: ["Del emparejamiento", "Del nombre del dispositivo"],
            correct: 0,
            feedback: ["Correcto: se acuerdan al emparejar.", "Revisa: el nombre es público; las claves se acuerdan durante el emparejamiento."]
          }
        },
        {
          concept: "Lo que ve un tercero",
          explanation: "La misma conexión, con y sin cifrado. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "Sin cifrado", rows: [{ label: "Mensaje enviado", value: "«Reunión a las 3»" }, { label: "Lo que captura un tercero", value: "«Reunión a las 3»" }, { label: "Confidencialidad", value: "Ninguna" }] },
            right: { title: "Con cifrado", rows: [{ label: "Mensaje enviado", value: "«Reunión a las 3»" }, { label: "Lo que captura un tercero", value: "9f a2 1c 7e 04 …" }, { label: "Confidencialidad", value: "Protegida" }] }
          },
          check: {
            prompt: "Con cifrado, ¿un tercero puede captar la señal por el aire?",
            options: ["Sí, pero no puede interpretar su contenido", "No, el cifrado bloquea la señal"],
            correct: 0,
            feedback: ["Correcto: la señal se puede captar, pero no entender.", "Revisa: el cifrado no detiene la señal de radio; la vuelve ininteligible."]
          }
        }
      ]
    },
    practice: {
      type: "packet-sort",
      prompt: "Autenticación, autorización o cifrado",
      instructions: "Clasifica cada situación según el mecanismo que representa principalmente.",
      itemLabel: "🛡️ Situación",
      countLabel: "Situaciones clasificadas",
      binPrefix: "",
      okTitle: BT_OK,
      wrongTitle: BT_REVIEW,
      bins: [
        { id: "authn", label: "Autenticación", caption: "¿Con quién hablo?", icon: "🪪" },
        { id: "authz", label: "Autorización", caption: "¿Qué puede hacer?", icon: "🛂" },
        { id: "crypto", label: "Cifrado", caption: "¿Cómo se protege?", icon: "🔐" }
      ],
      items: [
        { id: "s1", icon: "🪪", text: "El dispositivo confirma la identidad del otro dispositivo antes de aceptar la conexión.", bin: "authn", explain: "Confirmar identidad = autenticación." },
        { id: "s2", icon: "🛂", text: "El teléfono permite que el reloj lea notificaciones, pero no los contactos.", bin: "authz", explain: "Decidir qué funciones se permiten = autorización." },
        { id: "s3", icon: "🔐", text: "La información se protege para que terceros no puedan interpretarla.", bin: "crypto", explain: "Volver ilegible la información para terceros = cifrado." },
        { id: "s4", icon: "🔢", text: "El usuario comprueba que el código 482 913 coincide en ambas pantallas.", bin: "authn", explain: "Verificar el código asegura con quién te emparejas: autenticación." },
        { id: "s5", icon: "📁", text: "La laptop pregunta si el teléfono puede enviarle archivos.", bin: "authz", explain: "Conceder o negar una acción concreta = autorización." },
        { id: "s6", icon: "📡", text: "Alguien captura el tráfico, pero solo obtiene datos ilegibles.", bin: "crypto", explain: "El contenido capturado es ilegible gracias al cifrado." }
      ],
      hints: {
        authn: "Esta situación trata de verificar la IDENTIDAD del otro dispositivo.",
        authz: "Esta situación trata de PERMISOS: qué se le deja hacer a un dispositivo ya conocido.",
        crypto: "Esta situación trata de que la información no pueda INTERPRETARSE por terceros."
      },
      success: "Identidad → autenticación. Permisos → autorización. Confidencialidad → cifrado."
    },
    quizTitle: "Desafío: Seguridad Bluetooth",
    quiz: [
      {
        id: "q1", concept: "Autenticación",
        prompt: "La autenticación responde principalmente a la pregunta…",
        options: ["¿Con quién estoy hablando?", "¿Qué puede hacer este dispositivo?", "¿Qué tan fuerte es la señal?", "¿Cuánta batería queda?"],
        correct: 0,
        feedback: ["Correcto: autenticar es verificar identidad.", "Autenticar es comprobar la identidad del otro dispositivo; los permisos son autorización."]
      },
      {
        id: "q2", concept: "Autorización",
        prompt: "El teléfono pregunta «¿Permitir que este reloj acceda a tus contactos?». ¿Qué mecanismo es?",
        options: ["Cifrado", "Autenticación", "Autorización", "Descubrimiento"],
        correct: 2,
        feedback: ["Correcto: decide qué puede hacer un dispositivo.", "Es autorización: el reloj ya está identificado; ahora se decide qué puede hacer."]
      },
      {
        id: "q3", concept: "Cifrado",
        prompt: "¿Qué protege el cifrado en una conexión Bluetooth?",
        options: ["Que nadie detecte la señal de radio", "Que terceros no puedan interpretar la información transmitida", "Que el dispositivo no aparezca en escaneos", "La duración de la batería"],
        correct: 1,
        feedback: ["Correcto: confidencialidad de la información.", "El cifrado no oculta la señal: hace que su contenido sea ilegible para terceros."]
      },
      {
        id: "q4", concept: "Confianza",
        prompt: "¿Qué hace posible que dos dispositivos se autentiquen y cifren su comunicación?",
        options: ["Las claves acordadas al emparejarse", "Tener el mismo nombre", "Estar cerca uno del otro", "Usar BLE"],
        correct: 0,
        feedback: ["Correcto: las claves del emparejamiento son la base de la confianza.", "La base son las claves acordadas en el emparejamiento; el nombre o la distancia no protegen nada."]
      }
    ]
  },

  "bt-amenazas": {
    id: "bt-amenazas",
    moduleId: 5,
    title: "Amenazas comunes",
    subtitle: "¿Qué puede salir mal?",
    labTheme: true,
    quizWrongTitle: BT_REVIEW,
    bridge: "Tienes todas las piezas. Ahora analiza un entorno real (simulado) en la Misión: Bluetooth.",
    ctf: "En un CTF defensivo, reconocer comportamientos anómalos puede ser la clave para resolver un reto.",
    learn: {
      steps: [
        {
          concept: "Amenazas en el entorno",
          explanation: "Cada tarjeta es un riesgo frecuente. Tócala para ver qué significa, qué afecta y cómo reducirlo.",
          visual: {
            type: "threat-cards",
            threats: [
              { id: "unauth", icon: "🚪", title: "Conexión no autorizada", meaning: "Un dispositivo se conecta sin que lo hayas aprobado.", impact: "Acceso a datos o funciones del dispositivo.", defense: "Rechaza solicitudes que no iniciaste y revisa la lista de dispositivos vinculados." },
              { id: "unknown", icon: "❔", title: "Dispositivo desconocido", meaning: "Un dispositivo sin identificar aparece cerca o intenta interactuar.", impact: "Puede ser un intento de engaño o de rastreo.", defense: "No te emparejes con lo que no reconoces; identifica antes de confiar." },
              { id: "exposure", icon: "📢", title: "Exposición innecesaria", meaning: "El dispositivo queda detectable todo el tiempo sin necesitarlo.", impact: "Más fácil de encontrar y de recibir intentos de conexión.", defense: "Activa la visibilidad solo al emparejar y apaga Bluetooth si no lo usas." },
              { id: "spoof", icon: "🎭", title: "Suplantación", meaning: "Un dispositivo imita el nombre o la identidad de otro conocido.", impact: "El usuario confía en un dispositivo que no es el real.", defense: "Verifica el código al emparejar; el nombre por sí solo no prueba identidad." },
              { id: "vuln", icon: "🐞", title: "Vulnerabilidades de implementación", meaning: "Fallos en el software Bluetooth de un dispositivo o sistema.", impact: "Pueden comprometer el dispositivo aunque el usuario no haga nada.", defense: "Mantén sistema y firmware actualizados." },
              { id: "config", icon: "⚙️", title: "Configuración insegura", meaning: "Opciones débiles: PIN fijo como 0000 o emparejar sin verificación.", impact: "Debilita la autenticación y la protección de las claves.", defense: "Usa métodos con confirmación y cambia valores por defecto." },
              { id: "mitm", icon: "🕵️", title: "Interceptación o manipulación", meaning: "Un tercero se interpone cuando la seguridad del emparejamiento es débil.", impact: "Podría leer o alterar la comunicación.", defense: "Prefiere emparejamiento con verificación y conexiones cifradas." }
            ]
          },
          check: {
            prompt: "Dejar los audífonos en modo detectable todo el día es un ejemplo de…",
            options: ["Exposición innecesaria", "Cifrado débil"],
            correct: 0,
            feedback: ["Correcto: se exponen sin necesidad.", "Revisa: el problema es que se dejan encontrar todo el tiempo, no el cifrado."]
          }
        },
        {
          concept: "Hábitos que reducen el riesgo",
          explanation: "Cinco reglas que cubren la mayoría de las amenazas.",
          visual: {
            type: "icon-row",
            items: [
              { icon: "🙈", label: "Visibilidad mínima", caption: "Detectable solo para emparejar." },
              { icon: "🚫", label: "Rechaza lo desconocido", caption: "No aceptes solicitudes que no iniciaste." },
              { icon: "🔢", label: "Verifica el código", caption: "Confirma que coincide en ambos." },
              { icon: "🔄", label: "Actualiza", caption: "Sistema y firmware al día." },
              { icon: "🧹", label: "Revisa vinculados", caption: "Elimina lo que ya no usas." }
            ]
          },
          check: {
            prompt: "¿Qué medida reduce el riesgo de vulnerabilidades de implementación?",
            options: ["Mantener el sistema y el firmware actualizados", "Cambiar el nombre del dispositivo"],
            correct: 0,
            feedback: ["Correcto: las actualizaciones corrigen esos fallos.", "Revisa: un nombre nuevo no corrige un fallo de software; una actualización sí."]
          }
        }
      ]
    },
    practice: {
      type: "bt-environment",
      prompt: "Analiza el entorno Bluetooth",
      instructions: "Toca cada dispositivo alrededor de la estación de trabajo, revisa su ficha y decide: ¿Seguro o Requiere atención?",
      devices: [
        { id: "unknown", icon: "❔", name: "«BT-Device»", x: 14, y: 18, facts: ["Envía una solicitud de emparejamiento", "Nadie en la oficina la inició"], answer: "risk", explain: "Un dispositivo desconocido intentando conectarse: rechazar la solicitud." },
        { id: "speaker", icon: "🔊", name: "Altavoz de sala", x: 84, y: 16, facts: ["Detectable todo el día", "Solo se empareja una vez al mes"], answer: "risk", explain: "Exposición innecesaria: debería ser detectable solo al emparejar." },
        { id: "band", icon: "⌚", name: "Pulsera deportiva", x: 88, y: 66, facts: ["Su app pide contactos, mensajes y ubicación", "Solo mide pasos"], answer: "risk", explain: "Permisos excesivos: autoriza solo lo que necesita." },
        { id: "keyboard", icon: "⌨️", name: "Teclado de la estación", x: 30, y: 84, facts: ["Emparejado con comparación numérica", "Firmware actualizado", "No detectable"], answer: "safe", explain: "Configuración correcta: autenticado, actualizado y sin exposición." },
        { id: "buds", icon: "🎧", name: "Audífonos ajenos", x: 66, y: 86, facts: ["Aparecen conectados a la laptop", "Nadie los conectó"], answer: "risk", explain: "Conexión inesperada: revisar y eliminar el vínculo." },
        { id: "mouse", icon: "🖱️", name: "Mouse de la estación", x: 10, y: 56, facts: ["Vinculado por el usuario", "Firmware al día"], answer: "safe", explain: "Conexión conocida, aprobada y actualizada." }
      ],
      success: "Detectaste solicitudes desconocidas, exposición innecesaria, permisos excesivos y conexiones inesperadas, y distinguiste las configuraciones correctas."
    },
    quizTitle: "Desafío: Amenazas comunes",
    quiz: [
      {
        id: "q1", concept: "Exposición innecesaria",
        prompt: "¿Por qué dejar un dispositivo en modo detectable todo el tiempo es un riesgo?",
        options: ["Porque consume más datos móviles", "Porque cualquiera cercano puede encontrarlo e intentar conectarse", "Porque desactiva el cifrado", "No es ningún riesgo"],
        correct: 1,
        feedback: ["Correcto: aumenta la exposición sin necesidad.", "Ser detectable no desactiva el cifrado, pero facilita que otros lo encuentren e intenten interactuar."]
      },
      {
        id: "q2", concept: "Conexiones no autorizadas",
        prompt: "Recibes una solicitud de emparejamiento de un dispositivo que no reconoces. ¿Qué es lo más seguro?",
        options: ["Aceptarla para ver qué es", "Rechazarla", "Aceptarla si el nombre parece conocido", "Dejarla pendiente indefinidamente"],
        correct: 1,
        feedback: ["Correcto: no confíes en lo que no iniciaste.", "Lo seguro es rechazarla: un nombre conocido puede ser una suplantación."]
      },
      {
        id: "q3", concept: "Suplantación",
        prompt: "Aparecen dos «Audífonos-Ana» en el escaneo. ¿Qué te enseña esto?",
        options: ["Que el nombre por sí solo no prueba la identidad de un dispositivo", "Que ambos son legítimos", "Que Bluetooth está fallando", "Que hay que aceptar el primero"],
        correct: 0,
        feedback: ["Correcto: los nombres se pueden imitar.", "Un nombre puede repetirse o imitarse: la identidad se verifica con el emparejamiento."]
      },
      {
        id: "q4", concept: "Medidas de protección",
        prompt: "Una app de pulsera pide acceso a contactos, mensajes y ubicación, aunque solo cuenta pasos. ¿Qué conviene hacer?",
        options: ["Conceder todo para que funcione mejor", "Conceder solo los permisos necesarios", "Desactivar el cifrado", "Cambiar el nombre de la pulsera"],
        correct: 1,
        feedback: ["Correcto: mínimo privilegio en la autorización.", "Concede solo lo necesario: los permisos excesivos amplían el daño posible."]
      }
    ]
  },

  [BT_MISSION_ID]: {
    id: BT_MISSION_ID,
    moduleId: 5,
    mission: true,
    missionType: "bt-mission",
    title: "Misión: Bluetooth",
    subtitle: "Misión final del Módulo 5",
    labTheme: true,
    doneTitle: "MISIÓN COMPLETADA",
    claim: "Analizaste un entorno Bluetooth completo: quién está, cómo se comunica, en quién se confía y qué representa un riesgo.",
    badge: { icon: "📶", name: "Analista Bluetooth" },
    phases: [
      { id: "s1", label: "Tecnología" },
      { id: "s2", label: "Descubrimiento" },
      { id: "s3", label: "Emparejados" },
      { id: "s4", label: "Seguridad" },
      { id: "s5", label: "Riesgos" },
      { id: "done", label: "Informe" }
    ],
    ctfLinks: [
      ["Clásico vs BLE", "identificar el tipo de dispositivo como primera pista"],
      ["Descubrimiento", "construir el contexto de qué dispositivos están presentes"],
      ["Emparejamiento", "interpretar cómo se estableció la confianza"],
      ["Seguridad", "evaluar qué tan protegida está una comunicación"],
      ["Amenazas", "reconocer comportamientos anómalos"]
    ],
    devices: [
      { id: "buds", icon: "🎧", name: "Audífonos de la estación", tech: "classic", discovered: false, paired: true, clues: ["Reproducen audio de las videollamadas sin cortes", "Se reconectan solos cada mañana con la clave guardada"] },
      { id: "sensor", icon: "🌡️", name: "Sensor ambiental", tech: "ble", discovered: true, paired: false, clues: ["Pila de botón que dura un año", "Envía anuncios cada 2 s; nadie se ha emparejado con él"] },
      { id: "band", icon: "⌚", name: "Pulsera del analista", tech: "ble", discovered: false, paired: true, clues: ["Sincroniza pasos en pequeñas ráfagas", "Vinculada al teléfono del analista desde hace meses"] },
      { id: "speaker", icon: "🔊", name: "Altavoz de la sala", tech: "classic", discovered: true, paired: false, clues: ["Reproduce música de forma continua", "En modo emparejamiento todo el día; aparece en cualquier escaneo"] },
      { id: "tag", icon: "🏷️", name: "Etiqueta «BT-7F3A»", tech: "ble", discovered: true, paired: false, clues: ["Baliza diminuta que emite anuncios cortos", "Nadie la reconoce; aparece en el escaneo cerca de la estación"] }
    ],
    events: [
      { id: "e1", text: "Al reconectarse, los audífonos prueban con la clave guardada que son los mismos de ayer.", answer: "authn" },
      { id: "e2", text: "El teléfono pregunta si la pulsera puede leer las notificaciones del trabajo.", answer: "authz" },
      { id: "e3", text: "El audio de la videollamada viaja de forma que un tercero solo captaría datos ilegibles.", answer: "crypto" }
    ],
    situations: [
      { id: "r1", text: "La etiqueta desconocida «BT-7F3A» aparece todos los días junto a la estación.", risk: true, explain: "Dispositivo no identificado de forma persistente: hay que investigarlo." },
      { id: "r2", text: "El altavoz de la sala está en modo emparejamiento todo el día.", risk: true, explain: "Exposición innecesaria: cualquiera cercano podría intentar emparejarse." },
      { id: "r3", text: "Los audífonos se reconectan con la clave que guardaron al emparejarse.", risk: false, explain: "Comportamiento normal de dos dispositivos de confianza." },
      { id: "r4", text: "Un «Teclado-USB» desconocido pidió emparejarse con la estación sin que nadie lo solicitara.", risk: true, explain: "Solicitud no iniciada por el usuario: debe rechazarse." },
      { id: "r5", text: "El sensor solo anuncia la temperatura y no tiene acceso a la estación.", risk: false, explain: "Exposición limitada y esperada para un sensor." }
    ]
  }
});

// ===========================================================================
// MÓDULO 1 — FUNDAMENTOS WI-FI: progreso de módulo + misión final
// Las seis lecciones ya existían; aquí se integran al mismo sistema de
// módulo que el 3 y el 5 (XP total, dominio, mapa del módulo, conexión con
// la siguiente lección y misión con insignia).
// ===========================================================================

const M1_SEQUENCE = ["802-11", "ssid-bssid", "mac-address", "ap-clientes", "canales-frecuencias", "frames-802-11"];
const M1_MISSION_ID = "m1-mision";
moduleMissions[1] = { missionId: M1_MISSION_ID, sequence: M1_SEQUENCE };

const m1LessonExtras = {
  "802-11": {
    quizTitle: "Desafío: 802.11",
    bridge: "Ya sabes qué es 802.11 y cómo se comunican AP y clientes. Ahora descubre cómo se identifica cada red: SSID y BSSID.",
    ctf: "En un reto, saber qué estándar usa una red te ayuda a entender qué es posible en ese entorno."
  },
  "ssid-bssid": {
    quizTitle: "Desafío: SSID / BSSID",
    bridge: "El BSSID es una dirección MAC. Ahora descubre cómo está construida una MAC y por qué no siempre es una prueba de identidad.",
    ctf: "En los retos, el BSSID es la pista clave para distinguir una red legítima de un Evil Twin."
  },
  "mac-address": {
    quizTitle: "Desafío: MAC",
    bridge: "Ya sabes leer direcciones MAC. Ahora observa quiénes las usan dentro de una red: puntos de acceso y clientes.",
    ctf: "Leer direcciones MAC te permite seguir a cada dispositivo dentro de una captura."
  },
  "ap-clientes": {
    quizTitle: "Desafío: AP y clientes",
    bridge: "Ya sabes quién forma la red. Ahora descubre por dónde viaja la señal: bandas y canales.",
    ctf: "Relacionar cada cliente con su AP es el primer paso para reconstruir lo que pasó en una red."
  },
  "canales-frecuencias": {
    quizTitle: "Desafío: Canales y frecuencias",
    bridge: "Conoces el medio. Ahora mira qué viaja por él: las tramas 802.11.",
    ctf: "Saber en qué canal opera una red es imprescindible para capturar su tráfico."
  },
  "frames-802-11": {
    quizTitle: "Desafío: Frames",
    bridge: "Tienes todos los fundamentos. Ponlos a prueba en la Misión: Reconocimiento Wi-Fi.",
    ctf: "Reconocer los tipos de trama es la base para analizar cualquier captura .pcap."
  }
};
Object.entries(m1LessonExtras).forEach(([lessonId, extra]) => Object.assign(lessons[lessonId], extra));

// Escenario de la misión: un escaneo ficticio del colegio que se consulta en
// todos los pasos. Cada paso aplica una lección del módulo.
lessons[M1_MISSION_ID] = {
  id: M1_MISSION_ID,
  moduleId: 1,
  mission: true,
  missionType: "steps-mission",
  title: "Misión: Reconocimiento Wi-Fi",
  subtitle: "Misión final del Módulo 1",
  labTheme: true,
  doneTitle: "MISIÓN COMPLETADA",
  claim: "Leíste un entorno Wi-Fi como lo hace un analista: estándares, identidades, dispositivos, canales y tramas.",
  badge: { icon: "📡", name: "Explorador Wi-Fi" },
  brief: {
    file: "Expediente · Módulo 1",
    heading: "📡 Misión: Reconocimiento Wi-Fi",
    text: "El equipo de TI del colegio sospecha que alguien instaló un punto de acceso falso. Te entregan un escaneo del edificio. Analízalo paso a paso con todo lo que aprendiste en el módulo."
  },
  scan: {
    title: "Escaneo del edificio (simulado)",
    networks: [
      { id: "n1", bssid: "AA:BB:CC:11:22:33", ssid: "Colegio_DonBosco", channel: 6, band: "2.4 GHz", standard: "802.11n" },
      { id: "n2", bssid: "AA:BB:CC:11:22:44", ssid: "Colegio_DonBosco", channel: 36, band: "5 GHz", standard: "802.11ax" },
      { id: "n3", bssid: "9C:3D:11:7A:40:02", ssid: "Colegio_DonBosco", channel: 6, band: "2.4 GHz", standard: "802.11g" },
      { id: "n4", bssid: "C4:41:1E:3A:90:0F", ssid: "Biblioteca", channel: 1, band: "2.4 GHz", standard: "802.11n" }
    ],
    stations: [
      { id: "s1", mac: "A4:5E:60:12:AB:9F", bssid: "AA:BB:CC:11:22:33", note: "Laptop" },
      { id: "s2", mac: "DE:AD:BE:EF:33:21", bssid: "AA:BB:CC:11:22:44", note: "Teléfono" },
      { id: "s3", mac: "02:14:F3:9A:7B:5C", bssid: "C4:41:1E:3A:90:0F", note: "Tableta" },
      { id: "s4", mac: "6B:88:3F:21:C0:17", bssid: "(no asociado)", note: "Teléfono" }
    ]
  },
  phases: [
    { id: "s1", label: "Estándares" },
    { id: "s2", label: "SSID/BSSID" },
    { id: "s3", label: "MAC" },
    { id: "s4", label: "AP y clientes" },
    { id: "s5", label: "Canales" },
    { id: "s6", label: "Frames" },
    { id: "done", label: "Informe" }
  ],
  steps: [
    {
      id: "s1", kind: "per-item", lesson: "802.11",
      prompt: "Paso 1 · ¿A qué generación Wi-Fi corresponde el estándar de cada red?",
      options: [{ id: "old", label: "Anterior a Wi-Fi 4" }, { id: "wifi4", label: "Wi-Fi 4" }, { id: "wifi5", label: "Wi-Fi 5" }, { id: "wifi6", label: "Wi-Fi 6" }],
      items: [
        { id: "n1", label: "Colegio_DonBosco · AA:BB:CC:11:22:33", detail: "802.11n", answer: "wifi4", explain: "802.11n es Wi-Fi 4.", hint: "Revisa la línea de tiempo de 802.11: ¿qué generación es la «n»?" },
        { id: "n2", label: "Colegio_DonBosco · AA:BB:CC:11:22:44", detail: "802.11ax", answer: "wifi6", explain: "802.11ax es Wi-Fi 6.", hint: "La «ax» es la generación más reciente que viste en la lección." },
        { id: "n3", label: "Colegio_DonBosco · 9C:3D:11:7A:40:02", detail: "802.11g", answer: "old", explain: "802.11g es anterior a Wi-Fi 4: un equipo muy viejo para una red institucional moderna. Anótalo.", hint: "802.11g aparece antes que 802.11n en la línea de tiempo." },
        { id: "n4", label: "Biblioteca · C4:41:1E:3A:90:0F", detail: "802.11n", answer: "wifi4", explain: "802.11n es Wi-Fi 4.", hint: "Igual que la primera red: ¿qué generación es la «n»?" }
      ]
    },
    {
      id: "s2", kind: "single", lesson: "SSID / BSSID",
      prompt: "Paso 2 · Tres redes anuncian el mismo SSID «Colegio_DonBosco». ¿Cuál es la sospechosa de ser un AP falso (Evil Twin)?",
      options: [
        { label: "AA:BB:CC:11:22:33 (canal 6)", correct: false, explain: "Comparte el prefijo AA:BB:CC con la otra red del colegio: mismo fabricante que la infraestructura oficial." },
        { label: "AA:BB:CC:11:22:44 (canal 36)", correct: false, explain: "Es la radio de 5 GHz de la red oficial: mismo prefijo AA:BB:CC. Tener varios BSSID con el mismo SSID es normal." },
        { label: "9C:3D:11:7A:40:02 (canal 6)", correct: true, explain: "Su BSSID no coincide con los equipos oficiales (otro fabricante) y usa un estándar antiguo: el SSID se puede copiar, el BSSID no." }
      ]
    },
    {
      id: "s3", kind: "multi", lesson: "MAC",
      prompt: "Paso 3 · En el informe aparecen estas direcciones. Marca SOLO las que tienen formato de MAC válido y pulsa «Comprobar».",
      items: [
        { id: "m1", label: "A4:5E:60:12:AB:9F", target: true, explain: "6 octetos hexadecimales: válida." },
        { id: "m2", label: "A4:5E:60:12:AB", target: false, explain: "Solo 5 octetos: le falta uno." },
        { id: "m3", label: "192.168.1.20", target: false, explain: "Es una dirección IP, no una MAC." },
        { id: "m4", label: "9C:3D:11:7A:40:02", target: true, explain: "6 octetos hexadecimales: válida (es el BSSID sospechoso)." },
        { id: "m5", label: "AA:BB:CC:11:22:GG", target: false, explain: "«GG» no es hexadecimal (solo 0–9 y A–F)." }
      ]
    },
    {
      id: "s4", kind: "per-item", lesson: "AP y clientes",
      prompt: "Paso 4 · Usa la tabla de clientes del escaneo: ¿a qué red está asociado cada dispositivo?",
      options: [{ id: "n1", label: "Colegio (…22:33)" }, { id: "n2", label: "Colegio (…22:44)" }, { id: "n4", label: "Biblioteca" }, { id: "none", label: "No asociado" }],
      items: [
        { id: "s1", label: "Laptop · A4:5E:60:12:AB:9F", answer: "n1", explain: "Su BSSID asociado es AA:BB:CC:11:22:33.", hint: "Busca su MAC en la tabla de clientes y mira la columna «BSSID asociado»." },
        { id: "s2", label: "Teléfono · DE:AD:BE:EF:33:21", answer: "n2", explain: "Está asociado a AA:BB:CC:11:22:44, la radio de 5 GHz.", hint: "Compara el BSSID asociado con los de la tabla de redes." },
        { id: "s3", label: "Tableta · 02:14:F3:9A:7B:5C", answer: "n4", explain: "C4:41:1E:3A:90:0F es el AP de la Biblioteca.", hint: "¿Qué red tiene el BSSID C4:41:1E:3A:90:0F?" },
        { id: "s4", label: "Teléfono · 6B:88:3F:21:C0:17", answer: "none", explain: "Aparece, pero no está asociado a ningún AP: todavía no forma parte de una red.", hint: "Su columna de BSSID no apunta a ninguna red." }
      ]
    },
    {
      id: "s5", kind: "single", lesson: "Canales y frecuencias",
      prompt: "Paso 5 · TI retira el AP falso y quiere sumar un AP nuevo en 2.4 GHz. Ya hay redes en los canales 1 y 6. ¿Qué canal minimiza los solapamientos?",
      options: [
        { label: "Canal 3", correct: false, explain: "Está a menos de 5 canales del 1 y del 6: se solaparía con ambas." },
        { label: "Canal 6", correct: false, explain: "Ya está ocupado: compartiría el canal con la red del colegio." },
        { label: "Canal 11", correct: true, explain: "1, 6 y 11 no se solapan entre sí en 2.4 GHz." },
        { label: "Canal 9", correct: false, explain: "Está a solo 3 del canal 6: se solaparía." }
      ]
    },
    {
      id: "s6", kind: "per-item", lesson: "Frames",
      prompt: "Paso 6 · Estas tramas se capturaron cerca del AP falso. Clasifica cada una.",
      options: [{ id: "mgmt", label: "Gestión" }, { id: "ctrl", label: "Control" }, { id: "data", label: "Datos" }],
      items: [
        { id: "f1", label: "Beacon desde 9C:3D:11:7A:40:02", answer: "mgmt", explain: "El Beacon anuncia la red: gestión. Así se dio a conocer el AP falso.", hint: "¿Qué categoría anuncia la presencia de una red?" },
        { id: "f2", label: "Probe Request desde 6B:88:3F:21:C0:17", answer: "mgmt", explain: "Buscar redes es gestión: el teléfono no asociado está explorando.", hint: "Un cliente buscando redes forma parte de la gestión de la conexión." },
        { id: "f3", label: "ACK hacia A4:5E:60:12:AB:9F", answer: "ctrl", explain: "El ACK confirma recepción: control.", hint: "Confirmar que algo llegó bien es una función de…" },
        { id: "f4", label: "Datos de la laptop hacia AA:BB:CC:11:22:33", answer: "data", explain: "Transporta contenido real: datos.", hint: "Esta trama lleva el contenido que la laptop envía." }
      ]
    }
  ],
  ctfLinks: [
    ["802.11", "reconocer el estándar y la generación de cada red"],
    ["SSID / BSSID", "detectar un Evil Twin aunque copie el nombre"],
    ["MAC", "validar y seguir direcciones dentro de una captura"],
    ["AP y clientes", "reconstruir quién está conectado a quién"],
    ["Canales", "planificar sin solapamientos y saber dónde escuchar"],
    ["Frames", "clasificar el tráfico de una captura .pcap"]
  ]
};

// ===========================================================================
// MÓDULO 2 — SEGURIDAD WI-FI
// Cinco temas (WEP, WPA y WPA2, WPA3, Cifrado, Autenticación) + la misión
// final "Operación: Red Segura". Reutiliza el motor de lecciones, los
// registros del Módulo 3/5 y moduleMissions (progreso, XP, insignia y
// desbloqueo de la misión). Componentes propios: "m2-flow", "m2-cipher" y la
// práctica "m2-decisions" (ver "MÓDULO 2 — componentes"). Enfoque defensivo:
// reconocer y configurar bien, sin procedimientos para atacar redes. Redes,
// nombres y contraseñas son ficticios.
// ===========================================================================

const M2_SEQUENCE = ["m2-wep", "m2-wpa-wpa2", "m2-wpa3", "m2-cifrado", "m2-autenticacion"];
const M2_MISSION_ID = "m2-mision";
moduleMissions[2] = { missionId: M2_MISSION_ID, sequence: M2_SEQUENCE };

// Feedback con el formato pedido para este módulo (texto + color, nunca solo color).
const M2_OK = "✓ Correcto";
const M2_RETRY = "✗ Inténtalo de nuevo";
const M2_COMMON = { labTheme: true, feedbackTitles: [M2_OK, M2_RETRY], quizOkTitle: M2_OK, quizWrongTitle: M2_RETRY };

Object.assign(lessons, {
  "m2-wep": {
    ...M2_COMMON,
    id: "m2-wep",
    moduleId: 2,
    title: "WEP",
    subtitle: "WEP: los inicios de la seguridad Wi-Fi",
    quizTitle: "Desafío: WEP",
    bridge: "WEP demostró que «tener una clave» no basta. Descubre cómo WPA y WPA2 respondieron a sus fallas.",
    ctf: "En un reto, reconocer WEP te indica de inmediato que la red usa una protección obsoleta.",
    learn: {
      steps: [
        {
          concept: "¿Qué era WEP?",
          explanation: "El primer mecanismo de seguridad del estándar Wi-Fi. Toca cada tarjeta.",
          visual: {
            type: "node-cluster",
            note: "Toca cada tarjeta.",
            nodes: [
              { id: "name", label: "🔤 Significado", sublabel: "Wired Equivalent Privacy", detail: "«Privacidad equivalente a la cableada»: la idea era que el aire fuera tan privado como un cable." },
              { id: "goal", label: "🎯 Propósito", sublabel: "Proteger lo que viaja por el aire", detail: "Cifraba las tramas entre los dispositivos y el punto de acceso para que alguien cercano no pudiera leerlas." },
              { id: "how", label: "🔑 Cómo", sublabel: "Una clave para todos + RC4", detail: "La misma clave se configuraba en el AP y en cada dispositivo, y se combinaba con el cifrador RC4." },
              { id: "era", label: "📅 Su época", sublabel: "1997, el 802.11 original", detail: "Fue un avance histórico: la primera protección estándar de Wi-Fi. Pero se diseñó antes de entender bien sus riesgos." }
            ]
          },
          check: {
            prompt: "¿Qué buscaba WEP?",
            options: ["Hacer la red más rápida", "Proteger los datos que viajan por el aire"],
            correct: 1,
            feedback: ["Correcto: su objetivo era la confidencialidad del enlace inalámbrico.", "Revisa: WEP no tenía que ver con la velocidad, sino con proteger las tramas."]
          }
        },
        {
          concept: "Con WEP vs con seguridad moderna",
          explanation: "Dos laptops se comunican a través del punto de acceso. Cambia entre los dos modos y mira qué podría lograr alguien cerca.",
          visual: {
            type: "m2-flow",
            prompt: "Elige un modo para ver la comunicación.",
            modes: [
              {
                id: "wep", label: "Con WEP", icon: "🔓", tone: "bad",
                nodes: [{ icon: "💻", label: "Laptop A" }, { icon: "📡", label: "Punto de acceso" }, { icon: "💻", label: "Laptop B" }],
                links: [{ label: "RC4 · clave compartida" }, { label: "RC4 · clave compartida" }],
                packet: "WEP",
                observer: { title: "Alguien cerca, con suficientes tramas…", text: "puede recuperar la clave WEP con herramientas conocidas desde hace años y leer el tráfico." },
                detail: "WEP sí cifraba, pero mal: su vector de inicialización (IV) es de solo 24 bits y se repite, la misma clave sirve para todos y casi nunca cambia, y su control de integridad (CRC-32) no impide alterar mensajes."
              },
              {
                id: "modern", label: "Con seguridad moderna", icon: "🔒", tone: "ok",
                nodes: [{ icon: "💻", label: "Laptop A" }, { icon: "📡", label: "Punto de acceso" }, { icon: "💻", label: "Laptop B" }],
                links: [{ label: "AES-CCMP · clave de sesión" }, { label: "AES-CCMP · clave de sesión" }],
                packet: "🔒",
                observer: { title: "Alguien cerca…", text: "ve que hay tráfico, pero no puede leerlo sin la clave de la sesión, y el protocolo detecta si alguien altera un mensaje." },
                detail: "WPA2 y WPA3-Personal cifran con AES-CCMP y derivan claves nuevas en cada conexión. Aun así, el nivel real depende del protocolo configurado, de la contraseña y del estado de los equipos."
              }
            ],
            summary: "WEP fue un avance histórico, pero sus debilidades están en el diseño: no sirve para proteger una red actual."
          },
          check: {
            prompt: "Una red usa WEP con una contraseña larguísima. ¿Está bien protegida?",
            options: ["Sí, porque la clave es larga", "No: las fallas de WEP están en su diseño"],
            correct: 1,
            feedback: ["Revisa: el problema de WEP no es la longitud de la clave, sino cómo la usa.", "Correcto: aunque la clave sea larga, el IV repetido y la clave estática siguen ahí."]
          }
        },
        {
          concept: "¿Por qué ya no es seguro?",
          explanation: "Sus problemas son de diseño, no de configuración. Toca cada uno.",
          visual: {
            type: "node-cluster",
            note: "Toca cada debilidad.",
            nodes: [
              { id: "iv", label: "🔁 IV de 24 bits", sublabel: "Se repite pronto", detail: "Solo hay unos 16,7 millones de valores: en una red con tráfico se repiten rápido, y repetir un IV con la misma clave filtra información." },
              { id: "key", label: "🔑 Clave estática y compartida", sublabel: "La misma para todos", detail: "No se renueva por sesión: si se descubre, sirve para leer el tráfico de todos los dispositivos." },
              { id: "icv", label: "🧩 Integridad débil", sublabel: "CRC-32", detail: "Su comprobación de integridad no es criptográfica: un atacante puede modificar paquetes sin que se note." },
              { id: "status", label: "🚫 Estado actual", sublabel: "Obsoleto desde 2004", detail: "El IEEE lo declaró obsoleto al aprobar 802.11i (la base de WPA2). Los equipos modernos ya no lo ofrecen o lo marcan como inseguro." }
            ]
          },
          check: {
            prompt: "¿Dónde está el problema principal de WEP?",
            options: ["En la contraseña que elige el usuario", "En el diseño de su cifrado (IV corto, clave estática, integridad débil)"],
            correct: 1,
            feedback: ["Revisa: aunque la contraseña sea buena, el diseño sigue siendo débil.", "Correcto: por eso no se arregla con una contraseña mejor."]
          }
        }
      ]
    },
    practice: {
      type: "scan-classify",
      prompt: "Auditoría de una red antigua",
      instructions: "Clasifica cada red según su nivel general de protección. Las que queden como «Sin protección Wi-Fi» u «Obsoleta» necesitan actualizarse. Recuerda: el protocolo es solo una parte; contraseñas, firmware y configuración también cuentan.",
      panelTitle: "Auditoría de redes (simulada)",
      categories: [
        { id: "none", label: "Sin protección Wi-Fi" },
        { id: "obsolete", label: "Obsoleta" },
        { id: "ok", label: "Adecuada" },
        { id: "modern", label: "Más moderna" }
      ],
      items: [
        { id: "bodega", icon: "🏚️", name: "Bodega_2009", clues: ["Seguridad: WEP", "Router de 2009"], answer: "obsolete", explain: "WEP es obsoleto: necesita actualizarse a WPA2 (solo AES) o WPA3.", hint: "Piensa en lo que viste: ¿las fallas de WEP se arreglan con una buena clave?" },
        { id: "oficina", icon: "🏢", name: "Oficina_Central", clues: ["WPA2-Personal", "Cifrado AES-CCMP", "Contraseña larga y única"], answer: "ok", explain: "Protocolo vigente, cifrado AES y contraseña robusta: adecuada si se mantiene actualizada.", hint: "Es un protocolo vigente y bien configurado, pero no el más reciente." },
        { id: "docentes", icon: "🏫", name: "Sala_Docentes", clues: ["WPA3-Personal (SAE)", "Firmware al día"], answer: "modern", explain: "WPA3 es la generación más reciente; con firmware al día es la opción más moderna de la lista.", hint: "Busca el protocolo de generación más reciente." },
        { id: "cafe", icon: "☕", name: "Cafe_Libre", clues: ["Red abierta", "Sin contraseña ni cifrado Wi-Fi"], answer: "none", explain: "Sin autenticación ni cifrado Wi-Fi: cualquiera puede conectarse y el enlace no tiene la protección de Wi-Fi. Necesita actualizarse.", hint: "No pide contraseña y no cifra el enlace: ¿qué protección Wi-Fi tiene?" }
      ],
      success: "WEP y las redes abiertas necesitan actualizarse. WPA2 con AES bien configurado es adecuado; WPA3 es lo más moderno. Pero ninguna etiqueta garantiza la seguridad por sí sola: también importan la contraseña, el firmware y la configuración."
    },
    quiz: [
      { id: "q1", concept: "Significado de WEP", prompt: "¿Qué significa WEP?", options: ["Wireless Encryption Protocol", "Wired Equivalent Privacy", "Wi-Fi Enterprise Protection", "Web Encryption Process"], correct: 1, feedback: ["Correcto: Wired Equivalent Privacy.", "WEP es Wired Equivalent Privacy: privacidad «equivalente» a la de un cable."] },
      { id: "q2", concept: "Propósito original", prompt: "¿Cuál era el propósito original de WEP?", options: ["Aumentar la velocidad de la red", "Dar al enlace inalámbrico una privacidad parecida a la de una red cableada", "Asignar direcciones IP", "Ocultar el nombre de la red"], correct: 1, feedback: ["Correcto: proteger lo que viaja por el aire.", "WEP buscaba proteger las tramas del enlace inalámbrico, no la velocidad ni las direcciones."] },
      { id: "q3", concept: "Debilidades de WEP", prompt: "¿Cuál es una debilidad conocida de WEP?", options: ["Su IV de 24 bits se repite y la clave es estática y compartida", "Exige contraseñas demasiado largas", "Solo funciona en 5 GHz", "Necesita un servidor RADIUS"], correct: 0, feedback: ["Correcto: IV corto, clave estática e integridad débil.", "La debilidad está en su diseño: IV corto que se repite, clave estática y CRC-32."] },
      { id: "q4", concept: "Por qué fue reemplazado", prompt: "¿Qué reemplazó a WEP como protección recomendada?", options: ["Las redes abiertas", "WPA y, sobre todo, WPA2", "Ocultar el SSID", "El filtrado por MAC"], correct: 1, feedback: ["Correcto: primero WPA como transición y luego WPA2.", "Ocultar el SSID o filtrar MAC no cifran nada; el reemplazo fue WPA y luego WPA2."] },
      { id: "q5", concept: "Uso actual", prompt: "Verdadero o falso: una red WEP con una contraseña muy larga es segura hoy.", options: ["Verdadero", "Falso"], correct: 1, feedback: ["Correcto: es falso. Las fallas de WEP no dependen de la clave.", "Es falso: la longitud de la clave no corrige el diseño de WEP."] }
    ]
  },

  "m2-wpa-wpa2": {
    ...M2_COMMON,
    id: "m2-wpa-wpa2",
    moduleId: 2,
    title: "WPA y WPA2",
    subtitle: "La evolución de la protección inalámbrica",
    quizTitle: "Desafío: WPA y WPA2",
    bridge: "WPA2 sigue siendo muy usado, pero tiene límites. Descubre qué cambia con WPA3.",
    ctf: "Distinguir AES de TKIP y Personal de Enterprise te dice cómo está protegida una red antes de analizarla.",
    learn: {
      steps: [
        {
          concept: "WEP → WPA → WPA2",
          explanation: "Toca cada etapa de la línea de tiempo para ver su contexto, su mejora y sus límites.",
          visual: {
            type: "bt-compare",
            prompt: "Toca cada etapa.",
            options: [
              { id: "wep", icon: "🕰️", label: "WEP", tag: "1997", tone: "bad", rows: [
                { k: "Contexto", v: "La primera protección del estándar 802.11." },
                { k: "Mejora", v: "Introdujo el cifrado en Wi-Fi." },
                { k: "Limitaciones", v: "IV corto, clave estática, integridad débil." },
                { k: "Hoy", v: "Obsoleto: no debe usarse." }
              ] },
              { id: "wpa", icon: "🩹", label: "WPA", tag: "2003", tone: "warn", rows: [
                { k: "Contexto", v: "Una solución de transición mientras se terminaba 802.11i, pensada para que equipos de la época de WEP pudieran actualizarse." },
                { k: "Mejora", v: "TKIP: mezcla una clave distinta para cada paquete y agrega un control de integridad (Michael) en lugar de CRC-32." },
                { k: "Limitaciones", v: "TKIP sigue basado en RC4 y tiene debilidades conocidas." },
                { k: "Hoy", v: "Heredado: conviene pasar a WPA2 o WPA3." }
              ] },
              { id: "wpa2", icon: "🛡️", label: "WPA2", tag: "2004", tone: "ok", rows: [
                { k: "Contexto", v: "Implementa el estándar 802.11i completo." },
                { k: "Mejora", v: "AES-CCMP: cifrado AES con un control de integridad robusto, obligatorio en equipos certificados WPA2." },
                { k: "Limitaciones", v: "En modo Personal, una contraseña débil puede adivinarse; y algunos equipos aún permiten activar TKIP." },
                { k: "Hoy", v: "Muy usado y adecuado si se configura solo con AES y una contraseña robusta." }
              ] }
            ],
            summary: "Cada generación respondió a los problemas de la anterior: WPA fue el puente y WPA2, con AES-CCMP, el reemplazo definitivo de WEP."
          },
          check: {
            prompt: "¿Por qué WPA se considera una solución de transición?",
            options: ["Porque permitía mejorar equipos de la época de WEP mientras llegaba WPA2", "Porque solo funcionaba durante un año"],
            correct: 0,
            feedback: ["Correcto: TKIP podía funcionar en hardware pensado para WEP.", "Revisa: fue un paso intermedio entre WEP y el estándar completo (WPA2)."]
          }
        },
        {
          concept: "AES-CCMP: el corazón de WPA2",
          explanation: "WPA2 no es solo un nombre: lo que lo hace robusto es el mecanismo que usa. Toca cada pieza.",
          visual: {
            type: "node-cluster",
            note: "Toca cada pieza.",
            nodes: [
              { id: "aes", label: "🔐 AES", sublabel: "El cifrador", detail: "Un cifrador por bloques moderno y muy estudiado: sin la clave, los datos son ilegibles." },
              { id: "ccmp", label: "🧾 CCMP", sublabel: "Cómo se usa AES en Wi-Fi", detail: "Cifra cada trama y le agrega un código de integridad: si alguien la altera, el receptor lo detecta." },
              { id: "session", label: "🔄 Claves por sesión", sublabel: "No es la contraseña", detail: "La clave de cifrado se deriva en cada conexión (lo verás en el Four-Way Handshake del Módulo 3)." },
              { id: "tkip", label: "⚠️ TKIP", sublabel: "El modo heredado", detail: "Algunos routers lo siguen ofreciendo por compatibilidad. Si ves «WPA2-TKIP» o «AES+TKIP», conviene dejar solo AES." }
            ]
          },
          check: {
            prompt: "¿Qué aporta CCMP además de cifrar?",
            options: ["Detectar si una trama fue alterada", "Ocultar el nombre de la red"],
            correct: 0,
            feedback: ["Correcto: protege también la integridad.", "Revisa: CCMP agrega un código de integridad; ocultar el SSID no tiene que ver."]
          }
        },
        {
          concept: "WPA2-Personal y WPA2-Enterprise",
          explanation: "WPA2 no funciona siempre igual: cambia cómo entra cada persona. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "WPA2-Personal", rows: [
              { label: "Credencial", value: "Una contraseña compartida (PSK)" },
              { label: "Dónde se usa", value: "Hogares y redes pequeñas" },
              { label: "Si alguien se va", value: "Hay que cambiar la contraseña a todos" },
              { label: "Cifrado de los datos", value: "AES-CCMP" }
            ] },
            right: { title: "WPA2-Enterprise", rows: [
              { label: "Credencial", value: "Una por persona (802.1X)" },
              { label: "Dónde se usa", value: "Organizaciones e instituciones" },
              { label: "Si alguien se va", value: "Se desactiva solo su cuenta" },
              { label: "Cifrado de los datos", value: "AES-CCMP" }
            ] }
          },
          check: {
            prompt: "Una red WPA2-Personal y otra WPA2-Enterprise. ¿En qué se diferencian principalmente?",
            options: ["En cómo se autentican las personas", "En que una cifra los datos y la otra no"],
            correct: 0,
            feedback: ["Correcto: las dos cifran con AES-CCMP; cambia la autenticación.", "Revisa la última fila: las dos cifran igual. Lo que cambia es la credencial."]
          }
        }
      ]
    },
    practice: {
      type: "packet-sort",
      prompt: "Selecciona la protección adecuada",
      instructions: "Decide si cada configuración es recomendable o necesita actualizarse. El nombre del protocolo no lo es todo: fíjate también en el cifrado, el modo y la contraseña.",
      itemLabel: "📶 Configuración",
      countLabel: "Configuraciones revisadas",
      binPrefix: "",
      okTitle: M2_OK,
      wrongTitle: M2_RETRY,
      bins: [
        { id: "ok", label: "Recomendable", caption: "Mantener", icon: "✅" },
        { id: "update", label: "Necesita actualizarse", caption: "Cambiar configuración o equipo", icon: "🔧" }
      ],
      items: [
        { id: "wep", icon: "🏚️", text: "Red antigua que todavía usa WEP.", bin: "update", explain: "WEP es obsoleto: no basta con cambiarle la clave.", hint: "¿La debilidad de WEP está en la clave o en su diseño?" },
        { id: "wpa2aes", icon: "🛡️", text: "Router con WPA2-Personal, solo AES-CCMP y una contraseña larga y única.", bin: "ok", explain: "Protocolo vigente, cifrado AES y contraseña robusta: buena combinación.", hint: "Revisa los tres factores: protocolo, cifrado y contraseña. ¿Alguno falla?" },
        { id: "wpa2tkip", icon: "⚠️", text: "Router con WPA2, pero configurado con TKIP por un equipo viejo.", bin: "update", explain: "El nombre dice WPA2, pero TKIP es heredado: conviene usar solo AES-CCMP.", hint: "Mira el mecanismo de cifrado, no solo el nombre del protocolo." },
        { id: "wpa", icon: "🩹", text: "Red con WPA original (TKIP).", bin: "update", explain: "WPA original fue una transición; hoy se considera heredado.", hint: "WPA fue el puente entre WEP y WPA2: ¿sigue siendo lo recomendado?" },
        { id: "weak", icon: "🔑", text: "WPA2 con AES, pero la contraseña es «12345678».", bin: "update", explain: "El protocolo está bien, pero en modo Personal una contraseña débil puede adivinarse: hay que cambiarla.", hint: "El protocolo no es el único factor: ¿qué pasa con esa contraseña?" },
        { id: "ent", icon: "🏫", text: "Colegio con WPA2-Enterprise, cuentas individuales y AES.", bin: "ok", explain: "Autenticación individual (802.1X) y cifrado AES: adecuado para una institución.", hint: "Credenciales por persona y cifrado AES: ¿qué le faltaría?" }
      ],
      hints: { ok: "Revisa si el protocolo, el cifrado y la contraseña son adecuados.", update: "Busca el factor débil: protocolo, cifrado o contraseña." },
      success: "El nombre del protocolo no lo es todo: importan también el cifrado (AES, no TKIP), el modo (Personal o Enterprise) y la contraseña."
    },
    quiz: [
      { id: "q1", concept: "WPA vs WPA2", prompt: "¿Cuál es una diferencia clave entre WPA original y WPA2?", options: ["WPA2 usa AES-CCMP; WPA original se basaba en TKIP", "WPA2 no usa contraseña", "WPA es más moderno que WPA2", "No hay ninguna diferencia"], correct: 0, feedback: ["Correcto: AES-CCMP es la gran mejora de WPA2.", "WPA original usaba TKIP; WPA2 hizo obligatorio AES-CCMP."] },
      { id: "q2", concept: "Evolución desde WEP", prompt: "¿Por qué apareció WPA?", options: ["Para reemplazar rápido a WEP mientras se completaba un estándar más robusto", "Para que las redes fueran abiertas", "Para aumentar la velocidad", "Para reemplazar a WPA3"], correct: 0, feedback: ["Correcto: fue la respuesta urgente a las fallas de WEP.", "WPA nació como transición tras las fallas de WEP, antes de WPA2."] },
      { id: "q3", concept: "AES-CCMP", prompt: "¿Qué función cumple AES-CCMP en WPA2?", options: ["Cifrar las tramas y proteger su integridad", "Elegir el canal", "Ocultar el SSID", "Autenticar con un servidor RADIUS"], correct: 0, feedback: ["Correcto: confidencialidad e integridad de las tramas.", "AES-CCMP es el mecanismo de cifrado e integridad; la autenticación es otra cosa."] },
      { id: "q4", concept: "Configuración adecuada", prompt: "Un router dice «WPA2», pero usa TKIP y la contraseña «12345678». ¿Qué conviene?", options: ["Nada: si dice WPA2, ya es suficiente", "Usar solo AES-CCMP y una contraseña larga y única", "Volver a WEP", "Ocultar el SSID"], correct: 1, feedback: ["Correcto: el nombre no basta; la configuración importa.", "El nombre del protocolo no garantiza nada: hay que usar AES y una buena contraseña."] },
      { id: "q5", concept: "Personal vs Enterprise", prompt: "¿Cuál es la diferencia general entre WPA2-Personal y WPA2-Enterprise?", options: ["Personal usa una contraseña compartida; Enterprise, credenciales individuales con 802.1X", "Enterprise no cifra", "Personal solo funciona en 5 GHz", "Son exactamente iguales"], correct: 0, feedback: ["Correcto: cambia el modo de autenticación.", "La diferencia está en la autenticación: compartida (Personal) o individual (Enterprise)."] }
    ]
  },

  "m2-wpa3": {
    ...M2_COMMON,
    id: "m2-wpa3",
    moduleId: 2,
    title: "WPA3",
    subtitle: "WPA3: una nueva generación de seguridad",
    quizTitle: "Desafío: WPA3",
    bridge: "Ya conoces los protocolos. Ahora mira de cerca qué hace el cifrado con la información que viaja por Wi-Fi.",
    ctf: "Saber qué cambia SAE frente al PSK de WPA2 te ayuda a entender qué es posible —y qué no— en un escenario con WPA3.",
    learn: {
      steps: [
        {
          concept: "¿Qué es WPA3?",
          explanation: "La generación de seguridad Wi-Fi que la Wi-Fi Alliance presentó en 2018. Toca cada tarjeta.",
          visual: {
            type: "node-cluster",
            note: "Toca cada tarjeta.",
            nodes: [
              { id: "why", label: "🎯 Por qué nació", sublabel: "Reforzar a WPA2", detail: "Para cubrir puntos débiles de WPA2, sobre todo cuando la contraseña de una red Personal es débil." },
              { id: "sae", label: "🔑 SAE", sublabel: "En WPA3-Personal", detail: "SAE (Simultaneous Authentication of Equals) reemplaza el intercambio con clave precompartida (PSK) de WPA2-Personal." },
              { id: "pmf", label: "🛡️ PMF obligatorio", sublabel: "Tramas de gestión protegidas", detail: "WPA3 exige protección de tramas de gestión (802.11w), que dificulta, por ejemplo, falsificar desautenticaciones." },
              { id: "ent", label: "🏢 WPA3-Enterprise", sublabel: "802.1X + más exigencias", detail: "Sigue usando 802.1X y suma requisitos; tiene un modo opcional de 192 bits para entornos con necesidades altas." }
            ]
          },
          check: {
            prompt: "¿Qué mecanismo usa WPA3-Personal para autenticar?",
            options: ["SAE", "WEP"],
            correct: 0,
            feedback: ["Correcto: SAE reemplaza al PSK de WPA2-Personal.", "Revisa: WEP es obsoleto; WPA3-Personal usa SAE."]
          }
        },
        {
          concept: "WPA2 vs WPA3",
          explanation: "Selecciona cada protocolo y compara sus características.",
          visual: {
            type: "bt-compare",
            prompt: "Toca cada protocolo.",
            options: [
              { id: "wpa2", icon: "🛡️", label: "WPA2-Personal", tag: "PSK", tone: "warn", rows: [
                { k: "Autenticación", v: "Clave precompartida (PSK) y Four-Way Handshake" },
                { k: "Contraseña débil", v: "Si alguien captura el handshake, puede probar contraseñas sin conexión (offline), sin límite de intentos" },
                { k: "Si la contraseña se filtra luego", v: "Se podría descifrar tráfico capturado antes" },
                { k: "Tramas de gestión", v: "Protección (PMF) opcional" },
                { k: "Compatibilidad", v: "Prácticamente todos los dispositivos" }
              ] },
              { id: "wpa3", icon: "🔰", label: "WPA3-Personal", tag: "SAE", tone: "ok", rows: [
                { k: "Autenticación", v: "SAE: ambos lados prueban que conocen la contraseña sin exponerla" },
                { k: "Contraseña débil", v: "Capturar el intercambio no basta para probar contraseñas offline: cada intento exige interactuar con la red" },
                { k: "Si la contraseña se filtra luego", v: "El tráfico capturado antes sigue protegido (secreto hacia adelante)" },
                { k: "Tramas de gestión", v: "PMF obligatorio" },
                { k: "Compatibilidad", v: "Requiere equipos compatibles; existe un modo de transición WPA2/WPA3" }
              ] }
            ],
            summary: "WPA3 mejora puntos concretos, pero no vuelve invulnerable a una red: una contraseña adivinable, un firmware sin parches o un dispositivo comprometido siguen siendo riesgos."
          },
          check: {
            prompt: "Con WPA3-Personal, ¿se puede usar la contraseña «12345678» sin problema?",
            options: ["Sí, WPA3 lo protege todo", "No: una contraseña fácil sigue siendo un riesgo"],
            correct: 1,
            feedback: ["Revisa: WPA3 dificulta adivinarla sin conexión, pero no la vuelve segura.", "Correcto: se puede filtrar, compartir o probar directamente contra la red."]
          }
        },
        {
          concept: "No todo WPA3-Enterprise es igual",
          explanation: "El nombre no garantiza un nivel único de protección. Toca cada tarjeta.",
          visual: {
            type: "node-cluster",
            note: "Toca cada tarjeta.",
            nodes: [
              { id: "base", label: "🏢 WPA3-Enterprise", sublabel: "Base", detail: "Usa 802.1X como WPA2-Enterprise y exige PMF." },
              { id: "192", label: "🔒 Modo de 192 bits", sublabel: "Opcional", detail: "Para entornos con requisitos altos: exige suites criptográficas más fuertes (como GCMP-256)." },
              { id: "config", label: "⚙️ La configuración manda", sublabel: "EAP y certificados", detail: "El nivel real depende del método de autenticación (EAP), de que los equipos validen el certificado del servidor y de cómo se administre." }
            ]
          },
          check: {
            prompt: "¿Todos los modos de WPA3-Enterprise ofrecen el mismo nivel de protección?",
            options: ["Sí, todos son iguales", "No, depende del modo y de la configuración"],
            correct: 1,
            feedback: ["Revisa: hay un modo base y uno de 192 bits, y la configuración pesa mucho.", "Correcto: el modo y la configuración marcan la diferencia."]
          }
        }
      ]
    },
    practice: {
      type: "m2-decisions",
      prompt: "Actualiza la red",
      instructions: "Toma cada decisión y observa sus consecuencias. No hay una configuración ideal para todos: elige según los dispositivos y las necesidades.",
      scenario: {
        title: "Escenario: colegio pequeño (ficticio)",
        text: "El router admite WPA2 y WPA3. Las laptops y los teléfonos del personal son nuevos y compatibles con WPA3; la impresora es de 2015 y solo admite WPA2.",
        devices: ["📡 Router WPA2/WPA3", "💻 Laptops (WPA3)", "📱 Teléfonos (WPA3)", "🖨️ Impresora (solo WPA2)"]
      },
      decisions: [
        {
          id: "staff", title: "1 · Red del personal", context: "Todos los equipos del personal son compatibles con WPA3.",
          options: [
            { id: "wep", label: "Mantener WEP «porque ya funciona»", ok: false, effects: [["Seguridad", "bad"], ["Compatibilidad", "ok"]], text: "WEP es obsoleto: su clave se puede recuperar. Que funcione no significa que proteja." },
            { id: "wpa3", label: "WPA3-Personal con una contraseña larga y única", ok: true, effects: [["Seguridad", "ok"], ["Compatibilidad", "ok"]], text: "Los equipos lo admiten: es la opción más robusta para este caso." },
            { id: "weak", label: "WPA3-Personal con la contraseña «colegio2024»", ok: false, effects: [["Seguridad", "warn"], ["Compatibilidad", "ok"]], text: "WPA3 dificulta adivinarla sin conexión, pero una contraseña predecible se filtra, se comparte y se puede probar contra la red." }
          ]
        },
        {
          id: "printer", title: "2 · La impresora de 2015", context: "Solo admite WPA2 y no tiene actualización para WPA3.",
          options: [
            { id: "tkip", label: "Pasar toda la red a WPA2-TKIP para que funcione", ok: false, effects: [["Seguridad", "bad"], ["Compatibilidad", "ok"]], text: "TKIP es heredado, y además bajaría la protección de todos los equipos." },
            { id: "separate", label: "Una red aparte para la impresora, con WPA2 (solo AES) y contraseña robusta", ok: true, effects: [["Seguridad", "ok"], ["Compatibilidad", "ok"]], text: "Cuando hace falta compatibilidad, WPA2 bien configurado es razonable, y separarla limita el impacto si algo falla." },
            { id: "open", label: "Dejarla en una red abierta", ok: false, effects: [["Seguridad", "bad"], ["Compatibilidad", "ok"]], text: "Sin autenticación ni cifrado Wi-Fi: cualquiera cercano podría conectarse a esa red." }
          ]
        },
        {
          id: "visitors", title: "3 · Una sola red para todos", context: "La dirección pide una sola red en la que también entren teléfonos viejos de visitantes que solo admiten WPA2.",
          options: [
            { id: "transition", label: "Modo de transición WPA2/WPA3 mientras se renuevan los equipos", ok: true, effects: [["Seguridad", "warn"], ["Compatibilidad", "ok"]], text: "Cada equipo usa lo mejor que soporta. Es un paso intermedio: los que entran por WPA2 conservan los límites de WPA2." },
            { id: "only3", label: "Solo WPA3, aunque los teléfonos viejos queden sin red", ok: false, effects: [["Seguridad", "ok"], ["Compatibilidad", "bad"]], text: "Es lo más robusto, pero no cumple lo que se pidió: los equipos viejos no podrían conectarse." },
            { id: "tkip", label: "Todo en WPA2-TKIP para que nadie tenga problemas", ok: false, effects: [["Seguridad", "bad"], ["Compatibilidad", "ok"]], text: "Resuelve la compatibilidad, pero con un mecanismo heredado para todos." }
          ]
        },
        {
          id: "maintenance", title: "4 · Mantenimiento del router", context: "El router tiene firmware de 2019 y la contraseña de administración de fábrica.",
          options: [
            { id: "leave", label: "Dejarlo así: ya usamos WPA3", ok: false, effects: [["Seguridad", "bad"], ["Compatibilidad", "ok"]], text: "WPA3 no protege un router con fallas sin parchear ni con la contraseña de fábrica." },
            { id: "update", label: "Actualizar el firmware y cambiar la contraseña de administración", ok: true, effects: [["Seguridad", "ok"], ["Compatibilidad", "ok"]], text: "El protocolo es una parte; el equipo también tiene que estar al día." }
          ]
        }
      ],
      success: "No hay una única configuración ideal: WPA3 cuando los equipos lo permitan, WPA2 bien configurado cuando haga falta compatibilidad, y siempre contraseñas robustas y firmware al día."
    },
    quiz: [
      { id: "q1", concept: "Qué es WPA3", prompt: "¿Qué es WPA3?", options: ["La generación más reciente de seguridad Wi-Fi certificada por la Wi-Fi Alliance", "Un tipo de antena", "Una versión mejorada de WEP", "Un protocolo de Bluetooth"], correct: 0, feedback: ["Correcto: la generación más reciente.", "WPA3 es la generación de seguridad Wi-Fi que sucede a WPA2."] },
      { id: "q2", concept: "Diferencias con WPA2", prompt: "¿Qué cambia en las tramas de gestión con WPA3?", options: ["Su protección (PMF) pasa a ser obligatoria", "Dejan de existir", "Se envían sin cifrar a propósito", "Nada, es igual que en WEP"], correct: 0, feedback: ["Correcto: en WPA2 era opcional, en WPA3 es obligatoria.", "WPA3 exige PMF (802.11w); en WPA2 era opcional."] },
      { id: "q3", concept: "Función de SAE", prompt: "¿Qué reemplaza SAE en WPA3-Personal?", options: ["El intercambio con clave precompartida (PSK) de WPA2", "El cifrado AES", "El nombre de la red", "El servidor RADIUS"], correct: 0, feedback: ["Correcto: SAE sustituye al PSK.", "SAE reemplaza al PSK de WPA2-Personal; el cifrado sigue siendo AES."] },
      { id: "q4", concept: "Adivinación de contraseñas", prompt: "¿Cómo ayuda SAE frente a quien captura el intercambio de autenticación?", options: ["Capturarlo no basta para probar contraseñas sin conexión: cada intento exige interactuar con la red", "Hace que la contraseña no importe", "Oculta la red", "Impide que existan contraseñas débiles"], correct: 0, feedback: ["Correcto: elimina el ataque offline sobre lo capturado.", "SAE evita probar contraseñas offline con lo capturado, pero no hace que la contraseña deje de importar."] },
      { id: "q5", concept: "Configuración y credenciales", prompt: "Verdadero o falso: con WPA3, la contraseña y las actualizaciones ya no importan.", options: ["Verdadero", "Falso"], correct: 1, feedback: ["Correcto: es falso. WPA3 no vuelve invulnerable una red.", "Es falso: contraseña, firmware y configuración siguen siendo clave."] }
    ]
  },

  "m2-cifrado": {
    ...M2_COMMON,
    id: "m2-cifrado",
    moduleId: 2,
    title: "Cifrado",
    subtitle: "¿Cómo se protege la información que viaja por Wi-Fi?",
    quizTitle: "Desafío: Cifrado",
    bridge: "El cifrado protege lo que viaja; pero ¿quién puede entrar a la red? Eso lo decide la autenticación.",
    ctf: "Saber qué tramo protege cada capa te ayuda a interpretar qué es legible y qué no dentro de una captura.",
    learn: {
      steps: [
        {
          concept: "Un mensaje por el aire",
          explanation: "Una laptop envía un formulario. Cambia entre los dos modos y mira qué captaría alguien cerca.",
          visual: {
            type: "m2-flow",
            prompt: "Elige un modo.",
            modes: [
              {
                id: "open", label: "Sin cifrado Wi-Fi", icon: "🔓", tone: "bad",
                nodes: [{ icon: "💻", label: "Laptop" }, { icon: "📡", label: "Punto de acceso" }, { icon: "🌐", label: "Internet" }],
                links: [{ label: "aire · sin cifrado Wi-Fi", packet: "nota=95" }, { label: "cable / internet", tone: "plain" }],
                observer: { title: "Lo que captaría alguien cerca del AP", text: "usuario=ana&nota=95 → legible, salvo que la aplicación use su propio cifrado (como HTTPS)." },
                detail: "En una red abierta, el tramo inalámbrico no tiene la protección criptográfica de Wi-Fi."
              },
              {
                id: "wifi", label: "Con cifrado Wi-Fi", icon: "🔒", tone: "ok",
                nodes: [{ icon: "💻", label: "Laptop" }, { icon: "📡", label: "Punto de acceso" }, { icon: "🌐", label: "Internet" }],
                links: [{ label: "aire · cifrado (AES-CCMP)", packet: "9f3a…" }, { label: "cable / internet · sin la protección de Wi-Fi", tone: "plain" }],
                observer: { title: "Lo que captaría alguien cerca del AP", text: "9f 3a c1 7e 02 d8 … → ilegible sin la clave de la sesión." },
                detail: "El cifrado Wi-Fi protege el tramo entre la laptop y el AP. Después del AP los datos ya no tienen esa protección: para todo el recorrido hacen falta medidas como HTTPS."
              }
            ],
            summary: "El cifrado Wi-Fi protege el enlace inalámbrico. No reemplaza a HTTPS ni a otras protecciones de extremo a extremo."
          },
          check: {
            prompt: "Con cifrado Wi-Fi, ¿el mensaje va protegido por Wi-Fi también en internet?",
            options: ["Sí, en todo el recorrido", "No, solo en el tramo inalámbrico"],
            correct: 1,
            feedback: ["Revisa el segundo tramo del diagrama: después del AP ya no hay cifrado Wi-Fi.", "Correcto: Wi-Fi protege el aire; el resto depende de otras capas."]
          }
        },
        {
          concept: "Texto en claro, clave y texto cifrado",
          explanation: "Prueba cada acción. Es una simulación visual: no usa el algoritmo real.",
          visual: {
            type: "m2-cipher",
            plaintext: "Reunión a las 3 pm",
            terms: [
              ["Texto en claro", "El mensaje original, legible."],
              ["Cifrado", "Transformar el texto en claro usando una clave."],
              ["Texto cifrado", "El resultado: ilegible sin la clave."],
              ["Clave", "El dato secreto que permite cifrar y descifrar."],
              ["Descifrado", "Recuperar el texto en claro con la clave correcta."],
              ["Integridad", "Detectar si alguien alteró el mensaje (CCMP la incluye)."]
            ],
            summary: "Sin la clave correcta el texto cifrado no dice nada, y si alguien lo altera, un mecanismo con integridad lo detecta."
          },
          check: {
            prompt: "¿Qué necesita el receptor para leer el texto cifrado?",
            options: ["La clave correcta", "Solo el nombre de la red"],
            correct: 0,
            feedback: ["Correcto: con otra clave el resultado es ilegible.", "Revisa: con una clave distinta, el resultado sale como basura."]
          }
        },
        {
          concept: "Cifrado ≠ autenticación",
          explanation: "Cumplen funciones relacionadas, pero distintas. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "🔒 Cifrado", rows: [
              { label: "Responde", value: "¿Quién puede leer el mensaje?" },
              { label: "Protege", value: "El contenido (y su integridad, si el mecanismo la incluye)" },
              { label: "Ejemplo en Wi-Fi", value: "AES-CCMP en WPA2" }
            ] },
            right: { title: "🪪 Autenticación", rows: [
              { label: "Responde", value: "¿Quién puede entrar a la red?" },
              { label: "Protege", value: "El acceso: verifica credenciales" },
              { label: "Ejemplo en Wi-Fi", value: "Contraseña (Personal) o 802.1X (Enterprise)" }
            ] }
          },
          check: {
            prompt: "Verificar la contraseña de quien se conecta es…",
            options: ["Cifrado", "Autenticación"],
            correct: 1,
            feedback: ["Revisa: el cifrado protege el contenido; verificar credenciales es autenticación.", "Correcto: decide quién entra."]
          }
        }
      ]
    },
    practice: {
      type: "scan-classify",
      prompt: "Protege el mensaje",
      instructions: "Clasifica cada situación según la protección que tiene. Lee la explicación: cada capa protege un tramo distinto.",
      panelTitle: "Situaciones observadas",
      categories: [
        { id: "none", label: "Sin cifrado en el enlace Wi-Fi" },
        { id: "wifi", label: "Protegido por cifrado Wi-Fi" },
        { id: "https", label: "Cifrado Wi-Fi + HTTPS" },
        { id: "app", label: "Cifrado Wi-Fi, app sin protección propia" }
      ],
      items: [
        { id: "cafe", icon: "☕", name: "Café con red abierta", clues: ["Red sin contraseña", "Página http://"], answer: "none", explain: "Ni el enlace Wi-Fi ni la página están cifrados: alguien cerca podría leer lo que se envía.", hint: "¿La red pide contraseña y cifra el enlace?" },
        { id: "printer", icon: "🖨️", name: "Documento a la impresora", clues: ["Oficina con WPA2-AES", "Laptop → impresora de la misma red"], answer: "wifi", explain: "El tramo inalámbrico va cifrado por WPA2: protege contra quien escucha el aire. Los equipos de la propia red siguen siendo puntos a cuidar.", hint: "Todo ocurre dentro de una red Wi-Fi cifrada, sin salir a internet." },
        { id: "bank", icon: "🏦", name: "Banca en línea", clues: ["Red WPA3 del colegio", "Sitio https://"], answer: "https", explain: "Dos capas: Wi-Fi protege el aire y HTTPS protege los datos de extremo a extremo hasta el banco.", hint: "Fíjate en la dirección del sitio: además de la red, ¿hay otra capa?" },
        { id: "chat", icon: "💬", name: "App de chat antigua", clues: ["Red WPA2 de la casa", "La app envía los mensajes sin cifrar a su servidor"], answer: "app", explain: "Wi-Fi solo protege hasta el router; desde ahí los mensajes viajan legibles por internet. Hace falta una app con cifrado propio.", hint: "La red está cifrada, pero ¿qué pasa con los mensajes después del router?" },
        { id: "airport", icon: "✈️", name: "Aeropuerto", clues: ["Red abierta", "Sitio https://"], answer: "none", explain: "El enlace Wi-Fi no está cifrado. HTTPS sí protege el contenido de esa página, pero otro tráfico del equipo sin cifrado propio quedaría expuesto.", hint: "Clasifica según el enlace Wi-Fi: ¿la red cifra el aire?" }
      ],
      success: "Cada capa protege un tramo: el cifrado Wi-Fi cuida el aire; HTTPS o el cifrado de la aplicación cuidan el recorrido completo. Una no reemplaza a la otra."
    },
    quiz: [
      { id: "q1", concept: "Propósito del cifrado", prompt: "¿Cuál es el propósito del cifrado?", options: ["Que solo quien tenga la clave pueda leer la información", "Aumentar la velocidad", "Elegir el canal", "Anunciar el nombre de la red"], correct: 0, feedback: ["Correcto: confidencialidad.", "El cifrado sirve para que solo quien tenga la clave pueda leer."] },
      { id: "q2", concept: "Texto en claro y cifrado", prompt: "¿Qué es el texto cifrado?", options: ["El mensaje original legible", "El mensaje transformado, ilegible sin la clave", "La contraseña de la red", "El nombre del AP"], correct: 1, feedback: ["Correcto.", "El texto en claro es el original; el texto cifrado es el resultado ilegible sin la clave."] },
      { id: "q3", concept: "Función de las claves", prompt: "¿Qué papel cumple la clave?", options: ["Permite cifrar y descifrar: con otra clave el resultado es ilegible", "Decide el canal", "Es el nombre de la red", "Ninguno"], correct: 0, feedback: ["Correcto: sin la clave correcta no hay descifrado.", "La clave es lo que permite cifrar y descifrar."] },
      { id: "q4", concept: "Cifrado vs autenticación", prompt: "¿En qué se diferencian cifrado y autenticación?", options: ["El cifrado protege el contenido; la autenticación verifica quién accede", "Son lo mismo", "La autenticación hace ilegible el mensaje", "El cifrado decide quién entra a la red"], correct: 0, feedback: ["Correcto: funciones relacionadas, pero distintas.", "Cifrado = proteger el contenido; autenticación = verificar quién accede."] },
      { id: "q5", concept: "Wi-Fi y HTTPS", prompt: "Estás en una red WPA3 y entras a un sitio http:// (sin HTTPS). ¿Qué protege el cifrado Wi-Fi?", options: ["Todo el recorrido hasta el sitio", "Solo el tramo entre tu equipo y el AP"], correct: 1, feedback: ["Correcto: después del AP no hay cifrado Wi-Fi.", "Wi-Fi solo protege el enlace inalámbrico; el resto del camino necesita HTTPS."] }
    ]
  },

  "m2-autenticacion": {
    ...M2_COMMON,
    id: "m2-autenticacion",
    moduleId: 2,
    title: "Autenticación",
    subtitle: "¿Quién puede conectarse a la red?",
    quizTitle: "Desafío: Autenticación",
    bridge: "Tienes los cinco temas. Ponlos a prueba en la misión «Operación: Red Segura».",
    ctf: "Entender cómo se autentica una red te indica quién puede acceder y cómo se verifica esa identidad.",
    learn: {
      steps: [
        {
          concept: "WPA-Personal vs WPA-Enterprise",
          explanation: "La autenticación verifica credenciales o identidad antes de dar acceso. Cambia de modo y toca cada parte del diagrama.",
          visual: {
            type: "m2-flow",
            prompt: "Elige un modo.",
            modes: [
              {
                id: "personal", label: "WPA-Personal", icon: "🏠", tone: "info",
                nodes: [
                  { icon: "📱", label: "Dispositivo", detail: "Conoce la contraseña de la red: la misma que usan todos." },
                  { icon: "📡", label: "Punto de acceso", detail: "Comprueba que el dispositivo conoce la contraseña compartida." },
                  { icon: "🌐", label: "Red", detail: "Una vez dentro, el dispositivo usa la red." }
                ],
                links: [{ label: "🔑 contraseña compartida" }, { label: "acceso" }],
                detail: "Todos comparten una contraseña. Es simple y habitual en hogares y redes pequeñas; su seguridad depende, entre otras cosas, de que sea robusta y se mantenga privada."
              },
              {
                id: "enterprise", label: "WPA-Enterprise", icon: "🏢", tone: "info",
                nodes: [
                  { icon: "📱", label: "Dispositivo", detail: "Presenta una credencial propia: usuario y contraseña, o un certificado." },
                  { icon: "📡", label: "Punto de acceso", detail: "No decide solo: reenvía la solicitud al servidor de autenticación (802.1X)." },
                  { icon: "🗄️", label: "Servidor RADIUS", detail: "Verifica la credencial y responde si se permite el acceso, según las políticas." },
                  { icon: "🌐", label: "Red", detail: "El acceso puede depender de quién es la persona (por ejemplo, docente o estudiante)." }
                ],
                links: [{ label: "👤 credencial individual" }, { label: "802.1X: el AP consulta" }, { label: "acceso según políticas" }],
                detail: "Cada persona tiene su credencial y un servidor de autenticación (como RADIUS) la verifica. Los detalles dependen del método (EAP) configurado."
              }
            ],
            summary: "Personal: una contraseña para todos. Enterprise: una identidad por persona, verificada por un servidor."
          },
          check: {
            prompt: "En WPA-Enterprise, ¿quién verifica la credencial?",
            options: ["El servidor de autenticación (por ejemplo, RADIUS), a pedido del AP", "Cada dispositivo se verifica a sí mismo"],
            correct: 0,
            feedback: ["Correcto: el AP reenvía y el servidor decide.", "Revisa el diagrama Enterprise: hay un servidor que verifica."]
          }
        },
        {
          concept: "¿Qué pasa cuando alguien se va?",
          explanation: "La diferencia se nota al administrar los accesos. Pulsa «Resaltar diferencias».",
          visual: {
            type: "compare-pair",
            left: { title: "🏠 WPA-Personal", rows: [
              { label: "Credencial", value: "Una contraseña para todos" },
              { label: "Alguien deja la organización", value: "Hay que cambiar la contraseña y avisar a todos" },
              { label: "Saber quién se conectó", value: "Difícil: todos usan la misma" },
              { label: "Infraestructura", value: "Solo el router" }
            ] },
            right: { title: "🏢 WPA-Enterprise", rows: [
              { label: "Credencial", value: "Una por persona" },
              { label: "Alguien deja la organización", value: "Se desactiva solo su cuenta" },
              { label: "Saber quién se conectó", value: "Cada acceso se asocia a un usuario" },
              { label: "Infraestructura", value: "Router + servidor de autenticación" }
            ] }
          },
          check: {
            prompt: "Una empresa con 200 empleados y altas y bajas frecuentes. ¿Qué enfoque facilita la gestión?",
            options: ["WPA-Personal", "WPA-Enterprise"],
            correct: 1,
            feedback: ["Revisa: con 200 personas, cambiar una contraseña compartida cada vez es inmanejable.", "Correcto: cuentas individuales que se activan y desactivan."]
          }
        },
        {
          concept: "Autenticar no es cifrar",
          explanation: "Toca cada acción para ver qué función cumple.",
          visual: {
            type: "list-select",
            prompt: "Toca cada acción.",
            items: [
              { id: "auth", label: "🔑 Verificar la contraseña al conectarse", note: "Autenticación: decide quién entra a la red." },
              { id: "crypto", label: "🔒 Hacer ilegibles las tramas en el aire", note: "Cifrado: protege el contenido de lo que viaja." },
              { id: "both", label: "🤝 El Four-Way Handshake", note: "Las une: confirma que ambos lados comparten la clave correcta y deriva las claves de cifrado de la sesión (lo verás en el Módulo 3)." }
            ]
          },
          check: {
            prompt: "Si una red verificara bien quién entra pero no cifrara, ¿la información viajaría protegida?",
            options: ["Sí", "No: autenticar no hace ilegible el tráfico"],
            correct: 1,
            feedback: ["Revisa: autenticar controla el acceso, no protege el contenido.", "Correcto: hacen falta las dos funciones."]
          }
        }
      ]
    },
    practice: {
      type: "packet-sort",
      prompt: "Elige el sistema de acceso",
      instructions: "Relaciona cada escenario con el enfoque que mejor se ajusta a sus necesidades. Arrástralo o toca un compartimento.",
      itemLabel: "🧭 Escenario",
      countLabel: "Escenarios resueltos",
      binPrefix: "",
      okTitle: M2_OK,
      wrongTitle: M2_RETRY,
      bins: [
        { id: "personal", label: "WPA-Personal", caption: "Contraseña compartida", icon: "🏠" },
        { id: "enterprise", label: "WPA-Enterprise", caption: "802.1X + servidor", icon: "🏢" }
      ],
      items: [
        { id: "home", icon: "🏠", text: "Una vivienda con 6 dispositivos de la familia.", bin: "personal", explain: "Pocos dispositivos y personas de confianza: una contraseña robusta y privada suele bastar.", hint: "¿Hace falta un servidor y cuentas individuales para una familia?" },
        { id: "school", icon: "🏫", text: "Una institución educativa con cientos de estudiantes y docentes, cada uno con su usuario.", bin: "enterprise", explain: "Credenciales individuales y control por persona: Enterprise.", hint: "Cada persona ya tiene su propio usuario: ¿qué enfoque lo aprovecha?" },
        { id: "company", icon: "🏢", text: "Una empresa que debe dar y quitar acceso a empleados de varios departamentos.", bin: "enterprise", explain: "Enterprise permite políticas por persona y revocar accesos de forma individual.", hint: "Dar y quitar accesos uno por uno es difícil con una sola contraseña." },
        { id: "shared", icon: "🔁", text: "Una oficina donde todos comparten una sola contraseña y ya nadie sabe quién la tiene.", bin: "enterprise", explain: "Es el problema típico de una clave compartida a escala: pasar a credenciales individuales facilita la gestión.", hint: "El problema es justamente la contraseña compartida." },
        { id: "shop", icon: "🛍️", text: "Una tienda pequeña con 3 empleados de confianza y sin servidor propio.", bin: "personal", accept: ["personal", "enterprise"], explain: "Depende de sus necesidades: Personal con una contraseña robusta suele bastar; Enterprise también es posible, pero exige más infraestructura. Ambas respuestas son válidas." }
      ],
      hints: { personal: "Piensa en cuántas personas hay y si hace falta gestionarlas una por una.", enterprise: "Piensa en cuántas personas hay y si hace falta gestionarlas una por una." },
      success: "No hay una opción universal: Personal es simple para pocos usuarios de confianza; Enterprise escala y permite gestionar identidades cuando hay muchas personas o se necesita control individual."
    },
    quiz: [
      { id: "q1", concept: "Propósito de la autenticación", prompt: "¿Cuál es el propósito de la autenticación en Wi-Fi?", options: ["Verificar credenciales o identidad antes de dar acceso a la red", "Hacer ilegibles los datos", "Elegir el canal", "Aumentar el alcance"], correct: 0, feedback: ["Correcto: decide quién puede entrar.", "La autenticación verifica quién accede; hacer ilegibles los datos es el cifrado."] },
      { id: "q2", concept: "WPA-Personal", prompt: "¿Qué usa normalmente WPA-Personal?", options: ["Una contraseña compartida", "Un certificado obligatorio por persona", "Un servidor RADIUS", "La huella digital"], correct: 0, feedback: ["Correcto.", "WPA-Personal se basa normalmente en una contraseña que comparten todos."] },
      { id: "q3", concept: "WPA-Enterprise", prompt: "¿Qué caracteriza a WPA-Enterprise?", options: ["Autenticación 802.1X con un servidor y credenciales individuales", "No usa credenciales", "Solo funciona en viviendas", "Todos comparten una contraseña"], correct: 0, feedback: ["Correcto.", "Enterprise usa 802.1X y un servidor de autenticación, con credenciales por persona."] },
      { id: "q4", concept: "802.1X y RADIUS", prompt: "En WPA-Enterprise, ¿qué hace el servidor RADIUS?", options: ["Verifica las credenciales que el AP le reenvía y responde si se permite el acceso", "Emite la señal Wi-Fi", "Cifra las páginas web", "Asigna los canales"], correct: 0, feedback: ["Correcto: el AP pregunta y el servidor decide.", "El servidor verifica credenciales; el AP solo hace de intermediario."] },
      { id: "q5", concept: "Autenticación vs cifrado", prompt: "¿Cuál es la diferencia entre autenticación y cifrado?", options: ["La autenticación decide quién entra; el cifrado protege el contenido", "Son lo mismo", "El cifrado decide quién entra", "La autenticación hace ilegibles los mensajes"], correct: 0, feedback: ["Correcto: funciones distintas que se complementan.", "Autenticación = acceso; cifrado = contenido."] }
    ]
  }
});

// Misión final: un mismo conjunto de perfiles de red que se analiza en las
// cinco etapas (motor "steps-mission", el mismo de la misión del Módulo 1).
lessons[M2_MISSION_ID] = {
  ...M2_COMMON,
  id: M2_MISSION_ID,
  moduleId: 2,
  mission: true,
  missionType: "steps-mission",
  title: "Operación: Red Segura",
  subtitle: "Misión final del Módulo 2",
  doneTitle: "MISIÓN COMPLETADA",
  claim: "Revisaste una red como un auditor: protocolos, configuración, cifrado y autenticación, hasta emitir una recomendación fundamentada.",
  badge: { icon: "🛡️", name: "Guardián Wi-Fi" },
  brief: {
    file: "Expediente · Módulo 2",
    heading: "🛡️ Operación: Red Segura",
    text: "El equipo de WISPR recibió el encargo de revisar la configuración de una red inalámbrica. Hay varios perfiles disponibles, pero algunos utilizan mecanismos antiguos o configuraciones inadecuadas. Analiza las evidencias y recomienda una configuración más segura."
  },
  scan: {
    title: "Perfiles de red del centro (simulado)",
    columns: [
      { key: "ssid", label: "SSID", code: true },
      { key: "security", label: "Seguridad" },
      { key: "cipher", label: "Cifrado" },
      { key: "auth", label: "Autenticación" },
      { key: "note", label: "Nota" }
    ],
    rows: [
      { ssid: "Bodega_Vieja", security: "WEP", cipher: "RC4 (WEP)", auth: "Clave compartida", note: "Router de 2008" },
      { ssid: "Admin_Centro", security: "WPA", cipher: "TKIP", auth: "Clave compartida", note: "—" },
      { ssid: "Oficina", security: "WPA2-Personal", cipher: "TKIP", auth: "Contraseña «oficina123»", note: "—" },
      { ssid: "Docentes", security: "WPA2-Enterprise", cipher: "AES-CCMP", auth: "802.1X", note: "Cuentas individuales" },
      { ssid: "Laboratorio", security: "WPA3-Personal", cipher: "AES-CCMP", auth: "SAE", note: "Contraseña larga y única" }
    ]
  },
  phases: [
    { id: "s1", label: "Protocolo" },
    { id: "s2", label: "Configuración" },
    { id: "s3", label: "Cifrado" },
    { id: "s4", label: "Autenticación" },
    { id: "s5", label: "Diagnóstico" },
    { id: "done", label: "Informe" }
  ],
  steps: [
    {
      id: "s1", kind: "per-item", lesson: "WEP, WPA, WPA2 y WPA3",
      prompt: "Etapa 1 · Identifica el protocolo: ¿cada perfil usa un mecanismo obsoleto o una alternativa vigente?",
      options: [{ id: "obsolete", label: "Obsoleto" }, { id: "current", label: "Vigente (bien configurado)" }, { id: "modern", label: "Más moderno" }],
      items: [
        { id: "p1", label: "Bodega_Vieja", detail: "WEP", answer: "obsolete", explain: "WEP es obsoleto por diseño.", hint: "Recuerda el Tema 1: ¿WEP se corrige con una buena clave?" },
        { id: "p2", label: "Admin_Centro", detail: "WPA", answer: "obsolete", explain: "WPA original (TKIP) fue una transición: hoy es heredado.", hint: "WPA fue el puente entre WEP y WPA2." },
        { id: "p4", label: "Docentes", detail: "WPA2-Enterprise", answer: "current", explain: "WPA2 sigue vigente, sobre todo bien configurado y con AES.", hint: "Es el protocolo que reemplazó a WEP, pero no el más reciente." },
        { id: "p5", label: "Laboratorio", detail: "WPA3-Personal", answer: "modern", explain: "WPA3 es la generación más reciente.", hint: "Busca la generación más reciente." }
      ]
    },
    {
      id: "s2", kind: "multi", lesson: "WPA y WPA2: la configuración",
      prompt: "Etapa 2 · Analiza la configuración: marca SOLO los puntos problemáticos y pulsa «Comprobar».",
      items: [
        { id: "c1", label: "Bodega_Vieja: cifrado WEP", target: true, explain: "Problema: WEP es obsoleto." },
        { id: "c2", label: "Admin_Centro: WPA con TKIP", target: true, explain: "Problema: TKIP es heredado." },
        { id: "c3", label: "Oficina: TKIP en lugar de AES", target: true, explain: "Problema: aunque diga WPA2, usa el mecanismo heredado." },
        { id: "c4", label: "Oficina: contraseña «oficina123»", target: true, explain: "Problema: es predecible y en modo Personal se puede adivinar." },
        { id: "c5", label: "Docentes: WPA2-Enterprise con AES-CCMP", target: false, explain: "Adecuado: autenticación individual y cifrado AES." },
        { id: "c6", label: "Laboratorio: WPA3-SAE con contraseña larga", target: false, explain: "Adecuado: protocolo moderno y contraseña robusta." }
      ]
    },
    {
      id: "s3", kind: "single", lesson: "Cifrado",
      prompt: "Etapa 3 · Una docente envía calificaciones desde «Docentes» (WPA2-AES) a una plataforma web con https://. ¿Qué afirmación es correcta?",
      options: [
        { label: "El cifrado Wi-Fi protege los datos en todo el recorrido, así que HTTPS sobra", correct: false, explain: "Wi-Fi solo protege el tramo inalámbrico, hasta el AP." },
        { label: "Wi-Fi protege el tramo hasta el AP y HTTPS protege los datos hasta la plataforma", correct: true, explain: "Cada capa cubre un tramo y se complementan." },
        { label: "Como hay HTTPS, el cifrado Wi-Fi no aporta nada", correct: false, explain: "Sí aporta: protege también el tráfico del enlace que no usa HTTPS." },
        { label: "Al ser una red Enterprise, ninguna de las dos capas hace falta", correct: false, explain: "Enterprise trata de la autenticación; no reemplaza al cifrado ni a HTTPS." }
      ]
    },
    {
      id: "s4", kind: "per-item", lesson: "Autenticación",
      prompt: "Etapa 4 · Selecciona la autenticación que mejor se ajusta a cada contexto.",
      options: [{ id: "personal", label: "WPA-Personal" }, { id: "enterprise", label: "WPA-Enterprise" }],
      items: [
        { id: "h1", label: "Casa de la conserje: 4 dispositivos de la familia", answer: "personal", explain: "Pocos dispositivos de confianza: una contraseña robusta basta.", hint: "¿Una familia necesita cuentas individuales y un servidor?" },
        { id: "h2", label: "Personal del centro: 60 personas con altas y bajas", answer: "enterprise", explain: "Cuentas individuales que se activan y desactivan sin cambiar nada a los demás.", hint: "Piensa en qué pasa cada vez que alguien se va." },
        { id: "h3", label: "Estudiantes del laboratorio con usuario institucional", answer: "enterprise", explain: "Ya tienen usuario propio: Enterprise lo aprovecha y permite políticas por grupo.", hint: "Cada estudiante ya tiene una identidad institucional." }
      ]
    },
    {
      id: "s5", kind: "single", lesson: "WPA3 y el diagnóstico final",
      prompt: "Etapa 5 · Emite el diagnóstico: ¿qué recomiendas para la red del centro?",
      options: [
        { label: "Retirar WEP y WPA; Enterprise para el personal; WPA3 donde los equipos lo admitan y WPA2 solo con AES donde haga falta compatibilidad; contraseñas robustas y firmware al día", correct: true, explain: "Combina todo: protocolo según los equipos, buena configuración, autenticación acorde al contexto y mantenimiento." },
        { label: "Mantener todo igual: todas las redes tienen contraseña", correct: false, explain: "Tener contraseña no basta: WEP, WPA y TKIP siguen siendo débiles." },
        { label: "Todo en WPA3-Personal con la contraseña «centro2024» para todos: WPA3 lo vuelve invulnerable", correct: false, explain: "WPA3 no vuelve invulnerable una red, y una sola contraseña predecible para 60 personas es difícil de gestionar." },
        { label: "Abrir las redes: con HTTPS ya basta", correct: false, explain: "HTTPS no protege todo el tráfico ni controla quién se conecta a la red." }
      ]
    }
  ],
  ctfLinks: [
    ["WEP", "reconocer una red con protección obsoleta"],
    ["WPA y WPA2", "distinguir AES de TKIP y Personal de Enterprise"],
    ["WPA3", "entender qué cambia SAE frente a un handshake de WPA2"],
    ["Cifrado", "saber qué tramo protege cada capa en una captura"],
    ["Autenticación", "interpretar quién accede a una red y cómo se verifica"]
  ]
};

let terminalClient = null;
let terminalEpoch = 0;
let pendingTerminalCommand = "";
let authMode = "login";
// Pantalla pública para visitantes sin sesión: "landing" (página de inicio
// general) o "auth" (el formulario de login/registro de siempre).
let publicScreen = "landing";
let navOpen = false;
let moreMenuOpen = false; // menú desplegable "Más" del nav de escritorio (Teoría/Retos/Progreso/Ranking)
let pendingAuth = null; // { kind: "register"|"login", token, email, role } mientras falta el código MFA
let resendCooldownUntil = 0;
// Panel admin: no se persiste en localStorage (se recarga desde el backend
// cada vez que se abre la pestaña, para no dejar cuentas ajenas cacheadas).
let adminState = { loading: false, error: "", players: [], search: "", roleFilter: "all", selected: new Set() };
let adminGroupsState = { loading: false, error: "", groups: [] };
// Grupos del profesor logueado (solo tiene sentido con role === "profesor").
let teacherGroupsState = { loading: false, error: "", groups: [] };
// Detalle de un estudiante visto desde Mis Grupos / Grupos (profesor o admin).
let studentDetailState = { loading: false, error: "", student: null, returnTab: "" };
// Estudiantes disponibles para el selector de "agregar al grupo" (profesor o admin).
let availableStudentsState = { loading: false, error: "", students: [] };
const EMAIL_SUFFIXES = { estudiante: "@est.cedesdonbosco.ed.cr", profesor: "@cedesdonbosco.ed.cr" };
const ADMIN_TABS = new Set(["admin-home", "admin-ranking", "admin", "admin-groups"]);
const PROFESOR_TABS = new Set(["profesor-home", "grupos", "estudiante"]);

// ---------------------------------------------------------------------------
// Sesión: el backend entrega un token tras el MFA. apiFetch lo adjunta a cada
// petición y, si el backend responde que la sesión expiró, vuelve al login.
// ---------------------------------------------------------------------------
function getSessionToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

function setSessionToken(token) {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function clearSessionToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

async function apiFetch(url, options = {}) {
  const token = getSessionToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && token) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.auth === "required") handleSessionExpired(data.error);
  }
  return response;
}

let sessionExpiredShown = false;
function handleSessionExpired(message) {
  if (sessionExpiredShown || !app.user) return;
  sessionExpiredShown = true;
  endLocalSession();
  publicScreen = "auth";
  authMode = "login";
  render();
  toast(message || "Tu sesión expiró. Inicia sesión de nuevo.", "warn");
  setTimeout(() => { sessionExpiredShown = false; }, 2000);
}

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function newPlayerId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return Array.from(values, value => value.toString(16)).join("-");
}

// Progreso de Teoría guardado en este navegador antes de que existiera la
// sincronización (o de una sesión sin token). Solo se sube al backend si
// pertenece al mismo usuario que inicia sesión (computadoras compartidas).
let legacyLessonProgress = null;

function loadState() {
  const hasToken = Boolean(getSessionToken());
  if (!hasToken) {
    const legacy = safeJson(localStorage.getItem(STORE_KEY), {});
    if (legacy.user?.handle && legacy.lessonProgress && Object.keys(legacy.lessonProgress).length) {
      legacyLessonProgress = { handle: legacy.user.handle, progress: legacy.lessonProgress };
    }
  }
  const saved = hasToken ? safeJson(localStorage.getItem(STORE_KEY), {}) : {};
  const session = hasToken ? safeJson(localStorage.getItem(SESSION_KEY), null) : null;
  return {
    user: saved.user || (session ? { name: session.user, handle: session.handle, gender: session.gender, joined: session.loginAt, email: session.email, role: session.role } : null),
    playerId: saved.playerId || (session && session.playerId) || newPlayerId(),
    challenges: [],
    solved: saved.solved || {},
    attempts: saved.attempts || {},
    hints: saved.hints || {},
    submissions: saved.submissions || [],
    activeTab: saved.activeTab || "dashboard",
    selectedId: saved.selectedId || "",
    activeChallengeId: saved.activeChallengeId || "",
    filter: saved.filter || "all",
    sort: saved.sort || "recommended",
    loading: Boolean(session || saved.user),
    loadError: "",
    terminal: { connected: false, starting: false, lastError: "", diagnostic: "" },
    platform: { checking: Boolean(session || saved.user), dockerReady: null, detail: "" },
    theoryOpen: 1,
    lessonProgress: saved.lessonProgress || {},
    lesson: null
  };
}

let app = loadState();

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    user: app.user,
    playerId: app.playerId,
    solved: app.solved,
    attempts: app.attempts,
    hints: app.hints,
    submissions: app.submissions.slice(0, 20),
    activeTab: app.activeTab,
    selectedId: app.selectedId,
    activeChallengeId: app.activeChallengeId,
    filter: app.filter,
    sort: app.sort,
    lessonProgress: app.lessonProgress
  }));
}

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "style") Object.assign(node.style, value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? "" : value);
  });
  [].concat(children).flat(Infinity).filter(Boolean).forEach(child => node.appendChild(child instanceof Node ? child : document.createTextNode(String(child))));
  return node;
}

const div = (props, children) => h("div", props, children);
const span = (props, children) => h("span", props, children);
const button = (props, children) => h("button", props, children);

// El logo ya trae el wordmark "WISPR" dibujado, así que reemplaza el cuadro
// con la "W" + el texto "WISPR"/subtítulo gris que había antes.
function brandLogo(extraClass = "") {
  return h("img", { src: "./img/logo.png", alt: "WISPR — Wireless Intelligence for Security, Practice and Response", class: `brand-logo ${extraClass}`.trim() }, []);
}

// --- Selector de modo claro/oscuro ---------------------------------------
// El botón vive fuera de #root para no depender del ciclo de render() de la
// app (que reemplaza todo #root en cada cambio de estado); así el interruptor
// persiste sin recrearse en cada render.
function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

function initThemeToggle() {
  let theme = getStoredTheme();
  applyTheme(theme);
  const icon = t => (t === "dark" ? "🌙" : "☀️");
  const label = t => (t === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  const toggle = button({
    class: "theme-toggle",
    type: "button",
    title: label(theme),
    "aria-label": label(theme),
    onclick: () => {
      theme = theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      toggle.textContent = icon(theme);
      toggle.title = label(theme);
      toggle.setAttribute("aria-label", label(theme));
    }
  }, icon(theme));
  document.body.appendChild(toggle);
}

function selectedChallenge() {
  return app.challenges.find(challenge => challenge.id === app.selectedId) || app.challenges[0] || null;
}

function stats() {
  const solvedIds = Object.keys(app.solved);
  const score = solvedIds.reduce((total, id) => total + (app.challenges.find(challenge => challenge.id === id)?.points || app.solved[id].points || 0), 0);
  return { score, solves: solvedIds.length, total: app.challenges.length, hints: Object.values(app.hints).reduce((total, items) => total + items.length, 0) };
}

// Ranking real desde el backend (/api/ranking). Mientras no llega, se muestra
// solo al jugador actual con sus datos locales.
let rankingState = { loaded: false, rows: [] };

async function loadRanking() {
  if (!app.user || app.user.role === "admin" || app.user.role === "profesor") return;
  try {
    const response = await apiFetch(API + "/api/ranking", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar el ranking.");
    rankingState = { loaded: true, rows: data.ranking || [] };
    // El chip del encabezado muestra el puesto: se redibuja en toda pestaña
    // que no tenga estado vivo (la terminal y una lección en curso se dejan).
    if (!["terminal", "lesson"].includes(app.activeTab)) render();
  } catch (error) {
    console.warn("[ranking]", error.message);
  }
}

function leaderboard() {
  if (!app.user) return [];
  if (rankingState.loaded && rankingState.rows.some(row => row.current)) return rankingState.rows;
  const current = stats();
  return [...rankingState.rows.filter(row => !row.current), { name: app.user.name, handle: app.user.handle, score: current.score, solves: current.solves, streak: 0, current: true }]
    .sort((left, right) => right.score - left.score || right.solves - left.solves);
}

function greeting() {
  const gender = app.user?.gender;
  if (gender === "femenino") return `Bienvenida, ${app.user.name}.`;
  if (gender === "masculino") return `Bienvenido, ${app.user.name}.`;
  return `Te damos la bienvenida, ${app.user.name}.`;
}

function applyServerProfile(player) {
  app.user = { name: player.name, handle: player.handle, gender: player.gender, joined: player.joined, email: player.email, role: player.role };
  app.playerId = player.playerId;
  // Si el admin emitió una contraseña temporal, se obliga a cambiarla antes de
  // usar la plataforma (ver el gate en render()).
  app.mustChangePassword = Boolean(player.mustChangePassword);
  app.solved = player.solved || {};
  app.attempts = player.attempts || {};
  app.submissions = player.submissions || [];
  // Pistas abiertas guardadas en el servidor (backend FastAPI); el prototipo
  // Node solo no las manda y se conservan las del navegador.
  if (player.hints && typeof player.hints === "object") app.hints = player.hints;
  if (legacyLessonProgress && legacyLessonProgress.handle === player.handle) {
    app.lessonProgress = { ...legacyLessonProgress.progress, ...(app.lessonProgress || {}) };
  }
  legacyLessonProgress = null;
  mergeServerLessonProgress(player.lessonProgress || {});
  // El admin aterriza en su propio home ("admin-home") salvo que ya estuviera
  // en una de sus otras pestañas; precarga cuentas y grupos de una vez, ya
  // que el home muestra estadísticas de ambos (switchTab() no se dispara en
  // este flujo de login/hidratación).
  if (player.role === "admin") {
    if (!ADMIN_TABS.has(app.activeTab)) app.activeTab = "admin-home";
    loadAdminPlayers();
    loadAdminGroups();
  }
  // El profesor ya no es jugador: solo tiene su panel y sus grupos, igual
  // que el admin con los suyos.
  if (player.role === "profesor") {
    if (!PROFESOR_TABS.has(app.activeTab)) app.activeTab = "profesor-home";
    loadTeacherGroups();
    loadAvailableStudents();
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user: player.name, handle: player.handle, gender: player.gender, loginAt: Date.now(), playerId: player.playerId, email: player.email, role: player.role }));
  saveState();
}

// Combina el progreso de Teoría del backend con el local (gana el mejor
// resultado) y sube lo que el backend todavía no tiene: así el progreso que
// se hizo antes de existir la sincronización no se pierde.
function mergeServerLessonProgress(serverProgress) {
  const local = app.lessonProgress || {};
  const merged = { ...serverProgress };
  const pending = [];
  Object.entries(local).forEach(([lessonId, entry]) => {
    const remote = serverProgress[lessonId];
    if (!remote || (entry.percent || 0) > (remote.percent || 0) || (entry.xp || 0) > (remote.xp || 0)) {
      merged[lessonId] = { ...remote, ...entry, percent: Math.max(entry.percent || 0, remote?.percent || 0), xp: Math.max(entry.xp || 0, remote?.xp || 0) };
      pending.push(lessonId);
    }
  });
  app.lessonProgress = merged;
  pending.forEach(syncLessonProgress);
}

async function syncLessonProgress(lessonId) {
  const entry = app.lessonProgress[lessonId];
  if (!entry || !app.user) return;
  try {
    const response = await apiFetch(API + "/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, percent: entry.percent, xp: entry.xp, attempts: entry.attempts || entry.errors || 0, badge: entry.badge })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo guardar el progreso.");
  } catch (error) {
    // El progreso queda guardado localmente y se reintenta en el próximo inicio de sesión.
    console.warn("[progreso] sin sincronizar:", lessonId, error.message);
  }
}

function upsertChallenge(challenge) {
  const index = app.challenges.findIndex(item => item.id === challenge.id);
  if (index >= 0) app.challenges[index] = challenge;
  else app.challenges.push(challenge);
}

async function hydratePlatform() {
  if (!app.user) return;
  app.loading = true;
  render();
  try {
    const [challengeResponse, statusResponse, profileResponse] = await Promise.all([
      apiFetch(API + "/api/challenges", { cache: "no-store" }),
      apiFetch(API + "/api/platform/status", { cache: "no-store" }).catch(() => null),
      apiFetch(`${API}/api/players/me?playerId=${encodeURIComponent(app.playerId)}`, { cache: "no-store" }).catch(() => null)
    ]);
    if (profileResponse && profileResponse.ok) {
      const profile = await profileResponse.json().catch(() => ({}));
      if (profile.ok && profile.player) applyServerProfile(profile.player);
    }
    const data = await challengeResponse.json();
    if (!challengeResponse.ok || !data.ok) throw new Error(data.error || "No se pudo cargar el catálogo.");
    app.challenges = data.challenges || [];
    if (!app.challenges.some(challenge => challenge.id === app.selectedId)) app.selectedId = app.challenges[0]?.id || "";
    if (app.activeChallengeId && !app.challenges.some(challenge => challenge.id === app.activeChallengeId)) app.activeChallengeId = "";
    if (statusResponse) {
      const status = await statusResponse.json().catch(() => ({}));
      app.platform = {
        checking: false,
        dockerReady: Boolean(status?.docker?.ready),
        detail: status?.docker?.ready ? `Docker ${status.docker.version}` : (status?.docker?.error || "Docker no está disponible")
      };
    } else {
      app.platform = { checking: false, dockerReady: false, detail: "No se pudo comprobar Docker Desktop" };
    }
    app.loadError = "";
  } catch (error) {
    app.loadError = error.message || "No se pudo conectar al laboratorio local.";
  } finally {
    app.loading = false;
    saveState();
    render();
  }
  loadRanking();
}

// ---------------------------------------------------------------------------
// Panel admin: ver todas las cuentas registradas y eliminarlas. El backend
// vuelve a comprobar que app.playerId sea una cuenta admin en cada llamada.
// ---------------------------------------------------------------------------
async function loadAdminPlayers() {
  if (!app.user || app.user.role !== "admin") return;
  adminState.loading = true;
  adminState.error = "";
  render();
  try {
    const response = await apiFetch(`${API}/api/admin/players?playerId=${encodeURIComponent(app.playerId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la lista de cuentas.");
    adminState.players = data.players || [];
    const validIds = new Set(adminState.players.map(player => player.playerId));
    adminState.selected.forEach(id => { if (!validIds.has(id)) adminState.selected.delete(id); });
  } catch (error) {
    adminState.error = error.message || "No se pudo cargar la lista de cuentas.";
  } finally {
    adminState.loading = false;
    render();
  }
}

async function deleteAccount(targetId, name) {
  if (!confirm(`¿Eliminar la cuenta de ${name}? Esta acción no se puede deshacer.`)) return;
  try {
    const response = await apiFetch(`${API}/api/admin/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, targetId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo eliminar la cuenta.");
    adminState.players = adminState.players.filter(player => player.playerId !== targetId);
    adminState.selected.delete(targetId);
    toast(`Cuenta de ${name} eliminada.`, "success");
    render();
  } catch (error) {
    toast(error.message || "No se pudo eliminar la cuenta.", "error");
  }
}

// Recuperación sin correo: emite una contraseña temporal de un solo uso. El
// admin la lee en pantalla y se la entrega al jugador en persona; el sistema
// obliga a cambiarla en el siguiente inicio de sesión.
async function adminResetPassword(targetId, name) {
  if (!confirm(`¿Emitir una contraseña temporal para ${name}? Tendrá que cambiarla al entrar.`)) return;
  try {
    const response = await apiFetch(`${API}/api/admin/players/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, targetId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo emitir la contraseña temporal.");
    // Se muestra UNA sola vez: el admin la copia y la dicta al jugador.
    window.alert(`Contraseña temporal para ${name} (${data.handle}):\n\n    ${data.tempPassword}\n\nEntrégala en persona. El jugador deberá cambiarla al iniciar sesión.`);
    await loadAdminPlayers();
  } catch (error) {
    toast(error.message || "No se pudo emitir la contraseña temporal.", "error");
  }
}

// Bloqueo/desbloqueo manual. Bloquear cierra las sesiones del jugador y detiene
// su contenedor Kali.
async function adminToggleLock(player) {
  const lock = !player.locked;
  const name = player.name || player.handle;
  let reason = "";
  if (lock) {
    if (!confirm(`¿Bloquear la cuenta de ${name}? Se cerrarán sus sesiones y se detendrá su Kali.`)) return;
    reason = window.prompt("Motivo del bloqueo (opcional):", "") || "";
  } else if (!confirm(`¿Desbloquear la cuenta de ${name}?`)) {
    return;
  }
  try {
    const response = await apiFetch(`${API}/api/admin/players/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, targetId: player.playerId, locked: lock, reason })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cambiar el estado de la cuenta.");
    toast(lock ? `Cuenta de ${name} bloqueada.` : `Cuenta de ${name} desbloqueada.`, "success");
    await loadAdminPlayers();
  } catch (error) {
    toast(error.message || "No se pudo cambiar el estado de la cuenta.", "error");
  }
}

// ---------------------------------------------------------------------------
// Grupos: un profesor arma los suyos y agrega estudiantes ya registrados,
// eligiéndolos de la lista de disponibles; el admin ve todos los grupos de
// todos los profesores. Dos stores separados (teacherGroupsState /
// adminGroupsState) porque son vistas y permisos distintos, aunque pegan a
// los mismos endpoints.
// ---------------------------------------------------------------------------
async function loadAdminGroups() {
  if (!app.user || app.user.role !== "admin") return;
  adminGroupsState.loading = true;
  adminGroupsState.error = "";
  render();
  try {
    const response = await apiFetch(`${API}/api/admin/groups?playerId=${encodeURIComponent(app.playerId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron cargar los grupos.");
    adminGroupsState.groups = data.groups || [];
  } catch (error) {
    adminGroupsState.error = error.message || "No se pudieron cargar los grupos.";
  } finally {
    adminGroupsState.loading = false;
    render();
  }
}

async function adminDeleteGroup(groupId, name) {
  if (!confirm(`¿Eliminar el grupo "${name}"? Esta acción no se puede deshacer.`)) return;
  try {
    const response = await apiFetch(`${API}/api/groups`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo eliminar el grupo.");
    adminGroupsState.groups = adminGroupsState.groups.filter(group => group.id !== groupId);
    toast(`Grupo "${name}" eliminado.`, "success");
    render();
  } catch (error) {
    toast(error.message || "No se pudo eliminar el grupo.", "error");
  }
}

async function loadTeacherGroups() {
  if (!app.user || app.user.role !== "profesor") return;
  teacherGroupsState.loading = true;
  teacherGroupsState.error = "";
  render();
  try {
    const response = await apiFetch(`${API}/api/groups/mine?playerId=${encodeURIComponent(app.playerId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron cargar tus grupos.");
    teacherGroupsState.groups = data.groups || [];
  } catch (error) {
    teacherGroupsState.error = error.message || "No se pudieron cargar tus grupos.";
  } finally {
    teacherGroupsState.loading = false;
    render();
  }
}

async function loadAvailableStudents() {
  if (!app.user || (app.user.role !== "profesor" && app.user.role !== "admin")) return;
  availableStudentsState.loading = true;
  availableStudentsState.error = "";
  render();
  try {
    const response = await apiFetch(`${API}/api/groups/available-students?playerId=${encodeURIComponent(app.playerId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar la lista de estudiantes.");
    availableStudentsState.students = data.students || [];
  } catch (error) {
    availableStudentsState.error = error.message || "No se pudo cargar la lista de estudiantes.";
  } finally {
    availableStudentsState.loading = false;
    render();
  }
}

async function createGroup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(new FormData(form).get("name") || "").trim();
  if (!name) return toast("Escribe un nombre para el grupo.", "warn");
  const submitButton = form.querySelector("button[type=submit]");
  if (submitButton) submitButton.disabled = true;
  try {
    const response = await apiFetch(`${API}/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, name })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo crear el grupo.");
    teacherGroupsState.groups.unshift(data.group);
    toast(`Grupo "${data.group.name}" creado.`, "success");
    render();
  } catch (error) {
    toast(error.message || "No se pudo crear el grupo.", "error");
    if (submitButton) submitButton.disabled = false;
  }
}

async function deleteGroup(groupId, name) {
  if (!confirm(`¿Eliminar el grupo "${name}"? Esta acción no se puede deshacer.`)) return;
  try {
    const response = await apiFetch(`${API}/api/groups`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo eliminar el grupo.");
    teacherGroupsState.groups = teacherGroupsState.groups.filter(group => group.id !== groupId);
    toast(`Grupo "${name}" eliminado.`, "success");
    render();
  } catch (error) {
    toast(error.message || "No se pudo eliminar el grupo.", "error");
  }
}

async function addGroupMember(event, groupId) {
  event.preventDefault();
  const form = event.currentTarget;
  const student = String(new FormData(form).get("student") || "").trim();
  if (!student) return toast("Selecciona un estudiante.", "warn");
  const submitButton = form.querySelector("button[type=submit]");
  if (submitButton) submitButton.disabled = true;
  try {
    const response = await apiFetch(`${API}/api/groups/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId, student })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo agregar al estudiante.");
    const index = teacherGroupsState.groups.findIndex(group => group.id === groupId);
    if (index >= 0) teacherGroupsState.groups[index] = data.group;
    toast("Estudiante agregado.", "success");
    render();
  } catch (error) {
    toast(error.message || "No se pudo agregar al estudiante.", "error");
    if (submitButton) submitButton.disabled = false;
  }
}

async function removeGroupMember(groupId, studentId, name) {
  if (!confirm(`¿Quitar a ${name} del grupo?`)) return;
  try {
    const response = await apiFetch(`${API}/api/groups/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId, studentId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo quitar al estudiante.");
    const index = teacherGroupsState.groups.findIndex(group => group.id === groupId);
    if (index >= 0) teacherGroupsState.groups[index] = data.group;
    render();
  } catch (error) {
    toast(error.message || "No se pudo quitar al estudiante.", "error");
  }
}

// Progreso detallado de un estudiante, visto desde una tarjeta de grupo
// (profesor dueño del grupo, o admin). El backend vuelve a comprobar que el
// que pide esto tenga derecho a ver a ese estudiante en particular.
async function viewStudentDetail(studentId) {
  // Recuerda de dónde venías (Mi Panel, Mis Grupos, Grupos del admin...) para
  // que "← Volver" regrese ahí en vez de siempre al mismo destino fijo.
  const returnTab = app.activeTab !== "estudiante" ? app.activeTab : (studentDetailState.returnTab || "grupos");
  studentDetailState = { loading: true, error: "", student: null, returnTab };
  app.activeTab = "estudiante";
  saveState();
  render();
  try {
    const response = await apiFetch(`${API}/api/groups/student?playerId=${encodeURIComponent(app.playerId)}&studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar el progreso del estudiante.");
    studentDetailState.student = data.student;
  } catch (error) {
    studentDetailState.error = error.message || "No se pudo cargar el progreso del estudiante.";
  } finally {
    studentDetailState.loading = false;
    render();
  }
}

function backFromStudentDetail() {
  switchTab(studentDetailState.returnTab || (app.user.role === "admin" ? "admin-groups" : "grupos"));
}

// ---------------------------------------------------------------------------
// Tareas por grupo: solo el profesor dueño las crea/marca/borra (el admin
// las ve en modo lectura al inspeccionar Grupos, igual que a los miembros).
// ---------------------------------------------------------------------------
function replaceTeacherGroup(group) {
  const index = teacherGroupsState.groups.findIndex(item => item.id === group.id);
  if (index >= 0) teacherGroupsState.groups[index] = group;
}

async function createGroupTask(event, groupId) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const challengeId = String(values.get("challengeId") || "");
  const challenge = challengeId ? app.challenges.find(item => item.id === challengeId) : null;
  // Si eligió un reto existente y no escribió título propio, usa el del reto.
  const title = String(values.get("title") || "").trim() || (challenge ? challenge.title : "");
  if (!title) return toast("Escribe un título o elige un reto existente.", "warn");
  const submitButton = form.querySelector("button[type=submit]");
  if (submitButton) submitButton.disabled = true;
  try {
    const response = await apiFetch(`${API}/api/groups/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId, title, description: String(values.get("description") || "").trim(), dueDate: String(values.get("dueDate") || ""), challengeId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo crear la tarea.");
    replaceTeacherGroup(data.group);
    toast("Tarea creada.", "success");
    render();
  } catch (error) {
    toast(error.message || "No se pudo crear la tarea.", "error");
    if (submitButton) submitButton.disabled = false;
  }
}

async function toggleGroupTask(groupId, taskId) {
  try {
    const response = await apiFetch(`${API}/api/groups/tasks/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId, taskId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo actualizar la tarea.");
    replaceTeacherGroup(data.group);
    render();
  } catch (error) {
    toast(error.message || "No se pudo actualizar la tarea.", "error");
  }
}

async function deleteGroupTask(groupId, taskId, title) {
  if (!confirm(`¿Eliminar la tarea "${title}"?`)) return;
  try {
    const response = await apiFetch(`${API}/api/groups/tasks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, groupId, taskId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo eliminar la tarea.");
    replaceTeacherGroup(data.group);
    render();
  } catch (error) {
    toast(error.message || "No se pudo eliminar la tarea.", "error");
  }
}

function toast(message, type = "info") {
  document.querySelector(".toast")?.remove();
  const node = div({ class: `toast ${type}` }, message);
  document.body.appendChild(node);
  // Guarda la referencia exacta en vez de volver a buscar ".toast": si aparece
  // un toast nuevo antes de que pasen los 3s, este timer no debe borrarlo.
  setTimeout(() => { if (node.isConnected) node.remove(); }, 3000);
}

// Detecta el rol a partir del dominio institucional mientras el usuario escribe
// (sin re-render completo, para no perder el foco del campo).
function detectRole(email) {
  const value = String(email || "").trim().toLowerCase();
  if (value.endsWith(EMAIL_SUFFIXES.estudiante)) return "estudiante";
  if (value.endsWith(EMAIL_SUFFIXES.profesor)) return "profesor";
  return null;
}

function updateRoleHint(input, hint) {
  const value = input.value.trim();
  if (!value.includes("@")) { hint.textContent = ""; hint.removeAttribute("data-role"); return; }
  const role = detectRole(value);
  if (role === "estudiante") { hint.textContent = "Detectado: cuenta de estudiante."; hint.setAttribute("data-role", "estudiante"); }
  else if (role === "profesor") { hint.textContent = "Detectado: cuenta de profesor."; hint.setAttribute("data-role", "profesor"); }
  else { hint.textContent = "Cuenta de estudiante (correo no institucional)."; hint.setAttribute("data-role", "estudiante"); }
}

function maskEmail(email) {
  const [user, domain] = String(email || "").split("@");
  if (!domain) return email || "";
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - visible.length))}@${domain}`;
}

function roleLabel(role) {
  return role === "admin" ? "Admin" : role === "profesor" ? "Profesor" : role === "estudiante" ? "Estudiante" : "";
}

async function authenticate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const payload = {
    name: String(values.get("name") || "").trim(),
    handle: String(values.get("user") || "").trim(),
    gender: String(values.get("gender") || ""),
    password: String(values.get("password") || ""),
    email: String(values.get("email") || "").trim()
  };
  if (authMode === "register" && !payload.name) return toast("Escribe tu nombre.", "warn");
  if (authMode === "register" && !payload.gender) return toast("Selecciona tu género.", "warn");
  if (authMode === "register" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return toast("Escribe un correo válido.", "warn");
  if (!payload.handle || payload.password.length < 4) return toast("Escribe un usuario y una contraseña de al menos 4 caracteres.", "warn");
  // El backend FastAPI exige 8 a 64 caracteres al registrarse (NIST SP 800-63B).
  if (authMode === "register" && (payload.password.length < 8 || payload.password.length > 64)) return toast("La contraseña debe tener entre 8 y 64 caracteres.", "warn");
  const submitButton = form.querySelector("button[type=submit]");
  if (submitButton) submitButton.disabled = true;
  try {
    if (authMode === "register") {
      const response = await apiFetch(API + "/api/players/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo iniciar el registro.");
      pendingAuth = { kind: "register", token: data.token, email: data.email, role: data.role };
      resendCooldownUntil = Date.now() + 30000;
      authMode = "verify";
      render();
      toast(data.dev
        ? `Modo desarrollo (sin SMTP): tu código es ${data.devCode}.`
        : `Te enviamos un código de verificación a ${data.email}.`, "info");
      return;
    }
    // El login también pasa por MFA: usuario y contraseña correctos, pero
    // falta el código antes de entrar de verdad.
    const response = await apiFetch(API + "/api/players/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
    // Admin: el backend responde con la sesión directa (sin código MFA).
    if (data.player) {
      pendingAuth = null;
      authMode = "login";
      setSessionToken(data.sessionToken);
      applyServerProfile(data.player);
      render();
      toast(`Hola de nuevo, ${data.player.name}.`, "success");
      hydratePlatform();
      return;
    }
    pendingAuth = { kind: "login", token: data.token, email: data.email, role: data.role };
    resendCooldownUntil = Date.now() + 30000;
    authMode = "verify";
    render();
    toast(data.dev
      ? `Modo desarrollo (sin SMTP): tu código es ${data.devCode}.`
      : `Te enviamos un código de verificación a ${data.email}.`, "info");
  } catch (error) {
    toast(error.message || "No se pudo contactar el backend local.", "error");
    if (submitButton) submitButton.disabled = false;
  }
}

function updateResendCountdown() {
  const node = document.querySelector("[data-resend-countdown]");
  if (!node) return;
  const remaining = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
  node.disabled = remaining > 0;
  node.textContent = remaining > 0 ? `Reenviar código (${remaining}s)` : "Reenviar código";
}

async function resendVerification() {
  if (!pendingAuth || Date.now() < resendCooldownUntil) return;
  const node = document.querySelector("[data-resend-countdown]");
  if (node) node.disabled = true;
  const endpoint = pendingAuth.kind === "login" ? "/api/players/login-resend" : "/api/players/resend";
  try {
    const response = await apiFetch(API + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pendingAuth.token })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo reenviar el código.");
    resendCooldownUntil = Date.now() + 30000;
    updateResendCountdown();
    toast(data.dev ? `Modo desarrollo (sin SMTP): tu nuevo código es ${data.devCode}.` : "Código reenviado a tu correo.", "info");
  } catch (error) {
    if (node) node.disabled = false;
    toast(error.message || "No se pudo reenviar el código.", "error");
  }
}

// No hace render() completo: el usuario podría estar a mitad de escribir el
// código, y un re-render de golpe le borraría lo que llevaba tecleado.
async function submitVerification(event) {
  event.preventDefault();
  if (!pendingAuth) return;
  const form = event.currentTarget;
  const code = String(new FormData(form).get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) return toast("Escribe el código de 6 dígitos que te enviamos.", "warn");
  const submitButton = form.querySelector("button[type=submit]");
  if (submitButton) submitButton.disabled = true;
  const wasLogin = pendingAuth.kind === "login";
  const endpoint = wasLogin ? "/api/players/login-verify" : "/api/players/verify";
  try {
    const response = await apiFetch(API + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pendingAuth.token, code })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Código incorrecto.");
    pendingAuth = null;
    authMode = "login";
    if (!wasLogin) { app.hints = {}; app.activeChallengeId = ""; app.activeTab = "dashboard"; }
    setSessionToken(data.sessionToken);
    applyServerProfile(data.player);
    toast(wasLogin ? `Hola de nuevo, ${data.player.name}.` : `Correo verificado. Bienvenido, ${data.player.name}.`, "success");
    hydratePlatform();
  } catch (error) {
    toast(error.message || "No se pudo verificar el código.", "error");
    if (submitButton) submitButton.disabled = false;
  }
}

function cancelVerification() {
  const wasLogin = pendingAuth?.kind === "login";
  pendingAuth = null;
  authMode = wasLogin ? "login" : "register";
  render();
}

function signOut() {
  const token = getSessionToken();
  if (token) fetch(API + "/api/players/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  endLocalSession();
  publicScreen = "landing";
  render();
}

// Limpia todo lo local de la sesión. El progreso ya vive en el backend, así
// que se recupera al volver a entrar.
function endLocalSession() {
  disconnectTerminal();
  clearSessionToken();
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(STORE_KEY);
  app = loadState();
  legacyLessonProgress = null;
}

function switchTab(tab) {
  if (app.activeTab === "terminal" && tab !== "terminal") disconnectTerminal();
  navOpen = false; // cualquier navegación cierra el menú hamburguesa si estaba abierto
  moreMenuOpen = false; // ...y el desplegable "Más" si estaba abierto
  app.activeTab = tab;
  saveState();
  render();
  if (tab === "admin") loadAdminPlayers();
  if (tab === "admin-groups") loadAdminGroups();
  if (tab === "grupos") loadTeacherGroups();
  if (tab === "ranking") loadRanking();
}

async function downloadFile(file, challenge) {
  try {
    const url = `${API}/api/challenges/${encodeURIComponent(challenge.id)}/files/${encodeURIComponent(file.name)}`;
    const response = await apiFetch(url);
    if (!response.ok) throw new Error("No se pudo obtener el artefacto.");
    const anchor = h("a", { href: URL.createObjectURL(await response.blob()), download: file.name }, []);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  } catch (error) {
    toast(error.message || "No se pudo descargar el archivo.", "error");
  }
}

function rememberHint(id, index) {
  app.hints[id] = app.hints[id] || [];
  if (!app.hints[id].includes(index)) app.hints[id].push(index);
  saveState();
}

// Con el backend FastAPI (20 oct) las pistas cerradas llegan vacías: el texto
// se pide al abrirla, y cada pista abierta antes de resolver resta puntos
// (`hintCost`). Sin `hintCost` (prototipo Node solo) se abre como antes, gratis.
async function unlockHint(id, index) {
  const challenge = app.challenges.find(item => item.id === id);
  if (!challenge || challenge.hintCost === undefined) {
    rememberHint(id, index);
    return render();
  }
  const cost = app.solved[id] ? 0 : challenge.hintCost;
  if (cost > 0 && !confirm(`Ver esta pista te resta ${cost} pts cuando resuelvas el reto. ¿La quieres ver?`)) return;
  try {
    const response = await apiFetch(`${API}/api/challenges/${encodeURIComponent(id)}/hints/${index}`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo abrir la pista.");
    challenge.hints[index] = data.hint;
    rememberHint(id, index);
    if (data.cost > 0) toast(`Pista abierta: −${data.cost} pts. Si lo resuelves ahora ganas ${data.pointsIfSolved} pts.`, "info");
    render();
  } catch (error) {
    toast(error.message || "No se pudo abrir la pista.", "error");
  }
}

function hintButtonLabel(challenge) {
  return challenge.hintCost && !app.solved[challenge.id] ? `Mostrar (−${challenge.hintCost} pts)` : "Mostrar";
}

function applySubmissionResult(challenge, data, source, shouldRender = true) {
  app.attempts[challenge.id] = (app.attempts[challenge.id] || 0) + 1;
  app.submissions.unshift({ id: challenge.id, title: challenge.title, ok: data.ok, time: Date.now(), source });
  if (data.ok && !app.solved[challenge.id]) {
    // `data.points` ya trae el descuento por pistas (backend FastAPI).
    app.solved[challenge.id] = { time: Date.now(), points: typeof data.points === "number" ? data.points : challenge.points };
    if (data.nextChallenge) upsertChallenge(data.nextChallenge);
    toast(data.nextChallenge ? "Reto resuelto. El motor creó un nuevo laboratorio para tu cola." : "Reto resuelto. Tu progreso fue actualizado.", "success");
  } else if (data.ok) {
    toast("Este reto ya está marcado como resuelto.", "info");
  } else {
    toast(data.error || "Flag incorrecta. Revisa el artefacto y las pistas.", "error");
  }
  saveState();
  if (shouldRender) render();
}

async function submitFlag(challenge, input) {
  const flag = input.value.trim();
  if (!flag) return toast("Escribe una flag antes de enviarla.", "warn");
  input.disabled = true;
  try {
    const response = await apiFetch(API + "/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, challengeId: challenge.id, flag })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo validar la flag.");
    input.value = "";
    applySubmissionResult(challenge, data, "web");
  } catch (error) {
    toast(error.message || "No se pudo validar la flag.", "error");
    input.disabled = false;
  }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function showBuildProgress(build) {
  const mount = document.getElementById("kali-terminal");
  if (!mount) return;
  let pre = mount.querySelector(".build-log");
  if (!pre) { mount.innerHTML = ""; pre = h("pre", { class: "build-log" }, []); mount.appendChild(pre); }
  const minutes = Math.floor((build?.elapsedSeconds || 0) / 60);
  const seconds = String((build?.elapsedSeconds || 0) % 60).padStart(2, "0");
  pre.textContent = [`[WISPR] Construyendo la imagen Kali (${build?.name || "kali"}) · ${minutes}:${seconds} transcurridos`, "[WISPR] Solo ocurre la primera vez. Puedes dejar esta pestaña abierta; la terminal se conectará sola.", "", ...(build?.log || [])].join("\n");
  pre.scrollTop = pre.scrollHeight;
}

// Activa el reto. Si el servidor está construyendo la imagen Kali (HTTP 202),
// espera mostrando el log de docker build hasta que termine.
async function activateChallenge(challenge, epoch) {
  for (;;) {
    const response = await apiFetch(API + "/api/challenges/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, challengeId: challenge.id })
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      app.activeChallengeId = challenge.id;
      saveState();
      return data;
    }
    if (response.status !== 202 || !data.building) throw new Error(data.error || "No se pudo preparar el laboratorio.");
    setTerminalStatus("Construyendo imagen Kali…", "starting");
    showBuildProgress(data.build);
    await sleep(4000);
    if (epoch !== terminalEpoch) throw new Error("Conexión cancelada.");
  }
}

async function runDiagnostic() {
  app.terminal.diagnostic = "Ejecutando diagnóstico…";
  render();
  try {
    const response = await apiFetch(`${API}/api/kali/diagnose?playerId=${encodeURIComponent(app.playerId)}`, { cache: "no-store" });
    app.terminal.diagnostic = await response.text();
  } catch (error) {
    app.terminal.diagnostic = `No se pudo contactar el backend local: ${error.message}`;
  }
  render();
}

async function openTerminalForChallenge(challenge) {
  try {
    disconnectTerminal();
    app.selectedId = challenge.id;
    app.activeTab = "terminal";
    saveState();
    render();
    setTimeout(connectTerminal, 0);
  } catch (error) {
    toast(error.message || "No se pudo preparar Kali.", "error");
  }
}

function setTerminalStatus(text, state = "offline") {
  const node = document.querySelector("[data-terminal-status]");
  if (node) { node.textContent = text; node.className = `terminal-state ${state}`; }
}

function writeTerminal(text) {
  if (terminalClient?.term) terminalClient.term.writeln(text);
}

function sendTerminalCommand(command) {
  if (!terminalClient || terminalClient.socket.readyState !== WebSocket.OPEN) {
    pendingTerminalCommand = command;
    toast("Preparando Kali y ejecutando el atajo…", "info");
    connectTerminal();
    return;
  }
  terminalClient.socket.send(JSON.stringify({ type: "input", data: `${command}\r` }));
  terminalClient.term.focus();
}

// El servidor empuja por WebSocket cada `ctf submit` validado; `ctf` ya imprime el
// veredicto en la shell, así que aquí solo se actualiza progreso, score y catálogo.
function handleTerminalSubmission(result) {
  const challenge = app.challenges.find(item => item.id === result.challengeId);
  if (!challenge) return;
  applySubmissionResult(challenge, result, "terminal", false);
  const header = document.querySelector(".account-chip span");
  if (header) { const current = stats(); header.textContent = `${current.score} pts · ${current.solves} solves`; }
}

async function connectTerminal() {
  const mount = document.getElementById("kali-terminal");
  if (!mount || terminalClient || app.terminal.starting) return;
  if (!window.Terminal || !window.FitAddon) return toast("Faltan dependencias de terminal. Ejecuta npm install.", "error");
  const current = selectedChallenge();
  if (!current) return toast("Primero carga un reto del catálogo.", "warn");
  const epoch = ++terminalEpoch;
  app.terminal.starting = true;
  app.terminal.lastError = "";
  setTerminalStatus(app.activeChallengeId === current.id ? "Iniciando Kali aislada…" : "Montando reto en el laboratorio…", "starting");
  try {
    await activateChallenge(current, epoch);
    if (epoch !== terminalEpoch) return;
    setTerminalStatus("Arrancando contenedor Kali…", "starting");
    mount.innerHTML = "";
    const response = await apiFetch(API + "/api/kali/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId: app.playerId }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Kali no pudo iniciarse.");
    if (epoch !== terminalEpoch) return;
    const term = new window.Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "JetBrains Mono, Consolas, monospace",
      fontSize: 14,
      theme: { background: "#07110e", foreground: "#d7e5df", cursor: "#65f5b8", selectionBackground: "#285144" },
      scrollback: 6000
    });
    const fit = new window.FitAddon.FitAddon();
    term.loadAddon(fit); term.open(mount); fit.fit();
    term.writeln("\x1b[36m[WISPR] Abriendo shell en el contenedor…\x1b[0m");
    const backend = new URL(API || location.origin, location.href);
    const scheme = backend.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${scheme}://${backend.host}/ws/terminal?token=${encodeURIComponent(getSessionToken())}`);
    let lastCols = 0; let lastRows = 0; let frame = null;
    // Ajusta el grid al tamaño real y avisa al PTY para que COLUMNS/LINES dentro
    // de Kali coincidan con lo visible. `force` reenvía aunque xterm no detecte
    // cambio de columnas: JetBrains Mono se carga como fuente web con display=swap,
    // y si el primer fit() midió el ancho de celda con la fuente de respaldo (más
    // angosta) habría calculado columnas de más, cortando/partiendo la salida de
    // bash `help`, `ctf show`, etc. Cargar la fuente no dispara el ResizeObserver,
    // así que forzamos un re-ajuste cuando la fuente monoespaciada está lista.
    const applyFit = (force = false) => {
      try {
        fit.fit();
        // Margen de seguridad: la barra de scroll de xterm se dibuja sobre la
        // última celda. Sin reservar un par de columnas, la salida cruda (cat,
        // ls, README) se envuelve justo pasado el borde y queda cortada contra
        // la barra. Reducimos las columnas 2 para que SIEMPRE quepa con aire.
        // fit.fit() recalcula desde cero cada vez, así que el recorte no se
        // acumula (siempre queda en "ancho real − 2").
        const SAFE_COLS = 2;
        if (term.cols > 24 + SAFE_COLS) term.resize(term.cols - SAFE_COLS, term.rows);
        if (!force && term.cols === lastCols && term.rows === lastRows) return;
        lastCols = term.cols; lastRows = term.rows;
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      } catch {}
    };
    const resize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = null; applyFit(false); });
    };
    const refitOnFont = () => applyFit(true);
    if (document.fonts) {
      document.fonts.ready.then(refitOnFont).catch(() => {});
      try { document.fonts.load('14px "JetBrains Mono"').then(refitOnFont).catch(() => {}); } catch {}
    }
    setTimeout(refitOnFont, 150);
    setTimeout(refitOnFont, 600);
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    terminalClient = { term, socket, observer, poller: null, cancelResize: () => frame && cancelAnimationFrame(frame) };
    term.onData(data => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", data })); });
    socket.onopen = () => {
      app.terminal.connected = true; app.terminal.starting = false;
      setTerminalStatus("Kali aislada · online", "online"); applyFit(true); term.focus();
      if (pendingTerminalCommand) {
        socket.send(JSON.stringify({ type: "input", data: `${pendingTerminalCommand}\r` }));
        pendingTerminalCommand = "";
      }
    };
    let terminalError = "";
    socket.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === "output") term.write(message.data);
      if (message.type === "ready") term.writeln(`\x1b[36m${message.message}\x1b[0m`);
      if (message.type === "submission" && message.result) handleTerminalSubmission(message.result);
      if (message.type === "exit") term.writeln(`\r\n\x1b[33m[WISPR] La shell terminó (código ${message.exitCode}).\x1b[0m`);
      if (message.type === "error") {
        terminalError = message.error || "No se pudo abrir la terminal.";
        term.writeln(`\r\n\x1b[31m[WISPR] ${terminalError}\x1b[0m`);
        toast(terminalError, "error");
      }
    };
    let opened = false;
    socket.onopen = ((original) => () => { opened = true; original(); })(socket.onopen);
    socket.onclose = event => {
      if (terminalClient?.socket !== socket) return;
      terminalClient.poller && clearInterval(terminalClient.poller);
      terminalClient.cancelResize(); observer.disconnect(); term.dispose(); terminalClient = null;
      app.terminal.connected = false; app.terminal.starting = false;
      if (!opened && !terminalError) terminalError = `El servidor rechazó el WebSocket (código ${event.code}). Revisa la consola de start-wispr-kali.bat o pulsa Diagnosticar.`;
      if (terminalError) { app.terminal.lastError = terminalError; render(); }
      setTerminalStatus(terminalError || "Terminal desconectada", "offline");
    };
    socket.onerror = () => { terminalError = terminalError || "No se pudo abrir el WebSocket de la terminal"; setTerminalStatus(terminalError, "offline"); };
  } catch (error) {
    if (epoch !== terminalEpoch) return;
    app.terminal.starting = false; app.terminal.connected = false;
    app.terminal.lastError = error.message || "Kali no está disponible";
    setTerminalStatus("Error al preparar Kali", "offline");
    toast("No se pudo iniciar Kali. El detalle quedó en el panel de la terminal.", "error");
    render();
  }
}

function disconnectTerminal() {
  terminalEpoch += 1;
  pendingTerminalCommand = "";
  if (!terminalClient) {
    app.terminal.connected = false;
    app.terminal.starting = false;
    return;
  }
  const client = terminalClient; terminalClient = null;
  client.poller && clearInterval(client.poller);
  client.cancelResize?.(); client.observer?.disconnect();
  try { client.socket.close(); } catch {}
  try { client.term.dispose(); } catch {}
  app.terminal.connected = false; app.terminal.starting = false;
}

async function stopKali() {
  disconnectTerminal();
  try {
    const response = await apiFetch(API + "/api/kali/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId: app.playerId }) });
    const data = await response.json();
    toast(data.ok ? data.output : (data.error || "No se pudo detener Kali."), data.ok ? "info" : "error");
  } catch { toast("No se pudo contactar el backend local.", "error"); }
  render();
}

// ---------------------------------------------------------------------------
// Landing pública: lo primero que ve cualquier visitante sin sesión. A propósito
// tiene su propio concepto visual (fondo "aura" animado, tipografía grande,
// tarjetas de vidrio) muy distinto del panel/consola del resto de la app — para
// que entrar de verdad a la plataforma (login/registro → dashboard) se sienta
// como un salto real, no una continuación de la misma pantalla.
// ---------------------------------------------------------------------------
const landingStatsData = [
  { value: "6", label: "Módulos de teoría" },
  { value: "100%", label: "Aislado en Docker" },
  { value: "∞", label: "Retos generados dinámicamente" },
  { value: "3", label: "Roles: estudiante, profesor, admin" }
];

const landingServices = [
  { title: "Laboratorio Kali aislado", detail: "Una terminal Kali Linux real por estudiante, en su propio contenedor Docker y su propia red interna — nunca se comparte con otros jugadores." },
  { title: "Retos generados dinámicamente", detail: "Cada solve desbloquea un reto nuevo con una instancia y una flag únicas para ese jugador, generadas por el motor de contenido." },
  { title: "Teoría interactiva", detail: "Seis módulos de fundamentos Wi-Fi y Bluetooth, con lecciones Aprender → Practicar → Comprobar." },
  { title: "Grupos para profesores", detail: "Cada profesor arma sus propias clases y agrega estudiantes para seguir su progreso de cerca." },
  { title: "Panel de administración", detail: "Gestión completa de cuentas, ranking real de la plataforma y supervisión de todos los grupos." },
  { title: "Ranking y progreso", detail: "Puntaje, solves y racha visibles en todo momento, dentro de un rango pensado para competir sanamente." }
];

const landingBenefits = [
  { title: "Aprender haciendo, sin riesgo", detail: "Todo ocurre sobre evidencia sintética y contenedores aislados — nunca contra redes o dispositivos reales." },
  { title: "Currículum progresivo", detail: "De los fundamentos del 802.11 a ataques como Evil Twin, PMKID, WPS o WPA3, en orden creciente de dificultad." },
  { title: "Pensado para el aula", detail: "Roles de estudiante, profesor y administrador, con seguimiento por grupo y por institución." },
  { title: "Contenido que no se repite", detail: "El motor de retos genera variantes nuevas en cada avance, así que no hay dos recorridos idénticos." }
];

const landingTeamMembers = [
  { name: "Sebastian Ureña", role: "Líder de proyecto y coordinador de seguridad", slug: "sebastian-urena" },
  { name: "Jathniel Navarrete", role: "Analista de riesgos y políticas de seguridad", slug: "jathniel-navarrete" },
  { name: "Alonso López", role: "Especialista en infraestructura, redes y sistemas", slug: "alonso-lopez" },
  { name: "Yurán Mora", role: "Desarrollador o integrador de soluciones", slug: "yuran-mora" },
  { name: "Ester Espinoza", role: "Auditor, tester y documentador técnico", slug: "ester-espinoza" }
];

// ---------------------------------------------------------------------------
// "Voces del CTF" (Soft Skills + Valor de proyecto Don Bosco): entrevistas en
// video a integrantes del Equipo Nacional Tropical Hunters.
// Cada video se activa solo: basta con soltar img/historias/<slug>.mp4 (y,
// opcional, una portada img/historias/<slug>.jpg). Mientras el archivo no
// exista, la tarjeta se muestra sin botón de reproducción ni etiqueta. Para
// cambiar nombres o frases, edita solo este arreglo.
// ---------------------------------------------------------------------------
const ctfStories = [
  { slug: "historia-1", name: "Rodrigo Alvarado", role: "Capitán · Equipo Nacional Tropical Hunters", tag: "Capitán", tagline: "Desde la capitanía del equipo nacional, cuenta qué significa representar a Costa Rica en competencias internacionales y cómo el CTF ha impulsado su carrera profesional." },
  { slug: "historia-2", name: "Juan Carlos Sequeira", role: "Integrante · Equipo Nacional Tropical Hunters", tag: "Integrante", tagline: "Comparte el valor que competir en CTF le ha aportado para conseguir y crecer en su trabajo, y lo que vive al defender los colores del país." },
  { slug: "historia-3", name: "Caleb Espinoza", role: "Integrante · Equipo Nacional Tropical Hunters", tag: "Integrante", tagline: "Habla de las habilidades que ha desarrollado compitiendo y de cómo se traducen en su día a día laboral." }
];

// Las tres preguntas que respondió cada integrante en su entrevista.
const ctfStoryQuestions = [
  "¿Cómo es representar a Costa Rica en competencias internacionales?",
  "¿Qué valor ha aportado competir en CTF para conseguir o mejorar en sus trabajos?",
  "¿Qué skills ha desarrollado compitiendo que le hayan servido en su trabajo?"
];

// Disponibilidad detectada en esta sesión (slug → { ready, duration }).
// Vive fuera de app para no persistirse: si el video se agrega después, al
// recargar la página se detecta solo.
const storyStatus = {};

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// La tarjeta se actualiza escribiendo el DOM directamente (como la barra del
// video de las lecciones): la detección llega de forma asíncrona y no debe
// forzar un render() completo de la página.
function markStoryReady(card, story, duration) {
  storyStatus[story.slug] = { ready: true, duration };
  card.classList.add("ready");
  card.classList.remove("pending");
  card.disabled = false;
  card.setAttribute("aria-label", `Ver la historia de ${story.name}`);
  const status = card.querySelector(".story-status");
  if (status) status.textContent = `▶ Ver historia${duration ? ` · ${formatDuration(duration)}` : ""}`;
}

function storyCard(story, index) {
  const known = storyStatus[story.slug];
  const fallback = div({ class: "story-art", "aria-hidden": "true" }, [span({ class: "story-art-initials" }, initials(story.name))]);
  const poster = h("img", {
    class: "story-poster",
    src: `./img/historias/${story.slug}.jpg`,
    alt: "",
    loading: "lazy",
    onerror: event => { event.target.remove(); }
  }, []);
  const card = button({
    class: `story-card ${known?.ready ? "ready" : "pending"}`,
    type: "button",
    disabled: !known?.ready,
    "aria-label": known?.ready ? `Ver la historia de ${story.name}` : `Historia de ${story.name}`,
    onclick: () => { if (storyStatus[story.slug]?.ready) openStoryPlayer(story); }
  }, [
    div({ class: "story-media" }, [
      fallback,
      poster,
      span({ class: "story-scan", "aria-hidden": "true" }, ""),
      span({ class: "story-play", "aria-hidden": "true" }, "▶"),
      span({ class: "story-index" }, `HISTORIA ${String(index + 1).padStart(2, "0")}`),
      span({ class: "story-tag" }, story.tag)
    ]),
    div({ class: "story-body" }, [
      h("strong", { class: "story-name" }, story.name),
      h("span", { class: "story-role" }, story.role),
      h("p", { class: "story-tagline" }, story.tagline),
      span({ class: "story-status" }, known?.ready ? `▶ Ver historia${known.duration ? ` · ${formatDuration(known.duration)}` : ""}` : "")
    ])
  ]);
  // Sonda invisible: solo pide los metadatos. Si el archivo existe, la tarjeta
  // pasa a "lista"; si no (404), se queda como está.
  if (!known) {
    const probe = h("video", {
      class: "story-probe",
      src: `./img/historias/${story.slug}.mp4`,
      preload: "metadata",
      muted: true,
      "aria-hidden": "true",
      onloadedmetadata: event => { markStoryReady(card, story, event.target.duration); event.target.remove(); },
      onerror: event => { storyStatus[story.slug] = { ready: false }; event.target.remove(); }
    }, []);
    card.querySelector(".story-media").appendChild(probe);
  }
  return card;
}

function ctfStoriesSection(variant = "landing") {
  return h("section", { id: "historias", class: `stories-section stories-${variant} ${variant === "landing" ? "landing-section" : ""}` }, [
    div({ class: "stories-head" }, [
      div({}, [
        h("p", { class: "eyebrow" }, "soft skills + valor de proyecto don bosco"),
        h("h2", {}, ["Voces del ", span({ class: "text-gradient" }, "CTF")]),
        h("p", { class: "stories-lead" }, "Tres integrantes del Equipo Nacional Tropical Hunters cuentan qué significa representar a Costa Rica y qué les ha dejado competir en CTF para su vida profesional.")
      ]),
      span({ class: "stories-live" }, [span({ class: "stories-live-dot", "aria-hidden": "true" }, ""), "EQUIPO NACIONAL · TROPICAL HUNTERS"])
    ]),
    div({ class: "stories-questions" }, [
      span({ class: "stories-questions-label" }, "Las preguntas"),
      h("ol", {}, ctfStoryQuestions.map(question => h("li", {}, question)))
    ]),
    div({ class: "stories-grid" }, ctfStories.map(storyCard))
  ]);
}

// Reproductor a pantalla completa. Vive fuera de #root (como el botón de
// tema) para que un render() de la app no lo destruya mientras se reproduce.
function openStoryPlayer(story) {
  closeStoryPlayer();
  const onKey = event => { if (event.key === "Escape") closeStoryPlayer(); };
  const overlay = div({ id: "story-player", class: "story-overlay", role: "dialog", "aria-modal": "true", "aria-label": `Historia de ${story.name}`, onclick: event => { if (event.target === overlay) closeStoryPlayer(); } }, [
    div({ class: "story-player" }, [
      div({ class: "story-player-head" }, [
        div({}, [span({ class: "story-index" }, story.tag), h("strong", {}, story.name)]),
        button({ class: "ghost-action compact", type: "button", onclick: closeStoryPlayer, "aria-label": "Cerrar video" }, "✕ Cerrar")
      ]),
      h("video", { class: "story-video", src: `./img/historias/${story.slug}.mp4`, controls: true, autoplay: true, playsinline: true }, []),
      h("span", { class: "story-role" }, story.role),
      h("p", { class: "story-tagline" }, story.tagline)
    ])
  ]);
  document.addEventListener("keydown", onKey);
  overlay._onKey = onKey;
  document.body.appendChild(overlay);
  document.body.classList.add("story-open");
  overlay.querySelector("button").focus();
}

function closeStoryPlayer() {
  const overlay = document.getElementById("story-player");
  if (!overlay) return;
  const video = overlay.querySelector("video");
  if (video) video.pause();
  document.removeEventListener("keydown", overlay._onKey);
  overlay.remove();
  document.body.classList.remove("story-open");
}

function initials(name) {
  return String(name || "").trim().split(/\s+/).map(word => word[0]).slice(0, 2).join("").toUpperCase();
}

// El fondo "aura" vive dentro del propio árbol de landingView() (no en index.html)
// para no tocar nada fuera de #root; render() solo marca <body> para apagar el
// video de fondo del resto de la app mientras esta pantalla está activa.
function landingBackdrop() {
  return div({ class: "landing-backdrop", "aria-hidden": "true" }, [
    div({ class: "aura aura-a" }, []),
    div({ class: "aura aura-b" }, []),
    div({ class: "aura aura-c" }, [])
  ]);
}

function publicHeader() {
  return h("header", { class: "public-topbar" }, [
    div({ class: "public-topbar-inner" }, [
      div({ class: "brand" }, [brandLogo()]),
      h("nav", { class: "public-nav", "aria-label": "Navegación de la página de inicio" }, [
        h("a", { href: "#plataforma" }, "Plataforma"),
        h("a", { href: "#servicios" }, "Servicios"),
        h("a", { href: "#beneficios" }, "Beneficios"),
        h("a", { href: "#historias" }, "Historias"),
        h("a", { href: "#equipo" }, "Equipo")
      ]),
      div({ class: "public-actions" }, [
        button({ class: "ghost-action", type: "button", onclick: () => goToAuth("login") }, "Iniciar sesión"),
        button({ class: "primary-action", type: "button", onclick: () => goToAuth("register") }, "Crear cuenta")
      ])
    ])
  ]);
}

function landingHero() {
  return h("section", { class: "landing-hero" }, [
    h("img", { src: "./img/mascot.png", alt: "Mascota WISPR, un alienígena con patineta", class: "hero-mascot", loading: "lazy" }, []),
    div({ class: "hero-copy" }, [
      span({ class: "ctf-pill hero-kicker" }, "WIRELESS SECURITY RANGE"),
      h("h1", {}, ["Entrena como un ", span({ class: "text-gradient" }, "operador"), " de seguridad inalámbrica."]),
      h("p", { class: "hero-lead" }, "Retos generados dinámicamente, una Kali Linux aislada por estudiante y un currículum teórico-práctico — todo dentro de un rango pensado para aulas de ciberseguridad."),
      div({ class: "hero-actions" }, [
        button({ class: "primary-action", type: "button", onclick: () => goToAuth("register") }, "Crear cuenta gratis"),
        button({ class: "ghost-action", type: "button", onclick: () => goToAuth("login") }, "Ya tengo cuenta")
      ]),
      div({ class: "hero-scroll-cue" }, [span({}, "Descubre la plataforma"), span({ class: "hero-scroll-arrow", "aria-hidden": "true" }, "↓")])
    ])
  ]);
}

function landingStat(stat) {
  return div({ class: "landing-stat" }, [h("strong", {}, stat.value), span({}, stat.label)]);
}

function landingAbout() {
  return h("section", { id: "plataforma", class: "landing-section" }, [
    h("p", { class: "eyebrow" }, "la plataforma"),
    h("h2", {}, "¿Qué es WISPR?"),
    h("p", { class: "landing-acronym" }, "Wireless Intelligence for Security, Practice and Response"),
    h("p", { class: "landing-statement" }, "WISPR es un rango de prácticas de ciberseguridad inalámbrica pensado para institutos y academias. Cada estudiante resuelve retos sobre evidencia sintética — capturas, handshakes, tráfico — usando una terminal Kali Linux real, aislada en su propio contenedor Docker, sin tocar jamás redes ni dispositivos ajenos."),
    h("p", { class: "landing-substatement" }, "Profesores y administradores tienen sus propias herramientas: grupos por clase, ranking general y gestión completa de cuentas, para seguir el aprendizaje de cerca dentro del aula.")
  ]);
}

function landingServiceCard(service, index) {
  const number = String(index + 1).padStart(2, "0");
  // Hover en desktop, tap en móvil (.is-flipped): el frente solo trae el
  // número y el título, el reverso agrega la descripción completa.
  return div({ class: "flip-card", onclick: event => event.currentTarget.classList.toggle("is-flipped") }, [
    div({ class: "flip-card-inner" }, [
      div({ class: "flip-card-front" }, [span({ class: "bento-index" }, number), h("h3", {}, service.title)]),
      div({ class: "flip-card-back" }, [span({ class: "bento-index" }, number), h("h3", {}, service.title), h("p", {}, service.detail)])
    ])
  ]);
}

function landingServicesSection() {
  return h("section", { id: "servicios", class: "landing-section" }, [
    h("p", { class: "eyebrow" }, "lo que incluye"),
    h("h2", {}, "Servicios"),
    div({ class: "service-grid" }, landingServices.map(landingServiceCard))
  ]);
}

function landingBenefitRow(benefit) {
  return div({ class: "benefit-row" }, [span({ class: "benefit-check", "aria-hidden": "true" }, "✓"), div({}, [h("h3", {}, benefit.title), h("p", {}, benefit.detail)])]);
}

function landingBenefitsSection() {
  return h("section", { id: "beneficios", class: "landing-section" }, [
    h("p", { class: "eyebrow" }, "por qué wispr"),
    h("h2", {}, "Beneficios"),
    div({ class: "benefit-list" }, landingBenefits.map(landingBenefitRow))
  ]);
}

// Foto editable: si existe img/team/<slug>.jpg se muestra; si no, cae a un
// círculo con las iniciales. Solo hace falta soltar el archivo con ese nombre.
function landingTeamCard(member) {
  const fallback = div({ class: "team-photo-fallback" }, [span({}, initials(member.name))]);
  const photo = h("img", {
    src: `./img/team/${member.slug}.jpg`,
    alt: member.name,
    loading: "lazy",
    onerror: event => { event.target.style.display = "none"; fallback.style.display = "flex"; }
  }, []);
  return div({ class: "team-card" }, [
    div({ class: "team-photo-ring" }, [div({ class: "team-photo" }, [photo, fallback])]),
    h("strong", {}, member.name),
    h("p", { class: "team-role" }, member.role)
  ]);
}

function landingTeamSection() {
  return h("section", { id: "equipo", class: "landing-section" }, [
    h("p", { class: "eyebrow" }, "quién está detrás"),
    h("h2", {}, "Equipo"),
    div({ class: "team-grid" }, landingTeamMembers.map(landingTeamCard))
  ]);
}

function landingFooter() {
  return h("footer", { class: "landing-footer" }, [
    div({ class: "footer-top" }, [
      div({ class: "footer-brand" }, [brandLogo(), h("p", {}, "Wireless Intelligence for Security, Practice and Response. Entrenamiento ofensivo Wi-Fi/Bluetooth para aulas de ciberseguridad.")]),
      div({ class: "footer-links" }, [h("p", { class: "eyebrow" }, "plataforma"), h("a", { href: "#servicios" }, "Servicios"), h("a", { href: "#beneficios" }, "Beneficios"), h("a", { href: "#historias" }, "Historias"), h("a", { href: "#equipo" }, "Equipo")]),
      div({ class: "footer-cta" }, [h("p", { class: "eyebrow" }, "acceso"), button({ class: "ghost-action compact", type: "button", onclick: () => goToAuth("login") }, "Iniciar sesión"), button({ class: "primary-action compact", type: "button", onclick: () => goToAuth("register") }, "Crear cuenta")])
    ]),
    div({ class: "footer-bottom" }, [span({}, "© 2026 WISPR — Wireless Intelligence for Security, Practice and Response")])
  ]);
}

function landingView() {
  return div({ class: "landing-page" }, [
    landingBackdrop(),
    publicHeader(),
    landingHero(),
    div({ class: "landing-stats" }, landingStatsData.map(landingStat)),
    landingAbout(),
    landingServicesSection(),
    landingBenefitsSection(),
    ctfStoriesSection("landing"),
    landingTeamSection(),
    landingFooter()
  ]);
}

function loginView() {
  if (authMode === "verify" && pendingAuth) return verifyView();
  let password;
  let emailInput;
  let roleHint;
  const registering = authMode === "register";
  return div({ class: "login-shell login-single" }, [
    div({ class: "login-panel auth-card" }, [
      button({ class: "ghost-action back-action", type: "button", onclick: backToLanding }, "← Inicio"),
      div({ class: "brand-block login-brand" }, [brandLogo("brand-logo-lg"), div({}, [span({ class: "ctf-pill" }, "WIRELESS CTF"), h("p", { class: "muted" }, "Professional wireless-security learning range")])]),
      div({ class: "auth-tabs", role: "tablist" }, [
        button({ class: registering ? "" : "auth-tab-active", type: "button", onclick: () => { authMode = "login"; render(); } }, "Iniciar sesión"),
        button({ class: registering ? "auth-tab-active" : "", type: "button", onclick: () => { authMode = "register"; render(); } }, "Registrarse")
      ]),
      h("form", { class: "login-form", onsubmit: authenticate }, [
        registering ? h("label", {}, ["Nombre", div({ class: "field-shell" }, [span({ class: "field-icon" }, "»"), h("input", { name: "name", placeholder: "Ester Rojas", autocomplete: "name", maxlength: "48" }, [])])]) : null,
        registering ? h("label", {}, [
          "Correo",
          div({ class: "field-shell" }, [
            span({ class: "field-icon" }, "✉"),
            emailInput = h("input", { name: "email", type: "email", placeholder: "tu.correo@ejemplo.com", autocomplete: "email", oninput: () => updateRoleHint(emailInput, roleHint) }, [])
          ]),
          roleHint = h("p", { class: "role-hint muted tight" }, "")
        ]) : null,
        h("label", {}, ["Usuario u operador", div({ class: "field-shell" }, [span({ class: "field-icon" }, "@"), h("input", { name: "user", placeholder: "ester", autocomplete: "username" }, [])])]),
        registering ? h("label", {}, ["Género", h("select", { name: "gender" }, [h("option", { value: "" }, "Selecciona…"), h("option", { value: "femenino" }, "Femenino"), h("option", { value: "masculino" }, "Masculino"), h("option", { value: "otro" }, "Otro / prefiero no decirlo")])]) : null,
        h("label", {}, ["Contraseña de acceso", div({ class: "field-shell" }, [span({ class: "field-icon" }, "#"), password = h("input", { name: "password", type: "password", placeholder: "••••••••", autocomplete: registering ? "new-password" : "current-password" }, []), button({ class: "field-toggle", type: "button", onclick: () => { password.type = password.type === "password" ? "text" : "password"; } }, "ver")])]),
        button({ class: "primary-action login-action", type: "submit" }, "Enviar código de verificación")
      ]),
      h("p", { class: "auth-note" }, registering ? "Con un correo institucional se detecta si eres estudiante o profesor; cualquier otro correo entra como estudiante. Te enviamos un código de verificación." : "Cada inicio de sesión pide un código de verificación enviado a tu correo (MFA).")
    ])
  ]);
}

function verifyView() {
  const remaining = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
  const isLogin = pendingAuth.kind === "login";
  return div({ class: "login-shell login-single" }, [
    div({ class: "login-panel auth-card" }, [
      div({ class: "brand-block login-brand" }, [brandLogo("brand-logo-lg"), div({}, [span({ class: "ctf-pill" }, "WIRELESS CTF"), h("p", { class: "muted" }, isLogin ? "Verificación en dos pasos" : "Verificación de correo institucional")])]),
      div({ class: "verify-banner" }, [
        span({ class: "role-badge" }, roleLabel(pendingAuth.role)),
        h("p", {}, ["Enviamos un código de 6 dígitos a ", h("strong", {}, maskEmail(pendingAuth.email)), "."])
      ]),
      h("form", { class: "login-form", onsubmit: submitVerification }, [
        h("label", {}, ["Código de verificación", div({ class: "field-shell" }, [span({ class: "field-icon" }, "#"), h("input", { name: "code", inputmode: "numeric", pattern: "[0-9]{6}", maxlength: "6", placeholder: "000000", autocomplete: "one-time-code", autofocus: true }, [])])]),
        button({ class: "primary-action login-action", type: "submit" }, "Verificar y entrar")
      ]),
      div({ class: "verify-actions" }, [
        button({ class: "ghost-action", type: "button", "data-resend-countdown": "", disabled: remaining > 0, onclick: resendVerification }, remaining > 0 ? `Reenviar código (${remaining}s)` : "Reenviar código"),
        button({ class: "ghost-action", type: "button", onclick: cancelVerification }, isLogin ? "Usar otra cuenta" : "Usar otro correo")
      ]),
      h("p", { class: "auth-note" }, "El código vence en 10 minutos. Revisa también la carpeta de spam.")
    ])
  ]);
}

// Tabs que en realidad son "sub-vistas" de un ítem del menú, para que ese
// ítem se marque activo aunque su id exacto no esté en la barra.
const navGroups = { reto: "retos", lesson: "teoria", estudiante: "grupos" };
function navGroupFor(tab) { return navGroups[tab] || tab; }

function header() {
  const isAdmin = app.user.role === "admin";
  const isProfesor = app.user.role === "profesor";
  const current = stats();
  // Ni el admin ni el profesor son jugadores: no ven Dashboard, Terminal,
  // Teoría, Retos, Progreso ni Ranking — cada uno navega solo entre sus
  // propias pestañas de gestión.
  const primaryItems = isAdmin
    ? [["admin-home", "Inicio"], ["admin-ranking", "Rankings"], ["admin", "Cuentas"], ["admin-groups", "Grupos"]]
    : isProfesor
      ? [["profesor-home", "Mi Panel"], ["grupos", "Mis Grupos"]]
      : [["dashboard", "Inicio"], ["retos", "Retos"], ["teoria", "Teoría"], ["terminal", "Terminal"], ["ranking", "Ranking"]];
  // El jugador ya no tiene "Más": sus 5 pestañas caben a la vista y "Progreso"
  // se abre desde su chip de cuenta (a la derecha).
  const moreItems = [];
  const activeGroup = navGroupFor(app.activeTab);
  const moreActive = moreItems.some(([id]) => id === activeGroup);
  // Admin y profesor no juegan retos: su encabezado no muestra puntos.
  const isManagementView = isAdmin || isProfesor;
  return h("header", { class: "topbar", "data-view": isManagementView ? "management" : "player" }, [
    div({ class: "brand" }, [brandLogo()]),
    button({
      class: `nav-burger ${navOpen ? "is-open" : ""}`,
      type: "button",
      "aria-label": navOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación",
      "aria-expanded": navOpen ? "true" : "false",
      onclick: () => { navOpen = !navOpen; if (!navOpen) moreMenuOpen = false; render(); }
    }, [span({ class: "burger-bar" }, ""), span({ class: "burger-bar" }, ""), span({ class: "burger-bar" }, "")]),
    h("nav", { class: `main-nav ${navOpen ? "nav-open" : ""}`, "aria-label": "Navegación principal" }, [
      ...primaryItems.map(([id, label]) => button({ class: activeGroup === id ? "nav-active" : "", "aria-current": activeGroup === id ? "page" : null, onclick: () => switchTab(id) }, label)),
      moreItems.length ? div({ class: "nav-more" }, [
        button({
          class: `nav-more-toggle ${moreActive ? "nav-active" : ""}`,
          type: "button",
          "aria-expanded": moreMenuOpen ? "true" : "false",
          onclick: () => { moreMenuOpen = !moreMenuOpen; render(); }
        }, [span({}, "Más"), span({ class: "nav-more-caret", "aria-hidden": "true" }, moreMenuOpen ? "▴" : "▾")]),
        moreMenuOpen ? div({ class: "nav-more-menu" }, moreItems.map(([id, label]) => button({ class: activeGroup === id ? "nav-active" : "", onclick: () => switchTab(id) }, label))) : null
      ]) : null,
      moreMenuOpen ? div({ class: "nav-more-scrim", onclick: () => { moreMenuOpen = false; render(); } }, []) : null
    ]),
    div({ class: `account-chip ${!isManagementView && app.activeTab === "perfil" ? "chip-active" : ""}` }, [
      // Para el jugador, avatar + nombre abren su Progreso.
      (isManagementView ? div : button)({
        class: "chip-profile",
        type: isManagementView ? null : "button",
        title: isManagementView ? null : "Ver mi progreso",
        onclick: isManagementView ? null : () => switchTab("perfil")
      }, [
        div({ class: "avatar" }, app.user.name.slice(0, 1).toUpperCase()),
        div({}, [h("strong", {}, app.user.name), span({}, isAdmin ? "Panel de administración" : isProfesor ? "Panel del profesor" : `${current.score} pts${playerRank() ? ` · puesto #${playerRank()}` : ""}`)])
      ]),
      app.user.role ? span({ class: `role-tag role-${app.user.role}` }, roleLabel(app.user.role)) : null,
      button({ class: "chip-exit", onclick: signOut, title: "Cerrar sesión" }, "salir")
    ])
  ]);
}

function loadingView() {
  return div({ class: "empty-state panel" }, [h("h2", {}, "Cargando…"), h("p", { class: "muted" }, app.loadError || "Cargando retos, progreso y configuración de laboratorio…"), app.loadError ? button({ class: "primary-action", onclick: hydratePlatform }, "Reintentar") : null]);
}

function labSummary() {
  if (app.platform.checking) return { label: "Comprobando", detail: "Verificando Docker Desktop", state: "checking" };
  if (app.terminal.connected) return { label: "En línea", detail: "Kali aislada conectada", state: "ready" };
  if (app.platform.dockerReady) return { label: "Listo", detail: app.platform.detail || "Docker Desktop operativo", state: "ready" };
  return { label: "Requiere atención", detail: app.platform.detail || "Docker Desktop no disponible", state: "blocked" };
}

// Inicio del jugador: UNA sola vista de su avance (puntos, retos, puesto) y
// UNA acción principal (el siguiente reto). Los números no se repiten en
// tarjetas aparte: ya están en esta línea y en el chip del encabezado.
function dashboardView() {
  const current = stats();
  const pending = app.challenges.filter(challenge => !app.solved[challenge.id]);
  const next = pending[0] || null;
  const progress = current.total ? Math.round((current.solves / current.total) * 100) : 0;
  const lab = labSummary();
  const rank = playerRank();
  const openChallenge = challenge => { app.selectedId = challenge.id; switchTab("reto"); };
  return div({ class: "dashboard-page dash" }, [
    h("section", { class: "mission-hero dash-hero" }, [
      h("img", { src: "./img/mascot.png", alt: "", class: "dash-mascot" }, []),
      div({ class: "dash-hero-copy" }, [
        h("h2", {}, greeting()),
        h("p", { class: "dash-stats" }, [
          span({}, [h("strong", {}, String(current.score)), " pts"]),
          span({}, [h("strong", {}, `${current.solves}/${current.total}`), " retos"]),
          rank ? span({}, ["puesto ", h("strong", {}, `#${rank}`)]) : null
        ]),
        next
          ? div({ class: "dash-next" }, [
            span({ class: "eyebrow" }, current.solves ? "sigue con" : "empieza con"),
            h("strong", { class: "dash-next-title" }, next.title),
            span({ class: "muted" }, `${next.category} · ${next.difficulty} · ${next.points} pts`)
          ])
          : h("p", { class: "dash-next muted" }, "Resolviste todos los retos disponibles. Revisa el ranking o repasa la teoría."),
        div({ class: "hero-actions" }, next
          ? [button({ class: "primary-action", onclick: () => openChallenge(next) }, "Ver reto"), button({ class: "ghost-action", onclick: () => openTerminalForChallenge(next) }, "Abrir en Kali")]
          : [button({ class: "primary-action", onclick: () => switchTab("ranking") }, "Ver ranking")]),
        div({ class: `dash-lab dash-lab-${lab.state}` }, [
          span({ class: "dash-lab-dot", "aria-hidden": "true" }, ""),
          span({}, `Laboratorio: ${lab.label}`),
          span({ class: "dash-lab-detail" }, lab.detail),
          button({ class: "dash-lab-refresh", type: "button", title: "Comprobar de nuevo", "aria-label": "Comprobar de nuevo el laboratorio", onclick: hydratePlatform }, "⟳")
        ])
      ]),
      div({ class: "mission-ring", style: { "--progress": `${progress * 3.6}deg` }, role: "img", "aria-label": `${progress}% de los retos completados` }, [span({}, `${progress}%`), h("small", {}, "completado")])
    ]),
    // Guía de 3 pasos solo para quien todavía no resolvió nada.
    current.solves === 0 ? h("ol", { class: "dash-steps" }, [
      h("li", {}, [h("strong", {}, "Lee el reto"), " y descarga su evidencia."]),
      h("li", {}, [h("strong", {}, "Analízala en Kali"), ", aislada de tu equipo."]),
      h("li", {}, [h("strong", {}, "Envía la flag"), " WISPR{…} y suma puntos."])
    ]) : null,
    pending.length > 1 ? h("section", { class: "dash-queue" }, [
      div({ class: "dash-queue-head" }, [h("h3", {}, "Próximos retos"), button({ class: "text-action", onclick: () => switchTab("retos") }, `Ver los ${current.total} retos →`)]),
      div({ class: "dash-rows" }, pending.slice(1, 5).map(challenge => challengeRow(challenge, () => openChallenge(challenge))))
    ]) : null
  ]);
}

function challengeRow(challenge, onclick) {
  return button({ class: "dash-row", type: "button", onclick }, [
    span({ class: "badge", style: { borderColor: difficultyColors[challenge.difficulty], color: difficultyColors[challenge.difficulty] } }, challenge.difficulty),
    span({ class: "dash-row-title" }, challenge.title),
    span({ class: "dash-row-cat" }, challenge.category),
    span({ class: "dash-row-pts" }, `${challenge.points} pts`)
  ]);
}

// Tarjeta de cifra de los paneles de admin y profesor.
function metric(label, value, detail, action) {
  const icons = {
    "Puntos": "★",
    "Solves": "✓",
    "Pistas": "⚑",
    "Laboratorio": "◉"
  };

  return div({ class: "metric-card" }, [
    div({ class: "metric-icon" }, icons[label] || "•"),
    div({ class: "metric-content" }, [
      span({ class: "muted" }, label),
      h("strong", {}, String(value)),
      h("small", {}, detail)
    ]),
    action ? button({ class: "metric-action", title: action.title, "aria-label": action.title, onclick: action.onclick }, "⟳") : null
  ]);
}

// Puesto del jugador en el ranking real, o null mientras no haya cargado.
function playerRank() {
  if (!rankingState.loaded) return null;
  const index = leaderboard().findIndex(player => player.current);
  return index >= 0 ? index + 1 : null;
}

function challengesView() {
  const categories = [...new Set(app.challenges.map(challenge => challenge.category))];
  const list = app.challenges.filter(challenge => app.filter === "all" || challenge.category === app.filter).sort((left, right) => app.sort === "points" ? right.points - left.points : app.sort === "difficulty" ? difficultyOrder[right.difficulty] - difficultyOrder[left.difficulty] : Number(Boolean(app.solved[left.id])) - Number(Boolean(app.solved[right.id])));
  return div({ class: "challenges-page" }, [
    div({ class: "section-head" }, [div({}, [h("h2", {}, "Retos"), h("p", { class: "muted section-copy" }, `${Object.keys(app.solved).length} de ${app.challenges.length} resueltos. Cada reto trae su evidencia para analizar en Kali.`)])]),
    challengeGeneratorPanel(),
    div({ class: "toolbar" }, [select("filter", app.filter, ["all", ...categories], value => { app.filter = value; saveState(); render(); }), select("sort", app.sort, ["recommended", "difficulty", "points"], value => { app.sort = value; saveState(); render(); })]),
    div({ class: "challenge-grid" }, list.map(challengeCard))
  ]);
}

// ---------------------------------------------------------------------------
// Pedir un reto a la IA (13 oct). Se elige técnica, dificultad y escenario;
// FastAPI genera la flag y el archivo, y la IA escribe la historia
// (POST /api/challenges/generate). Estudiante: reto de práctica solo para él,
// sin puntos. Profesor/admin: reto para todos los estudiantes, cada uno con su
// propio archivo y su propia flag.
// ---------------------------------------------------------------------------
const generatorState = { options: null, loading: false, failed: false, busy: false, technique: "xor_singlebyte", difficulty: "Medium", theme: "", custom: "" };

async function loadGeneratorOptions() {
  if (generatorState.options || generatorState.loading || generatorState.failed) return;
  generatorState.loading = true;
  try {
    const response = await apiFetch(API + "/api/challenges/options", { cache: "no-store" });
    const data = await response.json();
    if (data && data.ok) generatorState.options = data;
    else generatorState.failed = true;
  } catch (_) {
    generatorState.failed = true; // backend sin esta ruta: el panel simplemente no aparece
  }
  generatorState.loading = false;
  render();
}

async function requestChallenge(event) {
  event.preventDefault();
  if (generatorState.busy) return;
  const custom = generatorState.theme === "__otro";
  const theme = custom ? generatorState.custom.trim() : generatorState.theme;
  if (custom && theme.length < 3) return toast("Escribe un escenario de al menos 3 letras.", "warn");
  generatorState.busy = true;
  render();
  try {
    const response = await apiFetch(API + "/api/challenges/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technique: generatorState.technique, difficulty: generatorState.difficulty, theme })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo generar el reto.");
    upsertChallenge(data.challenge);
    if (data.generationError) toast(data.generationError, "info");
    generatorState.busy = false;
    if (data.visibleTo === "everyone") {
      toast(`Reto publicado para todos los estudiantes: «${data.challenge.title}».`, "success");
      return render();
    }
    toast(`Reto listo: «${data.challenge.title}».`, "success");
    app.selectedId = data.challenge.id;
    saveState();
    return switchTab("reto");
  } catch (error) {
    toast(error.message || "No se pudo generar el reto.", "error");
  }
  generatorState.busy = false;
  render();
}

function challengeGeneratorPanel() {
  const options = generatorState.options;
  if (!options) {
    loadGeneratorOptions();
    return null;
  }
  const teacher = app.user.role === "profesor" || app.user.role === "admin";
  const set = key => event => {
    generatorState[key] = event.target.value;
    if (key === "theme") render(); // muestra u oculta el campo "Otro…"
  };
  const published = teacher ? app.challenges.filter(challenge => challenge.generated).slice(-5).reverse() : [];
  return div({ class: "panel generator-panel" }, [
    h("h3", {}, teacher ? "Crear un reto con IA para tus estudiantes" : "Pide un reto a la IA"),
    h("p", { class: "muted tight" }, teacher
      ? "Eliges técnica, dificultad y escenario; la IA escribe la historia. Lo verán todos los estudiantes, cada uno con su propio archivo y su propia flag."
      : "Elige qué quieres practicar. La IA escribe la historia y el reto es solo tuyo: es de práctica, no suma puntos."),
    h("form", { class: "generator-form", onsubmit: requestChallenge }, [
      h("select", { name: "technique", "aria-label": "Técnica", onchange: set("technique") },
        options.techniques.map(item => h("option", { value: item.id, selected: item.id === generatorState.technique }, item.name))),
      h("select", { name: "difficulty", "aria-label": "Dificultad", onchange: set("difficulty") },
        options.levels.map(level => h("option", { value: level, selected: level === generatorState.difficulty }, level))),
      h("select", { name: "theme", "aria-label": "Escenario", onchange: set("theme") }, [
        h("option", { value: "", selected: !generatorState.theme }, "Escenario al azar"),
        ...options.themes.map(theme => h("option", { value: theme, selected: theme === generatorState.theme }, theme)),
        h("option", { value: "__otro", selected: generatorState.theme === "__otro" }, "Otro…")
      ]),
      generatorState.theme === "__otro"
        ? h("input", { name: "custom", placeholder: "Ej. la casa de mi abuela", maxlength: "40", value: generatorState.custom, "aria-label": "Escenario", oninput: event => { generatorState.custom = event.target.value; } }, [])
        : null,
      button({ class: "primary-action compact", type: "submit", disabled: generatorState.busy }, generatorState.busy ? "La IA está escribiendo…" : "Generar reto")
    ]),
    published.length
      ? div({ class: "generator-published" }, [
          h("p", { class: "eyebrow" }, "generados"),
          ...published.map(challenge => div({ class: "history-row" }, [
            span({ style: { color: difficultyColors[challenge.difficulty] } }, challenge.difficulty),
            h("strong", {}, challenge.title),
            span({ class: "muted" }, `${challenge.category} · ${challenge.generator === "ai" ? "historia de la IA" : "plantilla"}`)
          ]))
        ])
      : null
  ]);
}

function select(name, value, options, onChange) {
  return h("select", { name, onchange: event => onChange(event.target.value) }, options.map(option => h("option", { value: option, selected: option === value }, option === "all" ? "Todas las categorías" : option === "recommended" ? "Orden recomendado" : option === "difficulty" ? "Mayor dificultad" : option === "points" ? "Más puntos" : option)));
}

function challengeCard(challenge) {
  const solved = Boolean(app.solved[challenge.id]);
  return div({ class: `challenge-card ${solved ? "completed" : ""}`, onclick: () => { app.selectedId = challenge.id; switchTab("reto"); } }, [
    div({ class: "card-topline" }, [span({ class: "badge", style: { borderColor: difficultyColors[challenge.difficulty], color: difficultyColors[challenge.difficulty] } }, challenge.difficulty), h("p", { class: "eyebrow card-category" }, challenge.category)]),
    div({}, [h("h3", {}, challenge.title), h("p", { class: "muted card-desc" }, challenge.description)]),
    div({ class: "card-footer" }, [div({ class: solved ? "solve solved" : "solve" }, solved ? "✓ resuelto" : challenge.points ? `${challenge.points} pts` : "práctica"), span({ class: "open-link" }, "Ver reto →")])
  ]);
}

function challengeDetail(challenge) {
  const solved = Boolean(app.solved[challenge.id]);
  const unlocked = app.hints[challenge.id] || [];
  let input;
  return h("section", { class: "detail detail-page" }, [
    div({ class: "detail-hero" }, [button({ class: "text-action back-action", onclick: () => switchTab("retos") }, "← Retos"), h("p", { class: "eyebrow" }, challenge.category), h("h2", {}, challenge.title), h("p", { class: "lead" }, challenge.description), div({ class: "meta-strip" }, [span({ style: { borderColor: difficultyColors[challenge.difficulty], color: difficultyColors[challenge.difficulty] } }, challenge.difficulty), span({}, challenge.points ? `${challenge.points} pts` : "práctica · sin puntos"), solved ? span({ class: "meta-solved" }, "✓ Resuelto") : null])]),
    div({ class: "panel" }, [h("h3", {}, "Objetivo"), h("p", {}, challenge.objective), challenge.tools.length ? div({ class: "tool-grid" }, [span({ class: "tool-label" }, "Herramientas"), ...challenge.tools.map(tool => span({ class: "tool" }, tool))]) : null]),
    div({ class: "panel" }, [h("h3", {}, "Archivos"), ...challenge.files.map(file => div({ class: "file-row" }, [div({}, [h("strong", {}, file.name), h("p", { class: "muted tight" }, file.desc)]), button({ class: "ghost-action", onclick: () => downloadFile(file, challenge) }, "Descargar")])), h("p", { class: "muted tight scope-note" }, "Evidencia sintética. Kali corre aislada, sin acceso a tu equipo ni a internet.")]),
    div({ class: "panel" }, [h("h3", {}, "Pistas"), ...challenge.hints.map((hint, index) => ({ hint, index, open: unlocked.includes(index) && Boolean(hint) })).map(({ hint, index, open }) => div({ class: "hint-row" }, [open ? h("p", {}, hint) : h("p", { class: "muted" }, `Pista ${index + 1} bloqueada`), !open ? button({ class: "ghost-action", onclick: () => unlockHint(challenge.id, index) }, hintButtonLabel(challenge)) : null]))]),
    div({ class: "submit-panel" }, solved ? h("strong", { class: "owned-label" }, "Reto completado con esta cuenta") : [input = h("input", { placeholder: "WISPR{flag_aqui}", autocomplete: "off" }, []), button({ class: "primary-action", onclick: () => submitFlag(challenge, input) }, "Enviar flag"), button({ class: "ghost-action", onclick: () => openTerminalForChallenge(challenge) }, "Resolver en Kali")])
  ]);
}

function panel(title, body) { return div({ class: "panel" }, [h("h3", {}, title), h("p", {}, body)]); }

function terminalView() {
  const current = selectedChallenge();
  if (!current) return loadingView();
  return div({ class: "vm-page terminal-page" }, [
    div({ class: "section-head" }, [div({}, [h("h2", {}, "Terminal Kali"), h("p", { class: "muted section-copy" }, "Una terminal real en tu propio contenedor, aislado de tu equipo.")]), div({ class: "terminal-actions" }, [
      app.terminal.connected
        ? button({ class: "ghost-action", onclick: disconnectTerminal }, "Desconectar")
        : button({ class: "primary-action", onclick: connectTerminal }, "Conectar"),
      button({ class: "ghost-action", onclick: stopKali }, "Detener entorno"),
      button({ class: "text-action", onclick: runDiagnostic }, "Diagnosticar")
    ])]),
    app.terminal.lastError ? div({ class: "panel terminal-error" }, [h("p", { class: "eyebrow" }, "no se pudo montar el reto"), h("pre", {}, app.terminal.lastError), h("p", { class: "muted tight" }, "Copia este texto tal cual si necesitas ayuda. Pulsa Diagnosticar para comprobar Docker, imágenes y contenedor.")]) : null,
    app.terminal.diagnostic ? div({ class: "panel terminal-error" }, [h("p", { class: "eyebrow" }, "diagnóstico"), h("pre", {}, app.terminal.diagnostic), button({ class: "ghost-action compact", onclick: () => { app.terminal.diagnostic = ""; render(); } }, "Cerrar")]) : null,
    div({ class: "terminal-workspace" }, [
      div({ class: "panel vm-status" }, [h("p", { class: "eyebrow" }, "reto activo"), h("h3", {}, current.title), h("p", { class: "muted" }, current.objective), h("p", { class: "terminal-path" }, "/workspace/challenge"), button({ class: "ghost-action", onclick: () => openTerminalForChallenge(current) }, "Montar este reto"), h("p", { class: "muted tight" }, "Atajos (escriben el comando en la terminal):"), div({ class: "terminal-shortcuts" }, [button({ class: "shortcut", onclick: () => sendTerminalCommand("ctf show") }, "ctf show"), button({ class: "shortcut", onclick: () => sendTerminalCommand("cd $(ctf open)") }, "abrir carpeta"), button({ class: "shortcut", onclick: () => sendTerminalCommand("ctf files") }, "ver archivos"), button({ class: "shortcut", onclick: () => sendTerminalCommand("ctf help") }, "ayuda")])]),
      div({ class: "terminal-panel xterm-panel" }, [div({ class: "terminal-head" }, [span({}, "kali@wispr · /workspace"), span({ "data-terminal-status": "", class: `terminal-state ${app.terminal.connected ? "online" : "offline"}` }, app.terminal.connected ? "Kali aislada · online" : "Desconectada")]), div({ id: "kali-terminal", class: "xterm-host", tabindex: "0" }, [])])
    ])
  ]);
}

function profileView() {
  const current = stats();
  return div({ class: "profile-grid" }, [
    div({ class: "profile-hero" }, [div({ class: "avatar big" }, app.user.name.slice(0, 1).toUpperCase()), h("h2", {}, app.user.name), app.user.role ? span({ class: `role-tag role-${app.user.role}` }, roleLabel(app.user.role)) : null, h("p", { class: "muted" }, `${app.user.handle}${app.user.gender ? " · " + app.user.gender : ""}${app.user.email ? " · " + app.user.email : ""}`), div({ class: "meta-strip centered" }, [span({}, `${current.score} pts`), span({}, `${current.solves}/${current.total} retos`), span({}, `${current.hints} pistas usadas`)])]),
    div({ class: "panel" }, [h("h3", {}, "Envíos recientes"), app.submissions.length ? app.submissions.slice(0, 10).map(item => div({ class: "history-row" }, [span({ class: item.ok ? "ok" : "fail" }, item.ok ? "Correcta" : "Incorrecta"), h("strong", {}, item.title), span({ class: "muted" }, `${item.source} · ${new Date(item.time).toLocaleTimeString()}`)])) : h("p", { class: "muted" }, "Todavía no enviaste ninguna flag.")])
  ]);
}

// ---------------------------------------------------------------------------
// Inicio del admin: saludo + estadísticas generales de la plataforma. Lee de
// adminState.players / adminGroupsState.groups, ya precargados en applyServerProfile.
// ---------------------------------------------------------------------------
function adminStatsSummary() {
  const byRole = { estudiante: 0, profesor: 0, admin: 0 };
  let totalSolves = 0;
  let totalScore = 0;
  adminState.players.forEach(player => {
    if (player.isAdmin) byRole.admin += 1;
    else if (player.role === "profesor") byRole.profesor += 1;
    else byRole.estudiante += 1;
    const entries = Object.values(player.solved || {});
    totalSolves += entries.length;
    totalScore += entries.reduce((sum, entry) => sum + (entry.points || 0), 0);
  });
  return { total: adminState.players.length, ...byRole, totalSolves, totalScore };
}

function adminRecentPlayers(limit = 5) {
  return [...adminState.players].sort((left, right) => new Date(right.joined) - new Date(left.joined)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Gráficos de actividad del home admin: SVG dibujado a mano (sin librería),
// coloreado con var(--token) para que reaccione al toggle de tema sin re-render.
// ---------------------------------------------------------------------------
function parseSVG(markup) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = markup.trim();
  return wrapper.firstElementChild;
}

function lastNDays(n) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    days.push(day);
  }
  return days;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function shortDay(date) {
  return date.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function adminSignupsByDay(days) {
  return days.map(day => ({ day, value: adminState.players.filter(player => player.joined && sameDay(new Date(player.joined), day)).length }));
}

function adminSolvesByDay(days) {
  return days.map(day => {
    let count = 0;
    adminState.players.forEach(player => {
      Object.values(player.solved || {}).forEach(entry => { if (entry.time && sameDay(new Date(entry.time), day)) count += 1; });
    });
    return { day, value: count };
  });
}

// Barras verticales con remate redondeado (4px) y base cuadrada, creciendo
// desde una única línea base — ver referencia de marcas del skill de dataviz.
function activityBarChart(series, color, { height = 128, title = "" } = {}) {
  const width = 320;
  const gap = 3;
  const n = series.length;
  const barWidth = Math.max(4, (width - gap * (n - 1)) / n);
  const bottomPad = 18;
  const topPad = 18;
  const baseline = height - bottomPad;
  const max = Math.max(1, ...series.map(point => point.value));
  const peakIndex = series.reduce((best, point, i) => (point.value > series[best].value ? i : best), 0);

  const bars = series.map((point, i) => {
    const x = i * (barWidth + gap);
    const barHeight = point.value > 0 ? Math.max(3, Math.round((point.value / max) * (baseline - topPad))) : 0;
    const y = baseline - barHeight;
    const r = Math.min(4, barWidth / 2, barHeight);
    const tooltip = `${shortDay(point.day)}: ${point.value}`;
    const mark = barHeight > 0
      ? `<path d="M${x},${baseline} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barWidth - r},${y} Q${x + barWidth},${y} ${x + barWidth},${y + r} L${x + barWidth},${baseline} Z" fill="${color}"></path>`
      : `<rect x="${x}" y="${baseline - 2}" width="${barWidth}" height="2" fill="${color}" opacity="0.3"></rect>`;
    const peakLabel = i === peakIndex && point.value > 0
      ? `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" class="chart-value-label">${point.value}</text>`
      : "";
    return `<g><title>${tooltip}</title>${mark}${peakLabel}</g>`;
  }).join("");

  return parseSVG(`
    <svg viewBox="0 0 ${width} ${height}" class="activity-chart" role="img" aria-label="${title}">
      <line x1="0" y1="${baseline}" x2="${width}" y2="${baseline}" class="chart-baseline"></line>
      ${bars}
      <text x="0" y="${height - 3}" class="chart-axis-label">${shortDay(series[0].day)}</text>
      <text x="${width}" y="${height - 3}" text-anchor="end" class="chart-axis-label">${shortDay(series[n - 1].day)}</text>
    </svg>
  `);
}

// Barras horizontales (una por rol): cada una ya lleva el nombre del rol
// escrito al lado, así que el color nunca es la única forma de identificarla.
function roleDistributionChart(summary) {
  const rows = [
    { label: "Estudiantes", value: summary.estudiante, color: "var(--green)" },
    { label: "Profesores", value: summary.profesor, color: "var(--orange)" },
    { label: "Admins", value: summary.admin, color: "var(--red)" }
  ];
  const width = 320;
  const rowHeight = 34;
  const height = rows.length * rowHeight;
  const labelWidth = 88;
  const maxBar = width - labelWidth - 34;
  const max = Math.max(1, ...rows.map(row => row.value));

  const bars = rows.map((row, i) => {
    const y = i * rowHeight;
    const barW = Math.round((row.value / max) * maxBar);
    const barY = y + 8;
    const barH = rowHeight - 16;
    const r = Math.min(4, barH / 2, barW);
    const mark = barW > 0
      ? `<path d="M${labelWidth},${barY + barH} L${labelWidth},${barY + r} Q${labelWidth},${barY} ${labelWidth + r},${barY} L${labelWidth + barW - r},${barY} Q${labelWidth + barW},${barY} ${labelWidth + barW},${barY + r} L${labelWidth + barW},${barY + barH} Z" fill="${row.color}"></path>`
      : "";
    return `<g><title>${row.label}: ${row.value}</title><text x="0" y="${y + rowHeight / 2 + 4}" class="chart-row-label">${row.label}</text>${mark}<text x="${labelWidth + barW + 8}" y="${y + rowHeight / 2 + 4}" class="chart-value-label">${row.value}</text></g>`;
  }).join("");

  return parseSVG(`<svg viewBox="0 0 ${width} ${height}" class="activity-chart role-chart" role="img" aria-label="Cuentas por rol">${bars}</svg>`);
}

function activityChartPanel(eyebrow, title, chartNode) {
  const panel = div({ class: "panel chart-panel" }, [h("p", { class: "eyebrow" }, eyebrow), h("h3", { class: "chart-title" }, title)]);
  panel.appendChild(chartNode);
  return panel;
}

function adminHomeView() {
  const summary = adminStatsSummary();
  const recent = adminRecentPlayers(5);
  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const firstName = (app.user.name || "").split(" ")[0] || app.user.name;
  const days = lastNDays(14);
  const signups = adminSignupsByDay(days);
  const solvesByDay = adminSolvesByDay(days);
  const newThisWeek = signups.slice(-7).reduce((sum, point) => sum + point.value, 0);

  return div({ class: "admin-page admin-home dashboard-page" }, [
    div({ class: "mission-hero admin-hero" }, [
      div({}, [
        h("p", { class: "eyebrow" }, "panel de administración"),
        h("h2", {}, `${greetingWord}, ${firstName}.`),
        h("p", { class: "lead" }, "Desde aquí gestionas toda la plataforma WISPR: quién está registrado, el ranking general y los grupos que arman los profesores con sus estudiantes."),
        div({ class: "hero-actions" }, [
          button({ class: "primary-action", onclick: () => switchTab("admin") }, "Gestionar cuentas"),
          button({ class: "ghost-action", onclick: () => switchTab("admin-ranking") }, "Ver rankings"),
          button({ class: "ghost-action", onclick: () => switchTab("admin-groups") }, "Ver grupos")
        ])
      ])
    ]),
    challengeGeneratorPanel(),
    div({ class: "metric-grid" }, [
      metric("Cuentas", summary.total, `${summary.estudiante} estudiantes · ${summary.profesor} profesores`),
      metric("Grupos", adminGroupsState.groups.length, "creados por profesores"),
      metric("Solves", summary.totalSolves, `${summary.totalScore} pts repartidos`),
      metric("Nuevas", newThisWeek, "altas en los últimos 7 días")
    ]),
    div({ class: "chart-row" }, [
      activityChartPanel("actividad · 14 días", "Altas por día", activityBarChart(signups, "var(--orange)", { title: "Altas por día" })),
      activityChartPanel("actividad · 14 días", "Solves por día", activityBarChart(solvesByDay, "var(--green)", { title: "Solves por día" }))
    ]),
    div({ class: "dashboard-columns" }, [
      div({ class: "panel focus-panel" }, [
        h("p", { class: "eyebrow" }, "altas recientes"),
        recent.length
          ? div({}, recent.map(player => div({ class: "history-row" }, [
              span({ class: player.isAdmin ? "" : player.role === "profesor" ? "ok" : "" }, player.isAdmin ? "ADMIN" : (roleLabel(player.role) || "—").toUpperCase()),
              h("strong", {}, player.name || player.handle),
              span({ class: "muted" }, player.joined ? new Date(player.joined).toLocaleDateString() : "—")
            ])))
          : h("p", { class: "muted" }, "Todavía no hay cuentas registradas.")
      ]),
      activityChartPanel("composición", "Cuentas por rol", roleDistributionChart(summary))
    ])
  ]);
}

// ---------------------------------------------------------------------------
// Ranking real de la plataforma (no la simulación de rivales del jugador):
// se calcula sobre adminState.players, igual que las estadísticas del home.
// ---------------------------------------------------------------------------
function adminLeaderboard() {
  return adminState.players
    .filter(player => !player.isAdmin)
    .map(player => {
      const entries = Object.values(player.solved || {});
      return { ...player, score: entries.reduce((sum, entry) => sum + (entry.points || 0), 0), solves: entries.length };
    })
    .sort((left, right) => right.score - left.score || right.solves - left.solves);
}

function adminRankingView() {
  const rows = adminLeaderboard();
  return div({ class: "admin-page" }, [
    div({ class: "section-head" }, [div({}, [
      h("p", { class: "eyebrow" }, "scoreboard general"),
      h("h2", {}, "Ranking de la plataforma"),
      h("p", { class: "muted" }, adminState.loading ? "Cargando…" : `${rows.length} cuenta${rows.length === 1 ? "" : "s"} de estudiantes y profesores clasificadas por puntos.`)
    ]), button({ class: "ghost-action", type: "button", disabled: adminState.loading, onclick: loadAdminPlayers }, adminState.loading ? "Cargando…" : "Actualizar")]),
    rows.length
      ? div({ class: "panel" }, rows.map((player, index) => div({ class: `ranking-row ${index === 0 ? "current" : ""}` }, [
          span({ class: "rank" }, `#${index + 1}`),
          div({ class: "avatar" }, (player.name || "?").slice(0, 1).toUpperCase()),
          div({ class: "grow" }, [h("strong", {}, player.name || player.handle), h("p", { class: "muted tight" }, `${player.handle} · ${roleLabel(player.role) || "—"}`)]),
          span({ class: "streak" }, `${player.solves} solves`),
          h("strong", { class: "score" }, String(player.score))
        ])))
      : div({ class: "panel" }, [h("p", { class: "muted" }, "Todavía no hay actividad registrada en la plataforma.")])
  ]);
}

// ---------------------------------------------------------------------------
// Grupos vistos desde el admin: todos los grupos de todos los profesores.
// ---------------------------------------------------------------------------
function adminGroupsView() {
  const groups = adminGroupsState.groups;
  return div({ class: "admin-page" }, [
    div({ class: "section-head" }, [div({}, [
      h("p", { class: "eyebrow" }, "organización por profesor"),
      h("h2", {}, "Grupos"),
      h("p", { class: "muted" }, adminGroupsState.loading ? "Cargando grupos…" : `${groups.length} grupo${groups.length === 1 ? "" : "s"} creados por profesores.`)
    ]), button({ class: "ghost-action", type: "button", disabled: adminGroupsState.loading, onclick: loadAdminGroups }, adminGroupsState.loading ? "Cargando…" : "Actualizar")]),
    adminGroupsState.error ? div({ class: "panel" }, [h("p", { class: "muted" }, adminGroupsState.error)]) : null,
    groups.length
      ? div({ class: "groups-list" }, groups.map(adminGroupCard))
      : div({ class: "panel empty-state" }, [h("p", { class: "muted" }, adminGroupsState.loading ? "Cargando grupos…" : "Todavía no hay grupos creados por ningún profesor.")])
  ]);
}

// Fecha límite formateada + si ya venció (solo relevante si la tarea sigue pendiente).
function taskDueInfo(task) {
  if (!task.dueDate) return null;
  const due = new Date(`${task.dueDate}T00:00:00`);
  return { label: shortDay(due), overdue: !task.done && due < new Date(new Date().toDateString()) };
}

// `editable` decide si se ve con checkbox + borrar (el profesor dueño) o en
// modo solo-lectura con un indicador de estado (el admin, de visita). Una
// tarea ligada a un reto (task.challengeId) nunca se marca a mano: su estado
// es "X/Y estudiantes" calculado en vivo contra el `solved` real de cada
// miembro del grupo, así que ni el profesor ni el admin pueden desincronizarla.
function taskRow(group, task, editable) {
  const due = taskDueInfo(task);
  const challenge = task.challengeId ? app.challenges.find(item => item.id === task.challengeId) : null;
  let statusEl;
  let allDone = false;
  if (challenge) {
    const doneMembers = group.members.filter(member => member.solved && member.solved[task.challengeId]);
    allDone = group.members.length > 0 && doneMembers.length === group.members.length;
    const tooltip = doneMembers.length ? `Ya lo resolvieron: ${doneMembers.map(member => member.name || member.handle).join(", ")}` : "Nadie lo ha resuelto todavía.";
    statusEl = span({ class: `task-status task-status-count ${allDone ? "done" : ""}`, title: tooltip }, `${doneMembers.length}/${group.members.length}`);
  } else if (editable) {
    const checkbox = h("input", { type: "checkbox", onchange: () => toggleGroupTask(group.id, task.id) }, []);
    checkbox.checked = task.done;
    statusEl = checkbox;
    allDone = task.done;
  } else {
    allDone = task.done;
    statusEl = span({ class: `task-status ${task.done ? "done" : ""}` }, task.done ? "✓" : "○");
  }
  return div({ class: `task-row ${allDone ? "task-done" : ""}` }, [
    statusEl,
    div({ class: "grow" }, [
      h("strong", {}, task.title),
      challenge ? span({ class: "role-tag" }, `${challenge.category} · ${challenge.points} pts`) : null,
      task.description ? h("p", { class: "muted tight" }, task.description) : null
    ]),
    due ? span({ class: `task-due ${due.overdue ? "overdue" : ""}` }, due.label) : null,
    editable ? button({ class: "danger-action compact", type: "button", onclick: () => deleteGroupTask(group.id, task.id, task.title) }, "Eliminar") : null
  ]);
}

function taskSection(group, editable) {
  return div({ class: "task-section" }, [
    h("p", { class: "eyebrow" }, "tareas"),
    editable
      ? h("form", { class: "task-form", onsubmit: event => createGroupTask(event, group.id) }, [
          h("select", { name: "challengeId" }, [
            h("option", { value: "" }, "— Tarea personalizada —"),
            ...app.challenges.map(challenge => h("option", { value: challenge.id }, `${challenge.title} (${challenge.category} · ${challenge.points} pts)`))
          ]),
          h("input", { name: "title", placeholder: "Título (si no elegiste un reto)", maxlength: "120" }, []),
          h("input", { name: "description", placeholder: "Descripción (opcional)", maxlength: "500" }, []),
          h("input", { name: "dueDate", type: "date", title: "Fecha límite (opcional)" }, []),
          button({ class: "ghost-action compact", type: "submit" }, "Agregar tarea")
        ])
      : null,
    group.tasks.length
      ? div({ class: "task-list" }, group.tasks.map(task => taskRow(group, task, editable)))
      : h("p", { class: "muted tight" }, "Sin tareas todavía.")
  ]);
}

function adminGroupCard(group) {
  const totalScore = group.members.reduce((sum, member) => sum + member.score, 0);
  return div({ class: "panel group-card" }, [
    div({ class: "section-head" }, [
      div({}, [h("h3", {}, group.name), h("p", { class: "muted tight" }, `Profesor: ${group.ownerName} (${group.ownerHandle || "—"}) · creado ${new Date(group.createdAt).toLocaleDateString()}`)]),
      button({ class: "danger-action", type: "button", onclick: () => adminDeleteGroup(group.id, group.name) }, "Eliminar grupo")
    ]),
    div({ class: "meta-strip" }, [span({}, `${group.members.length} estudiante${group.members.length === 1 ? "" : "s"}`), span({}, `${totalScore} pts en conjunto`)]),
    group.members.length
      ? div({ class: "group-members" }, group.members.map(member => div({ class: "admin-row" }, [
          div({ class: "avatar" }, (member.name || "?").slice(0, 1).toUpperCase()),
          div({ class: "grow" }, [h("strong", {}, member.name || member.handle), h("p", { class: "muted tight" }, `${member.handle}${member.email ? " · " + member.email : ""}`)]),
          span({ class: "admin-cell muted" }, `${member.solves} solve${member.solves === 1 ? "" : "s"}`),
          span({ class: "admin-cell muted" }, `${member.score} pts`),
          button({ class: "ghost-action compact", type: "button", onclick: () => viewStudentDetail(member.playerId) }, "Ver progreso")
        ])))
      : h("p", { class: "muted" }, "Sin estudiantes todavía."),
    taskSection(group, false)
  ]);
}

// ---------------------------------------------------------------------------
// Grupos vistos desde el profesor dueño: crear grupos y agregar/quitar
// estudiantes eligiéndolos de la lista de disponibles.
// ---------------------------------------------------------------------------
function groupsView() {
  return div({ class: "groups-page" }, [
    div({ class: "section-head" }, [div({}, [h("p", { class: "eyebrow" }, "tus clases"), h("h2", {}, "Mis grupos"), h("p", { class: "muted" }, "Crea un grupo por clase y agrega estudiantes eligiéndolos de la lista disponible.")])]),
    div({ class: "panel" }, [
      h("p", { class: "eyebrow" }, "nuevo grupo"),
      h("form", { class: "group-create-form", onsubmit: createGroup }, [
        h("input", { name: "name", placeholder: "Nombre del grupo (ej. Décimo B - Redes)", maxlength: "64" }, []),
        button({ class: "primary-action compact", type: "submit" }, "Crear grupo")
      ])
    ]),
    teacherGroupsState.error ? div({ class: "panel" }, [h("p", { class: "muted" }, teacherGroupsState.error)]) : null,
    teacherGroupsState.groups.length
      ? div({ class: "groups-list" }, teacherGroupsState.groups.map(teacherGroupCard))
      : div({ class: "panel empty-state" }, [h("p", { class: "muted" }, teacherGroupsState.loading ? "Cargando tus grupos…" : "Todavía no has creado ningún grupo.")])
  ]);
}

function teacherGroupCard(group) {
  const memberIds = new Set(group.members.map(member => member.playerId));
  // Solo ofrece estudiantes que todavía no estén en ESTE grupo; un profesor
  // ya puede agregar a cualquier estudiante de la plataforma a sus grupos,
  // este selector solo evita que lo escriba a ciegas por usuario/correo.
  const candidates = availableStudentsState.students.filter(student => !memberIds.has(student.playerId));
  const noCandidates = !availableStudentsState.loading && candidates.length === 0;
  return div({ class: "panel group-card" }, [
    div({ class: "section-head" }, [
      div({}, [h("h3", {}, group.name), h("p", { class: "muted tight" }, `${group.members.length} estudiante${group.members.length === 1 ? "" : "s"} · creado ${new Date(group.createdAt).toLocaleDateString()}`)]),
      button({ class: "danger-action", type: "button", onclick: () => deleteGroup(group.id, group.name) }, "Eliminar grupo")
    ]),
    h("form", { class: "group-add-form", onsubmit: event => addGroupMember(event, group.id) }, [
      h("select", { name: "student", disabled: noCandidates }, [
        h("option", { value: "" }, availableStudentsState.loading ? "Cargando estudiantes…" : noCandidates ? "No hay estudiantes disponibles" : "Selecciona un estudiante…"),
        ...candidates.map(student => h("option", { value: student.handle }, `${student.name} (${student.handle})`))
      ]),
      button({ class: "ghost-action compact", type: "submit", disabled: noCandidates }, "Agregar")
    ]),
    group.members.length
      ? div({ class: "group-members" }, group.members.map(member => div({ class: "admin-row" }, [
          div({ class: "avatar" }, (member.name || "?").slice(0, 1).toUpperCase()),
          div({ class: "grow" }, [h("strong", {}, member.name || member.handle), h("p", { class: "muted tight" }, `${member.handle}${member.email ? " · " + member.email : ""}`)]),
          span({ class: "admin-cell muted" }, `${member.solves} solve${member.solves === 1 ? "" : "s"}`),
          span({ class: "admin-cell muted" }, `${member.score} pts`),
          button({ class: "ghost-action compact", type: "button", onclick: () => viewStudentDetail(member.playerId) }, "Ver progreso"),
          button({ class: "danger-action", type: "button", onclick: () => removeGroupMember(group.id, member.playerId, member.name || member.handle) }, "Quitar")
        ])))
      : h("p", { class: "muted" }, "Sin estudiantes todavía."),
    taskSection(group, true)
  ]);
}

// ---------------------------------------------------------------------------
// Detalle de un estudiante (desde una tarjeta de grupo, profesor o admin):
// retos resueltos y envíos recientes, igual de completo que su propio
// perfil, pero visto por quien lo gestiona.
// ---------------------------------------------------------------------------
// Avance en Teoría por módulo (lecciones completadas, dominio e insignias),
// a partir del progreso que el estudiante sincroniza con el backend.
function studentTheoryPanel(progress) {
  const rows = theoryModules.map(module => {
    const lessonIds = module.topics.map(topic => topicLessons[topic]).filter(Boolean);
    if (!lessonIds.length) return null;
    const done = lessonIds.filter(id => progress[id]?.completed);
    const avg = done.length ? Math.round(done.reduce((sum, id) => sum + (progress[id].percent || 0), 0) / done.length) : 0;
    const mission = moduleMissions[module.id] && progress[moduleMissions[module.id].missionId];
    return div({ class: "history-row" }, [
      span({ class: done.length === lessonIds.length ? "ok" : "" }, `${done.length}/${lessonIds.length}`),
      h("strong", {}, `Módulo ${module.id} · ${module.title}`),
      span({ class: "muted" }, [done.length ? `dominio ${avg}%` : "sin lecciones completadas", mission?.completed ? ` · insignia «${mission.badge || "misión"}»` : ""])
    ]);
  }).filter(Boolean);
  const xp = Object.values(progress).reduce((sum, entry) => sum + (entry.xp || 0), 0);
  return div({ class: "panel" }, [
    h("p", { class: "eyebrow" }, `teoría · ${xp} XP`),
    rows.length ? div({}, rows) : h("p", { class: "muted" }, "Todavía no hay lecciones interactivas.")
  ]);
}

function studentDetailView() {
  const backLabel = "← Volver";
  if (studentDetailState.loading) {
    return div({ class: "admin-page" }, [button({ class: "ghost-action back-action", type: "button", onclick: backFromStudentDetail }, backLabel), div({ class: "panel" }, [h("p", { class: "muted" }, "Cargando progreso del estudiante…")])]);
  }
  if (studentDetailState.error || !studentDetailState.student) {
    return div({ class: "admin-page" }, [button({ class: "ghost-action back-action", type: "button", onclick: backFromStudentDetail }, backLabel), div({ class: "panel" }, [h("p", { class: "muted" }, studentDetailState.error || "No se encontró a este estudiante.")])]);
  }
  const student = studentDetailState.student;
  const solvedEntries = Object.entries(student.solved || {}).sort((left, right) => (right[1].time || 0) - (left[1].time || 0));
  const totalScore = solvedEntries.reduce((sum, [, entry]) => sum + (entry.points || 0), 0);
  const totalAttempts = Object.values(student.attempts || {}).reduce((sum, count) => sum + count, 0);
  return div({ class: "admin-page" }, [
    button({ class: "ghost-action back-action", type: "button", onclick: backFromStudentDetail }, backLabel),
    div({ class: "section-head" }, [div({}, [
      h("p", { class: "eyebrow" }, "progreso del estudiante"),
      h("h2", {}, student.name || student.handle),
      h("p", { class: "muted" }, `${student.handle}${student.email ? " · " + student.email : ""}${student.role ? " · " + roleLabel(student.role) : ""}`)
    ])]),
    div({ class: "metric-grid" }, [
      metric("Puntos", totalScore, "acumulados"),
      metric("Solves", solvedEntries.length, "retos resueltos"),
      metric("Intentos", totalAttempts, "envíos totales"),
      metric("Miembro desde", student.joined ? shortDay(new Date(student.joined)) : "—", "fecha de alta")
    ]),
    studentTheoryPanel(student.lessonProgress || {}),
    div({ class: "panel" }, [
      h("p", { class: "eyebrow" }, "retos resueltos"),
      solvedEntries.length
        ? div({}, solvedEntries.map(([challengeId, entry]) => div({ class: "history-row" }, [span({ class: "ok" }, "OK"), h("strong", {}, app.challenges.find(challenge => challenge.id === challengeId)?.title || challengeId), span({ class: "muted" }, `${entry.points || 0} pts · ${entry.time ? new Date(entry.time).toLocaleString() : "—"}`)])))
        : h("p", { class: "muted" }, "Todavía no ha resuelto ningún reto.")
    ]),
    div({ class: "panel" }, [
      h("p", { class: "eyebrow" }, "envíos recientes"),
      (student.submissions || []).length
        ? div({}, student.submissions.slice(0, 15).map(item => div({ class: "history-row" }, [span({ class: item.ok ? "ok" : "fail" }, item.ok ? "Correcta" : "Incorrecta"), h("strong", {}, item.title || item.id), span({ class: "muted" }, `${item.source || "—"} · ${item.time ? new Date(item.time).toLocaleString() : "—"}`)])))
        : h("p", { class: "muted" }, "Todavía no hay envíos registrados.")
    ])
  ]);
}

// ---------------------------------------------------------------------------
// Inicio del profesor: resumen de sus grupos + ranking acotado a sus propios
// estudiantes (no la simulación de rivales que ve un estudiante normal).
// ---------------------------------------------------------------------------
function teacherLeaderboard() {
  const seen = new Map();
  teacherGroupsState.groups.forEach(group => group.members.forEach(member => {
    if (!seen.has(member.playerId)) seen.set(member.playerId, member);
  }));
  return Array.from(seen.values()).sort((left, right) => right.score - left.score || right.solves - left.solves);
}

// Solves por día (últimos 14) agregados sobre TODOS los estudiantes únicos de
// los grupos del profesor — mismo patrón que adminSolvesByDay, pero acotado.
function teacherSolvesByDay(days, students) {
  return days.map(day => {
    let count = 0;
    students.forEach(student => {
      Object.values(student.solved || {}).forEach(entry => { if (entry.time && sameDay(new Date(entry.time), day)) count += 1; });
    });
    return { day, value: count };
  });
}

function truncateLabel(text, max) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// Escapa texto para insertarlo dentro de markup SVG/HTML armado como string
// (parseSVG usa innerHTML). Sin esto, un nombre de estudiante como
// `<img src=x onerror=...>` se ejecutaría en la sesión del profesor que abre
// el gráfico "Puntos por estudiante" (XSS almacenado).
function escapeMarkup(text) {
  return String(text ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

// Barras horizontales de puntos por estudiante — mismo patrón visual que
// roleDistributionChart, pero con filas dinámicas y un solo color (no hay
// "categorías" que distinguir, así que no hace falta validar paleta).
function studentScoreChart(students) {
  const rows = students.slice(0, 10);
  const width = 320;
  const rowHeight = 30;
  const height = Math.max(rowHeight, rows.length * rowHeight);
  const labelWidth = 120;
  const maxBar = width - labelWidth - 34;
  const max = Math.max(1, ...rows.map(row => row.score));

  const bars = rows.map((row, i) => {
    const y = i * rowHeight;
    const barW = Math.round((row.score / max) * maxBar);
    const barY = y + 6;
    const barH = rowHeight - 12;
    const r = Math.min(4, barH / 2, barW);
    const mark = barW > 0
      ? `<path d="M${labelWidth},${barY + barH} L${labelWidth},${barY + r} Q${labelWidth},${barY} ${labelWidth + r},${barY} L${labelWidth + barW - r},${barY} Q${labelWidth + barW},${barY} ${labelWidth + barW},${barY + r} L${labelWidth + barW},${barY + barH} Z" fill="var(--orange)"></path>`
      : "";
    const label = row.name || row.handle;
    const score = Number(row.score) || 0;
    return `<g><title>${escapeMarkup(label)}: ${score} pts</title><text x="0" y="${y + rowHeight / 2 + 4}" class="chart-row-label">${escapeMarkup(truncateLabel(label, 16))}</text>${mark}<text x="${labelWidth + barW + 8}" y="${y + rowHeight / 2 + 4}" class="chart-value-label">${score}</text></g>`;
  }).join("");

  return parseSVG(`<svg viewBox="0 0 ${width} ${height}" class="activity-chart role-chart" role="img" aria-label="Puntos por estudiante">${bars}</svg>`);
}

function professorHomeView() {
  const groups = teacherGroupsState.groups;
  const leaderboard = teacherLeaderboard();
  const days = lastNDays(14);
  const solvesByDay = teacherSolvesByDay(days, leaderboard);
  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const firstName = (app.user.name || "").split(" ")[0] || app.user.name;
  return div({ class: "admin-page dashboard-page" }, [
    div({ class: "mission-hero admin-hero" }, [
      div({}, [
        h("p", { class: "eyebrow" }, "panel del profesor"),
        h("h2", {}, `${greetingWord}, ${firstName}.`),
        h("p", { class: "lead" }, "Aquí ves el resumen de tus grupos y cómo va el progreso de tus estudiantes."),
        div({ class: "hero-actions" }, [
          button({ class: "primary-action", type: "button", onclick: () => switchTab("grupos") }, "Gestionar grupos")
        ])
      ])
    ]),
    challengeGeneratorPanel(),
    div({ class: "metric-grid metric-grid-2" }, [
      metric("Grupos", groups.length, "clases creadas"),
      metric("Estudiantes", leaderboard.length, "en tus grupos")
    ]),
    leaderboard.length
      ? div({ class: "chart-row" }, [
          activityChartPanel("actividad · 14 días", "Solves por día", activityBarChart(solvesByDay, "var(--green)", { title: "Solves por día" })),
          activityChartPanel("comparativa", "Puntos por estudiante", studentScoreChart(leaderboard))
        ])
      : null,
    div({ class: "section-head" }, [div({}, [h("p", { class: "eyebrow" }, "ranking de tus grupos"), h("h2", {}, "Tus estudiantes")])]),
    leaderboard.length
      ? div({ class: "panel" }, leaderboard.map((student, index) => div({ class: `ranking-row ${index === 0 ? "current" : ""}` }, [
          span({ class: "rank" }, `#${index + 1}`),
          div({ class: "avatar" }, (student.name || "?").slice(0, 1).toUpperCase()),
          div({ class: "grow" }, [h("strong", {}, student.name || student.handle), h("p", { class: "muted tight" }, student.handle)]),
          span({ class: "streak" }, `${student.solves} solves`),
          h("strong", { class: "score" }, String(student.score)),
          button({ class: "ghost-action compact", type: "button", onclick: () => viewStudentDetail(student.playerId) }, "Ver progreso")
        ])))
      : div({ class: "panel" }, [h("p", { class: "muted" }, "Todavía no tienes estudiantes en ningún grupo. Crea un grupo desde \"Gestionar grupos\" para empezar.")])
  ]);
}

const adminRoleLabels = { all: "Todos los roles", estudiante: "Estudiante", profesor: "Profesor", admin: "Admin" };

// Busca por nombre/usuario/correo y filtra por rol, todo en el cliente: la
// lista ya está completa en memoria (adminState.players), así que no hace
// falta ir al backend por cada tecleo.
function adminFilteredPlayers() {
  const term = adminState.search.trim().toLowerCase();
  return adminState.players.filter(player => {
    if (adminState.roleFilter === "admin" && !player.isAdmin) return false;
    if (adminState.roleFilter !== "all" && adminState.roleFilter !== "admin" && (player.isAdmin || player.role !== adminState.roleFilter)) return false;
    if (!term) return true;
    return `${player.name} ${player.handle} ${player.email}`.toLowerCase().includes(term);
  });
}

function adminSelectableIds(list) {
  return list.filter(player => player.playerId !== app.playerId).map(player => player.playerId);
}

function toggleAdminSelect(id) {
  if (adminState.selected.has(id)) adminState.selected.delete(id);
  else adminState.selected.add(id);
  renderAdminRows();
}

function toggleAdminSelectAll(checked) {
  const ids = adminSelectableIds(adminFilteredPlayers());
  ids.forEach(id => { if (checked) adminState.selected.add(id); else adminState.selected.delete(id); });
  renderAdminRows();
}

// Reconstruye solo la tabla + los indicadores del toolbar (contador, "seleccionar
// todo", botón de borrado masivo) en vez de llamar a render(): así el cuadro de
// búsqueda conserva el foco y la posición del cursor mientras el admin teclea.
function renderAdminRows() {
  const container = document.getElementById("admin-rows");
  if (!container) return;
  const filtered = adminFilteredPlayers();
  container.innerHTML = "";
  if (filtered.length) {
    filtered.forEach(player => container.appendChild(adminPlayerRow(player)));
  } else {
    container.appendChild(h("p", { class: "muted admin-empty" }, adminState.loading ? "Cargando cuentas…" : adminState.players.length ? "Ninguna cuenta coincide con la búsqueda." : "No hay cuentas registradas todavía."));
  }

  const countLabel = document.getElementById("admin-count-label");
  if (countLabel) {
    const total = adminState.players.length;
    const shown = filtered.length;
    countLabel.textContent = shown === total
      ? `${total} cuenta${total === 1 ? "" : "s"} en la plataforma.`
      : `${shown} de ${total} cuentas coinciden con el filtro.`;
  }

  const selectableIds = adminSelectableIds(filtered);
  const selectedInView = selectableIds.filter(id => adminState.selected.has(id)).length;
  const selectAll = document.getElementById("admin-select-all");
  if (selectAll) {
    selectAll.checked = selectableIds.length > 0 && selectedInView === selectableIds.length;
    selectAll.indeterminate = selectedInView > 0 && selectedInView < selectableIds.length;
    selectAll.disabled = selectableIds.length === 0;
  }
  const bulkButton = document.getElementById("admin-bulk-delete");
  if (bulkButton) {
    const count = adminState.selected.size;
    bulkButton.disabled = count === 0;
    bulkButton.textContent = count > 0 ? `Eliminar seleccionadas (${count})` : "Eliminar seleccionadas";
  }
}

async function bulkDeleteSelected() {
  const ids = Array.from(adminState.selected);
  if (!ids.length) return;
  const count = ids.length;
  if (!confirm(`¿Eliminar ${count} cuenta${count === 1 ? "" : "s"} seleccionada${count === 1 ? "" : "s"}? Esta acción no se puede deshacer.`)) return;
  const bulkButton = document.getElementById("admin-bulk-delete");
  if (bulkButton) bulkButton.disabled = true;
  try {
    const response = await apiFetch(`${API}/api/admin/players/bulk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: app.playerId, targetIds: ids })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron eliminar las cuentas.");
    const deletedSet = new Set(data.deleted || []);
    adminState.players = adminState.players.filter(player => !deletedSet.has(player.playerId));
    adminState.selected.clear();
    toast(`${deletedSet.size} cuenta${deletedSet.size === 1 ? "" : "s"} eliminada${deletedSet.size === 1 ? "" : "s"}.`, "success");
    if (data.skipped && data.skipped.length) toast(`${data.skipped.length} cuenta(s) no se pudieron eliminar.`, "warn");
    render();
  } catch (error) {
    toast(error.message || "No se pudieron eliminar las cuentas.", "error");
    if (bulkButton) bulkButton.disabled = false;
  }
}

function adminView() {
  const filtered = adminFilteredPlayers();
  return div({ class: "admin-page" }, [
    div({ class: "section-head" }, [
      div({}, [
        h("p", { class: "eyebrow" }, "panel de administración"),
        h("h2", {}, "Cuentas registradas"),
        h("p", { class: "muted", id: "admin-count-label" }, adminState.loading ? "Cargando cuentas…" : `${adminState.players.length} cuenta${adminState.players.length === 1 ? "" : "s"} en la plataforma.`)
      ]),
      button({ class: "ghost-action", type: "button", disabled: adminState.loading, onclick: loadAdminPlayers }, adminState.loading ? "Cargando…" : "Actualizar")
    ]),
    div({ class: "panel admin-toolbar" }, [
      div({ class: "field-shell admin-search" }, [
        span({ class: "field-icon" }, "⌕"),
        h("input", {
          type: "search",
          placeholder: "Buscar por nombre, usuario o correo…",
          value: adminState.search,
          oninput: event => { adminState.search = event.target.value; renderAdminRows(); }
        }, [])
      ]),
      h("select", { onchange: event => { adminState.roleFilter = event.target.value; renderAdminRows(); } },
        Object.entries(adminRoleLabels).map(([value, label]) => h("option", { value, selected: value === adminState.roleFilter }, label)))
    ]),
    adminState.error ? div({ class: "panel" }, [h("p", { class: "muted" }, adminState.error)]) : null,
    div({ class: "panel admin-table" }, [
      div({ class: "admin-row admin-row-head" }, [
        (() => {
          const checkbox = h("input", { type: "checkbox", id: "admin-select-all", onchange: event => toggleAdminSelectAll(event.target.checked) }, []);
          const selectableIds = adminSelectableIds(filtered);
          const selectedInView = selectableIds.filter(id => adminState.selected.has(id)).length;
          checkbox.checked = selectableIds.length > 0 && selectedInView === selectableIds.length;
          checkbox.indeterminate = selectedInView > 0 && selectedInView < selectableIds.length;
          checkbox.disabled = selectableIds.length === 0;
          return div({ class: "admin-row-check" }, [checkbox]);
        })(),
        span({ class: "muted" }, "Seleccionar todo"),
        div({ class: "admin-row-spacer" }, []),
        button({ id: "admin-bulk-delete", class: "danger-action", type: "button", disabled: adminState.selected.size === 0, onclick: bulkDeleteSelected },
          adminState.selected.size > 0 ? `Eliminar seleccionadas (${adminState.selected.size})` : "Eliminar seleccionadas")
      ]),
      div({ id: "admin-rows" }, filtered.length
        ? filtered.map(adminPlayerRow)
        : [h("p", { class: "muted admin-empty" }, adminState.loading ? "Cargando cuentas…" : adminState.players.length ? "Ninguna cuenta coincide con la búsqueda." : "No hay cuentas registradas todavía.")])
    ])
  ]);
}

function adminPlayerRow(player) {
  const solves = Object.keys(player.solved || {}).length;
  const isSelf = player.playerId === app.playerId;
  const checkbox = isSelf
    ? span({ class: "admin-row-check-empty", title: "No puedes seleccionar tu propia cuenta." }, "")
    : (() => {
        const input = h("input", { type: "checkbox", onchange: () => toggleAdminSelect(player.playerId) }, []);
        input.checked = adminState.selected.has(player.playerId);
        return input;
      })();
  return div({ class: "admin-row" }, [
    div({ class: "admin-row-check" }, [checkbox]),
    div({ class: "avatar" }, (player.name || "?").slice(0, 1).toUpperCase()),
    div({ class: "grow" }, [
      h("strong", {}, player.name || player.handle),
      h("p", { class: "muted tight" }, `${player.handle}${player.email ? " · " + player.email : ""}`)
    ]),
    player.isAdmin ? span({ class: "role-tag role-admin" }, "Admin") : (player.role ? span({ class: `role-tag role-${player.role}` }, roleLabel(player.role)) : span({ class: "muted" }, "—")),
    player.locked
      ? span({ class: "role-tag role-admin", title: player.lockReason || "Bloqueada por un administrador" }, "Bloqueada")
      : (player.lockedUntil ? span({ class: "muted", title: "Bloqueo temporal por intentos fallidos" }, "⏳ temporal") : span({ class: "admin-cell muted" }, player.joined ? new Date(player.joined).toLocaleDateString() : "—")),
    span({ class: "admin-cell muted" }, `${solves} solve${solves === 1 ? "" : "s"}`),
    div({ class: "admin-row-actions" }, [
      button({
        class: "ghost-action",
        type: "button",
        title: `Emitir una contraseña temporal para ${player.name || player.handle}`,
        onclick: () => adminResetPassword(player.playerId, player.name || player.handle)
      }, "Reset clave"),
      button({
        class: "ghost-action",
        type: "button",
        title: isSelf ? "No puedes bloquear tu propia cuenta." : (player.locked ? "Desbloquear la cuenta" : "Bloquear la cuenta"),
        disabled: isSelf,
        onclick: () => adminToggleLock(player)
      }, player.locked ? "Desbloquear" : "Bloquear"),
      button({
        class: "danger-action",
        type: "button",
        title: isSelf ? "No puedes eliminar tu propia cuenta." : `Eliminar la cuenta de ${player.name || player.handle}`,
        disabled: isSelf,
        onclick: () => deleteAccount(player.playerId, player.name || player.handle)
      }, "Eliminar")
    ])
  ]);
}

function theoryView() {
  return div({ class: "theory-page" }, [
    div({ class: "section-head" }, [div({}, [h("p", { class: "eyebrow" }, "material de apoyo"), h("h2", {}, "Teoría"), h("p", { class: "muted" }, "6 módulos con los fundamentos que respaldan cada reto. El contenido detallado de cada tema se irá completando.")])]),
    div({ class: "theory-modules" }, theoryModules.map(theoryModuleCard))
  ]);
}

function theoryModuleCard(module) {
  const open = app.theoryOpen === module.id;
  return div({ class: `theory-module panel ${open ? "open" : ""}` }, [
    div({ class: "theory-module-head", onclick: () => { app.theoryOpen = open ? null : module.id; render(); } }, [
      div({}, [h("p", { class: "eyebrow" }, `Módulo ${module.id}`), h("h3", {}, module.title)]),
      span({ class: "theory-caret", "aria-hidden": "true" }, open ? "−" : "+")
    ]),
    open && moduleMissions[module.id] ? moduleProgressStrip(module.id) : null,
    open ? div({ class: "theory-topics" }, module.topics.map(topic => theoryTopicRow(topic))) : null,
    open && moduleMissions[module.id] ? moduleMissionRow(module.id) : null
  ]);
}

function theoryTopicRow(topic) {
  const lessonId = topicLessons[topic];
  if (!lessonId) return div({ class: "theory-topic" }, [span({ class: "topic-dot", "aria-hidden": "true" }, ""), span({}, topic)]);
  const done = Boolean(app.lessonProgress[lessonId]?.completed);
  return button({ class: "theory-topic theory-topic-lesson", onclick: () => startLesson(lessonId) }, [
    span({ class: "topic-dot", "aria-hidden": "true" }, ""),
    span({}, topic),
    done ? span({ class: "lesson-done-badge" }, "✓ Completado") : span({ class: "lesson-cta" }, "Lección interactiva →")
  ]);
}

function shuffleIds(ids) {
  const copy = ids.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Arranca (o reinicia) una lección: prepara el estado de práctica según su
// tipo (order | match), limpia el estado del quiz, y navega a la vista
// dedicada de la lección. El "learn" (video o por pasos) no necesita estado
// previo más allá de empezar desde el principio.
function startLesson(lessonId) {
  const lesson = lessons[lessonId];
  if (!lesson) return;
  const base = {
    id: lessonId,
    stage: "learn",
    videoDone: false,
    stepIndex: 0,
    stepSelections: {},
    stepChecks: {},
    attempts: 0,
    practiceSolved: false,
    revealNumbers: false,
    practiceFeedback: null,
    quizIndex: 0,
    quizAnswers: {},
    quizChecked: {}
  };
  const practiceType = lesson.mission ? (lesson.missionType || "mission") : lesson.practice.type;
  if (m3PracticeInits[practiceType]) {
    Object.assign(base, m3PracticeInits[practiceType](lesson));
  } else if (practiceType === "match") {
    const ids = lesson.practice.pairs.map(pair => pair.id);
    base.leftOrder = shuffleIds(ids);
    base.rightOrder = shuffleIds(ids);
    base.matched = [];
    base.selectedLeft = null;
  } else if (practiceType === "build-network") {
    base.placements = {};
    base.activeDevice = null;
  } else if (practiceType === "classify") {
    base.classified = {};
  } else if (practiceType === "channel-assign") {
    base.assignments = Object.fromEntries(lesson.practice.aps.map(ap => [ap.id, lesson.practice.channels[0]]));
    base.triedConfigs = [];
  } else {
    base.order = shuffleIds(lesson.practice.cards.map(card => card.id));
  }
  app.lesson = base;
  app.theoryOpen = lesson.moduleId;
  switchTab("lesson");
}

function backToTheory() {
  if (app.lesson) app.theoryOpen = lessons[app.lesson.id]?.moduleId ?? app.theoryOpen;
  switchTab("teoria");
}

// ---------------------------------------------------------------------------
// Lección interactiva: Aprender (video o por pasos) → Practicar (ordenar o
// relacionar) → Comprobar (quiz). Cada etapa despacha según el tipo que
// declara la lección, para poder reutilizar el mismo motor en todos los
// temas de teoría sin repetir la estructura de navegación/progreso.
// ---------------------------------------------------------------------------

function lessonView() {
  const state = app.lesson;
  const lesson = state && lessons[state.id];
  if (!state || !lesson) return div({ class: "lesson-page" }, [h("p", { class: "muted" }, "Selecciona una lección desde Teoría."), button({ class: "ghost-action", onclick: () => switchTab("teoria") }, "← Volver a Teoría")]);
  const moduleTitle = theoryModules.find(module => module.id === lesson.moduleId)?.title || "";
  const header = div({ class: "lesson-header" }, [
    button({ class: "ghost-action back-action", onclick: backToTheory }, "← Volver a Teoría"),
    h("p", { class: "eyebrow" }, `Módulo ${lesson.moduleId} · ${moduleTitle}`),
    h("h2", {}, lesson.title),
    lesson.subtitle ? h("p", { class: "lesson-subtitle" }, lesson.subtitle) : null,
    moduleMissions[lesson.moduleId] ? moduleTrack(lesson) : null
  ]);
  if (lesson.mission) return div({ class: "lesson-page auth-lab" }, [header, (missionViews[lesson.missionType] || missionView)(lesson, state)]);
  return div({ class: `lesson-page ${lesson.labTheme ? "auth-lab" : ""}` }, [
    header,
    lessonStepper(state.stage),
    state.stage === "learn" ? lessonLearnStage(lesson, state)
      : state.stage === "practice" ? lessonPracticeStage(lesson, state)
      : state.stage === "quiz" ? lessonQuizStage(lesson, state)
      : lessonCompleteStage(lesson, state)
  ]);
}

function lessonStepper(stage) {
  const steps = [{ id: "learn", label: "Aprender" }, { id: "practice", label: "Practicar" }, { id: "quiz", label: "Comprobar" }, { id: "done", label: "Completado" }];
  const order = { learn: 0, practice: 1, quiz: 2, done: 3 };
  const current = order[stage] ?? 0;
  const percent = Math.round((current / (steps.length - 1)) * 100);
  return div({ class: "lesson-stepper" }, [
    div({ class: "lesson-steps" }, steps.map((step, index) => {
      const isLast = index === steps.length - 1;
      const icon = isLast ? (stage === "done" ? "✓" : "🏆") : index < current ? "✓" : String(index + 1).padStart(2, "0");
      return div({ class: `lesson-step ${index < current ? "done" : index === current ? "active" : ""}` }, [span({ class: "lesson-step-index" }, icon), span({}, step.label)]);
    })),
    div({ class: "lesson-progress-track" }, [div({ class: "lesson-progress-bar", style: { width: `${percent}%` } }, [])])
  ]);
}

// Despacha según el formato de "aprender" que declare la lección: video
// (Four-Way Handshake, sin cambios) o una secuencia de pasos cortos (el
// formato por defecto para temas nuevos, ver lessonLearnStepsStage).
function lessonLearnStage(lesson, state) {
  return lesson.videoSrc ? lessonLearnVideoStage(lesson, state) : lessonLearnStepsStage(lesson, state);
}

function lessonLearnVideoStage(lesson, state) {
  return div({ class: "lesson-stage lesson-learn" }, [
    h("p", { class: "eyebrow" }, "🎬 Aprender"),
    div({ class: "lesson-video-frame" }, [
      h("video", {
        id: "lesson-video", class: "lesson-video", src: lesson.videoSrc, controls: true, playsinline: true, preload: "metadata",
        onloadedmetadata: e => updateLessonVideoProgress(e.target),
        ontimeupdate: e => updateLessonVideoProgress(e.target),
        onended: markLessonVideoDone
      }, [])
    ]),
    div({ class: "lesson-video-progress" }, [div({ id: "lesson-video-bar", class: "lesson-video-bar" }, [])]),
    h("p", { class: "lesson-objective" }, lesson.objective),
    div({ class: "lesson-concepts" }, [
      h("p", { class: "eyebrow" }, "Conceptos clave"),
      div({ class: "concept-row" }, lesson.concepts.map(concept => div({ class: "concept-chip" }, [h("strong", {}, concept.term), h("small", {}, concept.detail)])))
    ]),
    div({ class: "lesson-actions" }, [
      button({ id: "lesson-continue-btn", class: "primary-action", disabled: !state.videoDone, onclick: () => { app.lesson.stage = "practice"; render(); } }, "Continuar a la práctica →")
    ])
  ]);
}

// Actualiza la barra de progreso del video escribiendo el DOM directamente
// (sin llamar a render()), igual que el estado de la terminal: si
// re-renderizáramos en cada "timeupdate" el <video> se recrearía y la
// reproducción se reiniciaría constantemente.
function updateLessonVideoProgress(videoEl) {
  const bar = document.getElementById("lesson-video-bar");
  if (bar && videoEl.duration) bar.style.width = `${Math.min(100, (videoEl.currentTime / videoEl.duration) * 100)}%`;
  if (app.lesson && !app.lesson.videoDone && videoEl.duration && videoEl.currentTime / videoEl.duration >= 0.97) markLessonVideoDone();
}

function markLessonVideoDone() {
  if (!app.lesson || app.lesson.videoDone) return;
  app.lesson.videoDone = true;
  const bar = document.getElementById("lesson-video-bar");
  if (bar) bar.style.width = "100%";
  const btn = document.getElementById("lesson-continue-btn");
  if (btn) btn.disabled = false;
}

// ---------------------------------------------------------------------------
// "Aprender" por pasos (sin video): una etapa corta a la vez — concepto +
// explicación + un elemento visual + una pregunta de observación que no
// bloquea el avance — con navegación Atrás/Siguiente y barra de progreso
// propia. Es el formato por defecto para los temas nuevos de teoría.
// ---------------------------------------------------------------------------
function lessonLearnStepsStage(lesson, state) {
  const steps = lesson.learn.steps;
  const index = Math.min(state.stepIndex, steps.length - 1);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const percent = Math.round(((index + 1) / steps.length) * 100);
  return div({ class: "lesson-stage lesson-learn lesson-learn-steps" }, [
    h("p", { class: "eyebrow" }, "🎬 Aprender"),
    div({ class: "learn-step-progress" }, [
      span({ class: "muted tight" }, `Paso ${index + 1} de ${steps.length}`),
      div({ class: "learn-step-track" }, [div({ class: "learn-step-bar", style: { width: `${percent}%` } }, [])])
    ]),
    div({ class: "learn-step-card panel" }, [
      step.link ? div({ class: "m3-link" }, [span({ class: "m3-link-icon", "aria-hidden": "true" }, "🔗"), span({}, step.link)]) : null,
      h("h3", { class: "learn-step-concept" }, step.concept),
      h("p", { class: "learn-step-explanation" }, step.explanation),
      step.visual ? div({ class: "learn-step-visual" }, [renderLearnVisual(step.visual, state, index)]) : null,
      step.check ? learnStepCheck(step.check, state, index) : null
    ]),
    div({ class: "lesson-actions learn-step-actions" }, [
      button({ class: "ghost-action", type: "button", disabled: index === 0, onclick: () => { app.lesson.stepIndex = Math.max(0, index - 1); render(); } }, "← Atrás"),
      isLast
        ? button({ class: "primary-action", type: "button", onclick: () => { app.lesson.stage = "practice"; render(); } }, "Continuar a la práctica →")
        : button({ class: "primary-action", type: "button", onclick: () => { app.lesson.stepIndex = index + 1; render(); } }, "Siguiente →")
    ])
  ]);
}

// Micro-pregunta de observación: dos o tres opciones con retroalimentación
// inmediata. A propósito NO bloquea el botón "Siguiente" — es para que el
// estudiante confirme que entendió, no una evaluación (eso es el quiz final).
function learnStepCheck(check, state, stepIndex) {
  const answered = state.stepChecks[stepIndex];
  return div({ class: "lv-check" }, [
    h("p", { class: "lv-check-prompt" }, check.prompt),
    div({ class: "lv-check-options" }, check.options.map((option, index) => button({
      class: `lv-check-option ${answered === undefined ? "" : index === check.correct ? "correct" : index === answered ? "wrong" : ""}`,
      type: "button",
      disabled: answered !== undefined,
      onclick: () => { app.lesson.stepChecks[stepIndex] = index; render(); }
    }, option))),
    answered !== undefined ? h("p", { class: `lv-check-feedback ${answered === check.correct ? "ok" : "bad"}` }, check.feedback[answered === check.correct ? 0 : 1]) : null
  ]);
}

// Despacha el elemento visual de un paso de "aprender" según su tipo. Son
// las piezas reutilizables para construir el resto de los temas sin repetir
// marcado: list-select, node-cluster, compare-pair e icon-row.
function renderLearnVisual(visual, state, stepIndex) {
  if (visual.type === "list-select") return renderListSelect(visual, state, stepIndex);
  if (visual.type === "node-cluster") return renderNodeCluster(visual, state, stepIndex);
  if (visual.type === "compare-pair") return renderComparePair(visual, state, stepIndex);
  if (visual.type === "icon-row") return renderIconRow(visual);
  if (visual.type === "timeline") return renderTimeline(visual, state, stepIndex);
  if (visual.type === "byte-breakdown") return renderByteBreakdown(visual, state, stepIndex);
  if (visual.type === "channel-spectrum") return renderChannelSpectrumViz(visual, state, stepIndex);
  if (visual.type === "frame-fields") return renderFrameFields(visual, state, stepIndex);
  if (m3LearnVisuals[visual.type]) return m3LearnVisuals[visual.type](visual, state, stepIndex);
  return null;
}

// timeline: nodos en una línea cronológica; tocar uno expande su detalle.
// Varios se pueden abrir a la vez (igual que node-cluster) para comparar.
function renderTimeline(visual, state, stepIndex) {
  const revealed = new Set(state.stepSelections[stepIndex] || []);
  return div({ class: "lv-timeline" }, [
    div({ class: "lv-timeline-track" }, visual.items.map(item => {
      const isOpen = revealed.has(item.id);
      return div({ class: "lv-timeline-item" }, [
        button({
          class: `lv-timeline-dot ${isOpen ? "open" : ""}`,
          type: "button",
          onclick: () => {
            const current = new Set(app.lesson.stepSelections[stepIndex] || []);
            if (current.has(item.id)) current.delete(item.id); else current.add(item.id);
            app.lesson.stepSelections[stepIndex] = Array.from(current);
            render();
          }
        }, item.era),
        isOpen ? div({ class: "lv-timeline-detail" }, [h("strong", {}, item.title), h("p", {}, item.detail)]) : null
      ]);
    }))
  ]);
}

// byte-breakdown: una cadena (p. ej. una MAC) partida en segmentos
// tocables; cada segmento revela su explicación debajo.
function renderByteBreakdown(visual, state, stepIndex) {
  const selected = state.stepSelections[stepIndex];
  const activeGroup = visual.groups.find(group => group.index === selected);
  return div({ class: "lv-bytes" }, [
    div({ class: "lv-bytes-value" }, visual.groups.map((group, i) => h("span", {
      class: `lv-byte ${selected === group.index ? "active" : ""}`,
      role: "button",
      tabindex: "0",
      onclick: () => { app.lesson.stepSelections[stepIndex] = group.index; render(); }
    }, [visual.value.split(":")[i], i < visual.groups.length - 1 ? ":" : ""]))),
    activeGroup ? div({ class: "lv-note" }, [h("strong", {}, activeGroup.label), h("p", {}, activeGroup.detail)]) : (visual.note ? h("p", { class: "muted tight" }, visual.note) : null)
  ]);
}

// channel-spectrum (vista de "aprender", solo exploración): barras que
// representan el ancho de cada red sobre el espectro; tocar una resalta su
// posición y revela con quién se solapa. La versión jugable (con
// asignación real) vive en la práctica "channel-assign".
function renderChannelSpectrumViz(visual, state, stepIndex) {
  const selectedId = state.stepSelections[stepIndex];
  const minCh = Math.min(...visual.channels_axis);
  const maxCh = Math.max(...visual.channels_axis);
  const span = maxCh - minCh + 1;
  const selectedNet = visual.networks.find(net => net.id === selectedId);
  const overlapping = selectedNet ? visual.networks.filter(net => net.id !== selectedNet.id && Math.abs(net.channel - selectedNet.channel) < visual.overlapThreshold) : [];
  return div({ class: "lv-spectrum" }, [
    div({ class: "lv-spectrum-axis" }, [
      ...visual.networks.map(net => {
        const leftPct = ((net.channel - visual.overlapThreshold / 2 - minCh) / span) * 100;
        const widthPct = (visual.overlapThreshold / span) * 100;
        const isSelected = selectedId === net.id;
        const isOverlapped = overlapping.some(n => n.id === net.id);
        return button({
          class: `lv-spectrum-band ${isSelected ? "selected" : ""} ${isOverlapped ? "overlap" : ""}`,
          type: "button",
          style: { left: `${Math.max(0, leftPct)}%`, width: `${widthPct}%` },
          onclick: () => { app.lesson.stepSelections[stepIndex] = net.id; render(); }
        }, net.label);
      })
    ]),
    div({ class: "lv-spectrum-ticks" }, visual.channels_axis.filter((_, i) => i % 2 === 0).map(ch => span < 0 ? null : h("span", {}, String(ch)))),
    selectedNet ? h("p", { class: "muted tight" }, overlapping.length
      ? `${selectedNet.label} (canal ${selectedNet.channel}) se solapa con: ${overlapping.map(n => n.label).join(", ")}.`
      : `${selectedNet.label} (canal ${selectedNet.channel}) no se solapa con ninguna otra red mostrada.`) : (visual.note ? h("p", { class: "muted tight" }, visual.note) : null)
  ]);
}

// frame-fields: barra segmentada que representa una trama; cada campo es
// tocable y revela su función.
function renderFrameFields(visual, state, stepIndex) {
  const selectedId = state.stepSelections[stepIndex];
  const activeField = visual.fields.find(field => field.id === selectedId);
  return div({ class: "lv-frame" }, [
    h("p", { class: "muted tight" }, visual.frameLabel),
    div({ class: "lv-frame-bar" }, visual.fields.map(field => button({
      class: `lv-frame-field ${selectedId === field.id ? "active" : ""}`,
      type: "button",
      style: { flexGrow: field.width },
      onclick: () => { app.lesson.stepSelections[stepIndex] = field.id; render(); }
    }, field.label))),
    activeField ? div({ class: "lv-note" }, [h("strong", {}, activeField.label), h("p", {}, activeField.detail)]) : (visual.note ? h("p", { class: "muted tight" }, visual.note) : null)
  ]);
}

// list-select: lista de opciones; tocar una revela una nota corta debajo.
function renderListSelect(visual, state, stepIndex) {
  const selectedId = state.stepSelections[stepIndex];
  const selectedItem = visual.items.find(item => item.id === selectedId);
  return div({ class: "lv-list" }, [
    visual.prompt ? h("p", { class: "muted tight" }, visual.prompt) : null,
    div({ class: "lv-list-items" }, visual.items.map(item => button({
      class: `lv-list-item ${selectedId === item.id ? "active" : ""}`,
      type: "button",
      onclick: () => { app.lesson.stepSelections[stepIndex] = item.id; render(); }
    }, item.label))),
    selectedItem ? div({ class: "lv-note" }, [h("p", {}, selectedItem.note)]) : null
  ]);
}

// node-cluster: tarjetas tocables (p. ej. varios AP) que revelan un detalle
// cada una al tocarlas; se pueden abrir varias a la vez para comparar.
function renderNodeCluster(visual, state, stepIndex) {
  const revealed = new Set(state.stepSelections[stepIndex] || []);
  return div({ class: "lv-cluster" }, [
    div({ class: "lv-cluster-nodes" }, visual.nodes.map(node => {
      const isOpen = revealed.has(node.id);
      return button({
        class: `lv-node ${isOpen ? "open" : ""}`,
        type: "button",
        onclick: () => {
          const current = new Set(app.lesson.stepSelections[stepIndex] || []);
          if (current.has(node.id)) current.delete(node.id); else current.add(node.id);
          app.lesson.stepSelections[stepIndex] = Array.from(current);
          render();
        }
      }, [
        h("strong", {}, node.label),
        node.sublabel ? h("small", {}, node.sublabel) : null,
        isOpen && node.detail ? h("p", { class: "lv-node-detail" }, node.detail) : null
      ]);
    })),
    visual.note ? h("p", { class: "muted tight" }, visual.note) : null
  ]);
}

// compare-pair: dos columnas lado a lado con un botón para resaltar en qué
// filas difieren (mismo índice de fila en ambas columnas).
function renderComparePair(visual, state, stepIndex) {
  const highlighted = Boolean(state.stepSelections[stepIndex]);
  return div({ class: "lv-compare" }, [
    div({ class: "lv-compare-cols" }, [
      compareColumn(visual.left, visual.right, highlighted),
      compareColumn(visual.right, visual.left, highlighted)
    ]),
    button({
      class: "ghost-action compact",
      type: "button",
      onclick: () => { app.lesson.stepSelections[stepIndex] = !highlighted; render(); }
    }, highlighted ? "Ocultar diferencias" : "Resaltar diferencias")
  ]);
}

function compareColumn(column, other, highlighted) {
  return div({ class: "lv-compare-col" }, [
    h("strong", {}, column.title),
    div({}, column.rows.map((row, index) => div({
      class: `lv-compare-row ${highlighted && other.rows[index] && other.rows[index].value !== row.value ? "diff" : ""}`
    }, [span({ class: "muted tight" }, row.label), span({}, row.value)])))
  ]);
}

// icon-row: fila de resumen (icono + término + descripción corta), sin
// interacción — pensada para el último paso de cada lección a modo de recap.
function renderIconRow(visual) {
  return div({ class: "lv-icon-row" }, visual.items.map(item => div({ class: "lv-icon-item" }, [
    span({ class: "lv-icon", "aria-hidden": "true" }, item.icon),
    h("strong", {}, item.label),
    h("small", {}, item.caption)
  ])));
}

// Despacha según el tipo de práctica: "match" (relacionar pares) o el valor
// por defecto "order" (ordenar tarjetas, el mecanismo original del Four-Way
// Handshake). Cada tema nuevo puede elegir el que mejor encaje — ver el
// bloque "IDEAS DE IMPLEMENTACIÓN" del plan de contenido para cuál usar.
// Despacha según el tipo de práctica declarado por la lección. "order" es el
// valor por defecto (Four-Way Handshake); el resto son mecánicas nuevas,
// cada una reutilizable por varios temas con distinta configuración.
function lessonPracticeStage(lesson, state) {
  const type = lesson.practice.type;
  if (type === "match") return lessonPracticeMatchStage(lesson, state);
  if (type === "build-network") return lessonPracticeBuildNetworkStage(lesson, state);
  if (type === "classify") return lessonPracticeClassifyStage(lesson, state);
  if (type === "channel-assign") return lessonPracticeChannelAssignStage(lesson, state);
  if (m3PracticeStages[type]) return m3PracticeStages[type](lesson, state);
  return lessonPracticeOrderStage(lesson, state);
}

function lessonPracticeOrderStage(lesson, state) {
  const practice = lesson.practice;
  const cardsById = Object.fromEntries(practice.cards.map(card => [card.id, card]));
  return div({ class: "lesson-stage lesson-practice" }, [
    h("p", { class: "eyebrow" }, "🧩 Practicar"),
    h("h3", {}, practice.prompt),
    h("p", { class: "muted" }, practice.instructions),
    div({ class: "practice-cards" }, state.order.map((cardId, index) => practiceCard(cardsById[cardId], index, state.order.length, state))),
    div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Intentos: ${state.attempts}`),
      state.practiceSolved
        ? button({ class: "primary-action", onclick: () => { app.lesson.stage = "quiz"; render(); } }, "Continuar al quiz →")
        : button({ class: "primary-action", onclick: checkPractice }, "Comprobar")
    ]),
    state.practiceFeedback === "correct" ? div({ class: "practice-feedback ok" }, [h("strong", {}, "✓ ¡Correcto!"), h("p", {}, practice.success)]) : null,
    state.practiceFeedback === "wrong" ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Casi…"), h("p", {}, practice.hint)]) : null
  ]);
}

function practiceCard(card, index, total, state) {
  return div({ class: `practice-card ${state.revealNumbers ? "revealed" : ""}` }, [
    div({ class: "practice-card-badge" }, state.revealNumbers ? `Mensaje ${card.order}` : "?"),
    div({ class: "practice-card-body" }, [h("strong", {}, card.name), h("p", { class: "muted tight" }, card.detail)]),
    div({ class: "practice-card-controls" }, [
      button({ class: "ghost-action compact", disabled: index === 0, onclick: () => moveCard(index, -1), "aria-label": "Subir" }, "↑"),
      button({ class: "ghost-action compact", disabled: index === total - 1, onclick: () => moveCard(index, 1), "aria-label": "Bajar" }, "↓")
    ])
  ]);
}

function moveCard(index, delta) {
  const order = app.lesson.order;
  const target = index + delta;
  if (target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target], order[index]];
  app.lesson.practiceFeedback = null;
  render();
}

function checkPractice() {
  const lesson = lessons[app.lesson.id];
  const correctOrder = [...lesson.practice.cards].sort((a, b) => a.order - b.order).map(card => card.id);
  app.lesson.attempts += 1;
  const isCorrect = app.lesson.order.every((id, index) => id === correctOrder[index]);
  if (isCorrect) { app.lesson.practiceSolved = true; app.lesson.revealNumbers = true; app.lesson.practiceFeedback = "correct"; }
  else app.lesson.practiceFeedback = "wrong";
  render();
}

// Práctica tipo "relacionar": dos columnas con los mismos ids de pareja. Se
// elige un elemento de la izquierda y después su correspondiente a la
// derecha; la verificación es inmediata (sin botón "Comprobar", a diferencia
// del tipo "order") porque cada clic ya es la respuesta.
function lessonPracticeMatchStage(lesson, state) {
  const practice = lesson.practice;
  const pairsById = Object.fromEntries(practice.pairs.map(pair => [pair.id, pair]));
  return div({ class: "lesson-stage lesson-practice" }, [
    h("p", { class: "eyebrow" }, "🧩 Practicar"),
    h("h3", {}, practice.prompt),
    h("p", { class: "muted" }, practice.instructions),
    div({ class: "match-board" }, [
      div({ class: "match-column" }, state.leftOrder.map(id => matchItem(pairsById[id], "left", id, state))),
      div({ class: "match-column" }, state.rightOrder.map(id => matchItem(pairsById[id], "right", id, state)))
    ]),
    div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Intentos: ${state.attempts}`),
      state.practiceSolved ? button({ class: "primary-action", onclick: () => { app.lesson.stage = "quiz"; render(); } }, "Continuar al quiz →") : null
    ]),
    state.practiceFeedback === "correct" ? div({ class: "practice-feedback ok" }, [h("strong", {}, "✓ ¡Correcto!"), h("p", {}, practice.success)]) : null,
    state.practiceFeedback === "wrong" ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Casi…"), h("p", {}, practice.hint)]) : null
  ]);
}

function matchItem(pair, side, id, state) {
  const isMatched = state.matched.includes(id);
  const isSelected = side === "left" && state.selectedLeft === id;
  return button({
    class: `match-item ${isMatched ? "matched" : ""} ${isSelected ? "selected" : ""}`,
    type: "button",
    disabled: isMatched,
    onclick: () => handleMatchClick(side, id)
  }, side === "left" ? pair.left : pair.right);
}

function handleMatchClick(side, id) {
  const state = app.lesson;
  if (side === "left") {
    state.selectedLeft = state.selectedLeft === id ? null : id;
    state.practiceFeedback = null;
    render();
    return;
  }
  if (!state.selectedLeft) return; // hay que elegir primero un elemento de la izquierda
  state.attempts += 1;
  if (state.selectedLeft === id) {
    state.matched.push(id);
    state.selectedLeft = null;
    state.practiceFeedback = null;
    const lesson = lessons[state.id];
    if (state.matched.length === lesson.practice.pairs.length) {
      state.practiceSolved = true;
      state.practiceFeedback = "correct";
    }
  } else {
    state.selectedLeft = null;
    state.practiceFeedback = "wrong";
  }
  render();
}

// ---------------------------------------------------------------------------
// Práctica "build-network": colocar dispositivos en una o varias zonas (AP).
// Con un solo zone, cualquier colocación vale (demuestra conexión); con
// varias, cada dispositivo puede tener una zone correcta específica para
// validar. Reutilizada por "802.11" (una zona) y "AP y clientes" (dos zonas).
// ---------------------------------------------------------------------------
function lessonPracticeBuildNetworkStage(lesson, state) {
  const practice = lesson.practice;
  const placedIds = new Set(Object.keys(state.placements));
  const pending = practice.devices.filter(device => !placedIds.has(device.id));
  return div({ class: "lesson-stage lesson-practice" }, [
    h("p", { class: "eyebrow" }, "🧩 Practicar"),
    h("h3", {}, practice.prompt),
    h("p", { class: "muted" }, practice.instructions),
    div({ class: "build-devices" }, pending.length
      ? pending.map(device => button({
          class: `build-device ${state.activeDevice === device.id ? "selected" : ""}`,
          type: "button",
          onclick: () => { app.lesson.activeDevice = app.lesson.activeDevice === device.id ? null : device.id; app.lesson.practiceFeedback = null; render(); }
        }, [span({ class: "build-device-icon", "aria-hidden": "true" }, device.icon || "📶"), span({}, device.label)]))
      : [h("p", { class: "muted tight" }, "Todos los dispositivos están ubicados.")]),
    div({ class: "build-zones" }, practice.zones.map(zone => div({ class: "build-zone", onclick: () => handleBuildZoneClick(zone.id) }, [
      h("strong", {}, zone.label),
      div({ class: "build-zone-items" }, practice.devices.filter(device => state.placements[device.id] === zone.id).map(device => span({ class: "build-zone-chip" }, [device.icon || "📶", " ", device.label])))
    ]))),
    div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Intentos: ${state.attempts}`),
      state.practiceSolved ? button({ class: "primary-action", onclick: () => { app.lesson.stage = "quiz"; render(); } }, "Continuar al quiz →") : null
    ]),
    state.practiceFeedback === "correct" ? div({ class: "practice-feedback ok" }, [h("strong", {}, "✓ ¡Red construida!"), h("p", {}, practice.success)]) : null,
    state.practiceFeedback === "wrong" ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Casi…"), h("p", {}, practice.hint)]) : null
  ]);
}

function handleBuildZoneClick(zoneId) {
  const state = app.lesson;
  if (!state.activeDevice) return; // hay que elegir primero un dispositivo
  const lesson = lessons[state.id];
  const device = lesson.practice.devices.find(item => item.id === state.activeDevice);
  state.attempts += 1;
  if (!device.correctZone || device.correctZone === zoneId) {
    state.placements[device.id] = zoneId;
    state.activeDevice = null;
    state.practiceFeedback = null;
    const allPlaced = lesson.practice.devices.every(item => state.placements[item.id]);
    if (allPlaced) { state.practiceSolved = true; state.practiceFeedback = "correct"; }
  } else {
    // Deselecciona al fallar (igual que la mecánica "match"): evita que una
    // segunda zona se acepte "de rebote" sin que el estudiante vuelva a
    // elegir el dispositivo a propósito.
    state.activeDevice = null;
    state.practiceFeedback = "wrong";
  }
  render();
}

// ---------------------------------------------------------------------------
// Práctica "classify": cada tarjeta se clasifica eligiendo una categoría.
// Queda bloqueada (con su explicación) solo al acertar; si falla, se puede
// reintentar en el momento. Reutilizada por "MAC" y "Frames" con categorías
// y tarjetas totalmente distintas.
// ---------------------------------------------------------------------------
function lessonPracticeClassifyStage(lesson, state) {
  const practice = lesson.practice;
  const solvedCount = Object.values(state.classified).filter(entry => entry.correct).length;
  return div({ class: "lesson-stage lesson-practice" }, [
    h("p", { class: "eyebrow" }, "🧩 Practicar"),
    h("h3", {}, practice.prompt),
    h("p", { class: "muted" }, practice.instructions),
    h("p", { class: "muted tight" }, `Clasificadas correctamente: ${solvedCount}/${practice.items.length}`),
    div({ class: "classify-list" }, practice.items.map(item => classifyItemRow(practice, item, state))),
    state.practiceSolved ? div({ class: "practice-footer" }, [button({ class: "primary-action", onclick: () => { app.lesson.stage = "quiz"; render(); } }, "Continuar al quiz →")]) : null,
    state.practiceSolved ? div({ class: "practice-feedback ok" }, [h("strong", {}, "✓ ¡Todo clasificado!"), h("p", {}, practice.success)]) : null
  ]);
}

function classifyItemRow(practice, item, state) {
  const entry = state.classified[item.id];
  const isCorrect = entry?.correct;
  return div({ class: `classify-item ${isCorrect ? "solved" : ""}` }, [
    div({ class: "classify-item-head" }, [h("strong", {}, item.label), item.detail ? h("p", { class: "muted tight" }, item.detail) : null]),
    div({ class: "classify-options" }, practice.categories.map(category => button({
      class: `classify-option ${entry ? (category.id === item.correctCategory ? "correct" : (entry.categoryId === category.id ? "wrong" : "")) : ""}`,
      type: "button",
      disabled: isCorrect,
      onclick: () => handleClassify(item.id, category.id)
    }, category.label))),
    entry ? h("p", { class: `classify-feedback ${isCorrect ? "ok" : "bad"}` }, isCorrect ? item.explain : (item.wrongHint || item.explain)) : null
  ]);
}

function handleClassify(itemId, categoryId) {
  const state = app.lesson;
  const lesson = lessons[state.id];
  const item = lesson.practice.items.find(entry => entry.id === itemId);
  state.attempts += 1;
  const correct = categoryId === item.correctCategory;
  state.classified[itemId] = { categoryId, correct };
  if (correct) {
    const allSolved = lesson.practice.items.every(entry => state.classified[entry.id]?.correct);
    if (allSolved) state.practiceSolved = true;
  }
  render();
}

// ---------------------------------------------------------------------------
// Práctica "channel-assign": asignar un canal a cada AP y observar el
// solapamiento en vivo. Exploratoria (no hay un único canal "correcto"): se
// resuelve en cuanto el estudiante prueba al menos dos configuraciones y
// encuentra una sin solapamientos.
// ---------------------------------------------------------------------------
function channelsOverlap(a, b, threshold) {
  return Math.abs(a - b) < threshold;
}

function overlapCount(assignments, aps, threshold) {
  let count = 0;
  for (let i = 0; i < aps.length; i++) {
    for (let j = i + 1; j < aps.length; j++) {
      if (channelsOverlap(assignments[aps[i].id], assignments[aps[j].id], threshold)) count += 1;
    }
  }
  return count;
}

function lessonPracticeChannelAssignStage(lesson, state) {
  const practice = lesson.practice;
  const overlaps = overlapCount(state.assignments, practice.aps, practice.overlapThreshold);
  return div({ class: "lesson-stage lesson-practice" }, [
    h("p", { class: "eyebrow" }, "🧩 Practicar"),
    h("h3", {}, practice.prompt),
    h("p", { class: "muted" }, practice.instructions),
    div({ class: "channel-assign-list" }, practice.aps.map(ap => div({ class: "channel-assign-row" }, [
      h("strong", {}, ap.label),
      div({ class: "channel-options" }, practice.channels.map(channel => button({
        class: `channel-option ${state.assignments[ap.id] === channel ? "active" : ""}`,
        type: "button",
        onclick: () => handleChannelAssign(ap.id, channel)
      }, String(channel))))
    ]))),
    div({ class: "channel-spectrum-live" }, practice.aps.map(ap => {
      const ch = state.assignments[ap.id];
      const leftPct = ((ch - practice.overlapThreshold / 2 - Math.min(...practice.axis)) / (Math.max(...practice.axis) - Math.min(...practice.axis) + 1)) * 100;
      const widthPct = (practice.overlapThreshold / (Math.max(...practice.axis) - Math.min(...practice.axis) + 1)) * 100;
      return div({ class: "lv-spectrum-band static", style: { left: `${Math.max(0, leftPct)}%`, width: `${widthPct}%` } }, ap.label);
    })),
    div({ class: `channel-overlap-status ${overlaps === 0 ? "ok" : "bad"}` }, overlaps === 0 ? "✓ Sin solapamientos en esta distribución." : `⚠ ${overlaps} par${overlaps === 1 ? "" : "es"} de canales se solapan.`),
    h("p", { class: "muted tight" }, `Configuraciones probadas: ${state.triedConfigs.length}`),
    div({ class: "practice-footer" }, [
      state.practiceSolved ? button({ class: "primary-action", onclick: () => { app.lesson.stage = "quiz"; render(); } }, "Continuar al quiz →") : null
    ]),
    state.practiceSolved ? div({ class: "practice-feedback ok" }, [h("strong", {}, "✓ ¡Buena distribución!"), h("p", {}, practice.success)]) : null
  ]);
}

function handleChannelAssign(apId, channel) {
  const state = app.lesson;
  const lesson = lessons[state.id];
  state.attempts += 1;
  state.assignments[apId] = channel;
  const signature = lesson.practice.aps.map(ap => state.assignments[ap.id]).join("-");
  if (!state.triedConfigs.includes(signature)) state.triedConfigs.push(signature);
  const overlaps = overlapCount(state.assignments, lesson.practice.aps, lesson.practice.overlapThreshold);
  if (state.triedConfigs.length >= 2 && overlaps === 0) state.practiceSolved = true;
  render();
}

function lessonQuizStage(lesson, state) {
  if (state.quizIndex >= lesson.quiz.length) return lessonQuizResults(lesson, state);
  const question = lesson.quiz[state.quizIndex];
  const answered = state.quizChecked[question.id];
  const selected = state.quizAnswers[question.id];
  return div({ class: "lesson-stage lesson-quiz" }, [
    h("p", { class: "eyebrow" }, "🧠 Comprobar"),
    lesson.quizTitle ? h("p", { class: "m3-quiz-title" }, lesson.quizTitle) : null,
    h("p", { class: "muted quiz-count" }, `Pregunta ${state.quizIndex + 1} de ${lesson.quiz.length}`),
    h("h3", {}, question.prompt),
    div({ class: "quiz-options" }, question.options.map((option, index) => {
      const isCorrect = index === question.correct;
      const isSelected = selected === index;
      const cls = !answered ? "" : isCorrect ? "correct" : isSelected ? "wrong" : "";
      return button({ class: `quiz-option ${cls}`, disabled: Boolean(answered), onclick: () => answerQuiz(question, index) }, option);
    })),
    answered ? div({ class: `quiz-feedback ${selected === question.correct ? "ok" : "bad"}` }, [
      h("strong", {}, selected === question.correct ? (lesson.quizOkTitle || "✓ ¡Correcto!") : (lesson.quizWrongTitle || "✗ No es correcto")),
      h("p", {}, question.feedback[selected === question.correct ? 0 : 1])
    ]) : null,
    answered ? div({ class: "lesson-actions" }, [
      button({ class: "primary-action", onclick: nextQuizQuestion }, state.quizIndex === lesson.quiz.length - 1 ? "Ver resultados" : "Siguiente pregunta →")
    ]) : null
  ]);
}

function answerQuiz(question, index) {
  app.lesson.quizAnswers[question.id] = index;
  app.lesson.quizChecked[question.id] = true;
  render();
}

function nextQuizQuestion() {
  app.lesson.quizIndex += 1;
  render();
}

function lessonQuizResults(lesson, state) {
  const total = lesson.quiz.length;
  const correctCount = lesson.quiz.filter(question => state.quizAnswers[question.id] === question.correct).length;
  const percent = Math.round((correctCount / total) * 100);
  const reviewConcepts = [...new Set(lesson.quiz.filter(question => state.quizAnswers[question.id] !== question.correct).map(question => question.concept))];
  return div({ class: "lesson-stage lesson-quiz-results" }, [
    h("p", { class: "eyebrow" }, "🧠 Comprobar"),
    h("h3", {}, `Resultado: ${correctCount}/${total}`),
    h("p", { class: "quiz-percent" }, `${percent}%`),
    reviewConcepts.length
      ? div({ class: "quiz-review" }, [h("p", { class: "muted" }, "Conceptos que deberías repasar:"), div({ class: "concept-row" }, reviewConcepts.map(concept => span({ class: "concept-chip small" }, concept)))])
      : h("p", { class: "muted" }, "¡Dominaste todos los conceptos de esta lección!"),
    div({ class: "lesson-actions" }, [
      button({ class: "ghost-action", onclick: retryQuiz }, "Reintentar quiz"),
      button({ class: "primary-action", onclick: () => finishLesson(lesson, percent) }, "Continuar")
    ])
  ]);
}

function retryQuiz() {
  app.lesson.quizIndex = 0;
  app.lesson.quizAnswers = {};
  app.lesson.quizChecked = {};
  render();
}

function finishLesson(lesson, percent) {
  const xp = Math.round(percent * 0.5) + (app.lesson.practiceSolved ? 10 : 0);
  app.lessonProgress[lesson.id] = { completed: true, percent, xp, attempts: app.lesson.attempts, completedAt: Date.now() };
  app.lesson.stage = "done";
  app.lesson.percent = percent;
  app.lesson.xp = xp;
  saveState();
  syncLessonProgress(lesson.id);
  render();
}

function lessonCompleteStage(lesson, state) {
  if (moduleMissions[lesson.moduleId]) return m3LessonCompleteStage(lesson, state);
  return div({ class: "lesson-stage lesson-complete panel" }, [
    span({ class: "lesson-complete-badge", "aria-hidden": "true" }, "🎉"),
    h("h2", {}, "¡Módulo completado!"),
    h("p", { class: "muted" }, lesson.title),
    div({ class: "lesson-checklist" }, [
      div({}, [span({}, "✓"), span({}, "Aprendizaje completado")]),
      div({}, [span({}, "✓"), span({}, `Práctica completada (${state.attempts} intento${state.attempts === 1 ? "" : "s"})`)]),
      div({}, [span({}, "✓"), span({}, "Evaluación completada")])
    ]),
    h("p", { class: "lesson-score" }, `Puntuación: ${state.percent}%`),
    span({ class: "xp-badge" }, `+${state.xp} XP`),
    h("p", { class: "muted tight" }, "Challenge unlocked: pon esto en práctica analizando capturas de tráfico Wi-Fi en los retos."),
    div({ class: "lesson-actions" }, [
      button({ class: "ghost-action", onclick: () => startLesson(lesson.id) }, "Reiniciar módulo"),
      button({ class: "ghost-action", onclick: backToTheory }, "Volver a Teoría"),
      button({ class: "primary-action", onclick: () => switchTab("retos") }, "Ir a los retos →")
    ])
  ]);
}

// ===========================================================================
// MÓDULO 3 — componentes
// Piezas visuales de "aprender", prácticas y misión final del Módulo 3
// (Autenticación). Se enchufan al motor de lecciones mediante tres registros
// (m3LearnVisuals, m3PracticeStages, m3PracticeInits) para no tocar el
// resto de los tipos existentes. Todas las superficies ".m3-lab" se ven
// oscuras en ambos temas a propósito, como la terminal: representan el
// "laboratorio" donde se observa lo que ocurre detrás de la conexión.
// ===========================================================================

const HS_SHORT = { 1: "ANonce", 2: "SNonce + MIC", 3: "Claves + GTK + MIC", 4: "Confirmación + MIC" };
const M3_TAG_TONES = { ANonce: "nonce", SNonce: "nonce", PTK: "key", GTK: "key", PMK: "key", PMKID: "id", MIC: "mic" };

// Animaciones "de una sola vez": render() reconstruye todo el árbol, así
// que una clase de animación se volvería a reproducir con cualquier clic.
// m3Play marca la animación pendiente y m3Flashing la consume en el render
// siguiente (después queda el estado final, estático).
function m3Play(key) { if (app.lesson) app.lesson.flash = key; }
function m3Flashing(key) {
  if (!app.lesson || app.lesson.flash !== key) return false;
  queueMicrotask(() => { if (app.lesson && app.lesson.flash === key) app.lesson.flash = null; });
  return true;
}

// Arrastrar y soltar (escritorio) + tocar para elegir y tocar para colocar
// (móvil y teclado). Ambos caminos terminan en el mismo handler.
function m3DragProps(kind, id) {
  return {
    draggable: "true",
    ondragstart: event => { event.dataTransfer.setData("text/plain", `${kind}:${id}`); event.dataTransfer.effectAllowed = "move"; }
  };
}

function m3DropProps(onDrop) {
  return {
    ondragover: event => { event.preventDefault(); event.currentTarget.classList.add("drag-over"); },
    ondragleave: event => event.currentTarget.classList.remove("drag-over"),
    ondrop: event => {
      event.preventDefault();
      event.currentTarget.classList.remove("drag-over");
      const [kind, id] = (event.dataTransfer.getData("text/plain") || "").split(":");
      if (kind && id) onDrop(kind, id);
    }
  };
}

function m3Chip(label, tone, extraClass = "") {
  return span({ class: `m3-chip tone-${tone || M3_TAG_TONES[label] || "plain"} ${extraClass}`.trim() }, label);
}

function m3Device(kind) {
  return div({ class: `m3-dev m3-dev-${kind}` }, [
    span({ class: "m3-dev-icon", "aria-hidden": "true" }, kind === "ap" ? "📡" : "💻"),
    h("strong", {}, kind === "ap" ? "AP" : "Cliente")
  ]);
}

// Flecha de un mensaje del handshake: los impares van AP → Cliente.
function m3Arrow(n, label, extra = []) {
  const toClient = n % 2 === 1;
  return div({ class: `m3-arrow ${toClient ? "to-client" : "to-ap"}` }, [
    span({ class: "m3-arrow-label" }, label),
    extra.length ? span({ class: "m3-arrow-extra" }, extra) : null
  ]);
}

function m3Note(title, text, tone = "") {
  return div({ class: `m3-note ${tone}` }, [title ? h("strong", {}, title) : null, text ? h("p", {}, text) : null]);
}

function m3RandomHex(bytes) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, value => value.toString(16).padStart(2, "0")).join("");
}

// "MIC" de juguete: un hash no criptográfico (FNV-1a doble) solo para que la
// simulación sea coherente — mismo contenido → mismo valor; cualquier cambio
// → valor distinto. NO es el algoritmo real del MIC.
function m3SimMic(text) {
  let a = 0x811c9dc5;
  let b = 0x9747b28c;
  for (const char of `kck-demo|${text}`) {
    const code = char.charCodeAt(0);
    a = Math.imul(a ^ code, 16777619);
    b = Math.imul(b ^ code, 2246822519) ^ (b >>> 13);
  }
  return [a >>> 0, b >>> 0].map(value => value.toString(16).padStart(8, "0")).join("").replace(/(.{4})(?!$)/g, "$1 ");
}

function m3Toggle(list, value) {
  return list.includes(value) ? list : [...list, value];
}

// ---------------------------------------------------------------------------
// Progreso del módulo (usa app.lessonProgress, la misma infraestructura de
// XP/compleción que el resto de las lecciones).
// ---------------------------------------------------------------------------
function moduleSequenceInfo(moduleId) {
  const config = moduleMissions[moduleId];
  const done = config.sequence.filter(id => app.lessonProgress[id]?.completed);
  const mission = app.lessonProgress[config.missionId];
  const lessonXp = config.sequence.reduce((sum, id) => sum + (app.lessonProgress[id]?.xp || 0), 0);
  return {
    config,
    doneCount: done.length,
    total: config.sequence.length,
    unlocked: done.length === config.sequence.length,
    missionDone: Boolean(mission?.completed),
    xp: lessonXp + (mission?.xp || 0)
  };
}

function masteryInfo(percent) {
  if (percent >= 90) return { label: "Dominio experto", stars: 3 };
  if (percent >= 70) return { label: "Dominio sólido", stars: 2 };
  return { label: "En progreso", stars: 1 };
}

function masteryStars(percent) {
  const info = masteryInfo(percent);
  return span({ class: "m3-mastery", title: info.label }, [
    span({ class: "m3-stars", "aria-hidden": "true" }, [1, 2, 3].map(n => span({ class: n <= info.stars ? "on" : "off" }, "★"))),
    span({}, info.label)
  ]);
}

function moduleProgressStrip(moduleId) {
  const info = moduleSequenceInfo(moduleId);
  const percent = Math.round(((info.doneCount + (info.missionDone ? 1 : 0)) / (info.total + 1)) * 100);
  return div({ class: "m3-module-progress" }, [
    div({ class: "m3-module-progress-head" }, [
      span({}, `${info.doneCount}/${info.total} lecciones · ${info.missionDone ? "misión completada" : info.unlocked ? "misión desbloqueada" : "misión bloqueada"}`),
      span({ class: "m3-xp-total" }, `${info.xp} XP`)
    ]),
    div({ class: "lesson-progress-track" }, [div({ class: "lesson-progress-bar", style: { width: `${percent}%` } }, [])]),
    h("p", { class: "muted tight" }, "Recorrido sugerido: en el orden de la lista. Cada lección conecta con la siguiente.")
  ]);
}

function moduleMissionRow(moduleId) {
  const info = moduleSequenceInfo(moduleId);
  const mission = lessons[info.config.missionId];
  const badge = mission.badge;
  return button({
    class: `theory-topic theory-topic-lesson m3-mission-row ${info.unlocked ? "" : "locked"}`,
    type: "button",
    disabled: !info.unlocked,
    title: info.unlocked ? "" : "Completa todas las lecciones del módulo para desbloquearla",
    onclick: () => startLesson(info.config.missionId)
  }, [
    span({ class: "m3-mission-icon", "aria-hidden": "true" }, info.unlocked ? "🎯" : "🔒"),
    span({}, [h("strong", {}, mission.title), h("small", { class: "muted" }, " · misión final")]),
    info.missionDone
      ? span({ class: "lesson-done-badge" }, `${badge.icon} ${badge.name}`)
      : info.unlocked
        ? span({ class: "lesson-cta" }, "Iniciar misión →")
        : span({ class: "m3-locked-label" }, `Completa las ${info.total} lecciones (${info.doneCount}/${info.total})`)
  ]);
}

// Mini-mapa del módulo en la cabecera de cada lección: lecciones numeradas
// (✓ si están completas) + la misión final. Permite saltar entre temas.
function moduleTrack(lesson) {
  const info = moduleSequenceInfo(lesson.moduleId);
  const missionId = info.config.missionId;
  return div({ class: "m3-track", "aria-label": "Progreso del módulo" }, [
    ...info.config.sequence.map((id, index) => {
      const done = Boolean(app.lessonProgress[id]?.completed);
      const current = id === lesson.id;
      return button({
        class: `m3-track-dot ${done ? "done" : ""} ${current ? "current" : ""}`,
        type: "button",
        title: `${index + 1}. ${lessons[id].title}${done ? " (completada)" : ""}`,
        disabled: current,
        onclick: () => startLesson(id)
      }, [span({ class: "m3-track-num" }, done && !current ? "✓" : String(index + 1)), span({ class: "m3-track-name" }, lessons[id].title)]);
    }),
    button({
      class: `m3-track-dot mission ${info.missionDone ? "done" : ""} ${lesson.id === missionId ? "current" : ""}`,
      type: "button",
      title: info.unlocked ? lessons[missionId].title : "Misión bloqueada: completa las lecciones",
      disabled: !info.unlocked || lesson.id === missionId,
      onclick: () => startLesson(missionId)
    }, [span({ class: "m3-track-num" }, info.unlocked ? "🎯" : "🔒"), span({ class: "m3-track-name" }, "Misión")])
  ]);
}

// Pantalla de fin de una lección del Módulo 3: además del resumen de
// siempre, muestra el dominio, por qué importa para los retos y la
// "conexión" con el siguiente concepto.
function m3LessonCompleteStage(lesson, state) {
  const info = moduleSequenceInfo(lesson.moduleId);
  const sequence = info.config.sequence;
  const index = sequence.indexOf(lesson.id);
  const nextId = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null;
  const pending = sequence.filter(id => !app.lessonProgress[id]?.completed);
  let nextButton;
  if (nextId) nextButton = button({ class: "primary-action", type: "button", onclick: () => startLesson(nextId) }, `Siguiente: ${lessons[nextId].title} →`);
  else if (info.unlocked) nextButton = button({ class: "primary-action", type: "button", onclick: () => startLesson(info.config.missionId) }, `🎯 ${lessons[info.config.missionId].title} →`);
  else nextButton = button({ class: "primary-action", type: "button", onclick: () => startLesson(pending[0]) }, `Te falta: ${lessons[pending[0]].title} →`);
  return div({ class: "lesson-stage lesson-complete panel m3-complete" }, [
    span({ class: "lesson-complete-badge", "aria-hidden": "true" }, "🔓"),
    h("h2", {}, "¡Lección completada!"),
    h("p", { class: "muted" }, `${lesson.title}${lesson.subtitle ? ` — ${lesson.subtitle}` : ""}`),
    div({ class: "lesson-checklist" }, [
      div({}, [span({}, "✓"), span({}, "Aprendizaje completado")]),
      div({}, [span({}, "✓"), span({}, `Práctica completada (${state.attempts} intento${state.attempts === 1 ? "" : "s"})`)]),
      div({}, [span({}, "✓"), span({}, "Quiz completado")])
    ]),
    h("p", { class: "lesson-score" }, `Puntuación: ${state.percent}%`),
    div({ class: "m3-complete-row" }, [span({ class: "xp-badge" }, `+${state.xp} XP`), masteryStars(state.percent)]),
    h("p", { class: "muted tight" }, `Módulo ${lesson.moduleId}: ${info.doneCount}/${info.total} lecciones completadas`),
    lesson.ctf ? div({ class: "m3-ctf" }, [h("strong", {}, "🎯 Por qué importa en los retos"), h("p", {}, lesson.ctf)]) : null,
    lesson.bridge ? div({ class: "m3-bridge" }, [span({ class: "m3-bridge-label" }, "🔗 Siguiente conexión"), h("p", {}, lesson.bridge), nextButton]) : nextButton,
    div({ class: "lesson-actions" }, [
      button({ class: "ghost-action", type: "button", onclick: () => startLesson(lesson.id) }, "Repetir lección"),
      button({ class: "ghost-action", type: "button", onclick: backToTheory }, "Volver a Teoría")
    ])
  ]);
}

// ---------------------------------------------------------------------------
// Piezas visuales de "aprender"
// ---------------------------------------------------------------------------

// connect-reveal: un panel Wi-Fi con «Conectar»; al pulsarlo se revela la
// conversación de 4 mensajes que ocurre detrás de la conexión.
function renderConnectReveal(visual, state, stepIndex) {
  const connected = state.stepSelections[stepIndex] === "done";
  const animate = connected && m3Flashing(`connect-${stepIndex}`);
  return div({ class: "m3-lab m3-connect" }, [
    div({ class: "m3-wifi-panel" }, [
      span({ class: "m3-wifi-title" }, "📶 Redes Wi-Fi"),
      div({ class: "m3-wifi-row" }, [
        span({ class: "m3-wifi-ssid" }, ["🔒 ", visual.ssid]),
        connected
          ? span({ class: `m3-wifi-status ${animate ? "anim" : ""}` }, "Conectado ✓")
          : button({ class: "primary-action compact", type: "button", onclick: () => { app.lesson.stepSelections[stepIndex] = "done"; m3Play(`connect-${stepIndex}`); render(); } }, "Conectar")
      ])
    ]),
    connected ? div({ class: `m3-behind ${animate ? "anim" : ""}` }, [
      span({ class: "m3-behind-label" }, "Detrás de la conexión"),
      div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "aire"), m3Device("client")]),
      div({ class: "m3-lane" }, [1, 2, 3, 4].map(n => div({ class: "m3-lane-row", style: { animationDelay: `${n * 0.45}s` } }, [m3Arrow(n, `Mensaje ${n}`)]))),
      h("p", { class: "m3-caption" }, "Cuatro mensajes: el Four-Way Handshake. En el siguiente paso inspeccionarás cada uno.")
    ]) : h("p", { class: "m3-caption" }, "Pulsa «Conectar» para observar qué sucede detrás.")
  ]);
}

// hs-explorer: los 4 mensajes como flechas seleccionables. Las siglas de
// cada mensaje solo aparecen al inspeccionarlo (para no saturar).
function renderHsExplorer(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.messages.find(message => message.n === sel.sel);
  const allSeen = visual.messages.every(message => sel.seen.includes(message.n));
  const pick = n => { app.lesson.stepSelections[stepIndex] = { sel: n, seen: m3Toggle(sel.seen, n) }; render(); };
  return div({ class: "m3-lab m3-hs" }, [
    div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "aire"), m3Device("client")]),
    div({ class: "m3-lane" }, visual.messages.map(message => button({
      class: `m3-lane-row m3-hs-row ${sel.sel === message.n ? "active" : ""} ${sel.seen.includes(message.n) ? "seen" : ""}`,
      type: "button",
      "aria-pressed": sel.sel === message.n ? "true" : "false",
      onclick: () => pick(message.n)
    }, [m3Arrow(message.n, `Mensaje ${message.n}`, sel.seen.includes(message.n) ? message.tags.map(tag => m3Chip(tag)) : [])]))),
    active
      ? div({ class: "m3-note" }, [
          h("strong", {}, `Mensaje ${active.n} · ${active.n % 2 ? "AP → Cliente" : "Cliente → AP"}`),
          h("p", { class: "m3-note-title" }, active.title),
          h("p", {}, active.detail)
        ])
      : h("p", { class: "m3-caption" }, visual.note || "Toca un mensaje para inspeccionarlo."),
    allSeen && visual.summary ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.summary)]) : h("p", { class: "m3-caption small" }, `Inspeccionados: ${sel.seen.length}/${visual.messages.length}`)
  ]);
}

// video: integra el video existente del Four-Way Handshake con un antes
// ("Observa…") y un después ("Ahora comprueba…") que aparece al terminar.
// La barra se actualiza escribiendo el DOM directamente (nunca render()),
// para no recrear el <video> mientras se reproduce.
function renderM3Video(visual, state, stepIndex) {
  const watched = Boolean(state.stepSelections[stepIndex]);
  const reveal = () => {
    if (!app.lesson) return;
    app.lesson.stepSelections[stepIndex] = true;
    const after = document.getElementById("m3-video-after");
    if (after) after.hidden = false;
    const bar = document.getElementById("lesson-video-bar");
    if (bar) bar.style.width = "100%";
  };
  const onTime = event => {
    const video = event.target;
    const bar = document.getElementById("lesson-video-bar");
    if (bar && video.duration) bar.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
    if (video.duration && video.currentTime / video.duration >= 0.97) reveal();
  };
  return div({ class: "m3-video" }, [
    h("p", { class: "m3-video-cue" }, ["▶ ", visual.before]),
    div({ class: "lesson-video-frame" }, [
      h("video", { id: "lesson-video", class: "lesson-video", src: visual.src, controls: true, playsinline: true, preload: "metadata", ontimeupdate: onTime, onended: reveal }, [])
    ]),
    div({ class: "lesson-video-progress" }, [div({ id: "lesson-video-bar", class: "lesson-video-bar", style: { width: watched ? "100%" : "0%" } }, [])]),
    h("p", { id: "m3-video-after", class: "m3-video-cue after", hidden: !watched }, ["✓ ", visual.after, " Continúa al siguiente paso →"])
  ]);
}

// hs-recall: línea de tiempo 1-2-3-4; para "abrir" cada paso hay que
// responder quién lo envía. Al completar los 4, aparece el resumen animado.
function renderHsRecall(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, done: [], wrong: null };
  const active = visual.items.find(item => item.n === sel.sel);
  const allDone = visual.items.every(item => sel.done.includes(item.n));
  const animate = allDone && m3Flashing(`recall-${stepIndex}`);
  const update = patch => { app.lesson.stepSelections[stepIndex] = { ...sel, ...patch }; };
  const answer = sender => {
    if (sender === active.sender) {
      const done = m3Toggle(sel.done, active.n);
      update({ done, wrong: null });
      if (done.length === visual.items.length) m3Play(`recall-${stepIndex}`);
    } else update({ wrong: active.n });
    render();
  };
  return div({ class: "m3-lab m3-recall" }, [
    div({ class: "m3-timeline" }, visual.items.map(item => button({
      class: `m3-timeline-node ${sel.done.includes(item.n) ? "done" : ""} ${sel.sel === item.n ? "active" : ""}`,
      type: "button",
      onclick: () => { update({ sel: item.n, wrong: null }); render(); }
    }, [span({ class: "m3-timeline-num" }, sel.done.includes(item.n) ? "✓" : String(item.n)), span({ class: "m3-timeline-label" }, `Mensaje ${item.n}`)]))),
    active && !sel.done.includes(active.n) ? div({ class: "m3-recall-ask" }, [
      h("p", { class: "m3-note-title" }, `¿Quién envía el mensaje ${active.n}?`),
      div({ class: "m3-recall-options" }, [
        button({ class: "m3-option", type: "button", onclick: () => answer("ap") }, "📡 El AP"),
        button({ class: "m3-option", type: "button", onclick: () => answer("client") }, "💻 El cliente")
      ]),
      sel.wrong === active.n ? h("p", { class: "m3-hint" }, ["💡 ", active.hint]) : null
    ]) : null,
    active && sel.done.includes(active.n) ? m3Note(`Mensaje ${active.n} · ${active.sender === "ap" ? "AP → Cliente" : "Cliente → AP"}`, active.explain) : null,
    !active ? h("p", { class: "m3-caption" }, "Elige un punto de la línea de tiempo.") : null,
    allDone ? div({ class: `m3-recap ${animate ? "anim" : ""}` }, [
      span({ class: "m3-behind-label" }, "Conversación reconstruida"),
      div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "aire"), m3Device("client")]),
      div({ class: "m3-lane" }, [1, 2, 3, 4].map(n => div({ class: "m3-lane-row", style: { animationDelay: `${n * 0.35}s` } }, [m3Arrow(n, `${n}. ${HS_SHORT[n]}`)])))
    ]) : h("p", { class: "m3-caption small" }, `Reconstruidos: ${sel.done.length}/${visual.items.length}`)
  ]);
}

// flow-chain: origen → proceso → resultado, cada nodo seleccionable.
function renderFlowChain(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.nodes.find(node => node.id === sel.sel);
  const allSeen = visual.nodes.every(node => sel.seen.includes(node.id));
  return div({ class: "m3-lab m3-flow" }, [
    div({ class: "m3-flow-row" }, visual.nodes.flatMap((node, index) => [
      index > 0 ? span({ class: "m3-flow-link", "aria-hidden": "true" }, "→") : null,
      button({
        class: `m3-flow-node tone-${node.tone || "plain"} ${sel.sel === node.id ? "active" : ""} ${sel.seen.includes(node.id) ? "seen" : ""}`,
        type: "button",
        onclick: () => { app.lesson.stepSelections[stepIndex] = { sel: node.id, seen: m3Toggle(sel.seen, node.id) }; render(); }
      }, [h("small", {}, node.sub), h("strong", {}, node.label)])
    ])),
    active ? m3Note(active.label, active.detail) : h("p", { class: "m3-caption" }, "Toca cada etapa de la cadena."),
    allSeen && visual.final ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.final)]) : null
  ]);
}

// auth-scene: AP | aire | Cliente con piezas tocables en cada zona.
function renderAuthScene(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.tokens.find(token => token.id === sel.sel);
  const tokenButton = token => button({
    class: `m3-chip tone-${token.tone || "plain"} m3-token ${sel.sel === token.id ? "active" : ""} ${sel.seen.includes(token.id) ? "seen" : ""}`,
    type: "button",
    onclick: () => { app.lesson.stepSelections[stepIndex] = { sel: token.id, seen: m3Toggle(sel.seen, token.id) }; render(); }
  }, token.label);
  const zone = side => visual.tokens.filter(token => token.side === side).map(tokenButton);
  return div({ class: "m3-lab m3-scene" }, [
    div({ class: "m3-scene-grid" }, [
      div({ class: "m3-scene-col" }, [m3Device("ap"), ...zone("ap")]),
      div({ class: "m3-scene-air" }, [span({ class: "m3-air" }, "aire"), ...zone("air")]),
      div({ class: "m3-scene-col" }, [m3Device("client"), ...zone("client")])
    ]),
    active ? m3Note(active.label, active.detail) : h("p", { class: "m3-caption" }, visual.note || "Toca cada pieza.")
  ]);
}

// key-merge: los componentes de la PTK; al conocerlos todos, se "funden"
// en la PTK con una animación corta.
function renderKeyMerge(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.inputs.find(input => input.id === sel.sel);
  const complete = visual.inputs.every(input => sel.seen.includes(input.id));
  const animate = complete && m3Flashing(`merge-${stepIndex}`);
  return div({ class: "m3-lab m3-merge" }, [
    div({ class: `m3-merge-inputs ${animate ? "anim" : ""}` }, visual.inputs.flatMap((input, index) => [
      index > 0 ? span({ class: "m3-plus", "aria-hidden": "true" }, "+") : null,
      button({
        class: `m3-chip tone-${input.tone} m3-token ${sel.sel === input.id ? "active" : ""} ${sel.seen.includes(input.id) ? "seen" : "dim"}`,
        type: "button",
        onclick: () => {
          const seen = m3Toggle(sel.seen, input.id);
          app.lesson.stepSelections[stepIndex] = { sel: input.id, seen };
          if (seen.length === visual.inputs.length && sel.seen.length < visual.inputs.length) m3Play(`merge-${stepIndex}`);
          render();
        }
      }, input.label)
    ])),
    div({ class: "m3-merge-funnel" }, [span({ "aria-hidden": "true" }, "↓"), span({}, complete ? "derivación" : `${sel.seen.length}/${visual.inputs.length} componentes`), span({ "aria-hidden": "true" }, "↓")]),
    div({ class: `m3-merge-output ${complete ? "ready" : ""} ${animate ? "anim" : ""}` }, complete ? m3Chip(visual.output.label, "key", "big") : span({ class: "m3-chip tone-plain big dim" }, `${visual.output.label} ?`)),
    active ? m3Note(active.label, active.detail) : complete ? m3Note(visual.output.label, visual.output.detail, "ok") : h("p", { class: "m3-caption" }, "Toca cada componente."),
    active && complete ? m3Note(visual.output.label, visual.output.detail, "ok") : null,
    visual.note ? h("p", { class: "m3-caption small" }, visual.note) : null
  ]);
}

// group-net: AP + 3 clientes; mensaje individual (PTK de uno) vs mensaje de
// grupo (GTK de todos), con quién puede leer cada uno.
function renderGroupNet(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { mode: null, tried: [] };
  const animate = sel.mode && m3Flashing(`group-${stepIndex}-${sel.mode}`);
  const target = visual.unicastTarget;
  const send = mode => { app.lesson.stepSelections[stepIndex] = { mode, tried: m3Toggle(sel.tried, mode) }; m3Play(`group-${stepIndex}-${mode}`); render(); };
  const receives = index => sel.mode === "broadcast" || (sel.mode === "unicast" && index === target);
  return div({ class: "m3-lab m3-group" }, [
    div({ class: "m3-group-ap" }, [m3Device("ap"), div({ class: "m3-group-keys" }, [...visual.clients.map((_, index) => m3Chip(`PTK-${index + 1}`, "key", "mini")), m3Chip("GTK", "key", "mini")])]),
    div({ class: `m3-group-beams ${animate ? "anim" : ""}` }, visual.clients.map((_, index) => div({ class: `m3-beam ${receives(index) ? "on" : ""}` }, [
      receives(index) ? span({ class: "m3-packet" }, sel.mode === "broadcast" ? "🔒 GTK" : `🔒 PTK-${target + 1}`) : null
    ]))),
    div({ class: "m3-group-clients" }, visual.clients.map((client, index) => div({ class: `m3-group-client ${sel.mode ? (receives(index) ? "can" : "cannot") : ""}` }, [
      span({ class: "m3-dev-icon", "aria-hidden": "true" }, "💻"),
      h("strong", {}, client),
      div({ class: "m3-group-keys" }, [m3Chip(`PTK-${index + 1}`, "key", "mini"), m3Chip("GTK", "key", "mini")]),
      sel.mode ? span({ class: "m3-group-status" }, receives(index) ? "✓ Puede leerlo" : "✕ No puede leerlo") : null
    ]))),
    div({ class: "m3-actions" }, [
      button({ class: `m3-option ${sel.mode === "unicast" ? "active" : ""}`, type: "button", onclick: () => send("unicast") }, `👤 Enviar solo a ${visual.clients[target]}`),
      button({ class: `m3-option ${sel.mode === "broadcast" ? "active" : ""}`, type: "button", onclick: () => send("broadcast") }, "👥 Enviar a todos (broadcast)")
    ]),
    sel.mode === "unicast" ? m3Note("Tráfico individual → PTK", `El AP cifra con la PTK de ${visual.clients[target]}: solo ese cliente la tiene, solo él puede leerlo.`) : null,
    sel.mode === "broadcast" ? m3Note("Tráfico de grupo → GTK", "El AP cifra una sola vez con la GTK: todos los clientes la tienen, todos pueden leerlo.", "ok") : null,
    !sel.mode ? h("p", { class: "m3-caption" }, "Elige un tipo de envío.") : sel.tried.length < 2 ? h("p", { class: "m3-caption small" }, "Prueba también el otro tipo de envío y compara.") : null
  ]);
}

// nonce-gen: cada lado genera nonces aleatorios (en el navegador); el
// historial muestra que nunca se repiten.
function renderNonceGen(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { a: [], s: [] };
  const generate = side => {
    const value = `${m3RandomHex(4)} ${m3RandomHex(2)} … ${m3RandomHex(2)}`;
    app.lesson.stepSelections[stepIndex] = { ...sel, [side]: [value, ...sel[side]].slice(0, 4) };
    m3Play(`nonce-${stepIndex}-${side}`);
    render();
  };
  const column = (side, device, label) => {
    const animate = m3Flashing(`nonce-${stepIndex}-${side}`);
    return div({ class: "m3-nonce-col" }, [
      m3Device(device),
      button({ class: "m3-option", type: "button", onclick: () => generate(side) }, `🎲 Generar ${label}`),
      div({ class: "m3-nonce-list" }, sel[side].length
        ? sel[side].map((value, index) => div({ class: `m3-nonce-value ${index === 0 ? "latest" : "old"} ${index === 0 && animate ? "anim" : ""}` }, [span({ class: "m3-nonce-tag" }, index === 0 ? label : "usado"), h("code", {}, value)]))
        : [h("p", { class: "m3-caption small" }, "Sin valores todavía.")])
    ]);
  };
  const total = sel.a.length + sel.s.length;
  return div({ class: "m3-lab m3-noncegen" }, [
    div({ class: "m3-nonce-grid" }, [column("a", "ap", "ANonce"), column("s", "client", "SNonce")]),
    total >= 3 ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, "Ningún valor se repite: cada handshake usa nonces nuevos.")]) : h("p", { class: "m3-caption small" }, "Genera al menos tres valores en total."),
    h("p", { class: "m3-caption small" }, "Valores ilustrativos generados al azar en tu navegador (un nonce real mide 32 bytes).")
  ]);
}

// mic-sim: emisor → aire → receptor. El receptor recalcula el MIC con la
// misma clave; si el mensaje cambió en el camino, no coincide.
const M3_MIC_MESSAGE = ["Mensaje 2 · Cliente → AP", "SNonce: c84d 21e9 … 0a35", "Replay Counter: 1"];
function renderMicSim(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { mode: null, tried: [] };
  const animate = sel.mode && m3Flashing(`mic-${stepIndex}-${sel.mode}`);
  const sentMic = m3SimMic(M3_MIC_MESSAGE.join("|"));
  const received = sel.mode === "bad" ? [M3_MIC_MESSAGE[0], M3_MIC_MESSAGE[1], "Replay Counter: 9"] : M3_MIC_MESSAGE;
  const recalculated = m3SimMic(received.join("|"));
  const ok = recalculated === sentMic;
  const send = mode => { app.lesson.stepSelections[stepIndex] = { mode, tried: m3Toggle(sel.tried, mode) }; m3Play(`mic-${stepIndex}-${mode}`); render(); };
  return div({ class: "m3-lab m3-micsim" }, [
    div({ class: "m3-mic-grid" }, [
      div({ class: "m3-mic-card" }, [
        span({ class: "m3-behind-label" }, "Emisor"),
        div({ class: "m3-mic-lines" }, M3_MIC_MESSAGE.map(line => h("code", {}, line))),
        span({ class: "m3-mic-formula" }, "MIC = f(mensaje, clave KCK)"),
        div({ class: "m3-mic-value" }, [m3Chip("MIC", "mic", "mini"), h("code", {}, sentMic)])
      ]),
      div({ class: `m3-mic-channel ${animate ? "anim" : ""} ${sel.mode === "bad" ? "tampered" : ""}` }, [
        span({ class: "m3-air" }, "aire"),
        sel.mode ? span({ class: "m3-packet" }, "✉ mensaje + MIC") : span({ class: "m3-caption small" }, "—"),
        sel.mode === "bad" ? span({ class: "m3-tamper" }, "⚠ alguien cambia un campo") : null
      ]),
      div({ class: `m3-mic-card receiver ${sel.mode ? (ok ? "ok" : "bad") : ""}` }, [
        span({ class: "m3-behind-label" }, "Receptor"),
        sel.mode ? div({ class: "m3-mic-lines" }, received.map((line, index) => h("code", { class: line !== M3_MIC_MESSAGE[index] ? "altered" : "" }, line))) : h("p", { class: "m3-caption small" }, "Esperando mensaje…"),
        sel.mode ? div({ class: "m3-mic-value" }, [span({ class: "m3-caption small" }, "Recibido"), h("code", {}, sentMic)]) : null,
        sel.mode ? div({ class: "m3-mic-value" }, [span({ class: "m3-caption small" }, "Recalculado"), h("code", {}, recalculated)]) : null,
        sel.mode ? span({ class: `m3-verdict ${ok ? "ok" : "bad"} ${animate ? "anim" : ""}` }, ok ? "✓ Verificación correcta" : "✕ Verificación fallida") : null
      ])
    ]),
    div({ class: "m3-actions" }, [
      button({ class: `m3-option ${sel.mode === "ok" ? "active" : ""}`, type: "button", onclick: () => send("ok") }, "✉ Enviar intacto"),
      button({ class: `m3-option ${sel.mode === "bad" ? "active" : ""}`, type: "button", onclick: () => send("bad") }, "⚠ Alterar en el camino")
    ]),
    sel.mode === "ok" ? m3Note("Los MIC coinciden", "El contenido llegó igual y el emisor tenía la clave correcta: el mensaje se acepta.", "ok") : null,
    sel.mode === "bad" ? m3Note("Los MIC no coinciden", "Bastó cambiar un número para que el MIC recalculado fuera otro. El receptor descarta el mensaje. Fíjate: el contenido nunca estuvo oculto; el MIC no cifra, verifica.", "bad") : null,
    sel.tried.length < 2 ? h("p", { class: "m3-caption small" }, "Prueba ambas opciones.") : null,
    h("p", { class: "m3-caption small" }, "Simulación: los MIC mostrados se calculan con una función de ejemplo, no con el algoritmo real.")
  ]);
}

const m3LearnVisuals = {
  "connect-reveal": renderConnectReveal,
  "hs-explorer": renderHsExplorer,
  "video": renderM3Video,
  "hs-recall": renderHsRecall,
  "flow-chain": renderFlowChain,
  "auth-scene": renderAuthScene,
  "key-merge": renderKeyMerge,
  "group-net": renderGroupNet,
  "nonce-gen": renderNonceGen,
  "mic-sim": renderMicSim
};

// ---------------------------------------------------------------------------
// Prácticas
// ---------------------------------------------------------------------------
function m3PracticeShell(practice, body, footer) {
  return div({ class: "lesson-stage lesson-practice" }, [
    h("p", { class: "eyebrow" }, "🧩 Practicar"),
    h("h3", {}, practice.prompt),
    practice.instructions ? h("p", { class: "muted" }, practice.instructions) : null,
    body,
    footer
  ]);
}

function m3PracticeFooter(state, extra = null) {
  return div({ class: "practice-footer" }, [
    span({ class: "practice-attempts" }, `Intentos: ${state.attempts}`),
    extra,
    state.practiceSolved ? button({ class: "primary-action", type: "button", onclick: () => { app.lesson.stage = "quiz"; render(); } }, "Continuar al quiz →") : null
  ]);
}

function m3Success(text, title = "✓ ¡Correcto!") {
  return div({ class: "practice-feedback ok" }, [h("strong", {}, title), h("p", {}, text)]);
}

// --- hs-builder: Reconstruye el Handshake --------------------------------
function hsBuilderInit(lesson) {
  const practice = lesson.practice;
  return {
    cardPool: shuffleIds(practice.cards.map(card => card.id)),
    tokenPool: shuffleIds(practice.tokens.map(token => token.id)),
    slots: { 1: {}, 2: {}, 3: {}, 4: {} },
    locked: { 1: {}, 2: {}, 3: {}, 4: {} },
    pick: null,
    hints: [],
    checked: {}
  };
}

function hsBuilderPlace(kind, id, slot) {
  const state = app.lesson;
  const field = kind === "card" ? "card" : "token";
  const poolKey = kind === "card" ? "cardPool" : "tokenPool";
  if (state.locked[slot][field]) return;
  // Si la pieza ya estaba en otra casilla, se mueve; si la casilla tenía
  // otra pieza, esa vuelve a la bandeja.
  Object.values(state.slots).forEach(entry => { if (entry[field] === id) entry[field] = null; });
  const previous = state.slots[slot][field];
  state[poolKey] = state[poolKey].filter(item => item !== id);
  if (previous && previous !== id) state[poolKey].push(previous);
  state.slots[slot][field] = id;
  state.pick = null;
  state.checked[slot] = null;
  render();
}

function hsBuilderUnplace(slot, field) {
  const state = app.lesson;
  if (state.locked[slot][field]) return;
  const id = state.slots[slot][field];
  if (!id) return;
  state[field === "card" ? "cardPool" : "tokenPool"].push(id);
  state.slots[slot][field] = null;
  render();
}

function hsBuilderCheck(practice) {
  const state = app.lesson;
  state.attempts += 1;
  const hints = [];
  [1, 2, 3, 4].forEach(slot => {
    const entry = state.slots[slot];
    const card = practice.cards.find(item => item.id === entry.card);
    const token = practice.tokens.find(item => item.id === entry.token);
    const result = {};
    if (!state.locked[slot].card) {
      if (card && card.slot === slot) state.locked[slot].card = true;
      else if (card) { hints.push(card.hint); state.cardPool.push(card.id); entry.card = null; result.card = "bad"; }
    }
    if (!state.locked[slot].sender) {
      if (entry.sender === practice.senders[slot]) state.locked[slot].sender = true;
      else if (entry.sender) { hints.push(practice.senderHint); entry.sender = null; result.sender = "bad"; }
    }
    if (!state.locked[slot].token) {
      if (token && token.slot === slot) state.locked[slot].token = true;
      else if (token) { hints.push(token.hint); state.tokenPool.push(token.id); entry.token = null; result.token = "bad"; }
    }
    state.checked[slot] = result;
  });
  state.hints = [...new Set(hints)].slice(0, 3);
  const solved = [1, 2, 3, 4].every(slot => state.locked[slot].card && state.locked[slot].sender && state.locked[slot].token);
  if (solved) { state.practiceSolved = true; state.hints = []; m3Play("hs-replay"); }
  render();
}

function hsReplay(animate) {
  return div({ class: `m3-lab m3-recap m3-replay ${animate ? "anim" : ""}` }, [
    span({ class: "m3-behind-label" }, "Handshake completo"),
    div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "aire"), m3Device("client")]),
    div({ class: "m3-lane" }, [1, 2, 3, 4].map(n => div({ class: "m3-lane-row", style: { animationDelay: `${n * 0.5}s` } }, [m3Arrow(n, `${n}. ${HS_SHORT[n]}`)]))),
    div({ class: "m3-replay-end", style: { animationDelay: "2.6s" } }, "🔒 Claves instaladas · comunicación protegida")
  ]);
}

function hsBuilderStage(lesson, state) {
  const practice = lesson.practice;
  const cardsById = Object.fromEntries(practice.cards.map(card => [card.id, card]));
  const tokensById = Object.fromEntries(practice.tokens.map(token => [token.id, token]));
  const allFilled = [1, 2, 3, 4].every(slot => state.slots[slot].card && state.slots[slot].sender && state.slots[slot].token);
  const pickItem = (kind, id) => { app.lesson.pick = app.lesson.pick && app.lesson.pick.id === id ? null : { kind, id }; render(); };
  const dropArea = (slot, field, content, placeholder) => {
    const locked = state.locked[slot][field];
    const wanted = field === "card" ? "card" : "token";
    return div({
      class: `m3-drop ${field} ${content ? "filled" : ""} ${locked ? "locked" : ""} ${state.pick && state.pick.kind === wanted && !locked ? "ready" : ""} ${state.checked[slot]?.[field] === "bad" ? "bad" : ""}`,
      onclick: () => { if (state.pick && state.pick.kind === wanted) hsBuilderPlace(wanted, state.pick.id, slot); },
      ...m3DropProps((kind, id) => { if (kind === wanted) hsBuilderPlace(kind, id, slot); })
    }, content
      ? [content, locked ? span({ class: "m3-lock", "aria-label": "Correcto" }, "✓") : button({ class: "m3-remove", type: "button", "aria-label": "Quitar", onclick: event => { event.stopPropagation(); hsBuilderUnplace(slot, field); } }, "✕")]
      : [span({ class: "m3-drop-placeholder" }, placeholder)]);
  };
  const body = div({ class: "m3-lab m3-builder" }, [
    div({ class: "m3-pool" }, [
      span({ class: "m3-behind-label" }, "Funciones"),
      div({ class: "m3-pool-items cards" }, state.cardPool.length ? state.cardPool.map(id => button({
        class: `m3-fcard ${state.pick?.id === id ? "selected" : ""}`, type: "button", onclick: () => pickItem("card", id), ...m3DragProps("card", id)
      }, cardsById[id].text)) : [h("p", { class: "m3-caption small" }, "Todas las funciones están colocadas.")]),
      span({ class: "m3-behind-label" }, "Elementos"),
      div({ class: "m3-pool-items" }, state.tokenPool.length ? state.tokenPool.map(id => button({
        class: `m3-chip tone-plain m3-token ${state.pick?.id === id ? "selected" : ""}`, type: "button", onclick: () => pickItem("token", id), ...m3DragProps("token", id)
      }, tokensById[id].label)) : [h("p", { class: "m3-caption small" }, "Todos los elementos están colocados.")])
    ]),
    div({ class: "m3-slots" }, [1, 2, 3, 4].map(slot => {
      const entry = state.slots[slot];
      const senderLocked = state.locked[slot].sender;
      const setSender = sender => { if (senderLocked) return; app.lesson.slots[slot].sender = sender; app.lesson.checked[slot] = null; render(); };
      return div({ class: `m3-slot ${state.locked[slot].card && state.locked[slot].sender && state.locked[slot].token ? "solved" : ""}` }, [
        div({ class: "m3-slot-head" }, [
          h("strong", {}, `Mensaje ${slot}`),
          div({ class: `m3-sender ${state.checked[slot]?.sender === "bad" ? "bad" : ""}` }, [
            button({ class: `m3-sender-btn ${entry.sender === "ap" ? "active" : ""}`, type: "button", disabled: senderLocked, onclick: () => setSender("ap") }, "📡 AP → 💻"),
            button({ class: `m3-sender-btn ${entry.sender === "client" ? "active" : ""}`, type: "button", disabled: senderLocked, onclick: () => setSender("client") }, "💻 → 📡 AP")
          ])
        ]),
        dropArea(slot, "card", entry.card ? span({ class: "m3-fcard-text" }, cardsById[entry.card].text) : null, "Suelta o toca para colocar una función"),
        dropArea(slot, "token", entry.token ? m3Chip(tokensById[entry.token].label, "plain") : null, "Elemento principal")
      ]);
    }))
  ]);
  const solvedAnim = state.practiceSolved && m3Flashing("hs-replay");
  return m3PracticeShell(practice, [
    body,
    state.hints.length ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Casi… revisa estas pistas"), ...state.hints.map(hint => h("p", {}, ["💡 ", hint]))]) : null,
    state.practiceSolved ? hsReplay(solvedAnim) : null,
    state.practiceSolved ? m3Success(practice.success) : null
  ], m3PracticeFooter(state, state.practiceSolved
    ? button({ class: "ghost-action compact", type: "button", onclick: () => { m3Play("hs-replay"); render(); } }, "↻ Ver animación")
    : button({ class: "primary-action", type: "button", disabled: !allFilled, title: allFilled ? "" : "Completa función, emisor y elemento en los 4 mensajes", onclick: () => hsBuilderCheck(practice) }, "Comprobar")));
}

// --- identify-match: Encuentra/Identifica + relaciona ---------------------
function identifyMatchInit(lesson) {
  return {
    phase: "identify",
    idWrong: [],
    idLastWrong: null,
    idSolved: false,
    followAnswer: null,
    matched: [],
    selectedLeft: null,
    rightOrder: shuffleIds(lesson.practice.match.pairs.map(pair => pair.id)),
    matchWrong: false,
    lastMatched: null
  };
}

function identifyMatchStage(lesson, state) {
  const practice = lesson.practice;
  const identify = practice.identify;
  const pickItem = item => {
    if (state.idSolved) return;
    app.lesson.attempts += 1;
    if (item.correct) { app.lesson.idSolved = true; app.lesson.idLastWrong = null; m3Play("id-found"); }
    else { app.lesson.idWrong = m3Toggle(app.lesson.idWrong, item.id); app.lesson.idLastWrong = item.id; }
    render();
  };
  const lastWrong = identify.items.find(item => item.id === state.idLastWrong);
  const foundAnim = m3Flashing("id-found");
  const itemClass = item => `${state.idWrong.includes(item.id) ? "wrong" : ""} ${state.idSolved && item.correct ? "found" : ""} ${state.idSolved && item.correct && foundAnim ? "anim" : ""}`;
  const followUp = identify.followUp;
  const followDone = !followUp || state.followAnswer === followUp.correct;

  if (state.phase === "identify") {
    const board = identify.layout === "capture"
      ? div({ class: "m3-lab m3-capture" }, [
          div({ class: "m3-capture-title" }, [span({ "aria-hidden": "true" }, "◉ "), identify.captureTitle]),
          div({ class: "m3-capture-rows" }, identify.items.map(item => button({ class: `m3-capture-row ${itemClass(item)}`, type: "button", disabled: state.idSolved, onclick: () => pickItem(item) }, [span({ class: "m3-capture-key" }, item.label), h("code", {}, item.value)])))
        ])
      : div({ class: "m3-lab m3-idgrid" }, identify.items.map(item => button({ class: `m3-idcard ${itemClass(item)}`, type: "button", disabled: state.idSolved, onclick: () => pickItem(item) }, [
          h("strong", {}, state.idSolved && item.reveal ? `${item.label} · ${item.reveal}` : item.label),
          h("code", {}, item.value),
          h("ul", {}, item.meta.map(line => h("li", {}, line)))
        ])));
    return m3PracticeShell(practice, [
      h("p", { class: "m3-phase" }, ["Fase 1 de 2 · ", identify.prompt]),
      board,
      lastWrong && !state.idSolved ? div({ class: "practice-feedback bad" }, [h("strong", {}, "No es ese"), h("p", {}, ["💡 ", lastWrong.hint])]) : null,
      state.idSolved ? m3Success(identify.success, "✓ ¡Encontrado!") : null,
      state.idSolved && followUp ? div({ class: "lv-check" }, [
        h("p", { class: "lv-check-prompt" }, followUp.prompt),
        div({ class: "lv-check-options" }, followUp.options.map((option, index) => button({
          class: `lv-check-option ${state.followAnswer === null ? "" : index === followUp.correct && state.followAnswer === index ? "correct" : index === state.followAnswer ? "wrong" : ""}`,
          type: "button",
          disabled: followDone,
          onclick: () => { app.lesson.followAnswer = index; app.lesson.attempts += 1; render(); }
        }, option))),
        state.followAnswer !== null ? h("p", { class: `lv-check-feedback ${followDone ? "ok" : "bad"}` }, followUp.feedback[followDone ? 0 : 1] + (followDone ? "" : " Prueba otra opción.")) : null
      ]) : null
    ], m3PracticeFooter(state, state.idSolved && followDone ? button({ class: "primary-action", type: "button", onclick: () => { app.lesson.phase = "match"; render(); } }, "Fase 2: relacionar →") : null));
  }

  const pairsById = Object.fromEntries(practice.match.pairs.map(pair => [pair.id, pair]));
  const clickRight = id => {
    const current = app.lesson;
    if (!current.selectedLeft || current.matched.includes(id)) return;
    current.attempts += 1;
    if (current.selectedLeft === id) {
      current.matched.push(id);
      current.lastMatched = id;
      current.matchWrong = false;
      m3Play(`link-${id}`);
      if (current.matched.length === practice.match.pairs.length) current.practiceSolved = true;
    } else current.matchWrong = true;
    current.selectedLeft = null;
    render();
  };
  return m3PracticeShell(practice, [
    h("p", { class: "m3-phase" }, ["Fase 2 de 2 · ", practice.match.prompt]),
    div({ class: "m3-lab m3-match" }, practice.match.pairs.map((pair, index) => {
      const rightId = state.rightOrder[index];
      const right = pairsById[rightId];
      const leftMatched = state.matched.includes(pair.id);
      const rightMatched = state.matched.includes(rightId);
      return div({ class: "m3-match-row" }, [
        button({
          class: `m3-chip tone-key m3-token ${leftMatched ? "matched" : ""} ${state.selectedLeft === pair.id ? "selected" : ""} ${leftMatched && m3Flashing(`link-${pair.id}`) ? "anim" : ""}`,
          type: "button",
          disabled: leftMatched,
          onclick: () => { app.lesson.selectedLeft = app.lesson.selectedLeft === pair.id ? null : pair.id; app.lesson.matchWrong = false; render(); }
        }, [pair.left, leftMatched ? ` ↔ ${pair.right}` : ""]),
        button({
          class: `m3-match-def ${rightMatched ? "matched" : ""} ${state.selectedLeft && !rightMatched ? "ready" : ""}`,
          type: "button",
          disabled: rightMatched,
          onclick: () => clickRight(rightId)
        }, right.right)
      ]);
    })),
    h("p", { class: "m3-caption small m3-caption-themed" }, state.selectedLeft ? "Ahora toca la descripción que le corresponde." : "Toca un término (izquierda) y después su descripción (derecha)."),
    state.matchWrong ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Casi…"), h("p", {}, ["💡 ", practice.match.hint])]) : null,
    state.practiceSolved ? m3Success(practice.success) : null
  ], m3PracticeFooter(state));
}

// --- slot-builder: Construye la PTK ----------------------------------------
function slotBuilderInit(lesson) {
  return { tileOrder: shuffleIds(lesson.practice.tiles.map(tile => tile.id)), placed: {}, discarded: [], pick: null, hint: null, okNote: null };
}

function slotBuilderDrop(practice, tileId, target) {
  const state = app.lesson;
  const tile = practice.tiles.find(item => item.id === tileId);
  if (!tile || Object.values(state.placed).includes(tileId) || state.discarded.includes(tileId)) return;
  state.attempts += 1;
  state.pick = null;
  if (target === "discard") {
    if (tile.decoy) { state.discarded.push(tileId); state.hint = null; state.okNote = `Bien descartada: ${tile.hint}`; }
    else { state.hint = `«${tile.label}» sí participa en la derivación de la PTK: búscale su lugar en el esquema.`; state.okNote = null; }
  } else {
    const slot = practice.slots.find(item => item.id === target);
    if (state.placed[slot.id]) return;
    if (tile.decoy) { state.hint = tile.hint; state.okNote = null; }
    else if (slot.accepts !== tile.id) { state.hint = `«${tile.label}» sí participa, pero no cumple el papel de «${slot.role}».`; state.okNote = null; }
    else { state.placed[slot.id] = tile.id; state.hint = null; state.okNote = null; }
  }
  const allPlaced = practice.slots.every(slot => state.placed[slot.id]);
  const allDiscarded = practice.tiles.filter(item => item.decoy).every(item => state.discarded.includes(item.id));
  if (allPlaced && allDiscarded && !state.practiceSolved) { state.practiceSolved = true; m3Play("ptk-forge"); }
  render();
}

function slotBuilderStage(lesson, state) {
  const practice = lesson.practice;
  const tilesById = Object.fromEntries(practice.tiles.map(tile => [tile.id, tile]));
  const used = new Set([...Object.values(state.placed), ...state.discarded]);
  const pool = state.tileOrder.filter(id => !used.has(id));
  const allPlaced = practice.slots.every(slot => state.placed[slot.id]);
  const forge = state.practiceSolved && m3Flashing("ptk-forge");
  const target = id => ({
    onclick: () => { if (state.pick) slotBuilderDrop(practice, state.pick, id); },
    ...m3DropProps((kind, tileId) => { if (kind === "tile") slotBuilderDrop(practice, tileId, id); })
  });
  return m3PracticeShell(practice, [
    div({ class: "m3-lab m3-equation" }, [
      span({ class: "m3-behind-label" }, "Piezas disponibles"),
      div({ class: "m3-pool-items" }, pool.length ? pool.map(id => button({
        class: `m3-chip tone-${tilesById[id].tone || "plain"} m3-token ${state.pick === id ? "selected" : ""}`,
        type: "button",
        onclick: () => { app.lesson.pick = app.lesson.pick === id ? null : id; render(); },
        ...m3DragProps("tile", id)
      }, tilesById[id].label)) : [h("p", { class: "m3-caption small" }, "No quedan piezas.")]),
      div({ class: `m3-eq-row ${forge ? "anim" : ""}` }, [
        ...practice.slots.flatMap((slot, index) => [
          index > 0 ? span({ class: "m3-plus", "aria-hidden": "true" }, "+") : null,
          div({ class: `m3-eq-slot ${state.placed[slot.id] ? "filled" : ""} ${state.pick && !state.placed[slot.id] ? "ready" : ""}`, ...target(slot.id) }, [
            h("small", {}, slot.role),
            state.placed[slot.id] ? m3Chip(tilesById[state.placed[slot.id]].label, tilesById[state.placed[slot.id]].tone) : span({ class: "m3-drop-placeholder" }, "?")
          ])
        ]),
        div({ class: "m3-eq-result" }, [
          span({ class: "m3-eq-arrow", "aria-hidden": "true" }, "⇒"),
          div({ class: `m3-eq-out ${state.practiceSolved ? "ready" : ""}` }, state.practiceSolved ? m3Chip(practice.output, "key", "big") : span({ class: "m3-chip tone-plain big dim" }, `${practice.output} ?`))
        ])
      ]),
      div({ class: `m3-discard ${state.pick ? "ready" : ""}`, ...target("discard") }, [
        span({}, "🗑 No participa en la PTK"),
        state.discarded.length ? div({ class: "m3-pool-items" }, state.discarded.map(id => m3Chip(tilesById[id].label, "plain", "struck"))) : null
      ]),
      h("p", { class: "m3-caption small" }, state.pick ? "Ahora toca una casilla del esquema o la papelera." : "Arrastra una pieza, o tócala y luego toca su destino.")
    ]),
    state.hint ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Así no"), h("p", {}, ["💡 ", state.hint])]) : null,
    state.okNote && !state.practiceSolved ? div({ class: "practice-feedback ok" }, [h("p", {}, state.okNote)]) : null,
    allPlaced && !state.practiceSolved ? h("p", { class: "muted tight" }, "Esquema completo. Descarta las piezas que no participan para terminar.") : null,
    state.practiceSolved ? m3Success(practice.success, "✓ ¡PTK construida!") : null
  ], m3PracticeFooter(state));
}

// --- packet-sort: ¿Qué clave corresponde? ----------------------------------
function packetSortInit(lesson) {
  return { queue: shuffleIds(lesson.practice.items.map(item => item.id)), sorted: [], hint: null, okNote: null };
}

function packetSortDrop(practice, binId) {
  const state = app.lesson;
  const item = practice.items.find(entry => entry.id === state.queue[0]);
  if (!item) return;
  state.attempts += 1;
  if ((item.accept || [item.bin]).includes(binId)) {
    state.sorted.push({ id: item.id, bin: binId });
    state.queue = state.queue.slice(1);
    state.hint = null;
    state.okNote = item.explain;
    m3Play(`pkt-${binId}`);
    if (!state.queue.length) state.practiceSolved = true;
  } else {
    state.hint = item.hint || practice.hints[item.bin];
    state.okNote = null;
  }
  render();
}

function packetSortStage(lesson, state) {
  const practice = lesson.practice;
  const current = practice.items.find(item => item.id === state.queue[0]);
  const number = state.sorted.length + 1;
  return m3PracticeShell(practice, [
    div({ class: "m3-lab m3-sorter" }, [
      div({ class: "m3-sorter-progress" }, [
        span({}, `${practice.countLabel || "Paquetes clasificados"}: ${state.sorted.length}/${practice.items.length}`),
        div({ class: "lesson-progress-track" }, [div({ class: "lesson-progress-bar", style: { width: `${(state.sorted.length / practice.items.length) * 100}%` } }, [])])
      ]),
      current ? div({ class: `m3-packet-card ${state.hint ? "shake" : ""}`, ...m3DragProps("packet", current.id) }, [
        span({ class: "m3-behind-label" }, `${practice.itemLabel || "📦 Paquete"} ${number}`),
        current.icon ? span({ class: "bt-sort-icon", "aria-hidden": "true" }, current.icon) : null,
        h("p", {}, current.text),
        span({ class: "m3-caption small" }, "Arrástralo o toca un compartimento.")
      ]) : div({ class: "m3-packet-card done" }, [h("p", {}, "✓ Todos los paquetes clasificados.")]),
      div({ class: "m3-bins" }, practice.bins.map(bin => button({
        class: `m3-bin bin-${bin.id} ${m3Flashing(`pkt-${bin.id}`) ? "anim" : ""}`,
        type: "button",
        disabled: !current,
        onclick: () => packetSortDrop(practice, bin.id),
        ...m3DropProps(kind => { if (kind === "packet") packetSortDrop(practice, bin.id); })
      }, [
        span({ class: "m3-bin-icon", "aria-hidden": "true" }, bin.icon),
        h("strong", {}, [practice.binPrefix ?? "🔒 ", bin.label]),
        h("small", {}, bin.caption),
        span({ class: "m3-bin-count" }, String(state.sorted.filter(entry => entry.bin === bin.id).length))
      ])))
    ]),
    state.hint ? div({ class: "practice-feedback bad" }, [h("strong", {}, practice.wrongTitle || "Esa no es la clave"), h("p", {}, ["💡 ", state.hint])]) : null,
    state.okNote && !state.practiceSolved ? div({ class: "practice-feedback ok" }, [practice.okTitle ? h("strong", {}, practice.okTitle) : null, h("p", {}, [practice.okTitle ? "" : "✓ ", state.okNote])]) : null,
    state.practiceSolved ? m3Success(practice.success, "✓ ¡Clasificación completa!") : null
  ], m3PracticeFooter(state));
}

// --- nonce-hunt: Encuentra los Nonces ---------------------------------------
function nonceHuntInit() {
  return { phase: "fields", marked: [], fieldResult: null, placed: {}, pick: null, hint: null };
}

function nonceHuntCheck(practice) {
  const state = app.lesson;
  state.attempts += 1;
  const items = practice.fields.items;
  const falsePositives = items.filter(item => !item.isNonce && state.marked.includes(item.id));
  const missing = items.filter(item => item.isNonce && !state.marked.includes(item.id));
  state.fieldResult = { falsePositives: falsePositives.map(item => item.id), missing: missing.length };
  if (!falsePositives.length && !missing.length) state.fieldsSolved = true;
  render();
}

function nonceHuntPlace(practice, tokenId, message) {
  const state = app.lesson;
  const token = practice.place.tokens.find(item => item.id === tokenId);
  if (!token || state.placed[tokenId]) return;
  state.attempts += 1;
  state.pick = null;
  if (token.message === message) {
    state.placed[tokenId] = message;
    state.hint = null;
    m3Play(`nonce-in-${message}`);
    if (practice.place.tokens.every(item => state.placed[item.id])) state.practiceSolved = true;
  } else state.hint = token.hint;
  render();
}

function nonceHuntStage(lesson, state) {
  const practice = lesson.practice;
  if (state.phase === "fields") {
    const result = state.fieldResult;
    return m3PracticeShell(practice, [
      h("p", { class: "m3-phase" }, ["Fase 1 de 2 · ", practice.fields.prompt]),
      div({ class: "m3-lab m3-fields" }, practice.fields.items.map(item => {
        const marked = state.marked.includes(item.id);
        const bad = result && result.falsePositives.includes(item.id);
        return button({
          class: `m3-field ${marked ? "marked" : ""} ${bad ? "wrong" : ""} ${state.fieldsSolved && item.isNonce ? "found" : ""}`,
          type: "button",
          "aria-pressed": marked ? "true" : "false",
          disabled: state.fieldsSolved,
          onclick: () => {
            const current = app.lesson;
            current.marked = marked ? current.marked.filter(id => id !== item.id) : [...current.marked, item.id];
            current.fieldResult = null;
            render();
          }
        }, [span({ class: "m3-field-check", "aria-hidden": "true" }, marked ? "◉" : "○"), span({ class: "m3-capture-key" }, item.label), h("code", {}, item.value)]);
      })),
      result && !state.fieldsSolved ? div({ class: "practice-feedback bad" }, [
        h("strong", {}, "Revisa tu selección"),
        ...result.falsePositives.map(id => h("p", {}, ["💡 ", practice.fields.items.find(item => item.id === id).hint])),
        result.missing ? h("p", {}, `💡 Te falta ${result.missing === 1 ? "un nonce" : `${result.missing} nonces`}: busca los valores aleatorios que aporta cada lado.`) : null
      ]) : null,
      state.fieldsSolved ? m3Success("Exacto: ANonce y SNonce son los únicos valores aleatorios de un solo uso. El resto identifica, cuenta, verifica o es una clave.", "✓ ¡Nonces encontrados!") : null
    ], m3PracticeFooter(state, state.fieldsSolved
      ? button({ class: "primary-action", type: "button", onclick: () => { app.lesson.phase = "place"; render(); } }, "Fase 2: colocarlos →")
      : button({ class: "primary-action", type: "button", disabled: !state.marked.length, onclick: () => nonceHuntCheck(practice) }, "Comprobar")));
  }

  const tokens = practice.place.tokens;
  const pending = tokens.filter(token => !state.placed[token.id]);
  return m3PracticeShell(practice, [
    h("p", { class: "m3-phase" }, ["Fase 2 de 2 · ", practice.place.prompt]),
    div({ class: "m3-lab m3-hs" }, [
      div({ class: "m3-pool-items centered" }, pending.length ? pending.map(token => button({
        class: `m3-chip tone-nonce m3-token ${state.pick === token.id ? "selected" : ""}`,
        type: "button",
        onclick: () => { app.lesson.pick = app.lesson.pick === token.id ? null : token.id; render(); },
        ...m3DragProps("nonce", token.id)
      }, token.label)) : [h("p", { class: "m3-caption small" }, "✓ Nonces colocados.")]),
      div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "aire"), m3Device("client")]),
      div({ class: "m3-lane" }, [1, 2, 3, 4].map(n => {
        const here = tokens.filter(token => state.placed[token.id] === n);
        return div({
          class: `m3-lane-row m3-drop-row ${state.pick ? "ready" : ""} ${here.length && m3Flashing(`nonce-in-${n}`) ? "anim-pop" : ""}`,
          onclick: () => { if (state.pick) nonceHuntPlace(practice, state.pick, n); },
          ...m3DropProps((kind, id) => { if (kind === "nonce") nonceHuntPlace(practice, id, n); })
        }, [m3Arrow(n, `Mensaje ${n}`, here.map(token => m3Chip(token.label, "nonce")))]);
      })),
      h("p", { class: "m3-caption small" }, state.pick ? "Ahora toca el mensaje donde viaja." : "Arrastra un nonce al mensaje, o tócalo y luego toca el mensaje.")
    ]),
    state.hint ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Ese no es su mensaje"), h("p", {}, ["💡 ", state.hint])]) : null,
    state.practiceSolved ? m3Success(practice.success) : null
  ], m3PracticeFooter(state));
}

// --- mic-verify: Verifica el mensaje ----------------------------------------
function micVerifyInit(lesson) {
  return { verify: Object.fromEntries(lesson.practice.messages.map(message => [message.id, { recalc: false, verdict: null, verdictOk: false, reason: null, reasonOk: false }])) };
}

function micValues(message) {
  const received = message.forgedMic ? m3SimMic(`forjado|${message.id}`) : m3SimMic((message.original || message.lines).join("|"));
  return { received, recalculated: m3SimMic(message.lines.join("|")) };
}

function micVerifyStage(lesson, state) {
  const practice = lesson.practice;
  const update = (id, patch) => { Object.assign(app.lesson.verify[id], patch); };
  const checkSolved = () => { if (practice.messages.every(message => app.lesson.verify[message.id].reasonOk)) app.lesson.practiceSolved = true; };
  const solvedCount = practice.messages.filter(message => state.verify[message.id].reasonOk).length;
  return m3PracticeShell(practice, [
    h("p", { class: "muted tight" }, `Mensajes verificados: ${solvedCount}/${practice.messages.length}`),
    div({ class: "m3-lab m3-micverify" }, practice.messages.map(message => {
      const entry = state.verify[message.id];
      const values = micValues(message);
      const valid = values.received === values.recalculated;
      const correctReason = valid ? 0 : 1;
      return div({ class: `m3-micmsg ${entry.reasonOk ? (valid ? "solved ok" : "solved bad") : ""}` }, [
        div({ class: "m3-micmsg-head" }, [h("strong", {}, message.title), entry.reasonOk ? span({ class: `m3-verdict ${valid ? "ok" : "bad"}` }, valid ? "✓ Íntegro" : "✕ Rechazado") : null]),
        div({ class: "m3-mic-lines" }, message.lines.map(line => h("code", {}, line))),
        div({ class: "m3-mic-value" }, [span({ class: "m3-caption small" }, "MIC recibido"), h("code", {}, values.received)]),
        entry.recalc
          ? div({ class: "m3-mic-value" }, [span({ class: "m3-caption small" }, "MIC recalculado"), h("code", {}, values.recalculated)])
          : button({ class: "m3-option", type: "button", onclick: () => { update(message.id, { recalc: true }); render(); } }, "🔁 Recalcular MIC con mi clave"),
        entry.recalc && !entry.verdictOk ? div({ class: "m3-actions" }, [
          button({ class: "m3-option", type: "button", onclick: () => { app.lesson.attempts += 1; update(message.id, { verdict: "ok", verdictOk: valid }); render(); } }, "✓ Íntegro"),
          button({ class: "m3-option", type: "button", onclick: () => { app.lesson.attempts += 1; update(message.id, { verdict: "bad", verdictOk: !valid }); render(); } }, "✕ No coincide")
        ]) : null,
        entry.verdict && !entry.verdictOk ? h("p", { class: "m3-hint" }, "💡 Compara bloque por bloque el MIC recibido con el recalculado: ¿son exactamente iguales?") : null,
        entry.verdictOk && !entry.reasonOk ? div({ class: "m3-reasons" }, [
          h("p", { class: "m3-note-title" }, "¿Por qué?"),
          ...practice.reasons.map((reason, index) => button({
            class: `m3-option reason ${entry.reason === index ? "wrong" : ""}`,
            type: "button",
            onclick: () => { app.lesson.attempts += 1; update(message.id, { reason: index, reasonOk: index === correctReason }); checkSolved(); render(); }
          }, reason)),
          entry.reason !== null ? h("p", { class: "m3-hint" }, entry.reason === 2 ? "💡 El MIC no tiene que ver con el cifrado: el contenido se ve en claro y aun así se puede verificar." : "💡 Fíjate en tu veredicto: ¿los dos MIC coincidían o no?") : null
        ]) : null,
        entry.reasonOk ? h("p", { class: `m3-explain ${valid ? "ok" : "bad"}` }, valid ? practice.reasons[0] : `${practice.reasons[1]} ${message.tamperNote || ""}`) : null
      ]);
    })),
    h("p", { class: "m3-caption small m3-caption-themed" }, "Valores ficticios calculados con una función de ejemplo, no con el algoritmo real del MIC."),
    state.practiceSolved ? m3Success(practice.success, "✓ ¡Verificación completa!") : null
  ], m3PracticeFooter(state));
}

const m3PracticeStages = {
  "hs-builder": hsBuilderStage,
  "identify-match": identifyMatchStage,
  "slot-builder": slotBuilderStage,
  "packet-sort": packetSortStage,
  "nonce-hunt": nonceHuntStage,
  "mic-verify": micVerifyStage
};

// ---------------------------------------------------------------------------
// Misión final: Operación: Autenticación
// ---------------------------------------------------------------------------
function missionInit(lesson) {
  return {
    phase: "brief",
    placed: {},
    pick: null,
    hint: null,
    errors: 0,
    chainPool: shuffleIds(lesson.chain.steps.map(step => step.id)),
    chainDone: [],
    chainHint: null,
    pmkidAnswer: null
  };
}

const m3PracticeInits = {
  "hs-builder": hsBuilderInit,
  "identify-match": identifyMatchInit,
  "slot-builder": slotBuilderInit,
  "packet-sort": packetSortInit,
  "nonce-hunt": nonceHuntInit,
  "mic-verify": micVerifyInit,
  "mission": missionInit
};

function missionPlace(lesson, tokenId, slotId) {
  const state = app.lesson;
  if (state.placed[slotId] || Object.values(state.placed).includes(tokenId)) return;
  state.pick = null;
  if (tokenId === slotId) {
    state.placed[slotId] = tokenId;
    state.hint = null;
    m3Play(`slot-${slotId}`);
  } else {
    state.errors += 1;
    state.hint = lesson.lab.slots[slotId].hint;
  }
  render();
}

// Pantalla de misión bloqueada (compartida por las misiones de todos los módulos).
function missionLockedView(lesson) {
  const info = moduleSequenceInfo(lesson.moduleId);
  if (info.unlocked) return null;
  const pending = info.config.sequence.filter(id => !app.lessonProgress[id]?.completed);
  return div({ class: "lesson-stage m3-mission" }, [
    h("p", { class: "eyebrow" }, "🔒 Misión bloqueada"),
    h("p", {}, `Completa las ${info.total} lecciones del módulo para desbloquear esta misión.`),
    div({ class: "concept-row" }, pending.map(id => button({ class: "ghost-action compact", type: "button", onclick: () => startLesson(id) }, lessons[id].title)))
  ]);
}

function missionView(lesson, state) {
  const locked = missionLockedView(lesson);
  if (locked) return locked;
  if (state.phase === "brief") return missionBrief(lesson);
  if (state.phase === "lab") return missionLab(lesson, state);
  if (state.phase === "chain") return missionChain(lesson, state);
  return missionComplete(lesson, state);
}

const M3_MISSION_PHASES = [{ id: "lab", label: "Fase 1 · Laboratorio" }, { id: "chain", label: "Fase 2 · Cadena" }, { id: "done", label: "Informe" }];
function missionPhaseBar(phase, phases = M3_MISSION_PHASES) {
  const order = Object.fromEntries(phases.map((item, index) => [item.id, index]));
  return div({ class: "lesson-steps m3-mission-phases" }, phases.map((item, index) => div({ class: `lesson-step ${index < order[phase] ? "done" : index === order[phase] ? "active" : ""}` }, [span({ class: "lesson-step-index" }, index < order[phase] ? "✓" : String(index + 1)), span({}, item.label)])));
}

function missionBrief(lesson) {
  return div({ class: "lesson-stage m3-mission" }, [
    div({ class: "m3-lab m3-brief" }, [
      span({ class: "m3-behind-label" }, "Expediente · Módulo 3"),
      h("h3", {}, "🎯 Operación: Autenticación"),
      h("p", {}, "Un cliente acaba de conectarse a «Café_Central_WiFi». Desde fuera solo se ve «Conectado». Tu misión: reconstruir lo que ocurrió detrás de esa conexión."),
      div({ class: "m3-brief-objectives" }, [
        div({}, [span({ class: "m3-brief-num" }, "1"), span({}, "Coloca las 8 piezas en el diagrama AP ↔ Cliente.")]),
        div({}, [span({ class: "m3-brief-num" }, "2"), span({}, "Reconstruye la cadena completa: de la PMK a la GTK, y ubica el PMKID.")])
      ]),
      div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "? ? ?"), m3Device("client")]),
      h("p", { class: "m3-caption small" }, `Recompensa: XP según tus aciertos + insignia «${lesson.badge.name}».`)
    ]),
    div({ class: "lesson-actions" }, [button({ class: "primary-action", type: "button", onclick: () => { app.lesson.phase = "lab"; render(); } }, "Iniciar misión →")])
  ]);
}

function missionLab(lesson, state) {
  const lab = lesson.lab;
  const tokensById = Object.fromEntries(lab.tokens.map(token => [token.id, token]));
  const placedTokens = new Set(Object.values(state.placed));
  const pool = lab.tokens.filter(token => !placedTokens.has(token.id));
  const complete = lab.tokens.every(token => state.placed[token.id]);
  const slot = (id, extraClass = "") => {
    const placed = state.placed[id];
    return div({
      class: `m3-mslot ${extraClass} ${placed ? "filled" : ""} ${state.pick && !placed ? "ready" : ""} ${placed && m3Flashing(`slot-${id}`) ? "anim-pop" : ""}`,
      onclick: () => { if (state.pick && !placed) missionPlace(lesson, state.pick, id); },
      ...m3DropProps((kind, tokenId) => { if (kind === "mtoken") missionPlace(lesson, tokenId, id); })
    }, [
      placed ? m3Chip(tokensById[placed].label, tokensById[placed].tone) : span({ class: "m3-drop-placeholder" }, "?"),
      h("small", {}, lab.slots[id].clue)
    ]);
  };
  const micPlaced = Boolean(state.placed.mic);
  return div({ class: "lesson-stage m3-mission" }, [
    missionPhaseBar("lab"),
    div({ class: "m3-lab m3-mboard" }, [
      div({ class: "m3-pool-items centered" }, pool.length ? pool.map(token => button({
        class: `m3-chip tone-${token.tone} m3-token ${state.pick === token.id ? "selected" : ""}`,
        type: "button",
        onclick: () => { app.lesson.pick = app.lesson.pick === token.id ? null : token.id; render(); },
        ...m3DragProps("mtoken", token.id)
      }, token.label)) : [h("p", { class: "m3-caption small" }, "✓ Todas las piezas colocadas.")]),
      span({ class: "m3-behind-label" }, "Antes de la conversación"),
      div({ class: "m3-mrow two" }, [slot("pmk"), slot("pmkid")]),
      span({ class: "m3-behind-label" }, "La conversación"),
      slot("fwh", "wide"),
      div({ class: "m3-lane-head" }, [m3Device("ap"), span({ class: "m3-air" }, "aire"), m3Device("client")]),
      div({ class: "m3-mlane" }, [
        div({ class: "m3-mstep" }, [m3Arrow(1, "Mensaje 1"), slot("anonce")]),
        div({ class: "m3-mstep both" }, [span({ class: "m3-mstep-label" }, "⚙ Ambos lados derivan, sin enviarla:"), slot("ptk")]),
        div({ class: "m3-mstep" }, [m3Arrow(2, "Mensaje 2"), div({ class: "m3-mrow two" }, [slot("snonce"), slot("mic")])]),
        div({ class: "m3-mstep" }, [m3Arrow(3, `Mensaje 3 · instalar claves${micPlaced ? " + MIC" : ""}`), slot("gtk")]),
        div({ class: "m3-mstep" }, [m3Arrow(4, `Mensaje 4 · confirmación${micPlaced ? " + MIC" : ""}`)])
      ]),
      h("p", { class: "m3-caption small" }, state.pick ? "Ahora toca la casilla donde va." : "Arrastra cada pieza a su casilla, o tócala y luego toca la casilla.")
    ]),
    state.hint ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Esa pieza no va ahí"), h("p", {}, ["💡 ", state.hint])]) : null,
    complete ? m3Success("Diagrama completo: cada pieza está donde actúa.", "✓ Laboratorio resuelto") : null,
    div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Piezas: ${placedTokens.size}/${lab.tokens.length} · Errores: ${state.errors}`),
      complete ? button({ class: "primary-action", type: "button", onclick: () => { app.lesson.phase = "chain"; render(); } }, "Fase 2: la cadena →") : null
    ])
  ]);
}

function missionChain(lesson, state) {
  const chain = lesson.chain;
  const stepsById = Object.fromEntries(chain.steps.map(step => [step.id, step]));
  const expected = chain.steps[state.chainDone.length];
  const complete = !expected;
  const question = chain.pmkidQuestion;
  const answered = state.pmkidAnswer === question.correct;
  const pickStep = id => {
    const current = app.lesson;
    if (id === expected.id) { current.chainDone.push(id); current.chainHint = null; m3Play(`chain-${id}`); }
    else { current.errors += 1; current.chainHint = chain.hints[expected.id]; }
    render();
  };
  return div({ class: "lesson-stage m3-mission" }, [
    missionPhaseBar("chain"),
    h("p", { class: "m3-phase" }, "Reconstruye la cadena: toca las piezas en el orden en que intervienen, desde el origen hasta la clave de grupo."),
    div({ class: "m3-lab m3-chain" }, [
      div({ class: "m3-pool-items centered" }, state.chainPool.filter(id => !state.chainDone.includes(id)).map(id => button({ class: "m3-chip tone-plain m3-token", type: "button", onclick: () => pickStep(id) }, stepsById[id].label))),
      div({ class: "m3-chain-list" }, chain.steps.map((step, index) => {
        const done = state.chainDone.includes(step.id);
        return div({ class: `m3-chain-step ${done ? "done" : ""} ${done && m3Flashing(`chain-${step.id}`) ? "anim-pop" : ""}` }, [
          span({ class: "m3-chain-num" }, String(index + 1)),
          done ? div({}, [h("strong", {}, step.label), h("small", {}, step.caption)]) : span({ class: "m3-drop-placeholder" }, "?"),
          done && step.id === "pmk" && answered ? span({ class: "m3-chain-branch" }, [span({ "aria-hidden": "true" }, "↳ "), m3Chip("PMKID", "id", "mini"), " la identifica"]) : null
        ]);
      }))
    ]),
    state.chainHint ? div({ class: "practice-feedback bad" }, [h("strong", {}, "Todavía no"), h("p", {}, ["💡 ", state.chainHint])]) : null,
    complete ? div({ class: "lv-check" }, [
      h("p", { class: "lv-check-prompt" }, question.prompt),
      div({ class: "lv-check-options" }, question.options.map((option, index) => button({
        class: `lv-check-option ${state.pmkidAnswer === null ? "" : index === question.correct && answered ? "correct" : index === state.pmkidAnswer ? "wrong" : ""}`,
        type: "button",
        disabled: answered,
        onclick: () => { if (index !== question.correct) app.lesson.errors += 1; app.lesson.pmkidAnswer = index; render(); }
      }, option))),
      state.pmkidAnswer !== null ? h("p", { class: `lv-check-feedback ${answered ? "ok" : "bad"}` }, question.feedback[answered ? 0 : 1]) : null
    ]) : null,
    div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Errores: ${state.errors}`),
      complete && answered ? button({ class: "primary-action", type: "button", onclick: () => finishMission(lesson) }, "Completar misión →") : null
    ])
  ]);
}

function finishMission(lesson) {
  const state = app.lesson;
  const percent = Math.max(40, 100 - state.errors * 5);
  const xp = 50 + Math.round(percent * 0.5);
  app.lessonProgress[lesson.id] = { completed: true, percent, xp, errors: state.errors, badge: lesson.badge.name, completedAt: Date.now() };
  state.phase = "done";
  state.percent = percent;
  state.xp = xp;
  m3Play("mission-done");
  saveState();
  syncLessonProgress(lesson.id);
  render();
}

function missionConceptReview(lesson, state) {
  const errors = state.stepErrors || {};
  const mastered = lesson.steps.filter(step => !errors[step.id]);
  const review = lesson.steps.filter(step => errors[step.id]);
  return div({ class: "m3-concepts" }, [
    div({ class: "m3-concept-col ok" }, [h("strong", {}, "✓ Conceptos dominados"), mastered.length
      ? h("ul", {}, mastered.map(step => h("li", {}, step.lesson)))
      : h("p", { class: "muted tight" }, "Repite la misión para afianzarlos.")]),
    div({ class: "m3-concept-col bad" }, [h("strong", {}, "↻ Conviene repasar"), review.length
      ? h("ul", {}, review.map(step => h("li", {}, `${step.lesson} (${errors[step.id]} error${errors[step.id] === 1 ? "" : "es"})`)))
      : h("p", { class: "muted tight" }, "Nada: resolviste cada etapa sin errores.")])
  ]);
}

function missionComplete(lesson, state) {
  const info = moduleSequenceInfo(lesson.moduleId);
  const animate = m3Flashing("mission-done");
  const ctfLinks = lesson.ctfLinks || [];
  return div({ class: "lesson-stage lesson-complete panel m3-complete m3-module-done" }, [
    missionPhaseBar("done", lesson.phases),
    div({ class: `m3-badge ${animate ? "anim" : ""}` }, [span({ class: "m3-badge-icon", "aria-hidden": "true" }, lesson.badge.icon), h("strong", {}, lesson.badge.name), h("small", {}, "Insignia desbloqueada")]),
    h("h2", {}, lesson.doneTitle || `¡Módulo ${lesson.moduleId} completado!`),
    h("p", { class: "m3-module-claim" }, lesson.claim),
    div({ class: "m3-complete-row" }, [span({ class: "xp-badge" }, `+${state.xp} XP misión`), span({ class: "m3-xp-total" }, `${info.xp} XP en el módulo`), masteryStars(state.percent)]),
    lesson.steps ? missionConceptReview(lesson, state) : null,
    div({ class: "m3-mastery-list" }, info.config.sequence.map(id => {
      const progress = app.lessonProgress[id] || {};
      return div({ class: "m3-mastery-row" }, [span({}, lessons[id].title), span({ class: "muted tight" }, `${progress.percent ?? 0}%`), masteryStars(progress.percent || 0)]);
    })),
    div({ class: "m3-ctf" }, [
      h("strong", {}, "🎯 Lo que te llevas a los retos"),
      h("ul", {}, ctfLinks.map(([term, text]) => h("li", {}, [h("strong", {}, term), ` → ${text}`])))
    ]),
    div({ class: "lesson-actions" }, [
      button({ class: "ghost-action", type: "button", onclick: () => startLesson(lesson.id) }, "Repetir misión"),
      button({ class: "ghost-action", type: "button", onclick: backToTheory }, "Volver a Teoría"),
      button({ class: "primary-action", type: "button", onclick: () => switchTab("retos") }, "Ir a los retos →")
    ])
  ]);
}


// ===========================================================================
// MÓDULO 5 — componentes (Bluetooth)
// Se registran en los mismos registros del motor que usa el Módulo 3
// (m3LearnVisuals, m3PracticeStages, m3PracticeInits) y reutilizan sus
// superficies .m3-lab, chips, notas y animaciones de una sola vez.
// ===========================================================================

function btFeedback(ok, text) {
  // Una lección puede pedir otros títulos (el Módulo 2 usa "✗ Inténtalo de nuevo").
  const titles = (app.lesson && lessons[app.lesson.id]?.feedbackTitles) || [BT_OK, BT_REVIEW];
  return div({ class: `bt-fb ${ok ? "ok" : "bad"}`, role: "status" }, [h("strong", {}, ok ? titles[0] : titles[1]), h("p", {}, text)]);
}

function btSignalBars(level) {
  return span({ class: "bt-bars", title: level ? `Señal ${level}/4` : "Sin señal", "aria-label": level ? `Señal ${level} de 4` : "Sin señal" },
    [1, 2, 3, 4].map(n => span({ class: n <= level ? "on" : "" }, "")));
}

// --- bt-compare: Clásico vs BLE como dos dispositivos seleccionables ------
function renderBtCompare(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.options.find(option => option.id === sel.sel);
  const allSeen = visual.options.every(option => sel.seen.includes(option.id));
  return div({ class: "m3-lab bt-compare" }, [
    div({ class: `bt-compare-grid cols-${visual.options.length}` }, visual.options.map(option => button({
      class: `bt-tech bt-tech-${option.id} ${option.tone ? `tone-${option.tone}` : ""} ${sel.sel === option.id ? "active" : ""} ${sel.seen.includes(option.id) ? "seen" : ""}`,
      type: "button",
      "aria-pressed": sel.sel === option.id ? "true" : "false",
      onclick: () => { app.lesson.stepSelections[stepIndex] = { sel: option.id, seen: m3Toggle(sel.seen, option.id) }; m3Play(`btc-${option.id}`); render(); }
    }, [
      span({ class: "bt-tech-icon", "aria-hidden": "true" }, option.icon),
      h("strong", {}, option.label),
      span({ class: "m3-chip tone-plain mini" }, option.tag),
      // Medidor opcional: el Módulo 2 no lo usa (un "porcentaje de seguridad" inventado sería engañoso).
      option.power === undefined ? null : div({ class: "bt-meter", "aria-label": `${visual.meterLabel || "Consumo"} relativo ${option.power}%` }, [span({ class: "bt-meter-label" }, visual.meterLabel || "Consumo"), div({ class: "bt-meter-track" }, [div({ class: "bt-meter-fill", style: { width: `${option.power}%` } }, [])])])
    ]))),
    active ? div({ class: `bt-tech-detail ${m3Flashing(`btc-${active.id}`) ? "anim-pop" : ""}` }, [
      div({ class: "bt-rows" }, active.rows.map(row => div({ class: "bt-row" }, [span({ class: "m3-capture-key" }, row.k), span({}, row.v)]))),
      active.devices?.length ? div({ class: "bt-device-chips" }, active.devices.map(device => span({ class: "m3-chip tone-plain" }, device))) : null
    ]) : h("p", { class: "m3-caption" }, visual.prompt || "Toca cada dispositivo."),
    allSeen ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.summary)]) : h("p", { class: "m3-caption small" }, `Explorados: ${sel.seen.length}/${visual.options.length}`)
  ]);
}

// --- bt-signal: flujo continuo vs ráfagas -------------------------------
function renderBtSignal(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.lanes.find(lane => lane.id === sel.sel);
  return div({ class: "m3-lab bt-signal" }, [
    ...visual.lanes.map(lane => button({
      class: `bt-lane ${lane.mode} ${sel.sel === lane.id ? "active" : ""}`,
      type: "button",
      onclick: () => { app.lesson.stepSelections[stepIndex] = { sel: lane.id, seen: m3Toggle(sel.seen, lane.id) }; render(); }
    }, [
      span({ class: "bt-lane-label" }, lane.label),
      div({ class: "bt-lane-track", "aria-hidden": "true" }, lane.mode === "stream"
        ? Array.from({ length: 14 }, (_, i) => span({ class: "bt-pulse", style: { animationDelay: `${i * 0.18}s` } }, ""))
        : [0, 1, 2].map(i => span({ class: "bt-burst", style: { left: `${10 + i * 32}%`, animationDelay: `${i * 0.9}s` } }, ""))),
      span({ class: "bt-lane-state" }, lane.mode === "stream" ? "radio activa" : "💤 duerme entre ráfagas")
    ])),
    active ? m3Note(active.label, active.detail) : h("p", { class: "m3-caption" }, "Toca cada carril."),
    sel.seen.length === visual.lanes.length ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, "Menos tiempo con la radio encendida = menos consumo.")]) : null
  ]);
}

// --- bt-radar: escaneo de dispositivos cercanos --------------------------
function renderBtRadar(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { scanned: false, sel: null, seen: [] };
  const animate = sel.scanned && m3Flashing(`radar-${stepIndex}`);
  const found = visual.devices.filter(device => device.state === "found");
  const active = visual.devices.find(device => device.id === sel.sel);
  const pick = id => { app.lesson.stepSelections[stepIndex] = { ...sel, sel: id, seen: m3Toggle(sel.seen, id) }; render(); };
  const stateLabel = { found: "Encontrado", hidden: "No detectable", far: "Fuera de alcance" };
  return div({ class: "m3-lab bt-radar" }, [
    div({ class: "bt-radar-layout" }, [
      div({ class: `bt-radar-screen ${sel.scanned ? "scanned" : ""} ${animate ? "anim" : ""}` }, [
        span({ class: "bt-ring r1", "aria-hidden": "true" }, ""),
        span({ class: "bt-ring r2", "aria-hidden": "true" }, ""),
        span({ class: "bt-ring r3", "aria-hidden": "true" }, ""),
        sel.scanned ? span({ class: "bt-sweep", "aria-hidden": "true" }, "") : null,
        div({ class: "bt-radar-center" }, [span({ "aria-hidden": "true" }, "💻"), h("small", {}, "Tú")]),
        ...(sel.scanned ? visual.devices.map((device, index) => button({
          class: `bt-blip ${device.state} ${sel.sel === device.id ? "active" : ""}`,
          type: "button",
          style: { left: `${device.x}%`, top: `${device.y}%`, animationDelay: `${0.25 + index * 0.18}s` },
          title: `${device.name} — ${stateLabel[device.state]}`,
          onclick: () => pick(device.id)
        }, [span({ "aria-hidden": "true" }, device.state === "found" ? device.icon : "·"), h("small", {}, device.state === "found" ? device.name : "?")])) : [])
      ]),
      div({ class: "bt-scan-panel" }, [
        button({ class: "primary-action compact", type: "button", onclick: () => { app.lesson.stepSelections[stepIndex] = { ...sel, scanned: true }; m3Play(`radar-${stepIndex}`); render(); } }, sel.scanned ? "📡 Escanear de nuevo" : "📡 Escanear"),
        span({ class: "m3-behind-label" }, sel.scanned ? `Resultados: ${found.length} dispositivos` : "Sin resultados"),
        div({ class: "bt-scan-list" }, sel.scanned ? found.map(device => button({ class: `bt-scan-row ${sel.sel === device.id ? "active" : ""}`, type: "button", onclick: () => pick(device.id) }, [
          span({ "aria-hidden": "true" }, device.icon), h("strong", {}, device.name), h("code", {}, device.addr)
        ])) : [h("p", { class: "m3-caption small" }, "Pulsa «Escanear» para buscar dispositivos.")]),
        sel.scanned ? h("p", { class: "m3-caption small" }, "Los puntos «?» del radar existen, pero no aparecen en los resultados. Tócalos.") : null
      ])
    ]),
    active ? m3Note(`${active.icon} ${active.name} · ${stateLabel[active.state]}`, active.detail, active.state === "found" ? "" : "bad") : null,
    sel.scanned && sel.seen.length >= 4 ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, "Antes de conectarse, un dispositivo necesita saber qué otros puede encontrar. No todo lo cercano aparece.")]) : null
  ]);
}

// --- bt-pairing: del descubrimiento a la conexión, etapa por etapa -------
function btPairingDiagram(stage, animate) {
  return div({ class: `bt-pair-diagram link-${stage.link} ${animate ? "anim" : ""}` }, [
    div({ class: "bt-pair-dev" }, [span({ class: "bt-pair-icon", "aria-hidden": "true" }, "📱"), h("strong", {}, "Teléfono"), stage.code ? span({ class: "bt-code" }, stage.code) : null]),
    div({ class: "bt-pair-link" }, [span({ class: "bt-pair-line" }, ""), span({ class: "bt-pair-badge" }, `${stage.icon} ${stage.label}`)]),
    div({ class: "bt-pair-dev" }, [span({ class: "bt-pair-icon", "aria-hidden": "true" }, "🎧"), h("strong", {}, "Audífonos"), stage.code ? span({ class: "bt-code" }, stage.code) : null])
  ]);
}

function renderBtPairing(visual, state, stepIndex) {
  const idx = state.stepSelections[stepIndex]?.idx ?? 0;
  const max = state.stepSelections[stepIndex]?.max ?? 0;
  const stage = visual.stages[idx];
  const animate = m3Flashing(`pair-${stepIndex}-${idx}`);
  const go = next => { app.lesson.stepSelections[stepIndex] = { idx: next, max: Math.max(max, next) }; m3Play(`pair-${stepIndex}-${next}`); render(); };
  return div({ class: "m3-lab bt-pairing" }, [
    div({ class: "bt-stage-track" }, visual.stages.map((item, index) => button({
      class: `bt-stage ${index < idx ? "done" : index === idx ? "active" : ""}`,
      type: "button",
      disabled: index > max + 1,
      onclick: () => go(index)
    }, [span({ class: "bt-stage-icon", "aria-hidden": "true" }, index < idx ? "✓" : item.icon), h("small", {}, item.label)]))),
    btPairingDiagram(stage, animate),
    m3Note(`${idx + 1}/${visual.stages.length} · ${stage.label}`, stage.detail, idx === visual.stages.length - 1 ? "ok" : ""),
    div({ class: "m3-actions" }, [
      button({ class: "m3-option", type: "button", disabled: idx === 0, onclick: () => go(idx - 1) }, "◀ Etapa anterior"),
      idx < visual.stages.length - 1
        ? button({ class: "m3-option active", type: "button", onclick: () => go(idx + 1) }, "Avanzar ▶")
        : button({ class: "m3-option", type: "button", onclick: () => go(0) }, "↺ Repetir")
    ]),
    max === visual.stages.length - 1 ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.summary)]) : null
  ]);
}

// --- bt-layers: autenticación / autorización / cifrado alrededor del enlace
function renderBtLayers(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.layers.find(layer => layer.id === sel.sel);
  return div({ class: "m3-lab bt-layers" }, [
    div({ class: `bt-shield ${active ? `focus-${active.tone}` : ""}` }, [
      div({ class: "bt-shield-ring tone-authn" }, [
        div({ class: "bt-shield-ring tone-authz" }, [
          div({ class: "bt-shield-ring tone-crypto" }, [
            div({ class: "bt-shield-core" }, [span({}, "📱 A"), span({ class: "bt-shield-link", "aria-hidden": "true" }, "⟷"), span({}, "B 🎧")])
          ])
        ])
      ])
    ]),
    div({ class: "bt-layer-buttons" }, visual.layers.map(layer => button({
      class: `bt-layer-btn tone-${layer.tone} ${sel.sel === layer.id ? "active" : ""} ${sel.seen.includes(layer.id) ? "seen" : ""}`,
      type: "button",
      "aria-pressed": sel.sel === layer.id ? "true" : "false",
      onclick: () => { app.lesson.stepSelections[stepIndex] = { sel: layer.id, seen: m3Toggle(sel.seen, layer.id) }; render(); }
    }, [span({ "aria-hidden": "true" }, layer.icon), h("strong", {}, layer.label), h("small", {}, layer.question)]))),
    active ? div({ class: `bt-layer-example tone-${active.tone}` }, [h("strong", {}, `${active.icon} ${active.label} — «${active.question}»`), h("p", {}, ["Ejemplo: ", active.example])]) : h("p", { class: "m3-caption" }, "Toca cada capa."),
    sel.seen.length === visual.layers.length ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.summary)]) : null
  ]);
}

// --- threat-cards: amenaza → significado → impacto → mitigación ---------
function renderThreatCards(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { sel: null, seen: [] };
  const active = visual.threats.find(threat => threat.id === sel.sel);
  return div({ class: "m3-lab bt-threats" }, [
    div({ class: "bt-threat-grid" }, visual.threats.map(threat => button({
      class: `bt-threat ${sel.sel === threat.id ? "active" : ""} ${sel.seen.includes(threat.id) ? "seen" : ""}`,
      type: "button",
      "aria-pressed": sel.sel === threat.id ? "true" : "false",
      onclick: () => { app.lesson.stepSelections[stepIndex] = { sel: threat.id, seen: m3Toggle(sel.seen, threat.id) }; m3Play(`threat-${threat.id}`); render(); }
    }, [span({ class: "bt-threat-icon", "aria-hidden": "true" }, threat.icon), h("strong", {}, threat.title), sel.seen.includes(threat.id) ? span({ class: "bt-threat-check", "aria-hidden": "true" }, "✓") : null]))),
    active ? div({ class: `bt-threat-detail ${m3Flashing(`threat-${active.id}`) ? "anim-pop" : ""}` }, [
      div({ class: "bt-threat-row" }, [span({ class: "bt-threat-key" }, "⚠ Amenaza"), span({}, active.title)]),
      div({ class: "bt-threat-row" }, [span({ class: "bt-threat-key" }, "Qué significa"), span({}, active.meaning)]),
      div({ class: "bt-threat-row" }, [span({ class: "bt-threat-key" }, "Qué podría afectar"), span({}, active.impact)]),
      div({ class: "bt-threat-row defense" }, [span({ class: "bt-threat-key" }, "🛡 Cómo reducir el riesgo"), span({}, active.defense)])
    ]) : h("p", { class: "m3-caption" }, "Toca una amenaza."),
    h("p", { class: "m3-caption small" }, `Revisadas: ${sel.seen.length}/${visual.threats.length}`)
  ]);
}

Object.assign(m3LearnVisuals, {
  "bt-compare": renderBtCompare,
  "bt-signal": renderBtSignal,
  "bt-radar": renderBtRadar,
  "bt-pairing": renderBtPairing,
  "bt-layers": renderBtLayers,
  "threat-cards": renderThreatCards
});

// ---------------------------------------------------------------------------
// Prácticas
// ---------------------------------------------------------------------------

// --- scan-classify: informe del escáner, cada fila se clasifica ----------
function scanClassifyInit() { return { answers: {} }; }

function scanClassifyStage(lesson, state) {
  const practice = lesson.practice;
  const solvedCount = practice.items.filter(item => state.answers[item.id] === item.answer).length;
  return m3PracticeShell(practice, [
    div({ class: "m3-lab bt-scanner" }, [
      div({ class: "m3-capture-title" }, [`◉ ${practice.panelTitle || "Escáner WISPR (simulado)"} · `, `${solvedCount}/${practice.items.length} clasificados`]),
      ...practice.items.map(item => {
        const answer = state.answers[item.id];
        const ok = answer === item.answer;
        return div({ class: `bt-scan-item ${answer ? (ok ? "ok" : "bad") : ""}` }, [
          div({ class: "bt-scan-item-head" }, [
            span({ class: "bt-scan-icon", "aria-hidden": "true" }, item.icon),
            div({}, [h("strong", {}, item.name), div({ class: "bt-clues" }, item.clues.map(clue => span({ class: "m3-chip tone-plain mini" }, clue)))]),
            item.bars === undefined ? null : btSignalBars(item.bars)
          ]),
          div({ class: "bt-choice-row" }, practice.categories.map(category => button({
            class: `m3-option bt-choice ${answer === category.id ? (ok ? "active" : "wrong") : ""}`,
            type: "button",
            disabled: ok,
            onclick: () => { app.lesson.attempts += 1; app.lesson.answers[item.id] = category.id; if (practice.items.every(entry => app.lesson.answers[entry.id] === entry.answer)) app.lesson.practiceSolved = true; render(); }
          }, category.label))),
          answer ? btFeedback(ok, ok ? item.explain : item.hint) : null
        ]);
      })
    ]),
    state.practiceSolved ? m3Success(practice.success, "✓ ¡Escaneo analizado!") : null
  ], m3PracticeFooter(state));
}

// --- sequence-build: ordenar pasos tocando (o arrastrando) en orden ------
function sequenceBuildInit(lesson) {
  return { pool: shuffleIds(lesson.practice.steps.map(step => step.id)), done: [], hint: null };
}

function sequencePick(practice, id) {
  const state = app.lesson;
  const expected = practice.steps[state.done.length];
  if (!expected || state.done.includes(id)) return;
  state.attempts += 1;
  if (id === expected.id) {
    state.done.push(id);
    state.hint = null;
    if (state.done.length === practice.steps.length) { state.practiceSolved = true; m3Play("seq-replay"); }
  } else state.hint = expected.hint;
  render();
}

function sequenceBuildStage(lesson, state) {
  const practice = lesson.practice;
  const byId = Object.fromEntries(practice.steps.map(step => [step.id, step]));
  const replay = state.practiceSolved && m3Flashing("seq-replay");
  return m3PracticeShell(practice, [
    div({ class: "m3-lab bt-sequence" }, [
      div({ class: "m3-pool-items centered" }, state.pool.filter(id => !state.done.includes(id)).map(id => button({
        class: "m3-chip tone-plain m3-token bt-seq-chip",
        type: "button",
        onclick: () => sequencePick(practice, id),
        ...m3DragProps("seq", id)
      }, `${byId[id].icon} ${byId[id].label}`))),
      div({ class: "bt-seq-list", ...m3DropProps((kind, id) => { if (kind === "seq") sequencePick(practice, id); }) }, practice.steps.map((step, index) => {
        const filled = index < state.done.length;
        return div({ class: `bt-seq-slot ${filled ? "filled" : ""} ${index === state.done.length ? "next" : ""}` }, [
          span({ class: "m3-chain-num" }, String(index + 1)),
          filled ? h("strong", {}, `${byId[state.done[index]].icon} ${byId[state.done[index]].label}`) : span({ class: "m3-drop-placeholder" }, index === state.done.length ? "Siguiente paso…" : "?")
        ]);
      })),
      h("p", { class: "m3-caption small" }, "Toca los pasos en orden o arrástralos a la lista.")
    ]),
    state.hint ? btFeedback(false, state.hint) : null,
    state.practiceSolved ? div({ class: `m3-lab bt-seq-replay ${replay ? "anim" : ""}` }, [
      span({ class: "m3-behind-label" }, "Proceso completo"),
      div({ class: "bt-replay-track" }, practice.steps.map((step, index) => span({ class: "bt-replay-step", style: { animationDelay: `${index * 0.45}s` } }, [span({ "aria-hidden": "true" }, step.icon), h("small", {}, step.label)]))),
      div({ class: "bt-replay-end", style: { animationDelay: `${practice.steps.length * 0.45}s` } }, "📱 ⟷🔒⟷ 🎧 Conectados de forma segura")
    ]) : null,
    state.practiceSolved ? m3Success(practice.success) : null
  ], m3PracticeFooter(state, state.practiceSolved ? button({ class: "ghost-action compact", type: "button", onclick: () => { m3Play("seq-replay"); render(); } }, "↻ Ver animación") : null));
}

// --- bt-environment: mapa de la estación con inspector -------------------
function btEnvironmentInit() { return { sel: null, decisions: {} }; }

function btEnvironmentStage(lesson, state) {
  const practice = lesson.practice;
  const active = practice.devices.find(device => device.id === state.sel);
  const decision = active && state.decisions[active.id];
  const correct = id => state.decisions[id] === practice.devices.find(device => device.id === id).answer;
  const decide = choice => {
    app.lesson.attempts += 1;
    app.lesson.decisions[active.id] = choice;
    if (practice.devices.every(device => correct(device.id))) app.lesson.practiceSolved = true;
    render();
  };
  const done = practice.devices.filter(device => correct(device.id)).length;
  return m3PracticeShell(practice, [
    div({ class: "m3-lab bt-env" }, [
      div({ class: "bt-env-map" }, [
        div({ class: "bt-env-station" }, [span({ "aria-hidden": "true" }, "🖥️"), h("small", {}, "Estación de trabajo")]),
        ...practice.devices.map(device => button({
          class: `bt-env-node ${state.sel === device.id ? "active" : ""} ${state.decisions[device.id] ? (correct(device.id) ? (device.answer === "safe" ? "safe" : "risk") : "wrong") : ""}`,
          type: "button",
          style: { left: `${device.x}%`, top: `${device.y}%` },
          onclick: () => { app.lesson.sel = device.id; render(); }
        }, [span({ "aria-hidden": "true" }, device.icon), h("small", {}, device.name), correct(device.id) ? span({ class: "bt-env-mark" }, device.answer === "safe" ? "✓" : "⚠") : null]))
      ]),
      active ? div({ class: "bt-inspector" }, [
        span({ class: "m3-behind-label" }, "Ficha del dispositivo"),
        h("strong", {}, `${active.icon} ${active.name}`),
        h("ul", {}, active.facts.map(fact => h("li", {}, fact))),
        div({ class: "m3-actions" }, [
          button({ class: `m3-option ${decision === "safe" ? (correct(active.id) ? "active" : "wrong") : ""}`, type: "button", disabled: correct(active.id), onclick: () => decide("safe") }, "✓ Seguro"),
          button({ class: `m3-option ${decision === "risk" ? (correct(active.id) ? "active" : "wrong") : ""}`, type: "button", disabled: correct(active.id), onclick: () => decide("risk") }, "⚠ Requiere atención")
        ]),
        decision ? btFeedback(correct(active.id), correct(active.id) ? active.explain : (active.answer === "risk" ? "Hay una señal de alerta en la ficha: revisa quién inició la conexión, la visibilidad o los permisos." : "Nada en la ficha indica un problema: está aprobado, actualizado y sin exposición innecesaria.")) : null
      ]) : h("p", { class: "m3-caption" }, "Toca un dispositivo del mapa para inspeccionarlo."),
      h("p", { class: "m3-caption small" }, `Analizados correctamente: ${done}/${practice.devices.length}`)
    ]),
    state.practiceSolved ? m3Success(practice.success, "✓ ¡Entorno analizado!") : null
  ], m3PracticeFooter(state));
}

Object.assign(m3PracticeStages, {
  "scan-classify": scanClassifyStage,
  "sequence-build": sequenceBuildStage,
  "bt-environment": btEnvironmentStage
});

// ---------------------------------------------------------------------------
// Misión final: Misión: Bluetooth (5 pasos sobre el mismo entorno)
// ---------------------------------------------------------------------------
function btMissionInit() {
  return { phase: "brief", types: {}, discSel: [], discChecked: false, pairSel: [], pairChecked: false, events: {}, riskSel: [], riskChecked: false, errors: 0 };
}

Object.assign(m3PracticeInits, { "scan-classify": scanClassifyInit, "sequence-build": sequenceBuildInit, "bt-environment": btEnvironmentInit, "bt-mission": btMissionInit });

const missionViews = { "bt-mission": btMissionView };

// "done" cierra la misión con la lógica compartida de XP/insignia (finishMission).
function btMissionNext(phase) {
  if (phase === "done") return finishMission(lessons[app.lesson.id]);
  app.lesson.phase = phase;
  render();
}

// Paso de selección múltiple ("¿cuáles…?") con comprobación y retroalimentación por ítem.
function btMultiSelect(items, selKey, checkedKey, isTarget, labelOf, explainOf) {
  const state = app.lesson;
  const sel = state[selKey];
  const checked = state[checkedKey];
  const allRight = items.every(item => sel.includes(item.id) === isTarget(item));
  return div({ class: "bt-multi" }, items.map(item => {
    const marked = sel.includes(item.id);
    const right = marked === isTarget(item);
    return button({
      class: `bt-multi-item ${marked ? "marked" : ""} ${checked ? (right ? "ok" : "bad") : ""}`,
      type: "button",
      "aria-pressed": marked ? "true" : "false",
      disabled: checked && allRight,
      onclick: () => { state[selKey] = marked ? sel.filter(id => id !== item.id) : [...sel, item.id]; state[checkedKey] = false; render(); }
    }, [span({ class: "m3-field-check", "aria-hidden": "true" }, marked ? "◉" : "○"), div({}, [labelOf(item), checked && explainOf ? h("small", { class: right ? "bt-ok-text" : "bt-bad-text" }, `${right ? "✓" : "✗"} ${explainOf(item)}`) : null])]);
  }));
}

function btMissionDeviceCard(device, controls) {
  return div({ class: "bt-mdev" }, [
    div({ class: "bt-mdev-head" }, [span({ class: "bt-scan-icon", "aria-hidden": "true" }, device.icon), h("strong", {}, device.name)]),
    h("ul", {}, device.clues.map(clue => h("li", {}, clue))),
    controls
  ]);
}

function btMissionView(lesson, state) {
  const locked = missionLockedView(lesson);
  if (locked) return locked;
  if (state.phase === "done") return missionComplete(lesson, state);
  if (state.phase === "brief") {
    return div({ class: "lesson-stage m3-mission" }, [
      div({ class: "m3-lab m3-brief" }, [
        span({ class: "m3-behind-label" }, "Expediente · Módulo 5"),
        h("h3", {}, "📶 Misión: Bluetooth"),
        h("p", {}, "El centro de operaciones detectó varios dispositivos Bluetooth alrededor de una estación de trabajo. Debes analizar el entorno y determinar qué dispositivos son relevantes, cómo se comunican y qué situaciones podrían representar un riesgo."),
        div({ class: "m3-brief-objectives" }, lesson.phases.filter(item => item.id !== "done").map((item, index) => div({}, [span({ class: "m3-brief-num" }, String(index + 1)), span({}, item.label.replace(/^\d · /, ""))]))),
        div({ class: "bt-brief-devices" }, lesson.devices.map(device => span({ class: "m3-chip tone-plain" }, `${device.icon} ${device.name}`))),
        h("p", { class: "m3-caption small" }, `Recompensa: XP según tus aciertos + insignia «${lesson.badge.name}».`)
      ]),
      div({ class: "lesson-actions" }, [button({ class: "primary-action", type: "button", onclick: () => btMissionNext("s1") }, "Iniciar misión →")])
    ]);
  }

  const devices = lesson.devices;
  const footer = (ready, next, label) => div({ class: "practice-footer" }, [
    span({ class: "practice-attempts" }, `Errores: ${state.errors}`),
    ready ? button({ class: "primary-action", type: "button", onclick: () => btMissionNext(next) }, label) : null
  ]);
  const shell = (title, body, foot) => div({ class: "lesson-stage m3-mission" }, [missionPhaseBar(state.phase, lesson.phases), h("p", { class: "m3-phase" }, title), body, foot]);

  if (state.phase === "s1") {
    const done = devices.every(device => state.types[device.id] === device.tech);
    return shell("Paso 1 · ¿Bluetooth clásico o BLE? Usa las pistas de cada ficha.", div({ class: "m3-lab bt-mgrid" }, devices.map(device => {
      const answer = state.types[device.id];
      const ok = answer === device.tech;
      return btMissionDeviceCard(device, [
        div({ class: "bt-choice-row" }, [["classic", "Clásico"], ["ble", "BLE"]].map(([id, label]) => button({
          class: `m3-option bt-choice ${answer === id ? (ok ? "active" : "wrong") : ""}`,
          type: "button",
          disabled: ok,
          onclick: () => { if (id !== device.tech) app.lesson.errors += 1; app.lesson.types[device.id] = id; render(); }
        }, label))),
        answer ? btFeedback(ok, ok ? (device.tech === "classic" ? "Audio o flujo continuo → Bluetooth clásico." : "Datos pequeños, ráfagas y bajo consumo → BLE.") : "Mira las pistas: ¿flujo continuo o ráfagas cortas con poca batería?") : null
      ]);
    })), footer(done, "s2", "Paso 2 →"));
  }

  const multiStep = (title, selKey, checkedKey, items, isTarget, labelOf, explainOf, next, nextLabel, intro) => {
    const allRight = items.every(item => state[selKey].includes(item.id) === isTarget(item));
    const checked = state[checkedKey];
    return shell(title, div({ class: "m3-lab" }, [
      intro || null,
      btMultiSelect(items, selKey, checkedKey, isTarget, labelOf, explainOf),
      checked ? btFeedback(allRight, allRight ? "Selección correcta." : "Algunas marcas no son correctas: revisa las explicaciones y vuelve a comprobar.") : null
    ]), div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Errores: ${state.errors}`),
      checked && allRight
        ? button({ class: "primary-action", type: "button", onclick: () => btMissionNext(next) }, nextLabel)
        : button({ class: "primary-action", type: "button", disabled: !state[selKey].length, onclick: () => { if (!allRight) app.lesson.errors += 1; app.lesson[checkedKey] = true; render(); } }, "Comprobar")
    ]));
  };
  const deviceLabel = device => div({}, [h("strong", {}, `${device.icon} ${device.name}`), h("small", { class: "bt-multi-clue" }, device.clues[1])]);

  if (state.phase === "s2") {
    return multiStep("Paso 2 · ¿Cuáles están siendo descubiertos ahora (aparecen en el escaneo)?", "discSel", "discChecked", devices, device => device.discovered, deviceLabel,
      device => device.discovered ? "Aparece en el escaneo: se está anunciando." : "No aparece: ya está vinculado y conectado, no se anuncia.", "s3", "Paso 3 →");
  }
  if (state.phase === "s3") {
    return multiStep("Paso 3 · ¿Cuáles están emparejados (tienen claves guardadas con otro dispositivo)?", "pairSel", "pairChecked", devices, device => device.paired, deviceLabel,
      device => device.paired ? "Guardó claves al emparejarse: hay confianza establecida." : "Solo fue encontrado: no hay claves compartidas.", "s4", "Paso 4 →");
  }
  if (state.phase === "s4") {
    const options = [["authn", "🪪 Autenticación"], ["authz", "🛂 Autorización"], ["crypto", "🔐 Cifrado"]];
    const done = lesson.events.every(event => state.events[event.id] === event.answer);
    return shell("Paso 4 · Registro de eventos: ¿qué mecanismo de seguridad interviene en cada uno?", div({ class: "m3-lab bt-events" }, lesson.events.map(event => {
      const answer = state.events[event.id];
      const ok = answer === event.answer;
      return div({ class: `bt-event ${answer ? (ok ? "ok" : "bad") : ""}` }, [
        h("code", {}, `[evento] ${event.text}`),
        div({ class: "bt-choice-row" }, options.map(([id, label]) => button({
          class: `m3-option bt-choice ${answer === id ? (ok ? "active" : "wrong") : ""}`,
          type: "button",
          disabled: ok,
          onclick: () => { if (id !== event.answer) app.lesson.errors += 1; app.lesson.events[event.id] = id; render(); }
        }, label))),
        answer ? btFeedback(ok, ok ? { authn: "Verificar identidad → autenticación.", authz: "Decidir qué se permite → autorización.", crypto: "Información ilegible para terceros → cifrado." }[event.answer] : "Pregúntate: ¿trata de identidad, de permisos o de proteger el contenido?") : null
      ]);
    })), footer(done, "s5", "Paso 5 →"));
  }
  return multiStep("Paso 5 · ¿Qué situaciones son potencialmente inseguras?", "riskSel", "riskChecked", lesson.situations, item => item.risk,
    item => h("span", {}, item.text), item => item.explain, "done", "Completar misión →");
}

// ---------------------------------------------------------------------------
// Misión por pasos ("steps-mission"): motor genérico definido por datos.
// Cada paso es de un tipo — "per-item" (una opción por fila), "single"
// (una pregunta) o "multi" (marcar los correctos y comprobar) — y todos
// comparten un escenario (lesson.scan) visible arriba. Reutiliza la
// retroalimentación, la selección múltiple, el bloqueo, la barra de fases,
// la pantalla final y finishMission (XP + insignia) de las otras misiones.
// Lo usa la misión del Módulo 1; sirve para futuras misiones solo con datos.
// ---------------------------------------------------------------------------
function stepsMissionInit(lesson) {
  const state = { phase: "brief", answers: {}, errors: 0, stepErrors: {} };
  lesson.steps.filter(step => step.kind === "multi").forEach(step => { state[`sel_${step.id}`] = []; state[`chk_${step.id}`] = false; });
  return state;
}

// Un error en un paso de la misión: cuenta para el XP total y para saber qué
// concepto conviene repasar en la pantalla final.
function stepMiss(step) {
  app.lesson.errors += 1;
  app.lesson.stepErrors = app.lesson.stepErrors || {};
  app.lesson.stepErrors[step.id] = (app.lesson.stepErrors[step.id] || 0) + 1;
}

function stepComplete(step, state) {
  const answer = state.answers[step.id];
  if (step.kind === "per-item") return step.items.every(item => answer?.[item.id] === item.answer);
  if (step.kind === "single") return answer !== undefined && step.options[answer].correct;
  return state[`chk_${step.id}`] && step.items.every(item => state[`sel_${step.id}`].includes(item.id) === item.target);
}

function stepsMissionNext(lesson, index) {
  const next = lesson.steps[index + 1];
  if (!next) return finishMission(lesson);
  app.lesson.phase = next.id;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scanPanel(scan) {
  if (scan.columns) {
    return div({ class: "m3-lab sm-scan" }, [
      div({ class: "m3-capture-title" }, ["◉ ", scan.title]),
      div({ class: "sm-table-wrap" }, [
        h("table", { class: "sm-table" }, [
          h("thead", {}, [h("tr", {}, scan.columns.map(column => h("th", {}, column.label)))]),
          h("tbody", {}, scan.rows.map(row => h("tr", {}, scan.columns.map(column => h("td", {}, column.code ? [h("code", {}, row[column.key])] : row[column.key])))))
        ])
      ])
    ]);
  }
  return div({ class: "m3-lab sm-scan" }, [
    div({ class: "m3-capture-title" }, ["◉ ", scan.title]),
    div({ class: "sm-table-wrap" }, [
      h("table", { class: "sm-table" }, [
        h("thead", {}, [h("tr", {}, ["BSSID", "SSID", "Canal", "Banda", "Estándar"].map(label => h("th", {}, label)))]),
        h("tbody", {}, scan.networks.map(net => h("tr", {}, [h("td", {}, [h("code", {}, net.bssid)]), h("td", {}, net.ssid), h("td", {}, String(net.channel)), h("td", {}, net.band), h("td", {}, net.standard)])))
      ])
    ]),
    div({ class: "sm-table-wrap" }, [
      h("table", { class: "sm-table" }, [
        h("thead", {}, [h("tr", {}, ["Cliente (MAC)", "BSSID asociado", "Dispositivo"].map(label => h("th", {}, label)))]),
        h("tbody", {}, scan.stations.map(station => h("tr", {}, [h("td", {}, [h("code", {}, station.mac)]), h("td", {}, [h("code", {}, station.bssid)]), h("td", {}, station.note)])))
      ])
    ])
  ]);
}

function perItemStep(step, state) {
  const answers = state.answers[step.id] || {};
  return div({ class: "m3-lab bt-events" }, step.items.map(item => {
    const answer = answers[item.id];
    const ok = answer === item.answer;
    return div({ class: `bt-event ${answer ? (ok ? "ok" : "bad") : ""}` }, [
      div({}, [h("strong", {}, item.label), item.detail ? span({ class: "m3-chip tone-plain mini sm-detail" }, item.detail) : null]),
      div({ class: "bt-choice-row" }, step.options.map(option => button({
        class: `m3-option bt-choice ${answer === option.id ? (ok ? "active" : "wrong") : ""}`,
        type: "button",
        disabled: ok,
        onclick: () => {
          if (option.id !== item.answer) stepMiss(step);
          app.lesson.answers[step.id] = { ...(app.lesson.answers[step.id] || {}), [item.id]: option.id };
          render();
        }
      }, option.label))),
      answer ? btFeedback(ok, ok ? item.explain : item.hint) : null
    ]);
  }));
}

function singleStep(step, state) {
  const answer = state.answers[step.id];
  const solved = answer !== undefined && step.options[answer].correct;
  return div({ class: "m3-lab" }, [
    div({ class: "sm-single" }, step.options.map((option, index) => button({
      class: `m3-option ${answer === index ? (option.correct ? "active" : "wrong") : ""}`,
      type: "button",
      disabled: solved,
      onclick: () => { if (!option.correct) stepMiss(step); app.lesson.answers[step.id] = index; render(); }
    }, option.label))),
    answer !== undefined ? btFeedback(step.options[answer].correct, step.options[answer].explain) : null
  ]);
}

function multiStep(step, state) {
  const selKey = `sel_${step.id}`;
  const chkKey = `chk_${step.id}`;
  const allRight = step.items.every(item => state[selKey].includes(item.id) === item.target);
  return div({ class: "m3-lab" }, [
    btMultiSelect(step.items, selKey, chkKey, item => item.target, item => h("code", {}, item.label), item => item.explain),
    state[chkKey] ? btFeedback(allRight, allRight ? "Selección correcta." : "Algunas marcas no son correctas: revisa las explicaciones y vuelve a comprobar.") : null,
    state[chkKey] && allRight ? null : div({ class: "lesson-actions" }, [button({
      class: "ghost-action compact",
      type: "button",
      disabled: !state[selKey].length,
      onclick: () => { if (!allRight) stepMiss(step); app.lesson[chkKey] = true; render(); }
    }, "Comprobar")])
  ]);
}

function stepsMissionView(lesson, state) {
  const locked = missionLockedView(lesson);
  if (locked) return locked;
  if (state.phase === "done") return missionComplete(lesson, state);
  if (state.phase === "brief") {
    return div({ class: "lesson-stage m3-mission" }, [
      div({ class: "m3-lab m3-brief" }, [
        span({ class: "m3-behind-label" }, lesson.brief.file),
        h("h3", {}, lesson.brief.heading),
        h("p", {}, lesson.brief.text),
        div({ class: "m3-brief-objectives" }, lesson.steps.map((step, index) => div({}, [span({ class: "m3-brief-num" }, String(index + 1)), span({}, `Aplica «${step.lesson}»`)]))),
        h("p", { class: "m3-caption small" }, `Recompensa: XP según tus aciertos + insignia «${lesson.badge.name}».`)
      ]),
      div({ class: "lesson-actions" }, [button({ class: "primary-action", type: "button", onclick: () => { app.lesson.phase = lesson.steps[0].id; render(); } }, "Iniciar misión →")])
    ]);
  }
  const index = lesson.steps.findIndex(step => step.id === state.phase);
  const step = lesson.steps[index];
  const complete = stepComplete(step, state);
  const body = step.kind === "per-item" ? perItemStep(step, state) : step.kind === "single" ? singleStep(step, state) : multiStep(step, state);
  return div({ class: "lesson-stage m3-mission" }, [
    missionPhaseBar(state.phase, lesson.phases),
    lesson.scan ? scanPanel(lesson.scan) : null,
    h("p", { class: "m3-phase" }, step.prompt),
    body,
    div({ class: "practice-footer" }, [
      span({ class: "practice-attempts" }, `Errores: ${state.errors}`),
      complete ? button({ class: "primary-action", type: "button", onclick: () => stepsMissionNext(lesson, index) }, index === lesson.steps.length - 1 ? "Completar misión →" : `Paso ${index + 2} →`) : null
    ])
  ]);
}

m3PracticeInits["steps-mission"] = stepsMissionInit;
missionViews["steps-mission"] = stepsMissionView;

// ===========================================================================
// MÓDULO 2 — componentes (Seguridad Wi-Fi)
// Se registran en los mismos registros del motor que los módulos 3 y 5
// (m3LearnVisuals, m3PracticeStages, m3PracticeInits). Cada estado se
// comunica con texto e icono además del color (✓ / ⚠ / ✗).
// ===========================================================================

const M2_TONE_ICON = { ok: "✓", warn: "⚠", bad: "✗", info: "ℹ", plain: "·" };

// --- m2-flow: diagrama de comunicación con modos alternables -------------
// Cada modo define sus nodos, los enlaces entre ellos (con un paquete que
// viaja animado), lo que vería un observador cercano y una explicación. Lo
// usan WEP vs seguridad moderna, sin/con cifrado Wi-Fi y Personal vs Enterprise.
function renderM2Flow(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { mode: null, seen: [], node: null };
  const mode = visual.modes.find(item => item.id === sel.mode);
  const pickMode = id => { app.lesson.stepSelections[stepIndex] = { mode: id, seen: m3Toggle(sel.seen, id), node: null }; m3Play(`m2flow-${stepIndex}-${id}`); render(); };
  const pickNode = index => { app.lesson.stepSelections[stepIndex] = { ...sel, node: sel.node === index ? null : index }; render(); };
  const allSeen = visual.modes.every(item => sel.seen.includes(item.id));
  const diagram = mode ? div({ class: `m2-flow tone-${mode.tone} ${m3Flashing(`m2flow-${stepIndex}-${mode.id}`) ? "anim" : ""}`, role: "img", "aria-label": `${mode.label}: ${mode.nodes.map(node => node.label).join(" → ")}` },
    mode.nodes.flatMap((node, index) => {
      const nodeEl = button({
        class: `m2-node ${sel.node === index ? "active" : ""} ${node.detail ? "" : "static"}`,
        type: "button",
        disabled: !node.detail,
        "aria-pressed": sel.node === index ? "true" : "false",
        onclick: () => pickNode(index)
      }, [span({ class: "m2-node-icon", "aria-hidden": "true" }, node.icon), h("small", {}, node.label)]);
      const link = mode.links[index];
      if (!link) return [nodeEl];
      const tone = link.tone || mode.tone;
      const packet = link.packet ?? mode.packet;
      return [nodeEl, div({ class: `m2-link tone-${tone}` }, [
        span({ class: "m2-link-line", "aria-hidden": "true" }, ""),
        packet && tone !== "plain" ? span({ class: "m2-packet", "aria-hidden": "true", style: { animationDelay: `${index * 0.6}s` } }, packet) : null,
        h("small", { class: "m2-link-label" }, [span({ "aria-hidden": "true" }, `${M2_TONE_ICON[tone] || ""} `), link.label])
      ])];
    })) : null;
  return div({ class: "m3-lab m2-flow-lab" }, [
    div({ class: "m2-tabs", role: "group", "aria-label": "Modos" }, visual.modes.map(item => button({
      class: `m2-tab tone-${item.tone} ${sel.mode === item.id ? "active" : ""} ${sel.seen.includes(item.id) ? "seen" : ""}`,
      type: "button",
      "aria-pressed": sel.mode === item.id ? "true" : "false",
      onclick: () => pickMode(item.id)
    }, [span({ "aria-hidden": "true" }, item.icon), span({}, item.label)]))),
    diagram || h("p", { class: "m3-caption" }, visual.prompt || "Elige un modo."),
    mode && sel.node !== null && mode.nodes[sel.node]?.detail ? m3Note(`${mode.nodes[sel.node].icon} ${mode.nodes[sel.node].label}`, mode.nodes[sel.node].detail) : null,
    mode?.observer ? div({ class: `m2-observer tone-${mode.tone}` }, [
      span({ class: "m3-behind-label" }, `👀 ${mode.observer.title}`),
      h("code", {}, mode.observer.text)
    ]) : null,
    mode ? m3Note(`${M2_TONE_ICON[mode.tone] || ""} ${mode.label}`, mode.detail, mode.tone === "ok" ? "ok" : mode.tone === "bad" ? "bad" : "") : null,
    allSeen ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.summary)]) : h("p", { class: "m3-caption small" }, `Modos explorados: ${sel.seen.length}/${visual.modes.length}`)
  ]);
}

// --- m2-cipher: texto en claro → texto cifrado → descifrado --------------
// Simulación visual, NO criptografía real: el "texto cifrado" es un resumen
// de juguete (m3SimMic) para que el mismo mensaje siempre se vea igual.
function m2Garble(text) {
  const symbols = "#%&@ÆØ§¶µ¤¿ß×ÞðþÐ";
  return m3SimMic(`otra-clave|${text}`).replace(/ /g, "").slice(0, text.length).split("").map(char => symbols[parseInt(char, 16) % symbols.length]).join("");
}

function renderM2Cipher(visual, state, stepIndex) {
  const sel = state.stepSelections[stepIndex] || { action: null, seen: [] };
  const cipher = m3SimMic(visual.plaintext);
  const tampered = cipher.replace(/^(\w)/, char => (char === "0" ? "1" : "0"));
  const encrypted = sel.seen.includes("encrypt");
  const act = action => { app.lesson.stepSelections[stepIndex] = { action, seen: m3Toggle(sel.seen, action) }; m3Play(`m2c-${stepIndex}-${action}`); render(); };
  const views = {
    encrypt: { cipher, result: "—", tone: "", title: "🔒 Cifrado", text: "La clave transformó el texto en claro en texto cifrado: alguien que lo capture solo ve esto." },
    decrypt: { cipher, result: visual.plaintext, tone: "ok", title: "✓ Descifrado con la clave correcta", text: "El receptor, que tiene la misma clave de sesión, recupera el mensaje original." },
    wrong: { cipher, result: m2Garble(visual.plaintext), tone: "bad", title: "✗ Descifrado con otra clave", text: "Sin la clave correcta sale basura: el texto cifrado no revela nada útil." },
    tamper: { cipher: tampered, result: "⚠ Trama rechazada", tone: "bad", title: "⚠ Alguien alteró el texto cifrado", text: "Cambió un solo carácter y el control de integridad ya no coincide: el receptor descarta la trama (CCMP incluye esta comprobación)." }
  };
  const view = views[sel.action] || { cipher: "—", result: "—", tone: "", title: null, text: null };
  const box = (label, value, extra = "") => div({ class: `m2-cbox ${extra}` }, [span({ class: "m3-behind-label" }, label), h("code", {}, value)]);
  const actions = [
    ["encrypt", "🔒 Cifrar", false],
    ["decrypt", "🔓 Descifrar (clave correcta)", !encrypted],
    ["wrong", "🗝️ Descifrar con otra clave", !encrypted],
    ["tamper", "✂️ Alterar el texto cifrado", !encrypted]
  ];
  return div({ class: "m3-lab m2-cipher" }, [
    div({ class: `m2-cipher-row ${m3Flashing(`m2c-${stepIndex}-${sel.action}`) ? "anim" : ""}` }, [
      box("Texto en claro", visual.plaintext),
      span({ class: "m2-carrow", "aria-hidden": "true" }, "→ 🔑 →"),
      box("Texto cifrado", view.cipher, sel.action === "tamper" ? "bad" : ""),
      span({ class: "m2-carrow", "aria-hidden": "true" }, "→ 🔑 →"),
      box("Resultado", view.result, view.tone)
    ]),
    div({ class: "m3-actions m2-cipher-actions" }, actions.map(([id, label, disabled]) => button({
      class: `m3-option ${sel.action === id ? "active" : ""}`,
      type: "button",
      disabled,
      title: disabled ? "Primero cifra el mensaje" : "",
      onclick: () => act(id)
    }, label))),
    view.title ? m3Note(view.title, view.text, view.tone) : h("p", { class: "m3-caption" }, "Empieza por «Cifrar»."),
    h("dl", { class: "m2-terms" }, visual.terms.flatMap(([term, meaning]) => [h("dt", {}, term), h("dd", {}, meaning)])),
    sel.seen.length === actions.length ? div({ class: "m3-summary" }, [span({ "aria-hidden": "true" }, "✓"), span({}, visual.summary)]) : h("p", { class: "m3-caption small" }, `Acciones probadas: ${sel.seen.length}/${actions.length}`)
  ]);
}

Object.assign(m3LearnVisuals, {
  "m2-flow": renderM2Flow,
  "m2-cipher": renderM2Cipher
});

// --- m2-decisions: escenario con decisiones y consecuencias visibles ------
// Cada decisión muestra su efecto en "Seguridad" y "Compatibilidad" (icono +
// texto, no solo color). Se resuelve cuando todas tienen la opción adecuada.
function m2DecisionsInit() { return { picks: {} }; }

function m2DecisionsStage(lesson, state) {
  const practice = lesson.practice;
  const done = practice.decisions.filter(decision => decision.options.find(option => option.id === state.picks[decision.id])?.ok).length;
  const pick = (decision, option) => {
    app.lesson.attempts += 1;
    app.lesson.picks[decision.id] = option.id;
    m3Play(`m2d-${decision.id}`);
    if (practice.decisions.every(item => item.options.find(entry => entry.id === app.lesson.picks[item.id])?.ok)) app.lesson.practiceSolved = true;
    render();
  };
  return m3PracticeShell(practice, [
    div({ class: "m3-lab m2-scenario" }, [
      span({ class: "m3-behind-label" }, practice.scenario.title),
      h("p", {}, practice.scenario.text),
      div({ class: "bt-device-chips" }, practice.scenario.devices.map(device => span({ class: "m3-chip tone-plain" }, device))),
      h("p", { class: "m3-caption small" }, `Decisiones resueltas: ${done}/${practice.decisions.length}`)
    ]),
    ...practice.decisions.map(decision => {
      const chosen = decision.options.find(option => option.id === state.picks[decision.id]);
      return div({ class: `m3-lab m2-decision ${chosen ? (chosen.ok ? "ok" : "bad") : ""}` }, [
        h("strong", {}, decision.title),
        h("p", { class: "m3-caption" }, decision.context),
        div({ class: "m2-decision-options" }, decision.options.map(option => button({
          class: `m3-option ${chosen?.id === option.id ? (option.ok ? "active" : "wrong") : ""}`,
          type: "button",
          disabled: Boolean(chosen?.ok),
          onclick: () => pick(decision, option)
        }, option.label))),
        chosen ? div({ class: `m2-effects ${m3Flashing(`m2d-${decision.id}`) ? "anim-pop" : ""}` }, chosen.effects.map(([label, tone]) => span({ class: `m2-effect tone-${tone}` }, [
          span({ "aria-hidden": "true" }, M2_TONE_ICON[tone]), ` ${label}: `, h("strong", {}, { ok: "adecuada", warn: "con límites", bad: "insuficiente" }[tone])
        ]))) : null,
        chosen ? btFeedback(chosen.ok, chosen.text) : null
      ]);
    }),
    state.practiceSolved ? m3Success(practice.success, "✓ ¡Red actualizada!") : null
  ], m3PracticeFooter(state));
}

Object.assign(m3PracticeStages, { "m2-decisions": m2DecisionsStage });
Object.assign(m3PracticeInits, { "m2-decisions": m2DecisionsInit });

function rankingView() {
  return div({ class: "ranking-page" }, [div({ class: "section-head" }, [div({}, [h("h2", {}, "Ranking")])]), ...leaderboard().map((player, index) => div({ class: `ranking-row ${player.current ? "current" : ""}` }, [span({ class: "rank" }, `#${index + 1}`), div({ class: "avatar" }, player.name.slice(0, 1).toUpperCase()), div({ class: "grow" }, [h("strong", {}, player.name), h("p", { class: "muted tight" }, `${player.handle} · ${player.solves} retos`)]), span({ class: "streak" }, `racha ${player.streak}`), h("strong", { class: "score" }, String(player.score))]))]);
}

const adminViewsByTab = { "admin-home": adminHomeView, "admin-ranking": adminRankingView, "admin": adminView, "admin-groups": adminGroupsView, estudiante: studentDetailView };
const profesorViewsByTab = { "profesor-home": professorHomeView, "grupos": groupsView, "estudiante": studentDetailView };

function shell() {
  if (app.loading || !app.challenges.length) return div({ class: "page" }, [header(), loadingView()]);
  // Ni el admin ni el profesor son jugadores: sin KPIs de puntos/ranking en
  // el costado (el profesor ya no juega retos), y cada uno navega solo entre
  // sus propias pestañas de gestión (ver header()).
  if (app.user.role === "admin") {
    const view = adminViewsByTab[app.activeTab] || adminHomeView;
    return div({ class: "page" }, [header(), h("main", { class: "admin-main" }, view())]);
  }
  if (app.user.role === "profesor") {
    const view = profesorViewsByTab[app.activeTab] || professorHomeView;
    return div({ class: "page" }, [header(), h("main", { class: "admin-main" }, view())]);
  }
  const current = selectedChallenge();
  const content = app.activeTab === "dashboard" ? dashboardView() : app.activeTab === "teoria" ? theoryView() : app.activeTab === "lesson" ? lessonView() : app.activeTab === "ranking" ? rankingView() : app.activeTab === "perfil" ? profileView() : app.activeTab === "reto" ? challengeDetail(current) : app.activeTab === "terminal" ? terminalView() : challengesView();
  // Sin columna lateral de KPIs: puntos y puesto ya están en el chip del
  // encabezado, así el contenido usa todo el ancho.
  return div({ class: "page" }, [header(), h("main", { class: "player-main" }, content)]);
}

function render() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  const onLanding = !app.user && publicScreen === "landing";
  // El fondo de video "consola" del resto de la app se apaga mientras se ve la
  // landing (que trae su propio fondo animado) y reaparece al entrar de verdad.
  document.body.classList.toggle("landing-active", onLanding);
  root.appendChild(app.user ? (app.mustChangePassword ? forcedPasswordView() : shell()) : (onLanding ? landingView() : loginView()));
}

// Pantalla de cambio obligatorio: aparece tras entrar con una contraseña
// temporal emitida por un admin. Bloquea el resto de la app hasta cambiarla.
function forcedPasswordView() {
  const submit = async () => {
    const current = (document.getElementById("fpc-current") || {}).value || "";
    const next = (document.getElementById("fpc-new") || {}).value || "";
    const confirmPw = (document.getElementById("fpc-confirm") || {}).value || "";
    if (next.length < 4) return toast("La nueva contraseña debe tener al menos 4 caracteres.", "warn");
    if (next !== confirmPw) return toast("Las contraseñas nuevas no coinciden.", "warn");
    try {
      const response = await apiFetch(API + "/api/players/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: app.playerId, currentPassword: current, newPassword: next })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cambiar la contraseña.");
      app.mustChangePassword = false;
      toast("Contraseña actualizada. ¡Bienvenido!", "success");
      render();
    } catch (error) {
      toast(error.message || "No se pudo cambiar la contraseña.", "error");
    }
  };
  return div({ class: "login-shell login-single" }, [
    div({ class: "login-panel auth-card" }, [
      h("p", { class: "eyebrow" }, "seguridad"),
      h("h2", {}, "Cambia tu contraseña temporal"),
      h("p", { class: "muted" }, "Un administrador te dio una contraseña temporal. Define una nueva para continuar."),
      h("label", {}, "Contraseña temporal (actual)"),
      h("input", { id: "fpc-current", type: "password", autocomplete: "current-password" }, []),
      h("label", {}, "Nueva contraseña"),
      h("input", { id: "fpc-new", type: "password", autocomplete: "new-password" }, []),
      h("label", {}, "Repite la nueva contraseña"),
      h("input", { id: "fpc-confirm", type: "password", autocomplete: "new-password" }, []),
      button({ class: "primary-action", type: "button", onclick: submit }, "Guardar y entrar")
    ])
  ]);
}

function goToAuth(mode) {
  authMode = mode;
  publicScreen = "auth";
  render();
}

function backToLanding() {
  publicScreen = "landing";
  authMode = "login";
  render();
}

initThemeToggle();
setInterval(updateResendCountdown, 1000); // no-op cuando no hay pantalla de verificación montada
render();
if (app.user) hydratePlatform();