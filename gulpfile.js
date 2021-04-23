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
import glob from 'glob';

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
function prepareWebpackPlugins(bundle){    
    return [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: `generated/reports/${bundle}/BundleAnalyzer.html`,
            openAnalyzer: false,
            generateStatsFile: true,
            statsFilename: `generated/reports/${bundle}/BundleAnalyzerStats.json`,                    
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'json',
            reportFilename: `generated/reports/${bundle}/BundleAnalyzer.json`,
            openAnalyzer: false,
            generateStatsFile: false,            
        }),
        new StatoscopeWebpackPlugin({
            saveTo: `generated/reports/${bundle}/Statoscope.html`,
            saveStatsTo: `generated/reports/${bundle}/StatoscopeStats.json`,
            statsOptions: { /* any webpack stats options */ },
            //additionalStats: ['path/to/any/stats.json'],
            watchMode: true,
            name: bundle,
            open: false
          })                                  
    ];
}

export async function buildIndices(){
    await Promise.all([...widgets.all].map(widget=>
        new Promise((resolve, reject) =>{
            gulp.src('./stubs/stub.js')
            .pipe(rebase(`import STUB_NAME from '${widgets.all[widget]}'`, widget))
            .pipe(gulp.dest('generated/indices'))
            .on('end', ()=>resolve())
        })));
}
export async function copyStubsToIndices(){
    return new Promise((resolve, reject)=>{
        gulp.src('./predefined/*.js')
        .pipe(gulp.dest('generated/indices'))
        .on('end', ()=>resolve());
    })    
}
async function getBundleNames(){
    return await new Promise((resolve,reject)=>{
        glob('./generated/indices/*.js', (err, files)=>{            
            resolve(files.map(x=>path.basename(x).slice(0, -path.extname(x).length)));
        });
    });
}

function processBundle(bundle) {    
    return new Promise((resolve, reject)  => {
        gulp.src(`./generated/indices/${bundle}.js`)
        .pipe(webpack({
            plugins: prepareWebpackPlugins(bundle)
        }))
        .pipe(rename(x=>{
            x.basename = bundle;
        }))
        .pipe(gulp.dest('generated/bundles'))        
        .on('end', ()=>resolve());
    });
}

async function processWidgets(){
    await buildIndices();
    await copyStubsToIndices();
    let bundles = await getBundleNames();
    await Promise.all(bundles.map(processBundle));     
}

export async function prettyPrintJSONFiles(){
    let bundles = await getBundleNames();
    await Promise.all(bundles.map(bundle=>new Promise((resolve, reject) =>
        gulp.src(`generated/reports/${bundle}/*.json`)
        .pipe(jsonFormat(4))
        .pipe(gulp.dest(`generated/reports/${bundle}/`))        
        .on('end', ()=>resolve()),        
    )))    
}

export async function buildMetadata(){
    let bundles = await getBundleNames();
    let sizes = await Promise.all(bundles.map(x=>{
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

function processSizes(sizes){
    sizes = sizes  
    .filter(x=>{        
        if(x.source == 'generated/indices'
        || x.target == 'generated/indices'
        || x.target == '@babel/runtime/helpers/esm'
        || x.source == '@babel/runtime/helpers/esm'
        // || x.source == 'node_modules'
        // || x.target == 'node_modules'
        )
            return false;
        
        return true;
    })        
    ;
sizes = [...new Set(sizes)];
let dataString = JSON.stringify(sizes, null, 4)
    .replace(/"source":/g, 'source:')
    .replace(/"weight":/g, 'weight:')
    .replace(/"target":/g, 'target:')
    .replace(new RegExp('./node_modules/devextreme/esm', 'g'), '')
    ;
dataString = 'var data = ' + dataString;
return dataString;
}

export async function buildSankeyData(done){
    let bundles = await getBundleNames();
    let sizes = await Promise.all(bundles.map(x=>{
        return new Promise((resolve, reject)=>{
            let pth = path.resolve(__dirname,`generated/reports/${x}/StatoscopeStats.json`);
            fs.readFile(pth, (error,jsonData) =>{
                let json = JSON.parse(jsonData);                
                let collection = json
                .modules
                .map(x=>x.modules)
                .filter(x=>!!x)
                .reduce((accumulator, current)=>[...accumulator, ... current], [])    
                .map(x=>({
                    source: x.issuerName,
                    weight: x.size,
                    target: x.name
                }))
                resolve({name: x, collection: collection});
            })
        })        
    }));
    let items = {};
    sizes.reduce((acc, elem)=>items[elem.name] = elem.collection, items);

    let gulpTasks = bundles.map(x=>(resolve, reject)=>
        gulp.src(`stubs/sankeyView/*`)
        .pipe(through.obj((vinylFile, encoding, callback) => {        
            if(vinylFile.path.indexOf('data.js')<0)
                return callback(null, vinylFile);
            
            var transformedFile = vinylFile.clone();    
            transformedFile.contents = Buffer.from(processSizes(items[x]));            
            callback(null, transformedFile);
          }))
        .pipe(gulp.dest(`generated/reports/${x}/sankeyView`))        
        .on('end', x=>resolve()),        
    );
    await Promise.all(gulpTasks.map(x=>new Promise(x)));
}

export default gulp.series(processWidgets, prettyPrintJSONFiles, buildMetadata, buildSankeyData);