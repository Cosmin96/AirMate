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
$(function() {

    var th = {};
    var allData;
    var consoleMessage = "";
    var testHarnessProgress = new Skyscanner.TestHarnessProgress($('#progress'));
    var client;

    th = {
        $results: $("#results"),
        $errors: $("#errors"),
        $submit: $("#btn-call"),
        $loader: $("#hourglass"),
        $form: $("form"),
        resultsTableTemplate: _.template($("#resultsTableTemplate").html()),
        detailsTemplate: _.template($("#detailsTemplate").html()),
        rawDataTemplate: _.template($("#rawDataTemplate").html()),
        init: function () {
            th.$submit.click(th._onSubmitClick);
            th._setUpAutosuggest();

            $(document).on("click", ".page", function (e) {
                e.preventDefault();
                testHarnessProgress.sendMessage("Changing page.");
                testHarnessProgress.sendMessage("Hotels Details service: Creating the details for 10 hotels.", "get");
                var id = $(this).attr("data-id");
                th._clearResults();
                th._renderData(allData, id - 1);
                client.getHotelBookingDetails(th._buildUrls(allData, id - 1));
            });
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
        _onSubmitClick: function(e) {
            e.preventDefault();
            th._clearResults();
            th.$loader.show();
            th.$submit.prop("disabled", true);

            client = new Skyscanner.LivePricingClient({
                onResults: th.onResults,
                onServerFailure: th.onServerFailure,
                onValidationFailure: th.onValidationFailure,
                onHotelsDetails: th.onHotelsDetails
            });

            var options = {};
            _.each(th.$form.serializeArray(), function (field) {
                options[field.name] = field.value;
            });
            th.imageLimit = parseInt(options.imageLimit, 10);

            testHarnessProgress.clear();
            testHarnessProgress.sendMessage("Hotels Price List Service: Creating the session", "get");
            client.getHotels(options);
        },
        onResults: function (data, isComplete) {
            testHarnessProgress.sendMessage("Hotels Price List Service: Polling the session", "get");
            th._clearResults();

            if (th._hasData(data)) {
                th._renderData(data, 0); //render first page
            } else if (isComplete) {
                testHarnessProgress.sendMessage("No results found or invalid place ID");
                var table = th.$results;
                table.append("<h4 class='test-harness-info-message txt-align-center'>No results found or invalid place ID</h4>");
                th.$loader.hide();
                th.$submit.prop("disabled", false);
                return;
            }

            if (isComplete) {
                allData = data; //store all data
                testHarnessProgress.sendMessage("Hotels Details service: Creating the details for 10 hotels.", "get");
                client.getHotelBookingDetails(th._buildUrls(data, 0), null, true);
            }
        },
        onHotelsDetails: function (data, isComplete) {
            testHarnessProgress.sendMessage("Hotels Details service: Polling the details ", "get");

            if (!th._hasData(data))
                return;

            data = th._mergeAgents(data);

            $.each(data.hotels_prices, function(idx, hotelPrice) {
                var tabs = new Skyscanner.TestHarnessTabs($("[id^=hotelDetails_div_" + hotelPrice.id + "]"));
                tabs.addTab(th.detailsTemplate({
                    hotelPrice: hotelPrice
                }), "Preview");
                tabs.addTab(th._getTruncatedRawContents({
                    hotelPrice: hotelPrice
                }), "Raw");
            });
            if (isComplete) {
                testHarnessProgress.sendMessage("Done");
                th.$loader.hide();
                th.$submit.prop("disabled", false);
            }
        },
        onServerFailure: function (data, source) {
            testHarnessProgress.sendMessage("Server failure in " + source, null, true);
            console.debug("Server failure in " + source);
            th._onFailure(data);
        },
        onValidationFailure: function (data, source) {
            testHarnessProgress.sendMessage("Validation failure in " + source + ".", null, true);
            console.debug("Validation failure in " + source);
            th._onFailure(data);
        },
        _onFailure: function (data) {
            var tabs = new Skyscanner.TestHarnessTabs(th.$errors.empty());
            th.$loader.hide();
            th.$submit.prop("disabled", false);
            th.$results.empty();
            tabs.addTab(th.rawDataTemplate({data: data}), "Raw");
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
        },
        _buildUrls: function (data, page) {
            var hotelIdsUrl = data.urls.hotel_details + "&hotelIds=";
            var firstElementIndex = page * 10;
            var lastElementIndex = page * 10 + 9;
            $.each(data.hotels_prices, function(idx, hp) {
                if (idx >= firstElementIndex && idx <= lastElementIndex)
                    hotelIdsUrl += hp.id + ",";
            });
            hotelIdsUrl = hotelIdsUrl.substring(0, hotelIdsUrl.length - 1);
            return hotelIdsUrl;
        },
        _mergeAgents: function (data) {
            $.each(data.hotels_prices, function(i, hp) {
                $.each(hp.agent_prices, function(j, ap) {
                    var agent = th._getAgentById(data, ap.id);
                    if (agent !== null) {
                        ap.image_url = agent.image_url;
                        ap.name = agent.name;
                    }
                });
            });
            return data;
        },
        _getAgentById: function (data, agentId) {
            for (var i = 0; i < data.agents.length; i++) {
                var agent = data.agents[i];
                if (agent.id == agentId)
                    return agent;
            }
            return null;
        },
        _clearResults: function () {
            th.$results.empty();
            th.$errors.empty();
        },
        _hasData: function (data) {
            return data.hotels && (data.hotels.length > 0);
        },
        _renderData: function (data, page) {
            if (!th._hasData(data))
                return;

            var tabs = new Skyscanner.TestHarnessTabs(th.$results),
                contents = th.resultsTableTemplate({
                    data: data,
                    imageLimit: th.imageLimit || 1,
                    firstElementIndex: page * 10,
                    lastElementIndex: page * 10 + 9,
                    currentPage: page
                });

            tabs.addTab(contents, "Preview", "test-harness-tab-preview");
            tabs.addTab(th._getTruncatedRawContents(data), "Raw");
        }
    };

    th.init();

});