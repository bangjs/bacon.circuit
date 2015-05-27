var gulp = require('gulp'),
	gulpConcat = require('gulp-concat');


gulp.task('js', function () {

	return gulp.src([
		'src/core.js',
		'src/circuit.js',
		'src/field.js'
	]).pipe(
		gulpConcat('bacon.circuit.js')
	).pipe(
		gulp.dest('dist')
	);

});

gulp.task('default', ['js']);
