/* =========================================
   ESTILOS GENERALES (Reset)
   ========================================= */
body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden; /* Evita scrollbars innecesarias */
    background-color: #000; /* Fondo negro por defecto */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* =========================================
   CAPA 1: VIDEO DE FONDO
   ========================================= */
#bg-video {
    position: fixed;
    top: 50%;
    left: 50%;
    /* Truco CSS para cubrir pantalla completa manteniendo aspect ratio (cover) */
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    z-index: 1; /* Al fondo */
    object-fit: cover;
    
    /* TRUCO ESTÉTICO: */
    /* Oscurecemos un poco el video (brightness 0.8) y subimos contraste. */
    /* Esto hace que las partículas brillantes resalten mucho más. */
    filter: brightness(0.8) contrast(1.1); 
}

/* =========================================
   CAPA 2: CANVAS DE PARTÍCULAS
   ========================================= */
#particle-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2; /* Encima del video */
    pointer-events: none; /* Permite clicks a través del canvas (botones, play, etc.) */
    
    /* MAGIA VISUAL "BRUTAL MINIMALISTA" */
    
    /* 1. Mix Blend Mode: Screen */
    /* Hace que el negro del canvas sea transparente y los colores se SUMEN a la luz del video. */
    /* Crea un efecto de holograma/luz proyectada. */
    mix-blend-mode: screen; 
    
    /* 2. Post-Procesado CSS */
    /* Aumentamos saturación y contraste para que los colores calculados en JS */
    /* se vean intensos y eléctricos, no lavados. */
    filter: contrast(1.2) saturate(1.3);
    
    /* Suavidad si cambiamos clases dinámicamente */
    transition: filter 0.3s ease;
}

/* =========================================
   CAPA 3: INTERFAZ DE USUARIO (Opcional)
   ========================================= */
/* Si tienes un botón de "Iniciar" o controles, irían aquí */
#overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.6); /* Velo oscuro inicial */
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    cursor: pointer;
    transition: opacity 0.8s ease;
    backdrop-filter: blur(5px); /* Efecto vidrio esmerilado */
}

/* Clase para ocultar el overlay suavemente */
#overlay.hidden {
    opacity: 0;
    pointer-events: none;
}

.start-btn {
    padding: 15px 40px;
    border: 1px solid rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.1);
    color: white;
    font-size: 1.2rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    border-radius: 30px;
    transition: all 0.3s ease;
}

.start-btn:hover {
    background: white;
    color: black;
    box-shadow: 0 0 20px rgba(255,255,255,0.5);
}
