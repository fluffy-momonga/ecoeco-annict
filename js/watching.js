function clearWatchingWorks() {
  $('#watching-works').empty();
}

function getWorkHeading(work) {
  var href = 'https://annict.jp/works/' + work.annictId;
  var workHeading = $('#group-template .work-heading').clone(true, true);
  workHeading.removeData().attr('data-id', work.id).attr('data-annict-id', work.annictId);
  workHeading.find('.work-link').attr('href', href).text(work.title);
  return workHeading;
}

function getEpisodeBody(episode, work) {

  var episodeBody = $('#group-template .episode-body').clone(true, true);

  if (!episode) {
    return episodeBody.empty();
  }

  episodeBody.removeData().attr('data-id', episode.id).attr('data-annict-id', episode.annictId)

  var href = 'https://annict.jp/works/' + work.annictId + '/episodes/' + episode.annictId;
  var record = episodeBody.find('.episode-record');
  var link = episodeBody.find('.episode-link').attr('href', href);
  var number = episodeBody.find('.episode-number').text(episode.numberText);
  var title = episodeBody.find('.episode-title').text(episode.title ? episode.title : '');

  if (episode.viewerDidTrack) {
    record.prop('disabled', true);
  } else {
    title.hide();
  }

  return episodeBody;
}

var groupList = [
  {title: 'あ', reg: /^[ぁ-お]/, works: []},
  {title: 'か', reg: /^[か-ご]/, works: []},
  {title: 'さ', reg: /^[さ-ぞ]/, works: []},
  {title: 'た', reg: /^[た-ど]/, works: []},
  {title: 'な', reg: /^[な-の]/, works: []},
  {title: 'は', reg: /^[は-ぽゔ]/, works: []},
  {title: 'ま', reg: /^[ま-も]/, works: []},
  {title: 'や', reg: /^[ゃ-よ]/, works: []},
  {title: 'ら', reg: /^[ら-ろ]/, works: []},
  {title: 'わ', reg: /^[ゎ-ん]/, works: []},
  {title: '他', reg: /^./, works: []}
];

function renderWatchingWorks() {
  clearWatchingWorks();

  watchingWorksJson.data.viewer.works.nodes.forEach(function(work) {
    for (var i = 0; i < groupList.length; i++) {
      if (groupList[i].reg.test(work.titleKana)) {
        groupList[i].works.push(work);
        break;
      }
    }
  });

  var watchingWorks = $('#watching-works');

  groupList.forEach(function(group) {
    if (group.works.length > 0) {
      var groupContents = $('#group-template .group-heading, #group-template .group-body').clone(false, false);
      var worksContents = groupContents.find('.works');

      groupContents.find('.group-title').text(group.title);
      worksContents.empty();
      watchingWorks.append(groupContents);

      while (group.works.length > 0) {
        var work = group.works.shift();
        var episode = (work.episodes.nodes.length > 0) ? work.episodes.nodes[0] : null;
        var workHeading = getWorkHeading(work);
        var episodeBody = getEpisodeBody(episode, work);
        worksContents.append(workHeading, episodeBody);
      }
    }
  });
}

function updateEpisode(episode, workContents) {

  var annictId = workContents.filter('.work-heading').data('annict-id');
  var works = watchingWorksJson.data.viewer.works.nodes;

  for (var i = 0; i < works.length; i++) {
    if (works[i].annictId == annictId) {
      works[i].episodes.nodes[0] = episode;
      saveWatchingWorksJson();

      var episodeBody = getEpisodeBody(episode, works[i]);
      workContents.filter('.episode-body').remove();
      workContents.filter('.work-heading').after(episodeBody);

      break;
    }
  }
}

function setupEpisodeRecordEvent(target) {
  target.click(function() {
    var workContents = $(this).closest('.episode-body').prev('.work-heading').andSelf();
    var number = workContents.find('.episode-number').text();
    var title = workContents.find('.episode-title').text();

    if (!confirm(number + "\n" + title + "\n\n記録？")) {
      return;
    }

    var id = workContents.filter('.episode-body').data('id');

    postQuery(
      function(json) {
        var episode = json.data.createRecord.record.episode;
        updateEpisode(episode, workContents);
      },
      createRecordQuery,
      getIdVariables(id)
    );
  });
}

function searchEpisode(rootEpisode, episodeKey) {
  var episode = rootEpisode[episodeKey];
  if (episode) {
    while (episode[episodeKey]) {
      episode = episode[episodeKey];
    }
    return episode;
  } else {
    return rootEpisode.work.episodes.nodes[0];
  }
}

function setupEpisodeNextPrevEvent(target, query, episodeKey, skip) {
  target.click(function() {
    var workContents = $(this).closest('.episode-body').prev('.work-heading').andSelf();
    var annictId = workContents.filter('.episode-body').data('annict-id');

    var variables = getIdVariables(annictId);
    variables.skip = skip;

    postQuery(
      function(json) {
        var episode = searchEpisode(json.data.searchEpisodes.nodes[0], episodeKey);
        updateEpisode(episode, workContents);
      },
      query,
      variables
    );
  });
}

function setupUpdateStatusEvent(target, state, message) {
  target.click(function() {
    var workHeading = $(this).closest('.work-heading');
    var title = workHeading.find('.work-link').text();

    if (!confirm(title + message)) {
      return;
    }

    var id = workHeading.data('id');
    var variables = getStateVariables(id, state);

    postQuery(
      function(json) {
        var workAnnictId = workHeading.data('annict-id');
        removeWatchingWorksJson(workAnnictId);

        var works = workHeading.closest('.works');
        workHeading.next('.episode-body').remove();
        workHeading.remove();

        if (works.find('.work-heading').length == 0) {
          var groupBody = works.closest('.group-body');
          groupBody.prev('.group-heading').remove();
          groupBody.remove();
        }
      },
      updateStatusQuery,
      variables
    );
  });
}

function setupEvent(template) {

  setupUpdateStatusEvent(template.find('.work-watched'), 'WATCHED', "\n\n見た？");
  setupUpdateStatusEvent(template.find('.work-stop'), 'STOP_WATCHING', "\n\n視聴中止？");

  template.find('.work-review').click(function() {
    var workHeading = $(this).closest('.work-heading');
    var title = workHeading.find('.work-link').text();

    if (!confirm(title + "\n\n記録？")) {
      return;
    }

    var id = workHeading.data('id');
    postQuery(
      function(json) {
        alert(json.data.createReview.review.work.title);
      },
      createReviewQuery,
      getIdVariables(id)
    );
  });

  setupEpisodeRecordEvent(template.find('.episode-record'));

  setupEpisodeNextPrevEvent(template.find('.episode-skip-prev'), prevEpisodeQuery, 'prevEpisode', true);
  setupEpisodeNextPrevEvent(template.find('.episode-prev'), prevEpisodeQuery, 'prevEpisode', false);
  setupEpisodeNextPrevEvent(template.find('.episode-next'), nextEpisodeQuery, 'nextEpisode', false);
  setupEpisodeNextPrevEvent(template.find('.episode-skip-next'), nextEpisodeQuery, 'nextEpisode', true);

  $('#update').click(function() {
    updateWatchingWorksJson(function() {
      renderWatchingWorks();
    });
  });

  $('#clear').click(function() {
    clearWatchingWorks();
    clearStorage();
    loadWatchingWorksJson();
  });
}

$(function() {
  setupEvent($('#group-template'));

  if (watchingWorksJson.version != version) {
    updateWatchingWorksJson(function(){
      renderWatchingWorks();
    });
  } else {
    renderWatchingWorks();
  }
});
