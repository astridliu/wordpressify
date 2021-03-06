/* -------------------------------------------------------------------------------------------------

Build Configuration
Contributors: Luan Gjokaj

-------------------------------------------------------------------------------------------------- */
'use strict';
var babel = require('gulp-babel');
var browserSync = require('browser-sync');
var concat = require('gulp-concat');
var connect = require('gulp-connect-php');
var cssnano = require('cssnano');
var cssnext = require('postcss-cssnext');
var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var inject = require('gulp-inject-string');
var partialimport = require('postcss-easy-import');
var plumber = require('gulp-plumber');
var postcss = require('gulp-postcss');
var remoteSrc = require('gulp-remote-src');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var unzip = require('gulp-unzip');
var zip = require('gulp-zip');
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
PostCSS Plugins
-------------------------------------------------------------------------------------------------- */
var pluginsDev = [
	partialimport,
	cssnext({
		features: {
			colorHexAlpha: false
		}
	})
];
var pluginsProd = [
	partialimport,
	cssnext({
		features: {
			colorHexAlpha: false
		}
	})
];
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Header & Footer JavaScript Boundles
-------------------------------------------------------------------------------------------------- */
var headerJS = [
	'node_modules/jquery/dist/jquery.js',
	'node_modules/nprogress/nprogress.js',
	'node_modules/aos/dist/aos.js',
	'node_modules/isotope-layout/dist/isotope.pkgd.js'
];
var footerJS = [
	'src/js/**'
];
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Theme Name
-------------------------------------------------------------------------------------------------- */
var themeName = 'wordpressify';
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Installation Tasks
-------------------------------------------------------------------------------------------------- */
gulp.task('default');

gulp.task('cleanup', function () {
	del(['build/**']);
	del(['dist/**']);
});

gulp.task('download-wordpress', function () {
	remoteSrc(['latest.zip'], {
		base: 'https://wordpress.org/'
	})
		.pipe(gulp.dest('build/'));
});

gulp.task('setup', [
	'unzip-wordpress',
	'copy-config'
]);

gulp.task('unzip-wordpress', function () {
	gulp.src('build/latest.zip')
		.pipe(unzip())
		.pipe(gulp.dest('build/'))
});

gulp.task('copy-config', function () {
	gulp.src('wp-config.php')
		.pipe(inject.after('define(\'DB_COLLATE\', \'\');', '\ndefine(\'DISABLE_WP_CRON\', true);'))
		.pipe(gulp.dest('build/wordpress'))
		.on('end', function () {
				gutil.beep();
				gutil.log(devServerReady);
				gutil.log(thankYou);
			});
});

gulp.task('disable-cron', function () {
	fs.readFile('build/wordpress/wp-config.php', function (err, data) {
		if (err) {
			gutil.log(wpFy + ' - ' + errorMsg + ' Something went wrong, WP_CRON was not disabled!');
			process.exit(1);
		};
		if (data.indexOf('DISABLE_WP_CRON') >= 0){
			gutil.log('WP_CRON is already disabled!');
		} else {
			gulp.src('build/wordpress/wp-config.php')
			.pipe(inject.after('define(\'DB_COLLATE\', \'\');', '\ndefine(\'DISABLE_WP_CRON\', true);'))
			.pipe(gulp.dest('build/wordpress'));
		}
	});
});
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Development Tasks
-------------------------------------------------------------------------------------------------- */
gulp.task('build-dev', [
	'copy-theme-dev',
	'copy-fonts-dev',
	'style-dev',
	'header-scripts-dev',
	'footer-scripts-dev',
	'plugins-dev',
	'watch'

], function () {
	connect.server({
		base: 'build/wordpress',
		port: '3020'
	}, function () {
		browserSync({
			proxy: '127.0.0.1:3020'
		});
	});
});

gulp.task('copy-theme-dev', function () {
	if (!fs.existsSync('./build')) {
		gutil.log(buildNotFound);
		process.exit(1);
	} else {
		gulp.src('src/theme/**')
			.pipe(gulp.dest('build/wordpress/wp-content/themes/' + themeName));
	}
});

gulp.task('copy-fonts-dev', function () {
	gulp.src('src/fonts/**')
		.pipe(gulp.dest('build/wordpress/wp-content/themes/' + themeName + '/fonts'))
});

gulp.task('style-dev', function () {
	return gulp.src('src/style/style.css')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init())
		.pipe(postcss(pluginsDev))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('build/wordpress/wp-content/themes/' + themeName))
		.pipe(browserSync.stream({ match: '**/*.css' }));
});

gulp.task('header-scripts-dev', function () {
	return gulp.src(headerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init())
		.pipe(concat('header-bundle.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('build/wordpress/wp-content/themes/' + themeName + '/js'));
});

gulp.task('footer-scripts-dev', function () {
	return gulp.src(footerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['env']
		}))
		.pipe(concat('footer-bundle.js'))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('build/wordpress/wp-content/themes/' + themeName + '/js'));
});

gulp.task('plugins-dev', function () {
	return gulp.src('src/plugins/**')
		.pipe(gulp.dest('build/wordpress/wp-content/plugins'));
});

gulp.task('reload-js', ['footer-scripts-dev', 'header-scripts-dev'], function (done) {
	browserSync.reload();
	done();
});

gulp.task('reload-fonts', ['copy-fonts-dev'], function (done) {
	browserSync.reload();
	done();
});

gulp.task('reload-theme', ['copy-theme-dev'], function (done) {
	browserSync.reload();
	done();
});

gulp.task('reload-plugins', ['plugins-dev'], function (done) {
	browserSync.reload();
	done();
});

gulp.task('watch', function () {
	gulp.watch(['src/style/**/*.css'], ['style-dev']);
	gulp.watch(['src/js/**'], ['reload-js']);
	gulp.watch(['src/fonts/**'], ['reload-fonts']);
	gulp.watch(['src/theme/**'], ['reload-theme']);
	gulp.watch(['src/plugins/**'], ['reload-plugins']);
	gulp.watch('build/wordpress/wp-config*.php', function(event){
		if(event.type === 'added') { 
			gulp.start('disable-cron');
		}
	})
});
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Production Tasks
-------------------------------------------------------------------------------------------------- */
gulp.task('build-prod', [
	'copy-theme-prod',
	'copy-fonts-prod',
	'style-prod',
	'header-scripts-prod',
	'footer-scripts-prod',
	'plugins-prod',
	'zip-theme'
]);

gulp.task('copy-theme-prod', function () {
	gulp.src('src/theme/**')
		.pipe(gulp.dest('dist/themes/' + themeName))
});

gulp.task('copy-fonts-prod', function () {
	gulp.src('src/fonts/**')
		.pipe(gulp.dest('dist/themes/' + themeName + '/fonts'))
});

gulp.task('style-prod', function () {
	return gulp.src('src/style/style.css')
		.pipe(plumber({ errorHandler: onError }))
		.pipe(postcss(pluginsProd))
		.pipe(gulp.dest('dist/themes/' + themeName))
});

gulp.task('header-scripts-prod', function () {
	return gulp.src(headerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(concat('header-bundle.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist/themes/' + themeName + '/js'));
});

gulp.task('footer-scripts-prod', function () {
	return gulp.src(footerJS)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(babel({
			presets: ['env']
		}))
		.pipe(concat('footer-bundle.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist/themes/' + themeName + '/js'));
});

gulp.task('plugins-prod', function () {
	return gulp.src('src/plugins/**')
		.pipe(gulp.dest('dist/plugins'));
});

gulp.task('zip-theme', ['copy-theme-prod', 'copy-fonts-prod', 'style-prod', 'header-scripts-prod', 'footer-scripts-prod', 'plugins-prod'], function () {
	gulp.src('dist/themes/' + themeName + '/**')
		.pipe(zip(themeName + '.zip'))
		.pipe(gulp.dest('dist'))
		.on('end', function () {
			gutil.beep();
			gutil.log(pluginsGenerated);
			gutil.log(filesGenerated);
			gutil.log(thankYou);
		});
});
//--------------------------------------------------------------------------------------------------
/* -------------------------------------------------------------------------------------------------
Utilitie Tasks
-------------------------------------------------------------------------------------------------- */
var onError = function (err) {
	gutil.beep();
	gutil.log(wpFy + ' - ' + errorMsg + ' ' + err.toString());
	this.emit('end');
};

var date = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
var errorMsg = '\x1b[41mError\x1b[0m';
var devServerReady = 'Your development server is ready, start the workflow with the command: $ \x1b[1mnpm run dev\x1b[0m';
var buildNotFound = errorMsg + ' ⚠️　- You need to install WordPress first. Run the command: $ \x1b[1mnpm run install:wordpress\x1b[0m';
var filesGenerated = 'Your ZIP template file was generated in: \x1b[1m' + __dirname + '/dist/' + themeName + '.zip\x1b[0m - ✅';
var pluginsGenerated = 'Plugins are generated in: \x1b[1m' + __dirname + '/dist/plugins/\x1b[0m - ✅';
var backupsGenerated = 'Your backup was generated in: \x1b[1m' + __dirname + '/backups/' + date + '.zip\x1b[0m - ✅';
var wpFy = '\x1b[42m\x1b[1mWordPressify\x1b[0m';
var wpFyUrl = '\x1b[2m - http://www.wordpressify.co/\x1b[0m';
var thankYou = 'Thank you for using ' + wpFy + wpFyUrl;

gulp.task('backup', function () {
	if (!fs.existsSync('./build')) {
		gutil.log(buildNotFound);
		process.exit(1);
	} else {
		gulp.src('build/wordpress/**')
			.pipe(zip(date + '.zip'))
			.pipe(gulp.dest('backups'))
			.on('end', function () {
				gutil.beep();
				gutil.log(backupsGenerated);
				gutil.log(thankYou);
			});
	}
});
/* -------------------------------------------------------------------------------------------------
End of all Tasks
-------------------------------------------------------------------------------------------------- */
