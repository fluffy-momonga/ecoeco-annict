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

	if (searchWorksJson.data.searchWorks.pageInfo.hasPreviousPage) {
		$('#pager-prev').show();
		$('#pager-prev-disabled').hide();
	} else {
		$('#pager-prev').hide();
		$('#pager-prev-disabled').show();
	}

	if (searchWorksJson.data.searchWorks.pageInfo.hasNextPage) {
		$('#pager-next').show();
		$('#pager-next-disabled').hide();
	} else {
		$('#pager-next').hide();
		$('#pager-next-disabled').show();
	}
}

function searchWorks(before, after) {
	var title = $('#title').val();
	var variables = getSearchWorksVariables(title, before, after);

	if (variables.titles.length == 0) {
		return;
	}

	postQuery(
		function(json) {
			searchWorksJson = json;
			searchWorksJson.title = title;
			saveSearchWorksJson();
			renderSearchWorks();
		},
		searchWorksQuery,
		variables
	);
}

$(function() {
	$('#searchForm').submit(function() {
		searchWorks(null, null);
		return false;
	});

	$('#works-template .work-status').change(function() {
		var workStatus = $(this);
		var status = workStatus.val();
		var id = workStatus.closest('.work-heading').data('id');

		postQuery(
			function(json) {
				var work = json.data.updateStatus.work;
				var render = (status == 'WATCHING') ? addWatchingWorksJson(work) : removeWatchingWorksJson(work.annictId);
				if (render) {
					renderWatchingWorks();
				}
			},
			updateStatusQuery,
			getStateVariables(id, status)
		);
	});

	$('#pager-prev a').click(function() {
		searchWorks(searchWorksJson.data.searchWorks.pageInfo.startCursor, null);
		return false;
	});

	$('#pager-next a').click(function() {
		searchWorks(null, searchWorksJson.data.searchWorks.pageInfo.endCursor);
		return false;
	});

	renderSearchWorks();
});
