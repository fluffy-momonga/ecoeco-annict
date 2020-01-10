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
