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
$(function () {

    var th = {};

    th = {
        $results: $("#results"),
        $errors: $("#errors"),
        $loader: $("#hourglass"),
        $submit: $("#btn-call"),
        $form: $("form"),
        resultsTableTmpl: _.template($("#resultsTableTemplate").html()),
        bookingDetailsTemplate: _.template($("#bookingDetailsTemplate").html()),
        rawDataTemplate: _.template($("#rawDataTemplate").html()),
        init: function () {
            th.$submit.on("click", th._onSubmitClick);
            th._setupFilters();

            $(document).on("click", ".bookingDetails_btn", function (e) {
                th.renderBookingDetailsTarget = this.parentNode;
                this.parentNode.innerHTML = "<img src='/img/ajax-loader.gif' />";
                th.client.getFlightBookingDetails($(this).attr("data-url"), $(this).attr("data-body"));
            });

            th.testHarnessProgress = new Skyscanner.TestHarnessProgress($("#progress"));
            th.testHarnessAutosuggest = new Skyscanner.TestHarnessAutosuggest($(".test-harness-autosuggest"));
        },

        _setupFilters: function () {
            var $filter = $(".test-harness-filter");
            $filter.find("input[type=radio]").on("change", function () {
                var $radioBtn = $(this),
                    $wrap = $radioBtn.closest(".test-harness-filter");
                $wrap.find("input[type=text]")
                    .attr("disabled", "disabled").val("").removeClass("invalid");
                if ($radioBtn.is(":checked")) {
                    $wrap.find($radioBtn.val()).removeAttr("disabled").focus();
                }
            });
            $filter.find("input[type=text]").on("change", function () {
                th._validateCarriers($(this));
            });
        },

        _validateCarriers: function ($carriersFields) {
            $carriersFields = $carriersFields || $(".test-harness-filter input[type=text]");
            $carriersFields.each(function () {
                var $this = $(this),
                    pattern = new RegExp($this.data("pattern"), "i");
                if (pattern) {
                    $this.toggleClass("invalid", !pattern.test($this.val()));
                }
            });
        },

        _onSubmitClick: function (e) {
            var $invalidFields;
            e.preventDefault();
            th._validateCarriers();
            $invalidFields = th.$form.find(".invalid")
            if ($invalidFields[0]) {
                $invalidFields.focus();
                return;
            }
            th.$loader.show();
            th.$submit.prop("disabled", true);
            th._clearResults();
            th.client = new Skyscanner.LivePricingClient({
                onResults: th.onResults,
                onSessionCreated: th.onSessionCreated,
                onServerFailure: th.onServerFailure,
                onValidationFailure: th.onValidationFailure,
                onBookingDetailsCreate: th.onBookingDetailsCreate,
                onBookingDetailsPoll: th.onBookingDetailsPoll
            });

            var options = {};
            _.each(th.$form.serializeArray(), function (field) {
                if (field.name !== "carriers-filter") {
                    options[field.name] = field.value;
                }
            });

            th.client.getFlights(options);
            th.testHarnessProgress.clear();
            th.testHarnessProgress.sendMessage("Creating the session", "post");
        },
        onSessionCreated: function () {
            th.testHarnessProgress.sendMessage("Polling the session", "get");
        },
        onServerFailure: function (data, source) {
            console.debug("Server failure in " + source);
            th._onFailure(data);
        },
        _onFailure: function (data) {
            var tabs = new Skyscanner.TestHarnessTabs(th.$errors.empty());
            th.$loader.hide();
            th.$results.empty();
            th.$submit.prop("disabled", false);

            tabs.addTab(th.rawDataTemplate({data: data}), "Raw");
            th.testHarnessProgress.sendMessage("Stopped due to errors", null, true);
        },
        onValidationFailure: function (data, source) {
            console.debug("Validation failure in " + source);
            th._onFailure(data);
        },
        onResults: function (data, isComplete) {
            th._clearResults();

            if (th._hasData(data)) {
                data = th._formatData(data);
                th.agents = {};
                _.forEach(data.Flights.Agents, function (agent) {
                    th.agents[agent.Id] = agent;
                });
                th._outputData(data);
            } else if (isComplete) {
                var table = $("#results");
                table.append("<h4 class='test-harness-info-message txt-align-center'>NO RESULTS FOUND</h4>");
            }

            if (isComplete) {
                th.testHarnessProgress.sendMessage("Done");
                th.$loader.hide();
                th.$submit.prop("disabled", false);
            } else {
                th.testHarnessProgress.sendMessage("Polling the session", "get");
            }
        },
        onBookingDetailsCreate: function () {
            th.testHarnessProgress.sendMessage("Creating a Booking Details request", "put");
        },
        onBookingDetailsPoll: function (data, isComplete) {
            var $container = $(th.renderBookingDetailsTarget).empty(),
                tabs = new Skyscanner.TestHarnessTabs($container);

            th.testHarnessProgress.sendMessage("Polling the Booking Details", "get");

            if (!isComplete) {
                $container.html("<img src='/img/ajax-loader.gif' />");
            } else {
                th.testHarnessProgress.sendMessage("Done");
            }

            tabs.addTab(th.bookingDetailsTemplate({
                data: data,
                agents: th.agents
            }), "Preview", "test-harness-tab-preview");

            tabs.addTab(th.rawDataTemplate({data: data}), "Raw");
        },
        _outputData: function (data) {
            if (!th._hasData(data))
                return;

            var tabs = new Skyscanner.TestHarnessTabs($("#results"));
            tabs.addTab(th.resultsTableTmpl(data.Flights), "Preview", "test-harness-tab-preview");
            tabs.addTab(th._getTruncatedRawContents(data), "Raw");
        },
        _hasData: function (data) {
            return data.Flights && data.Flights.Itineraries && (data.Flights.Itineraries.length > 0);
        },
        _formatData: function (data) {
            var tmpl = _.template("<b><%= agentNames %>:</b> <%= price %> <%= currency %> <br>");

            _.each(data.Flights.Itineraries, function (it, idx) {
                var reduced = "";
                _.each(it.PricingOptions, function (po, idy) {
                    var agentNames = _.map(po.Agents, "Name").join(", ");
                    reduced += tmpl({
                        agentNames: agentNames,
                        price: po.Price,
                        currency: data.Query.Currency
                    });
                });
                it.FormattedData = reduced;
            });
            return data;
        },
        _getTruncatedRawContents: function (originalData) {
            //Truncate data to avoid crashing the browser when displaying it in the DOM
            var data = _.clone(originalData, true),
                max = 5,
                contents = "",
                truncated = [];

            for (var key in data.Flights) {
                if (typeof(data.Flights[key]) === "object" && data.Flights[key].length && data.Flights[key].length > max) {
                    data.Flights[key].length = max;
                    truncated.push(key);
                }
            }

            if (truncated.length > 0) {
                contents += "<div class='test-harness-warning'><span class='icon-attention-circled'></span>Note that the json below contains only the first " +
                    max + " " + truncated.join(", ") + "...</div>";
            }

            contents += th.rawDataTemplate({data: data});

            return contents;
        },
        _clearResults: function () {
            th.$results.empty();
            th.$errors.empty();
        }
    };

    th.init();

});