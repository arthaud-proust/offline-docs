# Build notes

Pour chaque doc : état actuel, commandes de build, et ce qu'on peut supprimer après.

---

## php/

**État** : Déjà buildé. Le tarball téléchargé par `mise run pull:php` contient directement du HTML statique prêt à l'emploi.

**Build** : Aucun. Le manuel PHP est distribué pré-compilé.

**À supprimer** : Rien.

---

## laravel/

**État** : Uniquement des fichiers Markdown. Pas de build dans ce repo — le site laravel.com est construit par un repo séparé (`laravel/laravel.com`) qui consomme ces fichiers.

**Build** : Aucun disponible ici. Envisager un rendu Markdown côté client (ex. [Marked](https://marked.js.org/), [Docusaurus](https://docusaurus.io/)) ou récupérer le site compilé d'une autre manière.

**À supprimer** : N/A.

---

## filament/

**État** : Monorepo de la bibliothèque Filament (Laravel/PHP). Les docs sont des fichiers Markdown dans `docs/` et `packages/*/docs/`. Le site filamentphp.com est un repo séparé non présent ici.

**Build** : Aucun site statique disponible dans ce repo. Le `npm run build` compile le JS/CSS de la bibliothèque, pas un site de docs.

**À supprimer** : N/A. Envisager de remplacer ce submodule par le repo du site de docs si disponible.

---

## tailwindcss/

**État** : Application **Next.js 16** avec contenu MDX. Pas d'export statique configuré par défaut — le site nécessite un serveur Node.js pour tourner.

**Build** :

```bash
cd tailwindcss
pnpm install
# Activer l'export statique dans next.config.ts :
#   output: 'export'
# et supprimer les rewrites() / redirects() vers tailwindui.com
pnpm run build   # produit out/
```

**À supprimer après build** :
```bash
rm -rf node_modules .next src public
# Conserver uniquement : out/
```

**Blocages** :
- Les `rewrites()` vers `tailwindui.com` cassent l'export statique → à retirer ou stubber.
- Certaines routes dynamiques peuvent nécessiter `generateStaticParams`.

---

## mdn/

**État** : Contenu source de MDN Web Docs (14 601 fichiers Markdown sous `files/en-us/`). Nécessite un outil externe Rust (`rari`) pour le build.

**Build** :

```bash
# 1. Installer rari (binaire Rust, hors repo)
#    https://github.com/mdn/rari — via cargo ou release binaire
cargo install rari-doc   # ou télécharger le binaire depuis les releases

# 2. Installer les dépendances Node (>= 24)
cd mdn
npm install

# 3. Builder le site statique
npm run build   # = CONTENT_ROOT=files BUILD_OUT_ROOT=build rari build
# Output : mdn/build/
```

**À supprimer après build** :
```bash
rm -rf node_modules files scripts tests
# Conserver uniquement : build/
```

**Blocages** :
- `rari` doit être installé séparément et disponible dans le PATH.
- Node >= 24 et npm >= 11.8 requis.

---

## Récapitulatif

| Doc         | Build requis | Outil             | Output     | Source supprimable |
|-------------|:------------:|-------------------|------------|--------------------|
| php/        | Non          | —                 | html/      | —                  |
| laravel/    | Non (juste Markdown) | —        | —          | —                  |
| filament/   | Non (site séparé) | —             | —          | —                  |
| tailwindcss/| Oui          | Next.js + pnpm    | out/       | Oui (node_modules, src) |
| mdn/        | Oui          | rari (Rust) + npm | build/     | Oui (node_modules, files) |
