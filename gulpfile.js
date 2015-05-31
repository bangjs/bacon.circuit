var gulp = require('gulp'),
	gulpConcat = require('gulp-concat');


gulp.task('js', function () {

	return gulp.src([
		'src/node/require.js',
		'src/circuit.js',
		'src/field.js',
		'src/node/exports.js'
	]).pipe(
		gulpConcat('bacon.circuit.js')
	).pipe(
		gulp.dest('dist')
	);

});

gulp.task('default', ['js']);
