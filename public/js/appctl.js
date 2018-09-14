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

/* Directory Listing */
/* Workspace folders and files should be stored like the following structure */
function fakeDirData(id) {
    let testData = [{
        "path": "/apps",
        "text": "apps",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "dir",
        "url": "view/apps",
        "lazyLoad": true,
        "ext": "/apps",
        "selectable":false,
        "checkable":false,
    },{
        "path": "/cfe",
        "text": "cfe",
        "size": 4096,
        "mtime": "2018-08-09T15:30:08.431Z",
        "type": "dir",
        "url": "view/cfe",
        "lazyLoad": true,
        "selectable":false,
        "checkable":false,
        "ext": "/cfe"
    },{
        "path": "/flight",
        "text": "flight",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.251Z",
        "type": "dir",
        "url": "view/flight",
        "lazyLoad": true,
        "selectable":false,
        "checkable":false,
        "ext": "/flight"
    },{
        "path": "/probe",
        "text": "probe",
        "size": 4096,
        "mtime": "2018-08-09T15:30:08.499Z",
        "type": "dir",
        "url": "view/probe",
        "lazyLoad": true,
        "selectable":false,
        "checkable":false,
        "ext": "/probe"
    },{
        "path": "/px4",
        "text": "px4",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.251Z",
        "type": "dir",
        "url": "view/px4",
        "lazyLoad": true,
        "selectable":false,
        "checkable":false,
        "ext": "/px4"
    },{
        "path": "/scripts",
        "text": "scripts",
        "size": 4096,
        "mtime": "2018-08-09T15:30:08.559Z",
        "type": "dir",
        "url": "view/scripts",
        "selectable":false,
        "checkable":false,
        "ext": "/scripts",
        "lazyLoad": true,
    }];

    let testNode =   {
        "icon": "fa fa-file",
        "path": "/flow_general",
        "text": "FLOW General",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "file",
        "url": "view/apps/flow",
        "selectable":true,
        "checkable":false,
        "ext": "/apps/flow",
        "path": "flow_general"
    }

    let testNode1 =   {
        "icon": "fa fa-file",
        "path": "/flow_hk",
        "text": "FLOW HK",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "file",
        "url": "view/apps/flow",
        "selectable":true,
        "checkable":false,
        "ext": "/apps/flow",
        "path": "flow_hk"
    }

    let testNode2 =   {
        "icon": "fa fa-file",
        "path": "/flow_general",
        "text": "FLOW Application Control",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "file",
        "url": "view/apps/flow",
        "selectable":true,
        "checkable":false,
        "ext": "/apps/flow",
        "path": "flow_appctl"
    }

    let testNode3 =   {
        "icon": "fa fa-file",
        "path": "/flow_general",
        "text": "FLOW Diag",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "file",
        "url": "view/apps/flow",
        "selectable":true,
        "checkable":false,
        "ext": "/apps/flow",
        "path": "flow_diag"
    }

    let testNode4 =   {
        "icon": "fa fa-file",
        "path": "/flow_general",
        "text": "FLOW Graph",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "file",
        "url": "view/apps/flow",
        "selectable":true,
        "checkable":false,
        "ext": "/apps/flow",
        "path": "flow_graph"
    }

    let testNode5 =   {
        "icon": "fa fa-file",
        "path": "/flow_general",
        "text": "FLOW",
        "size": 4096,
        "mtime": "2018-08-09T15:30:50.247Z",
        "type": "config",
        "url": "view/apps/flow",
        "selectable":true,
        "checkable":false,
        "ext": "/apps/flow",
        "path": "flow_config"
    }

    let testNode6 = {
        "icon": "fa fa-gear",
        "text": "Indicator",
        "type": "widget",
        "selectable":true,
        "checkable":false,
    }

    let result = undefined;
    switch(id) {
        case 1:
            result = testData;
            break;

        case 2:
            result = [testNode1,testNode2,testNode3,testNode4,testNode];
            break;

        case 3:
            result = [testNode5];
            break;

        case 4:
            result = [testNode6];
            break;

        default:
            result = [testNode5];
    }
    return result;
}


/* This function is triggered when a new node is rendered */
function NodeRendered(e, node) {
	console.log(node);
    if(node.type === "file") {
    	console.log('ws/' + node.path);
        let newItemConfig = {
            id: node.id,
            title: node.text,
            type: 'component',
            componentName: 'Blank',
            componentState: { text: "text", link: 'ws/' + node.path}
        };
        console.log(newItemConfig);
        myLayout.createDragSource( node.$el, newItemConfig );
    }
}

/* This function is triggered when a selectable node is selected */
function NodeSelected(e, node) {
	console.log('NodeSelected');
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
        	console.log(newItemConfig);
            myLayout.selectedItem.addChild( newItemConfig );
        }
    } else if(node.type === 'config') {
        $.get('ws/' + node.path,(response) => {
        	var jsonObj = JSON.parse(response);

            if( response !== null ) {
                myLayout.destroy()
                myLayout = new window.GoldenLayout( jsonObj, $('#layoutContainer') );
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
    console.log(element)
}

/* This function initializes directory tree */
function InitTreeView() {
    $('#widgetMenuContainer').treeview({
        data: fakeDirData(4),
        levels:1,
        backColor: '#343a40',//grey
        selectedBackColor: "#fff",
        selectedColor:"#343a40",
        onhoverColor:"#fff",
        wrapNodeText:true,
        onNodeRendered: WidgetNodeRendered,
    });
}

/* Golden Layout */
/* A layout is defined by its configuration as shown below */
/* Initial configuration */
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
        if(item.type=="component") {
            if(item.hasOwnProperty('layout')) {
                let link = undefined;
                let id = undefined;

                if(item.config.hasOwnProperty("id")) {
                    id = item.config.id;
                }

                if(item.config.hasOwnProperty("componentState")) {
                    if(item.config.componentState.hasOwnProperty("link")) {
                        link = item.config.componentState.link;
                    }
                }

                if(id!=undefined && link!=undefined) {
                    item.container._contentElement.load("/"+link);
                    item.container._contentElement.css("overflow","auto");
                }
            }
        }
    });

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
var IndicatorCount = 0;
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

/* appctl main - this script execution starts from here */
$(()=>{
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
