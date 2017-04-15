/*
 * jQuery UI iframeDialog Plugin v1.2
 * https://github.com/miyabis/jquery.iframeDialog
 *
 * Copyright 2012, MiYABiS
 * Distributed under the [MIT License][mit].
 * http://www.opensource.org/licenses/mit-license.php
 */
(function ($) {
    var dialogData = "";

    $.fn.iframeDialog = function (options) {
        this.each(function () {
            $(this).unbind('click').click(function (e) {
                e.preventDefault();
                var $div = $("<div/>");
                var $iframe = $('<iframe class="iframeDialog" name="iframeDialog{rnd}" frameborder="0" width="100%" height="100%" marginwidth="0" hspace="0" vspace="0" scrolling="no" allowtransparency="true" />');
                if (!options.title) {
                    options.title = $(this).attr('title');
                }
                if (!options.url) {
                    url = $(this).attr('href');
                } else {
                    url = options.url;
                }
                if (!options.close) {
                    options.close = function () {
                        $(this).remove();
                    };
                }
                if (options.id) {
                    $div.attr("id", options.id);
                }
                if (options.scrolling) {
                    $iframe.attr("scrolling", options.scrolling);
                }

                if (options.data) {
                    dialogData = options.data;
                }
                else {
                    dialogData = "";
                }

                $iframe.attr("src", url);
                $div.append($iframe).dialog(options);
            });
        });
        return this;
    };

    $.fn.openIframeDialog = function (options) {
        var $div = $("<div/>");
        var $iframe = $('<iframe class="iframeDialog" name="iframeDialog{rnd}" frameborder="0" width="100%" height="100%" marginwidth="0" hspace="0" vspace="0" scrolling="no" allowtransparency="true" />');
        if (!options.title) {
            options.title = $(this).attr('title');
        }
        if (!options.url) {
            url = $(this).attr('href');
        } else {
            url = options.url;
        }
        if (!options.close) {
            options.close = function () {
                $(this).remove();
            };
        }
        if (options.id) {
            $div.attr("id", options.id);
        }
        if (options.scrolling) {
            $iframe.attr("scrolling", options.scrolling);
        }

        if (options.data) {
            dialogData = options.data;
        }
        else {
            dialogData = "";
        }

        $iframe.attr("src", url);
        $div.append($iframe).dialog(options);

    };

    window.addEventListener("message", function (event) {
        if (event.data.type == "getDialogData") {
            event.source.postMessage({ type: "getDialogDataResult", content: dialogData }, event.origin);
        }
    });
})(jQuery);
