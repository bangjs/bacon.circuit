var fs = require('fs'),
	_ = require('lodash'),
	through2 = require('through2'),
	gulp = require('gulp'),
	gulpConcat = require('gulp-concat');


gulp.task('dist', function () {

	return gulp.src([
		'src/circuit.js',
		'src/field.js'
	]).pipe(
		gulpConcat('bacon.circuit.js')
	).pipe(through2.obj(function (file, enc, cb) {
		file.contents = new Buffer(_.template(
			fs.readFileSync('src/build.template')
		)({
			source: file.contents.toString()
		}));
		this.push(file);
		cb();
	})).pipe(
		gulp.dest('dist')
	);

});

gulp.task('default', ['dist']);