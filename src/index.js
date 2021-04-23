$.getJSON('../generated/sizes.json', (data) => {
     $("#list").dxList({
          dataSource: data,
          displayExpr: (item) => {
               return item.name + ': ' + Math.round(item.size) + ' Kb';
          },
          selectionMode: 'single',
          showSelectionControls: true,
          onSelectionChanged: (data) => {
               const name = data.addedItems[0].name;
               const items = [{
                    title: 'Bandle Analyzer', 
                    text: `../generated/reports/${ name }/BundleAnalyzer.html`
               }, {
                    title: 'Statoscope',
                    text: `../generated/reports/${ name }/Statoscope.html`
               }, {
                    title: 'SankeyView',
                    text: `../generated/reports/${ name }/sankeyView/index.html`
               }];
               $("#tabpanel").dxTabPanel({
                    dataSource: items,
                    selectedIndex: 0,
                    swipeEnabled: true,
                    loop: true,
                    height: '100%',
                    itemTemplate: function (data, index, element) {
                         const $iframe = $("<iframe>").attr({
                              src: data.text,
                              height: '100%',
                              width: '100%'    
                              });
                         element.append($iframe);
                    }
               });
          },
     });
});