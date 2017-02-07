angular.module('orsApp.utils-service', []).factory('orsUtilsService', ['$http', '$timeout', '$location', ($http, $timeout, $location) => {
    let orsUtilsService = {};
    /**
     * checks whether position are valid coordinates
     * @param {String} lat: Latitude as string
     * @param {String} lng: Longitude as string
     * @return {boolean}: true or false
     */
    orsUtilsService.isCoordinate = (lat, lng) => {
        const ck_lat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
        const ck_lng = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;
        const validLat = ck_lat.test(lat);
        const validLon = ck_lng.test(lng);
        if (validLat && validLon) {
            return true;
        } else {
            return false;
        }
    };
    /**
     * Rounds decimal of coordinate
     * @param {String} coord: Coordinate
     * @return {String} latlng: String latLng representation "lat, lng"
     */
    orsUtilsService.roundCoordinate = function(coord) {
        coord = Math.round(coord * 1000000) / 1000000;
        return coord;
    };
    /**
     * parses leaflet latlng to string representation
     * @param {Object} latlng: Leaflet latLng Object
     * @return {String} latlng: String latLng representation "lat, lng"
     */
    orsUtilsService.parseLatLngString = function(latlng) {
        return Math.round(latlng.lat * 1000000) / 1000000 + ', ' + Math.round(latlng.lng * 1000000) / 1000000;
    };
    /**
     * parses leaflet latlng to string representation
     * @param {Object} latlng: Leaflet latLng Object
     * @return {String} latlng: String latLng representation "lat, lng"
     */
    orsUtilsService.parseLngLatString = function(latlng) {
        return Math.round(latlng.lng * 1000000) / 1000000 + ', ' + Math.round(latlng.lat * 1000000) / 1000000;
    };
    /**
     * Decodes to a [latitude, longitude] coordinates array.
     * @param {String} str
     * @param {Number} precision
     * @returns {Array}
     */
    orsUtilsService.decodePolyline = function(str, precision) {
        var index = 0,
            lat = 0,
            lng = 0,
            coordinates = [],
            shift = 0,
            result = 0,
            byte = null,
            latitude_change,
            longitude_change,
            factor = Math.pow(10, precision || 5);
        // Coordinates have variable length when encoded, so just keep
        // track of whether we've hit the end of the string. In each
        // loop iteration, a single coordinate is decoded.
        while (index < str.length) {
            // Reset shift, result, and byte
            byte = null;
            shift = 0;
            result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
            shift = result = 0;
            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += latitude_change;
            lng += longitude_change;
            coordinates.push([lat / factor, lng / factor]);
        }
        return coordinates;
    };
    /** 
     * generates object for request and serializes it to http parameters   
     * @param {Object} settings: route settings object
     * @param {Object} userSettings: To limit the amount of responses
     * @return {Object} payload: Paylod object used in xhr request
     */
    orsUtilsService.routingPayload = (settings, userSettings) => {
        console.log(settings, userSettings);
        let payload;
        payload = {
            profile: lists.profiles[settings.profile.type].request,
            preference: settings.profile.options.weight.toLowerCase(),
            language: userSettings.routinglang,
            geometry_format: 'encodedpolyline',
            instructions: true,
            geometry: true,
            units: 'm',
            prettify_instructions: true,
            elevation: true,
            options: {
                profile_params: {}
            }
        };
        /** prepare waypoints */
        let waypoints = [];
        angular.forEach(settings.waypoints, function(waypoint) {
            if (waypoint._set == 1) waypoints.push(waypoint);
        });
        payload.coordinates = '';
        for (let j = 0, i = 0; i < waypoints.length; i++) {
            payload.coordinates += waypoints[i]._latlng.lng + ',' + waypoints[i]._latlng.lat + '|';
        }
        payload.coordinates = payload.coordinates.slice(0, -1);
        /** loop through avoidable objects in settings and check if they can
        be used by selected routepref */
        const subgroup = lists.profiles[settings.profile.type].subgroup;
        payload.options.avoid_features = '';
        angular.forEach(settings.profile.options.avoidables, function(value, key) {
            if (value === true) {
                const avSubgroups = lists.optionList.avoidables[key].subgroups;
                if (_.includes(avSubgroups, subgroup)) {
                    payload.options.avoid_features += lists.optionList.avoidables[key].name + '|';
                }
            }
        });
        if (lists.profiles[settings.profile.type].subgroup == 'Bicycle') {
            if (!angular.isUndefined(settings.profile.options.difficulty)) {
                if (settings.profile.options.difficulty.avoidhills === true) payload.options.avoid_features += 'hills' + '|';
            }
        }
        if (payload.options.avoid_features.length == 0) {
            delete payload.options.avoid_features;
        } else {
            payload.options.avoid_features = payload.options.avoid_features.slice(0, -1);
        }
        if (subgroup == 'HeavyVehicle') {
            payload.options.modeType = settings.profile.type;
            if (!angular.isUndefined(settings.profile.options.width)) payload.options.profile_params.width = settings.profile.options.width.toString();
            if (!angular.isUndefined(settings.profile.options.height)) payload.options.profile_params.height = settings.profile.options.height.toString();
            if (!angular.isUndefined(settings.profile.options.weight)) payload.options.profile_params.weight = settings.profile.options.hgvWeight.toString();
            if (!angular.isUndefined(settings.profile.options.length)) payload.options.profile_params.length = settings.profile.options.length.toString();
            if (!angular.isUndefined(settings.profile.options.axleload)) payload.options.profile_params.axleload = settings.profile.options.axleload.toString();
            if (!angular.isUndefined(settings.profile.options.hazardous)) payload.options.profile_params.hazmat = true;
        }
        if (settings.profile.options.maxspeed) payload.options.maxSpeed = settings.profile.options.maxspeed.toString();
        //  extras
        if (subgroup == 'Bicycle' || subgroup == 'Pedestrian' || subgroup == 'Wheelchair') {
            if (lists.profiles[settings.profile.type].elevation === true) {
                //payload.extra_info = 'gradients|surface|waytypes|priority';
                payload.extra_info = 'surface';
            }
        }
        // fitness
        if (subgroup == 'Bicycle') {
            if (settings.profile.options.steepness >= 0 & settings.profile.options.steepness <= 15) {
                payload.options.profile_params.maximumGradient = settings.profile.options.steepness.toString();
            }
            if (settings.profile.options.fitness >= 0 & settings.profile.options.fitness <= 3) {
                payload.options.profile_params.level = settings.profile.options.fitness.toString();
            }
        }
        // if avoid area polygon
        //payload.options.avoidPolygons
        if (lists.profiles[settings.profile.type].subgroup == 'Wheelchair') {
            payload.options.profile_params.surface_type = settings.profile.options.surface.toString();
            payload.options.profile_params.track_type = '';
            payload.options.profile_params.smoothness_type = '';
            payload.options.profile_params.maximum_sloped_curb = settings.profile.options.curb.toString();
            payload.options.profile_params.maximum_incline = settings.profile.options.incline.toString();
        }
        payload.options = JSON.stringify(payload.options);
        console.log(payload)
        return payload;
    };
    /** 
     * generates object for request and serializes it to http parameters   
     * @param {String} str: Free form address
     * @param {boolean} reverse: if reversed geocoding, default false
     * @param {string} language: Desired language of response
     * @param {number} limit: To limit the amount of responses
     * @return {Object} payload: Paylod object used in xhr request
     */
    orsUtilsService.geocodingPayload = function(obj, reverse = false, language = 'en', limit = 20) {
        let payload;
        if (!reverse) {
            payload = {
                query: obj,
                lang: language,
                limit: limit
            };
        } else {
            payload = {
                location: obj,
                lang: language,
                limit: limit
            };
        }
        return payload;
    };
    /** 
     * generates object for request and serializes it to http parameters   
     * @param {Object} settings: Settings object for payload
     * @return {Object} payload: Paylod object used in xhr request
     */
    orsUtilsService.isochronesPayload = function(settings) {
        let payload;
        payload = {
            format: 'json',
            locations: settings.waypoints[0]._latlng.lng + ',' + settings.waypoints[0]._latlng.lat,
            range_type: settings.profile.options.analysis_options.method == 0 ? 'time' : 'distance',
            range: settings.profile.options.analysis_options.method == 0 ? settings.profile.options.analysis_options.isovalue * 60 : settings.profile.options.analysis_options.isovalue * 1000,
            interval: settings.profile.options.analysis_options.method == 0 ? settings.profile.options.analysis_options.isointerval * 60 : settings.profile.options.analysis_options.isointerval * 1000,
            location_type: settings.profile.options.analysis_options.reverseflow == true ? lists.isochroneOptionList.reverseFlow.destination : lists.isochroneOptionList.reverseFlow.start,
            profile: lists.profiles[settings.profile.type].request,
            attributes: 'area|reachfactor',
            //options: {}
        };
        return payload;
    };
    orsUtilsService.addShortAddresses = function(features) {
        angular.forEach(features, function(feature) {
            const properties = feature.properties;
            let shortAddress = '';
            if ('name' in properties) {
                shortAddress += properties.name;
                shortAddress += ', ';
            }
            if ('street' in properties) {
                shortAddress += properties.street;
                if ('house_number' in properties) {
                    shortAddress += ' ' + properties.house_number;
                }
                shortAddress += ', ';
            }
            //if ('postal_code' in properties) shortAddress += properties.postal_code;
            if ('state' in properties) {
                shortAddress += properties.state;
                shortAddress += ', ';
            } else if ('county' in properties) {
                shortAddress += properties.county;
                shortAddress += ', ';
            } else if ('district' in properties) {
                shortAddress += properties.district;
                shortAddress += ', ';
            }
            if ('country' in properties) {
                shortAddress += properties.country;
                shortAddress += ', ';
            }
            shortAddress = shortAddress.slice(0, -2);
            feature.shortaddress = shortAddress;
        });
        return features;
    };
    /**
     * Calls the Javascript functions getElementsByTagNameNS
     * @param element: XML element to retrieve the information from
     * @param ns: Namespace to operate in
     * @param tagName: attribute name of the child elements to return
     * @param collection: if a collection of features is to be returned
     * @return suitable elements of the given input element that match the tagName
     */
    orsUtilsService.getElementsByTagNameNS = function(element, ns, tagName, collection) {
        if (element.getElementsByTagNameNS) {
            if (collection) {
                var collectionArr = [];
                collectionArr.push(element.getElementsByTagNameNS(ns, tagName));
                return collectionArr;
            }
            return element.getElementsByTagNameNS(ns, tagName);
        }
    };
    /**
     * parses the routing results of the service to a single 'path'
     * @param results: response of the service
     * @param routeString: Leaflet LineString representing the whole route
     */
    orsUtilsService.writeRouteToSingleLineString = function(results) {
        var routeString = [];
        var routeGeometry = orsUtilsService.getElementsByTagNameNS(results, orsNamespaces.xls, 'RouteGeometry')[0];
        angular.forEach(orsUtilsService.getElementsByTagNameNS(routeGeometry, orsNamespaces.gml, 'pos'), function(point) {
            point = point.text || point.textContent;
            point = point.split(' ');
            // if elevation contained
            if (point.length == 2) {
                point = L.latLng(point[1], point[0]);
            } else {
                point = L.latLng(point[1], point[0], point[2]);
            }
            routeString.push(point);
        });
        return routeString;
    };
    /**
     * the line strings represent a part of the route when driving on one street (e.g. 7km on autoroute A7)
     * we examine the lineStrings from the instruction list to get one lineString-ID per route segment so that we can support mouseover/mouseout events on the route and the instructions
     * @param {Object} results: XML response
     */
    orsUtilsService.parseResultsToLineStrings = function(results) {
        var listOfLineStrings = [];
        var heightIdx = 0;
        var routeInstructions = orsUtilsService.getElementsByTagNameNS(results, orsNamespaces.xls, 'RouteInstructionsList')[0];
        if (routeInstructions) {
            routeInstructions = orsUtilsService.getElementsByTagNameNS(routeInstructions, orsNamespaces.xls, 'RouteInstruction');
            $A(routeInstructions).each(function(instructionElement) {
                var directionCode = orsUtilsService.getElementsByTagNameNS(instructionElement, orsNamespaces.xls, 'DirectionCode')[0];
                directionCode = directionCode.textContent;
                //skip directionCode 100 for now
                if (directionCode == '100') {
                    return;
                }
                var segment = [];
                $A(orsUtilsService.getElementsByTagNameNS(instructionElement, orsNamespaces.gml, 'pos')).each(function(point) {
                    point = point.text || point.textContent;
                    point = point.split(' ');
                    point = L.latLng(point[1], point[0]);
                    segment.push(point);
                });
                listOfLineStrings.push(segment);
            });
        }
        return listOfLineStrings;
    };
    /**
     * corner points are points in the route where the direction changes (turn right at street xy...)
     * @param {Object} results: XML response
     * @param {Object} converterFunction
     */
    orsUtilsService.parseResultsToCornerPoints = function(results, converterFunction) {
        var listOfCornerPoints = [];
        var routeInstructions = orsUtilsService.getElementsByTagNameNS(results, orsNamespaces.xls, 'RouteInstructionsList')[0];
        if (routeInstructions) {
            routeInstructions = orsUtilsService.getElementsByTagNameNS(routeInstructions, orsNamespaces.xls, 'RouteInstruction');
            $A(routeInstructions).each(function(instructionElement) {
                var directionCode = orsUtilsService.getElementsByTagNameNS(instructionElement, orsNamespaces.xls, 'DirectionCode')[0];
                directionCode = directionCode.textContent;
                //skip directionCode 100 for now
                if (directionCode == '100') {
                    return;
                }
                var point = orsUtilsService.getElementsByTagNameNS(instructionElement, orsNamespaces.gml, 'pos')[0];
                point = point.text || point.textContent;
                point = point.split(' ');
                point = L.latLng(point[1], point[0]);
                // point = converterFunction(point);
                listOfCornerPoints.push(point);
            });
        }
        return listOfCornerPoints;
    };
    /**
     * Returns summary of the route
     * @param {Object} results: XML response
     */
    orsUtilsService.parseRouteSummary = function(results) {
        var yardsUnit, ascentValue, ascentUnit, descentValue, descentUnit, ascentArr, descentArr, totalTimeArr = [],
            distArr = [],
            actualdistArr = [],
            routeSummary = {};
        var summaryElement = orsUtilsService.getElementsByTagNameNS(results, orsNamespaces.xls, 'RouteSummary')[0];
        var totalTime = orsUtilsService.getElementsByTagNameNS(summaryElement, orsNamespaces.xls, 'TotalTime')[0];
        totalTime = totalTime.textContent || totalTime.text;
        //<period>PT 5Y 2M 10D 15H 18M 43S</period>
        //The example above indicates a period of five years, two months, 10 days, 15 hours, a8 minutes and 43 seconds
        totalTime = totalTime.replace('P', '');
        totalTime = totalTime.replace('T', '');
        totalTime = totalTime.replace('D', 'days');
        totalTime = totalTime.replace('H', 'hr');
        totalTime = totalTime.replace('M', 'min');
        totalTime = totalTime.replace('S', 'seconds');
        totalTime = totalTime.match(/(\d+|[^\d]+)/g).join(',');
        totalTime = totalTime.split(',');
        routeSummary.time = totalTime;
        // get distance
        var distance = orsUtilsService.getElementsByTagNameNS(summaryElement, orsNamespaces.xls, 'TotalDistance')[0];
        var distanceValue = distance.getAttribute('value');
        var distanceUnit = distance.getAttribute('uom');
        //use mixture of km and m
        distArr = orsUtilsService.convertDistanceFormat(distanceValue, lists.distanceUnits[0]);
        routeSummary.distance = distArr;
        // get actual distance
        var actualDistance = orsUtilsService.getElementsByTagNameNS(summaryElement, orsNamespaces.xls, 'ActualDistance')[0];
        if (actualDistance !== undefined) {
            var actualDistanceValue = actualDistance.getAttribute('value');
            var actualDistanceUnit = actualDistance.getAttribute('uom');
            //use mixture of km and m
            actualdistArr = orsUtilsService.convertDistanceFormat(actualDistanceValue, lists.distanceUnits[0]);
            routeSummary.actualDistance = actualdistArr;
        }
        // get ascent descent summary
        var ascent = orsUtilsService.getElementsByTagNameNS(results, orsNamespaces.xls, 'Ascent')[0];
        var descent = orsUtilsService.getElementsByTagNameNS(results, orsNamespaces.xls, 'Descent')[0];
        if (ascent !== undefined) {
            ascentValue = ascent.getAttribute('value');
            ascentUnit = ascent.getAttribute('uom');
            //use mixture of km and m
            ascentArr = orsUtilsService.convertDistanceFormat(ascentValue, lists.distanceUnits[0]);
            routeSummary.ascent = ascentArr;
        }
        if (descent !== undefined) {
            descentValue = descent.getAttribute('value');
            descentUnit = descent.getAttribute('uom');
            //use mixture of km and m
            descentArr = orsUtilsService.convertDistanceFormat(descentValue, lists.distanceUnits[0]);
            routeSummary.descent = descentArr;
        }
        return routeSummary;
    };
    /**
     * convert a distance to an easy to read format.
     * @param distance: a number
     * @param uom: distance unit; one of m/yd
     */
    orsUtilsService.convertDistanceFormat = function(distance, uom) {
        uom = uom.toLowerCase();
        var origDistance = parseFloat(distance);
        distance = parseFloat(distance);
        if (distance >= 1000) {
            uom = 'km';
            distance = distance / 1000;
            distance = orsUtilsService.round(distance);
        } else {
            uom = 'm';
        }
        distance = orsUtilsService.round(distance);
        return [origDistance, distance, uom];
    };
    /**
     * positions are often set as data-attributes in the Ui/ HTML file. Converts them to OpenLayers.LonLat position
     * @param positionString: String containing the coordinates
     * @return: OpenLayers.LonLat with these coordinates 
     */
    orsUtilsService.convertPositionStringToLonLat = function(positionString) {
        var pos = positionString.split(' ');
        pos = L.latLng(pos[1], pos[0]);
        return pos;
    };
    /**
     * rounds a given distance to an appropriate number of digits
     * @distance: number to round
     */
    orsUtilsService.round = function(distance) {
        //precision - set the number of fractional digits to round to
        var precision = 4;
        if (distance < 0.3) {
            precision = 3;
        }
        if (distance >= 0.3) {
            precision = 2;
        }
        if (distance > 2) {
            precision = 1;
        }
        if (distance > 100) {
            precision = 0;
        }
        if (distance > 300) {
            precision = -1;
        }
        if (distance > 2000) {
            precision = -2;
        }
        var p = Math.pow(10, precision);
        return Math.round(distance * p) / p;
    };
    /**
     * generates a string of current settings to be used in permalink
     * @settings: route/analysis settings
     * @useroptions: useroptions
     */
    orsUtilsService.parseSettingsToPermalink = function(settings, userOptions) {
        console.info("parseSettingsToPermalink", settings);
        if (settings.profile === undefined) return;
        var link = '';
        // Hack to remove angular properties that do not have to be saved
        let profile = angular.fromJson(angular.toJson(settings.profile));
        let waypoints = angular.fromJson(angular.toJson(settings.waypoints));
        console.log(settings.profile)

        function getProp(obj) {
            for (var o in obj) {
                if (typeof obj[o] == "object") {
                    getProp(obj[o]);
                } else {
                    // Filter functions and properties of other types
                    if (typeof obj[o] != "function" && o.toString().charAt(0) != '_' && (lists.permalinkFilters[settings.profile.type].includes(o) || lists.permalinkFilters.avoidables.includes(o) || lists.permalinkFilters.analysis.includes(o))) {
                        link = link.concat('&' + o + '=' + obj[o]);
                    }
                }
            }
        }
        if (waypoints[0] !== undefined) {
            if (waypoints[0]._latlng.lat !== undefined) {
                link = link.concat("wps=");
                for (let waypoint of waypoints) {
                    if (waypoint._latlng.lng == undefined) continue;
                    link = link.concat(Math.round(waypoint._latlng.lat * 1000000) / 1000000);
                    link = link.concat(',');
                    link = link.concat(Math.round(waypoint._latlng.lng * 1000000) / 1000000);
                    link = link.concat(',');
                }
                link = link.slice(0, -1);
            }
        }
        getProp(profile);
        if (userOptions.routinglang !== undefined) link = link.concat('&routinglang=' + userOptions.routinglang);
        if (userOptions.units !== undefined) link = link.concat('&units=' + userOptions.units);
        // This timeout is neccessariliy needed to update the permalink on router reuse !!!
        $timeout(function() {
            $location.search(link);
        });
    };
    return orsUtilsService;
}]);