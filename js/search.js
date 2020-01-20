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

      var href = 'https://annict.jp/works/' + work.annictId;
      workHeading.find('.work-link').attr('href', href).text(work.title);

      workHeading.find('.work-status').val(work.viewerStatusState);

      works.append(workHeading);
    });

    $('#pager-prev').toggle(searchWorksJson.data.searchWorks.pageInfo.hasPreviousPage);
    $('#pager-next').toggle(searchWorksJson.data.searchWorks.pageInfo.hasNextPage);
  };

  var searchWorks = function(before, after) {
    var title = $('#title').val().trim();
    api.searchWorks(
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
      var status = workStatus.val();
      var id = workStatus.closest('.work-heading').data('id');

      api.updateStatus(
        function(json) {
          var work = json.data.updateStatus.work;
          if (status == 'WATCHING') {
            watchingContent.addWork(work);
          } else {
            watchingContent.removeWork(work.annictId);
          }
          headerContent.inform('変更しました。', 'info');
        },
        id, status
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

  this.clear = clear;
};

$(function() {
  searchContent.build();
});