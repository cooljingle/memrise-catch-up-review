// ==UserScript==
// @name           Memrise Catch Up Review
// @namespace      https://github.com/cooljingle
// @description    Fast-tracks the growth level of any words that have been left for too long but are still reviewed correctly
// @match          http://www.memrise.com/course/*/garden/review/
// @match          http://www.memrise.com/garden/review/*
// @version        0.1.0
// @updateURL      https://github.com/cooljingle/memrise-catch-up-review/raw/master/Memrise_Catch_Up_Review.user.js
// @downloadURL    https://github.com/cooljingle/memrise-catch-up-review/raw/master/Memrise_Catch_Up_Review.user.js
// @grant          none
// ==/UserScript==

$(document).ready(function() {
    var MAX_INTERVAL = 180 * 24 * 60 * 60 * 1000; //180 days

    $(document).ajaxSuccess(
        function(event, request, settings) {
            var response = request.responseJSON,
                correctAnswer = !!(response && response.thinguser && response.thinguser.current_streak > 0),
                shouldNotUpdate = settings.data && getValue(settings.data, "update_scheduling") === "false";

            if (correctAnswer && !shouldNotUpdate) {
                var catchUpCount = parseInt(getValue(settings.data, "catchups"), 10) || 0,
                    initialLevel = parseInt(getValue(settings.data, "initialLevel"), 10) || response.thinguser.growth_level,
                    lastDate = new Date(getValue(settings.data, "lastDate") || 
                        MEMRISE.garden.boxes._list && _.findWhere(MEMRISE.garden.boxes._list, {
                            thing_id: response.thinguser.thing_id,
                            column_a: response.thinguser.column_a,
                            column_b: response.thinguser.column_b
                        }).thinguser.thinguser_dict.last_date
                    ),
                    currentDate = new Date(response.thinguser.last_date),
                    nextDate = new Date(response.thinguser.next_date),
                    requiresCatchUp = (nextDate - currentDate) < Math.min(currentDate - lastDate, MAX_INTERVAL);

                if (requiresCatchUp) {
                    if (catchUpCount === 0) {
                        settings.data = settings.data.replace(/points=\d+/,
                            "points=0&lastDate=" + lastDate.toISOString() + "&initialLevel=" + response.thinguser.growth_level + "&catchups=0");
                    }

                    if (response.thinguser.growth_level === initialLevel + catchUpCount) {
                        catchUpCount++;
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
        var match = formData.match(regex);
        return match && match[1];
    }
});
