EventRay = (function(Backbone, Marionette) {
    "use strict";

    // This is the primary Marionette application that will control all of
    // our regions on the site
    var App = new Backbone.Marionette.Application();

    App.models_saving = [];


    console.log("BINDING OMGZ WTF BBQ");
    /* we track the saving events here because the menu
        * is global and is only initialized once
    */

    var model_saving = function(model, guid) {
        // console.log("SAVING GUID", guid);
        var extra_context = {
            '_':  function() {
                return App.translate;
            }
        }

        var timeout_id = window.setTimeout(function() {
            console.log("SHOWING...", timeout_id);
            var tmpl = window.jst_templates["saving"];
            $("body").append(tmpl.render(extra_context));

        }, 1000);

        if (!(model.cid in App.models_saving)) {
            App.models_saving[model.cid] = {};
        }

        App.models_saving[model.cid][guid] = timeout_id;
    }

    var model_done_saving = function(model, guid) {
        var timeout = App.models_saving[model.cid][guid];

        window.clearTimeout(timeout);

        delete App.models_saving[model.cid][guid];

        if (_.isEmpty(App.models_saving[model.cid])) {
            // console.log("CLEARING", timeout);
            $("#saving-dialog").remove();
        }
    }

    App.bindTo(
        App.vent
        , "saving"
        , model_saving
    );

    App.bindTo(
        App.vent
        , "destroying"
        , model_saving
    );

    App.bindTo(
        App.vent
        , "done_saving"
        , model_done_saving
    );

    App.bindTo(
        App.vent
        , "done_destroying"
        , model_done_saving
    );


    App.route_root = "/";

    // most href clicks should trigger backbone routing
    $(document).on("click", "a:not([data-bypass])", function(evt) {
        var href, root;
        href = {
            prop: $(this).prop("href"),
            attr: $(this).attr("href")
        };

        root = location.protocol + "//" + location.host + App.route_root;

        if (href.prop && href.prop.slice(0, root.length) === root) {
            evt.preventDefault();

            return Backbone.history.navigate(href.attr, {
                trigger: true
            });
        }
    });

    // This will attach the API Key to every ajax request
    // if the user is logged in
    $(document).ajaxSend(function(event, xhr, settings) {
        var user = App.get_current_user();

        if (user == null) {
            return;
        }

        if (user != undefined || user != 'undefined') {
            xhr.setRequestHeader("X-EventRay-Key", user.security_code);
        }
    });

    App.generate_url = function(obj, url_template) {
        var tmpl = Hogan.compile(url_template);

        var context = {};

        if (obj._meta != null) {
            context = _.extend(context, obj._meta);
        }
        else {
            context = obj.toJSON();
        }

        var url = tmpl.render(context);

        if(context.day_index != undefined) {
            console.log("url_template:",url_template);
            console.log("context.day_index:",context.day_index);
            console.log("url:",url);
        }

        return url;
    };

    App.generate_confirmation_number = function() {
        return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).substr(-4)
    }



    App.S4 = function() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    var StorageAbstraction = function(storage) {
        this.storage = storage
    };

    _.extend(StorageAbstraction.prototype, {
        setObject: function(key, value) {
            this.storage.setItem(key, JSON.stringify(value));
        }

        , getObject: function(key) {
            var value = this.storage.getItem(key);
            return value && JSON.parse(value);
        }

        , clear: function() {
            this.storage.clear();
        }
    })

    var storage = new StorageAbstraction(localStorage);

    App.clear_data = function() {
        storage.clear();
    }

    App.set_object = function(name, object) {
        storage.setObject(name, object);
    }

    App.get_object = function(name) {
        return storage.getObject(name);
    }

    App.append_object = function(name, new_obj) {
        var object = App.get_object(name);
        object.push(new_obj);
        App.set_object(name, object);
    }

    App.set_current_user = function(user) {
        var current_time = new Date();

        user.last_check = current_time;

        App.set_object("current_user", user);
    }

    App.get_current_user = function() {
        var user = App.get_object("current_user");
        if (user != null) {
            var last_check = new Date(user.last_check);
            var current = new Date()
            var eight_min = last_check.clone().addMinutes(1);
            var result = Date.compare(eight_min, current);

            if (result < 0) {
                // we set last checked so we don't get infinite loop of events
                App.set_current_user(user);

                App.vent.trigger("check_user_security_code", user);
            }
        }

        return user;
    }

    App.slugify = function slugify(text) {
        text = text.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
        text = text.replace(/\s/gi, "-");

        return text;
    }


    App.translate = function(text) {
        var trans_text, translations;
        var trans_name = "BABEL_TO_LOAD";
        var current_user = App.get_current_user();
        var user_locale = null;

        if (current_user) {
            user_locale = App.get_current_user().locale;
        }
        else {
            user_locale = window.locale_name;
        }

        if (user_locale != "en") {
            trans_name += "_" + user_locale;
        }

        if (window[trans_name]) {
            translations = babel.Translations.load(window[trans_name]).install();
            trans_text = translations.gettext(text);
        }

        if (trans_text == "" || trans_text == null) {
            trans_text = text;
        }

        return trans_text;
    }

    App.lorem = function(num) {
        var i, lorem, real_num, return_data;
        lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.        Fusce nulla felis, semper id aliquam vel, condimentum sed libero.        Sed volutpat iaculis pellentesque. Cras dui lectus, pretium vel        fermentum pretium, faucibus non tellus. Morbi semper auctor diam id        molestie. Maecenas aliquam aliquam ultricies. Nam ut turpis mi,        scelerisque aliquet odio. Proin in nulla a diam pretium ornare. Donec        ipsum justo, egestas ac semper non, blandit ac mauris. Nulla ultrices,        neque non egestas adipiscing, massa velit volutpat tellus, sit amet        fermentum tellus risus id quam. Vivamus hendrerit fringilla egestas.        Nunc sit amet arcu id erat interdum dictum vitae quis risus. Sed        porttitor dui vel elit pharetra ut hendrerit lorem ornare. Mauris id        augue augue, sit amet facilisis justo.";
        real_num = parseInt(num);
        return_data = "";
        i = 0;
        while (i < num) {
            return_data += lorem + "<br />";
            i++;
        }
        return return_data;
    }

    App.validate = function(el, options) {
        var default_options = {
            highlight: function(label) {
                $(label).closest('.control-group').removeClass('success')
                $(label).closest('.control-group').addClass('error')
            }
            , success: function(label) {
                $(label).closest('.control-group').removeClass('error')
                $(label).closest('.control-group').addClass('success')
                $(label).text("OK!").addClass('valid')
            }
            , ignore: 'input[type=hidden]'
        }

        default_options = _.extend(default_options, options);

        el.validate(default_options);

        return el.valid();
    }

    App.utc_to_local = function(date) {
        return moment(date, "YYYY-MM-DD HH:mm:ss").local();
    }

    App.get_local_time = function(date) {
        return App.utc_to_local(date).format("LLL");
    }


    // Change the default way we grab templates in marionette, we use
    // jst templates
    Marionette.Renderer.render = function(template, data){
        var extra_context = {
            '_':  function() {
                return App.translate;
            }

            , 'lorem': function() {
                return App.lorem;
            }

            , 'current_route': function() {
                return Backbone.history.fragment.substring(1);
            }

            , 'csrf_token': function() {
                return App.csrf_token;
            }

            , 'local_time': function() {
                return App.get_local_time;
            }

            //, 'route_path': function() {
            //    return EventRay.route_path;
            //}
        };

        data = _.extend(data, extra_context);

        var tmpl = window.jst_templates[template];

        if (tmpl == null) {
            console.log("Couldn't find template ", template, data);
        }
        else {
            return tmpl.render(data, window.jst_templates);
        }
    };

    // These are for handling keystrokes on the keyboard
    App.keys = {
        'backspace': 8
        , 'enter': 13
        , 'up': 38
        , 'down': 40
        , 'esc': 27
    }

    App.Layout = Marionette.Layout.extend({
        initialize: function(options) {
            Marionette.Layout.prototype.initialize.call(this, options);

            if (options) {
                this.organization_pk = options.organization_pk;
                this.conference_pk = options.conference_pk;
            }

            this.bindTo(
                EventRay.vent
                , "language_changed"
                , this.language_changed
            );
        }

        , language_changed: function(lang) {
            _.each(this.regionManagers, function(region) {
                if (region.currentView) {
                    region.currentView.render();
                }
            }, this);

            $("#language").val(lang);
        }
    });

    App.MainLayout = App.Layout.extend({
        template: "main_layout"
        , regions: {
            main_region: "#main"
            , navigation_region: "#nav"
            , context_region: "#context-nav"
            , footer_region: "#footer-region"
        }
        , initialize: function() {
            App.Layout.prototype.initialize.apply(this, arguments);

            this.menu = new EventRay.Initializer.Views.Menu();
            this.context_menu = new EventRay.Initializer.Views.ContextMenu();

            this.bindTo(
                EventRay.vent
                , "menu:changed"
                , this.menu_changed
                , this
            );
        }

        , menu_changed: function(router, name, params) {
            var organization_pk = router.params.organization_pk;
            var conference_pk = router.params.conference_pk;

            if (conference_pk != null) {
                if (EventRay.active_conference) {
                    if (EventRay.active_conference.get("pk") != conference_pk) {
                        var response = EventRay.request("conference", organization_pk, conference_pk);
                        EventRay.active_conference = response.model;
                        this.context_menu.set_model(response.model);
                    }
                    else {
                        this.context_menu.set_model(EventRay.active_conference);
                    }
                }
                else {
                    var response = EventRay.request("conference", organization_pk, conference_pk);
                    EventRay.active_conference = response.model;
                    this.context_menu.set_model(response.model);
                }

                this.context_menu.render();
            }
        }

        , onRender: function() {
            this.navigation_region.show(this.menu);
            this.context_region.show(this.context_menu);
        }
    });


    var view_extensions = {
        // debounce: function(delay, fn, context, arg) {
        //     var attr = "__debounce_id";
        //     if(!context) context = this;
        //     this.model.set(attr, debounce(delay, this.model.get(attr), $.proxy(fn, context), arg), {silent: true});
        // }

        check_selected_options: function() {
            /* This is defined on the view like:
             * selected_options: {"#id": "property_on_model"}
             */
            var me = this;

            console.log("CHECKING", this.template);
            if (this.selected_options) {
                _.each(this.selected_options, function(attr, selector) {
                    console.log("CHECKING OPTIONS", attr, selector);
                    var option_element, attr_value = null;

                    if (me.model) {
                        option_element, attr_value = me.model.attributes[attr];
                    }

                    if(attr_value && _.isFunction(attr_value.get)) {
                        option_element = me.$(selector).val(me.model.calc(attr));
                    } else if (_.isFunction(attr)) {
                        option_element = me.$(selector).val(attr());
                    } else {
                        option_element = me.$(selector).val(attr_value);
                    }
                    option_element.attr("selected", "selected");
                })
            }
        }

        , check_local_times: function() {
            this.$(".local-time").each(function(index, el) {
                var date = $(el).html();
                $(el).html(App.get_local_time(date));
            });
        }

        , get_input: function (src_selector, type) {
            var val;
            if(type == "bool") {
                val = $(src_selector).is(":checked");
            } else {
                val = $(src_selector, this.$el).val();
                if(type == "int") {
                    val = parseInt(val);
                } else if(type == "float") {
                    val = parseFloat(val);
                }
            }
            return val; 
        }
    }

    App.View = Marionette.ItemView.extend({
        modelEvents: {
            "change": "render"
        }

        , initialize: function(options) {
            Marionette.ItemView.prototype.initialize.apply(this, arguments);

            if (options) {
                this.parent_options = options.itemViewOptions;
                this.organization_pk = options.organization_pk;
                this.conference_pk = options.conference_pk;

                if (this.parent_options) {
                    if (!this.organization_pk) {
                        this.organization_pk = this.parent_options.organization_pk;
                    }
                    if (!this.conference_pk) {

                        this.conference_pk = this.parent_options.conference_pk;
                    }
                }
            }

            this.bindTo(this, "dom:refresh", this.check_selected_options);
        }

        , serializeData: function() {
            var data = Marionette.ItemView.prototype.serializeData.apply(this, arguments);

            if (this.parent_options) {
                data = _.extend(data, this.parent_options);
            }

            if (this.collection != null) {
                data['fetched'] = this.collection.fetched;
            }

            data = _.extend(data, this.errors);

            return data;
        }
       
        , render: function () {
            // Latest version of marionette implements this,
            // but not ours.
            if(this.beforeRender) this.beforeRender();
            Marionette.ItemView.prototype.render.call(this);
        }
    });

    App.CollectionView = Marionette.CollectionView.extend({
        showEmptyView: function(){
            var empty_view = Marionette.getOption(this, "emptyView");
            var loading_view = Marionette.getOption(this, "loadingView");
            var is_loading = false;

            var EmptyView;

            if (loading_view != null) {
                // if has collection and fetched defined, then check it
                if (this.collection && this.collection.fetched != undefined) {
                    if (this.collection.fetched == false) {
                        is_loading = true;
                    }
                }

                if (this.model && this.model.get('fetched') != undefined) {
                    if (this.model.get('fetched') == false) {
                        is_loading = true;
                    }
                }
            }

            if (is_loading) {
                EmptyView = loading_view;
            }
            else {
                EmptyView = empty_view;
            }

            if (EmptyView && !this._showingEmptyView){

                this._showingEmptyView = true;
                var model = new Backbone.Model();
                this.addItemView(model, EmptyView, 0);
            }
        }
    });

    App.CompositeView = Marionette.CompositeView.extend({
        collectionEvents: {
            "after:sync": "render"
        }

        , modelEvents: {
            "change": "render"
        }

        , serializeData: function() {
            var data = Marionette.CompositeView.prototype.serializeData.call(this);

            if (this.organization_pk) {
                data['organization_pk'] = this.organization_pk;
            }

            if (this.conference_pk) {
                data['conference_pk'] = this.conference_pk;;
            }

            data = _.extend(data, this.errors);

            return data;
        }

        , initialize: function(options) {
            Marionette.CompositeView.prototype.initialize.call(this, options);

            if (options) {
                this.organization_pk = options.organization_pk;
                this.conference_pk = options.conference_pk;
            }

            this.bindTo(this, "dom:refresh", this.check_selected_options);
        }

        // Build an `itemView` for every model in the collection.
        , buildItemView: function(item, ItemViewType, itemViewOptions){
            var options = _.extend({
                model: item
                , itemViewOptions: itemViewOptions
            })

            var view = new ItemViewType(options);
            return view;
        }

        , showEmptyView: function() {
            EventRay.CollectionView.prototype.showEmptyView.call(this);
        }

    });

    _.extend(App.View.prototype, view_extensions);
    _.extend(App.CompositeView.prototype, view_extensions);

    App.Model = Backbone.Model.extend({
        idAttribute: "pk"
        , generateId: function() {
            return App.S4() + App.S4() + '-' + App.S4() + '-' + App.S4() + '-' + App.S4() + '-' + App.S4() + App.S4() + App.S4();
        }
        , initialize: function() {
            Backbone.Model.prototype.initialize.apply(this, arguments);

            _.each(this.dateAttributes, function (attr) {
                this.set(attr, app.utc_to_local(this.get(attr).unix()));
            });
            // _.each(this.durationAttributes, function (attr) {
            //     this.set(attr, moment.duration({seconds: this.get(attr)}));
            // });
            // give it an ID if it doesn't have one
            //if (!this.get('pk')) {
            //    console.log("BAD MODEL, MAKING ID");
            //    this.set("pk", this.generateId());
            //}
        }
        , urlRoot: function() {
            var base = _.result(this, 'base_url') || _.result(this.collection, 'url');

            if (base != null) {
                var url = App.generate_url(this, base);
                return url;
            }
        }

        , destroy: function(options) {
            options = options ? _.clone(options) : {};

            var me = this;
            var success = options.success;

            var guid = this.generateId();

            var new_success = function(model, resp, opts) {
                EventRay.vent.trigger("done_destroying", me, guid);
                if (success) success(me, resp, opts);
            };

            options.success = new_success;

            EventRay.vent.trigger("destroying", this, guid);

            return Backbone.Model.prototype.destroy.call(this, options);
        }

        /* we only support the object type of save */
        , save: function(key, options) {
            var success = null;
            var error = null;
            var attrs = null;

            options = options ? _.clone(options) : {};
            success = options.success;
            error = options.error;

            var me = this;

            // console.log("GENERTING NEW ID", this.generateId());
            var guid = this.generateId();

            var new_success = function(model, resp, opts) {
                EventRay.vent.trigger("done_saving", me, guid);
                if (success) success(model, resp, opts);
            };

            var new_error = function() {
                EventRay.vent.trigger("done_saving", me, guid);
                if (error) error.apply(this, arguments);
            };

            options.success = new_success;
            options.error = new_error;

            // console.log("TRIGGERING SAVE", guid);
            EventRay.vent.trigger("saving", this, guid);

            // console.log("ROOT SAVE");
            return Backbone.Model.prototype.save.call(this, null, options);
        }

        , debounce_save: _.debounce(function () {
            if(!this.get("removed")) {
                this.save();
            }
        }, 1000)

        , clone_save:function () {
            var copy = this.clone();
            copy.save();
        }

        , debounce_silent_save: _.debounce(function () {
            if(!this.get("removed")) {
                var copy = this.clone();
                copy.save();
            }
        }, 1000)

        , isGetSetObject: function (obj) {
            return _.isObject(obj) 
            && (
                _.isFunction(obj.get) 
                ||  _.isFunction(obj.set)
            );
        }

        , toJSON: function() {
            var me = this;
            var model_attributes = _.clone(this.attributes);

            _.each(model_attributes, function(val, key) {
                if (val != null) {
                    if (val.hasOwnProperty('attributes')) {
                        model_attributes[key] = _.clone(me.attributes[key].attributes);
                    } else if (val.hasOwnProperty('models')) {
                        model_attributes[key] = val.toJSON();
                    } else if (_.isFunction(val.get)) {
                        var calculated_value = val.get.call(me)
                        model_attributes[key] = calculated_value;
                    }
                }
            });

            return model_attributes;
        }

        // With calculated attributes use calc() to "get" or 
        // "set" these attributes unless you want to "get"
        // or "set" the way these attributes are calculated, in
        // which case you would pass a GetSetObject (see above)
        // as the second arg to get() or set() respectively.
        , calc: function(fn_attr, new_value) {
            var obj = this.attributes[fn_attr];
            if(this.isGetSetObject(obj)) {
                if(_.isUndefined(new_value)) {
                    return obj.get.call(this);
                } else {
                    obj.set.call(this, new_value);
                    this.trigger("change:"+fn_attr);
                }
            } else {
                throw new Error("attribute "+fn_attr+" is not a get/set object");
            }

        }
        , delta: function(attr, amount, opts) {
            var value = this.get(attr);
            if(opts && !_.isUndefined(opts.initialValue) && !this.has(attr)) {
                value = opts.initialValue
            }
            value+=amount;
            if(opts && (opts.min || opts.max)) {
                value = this._trap(value, opts.min, opts.max);
            }
            this.set(attr, value, opts);
            return value;
        }
        , _trap: function(value, min, max) {
            if(value > max) {
                value = max; 
            } else if(value < min) {
                value = min;
            }
            return value;
        }
        , trap: function(attr, min, max, opts) {
            var value = this.get(attr);
            var new_value = this._trap(value, min, max);
            if(value != new_value) {
                this.set(attr, new_value, opts);
            }
            return value;
        }
        , increment: function(attr, opts) {
            return this.delta(attr, 1, opts);
        }
        , decrement: function(attr, opts) {
            return this.delta(attr, -1, opts);
        }
        , toggle: function(attr, opts) {
            this.set(attr, !this.get(attr), opts);
            return this.get(attr);
        }
        , copy: function(orig_attr, copy_attr, opts) {
            this.set(copy_attr, this.get(orig_attr), opts);
            return this;
        }
        , move: function(old_attr, new_attr, opts) {
            this.copy(old_attr, new_attr, opts);
            this.unset(old_attr);
            return this;
        }
        , push: function(attr) {
            var stack_index = 0;
            while(this.has(attr+"_"+stack_index)) {
                stack_index++;
            }
            var top_attr = attr+"_"+stack_index;
            return this.copy(attr, top_attr);
        }
        , pop: function(attr) {
            var stack_index = 0;
            while(this.has(attr+"_"+stack_index)) {
                stack_index++;
            }
            var top_attr = attr+"_"+(stack_index-1);
            return this.move(top_attr, attr);
        }
        , collectionIndex: function () {
            var index = 0, the_index;
            _.each(this.collection.models, function (model) {
                if(model.id == this.id) {
                    the_index = index;
                }
                index++;
            }, this);
            return the_index;
        }
        , exchange: function (attr, new_value) {
            var prev = this.get(attr);
            this.set(attr, new_value);
            return prev;
        }
        , steal: function (attr) {
            var value = this.get(attr);
            this.unset(attr);
            return value;
        }
    });

    App.Collection = Backbone.Collection.extend({
        parse: function(resp, xhr) {
            var sorted = _.sortBy(resp, function(obj) {
                if (obj.hasOwnProperty('sort_order')) {
                    return obj.sort_order;
                }
                else {
                    return new Date(obj.date_created)
                }
            });

            return sorted
        }

        , url: function() {
            var base_url = _.result(this, "base_url");
            var url = App.generate_url(this, base_url);
            return url;
        }

        , initialize: function(models, options) {
            Backbone.Collection.prototype.initialize.call(this);

            this._meta = {};

            EventRay.vent.bindTo(this, "add", function (model) {
                _.each(this.conferAttributes, function (attrName) {
                    model.set(attrName, this.meta(attrName), {silent: true});
                }, this);
            }, this);

            _.extend(this._meta, options)

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
                if(!_.isEqual(this._meta[prop], value)) {
                    this._meta[prop] = value;
                    var whoami = this.whoami ? this.whoami()+" " : "";
                    this.trigger("meta_change:"+prop);
                    this.trigger("meta_change");
                }
            }
        }
    });



    App.Router = Backbone.RouteManager.extend({
        before: {
            "*": ['load_app']
        }

        , load_app: function() {
            EventRay.start_sub_app(this.router.app_name);
        }

    });

    App.SecureRouter = App.Router.extend({
        load_app: function() {
             this.deferred = this.defer();

            if (App.get_current_user() == null) {
                App.start_sub_app("Public");

                Backbone.history.navigate("login", {
                    trigger: true
                });

                this.deferred.reject();
            }
            else {
                App.start_sub_app(this.router.app_name);
                this.deferred.resolve();
            }
        }
    });

    App.OrganizationRouter = App.SecureRouter.extend({
        before: {
            "*": ["load_app", "load_data"]
        }

        , load_data: function() {
            var me = this;

            if (window.enable_offline) {
                var data_req = EventRay.request(
                    "initialize:data",
                    this.router.params.organization_pk
                );

                this.defer(data_req);
            }
        }
    });

    App.ConferenceRouter = App.OrganizationRouter.extend({
        before: {
            "*": ["load_app", "load_data", "laod_conf_data"]
        }

        , load_conf_data: function() {
            if (window.enable_offline) {
                var me = this;

                var data_req = EventRay.request(
                    "initialize:conf_data"
                    , this.router.params.organization_pk
                    , this.router.params.conference_pk
                );

                this.defer(data_req);
            }
        }
    });

    App.addRegions({
        main_region: "#wrapper"
    });

    function load_history() {
        if (Backbone.history){
                App.bindTo(Backbone.history, "route", function() {
                    App.vent.trigger(
                        'menu:changed'
                        , arguments[0] //router
                        , arguments[1] //name
                        , arguments[2] //params
                    );
                }, App);

            Backbone.history.start({
                pushState: true
                , root: App.route_root
            });

            Backbone.history.bind("all", function (route, router) {
                // console.log("ROUTES", route, router, window.location.hash);
            });
        }
    }

    App.on("initialize:after", function(){
        load_history();
    });


    App.start_sub_app = function(app_name) {
        var current_app = App.module(app_name);

        // if we are on the current application, leave it be
        // otherwise do some clean up and load the new app
        //if (App.current_app === current_app) { return; }

        if (App.current_app){
            App.current_app.stop();
        }

        App.current_app = current_app;

        current_app.start();

        App.vent.trigger("app:started", app_name, current_app);
    };

    // This will be the default event for start up an application
    // we do this so we can manage the memory properly
    App.commands.addHandler("start:app", App.start_sub_app, App);

    return App;
})(Backbone, Marionette);
