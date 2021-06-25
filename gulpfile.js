const { src, dest, parallel, series, watch } = require('gulp');
const rollupStream = require('@rollup/stream');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const { babel } = require('@rollup/plugin-babel');
const { terser } = require('rollup-plugin-terser');
const source = require('vinyl-source-stream');
const browserSync = require('browser-sync').create();
const panini = require('panini');
const del = require('del');
const scss = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const groupMedia = require('gulp-group-css-media-queries');
const cleanCss = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const fs = require('fs');

const DEVELOPMENT_FOLDER = 'src';
const PRODUCTION_FOLDER = 'build';

const path = {
  build: {
    css: `${PRODUCTION_FOLDER}/css`,
    js: `${PRODUCTION_FOLDER}/js`,
    images: `${PRODUCTION_FOLDER}/images`,
  },
  src: {
    html: `${DEVELOPMENT_FOLDER}/*.html`,
    scss: `${DEVELOPMENT_FOLDER}/scss/index.scss`,
    js: `${DEVELOPMENT_FOLDER}/js/index.js`,
    images: `${DEVELOPMENT_FOLDER}/assets/images/**/*.{png,jpg,jpeg,svg,webp}`,
    assets: `${DEVELOPMENT_FOLDER}/assets/**`,
  },
  watch: {
    markup: `${DEVELOPMENT_FOLDER}/**/*.{html,hbs}`,
    scss: `${DEVELOPMENT_FOLDER}/scss/**/*.{scss,css}`,
    js: `${DEVELOPMENT_FOLDER}/js/**/*.js`,
  },
  fonts: {
    dir: `${DEVELOPMENT_FOLDER}/assets/fonts`,
    styles: `${DEVELOPMENT_FOLDER}/scss/config/fonts.scss`,
  },
};

const runBrowserSyncServer = () => {
  browserSync.init({
    server: {
      baseDir: PRODUCTION_FOLDER,
    },
    notify: false,
    ui: false,
    open: false,
    tunnel: true,
    online: false,
  });
};

const compileMarkup = () => {
  panini.refresh();

  return src(path.src.html)
    .pipe(
      panini({
        root: DEVELOPMENT_FOLDER,
        layouts: `${DEVELOPMENT_FOLDER}/layouts`,
        partials: `${DEVELOPMENT_FOLDER}/partials`,
      })
    )
    .pipe(dest(PRODUCTION_FOLDER))
    .pipe(browserSync.stream());
};

const compileStyles = () => {
  return src(path.src.scss)
    .pipe(sassGlob())
    .pipe(
      scss({
        outputStyle: 'expanded',
      })
    )
    .pipe(groupMedia())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ['last 8 versions'],
        cascade: true,
        grid: true,
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browserSync.stream());
};

const buildStyles = () => {
  return src(path.src.scss)
    .pipe(
      scss({
        outputStyle: 'expanded',
      })
    )
    .pipe(groupMedia())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ['last 8 versions'],
        cascade: true,
        grid: true,
      })
    )
    .pipe(cleanCss())
    .pipe(dest(path.build.css));
};

const compileScripts = () => {
  return rollupStream({
    input: path.src.js,
    output: {
      format: 'esm',
    },
    plugins: [
      nodeResolve(),
      babel({
        babelHelpers: 'bundled',
      }),
    ],
    onwarn: function (warning) {
      if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
      }

      console.warn(warning.message);
    },
  })
    .pipe(source('index.js'))
    .pipe(dest(path.build.js))
    .pipe(browserSync.stream());
};

const buildScripts = () => {
  return rollupStream({
    input: path.src.js,
    output: {
      format: 'esm',
    },
    plugins: [
      nodeResolve(),
      babel({
        babelHelpers: 'bundled',
      }),
      terser(),
    ],
    onwarn: function (warning) {
      if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
      }

      console.warn(warning.message);
    },
  })
    .pipe(source('index.js'))
    .pipe(dest(path.build.js));
};

const buildImages = () => {
  return src(path.src.images)
    .pipe(
      imagemin({
        progressive: true,
        svgoPlugins: [
          {
            removeViewBox: false,
          },
        ],
        interlaced: true,
        optimizationLevel: 3,
      })
    )
    .pipe(dest(path.build.images));
};

const copyAssets = () => {
  return src(path.src.assets)
    .pipe(dest(PRODUCTION_FOLDER))
    .pipe(browserSync.stream());
};

const removeBuildDir = () => del(PRODUCTION_FOLDER);

const connectFonts = async () => {
  fs.readdir(path.fonts.dir, (error, fonts) => {
    handleError(error);

    if (fonts.length === 0) {
      return console.log('No fonts to connect');
    }

    fs.truncate(path.fonts.styles, handleError);

    fonts.forEach((font) => {
      const fontWithoutExtension = font.split('.')[0];
      const fontFaceMixin = `@include font('${fontWithoutExtension}', '${fontWithoutExtension}', '400', 'normal');\n`;

      fs.appendFile(path.fonts.styles, fontFaceMixin, handleError);
    });
  });
};

const handleError = (error) => {
  if (error) {
    return console.log(error);
  }
};

const watchFiles = () => {
  watch([path.watch.markup], compileMarkup);
  watch([path.watch.scss], compileStyles);
  watch([path.watch.js], compileScripts);
  watch([path.src.assets], copyAssets);
};

exports.connectFonts = connectFonts;
exports.default = series(
  series(
    removeBuildDir,
    parallel(compileMarkup, compileStyles, compileScripts, copyAssets)
  ),
  parallel(watchFiles, runBrowserSyncServer)
);
exports.build = series(
  removeBuildDir,
  compileMarkup,
  buildStyles,
  buildScripts,
  copyAssets,
  buildImages
);
