
module.exports.languages = [ 'abap',
  'abc',
  'actionscript',
  'ada',
  'apache_conf',
  'applescript',
  'asciidoc',
  'assembly_x86',
  'autohotkey',
  'batchfile',
  'c9search',
  'cirru',
  'clojure',
  'cobol',
  'coffee',
  'coldfusion',
  'csharp',
  'css',
  'curly',
  'c_cpp',
  'd',
  'dart',
  'diff',
  'django',
  'dockerfile',
  'dot',
  'eiffel',
  'ejs',
  'elixir',
  'elm',
  'erlang',
  'forth',
  'ftl',
  'gcode',
  'gherkin',
  'gitignore',
  'glsl',
  'golang',
  'groovy',
  'haml',
  'handlebars',
  'haskell',
  'haxe',
  'html',
  'html_ruby',
  'ini',
  'io',
  'jack',
  'jade',
  'java',
  'javascript',
  'json',
  'jsoniq',
  'jsp',
  'jsx',
  'julia',
  'latex',
  'lean',
  'less',
  'liquid',
  'lisp',
  'livescript',
  'live_script',
  'logiql',
  'lsl',
  'lua',
  'luapage',
  'lucene',
  'makefile',
  'markdown',
  'mask',
  'matlab',
  'mavens_mate_log',
  'maze',
  'mel',
  'mipsassembler',
  'mips_assembler',
  'mushcode',
  'mysql',
  'nix',
  'objectivec',
  'ocaml',
  'pascal',
  'perl',
  'pgsql',
  'php',
  'plain_text',
  'powershell',
  'praat',
  'prolog',
  'properties',
  'protobuf',
  'python',
  'r',
  'rdoc',
  'rhtml',
  'ruby',
  'rust',
  'sass',
  'scad',
  'scala',
  'scheme',
  'scss',
  'sh',
  'sjs',
  'smarty',
  'snippets',
  'soy_template',
  'space',
  'sql',
  'sqlserver',
  'stylus',
  'svg',
  'swift',
  'swig',
  'tcl',
  'tex',
  'text',
  'textile',
  'toml',
  'twig',
  'typescript',
  'vala',
  'vbscript',
  'velocity',
  'verilog',
  'vhdl',
  'xml',
  'xquery',
  'yaml' ];

// var walk = require('walk');
// var languages = undefined;
// var files = [];

// // Walker options
// var walker = walk.walk('./public/plugins/ace-builds/src-noconflict/', {
//     followLinks: false
// });

// walker.on('file', function(root, stat, next) {
//     // Add this file to the list of files
//     if(stat.name.indexOf("mode")==0)
//     {
//         files.push(stat.name.substring(5,stat.name.length-3));
//     }
//     next();
// });

// walker.on('end', function() {
//     console.log(files);
//     languages = files;
// });

// module.exports.insert = function(args){
//     return function(req,res,next){
//         walker.on('end',function(){});
//         if(args.indexOf('languages')>=0){
//         }
//     }
// }
