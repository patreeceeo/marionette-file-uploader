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

    FileManager.FileView = Marionette.Layout.extend({
        template: "#file-template"
        , tagName: "tr"
        // , className: "fade"
        , initialize: function () {
            this.progress_view = new FileManager.ProgressView({
                model: this.model.get("upload_progress")
            });
            Marionette.Layout.prototype.initialize.call(this);
        }
        , regions: {
            progress_region: ".progress-container"
        }
        , onRender: function () {
            this.progress_region.show(this.progress_view);
        }
        , serializeData: function () {
            return {
                file: this.model.toJSON()
            }
        }
        , modelEvents: {
            "change is_uploaded": "render"
        }
    });


    FileManager.FilesView = Marionette.CompositeView.extend({
        itemView: FileManager.FileView
        , tagName: "tbody"
        , loadingView: FileManager.LoadingView
        , emptyView: FileManager.EmptyView
        , template: "#file-template"
        // , collectionEvents: {
        //     add: "file_added"
        // }
        // , file_added: function (file) {
        //     if(this.collection.where({
        //         name: file.get("name")
        //         , size: file.get("size")
        //     }).length > 0)
        // }
    });



    FileManager.ProgressView = Marionette.ItemView.extend({
        className: "fileupload-progress"
        , template: "#progress-template"
        , ui: {
            bar: ".bar"
        }
        , serializeData: function () {
            var start = this.model.get("start");
            var finish = this.model.get("finish");
            var rabbit = this.model.get("rabbit");
            var extras = {
                percent_finished: (rabbit / finish) * 100
            };
            return _.extend(this.model.toJSON(), extras);
        }
        , modelEvents: {
            "change rabbit": "rabbit_moved"
        }
        , rabbit_moved: function () {
            var start = this.model.get("start");
            var finish = this.model.get("finish");
            var rabbit = this.model.get("rabbit");
            var percent_finished = ((rabbit - start) / finish) * 100;
            this.ui.bar.width(percent_finished+"%");
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
            "change rabbit": "render"
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
            this.files = options.files;
            this.files_view = new FileManager.FilesView({
                collection: this.files
            });
            this.progress_view = new FileManager.ProgressView({
                model: this.options.global_progress
            });
            this.progress_numbers_view = new FileManager.ProgressNumbersView({
                model: this.options.global_progress
            });
            Marionette.Layout.prototype.initialize.call(this, options);
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
        }
        , files_added: function (e) {
            var files = e.target.files;
            var that = this;
            _.each(files, function (file) {

                loadImage(file, function (img) {
                    var img_html = img.outerHTML;
                    that.files.create({
                        name: file.name
                        , size: file.size
                        , type: file.type
                        , lastModifiedDate: file.lastModifiedDate
                        , img: img_html
                    });
                    that.files.update_total_size();
                    that.files_view.render();
                }, {
                    maxWidth: 100
                    , maxHeight: 100
                    , minWidth: 100
                    // , canvas: true
                    , noRevoke: true
                });

            });
        }
        , start_upload: function () {
            // we want to show the global progress bar
            // this.render();
            var that = this;
            this.files.upload({
                success: function () {
                    console.log("success");
                    window.setTimeout(function () {
                        $("#global-progress").hide();
                        $("#progress-numbers").hide();
                    }, 1000);
                }
            });
        }
    });

    FileManager.Model = Backbone.Model.extend({
        increment: function (attr, value) {
            this.set(attr, this.get(attr) + value)
        }
    });

    FileManager.Collection = Backbone.Collection.extend({
        initialize: function(models, options) {
            Backbone.Collection.prototype.initialize.call(this);
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
        base_url: "/api/files"
        , url: "/" // just to make backbone happy for now
        , defaults: {
            is_uploaded: false
        }
        , initialize: function (attributes, options) {
            this.set("upload_progress", new FileManager.Progress({
                finish: attributes.size
            }));
            // this is an attempt to prevent the same file from
            // being added twice
            this.set("id", attributes.name+attributes.size);
            Backbone.Model.prototype.initialize.call(this);
        }
        , upload: function (options) {
            var that = this
                , progress = this.get("upload_progress")
                , global_progress = this.collection.meta("upload_progress");

            var chunk_size = 2500;
            var interval_id = window.setInterval(function () {
                progress.increment("rabbit", chunk_size);
                global_progress.increment("rabbit", chunk_size);
                if(progress.is_finished()) {
                    window.clearInterval(interval_id);
                    window.setTimeout(function () {
                        that.set("is_uploaded", true);
                    }, 1000);
                    options && options.success && options.success();
                }
            }, 100);
        }
        , is_uploaded: function () {
            // return this.get("upload_progress").is_finished();
            return this.get("is_uploaded");
        }
        , download: function () {
        }
        , save: function () {
        }
    });

    FileManager.Files = FileManager.Collection.extend({
        base_url: "/api/files"
        , url: "/" // just to make backbone happy for now
        , model: FileManager.File
        , initialize: function (models, options) {
            FileManager.Collection.prototype.initialize.apply(this, arguments);

            this.meta("upload_progress", options.global_progress);
            this.update_total_size();

        }
        , update_total_size: function () {
            var total_size = this.reduce(function (memo, file) {
                return memo + file.get("size");
            }, 0);

            this.meta("total_size", total_size);
            this.meta("upload_progress").set("finish", total_size);
        }
        , upload_one_at_a_time: function (options) {
            var that = this;
            var upload_ith = function (i) {
                var file = that.models[i];
                that.meta("are_uploading", true);
                return file.upload({
                    success: function () {
                        that.models.length > i+1 && upload_ith(i+1);
                    }
                    , error: function () {
                        console.log("error uploading file");
                        that.models.length > i+1 && upload_ith(i+1);
                    }
                });
            };
            return this.models.length > 0 && upload_ith(0);
            this.meta("are_uploading", false);
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
                        }
                    }
                });
            });
        }
        , are_uploaded: function () {
            return this.meta("upload_progress").is_finished();
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
            var global_progress = new FileManager.Progress();
            var layout = new FileManager.Layout({
                files: new FileManager.Files([], {
                    global_progress: global_progress
                })
                , global_progress: global_progress
            });
            FileManager.main_region.show(layout);
        }
    });

    FileManager.addInitializer(function(){
        var controller = new FileManager.Controller();
        // new FileManager.Router({
        //     controller: controller
        // });
        controller.start();
    });

    return FileManager;
})(Backbone, Marionette);
