/****************************************************************************
 *
 *   Copyright (c) 2018 Windhover Labs, L.L.C. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 * 3. Neither the name Windhover Labs nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
 * OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *****************************************************************************/

'use strict';
/**
 * A place to store temporary intervals whose life is bound to the existance of
 * the element they serve
 * @type {Array}
 */
var widgetIntervalCollection = [];

/**
 * Holds sparklines for widgets.
 * @type {Array}
 */
var sparklineIndex = [];


/**
 * Id of interval that clears rouge intervals created in pug files. The developer
 * has to store the intervals and associated element class in widgetIntervalCollection
 * array to have them checked regularly for clean up.
 */
var clearWidgetIntervalCollectionId = setInterval( () => {
  for ( var i in widgetIntervalCollection ) {
    var widgetInterval = widgetIntervalCollection[ i ];
    var bindClassStr = widgetInterval.bindclass;
    if ( $( '.' + bindClassStr ).length == 0 ) {
      clearInterval( widgetInterval.interval );
      widgetIntervalCollection.splice( i, 1 );
      cu.logInfo( 'WidgetIntervalCleanup | interval bound to class ' + bindClassStr + ' is cleared.' );
    }
  }
}, 10000 );


/**
 * On Hover event is handled there
 * @param  {Object} elm HTMLObject
 * @param  {Object} evt Evnet Object
 */
function gadgetHoverHandle( elm, evt ) {
  if ( evt == 'onmouseover' ) {
    $( elm ).find( '.cdr-gadget-close' ).css( 'display', 'block' )
  } else if ( evt == 'onmouseleave' ) {
    /* Let close button be displayed for 2 more seconds */
    setTimeout( () => {
      $( elm ).find( '.cdr-gadget-close' ).css( 'display', 'none' )
    }, 2000 );
  }
}

/**
 * Handles close event on the Widget
 * @param  {Object} elm HTMLObject
 */
function gadgetCloseHandle( elm ) {

  var uniqueID = $( elm ).data( 'key' );
  var url = $( '#cdr-gadget-' + uniqueID ).data( 'url' );
  var id = $( '#cdr-gadget-' + uniqueID ).parent().attr( 'id' );
  widgetState[ id ].splice( widgetState[ id ].indexOf( url ), 1 )
  session.saveWidgets( widgetState )
  $( '#cdr-gadget-' + uniqueID ).remove();

}