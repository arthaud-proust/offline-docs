# Offline docs

A simple searcher and renderer for various language/framework documentations. Ideal to work offline (like on the wonderful french train system)

<img width="1470" height="920" alt="Capture d’écran 2026-09-01 à 00 45 53" src="https://github.com/user-attachments/assets/48ca8b9a-e270-44fd-b955-8cd98ffe1f14" />

## Requirements

[Mise-en-place (mise)](https://mise.jdx.dev/)

## Usage

1. Clone

2. Fetch docs

```bash
mise run pull
```

2. Start

```bash
mise run serve
```

## Add a doc

1. Create a fork
2. Add the submodule or a script to pull the data
3. Specify what files to include in the search in `serve/config.js`
4. Open a PR

## FAQ

### Can any doc be added ?

Yes, if you have it in markdown, or if you can transform it in markdown (like the PHP doc, transformed from html files). Only markdown is supported as it's content-focused.

### There a missing examples, broken links, is it expected ?

Yes, handling various documentations each generated with different tools is a mass. The idea is to be able to explore and render the basic stuff. I'm not gonna lie, you'll have a better experience on the official documentation.

### How can I help ?

You can open a PR to add a documentation if you want ! See [Add a doc](#add-a-doc)

### Why this ?

To access documentations offline
