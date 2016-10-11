import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import babelCompiler from 'babel-core/register';
import del from 'del';
import runSequence from 'run-sequence';
import * as isparta from 'isparta';

const cache = require('gulp-cached')

const plugins = gulpLoadPlugins();

const paths = {
  js: ['./**/*.js', '!dist/**', '!node_modules/**', '!coverage/**'],
  nonJs: ['./package.json', './.gitignore'],
  tests: './tests/*.js'
};

const options = {
  codeCoverage: {
    reporters: ['lcov', 'text-summary'],
    thresholds: {
      global: { statements: 5, branches: 5, functions: 5, lines: 5 }
    }
  }
};

// const paths = [
//   'models/**/*',
//   'routes/**/*',
//   'utils/**/*',
//   'index.js'
// ]

const config = {
  base: '.'
}

// Clean up dist and coverage directory
gulp.task('clean', () =>
  del(['dist/**', 'coverage/**', '!dist', '!coverage'])
);

gulp.task('transpile', () => {
  return gulp.src([...paths.js, '!gulpfile.babel.js'], config)
  .pipe(cache('transpile'))
  .pipe(plugins.babel())
  .pipe(gulp.dest('dist'))
})

gulp.task('default', () => gulp.watch(paths, ['transpile']))

// Set env variables
gulp.task('set-env', () => {
  plugins.env({
    vars: {
      NODE_ENV: 'test'
    }
  });
});
// covers files for code coverage
gulp.task('pre-test', () =>
  gulp.src([...paths.js, '!gulpfile.babel.js'])
    // Covering files
    .pipe(plugins.istanbul({
      instrumenter: isparta.Instrumenter,
      includeUntested: true
    }))
    // Force `require` to return covered files
    .pipe(plugins.istanbul.hookRequire())
);


// triggers mocha test with code coverage
gulp.task('test', ['pre-test', 'set-env'], () => {
  let reporters;
  let exitCode = 0;

  if (plugins.util.env['code-coverage-reporter']) {
    reporters = [...options.codeCoverage.reporters, plugins.util.env['code-coverage-reporter']];
  } else {
    reporters = options.codeCoverage.reporters;
  }

  return gulp.src([paths.tests], { read: false })
    .pipe(plugins.plumber())
    .pipe(plugins.mocha({
      reporter: plugins.util.env['mocha-reporter'] || 'spec',
      ui: 'bdd',
      timeout: 6000,
      compilers: {
        js: babelCompiler
      }
    }))
    .once('error', (err) => {
      plugins.util.log(err);
      exitCode = 1;
    })
    // Creating the reports after execution of test cases
    .pipe(plugins.istanbul.writeReports({
      dir: './coverage',
      reporters
    }))
    // Enforce test coverage
    .pipe(plugins.istanbul.enforceThresholds({
      thresholds: options.codeCoverage.thresholds
    }))
    .once('end', () => {
      plugins.util.log('completed !!');
      process.exit(exitCode);
    });
});

gulp.task('mocha', ['clean'], () => {
  runSequence(
    ['transpile'],
    'test'
  );
});
