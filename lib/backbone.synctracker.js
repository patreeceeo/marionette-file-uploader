(function() {
'use strict';

//Save a reference to the global object (`window` in the browser, `exports`
// on the server).
var root = this;
var ajaxSync = Backbone.sync;

Backbone.sync = function(method, model, options, error) {
    var me = this;
    var is_model = false;

    if ('set' in this) {
       is_model = true;
    };

    this.trigger('before:sync');

    if (this.hasOwnProperty('beforeSync')) {
        this.beforeSync();
    }

    if (is_model) {
        this.set('fetched', false);
    }
    else {
        this.fetched = false;

        this.each(function(model) {
            model.set('fetched', false);
        });
    }

    var deferred = ajaxSync.call(this, method, model, options, error);

    deferred.then(function() {
        if (is_model) {
            me.set('fetched', true);
        }
        else {
            me.fetched = true;

            me.each(function(m) {
                m.set('fetched', true);
            });
        }

        me.trigger('after:sync');

        if (me.hasOwnProperty('afterSync')) {
            me.afterSync();
        }
    });

    return deferred;
}

}).call(this);
