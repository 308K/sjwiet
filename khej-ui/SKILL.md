---
name: khej-ui-design
description: Use this skill to generate well-branded interfaces for Khej UI. Contains colors, type, fonts, assets, and UI kit for prototyping General UIs with Eastern aesthetics (东方美学).
user-invocable: true
---
# Khej UI Design Skill

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts, copy assets out and create static HTML files. If working on production code, read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `README.md` — brand context, content fundamentals, visual foundations (read first)
- `css.json` — structured token understanding source
- `colors_and_type.css` — drop-in CSS variables for colors, type, radius, shadow, spacing
- `components/index.json` — component index + cross-component patterns
- `uikit-plan.json` — component whitelist and UIKit planner output
- `library-consumption.json` — recommended downstream read order
- `preview/` — small HTML cards illustrating foundations and components
- `ui_kits/general/` — full click-thru recreation

## Essentials at a glance
- Brand primary `#C53D43` (vermillion cinnabar red) — warm, authoritative, Eastern-ink-painting energy. Accent `#3457A5` (indigo blue) for secondary/supplementary contexts.
- Radius: **2 / 4 / 8 / 12** px — controlled sharpness, pill (`9999px`) only for tags and status chips, never for cards or modals.
- Control height: buttons **32 / 40 / 48** px (sm/md/lg), inputs **36** px. Spacing base **8** px, scale 4–64 px.
- Fonts: **Noto Serif SC** for display and headings (calligraphic authority); **Noto Sans SC** for body and UI (clean readability); loaded via Google Fonts CDN.
- Voice: bilingual CN-first, contemplative and restrained — formal but warm. No emoji in product UI.
- Shadows: 5 whisper-quiet layers (`shadow-1` through `shadow-5`), using `rgba(43,43,43,.04–.14)` — barely-there at rest, soft ink-wash elevation on hover/float.
- Brand quirk: seal-stamp (印章) motif — square, sharp-cornered tags and primary buttons evoke traditional Chinese vermilion seals; round/pill shapes are reserved exclusively for status indicators.
- Surface palette: warm parchment neutrals (`--khej-surface-100` `#F5F4F0`) with ink-dark text (`--khej-text-900` `#2B2B2B`), never pure white or cold gray.

## Components
| Slug | Name | Key Insight |
|------|------|-------------|
| button | Button | Vermillion seal-stamp button as brand signature interaction |
| card | Card | Parchment card with generous whitespace as scroll-section content unit |
| input | Input | Underlined input mimicking brush-stroke baseline, minimal chrome |
| navigation | Navigation | Vertical tab navigation aligned to right edge, following 右起左行 reading |
| modal | Modal | Dialog with warm parchment background and ink-dark overlay |
| tag | Tag | Square seal-stamp tag as the brand's most recognizable micro-element |
