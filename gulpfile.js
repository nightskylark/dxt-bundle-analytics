import gulp from 'gulp';
import path from 'path';
import widgets from './widgetList.js';
import through from 'through2';
import webpack from 'webpack-stream';
import rename from 'gulp-rename';

let __dirname = path.resolve()

function rebase(content, name){
    return through.obj(function (vinylFile, encoding, callback) {        
        var transformedFile = vinylFile.clone();    
        transformedFile.contents = Buffer.from(content);
        transformedFile.cwd = '/',
        transformedFile.base = '/indices/',
        transformedFile.path = `/indices/${name}.js`,
        callback(null, transformedFile);
      });        
}

function processWidget(widget){
    return done => {
        gulp.src('./src/stub.js')
        .pipe(rebase(`import STUB_NAME from '${widgets.all[widget]}'`, widget))                
        .pipe(gulp.dest('indices')) 
        .pipe(webpack())
        .pipe(rename(x=>{
            x.basename = widget;
        }))
        .pipe(gulp.dest('bundles'))        
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

export default gulp.task('default', gulp.series(processWidgets()))