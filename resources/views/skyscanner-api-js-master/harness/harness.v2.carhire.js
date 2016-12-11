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
        $submit: $("#btn-call"),
        $loader: $("#hourglass"),
        $form: $("form"),
        resultsTableTemplate: _.template($("#resultsTableTemplate").html()),
        rawDataTemplate: _.template($("#rawDataTemplate").html()),
        init: function () {
            th._setUpDatePickers();
            th.testHarnessProgress = new Skyscanner.TestHarnessProgress($('#progress'));
            th._setUpAutosuggest();
            th.$submit.click(th._onSubmitClick);
        },
        _setUpAutosuggest: function () {
            th.testHarnessAutosuggest = new Skyscanner.TestHarnessAutosuggest(
                $(".test-harness-autosuggest"),
                "/apiservices/hotels/autosuggest/v2/UK/EUR/en-GB/",
                "<a class='ui-corner-all' tabindex='-1'><%= display_name %> (<%= individual_id %>)</a>");

            th.testHarnessAutosuggest._getUrl = function (request) {
                return this._url + request.term;
            };

            th.testHarnessAutosuggest._value = function (item) {
                return item.individual_id;
            };

            th.testHarnessAutosuggest._label = function (item) {
                return item.display_name;
            };

            th.testHarnessAutosuggest._filter = function (data) {
                return _.map(data.results, function (result) {
                    var parent_place = _.find(data.places, {place_id: result.parent_place_id});
                    if (parent_place) {
                        result.display_name += ", " + parent_place.admin_level1 + ", " + parent_place.country_name;
                    }
                    return result;
                });
            };
        },
        _setUpDatePickers: function () {
            // Prepare start/end times to be a week/two weeks in the future.
            var time = new Date();
            time.setTime(time.getTime() + (7 * 86400000));
            var pudt = (time.toISOString().slice(0, time.toISOString().lastIndexOf('T'))) + 'T10:00';
            $("#pickupdatetime").val(pudt);
            time.setTime(time.getTime() + (7 * 86400000));
            var dodt = (time.toISOString().slice(0, time.toISOString().lastIndexOf('T'))) + 'T10:00';
            $("#dropoffdatetime").val(dodt);

            // SETUP
            $("#pickupdatetime").datetimepicker({
                showOn: "focus",
                dateFormat: "yy-mm-dd",
                timeFormat: "HH:mm",
                separator: "T",
                stepMinute: 15
            });

            $("#dropoffdatetime").datetimepicker({
                showOn: "focus",
                dateFormat: 'yy-mm-dd',
                timeFormat: "HH:mm",
                separator: "T",
                stepMinute: 15
            });
        },
        _onSubmitClick: function (e) {
            var client;
            e.preventDefault();
            th.$loader.show();
            th._clearResults();
            th.$submit.prop("disabled", true);
            client = new Skyscanner.LivePricingClient({
                onResults: th.onResults,
                onServerFailure: th.onServerFailure,
                onValidationFailure: th.onValidationFailure
            });

            var options = {};
            _.each(th.$form.serializeArray(), function (field) {
                options[field.name] = field.value;
            });

            th.testHarnessProgress.clear();
            th.testHarnessProgress.sendMessage("Creating the session", "get");
            client.getCarHire(options);
        },
        onResults: function (data, isComplete) {
            th._clearResults();

            if (th._hasData(data)) {
                th._outputData(data);
            } else if (isComplete) {
                    var table = th.$results;
                    table.append("<h4 class='test-harness-info-message txt-align-center'>NO RESULTS FOUND</h4>");
            }

            th.testHarnessProgress.sendMessage("Polling the session", "get");

            if (isComplete) {
                th.testHarnessProgress.sendMessage("Done");
                th.$loader.hide();
                th.$submit.prop("disabled", false);
            }
        },
        onServerFailure: function (data, source) {
            console.debug("Server failure in " + source);
            th._onFailure(data);
        },
        onValidationFailure: function (data, source) {
            console.debug("Validation failure in " + source);
            th._onFailure(data);
        },
        _onFailure: function (data) {
            var tabs = new Skyscanner.TestHarnessTabs(th.$errors.empty());
            th.$loader.hide();
            th.$submit.prop("disabled", false);
            th.$results.empty();
            tabs.addTab(th.rawDataTemplate({data: data}), "Raw");
            th.testHarnessProgress.sendMessage("Stopped due to errors", null, true);
        },
        _clearResults: function () {
            th.$results.empty();
            th.$errors.empty();
        },
        _hasData: function (data) {
            return data.cars && (data.cars.length > 0);
        },
        _outputData: function (data) {
            if (!th._hasData(data))
                return;

            var tabs = new Skyscanner.TestHarnessTabs(th.$results);
            tabs.addTab(th.resultsTableTemplate({data: data}), "Preview", "test-harness-tab-preview");
            tabs.addTab(th._getTruncatedRawContents(data), "Raw");
        },
        _getTruncatedRawContents: function (originalData) {
            //Truncate data to avoid crashing the browser when displaying it in the DOM
            var data = _.clone(originalData, true),
                max = 5,
                contents = "",
                truncated = [];

            for (var key in data) {
                if (typeof(data[key]) === "object" && data[key].length && data[key].length > max) {
                    data[key].length = max;
                    truncated.push(key);
                }
            }

            if (truncated.length > 0) {
                contents += "<div class='test-harness-warning'><span class='icon-attention-circled'></span>Note that the json below contains only the first ";
                contents += max + " " + truncated.join(", ") + "...</div>";
            }

            contents += th.rawDataTemplate({data: data});

            return contents;
        }
    };

    th.init();
});