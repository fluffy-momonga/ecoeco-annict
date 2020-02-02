var headerContent = new function() {

  var initials = null;

  this.toggleInitial = function(initial, show) {
    initials.filter('[data-initial="' + initial + '"]').toggle(show);
  };

  this.inform = function(message, type, delay) {
    var info = $('#info');
    var infoBg = info.find('#info-bg');
    var oldBg = infoBg.data('bg');
    var newBg = 'bg-' + type;

    info.finish();

    infoBg.removeClass(oldBg).addClass(newBg).data('bg', newBg);
    info.find('#info-message').text(message);

    info.show('fast').animate({opacity: 1}, delay ? delay : 3000).hide('fast');
  };

  this.build = function() {
    var initialTemplate = $('#initial-template > *');
    var headerInitial = $('#header-initial');

    watchingContent.getGroups().forEach(function(group) {
      var initial = initialTemplate.clone(false, false);
      initial.attr('data-initial', group.initial).text(group.title);
      headerInitial.append(initial);
    });

    initials = headerInitial.children();

    initials.click(function() {

      $('#nav-watching').tab('show');

      var initial = $(this).data('initial');
      var groupTop = watchingContent.getGroupTop(initial);

      $(window).scrollTop(groupTop);
      $(this).blur();
    });

    $('#info').click(function() {
      $(this).finish();
    });
  };
};

$(function() {
  headerContent.build();
});
