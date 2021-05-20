const { src, dest, parallel, series, watch } = require('gulp');
const rollupStream = require('@rollup/stream');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const { babel } = require('@rollup/plugin-babel');
const { terser } = require('rollup-plugin-terser');
const source = require('vinyl-source-stream');
const browsersync = require('browser-sync').create();
const panini = require('panini');
const del = require('del');
const scss = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const groupMedia = require('gulp-group-css-media-queries');
const cleanCss = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const fs = require('fs');

const DEVELOPMENT_FOLDER = 'src';
const PRODUCTION_FOLDER = 'build';
const PUBLIC_FOLDER = 'public';

const path = {
  build: {
    dir: PRODUCTION_FOLDER + '/',
    html: PRODUCTION_FOLDER + '/',
    css: PRODUCTION_FOLDER + '/css/',
    js: PRODUCTION_FOLDER + '/js/',
    img: PRODUCTION_FOLDER + '/images/',
    fonts: PRODUCTION_FOLDER + '/fonts/',
  },
  src: {
    html: DEVELOPMENT_FOLDER + '/*.html',
    scss: DEVELOPMENT_FOLDER + '/scss/index.scss',
    js: DEVELOPMENT_FOLDER + '/js/index.js',
    img: DEVELOPMENT_FOLDER + '/images/**/*.{png,jpg,jpeg,gif,svg,webp}',
    fonts: DEVELOPMENT_FOLDER + '/fonts/*.woff2',
  },
  watch: {
    html: DEVELOPMENT_FOLDER + '/**/*.html',
    scss: DEVELOPMENT_FOLDER + '/scss/**/*.{scss,css}',
    js: DEVELOPMENT_FOLDER + '/js/**/*.js',
  },
  publicDir: PUBLIC_FOLDER + '/**',
};

const browserSync = () => {
  browsersync.init({
    server: {
      baseDir: path.build.dir,
    },
    notify: false,
    ui: false,
    open: false,
    tunnel: true,
    online: false,
  });
};

const markup = () => {
  panini.refresh();
  return src(path.src.html)
    .pipe(
      panini({
        root: DEVELOPMENT_FOLDER,
        layouts: DEVELOPMENT_FOLDER + '/html/',
        partials: DEVELOPMENT_FOLDER + '/html/components/',
      })
    )
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream());
};

const styles = () => {
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
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream());
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

const scripts = () => {
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
    .pipe(browsersync.stream());
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

const images = () => {
  return src(path.src.img)
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream());
};

const buildImages = () => {
  return src(path.src.img)
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
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream());
};

const cb = () => {};

const connectFonts = async () => {
  const pathToFontsStyles = '/scss/utils/fonts.scss';
  const fontPath = DEVELOPMENT_FOLDER + pathToFontsStyles;
  const fileContent = fs.readFileSync(fontPath);

  if (fileContent == '') {
    fs.writeFile(fontPath, '', cb);
    fs.readdir(DEVELOPMENT_FOLDER + '/fonts/', (err, items) => {
      if (items) {
        let cFontName;
        for (let i = 0; i < items.length; i++) {
          let fontName = items[i].split('.');
          fontName = fontName[0];
          if (cFontName != fontName) {
            fs.appendFile(
              fontPath,
              `@include font('${fontName}', '${fontName}', '400', 'normal');\n`,
              cb
            );
          }
          cFontName = fontName;
        }
      }
    });
  } else {
    throw Error(`Файл ${pathToFontsStyles} должен быть пустым.\n`);
  }
};

const watchFiles = () => {
  watch([path.watch.html], markup);
  watch([path.watch.scss], styles);
  watch([path.watch.js], scripts);
  watch([path.src.img], images);
};

const copyPublic = () => src(path.publicDir).pipe(dest(path.build.dir));
const copyFonts = () => src(path.src.fonts).pipe(dest(path.build.fonts));

const removeBuildDir = () => del(path.build.dir);

exports.connectFonts = connectFonts;
exports.default = series(
  series(
    removeBuildDir,
    parallel(markup, styles, scripts, images, copyFonts, copyPublic)
  ),
  parallel(watchFiles, browserSync)
);
exports.build = series(
  removeBuildDir,
  markup,
  buildStyles,
  buildScripts,
  buildImages,
  copyFonts,
  copyPublic
);
