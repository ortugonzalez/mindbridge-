# directivas/visual_improvements_SOP.md

## Objetivo
Implementar mejoras visuales premium en el frontend de BRESO para transmitir calma y sofisticación, siguiendo la paleta "Sage Green" (#7C9A7E).

## Componentes y Reglas
1. **Splash Screen (`Splash.jsx`)**
   - **Fondo:** Gradiente fullscreen de #7C9A7E a #5A7A5C.
   - **Contenido:** Letra "S" grande, blanca, serif elegante. "Soledad" en blanco delgado. "por BRESO" en blanco 60% opacidad.
   - **Animación:** Fade-out suave antes de redirigir a otra página.

2. **Navigation Sidebar (`Navigation.jsx`)**
   - **Animación:** Deslizamiento desde la izquierda con `cubic-bezier`.
   - **Fondos:** Light: Blanco, Dark: #16213E.
   - **Items:** Icono + texto, efecto hover verde salvia, estado activo destacado.
   - **Overlay:** Negro 40% opacidad con blur.
   
3. **Chat Bubbles (`BresoChat.jsx`)**
   - **Soledad:** Fondo #7C9A7E, texto blanco, sombra suave. Componente Avatar antes del mensaje. Border-radius estilo globo (18px 18px 18px 4px).
   - **Usuario:** Fondo blanco, texto oscuro, border-radius (18px 18px 4px 18px).
   - **Animaciones:** Deslizamiento suave al aparecer (slide-in).

4. **Plan Cards (`PlanCard.jsx`)**
   - Diferenciar 3 planes: Free trial (Más popular, borde verde), Essential (minimalista), Premium (acento dorado #B8860B).
   - Estados: Hover con scale 1.02 y sombra. Seleccionado con borde verde y checkmark.

5. **Overall Polish**
   - Transiciones de página con `fade`.
   - Botones con pseudo-clases completas (hover, active).
   - Inputs con glow color verde salvia (#7C9A7E) al recibir focus.

## Trampas Conocidas / Restricciones
- Al agregar transiciones a las páginas (React Router), asegurarse de no romper el layout u ocultar el contenido durante la carga inicial.
- Asegurarse de que el Tailwind config contenga los colores personalizados (sage, gold) o usar custom CSS si es necesario.
- Ejecutar siempre `npm run build` después de todos los cambios de diseño.
