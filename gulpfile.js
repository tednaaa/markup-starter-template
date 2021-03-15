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

const dev = 'src';
const prod = 'build';

const path = {
	build: {
		html: prod + '/',
		css: prod + '/css/',
		js: prod + '/js/',
		img: prod + '/images/',
		fonts: prod + '/fonts/',
	},
	src: {
		html: dev + '/*.html',
		scss: dev + '/scss/index.scss',
		js: dev + '/js/index.js',
	},
	watch: {
		html: dev + '/**/*.html',
		scss: dev + '/scss/**/*.{scss,css}',
		js: dev + '/js/**/*.js',
	},
	publicDir: {
		public: 'public/**',
		fonts: 'public/fonts/*.woff2',
		img: 'public/images/**/*.{png,jpg,jpeg,gif,svg,webp}',
	},
	buildDir: prod + '/',
};

const browserSync = () => {
	browsersync.init({
		server: {
			baseDir: path.buildDir,
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
				root: dev,
				layouts: dev + '/html/',
				partials: dev + '/html/components/',
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

const images = () =>
	src(path.publicDir.img).pipe(dest(path.build.img)).pipe(browsersync.stream());

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

const connectingFonts = async () => {
	const fontPath = dev + '/scss/utils/fonts.scss';
	const fileContent = fs.readFileSync(fontPath);

	if (fileContent == '') {
		fs.writeFile(fontPath, '', cb);
		fs.readdir(dev + '/fonts/', (err, items) => {
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
		throw Error('Файл fonts.scss должен быть пустым.\n');
	}
};

const watchFiles = () => {
	watch([path.watch.html], markup);
	watch([path.watch.scss], styles);
	watch([path.watch.js], scripts);
	watch([path.publicDir.img], images);
};

const copyPublic = () => src(path.publicDir.public).pipe(dest(path.buildDir));

const clean = () => del(path.buildDir);

exports.cf = connectingFonts;
exports.build = series(
	clean,
	markup,
	buildStyles,
	buildScripts,
	buildImages,
	copyPublic
);
exports.default = series(
	series(clean, parallel(markup, styles, scripts, copyPublic)),
	parallel(watchFiles, browserSync)
);
