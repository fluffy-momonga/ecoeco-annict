var watchingContent = new function() {

  var watchingWorksJsonCache = new (
    Object.setPrototypeOf(
      $.extend(
        function(key) {
          JsonCache.call(this, key);
        }.prototype,
        {
          save: function() {
            var json = this.get();

            json.data.viewer.works.nodes.sort(function(work1, work2) {
              return (new TitleNormalizer(work1)).compare(new TitleNormalizer(work2));
            });

            json.episodeAnnictIds = [];
            json.data.viewer.works.nodes.forEach(function(work) {
              var episodes = work.episodes.nodes;
              if (episodes.length > 0) {
                json.episodeAnnictIds.push(episodes[0].annictId);
              }
            });

            JsonCache.prototype.save.call(this);
          },

          getDefault: function() {
            return {
              data: {
                viewer: {
                  works: {
                    nodes: []
                  }
                }
              },
              episodeAnnictIds: [],
              version: version
            };
          }
        }
      ),
      JsonCache.prototype
    )
  ).constructor('watchingWorks');

  var twitterCache = new StorageCache('twitter');
  var facebookCache = new StorageCache('facebook');

  var createWorkHeading = function(work) {
    var href = 'https://annict.jp/works/' + work.annictId;
    var workHeading = $('#group-template .work-heading').clone(true, true);
    workHeading.removeData().attr('data-id', work.id).attr('data-annict-id', work.annictId);
    workHeading.find('.work-link').attr('href', href).text(work.title);
    return workHeading;
  };

  var createEpisodeBody = function(episode, work) {

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
      record.attr('disabled', 'disabled');
    } else {
      title.hide();
    }

    return episodeBody;
  };

  var groups = [
    {title: 'あ', initial: 'A', reg: /^[ぁ-お]/, works: []},
    {title: 'か', initial: 'K', reg: /^[か-ご]/, works: []},
    {title: 'さ', initial: 'S', reg: /^[さ-ぞ]/, works: []},
    {title: 'た', initial: 'T', reg: /^[た-ど]/, works: []},
    {title: 'な', initial: 'N', reg: /^[な-の]/, works: []},
    {title: 'は', initial: 'H', reg: /^[は-ぽ]/, works: []},
    {title: 'ま', initial: 'M', reg: /^[ま-も]/, works: []},
    {title: 'や', initial: 'Y', reg: /^[ゃ-よ]/, works: []},
    {title: 'ら', initial: 'R', reg: /^[ら-ろ]/, works: []},
    {title: 'わ', initial: 'W', reg: /^[ゎ-ん]/, works: []},
    {title: '他', initial: 'O', reg: /^./, works: []}
  ];

  var render = function() {

    watchingWorksJsonCache.get().data.viewer.works.nodes.forEach(function(work) {
      var title = new TitleNormalizer(work);
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].reg.test(title.getKana())) {
          groups[i].works.push(work);
          break;
        }
      }
    });

    var watchingWorks = $('#watching-works').empty();

    groups.forEach(function(group) {
      var show = (group.works.length > 0);
      headerContent.toggleInitial(group.initial, show);

      if (show) {
        var groupContents = $('#group-template .group-heading, #group-template .group-body').clone(false, false);
        var worksContents = groupContents.find('.works');

        groupContents.filter('.group-heading').attr('data-initial', group.initial);
        groupContents.find('.group-title').text(group.title);
        worksContents.empty();
        watchingWorks.append(groupContents);

        while (group.works.length > 0) {
          var work = group.works.shift();
          var episode = (work.episodes.nodes.length > 0) ? work.episodes.nodes[0] : null;
          var workHeading = createWorkHeading(work);
          var episodeBody = createEpisodeBody(episode, work);
          worksContents.append(workHeading, episodeBody);
        }
      }
    });
  };

  var updateEpisode = function(episode, workContents) {

    var annictId = workContents.filter('.work-heading').data('annict-id');
    var works = watchingWorksJsonCache.get().data.viewer.works.nodes;

    for (var i = 0; i < works.length; i++) {
      if (works[i].annictId == annictId) {
        works[i].episodes.nodes[0] = episode;
        watchingWorksJsonCache.save();

        var episodeBody = createEpisodeBody(episode, works[i]);
        workContents.filter('.episode-body').remove();
        workContents.filter('.work-heading').after(episodeBody);

        break;
      }
    }
  };

  var updateWatchingWorksJson = function(callback) {
    api.watchingWorks(
      function(json) {
        if (json.data.searchEpisodes) {
          var works = json.data.viewer.works.nodes;

          json.data.searchEpisodes.nodes.forEach(function(episode) {
            var workAnnictId = episode.work.annictId;
            for (var i = 0; i < works.length; i++) {
              if (works[i].annictId == workAnnictId) {
                delete episode.work;
                works[i].episodes.nodes = [episode];
                break;
              }
            }
          });

          delete json.data.searchEpisodes;
        }

        watchingWorksJsonCache.set(json);
        watchingWorksJsonCache.save();
        callback();
      },
      watchingWorksJsonCache.get().episodeAnnictIds
    );
  };

  var addWatchingWorksJson = function(work) {
    var works = watchingWorksJsonCache.get().data.viewer.works.nodes;
    for (var i = 0; i < works.length; i++) {
      if (works[i].annictId == work.annictId) {
        return false;
      }
    }

    works.push(work);
    watchingWorksJsonCache.save();
    return true;
  };

  var removeWatchingWorksJson = function(workAnnictId) {
    var works = watchingWorksJsonCache.get().data.viewer.works.nodes;
    for (var i = 0; i < works.length; i++) {
      if (works[i].annictId == workAnnictId) {
        works.splice(i, 1);
        watchingWorksJsonCache.save();
        return true;
      }
    }
    return false;
  };

  var loadChecked = function(target, cache) {
    var value = cache.get();
    target.prop('checked', value == 'true');
  };

  var saveChecked = function(target, cache) {
    var value = target.prop('checked');
    cache.set(value);
    return value;
  };

  var setupWorkReviewEvent = function(target) {
    var id;

    target.click(function() {
      var workHeading = $(this).closest('.work-heading');
      var workTitle = workHeading.find('.work-link').text();
      id = workHeading.data('id');

      $('#review-work-title').text(workTitle);
      $('[name^="review-rating-"][value=""]').click();
      $('#review-body').val('');
      loadChecked($('#review-twitter'), twitterCache);
      loadChecked($('#review-facebook'), facebookCache);

      $('#review-modal').modal();
    });

    $('#review-modal-ok').click(function() {
      var overall = $('[name="review-rating-overall"]:checked').val();
      var animation = $('[name="review-rating-animation"]:checked').val();
      var music = $('[name="review-rating-music"]:checked').val();
      var story = $('[name="review-rating-story"]:checked').val();
      var character = $('[name="review-rating-character"]:checked').val();
      var body = $('#review-body').val();
      var twitter = saveChecked($('#review-twitter'), twitterCache);
      var facebook = saveChecked($('#review-facebook'), facebookCache);

      $('#review-modal').modal('hide');

      api.createReview(
        function(json) {
          /* json.data.createReview.review.work.title */
          headerContent.inform('記録しました。', 'info');
        },
        id, body, overall, animation, music, story, character, twitter, facebook
      );
    });
  };

  var setupEpisodeRecordEvent = function(target) {
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
      loadChecked($('#record-twitter'), twitterCache);
      loadChecked($('#record-facebook'), facebookCache);

      $('#record-modal').modal();
    });

    $('#record-modal-ok').click(function() {
      var rating = $('[name="record-rating"]:checked').val();
      var comment = $('#record-comment').val();
      var twitter = saveChecked($('#record-twitter'), twitterCache);
      var facebook = saveChecked($('#record-facebook'), facebookCache);

      $('#record-modal').modal('hide');

      api.createRecord(
        function(json) {
          var episode = json.data.createRecord.record.episode;
          updateEpisode(episode, workContents);
          headerContent.inform('記録しました。', 'info');
        },
        id, rating, comment, twitter, facebook
      );
    });
  };

  var searchEpisode = function(rootEpisode, episodeKey) {
    var episode = rootEpisode[episodeKey];
    if (episode) {
      while (episode[episodeKey]) {
        episode = episode[episodeKey];
      }
      return episode;
    } else {
      return rootEpisode.work.episodes.nodes[0];
    }
  };

  var setupEpisodeNextPrevEvent = function(target, method, episodeKey, skip) {
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
  };

  var setupUpdateStatusEvent = function(target, state, prefix) {
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

          headerContent.inform('変更しました。', 'info');
        },
        id, state
      );
    });
  };

  var setupEvent = function(template) {

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
        render();
        headerContent.inform('更新しました。', 'info');
      });
    });

    $('#clear').click(function() {
      StorageCache.clear();
      watchingContent.clear();
      searchContent.clear();
      headerContent.inform('クリアしました。', 'info');
    });
  };

  this.addWork = function(work) {
    if (addWatchingWorksJson(work)) {
      render();
    }
  };

  this.removeWork = function(workAnnictId) {
    if (removeWatchingWorksJson(workAnnictId)) {
      render();
    }
  };

  this.getGroupTop = function(initial) {
    return $('#watching-works .group-heading[data-initial="' + initial + '"]').offset().top;
  };

  this.clear = function() {
    watchingWorksJsonCache.remove();
    render();
  };

  this.build = function() {
    setupEvent($('#group-template'));

    if (watchingWorksJsonCache.get().version != version) {
      updateWatchingWorksJson(function(){
        render();
      });
    } else {
      render();
    }
  };
};

$(function() {
  watchingContent.build();
});
