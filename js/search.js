var searchContent = new function() {

  var searchWorksJsonCache = new (
    Object.setPrototypeOf(
      $.extend(
        function(key) {
          JsonCache.call(this, key);
        }.prototype,
        {
          getDefault: function() {
            return {
              data: {
                searchWorks: {
                  nodes: [],
                  pageInfo: {
                    hasPreviousPage: false,
                    hasNextPage: false
                  }
                }
              },
              title: '',
              version: version
            };
          }
        }
      ),
      JsonCache.prototype
    )
  ).constructor('searchWorks');

  var render = function() {
    var searchWorksJson = searchWorksJsonCache.get();

    $('#title').val(searchWorksJson.title);

    var works = $('#works-template .works').clone(false, false);
    works.empty();
    $('#result-works').empty().append(works);

    searchWorksJson.data.searchWorks.nodes.forEach(function(work) {
      var workHeading = $('#works-template .work-heading').clone(true, true);
      workHeading.removeData().attr('data-id', work.id).attr('data-annict-id', work.annictId);

      var href = annict.makeWorkPageUrl(work.annictId);
      workHeading.find('.work-link').attr('href', href).text(work.title);

      workHeading.find('.work-status').val(work.viewerStatusState);

      works.append(workHeading);
    });

    $('#pager-prev').toggle(searchWorksJson.data.searchWorks.pageInfo.hasPreviousPage);
    $('#pager-next').toggle(searchWorksJson.data.searchWorks.pageInfo.hasNextPage);
  };

  var searchWorks = function(before, after) {
    var title = $('#title').val().trim();
    annict.searchWorks(
      function(json) {
        if (before) {
          json.data.searchWorks.pageInfo.hasNextPage = true;
        }
        if (after) {
          json.data.searchWorks.pageInfo.hasPreviousPage = true;
        }
        json.title = title;

        searchWorksJsonCache.set(json);
        searchWorksJsonCache.save();
        render();

        if (json.data.searchWorks.nodes.length == 0) {
          headerContent.inform('作品が見つかりませんでした。', 'warning');
        }
      },
      title, before, after
    );
  };

  var updateWorkStatus = function(workId, state) {
    var works = searchWorksJsonCache.get().data.searchWorks.nodes;
    for (var i = 0; i < works.length; i++) {
      if (works[i].id == workId) {
        works[i].viewerStatusState = state;
        searchWorksJsonCache.save();
        $('#result-works .work-heading[data-id="' + workId + '"] .work-status').val(state);
        break;
      }
    }
  };

  var clear = function() {
    searchWorksJsonCache.remove();
    render();
  };

  var setupEvent = function() {
    $('#searchForm').submit(function() {
      searchWorks(null, null);
      return false;
    });

    $('#search').click(function() {
      $(this).blur();
      $('#searchForm').submit();
    });

    $('#remove').click(function() {
      $(this).blur();
      clear();
    });

    $('#works-template .work-status').change(function() {
      var workStatus = $(this);
      var state = workStatus.val();
      var id = workStatus.closest('.work-heading').data('id');

      annict.updateStatus(
        function(json) {
          var work = json.data.updateStatus.work;
          if (state == 'WATCHING') {
            watchingContent.addWork(work);
          } else {
            watchingContent.removeWork(id);
          }
          updateWorkStatus(id, state);
          headerContent.inform('変更しました。', 'info');
        },
        id, state
      );
    });

    $('#pager-prev a').click(function() {
      $(this).blur();
      $(window).scrollTop(0);
      searchWorks(searchWorksJsonCache.get().data.searchWorks.pageInfo.startCursor, null);
    });

    $('#pager-next a').click(function() {
      $(this).blur();
      $(window).scrollTop(0);
      searchWorks(null, searchWorksJsonCache.get().data.searchWorks.pageInfo.endCursor);
    });
  };

  this.build = function() {
    setupEvent();
    render();
  };

  this.updateWorkStatus = updateWorkStatus;
  this.clear = clear;
};

$(function() {
  searchContent.build();
});
