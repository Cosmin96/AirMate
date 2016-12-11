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

    window.Skyscanner = window.Skyscanner || {};
    var root = window.Skyscanner;
    root.LivePricingClient = (function () {

        LivePricingClient.ON_SESSION_CREATED = 'onSessionCreated';
        LivePricingClient.ON_RESULTS = 'onResults';
        LivePricingClient.ON_BOOKING_DETAILS_CREATE = "onBookingDetailsCreate";
        LivePricingClient.ON_BOOKING_DETAILS_POLL = "onBookingDetailsPoll";
        LivePricingClient.ON_SERVER_FAILURE = 'onServerFailure';
        LivePricingClient.ON_VALIDATION_FAILURE = 'onValidationFailure';

        LivePricingClient._FLIGHTS_LIVE_PRICING = '/apiservices/pricing/v1.0/';

        LivePricingClient._MAX_POLLING_ATTEMPTS = 22;

        function LivePricingClient(callbacks) {
            this._apiService = '';
            this._callbacks = [];
            this._mostRecentResult = null;

            if (callbacks) {
                this._registerCallback(LivePricingClient.ON_SESSION_CREATED, callbacks.onSessionCreated, this);
                this._registerCallback(LivePricingClient.ON_RESULTS, callbacks.onResults, this);
                this._registerCallback(LivePricingClient.ON_SERVER_FAILURE, callbacks.onServerFailure, this);
                this._registerCallback(LivePricingClient.ON_VALIDATION_FAILURE, callbacks.onValidationFailure, this);
                this._registerCallback(LivePricingClient.ON_BOOKING_DETAILS_CREATE, callbacks.onBookingDetailsCreate, this);
                this._registerCallback(LivePricingClient.ON_BOOKING_DETAILS_POLL, callbacks.onBookingDetailsPoll, this);
            }

            this.defaults = {
                country: "GB",
                currency: "GBP",
                locale: "en-GB",
                locationSchema: "Iata"
            };
        }

        LivePricingClient.prototype.getFlights = function (options) {
            this._apiService = LivePricingClient._FLIGHTS_LIVE_PRICING;
            options = $.extend(this.defaults, options || {});
            this._start(options);
            return options;
        };

        LivePricingClient.prototype.getFlightBookingDetails = function (uri, body) {
            var that = this;
            var attempts = 0;

            $.ajax({
                type: 'PUT',
                url: uri,
                data: body
            }).done(function (data, textStatus, xhr) {
                var location = xhr.getResponseHeader('Location');
                var pollBookingDetails = function () {
                    $.ajax({
                        type: 'GET',
                        url: location,
                        dataType: 'JSON'
                    }).always(function (result, textStatusPoll, xhrPoll) {
                        switch (xhrPoll.status) {
                            case 200:
                                var bookingDetailsPollComplete = true;

                                $.each(result.BookingOptions, function(a, bookingOptionApiDto) {
                                    $.each(bookingOptionApiDto.BookingItems, function(b, bookingItemApiDto) {
                                        if (bookingItemApiDto.Status === 'Pending') {
                                            bookingDetailsPollComplete = false;
                                        }
                                    });
                                });

                                result = that._inflateResults(result);

                                attempts++;
                                if (attempts < LivePricingClient._MAX_POLLING_ATTEMPTS) {
                                    that._callCallback(LivePricingClient.ON_BOOKING_DETAILS_POLL, result, bookingDetailsPollComplete);

                                    if (!bookingDetailsPollComplete) {
                                        setTimeout(pollBookingDetails, 1500);
                                    }
                                } else {
                                    that._callCallback(LivePricingClient.ON_BOOKING_DETAILS_POLL, result, true);
                                }
                                break;
                            case 400:
                                that._callCallback(LivePricingClient.ON_VALIDATION_FAILURE, that._composeRejection(xhrPoll), 'polling booking details');
                                break;
                            default: // 403, 410, 429, 500 - all of them fail conditions
                                that._callCallback(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(xhrPoll), 'polling booking details');
                        }
                    });
                };
                that._callCallback(LivePricingClient.ON_BOOKING_DETAILS_CREATE, null, true);
                pollBookingDetails();
            }).fail(function (xhr) {
                that._callCallback(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(xhr), 'polling booking details (server may be down)');
            });
        };

        LivePricingClient.prototype._start = function (options) {
            var that = this;

            this._createSession(options)
                .then(this._pollForResults)
                    .progress(function (data) {
                        data = that._inflateResults(data);
                        that._callCallback(LivePricingClient.ON_RESULTS, data, false);
                    })
                    .done(function (data) {
                        data = that._inflateResults(data);
                        that._callCallback(LivePricingClient.ON_RESULTS, data, true);
                    })
                    .fail(function (callback, failure, source) {
                        that._callCallback(callback, failure, source);
                    });
        };

        LivePricingClient.prototype._composeRejection = function(xhr) {
            var debugInfo;
            try {
                debugInfo = JSON.parse(xhr.responseText || "");
            } catch (e) {
                debugInfo = "Could not provide further help";
            }

            var rejection = {
                status: xhr.status,
                statusText: xhr.statusText,
                debugInformation: debugInfo
            };

            return rejection;
        };

        LivePricingClient.prototype._registerCallback = function (callbackId, callbackFunc, context) {
            this._callbacks.push({
                id: callbackId,
                func: callbackFunc,
                context: context
            });
        };

        LivePricingClient.prototype._callCallback = function () {
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

        LivePricingClient.prototype._createSession = function (query) {
            var that = this;
            var dfd = $.Deferred();

            $.ajax({
                type: 'POST',
                url: that._apiService,
                dataType: 'JSON',
                data: query
            }).done(function (data, textStatus, xhr) {
                var location = xhr.getResponseHeader('Location');
                that._callCallback(LivePricingClient.ON_SESSION_CREATED, data, false);
                dfd.resolveWith(that, [location, query]);
            }).fail(function (xhr) {
                if (xhr.status == 400) {
                    dfd.reject(LivePricingClient.ON_VALIDATION_FAILURE, that._composeRejection(xhr), 'session creation');
                } else {
                    dfd.reject(LivePricingClient.ON_SERVER_FAILURE, that._composeRejection(xhr), 'session creation');
                }
            });

            return dfd.promise();
        };

        LivePricingClient.prototype._createSessionFail = function (that, failure, source) {
            that._callCallback(LivePricingClient.ON_SERVER_FAILURE, failure, source);
        };

        LivePricingClient.prototype._pollForResults = function (location, query) {
            var that = this;
            var dfd = $.Deferred();
            var attemptCount = 0;

            var getTimeoutMs = function () {
                if (attemptCount < 2)
                    return 500;
                if (attemptCount < 6)
                    return 1500;
                return 3000;
            };

            var testAndSetTimeout = function () {
                attemptCount++;
                if (attemptCount < LivePricingClient._MAX_POLLING_ATTEMPTS) {
                    setTimeout(timeoutHandler, getTimeoutMs());
                    return true;
                }
                return false;
            };

            var timeoutHandler = function () {
                $.ajax({
                    type: 'GET',
                    url: location,
                    dataType: 'JSON',
                    data: {
                        includecarriers: query.includecarriers,
                        excludecarriers: query.excludecarriers
                    }
                }).always(function (result, textStatus, xhr) {
                    switch (xhr.status) {
                        case 200:
                            that._mostRecentResult = result;
                            if (result.Status === "UpdatesPending") {
                                if (testAndSetTimeout()) {
                                    dfd.notify(result);
                                } else {
                                    dfd.resolve(result);
                                }
                            } else {
                                dfd.resolve(result);
                            }
                            break;
                        case 204:
                        case 304:
                        case 500: // poll again silently, or mark as complete if attempt limit reached
                            if (!testAndSetTimeout()) {
                                dfd.resolve(that._mostRecentResult);
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

            testAndSetTimeout();

            return dfd.promise();
        };

        LivePricingClient.prototype._inflateResults = function (data) {
            var that = this;

            if (data && data.Itineraries)
                return { Flights: that._inflateFlightItineraries(data), Query: data.Query };

            if (data && data.Segments)
                return that._inflateFlightBookingDetails(data);

            return data;
        };

        LivePricingClient.prototype._inflateFlightItineraries = function (data) {
            if (!data || !data.Itineraries)
                return data;

            var agents = [];
            $.each(data.Agents || [], function (idx, val) {
                agents[val.Id] = val;
            });

            var carriers = [];
            $.each(data.Carriers || [], function (idx, val) {
                carriers[val.Id] = val;

            });

            var places = [];
            $.each(data.Places || [], function (idx, val) {
                places[val.Id] = val;
            });

            var legs = [];

            $.each(data.Legs || [], function (i, leg) {
                $.each(leg.Carriers, function (j, carrierId) {
                    leg.Carriers[j] = carriers[carrierId] || carrierId;
                });

                $.each(leg.OperatingCarriers, function (j, opCarrierId) {
                    leg.OperatingCarriers[j] = carriers[opCarrierId] || opCarrierId;
                });

                if(leg.FlightNumbers) {
                    $.each(leg.FlightNumbers, function (j, flightNumber) {
                        flightNumber.Carrier = carriers[flightNumber.CarrierId];
                        //flightNumber.CarrierCode = carriers[flightNumber.CarrierId].Code;
                    });
                }
                leg.DestinationStation = places[leg.DestinationStation] || leg.DestinationStation;
                leg.OriginStation = places[leg.OriginStation] || leg.OriginStation;

                $.each(leg.Stops, function (j, stopId) {
                    leg.Stops[j] = places[stopId] || stopId;
                });

                legs[leg.Id] = leg;
            });

            $.each(data.Itineraries || [], function (i, it) {
                $.each(it.PricingOptions, function (j, po) {
                    $.each(po.Agents, function (k, agentId) {
                        po.Agents[k] = agents[agentId] || agentId;
                    });
                });

                it.OutboundLegId = legs[it.OutboundLegId] || it.OutboundLegId;
                it.InboundLegId = legs[it.InboundLegId] || it.InboundLegId;
            });

            return data;
        };

        LivePricingClient.prototype._inflateFlightBookingDetails = function (data) {
            if (!data || !data.Segments)
                return data;

            var carriers = [];
            $.each(data.Carriers || [], function (idx, val) {
                carriers[val.Id] = val;
            });

            var places = [];
            $.each(data.Places || [], function (idx, val) {
                places[val.Id] = val;
            });

            $.each(data.Segments || [], function (i, segment) {
                segment.OriginStation = places[segment.OriginStation] || segment.OriginStation;
                segment.DestinationStation = places[segment.DestinationStation] || segment.DestinationStation;
                segment.Carrier = carriers[segment.Carrier] || segment.Carrier;
                segment.OperatingCarrier = carriers[segment.OperatingCarrier] || segment.OperatingCarrier;
            });

            return data;
        };

        return LivePricingClient;
    })();

})();