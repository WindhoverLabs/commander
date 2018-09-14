/* Collection of application modules to control and orchestrate UI
   Following are the contents of this page -
   Directory Listing
   Golden Layout
   Modal
   Side menu
   ToolTips
   Popover
   Scrollbar
   Resize
   Widget Generation */
var cre = new Event('component-resize-event');
var stce = new Event('stack-created-event');

/* This function is triggered when a new node is rendered */
function NodeRendered(e, node) {
    if(node.type === "file") {
        let newItemConfig = {
            id: node.id,
            title: node.text,
            type: 'component',
            componentName: 'Blank',
            componentState: { text: "text", link: 'ws/' + node.path}
        };

         myLayout.createDragSource( node.$el[0], newItemConfig );
    }
}

/* This function is triggered when a selectable node is selected */
function NodeSelected(e, node) {
    if(node.type === 'file') {
        let newItemConfig = {
            id: node.id,
            title: node.text,
            type: 'component',
            componentName: 'Blank',
            componentState: { text: 'text', link: '/ws' + node.path}
        };

        if( myLayout.selectedItem === null ) {
            alert( 'Container not selected. Choose any container to load component.' );
        } else {
            myLayout.selectedItem.addChild( newItemConfig );
        }
    }
    else if(node.type === 'config') {
        $.get('ws/' + node.path,(response) => {
        	var jsonObj = JSON.parse(response);

            if( response !== null ) {
                myLayout.destroy()
                myLayout = new window.GoldenLayout( jsonObj, $('#layoutContainer') );

                myLayout.on('stackCreated', (item) => {
                	/* TODO:  This is where we need to add code to bind the telemetry
                	 *   and commands to the server.
                	 */
                  if(item.hasOwnProperty("element")){
                    item.element[0].dispatchEvent(stce);
                  }
                	//console.log('stackCreated:',item);
                });

                InitLayout(myLayout);

            } else {
                console.log("Layout cannot be loaded.")
            }
        });

        InitScrollBar();
    }
}

/* Collapse all items in menu */
function NodesCollapse(item) {

    $("#"+item+"MenuContainer").treeview('collapseAll', { silent: true });
}

/* Widget node initialization logic */
function WidgetNodeRendered(e, node) {
    let element = node.$el;
    element.attr("data-toggle","modal")
    element.attr("data-target","#genericInputModal")
    element.attr("data-title",node.text)
    element.attr("data-submit","CreateIndicator");
    element.attr("data-custom",'[{"label":"Indicator Name", "type":"field" },{"label":"Data Path", "type":"field" }, {"label":"Fontawesome Icon", "type":"field" }]');
    let clickFunction = element.onclick;
}


/* Golden Layout */
/* A layout is defined by its configuration as shown below */
/* Initial configuration */
var _config = {
    settings: {
        selectionEnabled: true
    },
    content: [{
        type: 'row',
        content: [{
            type:'component',
            componentName: 'Blank',
            componentState: { text: 'Component 1'}
        },{
            type:'component',
            componentName: 'Blank',
            componentState: { text: 'Component 2'}
        }]
    }]
};

/* Declare Layout */
var myLayout;

/* Initalize layout */
function InitLayout(mlyt){
    /* Register Component in layout */
    mlyt.registerComponent( 'Blank', function( container, state ) {
        if( state.link ) {
            container.getElement().load( "/" + state.link);
        }
        else {
            container.getElement().html( '<h2>' + state.text + '</h2>' );
        }

        $(window).on("LayoutSaved",() => {
            container.extendState({
                link: container._config.componentState.link
            });
        });

    });

    /* Initalize layout */
    mlyt.init();

    /* This event is fired when a component is created, which renders selected page onto created component */
    mlyt.on("itemCreated", (item) => {
      console.log("item created",item)

      item.on('resize',function() {
        dataPlotElements.forEach((e)=>{
          e.dispatchEvent(cre);
        })
      });

      if(item.type=="component") {
          // if(item.hasOwnProperty('layout')) {
              var link = undefined;
              // let id = undefined;
              //
              // if(item.config.hasOwnProperty("id")) {
              //     id = item.config.id;
              // }

              if(item.config.hasOwnProperty("componentState")) {
                  if(item.config.componentState.hasOwnProperty("link")) {
                      link = item.config.componentState.link;
                  }
              }

              if( link!=undefined) {
                  item.container._contentElement.load(link);
                  item.container._contentElement.css("overflow","auto");
              }
          // }
      }
    });

    mlyt.on('stackCreated', (item) => {
      console.log("Stack Created [P]", item)
      if(item.hasOwnProperty("element")){
        item.element[0].dispatchEvent(stce);
      }
    	/* TODO:  This is where we need to add code to bind the telemetry
    	 *   and commands to the server.
    	 */
    });

    // mlyt.on('componentCreated',function(component) {
    //   console.log('Component created');
    //   component.container.on('resize',function() {
    //     dataPlotElements.forEach((e)=>{
    //       e.dispatchEvent(cre);
    //     })
    //   });
    // });

    mlyt.on("stateChanged",function(){
        InitScrollBar();
    });
}

/* Save Layout to browser's local storage */
function SaveLayout() {
    /* now save the state */
    let form = $("[id='inputField0']");
    let name = "LAYOUT_"
    if(form.val() != "")
    {
        name += form.val()+"_"
    }

    /* add timestamp */
    name += Date.now();

    /* stringify state config */
    let state = JSON.stringify( myLayout.toConfig() );
    localStorage.setItem( name, state );
    console.log(name + " stored")
}

/* Get Layouts from browser's local storage */
function GetStoredLayoutList() {
    list = [];
    for (let key in localStorage) {
        if(key.search('LAYOUT_')!=-1){
            list.push(key)
        }
    }
    return list;
}

/* Load Layout */
function LoadLayout() {
    /* if a layout exists, destroy it */
    myLayout.destroy()

    /* retrieve and load saved layout */
    let formVal = $("[id='select0']").val();
    let key = GetStoredLayoutList()[formVal];
    let savedState = localStorage.getItem( key );
    if( savedState !== null ) {
        myLayout = new window.GoldenLayout( JSON.parse( savedState ), $('#layoutContainer') );
        InitLayout(myLayout);
    } else {
        console.log("Layout cannot be loaded.")
    }

    InitScrollBar();
}

/* Modal */
/* Initialize modal functionality*/
function InitModal() {
    /* Make it draggable*/
    $(".modal-content").draggable({
        containment: "document"
    });

    /* show */
    $("#genericInputModal").on('show.bs.modal',(e) => {
        HideMenu('widget');
        let btn = $(e.relatedTarget);
        console.log(e)
        let title = btn.data('title');
        let submit = btn.data('submit');
        let custom = btn.data('custom');
        let item = "";
        let inputsIds = [];

        /* set title */
        $('#modalTitle').text(title);

        /* set custom data */
        for(let e in custom) {
            switch(custom[e].type) {
                case "field":
                    item = "<div class='form-group'>"
                      +"<label class='col-form-label' id=labelField"+e+" for=inputField"+e+">"+custom[e].label+"</label>"
                      +"<input class='form-control' type='text' id=inputField"+e+">"
                      +"</div>"
                    inputsIds.push("inputField"+e)
                    $('#modalForm').append(item);
                    break;

                case "dropdown":
                    item = "<div class='form-group'>"
                      +"<label class='col-form-label' id=labelField"+e+" for=inputField"+e+">"+custom[e].label+"</label>"
                      +"<select class='custom-select mr-sm-2'id=select"+e+">"
                      +"<option selected>Choose..</option>"
                      +"</select>"
                      +"</div>"
                    $('#modalForm').append(item)
                    inputsIds.push("select"+e)
                    let options = window[custom[e].getItem].call()
                    console.log(options);
                    for(let i in options){
                        let html = "<option value="+i+">"+options[i]+"</option>"
                        $('#select'+e).append(html)
                    }
                    break;

                default:
                    console.log("Unknown data passed as attribute");
            }
        }

        /* set submit action */
        $('#modalSubmit')[0].onclick = window[submit];
    });

    /* hide */
    $("#genericInputModal").on('hidden.bs.modal',(e) => {
        /* replace title */
        $("#modalTitle").text('Title Placeholder');

        /* Remove all attached children*/
        $("#modalForm").empty();

        /* Unset submit action */
        $('#modalSubmit')[0].onclick = null;
    });
}

/* Side menu */
/*Initialize menu state change functionality*/
function ShowMenu(item){
    $("#"+item+"MenuContainer").addClass("menuShow");
    $("#"+item+"MenuToggle").addClass("active");
    $("#"+item+"MenuContainer").data("open",true);
}

function HideMenu(item){
    $("#"+item+"MenuContainer").removeClass("menuShow");
    $("#"+item+"MenuToggle").removeClass("active");
    $("#"+item+"MenuContainer").data("open",false);
    NodesCollapse(item);
}

function InitMenuState(){
    $("#panelMenuToggle").click(() => {
        let open = $("#panelMenuContainer").data("open");
        if(!open){
            HideMenu("widget");
            HideMenu("layout");
            ShowMenu("panel");
        } else {
            HideMenu("panel");
        }
    });

    $("#layoutMenuToggle").click(() => {
        let open = $("#layoutMenuContainer").data("open");
        if(!open) {
            HideMenu("widget");
            HideMenu("panel");
            ShowMenu("layout");
        } else {
            HideMenu("layout");
        }
    });

    $("#widgetMenuToggle").click(() => {
        let open = $("#widgetMenuContainer").data("open");
        if(!open) {
            HideMenu("layout");
            HideMenu("panel");
            ShowMenu("widget");
        } else {
            HideMenu("widget");
        }
    });
}

/* ToolTips */
function InitToolTips() {
    $('[data-toggle="tooltip"]').tooltip({
        "container":"false"
    });

    $('[data-toggle="tooltip"]').on('show.bs.tooltip', function (e) {
        $("#tooltips").text(e.target.dataset.originalTitle);
    });

    $('[data-toggle="tooltip"]').on('hide.bs.tooltip', function (e) {
        $("#tooltips").text("ToolTips");
    });
}

/* Popover */
function InitPopover(){
    $(function () {
        $('[data-toggle="popover"]').popover()
    });
}

/* Scrollbar */
function InitScrollBar(){
    /* os-theme-dark class should be added to every pug file in the top element */
    setTimeout(function(){
        $('.os-theme-dark').overlayScrollbars({"autoUpdate":true });
    }, 10);

    setTimeout(function(){
        $('.os-theme-dark').overlayScrollbars({"autoUpdate":true });
    }, 100);
    setTimeout(function(){
        $('.os-theme-dark').overlayScrollbars({"autoUpdate":true });
    }, 250);
    setTimeout(function(){
        $('.os-theme-dark').overlayScrollbars({"autoUpdate":true });
    }, 500);

    setTimeout(function(){
        $('.os-theme-dark').overlayScrollbars({"autoUpdate":true });
    }, 1000);
}

/* Resize */
function InitResizeCtl(){
    $(window).resize(() => {
        console.log("resize-event");
        myLayout.updateSize();
    })
}

/* Draggable */
function InitDraggable(){
	console.log('InitDraggable');
    $("#topSnapable").sortable({
        revert: true
    });

    // $(".indicator-draggable").draggable({
    //   containment: "nav",
    //   snap: "#topSnapable",
    //   snapMode: "inner",
    // });
}

/* Widget Generation */
var _IndicatorCount = 0;
function CreateIndicator() {
    if(IndicatorCount < 8) {
        IndicatorCount += 1;
        let name = $("[id='inputField0']");
        let data = $("[id='inputField1']");
        let icon = $("[id='inputField2']");
        $("#topSnapable").append(
            "<li class='nav-item indicator-draggable'>"
            +"<span class='indicator-name'>"+name.val()+"</span>"
            +"<span class='badge badge-info indicator-val' data-sage="+data.val()+">-</span>"
            +"<span class='badge badge-light indicator-close' onclick='IndicatorCloseClick.call(this)'>x</span>"
            +"</li>"
        );
        InitDraggable();
    } else {
        console.log("Nav real estate - full, sell plots");
    }
}

function IndicatorCloseClick() {
    this.parentNode.remove();
    IndicatorCount -= 1;
}



function UpdateLayoutNode(node, display) {
    session.getLayouts(node.path, function (dirEntries) {
        var entries = [];

        for(var i=0; i < dirEntries.length; ++i) {
            var dirEntry = dirEntries[i];

            var layoutEntry = {
                name: dirEntry.name,
                text: dirEntry.name,
                path: dirEntry.path,
                type: dirEntry.type,
                ext: dirEntry.path,
                selectable: false,
                checkable: false
            };

            if(dirEntry.type == 'dir') {
                layoutEntry.lazyLoad = true;
                layoutEntry.selectable = false;
            } else {
                layoutEntry.lazyLoad = false;
                layoutEntry.selectable = true;
                layoutEntry.type = 'config';
            }

            entries.push(layoutEntry);
        }

        var tree = $('#layoutMenuContainer').treeview(true)
        tree.addNode(entries, node, node.index, { silent: true} );
        tree.expandNode(node, { silent: true, ignoreChildren: true } );
    });
}

function UpdatePanelNode(node, display) {
    session.getPanels(node.path, function (dirEntries) {
        var panelEntries = [];

        for(var i=0; i < dirEntries.length; ++i) {
            var dirEntry = dirEntries[i];

            var panelEntry = {
                name: dirEntry.name,
                text: dirEntry.name,
                path: dirEntry.path,
                type: dirEntry.type,
                ext: dirEntry.path,
                selectable: true,
                checkable: false
            };

            if(dirEntry.type == 'dir') {
                panelEntry.lazyLoad = true;
                panelEntry.selectable = false;
            } else {
                panelEntry.icon = 'fa fa-file';
                panelEntry.lazyLoad = false;
                panelEntry.selectable = true;
                panelEntry.type = 'file';
                panelEntry.url = 'ws/' + dirEntry.path;
            }

            panelEntries.push(panelEntry);
        }

        var tree = $('#panelMenuContainer').treeview(true)
        tree.addNode(panelEntries, node, node.index, { silent: true} );
        tree.expandNode(node, { silent: true, ignoreChildren: true } );
    });
}


var _session;

/* appctl main - this script execution starts from here */
$(()=>{
	session = new CommanderClient();

    var config = {
        settings: {
            selectionEnabled: true
        },
        content: [{
            type: 'row',
            content: [{
                type:'component',
                componentName: 'Blank',
                componentState: { text: 'Component 1'}
            },
            {
                type:'component',
                componentName: 'Blank',
                componentState: { text: 'Component 2'}
            }]
        }]
    };

    session.on('connect', function() {
        console.log('connected');

        session.getPanels('', function (dirEntries) {
            var panelEntries = [];

            for(var i=0; i < dirEntries.length; ++i) {
                var entry = {
                    name: dirEntries[i].name,
                    text: dirEntries[i].name,
                    path: dirEntries[i].path,
                    type: dirEntries[i].type,
                    lazyLoad: true,
                    ext: dirEntries[i].path,
                    selectable: false,
                    checkable: false
                };

                panelEntries.push(entry);
            }

            $('#panelMenuContainer').treeview({
                data: panelEntries,
                levels:1,
                backColor: '#343a40',//grey
                selectedBackColor: "#fff",
                selectedColor:"#343a40",
                onhoverColor:"#fff",
                wrapNodeText:true,
                collapseIcon: 'fa fa-minus',
                expandIcon: 'fa fa-plus',
                lazyLoad: UpdatePanelNode,
                onNodeRendered : NodeRendered,
                onNodeSelected: NodeSelected,
            });

            session.getLayouts('', function (dirEntries) {
                var entries = [];

                for(var i=0; i < dirEntries.length; ++i) {
                    console.log(dirEntries);
                    var entry = {
                        name: dirEntries[i].name,
                        text: dirEntries[i].name,
                        path: dirEntries[i].path,
                        type: dirEntries[i].type,
                        lazyLoad: true,
                        ext: dirEntries[i].path,
                        selectable: false,
                        checkable: false
                    };

                    entries.push(entry);
                }
                myLayout = new window.GoldenLayout( config, $('#layoutContainer'));

                $('#layoutMenuContainer').treeview({
                    data: entries,
                    levels:1,
                    backColor: '#343a40',//grey
                    selectedBackColor: "#fff",
                    selectedColor:"#343a40",
                    onhoverColor:"#fff",
                    wrapNodeText:true,
                    collapseIcon: 'fa fa-minus',
                    expandIcon: 'fa fa-plus',
                    lazyLoad: UpdateLayoutNode,
                    onNodeRendered : NodeRendered,
                    onNodeSelected: NodeSelected,
                });

                InitLayout(myLayout);
                InitModal();
                InitMenuState();
                //InitToolTips();
                //InitPopover();
                //InitScrollBar();
                //InitResizeCtl();
            });
        });

        //session.getViews(function (views) {
        //    console.log(views);
        //});
        //
        //session.getCmdDefs(function (cmdDefs) {
        //    console.log(cmdDefs);
        //});
        //
        //session.getTlmDefs(function (tlmDefs) {
        //    console.log(tlmDefs);
        //});
        //
        //session.subscribe(function (params) {
        //    console.log(params);
        //});
        //
        //session.sendCommand(function (result) {
        //    console.log(result);
        //});
    });

    //  myLayout = new window.GoldenLayout( config, $('#layoutContainer'));
    //  InitTreeView();
    //  InitLayout(myLayout);
    //  InitModal();
    //  InitMenuState();
    //  InitToolTips();
    //  InitPopover();
    //  InitScrollBar();
    //  InitResizeCtl();
});
