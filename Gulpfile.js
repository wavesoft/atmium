var gulp = require('gulp');
var browserify = require('gulp-browserify');
 
/**
 * Use browserify to build scripts
 */
gulp.task('scripts', function() {
	// Single entry point to browserify 
	return gulp.src('src/js/atmium.js')
		.pipe(browserify({
		  insertGlobals : true
		}))
		.pipe(gulp.dest('build/js'))
});

/**
 * Copy static files
 */
gulp.task('static', function() {
	return gulp.src('src/index.html')
		.pipe(gulp.dest('build'));
});

/**
 * Compile css
 */
gulp.task('css', function() {
	return gulp.src('src/css/*.css')
		.pipe(gulp.dest('build/css'));
});

/**
 * Entry point
 */
gulp.task('default', ['scripts', 'static', 'css'], function() {

    // gulp.watch('src/css/**', function(event) {
    //     gulp.run('styles');
    // })

    // gulp.watch('app/**/*.html', function(event) {
    //     gulp.run('html');
    // })
});

gulp.watch('src/js/**', function(event) {
    gulp.run('scripts');
})
