# Brand fonts

Drop the licensed Market One brand fonts here to bake them into the UI and graphics:

- `superior-title.woff2` — Superior Title (display serif for headlines)
- `franklin-gothic.woff2` — Franklin Gothic (sans for labels/body)

Then add `@font-face` rules in `client/src/styles.css`. Until then the portal
falls back to Georgia (serif) and a system sans, which closely match the brand
proportions. Do not commit licensed font files to a public repo.
