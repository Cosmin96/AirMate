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

        LivePricingClient.ON_RESULTS = 'onResults';
        LivePricingClient.ON_SERVER_FAILURE = 'onServerFailure';
        LivePricingClient.ON_VALIDATION_FAILURE = 'onValidationFailure';

        LivePricingClient._CARHIRE_LIVE_PRICING = '/apiservices/carhire/liveprices/v2/';

        LivePricingClient._MAX_POLLING_ATTEMPTS = 22;

        function LivePricingClient(callbacks) {
            this._apiService = '';
            this._callbacks = [];
            this._completeResult = {};
            this._images = [];
            this._carTypes = [];
            this._pollUrl = '';

            if (callbacks) {
                this._registerCallback(LivePricingClient.ON_RESULTS, callbacks.onResults, this);
                this._registerCallback(LivePricingClient.ON_SERVER_FAILURE, callbacks.onServerFailure, this);
                this._registerCallback(LivePricingClient.ON_VALIDATION_FAILURE, callbacks.onValidationFailure, this);
            }

            this.defaults = {
                locationSchema: "Iata"
            };
        }

        LivePricingClient.prototype.getCarHire = function (options) {
            this._apiService = LivePricingClient._CARHIRE_LIVE_PRICING;
            options = $.extend(this.defaults, options || {});
            this._composeResults(options);
            return options;
        };

        LivePricingClient.prototype._composeResults = function (options) {
            var that = this;

            this._createSession(options)
                .then(this._pollForResults)
                    .progress(function (data) {
                        that._inflateAndAppend(data);
                        that._completeResult.images = that._images;
                        that._completeResult.carTypes = that._carTypes;
                        that._callCallback(LivePricingClient.ON_RESULTS, that._completeResult, false);
                    })
                    .done(function (data) {
                        that._inflateAndAppend(data);
                        that._completeResult.images = that._images;
                        that._completeResult.carTypes = that._carTypes;
                        that._callCallback(LivePricingClient.ON_RESULTS, that._completeResult, true);
                    })
                    .fail(function (callback, failure, source) {
                        that._callCallback(callback, failure, source);
                    });
        };

        LivePricingClient.prototype._composeRejection = function (xhr) {
            var debugInfo;
            try {
                debugInfo = JSON.parse(xhr.responseText || "");
            } catch (e) {
                debugInfo = "Could not provide further help";
            }

            var rejection = {
                status: xhr.status,
                status_text: xhr.statusText,
                debug_information: debugInfo
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
                        } catch (err) {
                            // An error happened in user-land code.
                            console.debug("An exception was thrown when calling your " + callbackId + " callback");
                            return;
                        }
                    }
                }
            }

            console.debug("An " + callbackId + " event occurred, but no callback is registered to handle it");
        };

        LivePricingClient.prototype._inflateAndAppend = function (data) {
            var that = this;
            if (data.images) {
                $.each(data.images, function (i, image) {
                    that._images[image.id] = image;
                });
            }
            if (data.car_types)
                that._car_types = data.car_types;

            data = this._inflateResults(data);
            $.extend(true, this._completeResult, data);
            this._completeResult.cars.sort(function (a, b) {
                var aPrice = a.price_all_days;
                var bPrice = b.price_all_days;
                if (a.price_all_days === null || isNaN(a.price_all_days) || a.price_all_days < 0) aPrice = 9999999;
                if (b.price_all_days === null || isNaN(b.price_all_days) || b.price_all_days < 0) bPrice = 9999999;

                var sortValue = aPrice - bPrice;
                if (sortValue === 0) // if the prices are the same, sort on the deeplink
                    return a.deeplink_url.localeCompare(b.deeplink_url);
                else
                    return sortValue;
            });
        };

        LivePricingClient.prototype._createSession = function (query) {
            var that = this;
            var dfd = $.Deferred();

            var slash = '/';
            var qry = query.market + slash +
                query.currency + slash +
                query.locale + slash +
                query.pickupplace + slash +
                query.dropoffplace + slash +
                encodeURIComponent(query.pickupdatetime) +
                (query.dropoffdatetime ? slash + encodeURIComponent(query.dropoffdatetime) : '') + slash +
                query.driverage + "?userip=" +
                encodeURIComponent(query.userip);

            $.ajax({
                type: 'GET',
                url: that._apiService + qry,
                dataType: 'json'
            }).always(function (result, textStatus, xhr) {
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

        LivePricingClient.prototype._createSessionFail = function (that, failure, source) {
            that._callCallback(LivePricingClient.ON_SERVER_FAILURE, failure, source);
        };

        LivePricingClient.prototype._pollForResults = function (data) {
            var that = this;
            var dfd = $.Deferred();
            var attemptCount = 1;

            var getTimeoutMs = function () {
                if (attemptCount < 2)
                    return 500;
                if (attemptCount < 6)
                    return 1500;
                return 3000;
            };

            var testAndSetTimeout = function () {
                if (dfd.state() === 'resolved')
                    return false;
                attemptCount++;
                if (attemptCount < LivePricingClient._MAX_POLLING_ATTEMPTS) {
                    setTimeout(timeoutHandler, getTimeoutMs());
                    return true;
                }
                return false;
            };

            var getAgentsPending = function (websites) {
                for (var i = 0; i < websites.length; i++) {
                    if (websites[i].in_progress) {
                        return true;
                    }
                }
                return false;
            };

            var notifyOrResolve = function (result) {
                if (getAgentsPending(result.websites)) {
                    if (testAndSetTimeout()) {
                        dfd.notify(result);
                    } else {
                        dfd.resolve(result);
                    }
                } else {
                    dfd.resolve(result);
                }
            };

            var timeoutHandler = function () {
                var opts = {
                    type: 'GET',
                    url: that._pollUrl,
                    dataType: 'JSON'
                };
                $.ajax(opts).always(function (result, textStatus, xhr) {
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

        LivePricingClient.prototype._getPollUrl = function () {
            console.log(this._pollUrl);
            return this._pollUrl;
        };

        LivePricingClient.prototype._inflateResults = function (data) {
            var that = this;

            if (data && data.cars)
                return that._inflateCarHireQuotes(data);

            return data;
        };

        LivePricingClient.prototype._inflateCarHireQuotes = function (data) {
            if (!data || !data.cars)
                return data;

            var that = this;
            var websites = [];
            $.each(data.websites, function (i, website) {
                websites[website.id] = website;
            });

            $.each(data.cars, function (i, car) {
                car.website_id = websites[car.website_id] || car.website_id;
                car.image_id = that._images[car.image_id] || that._images[0];
            });

            return data;
        };

        return LivePricingClient;
    })();

})();