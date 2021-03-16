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

  var template = null;

  var createWorkHeading = function(work) {
    var href = annict.makeWorkPageUrl(work.annictId);
    var workHeading = template.find('.work-heading').clone(true, true);
    workHeading.removeData().attr('data-id', work.id).attr('data-annict-id', work.annictId);
    workHeading.find('.work-link').attr('href', href).text(work.title);
    return workHeading;
  };

  var createEpisodeBody = function(episode, work) {

    var episodeBody = template.find('.episode-body').clone(true, true);

    if (!episode) {
      return episodeBody.empty();
    }

    episodeBody.removeData().attr('data-id', episode.id).attr('data-annict-id', episode.annictId);

    var href = annict.makeEpisodePageUrl(work.annictId, episode.annictId);
    var record = episodeBody.find('.episode-record');
    var title = episodeBody.find('.episode-title').text(episode.title ? episode.title : '');
    episodeBody.find('.episode-link').attr('href', href);
    episodeBody.find('.episode-number').text(episode.numberText ? episode.numberText : '--');

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
        var groupContents = template.find('.group-heading, .group-body').clone(false, false);
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

    headerContent.updateBodyTop();
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
    annict.watchingWorks(
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

  var removeWatchingWorksJson = function(workId) {
    var works = watchingWorksJsonCache.get().data.viewer.works.nodes;
    for (var i = 0; i < works.length; i++) {
      if (works[i].id == workId) {
        works.splice(i, 1);
        watchingWorksJsonCache.save();
        return true;
      }
    }
    return false;
  };

  var removeWork = function(workId) {

    removeWatchingWorksJson(workId);

    var workHeading = $('#watching-works .work-heading[data-id="' + workId + '"]');

    if (workHeading.length != 0) {
      var works = workHeading.closest('.works');
      workHeading.next('.episode-body').remove();
      workHeading.remove();

      if (works.find('.work-heading').length == 0) {
        var groupBody = works.closest('.group-body');
        var groupHeading = groupBody.prev('.group-heading');
        var initial = groupHeading.data('initial');

        groupHeading.remove();
        groupBody.remove();

        headerContent.toggleInitial(initial, false);
        headerContent.updateBodyTop();
      }
    }
  };

  var setupWorkReviewEvent = function(target) {
    target.click(function() {
      var workHeading = $(this).closest('.work-heading');
      var workTitle = workHeading.find('.work-link').text();
      var workId = workHeading.data('id');
      dialogContent.createReviewDialog.display(workTitle, workId);
    });
  };

  var setupEpisodeRecordEvent = function(target) {
    target.click(function() {
      var workContents = $(this).closest('.episode-body').prev('.work-heading').andSelf();
      var workTitle = workContents.find('.work-link').text();
      var episodeNumber = workContents.find('.episode-number').text();
      var episodeTitle = workContents.find('.episode-title').text();
      var episodeId = workContents.filter('.episode-body').data('id');

      dialogContent.createRecordDialog.display(
        function(json) {
          var episode = json.data.createRecord.record.episode;
          updateEpisode(episode, workContents);
        },
        workTitle, episodeNumber, episodeTitle, episodeId
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
          var nodes = json.data.searchEpisodes.nodes;
          if (nodes && nodes.length != 0) {
            var episode = searchEpisode(nodes[0], episodeKey);
            updateEpisode(episode, workContents);
          }
        },
        annictId, skip
      );
    });
  };

  var setupUpdateStatusEvent = function(target, state, name) {
    target.click(function() {
      var workHeading = $(this).closest('.work-heading');
      var workId = workHeading.data('id');
      var workTitle = workHeading.find('.work-link').text();

      dialogContent.updateStatusDialog.display(
        function(id, state) {
          removeWork(id);
          searchContent.updateWorkStatus(id, state);
        },
        state, name, workTitle, workId
      );
    });
  };

  var setupEvent = function() {

    setupUpdateStatusEvent(template.find('.work-watched'), 'WATCHED', '見た');
    setupUpdateStatusEvent(template.find('.work-hold'), 'ON_HOLD', '一時中断');
    setupUpdateStatusEvent(template.find('.work-stop'), 'STOP_WATCHING', '視聴中止');

    setupWorkReviewEvent(template.find('.work-review'));
    setupEpisodeRecordEvent(template.find('.episode-record'));

    setupEpisodeNextPrevEvent(template.find('.episode-skip-prev'), annict.prevEpisode, 'prevEpisode', true);
    setupEpisodeNextPrevEvent(template.find('.episode-prev'), annict.prevEpisode, 'prevEpisode', false);
    setupEpisodeNextPrevEvent(template.find('.episode-next'), annict.nextEpisode, 'nextEpisode', false);
    setupEpisodeNextPrevEvent(template.find('.episode-skip-next'), annict.nextEpisode, 'nextEpisode', true);

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

  this.removeWork = removeWork;

  this.getGroups = function() {
    return groups;
  };

  this.getGroupTop = function(initial) {
    var watchingWorks = $('#watching-works');
    var groupHeadingFirstTop = watchingWorks.find('.group-heading:first').offset().top;
    var initialTop = watchingWorks.find('.group-heading[data-initial="' + initial + '"]').offset().top;
    return initialTop - groupHeadingFirstTop;
  };

  this.clear = function() {
    watchingWorksJsonCache.remove();
    render();
  };

  this.build = function() {
    template = $('#watching-template');
    setupEvent();

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
