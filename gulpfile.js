import gulp from 'gulp';
import path, { resolve } from 'path';
import widgets from './widgetList.js';
import through from 'through2';
import webpack from 'webpack-stream';
import rename from 'gulp-rename';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import StatoscopeWebpackPlugin from '@statoscope/ui-webpack'
import jsonFormat from 'gulp-json-format';
import fs from 'fs';

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
    return [...widgets.all].map(processWidget);    
}

function prettyPrintJSONFiles(){
    return [...widgets.all].map(x=>done=>
        gulp.src(`generated/reports/${x}/*.json`)
        .pipe(jsonFormat(4))
        .pipe(gulp.dest(`generated/reports/${x}/`))        
        .on('end', done),        
    );
}

async function buildMetadata(){
    let sizes = await Promise.all([...widgets.all].map(x=>{
        return new Promise((resolve, reject)=>{
            let pth = path.resolve(__dirname,`generated/reports/${x}/BundleAnalyzer.json`);
            fs.readFile(pth, (error,jsonData) =>{
                let json = JSON.parse(jsonData);
                resolve({name: x, size: json[0].statSize/1000});
            })
        })        
    }));
    sizes.sort((a,b)=>b.size-a.size);        
    fs.writeFileSync('generated/sizes.json', JSON.stringify(sizes, null, 4));    
}

export let prettyPrint = gulp.parallel(prettyPrintJSONFiles());
export let process = gulp.parallel(processWidgets());
export let metadata = buildMetadata;

export default gulp.series(process, prettyPrint, metadata);