# Shell

An application's frame for the web, in one CSS file and one small JavaScript module. Up to four columns, **menu | main | side | more**, each in four rows, **head | neck | body | foot**. Only a body scrolls. Which columns show is one layout class on `#shell`, and the columns slide when it changes.

Shell was distilled from the frame of Nexus, a Rails app. Its colours, icons and type follow IBM's [Carbon Design System](https://carbondesignsystem.com). It needs no framework and no build step: copy `shell.css` and `shell.js` into your app.

## The markup

```html
<div id="shell" class="show-menu-main">
	<nav id="menu">
		<div class="head">…</div>
		<div class="neck">…</div>
		<div class="body">…</div>
		<div class="foot">…</div>
	</nav>
	<main id="main">  head, neck, body, foot  </main>
	<aside id="side"> head, neck, body, foot  </aside>
	<aside id="more"> head, neck, body, foot  </aside>
</div>
```

`#shell` fills the window, and the page around it does not scroll. Leave out any column you do not use. `example.html` is the whole of it as a working page; serve it over http, for example with `python3 -m http.server`, since a browser does not import modules from `file://`.

A head, neck or foot is an icon cell, the title, then one icon cell for each element after the title. Give a bar at least one element after its title, an empty `<span></span>` if need be: then every title sits one base space in from its column's edges, and a body's content sits the same distance in. Text that does not fit its cell ends in an ellipsis.

```html
<div class="head">
	<span class="logo"><svg viewBox="0 0 32 32">…</svg></span>   <!-- the menu's first cell: the app's icon -->
	<span class="title">Orders</span>
	<span></span>
</div>
<div class="head">
	<button class="icon-button" title="Show or hide the menu"><svg viewBox="0 0 32 32">…</svg></button>
	<span class="title">Order 1042</span>
	<button class="icon-button" title="Back"><svg viewBox="0 0 32 32">…</svg></button>
	<button class="icon-button" title="Forward"><svg viewBox="0 0 32 32">…</svg></button>
</div>
```

`.icon-button` fills its 40px cell as Carbon's ghost icon button does, with a 16px icon. Its icon is Carbon's secondary icon colour at rest, and the primary one with Carbon's hover background under the pointer; Carbon's own button shows the primary colour at rest. Disabled, it takes `--cds-icon-disabled`. `.logo` holds the app's icon in Carbon's interactive colour. `.title` is bold. Use icons from [Carbon's icon library](https://carbondesignsystem.com/elements/icons/library/) (Apache 2.0), inline, each a `<svg viewBox="0 0 32 32">` with its path; Shell gives it its size and colour.

## The layouts

`#shell` has one of six classes:

| Class | Shows |
|---|---|
| `show-main` | main |
| `show-menu-main` | menu, main |
| `show-main-side` | main, side |
| `show-menu-main-side` | menu, main, side |
| `show-main-side-more` | main, side, more |
| `show-menu-main-side-more` | menu, main, side, more |

More only shows with side.

## The CSS

Everything in `shell.css` is in `@layer shell`. Name your layers **before** `shell.css` loads, with any reset before `shell`:

```html
<style>@layer reset, shell, page;</style>
<link rel="stylesheet" href="shell.css">
```

A layer ranks by where it is first named. If `shell.css` loads first, `shell` becomes the lowest layer, and a reset such as `* { padding: 0 }` takes away its insets.

Shell reads two of your page's tokens, and uses its own value where you set none:

| Property | Without yours | |
|---|---|---|
| `--base-space` | `40px` | The row height, an icon cell, and the inset |
| `--base-border` | `solid 1px` in Shell's edge colour | Around the shell, between columns, under a head, over a foot |

It declares three widths of its own. Set yours in `:root`, unlayered or in a layer after `shell`:

| Property | Default | |
|---|---|---|
| `--shell-menu-width` | `240px` | |
| `--shell-main-width` | `minmax(240px, 1fr)` | |
| `--shell-side-more-width` | `clamp(450px, 33%, 800px)` | Side and more, when both show |

Side on its own takes half the width that the menu leaves, up to 864px.

### Colours and type

Every colour is a Carbon token. Where the page has Carbon's own tokens, such as inside a Carbon theme zone, Shell uses them; elsewhere it uses Carbon's values, from theme g10 in light and g100 in dark. Dark follows the page's `color-scheme`, so a page that offers both sets `:root { color-scheme: light dark; }`.

| Shell's colour | Carbon token | g10 | g100 |
|---|---|---|---|
| Background | `--cds-background` | `#f4f4f4` | `#161616` |
| Text | `--cds-text-primary` | `#161616` | `#f4f4f4` |
| Neck and foot text | `--cds-text-secondary` | `#525252` | `#c6c6c6` |
| Icon | `--cds-icon-secondary`, `--cds-icon-primary` under the pointer, `--cds-icon-disabled` disabled | `#525252`, `#161616`, 25% of `#161616` | `#c6c6c6`, `#f4f4f4`, 25% of `#f4f4f4` |
| Icon button under the pointer | `--cds-background-hover` | 12% of `#8d8d8d` | 16% of `#8d8d8d` |
| Logo | `--cds-interactive` | `#0f62fe` | `#4589ff` |
| Focus ring | `--cds-focus` | `#0f62fe` | `#ffffff` |
| Menu | 80% background, 20% `--cds-layer-01` | `#f6f6f6` | `#191919` |
| Borders | 70% background, 30% `--cds-border-subtle-00` | `#e6e6e6` | `#212121` |

Shell keeps them as `--shell-background`, `--shell-text`, `--shell-quiet`, `--shell-icon`, `--shell-icon-hover`, `--shell-hover`, `--shell-accent`, `--shell-focus`, `--shell-menu-background` and `--shell-edge` on `#shell`, for the page's own rules to use.

The type is 13px on 1.6, in `"Berkeley Mono Variable", "IBM Plex Mono", monospace` (`--shell-font`). Shell loads no font: the page declares the `@font-face` for the one it has.

## The JavaScript

`shell.js` exports five functions. Each takes the `#shell` element and changes its layout class; its other classes stay.

```js
import * as shell from "shell"

const element = document.getElementById( "shell" )
shell.toggleMenu( element )   // show or hide the menu
shell.showSide( element )     // show side, and close more
shell.hideSide( element )     // hide side, and more with it
shell.showMore( element )     // show more, and side with it
shell.hideMore( element )     // hide more, keep side
```

If `#shell` has none of the six classes, the function throws an error that names them. A column the layout hides is hidden from the keyboard and screen readers as well.

## Using it

Copy both files from a release tag, such as `v0.1.0`, and put the version in their names, so a page shows which version it runs. Edit a copy only by copying a new release.

### A Rails app with Propshaft and importmap-rails

- `app/assets/stylesheets/shell.0.1.0.css`. Keep it under `app/assets`, so that `stylesheet_link_tag :app` links it after `application.css`, which names the layers. `stylesheet_link_tag :app, "shell"` does not work: Propshaft replaces the whole list with the files under `app/assets`.
- `vendor/javascript/shell.0.1.0.js`, and in `config/importmap.rb`:

```ruby
pin "shell", to: "shell.0.1.0.js"
```

- A Stimulus controller of your own calls it, so your markup and Turbo Streams keep calling `shell#showSide` and the rest:

```js
// app/javascript/controllers/shell_controller.js
import { Controller } from "@hotwired/stimulus"
import * as shell from "shell"

export default class extends Controller {
	toggleMenu() { shell.toggleMenu( this.element ) }
	showSide() { shell.showSide( this.element ) }
	hideSide() { shell.hideSide( this.element ) }
	showMore() { shell.showMore( this.element ) }
	hideMore() { shell.hideMore( this.element ) }
}
```

### A page built into one file

Read both files at the tag and inline them: the CSS in a `<style>` after `@layer reset, shell;`, and the JavaScript, as it is, at the top of a `<script type="module">`, where the five functions are then in scope by name. A page opened from disk (`file://`) cannot import module files, but it runs inline module scripts.

```sh
git -C ~/Dev/shell show v0.1.0:shell.css
git -C ~/Dev/shell show v0.1.0:shell.js
```

### Any other page

Serve the two files with the page, or load them from jsDelivr at a tag, with integrity hashes so that a changed file is refused:

```html
<style>@layer reset, shell;</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/wanghailei/shell@v0.1.0/shell.css" integrity="sha384-…" crossorigin="anonymous">
<script type="importmap">
	{
		"imports": { "shell": "https://cdn.jsdelivr.net/gh/wanghailei/shell@v0.1.0/shell.js" },
		"integrity": { "https://cdn.jsdelivr.net/gh/wanghailei/shell@v0.1.0/shell.js": "sha384-…" }
	}
</script>
```

Each hash is the file's at that tag:

```sh
git -C ~/Dev/shell show v0.1.0:shell.css | openssl dgst -sha384 -binary | openssl base64 -A
```

## Working on it

```sh
mise install            # Node, pinned in mise.toml
npm install             # Playwright, for the browser tests; it uses your installed Google Chrome
npm test                # every change from every layout, with coverage
npm run test:browser    # example.html in Chrome: widths, scrolling, insets, sliding, keyboard
bin/check               # both, as Carson runs them before a change lands
```

## Licence

MIT; see `LICENSE`.

The icons in `example.html` are from IBM's Carbon icon library, under the Apache License 2.0.
