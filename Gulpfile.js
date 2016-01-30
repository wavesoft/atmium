var gulp = require('gulp');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglifyjs');
var streamify = require('gulp-streamify');

var webpack = require('webpack-stream');

/**
 * Use browserify to build scripts
 */
// gulp.task('scripts', function() {
// 	return browserify('src/js/atmium.js')
// 		.bundle()
// 		//Pass desired output filename to vinyl-source-stream
// 		.pipe(source('atmium.js'))
// 		// Uglify
// 		.pipe(streamify(uglify()))
// 		// Start piping stream to tasks!
// 		.pipe(gulp.dest('build/js'));
// });

gulp.task('scripts', function() {
	return gulp.src('src/js/atmium.js')
		.pipe(webpack({
			module: {
				loaders: [
					{ test: /\.json$/, loader: 'json' },
				],
		    },
		    node: {
		    	'fs': 'empty'
		    },
		    output: {
		    	'filename': 'atmium.js'
		    }
		}))
		.pipe(gulp.dest('build/js'))
		.pipe(uglify("atmium.min.js", { outSourceMap: true }))
		.pipe(gulp.dest('build/js'));
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

});

/**
 * Watch task
 */
gulp.watch('src/js/**', ['scripts'], function(event) { })
gulp.watch('src/css/*.css', ['css'], function(event) { })
