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

  episodeBody.removeData().attr('data-id', episode.id).attr('data-annict-id', episode.annictId);

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

function loadChecked(target, key) {
  var value = localStorage.getItem(key);
  target.prop('checked', value == 'true');
}

function saveChecked(target, key) {
  var value = target.prop('checked');
  localStorage.setItem(key, value);
  return value;
}

function setupWorkReviewEvent(target) {
  var id;

  target.click(function() {
    var workHeading = $(this).closest('.work-heading');
    var workTitle = workHeading.find('.work-link').text();
    id = workHeading.data('id');

    $('#review-work-title').text(workTitle);
    $('[name^="review-rating-"][value=""]').click();
    $('#review-body').val('');
    loadChecked($('#review-twitter'), 'twitter');
    loadChecked($('#review-facebook'), 'facebook');

    $('#review-modal').modal();
  });

  $('#review-modal-ok').click(function() {
    var overall = $('[name="review-rating-overall"]:checked').val();
    var animation = $('[name="review-rating-animation"]:checked').val();
    var music = $('[name="review-rating-music"]:checked').val();
    var story = $('[name="review-rating-story"]:checked').val();
    var character = $('[name="review-rating-character"]:checked').val();
    var body = $('#review-body').val();
    var twitter = saveChecked($('#review-twitter'), 'twitter');
    var facebook = saveChecked($('#review-facebook'), 'facebook');

    $('#review-modal').modal('hide');

    api.createReview(
      function(json) {
        /* json.data.createReview.review.work.title */
        alertMessage('記録完了', 'info');
      },
      id, body, overall, animation, music, story, character, twitter, facebook
    );
  });
}

function setupEpisodeRecordEvent(target) {
  var workContents;
  var id;

  target.click(function() {
    workContents = $(this).closest('.episode-body').prev('.work-heading').andSelf();
    id = workContents.filter('.episode-body').data('id');

    var workTitle = workContents.find('.work-link').text();
    var episodeNumber = workContents.find('.episode-number').text();
    var episodeTitle = workContents.find('.episode-title').text();

    $('#record-work-title').text(workTitle);
    $('#record-episode-number').text(episodeNumber);
    $('#record-episode-title').text(episodeTitle);
    $('[name="record-rating"][value=""]').click();
    $('#record-comment').val('');
    loadChecked($('#record-twitter'), 'twitter');
    loadChecked($('#record-facebook'), 'facebook');

    $('#record-modal').modal();
  });

  $('#record-modal-ok').click(function() {
    var rating = $('[name="record-rating"]:checked').val();
    var comment = $('#record-comment').val();
    var twitter = saveChecked($('#record-twitter'), 'twitter');
    var facebook = saveChecked($('#record-facebook'), 'facebook');

    $('#record-modal').modal('hide');

    api.createRecord(
      function(json) {
        var episode = json.data.createRecord.record.episode;
        updateEpisode(episode, workContents);
        alertMessage('記録完了', 'info');
      },
      id, rating, comment, twitter, facebook
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

function setupEpisodeNextPrevEvent(target, method, episodeKey, skip) {
  target.click(function() {
    var workContents = $(this).closest('.episode-body').prev('.work-heading').andSelf();
    var annictId = workContents.filter('.episode-body').data('annict-id');

    method(
      function(json) {
        var episode = searchEpisode(json.data.searchEpisodes.nodes[0], episodeKey);
        updateEpisode(episode, workContents);
      },
      annictId, skip
    );
  });
}

function setupUpdateStatusEvent(target, state, prefix) {
  var workHeading;
  var idPrefix = '#' + prefix;

  target.click(function() {
    workHeading = $(this).closest('.work-heading');
    var workTitle = workHeading.find('.work-link').text();

    $(idPrefix + '-work-title').text(workTitle);
    $(idPrefix + '-modal').modal();
  });

  $(idPrefix + '-modal-ok').click(function() {
    $(idPrefix + '-modal').modal('hide');

    var id = workHeading.data('id');

    api.updateStatus(
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

        alertMessage('変更完了', 'info');
      },
      id, state
    );
  });
}

function setupEvent(template) {

  setupUpdateStatusEvent(template.find('.work-watched'), 'WATCHED', 'watched');
  setupUpdateStatusEvent(template.find('.work-stop'), 'STOP_WATCHING', 'stop');

  setupWorkReviewEvent(template.find('.work-review'));
  setupEpisodeRecordEvent(template.find('.episode-record'));

  setupEpisodeNextPrevEvent(template.find('.episode-skip-prev'), api.prevEpisode, 'prevEpisode', true);
  setupEpisodeNextPrevEvent(template.find('.episode-prev'), api.prevEpisode, 'prevEpisode', false);
  setupEpisodeNextPrevEvent(template.find('.episode-next'), api.nextEpisode, 'nextEpisode', false);
  setupEpisodeNextPrevEvent(template.find('.episode-skip-next'), api.nextEpisode, 'nextEpisode', true);

  $('#update').click(function() {
    updateWatchingWorksJson(function() {
      renderWatchingWorks();
      alertMessage('更新完了', 'info');
    });
  });

  $('#clear').click(function() {
    clearWatchingWorks();
    clearStorage();
    loadWatchingWorksJson();
    alertMessage('クリア完了', 'info');
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
