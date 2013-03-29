
var FileManager = (function(Backbone, Marionette) {
    "use strict";

    // This is the primary Marionette application that will control all of
    // our regions on the site
    var FileManager = new Backbone.Marionette.Application();

    FileManager.route_root = "/";

    // most href clicks should trigger backbone routing
    $(document).on("click", "a:not([data-bypass])", function(evt) {
        var href, root;
        href = {
            prop: $(this).prop("href")
            , attr: $(this).attr("href")
        };

        root = location.protocol + "//" + location.host + FileManager.route_root;

        if (href.prop && href.prop.slice(0, root.length) === root) {
            evt.preventDefault();

            return Backbone.history.navigate(href.attr, {
                trigger: true
            });
        }
    });

    // We're templating with hogan
    Marionette.TemplateCache.prototype.compileTemplate = function (raw) {
        var compiled = Hogan.compile(raw);
        return function (data) {
            return compiled.render(data);
        };
    };

    FileManager.addRegions({
        main_region: "#main"
    });

    FileManager.BaseLayout = Marionette.Layout.extend({
        serializeData: function () {
            var data = Marionette.Layout.prototype.serializeData.call(this); 

            var gms = Marionette.getOption(this, 'getMethods');
            var that = this;

            _.each(gms, function (gm) {
                data[gm.attribute] = gm.method.call(that);
            });

            return data;
        }
    });

    FileManager.FileView = FileManager.BaseLayout.extend({
        template: "#file-template"
        , tagName: "tr"
        , initialize: function () {
            this.progress = new FileManager.Progress({
                finish: this.model.get("size")
            });
            this.progress_view = new FileManager.ProgressView({
                model: this.progress
            });
            Marionette.Layout.prototype.initialize.apply(this, arguments);
        }
        , regions: {
            progress_region: ".progress-container"
        }
        , onRender: function () {
            this.progress_region.show(this.progress_view);
        }
        , events: {
            "click .cancel-file-button": "cancel"
            , "click .start-file-button": "start"
            , "click .delete-file-button": "delete"
        }
        , start: function () {
            this.model.upload();
        }
        , cancel: function () {
            this.model.cancel();
            this.progress.reset();
            this.model.collection.remove(this.model);
            this.close();
        }
        , delete: function () {
            if(window.confirm("Are you really really sure you want to delete "+this.model.get("name")+"?")) {
                this.model.cancel();
                this.model.collection.remove(this.model);
                this.close();
            }
        }
        , modelEvents: {
            "change:is_uploaded": "render"
            , file_chunk_done: "file_chunk_done"
            , file_chunk_undone: "file_chunk_undone"
        }
        , file_chunk_done: function (chunk_size) {
            this.progress.increment("rabbit", chunk_size); 
        }
        , file_chunk_undone: function (chunk_size) {
            this.progress.increment("rabbit", -chunk_size);
        }
        , getMethods: [
            {
                attribute: 'is_image'
                , method: function () {
                    return this.model.is_image();
                }
            }
            , {
                attribute: 'is_text'
                , method: function () {
                    return this.model.is_text();
                }
            }
            , {
                attribute: 'text'
                , method: function () {
                    return this.model.get_text();
                }
            }
            , {
                attribute: 'text_preview'
                , method: function () {
                    return this.model.get_text().substring(0, 140) + '…';
                }
            }
        ]
    });


    FileManager.FilesView = Marionette.CompositeView.extend({
        itemView: FileManager.FileView
        , tagName: "tbody"
        , loadingView: FileManager.LoadingView
        , emptyView: FileManager.EmptyView
        , template: "#files-template"
    });


    FileManager.ProgressView = Marionette.ItemView.extend({
        className: "fileupload-progress"
        , template: "#progress-template"
        , ui: {
            bar: ".bar"
        }
        , modelEvents: {
            "change:rabbit": "rabbit_moved"
            , "change:finish": "finish_moved"
        }
        , finish_moved: function () {
            this.adjust_bar_width();
        }
        , rabbit_moved: function () {
            this.adjust_bar_width();
        }
        , adjust_bar_width: function () {
            var start = this.model.get("start");
            var finish = this.model.get("finish");
            var rabbit = this.model.get("rabbit");
            var percent_finished = ((rabbit - start) / finish) * 100;
            this.$(".bar").width(percent_finished+"%");
        }
    });

    var Format = {
        rate: function (bps) {
            if (typeof bps !== 'number') {
                return '';
            }
            if (bps >= 1000000000) {
                return (bps / 1000000000).toFixed(2) + ' Gbit/s';
            }
            if (bps >= 1000000) {
                return (bps / 1000000).toFixed(2) + ' Mbit/s';
            }
            if (bps >= 1000) {
                return (bps / 1000).toFixed(2) + ' Kbit/s';
            }
            return bps.toFixed(2) + ' bit/s';
        }
        , time: function (seconds) {
            var date = new Date(seconds * 1000),
                days = parseInt(seconds / 86400, 10);
            days = days ? days + 'd ' : '';
            return days +
                ('0' + date.getUTCHours()).slice(-2) + ':' +
                ('0' + date.getUTCMinutes()).slice(-2) + ':' +
                ('0' + date.getUTCSeconds()).slice(-2);
        }
        , size: function (bytes) {
            if (typeof bytes !== 'number') {
                return '';
            }
            if (bytes >= 1000000000) {
                return (bytes / 1000000000).toFixed(2) + ' GB';
            }
            if (bytes >= 1000000) {
                return (bytes / 1000000).toFixed(2) + ' MB';
            }
            return (bytes / 1000).toFixed(2) + ' KB';
        }
    };

    FileManager.ProgressNumbersView = Marionette.ItemView.extend({
        template: "#progress-numbers-template"
        , modelEvents: {
            "change:rabbit": "render"
        }
        , serializeData: function () {
            var start = this.model.get("start") || 1;
            var finish = this.model.get("finish") || 1;
            var rabbit = this.model.get("rabbit") || 1;
            var rate = 100;
            var data = {
                rate: Format.rate(rate)
                , time: Format.time((finish - rabbit) * 8 / rate)
                , percent_finished: (rabbit / finish * 100).toFixed(2)
                , amount_finished: Format.size(rabbit)
                , finish: Format.size(finish)
            };
            return data;
        }
    });
        

    FileManager.Layout = Marionette.Layout.extend({
        template: "#file-manager-template"
        , className: "row"
        , initialize: function (options) {
            this.collection = options && options.files || new FileManager.Files([], {
                // global_progress: this.global_progress

            });
            this.global_progress = new FileManager.Progress({
                finish: this.collection.total_size()
            });
            this.files_view = new FileManager.FilesView({
                collection: this.collection
            });
            this.progress_view = new FileManager.ProgressView({
                model: this.global_progress
            });
            this.progress_numbers_view = new FileManager.ProgressNumbersView({
                model: this.global_progress
            });
            Marionette.Layout.prototype.initialize.call(this, options);
        }
        , serializeData: function () {
            return {
                files_are_uploaded: this.collection.are_uploaded()
            }
        }
        , regions: {
            files_region: "#files"
            , progress_region: "#global-progress"
            , progress_numbers_region: "#progress-numbers"
        }
        , onRender: function () {
            this.files_region.show(this.files_view);
            this.progress_region.show(this.progress_view);
            this.progress_numbers_region.show(this.progress_numbers_view);
        }
        , events: {
            "change #file-input": "files_added"
            , "click #start-button": "start_upload"
            , "click #cancel-button": "cancel_upload"
            , "click #delete-button": "delete_files"
        }
        , files_added: function (e) {
            var files = e.target.files;
            var that = this;
            _.each(files, function (file) { 
                console.log('type', file.type);
                var file_model = that.collection.create ({
                    name: file.name
                    , size: file.size
                    , type: file.type
                    , lastModifiedDate: file.lastModifiedDate
                });
                that.global_progress.increment("finish", file.size);

                if(file_model.is_image()) {
                    console.log('its an image!');
                    loadImage(file, function (img) {
                        var data = $(img).attr('src');
                        file_model.set('data', data);
                        that.files_view.render();
                    }, {
                        noRevoke: true
                    });
                }

            });
            $("form")[0].reset();
        }
        , start_upload: function () {
            var that = this;
            this.collection.upload({
                success: function () {
                    window.setTimeout(function () {
                        $("#global-progress").hide();
                        $("#progress-numbers").hide();
                    }, 1000);
                }
            });
        }
        , cancel_upload: function () {
            this.collection.cancel();
            this.collection.reset();
        }
        , delete_files: function () {
            if(window.confirm("Are you really really sure you want to delete ALL the files?")) {
                this.collection.delete();
            }
        }
        , collectionEvents: {
            file_chunk_done: "file_chunk_done"
            , file_chunk_undone: "file_chunk_undone"
            , file_chunk_canceled: "file_chunk_canceled"
            , file_done: "render"
        }
        , file_chunk_done: function (chunk_size) {
            this.global_progress.increment("rabbit", chunk_size);
        }
        , file_chunk_undone: function (chunk_size) {
            this.global_progress.increment("rabbit", -chunk_size);
        }
        , file_chunk_canceled: function (chunk_size) {
            this.global_progress.increment("finish", -chunk_size);
        }
    });

    FileManager.Model = Backbone.Model.extend({
        increment: function (attr, value) {
            this.set(attr, this.get(attr) + value)
        }
    });

    FileManager.Collection = Backbone.Collection.extend({
        initialize: function(models, options) {
            Backbone.Collection.prototype.initialize.call(this, models, options);
            this._meta = {};
            _.extend(this._meta, options);
        }
        , meta: function(prop, value) {
            if (value === undefined) {
                if(_.isObject(prop)) {
                    _.each(prop, function (value, prop) {
                        this.meta(prop, value);
                    }, this);
                } else {
                    return this._meta[prop];
                }
            } else {
                this._meta[prop] = value;
            }
        }
    });

    FileManager.File = Backbone.Model.extend({
        base_url: '/api/files'
        , url: '/' // just to make backbone happy for now
        , defaults: {
            is_uploaded: false
            , data: ''
        }
        , initialize: function (attributes, options) {
            Backbone.Model.prototype.initialize.call(this, attributes, options);
            if(attributes.data) {
                this.set_data_attributes(attributes.data);
            }
        }
        , set_data_attributes: function (data) {
            if(!this.has('size')) {
                this.set('size', data.length, {silent: true});
            }
            if(!this.has('type')) {
                var type = 'text/plain';
                var matches = data.match(/data:(\w+\/\w+);/);
                if(matches) {
                    type = matches[1];
                }
                this.set('type', type);
            }
        }
        , set: function (key, value) {
            Backbone.Model.prototype.set.apply(this, arguments);
            if(key == 'data') {
                this.set_data_attributes(value);
            }
        }
        , upload: function (options) {
            var that = this;
            var chunk_size = 2500;
            var count = 0;
            options && options.ready && options.ready();
            this.interval_id = window.setInterval(function () {
                count += chunk_size;
                that.set("amount_done", count);
                that.trigger("file_chunk_done", chunk_size);
                if(count >= that.get("size")) {
                    window.clearInterval(that.interval_id);
                    window.setTimeout(function () {
                        that.set("is_uploaded", true);
                    }, 1000);
                    options && options.success && options.success();
                }
            }, 100); 
        }
        , cancel: function () {
            this.trigger("file_chunk_undone", this.get("amount_done"));
            this.trigger("file_chunk_canceled", this.get("amount_done"));
            this.set("amount_done", 0);
            window.clearInterval(this.interval_id);
        }
        , is_uploaded: function () {
            // return this.get("upload_progress").is_finished();
            return this.get("is_uploaded");
        }
        , is_image: function () {
            var type = this.get('type');
            return type === 'image/jpeg' || type === 'image/png' || type == 'image/gif';
        }
        , is_text: function () {
            var type = this.get('type');
            return type === 'text/plain';
        }
        , download: function () {
        }
        , save: function () {
        }
        , get_text: function () {
            var data = this.get('data')
                , index = Math.max(data.indexOf(';'), data.indexOf(',')+1);
            return data.substring(index);
        }
    });

    FileManager.Files = FileManager.Collection.extend({
        base_url: "/api/files"
        , url: "/" // just to make backbone happy for now
        , model: FileManager.File
        , total_size: function () {
            return this.reduce(function (memo, file) {
                return memo + file.get("size");
            }, 0);
        }
        , upload: function (options) {
            var that = this;
            var count = 0;
            _.each(this.models, function (file) {
                file.upload({
                    success: function () {
                        count++;
                        if(count === that.models.length) {
                            options && options.success && options.success();
                            that.meta("are_uploaded", true);
                        }
                    }
                });
            });
        }
        , cancel: function () {
            _.each(this.models, function (file) {
                file.cancel();
            });
            this.meta("are_uploaded", false);
        }
        , delete: function () {
            this.cancel();
            this.reset();
        }
        , are_uploaded: function () {
            return this.meta("are_uploaded") || false;
        }
        , events: {
            add: "files_added"
        }
        , files_added: function () {
            this.meta("are_uploaded", false);
        }
    });

    FileManager.Progress = FileManager.Model.extend({
        defaults: {
            start: 0
            , rabbit: 0
            , finish: 0
        }
        , finish: function () {
            this.set("rabbit", this.get("finish"));
        }
        , reset: function () {
            this.set("rabbit", this.get("start"));
        }
        , is_finished: function () {
            return this.get("rabbit") >= this.get("finish");
        }
        , has_started: function () {
            return this.get("rabbit") > this.get("start");
        }
        , is_active: function () {
            return this.has_started() && !this.is_finished();
        }
        , distance: function () {
            return this.get("finish") - this.get("start");
        }
    });

    FileManager.start_sub_app = function(app_name) {
        var current_app = FileManager.module(app_name);

        // if we are on the current application, leave it be
        // otherwise do some clean up and load the new app
        //if (FileManager.current_app === current_app) { return; }

        if (FileManager.current_app) {
            FileManager.current_app.stop();
        }

        FileManager.current_app = current_app;

        current_app.start();

        FileManager.vent.trigger("app:started", app_name, current_app);
    };

    // This will be the default event for start up an application
    // we do this so we can manage the memory properly
    FileManager.commands.addHandler("start:app", FileManager.start_sub_app, FileManager);

    FileManager.on('initialize:after', function(){
          Backbone.history.start();
    });

    FileManager.Controller = function(){};

    _.extend(FileManager.Controller.prototype, {
        // Start the app by showing the appropriate views
        // and fetching the list of todo items, if there are any
        start: function() {
            var layout = new FileManager.Layout();
            FileManager.main_region.show(layout);
        }
    });


    return FileManager;
})(Backbone, Marionette);
