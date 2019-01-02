# Custom HTML Tags
## NOTE:
- Chrome is currently the only browser that supports Custom Elements v1 natively, and is active by default.
- As of September 2018, Firefox support for Custom Elements can be enabled with the following steps
    - Type in the search bar `about:config`.
    - search for `dom.webcomponents.shadowdom.enabled` click to `enable`.
    - serch for `dom.webcomponents.customelements.enabled` click to `enable`.


Custom tags will be used extend regular html tags such as span, button, div etc; by encapsulating data and logic into these tags. This document will expain how to properly define comander custom tags.
#### <cmdr-text>
###### Attributes :
- data-tlm : *telemetry object (for subscription)*
###### Example :
#
```sh
<cmdr-text data-tlm={tlm:[{name:'/CFS/FLOW/CmdCounter'}]}></cmdr-text>
```
#
#
#### <cmdr-button>
###### Attributes :
 - data-steps : *List of step names for 2-step protocol*
 - data-cmd : *command object (for posting commands)*
 - data-text : *Text to be displayed on the button *
###### Example :
If you want to use a simple button follow:

```sh
<cmdr-button data-text="Reset" data-cmd={cmd:[{name:'/CFS/FLOW/Reset'}]}></cmdr-button>
```
If you want to use a two step button follow:
Upon click the button moves to second state and awaits second clik to post of complete its action.
#
```sh
<cmdr-button data-steps=['No-Op', 'Confirm'] data-cmd={cmd:[{name:'/CFS/FLOW/NoOp'}]}></cmdr-button>
```
#
#

#### <cmdr-led>
###### Attributes :
- data-tlm : *telemetry object (for subscription) only for displaying binary values using a led*
###### Example :
#
```sh
<cmdr-led data-tlm={tlm:[{name:'/CFS/FLOW/CmdCounter'}]}></cmdr-led>
```
#
#

#### <cmdr-dataplot>
###### Attributes :
 - data-tlm : *telemetry object/s (for subscription)*
 - data-label : *label/s of plot*
 - data-color : *color/s of plot*
###### Example :
#
```sh
<cmdr-dataplot data-tlm={tlm:[{name:'/CFS/FLOW/VLP_DistBottom'}]} data-label='Altitude AGL (m)' data-color='#ff00ff'></cmdr-dataplot>
```
#
#
