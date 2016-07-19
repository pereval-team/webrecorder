$(function() {
    PublicPrivateSwitch.start();
    BookmarksTable.start();
    RecordingSelector.start();
    BookmarkHiddenSwitch.start();
    UrlManager.start();
});

var UrlManager = (function() {

    var update = function(event, recordingIds) {
        if (event.originalEvent || event.type === "RenameRecording") {
            updateUrl(recordingIds);
        }
    }

    var updateUrl = function(recordingIds) {
        var host = window.location.protocol + "//" + window.location.host;
        var url = host + "/" + user + "/" + coll;

        if (recordingIds.length > 0) {
            url += "/" + recordingIds.join(",");
        }

        window.history.pushState({"ids": recordingIds}, document.title, url);
    }

    var start = function() {
        $(window).on('popstate', selectPrevious);

        var selectedIds = getRecordingIdsFromUrl();

        window.history.replaceState({"ids": selectedIds}, document.title, window.location.href);
        RecordingSelector.select(selectedIds);
    }

    var selectPrevious = function(event) {
        if (!event.originalEvent.state) {
            return;
        }

        var ids = event.originalEvent.state.ids;
        $('.card').removeClass("card-selected");
        RecordingSelector.select(ids);
    };

    var getRecordingIdsFromUrl = function() {
        var url = document.location.href;
        return url.substring(url.lastIndexOf('/') + 1).split(',');
    }

    return {
        start: start,
        update: update
    }
})();

var RecordingSelector = (function() {

    var toggleRecordingSelection = function(event) {
        if(isSelectionEvent(event)) {
            setSomeCardsSelected(event.target);

            BookmarksTable.filterByRecordings(getSelectedRecordingTitles());

            updateRecordingFilterList(event, true);
        }
    }
/*
    var setAllCardsSelected = function() {
        var allCard = $('[data-recording-id="$all"]');

        //$('.card-selected').removeClass('card-selected');
        //$('input:checked').prop('checked', false);

        $(allCard).addClass('card-selected');
        $(allCard).find("input[type='checkbox']").prop('indeterminate', false);
        $(allCard).find("input[type='checkbox']").prop('checked', true);
    }
*/
    var setSomeCardsSelected = function(element) {
        var card = $(element).closest('.card');

        //$('[data-recording-id="$all"]').removeClass('card-selected');
        //$('[data-recording-id="$all"]').find("input[type='checkbox']").prop('indeterminate', true);

        var newVal = !$(card).hasClass("card-selected");
        $(card).toggleClass('card-selected', newVal);

        $(card).find("div.filter-label").toggleClass("active", newVal);

        //if (isNothingSelected() || isEverythingSelected()) {
        //    setAllCardsSelected();
        //}
    }

    var getNewCheckboxValue = function(element) {
        //if ($(element).is('input[type=checkbox]')) {
        //    return $(element).prop('checked');
        //} else {
        //    return !$(element).closest('.card').find("input[type='checkbox']").prop('checked');
        //}
    }

    var selectRecordings = function(recordingIds) {
        $.map(recordingIds, function(recordingId) {
            $('.recording-selector').find('[data-recording-id="' + recordingId + '"]').click();
        });
    }

    var updateSelectedData = function() {
        var size = 0;
        var bookmarks = 0;

        var selected = $(".card-selected");

        if (selected.length == 0) {
            selected = $(".card");
            $("#sel-info").hide();
        } else {
            var msg = "(" + selected.length + " of " + $(".card").length + ")";
            $("#sel-info").text(msg);
            $("#sel-info").show();
        }

        selected.each(function() {
            size += parseInt($(this).find("[data-size]").attr("data-size"));
            bookmarks += parseInt($(this).find("[data-bookmark]").attr("data-bookmark"));
        });

        $("#all-card").find("[data-size]").attr("data-size", size);
        $("#sel-bookmarks").text(bookmarks);

        TimesAndSizesFormatter.format();
    }

    var updateRecordingFilterList = function(event, urlUpdate) {
        var recordingIds = getSelectedRecordingIds();

        var recordingList = "";

        if (recordingIds.length == 0) {
            //recordingList = "All recordings";
            $('.recording-filter-list').closest("li").hide();
            $("#coll-breadcrumb-link").hide();
            $("#coll-breadcrumb-text").show();
            
        } else {
            var recordingTitles = getSelectedRecordingTitles();
            recordingList = recordingTitles.join(", ");
            $('.recording-filter-list').text(recordingList);
            $('.recording-filter-list').closest("li").show();

            $("#coll-breadcrumb-link").show();
            $("#coll-breadcrumb-text").hide();
        }

        if (urlUpdate) {
            UrlManager.update(event, recordingIds);
        }

        updateSelectedData();
    }

    var getSelectedRecordingTitles = function() {
        var recordingIds = getSelectedRecordingIds();
        return $.map(recordingIds, function(recordingId) {
                return $('.recording-selector').find('[data-recording-id="' + recordingId + '"]')
                        .attr('data-recording-title') });
    }

    var getSelectedRecordingIds = function() {
        return $('.card-selected').map( function(){ return $(this).attr('data-recording-id') }).get();
    }

/*
    var isAllRecordingsCard = function(element) {
        return $(element).closest('.card').attr('data-recording-id') === "$all";
    }

    var isNothingSelected = function() {
        return $('.card-selected').length === 0;
    }

    var isEverythingSelected = function() {
        return ($('.card').length - 1) === $('.card-selected').length;
    }

    var hasOneRecording = function () {
        return $('.card').length === 2;
    }
*/
    var isSelectionEvent = function(event) {
        if ($(event.target).hasClass("filter-label")) {
            return true;
        }

        return !($(event.target).hasClass('btn') ||
            $(event.target).hasClass('glyphicon') ||
            $(event.target).is('input[type=text]'));
    }

    var clearFilters = function(event) {
        event.preventDefault();
        $('.card').removeClass("card-selected");
        $('.filter-label').removeClass("active");
        updateRecordingFilterList(event, true);
        return true;
    }

    var start = function() {
        $('div[data-recording-id]').on('click', toggleRecordingSelection);

        $("#clear-all").on('click', clearFilters);

        updateRecordingFilterList(undefined, false);
    }

    return {
        start: start,
        select: selectRecordings,
        getSelectedIds: getSelectedRecordingIds
    }
})();

var PublicPrivateSwitch = (function() {

    var updatePermission = function(event, state) {
        $.ajax({
            url: "/api/v1/collections/" + coll + "/public?user=" + user,
            method: "POST",
            data: {"public": state},

            success: function() {
                $(".ispublic").bootstrapSwitch("state", state, true);
            },
            error: function() {
                //$("#is_public").prop("checked", !state);
                $(".ispublic").bootstrapSwitch("toggleState", true)
                console.log("err");
            }
        });
    }

    var start = function() {
        if (can_admin) {
            $(".ispublic").bootstrapSwitch();

            $(".ispublic").on('switchChange.bootstrapSwitch', updatePermission);
        }
    }

    return {
        start: start
    }
})();

var BookmarksTable = (function() {

    var theTable;

    var start = function() {
        if ($(".table-bookmarks").length) {
            theTable = $(".table-bookmarks").DataTable({
                paging: false,
                columnDefs: getColumnDefs(),
                order: [[2, 'desc']],
                //lengthMenu: [[-1], ["All"]],
                //lengthMenu: [[25, 50, 100, -1], [25, 50, 100, "All"]],
                language: {
                    search: "Filter:",
                    emptyTable: "No bookmarks available in the table",
                    info: "Showing _START_ to _END_ of _TOTAL_ bookmarks",
                    infoEmpty: "Showing 0 to 0 of 0 bookmarks",
                    infoFiltered: "(filtered from _MAX_ total bookmarks)",
                    lengthMenu: "Show _MENU_ bookmarks",
                    zeroRecords: "No matching bookmarks found"

                },
                dom: '<"table-bookmarks-top">tr<"table-bookmarks-bottom"pl><"clear">'
            });
        }
    }

    var hasVisibilityColumn = function() {
        return $('.table-bookmarks th').length === 6;
    }

    var getColumnDefs = function() {
        if (hasVisibilityColumn()) {
            return [
                        { targets: [2, 3, 4, 5], orderable: true },
                        { targets: [0, 1], width: "12px", orderable: false},
                        { targets: [2, 4], width: "15em" },
                        { targets: [3], width: "7.5em" },
                        { targets: [5], width: "5em" }
                    ]
        } else {
            return [
                        { targets: [0, 1, 2, 3], orderable: true },
                        { targets: [0, 2], width: "15em" },
                        { targets: [1], width: "7.5em" },
                        { targets: [3], width: "5em" }
                    ]
        }
    }

    var filterByRecordings = function(recordingTitles) {
        var recordingColumnIndex = $('[data-recording-column-index]').attr('data-recording-column-index');

        if (recordingTitles.length) {
            var regex = "^(" + recordingTitles.join("|") + ")$";
            theTable.column([recordingColumnIndex]).search(regex, true, false).draw();
        } else {
            theTable.column([recordingColumnIndex]).search("").draw();
        }
    }

    return {
        start: start,
        filterByRecordings: filterByRecordings
    }

})();

var BookmarkHiddenSwitch = (function() {

    var showNewHiddenState = function(response) {
        var bookmarkInfo = getBookmarkInfoFromSuccessResponse(response);
        var button = findButton(bookmarkInfo);

        toggleBookmarkHiddenState(button, bookmarkInfo);
        removeSpinner(button);
    }

    var showErrorMessage = function(xhr, textStatus, errorThrown, recordingId, attributes) {
        var bookmarkInfo = attributes;
        bookmarkInfo.recordingId = recordingId;
        var button = findButton(bookmarkInfo);

        removeSpinner(button);
        FlashMessage.show("danger", "Uh oh.  Something went wrong while updating your bookmark.  Please try again later or <a href='mailto: support@webrecorder.io'>contact us</a>.");
    }

    var getBookmarkInfoFromSuccessResponse = function(response) {
        var info = {};
        info.recordingId = response['recording-id'];
        info.timestamp = response['page-data']['timestamp'];
        info.url = response['page-data']['url'];
        info.hidden = response['page-data']['hidden'];
        return info;
    }

    var toggleBookmarkHiddenState = function(button, bookmarkInfo) {
        $(button).closest('[data-bookmark-hidden]').attr("data-bookmark-hidden", bookmarkInfo.hidden);

        var showHidden = $("#show-hidden").is(':checked');

        if (bookmarkInfo.hidden === "1") {
            $(button).find('.glyphicon').removeClass('glyphicon-eye-open');
            $(button).find('.glyphicon').addClass('glyphicon-eye-close');
            $(button).find('.hidden-label').text('Show');
            $(button).closest('tr').addClass("hidden-bookmark");
            if (!showHidden) {
                $(button).closest('tr').hide();
            }
        } else {
            $(button).find('.glyphicon').removeClass('glyphicon-eye-close');
            $(button).find('.glyphicon').addClass('glyphicon-eye-open');
            $(button).find('.hidden-label').text('Hide');
            $(button).closest('tr').removeClass("hidden-bookmark");
            if (!showHidden) {
                $(button).closest('tr').show();
            }
        }
    }

    var getNewHiddenValue = function(button) {
        var currentHidden = $(button).closest('[data-bookmark-hidden]').attr("data-bookmark-hidden");
        return currentHidden === "1" ? "0" : "1";
    }

    var getAttributesFromDOM = function(button) {
        var attributes = {}
        attributes.url = $(button).closest('[data-bookmark-url]').attr("data-bookmark-url");
        attributes.timestamp = $(button).closest('[data-bookmark-timestamp]').attr("data-bookmark-timestamp");
        attributes.hidden = getNewHiddenValue(button);
        return attributes;
    }

    var toggleHideBookmark = function() {
        var recordingId = $(this).closest('[data-recording-id]').attr('data-recording-id');
        Recordings.modifyPage(recordingId, getAttributesFromDOM(this), showNewHiddenState, showErrorMessage);

        showSpinner(this);
    }

    var showSpinner = function(button) {
        var spinnerDOM = "<span class='hide-loading-spinner' role='alertdialog' aria-busy='true' aria-live='assertive'></span>";

        $(button).addClass('disabled');
        $(button).find('.glyphicon').hide();
        $(button).prepend(spinnerDOM);
    }

    var removeSpinner = function(button) {
        $(button).removeClass('disabled');
        $(button).find('.hide-loading-spinner').remove();
        $(button).find('.glyphicon').show();
    }

    var findButton = function(info) {
        var row = $("tr[data-recording-id='" + info.recordingId + "']" +
                "[data-bookmark-timestamp='" + info.timestamp + "']" +
                "[data-bookmark-url='" + info.url + "']");
        return $(row).find('.hidden-bookmark-toggle');
    }

    var toggleShowHidden = function() {
        if (this.checked) {
            $("tr[data-bookmark-hidden='1']").show();
        } else {
            $("tr[data-bookmark-hidden='1']").hide();
        }
    }

            
    var start = function() {
        $('.bookmarks-panel').on('click', '.hidden-bookmark-toggle', toggleHideBookmark);

        $("#show-hidden").on('change', toggleShowHidden);

        $("tr[data-bookmark-hidden='1']").addClass("hidden-bookmark");
    }

    return {
        start: start
    }

})();
