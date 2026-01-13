# Design System – Qontax

Este documento resume as principais decisões de design adotadas na landing page e no dashboard da Qontax para garantir consistência visual em futuras features.

## 1. Tipografia

### 1.1. Fontes
- **Primária (global)**: `Inter`, aplicada via `font-sans` no `body`.
- Peso típico por nível:
  - **H1**: `font-bold`
  - **H2**: `font-bold`
  - **H3**: `font-semibold`
  - **Body**: `font-normal` ou `font-medium` quando precisa de ênfase.

### 1.2. Regras Globais
- **Nunca usar ponto final (`.`) em títulos e subtítulos** (H1–H3 ou títulos de cards/seções).
- Preferir **`tracking-tight` para H1 e H2** (quando suportado) para dar sensação premium.
- Manter copy curta e direta em headings; detalhes vão no parágrafo.

### 1.3. Escala de Títulos

#### H1 – Título principal (Hero / páginas-chave)
- Classe base:
  ```tsx
  className="text-4xl md:text-6xl font-bold tracking-tight"
  ```
- Contexto:
  - Hero da landing.
  - Título principal de páginas que exigem forte destaque.

#### H2 – Títulos de seção
- Classe base:
  ```tsx
  className="text-3xl md:text-4xl font-bold tracking-tight"
  ```
- Alinhamento padrão:
  - **Mobile**: centro (`text-center`).
  - **Desktop**: centro em seções mais institucionais (Features, Pricing, Trust) ou `md:text-left` quando fizer sentido.

#### H3 – Títulos de cards / subtítulos fortes
- Classe base:
  ```tsx
  className="text-xl font-semibold"
  ```
- Usos comuns:
  - Títulos de cards (features, planos, cards de dashboard).
  - Blocos secundários dentro de seções maiores.

### 1.4. Corpo de Texto

#### Cores
- Em fundos claros:
  - **Texto principal**: `text-foreground`.
  - **Texto secundário / suporte**: `text-muted-foreground`.
- Em seções escuras / hero:
  - `text-white`, `text-white/75` ou `text-white/60` conforme contraste.

#### Tamanhos
- Texto padrão:
  ```tsx
  className="text-base text-muted-foreground"
  ```
- Destaques em seções importantes:
  ```tsx
  className="text-lg text-muted-foreground"
  ```
- Em listas ou legendas pequenas, usar `text-sm`, evitando `text-xs` salvo em chips/badges.

## 2. Botões

Todos os botões usam o componente `Button` em `src/components/ui/button.tsx`, centralizando estilo e variantes.

### 2.1. Forma & Peso
- **Raio global**: `rounded-full` definido na base do `buttonVariants`.
- Fonte: `text-sm font-semibold` (ajustado por `size`).
- Ícones sempre com `size-4` e `gap-2` entre texto e ícone.

### 2.2. Variantes Principais

#### `variant="cta"` – Primário (ação principal)
- Visual:
  - Gradiente `gradient-cta` + `text-white`.
  - Sombra: `shadow-cta`.
  - Interações: leve `hover:shadow-lg`, `hover:scale-[1.02]`, `active:scale-[0.98]`.
- Uso:
  - CTAs principais na landing ("Abrir empresa grátis", "Quero este plano").
  - Ações de destaque no dashboard quando fizer sentido.

#### `variant="default"` – Secundário sólido
- Visual:
  - `bg-primary text-primary-foreground hover:bg-primary/90`.
- Uso:
  - Botões fortes no dashboard quando o CTA principal já está sendo usado em outro lugar.

#### `variant="outline"` – Secundário com contorno
- Visual:
  - `border border-input bg-background hover:bg-accent hover:text-accent-foreground`.
- Uso:
  - Ações secundárias nas páginas internas.

#### `variant="hero"` e `heroOutline`
- Contexto exclusivo do **Hero**:
  - `hero`: botão sólido translúcido, `bg-white/10` em fundo gradient.
  - `heroOutline`: estilo outline branco (`border-2 border-white/40`).

#### `variant="planMei"`
- Específico para card do plano MEI.
- Visual semelhante ao `default`, mas com semântica dedicada para facilitar ajustes futuros.

### 2.3. Tamanhos

- `size="sm"`: `h-9 px-3 text-sm`.
- `size="default"`: `h-10 px-4`.
- `size="lg"`: `h-12 px-6 text-base`.
- `size="xl"`: `h-14 px-8 text-lg`.
- `size="icon"`: `h-10 w-10`.

Regra: **não aplicar `rounded-*` diretamente em botões** — usar o componente `Button` e, se necessário, ajustar via variantes ou util classes neutras (`w-full`, etc.).

## 3. Cards

Base dos cards em `src/components/ui/card.tsx`.

### 3.1. Estrutura
- Container principal (`Card`):
  ```tsx
  className="rounded-2xl border bg-card text-card-foreground shadow-sm"
  ```
- Header (`CardHeader`): `p-6` com `flex flex-col space-y-1.5`.
- Conteúdo (`CardContent`): `p-6 pt-0`.
- Footer (`CardFooter`): `flex items-center p-6 pt-0`.

### 3.2. Padrões de Uso
- **Cards de Landing (Features/Pricing/Trust):**
  - Usar `rounded-2xl` e `card-hover` quando apropriado.
  - Padding típico: `p-6` ou `p-8` em layouts maiores.
  - Sombras:
    - Normal: `card-elevated` ou `shadow-sm`.
    - Hover: `hover:shadow-lg hover:-translate-y-1` (via `.card-hover`).

- **Cards de Dashboard:**
  - Reutilizar `Card`, `CardHeader`, `CardContent` para manter consistência.
  - Títulos de card: tipicamente `text-sm font-medium text-muted-foreground` em resumos numéricos.

## 4. Espaçamentos & Layout

### 4.1. Seções da Landing

- **Padding vertical padrão:**
  - Seções claras: `py-16 lg:py-24`.
  - Hero: `pt-24 pb-16 lg:pt-28` + altura mínima `min-h-[90vh]`.

- **Container global:**
  - Configurado em `tailwind.config.ts` com `padding: 1.5rem`.
  - Evitar usar `px-*` diretamente na raiz das seções; preferir o `container`.

### 4.2. Espaçamento interno

- Títulos de seção:
  - Margin inferior: `mb-4` (H2).
- Subtítulos / descrição:
  - Tipicamente `mb-8` abaixo dos títulos principais, principalmente na landing.

### 4.3. Dashboard

- Padding padrão em páginas internas:
  - Wrapper interno dentro de `DashboardLayout`: `p-6` em desktop, `p-4 md:p-6` quando o conteúdo pode ficar apertado.
- Título de página:
  ```tsx
  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" />
  <p className="text-muted-foreground text-base" />
  ```

## 5. Cores & Tokens

Toda a paleta é baseada em tokens CSS definidos em `src/index.css` e expostos no Tailwind em `tailwind.config.ts`.

### 5.1. Principais Tokens
- `background` / `foreground`
- `primary`, `secondary`, `accent`, `muted`, `destructive`
- Específicos de marca:
  - `cta` – CTAs principais.
  - `success` – Estados de sucesso.
  - `ice` – Fundo claro de seções suaves.
  - `yellow` – Destaques (ex.: estrelas e underline curvo).

### 5.2. Boas práticas
- **Nunca usar cores fixas como `text-slate-600` direto em componentes.**
  - Preferir `text-foreground`, `text-muted-foreground`, `text-white/xx` ou tokens semânticos.
- Gradientes:
  - `gradient-hero` para o fundo do Hero.
  - `gradient-cta` para botões principais.
  - `gradient-text` para textos em destaque.

## 6. Como Estender Mantendo o Padrão

1. **Novo título de seção:**
   - Use H2 com `text-3xl md:text-4xl font-bold tracking-tight`.
   - Não termine com ponto final.

2. **Novo card:**
   - Use o componente `Card`.
   - Aplique `rounded-2xl` e, se precisar de hover, `card-hover`.

3. **Novo botão principal:**
   - Use `Button` com `variant="cta"` ou `variant="default"`.
   - Evite definir cores diretamente no componente.

4. **Novo texto de suporte:**
   - Use `text-base text-muted-foreground` como padrão.

Seguindo estas regras, qualquer nova página ou componente deverá “encaixar” naturalmente no visual atual da aplicação, mantendo a sensação de produto único e premium.