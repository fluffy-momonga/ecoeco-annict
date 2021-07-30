var annict = new function() {
  var domain = 'annict.com';
  var endpoint = 'https://api.' + domain + '/graphql';
  var searchResults = 20;
  var spaceRegExp = /[\s　]+/g;
  var tokenCache = new StorageCache('token');

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

  var makeWorkPageUrl = function(workAnnictId) {
    return 'https://' + domain + '/works/' + workAnnictId;
  };

  var makeEpisodePageUrl = function(workAnnictId, episodeAnnictId) {
    return 'https://' + domain + '/works/' + workAnnictId + '/episodes/' + episodeAnnictId;
  };

  var ajaxError = function(xhr) {
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
    headerContent.inform('Graphql API のリクエストでエラーが発生しました。 (' + xhr.status + message + ')', 'danger', 5000);
  };

  var postQuery = function(success, query, variables, token) {
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
      success: success,
      error: ajaxError
    });
  };

  var request = function (success, query, variables) {
    var token = tokenCache.useLocalStorage().get();
    if (!token) {
      token = tokenCache.useSessionStorage().get();
    }

    if (token) {
      postQuery(success, query, variables, token);
      return;
    }

    dialogContent.inputTokenDialog.display(
      function(storage, token) {
        postQuery(
          function(json) {
            if (storage == 'session') {
              tokenCache.useSessionStorage().set(token);
            } else if (storage == 'local') {
              tokenCache.useLocalStorage().set(token);
            }
            success(json);
          },
          query, variables, token
        );
      }
    );
  };

  this.watchingWorks = function(success, episodeAnnictIds) {
    var variables = {
      episodeAnnictIds: episodeAnnictIds,
      withEpisodes: (episodeAnnictIds.length > 0)
    };
    request(success, watchingWorksQuery, variables);
  };

  this.prevEpisode = function(success, id, skip) {
    var variables = {
      id: id,
      skip: skip
    };
    request(success, prevEpisodeQuery, variables);
  };

  this.nextEpisode = function(success, id, skip) {
    var variables = {
      id: id,
      skip: skip
    };
    request(success, nextEpisodeQuery, variables);
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

    request(success, createReviewQuery, variables);
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

    request(success, createRecordQuery, variables);
  };

  this.updateStatus = function(success, id, state) {
    var variables = {
      id: id,
      state: state
    };
    request(success, updateStatusQuery, variables);
  };

  this.searchWorks = function(success, title, before, after) {

    var titles = title.split(spaceRegExp);

    if (titles.length == 0 || !titles[0]) {
      headerContent.inform('タイトルを入力してください。', 'danger');
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

    request(success, searchWorksQuery, variables);
  };

  this.request = request;
  this.makeWorkPageUrl = makeWorkPageUrl;
  this.makeEpisodePageUrl = makeEpisodePageUrl;
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
      this.work.titleKana = this.work.titleKana.replace(this.altRegExp, this.alternate.bind(this));
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
