// ==UserScript==
// @name           Memrise Catch Up Review
// @namespace      https://github.com/cooljingle
// @description    Fast-tracks the growth level of any words that have been left for too long but are still reviewed correctly
// @match          http://www.memrise.com/course/*/garden/review*
// @match          http://www.memrise.com/garden/review/*
// @version        0.2.2
// @updateURL      https://github.com/cooljingle/memrise-catch-up-review/raw/master/Memrise_Catch_Up_Review.user.js
// @downloadURL    https://github.com/cooljingle/memrise-catch-up-review/raw/master/Memrise_Catch_Up_Review.user.js
// @grant          none
// ==/UserScript==

$(document).ready(function() {
    var MAX_INTERVAL_DAYS = 180,
        MAX_INTERVAL = MAX_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
        MAX_CATCHUPS = 8;

    $(document).ajaxSuccess(
        function(event, request, settings) {
            var response = request.responseJSON,
                correctAnswer = getValue(settings.data, "score") === "1",
                boxTemplate = getValue(settings.data, "box_template"),
                isTestBox = boxTemplate && MEMRISE.garden.box_mapping[boxTemplate].prototype instanceof MEMRISE.garden.box_types.TestBox;
                isIntervalResetting = getValue(settings.data, "intervalReset") === "true",
                validRequest = !!(response && response.thinguser && ((correctAnswer && isTestBox)|| isIntervalResetting)),
                shouldNotUpdate = getValue(settings.data, "update_scheduling") === "false";

            if (validRequest && !shouldNotUpdate) {
                var catchUpCount = parseInt(getValue(settings.data, "catchups"), 10) || 0,
                    initialLevel = parseInt(getValue(settings.data, "initialLevel"), 10) || response.thinguser.growth_level,
                    lastDate = new Date(getValue(settings.data, "lastDate") ||
                        MEMRISE.garden.boxes._list && _.findWhere(MEMRISE.garden.boxes._list, {
                            thing_id: response.thinguser.thing_id,
                            column_a: response.thinguser.column_a,
                            column_b: response.thinguser.column_b
                        }).thinguser.last_date || new Date()
                    ),
                    currentDate = new Date(response.thinguser.last_date),
                    nextDate = new Date(response.thinguser.next_date),
                    hasInsufficientNextDate = (nextDate - currentDate) < Math.min((currentDate - lastDate), MAX_INTERVAL),
                    requiresCatchUp = hasInsufficientNextDate && (catchUpCount < MAX_CATCHUPS || isIntervalResetting),
                    requiresIntervalReset = response.thinguser.interval.toPrecision(2) > MAX_INTERVAL_DAYS;

                if (requiresIntervalReset) {
                    settings.data = settings.data.replace(/points=\d+/, "points=0&intervalReset=true").replace(/score=\d+/, "score=0");
                    MEMRISE.garden.stats.show_message("Interval Reset..");
                    $.post(settings.url, settings.data);
                } else if (requiresCatchUp) {

                    if (catchUpCount === 0) {
                        settings.data = settings.data.replace(/points=\d+/,
                            "points=0&lastDate=" + lastDate.toISOString() + "&initialLevel=" + response.thinguser.growth_level + "&catchups=0");
                    }

                    if (isIntervalResetting && getValue(settings.data, "score") === "0") {
                        settings.data = settings.data.replace(/score=\d+/, "score=1");
                    }

                    if (response.thinguser.growth_level === initialLevel + catchUpCount) {
                        catchUpCount++;
                        if (catchUpCount > 8) {
                            var errorMsg = "Catch Up Review Script catchUps exceeded the theoretical limit. " +
                                "Next date = " + nextDate +
                                ", Current date = " + currentDate +
                                ", Last date = " + lastDate +
                                ", Future gap = " + (nextDate - currentDate) +
                                ", Past gap = " + Math.min(currentDate - lastDate, MAX_INTERVAL);
                            throw errorMsg;
                        }
                        settings.data = settings.data.replace(/catchups=\d+/, "catchups=" + catchUpCount);
                        MEMRISE.garden.stats.show_message("Catch Up Review +" + catchUpCount);
                    }
                    $.post(settings.url, settings.data);
                }
            }
        }
    );

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function getValue(formData, name) {
        var regex = new RegExp(name + "=([^&]+)");
        var match = (formData || "").match(regex);
        return match && match[1];
    }
});
