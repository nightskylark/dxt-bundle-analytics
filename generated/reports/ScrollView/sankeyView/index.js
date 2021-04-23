var clicked = false, clickY;
$(document).on({
    'mousemove': function(e) {
        clicked && updateScrollPos(e);
    },
    'mousedown': function(e) {
        clicked = true;
        clickY = e.pageY;
    },
    'mouseup': function() {
        clicked = false;
        $('html').css('cursor', 'auto');
    }
});

var updateScrollPos = function(e) {
    $('html').css('cursor', 'row-resize');
    $(window).scrollTop($(window).scrollTop() + (clickY - e.pageY));
}


$(function() {
    $("#sankey").dxSankey({
        dataSource: data,
        sourceField: "source",
        targetField: "target",
        weightField: "weight",
        onIncidentOccurred: (args)=>{

        },
        //title: "Bundle ",
        node: {
            width: 30,
            padding: 30
        },
        link: {
            colorMode: "none",
            color: "#D8D8D8",
            hoverStyle: {
                opacity: 1,
                color: 'gray',
            }
        },
        // tooltip: {
        //     enabled: true,
        //     customizeLinkTooltip: function(info) {
        //         return {
        //             html:
        //                 "<b>From:</b> " +
        //                 info.source +
        //                 "<br/><b>To:</b> " +
        //                 info.target +
        //                 "<br/>" +
        //                 "<b>Weight:</b> " +
        //                 info.weight
        //         };
        //     }
        // }
    });    
});