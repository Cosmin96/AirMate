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
(function() {

    window.Skyscanner = window.Skyscanner || {};
    var root = window.Skyscanner;
    root.LivePricingClient = (function() {

        LivePricingClient.ON_RESULTS = 'onResults';
        LivePricingClient.ON_HOTELS_DETAILS = "onHotelsDetails";
        LivePricingClient.ON_SERVER_FAILURE = 'onServerFailure';
        LivePricingClient.ON_VALIDATION_FAILURE = 'onValidationFailure';

        LivePricingClient._HOTELS_LIVE_PRICING = '/apiservices/hotels/liveprices/v2/';

        LivePricingClient._MAX_POLLING_ATTEMPTS = 22;

        function LivePricingClient(callbacks) {
            this._apiService = '';
            this._callbacks = [];
            this._completeResult = {};
            this._images = [];
            this._hotels = [];
            this._pollUrl = '';

            if (callbacks) {
                this._registerCallback(LivePricingClient.ON_RESULTS, callbacks.onResults, this);
                this._registerCallback(LivePricingClient.ON_SERVER_FAILURE, callbacks.onServerFailure, this);
                this._registerCallback(LivePricingClient.ON_VALIDATION_FAILURE, callbacks.onValidationFailure, this);
                this._registerCallback(LivePricingClient.ON_HOTELS_DETAILS, callbacks.onHotelsDetails, this);
            }

            this.defaults = {
                market: "GB",
                currency: "GBP",
                locale: "en-GB"
            };
        }

        LivePricingClient.prototype.getHotels = function(options) {
            this._apiService = LivePricingClient._HOTELS_LIVE_PRICING;
            options = $.extend(this.defaults, options || {});
            this._composeResults(options);
            return options;
        };

        /* Create and Poll Session */
        LivePricingClient.prototype._composeResults = function(options) {
            var that = this;

            this._createSession(options)
                .then(this._pollForResults)
                .progress(function(data) {
                    that._inflateAndAppend(data);
                    that._completeResult.images = that._images;
                    that._callCallback(LivePricingClient.ON_RESULTS, that._completeResult, false);
                })
                .done(function(data) {
                    that._inflateAndAppend(data);
                    that._completeResult.images = that._images;
                    that._callCallback(LivePricingClient.ON_RESULTS, that._completeResult, true);
                })
                .fail(function(callback, failure, source) {
                    that._callCallback(callback, failure, source);
                });
        };

        LivePricingClient.prototype._createSession = function(query) {
            var that = this;
            var dfd = $.Deferred();

            var slash = '/';
            var qry = query.market + slash +
                query.currency + slash +
                query.locale + slash +
                query.query + slash +
                encodeURIComponent(query.checkindate) + slash +
                encodeURIComponent(query.checkoutdate) + slash +
                query.adults + slash +
                query.rooms +
                "?pageSize=50&imageLimit=" + query.imageLimit;

            $.ajax({
                type: 'GET',
                url: that._apiService + qry,
                dataType: 'json'
            }).always(function(result, textStatus, xhr) {
                if (xhr.status >= 500 || result.status >= 500) {
                    dfd.reject(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(result), 'session creation');
                    return;
                } else if (xhr.status >= 400 || result.status >= 400) {
                    dfd.reject(LivePricingClient.ON_VALIDATION_FAILURE, that._composeRejection(result), 'session creation');
                    return;
                } else if (xhr.status >= 200) {
                    that._pollUrl = xhr.getResponseHeader('Location');
                    dfd.resolveWith(that, [result]);
                    return;
                } else {
                    dfd.reject(LivePricingClient.ON_VALIDATION_FAILURE, that._composeRejection(result), 'session creation');
                    return;
                }
            });

            return dfd.promise();
        };

        LivePricingClient.prototype._pollForResults = function(data) {
            var that = this;
            var dfd = $.Deferred();
            var attemptCount = 1;

            var getTimeoutMs = function() {
                if (attemptCount < 2)
                    return 500;
                if (attemptCount < 6)
                    return 1500;
                return 3000;
            };

            var testAndSetTimeout = function() {
                if (dfd.state() === 'resolved')
                    return false;
                attemptCount++;
                if (attemptCount < LivePricingClient._MAX_POLLING_ATTEMPTS) {
                    setTimeout(timeoutHandler, getTimeoutMs());
                    return true;
                }
                return false;
            };

            var getAgentsPending = function(websites) {
                for (var i = 0; i < websites.length; i++) {
                    if (websites[i].inProgress) {
                        return true;
                    }
                }
                return false;
            };

            var notifyOrResolve = function(result) {
                if (result.status == 'PENDING') {
                    //if (getAgentsPending(result.websites)) {
                    if (testAndSetTimeout()) {
                        dfd.notify(result);
                    } else {
                        dfd.resolve(result);
                    }
                } else {
                    dfd.resolve(result);
                }
            };

            var timeoutHandler = function() {
                var opts = {
                    type: 'GET',
                    url: that._pollUrl,
                    dataType: 'JSON'
                };
                $.ajax(opts).always(function(result, textStatus, xhr) {
                    switch (xhr.status) {
                    case 200:
                        that._pollUrl = xhr.getResponseHeader('Location');
                        notifyOrResolve(result);
                        break;
                    case 204:
                    case 304:
                    case 500: // poll again silently, or mark as complete if attempt limit reached
                        if (!testAndSetTimeout()
                            && dfd.state() !== 'resolved') {
                            dfd.resolve(that._completeResult);
                        }
                        break;
                    case 400:
                        dfd.reject(LivePricingClient.ON_VALIDATION_FAILURE, that._composeRejection(xhr), 'polling for results');
                        break;
                    case 403:
                    case 410:
                    case 429:
                    default:
                        dfd.reject(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(xhr), 'polling for results');
                    }
                });
            };

            notifyOrResolve(data);

            return dfd.promise();
        };

        LivePricingClient.prototype._createSessionFail = function(that, failure, source) {
            that._callCallback(LivePricingClient.ON_SERVER_FAILURE, failure, source);
        };

        LivePricingClient.prototype._inflateAndAppend = function(data) {
            if (data.hotels) {
                data = this._inflateHotels(data);

                //todo sort by prices. this should be done in API
                $.extend(true, this._completeResult, data);
                this._completeResult.hotels_prices.sort(function(a, b) {
                    var aPrice = a.agent_prices[0].price_total;
                    var bPrice = b.agent_prices[0].price_total;
                    if (a.agent_prices[0].price_total === null || isNaN(a.agent_prices[0].price_total) || a.agent_prices[0].price_total < 0) aPrice = 9999999;
                    if (b.agent_prices[0].price_total === null || isNaN(b.agent_prices[0].price_total) || b.agent_prices[0].price_total < 0) bPrice = 9999999;

                    var sortValue = aPrice - bPrice;
                    if (sortValue === 0) // if the prices are the same, sort on the deeplink
                        //return a.deeplink_url.localeCompare(b.deeplink_url); //todo
                        return -1; //todo
                    else
                        return sortValue;
                });
            }
        };

        LivePricingClient.prototype._inflateHotels = function(data) {
            if (!data || !data.hotels || !data.hotels_prices || !data.amenities)
                return data;

            //amenities
            $.each(data.hotels, function (h, hotel) {
                $.each(hotel.amenities, function (ha, hAmenity) {
                    $.each(data.amenities, function (a, amenity) {
                        if (amenity.id == hAmenity)
                            hotel.amenities[ha] = amenity.name;
                    });
                });
            });

            //images
            //$.each(data.hotels, function(h, hotel) {
            //    for (var i = 0; i < hotel.amenities.length; i++)
            //        hotel.amenities[i] = data.amenities[i].name;
            //});

            //hotels_prices
            $.each(data.hotels_prices, function(i, hp) {
                $.each(data.hotels, function(j, hotel) {
                    if (hp.id == hotel.hotel_id) {
                        hp.hotel = hotel;
                        if (data.urls)
                            hp.hotel.url = data.urls.hotel_details + "&hotelIds=" + hotel.hotel_id;
                    }
                });
            });

            return data;
        };

        /* Hotel Details */
        LivePricingClient.prototype.getHotelBookingDetails = function (uri) {
            var that = this;
            var attempts = 0;

            $.ajax({
                type: 'GET',
                url: uri,
                dataType: 'json'
            }).done(function(data, textStatus, xhr) {
                var location = xhr.getResponseHeader('Location');
                var pollHotelDetails = function() {
                    $.ajax({
                        type: 'GET',
                        url: location,
                        dataType: 'JSON'
                    }).always(function(result, textStatusPoll, xhrPoll) {
                        switch (xhrPoll.status) {
                        case 200:
                            var hotelDetailsPollComplete = result.status == "PENDING" ? false : true;

                            $.each(result.agents, function(a, agent) {
                                if (agent.in_progress) {
                                    hotelDetailsPollComplete = false;
                                }
                            });

                            result = that._inflateHotelDetails(result);

                            attempts++;
                            if (attempts < LivePricingClient._MAX_POLLING_ATTEMPTS) {
                                that._callCallback(LivePricingClient.ON_HOTELS_DETAILS, result, hotelDetailsPollComplete);

                                if (!hotelDetailsPollComplete) {
                                    setTimeout(pollHotelDetails, 1500);
                                }
                            } else {
                                that._callCallback(LivePricingClient.ON_HOTELS_DETAILS, result, true);
                            }
                            break;
                        case 400:
                            that._callCallback(LivePricingClient.ON_VALIDATION_FAILURE, that._composeRejection(xhrPoll), 'polling hotel details');
                            break;
                        default: // 403, 410, 429, 500 - all of them fail conditions
                            that._callCallback(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(xhrPoll), 'polling hotel details');
                        }
                    });
                };

                pollHotelDetails();

            }).fail(function(xhr) {
                that._callCallback(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(xhr), 'polling hotel details (server may be down)');
            });
        };

        LivePricingClient.prototype._inflateHotelDetails = function(data) {
            this._inflateHotels(data);

            if (!data || !data.hotels_prices || !data.hotels_prices[0] || !data.hotels[0])
                return data;

            return data;
        };

        LivePricingClient.prototype._composeRejection = function(xhr) {
            var debugInfo;
            try {
                debugInfo = JSON.parse(xhr.responseText || "");
            } catch(e) {
                debugInfo = "Could not provide further help";
            }

            var rejection = {
                status: xhr.status,
                statusText: xhr.statusText,
                debugInformation: debugInfo
            };

            return rejection;
        };

        LivePricingClient.prototype._registerCallback = function(callbackId, callbackFunc, context) {
            this._callbacks.push({
                id: callbackId,
                func: callbackFunc,
                context: context
            });
        };

        LivePricingClient.prototype._callCallback = function() {
            var callbackId = arguments[0];
            var payload = arguments.length > 1 ? [].slice.call(arguments, 1) : [];

            for (var i = 0; i < this._callbacks.length; i++) {
                if (this._callbacks[i].id === callbackId) {
                    if (this._callbacks[i].func) {
                        try {
                            this._callbacks[i].func.apply(this._callbacks[i].context, payload);
                            return;
                        } catch(err) {
                            // An error happened in user-land code.
                            console.debug("An exception was thrown when calling your " + callbackId + " callback");
                            return;
                        }
                    }
                }
            }

            console.debug("An " + callbackId + " event occurred, but no callback is registered to handle it");
        };

        return LivePricingClient;
    })();

})();