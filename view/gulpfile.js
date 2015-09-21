var gulp = require('gulp');
var webpack = require('webpack');
var webpackConfig = require('./webpack.config.js');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var cache = require('gulp-cache');
var packageFile = require('package')('.');
var watch = require('gulp-watch');
var exec = require('child_process').exec;
var htmlRebuild = require('gulp-html-rebuild');
var htmlPrettify = require('gulp-prettify');
var babel = require('gulp-babel');
var less = require('gulp-less');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var lessBaseImport = require('gulp-less-base-import');
var mocha = require('gulp-mocha');
var plumber = require('gulp-plumber');

var exec = require('child_process').exec;
var path = require('path');

var BUILD_DIR = 'dist';
var SRC_DIR = 'src';
var TEST_DIR = 'test';
var IMG_SRC_DIR = 'images';
var IMG_DEST_DIR = 'images';
var COMPONENT_SRC_DIR = 'components';
var COMPONENT_DEST_DIR = 'components';
var STANDALONE_DIR = 'standalone';
var JS_LIB_SRC_DIR = 'lib';
var JS_LIB_DEST_DIR = 'lib';

var IMAGE_TO_COMPRESS = '.jpg,.png,.svg,.gif';

gulp.task('clean', function(done) {
    done();
});

gulp.task('image compression', ['clean'], function() {
    return gulp.src([path.join(SRC_DIR, IMG_SRC_DIR, '**')])
          .pipe(cache(imagemin({
              progressive: true,
              svgoPlugins: [{removeViewBox: false}],
              use: [pngquant()]
          }), {
              fileCache: new cache.Cache({cacheDirName: packageFile.name + '-cache'})
          }))
          .pipe(gulp.dest(path.join(BUILD_DIR, IMG_DEST_DIR)));
});

gulp.task('webpack', [], function(done) {
    return webpack(webpackConfig, function(err, stats) {
        var output = stats.toString();
        if(output.indexOf('ERROR') !== -1) {
            console.log(output);
            return done(new Error('webpack build failed'));
        }
        done();
    });
});

gulp.task('compile less', [], function() {
    return compileLess();
});

function compileLess() {
    var processors = [autoprefixer, cssnano];

    return gulp.src([path.join(SRC_DIR, '**/*.less')])
               .pipe(plumber())
               .pipe(lessBaseImport(webpackConfig.lessImportLoader.base))
               .pipe(less())
               .pipe(postcss(processors))
               .pipe(gulp.dest(path.join(BUILD_DIR)));
}

gulp.task('babel', [], function() {
    return compileBabel();
});

function compileBabel() {
    return gulp.src(path.join(SRC_DIR, '**/*.babel'))
               .pipe(plumber())
               .pipe(babel())
               .pipe(gulp.dest(path.join(BUILD_DIR)));
}

gulp.task('compile tests', [], function() {
    return gulp.src(path.join(TEST_DIR, '**/*.babel'))
               .pipe(babel())
               .pipe(gulp.dest(path.join(BUILD_DIR, TEST_DIR)));
});

gulp.task('move lib', [], function() {
    return gulp.src(path.join(SRC_DIR, JS_LIB_SRC_DIR, '*'))
               .pipe(gulp.dest(path.join(BUILD_DIR, JS_LIB_DEST_DIR)));
});

gulp.task('watch webpack', [], function() {
    try {
        exec('webpack --watch -d --config webpack.dev.config.js', function(err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            if(err) console.log(err);
        });
    } catch(e) {
        console.log(e);
    }
});

gulp.task('watch images', [], function() {
    gulp.src(path.join(SRC_DIR, IMG_SRC_DIR, '**'))
        .pipe(gulp.dest(path.join(BUILD_DIR, IMG_DEST_DIR)));

    watch(path.join(SRC_DIR, IMG_SRC_DIR, '**'), function() {
        gulp.src(path.join(SRC_DIR, IMG_SRC_DIR, '**'))
            .pipe(gulp.dest(path.join(BUILD_DIR, IMG_DEST_DIR)));
    });
});

gulp.task('watch babel', [], function() {
    compileBabel();

    watch(path.join(SRC_DIR, '**/*.babel'), function() {
        compileBabel();
    });
});

gulp.task('watch less', [], function() {
    compileLess();

    watch(path.join(SRC_DIR, '**/*.less'), function() {
        compileLess();
    });
});

gulp.task('watch lib', [], function() {
    gulp.src(path.join(SRC_DIR, JS_LIB_SRC_DIR, '*'))
        .pipe(gulp.dest(path.join(BUILD_DIR, JS_LIB_DEST_DIR)));

    watch(path.join(SRC_DIR, JS_LIB_SRC_DIR, '*'), function() {
        gulp.src(path.join(SRC_DIR, JS_LIB_SRC_DIR, '*'))
            .pipe(gulp.dest(path.join(BUILD_DIR, JS_LIB_DEST_DIR)));
    });
});

gulp.task('default', ['clean', 'image compression', 'webpack', 'babel', 'compile less', 'move lib']);
gulp.task('dev', ['watch webpack', 'watch images', 'watch babel', 'watch less', 'watch lib']);
gulp.task('test', ['babel', 'compile less', 'compile tests'], function() {
    return gulp.src(path.join(BUILD_DIR, TEST_DIR, 'spec.js'), {read: false})
               .pipe(mocha());
});
gulp.task('cov', [], function(done) {
    exec('istanbul cover _mocha dist/test/spec.js -- -R spec', function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);

        if(err !== null) {
            console.error('code coverage failed!');
            process.exit(1);
        } else {
            done();
            exec('open coverage/lcov-report/index.html');
        }
    });
});
