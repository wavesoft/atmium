var gulp = require('gulp');
var uglify = require('gulp-uglifyjs');
var webpack = require('webpack-stream');

/**
 * Javascript minification and compilation with webpack
 */
gulp.task('js', function() {
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
		    },
		    plugins: [
		    	new webpack.webpack.optimize.DedupePlugin()
		    ]
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
gulp.task('default', ['js', 'static', 'css'], function() {

});

/**
 * Watch task
 */
gulp.watch('src/js/**', ['js'], function(event) { })
gulp.watch('src/css/*.css', ['css'], function(event) { })
