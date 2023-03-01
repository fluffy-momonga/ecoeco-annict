var dialogContent = new function() {

  var twitterCache = new StorageCache('twitter');
  var facebookCache = new StorageCache('facebook');

  var loadChecked = function(target, cache) {
    var value = cache.get();
    target.prop('checked', value == 'true');
  };

  var saveChecked = function(target, cache) {
    var value = target.prop('checked');
    cache.set(value);
    return value;
  };

  var clearReview = function() {
    $('[name^="review-rating-"][value=""]').trigger('click');
    $('#review-body').val('');
  };

  var clearRecord = function() {
    $('[name="record-rating"][value=""]').trigger('click');
    $('#record-comment').val('');
  };

  var Dialog = $.extend(
    function(id) {
      this.id = id;
      this.dialog = null;
      this.callback = null;
    }.prototype,
    {
      build: function() {
        this.dialog = $(this.id);
        this.dialog.find('button.btn-success').on('click', this.execute.bind(this));
      },

      display: function() {
        this.show();
      },

      execute: function() {
        this.hide();
      },

      show: function() {
        this.dialog.modal();
      },

      hide: function() {
        this.dialog.modal('hide');
      }
    }
  ).constructor;

  var inputTokenDialog = new (
    Object.setPrototypeOf(
      $.extend(
        function(id) {
          Dialog.call(this, id);
        }.prototype,
        {
          display: function(callback) {
            this.callback = callback;
            this.show();
          },

          execute: function() {
            var token = $('#token').val();
            var storage = $('[name="storage"]:checked').val();

            this.hide();

            if (token) {
              this.callback(storage, token);
            } else {
              headerContent.inform('アクセストークンを入力してください。', 'danger');
            }
          }
        }
      ),
      Dialog.prototype
    )
  ).constructor('#token-modal');

  var createRecordDialog = new (
    Object.setPrototypeOf(
      $.extend(
        function(id) {
          Dialog.call(this, id);
          this.episodeId = null;
        }.prototype,
        {
          display: function(callback, workHref, workTitle, episodeHref, episodeNumber, episodeTitle, episodeId) {
            this.callback = callback;

            if (episodeId != this.episodeId) {
              clearRecord();
              this.episodeId = episodeId;
            }

            $('#record-work-link').attr('href', workHref).text(workTitle);
            $('#record-episode-link').attr('href', episodeHref);
            $('#record-episode-number').text(episodeNumber);
            $('#record-episode-title').text(episodeTitle);
            loadChecked($('#record-twitter'), twitterCache);
            loadChecked($('#record-facebook'), facebookCache);

            this.show();
          },

          execute: function() {
            var rating = $('[name="record-rating"]:checked').val();
            var comment = $('#record-comment').val();
            var twitter = saveChecked($('#record-twitter'), twitterCache);
            var facebook = saveChecked($('#record-facebook'), facebookCache);

            this.hide();

            annict.createRecord(this.success.bind(this), this.episodeId, rating, comment, twitter, facebook);
          },

          success: function(json) {
            this.callback(json);
            clearRecord();
            headerContent.inform('記録しました。', 'info');
          }
        }
      ),
      Dialog.prototype
    )
  ).constructor('#record-modal');

  var createReviewDialog = new (
    Object.setPrototypeOf(
      $.extend(
        function(id) {
          Dialog.call(this, id);
          this.workId = null;
        }.prototype,
        {
          display: function(workHref, workTitle, workId) {
            if (workId != this.workId) {
              clearReview();
              this.workId = workId;
            }

            $('#review-work-link').attr('href', workHref).text(workTitle);
            loadChecked($('#review-twitter'), twitterCache);
            loadChecked($('#review-facebook'), facebookCache);

            this.show();
          },

          execute: function() {
            var overall = $('[name="review-rating-overall"]:checked').val();
            var animation = $('[name="review-rating-animation"]:checked').val();
            var music = $('[name="review-rating-music"]:checked').val();
            var story = $('[name="review-rating-story"]:checked').val();
            var character = $('[name="review-rating-character"]:checked').val();
            var body = $('#review-body').val();
            var twitter = saveChecked($('#review-twitter'), twitterCache);
            var facebook = saveChecked($('#review-facebook'), facebookCache);

            this.hide();

            annict.createReview(this.success, this.workId, body, overall, animation, music, story, character, twitter, facebook);
          },

          success: function(json) {
            clearReview();
            headerContent.inform('記録しました。', 'info');
          }
        }
      ),
      Dialog.prototype
    )
  ).constructor('#review-modal');

  var updateStatusDialog = new (
    Object.setPrototypeOf(
      $.extend(
        function(id) {
          Dialog.call(this, id);
          this.workId = null;
          this.state = null;
        }.prototype,
        {
          display: function(callback, state, name, workHref, workTitle, workId) {
            this.callback = callback;
            this.workId = workId;
            this.state = state;

            $('#status-work-link').attr('href', workHref).text(workTitle);
            $('#status-modal-name').text(name);
            $('#status-modal-ok').text(name);

            this.show();
          },

          execute: function() {
            this.hide();
            annict.updateStatus(this.success.bind(this), this.workId, this.state);
          },

          success: function(json) {
            this.callback(this.workId, this.state);
            headerContent.inform('変更しました。', 'info');
          }
        }
      ),
      Dialog.prototype
    )
  ).constructor('#status-modal');

  var setupRating = function() {
    var rating = $('#rating-template > *').clone(false, false);

    $('.rating').append(rating).each(function() {
      var name = $(this).data('name');
      $(this).find('input').attr('name', name);
    });
  };

  this.inputTokenDialog = inputTokenDialog;
  this.createRecordDialog = createRecordDialog;
  this.createReviewDialog = createReviewDialog;
  this.updateStatusDialog = updateStatusDialog;

  this.build = function() {
    inputTokenDialog.build();
    createRecordDialog.build();
    createReviewDialog.build();
    updateStatusDialog.build();
    setupRating();
  };
};

$(function() {
  dialogContent.build();
});
