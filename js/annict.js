var version = 1;

var StorageCache = $.extend(
  $.extend(
    function(key) {
      this.key = key;
      this.useLocalStorage();
    }.prototype,
    {
      get: function() {
        return this.storage.getItem(this.key);
      },

      set: function(item) {
        this.storage.setItem(this.key, item);
      },

      remove: function() {
        this.storage.removeItem(this.key);
      },

      useLocalStorage: function() {
        this.storage = localStorage;
        return this;
      },

      useSessionStorage: function() {
        this.storage = sessionStorage;
        return this;
      }
    }
  ).constructor,
  {
    clear: function() {
      localStorage.clear();
      sessionStorage.clear();
    }
  }
);

var JsonCache = Object.setPrototypeOf(
  $.extend(
    function(key) {
      StorageCache.call(this, key);
      this.load();
    }.prototype,
    {
      get: function() {
        return this.json;
      },

      set: function(json) {
        this.json = json;
      },

      remove: function() {
        StorageCache.prototype.remove.call(this);
        this.json = this.getDefault();
      },

      load: function() {
        var item = StorageCache.prototype.get.call(this);
        if (item) {
          try {
              this.json = JSON.parse(item);
              return;
          } catch (e) {
          }
        }
        this.json = this.getDefault();
      },

      save: function() {
        this.json.version = version;
        setTimeout(function() {
          StorageCache.prototype.set.call(this, JSON.stringify(this.json));
        }.bind(this), 0);
      },

      getDefault: function() {
        return {};
      }
    }
  ),
  StorageCache.prototype
).constructor;

var api = new function() {
  var endpoint = 'https://api.annict.com/graphql';
  var searchResults = 20;
  var spaceRegExp = /[\s　]+/g;

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

  var tokenCache = new StorageCache('token');

  var postQuery = function (success, query, variables) {
    var ajax = function(token, callback) {
      var data = {
        query: query.replace(spaceRegExp, ' ')
      };

      if (variables) {
        data.variables = variables;
      }

      $.ajax({
        url: endpoint,
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
              } catch (e) {
                message += xhr.responseText;
              }
          }
          alertMessage('Graphql API のリクエストでエラーが発生しました。 (' + xhr.status + message + ')', 'danger', 5000);
        }
      });
    };

    var token = tokenCache.useLocalStorage().get();
    if (!token) {
      token = tokenCache.useSessionStorage().get();
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
          if (storage == 'session') {
            tokenCache.useSessionStorage().set(token);
          } else if (storage == 'local') {
            tokenCache.useLocalStorage().set(token);
          }
          success(json);
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

  this.searchWorks = function(success, title, before, after) {

    var titles = title.split(spaceRegExp);

    if (titles.length == 0 || !titles[0]) {
      alertMessage('タイトルを入力してください。', 'danger');
      return;
    }

    var variables = {
      titles: titles,
      before: before,
      after: after
    };

    if (before) {
      variables.last = searchResults;
    } else {
      variables.first = searchResults;
    }

    postQuery(success, searchWorksQuery, variables);
  };
};

var TitleNormalizer = $.extend(
  function(work) {
    this.work = work;
    this.normalize();
  }.prototype,
  {
    katakanaRegExp: /[ァ-ヶ]/g,
    altRegExp: /^ゔ[ぁぃぅぇぉ]?/,
    altHash: {'ゔぁ': 'ば', 'ゔぃ': 'び', 'ゔ': 'ぶ', 'ゔぅ': 'ぶ', 'ゔぇ': 'べ', 'ゔぉ': 'ぼ'},

    normalize: function() {
      if (!this.work.titleKana) {
        this.work.titleKana = this.work.title.replace(this.katakanaRegExp, this.toHiragana);
      }
      this.work.titleKana = this.work.titleKana.replace(this.altRegExp, this.alternate);
    },

    toHiragana: function(target) {
      var code = target.charCodeAt(0) - 0x60;
      return String.fromCharCode(code);
    },

    alternate: function(target) {
      return this.altHash[target];
    },

    getKana: function() {
      return this.work.titleKana;
    },

    compare: function(another) {
      var kana1 = this.getKana();
      var kana2 = another.getKana();

      if (kana1 < kana2) {
        return -1;
      } else if (kana1 > kana2) {
        return 1;
      } else {
        return 0;
      }
    }
  }
).constructor;

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

      watchingWorksJsonCache.set(json);
      watchingWorksJsonCache.save();
      callback();
    },
    watchingWorksJsonCache.get().episodeAnnictIds
  );
}

function addWatchingWorksJson(work) {
  var works = watchingWorksJsonCache.get().data.viewer.works.nodes;
  for (var i = 0; i < works.length; i++) {
    if (works[i].annictId == work.annictId) {
      return false;
    }
  }

  works.push(work);
  watchingWorksJsonCache.save();
  return true;
}

function removeWatchingWorksJson(workAnnictId) {
  var works = watchingWorksJsonCache.get().data.viewer.works.nodes;
  for (var i = 0; i < works.length; i++) {
    if (works[i].annictId == workAnnictId) {
      works.splice(i, 1);
      watchingWorksJsonCache.save();
      return true;
    }
  }
  return false;
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
