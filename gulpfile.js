import gulp from 'gulp';
import path from 'path';
import widgets from './widgetList.js';
import through from 'through2';
import webpack from 'webpack-stream';
import rename from 'gulp-rename';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import StatoscopeWebpackPlugin from '@statoscope/ui-webpack'
import jsonFormat from 'gulp-json-format';

let __dirname = path.resolve()

function rebase(content, name){
    return through.obj(function (vinylFile, encoding, callback) {        
        var transformedFile = vinylFile.clone();    
        transformedFile.contents = Buffer.from(content);
        transformedFile.cwd = '/',
        transformedFile.base = 'generated/indices/',
        transformedFile.path = `generated/indices/${name}.js`,
        callback(null, transformedFile);
      });        
}
function prepareWebpackPlugins(widget){    
    return [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: `generated/reports/${widget}/BundleAnalyzer.html`,
            openAnalyzer: false,
            generateStatsFile: true,
            statsFilename: `generated/reports/${widget}/BundleAnalyzerStats.json`,                    
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'json',
            reportFilename: `generated/reports/${widget}/BundleAnalyzer.json`,
            openAnalyzer: false,
            generateStatsFile: false,            
        }),
        new StatoscopeWebpackPlugin({
            saveTo: `generated/reports/${widget}/Statoscope.html`,
            saveStatsTo: `generated/reports/${widget}/StatoscopeStats.json`,
            statsOptions: { /* any webpack stats options */ },
            //additionalStats: ['path/to/any/stats.json'],
            watchMode: true,
            name: widget,
            open: false
          })                                  
    ];
}

function processWidget(widget){    
    return done => {
        gulp.src('./stubs/stub.js')
        .pipe(rebase(`import STUB_NAME from '${widgets.all[widget]}'`, widget))                
        .pipe(gulp.dest('generated/indices')) 
        .pipe(webpack({
            plugins: prepareWebpackPlugins(widget)
        }))
        .pipe(rename(x=>{
            x.basename = widget;
        }))
        .pipe(gulp.dest('generated/bundles'))        
        .on('end', ()=>done());
    }
}

function processWidgets(){
    let result = [];
    for(let widget in widgets.all){
        result.push(processWidget(widget));        
    }
    return result;
}

function prettyPrintJSONFiles(){
    return [...widgets.all].map(x=>done=>
        gulp.src(`generated/reports/${x}/*.json`)
        .pipe(jsonFormat(4))
        .pipe(gulp.dest(`generated/reports/${x}/`))
        .pipe(rename(x=>{            
        }))
        .on('end', done),        
    );
}

export let prettyPrint = gulp.parallel(prettyPrintJSONFiles());
export let process = gulp.parallel(processWidgets());

export default gulp.series(process, prettyPrint);