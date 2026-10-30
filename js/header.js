var headerContent = new function() {

  var initials = null;
  var infoTimer = null;

  var hideInfo = function() {
    clearTimeout(infoTimer);
    infoTimer = null;
    $('#info').hide();
  };

  this.toggleInitial = function(initial, show) {
    initials.filter('[data-initial="' + initial + '"]').toggle(show);
  };

  this.inform = function(message, type, delay) {
    var info = $('#info');
    var infoBg = info.find('#info-bg');
    var oldBg = infoBg.data('bg');
    var newBg = 'bg-' + type;

    clearTimeout(infoTimer);

    infoBg.removeClass(oldBg).addClass(newBg).data('bg', newBg);
    info.find('#info-message').text(message);

    info.show();
    infoTimer = setTimeout(hideInfo, delay ? delay : 3000);
  };

  this.updateBodyTop = function() {
    var headerHeight = $('#header').outerHeight();
    $('body').css('padding-top', headerHeight + 'px');
  }

  this.build = function() {
    var initialTemplate = $('#initial-template > *');
    var headerInitial = $('#header-initial');

    watchingContent.getGroups().forEach(function(group) {
      var initial = initialTemplate.clone(false, false);
      initial.attr('data-initial', group.initial).text(group.title);
      headerInitial.append(initial);
    });

    initials = headerInitial.children();

    initials.on('click', function() {

      $('#nav-watching').tab('show');

      var initial = $(this).data('initial');
      var groupTop = watchingContent.getGroupTop(initial);

      $(window).scrollTop(groupTop);
      $(this).trigger('blur');
    });

    $('#info').on('click', hideInfo);

    $(window).on('resize', this.updateBodyTop);
  };
};

$(function() {
  headerContent.build();
});
