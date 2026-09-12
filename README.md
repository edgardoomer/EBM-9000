<p align="center">
  <img src="imagenes_creditos/logo.png" alt="Logo EBM-9000" width="140">
</p>

<h1 align="center">EBM-9000</h1>
<p align="center"><b>Simulador didáctico de la Ecuación de Balance de Materiales</b><br>
Aplicación web estática (HTML + CSS + JavaScript) lista para publicarse en GitHub Pages o Netlify.</p>

---

## ¿Qué es?

EBM-9000 explica de forma interactiva la **ecuación general de balance de materiales de Schilthuis** para yacimientos de petróleo (en la forma presentada por Fanchi, *Principles of Applied Reservoir Simulation*, 3.ª ed., §2.3), y su reducción para yacimientos de gas.

La app tiene **tres pestañas**:

| Pestaña | Contenido |
| --- | --- |
| **Simulación** | El yacimiento como un tanque que ocupa toda la pantalla. Botón de reproducción (un ciclo dura 5 min a 1×), barra de tiempo, velocidades 0.5×–4×, eventos (punto de burbuja, inicio de inyección, irrupción de agua, punto muerto), tablero de variables y **panel con la ecuación en vivo**: dos barras que siempre miden lo mismo (expansiones + entradas = producción). Al pasar el puntero por cualquier variable o término aparece la **pregunta a la que responde** (p. ej. *N·D<sub>go</sub>: ¿Cuánto cambió el volumen del gas libre?*). Arriba, dos botones: **Ejemplo** y **Mis datos** (formulario con validación; los datos se guardan en el navegador). |
| **Teoría y autores** | Qué es el balance de materiales, para qué sirve, la ecuación general (2.6), los términos de expansión (2.7), la forma compacta (2.8) y la tabla de significado físico, suposiciones, el caso de yacimiento de gas (2.9–2.12), simbología con unidades, **la ecuación sustituida con los datos de la simulación** (sincronizada con el instante elegido), cómo genera los datos la app, autores de la teoría y una **bibliografía** en una barra fija que se despliega/minimiza al hacer clic en cualquier punto de la barra. Arriba, un conmutador **Campo / Sistema Internacional** que convierte todos los valores automáticamente. |
| **Créditos** | Objetivo y resumen del proyecto, autor, enlaces, código QR a la página web y acceso al perfil de creación de contenido. |

Paleta: botones `#1F3B5C` · menú `#3F6FA6` · agua `#A9C9E8` · petróleo `#7A4E2D` · fondo `#E7D8C9`.

## Estructura del repositorio

```
EBM-9000/
├── index.html                 # Las tres pestañas (marcado y textos de teoría)
├── css/styles.css             # Estilos y paleta
├── js/
│   ├── units.js               # Unidades de campo ↔ SI y formato de números
│   ├── model.js               # Modelo de tanque: PVT, expansiones, reparto de producción
│   ├── data.js                # Ejemplo, registro de variables (símbolo + pregunta), formulario
│   ├── tank.js                # Dibujo SVG del yacimiento
│   ├── sim.js                 # Reproducción, tablero, panel de la ecuación, línea de tiempo, tooltips
│   ├── theory.js              # KaTeX, simbología, sustitución numérica, bibliografía
│   └── app.js                 # Pestañas, unidades, modal "Mis datos"
├── imagenes_creditos/         # Logo, foto, QR, imagen de Instagram y CREDITOS.txt
├── .github/workflows/deploy-pages.yml   # Despliegue automático en GitHub Pages
├── netlify.toml               # Configuración para Netlify (sin build)
└── .nojekyll                  # Evita el procesamiento Jekyll en Pages
```

No hay dependencias que instalar ni paso de compilación. Las únicas descargas externas son KaTeX (CDN jsDelivr) y las tipografías de Google Fonts; si no están disponibles, la app sigue funcionando (las ecuaciones se muestran como texto).

## Ejecutar en local

Basta con abrir `index.html` en el navegador. Para servirlo por HTTP:

```bash
py -3 -m http.server 8765
```

o, con Node:

```bash
npx serve .
```

## Publicar

### Opción A · GitHub Pages (recomendada, ya configurada)

1. Sube el repositorio a GitHub (`git push origin main`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: "GitHub Actions"**. El flujo `deploy-pages.yml` intenta habilitarlo solo; si no, este paso lo hace manualmente.
3. Cada `push` a `main` publica el sitio en **https://edgardoomer.github.io/EBM-9000/** (la URL aparece en la pestaña *Actions* y en *Settings → Pages*).

Alternativa sin Actions: en *Settings → Pages* elige **Deploy from a branch → main → / (root)**. El archivo `.nojekyll` ya evita que Jekyll toque los archivos.

### Opción B · Netlify conectado a GitHub

Sí, puedes conectar Netlify al repositorio y el despliegue es inmediato:

1. Entra en [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project → GitHub** y elige `edgardoomer/EBM-9000`.
2. Netlify lee `netlify.toml`: *build command* vacío y *publish directory* `.`. No hay que cambiar nada. Pulsa **Deploy**.
3. A partir de ahí, cada `push` a `main` redepliega el sitio y cada *pull request* recibe una URL de vista previa. Puedes cambiar el subdominio (`*.netlify.app`) o añadir un dominio propio en *Site settings → Domain management*.

Ambas opciones pueden convivir (por ejemplo, Pages como sitio principal y Netlify para previsualizaciones).

## ¿Cómo genera los datos la simulación?

La app usa el propio balance de materiales como modelo de tanque:

- La presión declina desde P<sub>i</sub> hasta la presión final con una curva prescrita; las propiedades PVT se interpolan entre los valores inicial y final indicados (por encima de P<sub>b</sub>, R<sub>so</sub> es constante).
- La intrusión de agua sigue el modelo de estado estable de Schilthuis; la inyección crece linealmente desde el instante de inicio.
- La RGP de producción y el corte de agua siguen curvas suaves hasta los valores finales; el gas libre producido se reparte entre la capa de gas y el gas liberado según los volúmenes disponibles.
- En cada paso se calcula el vaciamiento (expansiones + intrusión + inyección) y se reparte en petróleo, gas y agua de modo que la ecuación (2.8) **se cumple exactamente**; por eso las dos barras del panel siempre coinciden. El modelo avisa cuando los datos dan resultados poco realistas.

## Créditos y bibliografía

- Teoría: Fanchi, J. R. (2006). *Principles of Applied Reservoir Simulation*, 3.ª ed., §2.3, Elsevier. Ecuación original: Schilthuis, R. J. (1936), *Trans. AIME* 118, 33–52. La bibliografía completa está en la pestaña de teoría.
- Autor de la app: **Ing. Edgar Izurieta** — [LinkedIn](https://www.linkedin.com/in/edgarfer/) · [Instagram](https://www.instagram.com/doom.petrolero) · [Web](https://edgarpetrolero.duckdns.org/) · [GitHub](https://github.com/edgardoomer).
- Herramientas: [KaTeX](https://katex.org/), Google Fonts (Exo 2, Inter).

Publicado bajo licencia [MIT](LICENSE).
