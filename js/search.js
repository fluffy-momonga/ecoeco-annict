loadSearchWorksJson();

function renderSearchWorks() {

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
}

function searchWorks(before, after) {
  var title = $('#title').val();
  api.searchWorks(
    function(json) {
      searchWorksJson = json;
      searchWorksJson.title = title;
      saveSearchWorksJson();
      renderSearchWorks();

      if (json.data.searchWorks.nodes.length == 0) {
        alertMessage('対象の作品が見つかりませんでした。', 'warning');
      }
    },
    title, before, after
  );
}

$(function() {
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
    clearSearchWorksJson();
    renderSearchWorks();
  });

  $('#works-template .work-status').change(function() {
    var workStatus = $(this);
    var status = workStatus.val();
    var id = workStatus.closest('.work-heading').data('id');

    api.updateStatus(
      function(json) {
        var work = json.data.updateStatus.work;
        var render = (status == 'WATCHING') ? addWatchingWorksJson(work) : removeWatchingWorksJson(work.annictId);
        if (render) {
          renderWatchingWorks();
        }
        alertMessage('変更完了', 'info');
      },
      id, status
    );
  });

  $('#pager-prev a').click(function() {
    $(this).blur();
    searchWorks(searchWorksJson.data.searchWorks.pageInfo.startCursor, null);
  });

  $('#pager-next a').click(function() {
    $(this).blur();
    searchWorks(null, searchWorksJson.data.searchWorks.pageInfo.endCursor);
  });

  renderSearchWorks();
});
