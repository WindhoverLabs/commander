/* Collection of utitlites witch orchestrate UI in commander
   Following are the contents of this page -
   Directory Listing */

/* Directory Listing */

/* Workspace folders and files should be stored like the following structure */
var testData = [
  {
    "path": "/apps",
    "text": "apps",
    "size": 4096,
    "mtime": "2018-08-09T15:30:50.247Z",
    "type": "dir",
    "url": "view/apps",
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
    "nodes":[
      {
          "icon": "fa fa-file",
          "path": "/flow",
          "text": "flow",
          "size": 4096,
          "mtime": "2018-08-09T15:30:50.247Z",
          "type": "dir",
          "url": "view/apps/flow",
          "selectable":false,
          "checkable":false,
          "ext": "/apps/flow"
        },
        {
            "icon": "fa fa-file",
            "path": "/flow",
            "text": "flow",
            "size": 4096,
            "mtime": "2018-08-09T15:30:50.247Z",
            "type": "dir",
            "url": "view/apps/flow",
            "selectable":false,
            "checkable":false,
            "ext": "/apps/flow"
          }
    ]
  }
];
var testNode =   {
    "icon": "fa fa-file",
    "path": "/flow",
    "text": "flow",
    "size": 4096,
    "mtime": "2018-08-09T15:30:50.247Z",
    "type": "dir",
    "url": "view/apps/flow",
    "selectable":false,
    "checkable":false,
    "ext": "/apps/flow"
  }
/* Load data and create navigation tree */
var onTreeNodeSelected = function (e, node) {
	console.log("onTreeNodeSelected")
  var tree = $('#menuContainer').treeview(true)
	tree.expandNode(node)
}
var onTreeNodeExpanded = function (e, node) {
	console.log("onTreeNodeExpanded")
  var tree = $('#menuContainer').treeview(true)
  var expanded = tree.getExpanded()
  console.log(" expanded count is " + expanded.length)
}
function InitTreeView(){
  $('#menuContainer').treeview({
      data: testData,
      levels:2,
      backColor: '#343a40',//grey
      collapseIcon: 'fa fa-minus',
      expandIcon: 'fa fa-plus',
      highlightSelected: true,
      onNodeSelected: onTreeNodeSelected,
      onNodeExpanded: onTreeNodeExpanded
    });
}
/* clean up navigation tree */
function CleanupTreeView(){
}
/* Update data and navigation tree */
function UpdateTreeView(){

}
/* Actions for events in navigation tree */
function EventsTreeview(){
  $('#menuContainer').on('nodeExpanded',function(event,data){
      let tree = $('#menuContainer').treeview(true);
      tree.addNode(nodes=[testNode],tree.getSelected())
      console.log(tree);
      console.log(data);
    }
  );
}


function GetStoredLayoutList(){
  list = [];
  for (var key in localStorage){
    if(key.search('LAYOUT_')!=-1){
      list.push(key)
    }
  }
  return list;
}

/* Util main - this script execution starts from here */
$(()=>{
  InitTreeView();
  EventsTreeview();

});
