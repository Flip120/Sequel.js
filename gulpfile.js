var gulp = require('gulp'),
    browserSync = require('browser-sync').create(),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify');

var paths = {
  scripts: ['lib/**/*.js'],
};

gulp.task('run-examples', function() {
    browserSync.init({
        server: {
            baseDir: "./Examples",
            directory: true
        }
    });
});

gulp.task('lint', function() {
    return gulp.src(paths.scripts)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('compress', function() {
  return gulp.src(paths.scripts)
    .pipe(uglify())
    .pipe(gulp.dest('build'));
});

gulp.task('watch', ['lint', 'compress'], function() {
  gulp.watch(paths.scripts, ['lint', 'compress']);
});

gulp.task('default', ['watch']);
