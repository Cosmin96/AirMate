/*
Copyright 2015 Skyscanner

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
(function () {

    "use strict";

    var Tabs = function ($element) {
        this.$container = $element;
        this._tabs = {};
        this._tabsCount = 0;
        this._init();
    };

    Tabs.prototype.addTab = function (content, tabName, className) {
        this._tabsCount++;
        className = className || "";

        var date = new Date(),
            tabId = "testHarnessTab" + date.getTime(),
            classNames = "test-harness-tab " + className,
            tabButton = "<a href='" + tabId + "'>" + tabName + "</a>",
            tab = "<div id='" + tabId + "' class='" + classNames + "'>" + content + "</div>";

        this._tabs[tabId] = tab;
        this.$header.append(tabButton);

        if (this._tabsCount === 1) {
            this.select(tabId);
        }
    };

    Tabs.prototype.select = function (tabId) {
        this._select(this.$header.find("a[href=" + tabId + "]"));
    };

    Tabs.prototype._init = function () {
        this.tabs = [];
        this.$element = $("<div class='test-harness-tabs'>").appendTo(this.$container);
        this.$header = $("<div class='cb test-harness-tabs-buttons' />")
            .on("click", "a", $.proxy(this._onTabClick, this))
            .appendTo(this.$element);
        this.$content = $("<div class='test-harness-tabs-content' />")
            .appendTo(this.$element);
    };

    Tabs.prototype._onTabClick = function (e) {
        e.preventDefault();
        this._select($(e.target));
    };

    Tabs.prototype._select = function ($tabButton) {
        var currentTabId = $tabButton.attr("href"),
            $current = this.$container.find("#" + currentTabId);
        if (!$current[0]) {
            this.$content.append(this._tabs[currentTabId]);
            $current = this.$container.find("#" + currentTabId);
        }
        if ($current.is(':visible')) {
            return;
        }
        this.$content.children().hide();
        $current.show();
        this.$header.find("a.test-harness-tab-current").removeClass("test-harness-tab-current");
        $tabButton.addClass("test-harness-tab-current");
    };


    var Progress = function ($element) {
        this.$element = $element;
        this.current = {};
        this.$current = null;
    };

    Progress.prototype.clear = function () {
        this.$element.empty();
        this.current = {};
    };

    Progress.prototype.sendMessage = function (message, type, failed) {
        if (this.current.type !== type || this.current.message !== message) {
            this.current = {
                type: type,
                message: message,
                count: 1,
                failed: !!failed
            };
            this._addStep();
        } else {
            this.current.count++;
            this._incrementLastStep();
        }
    };

    Progress.prototype._addStep = function () {
        var step = "<li class='current'>";

        if (this.$current) {
            this.$current.removeClass('current');
        }

        if (this.current.type) {
            step += "<div class='rprt-loader'><div></div></div>";
            step += "<span class='test-harness-request-type'><small></small>" + this.current.type + "</span> ";
        } else if (this.current.failed) {
            step += "<div class='step-indicator failed'></div>";
        } else {
            step += "<div class='step-indicator'></div>";
        }

        step += this.current.message + "...</li>";
        this.$current = $(step).appendTo(this.$element);
    };

    Progress.prototype._incrementLastStep = function () {
        this.$current.find('.test-harness-request-type small').text(this.current.count);
    };

    var Autosuggest = function ($elements, url, template) {
        this.$elements = $elements;
        this._template = template ? _.template(template) : _.template("<a class='ui-corner-all' tabindex='-1'><%= PlaceName %> (<%= PlaceId %>)</a>");
        this._url = Skyscanner._baseUrl;
        this._url += url || "/apiservices/xd/autosuggest/v1.0/UK/GBP/en-GB/";
        this._cache = {};
        this.init();
    };

    Autosuggest.prototype.init = function () {
        var self = this;

        this.$elements.autocomplete({
            minLength: 3,
            focus: function (event, ui) {
                $(this).val(self._value(ui.item));
                $(this).attr("title", self._label(ui.item));
                $(this).next().text(self._label(ui.item)).attr("title", self._label(ui.item));
                return false;
            },
            select: function (event, ui) {
                $(this).val(self._value(ui.item));
                $(this).attr("title", self._label(ui.item));
                $(this).next().text(self._label(ui.item)).attr("title", self._label(ui.item));
                return false;
            },
            source: function (request, response) {
                if (self._cache[request.term]) {
                    response(self._cache[request.term]);
                    return;
                }

                $.ajax({
                    url: self._getUrl(request),
                    type: "GET",
                    dataType: "jsonp",
                    data: {
                        query: request.term
                    },
                    success: function (data) {
                        data = self._filter(data);
                        self._cache[request.term] = data;
                        response(data);
                    }
                });
            }
        }).each(function () {
            $(this).data("uiAutocomplete")._renderItem = $.proxy(self._renderItem, self);
            $(this).after("<span class='test-hareness-autosuggest-label'></span>");
        });
    };

    Autosuggest.prototype._getUrl = function (request) {
        return this._url;
    };

    Autosuggest.prototype._value = function (item) {
        return item.PlaceId;
    };

    Autosuggest.prototype._label = function (item) {
        return item.PlaceName;
    };

    Autosuggest.prototype._filter = function (data) {
        return _.filter(data.Places, function (place) {
            return place.PlaceId !== place.CountryId;
        });
    };

    Autosuggest.prototype._renderItem = function (ul, item) {
        return $("<li>").html(this._template(item)).appendTo(ul);
    };

    var Hint = function () {
        this.init();
        this._width = 300;
    };

    Hint.prototype.init = function () {
        var self = this;
        this.$current = null;
        this.$tooltip = $("<span class='test-harness-hint' />");
        this.$elements = $(".test-harness-hint-button").each(function () {
            self._render($(this));
        }).on("click.test-harness-hint", $.proxy(this.toggle, this))
        .on("mouseenter.test-harness-hint", $.proxy(this._position, this));
        $(window).on("resize", $.proxy(this.hide, this));
    };

    Hint.prototype._render = function ($element) {
        var elementHeight = $element.outerHeight();
        $element.wrap("<span class='test-harness-hint-wrap' />");
        $element.after("<span class='test-harness-hint'>" + $element.attr("title") + "</span>");
        $element.next().css({
            bottom: elementHeight + "px"
        });
    };

    Hint.prototype.toggle = function (e) {
        var $target = $(e.target),
            clickedOnCurrent = $target.is(this.$current);
        e.preventDefault();
        this.hide();
        if (!clickedOnCurrent) {
            this.show($target);
        }
    };

    Hint.prototype.show = function ($element) {
        this.$current = $element.addClass("current");
        $(document).on("click.test-harness-hint", $.proxy(this._onDocClick, this));
        $(document).on("keydown.test-harness-hint", $.proxy(this._onDocKeyDown, this));
    };

    Hint.prototype.hide = function ($element) {
        this.$current = null;
        this.$elements.removeClass("current");
        $(document).off("click.test-harness-hint");
        $(document).off("keydown.test-harness-hint");
    };

    Hint.prototype._position = function (e) {
        var $target = $(e.target),
            offset = $target.offset(),
            docWidth = $(document).width(),
            rightSpace = docWidth - offset.left,
            leftSpace = offset.left;

        $target.removeClass("test-harness-hint-right").next().width(Math.min(this._width, Math.max(leftSpace - 30, rightSpace - 30)));

        if (rightSpace < this._width && leftSpace > rightSpace) {
            $target.addClass("test-harness-hint-right");
        }
    };

    Hint.prototype._onDocClick = function (e) {
        var $target = $(e.target);
        if (!$target.is(this.$tooltip) && !$target.hasClass("test-harness-hint-button") &&
            !$target.closest(this.$tooltip)[0] && !$target.closest(".test-harness-hint-button")[0]) {
            this.hide();
        }
    };

    Hint.prototype._onDocKeyDown = function (e) {
        if (e.which === 27) {
            this.hide();
        }
    };

    Skyscanner.TestHarnessAutosuggest = Autosuggest;
    Skyscanner.TestHarnessProgress = Progress;
    Skyscanner.TestHarnessTabs = Tabs;

    // Set up jQuery to append the user-entered apikey to all requests.
    $.ajaxPrefilter(function(opts) {
        if (opts.url.indexOf("apiservices") === -1)
            return;
        if (opts.url.indexOf("apikey=") === -1) {
            opts.url += (opts.url.indexOf("?") === -1) ? "?" : "&";
            opts.url += "apikey=" + $("#apikey").val();
        }
    });

    $(document).ready(function () {
        var hint = new Hint();

        $("#outbounddate, #checkindate").datepicker({
            showOn: "focus",
            dateFormat: "yy-mm-dd"

        }).datepicker("setDate", "+7");

        $("#inbounddate, #checkoutdate").datepicker({
            showOn: "focus",
            dateFormat: 'yy-mm-dd'
        }).datepicker("setDate", "+14");

    });

}());