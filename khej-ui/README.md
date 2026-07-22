# Khej UI Design System

Khej UI is a design system rooted in Eastern aesthetic philosophy -- think ink-wash restraint, vermillion seal authority, and the compositional discipline of classical scroll painting. It is purpose-built for product interfaces that need to convey cultural depth without sacrificing modern usability. The system was generated from a from-scratch brand definition (no Figma bundle), meaning every token and component was synthesized from brand intent rather than extracted from an existing library.

## Source

- **Route:** from-scratch (no Figma bundle)
- **Brand owner:** Khej UI
- **Component count:** 6 documented components

## What this design system covers

- **Foundations** -- 8 color scales (primary vermillion, accent indigo, secondary sage, surface parchment, neutral stone, text ink, success, warning, error, info), dual-font serif/sans system, 4-based spacing, 5 shadow layers, 5 radius tokens
- **Components** -- Button, Card, Input, Navigation, Modal, Tag -- each with brand-specific variants (e.g. seal-stamp button, parchment card, underlined input)
- **Dark theme** -- complete `.dark` token override set

---

## CONTENT FUNDAMENTALS

### Voice & tone

Khej UI speaks the language of classical Chinese design philosophy -- restrained, authoritative, poetic. Copy leans on cultural metaphors drawn from calligraphy and scroll painting: "计白当黑，留白为美" (count the white as black, whitespace is beauty) is not decoration but a design principle woven into component spacing and card proportions. The tone is warm but never casual; it presumes an audience that values craft over flash. Product copy is in Simplified Chinese, and labels use a mix of structural terms (概述, 参数, 示例, 变更记录) alongside brand-cultural terms (钤印, 提升卡片, 纸质卡片). Emoji is absent from the product UI.

### Concrete copy examples (lifted from the design system)

- Card title: *"关于我们"* / body: *"Khej UI 致力于打造优雅且高效的界面设计系统，融合东方美学与现代交互范式。"*
- Card title: *"设计理念"* / body: *"计白当黑，留白为美。每一处空白都是对内容的尊重，让界面呼吸自然。"*
- Card title: *"服务详情"* / body: *"提供定制化设计系统搭建、组件库开发与视觉审计服务。"*
- Button stamp variant: *"钤印"* -- the seal-stamp button is the brand's signature interaction element
- Tag seal samples: *"Khej"*, *"认证"*, *"官方"* -- used for brand trust marks
- Navigation vertical tabs: *"概述", "参数", "示例", "变更记录"*
- Navigation horizontal tabs: *"全部", "进行中", "已完成", "已归档"*
- Modal dialog: *"确认操作"* / body: *"确定要继续执行此操作吗？此更改将无法撤销。"*
- Input helper text: *"6-20个字符"*, *"用于账户安全验证"*, *"密码长度不足，至少需要8位"*

### When generating copy

- Use Chinese-first product language. English appears only in technical identifiers, CSS class names, and code contexts.
- Prefer concise, structural labels over verbose explanations. Navigation items are single nouns or two-character compounds.
- Error and helper text should be direct and prescriptive, not conversational: state the constraint, suggest the fix.
- The brand-cultural terms (钤印, 留白, 意境, 题跋, 山水, 卷首, 目录, 序言, 正文, 附录) are reserved for branding and editorial contexts -- do not scatter them into generic UI chrome.

---

## VISUAL FOUNDATIONS

### Color

The palette is organized around warm, earthy tones anchored by a vermillion cinnabar red and an indigo blue accent. The primary scale (`--khej-primary`) runs from `#FDF2F2` (50) through `#C53D43` (500, the brand anchor) to `#4A1215` (900) -- a full 10-stop scale that moves from near-white blush to deep dried-blood darkness. The accent scale (`--khej-accent`) follows a similar trajectory but in indigo: `#EEF2FA` to `#3457A5` (500) to `#111D3A`, providing a cooler counterpoint for links and secondary actions.

Two additional chromatic scales round out the identity. The secondary scale (`--khej-secondary`) is a muted sage-green (`#4A7C6F` at 500) that evokes the patina of aged jade -- used sparingly for success-related or nature-toned contexts. The surface scale (`--khej-surface`) is a warm parchment series (`#F5F4F0` at 100, the default background) that replaces sterile white with the feeling of handmade paper.

The neutral and text scales (`--khej-neutral`, `--khej-text`) are stone-toned rather than pure grey, pulling warm undertones from the surface family. Primary foreground text is `#2B2B2B` (text-900), which reads as softer than pure black. The semantic colors -- success (`#3D8A62`), warning (`#C8850F`), error (`#C53D3D`), info (`#3D887E`) -- share the same warm-saturated character; note that error-500 `#C53D3D` is nearly identical to primary-500 `#C53D43`, a deliberate choice that keeps even error states within the brand's warm spectrum rather than jarring with a cold red.

In dark mode, the background shifts to `#1A1917` (a warm near-black), foreground to `#E8E5DC` (warm parchment white), and shadows deepen significantly (shadow-1 opacity jumps from .04 to .15). The accent inverts to primary-400 `#D45A5A`, keeping vermillion warmth at lower luminance.

### Typography

The type system uses a deliberate serif/sans split: **Noto Serif SC** for all headings and display text, **Noto Sans SC** for body and UI elements. This is not a generic fallback -- Noto Serif SC provides the brushstroke-like terminal quality that anchors the Eastern aesthetic, while Noto Sans SC delivers clean readability at small sizes. Both are loaded via Google Fonts with specific weight subsets: the serif uses 400, 600, 700; the sans uses 300, 400, 500, 600, 700.

The display type (`--font-size-display: 56px`, weight 700, line-height 1.1) is reserved for hero-level statements -- think scroll-title calligraphy scaled to web. Below that, h1 sits at 40px/1.2, h2 at 32px/1.25, h3 at 24px/1.3, and h4 at 20px/1.4. Body is 16px/1.6 -- generous line-height for Chinese characters which need more vertical breathing room than Latin text. Lead text pushes to 18px/1.7 for introductory paragraphs. Caption drops to 12px/1.5 for labels and helpers. A mono variant exists at 14px using Noto Sans SC with a monospace fallback, primarily for code or data-dense contexts.

Letter-spacing on display is -0.02em (slight tightening), while all other levels use the font's default spacing. The weight progression is intentional: display and h1 are bold (700), h2-h4 are semibold (600), and body/lead/caption/mono are regular (400). This creates a clear hierarchy where only the top two levels demand visual weight.

### Spacing

Spacing is built on a 4px base unit, but the token scale is non-linear to avoid micro-clutter: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 24px`, `--space-6: 32px`, `--space-7: 48px`, `--space-8: 64px`. The jump from 16 to 24 (skipping 20) and from 32 to 48 (skipping 40) is deliberate -- it prevents the density-first trap where everything becomes a uniform grid. Component heights reference these tokens: buttons are 32px (sm), 40px (md), 48px (lg); input height is 36px. Card padding uses space-4/space-2 combinations; modal headers go wider at space-5.

### Radius

Radius values are intentionally restrained, reflecting a preference for crisp edges over soft roundedness. The scale runs: `--radius-sm: 2px` (buttons, tags, input corners), `--radius-md: 4px` (cards, modals), `--radius-lg: 8px` (wide modals only), `--radius-xl: 12px` (available but rarely used), `--radius-pill: 9999px` (seal-stamp button variant only). The dominance of 2px and 4px gives the system a sharp, manuscript-like quality -- think brush-cut paper edges rather than beach-pebble softness. Pill radius is used exclusively for the stamp button and should not leak into other components.

### Shadow / Elevation

Five shadow layers create a subtle but coherent depth system. All shadows use warm rgba(43,43,43,...) anchors rather than pure black, keeping the warmth consistent with the color palette. Level 1 (`shadow-1`: 0 1px 2px at .04, 0 1px 1px at .02) is barely perceptible -- used for parchment cards at rest. Level 2 (`shadow-2`: 0 2px 6px at .06, 0 1px 3px at .03) elevates standard cards. Level 3 (`shadow-3`: 0 4px 12px at .08) is the hover state for cards. Level 4 (`shadow-4`: 0 8px 24px at .10) floats dropdowns and standard modals. Level 5 (`shadow-5`: 0 16px 40px at .14) is reserved for wide modals and overlays -- the heaviest elevation in the system.

The shadow philosophy is whisper-quiet. At rest, components barely lift off the surface; only interaction (hover) or overlay (modal) produces noticeable depth. In dark mode, shadow opacities roughly double (.15 for shadow-1 up to .35 for shadow-5) to remain visible against darker backgrounds.

### Borders

Borders are thin and unobtrusive. The default divider/outline color is `--color-outline: var(--khej-neutral-200)` (`#ECEAE3`), with a lighter variant `--color-outline-variant: var(--khej-neutral-100)` (`#F7F6F2`) for card headers and tag outlines. Active/focus borders use primary-500 (`#C53D43`) as a 2px bottom border (inputs) or a 2px bar (navigation indicators). The stamp button gets a distinctive 2px solid primary border that visually echoes the carved edge of a traditional seal. Card borders, when present, are always 1px outline-variant.

### Animation

Transitions are uniformly 150ms (`.15s`) targeting background, border-color, and box-shadow -- never transform or opacity. This keeps motion purposeful and quick, matching the restrained aesthetic. Card hover uses a `brightness(0.97)` filter rather than shadow change, which produces a subtle dimming effect like pressing into paper.

---

## COMPONENT PATTERNS

| Component | Preview | Contract | CSS Source | Key Facts | Key Insight |
|---|---|---|---|---|---|
| Button | `preview/component-button.html` | `components/button.json` | `components.css` section Button | 4 variants (primary, secondary, ghost, stamp), 3 sizes (sm/md/lg), disabled state | Vermillion seal-stamp (pill radius + 2px border) as brand signature |
| Card | `preview/component-card.html` | `components/card.json` | `components.css` section Card | 3 variants (elevated, outlined, parchment), compact/spacious modes, header/body/footer anatomy | Parchment card with brightness(0.97) hover mimics pressed paper |
| Input | `preview/component-input.html` | `components/input.json` | `components.css` section Input | 2 variants (underlined, filled), error state, helper text, 36px height | Underlined input evokes brush-stroke baseline; no visible border-radius |
| Navigation | `preview/component-navigation.html` | `components/navigation.json` | `components.css` section Navigation | 2 variants (vertical tabs right-aligned, horizontal scroll), active indicator 2px bar | Vertical nav aligns right, evoking right-to-left traditional reading |
| Modal | `preview/component-modal.html` | `components/modal.json` | `components.css` section Modal | 2 variants (standard dialog, wide scroll-overlay), header/body/footer, close button | Warm parchment surface under ink-dark overlay (rgba 43,43,43) |
| Tag | `preview/component-tag.html` | `components/tag.json` | `components.css` section Tag | 3 variants (default outlined, seal filled, accent filled), sm/md sizes, disabled | Seal tag (primary bg, sm radius) is the brand's most recognizable micro-element |

---

## Index

- `README.md` -- this file; brand narrative and visual foundations reference
- `colors_and_type.css` -- all CSS custom properties: color scales, short aliases, semantic layer, typography, spacing, sizing, radius, shadow; includes `.dark` theme override and typography utility classes
- `components.css` -- aggregated component CSS extracted from preview pages; Button, Card, Input, Modal, Navigation, Tag
- `css.json` -- structured JSON token representation for programmatic consumption
- `components/index.json` -- component index with slugs, categories, variant counts, and key insight seeds
- `components/{slug}.json` -- per-component compact contracts (schemaVersion 2) with variant dimensions, representative variants, anatomy, and do-not-invent constraints
- `preview/component-{slug}.html` -- self-contained HTML preview pages for each component
- `SKILL.md` -- AI agent skill manifest with quick map and essentials at a glance

---

## CAVEATS / KNOWN SUBSTITUTIONS

1. **Noto Serif SC / Noto Sans SC** are loaded via Google Fonts CDN (`fonts.googleapis.com`). In offline or restricted-network environments, these will not load and the browser will fall back to the generic `serif` / `sans-serif` stack. For production deployment, consider self-hosting the specific weight subsets (Serif: 400/600/700; Sans: 300/400/500/600/700) to avoid layout shift and ensure the Eastern typographic character is preserved.

2. **Mono font** (`--font-mono`) maps to Noto Sans SC with a `monospace` generic fallback. This provides CJK character coverage at the expense of true monospace alignment for Latin characters. If precise code alignment is needed, add a dedicated Latin mono face (e.g. JetBrains Mono or Source Code Pro) before the `monospace` fallback.

3. **No Figma source** -- this design system was created from-scratch without a Figma bundle. All components, tokens, and patterns are synthesized from brand intent. There are no `_evidence/` raw Figma extractions. Component contracts carry `"confidence": "medium"` and `"sourceKind": "from-scratch"`. Treat variants and states as intentional but not empirically verified against a production design tool.

4. **Icon system** is not formally defined in this library. The modal preview uses Lucide icons via CDN, but this is a preview convenience, not a system-level recommendation. A dedicated icon set with Eastern-aesthetic line weights should be specified before production use.

5. **Dark theme shadows** use significantly higher opacity values than light mode (up to .35 vs .14 at shadow-5). This was necessary for visibility but may appear heavier than intended on some displays. Test on the target hardware and consider reducing opacities if the dark mode feels overly dramatic.
