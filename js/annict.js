var version = 1;

var api = new function() {

  var workFields
    = 'id '
    + 'annictId '
    + 'title '
    + 'titleKana '
  ;

  var episodeFields
    = 'id '
    + 'annictId '
    + 'numberText '
    + 'title '
    + 'viewerDidTrack '
  ;

  var watchingWorksQuery
    = 'query($episodeAnnictIds: [Int!], $withEpisodes: Boolean!) { '
    +   'viewer { '
    +     'works(state: WATCHING) { '
    +       'nodes { '
    +          workFields
    +         'episodes(orderBy: {field: SORT_NUMBER, direction: ASC}, first: 1) { '
    +           'nodes { '
    +              episodeFields
    +           '} '
    +         '} '
    +       '} '
    +     '} '
    +   '} '
    +   'searchEpisodes(annictIds: $episodeAnnictIds) @include(if: $withEpisodes) { '
    +     'nodes { '
    +        episodeFields
    +       'work { '
    +         'annictId '
    +       '} '
    +     '} '
    +   '} '
    + '}'
  ;

  var nextEpisodeQuery
    = 'query($id: Int!, $skip: Boolean!) { '
    +   'searchEpisodes(annictIds: [$id]) { '
    +     'nodes { '
    +       'nextEpisode { '
    +         '...episodeFields '
    +         'nextEpisode @include(if: $skip) { '
    +           '...episodeFields '
    +           'nextEpisode { '
    +             '...episodeFields '
    +             'nextEpisode { '
    +               '...episodeFields '
    +               'nextEpisode { '
    +                 '...episodeFields '
    +               '} '
    +             '} '
    +           '} '
    +         '} '
    +       '} '
    +       'work { '
    +         'episodes(orderBy: {field: SORT_NUMBER, direction: ASC}, first: 1) { '
    +           'nodes { '
    +             '...episodeFields '
    +           '} '
    +         '} '
    +       '} '
    +     '} '
    +   '} '
    + '} '
    + 'fragment episodeFields on Episode { '
    +    episodeFields
    + '}'
  ;

  var prevEpisodeQuery
    = 'query($id: Int!, $skip: Boolean!) { '
    +   'searchEpisodes(annictIds: [$id]) { '
    +     'nodes { '
    +       'prevEpisode { '
    +         '...episodeFields '
    +         'prevEpisode @include(if: $skip) { '
    +           '...episodeFields '
    +           'prevEpisode { '
    +             '...episodeFields '
    +             'prevEpisode { '
    +               '...episodeFields '
    +               'prevEpisode { '
    +                 '...episodeFields '
    +               '} '
    +             '} '
    +           '} '
    +         '} '
    +       '} '
    +       'work { '
    +         'episodes(orderBy: {field: SORT_NUMBER, direction: DESC}, first: 1) { '
    +           'nodes { '
    +             '...episodeFields '
    +           '} '
    +         '} '
    +       '} '
    +     '} '
    +   '} '
    + '} '
    + 'fragment episodeFields on Episode { '
    +    episodeFields
    + '}'
  ;

  var createRecordQuery
    = 'mutation($id: ID!, $rating: RatingState, $comment: String, $twitter: Boolean, $facebook: Boolean) { '
    +   'createRecord(input: {episodeId: $id, ratingState: $rating, comment: $comment, shareTwitter: $twitter, shareFacebook: $facebook}) { '
    +     'record { '
    +       'episode { '
    +          episodeFields
    +       '} '
    +     '} '
    +   '} '
    + '}'
  ;

  var createReviewQuery
    = 'mutation($id: ID!, $body: String!, $overall: RatingState, $animation: RatingState, $music: RatingState, $story: RatingState, $character: RatingState, $twitter: Boolean, $facebook: Boolean) { '
    +   'createReview(input: {workId: $id, body: $body, ratingOverallState: $overall, ratingAnimationState: $animation, ratingMusicState: $music, ratingStoryState: $story, ratingCharacterState: $character, shareTwitter: $twitter, shareFacebook: $facebook}) { '
    +     'review { '
    +       'work { '
    +         'title '
    +       '} '
    +     '} '
    +   '} '
    + '}'
  ;

  var updateStatusQuery
    = 'mutation($id: ID!, $state: StatusState!) { '
    +   'updateStatus(input: {workId: $id, state: $state}) { '
    +     'work { '
    +        workFields
    +       'episodes(first: 1, orderBy: {field: SORT_NUMBER, direction: ASC}) { '
    +         'nodes { '
    +            episodeFields
    +         '} '
    +       '} '
    +     '} '
    +   '} '
    + '} '
  ;

  var searchWorksQuery
    = 'query($titles: [String!]!, $before: String, $after: String, $first: Int, $last: Int) { '
    +   'searchWorks(titles: $titles, orderBy: {field: SEASON, direction: DESC}, before: $before, after: $after, first: $first, last: $last) { '
    +     'nodes { '
    +        workFields
    +       'viewerStatusState '
    +     '} '
    +     'pageInfo { '
    +       'startCursor '
    +       'endCursor '
    +       'hasPreviousPage '
    +       'hasNextPage '
    +     '} '
    +   '} '
    + '}'
  ;

  var postQuery = function (success, query, variables) {
    var ajax = function(token, callback) {
      var data = {
        query: query.replace(spaceReg, ' ')
      };

      if (variables) {
        data.variables = variables;
      }

      $.ajax({
        url: 'https://api.annict.com/graphql',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        headers: {
          Authorization: 'bearer ' + token
        },
        data: JSON.stringify(data),
        success: callback,
        error: function(xhr) {
          var message = '';
          if (xhr.responseText) {
              message = ': ';
              try {
                var json = JSON.parse(xhr.responseText);
                if (json.message) {
                  message += json.message;
                }
              } catch(e) {
                message += xhr.responseText;
              }
          }
          alertMessage('Graphql API のリクエストでエラーが発生しました。 (' + xhr.status + message + ')', 'danger', 5000);
        }
      });
    };

    var token = sessionStorage.getItem('token');
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (token) {
      ajax(token, success);
      return;
    }

    $('#token-modal-ok').unbind('click').bind('click', function() {
      var token = $('#token').val();
      if (token) {
        var storage = $('[name="storage"]:checked').val();
        ajax(token, function(json) {
          sessionStorage.removeItem('token');
          localStorage.removeItem('token');

          if (storage == 'session') {
            sessionStorage.setItem('token', token);
          } else if (storage == 'local') {
            localStorage.setItem('token', token);
          }

          if (success) {
            success(json);
          }
        });
      } else {
        alertMessage('アクセストークンを入力してください。', 'danger');
      }
      $('#token-modal').modal('hide');
    });

    $('#token-modal').modal();
  };

  this.watchingWorks = function(success, episodeAnnictIds) {
    var variables = {
      episodeAnnictIds: episodeAnnictIds,
      withEpisodes: (episodeAnnictIds.length > 0)
    };
    postQuery(success, watchingWorksQuery, variables);
  };

  this.prevEpisode = function(success, id, skip) {
    var variables = {
      id: id,
      skip: skip
    };
    postQuery(success, prevEpisodeQuery, variables);
  };

  this.nextEpisode = function(success, id, skip) {
    var variables = {
      id: id,
      skip: skip
    };
    postQuery(success, nextEpisodeQuery, variables);
  };

  this.createReview = function(success, id, body, overall, animation, music, story, character, twitter, facebook) {

    var variables = {
      id: id,
      body: body
    };

    if (overall) {
      variables.overall = overall;
    }
    if (animation) {
      variables.animation = animation;
    }
    if (music) {
      variables.music = music;
    }
    if (story) {
      variables.story = story;
    }
    if (character) {
      variables.character = character;
    }
    if (twitter) {
      variables.twitter = twitter;
    }
    if (facebook) {
      variables.facebook = facebook;
    }

    postQuery(success, createReviewQuery, variables);
  };

  this.createRecord = function(success, id, rating, comment, twitter, facebook) {

    var variables = {
      id: id
    };

    if (rating) {
      variables.rating = rating;
    }
    if (comment) {
      variables.comment = comment;
    }
    if (twitter) {
      variables.twitter = twitter;
    }
    if (facebook) {
      variables.facebook = facebook;
    }

    postQuery(success, createRecordQuery, variables);
  };

  this.updateStatus = function(success, id, status) {
    var variables = {
      id: id,
      state: status
    };
    postQuery(success, updateStatusQuery, variables);
  };

  this.searchWorks = function(success, titles, before, after) {

    var elements = 20;

    var variables = {
      titles: titles,
      before: before,
      after: after
    };

    if (before) {
      variables.last = elements;
    } else {
      variables.first = elements;
    }

    postQuery(success, searchWorksQuery, variables);
  };

};

var watchingWorksJson;
var searchWorksJson;
var spaceReg = /[\s　]+/g;

function updateWatchingWorksJson(callback) {
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

      watchingWorksJson = json;
      saveWatchingWorksJson();
      callback();
    },
    watchingWorksJson.episodeAnnictIds
  );
}

function loadWatchingWorksJson() {
  var item = localStorage.getItem('watchingWorks');
  if (item) {
    watchingWorksJson = JSON.parse(item);
    return;
  }

  watchingWorksJson = {
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

var altReg = /^ゔ[ぁぃぅぇぉ]?|^ヴ[ァィゥェォ]?/;
var altDic = {
  'ゔぁ': 'ば', 'ゔぃ': 'び', 'ゔ': 'ぶ', 'ゔぅ': 'ぶ', 'ゔぇ': 'べ', 'ゔぉ': 'ぼ',
  'ヴァ': 'バ', 'ヴィ': 'ビ', 'ヴ': 'ブ', 'ヴゥ': 'ブ', 'ヴェ': 'ベ', 'ヴォ': 'ボ'
};
var altRep = function(match) {
  return altDic[match];
};

function saveWatchingWorksJson() {

  watchingWorksJson.data.viewer.works.nodes.sort(function(a, b) {
    var title1 = a.titleKana ? a.titleKana.replace(altReg, altRep) : a.title.replace(altReg, altRep);
    var title2 = b.titleKana ? b.titleKana.replace(altReg, altRep) : b.title.replace(altReg, altRep);

    if (title1 < title2) {
      return -1;
    } else if (title1 > title2) {
      return 1;
    }
    return 0;
  });

  watchingWorksJson.episodeAnnictIds = [];
  watchingWorksJson.data.viewer.works.nodes.forEach(function(work) {
    var episodes = work.episodes.nodes;
    if (episodes.length > 0) {
      watchingWorksJson.episodeAnnictIds.push(episodes[0].annictId);
    }
  });

  watchingWorksJson.version = version;

  setTimeout(function() {
    localStorage.setItem('watchingWorks', JSON.stringify(watchingWorksJson));
  }, 0);
}

function addWatchingWorksJson(work) {
  var works = watchingWorksJson.data.viewer.works.nodes;
  for (var i = 0; i < works.length; i++) {
    if (works[i].annictId == work.annictId) {
      return false;
    }
  }

  watchingWorksJson.data.viewer.works.nodes.push(work);
  saveWatchingWorksJson();
  return true;
}

function removeWatchingWorksJson(workAnnictId) {
  var works = watchingWorksJson.data.viewer.works.nodes;
  for (var i = 0; i < works.length; i++) {
    if (works[i].annictId == workAnnictId) {
      works.splice(i, 1);
      saveWatchingWorksJson();
      return true;
    }
  }
  return false;
}

function loadSearchWorksJson() {
  var item = localStorage.getItem('searchWorks');
  if (item) {
    searchWorksJson = JSON.parse(item);
    return;
  }

  searchWorksJson = {
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

function saveSearchWorksJson() {
  searchWorksJson.version = version;

  setTimeout(function() {
    localStorage.setItem('searchWorks', JSON.stringify(searchWorksJson));
  }, 0);
}

function clearSearchWorksJson() {
  localStorage.removeItem('searchWorks');
  loadSearchWorksJson();
  saveSearchWorksJson();
}

function clearStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

function alertMessage(message, type, delay) {
  var alert = $('#alert');
  var alertBg = alert.find('#alert-bg');
  var oldBg = alertBg.data('bg');
  var newBg = 'bg-' + type;
  alertBg.removeClass(oldBg).addClass(newBg).data('bg', newBg);
  alert.find('#alert-message').text(message);

  alert.show('fast', function() {
    setTimeout(function() {
      alert.click();
    }, delay ? delay : 2500);
  });
}


$(function() {
  $('#alert').click(function() {
    $(this).hide('fast');
  });
});

loadWatchingWorksJson();
