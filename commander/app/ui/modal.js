'use strict';

/**
 * Proceadure to generate modals
 */
function InitModal() {
  /* Make it draggable with the boundary of document */
  $( ".modal-content" ).draggable( {
    containment: "document"
  } );
  /* modal on show handle - generate a form based on custom
   * information from dom elements*/
  $( "#genericInputModal" ).on( 'show.bs.modal', ( event ) => {

    if ( event.hasOwnProperty( 'relatedTarget' ) ) {
      /* which invoked the modal to show */
      var btn = $( event.relatedTarget );
      var title = btn.data( 'title' );
      /* this can be a function of a string which will be executed
       * upon form submission */
      var submit = btn.data( 'submit' );
      /* form generation data */
      var custom = btn.data( 'custom' );
      var info = btn.data( 'cdr' );
      $( "#genericInputModal" ).attr( 'data-info', JSON.stringify( info ) );
      var item = "";
      /* set modal title */
      $( '#modalTitle' ).text( title );
      /* set custom data */
      for ( var e in custom ) {
        if ( custom[ e ].value == undefined ) {
          /* handle each type case seperately */
          switch ( custom[ e ].type ) {

            case "field":
              /* generate html for a field with enumerated id's */
              item = "<div class='form-group'>" +
                "<label class='col-form-label' id=labelField" + e + " for=inputField" + e + ">" + custom[ e ].label + "</label>"
              if ( custom[ e ].dtype == 'integer' ) {
                item += "<input class='form-control' type='number' value='0' id=inputField" + e + ">"
              } else if ( custom[ e ].dtype == 'float' ) {
                item += "<input class='form-control' type='number' value='0.0' step='0.001' id=inputField" + e + ">"
              } else if ( custom[ e ].dtype == 'text' ) {
                item += "<input class='form-control' type='text' value='' id=inputField" + e + ">"
              }
              item += "</div>"
              $( '#modalForm' ).append( item );
              break;

            case "select":
              /* dropdown html */
              item = "<div class='form-group'>" +
                "<label class='col-form-label' id=labelField" + e + " for=select" + e + ">" + custom[ e ].label + "</label>" +
                "<select class='custom-select mr-sm-2'id=select" + e + ">" +
                "<option selected>Choose..</option>" +
                "</select>" +
                "</div>"
              $( '#modalForm' ).append( item )
              // inputsIds.push("select"+e)
              var options = null
              if ( typeof custom[ e ].getItem == 'string' ) {
                options = window[ custom[ e ].getItem ].call()
              } else if ( typeof custom[ e ].getItem == 'object' ) {
                options = custom[ e ].getItem
              }
              cu.logDebug( "Modal | ", custom[ e ] );
              options.forEach( ( sel ) => {
                var html = "<option value=" + sel.value + ">" + sel.label + "</option>"
                $( '#select' + e ).append( html )
              } );
              break;

            case "browse":
              /* html to select a file form  filesystem */
              item = "<div class='form-group'>" +
                "<label class='col-form-label' id=labelField" + e + " for=browse" + e + ">" + custom[ e ].label + "</label>" +
                "<input type='file' class='form-control-file' id='browse" + e + "'>" +
                "</div>"
              $( '#modalForm' ).append( item )
              break;

            default:
              cu.logDebug( "Modal | Unknown data passed as attribute" );
          }
        } else {
          item = "<div class='form-group disappear'><label class='col-form-label' id=labelField" + e + " for=inputField" + e + ">" + custom[ e ].label + "</label>"
          item += "<input class='form-control' type='text' value=" + custom[ e ].value + " id=inputField" + e + ">"
          item += "</div>"
          $( '#modalForm' ).append( item );
        }
      }
      /* set submit action */
      $( '#modalSubmit' )[ 0 ].onclick = window[ submit ];
    }

    /* supress the default reload event */
    $( "#genericInputModal" ).on( 'submit', function( event ) {
      event.preventDefault();
    } );

    /* support for form submission on enter key down event */
    if ( event.currentTarget.onkeydown === null ) {
      event.currentTarget.onkeydown = function( evt ) {
        if ( evt.key == 'Enter' ) {
          $( '#modalSubmit' )[ 0 ].click();
        }
      }
    }

  } );

  /* modal on hide handle - unload a form based */
  $( "#genericInputModal" ).on( 'hidden.bs.modal', ( e ) => {
    /* replace title */
    $( "#modalTitle" ).text( 'Title Placeholder' );
    /* Remove all attached children*/
    $( "#modalForm" ).empty();
    /* Unset submit action */
    $( '#modalSubmit' )[ 0 ].onclick = null;
  } );
}