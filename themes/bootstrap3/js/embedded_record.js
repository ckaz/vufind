/*global localStorage, registerAjaxCommentRecord, registerTabEvents, setupRecordToolbar, VuFind */
var _EMBEDDED_COOKIE = 'vufind_search_open';
var _EMBEDDED_DELIM  = ',';
var _EMBEDDED_STATUS = {};

function saveEmbeddedStatusToCookie() {
  var storage = [];
  for (var i in _EMBEDDED_STATUS) {
    var str = i;
    if (_EMBEDDED_STATUS[i]) {
      str += ':::' + _EMBEDDED_STATUS[i];
    }
    storage.push(str);
  }
  localStorage.setItem(_EMBEDDED_COOKIE, $.unique(storage).join(_EMBEDDED_DELIM));
}
function addToEmbeddedCookie(id, tab) {
  var realID = $('#'+id).find('.hiddenId').val();
  _EMBEDDED_STATUS[realID] = tab;
  saveEmbeddedStatusToCookie();
}
function removeFromEmbeddedCookie(id) {
  delete _EMBEDDED_STATUS[id];
  saveEmbeddedStatusToCookie();
}
function loadEmbeddedCookies() {
  var cookies = localStorage.getItem(_EMBEDDED_COOKIE);
  if (!cookies) return;
  var items = cookies.split(_EMBEDDED_DELIM);
  var hiddenIds = $('.hiddenId');
  var doomed = [];
  for (var i=0; i<items.length; i++) {
    var parts = items[i].split(':::');
    _EMBEDDED_STATUS[parts[0]] = parts[1] || null;
    var mainNode = null;
    for (var j=0; j<hiddenIds.length; j++) {
      if (hiddenIds[j].value == parts[0]) {
        mainNode = $(hiddenIds[j]).closest('.result');
        break;
      }
    }
    if (mainNode == null) {
      doomed.push(parts[0]);
      continue;
    };
    mainNode.find('.getFull').addClass('auto').click();
  }
  for (var i=0; i<doomed.length; i++) {
    console.log('doomed', doomed[i]);
    removeFromEmbeddedCookie(doomed[i]);
  }
}

function showhideTabs(tabid) {
  $('#'+tabid).parents('.result').find('.search_tabs .tab-pane.active').removeClass('active');
  $('#'+tabid+'-tab').addClass('active');
  $('#'+tabid).tab('show');
}
function ajaxFLLoadTab(tabid, reload) {
  if(typeof reload === "undefined") {
    reload = false;
  }
  if($('#'+tabid).parent().hasClass('noajax')) {
    window.location.href = $('#'+tabid).attr('href');
    return true;
  }
  var $record = $('#'+tabid).closest('.result');
  if ($record.length == 0) {
    $record = $('#'+tabid).closest('.record');
  }
  var id = $record.find(".hiddenId")[0].value;
  var source = $record.find(".hiddenSource")[0].value;
  var urlroot;
  if (source == VuFind.defaultSearchBackend) {
    urlroot = 'Record';
  } else {
    urlroot = source + 'record';
  }
  var tab = tabid.split('_');
  tab = tab[0];
  if(reload || $('#'+tabid+'-tab').is(':empty')) {
    showhideTabs(tabid);
    $('#'+tabid+'-tab').html('<i class="fa fa-spinner fa-spin"></i> '+VuFind.translate('loading')+'...');
    $.ajax({
      url: VuFind.path + '/' + urlroot + '/' + encodeURIComponent(id) + '/AjaxTab',
      type: 'POST',
      data: {tab: tab},
      success: function(data) {
        data = data.trim();
        if (data.length > 0) {
          $('#'+tabid+'-tab').html(data);
          registerTabEvents();
        } else {
          $('#'+tabid+'-tab').html(VuFind.translate('collection_empty'));
        }
        // Auto click last tab
        if ($record.find('.getFull').hasClass('auto') && _EMBEDDED_STATUS[id]) {
          $('#'+_EMBEDDED_STATUS[id]).click();
          $record.find('.getFull').removeClass('auto')
        }
        if(typeof syn_get_widget === "function") {
          syn_get_widget();
        }
      }
    });
  } else {
    showhideTabs(tabid);
  }
  return false;
}

function toggleDataView() {
  // If full, return true
  var viewType = $(this).attr("data-view");
  if (viewType == 'full') {
    return true;
  }
  // Insert new elements
  var shortNode = $(this).closest('.short-view');
  var mainNode = $(this).closest('.result');
  var timeID = new Date().getTime()+'';
  var tabs = $('<ul class="nav nav-tabs"><li class="active"><a id="'+timeID+'">'+VuFind.translate('Overview')+'</a></li>'
             + '<li class="loading"><a><i class="fa fa-spin fa-spinner"></i></a></li></ul>');
  var longNode = $('<div class="search_tabs tab-content"></div>');
  shortNode.before(tabs);
  shortNode.before(longNode);
  var container = $('<div class="tab-pane" id="'+timeID+'-tab"></div>');
  longNode.append(container);
  shortNode.appendTo(container);
  // Load AJAX view
  var div_id = shortNode.find(".hiddenId")[0].value;
  var url = VuFind.path + '/AJAX/JSON?' + $.param({
    method:'getRecordDetails',
    id:div_id,
    type:viewType,
    source:mainNode.find(".hiddenSource")[0].value
  });
  $.ajax({
    dataType: 'json',
    url: url,
    success: function(response) {
      if (response.status == 'OK') {
        // Deactivate overview tab
        tabs.find('li.active').removeClass('active');
        tabs.find('.loading').remove();
        // Insert tabs
        var components = $(response.data);
        $(components).find('.recordTabs li').appendTo(tabs);
        $(components).find('.tab-pane').appendTo(longNode);
        // Load first tab
        var $firstTab = tabs.find('li.active a');
        if ($firstTab.length > 0) {
          ajaxFLLoadTab($firstTab.attr('id'));
        }
        // Bind tab clicks
        tabs.find('a').click(function() {
          addToEmbeddedCookie(mainNode.attr('id'), $(this).attr('id'));
          return ajaxFLLoadTab(this.id);
        });
        longNode.find('.panel.noajax .accordion-toggle').click(function() {
          window.location.href = $(this).attr('data-href');
        });
        longNode.find('[id^=usercomment]').find('input[type=submit]').unbind('click').click(function() {
          return registerAjaxCommentRecord(
            longNode.find('[id^=usercomment]').find('input[type=submit]').closest('form')
          );
        });
        // Add events to record toolbar
        VuFind.lightbox.bind(longNode);
        checkSaveStatuses(shortNode.closest('.result,.record'));
      }
    }
  });
  addToEmbeddedCookie(mainNode.attr('id'), div_id);
  $(this).unbind('click');
  return false;
}

$(document).ready(function() {
  $('.getFull').bind('click', toggleDataView);
  loadEmbeddedCookies();
});
