/* Application Data*/
var subscriptions = {};
var dataplot_subscriptions = {};


/* Process Telemetry and commanding */

function processTelemetryUpdate(param) {
  var sample = param.sample[param.sample.length - 1];
  var value = sample.value;
  var opsPath = param.opsPath;
  if (opsPath in subscriptions) {
    var opsPathDef = undefined;
    if (subscriptions[opsPath].hasOwnProperty('def')) {
      opsPathDef = subscriptions[opsPath].def;
    }
    for (var i = 0; i < subscriptions[opsPath].elms.length; ++i) {
      var nodeElm = subscriptions[opsPath].elms[i];
      var reqObj = cu.parseJSON(nodeElm.getAttribute('data-cdr'));
      var indicatorFormat = reqObj.indicator;
      cu.assert(indicatorFormat != undefined, 'Process TLM | indicator format is not found');
      if (indicatorFormat == 'text') {
        if (opsPathDef != undefined) {
          switch (opsPathDef.dataType) {
            case 'char':
            case 'string':
            case 'int8':
            case 'uint8':
            case 'int16':
            case 'uint16':
            case 'int32':
            case 'uint32':
            case 'int64':
            case 'uint64':
              {
                nodeElm.textContent = value;
                break;
              }
            case 'double':
            case 'float':
              {
                nodeElm.textContent = value.toFixed(3);
                break;
              }
            case 'boolean':
              {
                nodeElm.textContent = '';
                if (value) {
                  nodeElm.setAttribute('class', 'led-basic led-on')
                } else {
                  nodeElm.setAttribute('class', 'led-basic led-off')
                }
                break;
              }
          }
        }
      } else if (indicatorFormat == 'dataplot') {
        /* Handle dataplot subscriptions */
        if (nodeElm.getAttribute('plot-initialized') === undefined ||
          nodeElm.getAttribute('plot-initialized') === null ||
          nodeElm.getAttribute('plot-initialized') === false) {
          /* Upon seeing dataplot canvas we initialize canvas after
          which will keep adding data to initialized canvas */
          var tlmObj = cu.parseJSON(nodeElm.getAttribute('data-cdr'));

          var dataPlotDef = {};
          dataPlotDef['data'] = [];
          dataPlotDef['options'] = {};

          if (tlmObj.hasOwnProperty('tlm')) {

            cu.assert(tlmObj.hasOwnProperty('label'), 'Process TLM | label array doesnot exist');
            cu.assert(tlmObj.tlm.length === tlmObj.label.length, 'Process TLM | tlm and labels arrays have different lengths');
            cu.assert(tlmObj.tlm.length > 0 && tlmObj.label.length > 0, 'Process TLM | tlm and label arrays are empty');

            var colorArr = []
            if (!(tlmObj.hasOwnProperty('color') &&
                cu.isArray(tlmObj.color) &&
                tlmObj.color.length == tlmObj.tlm.length)) {
              for (var c = 0; c < tlmObj.tlm.length; ++c) {
                var clr = cu.makeColor();
                colorArr.push(clr);
              }
            } else {
              colorArr = tlmObj.color;
            }

            for (var i = 0; i < tlmObj.tlm.length; i++) {

              dataPlotDef['data'].push({
                'tlm': {
                  name: tlmObj.tlm[i].name
                },
                'label': tlmObj.label[i],
                'color': colorArr[i]
              });

            }

            var generatedKey = cu.makeKey();
            nodeElm.setAttribute('plot-key', generatedKey);
            dataplot_subscriptions[generatedKey] = new CmdrTimeSeriesDataplot(nodeElm, dataPlotDef, param)
          }
          nodeElm.setAttribute('plot-initialized', true);
        } else {
          dataplot_subscriptions[nodeElm.getAttribute('plot-key')].addData(param);
        }

      }
    }
  }
}

function processTelemetryDefinitionUpdate(opsPaths) {
  opsPaths.forEach((path) => {
    var def = subscriptions[path].def;
    var elms = subscriptions[path].elms
    /* Check elms if it has atlest 1 elm to apply update */
    if (elms != undefined && def != undefined) {
      elms.forEach((e) => {
        /* TODO: Add tool tip functionality here */
      });
    }
  });
}

function isTemplateCommand(commandInfo) {
  var found = false;
  if (commandInfo.hasOwnProperty('argument')) {
    if (commandInfo.argument.length > 0) {
      /* Look for at least 1 unspecified value. */
      for (i = 0; i < commandInfo.argument.length; i++) {
        if (!commandInfo.argument[i].hasOwnProperty('value')) {
          found = true;
        }
      }
    }
  }
  return found;
}

function sendCmd() {
  var args = {};
  var labels = $("#genericInputModal").find('label');
  for (var i = 0; i < labels.length; ++i) {
    var label = labels[i].textContent;
    var value = labels[i].control.value;
    args[label] = value;
  }
  var cmdObj = JSON.parse($("#genericInputModal").attr('data-info'));
  session.sendCommand({
    ops_path: cmdObj.cmd.name,
    args: args
  })
}



class Panel {

  constructor(panelElm) {

    this.panelElm = panelElm;
    this.title = 'Unknown'
    this.loadTimeout = 500; /* ms */
    this.tlm = [];
    this.panelElm['instantiated'] = true;

  }

  subscribeText(d, s) {
    /* check d has telemetry request info */
    if (d.hasOwnProperty('tlm')) {
      /* Map each tlm item to respective DOM objects, it manipulates */
      for (var i = 0; i < d.tlm.length; ++i) {
        var obj = d.tlm[i];
        /* Check if record exists */
        if (obj.name in subscriptions) {
          var isBound = false;
          /* Check if bound to atlest 1 element */
          if (subscriptions[obj.name].hasOwnProperty('elms')) {
            if (cu.isArray(subscriptions[obj.name].elms) &&
              subscriptions[obj.name].elms.length > 0) {
              subscriptions[obj.name].elms.push(s);
              isBound = true;
            }
          } else {
            subscriptions[obj.name].elms = [s];
          }
        } else {
          subscriptions[obj.name] = {};
          subscriptions[obj.name].elms = [s];
        }
        /* Store in panel instance's context */
        this.tlm.push({
          name: obj.name,
          nodeElm: s
        });
      }
      /* Subscribe to tlm */
      session.subscribe(d.tlm, processTelemetryUpdate);
      /* Get tlm definitions and add this additinal info to subscriptions */
      session.getTlmDefs(d.tlm, function(tlmDef) {
        var opsPaths = [];
        /* Store in document's context */
        for (var i = 0; i < tlmDef.length; ++i) {
          if (!(tlmDef[i].opsPath in subscriptions)) {
            subscriptions[tlmDef[i].opsPath] = {};
          }
          subscriptions[tlmDef[i].opsPath].def = tlmDef[i];
          opsPaths.push(tlmDef[i].opsPath);
        }
        /* Apply definition update */
        processTelemetryDefinitionUpdate(opsPaths);
      });
    }
  }

  loadCommanding(d, s) {

    if (d.hasOwnProperty('cmd')) {
      var cmdObj = d.cmd;
      var btnObj = $(s);
      session.getCmdDef({
        name: cmdObj.name
      }, function(cmdInfo) {
        if (cmdObj.hasOwnProperty('uuid')) {
          /* We already bound this element. */
        } else {
          if (cmdObj.name == cmdInfo.name) {
            var uuid = cu.makeUUID();
            cmdInfo.uuid = uuid;
            cmdObj.uuid = uuid;
            /*
             * Copy any arguments we have from the command button
             * into the cmdInfo struct.
             */
            if (cmdObj.hasOwnProperty('argument')) {
              for (var i = 0; i < cmdObj.argument.length; i++) {
                for (var j = 0; j < cmdInfo.argument.length; j++) {
                  if (cmdInfo.argument[j].name == cmdObj.argument[i].name) {
                    cmdInfo.argument[j].value = cmdObj.argument[i].value;
                  }
                }
              }
            }

            if (isTemplateCommand(cmdInfo) == false) {
              /*
               * This is a fully instantiated command. No need to
               * create a popup form. Just send the command when
               * the user clicks the button.
               */
              var args = [];
              if (cmdInfo.hasOwnProperty('argument')) {
                for (var i = 0; i < cmdInfo.argument.length; i++) {
                  args.push({
                    name: cmdInfo.argument[i].name,
                    value: cmdInfo.argument[i].value.toString()
                  });
                }
              }
              btnObj[0].onclick = function(eventObject) {
                session.sendCommand({
                  ops_path: cmdInfo.name
                });
              };
            } else {
              /*
               * This is not a fully instantiated command. We need
               * to present a popup form to allow the user to
               * enter the remaining command arguments before
               * sending the command.
               *
               * First, generate UUIDs to be used later as element
               * IDs.
               */
              for (i = 0; i < cmdInfo.argument.length; i++) {
                cmdInfo.argument[i].uuid = uuid + "_" + cmdInfo.argument[i].name;
              }
              /*
               * Next set stringLength for string parameters to be
               * used for form validation later.
               */
              for (i = 0; i < cmdInfo.argument.length; i++) {
                if (cmdInfo.argument[i].type === 'string') {
                  /*
                   * Add a new stringLength (in bytes)
                   * attribute for parameter validation later.
                   */
                  cmdInfo.argument[i].stringLength = cmdOut.argument[i].bitSize / 8;
                }
              }

              /* Make button fire modal */
              btnObj.attr('data-toggle', 'modal');
              btnObj.attr('data-target', '#genericInputModal');
              btnObj.attr('data-title', 'Submit ' + cmdInfo.name + ' Arguments');
              btnObj.attr('data-submit', 'sendCmd');
              var argArray = [];

              for (var i in cmdInfo.argument) {
                var label = cmdInfo.argument[i].name;
                var type = cmdInfo.argument[i].type;
                switch (type) {
                  case 'char':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'uint8':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'int8':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'string':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'string'
                      });
                      break;
                    }

                  case 'uint16':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'int16':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'uint32':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'int32':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'float':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'float'
                      });
                      break;
                    }

                  case 'double':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'float'
                      });
                      break;
                    }

                  case 'boolean':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'uint64':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }

                  case 'int64':
                    {
                      /* integer action */
                      argArray.push({
                        'label': label,
                        'type': 'field',
                        'dtype': 'integer'
                      });
                      break;
                    }


                }
                btnObj.attr('data-custom', JSON.stringify(argArray));
              }
            }
          }
        }
      });
    }
  }

  loadPanel() {

    var cls = this;
    cu.assert(this.panelElm.hasOwnProperty('element'), 'Panel | this.panelElm has no property element');
    cu.assert(typeof this.panelElm.element === 'object', 'Panel | this.panelElm.element is not of type object');

    setTimeout(() => {
      cu.assert(this.panelElm.hasOwnProperty('config'), 'Panel | this.panelElm has no property config');
      cu.assert(typeof this.panelElm.config === 'object', 'Panel | this.panelElm.config is not of type object');
      cu.assert(this.panelElm.config.hasOwnProperty('title'), 'Panel | this.panelElm.config has no property title');
      cu.assert(typeof this.panelElm.config.title === 'string', 'Panel | this.panelElm.config.title is not of type title');
      cu.logInfo('Panel | created ', this.panelElm.config.title);
      this.title = this.panelElm.config.title;

      $(this.panelElm.element).find('[data-cdr]').each(function() {
        var dataObj = cu.parseJSON($(this).attr('data-cdr'));
        var self = this;
        var format = dataObj.indicator;
        cu.assert(format != undefined, 'indicator format is not found');
        switch (format) {
          case 'text':
          case 'dataplot':
            {
              cls.subscribeText(dataObj, self);
              break;
            }
          case 'cmd':
            {
              cls.loadCommanding(dataObj, self);
              break;
            }
          case 'splcmd':
            {
              break;
            }
        }
      });

    }, this.loadTimeout);

  }

  loadDestroyPanelProceadure() {

    this.panelElm.on('itemDestroyed', (it) => {
      cu.assert(it.hasOwnProperty('origin'), 'Panel | has no property origin');
      cu.assert(typeof it.origin === 'object', 'Panel | origin is not of type object');
      cu.assert(it.origin.hasOwnProperty('config'), 'Panel | has no property config');
      cu.assert(typeof it.origin.config === 'object', 'Panel | config is not of type object');
      cu.assert(it.origin.config.hasOwnProperty('type'), 'Panel | has no property type');
      cu.assert(typeof it.origin.config.type === 'string', 'Panel | type is not of type string');
      if (it.origin.config.type == 'component') {
        /* iterate over localy stored tlm opsPaths and dataplot keys */
        for (var i = 0; i < this.tlm.length; ++i) {
          cu.assert(Object.keys(subscriptions).length > 0, 'Panel | subscriptions is empty');
          var opsPath = this.tlm[i].name;
          var nodeElm = this.tlm[i].nodeElm;
          if (opsPath in subscriptions) {
            if (subscriptions[opsPath].elms.length > 0) {
              /* delete tlm and dataplot entry*/
              var index = subscriptions[opsPath].elms.indexOf(nodeElm)
              if (index != -1) {
                delete dataplot_subscriptions[nodeElm.getAttribute('plot-key')]
                subscriptions[opsPath].elms.splice(index, 1);
                cu.logDebug('Panel | ', opsPath, ' removed');
              } else {
                cu.logError('Panel | element key not fount in subscriptions array')
              }
              if (subscriptions[opsPath].elms.length < 1) {

                delete subscriptions[opsPath];
                /* Unsubscribe */
                session.unsubscribe([{
                  name: opsPath
                }]);
                cu.logDebug('Panel | ', opsPath, ' tlm unsubscribed');
              }
            } else {
              cu.logError('Panel | subscription is not associated with any element')
            }
          }
        }
        /* clear local data */
        this.tlm = [];
        this.panelElm['instantiated'] = false;
        // this.panelElm = undefined;
        this.title = 'Unknown'
        cu.logInfo('Panel | panel destroyed [stacks, columns, tabs, panels etc.]');
      }
    });
  }

}



/* Event handlers
   layout-load-complete event is fired when a new layout is being created
   which happens in the following cases:
   First time a layout is loaded on reload.
   A layout file is selected from layouts menu.
   A .lyt file is loaded from local storage.
*/
window.addEventListener('layout-load-complete', () => {

  myLayout.on('tabCreated', (t) => {
    /* A new window or movable tab has been created */
    cu.assert(t.hasOwnProperty('contentItem'), 'Tab | has no property contentItem');
    cu.assert(typeof t.contentItem === 'object', 'Tab | contentItem is not of type object');
    cu.assert(t.contentItem.hasOwnProperty('type'), 'Tab | has no property type');
    cu.assert(typeof t.contentItem.type === 'string', 'Tab | type is not of type string');
    // console.log(t)
    if (t.contentItem.type == 'component') {
      if (!t.contentItem.instantiated) {
        var panel = new Panel(t.contentItem);
        panel.loadPanel();
        panel.loadDestroyPanelProceadure();
      }
    } else {
      cu.logError('Tab | panel cannot be created');
    }
  });

  myLayout.on("stateChanged", (i) => {
    /* Handle dataplot overflow when layout resize happens */
    for (var key in dataplot_subscriptions) {
      if (dataplot_subscriptions.hasOwnProperty(key)) {
        var ug = dataplot_subscriptions[key].getUtilGraph();
        ug.resize();
        ug.setupGrid();
        ug.draw();
      }
    }
  });

});
