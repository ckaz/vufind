module.exports = function(grunt) {
  require('jit-grunt')(grunt); // Just in time library loading

  grunt.initConfig({
    // File deletion
    clean: {
      uglify: ['themes/bootstrap3/js/vendor.min.js'],
      js_src: ['themes/' + grunt.option('theme') + '_pkgd/js/'],
      less_src: [
        'themes/' + grunt.option('theme') + '_pkgd/less/',
        'themes/' + grunt.option('theme') + '_pkgd/sass/',
      ]
    },
    // File duplication
    copy: {
      from_theme: {
        expand: true,
        cwd: 'themes/<%= grunt.task.current.args[0] %>/',
        src: ['**'],
        dest: 'themes/<%= grunt.task.current.args[1] %>_pkgd/',
        process: function () {
        }
      }
    },
    // LESS compilation
    less: {
      compile: {
        options: {
          paths: ["themes/bootprint3/less", "themes/bootstrap3/less"],
          compress: true,
          modifyVars: {
            'fa-font-path': '"fonts"',
            'img-path': '"../images"'
          }
        },
        files: {
          "themes/bootstrap3/css/compiled.css": "themes/bootstrap3/less/bootstrap.less",
          "themes/bootprint3/css/compiled.css": "themes/bootprint3/less/bootprint.less"
        }
      }
    },
    // SASS compilation
    sass: {
      compile: {
        options: {
          loadPath: ["themes/bootprint3/sass", "themes/bootstrap3/sass"],
          style: 'compress'
        },
        files: {
          "themes/bootstrap3/css/compiled.css": "themes/bootstrap3/sass/bootstrap.scss",
          "themes/bootprint3/css/compiled.css": "themes/bootprint3/sass/bootprint.scss"
        }
      }
    },
    // Convert LESS to SASS
    lessToSass: {
      convert: {
        files: [
          {
            expand: true,
            cwd: 'themes/bootstrap3/less',
            src: ['*.less', 'components/*.less'],
            ext: '.scss',
            dest: 'themes/bootstrap3/sass'
          },
          {
            expand: true,
            cwd: 'themes/bootprint3/less',
            src: ['*.less'],
            ext: '.scss',
            dest: 'themes/bootprint3/sass'
          }
        ],
        options: {
          replacements: [
            { // Replace ; in include with ,
              pattern: /(\s+)@include ([^\(]+)\(([^\)]+)\);/gi,
              replacement: function (match, space, $1, $2) {
                return space+'@include '+$1+'('+$2.replace(/;/g, ',')+');';
              },
              order: 3
            },
            { // Inline &:extends converted
              pattern: /&:extend\(([^\)]+)\)/gi,
              replacement: '@extend $1',
              order: 3
            },
            { // Inline variables not default
              pattern: / !default; }/gi,
              replacement: '; }',
              order: 3
            },
            {  // VuFind: Correct paths
              pattern: 'vendor/bootstrap/bootstrap',
              replacement: 'vendor/bootstrap',
              order: 4
            },
            {
              pattern: '$fa-font-path: "../../../fonts" !default;',
              replacement: '$fa-font-path: "fonts";',
              order: 4
            },
            {
              pattern: '$img-path: "../../images" !default;',
              replacement: '$img-path: "../images";',
              order: 4
            },
            { // VuFind: Bootprint fixes
              pattern: '@import "bootstrap";\n@import "variables";',
              replacement: '@import "variables", "bootstrap";',
              order: 4
            },
            {
              pattern: '$brand-primary: #619144 !default;',
              replacement: '$brand-primary: #619144;',
              order: 4
            }
          ]
        }
      }
    },
    // JS styling
    eslint: {
      options: {
        configFile: '.eslintrc.json'
      },
      bootstrap3: ['themes/bootstrap3/js/*.js']
    },
    // JS compression
    uglify: {
      options: {
        mangle: false
      },
      vendor_min_bs3: { // after running uglify:vendor_min, change your theme.config.php
        files: {    // to only load vendor.min.js instead of all the js/vendor files
          'themes/bootstrap3/js/vendor.min.js': [
            'themes/bootstrap3/js/vendor/jquery.min.js',       // these two need to go first
            'themes/bootstrap3/js/vendor/bootstrap.min.js',
            'themes/bootstrap3/js/vendor/*.js',
            'themes/bootstrap3/js/autocomplete.js',
            '!themes/bootstrap3/js/vendor/bootstrap-slider.js' // skip, not "use strict" compatible
          ]
        }
      },
      in_theme: {
        files: {
          'themes/<%= grunt.option("theme") %>/<%= grunt.option("temp") %>/vufind.min.js': [
            'themes/' + grunt.option('theme') + '/js/*.js'
          ]
        }
      }
    },
    search: {
      move_optional_js: {
        files: {
          src: ['themes/<%= grunt.task.current.args[0] %>/templates/**']
        },
        options: {
          searchString: /([\w-\\\/\.]+\.js)/g,
          logFile: "/dev/null",
          onComplete: function(matches) {
            var optionals = [];
            for (var i in matches.matches) {
              for (var j=0; j<matches.matches[i].length; j++) {
                if (optionals.indexOf(matches.matches[i][j].match) < 0) {
                  optionals.push(matches.matches[i][j].match);
                }
              }
            }
            console.log(optionals);
          }
        }
      }
    },

    compress: { theme: {} }
  });

  grunt.registerTask('js', ['clean:uglify', 'eslint', 'uglify']);
  grunt.registerTask('default', ['less', 'js']);

  grunt.registerMultiTask('compress', function() {
    if (!grunt.option('theme')) {
      grunt.log.error('Please specify a theme with --theme=X');
      return false;
    }

    var newTheme = grunt.option('theme') + '_pkgd';
    var pkgdFolder = 'themes/' + grunt.option('theme') + '_pkgd';
    grunt.log.writeln('Compressing theme: ' + grunt.option('theme') + ' to ' + newTheme);

    var fs = require('fs');
    if (fs.existsSync(pkgdFolder)) {
      // grunt.file.delete(pkgdFolder);
    }

    grunt.log.write('- Generating theme tree... ');
    var theme = grunt.option('theme');
    var themeStack = [theme];
    while (theme !== 'root') {
      var config = fs.readFileSync('themes/'+theme+'/theme.config.php', 'UTF-8');
      theme = config.toLowerCase().replace(/[\s"']/g, '').match(/extends=>(\w+)/)[1];
      themeStack.push(theme);
    }
    for (var i=0; i<themeStack.length; i++) {
      grunt.log.ok().write('- Copying theme ('+themeStack[i]+')... ');
      grunt.file.recurse('themes/'+themeStack[i], function callback (abspath, rootdir, subdir, filename) {
        var dest = abspath.replace('themes/'+themeStack[i], pkgdFolder);
        if (!dest.match(/\/css\//) && !fs.existsSync(dest)) {
          grunt.log.debug('('+themeStack[i]+') '+dest);
          // grunt.file.copy(abspath, dest);
        }
      });
    }
    grunt.log.ok().write('- Compressing LESS to css/... ');
    var lessOptions = grunt.config.get('less.compile');
    lessOptions.options.paths.unshift(pkgdFolder + '/less');
    lessOptions.files[pkgdFolder + '/css/compiled.css'] = pkgdFolder + '/less/compiled.less';
    grunt.config.set('less.compile', lessOptions);
    grunt.task.run('less:compile');
    grunt.log.ok().write('- Removing LESS source... ');
    grunt.task.run('clean:less_src');
    grunt.log.ok().write('- Scanning templates for optional JS... ');
    grunt.task.run('search:move_optional_js:' + newTheme);
    grunt.log.ok().write('- Moving optional JS to temp/... ');
    grunt.log.ok().write('- Compressing JS to temp/... ');
    grunt.option('temp', 'temp');
    // grunt.task.run('uglify:in_theme');
    grunt.log.ok().write('- Removing JS source... ');
    // grunt.task.run('clean:js_src');
    grunt.log.ok().write('- Moving JS from temp/ to js/... ');
    grunt.log.ok().write('- Removing temp/... ');
    grunt.log.ok().write('- Creating theme.config.php... ');
  });
};