# Solorium

[Solorium](https://quangmn.com/solorium) is a modern and minimal theme for [Ghost](https://github.com/TryGhost/Ghost) designed for personal blogging and showcasing your portfolio. This theme is highly customizable, with a few simple settings that allow you to quickly apply your own personal style to your site.

# Installation instructions

1. [Download this theme](https://github.com/CherryDiarium/solorium/archive/main.zip)
2. Log into your Ghost Admin interface, and go to the `Design` settings area to upload the zip file

# Development

If you wish to modify this theme, CSS files will need to be compiled after every modification using Gulp/PostCSS to polyfill future CSS spec. You'll need [Node](https://nodejs.org/), [Yarn](https://yarnpkg.com/) and [Gulp](https://gulpjs.com) installed globally. After that, from the theme's root directory:

```bash
# Install
yarn

# Run build & watch for changes
yarn dev
```

Now you can edit `/assets/css/` files, which will be compiled to `/assets/built/` automatically.

The `zip` Gulp task packages the theme files into `dist/solorium.zip`, which you can then upload to your site.

```bash
yarn zip
```

# Credit

This theme is a fork of [Solo](https://github.com/TryGhost/Solo), an official Ghost theme. There's a [**demo**](https://solo.ghost.io) available for it.

## Copyright & License

© 2013-2026 Quang Nguyen & Ghost Foundation - Released under the [MIT license](LICENSE).
