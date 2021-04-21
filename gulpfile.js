import gulp from 'gulp';
import path from 'path';
import widgets from './widgetList.js';
import through from 'through2';
import webpack from 'webpack-stream';
import rename from 'gulp-rename';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

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

function processWidget(widget){
    return done => {
        gulp.src('./stubs/stub.js')
        .pipe(rebase(`import STUB_NAME from '${widgets.all[widget]}'`, widget))                
        .pipe(gulp.dest('generated/indices')) 
        .pipe(webpack({
            plugins: [
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    reportFilename: `generated/reports/${widget}/analyzer.html`,
                    openAnalyzer: false,
                    generateStatsFile: true,
                    statsFilename: `generated/reports/${widget}/data.json`,                    
                })
            ]
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
        break;
    }
    return result;
}

export default gulp.task('default', gulp.series(processWidgets()))