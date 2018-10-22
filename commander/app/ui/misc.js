'use strict';

/**
 * Sidebar visibitly status indicator, currenty not open
 * @type {Boolean}
 */
var _sidebar_open = false;

/**
 * Add the ability to toggle sidebar to menu toggle button
 * using transform for animation
 * @constructor
 */
function InitSidebar() {
  $("#cdr-app-menu-toggle").on("click", () => {
    if (_sidebar_open) {
      $("#cdr-app-menu").css("transform", "translateX(-100%)")
      $("#cdr-layout-container").css("margin-left", "0%")
      $("#cdr-layout-container").css("width", "100%")
      myLayout.updateSize();
      _sidebar_open = false;
      $("#cdr-panel-layout-switch").css("display", "none");
    } else {
      $("#cdr-app-menu").css("transform", "translateX(0%)")
      $("#cdr-layout-container").css("margin-left", "250px")
      $("#cdr-layout-container").css("width", "calc(100% - 250px)")
      $("#cdr-panel-layout-switch").css("display", "flex");
      myLayout.updateSize();
      _sidebar_open = true;
    }
  });
}
/**
 * There are two menus one for layouts and one for panels this function with
 * correct parameter will enables the menu
 * @param       {String} item [description]
 * @constructor
 */
function ShowMenu(item) {
  $("#cdr-" + item + "-menu-container").addClass("menuShow");
  $("#cdr-" + item + "-menu-toggle").addClass("active");
  $("#cdr-" + item + "-menu-container").data("open", true);
}
 /**
  * There are two menus one for layouts and one for panels this function with
  * correct parameter will disable or hide menu
  * @param       {String} item item
  * @constructor
  */
function HideMenu(item) {
  $("#cdr-" + item + "-menu-container").removeClass("menuShow");
  $("#cdr-" + item + "-menu-toggle").removeClass("active");
  $("#cdr-" + item + "-menu-container").data("open", false);
  // NodesCollapse(item);
}
/**
 * Control for toggler to switch between panel and layout
 * @constructor
 */
function InitMenuState() {
  /* clicked on panels, display panel menu hide all others */
  $("#cdr-panel-menu-toggle").click(() => {
    var open = $("#cdr-panel-menu-container").data("open");
    if (!open) {
      HideMenu("layout");
      ShowMenu("panel");
    } else {
      HideMenu("panel");
    }
  });
  /* clicked on layouts, display layout menu hide all others */
  $("#cdr-layout-menu-toggle").click(() => {
    var open = $("#cdr-layout-menu-container").data("open");
    if (!open) {
      HideMenu("panel");
      ShowMenu("layout");
    } else {
      HideMenu("layout");
    }
  });
}
/**
 * Builds context menus and tooltips embedded in context menus
 * @param  {Object} node  node
 * @param  {Object} JQObj JQuery object
 */
function navBarTooltips(node, JQObj) {
  try {
    if (node.type == 'file') {
      /* node is a file, options to open the file or show info
       * on the file */
      node.$el.contextMenu({
        selector: '*',
        items: {
          'open': {
            name: 'Open',
            callback: function(itemKey, opt, e) {
              /* Do click */
              opt.$trigger.click()
            }
          },
          'showInfo': {
            name: 'Show Info',
            items: {
              'info': {
                type: 'html',
                html: '<div class="cdr-tooltip-container">' +
                  '<div class="cdr-tooltip-row"> Description : <span>' + node.longDescription +
                  '</span></div>' +
                  '<div class="cdr-tooltip-row"> Path : <span>' + node.urlPath +
                  '</div>' +
                  '</div>'
              }
            },
          }
        }
      });
    }
    else if (node.type == 'config') {
      /* node is a config or .lyt or layout file, options to open in
       * current and new window and show info */
      node.$el.contextMenu({
        selector: '*',
        items: {
          'open': {
            name: 'Open',
            callback: function(itemKey, opt, e) {
              /* Do click */
              opt.$trigger.click()
            }
          },
          'openNewWindow': {
            name: 'Open in new window',
            callback: function(itemKey, opt, e) {
              if (node.type == 'config') {
                $.get(node.urlPath, (response) => {
                  var jsonObj = JSON.parse(response);
                  var newWindow = window.open(window.location.href);
                  var theDoc = newWindow.document;
                  var theScript = document.createElement('script');

                  function injectThis(x) {
                    setTimeout(() => {
                      window.myLayout.destroy();
                      window.myLayout = new window.GoldenLayout(x, $('#cdr-layout-container'));
                      window.dispatchEvent(llc);
                      window.InitLayout(myLayout);
                    }, 2000)

                  }
                  theScript.innerHTML = '(' + injectThis.toString() + '(' + response + '));';
                  newWindow.onload = function() {
                    // Append the script to the new window's body.
                    // Only seems to work with `this`
                    this.document.body.appendChild(theScript);
                  };

                });
              }
            }
          },
          'showInfo': {
            name: 'Show Info',
            items: {
              'info': {
                type: 'html',
                html: '<div class="cdr-tooltip-container">' +
                  '<div class="cdr-tooltip-row"> Description : <span>' + node.longDescription +
                  '</span></div>' +
                  '<div class="cdr-tooltip-row"> Path : <span>' + node.urlPath +
                  '</div>' +
                  '</div>'
              }
            },
          }
        }
      });
    }
    else {
      /* usually a directory, has a open wich acts just like a click and
       * show info, shows tooltip info */
      node.$el.contextMenu({
        selector: '*',
        items: {
          'open': {
            name: 'Open',
            callback: function(itemKey, opt, e) {
              /* Do click */
              opt.$trigger.click()
            }
          },
          'showInfo': {
            name: 'Show Info',
            items: {
              'info': {
                type: 'html',
                html: '<div class="cdr-tooltip-container">' +
                  '<div class="cdr-tooltip-row"> Description : <span>' + node.longDescription +
                  '</span></div>' +
                  '<div class="cdr-tooltip-row"> Path : <span>' + node.urlPath +
                  '</div>' +
                  '</div>'
              }
            },
          }
        }
      });
    }
  } catch (e) {
    cu.logError('navBarTooltips | unable to render tool tips for node : ', JSON.stringify(node))
  }
}
/**
 * Adds tooltips to genral elements with no special requirements
 * @constructor
 */
function InitToolTips() {
  var options = {
    container: 'body',
    delay: {
      'show': 500,
      'hide': 100
    },
    trigger: 'hover',
    placement: 'auto',
    boundary: 'window',
  }
  $('[data-tooltip="true"]').tooltip(options);
}
 /**
  * Adds scrollbar to general elements with no special requirements
  * @constructor
  */
function InitScrollBar() {
  var applyScrollTo = [
    '.os-theme-dark',
    '#cdr-app-menu'
  ]
  /* os-theme-dark class should be added to every pug file in the top element */
  setTimeout(function() {
    $(applyScrollTo.join(',')).overlayScrollbars({
      "autoUpdate": true
    });
  }, 10);
  setTimeout(function() {
    $(applyScrollTo.join(',')).overlayScrollbars({
      "autoUpdate": true
    });
  }, 100);
  setTimeout(function() {
    $(applyScrollTo.join(',')).overlayScrollbars({
      "autoUpdate": true
    });
  }, 250);
  setTimeout(function() {
    $(applyScrollTo.join(',')).overlayScrollbars({
      "autoUpdate": true
    });
  }, 500);
  setTimeout(function() {
    $(applyScrollTo.join(',')).overlayScrollbars({
      "autoUpdate": true
    });
  }, 1000);
}
/**
 * Resize events can be handled here
 * @constructor
 */
function InitResizeCtl() {
  $(window).resize(() => {
    cu.logDebug('Layout | resize event occured');
    myLayout.updateSize();
  })
}
