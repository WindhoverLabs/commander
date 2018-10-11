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
var llc = new CustomEvent('layout-load-complete');

/* This function is triggered when a new node is rendered */
function NodeRendered(e, node) {
  if (node.type === "file") {
    let newItemConfig = {
      id: node.id,
      title: node.text,
      type: 'component',
      componentName: 'Blank',
      componentState: {
        text: "text",
        link: node.urlPath
      }
    };

    myLayout.createDragSource(node.$el[0], newItemConfig);
  }
}

/* This function is triggered when a selectable node is selected */
function NodeSelected(e, node) {
  if (node.type === 'file') {
    let newItemConfig = {
      id: node.id,
      title: node.text,
      type: 'component',
      componentName: 'Blank',
      componentState: {
        text: 'text',
        link: node.urlPath
      }
    };

    if (myLayout.selectedItem === null) {
      alert('Container not selected. Choose any container to load component.');
    } else {
      myLayout.selectedItem.addChild(newItemConfig);
    }
  } else if (node.type === 'config') {
    $.get(node.urlPath, (response) => {
      var jsonObj = JSON.parse(response);
      if (response !== null) {
        myLayout.destroy();
        myLayout = new window.GoldenLayout(jsonObj, $('#cdr-layout-container'));
        window.dispatchEvent(llc);
        InitLayout(myLayout);
      } else {
        cu.logError('Layout | cannot be loaded from config file')
      }
    });
  }
}

/* Collapse all items in menu */
function NodesCollapse(item) {
  $("#cdr-" + item + "-menu-container").treeview('collapseAll', {
    silent: true
  });
}

/* Widget node initialization logic */
function WidgetNodeRendered(e, node) {
  let element = node.$el;
  element.attr("data-toggle", "modal");
  element.attr("data-target", "#genericInputModal");
  element.attr("data-title", node.text);
  element.attr("data-submit", "CreateIndicator");
  element.attr("data-custom", '[{"label":"Indicator Name", "type":"field" },{"label":"Data Path", "type":"field" }, {"label":"Fontawesome Icon", "type":"field" }]');
  let clickFunction = element.onclick;
}


/* Golden Layout */
/* A layout is defined by its configuration as shown below */
/* Initial configuration */
var _config = {
  settings: {
    selectionEnabled: true,
    showPopoutIcon: false,
  },
  content: [{
    type: 'row',
    content: [{
      type: 'component',
      componentName: 'Blank',
      componentState: {
        text: 'Free Component A'
      }
    }, {
      type: 'component',
      componentName: 'Blank',
      componentState: {
        text: 'Free Component B'
      }
    }]
  }]
};

/* Declare Layout */
var myLayout;
/* Initalize layout */
function InitLayout(mlyt) {
  /* Register Component in layout */
  mlyt.registerComponent('Blank', function(container, state) {
    if (state.link) {
      container.getElement().load( state.link);
    } else {
      container.getElement().html('<h2>' + state.text + '</h2>');
    }

    $(window).on("LayoutSaved", () => {
      container.extendState({
        link: container._config.componentState.link
      });
    });

  });

  /* Initalize layout */
  mlyt.init();

  /* This event is fired when a component is created, which renders selected page onto created component */
  mlyt.on("itemCreated", (item) => {
    if (item.type == "component") {
      var link = undefined;

      if (item.config.hasOwnProperty("componentState")) {
        if (item.config.componentState.hasOwnProperty("link")) {
          link = item.config.componentState.link;
        }
      }

      if (link != undefined) {
        item.container._contentElement.load(link);
        item.container._contentElement.css("overflow", "auto");
      }

    }
  });

  mlyt.on('stackCreated', (item) => {

    /* TODO:  This is where we need to add code to bind the telemetry
     *   and commands to the server.
     */
  });

  mlyt.on("stateChanged", function() {
    InitScrollBar();
  });
}

/* Save Layout to browser's local storage */
function SaveLayout() {
  /* now save the state */
  let form = $("[id='inputField0']");
  let name = "";
  if (form.val() != "") {
    name = form.val();
    name = name.replace(/ /g, '_');
  }
  /* stringify state config */
  let state = JSON.stringify(myLayout.toConfig());
  var blob = new Blob([state], {
    type: "text/json;charset=utf-8"
  });
  saveAs(blob, name + '.lyt');
  cu.logInfo('Layout | saved layout as', name);
}


/* Load Layout */
function LoadLayout() {
  var files = document.getElementById('browse0').files;
  var reader = new FileReader();
  reader.onload = (function(theFile) {
    return function(e) {
      try {
        savedState = JSON.parse(e.target.result);
        if (savedState !== null) {
          myLayout.destroy()
          myLayout = new window.GoldenLayout(savedState, $('#cdr-layout-container'));
          window.dispatchEvent(llc);
          InitLayout(myLayout);
          cu.logInfo('Layout | loaded from local drive')
        } else {
          cu.logError('Layout | could not be loaded')
        }
      } catch (ex) {
        cu.logError('Layout | exception in reading file ' + ex);
      }
    }
  })(files[0]);
  reader.readAsText(files[0]);
}

/* Modal */
/* Initialize modal functionality*/
function InitModal() {
  /* Make it draggable*/
  $(".modal-content").draggable({
    containment: "document"
  });

  /* show */
  $("#genericInputModal").on('show.bs.modal', (e) => {
    // HideMenu('widget');
    if (e.hasOwnProperty('relatedTarget')) {
      let btn = $(e.relatedTarget);
      let title = btn.data('title');
      let submit = btn.data('submit');
      let custom = btn.data('custom');
      let info = btn.data('cdr');
      $("#genericInputModal").attr('data-info', JSON.stringify(info));
      let item = "";

      /* set title */
      $('#modalTitle').text(title);

      /* set custom data */
      for (let e in custom) {
        if(custom[e].value == undefined) {
          switch (custom[e].type) {
            case "field":
              item = "<div class='form-group'>" +
                "<label class='col-form-label' id=labelField" + e + " for=inputField" + e + ">" + custom[e].label + "</label>"
              if (custom[e].dtype == 'integer') {
                item += "<input class='form-control' type='number' value='0' id=inputField" + e + ">"
              } else if (custom[e].dtype == 'float') {
                item += "<input class='form-control' type='number' value='0.0' step='0.001' id=inputField" + e + ">"
              } else if (custom[e].dtype == 'text') {
                item += "<input class='form-control' type='text' value='enter value' id=inputField" + e + ">"
              }
              item += "</div>"
              $('#modalForm').append(item);
              break;
            case "select":
              item = "<div class='form-group'>" +
                "<label class='col-form-label' id=labelField" + e + " for=select" + e + ">" + custom[e].label + "</label>" +
                "<select class='custom-select mr-sm-2'id=select" + e + ">" +
                "<option selected>Choose..</option>" +
                "</select>" +
                "</div>"
              $('#modalForm').append(item)
              // inputsIds.push("select"+e)
              let options = null
              if (typeof custom[e].getItem == 'string') {
                options = window[custom[e].getItem].call()
              } else if (typeof custom[e].getItem == 'object') {
                options = custom[e].getItem
              }
              cu.logDebug("Modal | ", custom[e]);
              options.forEach((sel) => {
                let html = "<option value=" + sel.value + ">" + sel.label + "</option>"
                $('#select' + e).append(html)
              });
              break;
            case "browse":
              item = "<div class='form-group'>" +
                "<label class='col-form-label' id=labelField" + e + " for=browse" + e + ">" + custom[e].label + "</label>" +
                "<input type='file' class='form-control-file' id='browse" + e + "'>" +
                "</div>"
              $('#modalForm').append(item)
              break;
            default:
              cu.logDebug("Modal | Unknown data passed as attribute");
          }
        }
        else {
          item = "<div class='form-group disappear'><label class='col-form-label' id=labelField" + e + " for=inputField" + e + ">" + custom[e].label + "</label>"
          item += "<input class='form-control' type='text' value="+custom[e].value+" id=inputField" + e + ">"
          item += "</div>"
          $('#modalForm').append(item);
        }
      }

      /* set submit action */
      $('#modalSubmit')[0].onclick = window[submit];

    }
  });

  /* hide */
  $("#genericInputModal").on('hidden.bs.modal', (e) => {
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
function ShowMenu(item) {
  $("#cdr-" + item + "-menu-container").addClass("menuShow");
  $("#cdr-" + item + "-menu-toggle").addClass("active");
  $("#cdr-" + item + "-menu-container").data("open", true);
}

function HideMenu(item) {
  $("#cdr-" + item + "-menu-container").removeClass("menuShow");
  $("#cdr-" + item + "-menu-toggle").removeClass("active");
  $("#cdr-" + item + "-menu-container").data("open", false);
  // NodesCollapse(item);
}

function InitMenuState() {
  $("#cdr-panel-menu-toggle").click(() => {

    let open = $("#cdr-panel-menu-container").data("open");
    if (!open) {
      HideMenu("layout");
      ShowMenu("panel");
    } else {
      HideMenu("panel");
    }
  });

  $("#cdr-layout-menu-toggle").click(() => {
    let open = $("#cdr-layout-menu-container").data("open");
    if (!open) {
      HideMenu("panel");
      ShowMenu("layout");
    } else {
      HideMenu("layout");
    }
  });
}

/* ToolTips */
function InitToolTips() {
  $('[data-toggle="tooltip"]').tooltip({
    "container": "false"
  });

  $('[data-toggle="tooltip"]').on('show.bs.tooltip', function(e) {
    $("#tooltips").text(e.target.dataset.originalTitle);
  });

  $('[data-toggle="tooltip"]').on('hide.bs.tooltip', function(e) {
    $("#tooltips").text("ToolTips");
  });
}

/* Scrollbar */
function InitScrollBar() {
  /* os-theme-dark class should be added to every pug file in the top element */
  setTimeout(function() {
    $('.os-theme-dark').overlayScrollbars({
      "autoUpdate": true
    });
  }, 10);

  setTimeout(function() {
    $('.os-theme-dark').overlayScrollbars({
      "autoUpdate": true
    });
  }, 100);
  setTimeout(function() {
    $('.os-theme-dark').overlayScrollbars({
      "autoUpdate": true
    });
  }, 250);
  setTimeout(function() {
    $('.os-theme-dark').overlayScrollbars({
      "autoUpdate": true
    });
  }, 500);

  setTimeout(function() {
    $('.os-theme-dark').overlayScrollbars({
      "autoUpdate": true
    });
  }, 1000);
}

/* Resize */
function InitResizeCtl() {
  $(window).resize(() => {
    cu.logDebug('Layout | resize event occured');
    myLayout.updateSize();
  })
}

/* Draggable */
function InitDraggable() {
  cu.logDebug('InitDraggable');
  $("#topSnapable").sortable({
    revert: true
  });
}

/* Widget Generation */
var _IndicatorCount = 0;

function CreateIndicator() {
  if (IndicatorCount < 8) {
    IndicatorCount += 1;
    let name = $("[id='inputField0']");
    let data = $("[id='inputField1']");
    let icon = $("[id='inputField2']");
    $("#topSnapable").append(
      "<li class='nav-item indicator-draggable'>" +
      "<span class='indicator-name'>" + name.val() + "</span>" +
      "<span class='badge badge-info indicator-val' data-sage=" + data.val() + ">-</span>" +
      "<span class='badge badge-light indicator-close' onclick='IndicatorCloseClick.call(this)'>x</span>" +
      "</li>"
    );
    InitDraggable();
  } else {
    cu.logDebug("Nav real estate - full, sell plots");
  }
}

function IndicatorCloseClick() {
  this.parentNode.remove();
  IndicatorCount -= 1;
}



function UpdateLayoutNode(node, display) {
    session.getLayouts(node.path, function (dirEntries) {
        var layoutEntries = [];

        for(var entryID in dirEntries) {
            var dirEntry = dirEntries[entryID];

            var layoutEntry = {
                name: '/' + entryID,
                text: dirEntry.shortDescription,
                path: node.path + '/' + entryID,
                urlPath: node.path + '/' + entryID,
                //type: dirEntry.type,
                //ext: dirEntry.type,
                //lazyLoad: true,
                //ext: dirEntries[i].path,
                selectable: true,
                checkable: false
            };

	      if (dirEntry.hasOwnProperty('nodes')) {
		layoutEntry.lazyLoad = true;
		layoutEntry.selectable = false;
	      } else {
		layoutEntry.lazyLoad = false;
		layoutEntry.selectable = true;
		layoutEntry.type = 'config';
		layoutEntry.url = dirEntry.urlPath;
	      }

            layoutEntries.push(layoutEntry);
        }

        var tree = $('#cdr-layout-menu-container').treeview(true)
        tree.addNode(layoutEntries, node, node.index, { silent: true} );
        tree.expandNode(node, { silent: true, ignoreChildren: true } );
  });
}

function UpdatePanelNode(node, display) {
    session.getPanels(node.path, function (dirEntries) {
        var panelEntries = [];

        for(var entryID in dirEntries) {
            var dirEntry = dirEntries[entryID];

            var panelEntry = {
                name: '/' + entryID,
                text: dirEntry.shortDescription,
                path: node.path + '/' + entryID,
                urlPath: node.path + '/' + entryID,
                //type: dirEntry.type,
                //ext: dirEntry.type,
                //lazyLoad: true,
                //ext: dirEntries[i].path,
                selectable: true,
                checkable: false
            };

            if(dirEntry.hasOwnProperty('nodes')) {
                panelEntry.lazyLoad = true;
                panelEntry.selectable = false;
            } else {
                panelEntry.icon = 'fa fa-file';
                panelEntry.lazyLoad = false;
                panelEntry.selectable = true;
                panelEntry.type = 'file';
                panelEntry.url = node.path + '/' + entryID
            }

      panelEntries.push(panelEntry);
    }

    var tree = $('#cdr-panel-menu-container').treeview(true)
    tree.addNode(panelEntries, node, node.index, {
      silent: true
    });
    tree.expandNode(node, {
      silent: true,
      ignoreChildren: true
    });
  });
}


/* Side bar */
var sidebar_open = false;

function InitSidebar() {

  $("#cdr-app-menu-toggle").on("click", () => {
    if (sidebar_open) {
      $("#cdr-app-menu").css("transform", "translateX(-100%)")
      $("#cdr-layout-container").css("margin-left", "0%")
      $("#cdr-layout-container").css("width", "100%")
      myLayout.updateSize();
      sidebar_open = false;
      $("#cdr-panel-layout-switch").css("display", "none");
    } else {
      $("#cdr-app-menu").css("transform", "translateX(0%)")
      $("#cdr-layout-container").css("margin-left", "250px")
      $("#cdr-layout-container").css("width", "calc(100% - 250px)")
      $("#cdr-panel-layout-switch").css("display", "flex");
      myLayout.updateSize();
      sidebar_open = true;
    }


  });
}

var _session;
var _sescon_never = true; /* flag to indicate that session was never connected atleast once */

/* appctl main - this script execution starts from here */
$(() => {
  session = new CommanderClient();

  var config = {
    settings: {
      selectionEnabled: true,
      showPopoutIcon: false
    },
    content: [{
      type: 'row',
      content: [{
          type: 'component',
          componentName: 'Blank',
          componentState: {
            text: 'Component 1'
          }
        },
        {
          type: 'component',
          componentName: 'Blank',
          componentState: {
            text: 'Component 2'
          }
        }
      ]
    }]
  }

  session.on('connect', function() {

    cu.logInfo('Connection | session connected');
    if (_sescon_never) {
      session.getPanels('/', function(dirEntries) {
      var panelEntries = [];

      for(var entryID in dirEntries) {
          var entry = {
              name: '/' + entryID,
              text: dirEntries[entryID].shortDescription,
              path: '/' + entryID,
              urlPath: '/' + entryID,
              type: dirEntries[entryID].type,
              lazyLoad: true,
              ext: entryID,
              selectable: false,
              checkable: false
          };

          panelEntries.push(entry);
        }

        $('#cdr-panel-menu-container').treeview({
          data: panelEntries,
          levels: 1,
          backColor: '#343a40', //grey
          selectedBackColor: "#fff",
          selectedColor: "#343a40",
          onhoverColor: "#fff",
          wrapNodeText: true,
          collapseIcon: 'fa fa-minus',
          expandIcon: 'fa fa-plus',
          showBorder: false,
          lazyLoad: UpdatePanelNode,
          onNodeRendered: NodeRendered,
          onNodeSelected: NodeSelected,
        });
      });
      session.getLayouts('/', function(dirEntries) {
	      var entries = [];

	      for(var entryID in dirEntries) {
		  var entry = {
		      name: '/' + entryID,
		      text: dirEntries[entryID].shortDescription,
		      path: '/' + entryID,
		      urlPath: '/' + entryID,
		      type: dirEntries[entryID].type,
		      lazyLoad: true,
		      ext: entryID,
		      selectable: false,
		      checkable: false
		  };

		  entries.push(entry);
        }

        $('#cdr-layout-menu-container').treeview({
          data: entries,
          levels: 1,
          backColor: '#343a40', //grey
          selectedBackColor: "#fff",
          selectedColor: "#343a40",
          onhoverColor: "#fff",
          wrapNodeText: true,
          collapseIcon: 'fa fa-minus',
          expandIcon: 'fa fa-plus',
          showBorder: false,
          lazyLoad: UpdateLayoutNode,
          onNodeRendered: NodeRendered,
          onNodeSelected: NodeSelected,
        });
      });

      /* Load a landing page layout for the first time */
      myLayout = new window.GoldenLayout(config, $('#cdr-layout-container'));
      InitLayout(myLayout);
      window.dispatchEvent(llc);
      _sescon_never = false;

      InitModal();
      InitMenuState();
      //InitToolTips();
      //InitPopover();
      InitScrollBar();
      InitResizeCtl();
      InitSidebar();

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
    }

  });
});
