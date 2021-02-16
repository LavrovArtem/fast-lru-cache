const gulp = require('gulp');
const merge = require('merge-stream');
const ts = require('gulp-typescript');
const mocha = require('gulp-mocha');

const tsProject = ts.createProject('tsconfig.json');

gulp.task('build', () => {
    const tsResult = tsProject.src().pipe(tsProject());

    return merge(
        tsResult.js.pipe(gulp.dest(tsProject.options.outDir)),
        tsResult.dts.pipe(gulp.dest(tsProject.options.declarationDir))
    );
});

gulp.task('mocha', () => {
    return gulp.src('tests.js', { read: false, exit: true })
        .pipe(mocha());
});

gulp.task('test', gulp.series('build', 'mocha'));
