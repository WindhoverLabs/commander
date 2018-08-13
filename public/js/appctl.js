/* Collection of application modules to control and orchestrate UI
   Following are the contents of this page -
   Directory Listing
   Golden Layout
   Modal
   Side menu
   ToolTips
   Resize */

/* Directory Listing */
/* Workspace folders and files should be stored like the following structure */
function fakeDirData(id){
  let testData = [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    }
  ];
  let testNode =   {
      "icon": "fa fa-file",
      "path": "/flow",
      "text": "flow1",
      "size": 4096,
      "mtime": "2018-08-09T15:30:50.247Z",
      "type": "file",
      "url": "view/apps/flow",
      "selectable":true,
      "checkable":false,
      "ext": "/apps/flow",
      "path": "testpage1"
    }
  let testNode1 =   {
      "icon": "fa fa-file",
      "path": "/flow",
      "text": "flow1",
      "size": 4096,
      "mtime": "2018-08-09T15:30:50.247Z",
      "type": "file",
      "url": "view/apps/flow",
      "selectable":true,
      "checkable":false,
      "ext": "/apps/flow",
      "path": "testpage1"
    }
  let testNode2 =   {
      "icon": "fa fa-file",
      "path": "/flow",
      "text": "flow2",
      "size": 4096,
      "mtime": "2018-08-09T15:30:50.247Z",
      "type": "file",
      "url": "view/apps/flow",
      "selectable":true,
      "checkable":false,
      "ext": "/apps/flow",
      "path": "testpage2"
    }
  let result = undefined;
  switch(id){
    case 1:
      result = testData;
      break;
    case 2:
      result = [testNode1,testNode2];
      break;
    case 3:
      result = [testNode];
      break;
    default:
      result = [testNode];
  }
  return result;
}
/* Lazy load */
function onLazyLoad(node, display){
  let a;
  if(node.text==="apps"){
    a = fakeDirData(2);
  }
  else{
    a = fakeDirData(3);
  }
  let tree = $('#menuContainer').treeview(true)
  tree.addNode(a,node,node.index,{ silent: true} );
  tree.expandNode(node,{ silent: true, ignoreChildren: true } );
}
/* This function is triggered when a new node is rendered */
function NodeRendered(e, node){
  if(node.type ==="file"){
    let newItemConfig = {
      id: node.id,
      title: node.text,
      type: 'component',
      componentName: 'Blank',
      componentState: { text: "text" , link: node.path}
    };
    myLayout.createDragSource( node.$el, newItemConfig );
    console.log(node.$el);
  }
}
/* This function is triggered when a selectable node is selected */
function NodeSelected(e, node){
  if(node.type ==="file"){
    let newItemConfig = {
      id: node.id,
      title: node.text,
      type: 'component',
      componentName: 'Blank',
      componentState: { text: "text" , link: node.path}
    };
    if( myLayout.selectedItem === null ) {
      alert( 'Container not selected. Choose any container to load component.' );
    } else {
      myLayout.selectedItem.addChild( newItemConfig );
    }
  }
}
/* This function initializes directory tree */
function InitTreeView(){
  $('#menuContainer').treeview({
      data: fakeDirData(1),
      levels:1,
      backColor: '#343a40',//grey
      wrapNodeText:true,
      collapseIcon: 'fa fa-minus',
      expandIcon: 'fa fa-plus',
      lazyLoad: onLazyLoad,
      onNodeRendered : NodeRendered,
      onNodeSelected: NodeSelected,
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
    },
    {
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
  mlyt.registerComponent( 'Blank', function( container, state ){

    if( state.link ) {
      container.getElement().load( "/"+state.link);
    }
    else{
      container.getElement().html( '<h2>'+state.text+'</h2>' );
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

    if(item.type=="component")
    {
      if(item.hasOwnProperty("config"))
      {
        let link = undefined;
        let id = undefined;
        if(item.config.hasOwnProperty("id"))
        {
          id = item.config.id;
        }
        if(item.config.hasOwnProperty("componentState"))
        {
          if(item.config.componentState.hasOwnProperty("link"))
          {
            link = item.config.componentState.link;
          }
        }
        if(id!=undefined && link!=undefined)
        {
          item.container._contentElement.load("/"+link);
          item.container._contentElement.css("overflow","auto");
        }
      }
    }
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
function GetStoredLayoutList(){
  list = [];
  for (let key in localStorage){
    if(key.search('LAYOUT_')!=-1){
      list.push(key)
    }
  }
  return list;
}
/* Load Layout */
function LoadLayout(){
  /* if a layout exists, destroy it */
  myLayout.destroy()
  /* retrieve and load saved layout */
  let formVal = $("[id='select0']").val();
  let key = GetStoredLayoutList()[formVal];
  let savedState = localStorage.getItem( key );
  if( savedState !== null ) {
    myLayout = new window.GoldenLayout( JSON.parse( savedState ), $('#layoutContainer') );
    InitLayout(myLayout);
  }
  else{
    console.log("Layout cannot be loaded.")
  }
}

/* Modal */
/* Initialize modal functionality*/
function InitModal(){
  /* show */
  $("#genericInputModal").on('show.bs.modal',(e) => {
      let btn = $(e.relatedTarget);
      console.log(btn)
      let title = btn.data('title');
      let submit = btn.data('submit');
      let custom = btn.data('custom');
      let item = "";
      let inputsIds = []
      /* set title */
      $('#modalTitle').text(title);

      /* set custom data */
      for(let e in custom){
        switch(custom[e].type){
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
/* side menu state declare */
var menuOpen = false;
/*Initialize menu state change functionality*/
function InitMenuState(){
  $("#menuToggle").click(()=>{
    if(!menuOpen){
      $("#menuContainer").animate({left: "0%"});
      $("#menuToggle").addClass("active");
      menuOpen = true;
    }
    else{
      $("#menuContainer").animate({left: "-20%"});
      $("#menuToggle").removeClass("active");
      menuOpen = false;
    }
  });
}

/* ToolTips */
function InitToolTips(){
  $('[data-toggle="tooltip"]').tooltip();
}

/* Resize */
function InitResizeCtl(){
  $(window).resize(() => {
      console.log("resize-event");
      myLayout.updateSize();
  })
}

/* appctl main - this script execution starts from here */
$(()=>{
  myLayout = new window.GoldenLayout( config, $('#layoutContainer'));
  InitTreeView();
  InitLayout(myLayout);
  InitModal();
  InitMenuState();
  InitToolTips();
  InitResizeCtl();
});
